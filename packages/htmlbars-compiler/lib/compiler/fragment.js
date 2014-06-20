import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = 0;
  this.domHelper = 'dom0';
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.source.length = 0;
  this.depth = 0;

  this.source.push('function build() {\n');
  processOpcodes(this, opcodes);
  this.source.push('}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.empty = function() {
  this.source.push('  return '+this.domHelper+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.startFragment = function() {
  this.source.push('  var el0 = '+this.domHelper+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.endFragment = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.openContextualElement = function(domHelper) {
  var el = 'el'+this.depth;
  this.source.push('  '+domHelper+' = new '+this.domHelper+'.constructor('+el+');\n');
};

FragmentCompiler.prototype.selectDOMHelper = function(domHelper) {
  this.domHelper = domHelper;
};

FragmentCompiler.prototype.openElement = function(tagName, isRoot) {
  var el;
  if (isRoot) {
    el = 'el0';
  } else {
    el = 'el'+(++this.depth);
  }
  this.source.push('  var '+el+' = '+this.domHelper+'.createElement('+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push('  '+this.domHelper+'.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.text = function(str, isRoot) {
  if (isRoot) {
    this.source.push('  return '+this.domHelper+'.createTextNode('+string(str)+');\n');
  } else {
    var el = 'el'+this.depth;
    this.source.push('  '+this.domHelper+'.appendText('+el+','+string(str)+');\n');
  }
};

FragmentCompiler.prototype.closeElement = function(tagName, isRoot) {
  if (isRoot) {
    this.source.push('  return el0;\n');
  } else {
    var child = 'el'+(this.depth--);
    var el = 'el'+this.depth;
    this.source.push('  '+this.domHelper+'.appendChild('+el+', '+child+');\n');
  }
};
