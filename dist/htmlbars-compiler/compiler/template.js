"use strict";
var FragmentOpcodeCompiler = require("./fragment_opcode").FragmentOpcodeCompiler;
var FragmentCompiler = require("./fragment").FragmentCompiler;
var HydrationOpcodeCompiler = require("./hydration_opcode").HydrationOpcodeCompiler;
var HydrationCompiler = require("./hydration").HydrationCompiler;
var TemplateVisitor = require("./template_visitor")["default"];
var processOpcodes = require("./utils").processOpcodes;
var string = require("./quoting").string;
var repeat = require("./quoting").repeat;

function TemplateCompiler() {
  this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
  this.fragmentCompiler = new FragmentCompiler();
  this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
  this.hydrationCompiler = new HydrationCompiler();
  this.templates = [];
  this.childTemplates = [];
}

exports.TemplateCompiler = TemplateCompiler;TemplateCompiler.prototype.compile = function(ast) {
  var templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);

  processOpcodes(this, templateVisitor.actions);

  return this.templates.pop();
};

TemplateCompiler.prototype.startProgram = function(program, childTemplateCount, blankChildTextNodes) {
  this.fragmentOpcodeCompiler.startProgram(program, childTemplateCount, blankChildTextNodes);
  this.hydrationOpcodeCompiler.startProgram(program, childTemplateCount, blankChildTextNodes);

  this.childTemplates.length = 0;
  while(childTemplateCount--) {
    this.childTemplates.push(this.templates.pop());
  }
};

TemplateCompiler.prototype.endProgram = function(program, programDepth) {
  this.fragmentOpcodeCompiler.endProgram(program);
  this.hydrationOpcodeCompiler.endProgram(program);

  var indent = repeat("  ", programDepth);
  var options = {
    indent: indent + "  "
  };

  // function build(dom) { return fragment; }
  var fragmentProgram = this.fragmentCompiler.compile(
    this.fragmentOpcodeCompiler.opcodes,
    options
  );

  // function hydrate(fragment) { return mustaches; }
  var hydrationProgram = this.hydrationCompiler.compile(
    this.hydrationOpcodeCompiler.opcodes,
    options
  );

  var childTemplateVars = "";
  for (var i=0, l=this.childTemplates.length; i<l; i++) {
    childTemplateVars += indent+'  var child' + i + ' = ' + this.childTemplates[i] + '\n';
  }

  var template =
    '(function() {\n' +
    childTemplateVars +
    fragmentProgram +
    indent+'  var cachedFragment;\n' +
    indent+'  return function template(context, env, contextualElement) {\n' +
    indent+'    var dom = env.dom, hooks = env.hooks;\n' +
    indent+'    dom.detectNamespace(contextualElement);\n' +
    indent+'    if (cachedFragment === undefined) {\n' +
    indent+'      cachedFragment = build(dom);\n' +
    indent+'    }\n' +
    indent+'    var fragment = dom.cloneNode(cachedFragment, true);\n' +
    hydrationProgram +
    indent+'    return fragment;\n' +
    indent+'  };\n' +
    indent+'}());';

  this.templates.push(template);
};

TemplateCompiler.prototype.openElement = function(element, i, l, r, c, b) {
  this.fragmentOpcodeCompiler.openElement(element, i, l, r, c, b);
  this.hydrationOpcodeCompiler.openElement(element, i, l, r, c, b);
};

TemplateCompiler.prototype.closeElement = function(element, i, l, r) {
  this.fragmentOpcodeCompiler.closeElement(element, i, l, r);
  this.hydrationOpcodeCompiler.closeElement(element, i, l, r);
};

TemplateCompiler.prototype.component = function(component, i, l) {
  this.fragmentOpcodeCompiler.component(component, i, l);
  this.hydrationOpcodeCompiler.component(component, i, l);
};

TemplateCompiler.prototype.block = function(block, i, l) {
  this.fragmentOpcodeCompiler.block(block, i, l);
  this.hydrationOpcodeCompiler.block(block, i, l);
};

TemplateCompiler.prototype.text = function(string, i, l, r) {
  this.fragmentOpcodeCompiler.text(string, i, l, r);
  this.hydrationOpcodeCompiler.text(string, i, l, r);
};

TemplateCompiler.prototype.mustache = function (mustache, i, l) {
  this.fragmentOpcodeCompiler.mustache(mustache, i, l);
  this.hydrationOpcodeCompiler.mustache(mustache, i, l);
};

TemplateCompiler.prototype.setNamespace = function(namespace) {
  this.fragmentOpcodeCompiler.setNamespace(namespace);
};