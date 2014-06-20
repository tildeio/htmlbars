import TemplateVisitor from "./template_visitor";
import { processOpcodes } from "./utils";

function FragmentOpcodeCompiler() {
  this.opcodes = [];
}

FragmentOpcodeCompiler.prototype.compile = function(ast) {
  var templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);

  processOpcodes(this, templateVisitor.actions);

  return this.opcodes;
};

FragmentOpcodeCompiler.prototype.opcode = function(type, params) {
  this.opcodes.push([type, params]);
};

FragmentOpcodeCompiler.prototype.text = function(text, i, l, isRoot) {
  this.opcode('text', [text.chars, isRoot]);
};

FragmentOpcodeCompiler.prototype.openContextualElement = function(domHelper) {
  this.opcode('openContextualElement', [domHelper]);
};

FragmentOpcodeCompiler.prototype.selectDOMHelper = function(domHelper) {
  this.opcode('selectDOMHelper', [domHelper]);
};

FragmentOpcodeCompiler.prototype.openElement = function(element, i, l, isRoot) {
  this.opcode('openElement', [element.tag, isRoot]);

  element.attributes.forEach(this.attribute, this);
};

FragmentOpcodeCompiler.prototype.closeElement = function(element, i, l, isRoot) {
  this.opcode('closeElement', [element.tag, isRoot]);
};

FragmentOpcodeCompiler.prototype.startProgram = function(program) {
  this.opcodes.length = 0;
  if (program.statements.length > 1) {
    this.opcode('startFragment');
  }
};

FragmentOpcodeCompiler.prototype.endProgram = function(program) {
  var statements = program.statements;

  if (statements.length === 0) {
    this.opcode('empty');
  } else if (statements.length > 1) {
    this.opcode('endFragment');
  }
};

FragmentOpcodeCompiler.prototype.mustache = function () {};

FragmentOpcodeCompiler.prototype.component = function () {};

FragmentOpcodeCompiler.prototype.block = function () {};

FragmentOpcodeCompiler.prototype.attribute = function(attr) {
  if (attr.value.type === 'text') {
    this.opcode('setAttribute', [attr.name, attr.value.chars]);
  }
};

export { FragmentOpcodeCompiler };
