exports.__esModule = true;
exports.wrap = wrap;
exports.wrapForHelper = wrapForHelper;
exports.createScope = createScope;
exports.createFreshScope = createFreshScope;
exports.bindShadowScope = bindShadowScope;
exports.createChildScope = createChildScope;
exports.bindSelf = bindSelf;
exports.updateSelf = updateSelf;
exports.bindLocal = bindLocal;
exports.updateLocal = updateLocal;
exports.bindBlock = bindBlock;
exports.block = block;
exports.continueBlock = continueBlock;
exports.hostBlock = hostBlock;
exports.handleRedirect = handleRedirect;
exports.handleKeyword = handleKeyword;
exports.linkRenderNode = linkRenderNode;
exports.inline = inline;
exports.keyword = keyword;
exports.invokeHelper = invokeHelper;
exports.classify = classify;
exports.partial = partial;
exports.range = range;
exports.element = element;
exports.attribute = attribute;
exports.subexpr = subexpr;
exports.get = get;
exports.getRoot = getRoot;
exports.getChild = getChild;
exports.getValue = getValue;
exports.getCellOrValue = getCellOrValue;
exports.component = component;
exports.concat = concat;
exports.hasHelper = hasHelper;
exports.lookupHelper = lookupHelper;
exports.bindScope = bindScope;
exports.updateScope = updateScope;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _render = require("./render");

var _render2 = _interopRequireDefault(_render);

var _morphRangeMorphList = require("../morph-range/morph-list");

var _morphRangeMorphList2 = _interopRequireDefault(_morphRangeMorphList);

var _htmlbarsUtilObjectUtils = require("../htmlbars-util/object-utils");

var _htmlbarsUtilMorphUtils = require("../htmlbars-util/morph-utils");

var _htmlbarsUtilTemplateUtils = require("../htmlbars-util/template-utils");

/**
  HTMLBars delegates the runtime behavior of a template to
  hooks provided by the host environment. These hooks explain
  the lexical environment of a Handlebars template, the internal
  representation of references, and the interaction between an
  HTMLBars template and the DOM it is managing.

  While HTMLBars host hooks have access to all of this internal
  machinery, templates and helpers have access to the abstraction
  provided by the host hooks.

  ## The Lexical Environment

  The default lexical environment of an HTMLBars template includes:

  * Any local variables, provided by *block arguments*
  * The current value of `self`

  ## Simple Nesting

  Let's look at a simple template with a nested block:

  ```hbs
  <h1>{{title}}</h1>

  {{#if author}}
    <p class="byline">{{author}}</p>
  {{/if}}
  ```

  In this case, the lexical environment at the top-level of the
  template does not change inside of the `if` block. This is
  achieved via an implementation of `if` that looks like this:

  ```js
  registerHelper('if', function(params) {
    if (!!params[0]) {
      return this.yield();
    }
  });
  ```

  A call to `this.yield` invokes the child template using the
  current lexical environment.

  ## Block Arguments

  It is possible for nested blocks to introduce new local
  variables:

  ```hbs
  {{#count-calls as |i|}}
  <h1>{{title}}</h1>
  <p>Called {{i}} times</p>
  {{/count}}
  ```

  In this example, the child block inherits its surrounding
  lexical environment, but augments it with a single new
  variable binding.

  The implementation of `count-calls` supplies the value of
  `i`, but does not otherwise alter the environment:

  ```js
  var count = 0;
  registerHelper('count-calls', function() {
    return this.yield([ ++count ]);
  });
  ```
*/

function wrap(template) {
  if (template === null) {
    return null;
  }

  return {
    meta: template.meta,
    arity: template.arity,
    raw: template,
    render: function (self, env, options, blockArguments) {
      var scope = env.hooks.createFreshScope();

      options = options || {};
      options.self = self;
      options.blockArguments = blockArguments;

      return _render2.default(template, env, scope, options);
    }
  };
}

function wrapForHelper(template, env, scope, morph, renderState, visitor) {
  if (!template) {
    return {};
  }

  var yieldArgs = yieldTemplate(template, env, scope, morph, renderState, visitor);

  return {
    meta: template.meta,
    arity: template.arity,
    yield: yieldArgs,
    yieldItem: yieldItem(template, env, scope, morph, renderState, visitor),
    raw: template,

    render: function (self, blockArguments) {
      yieldArgs(blockArguments, self);
    }
  };
}

// Called by a user-land helper to render a template.
function yieldTemplate(template, env, parentScope, morph, renderState, visitor) {
  return function (blockArguments, self) {
    // Render state is used to track the progress of the helper (since it
    // may call into us multiple times). As the user-land helper calls
    // into library code, we track what needs to be cleaned up after the
    // helper has returned.
    //
    // Here, we remember that a template has been yielded and so we do not
    // need to remove the previous template. (If no template is yielded
    // this render by the helper, we assume nothing should be shown and
    // remove any previous rendered templates.)
    renderState.morphToClear = null;

    // In this conditional is true, it means that on the previous rendering pass
    // the helper yielded multiple items via `yieldItem()`, but this time they
    // are yielding a single template. In that case, we mark the morph list for
    // cleanup so it is removed from the DOM.
    if (morph.morphList) {
      _htmlbarsUtilTemplateUtils.clearMorphList(morph.morphList, morph, env);
      renderState.morphListToClear = null;
    }

    var scope = parentScope;

    if (morph.lastYielded && isStableTemplate(template, morph.lastYielded)) {
      return morph.lastResult.revalidateWith(env, undefined, self, blockArguments, visitor);
    }

    // Check to make sure that we actually **need** a new scope, and can't
    // share the parent scope. Note that we need to move this check into
    // a host hook, because the host's notion of scope may require a new
    // scope in more cases than the ones we can determine statically.
    if (self !== undefined || parentScope === null || template.arity) {
      scope = env.hooks.createChildScope(parentScope);
    }

    morph.lastYielded = { self: self, template: template, shadowTemplate: null };

    // Render the template that was selected by the helper
    _render2.default(template, env, scope, { renderNode: morph, self: self, blockArguments: blockArguments });
  };
}

function yieldItem(template, env, parentScope, morph, renderState, visitor) {
  // Initialize state that tracks multiple items being
  // yielded in.
  var currentMorph = null;

  // Candidate morphs for deletion.
  var candidates = {};

  // Reuse existing MorphList if this is not a first-time
  // render.
  var morphList = morph.morphList;
  if (morphList) {
    currentMorph = morphList.firstChildMorph;
  }

  // Advances the currentMorph pointer to the morph in the previously-rendered
  // list that matches the yielded key. While doing so, it marks any morphs
  // that it advances past as candidates for deletion. Assuming those morphs
  // are not yielded in later, they will be removed in the prune step during
  // cleanup.
  // Note that this helper function assumes that the morph being seeked to is
  // guaranteed to exist in the previous MorphList; if this is called and the
  // morph does not exist, it will result in an infinite loop
  function advanceToKey(key) {
    var seek = currentMorph;

    while (seek.key !== key) {
      candidates[seek.key] = seek;
      seek = seek.nextMorph;
    }

    currentMorph = seek.nextMorph;
    return seek;
  }

  return function (_key, blockArguments, self) {
    if (typeof _key !== 'string') {
      throw new Error("You must provide a string key when calling `yieldItem`; you provided " + _key);
    }

    // At least one item has been yielded, so we do not wholesale
    // clear the last MorphList but instead apply a prune operation.
    renderState.morphListToClear = null;
    morph.lastYielded = null;

    var morphList, morphMap;

    if (!morph.morphList) {
      morph.morphList = new _morphRangeMorphList2.default();
      morph.morphMap = {};
      morph.setMorphList(morph.morphList);
    }

    morphList = morph.morphList;
    morphMap = morph.morphMap;

    // A map of morphs that have been yielded in on this
    // rendering pass. Any morphs that do not make it into
    // this list will be pruned from the MorphList during the cleanup
    // process.
    var handledMorphs = renderState.handledMorphs;
    var key = undefined;

    if (_key in handledMorphs) {
      // In this branch we are dealing with a duplicate key. The strategy
      // is to take the original key and append a counter to it that is
      // incremented every time the key is reused. In order to greatly
      // reduce the chance of colliding with another valid key we also add
      // an extra string "--z8mS2hvDW0A--" to the new key.
      var collisions = renderState.collisions;
      if (collisions === undefined) {
        collisions = renderState.collisions = {};
      }
      var count = collisions[_key] | 0;
      collisions[_key] = ++count;

      key = _key + '--z8mS2hvDW0A--' + count;
    } else {
      key = _key;
    }

    if (currentMorph && currentMorph.key === key) {
      yieldTemplate(template, env, parentScope, currentMorph, renderState, visitor)(blockArguments, self);
      currentMorph = currentMorph.nextMorph;
      handledMorphs[key] = currentMorph;
    } else if (morphMap[key] !== undefined) {
      var foundMorph = morphMap[key];

      if (key in candidates) {
        // If we already saw this morph, move it forward to this position
        morphList.insertBeforeMorph(foundMorph, currentMorph);
      } else {
        // Otherwise, move the pointer forward to the existing morph for this key
        advanceToKey(key);
      }

      handledMorphs[foundMorph.key] = foundMorph;
      yieldTemplate(template, env, parentScope, foundMorph, renderState, visitor)(blockArguments, self);
    } else {
      var childMorph = _render.createChildMorph(env.dom, morph);
      childMorph.key = key;
      morphMap[key] = handledMorphs[key] = childMorph;
      morphList.insertBeforeMorph(childMorph, currentMorph);
      yieldTemplate(template, env, parentScope, childMorph, renderState, visitor)(blockArguments, self);
    }

    renderState.morphListToPrune = morphList;
    morph.childNodes = null;
  };
}

function isStableTemplate(template, lastYielded) {
  return !lastYielded.shadowTemplate && template === lastYielded.template;
}
function optionsFor(template, inverse, env, scope, morph, visitor) {
  // If there was a template yielded last time, set morphToClear so it will be cleared
  // if no template is yielded on this render.
  var morphToClear = morph.lastResult ? morph : null;
  var renderState = new _htmlbarsUtilTemplateUtils.RenderState(morphToClear, morph.morphList || null);

  return {
    templates: {
      template: wrapForHelper(template, env, scope, morph, renderState, visitor),
      inverse: wrapForHelper(inverse, env, scope, morph, renderState, visitor)
    },
    renderState: renderState
  };
}

function thisFor(options) {
  return {
    arity: options.template.arity,
    yield: options.template.yield,
    yieldItem: options.template.yieldItem,
    yieldIn: options.template.yieldIn
  };
}

/**
  Host Hook: createScope

  @param {Scope?} parentScope
  @return Scope

  Corresponds to entering a new HTMLBars block.

  This hook is invoked when a block is entered with
  a new `self` or additional local variables.

  When invoked for a top-level template, the
  `parentScope` is `null`, and this hook should return
  a fresh Scope.

  When invoked for a child template, the `parentScope`
  is the scope for the parent environment.

  Note that the `Scope` is an opaque value that is
  passed to other host hooks. For example, the `get`
  hook uses the scope to retrieve a value for a given
  scope and variable name.
*/

function createScope(env, parentScope) {
  if (parentScope) {
    return env.hooks.createChildScope(parentScope);
  } else {
    return env.hooks.createFreshScope();
  }
}

function createFreshScope() {
  // because `in` checks have unpredictable performance, keep a
  // separate dictionary to track whether a local was bound.
  // See `bindLocal` for more information.
  return { self: null, blocks: {}, locals: {}, localPresent: {} };
}

/**
  Host Hook: bindShadowScope

  @param {Scope?} parentScope
  @return Scope

  Corresponds to rendering a new template into an existing
  render tree, but with a new top-level lexical scope. This
  template is called the "shadow root".

  If a shadow template invokes `{{yield}}`, it will render
  the block provided to the shadow root in the original
  lexical scope.

  ```hbs
  {{!-- post template --}}
  <p>{{props.title}}</p>
  {{yield}}

  {{!-- blog template --}}
  {{#post title="Hello world"}}
    <p>by {{byline}}</p>
    <article>This is my first post</article>
  {{/post}}

  {{#post title="Goodbye world"}}
    <p>by {{byline}}</p>
    <article>This is my last post</article>
  {{/post}}
  ```

  ```js
  helpers.post = function(params, hash, options) {
    options.template.yieldIn(postTemplate, { props: hash });
  };

  blog.render({ byline: "Yehuda Katz" });
  ```

  Produces:

  ```html
  <p>Hello world</p>
  <p>by Yehuda Katz</p>
  <article>This is my first post</article>

  <p>Goodbye world</p>
  <p>by Yehuda Katz</p>
  <article>This is my last post</article>
  ```

  In short, `yieldIn` creates a new top-level scope for the
  provided template and renders it, making the original block
  available to `{{yield}}` in that template.
*/

function bindShadowScope(env /*, parentScope, shadowScope */) {
  return env.hooks.createFreshScope();
}

function createChildScope(parent) {
  var scope = Object.create(parent);
  scope.locals = Object.create(parent.locals);
  scope.localPresent = Object.create(parent.localPresent);
  scope.blocks = Object.create(parent.blocks);
  return scope;
}

/**
  Host Hook: bindSelf

  @param {Scope} scope
  @param {any} self

  Corresponds to entering a template.

  This hook is invoked when the `self` value for a scope is ready to be bound.

  The host must ensure that child scopes reflect the change to the `self` in
  future calls to the `get` hook.
*/

function bindSelf(env, scope, self) {
  scope.self = self;
}

function updateSelf(env, scope, self) {
  env.hooks.bindSelf(env, scope, self);
}

/**
  Host Hook: bindLocal

  @param {Environment} env
  @param {Scope} scope
  @param {String} name
  @param {any} value

  Corresponds to entering a template with block arguments.

  This hook is invoked when a local variable for a scope has been provided.

  The host must ensure that child scopes reflect the change in future calls
  to the `get` hook.
*/

function bindLocal(env, scope, name, value) {
  scope.localPresent[name] = true;
  scope.locals[name] = value;
}

function updateLocal(env, scope, name, value) {
  env.hooks.bindLocal(env, scope, name, value);
}

/**
  Host Hook: bindBlock

  @param {Environment} env
  @param {Scope} scope
  @param {Function} block

  Corresponds to entering a shadow template that was invoked by a block helper with
  `yieldIn`.

  This hook is invoked with an opaque block that will be passed along
  to the shadow template, and inserted into the shadow template when
  `{{yield}}` is used. Optionally provide a non-default block name
  that can be targeted by `{{yield to=blockName}}`.
*/

function bindBlock(env, scope, block) {
  var name = arguments.length <= 3 || arguments[3] === undefined ? 'default' : arguments[3];

  scope.blocks[name] = block;
}

/**
  Host Hook: block

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path
  @param {Array} params
  @param {Object} hash
  @param {Block} block
  @param {Block} elseBlock

  Corresponds to:

  ```hbs
  {{#helper param1 param2 key1=val1 key2=val2}}
    {{!-- child template --}}
  {{/helper}}
  ```

  This host hook is a workhorse of the system. It is invoked
  whenever a block is encountered, and is responsible for
  resolving the helper to call, and then invoke it.

  The helper should be invoked with:

  - `{Array} params`: the parameters passed to the helper
    in the template.
  - `{Object} hash`: an object containing the keys and values passed
    in the hash position in the template.

  The values in `params` and `hash` will already be resolved
  through a previous call to the `get` host hook.

  The helper should be invoked with a `this` value that is
  an object with one field:

  `{Function} yield`: when invoked, this function executes the
  block with the current scope. It takes an optional array of
  block parameters. If block parameters are supplied, HTMLBars
  will invoke the `bindLocal` host hook to bind the supplied
  values to the block arguments provided by the template.

  In general, the default implementation of `block` should work
  for most host environments. It delegates to other host hooks
  where appropriate, and properly invokes the helper with the
  appropriate arguments.
*/

function block(morph, env, scope, path, params, hash, template, inverse, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, template, inverse, visitor)) {
    return;
  }

  continueBlock(morph, env, scope, path, params, hash, template, inverse, visitor);
}

function continueBlock(morph, env, scope, path, params, hash, template, inverse, visitor) {
  hostBlock(morph, env, scope, template, inverse, null, visitor, function (options) {
    var helper = env.hooks.lookupHelper(env, scope, path);
    return env.hooks.invokeHelper(morph, env, scope, visitor, params, hash, helper, options.templates, thisFor(options.templates));
  });
}

function hostBlock(morph, env, scope, template, inverse, shadowOptions, visitor, callback) {
  var options = optionsFor(template, inverse, env, scope, morph, visitor);
  _htmlbarsUtilTemplateUtils.renderAndCleanup(morph, env, options, shadowOptions, callback);
}

function handleRedirect(morph, env, scope, path, params, hash, template, inverse, visitor) {
  if (!path) {
    return false;
  }

  var redirect = env.hooks.classify(env, scope, path);
  if (redirect) {
    switch (redirect) {
      case 'component':
        env.hooks.component(morph, env, scope, path, params, hash, { default: template, inverse: inverse }, visitor);break;
      case 'inline':
        env.hooks.inline(morph, env, scope, path, params, hash, visitor);break;
      case 'block':
        env.hooks.block(morph, env, scope, path, params, hash, template, inverse, visitor);break;
      default:
        throw new Error("Internal HTMLBars redirection to " + redirect + " not supported");
    }
    return true;
  }

  if (handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor)) {
    return true;
  }

  return false;
}

function handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor) {
  var keyword = env.hooks.keywords[path];
  if (!keyword) {
    return false;
  }

  if (typeof keyword === 'function') {
    return keyword(morph, env, scope, params, hash, template, inverse, visitor);
  }

  if (keyword.willRender) {
    keyword.willRender(morph, env);
  }

  var lastState, newState;
  if (keyword.setupState) {
    lastState = _htmlbarsUtilObjectUtils.shallowCopy(morph.state);
    newState = morph.state = keyword.setupState(lastState, env, scope, params, hash);
  }

  if (keyword.childEnv) {
    // Build the child environment...
    env = keyword.childEnv(morph.state, env);

    // ..then save off the child env builder on the render node. If the render
    // node tree is re-rendered and this node is not dirty, the child env
    // builder will still be invoked so that child dirty render nodes still get
    // the correct child env.
    morph.buildChildEnv = keyword.childEnv;
  }

  var firstTime = !morph.rendered;

  if (keyword.isEmpty) {
    var isEmpty = keyword.isEmpty(morph.state, env, scope, params, hash);

    if (isEmpty) {
      if (!firstTime) {
        _htmlbarsUtilTemplateUtils.clearMorph(morph, env, false);
      }
      return true;
    }
  }

  if (firstTime) {
    if (keyword.render) {
      keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
    }
    morph.rendered = true;
    return true;
  }

  var isStable;
  if (keyword.isStable) {
    isStable = keyword.isStable(lastState, newState);
  } else {
    isStable = stableState(lastState, newState);
  }

  if (isStable) {
    if (keyword.rerender) {
      var newEnv = keyword.rerender(morph, env, scope, params, hash, template, inverse, visitor);
      env = newEnv || env;
    }
    _htmlbarsUtilMorphUtils.validateChildMorphs(env, morph, visitor);
    return true;
  } else {
    _htmlbarsUtilTemplateUtils.clearMorph(morph, env, false);
  }

  // If the node is unstable, re-render from scratch
  if (keyword.render) {
    keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
    morph.rendered = true;
    return true;
  }
}

function stableState(oldState, newState) {
  if (_htmlbarsUtilObjectUtils.keyLength(oldState) !== _htmlbarsUtilObjectUtils.keyLength(newState)) {
    return false;
  }

  for (var prop in oldState) {
    if (oldState[prop] !== newState[prop]) {
      return false;
    }
  }

  return true;
}

function linkRenderNode() /* morph, env, scope, params, hash */{
  return;
}

/**
  Host Hook: inline

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path
  @param {Array} params
  @param {Hash} hash

  Corresponds to:

  ```hbs
  {{helper param1 param2 key1=val1 key2=val2}}
  ```

  This host hook is similar to the `block` host hook, but it
  invokes helpers that do not supply an attached block.

  Like the `block` hook, the helper should be invoked with:

  - `{Array} params`: the parameters passed to the helper
    in the template.
  - `{Object} hash`: an object containing the keys and values passed
    in the hash position in the template.

  The values in `params` and `hash` will already be resolved
  through a previous call to the `get` host hook.

  In general, the default implementation of `inline` should work
  for most host environments. It delegates to other host hooks
  where appropriate, and properly invokes the helper with the
  appropriate arguments.

  The default implementation of `inline` also makes `partial`
  a keyword. Instead of invoking a helper named `partial`,
  it invokes the `partial` host hook.
*/

function inline(morph, env, scope, path, params, hash, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
    return;
  }

  var value = undefined,
      hasValue = undefined;
  if (morph.linkedResult) {
    value = env.hooks.getValue(morph.linkedResult);
    hasValue = true;
  } else {
    var options = optionsFor(null, null, env, scope, morph);

    var helper = env.hooks.lookupHelper(env, scope, path);
    var result = env.hooks.invokeHelper(morph, env, scope, visitor, params, hash, helper, options.templates, thisFor(options.templates));

    if (result && result.link) {
      morph.linkedResult = result.value;
      _htmlbarsUtilMorphUtils.linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
    }

    if (result && 'value' in result) {
      value = env.hooks.getValue(result.value);
      hasValue = true;
    }
  }

  if (hasValue) {
    if (morph.lastValue !== value) {
      morph.setContent(value);
    }
    morph.lastValue = value;
  }
}

function keyword(path, morph, env, scope, params, hash, template, inverse, visitor) {
  handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor);
}

function invokeHelper(morph, env, scope, visitor, _params, _hash, helper, templates, context) {
  var params = normalizeArray(env, _params);
  var hash = normalizeObject(env, _hash);
  return { value: helper.call(context, params, hash, templates) };
}

function normalizeArray(env, array) {
  var out = new Array(array.length);

  for (var i = 0, l = array.length; i < l; i++) {
    out[i] = env.hooks.getCellOrValue(array[i]);
  }

  return out;
}

function normalizeObject(env, object) {
  var out = {};

  for (var prop in object) {
    out[prop] = env.hooks.getCellOrValue(object[prop]);
  }

  return out;
}

function classify() /* env, scope, path */{
  return null;
}

var keywords = {
  partial: function (morph, env, scope, params) {
    var value = env.hooks.partial(morph, env, scope, params[0]);
    morph.setContent(value);
    return true;
  },

  yield: function (morph, env, scope, params, hash, template, inverse, visitor) {
    // the current scope is provided purely for the creation of shadow
    // scopes; it should not be provided to user code.

    var to = env.hooks.getValue(hash.to) || 'default';
    if (scope.blocks[to]) {
      scope.blocks[to].invoke(env, params, hash.self, morph, scope, visitor);
    }
    return true;
  },

  hasBlock: function (morph, env, scope, params) {
    var name = env.hooks.getValue(params[0]) || 'default';
    return !!scope.blocks[name];
  },

  hasBlockParams: function (morph, env, scope, params) {
    var name = env.hooks.getValue(params[0]) || 'default';
    return !!(scope.blocks[name] && scope.blocks[name].arity);
  }

};

exports.keywords = keywords;
/**
  Host Hook: partial

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path

  Corresponds to:

  ```hbs
  {{partial "location"}}
  ```

  This host hook is invoked by the default implementation of
  the `inline` hook. This makes `partial` a keyword in an
  HTMLBars environment using the default `inline` host hook.

  It is implemented as a host hook so that it can retrieve
  the named partial out of the `Environment`. Helpers, in
  contrast, only have access to the values passed in to them,
  and not to the ambient lexical environment.

  The host hook should invoke the referenced partial with
  the ambient `self`.
*/

function partial(renderNode, env, scope, path) {
  var template = env.partials[path];
  return template.render(scope.self, env, {}).fragment;
}

/**
  Host hook: range

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {any} value

  Corresponds to:

  ```hbs
  {{content}}
  {{{unescaped}}}
  ```

  This hook is responsible for updating a render node
  that represents a range of content with a value.
*/

function range(morph, env, scope, path, value, visitor) {
  if (handleRedirect(morph, env, scope, path, [value], {}, null, null, visitor)) {
    return;
  }

  value = env.hooks.getValue(value);

  if (morph.lastValue !== value) {
    morph.setContent(value);
  }

  morph.lastValue = value;
}

/**
  Host hook: element

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {Scope} scope
  @param {String} path
  @param {Array} params
  @param {Hash} hash

  Corresponds to:

  ```hbs
  <div {{bind-attr foo=bar}}></div>
  ```

  This hook is responsible for invoking a helper that
  modifies an element.

  Its purpose is largely legacy support for awkward
  idioms that became common when using the string-based
  Handlebars engine.

  Most of the uses of the `element` hook are expected
  to be superseded by component syntax and the
  `attribute` hook.
*/

function element(morph, env, scope, path, params, hash, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
    return;
  }

  var helper = env.hooks.lookupHelper(env, scope, path);
  if (helper) {
    env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, { element: morph.element });
  }
}

/**
  Host hook: attribute

  @param {RenderNode} renderNode
  @param {Environment} env
  @param {String} name
  @param {any} value

  Corresponds to:

  ```hbs
  <div foo={{bar}}></div>
  ```

  This hook is responsible for updating a render node
  that represents an element's attribute with a value.

  It receives the name of the attribute as well as an
  already-resolved value, and should update the render
  node with the value if appropriate.
*/

function attribute(morph, env, scope, name, value) {
  value = env.hooks.getValue(value);

  if (morph.lastValue !== value) {
    morph.setContent(value);
  }

  morph.lastValue = value;
}

function subexpr(env, scope, helperName, params, hash) {
  var helper = env.hooks.lookupHelper(env, scope, helperName);
  var result = env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, {});
  if (result && 'value' in result) {
    return env.hooks.getValue(result.value);
  }
}

/**
  Host Hook: get

  @param {Environment} env
  @param {Scope} scope
  @param {String} path

  Corresponds to:

  ```hbs
  {{foo.bar}}
    ^

  {{helper foo.bar key=value}}
           ^           ^
  ```

  This hook is the "leaf" hook of the system. It is used to
  resolve a path relative to the current scope.
*/

function get(env, scope, path) {
  if (path === '') {
    return scope.self;
  }

  var keys = path.split('.');
  var value = env.hooks.getRoot(scope, keys[0])[0];

  for (var i = 1; i < keys.length; i++) {
    if (value) {
      value = env.hooks.getChild(value, keys[i]);
    } else {
      break;
    }
  }

  return value;
}

function getRoot(scope, key) {
  if (scope.localPresent[key]) {
    return [scope.locals[key]];
  } else if (scope.self) {
    return [scope.self[key]];
  } else {
    return [undefined];
  }
}

function getChild(value, key) {
  return value[key];
}

function getValue(reference) {
  return reference;
}

function getCellOrValue(reference) {
  return reference;
}

function component(morph, env, scope, tagName, params, attrs, templates, visitor) {
  if (env.hooks.hasHelper(env, scope, tagName)) {
    return env.hooks.block(morph, env, scope, tagName, params, attrs, templates.default, templates.inverse, visitor);
  }

  componentFallback(morph, env, scope, tagName, attrs, templates.default);
}

function concat(env, params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += env.hooks.getValue(params[i]);
  }
  return value;
}

function componentFallback(morph, env, scope, tagName, attrs, template) {
  var element = env.dom.createElement(tagName);
  for (var name in attrs) {
    element.setAttribute(name, env.hooks.getValue(attrs[name]));
  }
  var fragment = _render2.default(template, env, scope, {}).fragment;
  element.appendChild(fragment);
  morph.setNode(element);
}

function hasHelper(env, scope, helperName) {
  return env.helpers[helperName] !== undefined;
}

function lookupHelper(env, scope, helperName) {
  return env.helpers[helperName];
}

function bindScope() /* env, scope */{
  // this function is used to handle host-specified extensions to scope
  // other than `self`, `locals` and `block`.
}

function updateScope(env, scope) {
  env.hooks.bindScope(env, scope);
}

exports.default = {
  // fundamental hooks that you will likely want to override
  bindLocal: bindLocal,
  bindSelf: bindSelf,
  bindScope: bindScope,
  classify: classify,
  component: component,
  concat: concat,
  createFreshScope: createFreshScope,
  getChild: getChild,
  getRoot: getRoot,
  getValue: getValue,
  getCellOrValue: getCellOrValue,
  keywords: keywords,
  linkRenderNode: linkRenderNode,
  partial: partial,
  subexpr: subexpr,

  // fundamental hooks with good default behavior
  bindBlock: bindBlock,
  bindShadowScope: bindShadowScope,
  updateLocal: updateLocal,
  updateSelf: updateSelf,
  updateScope: updateScope,
  createChildScope: createChildScope,
  hasHelper: hasHelper,
  lookupHelper: lookupHelper,
  invokeHelper: invokeHelper,
  cleanupRenderNode: null,
  destroyRenderNode: null,
  willCleanupTree: null,
  didCleanupTree: null,
  willRenderNode: null,
  didRenderNode: null,

  // derived hooks
  attribute: attribute,
  block: block,
  createScope: createScope,
  element: element,
  get: get,
  inline: inline,
  range: range,
  keyword: keyword
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvaG9va3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7c0JBQW1CLFVBQVU7Ozs7bUNBQ1AsMkJBQTJCOzs7O3VDQUVWLCtCQUErQjs7c0NBQ2xDLDhCQUE4Qjs7eUNBQ1EsaUNBQWlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTJFcEcsU0FBUyxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQzdCLE1BQUksUUFBUSxLQUFLLElBQUksRUFBRTtBQUFFLFdBQU8sSUFBSSxDQUFDO0dBQUc7O0FBRXhDLFNBQU87QUFDTCxRQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7QUFDbkIsU0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO0FBQ3JCLE9BQUcsRUFBRSxRQUFRO0FBQ2IsVUFBTSxFQUFFLFVBQVMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFO0FBQ25ELFVBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzs7QUFFekMsYUFBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7QUFDeEIsYUFBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDcEIsYUFBTyxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7O0FBRXhDLGFBQU8saUJBQU8sUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDOUM7R0FDRixDQUFDO0NBQ0g7O0FBRU0sU0FBUyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUU7QUFDL0UsTUFBSSxDQUFDLFFBQVEsRUFBRTtBQUFFLFdBQU8sRUFBRSxDQUFDO0dBQUU7O0FBRTdCLE1BQUks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QUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdEQsTUFBSSxNQUFNLEVBQUU7QUFDVixPQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7R0FDbEc7Q0FDRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBdUJNLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDeEQsT0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUVsQyxNQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO0FBQzdCLFNBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDekI7O0FBRUQsT0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Q0FDekI7O0FBRU0sU0FBUyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtBQUM1RCxNQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzVELE1BQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN0RixNQUFJLE1BQU0sSUFBSSxPQUFPLElBQUksTUFBTSxFQUFFO0FBQUUsV0FBTyxHQUFHLENBQUMs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QVEsRUFBRSxRQUFRO0FBQ2xCLFdBQVMsRUFBRSxTQUFTO0FBQ3BCLFFBQU0sRUFBRSxNQUFNO0FBQ2Qsa0JBQWdCLEVBQUUsZ0JBQWdCO0FBQ2xDLFVBQVEsRUFBRSxRQUFRO0FBQ2xCLFNBQU8sRUFBRSxPQUFPO0FBQ2hCLFVBQVEsRUFBRSxRQUFRO0FBQ2xCLGdCQUFjLEVBQUUsY0FBYztBQUM5QixVQUFRLEVBQUUsUUFBUTtBQUNsQixnQkFBYyxFQUFFLGNBQWM7QUFDOUIsU0FBTyxFQUFFLE9BQU87QUFDaEIsU0FBTyxFQUFFLE9BQU87OztBQUdoQixXQUFTLEVBQUUsU0FBUztBQUNwQixpQkFBZSxFQUFFLGVBQWU7QUFDaEMsYUFBVyxFQUFFLFdBQVc7QUFDeEIsWUFBVSxFQUFFLFVBQVU7QUFDdEIsYUFBVyxFQUFFLFdBQVc7QUFDeEIsa0JBQWdCLEVBQUUsZ0JBQWdCO0FBQ2xDLFdBQVMsRUFBRSxTQUFTO0FBQ3BCLGNBQVksRUFBRSxZQUFZO0FBQzFCLGNBQVksRUFBRSxZQUFZO0FBQzFCLG1CQUFpQixFQUFFLElBQUk7QUFDdkIsbUJBQWlCLEVBQUUsSUFBSTtBQUN2QixpQkFBZSxFQUFFLElBQUk7QUFDckIsZ0JBQWMsRUFBRSxJQUFJO0FBQ3BCLGdCQUFjLEVBQUUsSUFBSTtBQUNwQixlQUFhLEVBQUUsSUFBSTs7O0FBR25CLFdBQVMsRUFBRSxTQUFTO0FBQ3BCLE9BQUssRUFBRSxLQUFLO0FBQ1osYUFBVyxFQUFFLFdBQVc7QUFDeEIsU0FBTyxFQUFFLE9BQU87QUFDaEIsS0FBRyxFQUFFLEdBQUc7QUFDUixRQUFNLEVBQUUsTUFBTTtBQUNkLE9BQUssRUFBRSxLQUFLO0FBQ1osU0FBTyxFQUFFLE9BQU87Q0FDakIiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9ob29rcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCByZW5kZXIgZnJvbSBcIi4vcmVuZGVyXCI7XG5pbXBvcnQgTW9ycGhMaXN0IGZyb20gXCIuLi9tb3JwaC1yYW5nZS9tb3JwaC1saXN0XCI7XG5pbXBvcnQgeyBjcmVhdGVDaGlsZE1vcnBoIH0gZnJvbSBcIi4vcmVuZGVyXCI7XG5pbXBvcnQgeyBrZXlMZW5ndGgsIHNoYWxsb3dDb3B5IH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzXCI7XG5pbXBvcnQgeyB2YWxpZGF0ZUNoaWxkTW9ycGhzIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcbmltcG9ydCB7IFJlbmRlclN0YXRlLCBjbGVhck1vcnBoLCBjbGVhck1vcnBoTGlzdCwgcmVuZGVyQW5kQ2xlYW51cCB9IGZyb20gXCIuLi9odG1sYmFycy11dGlsL3RlbXBsYXRlLXV0aWxzXCI7XG5pbXBvcnQgeyBsaW5rUGFyYW1zIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcblxuLyoqXG4gIEhUTUxCYXJzIGRlbGVnYXRlcyB0aGUgcnVudGltZSBiZWhhdmlvciBvZiBhIHRlbXBsYXRlIHRvXG4gIGhvb2tzIHByb3ZpZGVkIGJ5IHRoZSBob3N0IGVudmlyb25tZW50LiBUaGVzZSBob29rcyBleHBsYWluXG4gIHRoZSBsZXhpY2FsIGVudmlyb25tZW50IG9mIGEgSGFuZGxlYmFycyB0ZW1wbGF0ZSwgdGhlIGludGVybmFsXG4gIHJlcHJlc2VudGF0aW9uIG9mIHJlZmVyZW5jZXMsIGFuZCB0aGUgaW50ZXJhY3Rpb24gYmV0d2VlbiBhblxuICBIVE1MQmFycyB0ZW1wbGF0ZSBhbmQgdGhlIERPTSBpdCBpcyBtYW5hZ2luZy5cblxuICBXaGlsZSBIVE1MQmFycyBob3N0IGhvb2tzIGhhdmUgYWNjZXNzIHRvIGFsbCBvZiB0aGlzIGludGVybmFsXG4gIG1hY2hpbmVyeSwgdGVtcGxhdGVzIGFuZCBoZWxwZXJzIGhhdmUgYWNjZXNzIHRvIHRoZSBhYnN0cmFjdGlvblxuICBwcm92aWRlZCBieSB0aGUgaG9zdCBob29rcy5cblxuICAjIyBUaGUgTGV4aWNhbCBFbnZpcm9ubWVudFxuXG4gIFRoZSBkZWZhdWx0IGxleGljYWwgZW52aXJvbm1lbnQgb2YgYW4gSFRNTEJhcnMgdGVtcGxhdGUgaW5jbHVkZXM6XG5cbiAgKiBBbnkgbG9jYWwgdmFyaWFibGVzLCBwcm92aWRlZCBieSAqYmxvY2sgYXJndW1lbnRzKlxuICAqIFRoZSBjdXJyZW50IHZhbHVlIG9mIGBzZWxmYFxuXG4gICMjIFNpbXBsZSBOZXN0aW5nXG5cbiAgTGV0J3MgbG9vayBhdCBhIHNpbXBsZSB0ZW1wbGF0ZSB3aXRoIGEgbmVzdGVkIGJsb2NrOlxuXG4gIGBgYGhic1xuICA8aDE+e3t0aXRsZX19PC9oMT5cblxuICB7eyNpZiBhdXRob3J9fVxuICAgIDxwIGNsYXNzPVwiYnlsaW5lXCI+e3thdXRob3J9fTwvcD5cbiAge3svaWZ9fVxuICBgYGBcblxuICBJbiB0aGlzIGNhc2UsIHRoZSBsZXhpY2FsIGVudmlyb25tZW50IGF0IHRoZSB0b3AtbGV2ZWwgb2YgdGhlXG4gIHRlbXBsYXRlIGRvZXMgbm90IGNoYW5nZSBpbnNpZGUgb2YgdGhlIGBpZmAgYmxvY2suIFRoaXMgaXNcbiAgYWNoaWV2ZWQgdmlhIGFuIGltcGxlbWVudGF0aW9uIG9mIGBpZmAgdGhhdCBsb29rcyBsaWtlIHRoaXM6XG5cbiAgYGBganNcbiAgcmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgaWYgKCEhcGFyYW1zWzBdKSB7XG4gICAgICByZXR1cm4gdGhpcy55aWVsZCgpO1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuXG4gIEEgY2FsbCB0byBgdGhpcy55aWVsZGAgaW52b2tlcyB0aGUgY2hpbGQgdGVtcGxhdGUgdXNpbmcgdGhlXG4gIGN1cnJlbnQgbGV4aWNhbCBlbnZpcm9ubWVudC5cblxuICAjIyBCbG9jayBBcmd1bWVudHNcblxuICBJdCBpcyBwb3NzaWJsZSBmb3IgbmVzdGVkIGJsb2NrcyB0byBpbnRyb2R1Y2UgbmV3IGxvY2FsXG4gIHZhcmlhYmxlczpcblxuICBgYGBoYnNcbiAge3sjY291bnQtY2FsbHMgYXMgfGl8fX1cbiAgPGgxPnt7dGl0bGV9fTwvaDE+XG4gIDxwPkNhbGxlZCB7e2l9fSB0aW1lczwvcD5cbiAge3svY291bnR9fVxuICBgYGBcblxuICBJbiB0aGlzIGV4YW1wbGUsIHRoZSBjaGlsZCBibG9jayBpbmhlcml0cyBpdHMgc3Vycm91bmRpbmdcbiAgbGV4aWNhbCBlbnZpcm9ubWVudCwgYnV0IGF1Z21lbnRzIGl0IHdpdGggYSBzaW5nbGUgbmV3XG4gIHZhcmlhYmxlIGJpbmRpbmcuXG5cbiAgVGhlIGltcGxlbWVudGF0aW9uIG9mIGBjb3VudC1jYWxsc2Agc3VwcGxpZXMgdGhlIHZhbHVlIG9mXG4gIGBpYCwgYnV0IGRvZXMgbm90IG90aGVyd2lzZSBhbHRlciB0aGUgZW52aXJvbm1lbnQ6XG5cbiAgYGBganNcbiAgdmFyIGNvdW50ID0gMDtcbiAgcmVnaXN0ZXJIZWxwZXIoJ2NvdW50LWNhbGxzJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoWyArK2NvdW50IF0pO1xuICB9KTtcbiAgYGBgXG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gd3JhcCh0ZW1wbGF0ZSkge1xuICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHsgcmV0dXJuIG51bGw7ICB9XG5cbiAgcmV0dXJuIHtcbiAgICBtZXRhOiB0ZW1wbGF0ZS5tZXRhLFxuICAgIGFyaXR5OiB0ZW1wbGF0ZS5hcml0eSxcbiAgICByYXc6IHRlbXBsYXRlLFxuICAgIHJlbmRlcjogZnVuY3Rpb24oc2VsZiwgZW52LCBvcHRpb25zLCBibG9ja0FyZ3VtZW50cykge1xuICAgICAgdmFyIHNjb3BlID0gZW52Lmhvb2tzLmNyZWF0ZUZyZXNoU2NvcGUoKTtcblxuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICBvcHRpb25zLnNlbGYgPSBzZWxmO1xuICAgICAgb3B0aW9ucy5ibG9ja0FyZ3VtZW50cyA9IGJsb2NrQXJndW1lbnRzO1xuXG4gICAgICByZXR1cm4gcmVuZGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCBvcHRpb25zKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cmFwRm9ySGVscGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCBtb3JwaCwgcmVuZGVyU3RhdGUsIHZpc2l0b3IpIHtcbiAgaWYgKCF0ZW1wbGF0ZSkgeyByZXR1cm4ge307IH1cblxuICB2YXIgeWllbGRBcmdzID0geWllbGRUZW1wbGF0ZSh0ZW1wbGF0ZSwgZW52LCBzY29wZSwgbW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKTtcblxuICByZXR1cm4ge1xuICAgIG1ldGE6IHRlbXBsYXRlLm1ldGEsXG4gICAgYXJpdHk6IHRlbXBsYXRlLmFyaXR5LFxuICAgIHlpZWxkOiB5aWVsZEFyZ3MsXG4gICAgeWllbGRJdGVtOiB5aWVsZEl0ZW0odGVtcGxhdGUsIGVudiwgc2NvcGUsIG1vcnBoLCByZW5kZXJTdGF0ZSwgdmlzaXRvciksXG4gICAgcmF3OiB0ZW1wbGF0ZSxcblxuICAgIHJlbmRlcjogZnVuY3Rpb24oc2VsZiwgYmxvY2tBcmd1bWVudHMpIHtcbiAgICAgIHlpZWxkQXJncyhibG9ja0FyZ3VtZW50cywgc2VsZik7XG4gICAgfVxuICB9O1xufVxuXG4vLyBDYWxsZWQgYnkgYSB1c2VyLWxhbmQgaGVscGVyIHRvIHJlbmRlciBhIHRlbXBsYXRlLlxuZnVuY3Rpb24geWllbGRUZW1wbGF0ZSh0ZW1wbGF0ZSwgZW52LCBwYXJlbnRTY29wZSwgbW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbihibG9ja0FyZ3VtZW50cywgc2VsZikge1xuICAgIC8vIFJlbmRlciBzdGF0ZSBpcyB1c2VkIHRvIHRyYWNrIHRoZSBwcm9ncmVzcyBvZiB0aGUgaGVscGVyIChzaW5jZSBpdFxuICAgIC8vIG1heSBjYWxsIGludG8gdXMgbXVsdGlwbGUgdGltZXMpLiBBcyB0aGUgdXNlci1sYW5kIGhlbHBlciBjYWxsc1xuICAgIC8vIGludG8gbGlicmFyeSBjb2RlLCB3ZSB0cmFjayB3aGF0IG5lZWRzIHRvIGJlIGNsZWFuZWQgdXAgYWZ0ZXIgdGhlXG4gICAgLy8gaGVscGVyIGhhcyByZXR1cm5lZC5cbiAgICAvL1xuICAgIC8vIEhlcmUsIHdlIHJlbWVtYmVyIHRoYXQgYSB0ZW1wbGF0ZSBoYXMgYmVlbiB5aWVsZGVkIGFuZCBzbyB3ZSBkbyBub3RcbiAgICAvLyBuZWVkIHRvIHJlbW92ZSB0aGUgcHJldmlvdXMgdGVtcGxhdGUuIChJZiBubyB0ZW1wbGF0ZSBpcyB5aWVsZGVkXG4gICAgLy8gdGhpcyByZW5kZXIgYnkgdGhlIGhlbHBlciwgd2UgYXNzdW1lIG5vdGhpbmcgc2hvdWxkIGJlIHNob3duIGFuZFxuICAgIC8vIHJlbW92ZSBhbnkgcHJldmlvdXMgcmVuZGVyZWQgdGVtcGxhdGVzLilcbiAgICByZW5kZXJTdGF0ZS5tb3JwaFRvQ2xlYXIgPSBudWxsO1xuXG4gICAgLy8gSW4gdGhpcyBjb25kaXRpb25hbCBpcyB0cnVlLCBpdCBtZWFucyB0aGF0IG9uIHRoZSBwcmV2aW91cyByZW5kZXJpbmcgcGFzc1xuICAgIC8vIHRoZSBoZWxwZXIgeWllbGRlZCBtdWx0aXBsZSBpdGVtcyB2aWEgYHlpZWxkSXRlbSgpYCwgYnV0IHRoaXMgdGltZSB0aGV5XG4gICAgLy8gYXJlIHlpZWxkaW5nIGEgc2luZ2xlIHRlbXBsYXRlLiBJbiB0aGF0IGNhc2UsIHdlIG1hcmsgdGhlIG1vcnBoIGxpc3QgZm9yXG4gICAgLy8gY2xlYW51cCBzbyBpdCBpcyByZW1vdmVkIGZyb20gdGhlIERPTS5cbiAgICBpZiAobW9ycGgubW9ycGhMaXN0KSB7XG4gICAgICBjbGVhck1vcnBoTGlzdChtb3JwaC5tb3JwaExpc3QsIG1vcnBoLCBlbnYpO1xuICAgICAgcmVuZGVyU3RhdGUubW9ycGhMaXN0VG9DbGVhciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHNjb3BlID0gcGFyZW50U2NvcGU7XG5cbiAgICBpZiAobW9ycGgubGFzdFlpZWxkZWQgJiYgaXNTdGFibGVUZW1wbGF0ZSh0ZW1wbGF0ZSwgbW9ycGgubGFzdFlpZWxkZWQpKSB7XG4gICAgICByZXR1cm4gbW9ycGgubGFzdFJlc3VsdC5yZXZhbGlkYXRlV2l0aChlbnYsIHVuZGVmaW5lZCwgc2VsZiwgYmxvY2tBcmd1bWVudHMsIHZpc2l0b3IpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHdlIGFjdHVhbGx5ICoqbmVlZCoqIGEgbmV3IHNjb3BlLCBhbmQgY2FuJ3RcbiAgICAvLyBzaGFyZSB0aGUgcGFyZW50IHNjb3BlLiBOb3RlIHRoYXQgd2UgbmVlZCB0byBtb3ZlIHRoaXMgY2hlY2sgaW50b1xuICAgIC8vIGEgaG9zdCBob29rLCBiZWNhdXNlIHRoZSBob3N0J3Mgbm90aW9uIG9mIHNjb3BlIG1heSByZXF1aXJlIGEgbmV3XG4gICAgLy8gc2NvcGUgaW4gbW9yZSBjYXNlcyB0aGFuIHRoZSBvbmVzIHdlIGNhbiBkZXRlcm1pbmUgc3RhdGljYWxseS5cbiAgICBpZiAoc2VsZiAhPT0gdW5kZWZpbmVkIHx8IHBhcmVudFNjb3BlID09PSBudWxsIHx8IHRlbXBsYXRlLmFyaXR5KSB7XG4gICAgICBzY29wZSA9IGVudi5ob29rcy5jcmVhdGVDaGlsZFNjb3BlKHBhcmVudFNjb3BlKTtcbiAgICB9XG5cbiAgICBtb3JwaC5sYXN0WWllbGRlZCA9IHsgc2VsZjogc2VsZiwgdGVtcGxhdGU6IHRlbXBsYXRlLCBzaGFkb3dUZW1wbGF0ZTogbnVsbCB9O1xuXG4gICAgLy8gUmVuZGVyIHRoZSB0ZW1wbGF0ZSB0aGF0IHdhcyBzZWxlY3RlZCBieSB0aGUgaGVscGVyXG4gICAgcmVuZGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCB7IHJlbmRlck5vZGU6IG1vcnBoLCBzZWxmOiBzZWxmLCBibG9ja0FyZ3VtZW50czogYmxvY2tBcmd1bWVudHMgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHlpZWxkSXRlbSh0ZW1wbGF0ZSwgZW52LCBwYXJlbnRTY29wZSwgbW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKSB7XG4gIC8vIEluaXRpYWxpemUgc3RhdGUgdGhhdCB0cmFja3MgbXVsdGlwbGUgaXRlbXMgYmVpbmdcbiAgLy8geWllbGRlZCBpbi5cbiAgdmFyIGN1cnJlbnRNb3JwaCA9IG51bGw7XG5cbiAgLy8gQ2FuZGlkYXRlIG1vcnBocyBmb3IgZGVsZXRpb24uXG4gIHZhciBjYW5kaWRhdGVzID0ge307XG5cbiAgLy8gUmV1c2UgZXhpc3RpbmcgTW9ycGhMaXN0IGlmIHRoaXMgaXMgbm90IGEgZmlyc3QtdGltZVxuICAvLyByZW5kZXIuXG4gIHZhciBtb3JwaExpc3QgPSBtb3JwaC5tb3JwaExpc3Q7XG4gIGlmIChtb3JwaExpc3QpIHtcbiAgICBjdXJyZW50TW9ycGggPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuICB9XG5cbiAgLy8gQWR2YW5jZXMgdGhlIGN1cnJlbnRNb3JwaCBwb2ludGVyIHRvIHRoZSBtb3JwaCBpbiB0aGUgcHJldmlvdXNseS1yZW5kZXJlZFxuICAvLyBsaXN0IHRoYXQgbWF0Y2hlcyB0aGUgeWllbGRlZCBrZXkuIFdoaWxlIGRvaW5nIHNvLCBpdCBtYXJrcyBhbnkgbW9ycGhzXG4gIC8vIHRoYXQgaXQgYWR2YW5jZXMgcGFzdCBhcyBjYW5kaWRhdGVzIGZvciBkZWxldGlvbi4gQXNzdW1pbmcgdGhvc2UgbW9ycGhzXG4gIC8vIGFyZSBub3QgeWllbGRlZCBpbiBsYXRlciwgdGhleSB3aWxsIGJlIHJlbW92ZWQgaW4gdGhlIHBydW5lIHN0ZXAgZHVyaW5nXG4gIC8vIGNsZWFudXAuXG4gIC8vIE5vdGUgdGhhdCB0aGlzIGhlbHBlciBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgdGhlIG1vcnBoIGJlaW5nIHNlZWtlZCB0byBpc1xuICAvLyBndWFyYW50ZWVkIHRvIGV4aXN0IGluIHRoZSBwcmV2aW91cyBNb3JwaExpc3Q7IGlmIHRoaXMgaXMgY2FsbGVkIGFuZCB0aGVcbiAgLy8gbW9ycGggZG9lcyBub3QgZXhpc3QsIGl0IHdpbGwgcmVzdWx0IGluIGFuIGluZmluaXRlIGxvb3BcbiAgZnVuY3Rpb24gYWR2YW5jZVRvS2V5KGtleSkge1xuICAgIGxldCBzZWVrID0gY3VycmVudE1vcnBoO1xuXG4gICAgd2hpbGUgKHNlZWsua2V5ICE9PSBrZXkpIHtcbiAgICAgIGNhbmRpZGF0ZXNbc2Vlay5rZXldID0gc2VlaztcbiAgICAgIHNlZWsgPSBzZWVrLm5leHRNb3JwaDtcbiAgICB9XG5cbiAgICBjdXJyZW50TW9ycGggPSBzZWVrLm5leHRNb3JwaDtcbiAgICByZXR1cm4gc2VlaztcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihfa2V5LCBibG9ja0FyZ3VtZW50cywgc2VsZikge1xuICAgIGlmICh0eXBlb2YgX2tleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IHByb3ZpZGUgYSBzdHJpbmcga2V5IHdoZW4gY2FsbGluZyBgeWllbGRJdGVtYDsgeW91IHByb3ZpZGVkIFwiICsgX2tleSk7XG4gICAgfVxuXG4gICAgLy8gQXQgbGVhc3Qgb25lIGl0ZW0gaGFzIGJlZW4geWllbGRlZCwgc28gd2UgZG8gbm90IHdob2xlc2FsZVxuICAgIC8vIGNsZWFyIHRoZSBsYXN0IE1vcnBoTGlzdCBidXQgaW5zdGVhZCBhcHBseSBhIHBydW5lIG9wZXJhdGlvbi5cbiAgICByZW5kZXJTdGF0ZS5tb3JwaExpc3RUb0NsZWFyID0gbnVsbDtcbiAgICBtb3JwaC5sYXN0WWllbGRlZCA9IG51bGw7XG5cbiAgICB2YXIgbW9ycGhMaXN0LCBtb3JwaE1hcDtcblxuICAgIGlmICghbW9ycGgubW9ycGhMaXN0KSB7XG4gICAgICBtb3JwaC5tb3JwaExpc3QgPSBuZXcgTW9ycGhMaXN0KCk7XG4gICAgICBtb3JwaC5tb3JwaE1hcCA9IHt9O1xuICAgICAgbW9ycGguc2V0TW9ycGhMaXN0KG1vcnBoLm1vcnBoTGlzdCk7XG4gICAgfVxuXG4gICAgbW9ycGhMaXN0ID0gbW9ycGgubW9ycGhMaXN0O1xuICAgIG1vcnBoTWFwID0gbW9ycGgubW9ycGhNYXA7XG5cbiAgICAvLyBBIG1hcCBvZiBtb3JwaHMgdGhhdCBoYXZlIGJlZW4geWllbGRlZCBpbiBvbiB0aGlzXG4gICAgLy8gcmVuZGVyaW5nIHBhc3MuIEFueSBtb3JwaHMgdGhhdCBkbyBub3QgbWFrZSBpdCBpbnRvXG4gICAgLy8gdGhpcyBsaXN0IHdpbGwgYmUgcHJ1bmVkIGZyb20gdGhlIE1vcnBoTGlzdCBkdXJpbmcgdGhlIGNsZWFudXBcbiAgICAvLyBwcm9jZXNzLlxuICAgIGxldCBoYW5kbGVkTW9ycGhzID0gcmVuZGVyU3RhdGUuaGFuZGxlZE1vcnBocztcbiAgICBsZXQga2V5O1xuXG4gICAgaWYgKF9rZXkgaW4gaGFuZGxlZE1vcnBocykge1xuICAgICAgLy8gSW4gdGhpcyBicmFuY2ggd2UgYXJlIGRlYWxpbmcgd2l0aCBhIGR1cGxpY2F0ZSBrZXkuIFRoZSBzdHJhdGVneVxuICAgICAgLy8gaXMgdG8gdGFrZSB0aGUgb3JpZ2luYWwga2V5IGFuZCBhcHBlbmQgYSBjb3VudGVyIHRvIGl0IHRoYXQgaXNcbiAgICAgIC8vIGluY3JlbWVudGVkIGV2ZXJ5IHRpbWUgdGhlIGtleSBpcyByZXVzZWQuIEluIG9yZGVyIHRvIGdyZWF0bHlcbiAgICAgIC8vIHJlZHVjZSB0aGUgY2hhbmNlIG9mIGNvbGxpZGluZyB3aXRoIGFub3RoZXIgdmFsaWQga2V5IHdlIGFsc28gYWRkXG4gICAgICAvLyBhbiBleHRyYSBzdHJpbmcgXCItLXo4bVMyaHZEVzBBLS1cIiB0byB0aGUgbmV3IGtleS5cbiAgICAgIGxldCBjb2xsaXNpb25zID0gcmVuZGVyU3RhdGUuY29sbGlzaW9ucztcbiAgICAgIGlmIChjb2xsaXNpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29sbGlzaW9ucyA9IHJlbmRlclN0YXRlLmNvbGxpc2lvbnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGxldCBjb3VudCA9IGNvbGxpc2lvbnNbX2tleV0gfCAwO1xuICAgICAgY29sbGlzaW9uc1tfa2V5XSA9ICsrY291bnQ7XG5cbiAgICAgIGtleSA9IF9rZXkgKyAnLS16OG1TMmh2RFcwQS0tJyArIGNvdW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXkgPSBfa2V5O1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50TW9ycGggJiYgY3VycmVudE1vcnBoLmtleSA9PT0ga2V5KSB7XG4gICAgICB5aWVsZFRlbXBsYXRlKHRlbXBsYXRlLCBlbnYsIHBhcmVudFNjb3BlLCBjdXJyZW50TW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKShibG9ja0FyZ3VtZW50cywgc2VsZik7XG4gICAgICBjdXJyZW50TW9ycGggPSBjdXJyZW50TW9ycGgubmV4dE1vcnBoO1xuICAgICAgaGFuZGxlZE1vcnBoc1trZXldID0gY3VycmVudE1vcnBoO1xuICAgIH0gZWxzZSBpZiAobW9ycGhNYXBba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBsZXQgZm91bmRNb3JwaCA9IG1vcnBoTWFwW2tleV07XG5cbiAgICAgIGlmIChrZXkgaW4gY2FuZGlkYXRlcykge1xuICAgICAgICAvLyBJZiB3ZSBhbHJlYWR5IHNhdyB0aGlzIG1vcnBoLCBtb3ZlIGl0IGZvcndhcmQgdG8gdGhpcyBwb3NpdGlvblxuICAgICAgICBtb3JwaExpc3QuaW5zZXJ0QmVmb3JlTW9ycGgoZm91bmRNb3JwaCwgY3VycmVudE1vcnBoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgbW92ZSB0aGUgcG9pbnRlciBmb3J3YXJkIHRvIHRoZSBleGlzdGluZyBtb3JwaCBmb3IgdGhpcyBrZXlcbiAgICAgICAgYWR2YW5jZVRvS2V5KGtleSk7XG4gICAgICB9XG5cbiAgICAgIGhhbmRsZWRNb3JwaHNbZm91bmRNb3JwaC5rZXldID0gZm91bmRNb3JwaDtcbiAgICAgIHlpZWxkVGVtcGxhdGUodGVtcGxhdGUsIGVudiwgcGFyZW50U2NvcGUsIGZvdW5kTW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKShibG9ja0FyZ3VtZW50cywgc2VsZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjaGlsZE1vcnBoID0gY3JlYXRlQ2hpbGRNb3JwaChlbnYuZG9tLCBtb3JwaCk7XG4gICAgICBjaGlsZE1vcnBoLmtleSA9IGtleTtcbiAgICAgIG1vcnBoTWFwW2tleV0gPSBoYW5kbGVkTW9ycGhzW2tleV0gPSBjaGlsZE1vcnBoO1xuICAgICAgbW9ycGhMaXN0Lmluc2VydEJlZm9yZU1vcnBoKGNoaWxkTW9ycGgsIGN1cnJlbnRNb3JwaCk7XG4gICAgICB5aWVsZFRlbXBsYXRlKHRlbXBsYXRlLCBlbnYsIHBhcmVudFNjb3BlLCBjaGlsZE1vcnBoLCByZW5kZXJTdGF0ZSwgdmlzaXRvcikoYmxvY2tBcmd1bWVudHMsIHNlbGYpO1xuICAgIH1cblxuICAgIHJlbmRlclN0YXRlLm1vcnBoTGlzdFRvUHJ1bmUgPSBtb3JwaExpc3Q7XG4gICAgbW9ycGguY2hpbGROb2RlcyA9IG51bGw7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzU3RhYmxlVGVtcGxhdGUodGVtcGxhdGUsIGxhc3RZaWVsZGVkKSB7XG4gIHJldHVybiAhbGFzdFlpZWxkZWQuc2hhZG93VGVtcGxhdGUgJiYgdGVtcGxhdGUgPT09IGxhc3RZaWVsZGVkLnRlbXBsYXRlO1xufVxuZnVuY3Rpb24gb3B0aW9uc0Zvcih0ZW1wbGF0ZSwgaW52ZXJzZSwgZW52LCBzY29wZSwgbW9ycGgsIHZpc2l0b3IpIHtcbiAgLy8gSWYgdGhlcmUgd2FzIGEgdGVtcGxhdGUgeWllbGRlZCBsYXN0IHRpbWUsIHNldCBtb3JwaFRvQ2xlYXIgc28gaXQgd2lsbCBiZSBjbGVhcmVkXG4gIC8vIGlmIG5vIHRlbXBsYXRlIGlzIHlpZWxkZWQgb24gdGhpcyByZW5kZXIuXG4gIHZhciBtb3JwaFRvQ2xlYXIgPSBtb3JwaC5sYXN0UmVzdWx0ID8gbW9ycGggOiBudWxsO1xuICB2YXIgcmVuZGVyU3RhdGUgPSBuZXcgUmVuZGVyU3RhdGUobW9ycGhUb0NsZWFyLCBtb3JwaC5tb3JwaExpc3QgfHwgbnVsbCk7XG5cbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgIHRlbXBsYXRlOiB3cmFwRm9ySGVscGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCBtb3JwaCwgcmVuZGVyU3RhdGUsIHZpc2l0b3IpLFxuICAgICAgaW52ZXJzZTogd3JhcEZvckhlbHBlcihpbnZlcnNlLCBlbnYsIHNjb3BlLCBtb3JwaCwgcmVuZGVyU3RhdGUsIHZpc2l0b3IpXG4gICAgfSxcbiAgICByZW5kZXJTdGF0ZTogcmVuZGVyU3RhdGVcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGhpc0ZvcihvcHRpb25zKSB7XG4gIHJldHVybiB7XG4gICAgYXJpdHk6IG9wdGlvbnMudGVtcGxhdGUuYXJpdHksXG4gICAgeWllbGQ6IG9wdGlvbnMudGVtcGxhdGUueWllbGQsXG4gICAgeWllbGRJdGVtOiBvcHRpb25zLnRlbXBsYXRlLnlpZWxkSXRlbSxcbiAgICB5aWVsZEluOiBvcHRpb25zLnRlbXBsYXRlLnlpZWxkSW5cbiAgfTtcbn1cblxuLyoqXG4gIEhvc3QgSG9vazogY3JlYXRlU2NvcGVcblxuICBAcGFyYW0ge1Njb3BlP30gcGFyZW50U2NvcGVcbiAgQHJldHVybiBTY29wZVxuXG4gIENvcnJlc3BvbmRzIHRvIGVudGVyaW5nIGEgbmV3IEhUTUxCYXJzIGJsb2NrLlxuXG4gIFRoaXMgaG9vayBpcyBpbnZva2VkIHdoZW4gYSBibG9jayBpcyBlbnRlcmVkIHdpdGhcbiAgYSBuZXcgYHNlbGZgIG9yIGFkZGl0aW9uYWwgbG9jYWwgdmFyaWFibGVzLlxuXG4gIFdoZW4gaW52b2tlZCBmb3IgYSB0b3AtbGV2ZWwgdGVtcGxhdGUsIHRoZVxuICBgcGFyZW50U2NvcGVgIGlzIGBudWxsYCwgYW5kIHRoaXMgaG9vayBzaG91bGQgcmV0dXJuXG4gIGEgZnJlc2ggU2NvcGUuXG5cbiAgV2hlbiBpbnZva2VkIGZvciBhIGNoaWxkIHRlbXBsYXRlLCB0aGUgYHBhcmVudFNjb3BlYFxuICBpcyB0aGUgc2NvcGUgZm9yIHRoZSBwYXJlbnQgZW52aXJvbm1lbnQuXG5cbiAgTm90ZSB0aGF0IHRoZSBgU2NvcGVgIGlzIGFuIG9wYXF1ZSB2YWx1ZSB0aGF0IGlzXG4gIHBhc3NlZCB0byBvdGhlciBob3N0IGhvb2tzLiBGb3IgZXhhbXBsZSwgdGhlIGBnZXRgXG4gIGhvb2sgdXNlcyB0aGUgc2NvcGUgdG8gcmV0cmlldmUgYSB2YWx1ZSBmb3IgYSBnaXZlblxuICBzY29wZSBhbmQgdmFyaWFibGUgbmFtZS5cbiovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2NvcGUoZW52LCBwYXJlbnRTY29wZSkge1xuICBpZiAocGFyZW50U2NvcGUpIHtcbiAgICByZXR1cm4gZW52Lmhvb2tzLmNyZWF0ZUNoaWxkU2NvcGUocGFyZW50U2NvcGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBlbnYuaG9va3MuY3JlYXRlRnJlc2hTY29wZSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGcmVzaFNjb3BlKCkge1xuICAvLyBiZWNhdXNlIGBpbmAgY2hlY2tzIGhhdmUgdW5wcmVkaWN0YWJsZSBwZXJmb3JtYW5jZSwga2VlcCBhXG4gIC8vIHNlcGFyYXRlIGRpY3Rpb25hcnkgdG8gdHJhY2sgd2hldGhlciBhIGxvY2FsIHdhcyBib3VuZC5cbiAgLy8gU2VlIGBiaW5kTG9jYWxgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICByZXR1cm4geyBzZWxmOiBudWxsLCBibG9ja3M6IHt9LCBsb2NhbHM6IHt9LCBsb2NhbFByZXNlbnQ6IHt9IH07XG59XG5cbi8qKlxuICBIb3N0IEhvb2s6IGJpbmRTaGFkb3dTY29wZVxuXG4gIEBwYXJhbSB7U2NvcGU/fSBwYXJlbnRTY29wZVxuICBAcmV0dXJuIFNjb3BlXG5cbiAgQ29ycmVzcG9uZHMgdG8gcmVuZGVyaW5nIGEgbmV3IHRlbXBsYXRlIGludG8gYW4gZXhpc3RpbmdcbiAgcmVuZGVyIHRyZWUsIGJ1dCB3aXRoIGEgbmV3IHRvcC1sZXZlbCBsZXhpY2FsIHNjb3BlLiBUaGlzXG4gIHRlbXBsYXRlIGlzIGNhbGxlZCB0aGUgXCJzaGFkb3cgcm9vdFwiLlxuXG4gIElmIGEgc2hhZG93IHRlbXBsYXRlIGludm9rZXMgYHt7eWllbGR9fWAsIGl0IHdpbGwgcmVuZGVyXG4gIHRoZSBibG9jayBwcm92aWRlZCB0byB0aGUgc2hhZG93IHJvb3QgaW4gdGhlIG9yaWdpbmFsXG4gIGxleGljYWwgc2NvcGUuXG5cbiAgYGBgaGJzXG4gIHt7IS0tIHBvc3QgdGVtcGxhdGUgLS19fVxuICA8cD57e3Byb3BzLnRpdGxlfX08L3A+XG4gIHt7eWllbGR9fVxuXG4gIHt7IS0tIGJsb2cgdGVtcGxhdGUgLS19fVxuICB7eyNwb3N0IHRpdGxlPVwiSGVsbG8gd29ybGRcIn19XG4gICAgPHA+Ynkge3tieWxpbmV9fTwvcD5cbiAgICA8YXJ0aWNsZT5UaGlzIGlzIG15IGZpcnN0IHBvc3Q8L2FydGljbGU+XG4gIHt7L3Bvc3R9fVxuXG4gIHt7I3Bvc3QgdGl0bGU9XCJHb29kYnllIHdvcmxkXCJ9fVxuICAgIDxwPmJ5IHt7YnlsaW5lfX08L3A+XG4gICAgPGFydGljbGU+VGhpcyBpcyBteSBsYXN0IHBvc3Q8L2FydGljbGU+XG4gIHt7L3Bvc3R9fVxuICBgYGBcblxuICBgYGBqc1xuICBoZWxwZXJzLnBvc3QgPSBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zLnRlbXBsYXRlLnlpZWxkSW4ocG9zdFRlbXBsYXRlLCB7IHByb3BzOiBoYXNoIH0pO1xuICB9O1xuXG4gIGJsb2cucmVuZGVyKHsgYnlsaW5lOiBcIlllaHVkYSBLYXR6XCIgfSk7XG4gIGBgYFxuXG4gIFByb2R1Y2VzOlxuXG4gIGBgYGh0bWxcbiAgPHA+SGVsbG8gd29ybGQ8L3A+XG4gIDxwPmJ5IFllaHVkYSBLYXR6PC9wPlxuICA8YXJ0aWNsZT5UaGlzIGlzIG15IGZpcnN0IHBvc3Q8L2FydGljbGU+XG5cbiAgPHA+R29vZGJ5ZSB3b3JsZDwvcD5cbiAgPHA+YnkgWWVodWRhIEthdHo8L3A+XG4gIDxhcnRpY2xlPlRoaXMgaXMgbXkgbGFzdCBwb3N0PC9hcnRpY2xlPlxuICBgYGBcblxuICBJbiBzaG9ydCwgYHlpZWxkSW5gIGNyZWF0ZXMgYSBuZXcgdG9wLWxldmVsIHNjb3BlIGZvciB0aGVcbiAgcHJvdmlkZWQgdGVtcGxhdGUgYW5kIHJlbmRlcnMgaXQsIG1ha2luZyB0aGUgb3JpZ2luYWwgYmxvY2tcbiAgYXZhaWxhYmxlIHRvIGB7e3lpZWxkfX1gIGluIHRoYXQgdGVtcGxhdGUuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRTaGFkb3dTY29wZShlbnYgLyosIHBhcmVudFNjb3BlLCBzaGFkb3dTY29wZSAqLykge1xuICByZXR1cm4gZW52Lmhvb2tzLmNyZWF0ZUZyZXNoU2NvcGUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNoaWxkU2NvcGUocGFyZW50KSB7XG4gIHZhciBzY29wZSA9IE9iamVjdC5jcmVhdGUocGFyZW50KTtcbiAgc2NvcGUubG9jYWxzID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQubG9jYWxzKTtcbiAgc2NvcGUubG9jYWxQcmVzZW50ID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQubG9jYWxQcmVzZW50KTtcbiAgc2NvcGUuYmxvY2tzID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQuYmxvY2tzKTtcbiAgcmV0dXJuIHNjb3BlO1xufVxuXG4vKipcbiAgSG9zdCBIb29rOiBiaW5kU2VsZlxuXG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7YW55fSBzZWxmXG5cbiAgQ29ycmVzcG9uZHMgdG8gZW50ZXJpbmcgYSB0ZW1wbGF0ZS5cblxuICBUaGlzIGhvb2sgaXMgaW52b2tlZCB3aGVuIHRoZSBgc2VsZmAgdmFsdWUgZm9yIGEgc2NvcGUgaXMgcmVhZHkgdG8gYmUgYm91bmQuXG5cbiAgVGhlIGhvc3QgbXVzdCBlbnN1cmUgdGhhdCBjaGlsZCBzY29wZXMgcmVmbGVjdCB0aGUgY2hhbmdlIHRvIHRoZSBgc2VsZmAgaW5cbiAgZnV0dXJlIGNhbGxzIHRvIHRoZSBgZ2V0YCBob29rLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kU2VsZihlbnYsIHNjb3BlLCBzZWxmKSB7XG4gIHNjb3BlLnNlbGYgPSBzZWxmO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU2VsZihlbnYsIHNjb3BlLCBzZWxmKSB7XG4gIGVudi5ob29rcy5iaW5kU2VsZihlbnYsIHNjb3BlLCBzZWxmKTtcbn1cblxuLyoqXG4gIEhvc3QgSG9vazogYmluZExvY2FsXG5cbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gIEBwYXJhbSB7YW55fSB2YWx1ZVxuXG4gIENvcnJlc3BvbmRzIHRvIGVudGVyaW5nIGEgdGVtcGxhdGUgd2l0aCBibG9jayBhcmd1bWVudHMuXG5cbiAgVGhpcyBob29rIGlzIGludm9rZWQgd2hlbiBhIGxvY2FsIHZhcmlhYmxlIGZvciBhIHNjb3BlIGhhcyBiZWVuIHByb3ZpZGVkLlxuXG4gIFRoZSBob3N0IG11c3QgZW5zdXJlIHRoYXQgY2hpbGQgc2NvcGVzIHJlZmxlY3QgdGhlIGNoYW5nZSBpbiBmdXR1cmUgY2FsbHNcbiAgdG8gdGhlIGBnZXRgIGhvb2suXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRMb2NhbChlbnYsIHNjb3BlLCBuYW1lLCB2YWx1ZSkge1xuICBzY29wZS5sb2NhbFByZXNlbnRbbmFtZV0gPSB0cnVlO1xuICBzY29wZS5sb2NhbHNbbmFtZV0gPSB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUxvY2FsKGVudiwgc2NvcGUsIG5hbWUsIHZhbHVlKSB7XG4gIGVudi5ob29rcy5iaW5kTG9jYWwoZW52LCBzY29wZSwgbmFtZSwgdmFsdWUpO1xufVxuXG4vKipcbiAgSG9zdCBIb29rOiBiaW5kQmxvY2tcblxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHtGdW5jdGlvbn0gYmxvY2tcblxuICBDb3JyZXNwb25kcyB0byBlbnRlcmluZyBhIHNoYWRvdyB0ZW1wbGF0ZSB0aGF0IHdhcyBpbnZva2VkIGJ5IGEgYmxvY2sgaGVscGVyIHdpdGhcbiAgYHlpZWxkSW5gLlxuXG4gIFRoaXMgaG9vayBpcyBpbnZva2VkIHdpdGggYW4gb3BhcXVlIGJsb2NrIHRoYXQgd2lsbCBiZSBwYXNzZWQgYWxvbmdcbiAgdG8gdGhlIHNoYWRvdyB0ZW1wbGF0ZSwgYW5kIGluc2VydGVkIGludG8gdGhlIHNoYWRvdyB0ZW1wbGF0ZSB3aGVuXG4gIGB7e3lpZWxkfX1gIGlzIHVzZWQuIE9wdGlvbmFsbHkgcHJvdmlkZSBhIG5vbi1kZWZhdWx0IGJsb2NrIG5hbWVcbiAgdGhhdCBjYW4gYmUgdGFyZ2V0ZWQgYnkgYHt7eWllbGQgdG89YmxvY2tOYW1lfX1gLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kQmxvY2soZW52LCBzY29wZSwgYmxvY2ssIG5hbWU9J2RlZmF1bHQnKSB7XG4gIHNjb3BlLmJsb2Nrc1tuYW1lXSA9IGJsb2NrO1xufVxuXG4vKipcbiAgSG9zdCBIb29rOiBibG9ja1xuXG4gIEBwYXJhbSB7UmVuZGVyTm9kZX0gcmVuZGVyTm9kZVxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgQHBhcmFtIHtBcnJheX0gcGFyYW1zXG4gIEBwYXJhbSB7T2JqZWN0fSBoYXNoXG4gIEBwYXJhbSB7QmxvY2t9IGJsb2NrXG4gIEBwYXJhbSB7QmxvY2t9IGVsc2VCbG9ja1xuXG4gIENvcnJlc3BvbmRzIHRvOlxuXG4gIGBgYGhic1xuICB7eyNoZWxwZXIgcGFyYW0xIHBhcmFtMiBrZXkxPXZhbDEga2V5Mj12YWwyfX1cbiAgICB7eyEtLSBjaGlsZCB0ZW1wbGF0ZSAtLX19XG4gIHt7L2hlbHBlcn19XG4gIGBgYFxuXG4gIFRoaXMgaG9zdCBob29rIGlzIGEgd29ya2hvcnNlIG9mIHRoZSBzeXN0ZW0uIEl0IGlzIGludm9rZWRcbiAgd2hlbmV2ZXIgYSBibG9jayBpcyBlbmNvdW50ZXJlZCwgYW5kIGlzIHJlc3BvbnNpYmxlIGZvclxuICByZXNvbHZpbmcgdGhlIGhlbHBlciB0byBjYWxsLCBhbmQgdGhlbiBpbnZva2UgaXQuXG5cbiAgVGhlIGhlbHBlciBzaG91bGQgYmUgaW52b2tlZCB3aXRoOlxuXG4gIC0gYHtBcnJheX0gcGFyYW1zYDogdGhlIHBhcmFtZXRlcnMgcGFzc2VkIHRvIHRoZSBoZWxwZXJcbiAgICBpbiB0aGUgdGVtcGxhdGUuXG4gIC0gYHtPYmplY3R9IGhhc2hgOiBhbiBvYmplY3QgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIHBhc3NlZFxuICAgIGluIHRoZSBoYXNoIHBvc2l0aW9uIGluIHRoZSB0ZW1wbGF0ZS5cblxuICBUaGUgdmFsdWVzIGluIGBwYXJhbXNgIGFuZCBgaGFzaGAgd2lsbCBhbHJlYWR5IGJlIHJlc29sdmVkXG4gIHRocm91Z2ggYSBwcmV2aW91cyBjYWxsIHRvIHRoZSBgZ2V0YCBob3N0IGhvb2suXG5cbiAgVGhlIGhlbHBlciBzaG91bGQgYmUgaW52b2tlZCB3aXRoIGEgYHRoaXNgIHZhbHVlIHRoYXQgaXNcbiAgYW4gb2JqZWN0IHdpdGggb25lIGZpZWxkOlxuXG4gIGB7RnVuY3Rpb259IHlpZWxkYDogd2hlbiBpbnZva2VkLCB0aGlzIGZ1bmN0aW9uIGV4ZWN1dGVzIHRoZVxuICBibG9jayB3aXRoIHRoZSBjdXJyZW50IHNjb3BlLiBJdCB0YWtlcyBhbiBvcHRpb25hbCBhcnJheSBvZlxuICBibG9jayBwYXJhbWV0ZXJzLiBJZiBibG9jayBwYXJhbWV0ZXJzIGFyZSBzdXBwbGllZCwgSFRNTEJhcnNcbiAgd2lsbCBpbnZva2UgdGhlIGBiaW5kTG9jYWxgIGhvc3QgaG9vayB0byBiaW5kIHRoZSBzdXBwbGllZFxuICB2YWx1ZXMgdG8gdGhlIGJsb2NrIGFyZ3VtZW50cyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuXG5cbiAgSW4gZ2VuZXJhbCwgdGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgYGJsb2NrYCBzaG91bGQgd29ya1xuICBmb3IgbW9zdCBob3N0IGVudmlyb25tZW50cy4gSXQgZGVsZWdhdGVzIHRvIG90aGVyIGhvc3QgaG9va3NcbiAgd2hlcmUgYXBwcm9wcmlhdGUsIGFuZCBwcm9wZXJseSBpbnZva2VzIHRoZSBoZWxwZXIgd2l0aCB0aGVcbiAgYXBwcm9wcmlhdGUgYXJndW1lbnRzLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcikge1xuICBpZiAoaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29udGludWVCbG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250aW51ZUJsb2NrKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKSB7XG4gIGhvc3RCbG9jayhtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIGludmVyc2UsIG51bGwsIHZpc2l0b3IsIGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgaGVscGVyID0gZW52Lmhvb2tzLmxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBwYXRoKTtcbiAgICByZXR1cm4gZW52Lmhvb2tzLmludm9rZUhlbHBlcihtb3JwaCwgZW52LCBzY29wZSwgdmlzaXRvciwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIG9wdGlvbnMudGVtcGxhdGVzLCB0aGlzRm9yKG9wdGlvbnMudGVtcGxhdGVzKSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaG9zdEJsb2NrKG1vcnBoLCBlbnYsIHNjb3BlLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgc2hhZG93T3B0aW9ucywgdmlzaXRvciwgY2FsbGJhY2spIHtcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zRm9yKHRlbXBsYXRlLCBpbnZlcnNlLCBlbnYsIHNjb3BlLCBtb3JwaCwgdmlzaXRvcik7XG4gIHJlbmRlckFuZENsZWFudXAobW9ycGgsIGVudiwgb3B0aW9ucywgc2hhZG93T3B0aW9ucywgY2FsbGJhY2spO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpIHtcbiAgaWYgKCFwYXRoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdmFyIHJlZGlyZWN0ID0gZW52Lmhvb2tzLmNsYXNzaWZ5KGVudiwgc2NvcGUsIHBhdGgpO1xuICBpZiAocmVkaXJlY3QpIHtcbiAgICBzd2l0Y2gocmVkaXJlY3QpIHtcbiAgICAgIGNhc2UgJ2NvbXBvbmVudCc6IGVudi5ob29rcy5jb21wb25lbnQobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwge2RlZmF1bHQ6IHRlbXBsYXRlLCBpbnZlcnNlfSwgdmlzaXRvcik7IGJyZWFrO1xuICAgICAgY2FzZSAnaW5saW5lJzogZW52Lmhvb2tzLmlubGluZShtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgICBjYXNlICdibG9jayc6IGVudi5ob29rcy5ibG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcik7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKFwiSW50ZXJuYWwgSFRNTEJhcnMgcmVkaXJlY3Rpb24gdG8gXCIgKyByZWRpcmVjdCArIFwiIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKGhhbmRsZUtleXdvcmQocGF0aCwgbW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYW5kbGVLZXl3b3JkKHBhdGgsIG1vcnBoLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKSB7XG4gIHZhciBrZXl3b3JkID0gZW52Lmhvb2tzLmtleXdvcmRzW3BhdGhdO1xuICBpZiAoIWtleXdvcmQpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgaWYgKHR5cGVvZiBrZXl3b3JkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGtleXdvcmQobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpO1xuICB9XG5cbiAgaWYgKGtleXdvcmQud2lsbFJlbmRlcikge1xuICAgIGtleXdvcmQud2lsbFJlbmRlcihtb3JwaCwgZW52KTtcbiAgfVxuXG4gIHZhciBsYXN0U3RhdGUsIG5ld1N0YXRlO1xuICBpZiAoa2V5d29yZC5zZXR1cFN0YXRlKSB7XG4gICAgbGFzdFN0YXRlID0gc2hhbGxvd0NvcHkobW9ycGguc3RhdGUpO1xuICAgIG5ld1N0YXRlID0gbW9ycGguc3RhdGUgPSBrZXl3b3JkLnNldHVwU3RhdGUobGFzdFN0YXRlLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gpO1xuICB9XG5cbiAgaWYgKGtleXdvcmQuY2hpbGRFbnYpIHtcbiAgICAvLyBCdWlsZCB0aGUgY2hpbGQgZW52aXJvbm1lbnQuLi5cbiAgICBlbnYgPSBrZXl3b3JkLmNoaWxkRW52KG1vcnBoLnN0YXRlLCBlbnYpO1xuXG4gICAgLy8gLi50aGVuIHNhdmUgb2ZmIHRoZSBjaGlsZCBlbnYgYnVpbGRlciBvbiB0aGUgcmVuZGVyIG5vZGUuIElmIHRoZSByZW5kZXJcbiAgICAvLyBub2RlIHRyZWUgaXMgcmUtcmVuZGVyZWQgYW5kIHRoaXMgbm9kZSBpcyBub3QgZGlydHksIHRoZSBjaGlsZCBlbnZcbiAgICAvLyBidWlsZGVyIHdpbGwgc3RpbGwgYmUgaW52b2tlZCBzbyB0aGF0IGNoaWxkIGRpcnR5IHJlbmRlciBub2RlcyBzdGlsbCBnZXRcbiAgICAvLyB0aGUgY29ycmVjdCBjaGlsZCBlbnYuXG4gICAgbW9ycGguYnVpbGRDaGlsZEVudiA9IGtleXdvcmQuY2hpbGRFbnY7XG4gIH1cblxuICB2YXIgZmlyc3RUaW1lID0gIW1vcnBoLnJlbmRlcmVkO1xuXG4gIGlmIChrZXl3b3JkLmlzRW1wdHkpIHtcbiAgICB2YXIgaXNFbXB0eSA9IGtleXdvcmQuaXNFbXB0eShtb3JwaC5zdGF0ZSwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoKTtcblxuICAgIGlmIChpc0VtcHR5KSB7XG4gICAgICBpZiAoIWZpcnN0VGltZSkgeyBjbGVhck1vcnBoKG1vcnBoLCBlbnYsIGZhbHNlKTsgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKGZpcnN0VGltZSkge1xuICAgIGlmIChrZXl3b3JkLnJlbmRlcikge1xuICAgICAga2V5d29yZC5yZW5kZXIobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpO1xuICAgIH1cbiAgICBtb3JwaC5yZW5kZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB2YXIgaXNTdGFibGU7XG4gIGlmIChrZXl3b3JkLmlzU3RhYmxlKSB7XG4gICAgaXNTdGFibGUgPSBrZXl3b3JkLmlzU3RhYmxlKGxhc3RTdGF0ZSwgbmV3U3RhdGUpO1xuICB9IGVsc2Uge1xuICAgIGlzU3RhYmxlID0gc3RhYmxlU3RhdGUobGFzdFN0YXRlLCBuZXdTdGF0ZSk7XG4gIH1cblxuICBpZiAoaXNTdGFibGUpIHtcbiAgICBpZiAoa2V5d29yZC5yZXJlbmRlcikge1xuICAgICAgdmFyIG5ld0VudiA9IGtleXdvcmQucmVyZW5kZXIobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpO1xuICAgICAgZW52ID0gbmV3RW52IHx8IGVudjtcbiAgICB9XG4gICAgdmFsaWRhdGVDaGlsZE1vcnBocyhlbnYsIG1vcnBoLCB2aXNpdG9yKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBjbGVhck1vcnBoKG1vcnBoLCBlbnYsIGZhbHNlKTtcbiAgfVxuXG4gIC8vIElmIHRoZSBub2RlIGlzIHVuc3RhYmxlLCByZS1yZW5kZXIgZnJvbSBzY3JhdGNoXG4gIGlmIChrZXl3b3JkLnJlbmRlcikge1xuICAgIGtleXdvcmQucmVuZGVyKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKTtcbiAgICBtb3JwaC5yZW5kZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhYmxlU3RhdGUob2xkU3RhdGUsIG5ld1N0YXRlKSB7XG4gIGlmIChrZXlMZW5ndGgob2xkU3RhdGUpICE9PSBrZXlMZW5ndGgobmV3U3RhdGUpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIGZvciAodmFyIHByb3AgaW4gb2xkU3RhdGUpIHtcbiAgICBpZiAob2xkU3RhdGVbcHJvcF0gIT09IG5ld1N0YXRlW3Byb3BdKSB7IHJldHVybiBmYWxzZTsgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5rUmVuZGVyTm9kZSgvKiBtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoICovKSB7XG4gIHJldHVybjtcbn1cblxuLyoqXG4gIEhvc3QgSG9vazogaW5saW5lXG5cbiAgQHBhcmFtIHtSZW5kZXJOb2RlfSByZW5kZXJOb2RlXG4gIEBwYXJhbSB7RW52aXJvbm1lbnR9IGVudlxuICBAcGFyYW0ge1Njb3BlfSBzY29wZVxuICBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICBAcGFyYW0ge0FycmF5fSBwYXJhbXNcbiAgQHBhcmFtIHtIYXNofSBoYXNoXG5cbiAgQ29ycmVzcG9uZHMgdG86XG5cbiAgYGBgaGJzXG4gIHt7aGVscGVyIHBhcmFtMSBwYXJhbTIga2V5MT12YWwxIGtleTI9dmFsMn19XG4gIGBgYFxuXG4gIFRoaXMgaG9zdCBob29rIGlzIHNpbWlsYXIgdG8gdGhlIGBibG9ja2AgaG9zdCBob29rLCBidXQgaXRcbiAgaW52b2tlcyBoZWxwZXJzIHRoYXQgZG8gbm90IHN1cHBseSBhbiBhdHRhY2hlZCBibG9jay5cblxuICBMaWtlIHRoZSBgYmxvY2tgIGhvb2ssIHRoZSBoZWxwZXIgc2hvdWxkIGJlIGludm9rZWQgd2l0aDpcblxuICAtIGB7QXJyYXl9IHBhcmFtc2A6IHRoZSBwYXJhbWV0ZXJzIHBhc3NlZCB0byB0aGUgaGVscGVyXG4gICAgaW4gdGhlIHRlbXBsYXRlLlxuICAtIGB7T2JqZWN0fSBoYXNoYDogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBwYXNzZWRcbiAgICBpbiB0aGUgaGFzaCBwb3NpdGlvbiBpbiB0aGUgdGVtcGxhdGUuXG5cbiAgVGhlIHZhbHVlcyBpbiBgcGFyYW1zYCBhbmQgYGhhc2hgIHdpbGwgYWxyZWFkeSBiZSByZXNvbHZlZFxuICB0aHJvdWdoIGEgcHJldmlvdXMgY2FsbCB0byB0aGUgYGdldGAgaG9zdCBob29rLlxuXG4gIEluIGdlbmVyYWwsIHRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mIGBpbmxpbmVgIHNob3VsZCB3b3JrXG4gIGZvciBtb3N0IGhvc3QgZW52aXJvbm1lbnRzLiBJdCBkZWxlZ2F0ZXMgdG8gb3RoZXIgaG9zdCBob29rc1xuICB3aGVyZSBhcHByb3ByaWF0ZSwgYW5kIHByb3Blcmx5IGludm9rZXMgdGhlIGhlbHBlciB3aXRoIHRoZVxuICBhcHByb3ByaWF0ZSBhcmd1bWVudHMuXG5cbiAgVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgYGlubGluZWAgYWxzbyBtYWtlcyBgcGFydGlhbGBcbiAgYSBrZXl3b3JkLiBJbnN0ZWFkIG9mIGludm9raW5nIGEgaGVscGVyIG5hbWVkIGBwYXJ0aWFsYCxcbiAgaXQgaW52b2tlcyB0aGUgYHBhcnRpYWxgIGhvc3QgaG9vay5cbiovXG5leHBvcnQgZnVuY3Rpb24gaW5saW5lKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXMsIGhhc2gsIHZpc2l0b3IpIHtcbiAgaWYgKGhhbmRsZVJlZGlyZWN0KG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXMsIGhhc2gsIG51bGwsIG51bGwsIHZpc2l0b3IpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHZhbHVlLCBoYXNWYWx1ZTtcbiAgaWYgKG1vcnBoLmxpbmtlZFJlc3VsdCkge1xuICAgIHZhbHVlID0gZW52Lmhvb2tzLmdldFZhbHVlKG1vcnBoLmxpbmtlZFJlc3VsdCk7XG4gICAgaGFzVmFsdWUgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHZhciBvcHRpb25zID0gb3B0aW9uc0ZvcihudWxsLCBudWxsLCBlbnYsIHNjb3BlLCBtb3JwaCk7XG5cbiAgICB2YXIgaGVscGVyID0gZW52Lmhvb2tzLmxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBwYXRoKTtcbiAgICB2YXIgcmVzdWx0ID0gZW52Lmhvb2tzLmludm9rZUhlbHBlcihtb3JwaCwgZW52LCBzY29wZSwgdmlzaXRvciwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIG9wdGlvbnMudGVtcGxhdGVzLCB0aGlzRm9yKG9wdGlvbnMudGVtcGxhdGVzKSk7XG5cbiAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5saW5rKSB7XG4gICAgICBtb3JwaC5saW5rZWRSZXN1bHQgPSByZXN1bHQudmFsdWU7XG4gICAgICBsaW5rUGFyYW1zKGVudiwgc2NvcGUsIG1vcnBoLCAnQGNvbnRlbnQtaGVscGVyJywgW21vcnBoLmxpbmtlZFJlc3VsdF0sIG51bGwpO1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQgJiYgJ3ZhbHVlJyBpbiByZXN1bHQpIHtcbiAgICAgIHZhbHVlID0gZW52Lmhvb2tzLmdldFZhbHVlKHJlc3VsdC52YWx1ZSk7XG4gICAgICBoYXNWYWx1ZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKGhhc1ZhbHVlKSB7XG4gICAgaWYgKG1vcnBoLmxhc3RWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgIG1vcnBoLnNldENvbnRlbnQodmFsdWUpO1xuICAgIH1cbiAgICBtb3JwaC5sYXN0VmFsdWUgPSB2YWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5d29yZChwYXRoLCBtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcikgIHtcbiAgaGFuZGxlS2V5d29yZChwYXRoLCBtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnZva2VIZWxwZXIobW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IsIF9wYXJhbXMsIF9oYXNoLCBoZWxwZXIsIHRlbXBsYXRlcywgY29udGV4dCkge1xuICB2YXIgcGFyYW1zID0gbm9ybWFsaXplQXJyYXkoZW52LCBfcGFyYW1zKTtcbiAgdmFyIGhhc2ggPSBub3JtYWxpemVPYmplY3QoZW52LCBfaGFzaCk7XG4gIHJldHVybiB7IHZhbHVlOiBoZWxwZXIuY2FsbChjb250ZXh0LCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlcykgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkoZW52LCBhcnJheSkge1xuICB2YXIgb3V0ID0gbmV3IEFycmF5KGFycmF5Lmxlbmd0aCk7XG5cbiAgZm9yICh2YXIgaT0wLCBsPWFycmF5Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICBvdXRbaV0gPSBlbnYuaG9va3MuZ2V0Q2VsbE9yVmFsdWUoYXJyYXlbaV0pO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplT2JqZWN0KGVudiwgb2JqZWN0KSB7XG4gIHZhciBvdXQgPSB7fTtcblxuICBmb3IgKHZhciBwcm9wIGluIG9iamVjdCkgIHtcbiAgICBvdXRbcHJvcF0gPSBlbnYuaG9va3MuZ2V0Q2VsbE9yVmFsdWUob2JqZWN0W3Byb3BdKTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeSgvKiBlbnYsIHNjb3BlLCBwYXRoICovKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgdmFyIGtleXdvcmRzID0ge1xuICBwYXJ0aWFsOiBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zKSB7XG4gICAgdmFyIHZhbHVlID0gZW52Lmhvb2tzLnBhcnRpYWwobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtc1swXSk7XG4gICAgbW9ycGguc2V0Q29udGVudCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgeWllbGQ6IGZ1bmN0aW9uKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKSB7XG4gICAgLy8gdGhlIGN1cnJlbnQgc2NvcGUgaXMgcHJvdmlkZWQgcHVyZWx5IGZvciB0aGUgY3JlYXRpb24gb2Ygc2hhZG93XG4gICAgLy8gc2NvcGVzOyBpdCBzaG91bGQgbm90IGJlIHByb3ZpZGVkIHRvIHVzZXIgY29kZS5cblxuICAgIHZhciB0byA9IGVudi5ob29rcy5nZXRWYWx1ZShoYXNoLnRvKSB8fCAnZGVmYXVsdCc7XG4gICAgaWYgKHNjb3BlLmJsb2Nrc1t0b10pIHtcbiAgICAgIHNjb3BlLmJsb2Nrc1t0b10uaW52b2tlKGVudiwgcGFyYW1zLCBoYXNoLnNlbGYsIG1vcnBoLCBzY29wZSwgdmlzaXRvcik7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGhhc0Jsb2NrOiBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zKSB7XG4gICAgdmFyIG5hbWUgPSBlbnYuaG9va3MuZ2V0VmFsdWUocGFyYW1zWzBdKSB8fCAnZGVmYXVsdCc7XG4gICAgcmV0dXJuICEhc2NvcGUuYmxvY2tzW25hbWVdO1xuICB9LFxuXG4gIGhhc0Jsb2NrUGFyYW1zOiBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zKSB7XG4gICAgdmFyIG5hbWUgPSBlbnYuaG9va3MuZ2V0VmFsdWUocGFyYW1zWzBdKSB8fCAnZGVmYXVsdCc7XG4gICAgcmV0dXJuICEhKHNjb3BlLmJsb2Nrc1tuYW1lXSAmJiBzY29wZS5ibG9ja3NbbmFtZV0uYXJpdHkpO1xuICB9XG5cbn07XG5cbi8qKlxuICBIb3N0IEhvb2s6IHBhcnRpYWxcblxuICBAcGFyYW0ge1JlbmRlck5vZGV9IHJlbmRlck5vZGVcbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG5cbiAgQ29ycmVzcG9uZHMgdG86XG5cbiAgYGBgaGJzXG4gIHt7cGFydGlhbCBcImxvY2F0aW9uXCJ9fVxuICBgYGBcblxuICBUaGlzIGhvc3QgaG9vayBpcyBpbnZva2VkIGJ5IHRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mXG4gIHRoZSBgaW5saW5lYCBob29rLiBUaGlzIG1ha2VzIGBwYXJ0aWFsYCBhIGtleXdvcmQgaW4gYW5cbiAgSFRNTEJhcnMgZW52aXJvbm1lbnQgdXNpbmcgdGhlIGRlZmF1bHQgYGlubGluZWAgaG9zdCBob29rLlxuXG4gIEl0IGlzIGltcGxlbWVudGVkIGFzIGEgaG9zdCBob29rIHNvIHRoYXQgaXQgY2FuIHJldHJpZXZlXG4gIHRoZSBuYW1lZCBwYXJ0aWFsIG91dCBvZiB0aGUgYEVudmlyb25tZW50YC4gSGVscGVycywgaW5cbiAgY29udHJhc3QsIG9ubHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIHZhbHVlcyBwYXNzZWQgaW4gdG8gdGhlbSxcbiAgYW5kIG5vdCB0byB0aGUgYW1iaWVudCBsZXhpY2FsIGVudmlyb25tZW50LlxuXG4gIFRoZSBob3N0IGhvb2sgc2hvdWxkIGludm9rZSB0aGUgcmVmZXJlbmNlZCBwYXJ0aWFsIHdpdGhcbiAgdGhlIGFtYmllbnQgYHNlbGZgLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJ0aWFsKHJlbmRlck5vZGUsIGVudiwgc2NvcGUsIHBhdGgpIHtcbiAgdmFyIHRlbXBsYXRlID0gZW52LnBhcnRpYWxzW3BhdGhdO1xuICByZXR1cm4gdGVtcGxhdGUucmVuZGVyKHNjb3BlLnNlbGYsIGVudiwge30pLmZyYWdtZW50O1xufVxuXG4vKipcbiAgSG9zdCBob29rOiByYW5nZVxuXG4gIEBwYXJhbSB7UmVuZGVyTm9kZX0gcmVuZGVyTm9kZVxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHthbnl9IHZhbHVlXG5cbiAgQ29ycmVzcG9uZHMgdG86XG5cbiAgYGBgaGJzXG4gIHt7Y29udGVudH19XG4gIHt7e3VuZXNjYXBlZH19fVxuICBgYGBcblxuICBUaGlzIGhvb2sgaXMgcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGEgcmVuZGVyIG5vZGVcbiAgdGhhdCByZXByZXNlbnRzIGEgcmFuZ2Ugb2YgY29udGVudCB3aXRoIGEgdmFsdWUuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCB2YWx1ZSwgdmlzaXRvcikge1xuICBpZiAoaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIFt2YWx1ZV0sIHt9LCBudWxsLCBudWxsLCB2aXNpdG9yKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhbHVlID0gZW52Lmhvb2tzLmdldFZhbHVlKHZhbHVlKTtcblxuICBpZiAobW9ycGgubGFzdFZhbHVlICE9PSB2YWx1ZSkge1xuICAgIG1vcnBoLnNldENvbnRlbnQodmFsdWUpO1xuICB9XG5cbiAgbW9ycGgubGFzdFZhbHVlID0gdmFsdWU7XG59XG5cbi8qKlxuICBIb3N0IGhvb2s6IGVsZW1lbnRcblxuICBAcGFyYW0ge1JlbmRlck5vZGV9IHJlbmRlck5vZGVcbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gIEBwYXJhbSB7QXJyYXl9IHBhcmFtc1xuICBAcGFyYW0ge0hhc2h9IGhhc2hcblxuICBDb3JyZXNwb25kcyB0bzpcblxuICBgYGBoYnNcbiAgPGRpdiB7e2JpbmQtYXR0ciBmb289YmFyfX0+PC9kaXY+XG4gIGBgYFxuXG4gIFRoaXMgaG9vayBpcyByZXNwb25zaWJsZSBmb3IgaW52b2tpbmcgYSBoZWxwZXIgdGhhdFxuICBtb2RpZmllcyBhbiBlbGVtZW50LlxuXG4gIEl0cyBwdXJwb3NlIGlzIGxhcmdlbHkgbGVnYWN5IHN1cHBvcnQgZm9yIGF3a3dhcmRcbiAgaWRpb21zIHRoYXQgYmVjYW1lIGNvbW1vbiB3aGVuIHVzaW5nIHRoZSBzdHJpbmctYmFzZWRcbiAgSGFuZGxlYmFycyBlbmdpbmUuXG5cbiAgTW9zdCBvZiB0aGUgdXNlcyBvZiB0aGUgYGVsZW1lbnRgIGhvb2sgYXJlIGV4cGVjdGVkXG4gIHRvIGJlIHN1cGVyc2VkZWQgYnkgY29tcG9uZW50IHN5bnRheCBhbmQgdGhlXG4gIGBhdHRyaWJ1dGVgIGhvb2suXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnQobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgdmlzaXRvcikge1xuICBpZiAoaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgbnVsbCwgbnVsbCwgdmlzaXRvcikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaGVscGVyID0gZW52Lmhvb2tzLmxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBwYXRoKTtcbiAgaWYgKGhlbHBlcikge1xuICAgIGVudi5ob29rcy5pbnZva2VIZWxwZXIobnVsbCwgZW52LCBzY29wZSwgbnVsbCwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIHsgZWxlbWVudDogbW9ycGguZWxlbWVudCB9KTtcbiAgfVxufVxuXG4vKipcbiAgSG9zdCBob29rOiBhdHRyaWJ1dGVcblxuICBAcGFyYW0ge1JlbmRlck5vZGV9IHJlbmRlck5vZGVcbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gIEBwYXJhbSB7YW55fSB2YWx1ZVxuXG4gIENvcnJlc3BvbmRzIHRvOlxuXG4gIGBgYGhic1xuICA8ZGl2IGZvbz17e2Jhcn19PjwvZGl2PlxuICBgYGBcblxuICBUaGlzIGhvb2sgaXMgcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGEgcmVuZGVyIG5vZGVcbiAgdGhhdCByZXByZXNlbnRzIGFuIGVsZW1lbnQncyBhdHRyaWJ1dGUgd2l0aCBhIHZhbHVlLlxuXG4gIEl0IHJlY2VpdmVzIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgYXMgd2VsbCBhcyBhblxuICBhbHJlYWR5LXJlc29sdmVkIHZhbHVlLCBhbmQgc2hvdWxkIHVwZGF0ZSB0aGUgcmVuZGVyXG4gIG5vZGUgd2l0aCB0aGUgdmFsdWUgaWYgYXBwcm9wcmlhdGUuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGF0dHJpYnV0ZShtb3JwaCwgZW52LCBzY29wZSwgbmFtZSwgdmFsdWUpIHtcbiAgdmFsdWUgPSBlbnYuaG9va3MuZ2V0VmFsdWUodmFsdWUpO1xuXG4gIGlmIChtb3JwaC5sYXN0VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgbW9ycGguc2V0Q29udGVudCh2YWx1ZSk7XG4gIH1cblxuICBtb3JwaC5sYXN0VmFsdWUgPSB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN1YmV4cHIoZW52LCBzY29wZSwgaGVscGVyTmFtZSwgcGFyYW1zLCBoYXNoKSB7XG4gIHZhciBoZWxwZXIgPSBlbnYuaG9va3MubG9va3VwSGVscGVyKGVudiwgc2NvcGUsIGhlbHBlck5hbWUpO1xuICB2YXIgcmVzdWx0ID0gZW52Lmhvb2tzLmludm9rZUhlbHBlcihudWxsLCBlbnYsIHNjb3BlLCBudWxsLCBwYXJhbXMsIGhhc2gsIGhlbHBlciwge30pO1xuICBpZiAocmVzdWx0ICYmICd2YWx1ZScgaW4gcmVzdWx0KSB7IHJldHVybiBlbnYuaG9va3MuZ2V0VmFsdWUocmVzdWx0LnZhbHVlKTsgfVxufVxuXG4vKipcbiAgSG9zdCBIb29rOiBnZXRcblxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHtTdHJpbmd9IHBhdGhcblxuICBDb3JyZXNwb25kcyB0bzpcblxuICBgYGBoYnNcbiAge3tmb28uYmFyfX1cbiAgICBeXG5cbiAge3toZWxwZXIgZm9vLmJhciBrZXk9dmFsdWV9fVxuICAgICAgICAgICBeICAgICAgICAgICBeXG4gIGBgYFxuXG4gIFRoaXMgaG9vayBpcyB0aGUgXCJsZWFmXCIgaG9vayBvZiB0aGUgc3lzdGVtLiBJdCBpcyB1c2VkIHRvXG4gIHJlc29sdmUgYSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHNjb3BlLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQoZW52LCBzY29wZSwgcGF0aCkge1xuICBpZiAocGF0aCA9PT0gJycpIHtcbiAgICByZXR1cm4gc2NvcGUuc2VsZjtcbiAgfVxuXG4gIHZhciBrZXlzID0gcGF0aC5zcGxpdCgnLicpO1xuICB2YXIgdmFsdWUgPSBlbnYuaG9va3MuZ2V0Um9vdChzY29wZSwga2V5c1swXSlbMF07XG5cbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IGVudi5ob29rcy5nZXRDaGlsZCh2YWx1ZSwga2V5c1tpXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJvb3Qoc2NvcGUsIGtleSkge1xuICBpZiAoc2NvcGUubG9jYWxQcmVzZW50W2tleV0pIHtcbiAgICByZXR1cm4gW3Njb3BlLmxvY2Fsc1trZXldXTtcbiAgfSBlbHNlIGlmIChzY29wZS5zZWxmKSB7XG4gICAgcmV0dXJuIFtzY29wZS5zZWxmW2tleV1dO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbdW5kZWZpbmVkXTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2hpbGQodmFsdWUsIGtleSkge1xuICByZXR1cm4gdmFsdWVba2V5XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFZhbHVlKHJlZmVyZW5jZSkge1xuICByZXR1cm4gcmVmZXJlbmNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2VsbE9yVmFsdWUocmVmZXJlbmNlKSB7XG4gIHJldHVybiByZWZlcmVuY2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wb25lbnQobW9ycGgsIGVudiwgc2NvcGUsIHRhZ05hbWUsIHBhcmFtcywgYXR0cnMsIHRlbXBsYXRlcywgdmlzaXRvcikge1xuICBpZiAoZW52Lmhvb2tzLmhhc0hlbHBlcihlbnYsIHNjb3BlLCB0YWdOYW1lKSkge1xuICAgIHJldHVybiBlbnYuaG9va3MuYmxvY2sobW9ycGgsIGVudiwgc2NvcGUsIHRhZ05hbWUsIHBhcmFtcywgYXR0cnMsIHRlbXBsYXRlcy5kZWZhdWx0LCB0ZW1wbGF0ZXMuaW52ZXJzZSwgdmlzaXRvcik7XG4gIH1cblxuICBjb21wb25lbnRGYWxsYmFjayhtb3JwaCwgZW52LCBzY29wZSwgdGFnTmFtZSwgYXR0cnMsIHRlbXBsYXRlcy5kZWZhdWx0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmNhdChlbnYsIHBhcmFtcykge1xuICB2YXIgdmFsdWUgPSBcIlwiO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcmFtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YWx1ZSArPSBlbnYuaG9va3MuZ2V0VmFsdWUocGFyYW1zW2ldKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBvbmVudEZhbGxiYWNrKG1vcnBoLCBlbnYsIHNjb3BlLCB0YWdOYW1lLCBhdHRycywgdGVtcGxhdGUpIHtcbiAgdmFyIGVsZW1lbnQgPSBlbnYuZG9tLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIGZvciAodmFyIG5hbWUgaW4gYXR0cnMpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCBlbnYuaG9va3MuZ2V0VmFsdWUoYXR0cnNbbmFtZV0pKTtcbiAgfVxuICB2YXIgZnJhZ21lbnQgPSByZW5kZXIodGVtcGxhdGUsIGVudiwgc2NvcGUsIHt9KS5mcmFnbWVudDtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gIG1vcnBoLnNldE5vZGUoZWxlbWVudCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNIZWxwZXIoZW52LCBzY29wZSwgaGVscGVyTmFtZSkge1xuICByZXR1cm4gZW52LmhlbHBlcnNbaGVscGVyTmFtZV0gIT09IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBoZWxwZXJOYW1lKSB7XG4gIHJldHVybiBlbnYuaGVscGVyc1toZWxwZXJOYW1lXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRTY29wZSgvKiBlbnYsIHNjb3BlICovKSB7XG4gIC8vIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBoYW5kbGUgaG9zdC1zcGVjaWZpZWQgZXh0ZW5zaW9ucyB0byBzY29wZVxuICAvLyBvdGhlciB0aGFuIGBzZWxmYCwgYGxvY2Fsc2AgYW5kIGBibG9ja2AuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVTY29wZShlbnYsIHNjb3BlKSB7XG4gIGVudi5ob29rcy5iaW5kU2NvcGUoZW52LCBzY29wZSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgLy8gZnVuZGFtZW50YWwgaG9va3MgdGhhdCB5b3Ugd2lsbCBsaWtlbHkgd2FudCB0byBvdmVycmlkZVxuICBiaW5kTG9jYWw6IGJpbmRMb2NhbCxcbiAgYmluZFNlbGY6IGJpbmRTZWxmLFxuICBiaW5kU2NvcGU6IGJpbmRTY29wZSxcbiAgY2xhc3NpZnk6IGNsYXNzaWZ5LFxuICBjb21wb25lbnQ6IGNvbXBvbmVudCxcbiAgY29uY2F0OiBjb25jYXQsXG4gIGNyZWF0ZUZyZXNoU2NvcGU6IGNyZWF0ZUZyZXNoU2NvcGUsXG4gIGdldENoaWxkOiBnZXRDaGlsZCxcbiAgZ2V0Um9vdDogZ2V0Um9vdCxcbiAgZ2V0VmFsdWU6IGdldFZhbHVlLFxuICBnZXRDZWxsT3JWYWx1ZTogZ2V0Q2VsbE9yVmFsdWUsXG4gIGtleXdvcmRzOiBrZXl3b3JkcyxcbiAgbGlua1JlbmRlck5vZGU6IGxpbmtSZW5kZXJOb2RlLFxuICBwYXJ0aWFsOiBwYXJ0aWFsLFxuICBzdWJleHByOiBzdWJleHByLFxuXG4gIC8vIGZ1bmRhbWVudGFsIGhvb2tzIHdpdGggZ29vZCBkZWZhdWx0IGJlaGF2aW9yXG4gIGJpbmRCbG9jazogYmluZEJsb2NrLFxuICBiaW5kU2hhZG93U2NvcGU6IGJpbmRTaGFkb3dTY29wZSxcbiAgdXBkYXRlTG9jYWw6IHVwZGF0ZUxvY2FsLFxuICB1cGRhdGVTZWxmOiB1cGRhdGVTZWxmLFxuICB1cGRhdGVTY29wZTogdXBkYXRlU2NvcGUsXG4gIGNyZWF0ZUNoaWxkU2NvcGU6IGNyZWF0ZUNoaWxkU2NvcGUsXG4gIGhhc0hlbHBlcjogaGFzSGVscGVyLFxuICBsb29rdXBIZWxwZXI6IGxvb2t1cEhlbHBlcixcbiAgaW52b2tlSGVscGVyOiBpbnZva2VIZWxwZXIsXG4gIGNsZWFudXBSZW5kZXJOb2RlOiBudWxsLFxuICBkZXN0cm95UmVuZGVyTm9kZTogbnVsbCxcbiAgd2lsbENsZWFudXBUcmVlOiBudWxsLFxuICBkaWRDbGVhbnVwVHJlZTogbnVsbCxcbiAgd2lsbFJlbmRlck5vZGU6IG51bGwsXG4gIGRpZFJlbmRlck5vZGU6IG51bGwsXG5cbiAgLy8gZGVyaXZlZCBob29rc1xuICBhdHRyaWJ1dGU6IGF0dHJpYnV0ZSxcbiAgYmxvY2s6IGJsb2NrLFxuICBjcmVhdGVTY29wZTogY3JlYXRlU2NvcGUsXG4gIGVsZW1lbnQ6IGVsZW1lbnQsXG4gIGdldDogZ2V0LFxuICBpbmxpbmU6IGlubGluZSxcbiAgcmFuZ2U6IHJhbmdlLFxuICBrZXl3b3JkOiBrZXl3b3JkXG59O1xuIl19