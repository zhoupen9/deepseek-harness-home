/**
 * /simple mode, host half. A session-local toggle that switches the live
 * session to deepseek-v4-flash with thinking off, leaving the default model
 * untouched so new chat sessions are unaffected. Exposes a "simple" session
 * projection so the browser half can render the badge.
 */
export const name = 'simple-mode'
export const inject = ['commands', 'apiProxy', 'agentDefaultModel']

const PROVIDER = 'deepseek-official'
const MODEL = 'deepseek-v4-flash'
const EFFORT = 'off'

export function apply(ctx) {
  // agent -> { active, previousSession, previousDefault }
  const memory = new WeakMap()

  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register({
      key: 'simple',
      schema: { parse: (value) => value },
      init: () => ({ active: false }),
      apply: (state, event) => (event.type === 'simple/mode' ? { active: event.data.active } : state),
      view: (state) => ({ active: state.active }),
      stateVersion: 1,
    })
  })

  async function currentOf(agent) {
    const res = await ctx.apiProxy.sessions.models({ rpcId: 'simple/read', payload: { sessionId: agent.id } })
    return res.result.ok ? res.result.value.current : undefined
  }

  async function switchSession(agent, selection) {
    const res = await ctx.apiProxy.sessions.selectModel({
      rpcId: 'simple/switch/' + agent.id,
      payload: {
        sessionId: agent.id,
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
      },
    })
    return res.result.ok ? null : res.result.error.message
  }

  async function enter(agent) {
    const state = memory.get(agent)
    if (state !== undefined && state.active) {
      return { kind: 'success', text: 'Simple mode is already active.' }
    }
    const previousSession = await currentOf(agent)
    const previousDefault = ctx.agentDefaultModel.currentSelection()
    const failure = await switchSession(agent, { provider: PROVIDER, model: MODEL, reasoningEffort: EFFORT })
    if (failure !== null) return { kind: 'error', text: failure }
    // The RPC also saved the default; undo that so a new chat session keeps
    // the previous default (simple mode is session-local, never persisted).
    await ctx.agentDefaultModel.saveSelection(previousDefault)
    agent.session.append('simple/mode', { active: true })
    memory.set(agent, { active: true, previousSession, previousDefault })
    return { kind: 'success', text: 'Simple mode on: ' + MODEL + ', thinking off.' }
  }

  async function exit(agent) {
    const state = memory.get(agent)
    if (state === undefined || !state.active) {
      return { kind: 'success', text: 'Simple mode is not active.' }
    }
    const failure = state.previousSession === undefined
      ? null
      : await switchSession(agent, state.previousSession)
    if (failure !== null) return { kind: 'error', text: failure }
    await ctx.agentDefaultModel.saveSelection(state.previousDefault)
    agent.session.append('simple/mode', { active: false })
    memory.set(agent, { active: false, previousSession: undefined, previousDefault: state.previousDefault })
    return { kind: 'success', text: 'Simple mode off; model restored.' }
  }

  ctx.commands.register({
    name: 'simple',
    description: 'Enter or leave simple mode (deepseek-v4-flash, thinking off)',
    handler: (invocation) => (
      invocation.rawInput.trim().toLowerCase() === 'off'
        ? exit(invocation.agent)
        : enter(invocation.agent)
    ),
  })
}
