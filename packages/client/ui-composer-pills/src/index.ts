/** Host half of the composer-pill switch: the `ui-composer-pills` settings namespace. */
import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Durable composer-dock preferences projected to the browser. */
export interface Config {
  /** Whether the builtin composer pills and the context meter are hidden. */
  hideBuiltinPills: Volatile<boolean>
}

/**
 * Live composer-dock preference. The browser half reads this namespace through
 * the configuration-form service; the host itself only owns the schema that
 * validates and persists the value.
 */
export const Config = z.object({
  hideBuiltinPills: z.boolean().default(false).volatile(),
})

/** No host-side behavior; the client half suppresses the pills and registers the settings row. */
export function apply(): void {}
