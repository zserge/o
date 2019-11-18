import assert from 'assert';
import jsdom from 'jsdom';

import { h, x, render, useState, useReducer, useEffect } from './o.mjs';

// Global document mock
global.document = new jsdom.JSDOM(`<html><body></body></html>`).window.document;

// Global map of tests
const $ = {};

// ---------------------------------------------------------------------------
// Hyperscript function should have default properties as an object,
// and default children list as an array.
// ---------------------------------------------------------------------------
$['hyperscript'] = () => {
  assert.deepEqual(h('div'), { e: 'div', p: {}, c: [] });
  assert.deepEqual(h('div', undefined, 'Hello'), {
    e: 'div',
    p: {},
    c: ['Hello']
  });
  assert.deepEqual(h('div', { a: 1 }, 'Hello'), {
    e: 'div',
    p: { a: 1 },
    c: ['Hello']
  });
};

// ---------------------------------------------------------------------------
// Syntax sugar with tagged template literals
// ---------------------------------------------------------------------------
$['x: empty'] = () => assert.equal(x``, undefined);
$['x: text'] = () => assert.equal(x`hello`, 'hello');
$['x: normal tag'] = () => assert.deepEqual(x`<div></div>`, h('div'));
$['x: self-closing tag'] = () => assert.deepEqual(x`<br />`, h('br'));
$['x: attrs'] = () =>
  assert.deepEqual(x`<div a="b" c="d e" />`, h('div', { a: 'b', c: 'd e' }));
$['x: tag with text'] = () =>
  assert.deepEqual(x`<p>Hello</p>`, h('p', {}, 'Hello'));
$['x: nested tags'] = () =>
  assert.deepEqual(x`<p><i>Hello</i></p>`, h('p', {}, h('i', {}, 'Hello')));
$['x: ${text}'] = () => {
  assert.deepEqual(x`<p>hello, ${'world'}</p>`, h('p', {}, 'hello, ', 'world'));
  assert.deepEqual(
    x`<p>hello, ${'world'}!</p>`,
    h('p', {}, 'hello, ', 'world', '!')
  );
  assert.deepEqual(
    x`<p>${'world'}, hello!</p>`,
    h('p', {}, 'world', ', hello!')
  );
};
$['x: ${tag}'] = () => {
  assert.deepEqual(x`<${'p'}>hello</${'p'}>`, h('p', {}, 'hello'));
  assert.deepEqual(x`<${'br'} />`, h('br'));
};
$['x: ${attr}'] = () => {
  assert.deepEqual(x`<p a=${'b'} c=${'d'}/>`, h('p', { a: 'b', c: 'd' }));
};

// ---------------------------------------------------------------------------
// Simple rendering of stateless components with hyperscript
// ---------------------------------------------------------------------------
$['render: single stateless node'] = () => {
  render(x`<div className="simple">text</div>`, document.body);
  assert.equal(document.querySelector('.simple').textContent, 'text');
};
$['render: single stateless component'] = () => {
  const Hello = () => x`<div className="component">Hello</div>`;
  render(h(Hello), document.body);
  assert.equal(document.querySelector('.component').textContent, 'Hello');
};
$['render: component with properties'] = () => {
  const Text = ({ cls, text }) => x`<p className=${cls}>${text}</p>`;
  render(h(Text, { cls: 'foo', text: 'bar' }), document.body);
  assert.equal(document.querySelector('.foo').textContent, 'bar');
};
$['render: component with children'] = () => {
  const A = () => x`<div className="a">A</div>`;
  const B = () => x`<div className="b">B</div>`;
  const C = (props, children) => x`<div className="c">${children}</div>`;
  const D = () => x`<${C}><${C}><${A} /><${B} /></${C}></${C}>`;
  render(h(D), document.body);
  assert.equal(document.querySelector('.c > .c > .a').textContent, 'A');
  assert.equal(document.querySelector('.c > .c > .b').textContent, 'B');
};

// ---------------------------------------------------------------------------
// forceUpdate()
// ---------------------------------------------------------------------------
$['forceUpdate: click counter'] = () => {
  let n = 0;
  const Counter = (props, children, forceUpdate) => {
    const handleClick = () => {
      n++;
      forceUpdate();
    };
    return x`
      <div>
        <div className="count">Count: ${n}</div>
        <button onclick=${handleClick}>Add</button>
      </div>
    `;
  };
  render(h(Counter), document.body);
  assert.equal(document.querySelector('.count').textContent, 'Count: 0');
  document.querySelector('button').onclick();
  assert.equal(document.querySelector('.count').textContent, 'Count: 1');
  document.querySelector('button').onclick();
  assert.equal(document.querySelector('.count').textContent, 'Count: 2');
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
$['hooks: useState'] = () => {
  const Counter = () => {
    const [n, setN] = useState(0);
    return x`
      <div>
        <div className="count">Count: ${n}</div>
        <button onclick=${() => setN(n + 1)}>Add</button>
      </div>
    `;
  };
  document.body.innerHTML = ''; // clear all the previous hooks
  render(h(Counter), document.body);
  assert.equal(document.querySelector('.count').textContent, 'Count: 0');
  document.querySelector('button').onclick();
  assert.equal(document.querySelector('.count').textContent, 'Count: 1');
  document.querySelector('button').onclick();
  assert.equal(document.querySelector('.count').textContent, 'Count: 2');
};

$['hooks: useReducer'] = () => {
  const reducer = (state, action) => {
    switch (action) {
      case 'incr':
        return state + 1;
      case 'decr':
        return state - 1;
    }
    return state;
  };
  const Counter = () => {
    const [n, dispatch] = useReducer(reducer, 0);
    return x`
      <div>
        <div className="count">Count: ${n}</div>
        <button onclick=${() => dispatch('incr')}>Add</button>
      </div>
    `;
  };
  document.body.innerHTML = ''; // clear all the previous hooks
  render(h(Counter), document.body);
  assert.equal(document.querySelector('.count').textContent, 'Count: 0');
  document.querySelector('button').onclick();
  assert.equal(document.querySelector('.count').textContent, 'Count: 1');
  document.querySelector('button').onclick();
  assert.equal(document.querySelector('.count').textContent, 'Count: 2');
};

$['hooks: reorder with id'] = () => {
  const C = ({ id }) => {
    const [n, setN] = useState(0);
    return x`
      <div id=${id}>
        <div className="count">Count: ${n}</div>
        <button onclick=${() => setN(n + 1)}>Add</button>
      </div>
    `;
  };
  const A = () =>
    x`<div><${C} id="c1" k="c1"/><${C} id="c2" k="c2"/><br/></div>`;
  const B = () =>
    x`<div><br/><${C} id="c3" k="c2"/><${C} id="c4" k="c1"/></div>`;
  document.body.innerHTML = ''; // clear all the previous hooks
  render(h(A), document.body);
  document.querySelector('#c1 button').onclick();
  document.querySelector('#c2 button').onclick();
  document.querySelector('#c2 button').onclick();
  assert.equal(document.querySelector('#c1 .count').textContent, 'Count: 1');
  assert.equal(document.querySelector('#c2 .count').textContent, 'Count: 2');
  render(h(B), document.body);
  assert.equal(document.querySelector('#c3 .count').textContent, 'Count: 2');
  assert.equal(document.querySelector('#c4 .count').textContent, 'Count: 1');
};

$['hooks: useEffect'] = () => {
  let called = 0;
  let cleanup = 0;
  const Title = ({ title }) => {
    let afterRender = 0;
    useEffect(() => {
      assert.equal(afterRender, 1);
      assert.equal(document.querySelector('h1').textContent, title);
      called++;
      document.title = title;
      return () => {
        cleanup++;
      };
    }, [title]);
    afterRender = 1;
    return x`<h1>${title}</h1>`;
  };
  document.body.innerHTML = '';
  // Render and ensure that useEffect is called only when title is changed
  render(h(Title, { title: 'foo' }), document.body);
  assert.equal(called, 1);
  assert.equal(document.querySelector('h1').textContent, 'foo');
  render(h(Title, { title: 'foo' }), document.body);
  assert.equal(called, 1);
  assert.equal(document.querySelector('h1').textContent, 'foo');
  render(h(Title, { title: 'bar' }), document.body);
  assert.equal(called, 2);
  assert.equal(document.querySelector('h1').textContent, 'bar');
  // Un-mount and ensure that cleanup callback is called
  render([], document.body);
  assert.equal(called, 2);
  assert.equal(cleanup, 1);
  // Mount again and ensure that useEffect is called once more
  render(h(Title, { title: 'bar' }), document.body);
  assert.equal(called, 3);
  assert.equal(cleanup, 1);
  // Un-mount and ensure that cleanup callback is called once more
  render([], document.body);
  assert.equal(called, 3);
  assert.equal(cleanup, 2);
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

// Try running "+" tests only, otherwise run all tests, skipping "-" tests.
if (
  Object.keys($)
    .filter(t => t.startsWith('+'))
    .map(t => $[t]()).length == 0
) {
  for (let t in $) {
    if (t.startsWith('-')) {
      console.log('SKIP:', t);
    } else {
      console.log('TEST:', t);
      $[t]();
    }
  }
}
