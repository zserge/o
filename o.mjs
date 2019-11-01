// Hyperscript function
export const h = (e, p = {}, ...c) => ({ e, p, c });

// Minimal JSX-like parser based on tagged template literals
export const x = (strings, ...fields) => {
  const stack = [{ c: [] }];
  const find = (s, re, arg) => {
    if (!s) {
      return [s, arg];
    }
    let m = s.match(re);
    return [s.substring(m[0].length), m[1]];
  };
  const MODE_TEXT = 0;
  const MODE_OPEN = 1;
  const MODE_CLOSE = 2;
  let mode = MODE_TEXT;
  strings.forEach((s, i) => {
    while (s) {
      let val;
      s = s.trimLeft();
      switch (mode) {
        case MODE_TEXT:
          if (s[0] === '<') {
            if (s[1] === '/') {
              [s, val] = find(s.substring(2), /^([a-zA-Z0-9]+)/, fields[i]);
              mode = MODE_CLOSE;
            } else {
              [s, val] = find(s.substring(1), /^([a-zA-Z0-9]+)/, fields[i]);
              mode = MODE_OPEN;
              stack.push({ e: val, p: {}, c: [] });
            }
          } else {
            [s, val] = find(s, /^([^<]+)/, '');
            stack[stack.length - 1].c.push(val);
          }
          break;
        case MODE_OPEN:
          if (s[0] === '/' && s[1] === '>') {
            s = s.substring(2);
            stack[stack.length - 2].c.push(stack.pop());
            mode = MODE_TEXT;
          } else if (s[0] === '>') {
            s = s.substring(1);
            mode = MODE_TEXT;
          } else {
            let m = s.match(/^([a-zA-Z0-9]+)=/);
            console.assert(m);
            s = s.substring(m[0].length);
            let k = m[1];
            [s, val] = find(s, /^"([^"]*)"/, fields[i]);
            stack[stack.length - 1].p[k] = val;
          }
          break;
        case MODE_CLOSE:
          console.assert(s[0] === '>');
          stack[stack.length - 2].c.push(stack.pop());
          s = s.substring(1);
          mode = MODE_TEXT;
          break;
      }
    }
    if (mode === MODE_TEXT) {
      stack[stack.length - 1].c = stack[stack.length - 1].c.concat(fields[i]);
    }
  });
  return stack[0].c[0];
};

let hooks;
let index = 0;
let forceUpdate;
let getHook = init => {
  let hook = hooks[index++];
  if (!hook) {
    hook = { value: init };
    hooks.push(hook);
  }
  return hook;
};

export const useReducer = (reducer, init) => {
  const hook = getHook(init);
  const f = forceUpdate;
  const dispatch = v => {
    hook.value = reducer(hook.value, v);
    f();
  };
  return [hook.value, dispatch];
};

export const useState = init => useReducer((_, v) => v, init);

export const useEffect = (cb, args = []) => {
  const hook = getHook();
  if (changed(hook.value, args)) {
    hook.value = args;
    cb();
  }
};

const changed = (a, b) => !a || b.some((arg, i) => arg !== a[i]);

// Patch DOM according to the hyperscript nodes
export const render = (vlist, dom) => {
  // Make vlist always an array, even if it's a single node.
  vlist = [].concat(vlist);
  // Unique implicit keys counter for un-keyed nodes
  let ids = {};
  // Current hooks storage
  let hs = dom.h || {};
  // Erase hooks storage
  dom.h = {};
  vlist.forEach((v, i) => {
    // Current component re-rendering function (global, used by some hooks).
    forceUpdate = () => render(vlist, dom);
    while (typeof v.e === 'function') {
      // Key, explicit v property or implicit auto-incremented key
      let k = (v.p && v.p.k) || '' + v.e + (ids[v.e] = (ids[v.e] || 1) + 1);
      hooks = hs[k] || [];
      index = 0;
      v = v.e(v.p, v.c, forceUpdate);
      // Put current hooks into the new hooks storage
      dom.h[k] = hooks;
    }
    // DOM node builder for the given v node
    let $ = () =>
      v.e ? document.createElement(v.e) : document.createTextNode(v);
    // Corresponding DOM node, if any. Reuse if tag and text matches. Insert
    // new DOM node before otherwise.
    let n = dom.childNodes[i];
    if (!n || (n.e !== v.e && n.data !== v)) {
      n = dom.insertBefore($(), n);
    }
    if (v.e) {
      n.e = v.e;
      for (let k in v.p) {
        if (n[k] !== v.p[k]) {
          n[k] = v.p[k];
        }
      }
      render(v.c, n);
    } else {
      n.data = v;
    }
  });
  for (let c; (c = dom.childNodes[vlist.length]); ) {
    dom.removeChild(c);
  }
};
