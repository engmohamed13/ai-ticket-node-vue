/**
 * A deliberately tiny markdown renderer for knowledge base article bodies (Story 19).
 *
 * Article text is author-supplied and rendered with `v-html`, so the order here matters and is
 * not negotiable: **every `<`, `>`, and `&` is escaped first**, and only then are our own tags
 * inserted. Any HTML an author pastes into an article therefore renders as visible text rather
 * than as markup — a `<script>` tag in a body can never execute.
 *
 * The supported subset is what the seeded articles use: `#`/`##`/`###` headings, `-` bullet
 * lists, `**bold**`, `*italic*`, `` `code` ``, and blank-line-separated paragraphs. Anything
 * else falls through as plain text. A full CommonMark implementation is out of scope for this
 * mini-module; if one is ever needed, replace this file with `marked` + `DOMPurify` rather
 * than extending the regexes.
 */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Inline spans. Runs on already-escaped text, so it can only ever add our own tags. */
const renderInline = (escaped: string): string =>
  escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

export const renderMarkdown = (source: string): string => {
  const lines = escapeHtml(source ?? '').split(/\r?\n/);
  const html: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = (): void => {
    if (listBuffer.length === 0) return;
    html.push(`<ul>${listBuffer.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
    listBuffer = [];
  };

  const flushParagraph = (): void => {
    if (paragraphBuffer.length === 0) return;
    html.push(`<p>${renderInline(paragraphBuffer.join(' '))}</p>`);
    paragraphBuffer = [];
  };

  const flushAll = (): void => {
    flushList();
    flushParagraph();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushAll();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      // `#` is the article's own title level, so it renders as an h2 inside the page's h1.
      const level = heading[1].length + 1;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      listBuffer.push(bullet[1]);
      continue;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  }

  flushAll();
  return html.join('');
};
