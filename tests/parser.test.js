import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../js/parser.js';

// one-line view of a tree, so the tests can compare plain strings
function show(nodes) {
    return nodes
        .map(node => {
            if (node.type === 'text') return JSON.stringify(node.value);
            if (node.type === 'void') return `<${node.tag}/>`;

            if (node.type === 'url') {
                return `<url ${node.url} "${node.text}" ${node.domain}/>`;
            }

            if (node.type === 'raw') {
                if (node.tag === 'img')
                    return `<img ${node.id} "${node.name}"/>`;
                if (node.tag === 'noparse')
                    return `<noparse ${JSON.stringify(node.text)}/>`;
                return `<${node.tag} ${node.name}/>`;
            }

            const param = node.param ? '=' + node.param : '';
            return `<${node.tag}${param}>${show(node.children)}</${node.tag}>`;
        })
        .join('');
}

const tree = input => show(parse(input).nodes);
const warnings = input => parse(input).warnings.map(warning => warning.message);

test('plain text and basic formatting', () => {
    assert.equal(tree('hello'), '"hello"');
    assert.equal(
        tree('a [b]bold[/b] [I]it[/i]'),
        '"a "<b>"bold"</b>" "<i>"it"</i>'
    );
});

test('tags nest and the output is always balanced', () => {
    assert.equal(tree('[b][i]x[/i][/b]'), '<b><i>"x"</i></b>');
    assert.equal(tree('[b]a[b]b[/b]c[/b]'), '<b>"a"<b>"b"</b>"c"</b>');
});

test('unclosed tags close at the end and warn', () => {
    assert.equal(tree('[b]open'), '<b>"open"</b>');
    assert.match(warnings('[b]open')[0], /never closed/);
});

test('mismatched and stray closers stay as text', () => {
    assert.equal(tree('[b][i]x[/b]y[/i]'), '<b><i>"x[/b]y"</i></b>');
    assert.match(warnings('[b][i]x[/b]y[/i]')[0], /\[i\] is still open/);
    assert.equal(tree('x[/b]'), '"x[/b]"');
    assert.match(warnings('x[/b]')[0], /never opened/);
});

test('unknown tags and lone brackets are plain text', () => {
    assert.equal(tree('[foo]x[/foo] [ ] [b'), '"[foo]x[/foo] [ ] [b"');
});

test('allow-lists apply and are inherited', () => {
    assert.equal(
        tree('[big][heading]x[/heading][/big]'),
        '<big>"[heading]x[/heading]"</big>'
    );
    assert.match(
        warnings('[big][heading]x[/heading][/big]')[0],
        /cannot be used/
    );
    assert.equal(
        tree('[big][eicon]x[/eicon][/big]'),
        '<big>"[eicon]x[/eicon]"</big>'
    );
    // [b] is allowed in [sub], but [b][url] is not: sub's list is inherited.
    assert.equal(
        tree('[sub][b][color=red]x[/color][/b][/sub]'),
        '<sub><b>"[color=red]x[/color]"</b></sub>'
    );
    assert.equal(tree('[sub][hr][/sub]'), '<sub><hr/></sub>');
});

test('sub and sup only allow b, i, u and hr inside', () => {
    assert.equal(
        tree('[sup][color=red]x[/color][/sup]'),
        '<sup>"[color=red]x[/color]"</sup>'
    );
    assert.equal(tree('[sup][i]x[/i][/sup]'), '<sup><i>"x"</i></sup>');
});

test('color accepts only the named colors', () => {
    const ok = parse('[color=Red]x[/color]');
    assert.equal(ok.nodes[0].color, 'red');
    const bad = parse('[color=#fff]x[/color]');
    assert.equal(bad.nodes[0].color, null);
    assert.match(bad.warnings[0].message, /Unknown color/);
    assert.equal(
        parse('[color=red" onmouseover="x]y[/color]').nodes[0].color,
        null
    );
});

test('hr is void', () => {
    assert.equal(tree('a[hr]b'), '"a"<hr/>"b"');
});

test('noparse keeps its content literal', () => {
    assert.equal(
        tree('[noparse][b]x[/b]\nhttp://a.com[/noparse]'),
        '<noparse "[b]x[/b]\\nhttp://a.com"/>'
    );
});

test('collapse titles can contain [hr]', () => {
    const nodes = parse('[collapse=[hr]Title[hr]]body[/collapse]').nodes;
    assert.equal(nodes[0].tag, 'collapse');
    assert.equal(nodes[0].param, '[hr]Title[hr]');
    assert.equal(show(nodes[0].children), '"body"');
});

test('collapse with an empty title is allowed and nests', () => {
    assert.equal(
        tree('[collapse=]a[collapse=b]c[/collapse][/collapse]'),
        '<collapse>"a"<collapse=b>"c"</collapse></collapse>'
    );
});

test('[hr] inside a collapse body is a normal hr', () => {
    assert.equal(
        tree('[collapse=T]a[hr]b[/collapse]'),
        '<collapse=T>"a"<hr/>"b"</collapse>'
    );
});

test('tag parameters cannot span lines', () => {
    assert.equal(tree('[color=red\n]x'), '"[color=red\\n]x"');
});

test('url tag: param, content, validation', () => {
    assert.equal(
        tree('[url=https://www.example.com/a]site[/url]'),
        '<url https://www.example.com/a "site" example.com/>'
    );
    assert.equal(
        tree('[url]www.example.com[/url]'),
        '<url https://www.example.com "www.example.com" example.com/>'
    );
    assert.equal(
        tree('[url=https://example.com][b]x[/b][/url]'),
        '<url https://example.com "[b]x[/b]" example.com/>'
    );
});

test('url tag rejects unsafe schemes', () => {
    assert.equal(
        tree('[url=javascript:alert(1)]x[/url]'),
        '"[BAD URL] javascript:alert(1)"'
    );
    assert.equal(
        tree('[url]data:text/html,x[/url]'),
        '"[BAD URL] data:text/html,x"'
    );
    assert.match(
        warnings('[url=javascript:alert(1)]x[/url]')[0],
        /not a valid link/
    );
});

test('bare urls become links, but not inside noparse or unsafe parents', () => {
    assert.equal(
        tree('see http://a.com/x ok'),
        '"see "<url http://a.com/x "http://a.com/x" a.com/>" ok"'
    );
    assert.equal(
        tree('[b]http://a.com[/b]'),
        '<b><url http://a.com "http://a.com" a.com/></b>'
    );
    assert.equal(tree('[sub]http://a.com[/sub]'), '<sub>"http://a.com"</sub>');
    assert.equal(
        tree('[noparse]http://a.com[/noparse]'),
        '<noparse "http://a.com"/>'
    );
});

test('icon, eicon and user validate their names', () => {
    assert.equal(tree('[icon]Some Name[/icon]'), '<icon Some Name/>');
    const bad = parse('[eicon]x" onerror="y[/eicon]').nodes;
    assert.deepEqual(bad, [
        { type: 'text', value: '[eicon]x" onerror="y[/eicon]' },
    ]);
    assert.equal(tree('[user]Bob_1[/user]'), '<user Bob_1/>');
    assert.match(warnings('[icon]a<b[/icon]')[0], /plain name/);
});

test('img needs a numeric id', () => {
    assert.equal(tree('[img=123]My pic[/img]'), '<img 123 "My pic"/>');
    assert.equal(tree('[img=abc]x[/img]'), '"[img=abc]x[/img]"');
    assert.match(warnings('[img=abc]x[/img]')[0], /numeric id/);
});

test('raw tags that never close are shown as text', () => {
    assert.equal(tree('[icon]Name'), '"[icon]Name"');
    assert.match(warnings('[icon]Name')[0], /never closed/);
});

test('warnings carry the character offset', () => {
    const w = parse('ab[b]c').warnings[0];
    assert.equal(w.index, 2);
});
