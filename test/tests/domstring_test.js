import { TemplateCompiler } from "htmlbars/compiler/template";
import { Placeholder } from "htmlbars/runtime/placeholder";
import { preprocess } from "htmlbars/parser";
import { domStringHelpers } from "htmlbars/runtime/domstring_helpers";
import { runtimeHelpers } from "htmlbars/runtime/domstring_helpers";

module("DomStrings");

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

var dom = domStringHelpers();

var helpers = runtimeHelpers( dom );
test("it works", function testFunction() {
  /* jshint evil: true */
//  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{else}}Hola {{firstName}}!{{/if}}</div>{{foo}}{{#foo}}{{#bar}}{{/bar}}{{/foo}}');
//  var ast = preprocess('PRE<div>pre{{#if working}}Hello {{firstName}} {{lastName}}!{{else}}Hola {{firstName}}!{{/if}}post</div>{{foo}}POST');
//  var ast = preprocess('a{{#b}}c{{#d}}e{{/d}}f{{/b}}g{{#h}}i{{#j}}k{{/j}}l{{/h}}m');
//  var ast = preprocess('a{{#if on}}c{{else}}d{{/if}}e{{#if off}}f{{else}}g{{/if}}m');
//  var ast = preprocess('a{{#b}}c{{/b}}g{{#h}}i{{/h}}m');
  var ast = preprocess('a{{b}}g{{h}}m');
//  var ast = preprocess('<div></div>');
  var compiler = new TemplateCompiler( domStringHelpers() );

  var program = compiler.compile( ast );

  var template = new Function("dom", "Placeholder", "return " + program)(dom, Placeholder);

  var compiled = template({
      foo: 42,
      on: true,
      off: false,
      b: "B",
      h: "H"
    }, {
      helpers: helpers
  });

  equal( compiled.toString(), "a<script id=\"metamorph-0\"></script>B<script id=\"metamorph-0-end\"></script>g<script id=\"metamorph-1\"></script>H<script id=\"metamorph-1-end\"></script>m" );
});
