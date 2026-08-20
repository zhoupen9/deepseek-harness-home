/**
 * Linux desktop notifications for DeepSeek Harness work: a chat turn closes, a
 * delegated subagent run settles, a goal completes, an approval is requested,
 * or the agent asks the user a question. A host-side observer that raises
 * `notify-send` over the D-Bus session bus. Fire-and-forget and best-effort:
 * a missing binary or a failed spawn logs and never blocks or disturbs the agent.
 *
 * Deployed out-of-tree v2 (notification-v2.md): kept in lockstep with the
 * canonical packages/notify/desktop-notify/src/index.ts. This copy is
 * hand-ported with the same rules as the other out-of-tree plugins — no bare
 * imports (it resolves through the profile's flat node_modules), plain
 * DEFAULTS object, `ctx.*` access only.
 * @module @deepseek-ai/dsh-desktop-notify
 */
export const name = "desktop-notify"
// "subprocess" is the unsandboxed local process seam. Do NOT use "shell": the
// sandboxing bash executor runs commands under the Landlock workspace-write sandbox,
// which can block the D-Bus session socket at /run/user/<uid>/bus and silently break
// notifications.
export const inject = ["subprocess"]

const DEFAULTS = {
  turn: true,            // chat turn completed
  subagent: true,        // delegated agent run settled
  goal: true,            // goal/task completed
  approval: true,        // approval requested
  planReview: true,      // plan-review question asked
  question: true,        // generic user question asked
  command: "notify-send",
  appName: "DeepSeek Harness",
  urgency: "normal",
  approvalUrgency: "critical",
  planReviewUrgency: "critical",
  questionUrgency: "normal",
  timeoutMs: 5000,
  inactiveOnly: true,    // skip while windowFocus reports focused
}

const MAX_BODY_CHARS = 200

// Match the first markdown ATX heading line (1-6 `#`) and capture its title.
const HEADING = /^#{1,6}\s+(.+?)\s*$/m

/** A human-readable message from an unknown caught value. */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

/** Bound a body string to MAX_BODY_CHARS, appending an ellipsis when it overruns. */
function truncate(text, max = MAX_BODY_CHARS) {
  return text.length > max ? text.slice(0, max) + "…" : text
}

/** Extract the title of the first markdown heading, for a plan-review toast. */
function firstHeading(text) {
  if (text === undefined) return undefined
  return HEADING.exec(text)?.[1]
}

/** The model id an agent's options name, when one is configured. */
function modelOf(agent) {
  return agent.options.model
}

/** Join the text blocks of a subagent's final output into one bounded body line. */
function extractText(blocks) {
  if (!Array.isArray(blocks)) return undefined
  const parts = []
  for (const block of blocks) {
    // Merge-extensible union: only text blocks contribute; every other type is ignored.
    if (block && block.type === "text" && typeof block.text === "string") parts.push(block.text)
  }
  if (parts.length === 0) return undefined
  return truncate(parts.join(" ").trim())
}


export function apply(ctx, rawConfig) {
  const config = { ...DEFAULTS, ...(rawConfig || {}) }
  const turn = config.turn
  const subagent = config.subagent
  const goal = config.goal
  const approval = config.approval
  const planReview = config.planReview
  const question = config.question
  const command = config.command
  const appName = config.appName
  const urgency = config.urgency
  const approvalUrgency = config.approvalUrgency
  const planReviewUrgency = config.planReviewUrgency
  const questionUrgency = config.questionUrgency
  const timeoutMs = config.timeoutMs
  const inactiveOnly = config.inactiveOnly

  let executable = null

  // Resolve once at load. A missing binary must not take the agent down:
  // warn and leave notifications disabled (best-effort, like the hooks bridge).
  ctx.subprocess.resolveExecutable(command).then(
    (path) => { executable = path },
    (error) => {
      ctx.logger.warn("desktop-notify: '" + command + "' not found — notifications disabled: " + errorMessage(error))
    },
  )

  /**
   * Raise one notification, or skip it when the binary is unresolved or the
   * optional windowFocus service reports a focused window. Fire-and-forget.
   * @param title - the toast title.
   * @param body - the toast body.
   * @param urgencyOverride - per-event urgency, falling back to the default.
   */
  function notify(title, body, urgencyOverride) {
    if (executable === null) return
    if (inactiveOnly) {
      // Optional; undefined in web/CLI/TUI hosts -> gate is a no-op.
      const focus = ctx.get("windowFocus")
      if (focus !== undefined && focus.isFocused()) return
    }
    const argv = [executable, "-a", appName, "-u", urgencyOverride ?? urgency, "-t", String(timeoutMs), title, body]
    try {
      const proc = ctx.subprocess.spawn({
        argv,
        cwd: process.cwd(),
        stdio: {
          stdin: "ignore",
          stdout: { maxBytes: 1024 },
          stderr: { maxBytes: 1024 },
        },
        graceMs: 1000,
      })
      // Fire-and-forget: never await. Swallow spawn-level rejection so a
      // failed spawn cannot become an unhandled rejection.
      proc.done.then(
        (outcome) => {
          if (outcome.exitCode !== 0) {
            const stderr = proc.collected.stderr !== undefined ? proc.collected.stderr.readFrom(0).text : ""
            ctx.logger.debug("desktop-notify: " + command + " exited " + outcome.exitCode + ": " + stderr.trim())
          }
        },
        () => {},
      )
    } catch (error) {
      ctx.logger.debug("desktop-notify: spawn failed: " + errorMessage(error))
    }
  }

  ctx.on("agent/turn-stopping", ({ agent: subject }) => {
    // Return immediately: this is a serial boundary and must not be delayed.
    if (!turn) return
    const model = modelOf(subject)
    notify("DeepSeek Harness", model !== undefined ? model + " reply ready" : "Chat reply ready")
  })

  ctx.on("subagent/end", (info) => {
    if (!subagent) return
    const text = extractText(info.lastAssistantMessage)
    notify("Agent finished", text !== undefined ? text : "stopReason: " + info.stopReason)
  })

  ctx.on("goal/changed", ({ change }) => {
    if (goal && change.operation === "complete") {
      notify("Goal completed", change.goal !== undefined ? change.goal.objective : "Goal completed")
    }
  })

  // Waterfall: observe the approval request, then delegate so the answerer
  // chain (and the fail-closed default) is never short-circuited.
  ctx.on("approval/request", (req, next) => {
    if (approval) {
      notify(
        "Approval required: " + req.toolName,
        req.reason ? truncate(req.reason) : req.toolName + " needs your approval",
        approvalUrgency,
      )
    }
    return next()
  })

  // Observe-only emit: one toast per question carrying an intent.
  ctx.on("userQuestions/asked", (request) => {
    for (const q of (request.questions || [])) {
      const intent = q.intent
      if (intent !== undefined && intent.kind === "plan-review") {
        if (!planReview) continue
        notify("Plan review", firstHeading(q.detail) ?? "Approve the plan?", planReviewUrgency)
      } else {
        if (!question) continue
        notify(q.header ?? "Question", truncate(q.question), questionUrgency)
      }
    }
  })
}

