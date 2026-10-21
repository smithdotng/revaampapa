/**
 * Minimal clean-up for rich text written in TinyMCE by owners and admins:
 * drops scripts/iframes/styles, inline event handlers and javascript: URLs.
 */
export function cleanHtml(html = '') {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|meta|link)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, '$1="#"')
}

const escText = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Plain text (editor fallback without JS) becomes paragraphs; HTML is cleaned. */
export function toHtml(s: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(s)) return cleanHtml(s)
  return s.split(/\n{2,}/).map((p) => `<p>${escText(p).replace(/\n/g, '<br>')}</p>`).join('')
}
