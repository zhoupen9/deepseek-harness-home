/**
 * Behavior spec for the git-diff pure logic: one unified-diff line classified
 * into its display kind (add / del / hunk / meta / ctx).
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import { classifyDiffLine } from '../src/client/git-diff.ts'

describe('classifyDiffLine', () => {
  it('classifies hunk, add, del, and context lines', () => {
    expect(classifyDiffLine('@@ -1,3 +1,4 @@')).toBe('hunk')
    expect(classifyDiffLine('+added line')).toBe('add')
    expect(classifyDiffLine('-removed line')).toBe('del')
    expect(classifyDiffLine(' unchanged context')).toBe('ctx')
  })

  it('treats file headers as meta, not added/removed lines', () => {
    expect(classifyDiffLine('+++ b/path/to/file')).toBe('meta')
    expect(classifyDiffLine('--- a/path/to/file')).toBe('meta')
  })

  it('classifies the remaining git diff headers as meta', () => {
    for (const line of [
      'diff --git a/x b/x',
      'index 0123abc..4567def 100644',
      'new file mode 100644',
      'deleted file mode 100644',
      'old mode 100644',
      'new mode 100755',
      'similarity index 90%',
      'rename from a/x',
      'rename to b/x',
      'Binary files a/x and b/x differ',
      '\\ No newline at end of file',
    ]) {
      expect(classifyDiffLine(line)).toBe('meta')
    }
  })
})
