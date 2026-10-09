/**
 * Pull executable JS out of an HTML document.
 *
 * We extract:
 *   - Inline `<script>` blocks (anything not marked `src=…`)
 *   - The body of `on*=` inline event handler attributes
 *
 * External `src=…` scripts are intentionally skipped — domguard targets the
 * code an LLM emitted into the page, not third-party libraries it linked.
 */

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
const INLINE_HANDLER_RE = /\son[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * Extract every inline JS fragment from an HTML document and concatenate them
 * with newlines so detector regexes can run against a single string.
 *
 * Returns the input verbatim if it does not look like HTML (no `<script` tag
 * and no `<` at all). That heuristic lets callers pass either a full HTML
 * document or a raw JS string.
 */
export function extractInlineJs(source: string): string {
  if (!source || typeof source !== "string") return "";

  const looksLikeHtml = source.includes("<script") || source.includes("<html") || source.includes("<!doctype");
  if (!looksLikeHtml) return source;

  const parts: string[] = [];

  let match: RegExpExecArray | null;
  INLINE_SCRIPT_RE.lastIndex = 0;
  while ((match = INLINE_SCRIPT_RE.exec(source)) !== null) {
    if (match[1]) parts.push(match[1]);
  }

  INLINE_HANDLER_RE.lastIndex = 0;
  while ((match = INLINE_HANDLER_RE.exec(source)) !== null) {
    const body = match[1] ?? match[2];
    if (body) parts.push(body);
  }

  return parts.join("\n");
}

/** Snip a short evidence window around a regex match, with bounds. */
export function snippetAround(source: string, index: number, len: number, pad = 60): string {
  const start = Math.max(0, index - pad);
  const end = Math.min(source.length, index + len + pad);
  const slice = source.slice(start, end).replace(/\s+/g, " ").trim();
  return slice.length > 200 ? slice.slice(0, 197) + "…" : slice;
}
