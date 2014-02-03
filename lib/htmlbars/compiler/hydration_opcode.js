import { ASTWalker } from "./ast_walker";
import { getIdAttribute, idFromPath } from "htmlbars/compiler/utils";

function HydrationOpcodeCompiler() {
  this.opcodes = [];
  this.paths = [];
  this.templateId = 0;
  this.currentDOMChildIndex = 0;
}

HydrationOpcodeCompiler.prototype.compile = function(ast) {
  var astWalker = new ASTWalker(this);
  astWalker.visit(ast);
  return this.opcodes;
};

HydrationOpcodeCompiler.prototype.startTemplate = function() {
  this.opcodes.length = 0;
  this.paths.length = 0;
  this.templateId = 0;
  this.currentDOMChildIndex = -1;
};

HydrationOpcodeCompiler.prototype.endTemplate = function() {
  // TODO: distribute declarations
};

HydrationOpcodeCompiler.prototype.text = function(string) {
  ++this.currentDOMChildIndex;
};

HydrationOpcodeCompiler.prototype.openElement = function(element, pos, len, mustacheCount) {

  ++this.currentDOMChildIndex;
  this.paths.push(this.currentDOMChildIndex);

  this.currentDOMChildIndex = -1;

  if (mustacheCount > 0) {
    // Need to declare parent element.
    var id = getIdAttribute(element.attributes);

    var parentIdentifier = this.paths.join('_');
    if (!id) {
      id = idFromPath(this.paths);
      this.opcode('lookupParent', id, parentIdentifier);
      this.opcode('removeId', id);
    } else {
      this.opcode('lookupParent', id, parentIdentifier);
    }
  }

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  element.helpers.forEach(function(helper) {
    this.nodeHelper(helper);
  }, this);
};

HydrationOpcodeCompiler.prototype.closeElement = function(element) {
  this.opcode('popParent');
  this.currentDOMChildIndex = this.paths.pop();
};

HydrationOpcodeCompiler.prototype.node = function (node, childIndex, childrenLength) {
  this[node.type](node, childIndex, childrenLength);
};

HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex,
      mustache = block.helper;

  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  var parentIdentifier = this.paths.join('_');
  this.opcode('placeholder', parentIdentifier, start, end);

  this.opcode('program', this.templateId++, block.inverse === null ? null : this.templateId++);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
};

HydrationOpcodeCompiler.prototype.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push([type, params]);
};

HydrationOpcodeCompiler.prototype.attribute = function(attribute) {
  var name = attribute[0], value = attribute[1];

  if (value.length === 0 || (value.length === 1 && typeof value[0] === 'string')) {
    return;
  }

  // We treat attribute like a ATTRIBUTE helper evaluated by the ELEMENT hook.
  // <p {{ATTRIBUTE 'class' 'foo ' (bar)}}></p>

  // Unwrapped any mustaches to just be their internal sexprs.
  var node;
  for (var i = value.length - 1; i >= 0; i--) {
    node = value[i];
    if (typeof node !== 'string') {
      value[i] = node.sexpr;
    }
  }

  value.unshift(name);
  this.nodeHelper({
    params: value,
    hash: null,
    id: {
      string: 'ATTRIBUTE'
    }
  });
};

HydrationOpcodeCompiler.prototype.nodeHelper = function(mustache) {
  this.opcode('program', null, null);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.paths.slice());
};

HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex;

  var start = currentDOMChildIndex,
      end = (childIndex === childrenLength - 1 ? -1 : currentDOMChildIndex + 1);

  var parentIdentifier = this.paths.join('_');
  this.opcode('placeholder', parentIdentifier, start, end);

  if (mustache.isHelper) {
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
  } else {
    this.opcode('ambiguous', mustache.id.string, mustache.escaped);
  }
};

HydrationOpcodeCompiler.prototype.sexpr = function(sexpr) {
  this.string('sexpr');
  this.opcode('program', null, null);
  processParams(this, sexpr.params);
  processHash(this, sexpr.hash);
  this.opcode('sexpr', sexpr.id.string, sexpr.params.length);
};

HydrationOpcodeCompiler.prototype.string = function(str) {
  this.opcode('string', str);
};

HydrationOpcodeCompiler.prototype.mustacheInAttr = function(mustache) {
  var parentIdentifier = this.paths.join('_');
  if (mustache.isHelper) {
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helperAttr', mustache.id.string, mustache.params.length, mustache.escaped, parentIdentifier);
  } else {
    this.opcode('ambiguousAttr', mustache.id.string, mustache.escaped, parentIdentifier);
  }
};

HydrationOpcodeCompiler.prototype.ID = function(id) {
  this.opcode('id', id.parts);
};

HydrationOpcodeCompiler.prototype.STRING = function(string) {
  this.opcode('stringLiteral', string.stringModeValue);
};

HydrationOpcodeCompiler.prototype.BOOLEAN = function(boolean) {
  this.opcode('literal', boolean.stringModeValue);
};

HydrationOpcodeCompiler.prototype.INTEGER = function(integer) {
  this.opcode('literal', integer.stringModeValue);
};

function processParams(compiler, params) {
  params.forEach(function(param) {
    if (param.type) {
      compiler[param.type](param);
    } else {
      compiler.STRING({ stringModeValue: param });
    }
  });
}

function processHash(compiler, hash) {
  if (hash) {
    hash.pairs.forEach(function(pair) {
      var name = pair[0], param = pair[1];
      compiler[param.type](param);
      compiler.opcode('stackLiteral', name);
    });
    compiler.opcode('stackLiteral', hash.pairs.length);
  } else {
    compiler.opcode('stackLiteral', 0);
  }
}

export { HydrationOpcodeCompiler };
