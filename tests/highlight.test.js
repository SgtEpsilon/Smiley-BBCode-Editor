import test from 'node:test';
import assert from 'node:assert/strict';
import { highlight } from '../js/highlight.js';

// the colored layer must hold exactly the typed characters
const textOf = html =>
    html
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

test('plain text and unknown tags are left alone', () => {
    assert.equal(highlight('hello [foo] [b'), 'hello [foo] [b');
});

test('tags and color parameters are marked', () => {
    assert.equal(
        highlight('[b]x[/b]'),
        '<span class="tk-tag">[b]</span>x<span class="tk-tag">[/b]</span>'
    );
    assert.equal(
        highlight('[color=Red]x'),
        '<span class="tk-tag">[color=</span>' +
            '<span class="tk-color" style="color:var(--c-red)">Red</span>' +
            '<span class="tk-tag">]</span>x'
    );
});

test('an unknown color is a plain parameter', () => {
    assert.match(highlight('[color=nope]'), /tk-param">nope</);
});

test('html in the text is escaped', () => {
    assert.equal(
        highlight('<img src=x onerror=1> &'),
        '&lt;img src=x onerror=1&gt; &amp;'
    );
});

test('noparse content is not highlighted', () => {
    assert.equal(
        highlight('[noparse][b][/noparse]'),
        '<span class="tk-tag">[noparse]</span>[b]<span class="tk-tag">[/noparse]</span>'
    );
});

test('an unclosed raw tag stays plain', () => {
    assert.equal(
        highlight('[noparse][b]'),
        '[noparse]<span class="tk-tag">[b]</span>'
    );
});

test('bare links are marked', () => {
    assert.equal(
        highlight('see https://example.com now'),
        'see <span class="tk-url">https://example.com</span> now'
    );
});

test('the text is never changed', () => {
    const text =
        '[color=red]a <b> & [url=https://x.com]l[/url] [noparse]<[/noparse]\n[hr]';
    assert.equal(textOf(highlight(text)), text);
});
