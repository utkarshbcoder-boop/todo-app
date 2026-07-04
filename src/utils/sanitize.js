import DOMPurify from 'dompurify'

export function sanitizeHtml(html) {
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizeMarkdown(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
