/**
 * A virtual node object.
 * @typedef VNode
 * @type {object}
 * @property {string|function} e Node name or a functional component
 * @property {object} p Node properties (attributes)
 * @property {Array.<VNode>} c Node children
 */

/**
 * Create a virtual node. Short, one-letter property names are used to reduce
 * the minified JS code size. "e" stands for element, "p" for properties and
 * "c" for children.
 *
 * @todo Once Terser starts handling property mangling a bit better - we can
 * pick up more meaningful property names.
 *
 * @function
 * @param {string|function} e  The node name (HTML tag name), or a functional component, that
 * constructs a virtual node.
 * @param {?object} [p={}] The properties map of the virtual node.
 * @param {...VNode} [c] Variadic list of the virtual node child elements.
 *
 * @returns {VNode} A virtual node object.
 *
 * @example
 * return h('div', {className: 'foo'}, h('h1', {}, 'Hello!'));
 */
export const h = (e, p = {}, ...c) => ({ e, p, c });

/**
 * Create a virtual node based on the HTML-like template string, i.e:
 * `<tag attr="value" attr2="value2"></tag>`. Tags can be self-closing.
 * Attribute values must be double quoted, unless they are placeholders.
 * Placeholders can appear only as tag names, attribute values or in between
 * the tags, like text or child elements.
 *
 * @function
 * @param {Array.<string>} strings - An array of raw string values from the template.
 * @param {...*} [fields] - Variadic arguments, containing the placeholders in between.
 * @returns {VNode} - A virtual node with properties and children based on the
 * provided HTML markup.
 *
 * @example
 * x`<div className="foo"><h1>${mytext}</h1></div>`;
 * x`<div className=${myClass} />`;
 * x`<${MyComponent} foo="42"><p>Hello</p></${MyComponent}>`;
 */
export const x = (strings, ...fields) => {
  // Stack of nested tags. Start with a fake top node. The actual top virtual
  // node would become the first child of this node.
  const stack = [h()];
  // Three distinct parser states: text between the tags, open tag with
  // attributes and closing tag. Parser starts in text mode.
  const MODE_TEXT = 0;
  const MODE_OPEN_TAG = 1;
  const MODE_CLOSE_TAG = 2;
  let mode = MODE_TEXT;
  // Read and return the next word from the string, starting at position i. If
  // the string is empty - return the corresponding placeholder field.
  const readToken = (s, i, regexp, field) => {
    s = s.substring(i);
    if (!s) {
      return [s, field];
    }
    const m = s.match(regexp);
    return [s.substring(m[0].length), m[1]];
  };
  strings.forEach((s, i) => {
    while (s) {
      let val;
      s = s.trimLeft();
      switch (mode) {
        case MODE_TEXT:
          // In text mode, we expect either `</` (closing tag) or `<` (opening tag), or raw text.
          // Depending on what we found, switch parser mode. For opening tag - push a new h() node
          // to the stack.
          if (s[0] === '<') {
            if (s[1] === '/') {
              [s] = readToken(s, 2, /^(\w+)/, fields[i]);
              mode = MODE_CLOSE_TAG;
            } else {
              [s, val] = readToken(s, 1, /^(\w+)/, fields[i]);
              stack.push(h(val, {}));
              mode = MODE_OPEN_TAG;
            }
          } else {
            [s, val] = readToken(s, 0, /^([^<]+)/, '');
            stack[stack.length - 1].c.push(val);
          }
          break;
        case MODE_OPEN_TAG:
          // Within the opening tag, look for `/>` (self-closing tag), or just
          // `>`, or attribute key/value pair. Switch mode back to "text" when
          // tag is ended. For attributes, put key/value pair to the properties
          // map of the top-level node from the stack.
          if (s[0] === '/' && s[1] === '>') {
            stack[stack.length - 2].c.push(stack.pop());
            mode = MODE_TEXT;
            s = s.substring(2);
          } else if (s[0] === '>') {
            mode = MODE_TEXT;
            s = s.substring(1);
          } else {
            [s, val] = readToken(s, 0, /^([\w-]+)=/, '');
            console.assert(val);
            let propName = val;
            [s, val] = readToken(s, 0, /^"([^"]*)"/, fields[i]);
            stack[stack.length - 1].p[propName] = val;
          }
          break;
        case MODE_CLOSE_TAG:
          // In closing tag mode we only look for the `>` to switch back to the
          // text mode. Top level node is popped from the stack and appended to
          // the children array of the next node from the stack.
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
const getHook = value => {
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
 * @function
 * @param {function} reducer - A function that creates a new state based on the action
 * @param {*} [initialState] - Initial state value
 * @returns {Array} [ dispatch, (state) => void ] - Action dispatcher and current
 * state.
 *
 * @example
 * const reducer = (state, action) => {
 *   switch (action) {
 *     case 'incr': return state + 1;
 *     case 'decr': return state - 1;
 *   }
 * };
 * const Counter = () => {
 *   const [count, dispatch] = useReducer(reducer, 0);
 *   return x`
 *     <div>
 *       <p>Count: ${count}</p>
 *       <button onclick=${() => dispatch('incr')}>Increment</button>
 *     </div>
 *   `;
 * };
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
 *
 * @function
 * @param initialState - Initial state value
 * @returns {Array} [state, (newState) => void]} - Current state value and setter function.
 *
 * @example
 * const Counter = () => {
 *   const [count, setCount] = useState(0);
 *   return x`
 *     <div>
 *       <p>Count: ${count}</p>
 *       <button onclick=${() => setState(count+1)}>Increment</button>
 *     </div>
 *   `;
 * };
 */
export const useState = initialState => useReducer((_, v) => v, initialState);

/**
 * Provides a callback that may cause side effects for the current component.
 * Callback will be evaluated only when the args array is changed.
 * This callback is called after rendering is done, so it can be used to query
 * for child DOM nodes. An optional return value is a clean-up callback that
 * will be called right before the component is removed from the DOM tree.
 *
 * @function
 * @param {function(void):void} cb - Callback function
 * @param {Array} [args] - Array of callback dependencies. If the values in the array
 * are modified - callback is evaluated on the next render.
 *
 * @returns {function} An optional clean-up callback to be called before
 * component removal.
 *
 * @example
 * const WindowWidth = () => {
 *   const [width, setWidth] = useState(0);
 *   function onResize() { setWidth(window.innerWidth); }
 *   useEffect(() => {
 *     window.addEventListener('resize', onResize);
 *     return () => window.removeEventListener('resize', onResize);
 *   }, []);
 *   return x`<div>Window width: ${width}</div>`;
 * };
 */
export const useEffect = (cb, args = []) => {
  const hook = getHook();
  if (changed(hook.value, args)) {
    hook.value = args;
    hook.cb = cb;
  }
};

// Returns true if two arrays `a` and `b` are different.
const changed = (a, b) => !a || b.some((arg, i) => arg !== a[i]);

/**
 * Render a virtual node into a DOM element.
 *
 * @function
 * @param {VNode|VNode[]} vnode - The virtual node to render.
 * @param {Element} dom - The DOM element to render into.
 * @param {string} ns - namespace URI for SVG nodes.
 *
 * @example
 * render(x`<${MyComponent} />`, document.body);
 */
export const render = (vlist, dom, ns) => {
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
      const k = (v.p && v.p.k) || '' + v.e + (ids[v.e] = (ids[v.e] || 1) + 1);
      hooks = hs[k] || [];
      index = 0;
      v = v.e(v.p, v.c, forceUpdate);
      // Put current hooks into the new hooks storage
      dom.h[k] = hooks;
    }
    // DOM node builder for the given v node
    const nsURI = ns || (v.p && v.p.xmlns);
    const createNode = () =>
      v.e
        ? nsURI
          ? document.createElementNS(nsURI, v.e)
          : document.createElement(v.e)
        : document.createTextNode(v);
    // Corresponding DOM node, if any. Reuse if tag and text matches. Insert
    // new DOM node before otherwise.
    let node = dom.childNodes[i];
    if (!node || (v.e ? node.e !== v.e : node.data !== v)) {
      node = dom.insertBefore(createNode(), node);
    }
    if (v.e) {
      node.e = v.e;
      for (const propName in v.p) {
        if (node[propName] !== v.p[propName]) {
          if (nsURI) {
            node.setAttribute(propName, v.p[propName]);
          } else {
            node[propName] = v.p[propName];
          }
        }
      }
      render(v.c, node, nsURI);
    } else {
      node.data = v;
    }
  });
  // Iterate over all hooks, if a hook has a useEffect callback set - call it
  // (since the rendering is now done) and remove.
  Object.values(dom.h).map(componentHooks =>
    componentHooks.map(h => h.cb && ((h.cleanup = h.cb()), (h.cb = 0)))
  );
  // For all hooks present in the DOM node before rendering, but not present
  // after - call the cleanup callbacks, if any. This means the corresponding
  // nodes have been removed from DOM and cleanup should happen. Beware, that
  // the order is unfortunately not guaranteed, to keep the implementation
  // simple.
  Object.keys(hs)
    .filter(k => !dom.h[k])
    .map(k => hs[k].map(h => h.cleanup && h.cleanup()));
  for (let child; (child = dom.childNodes[vlist.length]); ) {
    render([], dom.removeChild(child));
  }
};
