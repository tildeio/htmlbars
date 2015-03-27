import { compile } from "../htmlbars-compiler/compiler";
import defaultHooks from "../htmlbars-runtime/hooks";
import defaultHelpers from "../htmlbars-runtime/helpers";
import { merge } from "../htmlbars-util/object-utils";
import DOMHelper from "../dom-helper";

var hooks, helpers, partials, env;

QUnit.module('select-default-selection', {
  beforeEach: function() {
    hooks = merge({}, defaultHooks);
    helpers = merge({}, defaultHelpers);
    partials = {};

    env = {
      dom: new DOMHelper(),
      hooks: hooks,
      helpers: helpers,
      partials: partials,
      useFragmentCache: true
    };
  }
});

test('does stuff', function() {
  var template = compile("<select><option>Foo</option><option>Bar</option></select>");
  var fragment = template.render({}, env);

  equal(fragment.firstChild.value, 'Foo');
});
