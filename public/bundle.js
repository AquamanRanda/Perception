
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }

    function bind(component, name, callback) {
        if (component.$$.props.indexOf(name) === -1)
            return;
        component.$$.bound[name] = callback;
        callback(component.$$.ctx[name]);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    function toVal(mix) {
    	var k, y, str='';
    	if (mix) {
    		if (typeof mix === 'object') {
    			if (!!mix.push) {
    				for (k=0; k < mix.length; k++) {
    					if (mix[k] && (y = toVal(mix[k]))) {
    						str && (str += ' ');
    						str += y;
    					}
    				}
    			} else {
    				for (k in mix) {
    					if (mix[k] && (y = toVal(k))) {
    						str && (str += ' ');
    						str += y;
    					}
    				}
    			}
    		} else if (typeof mix !== 'boolean' && !mix.call) {
    			str && (str += ' ');
    			str += mix;
    		}
    	}
    	return str;
    }

    function clsx () {
    	var i=0, x, str='';
    	while (i < arguments.length) {
    		if (x = toVal(arguments[i++])) {
    			str && (str += ' ');
    			str += x;
    		}
    	}
    	return str;
    }

    function isObject(value) {
      const type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    function getColumnSizeClass(isXs, colWidth, colSize) {
      if (colSize === true || colSize === '') {
        return isXs ? 'col' : `col-${colWidth}`;
      } else if (colSize === 'auto') {
        return isXs ? 'col-auto' : `col-${colWidth}-auto`;
      }

      return isXs ? `col-${colSize}` : `col-${colWidth}-${colSize}`;
    }

    function clean($$props) {
      const rest = {};
      for (const key of Object.keys($$props)) {
        if (key !== "children" && key !== "$$scope" && key !== "$$slots") {
          rest[key] = $$props[key];
        }
      }
      return rest;
    }

    /* node_modules/sveltestrap/src/Button.svelte generated by Svelte v3.12.1 */

    const file = "node_modules/sveltestrap/src/Button.svelte";

    // (54:0) {:else}
    function create_else_block_1(ctx) {
    	var button, current_block_type_index, if_block, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var if_block_creators = [
    		create_if_block_2,
    		create_if_block_3,
    		create_else_block_2
    	];

    	var if_blocks = [];

    	function select_block_type_2(changed, ctx) {
    		if (ctx.close) return 0;
    		if (ctx.children) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type_2(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var button_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes },
    		{ disabled: ctx.disabled },
    		{ value: ctx.value },
    		{ "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    		{ style: ctx.style }
    	];

    	var button_data = {};
    	for (var i = 0; i < button_levels.length; i += 1) {
    		button_data = assign(button_data, button_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");

    			if (!default_slot) {
    				if_block.c();
    			}

    			if (default_slot) default_slot.c();

    			set_attributes(button, button_data);
    			add_location(button, file, 54, 2, 1068);
    			dispose = listen_dev(button, "click", ctx.click_handler_1);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(button_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!default_slot) {
    				if_blocks[current_block_type_index].m(button, null);
    			}

    			else {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!default_slot) {
    				var previous_block_index = current_block_type_index;
    				current_block_type_index = select_block_type_2(changed, ctx);
    				if (current_block_type_index === previous_block_index) {
    					if_blocks[current_block_type_index].p(changed, ctx);
    				} else {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();

    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(button, null);
    				}
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(button, get_spread_update(button_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.value) && { value: ctx.value },
    				(changed.ariaLabel || changed.defaultAriaLabel) && { "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    				(changed.style) && { style: ctx.style }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			if (!default_slot) {
    				if_blocks[current_block_type_index].d();
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(54:0) {:else}", ctx });
    	return block;
    }

    // (37:0) {#if href}
    function create_if_block(ctx) {
    	var a, current_block_type_index, if_block, current, dispose;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.children) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var a_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes },
    		{ disabled: ctx.disabled },
    		{ href: ctx.href },
    		{ "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    		{ style: ctx.style }
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if_block.c();
    			set_attributes(a, a_data);
    			add_location(a, file, 37, 2, 825);
    			dispose = listen_dev(a, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			if_blocks[current_block_type_index].m(a, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(a, null);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.href) && { href: ctx.href },
    				(changed.ariaLabel || changed.defaultAriaLabel) && { "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    				(changed.style) && { style: ctx.style }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if_blocks[current_block_type_index].d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(37:0) {#if href}", ctx });
    	return block;
    }

    // (70:6) {:else}
    function create_else_block_2(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_2.name, type: "else", source: "(70:6) {:else}", ctx });
    	return block;
    }

    // (68:25) 
    function create_if_block_3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text(ctx.children);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.children) {
    				set_data_dev(t, ctx.children);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(68:25) ", ctx });
    	return block;
    }

    // (66:6) {#if close}
    function create_if_block_2(ctx) {
    	var span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "×";
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file, 66, 8, 1264);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(66:6) {#if close}", ctx });
    	return block;
    }

    // (50:4) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(50:4) {:else}", ctx });
    	return block;
    }

    // (48:4) {#if children}
    function create_if_block_1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text(ctx.children);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.children) {
    				set_data_dev(t, ctx.children);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(48:4) {#if children}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block,
    		create_else_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.href) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	

      let { class: className = '', active = false, block = false, children = undefined, close = false, color = 'secondary', disabled = false, href = '', id = '', outline = false, size = '', style = '', value = '' } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('active' in $$new_props) $$invalidate('active', active = $$new_props.active);
    		if ('block' in $$new_props) $$invalidate('block', block = $$new_props.block);
    		if ('children' in $$new_props) $$invalidate('children', children = $$new_props.children);
    		if ('close' in $$new_props) $$invalidate('close', close = $$new_props.close);
    		if ('color' in $$new_props) $$invalidate('color', color = $$new_props.color);
    		if ('disabled' in $$new_props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('href' in $$new_props) $$invalidate('href', href = $$new_props.href);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('outline' in $$new_props) $$invalidate('outline', outline = $$new_props.outline);
    		if ('size' in $$new_props) $$invalidate('size', size = $$new_props.size);
    		if ('style' in $$new_props) $$invalidate('style', style = $$new_props.style);
    		if ('value' in $$new_props) $$invalidate('value', value = $$new_props.value);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, active, block, children, close, color, disabled, href, id, outline, size, style, value, ariaLabel, classes, defaultAriaLabel };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('active' in $$props) $$invalidate('active', active = $$new_props.active);
    		if ('block' in $$props) $$invalidate('block', block = $$new_props.block);
    		if ('children' in $$props) $$invalidate('children', children = $$new_props.children);
    		if ('close' in $$props) $$invalidate('close', close = $$new_props.close);
    		if ('color' in $$props) $$invalidate('color', color = $$new_props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('href' in $$props) $$invalidate('href', href = $$new_props.href);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    		if ('outline' in $$props) $$invalidate('outline', outline = $$new_props.outline);
    		if ('size' in $$props) $$invalidate('size', size = $$new_props.size);
    		if ('style' in $$props) $$invalidate('style', style = $$new_props.style);
    		if ('value' in $$props) $$invalidate('value', value = $$new_props.value);
    		if ('ariaLabel' in $$props) $$invalidate('ariaLabel', ariaLabel = $$new_props.ariaLabel);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    		if ('defaultAriaLabel' in $$props) $$invalidate('defaultAriaLabel', defaultAriaLabel = $$new_props.defaultAriaLabel);
    	};

    	let ariaLabel, classes, defaultAriaLabel;

    	$$self.$$.update = ($$dirty = { $$props: 1, className: 1, close: 1, outline: 1, color: 1, size: 1, block: 1, active: 1 }) => {
    		$$invalidate('ariaLabel', ariaLabel = $$props['aria-label']);
    		if ($$dirty.className || $$dirty.close || $$dirty.outline || $$dirty.color || $$dirty.size || $$dirty.block || $$dirty.active) { $$invalidate('classes', classes = clsx(
            className,
            { close },
            close || 'btn',
            close || `btn${outline ? '-outline' : ''}-${color}`,
            size ? `btn-${size}` : false,
            block ? 'btn-block' : false,
            { active }
          )); }
    		if ($$dirty.close) { $$invalidate('defaultAriaLabel', defaultAriaLabel = close ? 'Close' : null); }
    	};

    	return {
    		className,
    		active,
    		block,
    		children,
    		close,
    		color,
    		disabled,
    		href,
    		id,
    		outline,
    		size,
    		style,
    		value,
    		props,
    		ariaLabel,
    		classes,
    		defaultAriaLabel,
    		click_handler,
    		click_handler_1,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["class", "active", "block", "children", "close", "color", "disabled", "href", "id", "outline", "size", "style", "value"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Button", options, id: create_fragment.name });
    	}

    	get class() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get block() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set block(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get children() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set children(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get close() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get outline() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set outline(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/sveltestrap/src/Col.svelte generated by Svelte v3.12.1 */

    const file$1 = "node_modules/sveltestrap/src/Col.svelte";

    function create_fragment$1(ctx) {
    	var div, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var div_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.colClasses.join(' ') }
    	];

    	var div_data = {};
    	for (var i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			if (default_slot) default_slot.c();

    			set_attributes(div, div_data);
    			add_location(div, file$1, 52, 0, 1332);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(div, get_spread_update(div_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.colClasses) && { class: ctx.colClasses.join(' ') }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	

      let { class: className = '', id = '' } = $$props;

      const props = clean($$props);

      const colClasses = [];
      const widths = ['xs', 'sm', 'md', 'lg', 'xl'];

      widths.forEach(colWidth => {
        const columnProp = $$props[colWidth];
        if (!columnProp && columnProp !== '') {
          return; //no value for this width
        }

        const isXs = colWidth === 'xs';

        if (isObject(columnProp)) {
          const colSizeInterfix = isXs ? '-' : `-${colWidth}-`;
          const colClass = getColumnSizeClass(isXs, colWidth, columnProp.size);

          if (columnProp.size || columnProp.size === '') {
            colClasses.push(colClass);
          }
          if (columnProp.push) {
            colClasses.push(`push${colSizeInterfix}${columnProp.push}`);
          }
          if (columnProp.pull) {
            colClasses.push(`pull${colSizeInterfix}${columnProp.pull}`);
          }
          if (columnProp.offset) {
            colClasses.push(`offset${colSizeInterfix}${columnProp.offset}`);
          }
        } else {
          colClasses.push(getColumnSizeClass(isXs, colWidth, columnProp));
        }
      });

      if (!colClasses.length) {
        colClasses.push('col');
      }

      if (className) {
        colClasses.push(className);
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, id };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    	};

    	return {
    		className,
    		id,
    		props,
    		colClasses,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Col extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["class", "id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Col", options, id: create_fragment$1.name });
    	}

    	get class() {
    		throw new Error("<Col>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Col>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Col>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Col>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/sveltestrap/src/Container.svelte generated by Svelte v3.12.1 */

    const file$2 = "node_modules/sveltestrap/src/Container.svelte";

    function create_fragment$2(ctx) {
    	var div, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var div_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes }
    	];

    	var div_data = {};
    	for (var i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			if (default_slot) default_slot.c();

    			set_attributes(div, div_data);
    			add_location(div, file$2, 17, 0, 308);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(div, get_spread_update(div_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let { class: className = '', fluid = false, id = '' } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('fluid' in $$new_props) $$invalidate('fluid', fluid = $$new_props.fluid);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, fluid, id, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('fluid' in $$props) $$invalidate('fluid', fluid = $$new_props.fluid);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, fluid: 1 }) => {
    		if ($$dirty.className || $$dirty.fluid) { $$invalidate('classes', classes = clsx(
            className,
            fluid ? 'container-fluid' : 'container',
          )); }
    	};

    	return {
    		className,
    		fluid,
    		id,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Container extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["class", "fluid", "id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Container", options, id: create_fragment$2.name });
    	}

    	get class() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fluid() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fluid(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/sveltestrap/src/Form.svelte generated by Svelte v3.12.1 */

    const file$3 = "node_modules/sveltestrap/src/Form.svelte";

    function create_fragment$3(ctx) {
    	var form, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var form_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var form_data = {};
    	for (var i = 0; i < form_levels.length; i += 1) {
    		form_data = assign(form_data, form_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			form = element("form");

    			if (default_slot) default_slot.c();

    			set_attributes(form, form_data);
    			add_location(form, file$3, 16, 0, 278);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(form_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);

    			if (default_slot) {
    				default_slot.m(form, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(form, get_spread_update(form_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(form);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	

      let { class: className = '', inline = false } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('inline' in $$new_props) $$invalidate('inline', inline = $$new_props.inline);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, inline, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('inline' in $$props) $$invalidate('inline', inline = $$new_props.inline);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, inline: 1 }) => {
    		if ($$dirty.className || $$dirty.inline) { $$invalidate('classes', classes = clsx(
            className,
            inline ? 'form-inline' : false,
          )); }
    	};

    	return {
    		className,
    		inline,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["class", "inline"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Form", options, id: create_fragment$3.name });
    	}

    	get class() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inline() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inline(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/sveltestrap/src/FormGroup.svelte generated by Svelte v3.12.1 */

    const file$4 = "node_modules/sveltestrap/src/FormGroup.svelte";

    // (30:0) {:else}
    function create_else_block$1(ctx) {
    	var div, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var div_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes }
    	];

    	var div_data = {};
    	for (var i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			if (default_slot) default_slot.c();

    			set_attributes(div, div_data);
    			add_location(div, file$4, 30, 2, 652);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(div, get_spread_update(div_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(30:0) {:else}", ctx });
    	return block;
    }

    // (26:0) {#if tag === 'fieldset'}
    function create_if_block$1(ctx) {
    	var fieldset, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var fieldset_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes }
    	];

    	var fieldset_data = {};
    	for (var i = 0; i < fieldset_levels.length; i += 1) {
    		fieldset_data = assign(fieldset_data, fieldset_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			fieldset = element("fieldset");

    			if (default_slot) default_slot.c();

    			set_attributes(fieldset, fieldset_data);
    			add_location(fieldset, file$4, 26, 2, 570);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(fieldset_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, fieldset, anchor);

    			if (default_slot) {
    				default_slot.m(fieldset, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(fieldset, get_spread_update(fieldset_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(fieldset);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(26:0) {#if tag === 'fieldset'}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.tag === 'fieldset') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	

      let { class: className = '', row = false, check = false, inline = false, disabled = false, id = '', tag = null } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('row' in $$new_props) $$invalidate('row', row = $$new_props.row);
    		if ('check' in $$new_props) $$invalidate('check', check = $$new_props.check);
    		if ('inline' in $$new_props) $$invalidate('inline', inline = $$new_props.inline);
    		if ('disabled' in $$new_props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('tag' in $$new_props) $$invalidate('tag', tag = $$new_props.tag);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, row, check, inline, disabled, id, tag, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('row' in $$props) $$invalidate('row', row = $$new_props.row);
    		if ('check' in $$props) $$invalidate('check', check = $$new_props.check);
    		if ('inline' in $$props) $$invalidate('inline', inline = $$new_props.inline);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    		if ('tag' in $$props) $$invalidate('tag', tag = $$new_props.tag);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, row: 1, check: 1, inline: 1, disabled: 1 }) => {
    		if ($$dirty.className || $$dirty.row || $$dirty.check || $$dirty.inline || $$dirty.disabled) { $$invalidate('classes', classes = clsx(
            className,
            row ? 'row' : false,
            check ? 'form-check' : 'form-group',
            check && inline ? 'form-check-inline' : false,
            check && disabled ? 'disabled' : false,
          )); }
    	};

    	return {
    		className,
    		row,
    		check,
    		inline,
    		disabled,
    		id,
    		tag,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class FormGroup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["class", "row", "check", "inline", "disabled", "id", "tag"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "FormGroup", options, id: create_fragment$4.name });
    	}

    	get class() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get row() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set row(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get check() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set check(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inline() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inline(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tag() {
    		throw new Error("<FormGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tag(value) {
    		throw new Error("<FormGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/sveltestrap/src/Input.svelte generated by Svelte v3.12.1 */
    const { console: console_1 } = globals;

    const file$5 = "node_modules/sveltestrap/src/Input.svelte";

    // (101:27) 
    function create_if_block_15(ctx) {
    	var select, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var select_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ multiple: ctx.multiple },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled }
    	];

    	var select_data = {};
    	for (var i = 0; i < select_levels.length; i += 1) {
    		select_data = assign(select_data, select_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			select = element("select");

    			if (default_slot) default_slot.c();

    			set_attributes(select, select_data);
    			add_location(select, file$5, 102, 2, 3804);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(select_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);

    			if (default_slot) {
    				default_slot.m(select, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(select, get_spread_update(select_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.multiple) && { multiple: ctx.multiple },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(select);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_15.name, type: "if", source: "(101:27) ", ctx });
    	return block;
    }

    // (97:29) 
    function create_if_block_14(ctx) {
    	var textarea, dispose;

    	var textarea_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled }
    	];

    	var textarea_data = {};
    	for (var i = 0; i < textarea_levels.length; i += 1) {
    		textarea_data = assign(textarea_data, textarea_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			set_attributes(textarea, textarea_data);
    			add_location(textarea, file$5, 98, 2, 3687);
    			dispose = listen_dev(textarea, "input", ctx.textarea_input_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);

    			set_input_value(textarea, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(textarea, ctx.value);

    			set_attributes(textarea, get_spread_update(textarea_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled }
    			]));
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(textarea);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_14.name, type: "if", source: "(97:29) ", ctx });
    	return block;
    }

    // (68:0) {#if tag === 'input'}
    function create_if_block$2(ctx) {
    	var if_block_anchor;

    	function select_block_type_1(changed, ctx) {
    		if (ctx.type === 'text') return create_if_block_1$1;
    		if (ctx.type === 'password') return create_if_block_2$1;
    		if (ctx.type === 'email') return create_if_block_3$1;
    		if (ctx.type === 'file') return create_if_block_4;
    		if (ctx.type === 'checkbox') return create_if_block_5;
    		if (ctx.type === 'radio') return create_if_block_6;
    		if (ctx.type === 'url') return create_if_block_7;
    		if (ctx.type === 'number') return create_if_block_8;
    		if (ctx.type === 'date') return create_if_block_9;
    		if (ctx.type === 'time') return create_if_block_10;
    		if (ctx.type === 'datetime') return create_if_block_11;
    		if (ctx.type === 'color') return create_if_block_12;
    		if (ctx.type === 'search') return create_if_block_13;
    	}

    	var current_block_type = select_block_type_1(null, ctx);
    	var if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type_1(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(68:0) {#if tag === 'input'}", ctx });
    	return block;
    }

    // (93:30) 
    function create_if_block_13(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "search" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 93, 4, 3533);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_9);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "search" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_13.name, type: "if", source: "(93:30) ", ctx });
    	return block;
    }

    // (91:29) 
    function create_if_block_12(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "color" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 91, 4, 3387);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_8);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "color" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_12.name, type: "if", source: "(91:29) ", ctx });
    	return block;
    }

    // (89:32) 
    function create_if_block_11(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "datetime" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 89, 4, 3239);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_7);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "datetime" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_11.name, type: "if", source: "(89:32) ", ctx });
    	return block;
    }

    // (87:28) 
    function create_if_block_10(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "time" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 87, 4, 3092);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_6);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "time" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_10.name, type: "if", source: "(87:28) ", ctx });
    	return block;
    }

    // (85:28) 
    function create_if_block_9(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "date" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 85, 4, 2949);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_5);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "date" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_9.name, type: "if", source: "(85:28) ", ctx });
    	return block;
    }

    // (83:30) 
    function create_if_block_8(ctx) {
    	var input, input_updating = false, dispose;

    	function input_input_handler_4() {
    		input_updating = true;
    		ctx.input_input_handler_4.call(input);
    	}

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "number" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 83, 4, 2804);
    			dispose = listen_dev(input, "input", input_input_handler_4);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (!input_updating && changed.value) set_input_value(input, ctx.value);
    			input_updating = false;

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "number" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_8.name, type: "if", source: "(83:30) ", ctx });
    	return block;
    }

    // (81:27) 
    function create_if_block_7(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "url" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 81, 4, 2660);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_3);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "url" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_7.name, type: "if", source: "(81:27) ", ctx });
    	return block;
    }

    // (79:29) 
    function create_if_block_6(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "radio" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 79, 4, 2517);
    			dispose = listen_dev(input, "change", ctx.input_change_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "radio" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_6.name, type: "if", source: "(79:29) ", ctx });
    	return block;
    }

    // (77:32) 
    function create_if_block_5(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "checkbox" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 77, 4, 2356);
    			dispose = listen_dev(input, "change", ctx.input_change_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			input.checked = ctx.checked;

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.checked) input.checked = ctx.checked;
    			if (changed.value) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "checkbox" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_5.name, type: "if", source: "(77:32) ", ctx });
    	return block;
    }

    // (75:28) 
    function create_if_block_4(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "file" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 75, 4, 2209);
    			dispose = listen_dev(input, "change", ctx.input_change_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},

    		p: function update(changed, ctx) {
    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "file" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4.name, type: "if", source: "(75:28) ", ctx });
    	return block;
    }

    // (73:29) 
    function create_if_block_3$1(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "email" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 73, 4, 2065);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value && (input.value !== ctx.value)) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "email" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$1.name, type: "if", source: "(73:29) ", ctx });
    	return block;
    }

    // (71:32) 
    function create_if_block_2$1(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "password" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 71, 4, 1917);
    			dispose = listen_dev(input, "input", ctx.input_input_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value && (input.value !== ctx.value)) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "password" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$1.name, type: "if", source: "(71:32) ", ctx });
    	return block;
    }

    // (69:2) {#if type === 'text'}
    function create_if_block_1$1(ctx) {
    	var input, dispose;

    	var input_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ type: "text" },
    		{ readonly: ctx.readonly },
    		{ class: ctx.classes },
    		{ name: ctx.name },
    		{ disabled: ctx.disabled },
    		{ placeholder: ctx.placeholder }
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			add_location(input, file$5, 69, 4, 1770);
    			dispose = listen_dev(input, "input", ctx.input_input_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value && (input.value !== ctx.value)) set_input_value(input, ctx.value);

    			set_attributes(input, get_spread_update(input_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				{ type: "text" },
    				(changed.readonly) && { readonly: ctx.readonly },
    				(changed.classes) && { class: ctx.classes },
    				(changed.name) && { name: ctx.name },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.placeholder) && { placeholder: ctx.placeholder }
    			]));
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(69:2) {#if type === 'text'}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$2,
    		create_if_block_14,
    		create_if_block_15
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.tag === 'input') return 0;
    		if (ctx.tag === 'textarea') return 1;
    		if (ctx.tag === 'select') return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (~current_block_type_index) if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	

      let { class: className = '', type = 'text', size = undefined, bsSize = undefined, checked = false, valid = false, invalid = false, plaintext = false, addon = false, value = '', readonly, multiple = false, id = '', name = '', placeholder = '', disabled = false } = $$props;

      const { type: _omitType, ...props } = clean($$props);

      let classes;
      let tag;

    	let { $$slots = {}, $$scope } = $$props;

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_1() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_2() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_change_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_change_handler_1() {
    		checked = this.checked;
    		value = this.value;
    		$$invalidate('checked', checked);
    		$$invalidate('value', value);
    	}

    	function input_change_handler_2() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_3() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_4() {
    		value = to_number(this.value);
    		$$invalidate('value', value);
    	}

    	function input_input_handler_5() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_6() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_7() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_8() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function input_input_handler_9() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('type' in $$new_props) $$invalidate('type', type = $$new_props.type);
    		if ('size' in $$new_props) $$invalidate('size', size = $$new_props.size);
    		if ('bsSize' in $$new_props) $$invalidate('bsSize', bsSize = $$new_props.bsSize);
    		if ('checked' in $$new_props) $$invalidate('checked', checked = $$new_props.checked);
    		if ('valid' in $$new_props) $$invalidate('valid', valid = $$new_props.valid);
    		if ('invalid' in $$new_props) $$invalidate('invalid', invalid = $$new_props.invalid);
    		if ('plaintext' in $$new_props) $$invalidate('plaintext', plaintext = $$new_props.plaintext);
    		if ('addon' in $$new_props) $$invalidate('addon', addon = $$new_props.addon);
    		if ('value' in $$new_props) $$invalidate('value', value = $$new_props.value);
    		if ('readonly' in $$new_props) $$invalidate('readonly', readonly = $$new_props.readonly);
    		if ('multiple' in $$new_props) $$invalidate('multiple', multiple = $$new_props.multiple);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('name' in $$new_props) $$invalidate('name', name = $$new_props.name);
    		if ('placeholder' in $$new_props) $$invalidate('placeholder', placeholder = $$new_props.placeholder);
    		if ('disabled' in $$new_props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, type, size, bsSize, checked, valid, invalid, plaintext, addon, value, readonly, multiple, id, name, placeholder, disabled, classes, tag };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('type' in $$props) $$invalidate('type', type = $$new_props.type);
    		if ('size' in $$props) $$invalidate('size', size = $$new_props.size);
    		if ('bsSize' in $$props) $$invalidate('bsSize', bsSize = $$new_props.bsSize);
    		if ('checked' in $$props) $$invalidate('checked', checked = $$new_props.checked);
    		if ('valid' in $$props) $$invalidate('valid', valid = $$new_props.valid);
    		if ('invalid' in $$props) $$invalidate('invalid', invalid = $$new_props.invalid);
    		if ('plaintext' in $$props) $$invalidate('plaintext', plaintext = $$new_props.plaintext);
    		if ('addon' in $$props) $$invalidate('addon', addon = $$new_props.addon);
    		if ('value' in $$props) $$invalidate('value', value = $$new_props.value);
    		if ('readonly' in $$props) $$invalidate('readonly', readonly = $$new_props.readonly);
    		if ('multiple' in $$props) $$invalidate('multiple', multiple = $$new_props.multiple);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    		if ('name' in $$props) $$invalidate('name', name = $$new_props.name);
    		if ('placeholder' in $$props) $$invalidate('placeholder', placeholder = $$new_props.placeholder);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    		if ('tag' in $$props) $$invalidate('tag', tag = $$new_props.tag);
    	};

    	$$self.$$.update = ($$dirty = { type: 1, plaintext: 1, addon: 1, size: 1, className: 1, invalid: 1, valid: 1, bsSize: 1 }) => {
    		if ($$dirty.type || $$dirty.plaintext || $$dirty.addon || $$dirty.size || $$dirty.className || $$dirty.invalid || $$dirty.valid || $$dirty.bsSize) { {
        
            const checkInput = ['radio', 'checkbox'].indexOf(type) > -1;
            const isNotaNumber = new RegExp('\\D', 'g');
        
            const fileInput = type === 'file';
            const textareaInput = type === 'textarea';
            const selectInput = type === 'select';
            $$invalidate('tag', tag = selectInput || textareaInput ? type : 'input');
        
            let formControlClass = 'form-control';
        
            if (plaintext) {
              formControlClass = `${formControlClass}-plaintext`;
              $$invalidate('tag', tag = 'input');
            } else if (fileInput) {
              formControlClass = `${formControlClass}-file`;
            } else if (checkInput) {
              if (addon) {
                formControlClass = null;
              } else {
                formControlClass = 'form-check-input';
              }
            }
        
            if (size && isNotaNumber.test(size)) {
              console.warn('Please use the prop "bsSize" instead of the "size" to bootstrap\'s input sizing.');
              $$invalidate('bsSize', bsSize = size);
              $$invalidate('size', size = undefined);
            }
        
            $$invalidate('classes', classes = clsx(
              className,
              invalid && 'is-invalid',
              valid && 'is-valid',
              bsSize ? `form-control-${bsSize}` : false,
              formControlClass,
            ));
          } }
    	};

    	return {
    		className,
    		type,
    		size,
    		bsSize,
    		checked,
    		valid,
    		invalid,
    		plaintext,
    		addon,
    		value,
    		readonly,
    		multiple,
    		id,
    		name,
    		placeholder,
    		disabled,
    		props,
    		classes,
    		tag,
    		input_input_handler,
    		input_input_handler_1,
    		input_input_handler_2,
    		input_change_handler,
    		input_change_handler_1,
    		input_change_handler_2,
    		input_input_handler_3,
    		input_input_handler_4,
    		input_input_handler_5,
    		input_input_handler_6,
    		input_input_handler_7,
    		input_input_handler_8,
    		input_input_handler_9,
    		textarea_input_handler,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["class", "type", "size", "bsSize", "checked", "valid", "invalid", "plaintext", "addon", "value", "readonly", "multiple", "id", "name", "placeholder", "disabled"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Input", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.readonly === undefined && !('readonly' in props)) {
    			console_1.warn("<Input> was created without expected prop 'readonly'");
    		}
    	}

    	get class() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bsSize() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bsSize(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get checked() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checked(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valid() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valid(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get invalid() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set invalid(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get plaintext() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set plaintext(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addon() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addon(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get readonly() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set readonly(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get multiple() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiple(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/sveltestrap/src/Label.svelte generated by Svelte v3.12.1 */

    const file$6 = "node_modules/sveltestrap/src/Label.svelte";

    function create_fragment$6(ctx) {
    	var label, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var label_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes },
    		{ for: ctx.fore }
    	];

    	var label_data = {};
    	for (var i = 0; i < label_levels.length; i += 1) {
    		label_data = assign(label_data, label_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			label = element("label");

    			if (default_slot) default_slot.c();

    			set_attributes(label, label_data);
    			add_location(label, file$6, 64, 0, 1619);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(label_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(label, get_spread_update(label_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes },
    				(changed.fore) && { for: ctx.fore }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(label);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

      const colWidths = ['xs', 'sm', 'md', 'lg', 'xl'];

      let { class: className = '' } = $$props;

      const props = clean($$props);
      let { hidden = false, check = false, size = '', for: fore, id = '', xs = '', sm = '', md = '', lg = '', xl = '', widths = colWidths } = $$props;

      const colClasses = [];

      colWidths.forEach((colWidth) => {
        let columnProp = $$props[colWidth];

        if (!columnProp && columnProp !== '') {
          return;
        }

        const isXs = colWidth === 'xs';
        let colClass;

        if (isObject(columnProp)) {
          const colSizeInterfix = isXs ? '-' : `-${colWidth}-`;
          colClass = getColumnSizeClass(isXs, colWidth, columnProp.size);

          colClasses.push(clsx({
            [colClass]: columnProp.size || columnProp.size === '',
            [`order${colSizeInterfix}${columnProp.order}`]: columnProp.order || columnProp.order === 0,
            [`offset${colSizeInterfix}${columnProp.offset}`]: columnProp.offset || columnProp.offset === 0
          }));
        } else {
          colClass = getColumnSizeClass(isXs, colWidth, columnProp);
          colClasses.push(colClass);
        }
      });

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('hidden' in $$new_props) $$invalidate('hidden', hidden = $$new_props.hidden);
    		if ('check' in $$new_props) $$invalidate('check', check = $$new_props.check);
    		if ('size' in $$new_props) $$invalidate('size', size = $$new_props.size);
    		if ('for' in $$new_props) $$invalidate('fore', fore = $$new_props.for);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('xs' in $$new_props) $$invalidate('xs', xs = $$new_props.xs);
    		if ('sm' in $$new_props) $$invalidate('sm', sm = $$new_props.sm);
    		if ('md' in $$new_props) $$invalidate('md', md = $$new_props.md);
    		if ('lg' in $$new_props) $$invalidate('lg', lg = $$new_props.lg);
    		if ('xl' in $$new_props) $$invalidate('xl', xl = $$new_props.xl);
    		if ('widths' in $$new_props) $$invalidate('widths', widths = $$new_props.widths);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, hidden, check, size, fore, id, xs, sm, md, lg, xl, widths, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('hidden' in $$props) $$invalidate('hidden', hidden = $$new_props.hidden);
    		if ('check' in $$props) $$invalidate('check', check = $$new_props.check);
    		if ('size' in $$props) $$invalidate('size', size = $$new_props.size);
    		if ('fore' in $$props) $$invalidate('fore', fore = $$new_props.fore);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    		if ('xs' in $$props) $$invalidate('xs', xs = $$new_props.xs);
    		if ('sm' in $$props) $$invalidate('sm', sm = $$new_props.sm);
    		if ('md' in $$props) $$invalidate('md', md = $$new_props.md);
    		if ('lg' in $$props) $$invalidate('lg', lg = $$new_props.lg);
    		if ('xl' in $$props) $$invalidate('xl', xl = $$new_props.xl);
    		if ('widths' in $$props) $$invalidate('widths', widths = $$new_props.widths);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, hidden: 1, check: 1, size: 1 }) => {
    		if ($$dirty.className || $$dirty.hidden || $$dirty.check || $$dirty.size) { $$invalidate('classes', classes = clsx(
            className,
            hidden ? 'sr-only' : false,
            check ? 'form-check-label' : false,
            size ? `col-form-label-${size}` : false,
            colClasses,
            colClasses.length ? 'col-form-label' : false,
          )); }
    	};

    	return {
    		className,
    		props,
    		hidden,
    		check,
    		size,
    		fore,
    		id,
    		xs,
    		sm,
    		md,
    		lg,
    		xl,
    		widths,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Label extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["class", "hidden", "check", "size", "for", "id", "xs", "sm", "md", "lg", "xl", "widths"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Label", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.fore === undefined && !('for' in props)) {
    			console.warn("<Label> was created without expected prop 'for'");
    		}
    	}

    	get class() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hidden() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hidden(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get check() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set check(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get for() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set for(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xs() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xs(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sm() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sm(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get md() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set md(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lg() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lg(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xl() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xl(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get widths() {
    		throw new Error("<Label>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set widths(value) {
    		throw new Error("<Label>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var bind$1 = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject$1(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject$1(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (typeof result[key] === 'object' && typeof val === 'object') {
          result[key] = merge(result[key], val);
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Function equal to merge with the difference being that no reference
     * to original objects is kept.
     *
     * @see merge
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function deepMerge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (typeof result[key] === 'object' && typeof val === 'object') {
          result[key] = deepMerge(result[key], val);
        } else if (typeof val === 'object') {
          result[key] = deepMerge({}, val);
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind$1(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject$1,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      deepMerge: deepMerge,
      extend: extend,
      trim: trim
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password || '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          var cookies$1 = cookies;

          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies$1.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (requestData === undefined) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'params', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy'];
      var defaultToConfig2Keys = [
        'baseURL', 'url', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress',
        'maxContentLength', 'validateStatus', 'maxRedirects', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath'
      ];

      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        }
      });

      utils.forEach(mergeDeepPropertiesKeys, function mergeDeepProperties(prop) {
        if (utils.isObject(config2[prop])) {
          config[prop] = utils.deepMerge(config1[prop], config2[prop]);
        } else if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        } else if (utils.isObject(config1[prop])) {
          config[prop] = utils.deepMerge(config1[prop]);
        } else if (typeof config1[prop] !== 'undefined') {
          config[prop] = config1[prop];
        }
      });

      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        } else if (typeof config1[prop] !== 'undefined') {
          config[prop] = config1[prop];
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys);

      var otherKeys = Object
        .keys(config2)
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils.forEach(otherKeys, function otherKeysDefaultToConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        } else if (typeof config1[prop] !== 'undefined') {
          config[prop] = config1[prop];
        }
      });

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(utils.merge(config || {}, {
          method: method,
          url: url
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(utils.merge(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind$1(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios_1;

    // Factory for creating new instances
    axios.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios.Cancel = Cancel_1;
    axios.CancelToken = CancelToken_1;
    axios.isCancel = isCancel;

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = spread;

    var axios_1 = axios;

    // Allow use of default import syntax in TypeScript
    var default_1 = axios;
    axios_1.default = default_1;

    var axios$1 = axios_1;

    let instance$7 = axios$1.create({ baseURL: "http://0.0.0.0:4000/" });

    /* src/login.svelte generated by Svelte v3.12.1 */

    // (36:6) <Label for="email">
    function create_default_slot_8(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Email");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_8.name, type: "slot", source: "(36:6) <Label for=\"email\">", ctx });
    	return block;
    }

    // (35:4) <FormGroup>
    function create_default_slot_7(ctx) {
    	var t, updating_value, current;

    	var label = new Label({
    		props: {
    		for: "email",
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	function input_value_binding(value) {
    		ctx.input_value_binding.call(null, value);
    		updating_value = true;
    		add_flush_callback(() => updating_value = false);
    	}

    	let input_props = {
    		type: "email",
    		name: "email",
    		id: "email",
    		placeholder: "example@123"
    	};
    	if (ctx.email !== void 0) {
    		input_props.value = ctx.email;
    	}
    	var input = new Input({ props: input_props, $$inline: true });

    	binding_callbacks.push(() => bind(input, 'value', input_value_binding));

    	const block = {
    		c: function create() {
    			label.$$.fragment.c();
    			t = space();
    			input.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(label, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(input, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var label_changes = {};
    			if (changed.$$scope) label_changes.$$scope = { changed, ctx };
    			label.$set(label_changes);

    			var input_changes = {};
    			if (!updating_value && changed.email) {
    				input_changes.value = ctx.email;
    			}
    			input.$set(input_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(label.$$.fragment, local);

    			transition_in(input.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(label.$$.fragment, local);
    			transition_out(input.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(label, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(input, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_7.name, type: "slot", source: "(35:4) <FormGroup>", ctx });
    	return block;
    }

    // (45:6) <Label for="Name">
    function create_default_slot_6(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_6.name, type: "slot", source: "(45:6) <Label for=\"Name\">", ctx });
    	return block;
    }

    // (44:4) <FormGroup>
    function create_default_slot_5(ctx) {
    	var t, updating_value, current;

    	var label = new Label({
    		props: {
    		for: "Name",
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	function input_value_binding_1(value) {
    		ctx.input_value_binding_1.call(null, value);
    		updating_value = true;
    		add_flush_callback(() => updating_value = false);
    	}

    	let input_props = {
    		name: "name",
    		id: "name",
    		placeholder: "name"
    	};
    	if (ctx.name !== void 0) {
    		input_props.value = ctx.name;
    	}
    	var input = new Input({ props: input_props, $$inline: true });

    	binding_callbacks.push(() => bind(input, 'value', input_value_binding_1));

    	const block = {
    		c: function create() {
    			label.$$.fragment.c();
    			t = space();
    			input.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(label, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(input, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var label_changes = {};
    			if (changed.$$scope) label_changes.$$scope = { changed, ctx };
    			label.$set(label_changes);

    			var input_changes = {};
    			if (!updating_value && changed.name) {
    				input_changes.value = ctx.name;
    			}
    			input.$set(input_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(label.$$.fragment, local);

    			transition_in(input.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(label.$$.fragment, local);
    			transition_out(input.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(label, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(input, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_5.name, type: "slot", source: "(44:4) <FormGroup>", ctx });
    	return block;
    }

    // (53:6) <Label for="Name">
    function create_default_slot_4(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Image");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4.name, type: "slot", source: "(53:6) <Label for=\"Name\">", ctx });
    	return block;
    }

    // (52:5) <FormGroup>
    function create_default_slot_3(ctx) {
    	var t, updating_value, current;

    	var label = new Label({
    		props: {
    		for: "Name",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	function input_value_binding_2(value) {
    		ctx.input_value_binding_2.call(null, value);
    		updating_value = true;
    		add_flush_callback(() => updating_value = false);
    	}

    	let input_props = {
    		name: "Image",
    		id: "Image",
    		placeholder: "Image link"
    	};
    	if (ctx.image !== void 0) {
    		input_props.value = ctx.image;
    	}
    	var input = new Input({ props: input_props, $$inline: true });

    	binding_callbacks.push(() => bind(input, 'value', input_value_binding_2));

    	const block = {
    		c: function create() {
    			label.$$.fragment.c();
    			t = space();
    			input.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(label, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(input, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var label_changes = {};
    			if (changed.$$scope) label_changes.$$scope = { changed, ctx };
    			label.$set(label_changes);

    			var input_changes = {};
    			if (!updating_value && changed.image) {
    				input_changes.value = ctx.image;
    			}
    			input.$set(input_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(label.$$.fragment, local);

    			transition_in(input.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(label.$$.fragment, local);
    			transition_out(input.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(label, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(input, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(52:5) <FormGroup>", ctx });
    	return block;
    }

    // (60:4) <Button class="mt-2" color="success" on:click={handleClick}>
    function create_default_slot_2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Sign In");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(60:4) <Button class=\"mt-2\" color=\"success\" on:click={handleClick}>", ctx });
    	return block;
    }

    // (34:2) <Form>
    function create_default_slot_1(ctx) {
    	var t0, t1, t2, current;

    	var formgroup0 = new FormGroup({
    		props: {
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var formgroup1 = new FormGroup({
    		props: {
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var formgroup2 = new FormGroup({
    		props: {
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var button = new Button({
    		props: {
    		class: "mt-2",
    		color: "success",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button.$on("click", ctx.handleClick);

    	const block = {
    		c: function create() {
    			formgroup0.$$.fragment.c();
    			t0 = space();
    			formgroup1.$$.fragment.c();
    			t1 = space();
    			formgroup2.$$.fragment.c();
    			t2 = space();
    			button.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(formgroup0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(formgroup1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(formgroup2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var formgroup0_changes = {};
    			if (changed.$$scope || changed.email) formgroup0_changes.$$scope = { changed, ctx };
    			formgroup0.$set(formgroup0_changes);

    			var formgroup1_changes = {};
    			if (changed.$$scope || changed.name) formgroup1_changes.$$scope = { changed, ctx };
    			formgroup1.$set(formgroup1_changes);

    			var formgroup2_changes = {};
    			if (changed.$$scope || changed.image) formgroup2_changes.$$scope = { changed, ctx };
    			formgroup2.$set(formgroup2_changes);

    			var button_changes = {};
    			if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    			button.$set(button_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(formgroup0.$$.fragment, local);

    			transition_in(formgroup1.$$.fragment, local);

    			transition_in(formgroup2.$$.fragment, local);

    			transition_in(button.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(formgroup0.$$.fragment, local);
    			transition_out(formgroup1.$$.fragment, local);
    			transition_out(formgroup2.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(formgroup0, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(formgroup1, detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(formgroup2, detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			destroy_component(button, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(34:2) <Form>", ctx });
    	return block;
    }

    // (33:0) <Col class="h-100 justify-content-center pt-4">
    function create_default_slot(ctx) {
    	var current;

    	var form = new Form({
    		props: {
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			form.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(form, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var form_changes = {};
    			if (changed.$$scope || changed.image || changed.name || changed.email) form_changes.$$scope = { changed, ctx };
    			form.$set(form_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(form, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(33:0) <Col class=\"h-100 justify-content-center pt-4\">", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var current;

    	var col = new Col({
    		props: {
    		class: "h-100 justify-content-center pt-4",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			col.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(col, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var col_changes = {};
    			if (changed.$$scope || changed.image || changed.name || changed.email) col_changes.$$scope = { changed, ctx };
    			col.$set(col_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(col.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(col.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(col, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	
      let name = "";
      let email = "";
      let image = "";
      const handleClick = async(event) => {
        event.preventDefault();
        console.log(email, name);
         let bodyFormData = new FormData();
            bodyFormData.set('name',name);
            bodyFormData.set('email',email);
            bodyFormData.set('image',image);
            try {
                const response = await instance$7.post('/login', bodyFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                console.log(response);
            } catch (err) {
                console.error(err);
            }};

    	function input_value_binding(value) {
    		email = value;
    		$$invalidate('email', email);
    	}

    	function input_value_binding_1(value) {
    		name = value;
    		$$invalidate('name', name);
    	}

    	function input_value_binding_2(value) {
    		image = value;
    		$$invalidate('image', image);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('email' in $$props) $$invalidate('email', email = $$props.email);
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    	};

    	return {
    		name,
    		email,
    		image,
    		handleClick,
    		input_value_binding,
    		input_value_binding_1,
    		input_value_binding_2
    	};
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$7, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Login", options, id: create_fragment$7.name });
    	}
    }

    /* src/layout.svelte generated by Svelte v3.12.1 */

    // (6:0) <Container class="h-100">
    function create_default_slot$1(ctx) {
    	var current;

    	var login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			login.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(6:0) <Container class=\"h-100\">", ctx });
    	return block;
    }

    function create_fragment$8(ctx) {
    	var current;

    	var container = new Container({
    		props: {
    		class: "h-100",
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			container.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(container, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var container_changes = {};
    			if (changed.$$scope) container_changes.$$scope = { changed, ctx };
    			container.$set(container_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(container.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(container.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(container, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    class Layout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Layout", options, id: create_fragment$8.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    function create_fragment$9(ctx) {
    	var current;

    	var layout = new Layout({ $$inline: true });

    	const block = {
    		c: function create() {
    			layout.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(layout, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(layout.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(layout.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(layout, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$9, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$9.name });
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
