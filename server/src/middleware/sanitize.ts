import sanitizeHtml from "sanitize-html";

/** Strip all HTML from a string, keeping plain text */
export function stripHtml(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
}

/** Allow a safe markdown-like subset: bold, italic, lists, links */
export function sanitizeDescription(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ["b", "i", "em", "strong", "ul", "ol", "li", "p", "br", "a"],
    allowedAttributes: { a: ["href", "rel", "target"] },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    },
  });
}
