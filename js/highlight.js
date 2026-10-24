import { COLORS, FIND_URL_RE } from './tags.js';
import { readTag, findCloser } from './parser.js';

// highlight(text) returns HTML for the layer behind the textarea; it must
// contain exactly the characters of text, so the two layers line up

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escape = text => text.replace(/[&<>]/g, char => ESCAPES[char]);
const span = (cls, text) => `<span class="${cls}">${escape(text)}</span>`;

// plain text, with bare web addresses marked as links like the parser does
function plain(text) {
    let out = '';
    let at = 0;

    for (const match of text.matchAll(FIND_URL_RE)) {
        out += escape(text.slice(at, match.index)) + span('tk-url', match[0]);
        at = match.index + match[0].length;
    }

    return out + escape(text.slice(at));
}

function tag(source, name) {
    const eq = source.indexOf('=');
    if (eq === -1) return span('tk-tag', source);

    const param = source.slice(eq + 1, -1);
    const color =
        name === 'color' && COLORS.find(c => c === param.trim().toLowerCase());

    // color is one of COLORS, so it is safe to put in the style
    const paramSpan = color
        ? `<span class="tk-color${color === 'black' ? ' tk-black' : ''}" style="color:var(--c-${color})">${escape(param)}</span>`
        : span('tk-param', param);

    return (
        span('tk-tag', source.slice(0, eq + 1)) +
        paramSpan +
        span('tk-tag', ']')
    );
}

export function highlight(text) {
    let out = '';
    let last = 0;
    let i = 0;

    while ((i = text.indexOf('[', i)) !== -1) {
        const tok = readTag(text, i);
        if (!tok) {
            i++;
            continue;
        }

        out += plain(text.slice(last, tok.start));
        last = i = tok.end;
        const source = text.slice(tok.start, tok.end);

        // raw tags (noparse, url...) keep their content as typed; without a closer the parser shows them as text
        if (!tok.closing && tok.def.kind === 'raw') {
            const close = findCloser(text, tok.end, tok.name);
            if (!close) {
                out += plain(source);
                continue;
            }

            const stop = close.index + close[0].length;
            out +=
                tag(source, tok.name) +
                escape(text.slice(tok.end, close.index)) +
                tag(close[0], tok.name);
            last = i = stop;
            continue;
        }

        out += tag(source, tok.name);
    }

    return out + plain(text.slice(last));
}
