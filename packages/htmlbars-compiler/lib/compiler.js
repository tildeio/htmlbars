/*jshint evil:true*/
import { preprocess } from "./parser";
import { TemplateCompiler } from "./compiler/template";
import { DOMHelper } from "htmlbars-runtime/dom-helper";
import { Morph } from "morph";

export function compile(string, options, dom) {
  return compileSpec(string, options)(dom || new DOMHelper(document), Morph);
}

export function compileSpec(string, options) {
  var ast = preprocess(string, options);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  return new Function("dom", "Morph", "return " + program);
}
