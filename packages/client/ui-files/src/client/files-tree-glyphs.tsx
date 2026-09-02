/**
 * Folder and file kind glyphs for the explorer tree rows. Rendered as small
 * stroke-only SVGs (feather-style, like the git-history user/calendar glyphs)
 * so a directory reads as a folder and a file as a document at a glance,
 * independent of the expand/collapse caret. Stroke, fill, size, and color
 * come from the caller's CSS (`.kind`); the svg is aria-hidden because the
 * row button already labels itself "directory" or "file".
 */

/** Props accepted by every tree kind glyph. */
export interface TreeKindGlyphProps {
  /** CSS-module class carrying size, stroke, and color. */
  readonly className?: string
}

/** Folder glyph shown on directory rows. */
export function FolderGlyph({ className }: TreeKindGlyphProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/** File glyph shown on file rows. */
export function FileGlyph({ className }: TreeKindGlyphProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}
