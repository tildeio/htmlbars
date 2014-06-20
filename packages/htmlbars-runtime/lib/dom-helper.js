import { Morph } from "morph";

/*
 * A class wrapping DOM functions to address compatibility issues and
 * namespace changes.
 *
 * When entering a template, the dom may have an ambigious scope. To
 * deal with this we simply use the domHelper passed into a template
 * and trust that the template caller has specified the namespace
 * and document correctly.
 *
 * By presenting one interface for any namespace or document mix, the
 * fragment code remains simple, and the initial document/namespace of
 * a fragment is still configurable.
 *
 * @class DOMHelper
 * @constructor
 * @param {HTMLDocument} _document The document DOM methods are proxied to
 * @param {String} namespace The optional namespace for these actions
 */
export function DOMHelper(_document, namespace){
  this.document = _document;
  this.namespace = namespace;
}

var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;

prototype.appendChild = function(element, childElement) {
  element.appendChild(childElement);
};

prototype.appendText = function(element, text) {
  element.appendChild(this.document.createTextNode(text));
};

prototype.setAttribute = function(element, name, value) {
  element.setAttribute(name, value);
};

prototype.createElement = function(tagName) {
  if (this.namespace) {
    return this.document.createElementNS(this.namespace, tagName);
  } else {
    return this.document.createElement(tagName);
  }
};

prototype.createDocumentFragment = function(){
  return this.document.createDocumentFragment();
};

prototype.createTextNode = function(text){
  return this.document.createTextNode(text);
};

prototype.cloneNode = function(element){
  return element.cloneNode(true);
};

prototype.createMorph = function(parent, startIndex, endIndex){
  var childNodes = parent.childNodes,
      start = startIndex === -1 ? null : childNodes[startIndex],
      end = endIndex === -1 ? null : childNodes[endIndex];
  return new Morph(parent, start, end, this);
};

prototype.parseHTML = function(html, parent){
  var element;
  // nodeType 11 is a document fragment
  if (parent.nodeType === 11) {
    /* TODO require templates always have a contextual element
       instead of element0 = frag */
    element = this.createElement('div');
  } else {
    element = parent.cloneNode(false);
  }
  element.innerHTML = html;
  return element.childNodes;
};
