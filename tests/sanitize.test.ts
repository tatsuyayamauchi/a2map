import { describe, it, expect } from "vitest";
import { escapeHtml, sanitizeHtml } from "../src/sanitize.js";

describe("escapeHtml", () => {
  it("escapes special HTML characters", () => {
    expect(escapeHtml("<div>&'\"</div>")).toBe("&lt;div&gt;&amp;&#39;&quot;&lt;/div&gt;");
  });

  it("handles null, undefined, and non-string values", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(123)).toBe("123");
    expect(escapeHtml(true)).toBe("true");
  });
});

describe("sanitizeHtml", () => {
  it("preserves safe formatting tags", () => {
    const safe = "<h3>Title</h3><p>This is <b>bold</b> and <i>italic</i>.</p>";
    const result = sanitizeHtml(safe);
    expect(result).toContain("<h3>Title</h3>");
    expect(result).toContain("<b>bold</b>");
  });

  it("strips script tags and malicious code", () => {
    const dirty = '<p>Hello</p><script>alert("XSS")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain('alert("XSS")');
    expect(clean).toContain("Hello");
  });

  it("strips inline event handler attributes like onerror and onclick", () => {
    const dirty = '<img src="invalid.jpg" onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("alert(1)");
  });

  it("strips javascript: pseudo-protocol in links", () => {
    const dirty = '<a href="javascript:alert(1)">Click Me</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("javascript:alert(1)");
  });

  it("handles empty or null inputs", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
  });
});
