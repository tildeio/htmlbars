import { DOMHelper } from "morph";
import { compile } from "htmlbars-compiler/compiler";
import { hydrationHooks } from "htmlbars-unbound/hooks";
import { withHelper } from "htmlbars-unbound/helpers";

function compilesTo(html, context, env, expected) {
  var template = compile(html);
  var fragment = template(context, env);
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));
  equal(div.innerHTML, expected);
}

var source, context, env;

module('htmlbars-unbound/helpers/with', {
  setup: function() {
    env = {
      dom: new DOMHelper(null, document),
      hooks: hydrationHooks(),
      helpers: { 'with': withHelper }
    };
  },

  teardown: function() {
    source = null;
    context = null;
    env = null;
  }
});

test('with', function () {
  source = "{{#with person}}{{first}} {{last}}{{/with}}";
  context = { person: { first: "Alan", last: "Johnson" } };
  compilesTo(source, context, env, "Alan Johnson");
});

test('with function argument', function () {
  source = "{{#with person}}{{first}} {{last}}{{/with}}";
  context = { person: function() { return { first: "Alan", last: "Johnson" }; } };
  compilesTo(source, context, env, "Alan Johnson");
});
