import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../services/markdown';

describe('renderMarkdown', () => {
  it('renders a level-one heading as an h2, inside the page heading', () => {
    expect(renderMarkdown('# Cannot sign in')).toBe('<h2>Cannot sign in</h2>');
  });

  it('renders the deeper heading levels', () => {
    expect(renderMarkdown('## Reset\n### Details')).toBe('<h3>Reset</h3><h4>Details</h4>');
  });

  it('groups consecutive bullets into one list', () => {
    expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
  });

  it('joins wrapped lines into a single paragraph', () => {
    expect(renderMarkdown('first line\nsecond line')).toBe('<p>first line second line</p>');
  });

  it('splits paragraphs on a blank line', () => {
    expect(renderMarkdown('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
  });

  it('renders bold, italic, and inline code', () => {
    expect(renderMarkdown('**b** *i* `c`')).toBe('<p><strong>b</strong> <em>i</em> <code>c</code></p>');
  });

  it('closes a list before starting a paragraph', () => {
    expect(renderMarkdown('- one\ntext')).toBe('<ul><li>one</li></ul><p>text</p>');
  });

  it('returns nothing for an empty body', () => {
    expect(renderMarkdown('')).toBe('');
  });

  // The renderer's output is fed to `v-html`, so this is the test that matters most.
  it('escapes a script tag rather than emitting it', () => {
    const html = renderMarkdown('<script>alert("xss")</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes an inline event-handler payload', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>');

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('escapes markup that appears inside a heading or a bullet', () => {
    const html = renderMarkdown('# <b>hi</b>\n- <i>there</i>');

    expect(html).toBe('<h2>&lt;b&gt;hi&lt;/b&gt;</h2><ul><li>&lt;i&gt;there&lt;/i&gt;</li></ul>');
  });

  it('escapes ampersands so entities cannot be smuggled in', () => {
    expect(renderMarkdown('a &lt; b')).toBe('<p>a &amp;lt; b</p>');
  });
});
