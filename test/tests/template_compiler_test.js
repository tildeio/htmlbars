import { TemplateCompiler } from "htmlbars/compiler/template";
import { Placeholder } from "htmlbars/runtime/placeholder";
import { preprocess } from "htmlbars/parser";
import { testDom, equalDomHTML } from "test_helpers";

module("TemplateCompiler");

var helpers = {
  CONTENT: function(placeholder, helperName, context, params, options, helpers) {
    if (helperName === 'if') {
      if (context[params[0]]) {
        options.helpers = helpers;
        placeholder.appendChild(
          options.render(context, options)
        );
      }
      return;
    }
    placeholder.appendText(context[helperName]);
  }
};

testDom("it works", function(dom) {
  /* jshint evil: true */
  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>');
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var template = new Function("dom", "Placeholder", "return " + program)(dom, Placeholder);
  var frag = template(
    { working: true, firstName: 'Kris', lastName: 'Selden' },
    { helpers: helpers }
  );
  equalDomHTML(dom, frag, '<div>Hello Kris Selden!</div>');
});

