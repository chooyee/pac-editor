import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, renderRich, safeUrl, esc, defaultConfig, extendConfig, validateData, emptyData, countItems } from '../src/render.js';

const page = {
  root: { props: { title: 'T', footer: 'Footer <b>' } },
  content: [
    { type: 'Heading', props: { id: 'h1', text: 'Hello <world>', level: 'h2', align: 'center' } },
    { type: 'Columns', props: { id: 'c1', ratio: '2fr 1fr', left: [{ type: 'Text', props: { id: 't1', text: 'a\n\nb' } }], right: [] } }
  ]
};

test('render: escapes values and wraps in .fp-site', () => {
  const html = render(defaultConfig, page);
  assert.match(html, /^<div class="fp-site">/);
  assert.match(html, /<h2>Hello &lt;world&gt;<\/h2>/);
  assert.match(html, /<footer class="fp-site-footer">Footer &lt;b&gt;<\/footer>/);
  assert.match(html, /<p>a<\/p><p>b<\/p>/);
  assert.doesNotMatch(html, /fp-item|fp-dz/, 'no editor markup in published output');
});

test('render: edit mode adds wrappers, drop zones and actions for the selected block', () => {
  const html = render(defaultConfig, page, { edit: true, selected: 'h1' });
  assert.match(html, /class="fp-item is-sel" data-id="h1"/);
  assert.match(html, /data-zone="c1\/left"/);
  assert.match(html, /class="fp-actions"/);
});

test('render: unknown types and malformed items are skipped', () => {
  const html = render(defaultConfig, { content: [{ type: 'Nope', props: { id: 'x' } }, null, { type: 'Spacer' }] });
  assert.equal(html, '<div class="fp-site"></div>');
});

test('render: style values are restricted to known options', () => {
  const html = render(defaultConfig, { content: [
    { type: 'Columns', props: { id: 'c', ratio: '1fr;background:url(x)', left: [], right: [] } },
    { type: 'Image', props: { id: 'i', src: 'javascript:alert(1)', ratio: '1;color:red', size: 'x" onload="y' } }
  ] });
  assert.doesNotMatch(html, /url\(x\)|color:red|onload|javascript/);
});

test('safeUrl', () => {
  assert.equal(safeUrl('https://a.b/c'), 'https://a.b/c');
  assert.equal(safeUrl('/contact'), '/contact');
  assert.equal(safeUrl('mailto:a@b.c'), 'mailto:a@b.c');
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl(' java\tscript:alert(1)'), '#');
  assert.equal(safeUrl('data:text/html,x'), '#');
  assert.equal(safeUrl('data:image/png;base64,AA', true), 'data:image/png;base64,AA');
  assert.equal(safeUrl('mailto:a@b.c', true), '');
});

test('esc', () => assert.equal(esc(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;'));

const rt = (name, v, want) => test(`renderRich: ${name}`, () => assert.equal(renderRich(v), want));
rt('plain string', 'a\n\nb<i>', '<p>a</p><p>b&lt;i&gt;</p>');
rt('inline formats', { ops: [{ insert: 'x ' }, { insert: 'y', attributes: { bold: true, italic: true, link: '/p' } }, { insert: '\n' }] }, '<p>x <a href="/p"><strong><em>y</em></strong></a></p>');
rt('lists', { ops: [{ insert: 'intro\na' }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'b' }, { insert: '\n', attributes: { list: 'bullet' } }, { insert: 'c' }, { insert: '\n', attributes: { list: 'ordered' } }, { insert: 'end\n' }] }, '<p>intro</p><ul><li>a</li><li>b</li></ul><ol><li>c</li></ol><p>end</p>');
rt('quote and blank lines', { ops: [{ insert: 'q' }, { insert: '\n', attributes: { blockquote: true } }, { insert: '\n\nz\n' }] }, '<blockquote><p>q</p></blockquote><p>z</p>');
rt('hostile input', { ops: [{ insert: '<script>x</script>', attributes: { link: 'javascript:alert(1)', onclick: 'x' } }, { insert: { image: 'x' } }, null, 5, { insert: '\n', attributes: { list: '"><svg>' } }] }, '<p><a href="#">&lt;script&gt;x&lt;/script&gt;</a></p>');
rt('garbage', { ops: 'nope' }, '');
rt('null', null, '');

test('validateData', () => {
  assert.deepEqual(validateData(defaultConfig, page), { ok: true, errors: [] });
  const bad = validateData(defaultConfig, { content: [{ type: 'Nope', props: { id: 'a' } }, { type: 'Text', props: {} }, { type: 'Text', props: { id: 'd' } }, { type: 'Text', props: { id: 'd' } }] });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 3);
  assert.equal(validateData(defaultConfig, null).ok, false);
  assert.equal(validateData(defaultConfig, { content: [{ type: 'Columns', props: { id: 'c', left: 'x' } }] }).ok, false);
});

test('emptyData and countItems', () => {
  assert.deepEqual(emptyData(defaultConfig), { root: { props: { title: 'Untitled page', footer: '' } }, content: [] });
  assert.equal(countItems(defaultConfig, page.content), 3);
});

test('extendConfig adds, replaces and removes components', () => {
  const Quote = { label: 'Quote', fields: {}, defaultProps: {}, render: () => '<blockquote></blockquote>' };
  const cfg = extendConfig({ components: { Quote, Spacer: null }, categories: { Text: ['Heading', 'Quote'] } });
  assert.ok(cfg.components.Quote);
  assert.equal(cfg.components.Spacer, undefined);
  assert.deepEqual(cfg.categories.Text, ['Heading', 'Quote']);
  assert.ok(!cfg.categories.Layout.includes('Spacer'));
  assert.ok(defaultConfig.components.Spacer, 'base config is not mutated');
});
