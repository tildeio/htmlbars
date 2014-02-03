import { ASTWalker } from "./ast_walker";
import { getIdAttribute, idFromPath } from "htmlbars/compiler/utils";

function FragmentOpcodeCompiler() {
  this.opcodes = [];
  this.currentDOMChildIndex = 0;
  this.paths = [];
}

FragmentOpcodeCompiler.prototype.compile = function(ast) {
  var astWalker = new ASTWalker(this);
  astWalker.visit(ast);
  return this.opcodes;
};

FragmentOpcodeCompiler.prototype.opcode = function(type, params) {
  this.opcodes.push([type, params]);
};

FragmentOpcodeCompiler.prototype.text = function(string) {
  ++this.currentDOMChildIndex;
  this.opcode('text', [string]);
};

FragmentOpcodeCompiler.prototype.openElement = function(element, pos, len, mustacheCount) {
  ++this.currentDOMChildIndex;

  var id = getIdAttribute(element.attributes);

  this.opcode('openElement', [element.tag]);

  this.paths.push(this.currentDOMChildIndex);
  this.currentDOMChildIndex = -1;

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  if (!id && mustacheCount) {
    // Generate a queryable id.
    this.attribute(['id', [id || idFromPath(this.paths)]]);
  }
};

FragmentOpcodeCompiler.prototype.closeElement = function(element) {
  this.opcode('closeElement', [element.tag]);
  this.currentDOMChildIndex = this.paths.pop();
};

FragmentOpcodeCompiler.prototype.startTemplate = function() {
  this.opcodes.length = 0;
  this.paths.length = 0;
  this.currentDOMChildIndex = -1;
};

FragmentOpcodeCompiler.prototype.endTemplate = function() {};

FragmentOpcodeCompiler.prototype.node = function () {};

FragmentOpcodeCompiler.prototype.block = function () {};

FragmentOpcodeCompiler.prototype.attribute = function(attribute) {
  var name = attribute[0], value = attribute[1];
  if (value.length === 1 && typeof value[0] === 'string') {
    this.opcode('setAttribute', [name, value[0]]);
  }
};

export { FragmentOpcodeCompiler };
