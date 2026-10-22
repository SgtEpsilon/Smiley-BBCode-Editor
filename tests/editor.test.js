import test from 'node:test';
import assert from 'node:assert/strict';
import { completeColor, COLORS } from '../js/tags.js';
import { colorParam } from '../js/editor.js';

test('a letter that starts only one color completes it', () => {
    assert.equal(completeColor('r'), 'red');
    assert.equal(completeColor('o'), 'orange');
    assert.equal(completeColor('y'), 'yellow');
    assert.equal(completeColor('w'), 'white');
    assert.equal(completeColor('c'), 'cyan');
});

test('ambiguous prefixes wait for more letters', () => {
    assert.equal(completeColor('g'), null);
    assert.equal(completeColor('gr'), null);
    assert.equal(completeColor('gre'), 'green');
    assert.equal(completeColor('gra'), 'gray');
    assert.equal(completeColor('b'), null);
    assert.equal(completeColor('bl'), null);
    assert.equal(completeColor('blu'), 'blue');
    assert.equal(completeColor('bla'), 'black');
    assert.equal(completeColor('br'), 'brown');
    assert.equal(completeColor('p'), null);
    assert.equal(completeColor('pi'), 'pink');
    assert.equal(completeColor('pu'), 'purple');
});

test('anything that is not a color prefix is left alone', () => {
    assert.equal(completeColor(''), null);
    assert.equal(completeColor('x'), null);
    assert.equal(completeColor('reds'), null);
    assert.equal(completeColor('#f'), null);
});

test('matching ignores case', () => {
    assert.equal(completeColor('R'), 'red');
    assert.equal(completeColor('GRE'), 'green');
});

test('every color can be reached by typing', () => {
    for (const name of COLORS) {
        let found = false;
        for (let n = 1; n <= name.length; n++) {
            if (completeColor(name.slice(0, n)) === name) found = true;
        }
        assert.ok(found, name);
    }
});

test('colorParam finds the end of a color parameter', () => {
    assert.deepEqual(colorParam('[color=]x[/color]', 7, 7), {
        prefix: '',
        close: 7,
    });
    assert.deepEqual(colorParam('a [color=gr]x', 11, 11), {
        prefix: 'gr',
        close: 11,
    });
    // A selected suggestion: the caret range ends at the bracket.
    assert.deepEqual(colorParam('[color=red]x', 8, 10), {
        prefix: 'r',
        close: 10,
    });
});

test('colorParam ignores everything else', () => {
    assert.equal(colorParam('[b]x[/b]', 3, 3), null);
    assert.equal(colorParam('[color=red]x', 11, 11), null);
    assert.equal(colorParam('[color=#f]x', 9, 9), null);
    assert.equal(colorParam('[color=\n]x', 8, 8), null);
    assert.equal(colorParam(']', 0, 0), null);
});
