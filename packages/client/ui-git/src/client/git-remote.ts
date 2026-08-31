/**
 * Client contract for the host `git` namespace: a bounded history-log verb
 * and a commit-detail verb. This is the client mirror of HOST_PRIMITIVES.md;
 * the host side must expose a `ctx.remote.git` namespace with the `log`
 * and `show` verbs. Until that namespace exists, `resolveGitRemote` returns
 * undefined and the Git view renders a "requires host" notice.
 * @module @deepseek-ai/dsh-client-ui-git/client
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { GitLogOptions, GitLogResult, GitShowResult } from './git-contract.ts'

/** The host `git` namespace as the generated client exposes it (agentId first). */
export interface GitRemote {
  log(sessionId: SessionId, options?: GitLogOptions, signal?: AbortSignal): Promise<GitLogResult>
  show(sessionId: SessionId, hash: string, signal?: AbortSignal): Promise<GitShowResult>
}

/** Wire shape: each verb resolves to a standard ClientResult. */
type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly message: string } }

/** The generated `ctx.remote.git` namespace (agentId first). */
interface GitNamespace {
  log(sessionId: SessionId, options: GitLogOptions | undefined, signal?: AbortSignal): Promise<RemoteResult<GitLogResult>>
  show(sessionId: SessionId, hash: string, signal?: AbortSignal): Promise<RemoteResult<GitShowResult>>
}

/**
 * Resolve the host git remote, or undefined when the host has not implemented
 * it yet (see HOST_PRIMITIVES.md). The accessor reads the namespace lazily so
 * the plugin never parks on a not-yet-shipped controller.
 * @param ctx - client root context carrying the `remote` service.
 * @returns the typed remote, or undefined when the namespace is absent.
 */
export function resolveGitRemote(ctx: Context): GitRemote | undefined {
  const namespace = ctx.get('remote.git') as GitNamespace | undefined
  if (namespace === undefined) return undefined
  return {
    async log(sessionId, options, signal) {
      const result = await namespace.log(sessionId, options, signal)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    async show(sessionId, hash, signal) {
      const result = await namespace.show(sessionId, hash, signal)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
  }
}
