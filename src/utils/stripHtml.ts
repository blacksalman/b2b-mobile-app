// Strips real Medusa rich-text HTML (product descriptions, policy bodies) down to plain text for
// this app's plain <Text> components - no HTML renderer/WebView dependency added just for this.
// The source data itself stores literal "\n"/"\r\n" text (a backslash followed by a letter, not
// an actual line break - confirmed by inspecting the raw API response) inside the HTML, which is
// why a plain whitespace-collapse alone left visible "\n\n" in the rendered text; those literal
// escape sequences need stripping same as the HTML tags do.
//
// Block-level tags are converted to real line breaks BEFORE the rest are stripped, so a plain
// <Text> (which does render \n) still shows paragraphs/headings/list items on their own lines
// instead of one unbroken run-on paragraph - confirmed live that's what a naive strip-everything
// pass produced for this store's real descriptions (headings running straight into body copy,
// "✔" bullets back-to-back with no separation).
export function stripHtml(html: string): string {
  return html
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
