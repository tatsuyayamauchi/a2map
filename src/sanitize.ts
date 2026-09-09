/**
 * Lightweight HTML escaping and sanitization utilities.
 * Protects against XSS attacks from LLM outputs or untrusted geospatial metadata.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes characters that have special meaning in HTML.
 */
export function escapeHtml(str: string | number | boolean | null | undefined): string {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] || char);
}

/**
 * Permitted HTML tags for tooltips and popups.
 */
const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "small",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

/**
 * Permitted attributes per tag or globally.
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel", "class"]),
  div: new Set(["class", "style"]),
  span: new Set(["class", "style"]),
  p: new Set(["class"]),
  table: new Set(["class"]),
  th: new Set(["class", "colspan", "rowspan"]),
  td: new Set(["class", "colspan", "rowspan"]),
};

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;

/**
 * Sanitizes an HTML string by removing disallowed elements, event handlers, and dangerous protocols.
 * Works in both browser environments and server/test environments.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  // If DOMParser is available (browser or jsdom)
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${input}</body>`, "text/html");
      cleanNode(doc.body);
      return doc.body.innerHTML;
    } catch {
      // Fallback to basic stripping
    }
  }

  // Fallback for non-DOM environments: strip script, style, and on* attributes
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\son\w+=\S+/gi, "")
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
}

function cleanNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === 1) {
      // Element node
      const el = child as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        // Disallowed tag: remove the element completely for dangerous tags,
        // or unwrap text for harmless unknown tags
        if (["script", "style", "iframe", "object", "embed", "base", "form"].includes(tagName)) {
          el.remove();
          continue;
        } else {
          // Replace with its child nodes
          while (el.firstChild) {
            node.insertBefore(el.firstChild, el);
          }
          el.remove();
          continue;
        }
      }

      // Check attributes
      const allowedForTag = ALLOWED_ATTRIBUTES[tagName] || new Set(["class"]);
      const attrNames = Array.from(el.attributes).map((a) => a.name);

      for (const attr of attrNames) {
        const lowerAttr = attr.toLowerCase();
        // Remove event handlers (on*)
        if (lowerAttr.startsWith("on")) {
          el.removeAttribute(attr);
          continue;
        }

        // Validate href on anchor tags
        if (lowerAttr === "href") {
          const hrefValue = el.getAttribute(attr)?.trim() || "";
          if (DANGEROUS_PROTOCOLS.test(hrefValue)) {
            el.removeAttribute(attr);
            continue;
          }
          // Force safe rel for external links
          el.setAttribute("rel", "noopener noreferrer");
        }

        // Remove disallowed attributes
        if (!allowedForTag.has(lowerAttr)) {
          el.removeAttribute(attr);
        }
      }

      // Recursively clean children
      cleanNode(el);
    } else if (child.nodeType === 8) {
      // Comment node: remove
      child.remove();
    }
  }
}
