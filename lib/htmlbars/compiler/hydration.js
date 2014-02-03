import { processOpcodes } from "htmlbars/compiler/utils";
import { prepareHelper } from "htmlbars/compiler/helpers";
import { string, quotedArray, hash, array } from "htmlbars/compiler/quoting";

function HydrationCompiler() {
  this.stack = [];
  this.source = [];
  this.mustaches = [];
  this.parents = ['fragment'];
  this.declarations = [];
  this.cleanup = "";
  this.currentPlaceholder = null;
  this.placeholderNum = 0;
}

var prototype = HydrationCompiler.prototype;

prototype.compile = function(opcodes) {
  this.stack.length = 0;
  this.mustaches.length = 0;
  this.source.length = 0;
  this.parents.length = 1;
  this.declarations.length = 0;
  this.currentPlaceholder = null;
  this.placeholderNum = 0;
  this.cleanup = "";

  processOpcodes(this, opcodes);

  if (this.declarations.length) {
    var decs = "  var ";
    for (var i = 0, l = this.declarations.length; i < l; ++i) {
      var dec = this.declarations[i];
      decs += dec[0];
      decs += " = ";
      decs += dec[1];
      if (i+1 === l) {
        decs += ';\n';
      } else {
        decs += ', ';
      }
    }
    decs += this.cleanup;
    this.source.unshift(decs);
  }

  return this.source.join('');
};

prototype.program = function(programId, inverseId) {
  this.stack.push(inverseId);
  this.stack.push(programId);
};

prototype.id = function(parts) {
  this.stack.push(string('id'));
  this.stack.push(string(parts.join('.')));
};

prototype.literal = function(literal) {
  this.stack.push(string(typeof literal));
  this.stack.push(literal);
};

prototype.stringLiteral = function(str) {
  this.stack.push(string('string'));
  this.stack.push(string(str));
};

prototype.stackLiteral = function(literal) {
  this.stack.push(literal);
};

prototype.helper = function(name, size, escaped) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);
  this.pushMustacheInContent(string(name), prepared.args, prepared.options);
};

prototype.ambiguous = function(str, escaped) {
  this.pushMustacheInContent(string(str), '[]', ['escaped:'+escaped]);
};

prototype.ambiguousAttr = function(str, escaped) {
  this.stack.push('['+string(str)+', [], {escaped:'+escaped+'}]');
};

prototype.helperAttr = function(name, size, escaped) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);

  this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
};

prototype.sexpr = function(name, size) {
  var prepared = prepareHelper(this.stack, size);

  //export function SUBEXPR(helperName, context, params, options) {
  this.stack.push('helpers.SUBEXPR(' + string(name) + ', context, ' + prepared.args + ', ' + hash(prepared.options) + ', helpers)');
};

prototype.string = function(str) {
  this.stack.push(string(str));
};

prototype.nodeHelper = function(name, size) {
  var prepared = prepareHelper(this.stack, size);
  this.pushMustacheInNode(string(name), prepared.args, prepared.options);
};

prototype.placeholder = function(parentIdentifier, startIndex, endIndex) {
  var parent = parentIdentifier ? "parent"+parentIdentifier : "fragment";
  this.currentPlaceholder = "placeholder" + this.placeholderNum++;
  var placeholder = "new Placeholder("+parent+","+
    (startIndex === null ? "-1" : startIndex)+","+
    (endIndex === null ? "-1" : endIndex)+")";

  this.declarations.push([this.currentPlaceholder, placeholder]);
};

prototype.pushMustacheInContent = function(name, args, pairs) {
  this.source.push('  helpers.CONTENT(' + this.currentPlaceholder + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', helpers);\n');
};

prototype.pushMustacheInNode = function(name, args, pairs) {
  this.source.push('  helpers.ELEMENT(' + this.getParent() + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', helpers);\n');
};

prototype.lookupParent = function(id, parentIdentifier) {
  var parentNodesName = "parent" + parentIdentifier;
  this.declarations.push([parentNodesName, 'dom.getElementById(fragment, "' + id + '")']);
  this.parents.push(parentNodesName);
};

prototype.removeId = function() {
  this.cleanup += "  dom.removeAttribute(" + this.getParent() + ", 'id');\n";
};

prototype.popParent = function() {
  this.parents.pop();
};

prototype.getParent = function() {
  return this.parents[this.parents.length-1];
};

export { HydrationCompiler };
