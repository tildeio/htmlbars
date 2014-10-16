"use strict";
var AST = require("../handlebars/compiler/ast")["default"];

var MustacheNode = AST.MustacheNode;
exports.MustacheNode = MustacheNode;var SexprNode = AST.SexprNode;
exports.SexprNode = SexprNode;var HashNode = AST.HashNode;
exports.HashNode = HashNode;var IdNode = AST.IdNode;
exports.IdNode = IdNode;var StringNode = AST.StringNode;
exports.StringNode = StringNode;
function ProgramNode(statements, strip) {
  this.type = 'program';
  this.statements = statements;
  this.strip = strip;
}

exports.ProgramNode = ProgramNode;function BlockNode(mustache, program, inverse, strip) {
  this.type = 'block';
  this.mustache = mustache;
  this.program = program;
  this.inverse = inverse;
  this.strip = strip;
}

exports.BlockNode = BlockNode;function ComponentNode(tag, attributes, program) {
  this.type = 'component';
  this.tag = tag;
  this.attributes = attributes;
  this.program = program;
}

exports.ComponentNode = ComponentNode;function ElementNode(tag, attributes, helpers, children) {
  this.type = 'element';
  this.tag = tag;
  this.attributes = attributes;
  this.helpers = helpers;
  this.children = children;
}

exports.ElementNode = ElementNode;function PartialNode(name) {
  this.id = {};
  this.id.string = this.name = 'partial';
  this.type = 'mustache';
  this.params = [name];
  this.program = null;
  this.inverse = null;
  this.hash = undefined;
  this.escaped = true;
  this.isHelper = true;
}

exports.PartialNode = PartialNode;function AttrNode(name, value) {
  this.type = 'attr';
  this.name = name;
  this.value = value;
}

exports.AttrNode = AttrNode;function TextNode(chars) {
  this.type = 'text';
  this.chars = chars;
}

exports.TextNode = TextNode;function childrenFor(node) {
  if (node.type === 'program') return node.statements;
  if (node.type === 'element') return node.children;
}

exports.childrenFor = childrenFor;function usesMorph(node) {
  return node.type === 'mustache' || node.type === 'block' || node.type === 'component';
}

exports.usesMorph = usesMorph;function appendChild(parent, node) {
  var children = childrenFor(parent);

  var len = children.length, last;
  if (len > 0) {
    last = children[len-1];
    if (usesMorph(last) && usesMorph(node)) {
      children.push(new TextNode(''));
    }
  }
  children.push(node);
}

exports.appendChild = appendChild;