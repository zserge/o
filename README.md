# O!

[![Build Status](https://travis-ci.org/zserge/o.svg?branch=master)](https://travis-ci.org/zserge/o)

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

## License

Code is distributed under MIT license, feel free to use it in your proprietary
projects as well.
