/** Host half of the background-image plugin: the `ui-background` settings namespace. */
import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Durable background preferences projected to the browser. */
export interface Config {
  /** Whether the configured image is painted behind the interface. */
  enabled: Volatile<boolean>
  /** Image source: an http(s) URL, a data image URI, or an absolute file path; '' paints nothing. */
  image: Volatile<string>
  /** Image-layer opacity from 0 through 1. */
  opacity: Volatile<number>
}

/**
 * Live background preferences. The browser half reads this namespace through
 * the configuration-form service; the host itself only owns the schema that
 * validates and persists the values.
 */
export const Config = z.object({
  enabled: z.boolean().default(false).volatile(),
  image: z.string().default('').volatile(),
  opacity: z.number().min(0).max(1).default(0.5).volatile(),
})

/** No host-side behavior; the client half paints the layer and registers the settings row. */
export function apply(): void {}
