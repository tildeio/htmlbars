import { registerMacro } from "htmlbars/macros";
import { compileSpec } from "htmlbars/compiler";
import { HTMLElement } from "htmlbars/ast";
import { testDom, equalDomHTML } from "test_helpers";
import { Placeholder } from "htmlbars/runtime/placeholder";

module("HTML Macros");

function compile( dom, spec, options ){
  return compileSpec( spec, options )( dom, Placeholder );
};

testDom("A simple HTML macro can replace a tagName", function( dom ) {
  registerMacro('testing', function test(element) {
    return element.attributes.is && element.attributes.is[0] === 'span';
  }, function mutate(element) {
    element.tag = 'span';
    element.removeAttr('is');
  });

  var template = compile(dom, "<div is='span'><b>hi</b></div>");
  var fragment = template();

  equalDomHTML(dom, fragment, "<span><b>hi</b></span>");
});

testDom("A simple HTML macro can completely remove the node", function( dom ) {
  registerMacro('testing', function test(element) {
    return element.tag === 'noop';
  }, function mutate() {
    return 'veto';
  });

  var template = compile(dom, "lorem<noop><b>ipsum</b></noop>dolor");
  var fragment = template();

  equalDomHTML(dom, fragment, "loremdolor");
});

testDom("An HTML macro can transclude its children into a new node", function( dom ) {
  registerMacro('testing', function test(element) {
    return element.tag === 'transclude';
  }, function mutate(element) {
    var tagName = element.getAttr('tag');
    element.removeAttr('tag');
    return new HTMLElement(tagName, element.attributes, element.children, element.helpers);
  });

  var template = compile(dom, "<transclude tag='p'>lorem <b>ipsum</b> dolor</transclude>");
  var fragment = template();

  equalDomHTML(dom, fragment, "<p>lorem <b>ipsum</b> dolor</p>");
});
