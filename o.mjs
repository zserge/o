/**
 * Create a virtual node. Short, one-letter property names are used to reduce
 * the minifies JS code size. "e" stands for element, "p" for properties and
 * "c" for children.
 *
 * @param e  - The node name (HTML tag name), or a functional component, that
 * constructs a virtual node.
 * @param [p] - The properties map of the virtual node.
 * @param [c] - The children array of the virtual node.
 *
 * @returns {object} A virtual node object.
 */
export const h = (e, p = {}, ...c) => ({ e, p, c });

/**
 * Create a virtual node based on the HTML-like template string, i.e:
 * `<tag attr="value" attr2="value2"></tag>`. Tags can be self-closing.
 * Attribute values must be double quoted, unless they are placeholders.
 * Placeholders can appear only as tag names, attribute values or in between
 * the tags, like text or child elements.
 *
 * @param [strings] - An array of raw string values from the template.
 * @param [fields] - Variadic arguments, containing the placeholders in between.
 * @returns {object} - A virtual node with properties and children based on the
 * provided HTML markup.
 */
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
              stack.push(h(val, {}));
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

// Global array of hooks for the current functional component
let hooks;
// Global index of the current hook in the array of hooks above
let index = 0;
// Function, that forces an update of the current component
let forceUpdate;
// Returns an existing hook at the current index for the current component, or
// creates a new one.
let getHook = value => {
  let hook = hooks[index++];
  if (!hook) {
    hook = { value };
    hooks.push(hook);
  }
  return hook;
};

/**
 * Provides a redux-like state management for functional components.
 *
 * @param reducer - A function that creates a new state based on the action
 * @param initialState - Initial state value
 * @returns {[ dispatch, (state) => void ]} - Action dispatcher and current
 * state.
 */
export const useReducer = (reducer, initialState) => {
  const hook = getHook(initialState);
  const update = forceUpdate;
  const dispatch = action => {
    hook.value = reducer(hook.value, action);
    update();
  };
  return [hook.value, dispatch];
};

/**
 * Provides a local component state that persists between component updates.
 * @param initialState - Initial state value
 * @return {[state, setState: (state) => void]} - Current state value and
 * setter function.
 */
export const useState = initialState => useReducer((_, v) => v, initialState);

/**
 * Provides a callback that may cause side effects for the current component.
 * Callback will be evaluated only when the args array is changed.
 *
 * @param cb - Callback function
 * @param [args] - Array of callback dependencies. If the values in the array
 * are modified - callback is evaluated on the next render.
 */
export const useEffect = (cb, args = []) => {
  const hook = getHook();
  if (changed(hook.value, args)) {
    hook.value = args;
    cb();
  }
};

// Returns true if two arrays `a` and `b` are different.
const changed = (a, b) => !a || b.some((arg, i) => arg !== a[i]);

/**
 * Render a virtual node into a DOM element.
 *
 * @param vnode - The virtual node to render.
 * @param dom - The DOM element to render into.
 */
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
    let createNode = () =>
      v.e ? document.createElement(v.e) : document.createTextNode(v);
    // Corresponding DOM node, if any. Reuse if tag and text matches. Insert
    // new DOM node before otherwise.
    let node = dom.childNodes[i];
    if (!node || (v.e ? node.e !== v.e : node.data !== v)) {
      node = dom.insertBefore(createNode(), node);
    }
    if (v.e) {
      node.e = v.e;
      for (let propName in v.p) {
        if (node[propName] !== v.p[propName]) {
          node[propName] = v.p[propName];
        }
      }
      render(v.c, node);
    } else {
      node.data = v;
    }
  });
  for (let child; (child = dom.childNodes[vlist.length]); ) {
    dom.removeChild(child);
  }
};
