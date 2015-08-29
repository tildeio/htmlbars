define('dom-helper-tests/dom-helper-node-test', ['exports', '../dom-helper'], function (exports, _domHelper) {

  var dom;

  QUnit.module('DOM Helper (Node)', {
    afterEach: function () {
      dom = null;
    }
  });

  if (typeof document === 'undefined') {
    test('it throws when instantiated without document', function () {
      var throws = false;
      try {
        dom = new _domHelper.default();
      } catch (e) {
        throws = true;
      }
      ok(throws, 'dom helper cannot instantiate');
    });
  }

  test('it instantiates with a stub document', function () {
    var called = false;
    var element = {};
    var doc = {
      createElement: function () {
        called = true;
        return element;
      }
    };
    dom = new _domHelper.default(doc);
    ok(dom, 'dom helper can instantiate');
    var createdElement = dom.createElement('div');
    equal(createdElement, element, 'dom helper calls passed stub');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci1ub2RlLXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFJLEdBQUcsQ0FBQzs7QUFFUixPQUFLLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFO0FBQ2hDLGFBQVMsRUFBRSxZQUFXO0FBQ3BCLFNBQUcsR0FBRyxJQUFJLENBQUM7S0FDWjtHQUNGLENBQUMsQ0FBQzs7QUFFSCxNQUFJLE9BQU8sUUFBUSxLQUFLLFdBQVcsRUFBRTtBQUNuQyxRQUFJLENBQUMsOENBQThDLEVBQUUsWUFBVTtBQUM3RCxVQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDbkIsVUFBSTtBQUNGLFdBQUcsR0FBRyx3QkFBZSxDQUFDO09BQ3ZCLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDVixjQUFNLEdBQUcsSUFBSSxDQUFDO09BQ2Y7QUFDRCxRQUFFLENBQUMsTUFBTSxFQUFFLCtCQUErQixDQUFDLENBQUM7S0FDN0MsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsTUFBSSxDQUFDLHNDQUFzQyxFQUFFLFlBQVU7QUFDckQsUUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQ25CLFFBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNqQixRQUFJLEdBQUcsR0FBRztBQUNSLG1CQUFhLEVBQUUsWUFBVTtBQUN2QixjQUFNLEdBQUcsSUFBSSxDQUFDO0FBQ2QsZUFBTyxPQUFPLENBQUM7T0FDaEI7S0FDRixDQUFDO0FBQ0YsT0FBRyxHQUFHLHVCQUFjLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLE1BQUUsQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztBQUN0QyxRQUFJLGNBQWMsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlDLFNBQUssQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLDhCQUE4QixDQUFDLENBQUM7R0FDaEUsQ0FBQyxDQUFDIiwiZmlsZSI6ImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci1ub2RlLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRE9NSGVscGVyIGZyb20gXCIuLi9kb20taGVscGVyXCI7XG5cbnZhciBkb207XG5cblFVbml0Lm1vZHVsZSgnRE9NIEhlbHBlciAoTm9kZSknLCB7XG4gIGFmdGVyRWFjaDogZnVuY3Rpb24oKSB7XG4gICAgZG9tID0gbnVsbDtcbiAgfVxufSk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gIHRlc3QoJ2l0IHRocm93cyB3aGVuIGluc3RhbnRpYXRlZCB3aXRob3V0IGRvY3VtZW50JywgZnVuY3Rpb24oKXtcbiAgICB2YXIgdGhyb3dzID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGRvbSA9IG5ldyBET01IZWxwZXIoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvd3MgPSB0cnVlO1xuICAgIH1cbiAgICBvayh0aHJvd3MsICdkb20gaGVscGVyIGNhbm5vdCBpbnN0YW50aWF0ZScpO1xuICB9KTtcbn1cblxudGVzdCgnaXQgaW5zdGFudGlhdGVzIHdpdGggYSBzdHViIGRvY3VtZW50JywgZnVuY3Rpb24oKXtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICB2YXIgZWxlbWVudCA9IHt9O1xuICB2YXIgZG9jID0ge1xuICAgIGNyZWF0ZUVsZW1lbnQ6IGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfVxuICB9O1xuICBkb20gPSBuZXcgRE9NSGVscGVyKGRvYyk7XG4gIG9rKGRvbSwgJ2RvbSBoZWxwZXIgY2FuIGluc3RhbnRpYXRlJyk7XG4gIHZhciBjcmVhdGVkRWxlbWVudCA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZXF1YWwoY3JlYXRlZEVsZW1lbnQsIGVsZW1lbnQsICdkb20gaGVscGVyIGNhbGxzIHBhc3NlZCBzdHViJyk7XG59KTtcbiJdfQ==
define('dom-helper-tests/dom-helper-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests');
  QUnit.test('dom-helper-tests/dom-helper-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/dom-helper-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci1ub2RlLXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDMUMsT0FBSyxDQUFDLElBQUksQ0FBQyw2REFBNkQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN6RixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw4REFBOEQsQ0FBQyxDQUFDO0dBQ2pGLENBQUMsQ0FBQyIsImZpbGUiOiJkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXItbm9kZS10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gZG9tLWhlbHBlci10ZXN0cycpO1xuUVVuaXQudGVzdCgnZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("dom-helper-tests/dom-helper-test", ["exports", "../dom-helper", "../htmlbars-test-helpers"], function (exports, _domHelper, _htmlbarsTestHelpers) {

  var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
      xlinkNamespace = "http://www.w3.org/1999/xlink",
      svgNamespace = "http://www.w3.org/2000/svg";

  var foreignNamespaces = ['foreignObject', 'desc', 'title'];

  var dom, i, foreignNamespace;

  // getAttributes may return null or "" for nonexistent attributes,
  // depending on the browser.  So we find it out here and use it later.
  var disabledAbsentValue = (function () {
    var div = document.createElement("input");
    return div.getAttribute("disabled");
  })();

  QUnit.module('DOM Helper', {
    beforeEach: function () {
      dom = new _domHelper.default();
    },
    afterEach: function () {
      dom = null;
    }
  });

  test('#createElement', function () {
    var node = dom.createElement('div');
    equal(node.tagName, 'DIV');
    _htmlbarsTestHelpers.equalHTML(node, '<div></div>');
  });

  test('#childAtIndex', function () {
    var node = dom.createElement('div');

    var child1 = dom.createElement('p');
    var child2 = dom.createElement('img');

    strictEqual(dom.childAtIndex(node, 0), null);
    strictEqual(dom.childAtIndex(node, 1), null);
    strictEqual(dom.childAtIndex(node, 2), null);

    dom.appendChild(node, child1);
    strictEqual(dom.childAtIndex(node, 0).tagName, 'P');
    strictEqual(dom.childAtIndex(node, 1), null);
    strictEqual(dom.childAtIndex(node, 2), null);

    dom.insertBefore(node, child2, child1);
    strictEqual(dom.childAtIndex(node, 0).tagName, 'IMG');
    strictEqual(dom.childAtIndex(node, 1).tagName, 'P');
    strictEqual(dom.childAtIndex(node, 2), null);
  });

  test('#appendText adds text', function () {
    var node = dom.createElement('div');
    var text = dom.appendText(node, 'Howdy');
    ok(!!text, 'returns node');
    _htmlbarsTestHelpers.equalHTML(node, '<div>Howdy</div>');
  });

  test('#setAttribute', function () {
    var node = dom.createElement('div');
    dom.setAttribute(node, 'id', 'super-tag');
    _htmlbarsTestHelpers.equalHTML(node, '<div id="super-tag"></div>');
    dom.setAttribute(node, 'id', null);
    _htmlbarsTestHelpers.equalHTML(node, '<div id="null"></div>');

    node = dom.createElement('input');
    ok(node.getAttribute('disabled') === disabledAbsentValue, 'precond: disabled is absent');
    dom.setAttribute(node, 'disabled', true);
    ok(node.getAttribute('disabled') !== disabledAbsentValue, 'disabled set to true is present');
    dom.setAttribute(node, 'disabled', false);
    ok(node.getAttribute('disabled') !== disabledAbsentValue, 'disabled set to false is present');
  });

  test('#setAttributeNS', function () {
    var node = dom.createElement('svg');
    dom.setAttributeNS(node, xlinkNamespace, 'xlink:href', 'super-fun');
    // chrome adds (xmlns:xlink="http://www.w3.org/1999/xlink") property while others don't
    // thus equalHTML is not useful
    var el = document.createElement('div');
    el.appendChild(node);
    // phantomjs omits the prefix, thus we can't find xlink:
    ok(el.innerHTML.indexOf('href="super-fun"') > 0);
    dom.setAttributeNS(node, xlinkNamespace, 'href', null);

    ok(el.innerHTML.indexOf('href="null"') > 0);
  });

  test('#getElementById', function () {
    var parentNode = dom.createElement('div'),
        childNode = dom.createElement('div');
    dom.setAttribute(parentNode, 'id', 'parent');
    dom.setAttribute(childNode, 'id', 'child');
    dom.appendChild(parentNode, childNode);
    dom.document.body.appendChild(parentNode);
    _htmlbarsTestHelpers.equalHTML(dom.getElementById('child'), '<div id="child"></div>');
    dom.document.body.removeChild(parentNode);
  });

  test('#setPropertyStrict', function () {
    var node = dom.createElement('div');
    dom.setPropertyStrict(node, 'id', 'super-tag');
    _htmlbarsTestHelpers.equalHTML(node, '<div id="super-tag"></div>');

    node = dom.createElement('input');
    ok(node.getAttribute('disabled') === disabledAbsentValue, 'precond: disabled is absent');
    dom.setPropertyStrict(node, 'disabled', true);
    ok(node.getAttribute('disabled') !== disabledAbsentValue, 'disabled is present');
    dom.setPropertyStrict(node, 'disabled', false);
    ok(node.getAttribute('disabled') === disabledAbsentValue, 'disabled has been removed');
  });

  // IE dislikes undefined or null for value
  test('#setPropertyStrict value', function () {
    var node = dom.createElement('input');
    dom.setPropertyStrict(node, 'value', undefined);
    equal(node.value, '', 'blank string is set for undefined');
    dom.setPropertyStrict(node, 'value', null);
    equal(node.value, '', 'blank string is set for undefined');
  });

  // IE dislikes undefined or null for type
  test('#setPropertyStrict type', function () {
    var node = dom.createElement('input');
    dom.setPropertyStrict(node, 'type', undefined);
    equal(node.type, 'text', 'text default is set for undefined');
    dom.setPropertyStrict(node, 'type', null);
    equal(node.type, 'text', 'text default is set for undefined');
  });

  // setting undefined or null to src makes a network request
  test('#setPropertyStrict src', function () {
    var node = dom.createElement('img');
    dom.setPropertyStrict(node, 'src', undefined);
    notEqual(node.src, undefined, 'blank string is set for undefined');
    dom.setPropertyStrict(node, 'src', null);
    notEqual(node.src, null, 'blank string is set for undefined');
  });

  test('#removeAttribute', function () {
    var node = dom.createElement('div');
    dom.setAttribute(node, 'id', 'super-tag');
    _htmlbarsTestHelpers.equalHTML(node, '<div id="super-tag"></div>', 'precond - attribute exists');

    dom.removeAttribute(node, 'id');
    _htmlbarsTestHelpers.equalHTML(node, '<div></div>', 'attribute was removed');
  });

  test('#removeAttribute of SVG', function () {
    dom.setNamespace(svgNamespace);
    var node = dom.createElement('svg');
    dom.setAttribute(node, 'viewBox', '0 0 100 100');
    _htmlbarsTestHelpers.equalHTML(node, '<svg viewBox="0 0 100 100"></svg>', 'precond - attribute exists');

    dom.removeAttribute(node, 'viewBox');
    _htmlbarsTestHelpers.equalHTML(node, '<svg></svg>', 'attribute was removed');
  });

  test('#setProperty', function () {
    var node = dom.createElement('div');
    dom.setProperty(node, 'id', 'super-tag');
    _htmlbarsTestHelpers.equalHTML(node, '<div id="super-tag"></div>');
    dom.setProperty(node, 'id', null);
    ok(node.getAttribute('id') !== 'super-tag', 'null property sets to the property');

    node = dom.createElement('div');
    dom.setProperty(node, 'data-fun', 'whoopie');
    _htmlbarsTestHelpers.equalHTML(node, '<div data-fun="whoopie"></div>');
    dom.setProperty(node, 'data-fun', null);
    _htmlbarsTestHelpers.equalHTML(node, '<div></div>', 'null attribute removes the attribute');

    node = dom.createElement('input');
    dom.setProperty(node, 'disabled', true);
    equal(node.disabled, true);
    dom.setProperty(node, 'disabled', false);
    equal(node.disabled, false);

    node = dom.createElement('div');
    dom.setProperty(node, 'style', 'color: red;');
    _htmlbarsTestHelpers.equalHTML(node, '<div style="color: red;"></div>');
  });

  test('#setProperty removes attr with undefined', function () {
    var node = dom.createElement('div');
    dom.setProperty(node, 'data-fun', 'whoopie');
    _htmlbarsTestHelpers.equalHTML(node, '<div data-fun="whoopie"></div>');
    dom.setProperty(node, 'data-fun', undefined);
    _htmlbarsTestHelpers.equalHTML(node, '<div></div>', 'undefined attribute removes the attribute');
  });

  test('#setProperty uses setAttribute for special non-compliant element props', function () {
    expect(6);

    var badPairs = [{ tagName: 'button', key: 'type', value: 'submit', selfClosing: false }, { tagName: 'input', key: 'type', value: 'x-not-supported', selfClosing: true }];

    badPairs.forEach(function (pair) {
      var node = dom.createElement(pair.tagName);
      var setAttribute = node.setAttribute;

      node.setAttribute = function (attrName, value) {
        equal(attrName, pair.key, 'setAttribute called with correct attrName');
        equal(value, pair.value, 'setAttribute called with correct value');
        return setAttribute.call(this, attrName, value);
      };

      dom.setProperty(node, pair.key, pair.value);

      // e.g. <button type="submit"></button>
      var expected = '<' + pair.tagName + ' ' + pair.key + '="' + pair.value + '">';
      if (pair.selfClosing === false) {
        expected += '</' + pair.tagName + '>';
      }

      _htmlbarsTestHelpers.equalHTML(node, expected, 'output html is correct');
    });
  });

  test('#addClasses', function () {
    var node = dom.createElement('div');
    dom.addClasses(node, ['super-fun']);
    equal(node.className, 'super-fun');
    dom.addClasses(node, ['super-fun']);
    equal(node.className, 'super-fun');
    dom.addClasses(node, ['super-blast']);
    equal(node.className, 'super-fun super-blast');
    dom.addClasses(node, ['bacon', 'ham']);
    equal(node.className, 'super-fun super-blast bacon ham');
  });

  test('#removeClasses', function () {
    var node = dom.createElement('div');
    node.setAttribute('class', 'this-class that-class');
    dom.removeClasses(node, ['this-class']);
    equal(node.className, 'that-class');
    dom.removeClasses(node, ['this-class']);
    equal(node.className, 'that-class');
    dom.removeClasses(node, ['that-class']);
    equal(node.className, '');
    node.setAttribute('class', 'woop moop jeep');
    dom.removeClasses(node, ['moop', 'jeep']);
    equal(node.className, 'woop');
  });

  test('#createElement of tr with contextual table element', function () {
    var tableElement = document.createElement('table'),
        node = dom.createElement('tr', tableElement);
    equal(node.tagName, 'TR');
    _htmlbarsTestHelpers.equalHTML(node, '<tr></tr>');
  });

  test('#createMorph has optional contextualElement', function () {
    var parent = document.createElement('div'),
        fragment = document.createDocumentFragment(),
        start = document.createTextNode(''),
        end = document.createTextNode(''),
        morph,
        thrown;

    try {
      morph = dom.createMorph(fragment, start, end, fragment);
    } catch (e) {
      thrown = true;
    }
    ok(thrown, 'Exception thrown when a fragment is provided for contextualElement');

    morph = dom.createMorph(fragment, start, end, parent);
    equal(morph.contextualElement, parent, "morph's contextualElement is parent");

    morph = dom.createMorph(parent, start, end);
    equal(morph.contextualElement, parent, "morph's contextualElement is parent");
  });

  test('#appendMorph', function () {
    var element = document.createElement('div');

    dom.appendText(element, 'a');
    var morph = dom.appendMorph(element);
    dom.appendText(element, 'c');

    morph.setContent('b');

    equal(element.innerHTML, 'abc');
  });

  test('#insertMorphBefore', function () {
    var element = document.createElement('div');

    dom.appendText(element, 'a');
    var c = dom.appendText(element, 'c');
    var morph = dom.insertMorphBefore(element, c);

    morph.setContent('b');

    equal(element.innerHTML, 'abc');
  });

  test('#parseHTML combinations', function () {
    var parsingCombinations = [
    // omitted start tags
    //
    ['table', '<tr><td>Yo</td></tr>', 'TR'], ['table', '<tbody><tr></tr></tbody>', 'TBODY'], ['table', '<col></col>', 'COL'],
    // elements with broken innerHTML in IE9 and down
    ['select', '<option></option>', 'OPTION'], ['colgroup', '<col></col>', 'COL'], ['tbody', '<tr></tr>', 'TR'], ['tfoot', '<tr></tr>', 'TR'], ['thead', '<tr></tr>', 'TR'], ['tr', '<td></td>', 'TD'], ['div', '<script></script>', 'SCRIPT']];

    var contextTag, content, expectedTagName, contextElement, nodes;
    for (var p = 0; p < parsingCombinations.length; p++) {
      contextTag = parsingCombinations[p][0];
      content = parsingCombinations[p][1];
      expectedTagName = parsingCombinations[p][2];

      contextElement = document.createElement(contextTag);
      nodes = dom.parseHTML(content, contextElement).childNodes;
      equal(nodes[0].tagName, expectedTagName, '#parseHTML of ' + content + ' returns a ' + expectedTagName + ' inside a ' + contextTag + ' context');
    }
  });

  test('#parseHTML of script then tr inside table context wraps the tr in a tbody', function () {
    var tableElement = document.createElement('table'),
        nodes = dom.parseHTML('<script></script><tr><td>Yo</td></tr>', tableElement).childNodes;
    // The HTML spec suggests the first item must be the child of
    // the omittable start tag. Here script is the first child, so no-go.
    equal(nodes.length, 2, 'Leading script tag corrupts');
    equal(nodes[0].tagName, 'SCRIPT');
    equal(nodes[1].tagName, 'TBODY');
  });

  test('#parseHTML of select allows the initial implicit option selection to remain', function () {
    var div = document.createElement('div');
    var select = dom.parseHTML('<select><option></option></select>', div).childNodes[0];

    ok(select.childNodes[0].selected, 'first element is selected');
  });

  test('#parseHTML of options removes an implicit selection', function () {
    var select = document.createElement('select');
    var options = dom.parseHTML('<option value="1"></option><option value="2"></option>', select).childNodes;

    ok(!options[0].selected, 'first element is not selected');
    ok(!options[1].selected, 'second element is not selected');
  });

  test('#parseHTML of options leaves an explicit first selection', function () {
    var select = document.createElement('select');
    var options = dom.parseHTML('<option value="1" selected></option><option value="2"></option>', select).childNodes;

    ok(options[0].selected, 'first element is selected');
    ok(!options[1].selected, 'second element is not selected');
  });

  test('#parseHTML of options leaves an explicit second selection', function () {
    var select = document.createElement('select');
    var options = dom.parseHTML('<option value="1"></option><option value="2" selected="selected"></option>', select).childNodes;

    ok(!options[0].selected, 'first element is not selected');
    ok(options[1].selected, 'second element is selected');
  });

  test('#parseHTML of script then tr inside tbody context', function () {
    var tbodyElement = document.createElement('tbody'),
        nodes = dom.parseHTML('<script></script><tr><td>Yo</td></tr>', tbodyElement).childNodes;
    equal(nodes.length, 2, 'Leading script tag corrupts');
    equal(nodes[0].tagName, 'SCRIPT');
    equal(nodes[1].tagName, 'TR');
  });

  test('#parseHTML with retains whitespace', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML('leading<script id="first"></script> <script id="second"></script><div><script></script> <script></script>, indeed.</div>', div).childNodes;
    equal(nodes[0].data, 'leading');
    equal(nodes[1].tagName, 'SCRIPT');
    equal(nodes[2].data, ' ');
    equal(nodes[3].tagName, 'SCRIPT');
    equal(nodes[4].tagName, 'DIV');
    equal(nodes[4].childNodes[0].tagName, 'SCRIPT');
    equal(nodes[4].childNodes[1].data, ' ');
    equal(nodes[4].childNodes[2].tagName, 'SCRIPT');
    equal(nodes[4].childNodes[3].data, ', indeed.');
  });

  test('#parseHTML with retains whitespace of top element', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML('<span>hello <script id="first"></script> yeah</span>', div).childNodes;
    equal(nodes[0].tagName, 'SPAN');
    _htmlbarsTestHelpers.equalHTML(nodes, '<span>hello <script id="first"></script> yeah</span>');
  });

  test('#parseHTML with retains whitespace after script', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML('<span>hello</span><script id="first"></script><span><script></script> kwoop</span>', div).childNodes;
    equal(nodes[0].tagName, 'SPAN');
    equal(nodes[1].tagName, 'SCRIPT');
    equal(nodes[2].tagName, 'SPAN');
    _htmlbarsTestHelpers.equalHTML(nodes, '<span>hello</span><script id="first"></script><span><script></script> kwoop</span>');
  });

  test('#parseHTML of number', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML(5, div).childNodes;
    equal(nodes[0].data, '5');
    _htmlbarsTestHelpers.equalHTML(nodes, '5');
  });

  test('#protocolForURL', function () {
    var protocol = dom.protocolForURL("http://www.emberjs.com");
    equal(protocol, "http:");

    // Inherit protocol from document if unparseable
    protocol = dom.protocolForURL("   javascript:lulzhacked()");
    /*jshint scripturl:true*/
    equal(protocol, "javascript:");
  });

  test('#cloneNode shallow', function () {
    var divElement = document.createElement('div');

    divElement.appendChild(document.createElement('span'));

    var node = dom.cloneNode(divElement, false);

    equal(node.tagName, 'DIV');
    _htmlbarsTestHelpers.equalHTML(node, '<div></div>');
  });

  test('#cloneNode deep', function () {
    var divElement = document.createElement('div');

    divElement.appendChild(document.createElement('span'));

    var node = dom.cloneNode(divElement, true);

    equal(node.tagName, 'DIV');
    _htmlbarsTestHelpers.equalHTML(node, '<div><span></span></div>');
  });

  test('dom node has empty text after cloning and ensuringBlankTextNode', function () {
    var div = document.createElement('div');

    div.appendChild(document.createTextNode(''));

    var clonedDiv = dom.cloneNode(div, true);

    equal(clonedDiv.nodeType, 1);
    _htmlbarsTestHelpers.equalHTML(clonedDiv, '<div></div>');
    // IE's native cloneNode drops blank string text
    // nodes. Assert repairClonedNode brings back the blank
    // text node.
    dom.repairClonedNode(clonedDiv, [0]);
    equal(clonedDiv.childNodes.length, 1);
    equal(clonedDiv.childNodes[0].nodeType, 3);
  });

  test('dom node has empty start text after cloning and ensuringBlankTextNode', function () {
    var div = document.createElement('div');

    div.appendChild(document.createTextNode(''));
    div.appendChild(document.createElement('span'));

    var clonedDiv = dom.cloneNode(div, true);

    equal(clonedDiv.nodeType, 1);
    _htmlbarsTestHelpers.equalHTML(clonedDiv, '<div><span></span></div>');
    // IE's native cloneNode drops blank string text
    // nodes. Assert denormalizeText brings back the blank
    // text node.
    dom.repairClonedNode(clonedDiv, [0]);
    equal(clonedDiv.childNodes.length, 2);
    equal(clonedDiv.childNodes[0].nodeType, 3);
  });

  test('dom node checked after cloning and ensuringChecked', function () {
    var input = document.createElement('input');

    input.setAttribute('checked', 'checked');
    ok(input.checked, 'input is checked');

    var clone = dom.cloneNode(input, false);

    // IE's native cloneNode copies checked attributes but
    // not the checked property of the DOM node.
    dom.repairClonedNode(clone, [], true);

    _htmlbarsTestHelpers.isCheckedInputHTML(clone, '<input checked="checked">');
    ok(clone.checked, 'clone is checked');
  });

  if ('namespaceURI' in document.createElement('div')) {

    QUnit.module('DOM Helper namespaces', {
      beforeEach: function () {
        dom = new _domHelper.default();
      },
      afterEach: function () {
        dom = null;
      }
    });

    test('#createElement div is xhtml', function () {
      var node = dom.createElement('div');
      equal(node.namespaceURI, xhtmlNamespace);
    });

    test('#createElement of svg with svg namespace', function () {
      dom.setNamespace(svgNamespace);
      var node = dom.createElement('svg');
      equal(node.tagName, 'svg');
      equal(node.namespaceURI, svgNamespace);
    });

    test('#createElement of path with detected svg contextual element', function () {
      dom.setNamespace(svgNamespace);
      var node = dom.createElement('path');
      equal(node.tagName, 'path');
      equal(node.namespaceURI, svgNamespace);
    });

    test('#createElement of path with svg contextual element', function () {
      var node = dom.createElement('path', document.createElementNS(svgNamespace, 'svg'));
      equal(node.tagName, 'path');
      equal(node.namespaceURI, svgNamespace);
    });

    test('#createElement of svg with div namespace', function () {
      var node = dom.createElement('svg', document.createElement('div'));
      equal(node.tagName, 'svg');
      equal(node.namespaceURI, svgNamespace);
    });

    test('#getElementById with different root node', function () {
      var doc = document.implementation.createDocument(xhtmlNamespace, 'html', null),
          body = document.createElementNS(xhtmlNamespace, 'body'),
          parentNode = dom.createElement('div'),
          childNode = dom.createElement('div');

      doc.documentElement.appendChild(body);
      dom.setAttribute(parentNode, 'id', 'parent');
      dom.setAttribute(childNode, 'id', 'child');
      dom.appendChild(parentNode, childNode);
      dom.appendChild(body, parentNode);
      _htmlbarsTestHelpers.equalHTML(dom.getElementById('child', doc), '<div id="child"></div>');
    });

    test('#setProperty with namespaced attributes', function () {
      var node;

      dom.setNamespace(svgNamespace);
      node = dom.createElement('svg');
      dom.setProperty(node, 'viewBox', '0 0 0 0');
      _htmlbarsTestHelpers.equalHTML(node, '<svg viewBox="0 0 0 0"></svg>');

      dom.setProperty(node, 'xlink:title', 'super-blast', xlinkNamespace);
      // chrome adds (xmlns:xlink="http://www.w3.org/1999/xlink") property while others don't
      // thus equalHTML is not useful
      var el = document.createElement('div');
      el.appendChild(node);
      // phantom js omits the prefix so we can't look for xlink:
      ok(el.innerHTML.indexOf('title="super-blast"') > 0);

      dom.setProperty(node, 'xlink:title', null, xlinkNamespace);
      equal(node.getAttribute('xlink:title'), null, 'ns attr is removed');
    });

    test("#setProperty removes namespaced attr with undefined", function () {
      var node;

      node = dom.createElement('svg');
      dom.setProperty(node, 'xlink:title', 'Great Title', xlinkNamespace);
      dom.setProperty(node, 'xlink:title', undefined, xlinkNamespace);
      equal(node.getAttribute('xlink:title'), undefined, 'ns attr is removed');
    });

    for (i = 0; i < foreignNamespaces.length; i++) {
      foreignNamespace = foreignNamespaces[i];

      test('#createElement of div with ' + foreignNamespace + ' contextual element', function () {
        var node = dom.createElement('div', document.createElementNS(svgNamespace, foreignNamespace));
        equal(node.tagName, 'DIV');
        equal(node.namespaceURI, xhtmlNamespace);
      }); // jshint ignore:line

      test('#parseHTML of div with ' + foreignNamespace, function () {
        dom.setNamespace(xhtmlNamespace);
        var foreignObject = document.createElementNS(svgNamespace, foreignNamespace),
            nodes = dom.parseHTML('<div></div>', foreignObject).childNodes;
        equal(nodes[0].tagName, 'DIV');
        equal(nodes[0].namespaceURI, xhtmlNamespace);
      }); // jshint ignore:line
    }

    test('#parseHTML of path with svg contextual element', function () {
      dom.setNamespace(svgNamespace);
      var svgElement = document.createElementNS(svgNamespace, 'svg'),
          nodes = dom.parseHTML('<path></path>', svgElement).childNodes;
      equal(nodes[0].tagName, 'path');
      equal(nodes[0].namespaceURI, svgNamespace);
    });

    test('#parseHTML of stop with linearGradient contextual element', function () {
      dom.setNamespace(svgNamespace);
      var svgElement = document.createElementNS(svgNamespace, 'linearGradient'),
          nodes = dom.parseHTML('<stop />', svgElement).childNodes;
      equal(nodes[0].tagName, 'stop');
      equal(nodes[0].namespaceURI, svgNamespace);
    });

    test('#addClasses on SVG', function () {
      var node = document.createElementNS(svgNamespace, 'svg');
      dom.addClasses(node, ['super-fun']);
      equal(node.getAttribute('class'), 'super-fun');
      dom.addClasses(node, ['super-fun']);
      equal(node.getAttribute('class'), 'super-fun');
      dom.addClasses(node, ['super-blast']);
      equal(node.getAttribute('class'), 'super-fun super-blast');
    });

    test('#removeClasses on SVG', function () {
      var node = document.createElementNS(svgNamespace, 'svg');
      node.setAttribute('class', 'this-class that-class');
      dom.removeClasses(node, ['this-class']);
      equal(node.getAttribute('class'), 'that-class');
      dom.removeClasses(node, ['this-class']);
      equal(node.getAttribute('class'), 'that-class');
      dom.removeClasses(node, ['that-class']);
      equal(node.getAttribute('class'), '');
    });
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBTUEsTUFBSSxjQUFjLEdBQUcsOEJBQThCO01BQy9DLGNBQWMsR0FBRyw4QkFBOEI7TUFDL0MsWUFBWSxHQUFLLDRCQUE0QixDQUFDOztBQUVsRCxNQUFJLGlCQUFpQixHQUFHLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQzs7QUFFM0QsTUFBSSxHQUFHLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixDQUFDOzs7O0FBSTdCLE1BQUksbUJBQW1CLEdBQUcsQ0FBQyxZQUFXO0FBQ3BDLFFBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUMsV0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0dBQ3JDLENBQUEsRUFBRyxDQUFDOztBQUVMLE9BQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQ3pCLGNBQVUsRUFBRSxZQUFXO0FBQ3JCLFNBQUcsR0FBRyx3QkFBZSxDQUFDO0tBQ3ZCO0FBQ0QsYUFBUyxFQUFFLFlBQVc7QUFDcEIsU0FBRyxHQUFHLElBQUksQ0FBQztLQUNaO0dBQ0YsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxnQkFBZ0IsRUFBRSxZQUFVO0FBQy9CLFFBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEMsU0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDM0IseUJBL0JBLFNBQVMsQ0ErQkMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0dBQ2hDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsZUFBZSxFQUFFLFlBQVc7QUFDL0IsUUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFcEMsUUFBSSxNQUFNLEdB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QUM1RCxDQUFDLENBQUM7O0FBRUgsUUFBSSxDQUFDLHVCQUF1QixFQUFFLFlBQVU7QUFDdEMsVUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDekQsVUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztBQUNwRCxTQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDeEMsV0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDaEQsU0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLFdBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ2hELFNBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUN4QyxXQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUN2QyxDQUFDLENBQUM7R0FHRiIsImZpbGUiOiJkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXItdGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBET01IZWxwZXIgZnJvbSBcIi4uL2RvbS1oZWxwZXJcIjtcbmltcG9ydCB7XG4gIGVxdWFsSFRNTCxcbiAgaXNDaGVja2VkSW5wdXRIVE1MXG59IGZyb20gXCIuLi9odG1sYmFycy10ZXN0LWhlbHBlcnNcIjtcblxudmFyIHhodG1sTmFtZXNwYWNlID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsXG4gICAgeGxpbmtOYW1lc3BhY2UgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcbiAgICBzdmdOYW1lc3BhY2UgICA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcblxudmFyIGZvcmVpZ25OYW1lc3BhY2VzID0gWydmb3JlaWduT2JqZWN0JywgJ2Rlc2MnLCAndGl0bGUnXTtcblxudmFyIGRvbSwgaSwgZm9yZWlnbk5hbWVzcGFjZTtcblxuLy8gZ2V0QXR0cmlidXRlcyBtYXkgcmV0dXJuIG51bGwgb3IgXCJcIiBmb3Igbm9uZXhpc3RlbnQgYXR0cmlidXRlcyxcbi8vIGRlcGVuZGluZyBvbiB0aGUgYnJvd3Nlci4gIFNvIHdlIGZpbmQgaXQgb3V0IGhlcmUgYW5kIHVzZSBpdCBsYXRlci5cbnZhciBkaXNhYmxlZEFic2VudFZhbHVlID0gKGZ1bmN0aW9uICgpe1xuICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICByZXR1cm4gZGl2LmdldEF0dHJpYnV0ZShcImRpc2FibGVkXCIpO1xufSkoKTtcblxuUVVuaXQubW9kdWxlKCdET00gSGVscGVyJywge1xuICBiZWZvcmVFYWNoOiBmdW5jdGlvbigpIHtcbiAgICBkb20gPSBuZXcgRE9NSGVscGVyKCk7XG4gIH0sXG4gIGFmdGVyRWFjaDogZnVuY3Rpb24oKSB7XG4gICAgZG9tID0gbnVsbDtcbiAgfVxufSk7XG5cbnRlc3QoJyNjcmVhdGVFbGVtZW50JywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVxdWFsKG5vZGUudGFnTmFtZSwgJ0RJVicpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXY+PC9kaXY+Jyk7XG59KTtcblxudGVzdCgnI2NoaWxkQXRJbmRleCcsIGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICB2YXIgY2hpbGQxID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgdmFyIGNoaWxkMiA9IGRvbS5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblxuICBzdHJpY3RFcXVhbChkb20uY2hpbGRBdEluZGV4KG5vZGUsIDApLCBudWxsKTtcbiAgc3RyaWN0RXF1YWwoZG9tLmNoaWxkQXRJbmRleChub2RlLCAxKSwgbnVsbCk7XG4gIHN0cmljdEVxdWFsKGRvbS5jaGlsZEF0SW5kZXgobm9kZSwgMiksIG51bGwpO1xuXG4gIGRvbS5hcHBlbmRDaGlsZChub2RlLCBjaGlsZDEpO1xuICBzdHJpY3RFcXVhbChkb20uY2hpbGRBdEluZGV4KG5vZGUsIDApLnRhZ05hbWUsICdQJyk7XG4gIHN0cmljdEVxdWFsKGRvbS5jaGlsZEF0SW5kZXgobm9kZSwgMSksIG51bGwpO1xuICBzdHJpY3RFcXVhbChkb20uY2hpbGRBdEluZGV4KG5vZGUsIDIpLCBudWxsKTtcblxuICBkb20uaW5zZXJ0QmVmb3JlKG5vZGUsIGNoaWxkMiwgY2hpbGQxKTtcbiAgc3RyaWN0RXF1YWwoZG9tLmNoaWxkQXRJbmRleChub2RlLCAwKS50YWdOYW1lLCAnSU1HJyk7XG4gIHN0cmljdEVxdWFsKGRvbS5jaGlsZEF0SW5kZXgobm9kZSwgMSkudGFnTmFtZSwgJ1AnKTtcbiAgc3RyaWN0RXF1YWwoZG9tLmNoaWxkQXRJbmRleChub2RlLCAyKSwgbnVsbCk7XG59KTtcblxudGVzdCgnI2FwcGVuZFRleHQgYWRkcyB0ZXh0JywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHZhciB0ZXh0ID0gZG9tLmFwcGVuZFRleHQobm9kZSwgJ0hvd2R5Jyk7XG4gIG9rKCEhdGV4dCwgJ3JldHVybnMgbm9kZScpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXY+SG93ZHk8L2Rpdj4nKTtcbn0pO1xuXG50ZXN0KCcjc2V0QXR0cmlidXRlJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRvbS5zZXRBdHRyaWJ1dGUobm9kZSwgJ2lkJywgJ3N1cGVyLXRhZycpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXYgaWQ9XCJzdXBlci10YWdcIj48L2Rpdj4nKTtcbiAgZG9tLnNldEF0dHJpYnV0ZShub2RlLCAnaWQnLCBudWxsKTtcbiAgZXF1YWxIVE1MKG5vZGUsICc8ZGl2IGlkPVwibnVsbFwiPjwvZGl2PicpO1xuXG4gIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgb2sobm9kZS5nZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgPT09IGRpc2FibGVkQWJzZW50VmFsdWUsICdwcmVjb25kOiBkaXNhYmxlZCBpcyBhYnNlbnQnKTtcbiAgZG9tLnNldEF0dHJpYnV0ZShub2RlLCAnZGlzYWJsZWQnLCB0cnVlKTtcbiAgb2sobm9kZS5nZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgIT09IGRpc2FibGVkQWJzZW50VmFsdWUsICdkaXNhYmxlZCBzZXQgdG8gdHJ1ZSBpcyBwcmVzZW50Jyk7XG4gIGRvbS5zZXRBdHRyaWJ1dGUobm9kZSwgJ2Rpc2FibGVkJywgZmFsc2UpO1xuICBvayhub2RlLmdldEF0dHJpYnV0ZSgnZGlzYWJsZWQnKSAhPT0gZGlzYWJsZWRBYnNlbnRWYWx1ZSwgJ2Rpc2FibGVkIHNldCB0byBmYWxzZSBpcyBwcmVzZW50Jyk7XG59KTtcblxudGVzdCgnI3NldEF0dHJpYnV0ZU5TJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnc3ZnJyk7XG4gIGRvbS5zZXRBdHRyaWJ1dGVOUyhub2RlLCB4bGlua05hbWVzcGFjZSwgJ3hsaW5rOmhyZWYnLCAnc3VwZXItZnVuJyk7XG4gIC8vIGNocm9tZSBhZGRzICh4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIikgcHJvcGVydHkgd2hpbGUgb3RoZXJzIGRvbid0XG4gIC8vIHRodXMgZXF1YWxIVE1MIGlzIG5vdCB1c2VmdWxcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICAvLyBwaGFudG9tanMgb21pdHMgdGhlIHByZWZpeCwgdGh1cyB3ZSBjYW4ndCBmaW5kIHhsaW5rOlxuICBvayhlbC5pbm5lckhUTUwuaW5kZXhPZignaHJlZj1cInN1cGVyLWZ1blwiJykgPiAwKTtcbiAgZG9tLnNldEF0dHJpYnV0ZU5TKG5vZGUsIHhsaW5rTmFtZXNwYWNlLCAnaHJlZicsIG51bGwpO1xuXG4gIG9rKGVsLmlubmVySFRNTC5pbmRleE9mKCdocmVmPVwibnVsbFwiJykgPiAwKTtcblxufSk7XG5cbnRlc3QoJyNnZXRFbGVtZW50QnlJZCcsIGZ1bmN0aW9uKCkge1xuICB2YXIgcGFyZW50Tm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgIGNoaWxkTm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZG9tLnNldEF0dHJpYnV0ZShwYXJlbnROb2RlLCAnaWQnLCAncGFyZW50Jyk7XG4gIGRvbS5zZXRBdHRyaWJ1dGUoY2hpbGROb2RlLCAnaWQnLCAnY2hpbGQnKTtcbiAgZG9tLmFwcGVuZENoaWxkKHBhcmVudE5vZGUsIGNoaWxkTm9kZSk7XG4gIGRvbS5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHBhcmVudE5vZGUpO1xuICBlcXVhbEhUTUwoZG9tLmdldEVsZW1lbnRCeUlkKCdjaGlsZCcpLCAnPGRpdiBpZD1cImNoaWxkXCI+PC9kaXY+Jyk7XG4gIGRvbS5kb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHBhcmVudE5vZGUpO1xufSk7XG5cbnRlc3QoJyNzZXRQcm9wZXJ0eVN0cmljdCcsIGZ1bmN0aW9uKCl7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkb20uc2V0UHJvcGVydHlTdHJpY3Qobm9kZSwgJ2lkJywgJ3N1cGVyLXRhZycpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXYgaWQ9XCJzdXBlci10YWdcIj48L2Rpdj4nKTtcblxuICBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIG9rKG5vZGUuZ2V0QXR0cmlidXRlKCdkaXNhYmxlZCcpID09PSBkaXNhYmxlZEFic2VudFZhbHVlLCAncHJlY29uZDogZGlzYWJsZWQgaXMgYWJzZW50Jyk7XG4gIGRvbS5zZXRQcm9wZXJ0eVN0cmljdChub2RlLCAnZGlzYWJsZWQnLCB0cnVlKTtcbiAgb2sobm9kZS5nZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgIT09IGRpc2FibGVkQWJzZW50VmFsdWUsICdkaXNhYmxlZCBpcyBwcmVzZW50Jyk7XG4gIGRvbS5zZXRQcm9wZXJ0eVN0cmljdChub2RlLCAnZGlzYWJsZWQnLCBmYWxzZSk7XG4gIG9rKG5vZGUuZ2V0QXR0cmlidXRlKCdkaXNhYmxlZCcpID09PSBkaXNhYmxlZEFic2VudFZhbHVlLCAnZGlzYWJsZWQgaGFzIGJlZW4gcmVtb3ZlZCcpO1xufSk7XG5cbi8vIElFIGRpc2xpa2VzIHVuZGVmaW5lZCBvciBudWxsIGZvciB2YWx1ZVxudGVzdCgnI3NldFByb3BlcnR5U3RyaWN0IHZhbHVlJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgZG9tLnNldFByb3BlcnR5U3RyaWN0KG5vZGUsICd2YWx1ZScsIHVuZGVmaW5lZCk7XG4gIGVxdWFsKG5vZGUudmFsdWUsICcnLCAnYmxhbmsgc3RyaW5nIGlzIHNldCBmb3IgdW5kZWZpbmVkJyk7XG4gIGRvbS5zZXRQcm9wZXJ0eVN0cmljdChub2RlLCAndmFsdWUnLCBudWxsKTtcbiAgZXF1YWwobm9kZS52YWx1ZSwgJycsICdibGFuayBzdHJpbmcgaXMgc2V0IGZvciB1bmRlZmluZWQnKTtcbn0pO1xuXG4vLyBJRSBkaXNsaWtlcyB1bmRlZmluZWQgb3IgbnVsbCBmb3IgdHlwZVxudGVzdCgnI3NldFByb3BlcnR5U3RyaWN0IHR5cGUnLCBmdW5jdGlvbigpe1xuICB2YXIgbm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICBkb20uc2V0UHJvcGVydHlTdHJpY3Qobm9kZSwgJ3R5cGUnLCB1bmRlZmluZWQpO1xuICBlcXVhbChub2RlLnR5cGUsICd0ZXh0JywgJ3RleHQgZGVmYXVsdCBpcyBzZXQgZm9yIHVuZGVmaW5lZCcpO1xuICBkb20uc2V0UHJvcGVydHlTdHJpY3Qobm9kZSwgJ3R5cGUnLCBudWxsKTtcbiAgZXF1YWwobm9kZS50eXBlLCAndGV4dCcsICd0ZXh0IGRlZmF1bHQgaXMgc2V0IGZvciB1bmRlZmluZWQnKTtcbn0pO1xuXG4vLyBzZXR0aW5nIHVuZGVmaW5lZCBvciBudWxsIHRvIHNyYyBtYWtlcyBhIG5ldHdvcmsgcmVxdWVzdFxudGVzdCgnI3NldFByb3BlcnR5U3RyaWN0IHNyYycsIGZ1bmN0aW9uKCl7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBkb20uc2V0UHJvcGVydHlTdHJpY3Qobm9kZSwgJ3NyYycsIHVuZGVmaW5lZCk7XG4gIG5vdEVxdWFsKG5vZGUuc3JjLCB1bmRlZmluZWQsICdibGFuayBzdHJpbmcgaXMgc2V0IGZvciB1bmRlZmluZWQnKTtcbiAgZG9tLnNldFByb3BlcnR5U3RyaWN0KG5vZGUsICdzcmMnLCBudWxsKTtcbiAgbm90RXF1YWwobm9kZS5zcmMsIG51bGwsICdibGFuayBzdHJpbmcgaXMgc2V0IGZvciB1bmRlZmluZWQnKTtcbn0pO1xuXG50ZXN0KCcjcmVtb3ZlQXR0cmlidXRlJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRvbS5zZXRBdHRyaWJ1dGUobm9kZSwgJ2lkJywgJ3N1cGVyLXRhZycpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXYgaWQ9XCJzdXBlci10YWdcIj48L2Rpdj4nLCAncHJlY29uZCAtIGF0dHJpYnV0ZSBleGlzdHMnKTtcblxuICBkb20ucmVtb3ZlQXR0cmlidXRlKG5vZGUsICdpZCcpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXY+PC9kaXY+JywgJ2F0dHJpYnV0ZSB3YXMgcmVtb3ZlZCcpO1xufSk7XG5cbnRlc3QoJyNyZW1vdmVBdHRyaWJ1dGUgb2YgU1ZHJywgZnVuY3Rpb24oKXtcbiAgZG9tLnNldE5hbWVzcGFjZShzdmdOYW1lc3BhY2UpO1xuICB2YXIgbm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdzdmcnKTtcbiAgZG9tLnNldEF0dHJpYnV0ZShub2RlLCAndmlld0JveCcsICcwIDAgMTAwIDEwMCcpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxzdmcgdmlld0JveD1cIjAgMCAxMDAgMTAwXCI+PC9zdmc+JywgJ3ByZWNvbmQgLSBhdHRyaWJ1dGUgZXhpc3RzJyk7XG5cbiAgZG9tLnJlbW92ZUF0dHJpYnV0ZShub2RlLCAndmlld0JveCcpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxzdmc+PC9zdmc+JywgJ2F0dHJpYnV0ZSB3YXMgcmVtb3ZlZCcpO1xufSk7XG5cbnRlc3QoJyNzZXRQcm9wZXJ0eScsIGZ1bmN0aW9uKCl7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkb20uc2V0UHJvcGVydHkobm9kZSwgJ2lkJywgJ3N1cGVyLXRhZycpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXYgaWQ9XCJzdXBlci10YWdcIj48L2Rpdj4nKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICdpZCcsIG51bGwpO1xuICBvayhub2RlLmdldEF0dHJpYnV0ZSgnaWQnKSAhPT0gJ3N1cGVyLXRhZycsICdudWxsIHByb3BlcnR5IHNldHMgdG8gdGhlIHByb3BlcnR5Jyk7XG5cbiAgbm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICdkYXRhLWZ1bicsICd3aG9vcGllJyk7XG4gIGVxdWFsSFRNTChub2RlLCAnPGRpdiBkYXRhLWZ1bj1cIndob29waWVcIj48L2Rpdj4nKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICdkYXRhLWZ1bicsIG51bGwpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXY+PC9kaXY+JywgJ251bGwgYXR0cmlidXRlIHJlbW92ZXMgdGhlIGF0dHJpYnV0ZScpO1xuXG4gIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICdkaXNhYmxlZCcsIHRydWUpO1xuICBlcXVhbChub2RlLmRpc2FibGVkLCB0cnVlKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgZXF1YWwobm9kZS5kaXNhYmxlZCwgZmFsc2UpO1xuXG4gIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRvbS5zZXRQcm9wZXJ0eShub2RlLCAnc3R5bGUnLCAnY29sb3I6IHJlZDsnKTtcbiAgZXF1YWxIVE1MKG5vZGUsICc8ZGl2IHN0eWxlPVwiY29sb3I6IHJlZDtcIj48L2Rpdj4nKTtcbn0pO1xuXG50ZXN0KCcjc2V0UHJvcGVydHkgcmVtb3ZlcyBhdHRyIHdpdGggdW5kZWZpbmVkJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRvbS5zZXRQcm9wZXJ0eShub2RlLCAnZGF0YS1mdW4nLCAnd2hvb3BpZScpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXYgZGF0YS1mdW49XCJ3aG9vcGllXCI+PC9kaXY+Jyk7XG4gIGRvbS5zZXRQcm9wZXJ0eShub2RlLCAnZGF0YS1mdW4nLCB1bmRlZmluZWQpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXY+PC9kaXY+JywgJ3VuZGVmaW5lZCBhdHRyaWJ1dGUgcmVtb3ZlcyB0aGUgYXR0cmlidXRlJyk7XG59KTtcblxudGVzdCgnI3NldFByb3BlcnR5IHVzZXMgc2V0QXR0cmlidXRlIGZvciBzcGVjaWFsIG5vbi1jb21wbGlhbnQgZWxlbWVudCBwcm9wcycsIGZ1bmN0aW9uKCkge1xuICBleHBlY3QoNik7XG5cbiAgdmFyIGJhZFBhaXJzID0gW1xuICAgIHsgdGFnTmFtZTogJ2J1dHRvbicsIGtleTogJ3R5cGUnLCB2YWx1ZTogJ3N1Ym1pdCcsIHNlbGZDbG9zaW5nOiBmYWxzZSB9LFxuICAgIHsgdGFnTmFtZTogJ2lucHV0Jywga2V5OiAndHlwZScsIHZhbHVlOiAneC1ub3Qtc3VwcG9ydGVkJywgc2VsZkNsb3Npbmc6IHRydWUgfVxuICBdO1xuXG4gIGJhZFBhaXJzLmZvckVhY2goZnVuY3Rpb24ocGFpcikge1xuICAgIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQocGFpci50YWdOYW1lKTtcbiAgICB2YXIgc2V0QXR0cmlidXRlID0gbm9kZS5zZXRBdHRyaWJ1dGU7XG5cbiAgICBub2RlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKGF0dHJOYW1lLCB2YWx1ZSkge1xuICAgICAgZXF1YWwoYXR0ck5hbWUsIHBhaXIua2V5LCAnc2V0QXR0cmlidXRlIGNhbGxlZCB3aXRoIGNvcnJlY3QgYXR0ck5hbWUnKTtcbiAgICAgIGVxdWFsKHZhbHVlLCBwYWlyLnZhbHVlLCAnc2V0QXR0cmlidXRlIGNhbGxlZCB3aXRoIGNvcnJlY3QgdmFsdWUnKTtcbiAgICAgIHJldHVybiBzZXRBdHRyaWJ1dGUuY2FsbCh0aGlzLCBhdHRyTmFtZSwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBkb20uc2V0UHJvcGVydHkobm9kZSwgcGFpci5rZXksIHBhaXIudmFsdWUpO1xuXG4gICAgLy8gZS5nLiA8YnV0dG9uIHR5cGU9XCJzdWJtaXRcIj48L2J1dHRvbj5cbiAgICB2YXIgZXhwZWN0ZWQgPSAnPCcgKyBwYWlyLnRhZ05hbWUgKyAnICcgKyBwYWlyLmtleSArICc9XCInICsgcGFpci52YWx1ZSArICdcIj4nO1xuICAgIGlmIChwYWlyLnNlbGZDbG9zaW5nID09PSBmYWxzZSkge1xuICAgICAgZXhwZWN0ZWQgKz0gJzwvJyArIHBhaXIudGFnTmFtZSArICc+JztcbiAgICB9XG5cbiAgICBlcXVhbEhUTUwobm9kZSwgZXhwZWN0ZWQsICdvdXRwdXQgaHRtbCBpcyBjb3JyZWN0Jyk7XG4gIH0pO1xufSk7XG5cbnRlc3QoJyNhZGRDbGFzc2VzJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRvbS5hZGRDbGFzc2VzKG5vZGUsIFsnc3VwZXItZnVuJ10pO1xuICBlcXVhbChub2RlLmNsYXNzTmFtZSwgJ3N1cGVyLWZ1bicpO1xuICBkb20uYWRkQ2xhc3Nlcyhub2RlLCBbJ3N1cGVyLWZ1biddKTtcbiAgZXF1YWwobm9kZS5jbGFzc05hbWUsICdzdXBlci1mdW4nKTtcbiAgZG9tLmFkZENsYXNzZXMobm9kZSwgWydzdXBlci1ibGFzdCddKTtcbiAgZXF1YWwobm9kZS5jbGFzc05hbWUsICdzdXBlci1mdW4gc3VwZXItYmxhc3QnKTtcbiAgZG9tLmFkZENsYXNzZXMobm9kZSwgWydiYWNvbicsICdoYW0nXSk7XG4gIGVxdWFsKG5vZGUuY2xhc3NOYW1lLCAnc3VwZXItZnVuIHN1cGVyLWJsYXN0IGJhY29uIGhhbScpO1xufSk7XG5cbnRlc3QoJyNyZW1vdmVDbGFzc2VzJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG5vZGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aGlzLWNsYXNzIHRoYXQtY2xhc3MnKTtcbiAgZG9tLnJlbW92ZUNsYXNzZXMobm9kZSwgWyd0aGlzLWNsYXNzJ10pO1xuICBlcXVhbChub2RlLmNsYXNzTmFtZSwgJ3RoYXQtY2xhc3MnKTtcbiAgZG9tLnJlbW92ZUNsYXNzZXMobm9kZSwgWyd0aGlzLWNsYXNzJ10pO1xuICBlcXVhbChub2RlLmNsYXNzTmFtZSwgJ3RoYXQtY2xhc3MnKTtcbiAgZG9tLnJlbW92ZUNsYXNzZXMobm9kZSwgWyd0aGF0LWNsYXNzJ10pO1xuICBlcXVhbChub2RlLmNsYXNzTmFtZSwgJycpO1xuICBub2RlLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnd29vcCBtb29wIGplZXAnKTtcbiAgZG9tLnJlbW92ZUNsYXNzZXMobm9kZSwgWydtb29wJywgJ2plZXAnXSk7XG4gIGVxdWFsKG5vZGUuY2xhc3NOYW1lLCAnd29vcCcpO1xufSk7XG5cbnRlc3QoJyNjcmVhdGVFbGVtZW50IG9mIHRyIHdpdGggY29udGV4dHVhbCB0YWJsZSBlbGVtZW50JywgZnVuY3Rpb24oKXtcbiAgdmFyIHRhYmxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyksXG4gICAgICBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ3RyJywgdGFibGVFbGVtZW50KTtcbiAgZXF1YWwobm9kZS50YWdOYW1lLCAnVFInKTtcbiAgZXF1YWxIVE1MKG5vZGUsICc8dHI+PC90cj4nKTtcbn0pO1xuXG50ZXN0KCcjY3JlYXRlTW9ycGggaGFzIG9wdGlvbmFsIGNvbnRleHR1YWxFbGVtZW50JywgZnVuY3Rpb24oKXtcbiAgdmFyIHBhcmVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG4gICAgICBzdGFydCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSxcbiAgICAgIGVuZCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSxcbiAgICAgIG1vcnBoLCB0aHJvd247XG5cbiAgdHJ5IHtcbiAgICBtb3JwaCA9IGRvbS5jcmVhdGVNb3JwaChmcmFnbWVudCwgc3RhcnQsIGVuZCwgZnJhZ21lbnQpO1xuICB9IGNhdGNoKGUpIHtcbiAgICB0aHJvd24gPSB0cnVlO1xuICB9XG4gIG9rKHRocm93biwgJ0V4Y2VwdGlvbiB0aHJvd24gd2hlbiBhIGZyYWdtZW50IGlzIHByb3ZpZGVkIGZvciBjb250ZXh0dWFsRWxlbWVudCcpO1xuXG4gIG1vcnBoID0gZG9tLmNyZWF0ZU1vcnBoKGZyYWdtZW50LCBzdGFydCwgZW5kLCBwYXJlbnQpO1xuICBlcXVhbChtb3JwaC5jb250ZXh0dWFsRWxlbWVudCwgcGFyZW50LCBcIm1vcnBoJ3MgY29udGV4dHVhbEVsZW1lbnQgaXMgcGFyZW50XCIpO1xuXG4gIG1vcnBoID0gZG9tLmNyZWF0ZU1vcnBoKHBhcmVudCwgc3RhcnQsIGVuZCk7XG4gIGVxdWFsKG1vcnBoLmNvbnRleHR1YWxFbGVtZW50LCBwYXJlbnQsIFwibW9ycGgncyBjb250ZXh0dWFsRWxlbWVudCBpcyBwYXJlbnRcIik7XG59KTtcblxudGVzdCgnI2FwcGVuZE1vcnBoJywgZnVuY3Rpb24oKXtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBkb20uYXBwZW5kVGV4dChlbGVtZW50LCAnYScpO1xuICB2YXIgbW9ycGggPSBkb20uYXBwZW5kTW9ycGgoZWxlbWVudCk7XG4gIGRvbS5hcHBlbmRUZXh0KGVsZW1lbnQsICdjJyk7XG5cbiAgbW9ycGguc2V0Q29udGVudCgnYicpO1xuXG4gIGVxdWFsKGVsZW1lbnQuaW5uZXJIVE1MLCAnYWJjJyk7XG59KTtcblxudGVzdCgnI2luc2VydE1vcnBoQmVmb3JlJywgZnVuY3Rpb24oKXtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBkb20uYXBwZW5kVGV4dChlbGVtZW50LCAnYScpO1xuICB2YXIgYyA9IGRvbS5hcHBlbmRUZXh0KGVsZW1lbnQsICdjJyk7XG4gIHZhciBtb3JwaCA9IGRvbS5pbnNlcnRNb3JwaEJlZm9yZShlbGVtZW50LCBjKTtcblxuICBtb3JwaC5zZXRDb250ZW50KCdiJyk7XG5cbiAgZXF1YWwoZWxlbWVudC5pbm5lckhUTUwsICdhYmMnKTtcbn0pO1xuXG50ZXN0KCcjcGFyc2VIVE1MIGNvbWJpbmF0aW9ucycsIGZ1bmN0aW9uKCl7XG4gIHZhciBwYXJzaW5nQ29tYmluYXRpb25zID0gW1xuICAgIC8vIG9taXR0ZWQgc3RhcnQgdGFnc1xuICAgIC8vXG4gICAgWyd0YWJsZScsICc8dHI+PHRkPllvPC90ZD48L3RyPicsICdUUiddLFxuICAgIFsndGFibGUnLCAnPHRib2R5Pjx0cj48L3RyPjwvdGJvZHk+JywgJ1RCT0RZJ10sXG4gICAgWyd0YWJsZScsICc8Y29sPjwvY29sPicsICdDT0wnXSxcbiAgICAvLyBlbGVtZW50cyB3aXRoIGJyb2tlbiBpbm5lckhUTUwgaW4gSUU5IGFuZCBkb3duXG4gICAgWydzZWxlY3QnLCAnPG9wdGlvbj48L29wdGlvbj4nLCAnT1BUSU9OJ10sXG4gICAgWydjb2xncm91cCcsICc8Y29sPjwvY29sPicsICdDT0wnXSxcbiAgICBbJ3Rib2R5JywgJzx0cj48L3RyPicsICdUUiddLFxuICAgIFsndGZvb3QnLCAnPHRyPjwvdHI+JywgJ1RSJ10sXG4gICAgWyd0aGVhZCcsICc8dHI+PC90cj4nLCAnVFInXSxcbiAgICBbJ3RyJywgJzx0ZD48L3RkPicsICdURCddLFxuICAgIFsnZGl2JywgJzxzY3JpcHQ+PC9zY3JpcHQ+JywgJ1NDUklQVCddXG4gIF07XG5cbiAgdmFyIGNvbnRleHRUYWcsIGNvbnRlbnQsIGV4cGVjdGVkVGFnTmFtZSwgY29udGV4dEVsZW1lbnQsIG5vZGVzO1xuICBmb3IgKHZhciBwPTA7cDxwYXJzaW5nQ29tYmluYXRpb25zLmxlbmd0aDtwKyspIHtcbiAgICBjb250ZXh0VGFnID0gcGFyc2luZ0NvbWJpbmF0aW9uc1twXVswXTtcbiAgICBjb250ZW50ID0gcGFyc2luZ0NvbWJpbmF0aW9uc1twXVsxXTtcbiAgICBleHBlY3RlZFRhZ05hbWUgPSBwYXJzaW5nQ29tYmluYXRpb25zW3BdWzJdO1xuXG4gICAgY29udGV4dEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGNvbnRleHRUYWcpO1xuICAgIG5vZGVzID0gZG9tLnBhcnNlSFRNTChjb250ZW50LCBjb250ZXh0RWxlbWVudCkuY2hpbGROb2RlcztcbiAgICBlcXVhbChcbiAgICAgIG5vZGVzWzBdLnRhZ05hbWUsIGV4cGVjdGVkVGFnTmFtZSxcbiAgICAgICcjcGFyc2VIVE1MIG9mICcrY29udGVudCsnIHJldHVybnMgYSAnK2V4cGVjdGVkVGFnTmFtZSsnIGluc2lkZSBhICcrY29udGV4dFRhZysnIGNvbnRleHQnICk7XG4gIH1cbn0pO1xuXG50ZXN0KCcjcGFyc2VIVE1MIG9mIHNjcmlwdCB0aGVuIHRyIGluc2lkZSB0YWJsZSBjb250ZXh0IHdyYXBzIHRoZSB0ciBpbiBhIHRib2R5JywgZnVuY3Rpb24oKXtcbiAgdmFyIHRhYmxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyksXG4gICAgICBub2RlcyA9IGRvbS5wYXJzZUhUTUwoJzxzY3JpcHQ+PC9zY3JpcHQ+PHRyPjx0ZD5ZbzwvdGQ+PC90cj4nLCB0YWJsZUVsZW1lbnQpLmNoaWxkTm9kZXM7XG4gIC8vIFRoZSBIVE1MIHNwZWMgc3VnZ2VzdHMgdGhlIGZpcnN0IGl0ZW0gbXVzdCBiZSB0aGUgY2hpbGQgb2ZcbiAgLy8gdGhlIG9taXR0YWJsZSBzdGFydCB0YWcuIEhlcmUgc2NyaXB0IGlzIHRoZSBmaXJzdCBjaGlsZCwgc28gbm8tZ28uXG4gIGVxdWFsKG5vZGVzLmxlbmd0aCwgMiwgJ0xlYWRpbmcgc2NyaXB0IHRhZyBjb3JydXB0cycpO1xuICBlcXVhbChub2Rlc1swXS50YWdOYW1lLCAnU0NSSVBUJyk7XG4gIGVxdWFsKG5vZGVzWzFdLnRhZ05hbWUsICdUQk9EWScpO1xufSk7XG5cbnRlc3QoJyNwYXJzZUhUTUwgb2Ygc2VsZWN0IGFsbG93cyB0aGUgaW5pdGlhbCBpbXBsaWNpdCBvcHRpb24gc2VsZWN0aW9uIHRvIHJlbWFpbicsIGZ1bmN0aW9uKCl7XG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdmFyIHNlbGVjdCA9IGRvbS5wYXJzZUhUTUwoJzxzZWxlY3Q+PG9wdGlvbj48L29wdGlvbj48L3NlbGVjdD4nLCBkaXYpLmNoaWxkTm9kZXNbMF07XG5cbiAgb2soc2VsZWN0LmNoaWxkTm9kZXNbMF0uc2VsZWN0ZWQsICdmaXJzdCBlbGVtZW50IGlzIHNlbGVjdGVkJyk7XG59KTtcblxudGVzdCgnI3BhcnNlSFRNTCBvZiBvcHRpb25zIHJlbW92ZXMgYW4gaW1wbGljaXQgc2VsZWN0aW9uJywgZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuICB2YXIgb3B0aW9ucyA9IGRvbS5wYXJzZUhUTUwoXG4gICAgJzxvcHRpb24gdmFsdWU9XCIxXCI+PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cIjJcIj48L29wdGlvbj4nLFxuICAgIHNlbGVjdFxuICApLmNoaWxkTm9kZXM7XG5cbiAgb2soIW9wdGlvbnNbMF0uc2VsZWN0ZWQsICdmaXJzdCBlbGVtZW50IGlzIG5vdCBzZWxlY3RlZCcpO1xuICBvayghb3B0aW9uc1sxXS5zZWxlY3RlZCwgJ3NlY29uZCBlbGVtZW50IGlzIG5vdCBzZWxlY3RlZCcpO1xufSk7XG5cbnRlc3QoJyNwYXJzZUhUTUwgb2Ygb3B0aW9ucyBsZWF2ZXMgYW4gZXhwbGljaXQgZmlyc3Qgc2VsZWN0aW9uJywgZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuICB2YXIgb3B0aW9ucyA9IGRvbS5wYXJzZUhUTUwoXG4gICAgJzxvcHRpb24gdmFsdWU9XCIxXCIgc2VsZWN0ZWQ+PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cIjJcIj48L29wdGlvbj4nLFxuICAgIHNlbGVjdFxuICApLmNoaWxkTm9kZXM7XG5cbiAgb2sob3B0aW9uc1swXS5zZWxlY3RlZCwgJ2ZpcnN0IGVsZW1lbnQgaXMgc2VsZWN0ZWQnKTtcbiAgb2soIW9wdGlvbnNbMV0uc2VsZWN0ZWQsICdzZWNvbmQgZWxlbWVudCBpcyBub3Qgc2VsZWN0ZWQnKTtcbn0pO1xuXG50ZXN0KCcjcGFyc2VIVE1MIG9mIG9wdGlvbnMgbGVhdmVzIGFuIGV4cGxpY2l0IHNlY29uZCBzZWxlY3Rpb24nLCBmdW5jdGlvbigpe1xuICB2YXIgc2VsZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0Jyk7XG4gIHZhciBvcHRpb25zID0gZG9tLnBhcnNlSFRNTChcbiAgICAnPG9wdGlvbiB2YWx1ZT1cIjFcIj48L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiMlwiIHNlbGVjdGVkPVwic2VsZWN0ZWRcIj48L29wdGlvbj4nLFxuICAgIHNlbGVjdFxuICApLmNoaWxkTm9kZXM7XG5cbiAgb2soIW9wdGlvbnNbMF0uc2VsZWN0ZWQsICdmaXJzdCBlbGVtZW50IGlzIG5vdCBzZWxlY3RlZCcpO1xuICBvayhvcHRpb25zWzFdLnNlbGVjdGVkLCAnc2Vjb25kIGVsZW1lbnQgaXMgc2VsZWN0ZWQnKTtcbn0pO1xuXG50ZXN0KCcjcGFyc2VIVE1MIG9mIHNjcmlwdCB0aGVuIHRyIGluc2lkZSB0Ym9keSBjb250ZXh0JywgZnVuY3Rpb24oKXtcbiAgdmFyIHRib2R5RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3Rib2R5JyksXG4gICAgICBub2RlcyA9IGRvbS5wYXJzZUhUTUwoJzxzY3JpcHQ+PC9zY3JpcHQ+PHRyPjx0ZD5ZbzwvdGQ+PC90cj4nLCB0Ym9keUVsZW1lbnQpLmNoaWxkTm9kZXM7XG4gIGVxdWFsKG5vZGVzLmxlbmd0aCwgMiwgJ0xlYWRpbmcgc2NyaXB0IHRhZyBjb3JydXB0cycpO1xuICBlcXVhbChub2Rlc1swXS50YWdOYW1lLCAnU0NSSVBUJyk7XG4gIGVxdWFsKG5vZGVzWzFdLnRhZ05hbWUsICdUUicpO1xufSk7XG5cbnRlc3QoJyNwYXJzZUhUTUwgd2l0aCByZXRhaW5zIHdoaXRlc3BhY2UnLCBmdW5jdGlvbigpe1xuICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHZhciBub2RlcyA9IGRvbS5wYXJzZUhUTUwoJ2xlYWRpbmc8c2NyaXB0IGlkPVwiZmlyc3RcIj48L3NjcmlwdD4gPHNjcmlwdCBpZD1cInNlY29uZFwiPjwvc2NyaXB0PjxkaXY+PHNjcmlwdD48L3NjcmlwdD4gPHNjcmlwdD48L3NjcmlwdD4sIGluZGVlZC48L2Rpdj4nLCBkaXYpLmNoaWxkTm9kZXM7XG4gIGVxdWFsKG5vZGVzWzBdLmRhdGEsICdsZWFkaW5nJyk7XG4gIGVxdWFsKG5vZGVzWzFdLnRhZ05hbWUsICdTQ1JJUFQnKTtcbiAgZXF1YWwobm9kZXNbMl0uZGF0YSwgJyAnKTtcbiAgZXF1YWwobm9kZXNbM10udGFnTmFtZSwgJ1NDUklQVCcpO1xuICBlcXVhbChub2Rlc1s0XS50YWdOYW1lLCAnRElWJyk7XG4gIGVxdWFsKG5vZGVzWzRdLmNoaWxkTm9kZXNbMF0udGFnTmFtZSwgJ1NDUklQVCcpO1xuICBlcXVhbChub2Rlc1s0XS5jaGlsZE5vZGVzWzFdLmRhdGEsICcgJyk7XG4gIGVxdWFsKG5vZGVzWzRdLmNoaWxkTm9kZXNbMl0udGFnTmFtZSwgJ1NDUklQVCcpO1xuICBlcXVhbChub2Rlc1s0XS5jaGlsZE5vZGVzWzNdLmRhdGEsICcsIGluZGVlZC4nKTtcbn0pO1xuXG50ZXN0KCcjcGFyc2VIVE1MIHdpdGggcmV0YWlucyB3aGl0ZXNwYWNlIG9mIHRvcCBlbGVtZW50JywgZnVuY3Rpb24oKXtcbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgbm9kZXMgPSBkb20ucGFyc2VIVE1MKCc8c3Bhbj5oZWxsbyA8c2NyaXB0IGlkPVwiZmlyc3RcIj48L3NjcmlwdD4geWVhaDwvc3Bhbj4nLCBkaXYpLmNoaWxkTm9kZXM7XG4gIGVxdWFsKG5vZGVzWzBdLnRhZ05hbWUsICdTUEFOJyk7XG4gIGVxdWFsSFRNTChub2RlcywgJzxzcGFuPmhlbGxvIDxzY3JpcHQgaWQ9XCJmaXJzdFwiPjwvc2NyaXB0PiB5ZWFoPC9zcGFuPicpO1xufSk7XG5cbnRlc3QoJyNwYXJzZUhUTUwgd2l0aCByZXRhaW5zIHdoaXRlc3BhY2UgYWZ0ZXIgc2NyaXB0JywgZnVuY3Rpb24oKXtcbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgbm9kZXMgPSBkb20ucGFyc2VIVE1MKCc8c3Bhbj5oZWxsbzwvc3Bhbj48c2NyaXB0IGlkPVwiZmlyc3RcIj48L3NjcmlwdD48c3Bhbj48c2NyaXB0Pjwvc2NyaXB0PiBrd29vcDwvc3Bhbj4nLCBkaXYpLmNoaWxkTm9kZXM7XG4gIGVxdWFsKG5vZGVzWzBdLnRhZ05hbWUsICdTUEFOJyk7XG4gIGVxdWFsKG5vZGVzWzFdLnRhZ05hbWUsICdTQ1JJUFQnKTtcbiAgZXF1YWwobm9kZXNbMl0udGFnTmFtZSwgJ1NQQU4nKTtcbiAgZXF1YWxIVE1MKG5vZGVzLCAnPHNwYW4+aGVsbG88L3NwYW4+PHNjcmlwdCBpZD1cImZpcnN0XCI+PC9zY3JpcHQ+PHNwYW4+PHNjcmlwdD48L3NjcmlwdD4ga3dvb3A8L3NwYW4+Jyk7XG59KTtcblxudGVzdCgnI3BhcnNlSFRNTCBvZiBudW1iZXInLCBmdW5jdGlvbigpe1xuICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHZhciBub2RlcyA9IGRvbS5wYXJzZUhUTUwoNSwgZGl2KS5jaGlsZE5vZGVzO1xuICBlcXVhbChub2Rlc1swXS5kYXRhLCAnNScpO1xuICBlcXVhbEhUTUwobm9kZXMsICc1Jyk7XG59KTtcblxudGVzdCgnI3Byb3RvY29sRm9yVVJMJywgZnVuY3Rpb24oKSB7XG4gIHZhciBwcm90b2NvbCA9IGRvbS5wcm90b2NvbEZvclVSTChcImh0dHA6Ly93d3cuZW1iZXJqcy5jb21cIik7XG4gIGVxdWFsKHByb3RvY29sLCBcImh0dHA6XCIpO1xuXG4gIC8vIEluaGVyaXQgcHJvdG9jb2wgZnJvbSBkb2N1bWVudCBpZiB1bnBhcnNlYWJsZVxuICBwcm90b2NvbCA9IGRvbS5wcm90b2NvbEZvclVSTChcIiAgIGphdmFzY3JpcHQ6bHVsemhhY2tlZCgpXCIpO1xuICAvKmpzaGludCBzY3JpcHR1cmw6dHJ1ZSovXG4gIGVxdWFsKHByb3RvY29sLCBcImphdmFzY3JpcHQ6XCIpO1xufSk7XG5cbnRlc3QoJyNjbG9uZU5vZGUgc2hhbGxvdycsIGZ1bmN0aW9uKCl7XG4gIHZhciBkaXZFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZGl2RWxlbWVudC5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpICk7XG5cbiAgdmFyIG5vZGUgPSBkb20uY2xvbmVOb2RlKGRpdkVsZW1lbnQsIGZhbHNlKTtcblxuICBlcXVhbChub2RlLnRhZ05hbWUsICdESVYnKTtcbiAgZXF1YWxIVE1MKG5vZGUsICc8ZGl2PjwvZGl2PicpO1xufSk7XG5cbnRlc3QoJyNjbG9uZU5vZGUgZGVlcCcsIGZ1bmN0aW9uKCl7XG4gIHZhciBkaXZFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZGl2RWxlbWVudC5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpICk7XG5cbiAgdmFyIG5vZGUgPSBkb20uY2xvbmVOb2RlKGRpdkVsZW1lbnQsIHRydWUpO1xuXG4gIGVxdWFsKG5vZGUudGFnTmFtZSwgJ0RJVicpO1xuICBlcXVhbEhUTUwobm9kZSwgJzxkaXY+PHNwYW4+PC9zcGFuPjwvZGl2PicpO1xufSk7XG5cbnRlc3QoJ2RvbSBub2RlIGhhcyBlbXB0eSB0ZXh0IGFmdGVyIGNsb25pbmcgYW5kIGVuc3VyaW5nQmxhbmtUZXh0Tm9kZScsIGZ1bmN0aW9uKCl7XG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBkaXYuYXBwZW5kQ2hpbGQoIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSApO1xuXG4gIHZhciBjbG9uZWREaXYgPSBkb20uY2xvbmVOb2RlKGRpdiwgdHJ1ZSk7XG5cbiAgZXF1YWwoY2xvbmVkRGl2Lm5vZGVUeXBlLCAxKTtcbiAgZXF1YWxIVE1MKGNsb25lZERpdiwgJzxkaXY+PC9kaXY+Jyk7XG4gIC8vIElFJ3MgbmF0aXZlIGNsb25lTm9kZSBkcm9wcyBibGFuayBzdHJpbmcgdGV4dFxuICAvLyBub2Rlcy4gQXNzZXJ0IHJlcGFpckNsb25lZE5vZGUgYnJpbmdzIGJhY2sgdGhlIGJsYW5rXG4gIC8vIHRleHQgbm9kZS5cbiAgZG9tLnJlcGFpckNsb25lZE5vZGUoY2xvbmVkRGl2LCBbMF0pO1xuICBlcXVhbChjbG9uZWREaXYuY2hpbGROb2Rlcy5sZW5ndGgsIDEpO1xuICBlcXVhbChjbG9uZWREaXYuY2hpbGROb2Rlc1swXS5ub2RlVHlwZSwgMyk7XG59KTtcblxudGVzdCgnZG9tIG5vZGUgaGFzIGVtcHR5IHN0YXJ0IHRleHQgYWZ0ZXIgY2xvbmluZyBhbmQgZW5zdXJpbmdCbGFua1RleHROb2RlJywgZnVuY3Rpb24oKXtcbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGRpdi5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpICk7XG4gIGRpdi5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpICk7XG5cbiAgdmFyIGNsb25lZERpdiA9IGRvbS5jbG9uZU5vZGUoZGl2LCB0cnVlKTtcblxuICBlcXVhbChjbG9uZWREaXYubm9kZVR5cGUsIDEpO1xuICBlcXVhbEhUTUwoY2xvbmVkRGl2LCAnPGRpdj48c3Bhbj48L3NwYW4+PC9kaXY+Jyk7XG4gIC8vIElFJ3MgbmF0aXZlIGNsb25lTm9kZSBkcm9wcyBibGFuayBzdHJpbmcgdGV4dFxuICAvLyBub2Rlcy4gQXNzZXJ0IGRlbm9ybWFsaXplVGV4dCBicmluZ3MgYmFjayB0aGUgYmxhbmtcbiAgLy8gdGV4dCBub2RlLlxuICBkb20ucmVwYWlyQ2xvbmVkTm9kZShjbG9uZWREaXYsIFswXSk7XG4gIGVxdWFsKGNsb25lZERpdi5jaGlsZE5vZGVzLmxlbmd0aCwgMik7XG4gIGVxdWFsKGNsb25lZERpdi5jaGlsZE5vZGVzWzBdLm5vZGVUeXBlLCAzKTtcbn0pO1xuXG50ZXN0KCdkb20gbm9kZSBjaGVja2VkIGFmdGVyIGNsb25pbmcgYW5kIGVuc3VyaW5nQ2hlY2tlZCcsIGZ1bmN0aW9uKCl7XG4gIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cbiAgaW5wdXQuc2V0QXR0cmlidXRlKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcbiAgb2soaW5wdXQuY2hlY2tlZCwgJ2lucHV0IGlzIGNoZWNrZWQnKTtcblxuICB2YXIgY2xvbmUgPSBkb20uY2xvbmVOb2RlKGlucHV0LCBmYWxzZSk7XG5cbiAgLy8gSUUncyBuYXRpdmUgY2xvbmVOb2RlIGNvcGllcyBjaGVja2VkIGF0dHJpYnV0ZXMgYnV0XG4gIC8vIG5vdCB0aGUgY2hlY2tlZCBwcm9wZXJ0eSBvZiB0aGUgRE9NIG5vZGUuXG4gIGRvbS5yZXBhaXJDbG9uZWROb2RlKGNsb25lLCBbXSwgdHJ1ZSk7XG5cbiAgaXNDaGVja2VkSW5wdXRIVE1MKGNsb25lLCAnPGlucHV0IGNoZWNrZWQ9XCJjaGVja2VkXCI+Jyk7XG4gIG9rKGNsb25lLmNoZWNrZWQsICdjbG9uZSBpcyBjaGVja2VkJyk7XG59KTtcblxuaWYgKCduYW1lc3BhY2VVUkknIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKSB7XG5cblFVbml0Lm1vZHVsZSgnRE9NIEhlbHBlciBuYW1lc3BhY2VzJywge1xuICBiZWZvcmVFYWNoOiBmdW5jdGlvbigpIHtcbiAgICBkb20gPSBuZXcgRE9NSGVscGVyKCk7XG4gIH0sXG4gIGFmdGVyRWFjaDogZnVuY3Rpb24oKSB7XG4gICAgZG9tID0gbnVsbDtcbiAgfVxufSk7XG5cbnRlc3QoJyNjcmVhdGVFbGVtZW50IGRpdiBpcyB4aHRtbCcsIGZ1bmN0aW9uKCl7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBlcXVhbChub2RlLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UpO1xufSk7XG5cbnRlc3QoJyNjcmVhdGVFbGVtZW50IG9mIHN2ZyB3aXRoIHN2ZyBuYW1lc3BhY2UnLCBmdW5jdGlvbigpe1xuICBkb20uc2V0TmFtZXNwYWNlKHN2Z05hbWVzcGFjZSk7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ3N2ZycpO1xuICBlcXVhbChub2RlLnRhZ05hbWUsICdzdmcnKTtcbiAgZXF1YWwobm9kZS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSk7XG59KTtcblxudGVzdCgnI2NyZWF0ZUVsZW1lbnQgb2YgcGF0aCB3aXRoIGRldGVjdGVkIHN2ZyBjb250ZXh0dWFsIGVsZW1lbnQnLCBmdW5jdGlvbigpe1xuICBkb20uc2V0TmFtZXNwYWNlKHN2Z05hbWVzcGFjZSk7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ3BhdGgnKTtcbiAgZXF1YWwobm9kZS50YWdOYW1lLCAncGF0aCcpO1xuICBlcXVhbChub2RlLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlKTtcbn0pO1xuXG50ZXN0KCcjY3JlYXRlRWxlbWVudCBvZiBwYXRoIHdpdGggc3ZnIGNvbnRleHR1YWwgZWxlbWVudCcsIGZ1bmN0aW9uKCl7XG4gIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ3BhdGgnLCBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoc3ZnTmFtZXNwYWNlLCAnc3ZnJykpO1xuICBlcXVhbChub2RlLnRhZ05hbWUsICdwYXRoJyk7XG4gIGVxdWFsKG5vZGUubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UpO1xufSk7XG5cbnRlc3QoJyNjcmVhdGVFbGVtZW50IG9mIHN2ZyB3aXRoIGRpdiBuYW1lc3BhY2UnLCBmdW5jdGlvbigpe1xuICB2YXIgbm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdzdmcnLCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XG4gIGVxdWFsKG5vZGUudGFnTmFtZSwgJ3N2ZycpO1xuICBlcXVhbChub2RlLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlKTtcbn0pO1xuXG50ZXN0KCcjZ2V0RWxlbWVudEJ5SWQgd2l0aCBkaWZmZXJlbnQgcm9vdCBub2RlJywgZnVuY3Rpb24oKSB7XG4gIHZhciBkb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVEb2N1bWVudCh4aHRtbE5hbWVzcGFjZSwgJ2h0bWwnLCBudWxsKSxcbiAgICAgIGJvZHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoeGh0bWxOYW1lc3BhY2UsICdib2R5JyksXG4gICAgICBwYXJlbnROb2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgY2hpbGROb2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGRvYy5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoYm9keSk7XG4gIGRvbS5zZXRBdHRyaWJ1dGUocGFyZW50Tm9kZSwgJ2lkJywgJ3BhcmVudCcpO1xuICBkb20uc2V0QXR0cmlidXRlKGNoaWxkTm9kZSwgJ2lkJywgJ2NoaWxkJyk7XG4gIGRvbS5hcHBlbmRDaGlsZChwYXJlbnROb2RlLCBjaGlsZE5vZGUpO1xuICBkb20uYXBwZW5kQ2hpbGQoYm9keSwgcGFyZW50Tm9kZSk7XG4gIGVxdWFsSFRNTChkb20uZ2V0RWxlbWVudEJ5SWQoJ2NoaWxkJywgZG9jKSwgJzxkaXYgaWQ9XCJjaGlsZFwiPjwvZGl2PicpO1xufSk7XG5cbnRlc3QoJyNzZXRQcm9wZXJ0eSB3aXRoIG5hbWVzcGFjZWQgYXR0cmlidXRlcycsIGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZTtcblxuICBkb20uc2V0TmFtZXNwYWNlKHN2Z05hbWVzcGFjZSk7XG4gIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudCgnc3ZnJyk7XG4gIGRvbS5zZXRQcm9wZXJ0eShub2RlLCAndmlld0JveCcsICcwIDAgMCAwJyk7XG4gIGVxdWFsSFRNTChub2RlLCAnPHN2ZyB2aWV3Qm94PVwiMCAwIDAgMFwiPjwvc3ZnPicpO1xuXG4gIGRvbS5zZXRQcm9wZXJ0eShub2RlLCAneGxpbms6dGl0bGUnLCAnc3VwZXItYmxhc3QnLCB4bGlua05hbWVzcGFjZSk7XG4gIC8vIGNocm9tZSBhZGRzICh4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIikgcHJvcGVydHkgd2hpbGUgb3RoZXJzIGRvbid0XG4gIC8vIHRodXMgZXF1YWxIVE1MIGlzIG5vdCB1c2VmdWxcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICAvLyBwaGFudG9tIGpzIG9taXRzIHRoZSBwcmVmaXggc28gd2UgY2FuJ3QgbG9vayBmb3IgeGxpbms6XG4gIG9rKGVsLmlubmVySFRNTC5pbmRleE9mKCd0aXRsZT1cInN1cGVyLWJsYXN0XCInKSA+IDApO1xuXG4gIGRvbS5zZXRQcm9wZXJ0eShub2RlLCAneGxpbms6dGl0bGUnLCBudWxsLCB4bGlua05hbWVzcGFjZSk7XG4gIGVxdWFsKG5vZGUuZ2V0QXR0cmlidXRlKCd4bGluazp0aXRsZScpLCBudWxsLCAnbnMgYXR0ciBpcyByZW1vdmVkJyk7XG59KTtcblxudGVzdChcIiNzZXRQcm9wZXJ0eSByZW1vdmVzIG5hbWVzcGFjZWQgYXR0ciB3aXRoIHVuZGVmaW5lZFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGU7XG5cbiAgbm9kZSA9IGRvbS5jcmVhdGVFbGVtZW50KCdzdmcnKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICd4bGluazp0aXRsZScsICdHcmVhdCBUaXRsZScsIHhsaW5rTmFtZXNwYWNlKTtcbiAgZG9tLnNldFByb3BlcnR5KG5vZGUsICd4bGluazp0aXRsZScsIHVuZGVmaW5lZCwgeGxpbmtOYW1lc3BhY2UpO1xuICBlcXVhbChub2RlLmdldEF0dHJpYnV0ZSgneGxpbms6dGl0bGUnKSwgdW5kZWZpbmVkLCAnbnMgYXR0ciBpcyByZW1vdmVkJyk7XG59KTtcblxuZm9yIChpPTA7aTxmb3JlaWduTmFtZXNwYWNlcy5sZW5ndGg7aSsrKSB7XG4gIGZvcmVpZ25OYW1lc3BhY2UgPSBmb3JlaWduTmFtZXNwYWNlc1tpXTtcblxuICB0ZXN0KCcjY3JlYXRlRWxlbWVudCBvZiBkaXYgd2l0aCAnK2ZvcmVpZ25OYW1lc3BhY2UrJyBjb250ZXh0dWFsIGVsZW1lbnQnLCBmdW5jdGlvbigpe1xuICAgIHZhciBub2RlID0gZG9tLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhzdmdOYW1lc3BhY2UsIGZvcmVpZ25OYW1lc3BhY2UpKTtcbiAgICBlcXVhbChub2RlLnRhZ05hbWUsICdESVYnKTtcbiAgICBlcXVhbChub2RlLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UpO1xuICB9KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbiAgdGVzdCgnI3BhcnNlSFRNTCBvZiBkaXYgd2l0aCAnK2ZvcmVpZ25OYW1lc3BhY2UsIGZ1bmN0aW9uKCl7XG4gICAgZG9tLnNldE5hbWVzcGFjZSh4aHRtbE5hbWVzcGFjZSk7XG4gICAgdmFyIGZvcmVpZ25PYmplY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoc3ZnTmFtZXNwYWNlLCBmb3JlaWduTmFtZXNwYWNlKSxcbiAgICAgICAgbm9kZXMgPSBkb20ucGFyc2VIVE1MKCc8ZGl2PjwvZGl2PicsIGZvcmVpZ25PYmplY3QpLmNoaWxkTm9kZXM7XG4gICAgZXF1YWwobm9kZXNbMF0udGFnTmFtZSwgJ0RJVicpO1xuICAgIGVxdWFsKG5vZGVzWzBdLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UpO1xuICB9KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG59XG5cbnRlc3QoJyNwYXJzZUhUTUwgb2YgcGF0aCB3aXRoIHN2ZyBjb250ZXh0dWFsIGVsZW1lbnQnLCBmdW5jdGlvbigpe1xuICBkb20uc2V0TmFtZXNwYWNlKHN2Z05hbWVzcGFjZSk7XG4gIHZhciBzdmdFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z05hbWVzcGFjZSwgJ3N2ZycpLFxuICAgICAgbm9kZXMgPSBkb20ucGFyc2VIVE1MKCc8cGF0aD48L3BhdGg+Jywgc3ZnRWxlbWVudCkuY2hpbGROb2RlcztcbiAgZXF1YWwobm9kZXNbMF0udGFnTmFtZSwgJ3BhdGgnKTtcbiAgZXF1YWwobm9kZXNbMF0ubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UpO1xufSk7XG5cbnRlc3QoJyNwYXJzZUhUTUwgb2Ygc3RvcCB3aXRoIGxpbmVhckdyYWRpZW50IGNvbnRleHR1YWwgZWxlbWVudCcsIGZ1bmN0aW9uKCl7XG4gIGRvbS5zZXROYW1lc3BhY2Uoc3ZnTmFtZXNwYWNlKTtcbiAgdmFyIHN2Z0VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoc3ZnTmFtZXNwYWNlLCAnbGluZWFyR3JhZGllbnQnKSxcbiAgICAgIG5vZGVzID0gZG9tLnBhcnNlSFRNTCgnPHN0b3AgLz4nLCBzdmdFbGVtZW50KS5jaGlsZE5vZGVzO1xuICBlcXVhbChub2Rlc1swXS50YWdOYW1lLCAnc3RvcCcpO1xuICBlcXVhbChub2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSk7XG59KTtcblxudGVzdCgnI2FkZENsYXNzZXMgb24gU1ZHJywgZnVuY3Rpb24oKXtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoc3ZnTmFtZXNwYWNlLCAnc3ZnJyk7XG4gIGRvbS5hZGRDbGFzc2VzKG5vZGUsIFsnc3VwZXItZnVuJ10pO1xuICBlcXVhbChub2RlLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSwgJ3N1cGVyLWZ1bicpO1xuICBkb20uYWRkQ2xhc3Nlcyhub2RlLCBbJ3N1cGVyLWZ1biddKTtcbiAgZXF1YWwobm9kZS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyksICdzdXBlci1mdW4nKTtcbiAgZG9tLmFkZENsYXNzZXMobm9kZSwgWydzdXBlci1ibGFzdCddKTtcbiAgZXF1YWwobm9kZS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyksICdzdXBlci1mdW4gc3VwZXItYmxhc3QnKTtcbn0pO1xuXG50ZXN0KCcjcmVtb3ZlQ2xhc3NlcyBvbiBTVkcnLCBmdW5jdGlvbigpe1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhzdmdOYW1lc3BhY2UsICdzdmcnKTtcbiAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RoaXMtY2xhc3MgdGhhdC1jbGFzcycpO1xuICBkb20ucmVtb3ZlQ2xhc3Nlcyhub2RlLCBbJ3RoaXMtY2xhc3MnXSk7XG4gIGVxdWFsKG5vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpLCAndGhhdC1jbGFzcycpO1xuICBkb20ucmVtb3ZlQ2xhc3Nlcyhub2RlLCBbJ3RoaXMtY2xhc3MnXSk7XG4gIGVxdWFsKG5vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpLCAndGhhdC1jbGFzcycpO1xuICBkb20ucmVtb3ZlQ2xhc3Nlcyhub2RlLCBbJ3RoYXQtY2xhc3MnXSk7XG4gIGVxdWFsKG5vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpLCAnJyk7XG59KTtcblxuXG59XG4iXX0=
define('dom-helper-tests/dom-helper-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests');
  QUnit.test('dom-helper-tests/dom-helper-test.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/dom-helper-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMsd0RBQXdELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDcEYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUseURBQXlELENBQUMsQ0FBQztHQUM1RSxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBkb20taGVscGVyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXItdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('dom-helper-tests/dom-helper.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests');
  QUnit.test('dom-helper-tests/dom-helper.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/dom-helper.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUMxQyxPQUFLLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQy9FLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLG9EQUFvRCxDQUFDLENBQUM7R0FDdkUsQ0FBQyxDQUFDIiwiZmlsZSI6ImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGRvbS1oZWxwZXItdGVzdHMnKTtcblFVbml0LnRlc3QoJ2RvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('dom-helper-tests/dom-helper/build-html-dom.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests/dom-helper');
  QUnit.test('dom-helper-tests/dom-helper/build-html-dom.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/dom-helper/build-html-dom.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci9idWlsZC1odG1sLWRvbS5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsc0NBQXNDLENBQUMsQ0FBQztBQUNyRCxPQUFLLENBQUMsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzlGLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLG1FQUFtRSxDQUFDLENBQUM7R0FDdEYsQ0FBQyxDQUFDIiwiZmlsZSI6ImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci9idWlsZC1odG1sLWRvbS5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlcicpO1xuUVVuaXQudGVzdCgnZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyL2J1aWxkLWh0bWwtZG9tLmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXIvYnVpbGQtaHRtbC1kb20uanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('dom-helper-tests/dom-helper/classes.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests/dom-helper');
  QUnit.test('dom-helper-tests/dom-helper/classes.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/dom-helper/classes.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci9jbGFzc2VzLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBQ3JELE9BQUssQ0FBQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdkYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNERBQTRELENBQUMsQ0FBQztHQUMvRSxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyL2NsYXNzZXMuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXInKTtcblFVbml0LnRlc3QoJ2RvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci9jbGFzc2VzLmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXIvY2xhc3Nlcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('dom-helper-tests/dom-helper/prop.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests/dom-helper');
  QUnit.test('dom-helper-tests/dom-helper/prop.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/dom-helper/prop.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci9wcm9wLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBQ3JELE9BQUssQ0FBQyxJQUFJLENBQUMsd0RBQXdELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDcEYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUseURBQXlELENBQUMsQ0FBQztHQUM1RSxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9kb20taGVscGVyL3Byb3AuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXInKTtcblFVbml0LnRlc3QoJ2RvbS1oZWxwZXItdGVzdHMvZG9tLWhlbHBlci9wcm9wLmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdkb20taGVscGVyLXRlc3RzL2RvbS1oZWxwZXIvcHJvcC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('dom-helper-tests/element-morph-test', ['exports', '../dom-helper'], function (exports, _domHelper) {

  var dom;
  QUnit.module('DOM Helper: ElementMorph', {
    beforeEach: function () {
      dom = new _domHelper.default();
    },

    afterEach: function () {
      dom = null;
    }
  });

  test('contains a clear method', function () {
    expect(0);

    var el = dom.createElement('div');
    var node = dom.createElementMorph(el);

    node.clear();
  });

  test('resets element and dom on destroy', function () {
    expect(2);

    var el = dom.createElement('div');
    var node = dom.createElementMorph(el);

    node.destroy();

    equal(node.element, null, 'element was reset to null');
    equal(node.dom, null, 'dom was reset to null');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZWxlbWVudC1tb3JwaC10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsTUFBSSxHQUFHLENBQUM7QUFDUixPQUFLLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFO0FBQ3ZDLGNBQVUsRUFBRSxZQUFXO0FBQ3JCLFNBQUcsR0FBRyx3QkFBZSxDQUFDO0tBQ3ZCOztBQUVELGFBQVMsRUFBRSxZQUFXO0FBQ3BCLFNBQUcsR0FBRyxJQUFJLENBQUM7S0FDWjtHQUNGLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMseUJBQXlCLEVBQUUsWUFBVTtBQUN4QyxVQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVYsUUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsQyxRQUFJLElBQUksR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRXRDLFFBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztHQUNkLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsbUNBQW1DLEVBQUUsWUFBVTtBQUNsRCxVQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVYsUUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsQyxRQUFJLElBQUksR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRXRDLFFBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzs7QUFFZixTQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztBQUN2RCxTQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztHQUNoRCxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9lbGVtZW50LW1vcnBoLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRE9NSGVscGVyIGZyb20gXCIuLi9kb20taGVscGVyXCI7XG5cbnZhciBkb207XG5RVW5pdC5tb2R1bGUoJ0RPTSBIZWxwZXI6IEVsZW1lbnRNb3JwaCcsIHtcbiAgYmVmb3JlRWFjaDogZnVuY3Rpb24oKSB7XG4gICAgZG9tID0gbmV3IERPTUhlbHBlcigpO1xuICB9LFxuXG4gIGFmdGVyRWFjaDogZnVuY3Rpb24oKSB7XG4gICAgZG9tID0gbnVsbDtcbiAgfVxufSk7XG5cbnRlc3QoJ2NvbnRhaW5zIGEgY2xlYXIgbWV0aG9kJywgZnVuY3Rpb24oKXtcbiAgZXhwZWN0KDApO1xuXG4gIHZhciBlbCA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudE1vcnBoKGVsKTtcblxuICBub2RlLmNsZWFyKCk7XG59KTtcblxudGVzdCgncmVzZXRzIGVsZW1lbnQgYW5kIGRvbSBvbiBkZXN0cm95JywgZnVuY3Rpb24oKXtcbiAgZXhwZWN0KDIpO1xuXG4gIHZhciBlbCA9IGRvbS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdmFyIG5vZGUgPSBkb20uY3JlYXRlRWxlbWVudE1vcnBoKGVsKTtcblxuICBub2RlLmRlc3Ryb3koKTtcblxuICBlcXVhbChub2RlLmVsZW1lbnQsIG51bGwsICdlbGVtZW50IHdhcyByZXNldCB0byBudWxsJyk7XG4gIGVxdWFsKG5vZGUuZG9tLCBudWxsLCAnZG9tIHdhcyByZXNldCB0byBudWxsJyk7XG59KTtcbiJdfQ==
define('dom-helper-tests/element-morph-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests');
  QUnit.test('dom-helper-tests/element-morph-test.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/element-morph-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvZWxlbWVudC1tb3JwaC10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdkYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNERBQTRELENBQUMsQ0FBQztHQUMvRSxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9lbGVtZW50LW1vcnBoLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBkb20taGVscGVyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdkb20taGVscGVyLXRlc3RzL2VsZW1lbnQtbW9ycGgtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci10ZXN0cy9lbGVtZW50LW1vcnBoLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('dom-helper-tests/prop-test', ['exports', 'dom-helper/prop'], function (exports, _domHelperProp) {

  QUnit.module('dom-helper prop');

  test('type.attr, for element props that for one reason or another need to be treated as attrs', function () {
    expect(12);

    [{ tagName: 'TEXTAREA', key: 'form' }, { tagName: 'BUTTON', key: 'type' }, { tagName: 'INPUT', key: 'type' }, { tagName: 'INPUT', key: 'list' }, { tagName: 'INPUT', key: 'form' }, { tagName: 'OPTION', key: 'form' }, { tagName: 'INPUT', key: 'form' }, { tagName: 'BUTTON', key: 'form' }, { tagName: 'LABEL', key: 'form' }, { tagName: 'FIELDSET', key: 'form' }, { tagName: 'LEGEND', key: 'form' }, { tagName: 'OBJECT', key: 'form' }].forEach(function (pair) {
      var element = {
        tagName: pair.tagName
      };

      Object.defineProperty(element, pair.key, {
        set: function () {
          throw new Error('I am a bad browser!');
        }
      });

      deepEqual(_domHelperProp.normalizeProperty(element, pair.key), {
        normalized: pair.key,
        type: 'attr'
      }, ' ' + pair.tagName + '.' + pair.key);
    });
  });

  var TAG_EVENT_PAIRS = [{ tagName: 'form', key: 'onsubmit' }, { tagName: 'form', key: 'onSubmit' }, { tagName: 'form', key: 'ONSUBMIT' }, { tagName: 'video', key: 'canplay' }, { tagName: 'video', key: 'canPlay' }, { tagName: 'video', key: 'CANPLAY' }];

  test('type.eventHandlers should all be props: Chrome', function () {
    expect(6);
    TAG_EVENT_PAIRS.forEach(function (pair) {
      var element = {
        tagName: pair.tagName
      };

      Object.defineProperty(element, pair.key, {
        set: function () {},
        get: function () {}
      });

      deepEqual(_domHelperProp.normalizeProperty(element, pair.key), {
        normalized: pair.key,
        type: 'prop'
      }, ' ' + pair.tagName + '.' + pair.key);
    });
  });

  test('type.eventHandlers should all be props: Safari style (which has screwed up stuff)', function () {
    expect(24);

    TAG_EVENT_PAIRS.forEach(function (pair) {
      var parent = {
        tagName: pair.tagName
      };

      Object.defineProperty(parent, pair.key, {
        set: undefined,
        get: undefined
      });

      var element = Object.create(parent);

      ok(Object.getOwnPropertyDescriptor(element, pair.key) === undefined, 'ensure we mimic silly safari');
      ok(Object.getOwnPropertyDescriptor(parent, pair.key).set === undefined, 'ensure we mimic silly safari');

      var _normalizeProperty = _domHelperProp.normalizeProperty(element, pair.key);

      var normalized = _normalizeProperty.normalized;
      var type = _normalizeProperty.type;

      equal(normalized, pair.key, 'normalized: ' + pair.tagName + '.' + pair.key);
      equal(type, 'prop', 'type: ' + pair.tagName + '.' + pair.key);
    });
  });

  test('test style attr', function () {
    var _normalizeProperty2 = _domHelperProp.normalizeProperty({
      style: undefined,
      tagName: 'foobar'
    }, 'style');

    var normalized = _normalizeProperty2.normalized;
    var type = _normalizeProperty2.type;

    equal(normalized, 'style');
    equal(type, 'attr');
  });

  test('test STYLE attr', function () {
    var _normalizeProperty3 = _domHelperProp.normalizeProperty({
      style: undefined,
      tagName: 'foobar'
    }, 'STYLE');

    var normalized = _normalizeProperty3.normalized;
    var type = _normalizeProperty3.type;

    equal(normalized, 'style');
    equal(type, 'attr');
  });

  test('test StyLE attr', function () {
    var _normalizeProperty4 = _domHelperProp.normalizeProperty({
      style: undefined,
      tagName: 'foobar'
    }, 'StyLE');

    var normalized = _normalizeProperty4.normalized;
    var type = _normalizeProperty4.type;

    equal(normalized, 'style');
    equal(type, 'attr');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvcHJvcC10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOztBQUVoQyxNQUFJLENBQUMseUZBQXlGLEVBQUUsWUFBVztBQUN6RyxVQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRVgsS0FDRSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUssR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUssR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUssR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUssR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUssR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUNwQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUNyQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLElBQUksRUFBSztBQUNsQixVQUFJLE9BQU8sR0FBRztBQUNaLGVBQU8sRUFBRSxJQUFJLENBQUMsT0FBTztPQUN0QixD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UUFITCxVQUFVLHVCQUFWLFVBQVU7UUFBRSxJQUFJLHVCQUFKLElBQUk7O0FBS3RCLFNBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDM0IsU0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztHQUNyQixDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9wcm9wLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBub3JtYWxpemVQcm9wZXJ0eSB9IGZyb20gJ2RvbS1oZWxwZXIvcHJvcCc7XG5cblFVbml0Lm1vZHVsZSgnZG9tLWhlbHBlciBwcm9wJyk7XG5cbnRlc3QoJ3R5cGUuYXR0ciwgZm9yIGVsZW1lbnQgcHJvcHMgdGhhdCBmb3Igb25lIHJlYXNvbiBvciBhbm90aGVyIG5lZWQgdG8gYmUgdHJlYXRlZCBhcyBhdHRycycsIGZ1bmN0aW9uKCkge1xuICBleHBlY3QoMTIpO1xuXG4gIFtcbiAgICB7IHRhZ05hbWU6ICdURVhUQVJFQScsIGtleTogJ2Zvcm0nIH0sXG4gICAgeyB0YWdOYW1lOiAnQlVUVE9OJywgICBrZXk6ICd0eXBlJyB9LFxuICAgIHsgdGFnTmFtZTogJ0lOUFVUJywgICAga2V5OiAndHlwZScgfSxcbiAgICB7IHRhZ05hbWU6ICdJTlBVVCcsICAgIGtleTogJ2xpc3QnIH0sXG4gICAgeyB0YWdOYW1lOiAnSU5QVVQnLCAgICBrZXk6ICdmb3JtJyB9LFxuICAgIHsgdGFnTmFtZTogJ09QVElPTicsICAga2V5OiAnZm9ybScgfSxcbiAgICB7IHRhZ05hbWU6ICdJTlBVVCcsICAgIGtleTogJ2Zvcm0nIH0sXG4gICAgeyB0YWdOYW1lOiAnQlVUVE9OJywgICBrZXk6ICdmb3JtJyB9LFxuICAgIHsgdGFnTmFtZTogJ0xBQkVMJywgICAga2V5OiAnZm9ybScgfSxcbiAgICB7IHRhZ05hbWU6ICdGSUVMRFNFVCcsIGtleTogJ2Zvcm0nIH0sXG4gICAgeyB0YWdOYW1lOiAnTEVHRU5EJywgICBrZXk6ICdmb3JtJyB9LFxuICAgIHsgdGFnTmFtZTogJ09CSkVDVCcsICAga2V5OiAnZm9ybScgfVxuICBdLmZvckVhY2goKHBhaXIpID0+IHtcbiAgICB2YXIgZWxlbWVudCA9IHtcbiAgICAgIHRhZ05hbWU6IHBhaXIudGFnTmFtZVxuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgcGFpci5rZXksIHtcbiAgICAgIHNldCgpIHsgdGhyb3cgbmV3IEVycm9yKCdJIGFtIGEgYmFkIGJyb3dzZXIhJyk7IH1cbiAgICB9KTtcblxuICAgIGRlZXBFcXVhbChub3JtYWxpemVQcm9wZXJ0eShlbGVtZW50LCBwYWlyLmtleSksIHtcbiAgICAgIG5vcm1hbGl6ZWQ6IHBhaXIua2V5LFxuICAgICAgdHlwZTogJ2F0dHInXG4gICAgfSwgYCAke3BhaXIudGFnTmFtZX0uJHtwYWlyLmtleX1gKTtcbiAgfSk7XG59KTtcblxudmFyIFRBR19FVkVOVF9QQUlSUyA9IFtcbiAgeyB0YWdOYW1lOiAnZm9ybScsIGtleTogJ29uc3VibWl0JyB9LFxuICB7IHRhZ05hbWU6ICdmb3JtJywga2V5OiAnb25TdWJtaXQnIH0sXG4gIHsgdGFnTmFtZTogJ2Zvcm0nLCBrZXk6ICdPTlNVQk1JVCcgfSxcbiAgeyB0YWdOYW1lOiAndmlkZW8nLCBrZXk6ICdjYW5wbGF5JyB9LFxuICB7IHRhZ05hbWU6ICd2aWRlbycsIGtleTogJ2NhblBsYXknIH0sXG4gIHsgdGFnTmFtZTogJ3ZpZGVvJywga2V5OiAnQ0FOUExBWScgfVxuXTtcblxudGVzdCgndHlwZS5ldmVudEhhbmRsZXJzIHNob3VsZCBhbGwgYmUgcHJvcHM6IENocm9tZScsIGZ1bmN0aW9uKCkge1xuICBleHBlY3QoNik7XG4gIFRBR19FVkVOVF9QQUlSUy5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgdmFyIGVsZW1lbnQgPSB7XG4gICAgICB0YWdOYW1lOiBwYWlyLnRhZ05hbWVcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVsZW1lbnQsIHBhaXIua2V5LCB7XG4gICAgICBzZXQoKSB7IH0sXG4gICAgICBnZXQoKSB7IH1cbiAgICB9KTtcblxuICAgIGRlZXBFcXVhbChub3JtYWxpemVQcm9wZXJ0eShlbGVtZW50LCBwYWlyLmtleSksIHtcbiAgICAgIG5vcm1hbGl6ZWQ6IHBhaXIua2V5LFxuICAgICAgdHlwZTogJ3Byb3AnXG4gICAgfSwgYCAke3BhaXIudGFnTmFtZX0uJHtwYWlyLmtleX1gKTtcbiAgfSk7XG59KTtcblxuXG50ZXN0KCd0eXBlLmV2ZW50SGFuZGxlcnMgc2hvdWxkIGFsbCBiZSBwcm9wczogU2FmYXJpIHN0eWxlICh3aGljaCBoYXMgc2NyZXdlZCB1cCBzdHVmZiknLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDI0KTtcblxuICBUQUdfRVZFTlRfUEFJUlMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgIHZhciBwYXJlbnQgPSB7XG4gICAgICB0YWdOYW1lOiBwYWlyLnRhZ05hbWVcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBhcmVudCwgcGFpci5rZXksIHtcbiAgICAgIHNldDogdW5kZWZpbmVkLFxuICAgICAgZ2V0OiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHZhciBlbGVtZW50ID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQpO1xuXG4gICAgb2soT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihlbGVtZW50LCBwYWlyLmtleSkgPT09IHVuZGVmaW5lZCwgJ2Vuc3VyZSB3ZSBtaW1pYyBzaWxseSBzYWZhcmknKTtcbiAgICBvayhPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHBhcmVudCwgcGFpci5rZXkpLnNldCA9PT0gdW5kZWZpbmVkLCAnZW5zdXJlIHdlIG1pbWljIHNpbGx5IHNhZmFyaScpO1xuXG4gICAgdmFyIHsgbm9ybWFsaXplZCwgdHlwZSB9ID0gbm9ybWFsaXplUHJvcGVydHkoZWxlbWVudCwgcGFpci5rZXkpO1xuXG4gICAgZXF1YWwobm9ybWFsaXplZCwgcGFpci5rZXksIGBub3JtYWxpemVkOiAke3BhaXIudGFnTmFtZX0uJHtwYWlyLmtleX1gKTtcbiAgICBlcXVhbCh0eXBlLCAncHJvcCcsIGB0eXBlOiAke3BhaXIudGFnTmFtZX0uJHtwYWlyLmtleX1gKTtcbiAgfSk7XG59KTtcblxudGVzdCgndGVzdCBzdHlsZSBhdHRyJywgZnVuY3Rpb24oKSB7XG4gIHZhciB7IG5vcm1hbGl6ZWQsIHR5cGUgfSA9IG5vcm1hbGl6ZVByb3BlcnR5KHtcbiAgICBzdHlsZTogdW5kZWZpbmVkLFxuICAgIHRhZ05hbWU6ICdmb29iYXInXG4gIH0sICdzdHlsZScpO1xuXG4gIGVxdWFsKG5vcm1hbGl6ZWQsICdzdHlsZScpO1xuICBlcXVhbCh0eXBlLCAnYXR0cicpO1xufSk7XG5cbnRlc3QoJ3Rlc3QgU1RZTEUgYXR0cicsIGZ1bmN0aW9uKCkge1xuICB2YXIgeyBub3JtYWxpemVkLCB0eXBlIH0gPSBub3JtYWxpemVQcm9wZXJ0eSh7XG4gICAgc3R5bGU6IHVuZGVmaW5lZCxcbiAgICB0YWdOYW1lOiAnZm9vYmFyJ1xuICB9LCAnU1RZTEUnKTtcblxuICBlcXVhbChub3JtYWxpemVkLCAnc3R5bGUnKTtcbiAgZXF1YWwodHlwZSwgJ2F0dHInKTtcbn0pO1xuXG50ZXN0KCd0ZXN0IFN0eUxFIGF0dHInLCBmdW5jdGlvbigpIHtcbiAgdmFyIHsgbm9ybWFsaXplZCwgdHlwZSB9ID0gbm9ybWFsaXplUHJvcGVydHkoe1xuICAgIHN0eWxlOiB1bmRlZmluZWQsXG4gICAgdGFnTmFtZTogJ2Zvb2JhcidcbiAgfSwgJ1N0eUxFJyk7XG5cbiAgZXF1YWwobm9ybWFsaXplZCwgJ3N0eWxlJyk7XG4gIGVxdWFsKHR5cGUsICdhdHRyJyk7XG59KTtcblxuIl19
define('dom-helper-tests/prop-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper-tests');
  QUnit.test('dom-helper-tests/prop-test.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper-tests/prop-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXItdGVzdHMvcHJvcC10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMsa0RBQWtELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDOUUsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbURBQW1ELENBQUMsQ0FBQztHQUN0RSxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0cy9wcm9wLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBkb20taGVscGVyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdkb20taGVscGVyLXRlc3RzL3Byb3AtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci10ZXN0cy9wcm9wLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-test-helpers", ["exports", "../simple-html-tokenizer", "../htmlbars-util/array-utils"], function (exports, _simpleHtmlTokenizer, _htmlbarsUtilArrayUtils) {
  exports.equalInnerHTML = equalInnerHTML;
  exports.equalHTML = equalHTML;
  exports.equalTokens = equalTokens;
  exports.normalizeInnerHTML = normalizeInnerHTML;
  exports.isCheckedInputHTML = isCheckedInputHTML;
  exports.getTextContent = getTextContent;

  function equalInnerHTML(fragment, html) {
    var actualHTML = normalizeInnerHTML(fragment.innerHTML);
    QUnit.push(actualHTML === html, actualHTML, html);
  }

  function equalHTML(node, html) {
    var fragment;
    if (!node.nodeType && node.length) {
      fragment = document.createDocumentFragment();
      while (node[0]) {
        fragment.appendChild(node[0]);
      }
    } else {
      fragment = node;
    }

    var div = document.createElement("div");
    div.appendChild(fragment.cloneNode(true));

    equalInnerHTML(div, html);
  }

  function generateTokens(fragmentOrHtml) {
    var div = document.createElement("div");
    if (typeof fragmentOrHtml === 'string') {
      div.innerHTML = fragmentOrHtml;
    } else {
      div.appendChild(fragmentOrHtml.cloneNode(true));
    }

    return { tokens: _simpleHtmlTokenizer.tokenize(div.innerHTML), html: div.innerHTML };
  }

  function equalTokens(fragment, html, message) {
    if (fragment.fragment) {
      fragment = fragment.fragment;
    }
    if (html.fragment) {
      html = html.fragment;
    }

    var fragTokens = generateTokens(fragment);
    var htmlTokens = generateTokens(html);

    function normalizeTokens(token) {
      if (token.type === 'StartTag') {
        token.attributes = token.attributes.sort(function (a, b) {
          if (a[0] > b[0]) {
            return 1;
          }
          if (a[0] < b[0]) {
            return -1;
          }
          return 0;
        });
      }
    }

    _htmlbarsUtilArrayUtils.forEach(fragTokens.tokens, normalizeTokens);
    _htmlbarsUtilArrayUtils.forEach(htmlTokens.tokens, normalizeTokens);

    var msg = "Expected: " + html + "; Actual: " + fragTokens.html;

    if (message) {
      msg += " (" + message + ")";
    }

    deepEqual(fragTokens.tokens, htmlTokens.tokens, msg);
  }

  // detect side-effects of cloning svg elements in IE9-11
  var ieSVGInnerHTML = (function () {
    if (!document.createElementNS) {
      return false;
    }
    var div = document.createElement('div');
    var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    div.appendChild(node);
    var clone = div.cloneNode(true);
    return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
  })();

  function normalizeInnerHTML(actualHTML) {
    if (ieSVGInnerHTML) {
      // Replace `<svg xmlns="http://www.w3.org/2000/svg" height="50%" />` with `<svg height="50%"></svg>`, etc.
      // drop namespace attribute
      actualHTML = actualHTML.replace(/ xmlns="[^"]+"/, '');
      // replace self-closing elements
      actualHTML = actualHTML.replace(/<([^ >]+) [^\/>]*\/>/gi, function (tag, tagName) {
        return tag.slice(0, tag.length - 3) + '></' + tagName + '>';
      });
    }

    return actualHTML;
  }

  // detect weird IE8 checked element string
  var checkedInput = document.createElement('input');
  checkedInput.setAttribute('checked', 'checked');
  var checkedInputString = checkedInput.outerHTML;

  function isCheckedInputHTML(element) {
    equal(element.outerHTML, checkedInputString);
  }

  // check which property has the node's text content
  var textProperty = document.createElement('div').textContent === undefined ? 'innerText' : 'textContent';

  function getTextContent(el) {
    // textNode
    if (el.nodeType === 3) {
      return el.nodeValue;
    } else {
      return el[textProperty];
    }
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXRlc3QtaGVscGVycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUdPLFdBQVMsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUU7QUFDN0MsUUFBSSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3hELFNBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDbkQ7O0FBRU0sV0FBUyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNwQyxRQUFJLFFBQVEsQ0FBQztBQUNiLFFBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDakMsY0FBUSxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO0FBQzdDLGFBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2QsZ0JBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDL0I7S0FDRixNQUFNO0FBQ0wsY0FBUSxHQUFHLElBQUksQ0FBQztLQUNqQjs7QUFFRCxRQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hDLE9BQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztBQUUxQyxrQkFBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUMzQjs7QUFFRCxXQUFTLGNBQWMsQ0FBQyxjQUFjLEVBQUU7QUFDdEMsUUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QyxRQUFJLE9BQU8sY0FBYyxLQUFLLFFBQVEsRUFBRTtBQUN0QyxTQUFHLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQztLQUNoQyxNQUFNO0FB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QUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDO09BQzdELENBQUMsQ0FBQztLQUNKOztBQUVELFdBQU8sVUFBVSxDQUFDO0dBQ25COzs7QUFHRCxNQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25ELGNBQVksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELE1BQUksa0JBQWtCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQzs7QUFDekMsV0FBUyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUU7QUFDMUMsU0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztHQUM5Qzs7O0FBR0QsTUFBSSxZQUFZLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLEtBQUssU0FBUyxHQUFHLFdBQVcsR0FBRyxhQUFhLENBQUM7O0FBQ2xHLFdBQVMsY0FBYyxDQUFDLEVBQUUsRUFBRTs7QUFFakMsUUFBSSxFQUFFLENBQUMsUUFBUSxLQUFLLENBQUMsRUFBRTtBQUNyQixhQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDckIsTUFBTTtBQUNMLGFBQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQ3pCO0dBQ0YiLCJmaWxlIjoiaHRtbGJhcnMtdGVzdC1oZWxwZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdG9rZW5pemUgfSBmcm9tIFwiLi4vc2ltcGxlLWh0bWwtdG9rZW5pemVyXCI7XG5pbXBvcnQgeyBmb3JFYWNoIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvYXJyYXktdXRpbHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsSW5uZXJIVE1MKGZyYWdtZW50LCBodG1sKSB7XG4gIHZhciBhY3R1YWxIVE1MID0gbm9ybWFsaXplSW5uZXJIVE1MKGZyYWdtZW50LmlubmVySFRNTCk7XG4gIFFVbml0LnB1c2goYWN0dWFsSFRNTCA9PT0gaHRtbCwgYWN0dWFsSFRNTCwgaHRtbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbEhUTUwobm9kZSwgaHRtbCkge1xuICB2YXIgZnJhZ21lbnQ7XG4gIGlmICghbm9kZS5ub2RlVHlwZSAmJiBub2RlLmxlbmd0aCkge1xuICAgIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHdoaWxlIChub2RlWzBdKSB7XG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChub2RlWzBdKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZnJhZ21lbnQgPSBub2RlO1xuICB9XG5cbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIGRpdi5hcHBlbmRDaGlsZChmcmFnbWVudC5jbG9uZU5vZGUodHJ1ZSkpO1xuXG4gIGVxdWFsSW5uZXJIVE1MKGRpdiwgaHRtbCk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlVG9rZW5zKGZyYWdtZW50T3JIdG1sKSB7XG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBpZiAodHlwZW9mIGZyYWdtZW50T3JIdG1sID09PSAnc3RyaW5nJykge1xuICAgIGRpdi5pbm5lckhUTUwgPSBmcmFnbWVudE9ySHRtbDtcbiAgfSBlbHNlIHtcbiAgICBkaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnRPckh0bWwuY2xvbmVOb2RlKHRydWUpKTtcbiAgfVxuXG4gIHJldHVybiB7IHRva2VuczogdG9rZW5pemUoZGl2LmlubmVySFRNTCksIGh0bWw6IGRpdi5pbm5lckhUTUwgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsVG9rZW5zKGZyYWdtZW50LCBodG1sLCBtZXNzYWdlKSB7XG4gIGlmIChmcmFnbWVudC5mcmFnbWVudCkgeyBmcmFnbWVudCA9IGZyYWdtZW50LmZyYWdtZW50OyB9XG4gIGlmIChodG1sLmZyYWdtZW50KSB7IGh0bWwgPSBodG1sLmZyYWdtZW50OyB9XG5cbiAgdmFyIGZyYWdUb2tlbnMgPSBnZW5lcmF0ZVRva2VucyhmcmFnbWVudCk7XG4gIHZhciBodG1sVG9rZW5zID0gZ2VuZXJhdGVUb2tlbnMoaHRtbCk7XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVG9rZW5zKHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnR5cGUgPT09ICdTdGFydFRhZycpIHtcbiAgICAgIHRva2VuLmF0dHJpYnV0ZXMgPSB0b2tlbi5hdHRyaWJ1dGVzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICBpZiAoYVswXSA+IGJbMF0pIHsgcmV0dXJuIDE7IH1cbiAgICAgICAgaWYgKGFbMF0gPCBiWzBdKSB7IHJldHVybiAtMTsgfVxuICAgICAgICByZXR1cm4gMDsgICAgXG4gICAgICB9KTsgICAgXG4gICAgfSAgICBcbiAgfSAgICBcbiAgIFxuICBmb3JFYWNoKGZyYWdUb2tlbnMudG9rZW5zLCBub3JtYWxpemVUb2tlbnMpOyAgIFxuICBmb3JFYWNoKGh0bWxUb2tlbnMudG9rZW5zLCBub3JtYWxpemVUb2tlbnMpOyAgIFxuXG4gIHZhciBtc2cgPSBcIkV4cGVjdGVkOiBcIiArIGh0bWwgKyBcIjsgQWN0dWFsOiBcIiArIGZyYWdUb2tlbnMuaHRtbDtcblxuICBpZiAobWVzc2FnZSkgeyBtc2cgKz0gXCIgKFwiICsgbWVzc2FnZSArIFwiKVwiOyB9XG5cbiAgZGVlcEVxdWFsKGZyYWdUb2tlbnMudG9rZW5zLCBodG1sVG9rZW5zLnRva2VucywgbXNnKTtcbn1cblxuLy8gZGV0ZWN0IHNpZGUtZWZmZWN0cyBvZiBjbG9uaW5nIHN2ZyBlbGVtZW50cyBpbiBJRTktMTFcbnZhciBpZVNWR0lubmVySFRNTCA9IChmdW5jdGlvbiAoKSB7XG4gIGlmICghZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3N2ZycpO1xuICBkaXYuYXBwZW5kQ2hpbGQobm9kZSk7XG4gIHZhciBjbG9uZSA9IGRpdi5jbG9uZU5vZGUodHJ1ZSk7XG4gIHJldHVybiBjbG9uZS5pbm5lckhUTUwgPT09ICc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAvPic7XG59KSgpO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplSW5uZXJIVE1MKGFjdHVhbEhUTUwpIHtcbiAgaWYgKGllU1ZHSW5uZXJIVE1MKSB7XG4gICAgLy8gUmVwbGFjZSBgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgaGVpZ2h0PVwiNTAlXCIgLz5gIHdpdGggYDxzdmcgaGVpZ2h0PVwiNTAlXCI+PC9zdmc+YCwgZXRjLlxuICAgIC8vIGRyb3AgbmFtZXNwYWNlIGF0dHJpYnV0ZVxuICAgIGFjdHVhbEhUTUwgPSBhY3R1YWxIVE1MLnJlcGxhY2UoLyB4bWxucz1cIlteXCJdK1wiLywgJycpO1xuICAgIC8vIHJlcGxhY2Ugc2VsZi1jbG9zaW5nIGVsZW1lbnRzXG4gICAgYWN0dWFsSFRNTCA9IGFjdHVhbEhUTUwucmVwbGFjZSgvPChbXiA+XSspIFteXFwvPl0qXFwvPi9naSwgZnVuY3Rpb24odGFnLCB0YWdOYW1lKSB7XG4gICAgICByZXR1cm4gdGFnLnNsaWNlKDAsIHRhZy5sZW5ndGggLSAzKSArICc+PC8nICsgdGFnTmFtZSArICc+JztcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBhY3R1YWxIVE1MO1xufVxuXG4vLyBkZXRlY3Qgd2VpcmQgSUU4IGNoZWNrZWQgZWxlbWVudCBzdHJpbmdcbnZhciBjaGVja2VkSW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuY2hlY2tlZElucHV0LnNldEF0dHJpYnV0ZSgnY2hlY2tlZCcsICdjaGVja2VkJyk7XG52YXIgY2hlY2tlZElucHV0U3RyaW5nID0gY2hlY2tlZElucHV0Lm91dGVySFRNTDtcbmV4cG9ydCBmdW5jdGlvbiBpc0NoZWNrZWRJbnB1dEhUTUwoZWxlbWVudCkge1xuICBlcXVhbChlbGVtZW50Lm91dGVySFRNTCwgY2hlY2tlZElucHV0U3RyaW5nKTtcbn1cblxuLy8gY2hlY2sgd2hpY2ggcHJvcGVydHkgaGFzIHRoZSBub2RlJ3MgdGV4dCBjb250ZW50XG52YXIgdGV4dFByb3BlcnR5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykudGV4dENvbnRlbnQgPT09IHVuZGVmaW5lZCA/ICdpbm5lclRleHQnIDogJ3RleHRDb250ZW50JztcbmV4cG9ydCBmdW5jdGlvbiBnZXRUZXh0Q29udGVudChlbCkge1xuICAvLyB0ZXh0Tm9kZVxuICBpZiAoZWwubm9kZVR5cGUgPT09IDMpIHtcbiAgICByZXR1cm4gZWwubm9kZVZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBlbFt0ZXh0UHJvcGVydHldO1xuICB9XG59XG4iXX0=
define('htmlbars-test-helpers.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('htmlbars-test-helpers.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-test-helpers.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXRlc3QtaGVscGVycy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDM0IsT0FBSyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN6RSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO0dBQ2pFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy10ZXN0LWhlbHBlcnMuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSAuJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy10ZXN0LWhlbHBlcnMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXRlc3QtaGVscGVycy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-util', ['exports', './htmlbars-util/safe-string', './htmlbars-util/handlebars/utils', './htmlbars-util/namespaces', './htmlbars-util/morph-utils'], function (exports, _htmlbarsUtilSafeString, _htmlbarsUtilHandlebarsUtils, _htmlbarsUtilNamespaces, _htmlbarsUtilMorphUtils) {
  exports.SafeString = _htmlbarsUtilSafeString.default;
  exports.escapeExpression = _htmlbarsUtilHandlebarsUtils.escapeExpression;
  exports.getAttrNamespace = _htmlbarsUtilNamespaces.getAttrNamespace;
  exports.validateChildMorphs = _htmlbarsUtilMorphUtils.validateChildMorphs;
  exports.linkParams = _htmlbarsUtilMorphUtils.linkParams;
  exports.dump = _htmlbarsUtilMorphUtils.dump;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtVQU1FLFVBQVU7VUFDVixnQkFBZ0IsZ0NBTlQsZ0JBQWdCO1VBT3ZCLGdCQUFnQiwyQkFOVCxnQkFBZ0I7VUFPdkIsbUJBQW1CLDJCQU5aLG1CQUFtQjtVQU8xQixVQUFVLDJCQVBrQixVQUFVO1VBUXRDLElBQUksMkJBUm9DLElBQUkiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTYWZlU3RyaW5nIGZyb20gJy4vaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZyc7XG5pbXBvcnQgeyBlc2NhcGVFeHByZXNzaW9uIH0gZnJvbSAnLi9odG1sYmFycy11dGlsL2hhbmRsZWJhcnMvdXRpbHMnO1xuaW1wb3J0IHsgZ2V0QXR0ck5hbWVzcGFjZSB9IGZyb20gJy4vaHRtbGJhcnMtdXRpbC9uYW1lc3BhY2VzJztcbmltcG9ydCB7IHZhbGlkYXRlQ2hpbGRNb3JwaHMsIGxpbmtQYXJhbXMsIGR1bXAgfSBmcm9tICcuL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMnO1xuXG5leHBvcnQge1xuICBTYWZlU3RyaW5nLFxuICBlc2NhcGVFeHByZXNzaW9uLFxuICBnZXRBdHRyTmFtZXNwYWNlLFxuICB2YWxpZGF0ZUNoaWxkTW9ycGhzLFxuICBsaW5rUGFyYW1zLFxuICBkdW1wXG59O1xuIl19
define('htmlbars-util.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('htmlbars-util.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNCLE9BQUssQ0FBQyxJQUFJLENBQUMscUNBQXFDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDakUsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztHQUN6RCxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIC4nKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXV0aWwuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXV0aWwuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-util/array-utils', ['exports'], function (exports) {
  exports.forEach = forEach;
  exports.map = map;

  function forEach(array, callback, binding) {
    var i, l;
    if (binding === undefined) {
      for (i = 0, l = array.length; i < l; i++) {
        callback(array[i], i, array);
      }
    } else {
      for (i = 0, l = array.length; i < l; i++) {
        callback.call(binding, array[i], i, array);
      }
    }
  }

  function map(array, callback) {
    var output = [];
    var i, l;

    for (i = 0, l = array.length; i < l; i++) {
      output.push(callback(array[i], i, array));
    }

    return output;
  }

  var getIdx;
  if (Array.prototype.indexOf) {
    getIdx = function (array, obj, from) {
      return array.indexOf(obj, from);
    };
  } else {
    getIdx = function (array, obj, from) {
      if (from === undefined || from === null) {
        from = 0;
      } else if (from < 0) {
        from = Math.max(0, array.length + from);
      }
      for (var i = from, l = array.length; i < l; i++) {
        if (array[i] === obj) {
          return i;
        }
      }
      return -1;
    };
  }

  var isArray = Array.isArray || function (array) {
    return Object.prototype.toString.call(array) === '[object Array]';
  };

  exports.isArray = isArray;
  var indexOfArray = getIdx;
  exports.indexOfArray = indexOfArray;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvYXJyYXktdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFPLFdBQVMsT0FBTyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO0FBQ2hELFFBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNULFFBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTtBQUN6QixXQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN4QyxnQkFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDOUI7S0FDRixNQUFNO0FBQ0wsV0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDeEMsZ0JBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDNUM7S0FDRjtHQUNGOztBQUVNLFdBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUU7QUFDbkMsUUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFFBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFVCxTQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN4QyxZQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDM0M7O0FBRUQsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxNQUFJLE1BQU0sQ0FBQztBQUNYLE1BQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7QUFDM0IsVUFBTSxHQUFHLFVBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUM7QUFDakMsYUFBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNqQyxDQUFDO0dBQ0gsTUFBTTtBQUNMLFVBQU0sR0FBRyxVQUFTLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQ2xDLFVBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO0FBQ3ZDLFlBQUksR0FBRyxDQUFDLENBQUM7T0FDVixNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtBQUNuQixZQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQztPQUN6QztBQUNELFdBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDOUMsWUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3BCLGlCQUFPLENBQUMsQ0FBQztTQUNWO09BQ0Y7QUFDRCxhQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ1gsQ0FBQztHQUNIOztBQUVNLE1BQUksT0FBTyxHQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksVUFBUyxLQUFLLEVBQUU7QUFDckQsV0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssZ0JBQWdCLENBQUM7R0FDbkUsQUFBQyxDQUFDOzs7QUFFSSxNQUFJLFlBQVksR0FBRyxNQUFNLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC9hcnJheS11dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBmb3JFYWNoKGFycmF5LCBjYWxsYmFjaywgYmluZGluZykge1xuICB2YXIgaSwgbDtcbiAgaWYgKGJpbmRpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgIGZvciAoaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNhbGxiYWNrKGFycmF5W2ldLCBpLCBhcnJheSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAoaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwoYmluZGluZywgYXJyYXlbaV0sIGksIGFycmF5KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcChhcnJheSwgY2FsbGJhY2spIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICB2YXIgaSwgbDtcblxuICBmb3IgKGkgPSAwLCBsID0gYXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb3V0cHV0LnB1c2goY2FsbGJhY2soYXJyYXlbaV0sIGksIGFycmF5KSk7XG4gIH1cblxuICByZXR1cm4gb3V0cHV0O1xufVxuXG52YXIgZ2V0SWR4O1xuaWYgKEFycmF5LnByb3RvdHlwZS5pbmRleE9mKSB7XG4gIGdldElkeCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGZyb20pe1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKG9iaiwgZnJvbSk7XG4gIH07XG59IGVsc2Uge1xuICBnZXRJZHggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBmcm9tKSB7XG4gICAgaWYgKGZyb20gPT09IHVuZGVmaW5lZCB8fCBmcm9tID09PSBudWxsKSB7XG4gICAgICBmcm9tID0gMDtcbiAgICB9IGVsc2UgaWYgKGZyb20gPCAwKSB7XG4gICAgICBmcm9tID0gTWF0aC5tYXgoMCwgYXJyYXkubGVuZ3RoICsgZnJvbSk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSBmcm9tLCBsPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChhcnJheVtpXSA9PT0gb2JqKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgaXNBcnJheSA9IChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKGFycmF5KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xufSk7XG5cbmV4cG9ydCB2YXIgaW5kZXhPZkFycmF5ID0gZ2V0SWR4O1xuIl19
define('htmlbars-util/array-utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/array-utils.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/array-utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvYXJyYXktdXRpbHMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDdkMsT0FBSyxDQUFDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUM3RSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0dBQ3JFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy11dGlsL2FycmF5LXV0aWxzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtdXRpbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC9hcnJheS11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC9hcnJheS11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-util/handlebars/safe-string', ['exports'], function (exports) {
  // Build out our basic SafeString type
  function SafeString(string) {
    this.string = string;
  }

  SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
    return '' + this.string;
  };

  exports.default = SafeString;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLFdBQVMsVUFBVSxDQUFDLE1BQU0sRUFBRTtBQUMxQixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztHQUN0Qjs7QUFFRCxZQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFXO0FBQ3ZFLFdBQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7R0FDekIsQ0FBQzs7b0JBRWEsVUFBVSIsImZpbGUiOiJodG1sYmFycy11dGlsL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnJyArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgU2FmZVN0cmluZztcbiJdfQ==
define('htmlbars-util/handlebars/safe-string.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util/handlebars');
  QUnit.test('htmlbars-util/handlebars/safe-string.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/handlebars/safe-string.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNsRCxPQUFLLENBQUMsSUFBSSxDQUFDLDREQUE0RCxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3hGLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDZEQUE2RCxDQUFDLENBQUM7R0FDaEYsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycycpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy11dGlsL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-util/handlebars/utils', ['exports'], function (exports) {
  exports.extend = extend;
  exports.indexOf = indexOf;
  exports.escapeExpression = escapeExpression;
  exports.isEmpty = isEmpty;
  exports.blockParams = blockParams;
  exports.appendContextPath = appendContextPath;
  var escape = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };

  var badChars = /[&<>"'`]/g,
      possible = /[&<>"'`]/;

  function escapeChar(chr) {
    return escape[chr];
  }

  function extend(obj /* , ...source */) {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  }

  var toString = Object.prototype.toString;

  exports.toString = toString;
  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  /*eslint-disable func-style, no-var */
  var isFunction = function (value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    exports.isFunction = isFunction = function (value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  var isFunction;
  exports.isFunction = isFunction;
  /*eslint-enable func-style, no-var */

  /* istanbul ignore next */
  var isArray = Array.isArray || function (value) {
    return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
  };

  exports.isArray = isArray;
  // Older IE versions do not directly support indexOf so we must implement our own, sadly.

  function indexOf(array, value) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i] === value) {
        return i;
      }
    }
    return -1;
  }

  function escapeExpression(string) {
    if (typeof string !== 'string') {
      // don't escape SafeStrings, since they're already safe
      if (string && string.toHTML) {
        return string.toHTML();
      } else if (string == null) {
        return '';
      } else if (!string) {
        return string + '';
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = '' + string;
    }

    if (!possible.test(string)) {
      return string;
    }
    return string.replace(badChars, escapeChar);
  }

  function isEmpty(value) {
    if (!value && value !== 0) {
      return true;
    } else if (isArray(value) && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  function blockParams(params, ids) {
    params.path = ids;
    return params;
  }

  function appendContextPath(contextPath, id) {
    return (contextPath ? contextPath + '.' : '') + id;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUEsTUFBTSxNQUFNLEdBQUc7QUFDYixPQUFHLEVBQUUsT0FBTztBQUNaLE9BQUcsRUFBRSxNQUFNO0FBQ1gsT0FBRyxFQUFFLE1BQU07QUFDWCxPQUFHLEVBQUUsUUFBUTtBQUNiLE9BQUcsRUFBRSxRQUFRO0FBQ2IsT0FBRyxFQUFFLFFBQVE7R0FDZCxDQUFDOztBQUVGLE1BQU0sUUFBUSxHQUFHLFdBQVc7TUFDdEIsUUFBUSxHQUFHLFVBQVUsQ0FBQzs7QUFFNUIsV0FBUyxVQUFVLENBQUMsR0FBRyxFQUFFO0FBQ3ZCLFdBQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ3BCOztBQUVNLFdBQVMsTUFBTSxDQUFDLEdBQUcsb0JBQW9CO0FBQzVDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3pDLFdBQUssSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVCLFlBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRTtBQUMzRCxhQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzlCO09BQ0Y7S0FDRjs7QUFFRCxXQUFPLEdBQUcsQ0FBQztHQUNaOztBQUVNLE1BQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDOzs7Ozs7QUFLaEQsTUFBSSxVQUFVLEdBQUcsVUFBUyxLQUFLLEVBQUU7QUFDL0IsV0FBTyxPQUFPLEtBQUssS0FBSyxVQUFVLENBQUM7R0FDcEMsQ0FBQzs7O0FBR0YsTUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDbkIsWUFJUyxVQUFVLEdBSm5CLFVBQVUsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUMzQixhQUFPLE9BQU8sS0FBSyxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLG1CQUFtQixDQUFDO0tBQ3BGLENBQUM7R0FDSDtBQUNNLE1BQUksVUFBVSxDQUFDOzs7OztBQUlmLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksVUFBUyxLQUFLLEVBQUU7QUFDdEQsV0FBTyxBQUFDLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEdBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7R0FDakcsQ0FBQzs7Ozs7QUFHSyxXQUFTLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQ3BDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUFFO0FBQ3RCLGVBQU8sQ0FBQyxDQUFDO09BQ1Y7S0FDRjtBQUNELFdBQU8sQ0FBQyxDQUFDLENBQUM7R0FDWDs7QUFHTSxXQUFTLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtBQUN2QyxRQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTs7QUFFOUIsVUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUMzQixlQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUN4QixNQUFNLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtBQUN6QixlQUFPLEVBQUUsQ0FBQztPQUNYLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNsQixlQUFPLE1BQU0sR0FBRyxFQUFFLENBQUM7T0FDcEI7Ozs7O0FBS0QsWUFBTSxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7S0FDdEI7O0FBRUQsUUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFBRSxhQUFPLE1BQU0sQ0FBQztLQUFFO0FBQzlDLFdBQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7R0FDN0M7O0FBRU0sV0FBUyxPQUFPLENBQUMsS0FBSyxFQUFFO0FBQzdCLFFBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtBQUN6QixhQUFPLElBQUksQ0FBQztLQUNiLE1BQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDL0MsYUFBTyxJQUFJLENBQUM7S0FDYixNQUFNO0FBQ0wsYUFBTyxLQUFLLENBQUM7S0FDZDtHQUNGOztBQUVNLFdBQVMsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7QUFDdkMsVUFBTSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7QUFDbEIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFTSxXQUFTLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUU7QUFDakQsV0FBTyxDQUFDLFdBQVcsR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQSxHQUFJLEVBQUUsQ0FBQztHQUNwRCIsImZpbGUiOiJodG1sYmFycy11dGlsL2hhbmRsZWJhcnMvdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnXG59O1xuXG5jb25zdCBiYWRDaGFycyA9IC9bJjw+XCInYF0vZyxcbiAgICAgIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZChvYmogLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKGxldCBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbmV4cG9ydCBsZXQgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4vKmVzbGludC1kaXNhYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbmV4cG9ydCB2YXIgaXNGdW5jdGlvbjtcbi8qZXNsaW50LWVuYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnQgZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufVxuIl19
define('htmlbars-util/handlebars/utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util/handlebars');
  QUnit.test('htmlbars-util/handlebars/utils.js should pass jshint', function (assert) {
    assert.ok(false, 'htmlbars-util/handlebars/utils.js should pass jshint.\nhtmlbars-util/handlebars/utils.js: line 68, col 25, Expected \'===\' and instead saw \'==\'.\n\n1 error');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy91dGlscy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNsRCxPQUFLLENBQUMsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ2xGLFVBQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLGdLQUFnSyxDQUFDLENBQUM7R0FDcEwsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy91dGlscy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycycpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC9oYW5kbGViYXJzL3V0aWxzLmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKGZhbHNlLCAnaHRtbGJhcnMtdXRpbC9oYW5kbGViYXJzL3V0aWxzLmpzIHNob3VsZCBwYXNzIGpzaGludC5cXG5odG1sYmFycy11dGlsL2hhbmRsZWJhcnMvdXRpbHMuanM6IGxpbmUgNjgsIGNvbCAyNSwgRXhwZWN0ZWQgXFwnPT09XFwnIGFuZCBpbnN0ZWFkIHNhdyBcXCc9PVxcJy5cXG5cXG4xIGVycm9yJyk7IFxufSk7XG4iXX0=
define("htmlbars-util/morph-utils", ["exports"], function (exports) {
  exports.visitChildren = visitChildren;
  exports.validateChildMorphs = validateChildMorphs;
  exports.linkParams = linkParams;
  exports.dump = dump;
  /*globals console*/

  function visitChildren(nodes, callback) {
    if (!nodes || nodes.length === 0) {
      return;
    }

    nodes = nodes.slice();

    while (nodes.length) {
      var node = nodes.pop();
      callback(node);

      if (node.childNodes) {
        nodes.push.apply(nodes, node.childNodes);
      } else if (node.firstChildMorph) {
        var current = node.firstChildMorph;

        while (current) {
          nodes.push(current);
          current = current.nextMorph;
        }
      } else if (node.morphList) {
        nodes.push(node.morphList);
      }
    }
  }

  function validateChildMorphs(env, morph, visitor) {
    var morphList = morph.morphList;
    if (morph.morphList) {
      var current = morphList.firstChildMorph;

      while (current) {
        var next = current.nextMorph;
        validateChildMorphs(env, current, visitor);
        current = next;
      }
    } else if (morph.lastResult) {
      morph.lastResult.revalidateWith(env, undefined, undefined, undefined, visitor);
    } else if (morph.childNodes) {
      // This means that the childNodes were wired up manually
      for (var i = 0, l = morph.childNodes.length; i < l; i++) {
        validateChildMorphs(env, morph.childNodes[i], visitor);
      }
    }
  }

  function linkParams(env, scope, morph, path, params, hash) {
    if (morph.linkedParams) {
      return;
    }

    if (env.hooks.linkRenderNode(morph, env, scope, path, params, hash)) {
      morph.linkedParams = { params: params, hash: hash };
    }
  }

  function dump(node) {
    console.group(node, node.isDirty);

    if (node.childNodes) {
      map(node.childNodes, dump);
    } else if (node.firstChildMorph) {
      var current = node.firstChildMorph;

      while (current) {
        dump(current);
        current = current.nextMorph;
      }
    } else if (node.morphList) {
      dump(node.morphList);
    }

    console.groupEnd();
  }

  function map(nodes, cb) {
    for (var i = 0, l = nodes.length; i < l; i++) {
      cb(nodes[i]);
    }
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVPLFdBQVMsYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUU7QUFDN0MsUUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUFFLGFBQU87S0FBRTs7QUFFN0MsU0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQzs7QUFFdEIsV0FBTyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ25CLFVBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN2QixjQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRWYsVUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO0FBQ25CLGFBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7T0FDMUMsTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDL0IsWUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQzs7QUFFbkMsZUFBTyxPQUFPLEVBQUU7QUFDZCxlQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BCLGlCQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUM3QjtPQUNGLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ3pCLGFBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQzVCO0tBQ0Y7R0FDRjs7QUFFTSxXQUFTLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQ3ZELFFBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDaEMsUUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFO0FBQ25CLFVBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUM7O0FBRXhDLGFBQU8sT0FBTyxFQUFFO0FBQ2QsWUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUM3QiwyQkFBbUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzNDLGVBQU8sR0FBRyxJQUFJLENBQUM7T0FDaEI7S0FDRixNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtBQUMzQixXQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDaEYsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7O0FBRTNCLFdBQUssSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2pELDJCQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO09BQ3hEO0tBQ0Y7R0FDRjs7QUFFTSxXQUFTLFVBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtBQUNoRSxRQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7QUFDdEIsYUFBTztLQUNSOztBQUVELFFBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtBQUNuRSxXQUFLLENBQUMsWUFBWSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7S0FDckQ7R0FDRjs7QUFFTSxXQUFTLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDekIsV0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVsQyxRQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7QUFDbkIsU0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDNUIsTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDL0IsVUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQzs7QUFFbkMsYUFBTyxPQUFPLEVBQUU7QUFDZCxZQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDZCxlQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztPQUM3QjtLQUNGLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ3pCLFVBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDdEI7O0FBRUQsV0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0dBQ3BCOztBQUVELFdBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUU7QUFDdEIsU0FBSyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN0QyxRQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDZDtHQUNGIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKmdsb2JhbHMgY29uc29sZSovXG5cbmV4cG9ydCBmdW5jdGlvbiB2aXNpdENoaWxkcmVuKG5vZGVzLCBjYWxsYmFjaykge1xuICBpZiAoIW5vZGVzIHx8IG5vZGVzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICBub2RlcyA9IG5vZGVzLnNsaWNlKCk7XG5cbiAgd2hpbGUgKG5vZGVzLmxlbmd0aCkge1xuICAgIHZhciBub2RlID0gbm9kZXMucG9wKCk7XG4gICAgY2FsbGJhY2sobm9kZSk7XG5cbiAgICBpZiAobm9kZS5jaGlsZE5vZGVzKSB7XG4gICAgICBub2Rlcy5wdXNoLmFwcGx5KG5vZGVzLCBub2RlLmNoaWxkTm9kZXMpO1xuICAgIH0gZWxzZSBpZiAobm9kZS5maXJzdENoaWxkTW9ycGgpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbm9kZS5maXJzdENoaWxkTW9ycGg7XG5cbiAgICAgIHdoaWxlIChjdXJyZW50KSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VycmVudCk7XG4gICAgICAgIGN1cnJlbnQgPSBjdXJyZW50Lm5leHRNb3JwaDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGUubW9ycGhMaXN0KSB7XG4gICAgICBub2Rlcy5wdXNoKG5vZGUubW9ycGhMaXN0KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ2hpbGRNb3JwaHMoZW52LCBtb3JwaCwgdmlzaXRvcikge1xuICB2YXIgbW9ycGhMaXN0ID0gbW9ycGgubW9ycGhMaXN0O1xuICBpZiAobW9ycGgubW9ycGhMaXN0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuXG4gICAgd2hpbGUgKGN1cnJlbnQpIHtcbiAgICAgIHZhciBuZXh0ID0gY3VycmVudC5uZXh0TW9ycGg7XG4gICAgICB2YWxpZGF0ZUNoaWxkTW9ycGhzKGVudiwgY3VycmVudCwgdmlzaXRvcik7XG4gICAgICBjdXJyZW50ID0gbmV4dDtcbiAgICB9XG4gIH0gZWxzZSBpZiAobW9ycGgubGFzdFJlc3VsdCkge1xuICAgIG1vcnBoLmxhc3RSZXN1bHQucmV2YWxpZGF0ZVdpdGgoZW52LCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB2aXNpdG9yKTtcbiAgfSBlbHNlIGlmIChtb3JwaC5jaGlsZE5vZGVzKSB7XG4gICAgLy8gVGhpcyBtZWFucyB0aGF0IHRoZSBjaGlsZE5vZGVzIHdlcmUgd2lyZWQgdXAgbWFudWFsbHlcbiAgICBmb3IgKHZhciBpPTAsIGw9bW9ycGguY2hpbGROb2Rlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB2YWxpZGF0ZUNoaWxkTW9ycGhzKGVudiwgbW9ycGguY2hpbGROb2Rlc1tpXSwgdmlzaXRvcik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5rUGFyYW1zKGVudiwgc2NvcGUsIG1vcnBoLCBwYXRoLCBwYXJhbXMsIGhhc2gpIHtcbiAgaWYgKG1vcnBoLmxpbmtlZFBhcmFtcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChlbnYuaG9va3MubGlua1JlbmRlck5vZGUobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCkpIHtcbiAgICBtb3JwaC5saW5rZWRQYXJhbXMgPSB7IHBhcmFtczogcGFyYW1zLCBoYXNoOiBoYXNoIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXAobm9kZSkge1xuICBjb25zb2xlLmdyb3VwKG5vZGUsIG5vZGUuaXNEaXJ0eSk7XG5cbiAgaWYgKG5vZGUuY2hpbGROb2Rlcykge1xuICAgIG1hcChub2RlLmNoaWxkTm9kZXMsIGR1bXApO1xuICB9IGVsc2UgaWYgKG5vZGUuZmlyc3RDaGlsZE1vcnBoKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBub2RlLmZpcnN0Q2hpbGRNb3JwaDtcblxuICAgIHdoaWxlIChjdXJyZW50KSB7XG4gICAgICBkdW1wKGN1cnJlbnQpO1xuICAgICAgY3VycmVudCA9IGN1cnJlbnQubmV4dE1vcnBoO1xuICAgIH1cbiAgfSBlbHNlIGlmIChub2RlLm1vcnBoTGlzdCkge1xuICAgIGR1bXAobm9kZS5tb3JwaExpc3QpO1xuICB9XG5cbiAgY29uc29sZS5ncm91cEVuZCgpO1xufVxuXG5mdW5jdGlvbiBtYXAobm9kZXMsIGNiKSB7XG4gIGZvciAodmFyIGk9MCwgbD1ub2Rlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgY2Iobm9kZXNbaV0pO1xuICB9XG59XG4iXX0=
define('htmlbars-util/morph-utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/morph-utils.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/morph-utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDdkMsT0FBSyxDQUFDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUM3RSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0dBQ3JFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy11dGlsL21vcnBoLXV0aWxzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtdXRpbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC9tb3JwaC11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC9tb3JwaC11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-util/namespaces', ['exports'], function (exports) {
  exports.getAttrNamespace = getAttrNamespace;
  // ref http://dev.w3.org/html5/spec-LC/namespaces.html
  var defaultNamespaces = {
    html: 'http://www.w3.org/1999/xhtml',
    mathml: 'http://www.w3.org/1998/Math/MathML',
    svg: 'http://www.w3.org/2000/svg',
    xlink: 'http://www.w3.org/1999/xlink',
    xml: 'http://www.w3.org/XML/1998/namespace'
  };

  function getAttrNamespace(attrName) {
    var namespace;

    var colonIndex = attrName.indexOf(':');
    if (colonIndex !== -1) {
      var prefix = attrName.slice(0, colonIndex);
      namespace = defaultNamespaces[prefix];
    }

    return namespace || null;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvbmFtZXNwYWNlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxNQUFJLGlCQUFpQixHQUFHO0FBQ3RCLFFBQUksRUFBRSw4QkFBOEI7QUFDcEMsVUFBTSxFQUFFLG9DQUFvQztBQUM1QyxPQUFHLEVBQUUsNEJBQTRCO0FBQ2pDLFNBQUssRUFBRSw4QkFBOEI7QUFDckMsT0FBRyxFQUFFLHNDQUFzQztHQUM1QyxDQUFDOztBQUVLLFdBQVMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFO0FBQ3pDLFFBQUksU0FBUyxDQUFDOztBQUVkLFFBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkMsUUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDckIsVUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDM0MsZUFBUyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3ZDOztBQUVELFdBQU8sU0FBUyxJQUFJLElBQUksQ0FBQztHQUMxQiIsImZpbGUiOiJodG1sYmFycy11dGlsL25hbWVzcGFjZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyByZWYgaHR0cDovL2Rldi53My5vcmcvaHRtbDUvc3BlYy1MQy9uYW1lc3BhY2VzLmh0bWxcbnZhciBkZWZhdWx0TmFtZXNwYWNlcyA9IHtcbiAgaHRtbDogJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnLFxuICBtYXRobWw6ICdodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MJyxcbiAgc3ZnOiAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLFxuICB4bGluazogJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLFxuICB4bWw6ICdodHRwOi8vd3d3LnczLm9yZy9YTUwvMTk5OC9uYW1lc3BhY2UnXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXR0ck5hbWVzcGFjZShhdHRyTmFtZSkge1xuICB2YXIgbmFtZXNwYWNlO1xuXG4gIHZhciBjb2xvbkluZGV4ID0gYXR0ck5hbWUuaW5kZXhPZignOicpO1xuICBpZiAoY29sb25JbmRleCAhPT0gLTEpIHtcbiAgICB2YXIgcHJlZml4ID0gYXR0ck5hbWUuc2xpY2UoMCwgY29sb25JbmRleCk7XG4gICAgbmFtZXNwYWNlID0gZGVmYXVsdE5hbWVzcGFjZXNbcHJlZml4XTtcbiAgfVxuXG4gIHJldHVybiBuYW1lc3BhY2UgfHwgbnVsbDtcbn1cbiJdfQ==
define('htmlbars-util/namespaces.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/namespaces.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/namespaces.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvbmFtZXNwYWNlcy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUN2QyxPQUFLLENBQUMsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzVFLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLGlEQUFpRCxDQUFDLENBQUM7R0FDcEUsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvbmFtZXNwYWNlcy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXV0aWwnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXV0aWwvbmFtZXNwYWNlcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC9uYW1lc3BhY2VzLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define("htmlbars-util/object-utils", ["exports"], function (exports) {
  exports.merge = merge;
  exports.shallowCopy = shallowCopy;
  exports.keySet = keySet;
  exports.keyLength = keyLength;

  function merge(options, defaults) {
    for (var prop in defaults) {
      if (options.hasOwnProperty(prop)) {
        continue;
      }
      options[prop] = defaults[prop];
    }
    return options;
  }

  function shallowCopy(obj) {
    return merge({}, obj);
  }

  function keySet(obj) {
    var set = {};

    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        set[prop] = true;
      }
    }

    return set;
  }

  function keyLength(obj) {
    var count = 0;

    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        count++;
      }
    }

    return count;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFPLFdBQVMsS0FBSyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUU7QUFDdkMsU0FBSyxJQUFJLElBQUksSUFBSSxRQUFRLEVBQUU7QUFDekIsVUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQUUsaUJBQVM7T0FBRTtBQUMvQyxhQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2hDO0FBQ0QsV0FBTyxPQUFPLENBQUM7R0FDaEI7O0FBRU0sV0FBUyxXQUFXLENBQUMsR0FBRyxFQUFFO0FBQy9CLFdBQU8sS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztHQUN2Qjs7QUFFTSxXQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUU7QUFDMUIsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDOztBQUViLFNBQUssSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFO0FBQ3BCLFVBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUM1QixXQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO09BQ2xCO0tBQ0Y7O0FBRUQsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFTSxXQUFTLFNBQVMsQ0FBQyxHQUFHLEVBQUU7QUFDN0IsUUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDOztBQUVkLFNBQUssSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFO0FBQ3BCLFVBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUM1QixhQUFLLEVBQUUsQ0FBQztPQUNUO0tBQ0Y7O0FBRUQsV0FBTyxLQUFLLENBQUM7R0FDZCIsImZpbGUiOiJodG1sYmFycy11dGlsL29iamVjdC11dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBtZXJnZShvcHRpb25zLCBkZWZhdWx0cykge1xuICBmb3IgKHZhciBwcm9wIGluIGRlZmF1bHRzKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcCkpIHsgY29udGludWU7IH1cbiAgICBvcHRpb25zW3Byb3BdID0gZGVmYXVsdHNbcHJvcF07XG4gIH1cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaGFsbG93Q29weShvYmopIHtcbiAgcmV0dXJuIG1lcmdlKHt9LCBvYmopO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5U2V0KG9iaikge1xuICB2YXIgc2V0ID0ge307XG5cbiAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICBzZXRbcHJvcF0gPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlMZW5ndGgob2JqKSB7XG4gIHZhciBjb3VudCA9IDA7XG5cbiAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICBjb3VudCsrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb3VudDtcbn1cbiJdfQ==
define('htmlbars-util/object-utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/object-utils.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/object-utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBQ3ZDLE9BQUssQ0FBQyxJQUFJLENBQUMsa0RBQWtELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDOUUsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbURBQW1ELENBQUMsQ0FBQztHQUN0RSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC9vYmplY3QtdXRpbHMuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy11dGlsJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy11dGlsL29iamVjdC11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC9vYmplY3QtdXRpbHMuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-util/quoting", ["exports"], function (exports) {
  exports.hash = hash;
  exports.repeat = repeat;
  function escapeString(str) {
    str = str.replace(/\\/g, "\\\\");
    str = str.replace(/"/g, '\\"');
    str = str.replace(/\n/g, "\\n");
    return str;
  }

  exports.escapeString = escapeString;

  function string(str) {
    return '"' + escapeString(str) + '"';
  }

  exports.string = string;

  function array(a) {
    return "[" + a + "]";
  }

  exports.array = array;

  function hash(pairs) {
    return "{" + pairs.join(", ") + "}";
  }

  function repeat(chars, times) {
    var str = "";
    while (times--) {
      str += chars;
    }
    return str;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvcXVvdGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxXQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUU7QUFDekIsT0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2pDLE9BQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMvQixPQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDaEMsV0FBTyxHQUFHLENBQUM7R0FDWjs7VUFFUSxZQUFZLEdBQVosWUFBWTs7QUFFckIsV0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQ25CLFdBQU8sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDdEM7O1VBRVEsTUFBTSxHQUFOLE1BQU07O0FBRWYsV0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQ2hCLFdBQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDdEI7O1VBRVEsS0FBSyxHQUFMLEtBQUs7O0FBRVAsV0FBUyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQzFCLFdBQU8sR0FBRyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO0dBQ3JDOztBQUVNLFdBQVMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDbkMsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2IsV0FBTyxLQUFLLEVBQUUsRUFBRTtBQUNkLFNBQUcsSUFBSSxLQUFLLENBQUM7S0FDZDtBQUNELFdBQU8sR0FBRyxDQUFDO0dBQ1oiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC9xdW90aW5nLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gZXNjYXBlU3RyaW5nKHN0cikge1xuICBzdHIgPSBzdHIucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpO1xuICBzdHIgPSBzdHIucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICBzdHIgPSBzdHIucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIik7XG4gIHJldHVybiBzdHI7XG59XG5cbmV4cG9ydCB7IGVzY2FwZVN0cmluZyB9O1xuXG5mdW5jdGlvbiBzdHJpbmcoc3RyKSB7XG4gIHJldHVybiAnXCInICsgZXNjYXBlU3RyaW5nKHN0cikgKyAnXCInO1xufVxuXG5leHBvcnQgeyBzdHJpbmcgfTtcblxuZnVuY3Rpb24gYXJyYXkoYSkge1xuICByZXR1cm4gXCJbXCIgKyBhICsgXCJdXCI7XG59XG5cbmV4cG9ydCB7IGFycmF5IH07XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNoKHBhaXJzKSB7XG4gIHJldHVybiBcIntcIiArIHBhaXJzLmpvaW4oXCIsIFwiKSArIFwifVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVwZWF0KGNoYXJzLCB0aW1lcykge1xuICB2YXIgc3RyID0gXCJcIjtcbiAgd2hpbGUgKHRpbWVzLS0pIHtcbiAgICBzdHIgKz0gY2hhcnM7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cbiJdfQ==
define('htmlbars-util/quoting.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/quoting.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/quoting.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvcXVvdGluZy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUN2QyxPQUFLLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3pFLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDhDQUE4QyxDQUFDLENBQUM7R0FDakUsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvcXVvdGluZy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXV0aWwnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXV0aWwvcXVvdGluZy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC9xdW90aW5nLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-util/safe-string', ['exports', './handlebars/safe-string'], function (exports, _handlebarsSafeString) {
  exports.default = _handlebarsSafeString.default;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJodG1sYmFycy11dGlsL3NhZmUtc3RyaW5nLmpzIiwic291cmNlc0NvbnRlbnQiOltdfQ==
define('htmlbars-util/safe-string.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/safe-string.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/safe-string.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvc2FmZS1zdHJpbmcuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDdkMsT0FBSyxDQUFDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUM3RSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0dBQ3JFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy11dGlsL3NhZmUtc3RyaW5nLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtdXRpbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("htmlbars-util/template-utils", ["exports", "../htmlbars-util/morph-utils"], function (exports, _htmlbarsUtilMorphUtils) {
  exports.RenderState = RenderState;
  exports.blockFor = blockFor;
  exports.renderAndCleanup = renderAndCleanup;
  exports.clearMorph = clearMorph;
  exports.clearMorphList = clearMorphList;

  function RenderState(renderNode, morphList) {
    // The morph list that is no longer needed and can be
    // destroyed.
    this.morphListToClear = morphList;

    // The morph list that needs to be pruned of any items
    // that were not yielded on a subsequent render.
    this.morphListToPrune = null;

    // A map of morphs for each item yielded in during this
    // rendering pass. Any morphs in the DOM but not in this map
    // will be pruned during cleanup.
    this.handledMorphs = {};
    this.collisions = undefined;

    // The morph to clear once rendering is complete. By
    // default, we set this to the previous morph (to catch
    // the case where nothing is yielded; in that case, we
    // should just clear the morph). Otherwise this gets set
    // to null if anything is rendered.
    this.morphToClear = renderNode;

    this.shadowOptions = null;
  }

  function Block(render, template, blockOptions) {
    this.render = render;
    this.template = template;
    this.blockOptions = blockOptions;
    this.arity = template.arity;
  }

  Block.prototype.invoke = function (env, blockArguments, self, renderNode, parentScope, visitor) {
    var _this = this;

    if (renderNode.lastResult) {
      renderNode.lastResult.revalidateWith(env, undefined, self, blockArguments, visitor);
    } else {
      (function () {
        var options = { renderState: new RenderState(renderNode) };
        var render = _this.render;
        var template = _this.template;
        var scope = _this.blockOptions.scope;

        var shadowScope = scope ? env.hooks.createChildScope(scope) : env.hooks.createFreshScope();

        env.hooks.bindShadowScope(env, parentScope, shadowScope, _this.blockOptions.options);

        if (self !== undefined) {
          env.hooks.bindSelf(env, shadowScope, self);
        } else if (_this.blockOptions.self !== undefined) {
          env.hooks.bindSelf(env, shadowScope, _this.blockOptions.self);
        }

        bindBlocks(env, shadowScope, _this.blockOptions.yieldTo);

        renderAndCleanup(renderNode, env, options, null, function () {
          options.renderState.morphToClear = null;
          render(template, env, shadowScope, { renderNode: renderNode, blockArguments: blockArguments });
        });
      })();
    }
  };

  function blockFor(render, template, blockOptions) {
    return new Block(render, template, blockOptions);
  }

  function bindBlocks(env, shadowScope, blocks) {
    if (!blocks) {
      return;
    }
    if (blocks instanceof Block) {
      env.hooks.bindBlock(env, shadowScope, blocks);
    } else {
      for (var name in blocks) {
        if (blocks.hasOwnProperty(name)) {
          env.hooks.bindBlock(env, shadowScope, blocks[name], name);
        }
      }
    }
  }

  function renderAndCleanup(morph, env, options, shadowOptions, callback) {
    // The RenderState object is used to collect information about what the
    // helper or hook being invoked has yielded. Once it has finished either
    // yielding multiple items (via yieldItem) or a single template (via
    // yieldTemplate), we detect what was rendered and how it differs from
    // the previous render, cleaning up old state in DOM as appropriate.
    var renderState = options.renderState;
    renderState.collisions = undefined;
    renderState.shadowOptions = shadowOptions;

    // Invoke the callback, instructing it to save information about what it
    // renders into RenderState.
    var result = callback(options);

    // The hook can opt-out of cleanup if it handled cleanup itself.
    if (result && result.handled) {
      return;
    }

    var morphMap = morph.morphMap;

    // Walk the morph list, clearing any items that were yielded in a previous
    // render but were not yielded during this render.
    var morphList = renderState.morphListToPrune;
    if (morphList) {
      var handledMorphs = renderState.handledMorphs;
      var item = morphList.firstChildMorph;

      while (item) {
        var next = item.nextMorph;

        // If we don't see the key in handledMorphs, it wasn't
        // yielded in and we can safely remove it from DOM.
        if (!(item.key in handledMorphs)) {
          delete morphMap[item.key];
          clearMorph(item, env, true);
          item.destroy();
        }

        item = next;
      }
    }

    morphList = renderState.morphListToClear;
    if (morphList) {
      clearMorphList(morphList, morph, env);
    }

    var toClear = renderState.morphToClear;
    if (toClear) {
      clearMorph(toClear, env);
    }
  }

  function clearMorph(morph, env, destroySelf) {
    var cleanup = env.hooks.cleanupRenderNode;
    var destroy = env.hooks.destroyRenderNode;
    var willCleanup = env.hooks.willCleanupTree;
    var didCleanup = env.hooks.didCleanupTree;

    function destroyNode(node) {
      if (cleanup) {
        cleanup(node);
      }
      if (destroy) {
        destroy(node);
      }
    }

    if (willCleanup) {
      willCleanup(env, morph, destroySelf);
    }
    if (cleanup) {
      cleanup(morph);
    }
    if (destroySelf && destroy) {
      destroy(morph);
    }

    _htmlbarsUtilMorphUtils.visitChildren(morph.childNodes, destroyNode);

    // TODO: Deal with logical children that are not in the DOM tree
    morph.clear();
    if (didCleanup) {
      didCleanup(env, morph, destroySelf);
    }

    morph.lastResult = null;
    morph.lastYielded = null;
    morph.childNodes = null;
  }

  function clearMorphList(morphList, morph, env) {
    var item = morphList.firstChildMorph;

    while (item) {
      var next = item.nextMorph;
      delete morph.morphMap[item.key];
      clearMorph(item, env, true);
      item.destroy();

      item = next;
    }

    // Remove the MorphList from the morph.
    morphList.clear();
    morph.morphList = null;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVPLFdBQVMsV0FBVyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUU7OztBQUdqRCxRQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDOzs7O0FBSWxDLFFBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7Ozs7O0FBSzdCLFFBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLFFBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDOzs7Ozs7O0FBTzVCLFFBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDOztBQUUvQixRQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztHQUMzQjs7QUFFRCxXQUFTLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRTtBQUM3QyxRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUN6QixRQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztBQUNqQyxRQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7R0FDN0I7O0FBRUQsT0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsVUFBUyxHQUFHLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRTs7O0FBQzdGLFFBQUksVUFBVSxDQUFDLFVBQVUsRUFBRTtBQUN6QixnQkFBVSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3JGLE1BQU07O0FBQ0wsWUFBSSxPQUFPLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFN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QUssRUFBRSxDQUFDO0FBQ2xCLFNBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0dBQ3hCIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2aXNpdENoaWxkcmVuIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIFJlbmRlclN0YXRlKHJlbmRlck5vZGUsIG1vcnBoTGlzdCkge1xuICAvLyBUaGUgbW9ycGggbGlzdCB0aGF0IGlzIG5vIGxvbmdlciBuZWVkZWQgYW5kIGNhbiBiZVxuICAvLyBkZXN0cm95ZWQuXG4gIHRoaXMubW9ycGhMaXN0VG9DbGVhciA9IG1vcnBoTGlzdDtcblxuICAvLyBUaGUgbW9ycGggbGlzdCB0aGF0IG5lZWRzIHRvIGJlIHBydW5lZCBvZiBhbnkgaXRlbXNcbiAgLy8gdGhhdCB3ZXJlIG5vdCB5aWVsZGVkIG9uIGEgc3Vic2VxdWVudCByZW5kZXIuXG4gIHRoaXMubW9ycGhMaXN0VG9QcnVuZSA9IG51bGw7XG5cbiAgLy8gQSBtYXAgb2YgbW9ycGhzIGZvciBlYWNoIGl0ZW0geWllbGRlZCBpbiBkdXJpbmcgdGhpc1xuICAvLyByZW5kZXJpbmcgcGFzcy4gQW55IG1vcnBocyBpbiB0aGUgRE9NIGJ1dCBub3QgaW4gdGhpcyBtYXBcbiAgLy8gd2lsbCBiZSBwcnVuZWQgZHVyaW5nIGNsZWFudXAuXG4gIHRoaXMuaGFuZGxlZE1vcnBocyA9IHt9O1xuICB0aGlzLmNvbGxpc2lvbnMgPSB1bmRlZmluZWQ7XG5cbiAgLy8gVGhlIG1vcnBoIHRvIGNsZWFyIG9uY2UgcmVuZGVyaW5nIGlzIGNvbXBsZXRlLiBCeVxuICAvLyBkZWZhdWx0LCB3ZSBzZXQgdGhpcyB0byB0aGUgcHJldmlvdXMgbW9ycGggKHRvIGNhdGNoXG4gIC8vIHRoZSBjYXNlIHdoZXJlIG5vdGhpbmcgaXMgeWllbGRlZDsgaW4gdGhhdCBjYXNlLCB3ZVxuICAvLyBzaG91bGQganVzdCBjbGVhciB0aGUgbW9ycGgpLiBPdGhlcndpc2UgdGhpcyBnZXRzIHNldFxuICAvLyB0byBudWxsIGlmIGFueXRoaW5nIGlzIHJlbmRlcmVkLlxuICB0aGlzLm1vcnBoVG9DbGVhciA9IHJlbmRlck5vZGU7XG5cbiAgdGhpcy5zaGFkb3dPcHRpb25zID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gQmxvY2socmVuZGVyLCB0ZW1wbGF0ZSwgYmxvY2tPcHRpb25zKSB7XG4gIHRoaXMucmVuZGVyID0gcmVuZGVyO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gIHRoaXMuYmxvY2tPcHRpb25zID0gYmxvY2tPcHRpb25zO1xuICB0aGlzLmFyaXR5ID0gdGVtcGxhdGUuYXJpdHk7XG59XG5cbkJsb2NrLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbihlbnYsIGJsb2NrQXJndW1lbnRzLCBzZWxmLCByZW5kZXJOb2RlLCBwYXJlbnRTY29wZSwgdmlzaXRvcikge1xuICBpZiAocmVuZGVyTm9kZS5sYXN0UmVzdWx0KSB7XG4gICAgcmVuZGVyTm9kZS5sYXN0UmVzdWx0LnJldmFsaWRhdGVXaXRoKGVudiwgdW5kZWZpbmVkLCBzZWxmLCBibG9ja0FyZ3VtZW50cywgdmlzaXRvcik7XG4gIH0gZWxzZSB7XG4gICAgbGV0IG9wdGlvbnMgPSB7IHJlbmRlclN0YXRlOiBuZXcgUmVuZGVyU3RhdGUocmVuZGVyTm9kZSkgfTtcbiAgICBsZXQgeyByZW5kZXIsIHRlbXBsYXRlLCBibG9ja09wdGlvbnM6IHsgc2NvcGUgfSB9ID0gdGhpcztcbiAgICBsZXQgc2hhZG93U2NvcGUgPSBzY29wZSA/IGVudi5ob29rcy5jcmVhdGVDaGlsZFNjb3BlKHNjb3BlKSA6IGVudi5ob29rcy5jcmVhdGVGcmVzaFNjb3BlKCk7XG5cbiAgICBlbnYuaG9va3MuYmluZFNoYWRvd1Njb3BlKGVudiwgcGFyZW50U2NvcGUsIHNoYWRvd1Njb3BlLCB0aGlzLmJsb2NrT3B0aW9ucy5vcHRpb25zKTtcblxuICAgIGlmIChzZWxmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGVudi5ob29rcy5iaW5kU2VsZihlbnYsIHNoYWRvd1Njb3BlLCBzZWxmKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuYmxvY2tPcHRpb25zLnNlbGYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZW52Lmhvb2tzLmJpbmRTZWxmKGVudiwgc2hhZG93U2NvcGUsIHRoaXMuYmxvY2tPcHRpb25zLnNlbGYpO1xuICAgIH1cblxuICAgIGJpbmRCbG9ja3MoZW52LCBzaGFkb3dTY29wZSwgdGhpcy5ibG9ja09wdGlvbnMueWllbGRUbyk7XG5cbiAgICByZW5kZXJBbmRDbGVhbnVwKHJlbmRlck5vZGUsIGVudiwgb3B0aW9ucywgbnVsbCwgZnVuY3Rpb24oKSB7XG4gICAgICBvcHRpb25zLnJlbmRlclN0YXRlLm1vcnBoVG9DbGVhciA9IG51bGw7XG4gICAgICByZW5kZXIodGVtcGxhdGUsIGVudiwgc2hhZG93U2NvcGUsIHsgcmVuZGVyTm9kZSwgYmxvY2tBcmd1bWVudHMgfSk7XG4gICAgfSk7XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9ja0ZvcihyZW5kZXIsIHRlbXBsYXRlLCBibG9ja09wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBCbG9jayhyZW5kZXIsIHRlbXBsYXRlLCBibG9ja09wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBiaW5kQmxvY2tzKGVudiwgc2hhZG93U2NvcGUsIGJsb2Nrcykge1xuICBpZiAoIWJsb2Nrcykge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoYmxvY2tzIGluc3RhbmNlb2YgQmxvY2spIHtcbiAgICBlbnYuaG9va3MuYmluZEJsb2NrKGVudiwgc2hhZG93U2NvcGUsIGJsb2Nrcyk7XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiBibG9ja3MpIHtcbiAgICAgIGlmIChibG9ja3MuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZW52Lmhvb2tzLmJpbmRCbG9jayhlbnYsIHNoYWRvd1Njb3BlLCBibG9ja3NbbmFtZV0sIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQW5kQ2xlYW51cChtb3JwaCwgZW52LCBvcHRpb25zLCBzaGFkb3dPcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBUaGUgUmVuZGVyU3RhdGUgb2JqZWN0IGlzIHVzZWQgdG8gY29sbGVjdCBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IHRoZVxuICAvLyBoZWxwZXIgb3IgaG9vayBiZWluZyBpbnZva2VkIGhhcyB5aWVsZGVkLiBPbmNlIGl0IGhhcyBmaW5pc2hlZCBlaXRoZXJcbiAgLy8geWllbGRpbmcgbXVsdGlwbGUgaXRlbXMgKHZpYSB5aWVsZEl0ZW0pIG9yIGEgc2luZ2xlIHRlbXBsYXRlICh2aWFcbiAgLy8geWllbGRUZW1wbGF0ZSksIHdlIGRldGVjdCB3aGF0IHdhcyByZW5kZXJlZCBhbmQgaG93IGl0IGRpZmZlcnMgZnJvbVxuICAvLyB0aGUgcHJldmlvdXMgcmVuZGVyLCBjbGVhbmluZyB1cCBvbGQgc3RhdGUgaW4gRE9NIGFzIGFwcHJvcHJpYXRlLlxuICB2YXIgcmVuZGVyU3RhdGUgPSBvcHRpb25zLnJlbmRlclN0YXRlO1xuICByZW5kZXJTdGF0ZS5jb2xsaXNpb25zID0gdW5kZWZpbmVkO1xuICByZW5kZXJTdGF0ZS5zaGFkb3dPcHRpb25zID0gc2hhZG93T3B0aW9ucztcblxuICAvLyBJbnZva2UgdGhlIGNhbGxiYWNrLCBpbnN0cnVjdGluZyBpdCB0byBzYXZlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgaXRcbiAgLy8gcmVuZGVycyBpbnRvIFJlbmRlclN0YXRlLlxuICB2YXIgcmVzdWx0ID0gY2FsbGJhY2sob3B0aW9ucyk7XG5cbiAgLy8gVGhlIGhvb2sgY2FuIG9wdC1vdXQgb2YgY2xlYW51cCBpZiBpdCBoYW5kbGVkIGNsZWFudXAgaXRzZWxmLlxuICBpZiAocmVzdWx0ICYmIHJlc3VsdC5oYW5kbGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG1vcnBoTWFwID0gbW9ycGgubW9ycGhNYXA7XG5cbiAgLy8gV2FsayB0aGUgbW9ycGggbGlzdCwgY2xlYXJpbmcgYW55IGl0ZW1zIHRoYXQgd2VyZSB5aWVsZGVkIGluIGEgcHJldmlvdXNcbiAgLy8gcmVuZGVyIGJ1dCB3ZXJlIG5vdCB5aWVsZGVkIGR1cmluZyB0aGlzIHJlbmRlci5cbiAgbGV0IG1vcnBoTGlzdCA9IHJlbmRlclN0YXRlLm1vcnBoTGlzdFRvUHJ1bmU7XG4gIGlmIChtb3JwaExpc3QpIHtcbiAgICBsZXQgaGFuZGxlZE1vcnBocyA9IHJlbmRlclN0YXRlLmhhbmRsZWRNb3JwaHM7XG4gICAgbGV0IGl0ZW0gPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuXG4gICAgd2hpbGUgKGl0ZW0pIHtcbiAgICAgIGxldCBuZXh0ID0gaXRlbS5uZXh0TW9ycGg7XG5cbiAgICAgIC8vIElmIHdlIGRvbid0IHNlZSB0aGUga2V5IGluIGhhbmRsZWRNb3JwaHMsIGl0IHdhc24ndFxuICAgICAgLy8geWllbGRlZCBpbiBhbmQgd2UgY2FuIHNhZmVseSByZW1vdmUgaXQgZnJvbSBET00uXG4gICAgICBpZiAoIShpdGVtLmtleSBpbiBoYW5kbGVkTW9ycGhzKSkge1xuICAgICAgICBkZWxldGUgbW9ycGhNYXBbaXRlbS5rZXldO1xuICAgICAgICBjbGVhck1vcnBoKGl0ZW0sIGVudiwgdHJ1ZSk7XG4gICAgICAgIGl0ZW0uZGVzdHJveSgpO1xuICAgICAgfVxuXG4gICAgICBpdGVtID0gbmV4dDtcbiAgICB9XG4gIH1cblxuICBtb3JwaExpc3QgPSByZW5kZXJTdGF0ZS5tb3JwaExpc3RUb0NsZWFyO1xuICBpZiAobW9ycGhMaXN0KSB7XG4gICAgY2xlYXJNb3JwaExpc3QobW9ycGhMaXN0LCBtb3JwaCwgZW52KTtcbiAgfVxuXG4gIGxldCB0b0NsZWFyID0gcmVuZGVyU3RhdGUubW9ycGhUb0NsZWFyO1xuICBpZiAodG9DbGVhcikge1xuICAgIGNsZWFyTW9ycGgodG9DbGVhciwgZW52KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJNb3JwaChtb3JwaCwgZW52LCBkZXN0cm95U2VsZikge1xuICB2YXIgY2xlYW51cCA9IGVudi5ob29rcy5jbGVhbnVwUmVuZGVyTm9kZTtcbiAgdmFyIGRlc3Ryb3kgPSBlbnYuaG9va3MuZGVzdHJveVJlbmRlck5vZGU7XG4gIHZhciB3aWxsQ2xlYW51cCA9IGVudi5ob29rcy53aWxsQ2xlYW51cFRyZWU7XG4gIHZhciBkaWRDbGVhbnVwID0gZW52Lmhvb2tzLmRpZENsZWFudXBUcmVlO1xuXG4gIGZ1bmN0aW9uIGRlc3Ryb3lOb2RlKG5vZGUpIHtcbiAgICBpZiAoY2xlYW51cCkgeyBjbGVhbnVwKG5vZGUpOyB9XG4gICAgaWYgKGRlc3Ryb3kpIHsgZGVzdHJveShub2RlKTsgfVxuICB9XG5cbiAgaWYgKHdpbGxDbGVhbnVwKSB7IHdpbGxDbGVhbnVwKGVudiwgbW9ycGgsIGRlc3Ryb3lTZWxmKTsgfVxuICBpZiAoY2xlYW51cCkgeyBjbGVhbnVwKG1vcnBoKTsgfVxuICBpZiAoZGVzdHJveVNlbGYgJiYgZGVzdHJveSkgeyBkZXN0cm95KG1vcnBoKTsgfVxuXG4gIHZpc2l0Q2hpbGRyZW4obW9ycGguY2hpbGROb2RlcywgZGVzdHJveU5vZGUpO1xuXG4gIC8vIFRPRE86IERlYWwgd2l0aCBsb2dpY2FsIGNoaWxkcmVuIHRoYXQgYXJlIG5vdCBpbiB0aGUgRE9NIHRyZWVcbiAgbW9ycGguY2xlYXIoKTtcbiAgaWYgKGRpZENsZWFudXApIHsgZGlkQ2xlYW51cChlbnYsIG1vcnBoLCBkZXN0cm95U2VsZik7IH1cblxuICBtb3JwaC5sYXN0UmVzdWx0ID0gbnVsbDtcbiAgbW9ycGgubGFzdFlpZWxkZWQgPSBudWxsO1xuICBtb3JwaC5jaGlsZE5vZGVzID0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTW9ycGhMaXN0KG1vcnBoTGlzdCwgbW9ycGgsIGVudikge1xuICBsZXQgaXRlbSA9IG1vcnBoTGlzdC5maXJzdENoaWxkTW9ycGg7XG5cbiAgd2hpbGUgKGl0ZW0pIHtcbiAgICBsZXQgbmV4dCA9IGl0ZW0ubmV4dE1vcnBoO1xuICAgIGRlbGV0ZSBtb3JwaC5tb3JwaE1hcFtpdGVtLmtleV07XG4gICAgY2xlYXJNb3JwaChpdGVtLCBlbnYsIHRydWUpO1xuICAgIGl0ZW0uZGVzdHJveSgpO1xuXG4gICAgaXRlbSA9IG5leHQ7XG4gIH1cblxuICAvLyBSZW1vdmUgdGhlIE1vcnBoTGlzdCBmcm9tIHRoZSBtb3JwaC5cbiAgbW9ycGhMaXN0LmNsZWFyKCk7XG4gIG1vcnBoLm1vcnBoTGlzdCA9IG51bGw7XG59XG4iXX0=
define('htmlbars-util/template-utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/template-utils.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/template-utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDdkMsT0FBSyxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUNoRixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxxREFBcUQsQ0FBQyxDQUFDO0dBQ3hFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy11dGlsL3RlbXBsYXRlLXV0aWxzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtdXRpbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC90ZW1wbGF0ZS11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC90ZW1wbGF0ZS11dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("htmlbars-util/void-tag-names", ["exports", "./array-utils"], function (exports, _arrayUtils) {

  // The HTML elements in this list are speced by
  // http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
  // and will be forced to close regardless of if they have a
  // self-closing /> at the end.
  var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
  var voidMap = {};

  _arrayUtils.forEach(voidTagNames.split(" "), function (tagName) {
    voidMap[tagName] = true;
  });

  exports.default = voidMap;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvdm9pZC10YWctbmFtZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBTUEsTUFBSSxZQUFZLEdBQUcscUZBQXFGLENBQUM7QUFDekcsTUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDOztBQUVqQixjQVRTLE9BQU8sQ0FTUixZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVMsT0FBTyxFQUFFO0FBQ2pELFdBQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7R0FDekIsQ0FBQyxDQUFDOztvQkFFWSxPQUFPIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvdm9pZC10YWctbmFtZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JFYWNoIH0gZnJvbSBcIi4vYXJyYXktdXRpbHNcIjtcblxuLy8gVGhlIEhUTUwgZWxlbWVudHMgaW4gdGhpcyBsaXN0IGFyZSBzcGVjZWQgYnlcbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2h0bWwtbWFya3VwL3N5bnRheC5odG1sI3N5bnRheC1lbGVtZW50cyxcbi8vIGFuZCB3aWxsIGJlIGZvcmNlZCB0byBjbG9zZSByZWdhcmRsZXNzIG9mIGlmIHRoZXkgaGF2ZSBhXG4vLyBzZWxmLWNsb3NpbmcgLz4gYXQgdGhlIGVuZC5cbnZhciB2b2lkVGFnTmFtZXMgPSBcImFyZWEgYmFzZSBiciBjb2wgY29tbWFuZCBlbWJlZCBociBpbWcgaW5wdXQga2V5Z2VuIGxpbmsgbWV0YSBwYXJhbSBzb3VyY2UgdHJhY2sgd2JyXCI7XG52YXIgdm9pZE1hcCA9IHt9O1xuXG5mb3JFYWNoKHZvaWRUYWdOYW1lcy5zcGxpdChcIiBcIiksIGZ1bmN0aW9uKHRhZ05hbWUpIHtcbiAgdm9pZE1hcFt0YWdOYW1lXSA9IHRydWU7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgdm9pZE1hcDtcbiJdfQ==
define('htmlbars-util/void-tag-names.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-util');
  QUnit.test('htmlbars-util/void-tag-names.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-util/void-tag-names.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvdm9pZC10YWctbmFtZXMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDdkMsT0FBSyxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUNoRixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxxREFBcUQsQ0FBQyxDQUFDO0dBQ3hFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy11dGlsL3ZvaWQtdGFnLW5hbWVzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtdXRpbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtdXRpbC92b2lkLXRhZy1uYW1lcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtdXRpbC92b2lkLXRhZy1uYW1lcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=