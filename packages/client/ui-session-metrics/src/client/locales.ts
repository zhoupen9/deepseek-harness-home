/** Session-metrics namespace dictionaries for the chat-header metrics surface.
 *
 * Row labels and templates mirror ui-chat's own `stats.dialog.*` and
 * `message.turnUsage.*` copy and ui-conversation's `context.*` copy, so the
 * merged panel reads exactly like the shipped dialogs it replaces; the two
 * dictionaries stay complete against each other.
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'session-metrics'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'panel.title': "会话统计",
  'panel.usageTitle': "Token 用量",
  'panel.context': "上下文占用",
  'panel.counts': "{turns} 轮 {steps} 步",
  'panel.llmTime': "模型用时",
  'panel.toolTime': "工具调用用时",
  'panel.ttft': "首 token 平均（TTFT）",
  'panel.speed': "输出速度（TPS）",
  'panel.cacheHit': "缓存命中",
  'panel.input': "未缓存输入",
  'panel.cacheRead': "缓存读取",
  'panel.cacheWrite': "缓存写入",
  'panel.output': "输出",
  'panel.count': "{count} tok",
  'panel.contextUsed': "上下文已用",
  'panel.contextFigures': "~{used} / {window}",
  'panel.contextSystem': "系统提示词",
  'panel.contextTools': "工具定义",
  'panel.contextMessages': "对话消息",
  'value.tokensPerSecond': "{throughput} tok/s",
  // Mirrors ui-chat's `stats.cacheHit` pill copy byte for byte.
  'value.cacheHit': "缓存命中 {percent}%",
  'aria.input': "输入 {input} tokens",
  'aria.output': "输出 {output} tokens",
  'aria.context': "上下文已用 {percent}",
  'aria.panel': "会话指标",
  'aria.metrics': "会话指标：{items}",
  'number.thousand': "{value}K",
  'number.million': "{value}M",
  'duration.compactSeconds': "{seconds}秒",
  'duration.compactMinutes': "{minutes}分{seconds}秒",
} as const

/** The session-metrics dictionary key union. */
export type SessionMetricsKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete session-metrics header copy. */
    'session-metrics': SessionMetricsKey
  }
}

/** Namespace-bound translator threaded through Session-metrics presentation code. */
export type SessionMetricsTranslate = import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<SessionMetricsKey, string> = {
  'panel.title': "Session statistics",
  'panel.usageTitle': "Token usage",
  'panel.context': "Context usage",
  'panel.counts': "{turns} turns {steps} steps",
  'panel.llmTime': "LLM time",
  'panel.toolTime': "Tool time",
  'panel.ttft': "Avg time to first token (TTFT)",
  'panel.speed': "Tokens per second (TPS)",
  'panel.cacheHit': "Cache hit",
  'panel.input': "Uncached input",
  'panel.cacheRead': "Cached input",
  'panel.cacheWrite': "Cache write",
  'panel.output': "Output",
  'panel.count': "{count} tok",
  'panel.contextUsed': "of context used",
  'panel.contextFigures': "~{used} / {window}",
  'panel.contextSystem': "System prompt",
  'panel.contextTools': "Tool definitions",
  'panel.contextMessages': "Messages",
  'value.tokensPerSecond': "{throughput} tok/s",
  // Mirrors ui-chat's `stats.cacheHit` pill copy byte for byte.
  'value.cacheHit': "Cache hit {percent}%",
  'aria.input': "Input {input} tokens",
  'aria.output': "Output {output} tokens",
  'aria.context': "{percent} of context used",
  'aria.panel': "Session metrics",
  'aria.metrics': "Session metrics: {items}",
  'number.thousand': "{value}K",
  'number.million': "{value}M",
  'duration.compactSeconds': "{seconds}s",
  'duration.compactMinutes': "{minutes}m{seconds}s",
}
