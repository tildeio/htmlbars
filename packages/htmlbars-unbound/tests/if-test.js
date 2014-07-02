import { DOMHelper } from "morph";
import { compile } from "htmlbars-compiler/compiler";
import { hydrationHooks } from "htmlbars-unbound/hooks";
import { ifHelper } from "htmlbars-unbound/helpers";

function compilesTo(html, context, env, expected) {
  var template = compile(html);
  var fragment = template(context, env);
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));
  equal(div.innerHTML, expected);
}

var source, context, env;

module('htmlbars-unbound/helpers/if', {
  setup: function() {
    env = {
      dom: new DOMHelper(null, document),
      hooks: hydrationHooks(),
      helpers: { 'if': ifHelper }
    };
  },

  teardown: function() {
    source = null;
    context = null;
    env = null;
  }
});

test('boolean argument shows the contents when true', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: true, world: "world" };
  compilesTo(source, context, env, "GOODBYE cruel world!");
});

test('string argument shows the contents', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: "dummy", world: "world" };
  compilesTo(source, context, env, "GOODBYE cruel world!");
});

test('boolean argument does not show the contents when false', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: false, world: "world" };
  compilesTo(source, context, env, "cruel world!");
});

test('undefined does not show the contents', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { world: "world" };
  compilesTo(source, context, env, "cruel world!" );
});

test('non-empty array shows the contents', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: ['foo'], world: "world" };
  compilesTo(source, context, env, "GOODBYE cruel world!");
});

test('empty array does not show the contents', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: [], world: "world" };
  compilesTo(source, context, env, "cruel world!");
});

test('zero does not show the contents', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: 0, world: "world" };
  compilesTo(source, context, env, "cruel world!");
});

test('zero does not show the contents', function () {
  source = "{{#if goodbye includeZero=true}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: 0, world: "world" };
  compilesTo(source, context, env, "GOODBYE cruel world!");
});

test('with a function shows the contents when it returns true', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: function() { return true; }, world: "world" };
  compilesTo(source, context, env, "GOODBYE cruel world!");
});

test('with a function shows the contents when it returns a string', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: function() { return this.world; }, world: "world" };
  compilesTo(source, context, env, "GOODBYE cruel world!");
});

test('with a function does not show the contents when it returns false', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: function() { return false; }, world: "world" };
  compilesTo(source, context, env, "cruel world!");
});

test('with a function does not show the contents when it returns undefined', function () {
  source = "{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!";
  context = { goodbye: function() { return this.foo; }, world: "world" };
  compilesTo(source, context, env, "cruel world!");
});
