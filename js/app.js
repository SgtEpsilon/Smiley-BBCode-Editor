import { COLORS } from './tags.js';
import { parse } from './parser.js';
import { render } from './render.js';
import { highlight } from './highlight.js';
import { createEditor, TOOLBAR, findShortcut } from './editor.js';
import {
    images,
    findImage,
    addImages,
    setImageId,
    removeImage,
} from './inlines.js';
import { sample } from './sample.js';

const $ = id => document.getElementById(id);
const make = (tag, props) => Object.assign(document.createElement(tag), props);

const input = $('input');
const preview = $('preview');
const colorPopover = $('color-popover');
const backdrop = $('backdrop');

function syncScroll() {
    backdrop.scrollTop = input.scrollTop;
    backdrop.scrollLeft = input.scrollLeft;
}

const SETTINGS_KEY = 'fbb.settings';
const DRAFT_KEY = 'fbb.draft';
const DEFAULTS = { theme: 'default', palette: 'classic', collapse: 'open' };

// localStorage can throw (private windows, blocked cookies); the editor works without it
function save(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

function load(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function loadSettings() {
    try {
        return { ...DEFAULTS, ...JSON.parse(load(SETTINGS_KEY)) };
    } catch {
        return { ...DEFAULTS };
    }
}

const settings = loadSettings();
const collapseState = new Map();
const spoilerState = new Set();
const editor = createEditor(input);

// preview

function showWarnings(warnings, text) {
    const count = warnings.length;
    $('warnings-summary').textContent = count
        ? `${count} warning${count === 1 ? '' : 's'}`
        : 'No warnings';
    $('warnings').classList.toggle('has-warnings', count > 0);

    const items = warnings.map(warning => {
        const line = text.slice(0, warning.index).split('\n').length;
        const button = make('button', {
            type: 'button',
            className: 'warning-link',
            textContent: `Line ${line}: ${warning.message}`,
        });
        button.addEventListener('click', () => editor.jumpTo(warning.index));

        const item = make('li');
        item.appendChild(button);
        return item;
    });

    $('warnings-list').replaceChildren(...items);
}

function update() {
    const text = input.value;
    const { nodes, warnings } = parse(text);

    const fragment = render(nodes, {
        inline: findImage,
        collapseOpen: settings.collapse === 'open',
        collapseState,
        spoilerState,
        warnings,
    });
    preview.replaceChildren(fragment);

    // the trailing newline keeps a final empty line from collapsing
    backdrop.innerHTML = highlight(text) + '\n';
    syncScroll();

    warnings.sort((a, b) => a.index - b.index);
    showWarnings(warnings, text);
    $('count').textContent = `${text.length.toLocaleString()} characters`;
    save(DRAFT_KEY, text);
}

// toolbar

const ui = {
    toggleColors() {
        colorPopover.hidden = !colorPopover.hidden;
    },
};

function shortcutLabel(item) {
    if (!item.key) return '';

    const arrows = { arrowup: '↑', arrowdown: '↓' };
    const key = arrows[item.key] || item.key.toUpperCase();
    return ` (Ctrl+${item.shift ? 'Shift+' : ''}${key})`;
}

function buildToolbar() {
    TOOLBAR.forEach((group, index) => {
        if (index > 0)
            $('toolbar').appendChild(
                make('span', { className: 'toolbar-divider' })
            );

        for (const item of group) {
            const button = make('button', {
                type: 'button',
                className: `tb ${item.cls || ''}`.trim(),
                title: item.title + shortcutLabel(item),
            });

            // icons are fixed SVG strings from editor.js
            if (item.icon) button.innerHTML = item.icon;
            else button.textContent = item.label;

            button.addEventListener('click', () => item.run(editor, ui));
            $('toolbar').appendChild(button);
        }
    });

    for (const name of COLORS) {
        const swatch = make('button', {
            type: 'button',
            className: 'swatch',
            title: name,
        });
        swatch.style.background = `var(--c-${name})`;
        swatch.setAttribute('aria-label', name);

        swatch.addEventListener('click', () => {
            colorPopover.hidden = true;
            editor.color(name);
        });
        colorPopover.appendChild(swatch);
    }
}

input.addEventListener('keydown', event => {
    if (editor.handleKeydown(event)) return;

    const item = findShortcut(event);
    if (!item) return;

    event.preventDefault();
    (item.keyRun || item.run)(editor, ui);
});

input.addEventListener('input', event => {
    editor.handleInput(event);
    update();
});

input.addEventListener('scroll', syncScroll);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') colorPopover.hidden = true;
});

// settings

function applySettings() {
    // only the preview gets the theme; the editor and swatches stay readable on dark
    preview.dataset.theme = settings.theme;

    // the swatches share the preview's palette
    preview.dataset.palette = settings.palette;
    colorPopover.dataset.palette = settings.palette;
    backdrop.dataset.palette = settings.palette;
}

function bindSetting(name) {
    const select = $(`setting-${name}`);
    select.value = settings[name];

    select.addEventListener('change', () => {
        settings[name] = select.value;
        save(SETTINGS_KEY, JSON.stringify(settings));

        if (name === 'collapse') collapseState.clear();
        applySettings();
        update();
    });
}

// header buttons

$('copy').addEventListener('click', async event => {
    const button = event.currentTarget;

    try {
        await navigator.clipboard.writeText(input.value);
    } catch {
        input.select();
        document.execCommand('copy');
    }

    button.textContent = 'Copied';
    setTimeout(() => (button.textContent = 'Copy BBCode'), 1500);
});

$('example').addEventListener('click', () => {
    const replacing = input.value.trim() !== '';
    if (replacing && !confirm('Replace the current text with the example?'))
        return;

    editor.replaceAll(sample);
    collapseState.clear();
    spoilerState.clear();
});

// inline images

function imageRow(image) {
    const thumb = make('img', { src: image.url, alt: '' });

    const id = make('input', {
        type: 'number',
        min: '0',
        value: image.id,
        title: 'The id used in [img=ID]',
    });
    id.setAttribute('aria-label', 'Image id');
    id.addEventListener('change', () => {
        if (setImageId(image, Number(id.value))) {
            refreshImages();
            return;
        }

        // the id was taken or invalid: put the old one back and flash red
        id.value = image.id;
        id.classList.add('invalid');
        setTimeout(() => id.classList.remove('invalid'), 800);
    });

    const name = make('input', {
        type: 'text',
        value: image.name,
        title: 'Name used when inserting the tag',
    });
    name.setAttribute('aria-label', 'Image name');
    name.addEventListener('change', () => (image.name = name.value));

    const insert = make('button', {
        type: 'button',
        className: 'btn',
        textContent: 'Insert',
    });
    insert.addEventListener('click', () =>
        editor.insert(`[img=${image.id}]${image.name}[/img]`)
    );

    const remove = make('button', {
        type: 'button',
        className: 'btn',
        textContent: '✕',
        title: 'Remove image',
    });
    remove.setAttribute('aria-label', 'Remove image');
    remove.addEventListener('click', () => {
        removeImage(image);
        refreshImages();
    });

    const row = make('li', { className: 'inline-row' });
    row.append(thumb, id, name, insert, remove);
    return row;
}

// redraws the image list and the preview, which may use those images
function refreshImages() {
    $('inline-list').replaceChildren(...images.map(imageRow));
    $('inline-count').textContent = images.length ? `(${images.length})` : '';
    update();
}

function addFiles(files) {
    const skipped = addImages(Array.from(files));
    if (skipped)
        alert(`${skipped} file(s) were skipped because they are not images.`);
    refreshImages();
}

$('inline-add').addEventListener('click', () => $('inline-file').click());
$('inline-file').addEventListener('change', event => {
    addFiles(event.target.files);
    event.target.value = '';
});

const dropzone = $('inlines');
dropzone.addEventListener('dragover', event => {
    if (!event.dataTransfer.types.includes('Files')) return;

    event.preventDefault();
    dropzone.classList.add('dragging');
});
dropzone.addEventListener('dragleave', () =>
    dropzone.classList.remove('dragging')
);
dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('dragging');
    addFiles(event.dataTransfer.files);
});

// start

buildToolbar();
for (const name of Object.keys(DEFAULTS)) bindSetting(name);
applySettings();

const draft = load(DRAFT_KEY);
input.value = draft === null ? sample : draft;
update();
