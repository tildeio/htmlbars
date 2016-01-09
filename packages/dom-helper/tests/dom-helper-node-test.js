/*globals require*/

import DOMHelper from "../dom-helper";

var SimpleDOM = require('simple-dom');

var dom;

QUnit.module('DOM Helper (Node)', {
  afterEach: function() {
    dom = null;
  }
});

if (typeof document === 'undefined') {
  test('it throws when instantiated without document', function(){
    var throws = false;
    try {
      dom = new DOMHelper();
    } catch (e) {
      throws = true;
    }
    ok(throws, 'dom helper cannot instantiate');
  });
}

test('it instantiates with a stub document', function(){
  var called = false;
  var element = {};
  var doc = {
    createElement: function(){
      called = true;
      return element;
    }
  };
  dom = new DOMHelper(doc);
  ok(dom, 'dom helper can instantiate');
  var createdElement = dom.createElement('div');
  equal(createdElement, element, 'dom helper calls passed stub');
});

QUnit.module('DOM Helper (Integration: SimpleDOM)', {
  afterEach: function() {
    dom = null;
  }
});

test('it instantiates with a SimpleDOM document', function(){
  var doc = new SimpleDOM.Document();
  dom = new DOMHelper(doc);
  ok(dom, 'dom helper can instantiate');
  var createdElement = dom.createElement('div');
  equal(createdElement.tagName, 'DIV', 'dom helper calls passed stub');
});

test('it does not parse HTML', function(){
  var doc = new SimpleDOM.Document();
  dom = new DOMHelper(doc);
  ok(dom, 'dom helper can instantiate');
  var parsed = dom.parseHTML('<div>Hello</div>');
  equal(parsed.nodeType, -1, 'parseHTML creates a RawHTMLSection');
  equal(parsed.nodeName, '#raw-html-section', 'parseHTML creates a RawHTMLSection');
  equal(parsed.nodeValue, '<div>Hello</div>', 'parseHTML creates a RawHTMLSection');
});
