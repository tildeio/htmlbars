/* jshint scripturl:true */

import DOMHelper from "../dom-helper";
import SafeString from "htmlbars-util/safe-string";
import AttrMorph from "morph-attr";

var svgNamespace = "http://www.w3.org/2000/svg",
    xlinkNamespace = "http://www.w3.org/1999/xlink";
var domHelper = new DOMHelper();

QUnit.module('AttrMorph');

test("can update a dom node", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent('twang');
  equal(element.id, 'twang', 'id property is set');
  equal(element.getAttribute('id'), 'twang', 'id attribute is set');
});

test("can clear", function(){
  expect(0);
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.clear();
});

test("calling destroy does not throw", function(){
  expect(1);
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');

  morph.destroy();

  equal(morph.element, null, 'clears element from morph');
});

test("can update property", function(){
  var element = domHelper.createElement('input');
  var morph = domHelper.createAttrMorph(element, 'disabled');
  morph.setContent(true);
  equal(element.disabled, true, 'disabled property is set');
  morph.setContent(false);
  equal(element.disabled, false, 'disabled property is set');
});

function detectBrowserMaxLengthValues() {
  let element = domHelper.createElement('input');
  let initialMaxLength = element.maxLength;

  element.maxLength = 1; // set a valid value
  element.maxLength = null; // set to falsey value

  let maxLengthAfterReset = element.maxLength;

  return { initialMaxLength, maxLengthAfterReset };
}

test("input.maxLength", function(){
  // different browsers have different defaults FF: -1, Chrome/Blink: 524288;
  let { initialMaxLength, maxLengthAfterReset } = detectBrowserMaxLengthValues();

  var element = domHelper.createElement('input');
  var morph = domHelper.createAttrMorph(element, 'maxLength');

  morph.setContent(null);
  equal(element.maxLength, initialMaxLength, 'property is w/e is default');

  morph.setContent(1);
  equal(element.maxLength, 1, 'should be 1');

  morph.setContent(null);
  equal(element.maxLength, maxLengthAfterReset, 'property 0, result of element.maxLength = ""');
});

test("input.maxlength (all lowercase)", function(){
  var element = domHelper.createElement('input');
  var morph = domHelper.createAttrMorph(element, 'maxlength');
  // different browsers have different defaults FF: -1, Chrome/Blink: 524288;
  var DEFAULT_MAX_LENGTH = element.maxLength;

  morph.setContent(null);
  equal(element.maxLength, DEFAULT_MAX_LENGTH, 'property is w/e is default');

  morph.setContent(1);
  equal(element.maxLength, 1, 'property is w/e is default');

  morph.setContent(null);
  equal(element.maxLength, DEFAULT_MAX_LENGTH, 'property is w/e is default');
});

test("does not add undefined properties on initial render", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent(undefined);
  equal(element.id, '', 'property should not be set');
  morph.setContent('foo-bar');
  equal(element.id, 'foo-bar', 'property should be set');
});

test("does not add null properties on initial render", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'id');
  morph.setContent(null);
  equal(element.id, '', 'property should not be set');
  morph.setContent('foo-bar');
  equal(element.id, 'foo-bar', 'property should be set');
});

test("can update attribute", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'data-bop');
  morph.setContent('kpow');
  equal(element.getAttribute('data-bop'), 'kpow', 'data-bop attribute is set');
  morph.setContent(null);
  equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});

test("can remove ns attribute with null", function(){
  var element = domHelper.createElement('svg');
  domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
  var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
  morph.setContent(null);
  equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
});

test("can remove attribute with undefined", function(){
  var element = domHelper.createElement('div');
  element.setAttribute('data-bop', 'kpow');
  var morph = domHelper.createAttrMorph(element, 'data-bop');
  morph.setContent(undefined);
  equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});

test("can remove `download` attribute with null", function(){
  var element = domHelper.createElement('a');
  var morph = domHelper.createAttrMorph(element, 'download');
  morph.setContent('file.pdf');
  equal(element.getAttribute('download'), 'file.pdf', 'download attribute is set');
  morph.setContent(null);
  equal(element.getAttribute('download'), undefined, 'download attribute is removed');
});

test("can remove ns attribute with undefined", function(){
  var element = domHelper.createElement('svg');
  domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
  var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
  morph.setContent(undefined);
  equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
});

test("can update svg attribute", function(){
  domHelper.setNamespace(svgNamespace);
  var element = domHelper.createElement('svg');
  var morph = domHelper.createAttrMorph(element, 'height');
  morph.setContent('50%');
  equal(element.getAttribute('height'), '50%', 'svg attr is set');
  morph.setContent(null);
  equal(element.getAttribute('height'), undefined, 'svg attr is removed');
});

test("can update style attribute", function(){
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'style');
  morph.setContent('color: red;');
  equal(element.getAttribute('style'), 'color: red;', 'style attr is set');
  morph.setContent(null);
  equal(element.getAttribute('style'), undefined, 'style attr is removed');
});

var badTags = [
  { tag: 'a', attr: 'href' },
  { tag: 'body', attr: 'background' },
  { tag: 'link', attr: 'href' },
  { tag: 'img', attr: 'src' },
  { tag: 'iframe', attr: 'src'}
];

function runBadTagTests(subject){
  test(subject.tag +" "+subject.attr+" is sanitized when using blacklisted protocol", function() {
    var element = document.createElement(subject.tag);
    var morph = domHelper.createAttrMorph(element, subject.attr);
    morph.setContent('javascript://example.com');

    equal( element.getAttribute(subject.attr),
           'unsafe:javascript://example.com',
           'attribute is escaped');
  });

  test(subject.tag +" "+subject.attr+" is not sanitized when using non-whitelisted protocol with a SafeString", function() {
    var element = document.createElement(subject.tag);
    var morph = domHelper.createAttrMorph(element, subject.attr);
    try {
      morph.setContent(new SafeString('javascript://example.com'));

      equal( element.getAttribute(subject.attr),
             'javascript://example.com',
             'attribute is not escaped');
    } catch(e) {
      // IE does not allow javascript: to be set on img src
      ok(true, 'caught exception '+e);
    }
  });

  test(subject.tag +" "+subject.attr+" is not sanitized when using unsafe attr morph", function() {
    var element = document.createElement(subject.tag);
    var morph = domHelper.createUnsafeAttrMorph(element, subject.attr);
    try {
      morph.setContent('javascript://example.com');

      equal( element.getAttribute(subject.attr),
             'javascript://example.com',
             'attribute is not escaped');
    } catch(e) {
      // IE does not allow javascript: to be set on img src
      ok(true, 'caught exception '+e);
    }
  });
}

for (var i=0, l=badTags.length; i<l; i++) {
  var subject = badTags[i];

  runBadTagTests(subject);
}

if (document && document.createElementNS) {

test("detects attribute's namespace if it is not passed as an argument", function () {
  var element = domHelper.createElement('div');
  var morph = domHelper.createAttrMorph(element, 'xlink:href');
  morph.setContent('#circle');
  equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink', 'attribute has correct namespace');
});

test("can update namespaced attribute", function(){
  domHelper.setNamespace(svgNamespace);
  var element = domHelper.createElement('svg');
  var morph = domHelper.createAttrMorph(element, 'xlink:href', 'http://www.w3.org/1999/xlink');
  morph.setContent('#other');
  equal(element.getAttributeNS('http://www.w3.org/1999/xlink','href'), '#other', 'namespaced attr is set');
  equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
  equal(element.attributes[0].name, 'xlink:href');
  equal(element.attributes[0].localName, 'href');
  equal(element.attributes[0].value, '#other');
  morph.setContent(null);
  // safari returns '' while other browsers return undefined
  equal(!!element.getAttributeNS('http://www.w3.org/1999/xlink','href'), false, 'namespaced attr is removed');
});

}

test("embed src as data uri is sanitized", function() {
  var element = document.createElement('embed');
  var morph = domHelper.createAttrMorph(element, 'src');
  morph.setContent('data:image/svg+xml;base64,PH');

  equal( element.getAttribute('src'),
        'unsafe:data:image/svg+xml;base64,PH',
        'attribute is escaped');
});

// Regression test for https://github.com/tildeio/htmlbars/pull/447.
test("the value property of an input element is not set if the value hasn't changed", function() {
  let calls = 0;

  let domHelperStub = {
    setPropertyStrict() {
      calls++;
    }
  };

  let input = document.createElement('input');
  let morph = AttrMorph.create(input, 'value', domHelperStub);

  equal(calls, 0);
  morph.setContent('one');
  equal(calls, 1);
  morph.setContent('one');
  equal(calls, 1);
  morph.setContent('two');
  equal(calls, 2);
  morph.setContent('two');
  equal(calls, 2);
});
