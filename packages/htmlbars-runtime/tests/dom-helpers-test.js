import {DOMHelper} from "htmlbars-runtime/dom-helper";
import {equalHTML} from "test/support/assertions";

var dom,
    xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace   = "http://www.w3.org/2000/svg";

module('htmlbars-runtime: DOM Helper',{
  setup: function(){
    dom = new DOMHelper(document);
  }
});

test('#createElement', function(){
  var node = dom.createElement('div');
  equal(node.tagName, 'DIV');
  equal(node.namespaceURI, xhtmlNamespace);
  equalHTML(node, '<div></div>');
});

test('#appendText adds text', function(){
  var node = dom.createElement('div');
  dom.appendText(node, 'Howdy');
  equalHTML(node, '<div>Howdy</div>');
});

test('#setAttribute', function(){
  var node = dom.createElement('div');
  dom.setAttribute(node, 'id', 'super-tag');
  equalHTML(node, '<div id="super-tag"></div>');
});

module('htmlbars-runtime: DOM Helper with namespace',{
  setup: function(){
    dom = new DOMHelper(document, svgNamespace);
  }
});

test('#createElementNS with foreign namespace', function(){
  var node = dom.createElement('svg');
  equal(node.tagName, 'svg');
  equal(node.namespaceURI, svgNamespace);
  equalHTML(node, '<svg></svg>');
});

