import { TemplateCompiler } from "htmlbars-compiler/compiler/template";
import { preprocess } from "htmlbars-compiler/parser";
import { equalHTML } from "test/support/assertions";
import { DOMHelper } from "htmlbars-runtime/dom-helper";

module("TemplateCompiler");

var dom = new DOMHelper(document);

var hooks = {
  content: function(morph, helperName, context, params, options, helpers) {
    if (helperName === 'if') {
      if (context[params[0]]) {
        options.hooks = this;
        morph.update(options.render(context, options));
      }
      return;
    }
    morph.update(context[helperName]);
  }
};

test("it works", function testFunction() {
  /* jshint evil: true */
  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>');
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var template = new Function("dom", "return " + program)(dom);
  var frag = template(
    { working: true, firstName: 'Kris', lastName: 'Selden' },
    { hooks: hooks }
  );
  equalHTML(frag, '<div>Hello Kris Selden!</div>');
});

