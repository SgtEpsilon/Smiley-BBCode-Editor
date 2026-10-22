export const COLORS = [
    'red',
    'blue',
    'white',
    'yellow',
    'pink',
    'gray',
    'green',
    'orange',
    'purple',
    'black',
    'brown',
    'cyan',
];

const INLINE_TEXT = ['url', 'i', 'u', 'b', 'color', 's', 'hr'];

// everything except spoiler
const HEADING_CONTENT = [
    'url',
    'i',
    'b',
    'u',
    's',
    'color',
    'sub',
    'sup',
    'big',
    'small',
    'heading',
    'hr',
    'icon',
    'user',
    'img',
    'eicon',
    'quote',
    'collapse',
    'left',
    'center',
    'right',
    'justify',
    'indent',
    'noparse',
];

// kind is container, raw (kept as typed) or void; allow limits the tags used inside
export const defs = {
    b: { kind: 'container' },
    i: { kind: 'container' },
    u: { kind: 'container' },
    s: { kind: 'container' },
    color: { kind: 'container' },
    sub: { kind: 'container', allow: ['i', 'u', 'b', 'hr'] },
    sup: { kind: 'container', allow: ['i', 'u', 'b', 'hr'] },
    big: { kind: 'container', allow: INLINE_TEXT },
    small: { kind: 'container', allow: INLINE_TEXT },
    heading: { kind: 'container', allow: HEADING_CONTENT },
    left: { kind: 'container' },
    center: { kind: 'container' },
    right: { kind: 'container' },
    justify: { kind: 'container' },
    indent: { kind: 'container' },
    quote: { kind: 'container' },
    collapse: { kind: 'container' },
    spoiler: { kind: 'container' },
    hr: { kind: 'void' },
    noparse: { kind: 'raw' },
    url: { kind: 'raw' },
    icon: { kind: 'raw' },
    eicon: { kind: 'raw' },
    user: { kind: 'raw' },
    img: { kind: 'raw' },
};

export const NAME_RE = /^[a-zA-Z0-9_\-\s]+$/;

// only these schemes become links, which rules out javascript: and data:
export const URL_RE = /^(?:https?|ftps?|irc):\/\/[^\s/$.?#"']+\.[^\s"]+$/i;
export const FIND_URL_RE =
    /(?:https?|ftps?|irc):\/\/[^\s/$.?#"'[\]]+\.[^\s"[\]]+/gi;

// the one color starting with prefix, or null if none or several do
export function completeColor(prefix) {
    const start = prefix.toLowerCase();
    if (!start) return null;

    const matches = COLORS.filter(name => name.startsWith(start));
    return matches.length === 1 ? matches[0] : null;
}
