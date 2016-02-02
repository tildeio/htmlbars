import { hooks as defaultHooks } from "../htmlbars-runtime";
import { merge } from "../htmlbars-util/object-utils";
// import { manualElement } from "../htmlbars-runtime/render";
import { compile } from "../htmlbars-compiler/compiler";
// import { hostBlock } from "../htmlbars-runtime/hooks";
import { equalTokens } from "../htmlbars-test-helpers";
import DOMHelper from "../dom-helper";

var hooks, helpers, partials, env;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function commonSetup() {
  hooks = merge({}, defaultHooks);
  hooks.keywords = merge({}, defaultHooks.keywords);
  helpers = {};
  partials = {};

  env = {
    dom: new DOMHelper(),
    hooks: hooks,
    helpers: helpers,
    partials: partials,
    useFragmentCache: true
  };
}

QUnit.module("htmlbars-runtime: hooks", {
  beforeEach: commonSetup
});

test("inline hook correctly handles false-like values", function() {

  registerHelper('get', function(params) {
    return params[0];
  });

  var object = { val: 'hello' };
  var template = compile('<div>{{get val}}</div>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<div>hello</div>');

  object.val = '';

  result.rerender();

  equalTokens(result.fragment, '<div></div>');

});

test("subexr hook correctly handles false-like values", function() {
  registerHelper('if', function(params) {
    return params[0] ? params[1] : params[2];
  });

  var object = { val: true};
  var template = compile('<div data-foo={{if val "stuff" ""}}></div>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<div data-foo="stuff"></div>');

  object.val = false;

  result.rerender();

  equalTokens(result.fragment, '<div data-foo=""></div>');

});


test('parameter less helpers are handled correctly', function() {
  registerHelper('app-url', function() {
    return 'https://samplewebsite.com';
  });

  var object = { val: true};
  var template = compile('<a href="{{app-url}}"></a>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<a href="https://samplewebsite.com"></a>');

  object.val = false;

  result.rerender();

  equalTokens(result.fragment, '<a href="https://samplewebsite.com"></a>');
});
