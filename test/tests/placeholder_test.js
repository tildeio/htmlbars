import { Placeholder } from "htmlbars/runtime/placeholder";
import { PlaceholderList } from "htmlbars/runtime/placeholder_list";
import { testDom, equalDomHTML, dom } from "test_helpers"; //TODO
import { equalHTML } from "test_helpers";

function placeholderTests(factory) {
  testDom('appendChild '+factory.name, function (dom) {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      p, html;

    p = dom.createElement('p');
    p.appendChild(dom.createTextNode('appended'));

    placeholder.appendChild(p);

    html = startHTML+contentHTML+'<p>appended</p>'+endHTML;

    equalDomHTML(dom,fragment, html);

    p = dom.createElement('p');
    p.appendChild(dom.createTextNode('more'));
    placeholder.appendChild(p);

    fixture.appendChild(dom.fragmentToDocumentFragment(fragment));

    html = startHTML+contentHTML+'<p>appended</p><p>more</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  testDom('appendText '+factory.name, function (dom) {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.appendText('appended text');

    html = startHTML+contentHTML+'appended text'+endHTML;

    equalDomHTML(dom, fragment, html);

    placeholder.appendText(' more');

    fixture.appendChild(dom.fragmentToDocumentFragment(fragment));

    html = startHTML+contentHTML+'appended text more'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('appendHTML '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.appendHTML('<p>A</p><p>B</p><p>C</p>');

    html = startHTML+contentHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;

    equalHTML(fragment, html);

    placeholder.appendHTML('<p>A</p><p>B</p><p>C</p>');

    fixture.appendChild(dom.fragmentToDocumentFragment(fragment));

    html = startHTML+contentHTML+'<p>A</p><p>B</p><p>C</p><p>A</p><p>B</p><p>C</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  testDom('clear '+factory.name, function (dom) {
    var setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.clear();

    html = startHTML+endHTML;

    equalDomHTML(dom, fragment, html);
  });

  testDom('clear after insert '+factory.name, function (dom) {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.clear();

    fixture.appendChild(dom.fragmentToDocumentFragment(fragment));

    html = startHTML+endHTML;

    equal(fixture.innerHTML, html);
  });

  testDom('replace '+factory.name, function (dom) {
    var setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      p = dom.createElement('p'),
      html;

    p.appendChild(dom.createTextNode('replaced'));

    placeholder.replace(p);

    html = startHTML+'<p>replaced</p>'+endHTML;

    equalDomHTML(dom, fragment, html);
  });
}

function placeholderListTests(factory) {
  testDom('various list operations with fragments '+factory.name, function (dom) {
    var setup = factory.create(dom),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    var placeholderList = new PlaceholderList(placeholder);

    var A = element(dom, 'p', 'A');
    var B = element(dom, 'p', 'B');
    var C = element(dom, 'p', 'C');
    var D = element(dom, 'p', 'D');
    var E = element(dom, 'p', 'E');
    var F = element(dom, 'p', 'F');

    var fragmentABC = fragmentFor(dom, A,B,C);
    var fragmentEF = fragmentFor(dom, E,F);

    placeholderList.append([fragmentABC, D, fragmentEF]);

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p>'+endHTML;
    equalDomHTML(dom, fragment, html);

    equal(placeholderList.list[0].start, placeholder.start);
    equal(placeholderList.list[0].end, D);
    equal(placeholderList.list[1].start, C);
    equal(placeholderList.list[1].end, E);
    equal(placeholderList.list[2].start, D);
    equal(placeholderList.list[2].end, placeholder.end);

    placeholderList.replace(1,2);

    html = startHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;
    equalDomHTML(dom, fragment, html);

    equal(placeholderList.list.length, 1);
    equal(placeholderList.list[0].start, placeholder.start);
    equal(placeholderList.list[0].end, placeholder.end);
  });
}

function fragmentFor(dom) {
  var fragment = dom.createDocumentFragment();
  for (var i=1,l=arguments.length; i<l; i++) {
    fragment.appendChild(arguments[i]);
  }
  return fragment;
}

function element(dom, tag, text) {
  var el = dom.createElement(tag);
  el.appendChild(dom.createTextNode(text));
  return el;
}

var parents = [
  {
    name: 'with parent as an element',
    create: function (dom, frag) {
      var parent = dom.createElement('div');
      frag.appendChild(parent);
      return parent;
    },
    startHTML: '<div>',
    endHTML: '</div>'
  },
  {
    name: 'with parent as a fragment',
    create: function (dom, frag) {
      return frag;
    },
    startHTML: '',
    endHTML: ''
  }
];

var starts = [
  {
    name: 'with sibling before',
    create: function (dom, parent) {
      var start = dom.createTextNode('Some text before ');
      parent.appendChild(start);
      return parent.childNodes.length-1;
    },
    HTML: 'Some text before '
  },
  {
    name: 'with no sibling before',
    create: function (dom, parent) {
      return -1;
    },
    HTML: ''
  }
];

var ends = [
  {
    name: 'and sibling after',
    create: function (dom, parent) {
      var end = dom.createTextNode(' some text after.');
      parent.appendChild(end);
      return parent.childNodes.length-1;
    },
    HTML: ' some text after.'
  },
  {
    name: 'and no sibling after',
    create: function (dom, parent) {
      return -1;
    },
    HTML: ''
  }
];

var contents = [
  {
    name: 'with an empty Placeholder',
    create: function (dom, parent) { },
    HTML: ''
  },
  {
    name: 'with some paragraphs in the Placeholder',
    create: function (dom, parent) {
      var p;
      p = dom.createElement('p');
      p.textContent = 'a';
      parent.appendChild(p);
      p = dom.createElement('p');
      p.textContent = 'b';
      parent.appendChild(p);
      p = dom.createElement('p');
      p.textContent = 'c';
      parent.appendChild(p);
    },
    HTML: '<p>a</p><p>b</p><p>c</p>'
  }
];

function iterateCombinations(parents, starts, ends, contents, callback) {
  function buildFactory(parentFactory, startFactory, endFactory, contentFactory) {
    return {
      name: [parentFactory.name, startFactory.name, endFactory.name, contentFactory.name].join(' '),
      create: function factory( dom ) {
        var fragment = dom.createDocumentFragment(),
        parent = parentFactory.create(dom, fragment),
        startIndex = startFactory.create(dom, parent),
        content = contentFactory.create(dom, parent),
        endIndex = endFactory.create(dom, parent);

        // this is prevented in the parser by generating
        // empty text nodes at boundaries of fragments

        if (parent === fragment && (startIndex === -1 || endIndex === -1)) {
          return null;
        }

        return {
          fragment: fragment,
          placeholder: new Placeholder(parent, startIndex, endIndex),
          startHTML: parentFactory.startHTML + startFactory.HTML,
          contentHTML: contentFactory.HTML,
          endHTML: endFactory.HTML + parentFactory.endHTML
        };
      }
    };
  }

  for (var i=0; i<parents.length; i++) {
    for (var j=0; j<starts.length; j++) {
      for (var k=0; k<ends.length; k++) {
        for (var l=0; l<contents.length; l++) {
          var factory = buildFactory(parents[i], starts[j], ends[k], contents[l]);
          if (factory.create(dom) === null) continue; // unsupported combo
          callback(factory);
        }
      }
    }
  }
}

QUnit.module('Placeholder');
iterateCombinations(parents, starts, ends, contents, placeholderTests);

QUnit.module('PlaceholderList');
iterateCombinations(parents, starts, ends, [{name:'', create: function(){},HTML:''}], placeholderListTests);
