/** Session-metrics namespace dictionaries for the chat-header metrics surface. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'session-metrics'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'panel.title': "会话指标",
  'panel.caption': "{turns} 轮 · {steps} 步",
  'panel.modelTime': "模型耗时",
  'panel.toolTime': "工具耗时",
  'panel.ttft': "首 token 平均延迟",
  'panel.decode': "解码速度",
  'panel.input': "输入 tokens",
  'panel.cacheRead': "缓存读取",
  'panel.cacheWrite': "缓存写入",
  'panel.uncached': "未命中缓存",
  'panel.output': "输出 tokens",
  'panel.cacheRate': "缓存命中率",
  'value.tokensPerSecond': "{throughput} tok/s",
  'compact.cache': "缓存命中 {percent}%",
  'compact.input': "输入 {input}",
  'compact.output': "输出 {output}",
  'aria.metrics': "会话指标：{line}",
  'number.groupSeparator': ",",
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
  'panel.title': "Session metrics",
  'panel.caption': "{turns} turns · {steps} steps",
  'panel.modelTime': "Model time",
  'panel.toolTime': "Tool time",
  'panel.ttft': "Avg TTFT",
  'panel.decode': "Decode speed",
  'panel.input': "Input tokens",
  'panel.cacheRead': "Cache read",
  'panel.cacheWrite': "Cache write",
  'panel.uncached': "Uncached",
  'panel.output': "Output tokens",
  'panel.cacheRate': "Cache hit rate",
  'value.tokensPerSecond': "{throughput} tok/s",
  'compact.cache': "Cache hit {percent}%",
  'compact.input': "Input {input}",
  'compact.output': "Output {output}",
  'aria.metrics': "Session metrics: {line}",
  'number.groupSeparator': ",",
  'number.thousand': "{value}K",
  'number.million': "{value}M",
  'duration.compactSeconds': "{seconds}s",
  'duration.compactMinutes': "{minutes}m{seconds}s",
}
