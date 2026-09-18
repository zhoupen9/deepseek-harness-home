/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-chat-tab-icons`.
 * @module `@deepseek-ai/dsh-client-ui-chat-tab-icons/invariant`
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-chat-tab-icons'

/** Cordis companion plugin name. */
export const name = 'client-ui-chat-tab-icons-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a pure-consumer plugin — it contributes no slot entry,
 * emits no cordis event, and owns no mutable cross-plugin state. What it does
 * own (decorated DOM nodes) is removed with the plugin fiber, which the
 * package's behavior specs observe through the decoration predicates.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
