"use strict";
var parse = require("../handlebars/compiler/base").parse;
var Tokenizer = require("../simple-html-tokenizer").Tokenizer;
var nodeHandlers = require("./html-parser/node-handlers")["default"];
var tokenHandlers = require("./html-parser/token-handlers")["default"];

function preprocess(html, options) {
  var ast = parse(html);
  var combined = new HTMLProcessor().acceptNode(ast);
  return combined;
}

exports.preprocess = preprocess;function HTMLProcessor() {
  this.elementStack = [];
  this.tokenizer = new Tokenizer('');
  this.nodeHandlers = nodeHandlers;
  this.tokenHandlers = tokenHandlers;
}

HTMLProcessor.prototype.acceptNode = function(node) {
  return this.nodeHandlers[node.type].call(this, node);
};

HTMLProcessor.prototype.acceptToken = function(token) {
  if (token) {
    return this.tokenHandlers[token.type].call(this, token);
  }
};

HTMLProcessor.prototype.currentElement = function() {
  return this.elementStack[this.elementStack.length - 1];
};