# O!

[![Build Status](https://travis-ci.org/zserge/o.svg?branch=master)](https://travis-ci.org/zserge/o)
[![npm](https://img.shields.io/npm/v/@zserge/o.svg)](http://npm.im/@zserge/o)
[![gzip size](http://img.badgesize.io/https://unpkg.com/@zserge/o/o.min.mjs?compression=gzip)](https://unpkg.com/@zserge/o/o.min.mjs)

<div>
<img align="left" src="https://raw.githubusercontent.com/zserge/o/master/logo.png" alt="O!" />
<br/>
<p>
	A very small (<1KB) library to explain how React-like libraries work. Never meant to be used in any of the serious projects. But, hey, it has a JSX-like language and even Hooks! How cool is that? It started as a quick morning experiment some cold autumn Friday. They joy of seeing a simple counter component finally working made it warmer. It's really an exercise in minimalism, and nothing more.
</p>
<br/>
</div>

## Features

* Something around 1KB when minified and gzipped.
* Has `h()` and `render()` API with the support of functional components.
* Has `useState`, `useReducer` and `useEffect` hooks, just like real React.
* Has a custom template syntax sugar, very similar to normal HTML.
* Supports SVG tags.
* Zero dependencies, obviously.
* No transpiler needed. Just import a single file as a module and start writing code.
* Should be not so hard to understand and then move on to some more appropriate React clones.

## Example to whet your appetite

```javascript
import { h, x, render, useState } from 'o.mjs';

const Counter = ({ initialValue = 0 }) => {
  const [value, setValue] = useState(initialValue);
  return x`
    <div className="counter">
      <div>${value}</div>
      <div className="row">
        <button onclick=${() => setValue(value + 1)}>+</button>
        <button onclick=${() => setValue(value - 1)}>-</button>
      </div>
    </div>
  `;
};

render(h(Counter, { initialValue: 10 }), document.body);
```

See it [live](https://raw.githack.com/zserge/o/master/counter.html)

## API

Hey, it might be quicker to read the sources than this text. Anyway,

* `render(component, containerNode)` - renders `component` into `containerNode`. In other words, it patches the `containerNode` to reflect the `component` virtual node. Beware, diffing algorithm is very dumb and inefficient. Does not return anything.
* `h(nodeName|Function, properties, ...children)` - returns a virtual node. `nodeName` can be a HTML tag name (string) to a functional component (JS function). Properties must be an object. Property names closely reflect DOM Node properties, so use `className` instead of `class`, also `style` is a CSS string, not an object. The only artificial property is `k` which is a key used to keep component state between the updates if the position of the component in the DOM tree has changed. Finally, `children` is a variadic argument containing other `h()` nodes or raw JS strings if you want a text node.
* `` x`<div>...</div>` `` - syntax sugar to replace multiple `h()` calls. Accepts regular HTML code and converts it into virtual node tree. Template placeholders can only be used as tag names, attribute value or text between the tags. Constant attribute values must be double-quoted (even if they are numbers). Tags can be self-closing. Only one top-level tag is allowed. And yes, there must be at least one top-level tag.
* `useState(initialValue)` - returns an array `[value, setValue]` of the current state and a setter for the state, that would also trigger an update for the current component.
* `useReducer(reducer, initialValue)` - returns an array `[state, dispatch]` of the current state and a function to dispatch an action to the reducer. `reducer` is a `(state, action) => newState` function that returns a new state based on the current state and the given action. Use this as an alternative to `useState` is you need a more complex logic in your states.
* `useEffect(callback, deps)` - tries to fire a callback when component is rendered, but only if the `deps` array has changed since the last call. An efficient way to add side effects to your functional components.

Finally, what is a functional component? In our case it is a regular JS function that takes two arguments - an object of component properties and a `forceUpdate` callback, that will trigger component update once called. Functional components must return a tree of virtual nodes constructed with `h()` calls or `` x` ` `` syntax.

## What a weird name for a project

The library is called "O!". It's a sound of realisation, once you understood how simple it is. Or despair, if you caught a fatal bug after you decided to use this in production. It also resembles a zero, which is a metaphor for both, library footprint and usefulness. More details on how this library originated at https://zserge.com/posts/worst-react-ever/

## License

Code is distributed under MIT license, feel free to use it in your proprietary
projects as well.
