define("htmlbars-compiler-tests/combined_ast_node-test",
  ["../htmlbars-compiler/parser","../htmlbars-compiler/ast"],
  function(__dependency1__, __dependency2__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var ProgramNode = __dependency2__.ProgramNode;
    var BlockNode = __dependency2__.BlockNode;
    var ComponentNode = __dependency2__.ComponentNode;
    var ElementNode = __dependency2__.ElementNode;
    var MustacheNode = __dependency2__.MustacheNode;
    var SexprNode = __dependency2__.SexprNode;
    var HashNode = __dependency2__.HashNode;
    var IdNode = __dependency2__.IdNode;
    var StringNode = __dependency2__.StringNode;
    var AttrNode = __dependency2__.AttrNode;
    var TextNode = __dependency2__.TextNode;

    var svgNamespace = "http://www.w3.org/2000/svg";

    QUnit.module("HTML-based compiler (AST)");

    var stripLeft = { left: true, right: false };
    var stripRight = { left: false, right: true };
    var stripBoth = { left: true, right: true };
    var stripNone = { left: false, right: false };

    function id(string) {
      return new IdNode([{ part: string }]);
    }

    function sexpr(params, hash) {
      var sexprNode = new SexprNode(params, hash || undefined);
      if (sexprNode.isHelper) {
        sexprNode.isHelper = true;
      }
      return sexprNode;
    }

    function hash(pairs) {
      return pairs ? new HashNode(pairs) : undefined;
    }

    function mustache(string, pairs, strip, raw) {
      var params;

      if (({}).toString.call(string) === '[object Array]') {
        params = string;
      } else {
        params = [id(string)];
      }

      return new MustacheNode(params, hash(pairs), raw ? '{{{' : '{{', strip || stripNone);
    }

    function concat(params) {
      return mustache([id('concat')].concat(params));
    }

    function string(data) {
      return new StringNode(data);
    }

    function element(tagName, attributes, helpers, children) {
      return new ElementNode(tagName, attributes || [], helpers || [], children || []);
    }

    function svgElement(tagName, attributes, helpers, children) {
      var e = element(tagName, attributes, helpers, children);
      e.namespaceURI = svgNamespace;
      return e;
    }

    function svgHTMLIntegrationPoint(tagName, attributes, helpers, children) {
      var e = svgElement(tagName, attributes, helpers, children);
      e.isHTMLIntegrationPoint = true;
      return e;
    }

    function component(tagName, attributes, children) {
      return new ComponentNode(tagName, attributes || [], children || []);
    }

    function attr(name, value) {
      return new AttrNode(name, value);
    }

    function text(chars) {
      return new TextNode(chars);
    }

    function block(mustache, program, inverse, strip) {
      return new BlockNode(mustache, program, inverse || null, strip || stripNone);
    }

    function program(children, strip) {
      return new ProgramNode(children || [], strip || stripNone);
    }

    function root(children) {
      return program(children || [], {});
    }

    function removeLocInfo(obj) {
      delete obj.firstColumn;
      delete obj.firstLine;
      delete obj.lastColumn;
      delete obj.lastLine;

      for (var k in obj) {
        if (obj.hasOwnProperty(k) && obj[k] && typeof obj[k] === 'object') {
          removeLocInfo(obj[k]);
        }
      }
    }

    function astEqual(actual, expected, message) {
      // Perform a deepEqual but recursively remove the locInfo stuff
      // (e.g. line/column information about the compiled template)
      // that we don't want to have to write into our test cases.

      if (typeof actual === 'string') actual = preprocess(actual);
      if (typeof expected === 'string') expected = preprocess(expected);

      removeLocInfo(actual);
      removeLocInfo(expected);

      deepEqual(actual, expected, message);
    }

    test("a simple piece of content", function() {
      var t = 'some content';
      astEqual(t, root([
        text('some content')
      ]));
    });

    test("self-closed element", function() {
      var t = '<g />';
      astEqual(t, root([
        element("g")
      ]));
    });

    test("svg content", function() {
      var t = "<svg></svg>";
      astEqual(t, root([
        svgElement("svg")
      ]));
    });

    test("html content with html content inline", function() {
      var t = '<div><p></p></div>';
      astEqual(t, root([
        element("div", [], [], [
          element("p")
        ])
      ]));
    });

    test("html content with svg content inline", function() {
      var t = '<div><svg></svg></div>';
      astEqual(t, root([
        element("div", [], [], [
          svgElement("svg")
        ])
      ]));
    });

    var integrationPoints = ['foreignObject', 'desc', 'title'];
    function buildIntegrationPointTest(integrationPoint){
      return function integrationPointTest(){
        var t = '<svg><'+integrationPoint+'><div></div></'+integrationPoint+'></svg>';
        astEqual(t, root([
          svgElement("svg", [], [], [
            svgHTMLIntegrationPoint(integrationPoint, [], [], [
              element("div")
            ])
          ])
        ]));
      };
    }
    for (var i=0, length = integrationPoints.length; i<length; i++) {
      test(
        "svg content with html content inline for "+integrationPoints[i],
        buildIntegrationPointTest(integrationPoints[i])
      );
    }

    test("a piece of content with HTML", function() {
      var t = 'some <div>content</div> done';
      astEqual(t, root([
        text("some "),
        element("div", [], [], [
          text("content")
        ]),
        text(" done")
      ]));
    });

    test("a piece of Handlebars with HTML", function() {
      var t = 'some <div>{{content}}</div> done';
      astEqual(t, root([
        text("some "),
        element("div", [], [], [
          mustache('content')
        ]),
        text(" done")
      ]));
    });

    test("Handlebars embedded in an attribute", function() {
      var t = 'some <div class="{{foo}}">content</div> done';
      astEqual(t, root([
        text("some "),
        element("div", [ attr("class", mustache('foo')) ], [], [
          text("content")
        ]),
        text(" done")
      ]));
    });

    test("Handlebars embedded in an attribute (sexprs)", function() {
      var t = 'some <div class="{{foo (foo "abc")}}">content</div> done';
      astEqual(t, root([
        text("some "),
        element("div", [
          attr("class", mustache([id('foo'), sexpr([id('foo'), string('abc')])]))
        ], [], [
          text("content")
        ]),
        text(" done")
      ]));
    });


    test("Handlebars embedded in an attribute with other content surrounding it", function() {
      var t = 'some <a href="http://{{link}}/">content</a> done';
      astEqual(t, root([
        text("some "),
        element("a", [
          attr("href", concat([
            string("http://"),
            sexpr([id('link')]),
            string("/")
          ]))
        ], [], [
          text("content")
        ]),
        text(" done")
      ]));
    });

    test("A more complete embedding example", function() {
      var t = "{{embed}} {{some 'content'}} " +
              "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
              " {{more 'embed'}}";
      astEqual(t, root([
        text(''),
        mustache('embed'),
        text(' '),
        mustache([id('some'), string('content')]),
        text(' '),
        element("div", [
          attr("class", concat([
            sexpr([id('foo')]),
            string(' '),
            sexpr([id('bind-class'), id('isEnabled')], hash([['truthy', string('enabled')]]))
          ]))
        ], [], [
          mustache('content')
        ]),
        text(' '),
        mustache([id('more'), string('embed')]),
        text('')
      ]));
    });

    test("Simple embedded block helpers", function() {
      var t = "{{#if foo}}<div>{{content}}</div>{{/if}}";
      astEqual(t, root([
        text(''),
        block(mustache([id('if'), id('foo')]), program([
          element('div', [], [], [
            mustache('content')
          ])
        ])),
        text('')
      ]));
    });

    test("Involved block helper", function() {
      var t = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
      astEqual(t, root([
        element('p', [], [], [
          text('hi')
        ]),
        text(' content '),
        block(mustache([id('testing'), id('shouldRender')]), program([
          element('p', [], [], [
            text('Appears!')
          ])
        ])),
        text(' more '),
        element('em', [], [], [
          text('content')
        ]),
        text(' here')
      ]));
    });

    test("Node helpers", function() {
      var t = "<p {{action 'boom'}} class='bar'>Some content</p>";
      astEqual(t, root([
        element('p', [attr('class', text('bar'))], [mustache([id('action'), string('boom')])], [
          text('Some content')
        ])
      ]));
    });

    test('Auto insertion of text nodes between blocks and mustaches', function () {
      var t = "{{one}}{{two}}{{#three}}{{/three}}{{#four}}{{/four}}{{five}}";
      astEqual(t, root([
        text(''),
        mustache([id('one')]),
        text(''),
        mustache([id('two')]),
        text(''),
        block(mustache([id('three')]), program()),
        text(''),
        block(mustache([id('four')]), program()),
        text(''),
        mustache([id('five')]),
        text('')
      ]));
    });

    test("Stripping - mustaches", function() {
      var t = "foo {{~content}} bar";
      astEqual(t, root([
        text('foo'),
        mustache([id('content')], null, stripLeft),
        text(' bar')
      ]));

      t = "foo {{content~}} bar";
      astEqual(t, root([
        text('foo '),
        mustache([id('content')], null, stripRight),
        text('bar')
      ]));
    });

    test("Stripping - blocks", function() {
      var t = "foo {{~#wat}}{{/wat}} bar";
      astEqual(t, root([
        text('foo'),
        block(mustache([id('wat')], null, stripLeft), program(), null, stripLeft),
        text(' bar')
      ]));

      t = "foo {{#wat}}{{/wat~}} bar";
      astEqual(t, root([
        text('foo '),
        block(mustache([id('wat')]), program(), null, stripRight),
        text('bar')
      ]));
    });


    test("Stripping - programs", function() {
      var t = "{{#wat~}} foo {{else}}{{/wat}}";
      astEqual(t, root([
        text(''),
        block(mustache([id('wat')], null, stripRight), program([
          text('foo ')
        ], stripLeft), program()),
        text('')
      ]));

      t = "{{#wat}} foo {{~else}}{{/wat}}";
      astEqual(t, root([
        text(''),
        block(mustache([id('wat')]), program([
          text(' foo')
        ], stripRight), program()),
        text('')
      ]));

      t = "{{#wat}}{{else~}} foo {{/wat}}";
      astEqual(t, root([
        text(''),
        block(mustache([id('wat')]), program(), program([
          text('foo ')
        ], stripLeft)),
        text('')
      ]));

      t = "{{#wat}}{{else}} foo {{~/wat}}";
      astEqual(t, root([
        text(''),
        block(mustache([id('wat')]), program(), program([
          text(' foo')
        ], stripRight)),
        text('')
      ]));
    });

    test("Stripping - removes unnecessary text nodes", function() {
      var t = "{{#each~}}\n  <li> foo </li>\n{{~/each}}";
      astEqual(t, root([
        text(''),
        block(mustache([id('each')], null, stripRight), program([
          element('li', [], [], [text(' foo ')])
        ], stripBoth)),
        text('')
      ]));
    });

    test("Mustache in unquoted attribute value", function() {
      var t = "<div class=a{{foo}}></div>";
      astEqual(t, root([
        element('div', [ attr('class', concat([string("a"), sexpr([id('foo')])])) ])
      ]));

      t = "<div class={{foo}}></div>";
      astEqual(t, root([
        element('div', [ attr('class', mustache('foo')) ])
      ]));

      t = "<div class=a{{foo}}b></div>";
      astEqual(t, root([
        element('div', [ attr('class', concat([string("a"), sexpr([id('foo')]), string("b")])) ])
      ]));

      t = "<div class={{foo}}b></div>";
      astEqual(t, root([
        element('div', [ attr('class', concat([sexpr([id('foo')]), string("b")])) ])
      ]));
    });

    test("Web components", function() {
      var t = "<x-foo id='{{bar}}' class='foo-{{bar}}'>{{a}}{{b}}c{{d}}</x-foo>{{e}}";
      astEqual(t, root([
        text(''),
        component('x-foo', [
          attr('id', mustache('bar')),
          attr('class', concat([ string('foo-'), sexpr([id('bar')]) ]))
        ], program([
          text(''),
          mustache('a'),
          text(''),
          mustache('b'),
          text('c'),
          mustache('d'),
          text('')
        ])),
        text(''),
        mustache('e'),
        text('')
      ]));
    });
  });
define("htmlbars-compiler-tests/fragment_test",
  ["../htmlbars-compiler/compiler/fragment_opcode","../htmlbars-compiler/compiler/hydration_opcode","../htmlbars-compiler/compiler/fragment","../htmlbars-compiler/compiler/hydration","../morph","../htmlbars-compiler/parser","../test/support/assertions"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__) {
    "use strict";
    var FragmentOpcodeCompiler = __dependency1__.FragmentOpcodeCompiler;
    var HydrationOpcodeCompiler = __dependency2__.HydrationOpcodeCompiler;
    var FragmentCompiler = __dependency3__.FragmentCompiler;
    var HydrationCompiler = __dependency4__.HydrationCompiler;
    var DOMHelper = __dependency5__.DOMHelper;
    var preprocess = __dependency6__.preprocess;
    var equalHTML = __dependency7__.equalHTML;

    var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
        svgNamespace = "http://www.w3.org/2000/svg";

    function fragmentFor(ast) {
      /* jshint evil: true */
      var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
          fragmentCompiler = new FragmentCompiler();

      var opcodes = fragmentOpcodeCompiler.compile(ast);
      var program = fragmentCompiler.compile(opcodes);

      var fn = new Function("dom", 'return ' + program)();

      return fn(new DOMHelper());
    }

    function hydratorFor(ast) {
      /* jshint evil: true */
      var hydrate = new HydrationOpcodeCompiler();
      var opcodes = hydrate.compile(ast);
      var hydrate2 = new HydrationCompiler();
      var program = hydrate2.compile(opcodes, []);
      return new Function("fragment", "context", "dom", "hooks", "env", "contextualElement", program);
    }

    QUnit.module('fragment');

    test('compiles a fragment', function () {
      var ast = preprocess("<div>{{foo}} bar {{baz}}</div>");
      var fragment = fragmentFor(ast);

      equalHTML(fragment, "<div> bar </div>");
    });

    test('compiles an svg fragment', function () {
      var ast = preprocess("<div><svg><circle/><foreignObject><span></span></foreignObject></svg></div>");
      var fragment = fragmentFor(ast);

      equal( fragment.childNodes[0].namespaceURI, svgNamespace,
             'svg has the right namespace' );
      equal( fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
             'circle has the right namespace' );
      equal( fragment.childNodes[0].childNodes[1].namespaceURI, svgNamespace,
             'foreignObject has the right namespace' );
      equal( fragment.childNodes[0].childNodes[1].childNodes[0].namespaceURI, xhtmlNamespace,
             'span has the right namespace' );
    });

    test('compiles an svg element with classes', function () {
      var ast = preprocess('<svg class="red right hand"></svg>');
      var fragment = fragmentFor(ast);

      equal(fragment.getAttribute('class'), 'red right hand');
    });

    test('converts entities to their char/string equivalent', function () {
      var ast = preprocess("<div title=\"&quot;Foo &amp; Bar&quot;\">lol &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax;</div>");
      var fragment = fragmentFor(ast);

      equal(fragment.getAttribute('title'), '"Foo & Bar"');
      equal(fragment.textContent, "lol < << < < ≧̸ &Borksnorlax;");
    });

    test('hydrates a fragment with morph mustaches', function () {
      var ast = preprocess("<div>{{foo \"foo\" 3 blah bar=baz ack=\"syn\"}} bar {{baz}}</div>");
      var fragment = fragmentFor(ast).cloneNode(true);
      var hydrate = hydratorFor(ast);

      var contentResolves = [];
      var context = {};
      var env = {
        dom: new DOMHelper(),
        hooks: {
          content: function(morph, path, context, params, options) {
            contentResolves.push({
              morph: morph,
              context: context,
              path: path,
              params: params,
              options: options
            });
          }
        }
      };

      hydrate(fragment, context, env.dom, env.hooks, env);

      equal(contentResolves.length, 2);

      var foo = contentResolves[0];
      equal(foo.morph.parent(), fragment);
      equal(foo.context, context);
      equal(foo.path, 'foo');
      deepEqual(foo.params, ["foo",3,"blah"]);
      deepEqual(foo.options.types, ["string","number","id"]);
      deepEqual(foo.options.hash, {ack:"syn",bar:"baz"});
      deepEqual(foo.options.hashTypes, {ack:"string",bar:"id"});
      equal(foo.options.escaped, true);

      var baz = contentResolves[1];
      equal(baz.morph.parent(), fragment);
      equal(baz.context, context);
      equal(baz.path, 'baz');
      equal(baz.params.length, 0);
      equal(baz.options.escaped, true);

      foo.morph.update('A');
      baz.morph.update('B');

      equalHTML(fragment, "<div>A bar B</div>");
    });

    test('test auto insertion of text nodes for needed edges a fragment with morph mustaches', function () {
      var ast = preprocess("{{first}}<p>{{second}}</p>{{third}}");
      var dom = new DOMHelper();
      var fragment = dom.cloneNode(fragmentFor(ast), true);
      var hydrate = hydratorFor(ast);

      var morphs = [];
      var fakeMorphDOM = new DOMHelper();
      fakeMorphDOM.createMorphAt = function(){
        var morph = dom.createMorphAt.apply(this, arguments);
        morphs.push(morph);
        return morph;
      };

      var contentResolves = [];
      var context = {};
      var env = {
        dom: fakeMorphDOM,
        hooks: {
          content: function(morph, path, context, params, options) {
            contentResolves.push({
              morph: morph,
              context: context,
              path: path,
              params: params,
              options: options
            });
          }
        }
      };

      hydrate(fragment, context, env.dom, env.hooks, env, document.body);

      equal(morphs.length, 3);

      var t = morphs[0].start;
      equal(t.nodeType, 3);
      equal(t.textContent , '');
      equal(morphs[1].start, null);
      equal(morphs[1].end, null);

      equal(morphs[2].start, morphs[1].parent());
      equal(morphs[2].end.nodeType, 3);
      equal(morphs[2].end.textContent, '');

      morphs[0].update('A');
      morphs[1].update('B');
      morphs[2].update('C');

      equalHTML(fragment, "A<p>B</p>C");
    });
  });
define("htmlbars-compiler-tests/html_compiler_test",
  ["../htmlbars-compiler/compiler","../htmlbars-compiler/utils","../simple-html-tokenizer","../htmlbars-runtime/hooks","../morph","../test/support/assertions"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__) {
    "use strict";
    var compile = __dependency1__.compile;
    var forEach = __dependency2__.forEach;
    var tokenize = __dependency3__.tokenize;
    var hydrationHooks = __dependency4__.hydrationHooks;
    var DOMHelper = __dependency5__.DOMHelper;
    var normalizeInnerHTML = __dependency6__.normalizeInnerHTML;

    var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
        svgNamespace   = "http://www.w3.org/2000/svg";

    function frag(element, string) {
      if (element instanceof DocumentFragment) {
        element = document.createElement('div');
      }

      var range = document.createRange();
      range.setStart(element, 0);
      range.collapse(false);
      return range.createContextualFragment(string);
    }

    var hooks, helpers, partials, env;

    function registerHelper(name, callback) {
      helpers[name] = callback;
    }

    function registerPartial(name, html) {
      partials[name] = compile(html);
    }

    function lookupHelper(helperName, context, options) {
      if (helperName === 'attribute') {
        return this.attribute;
      } else if (helperName === 'concat') {
        return this.concat;
      } else if (helperName === 'partial') {
        return this.partial;
      } else {
        return helpers[helperName];
      }
    }

    function compilesTo(html, expected, context) {
      var template = compile(html);
      var fragment = template(context, env, document.body);
      equalTokens(fragment, expected === undefined ? html : expected);
      return fragment;
    }

    QUnit.module("HTML-based compiler (output)", {
      setup: function() {
        helpers = {};
        partials = {};
        hooks = hydrationHooks({lookupHelper : lookupHelper});

        env = {
          hooks: hooks,
          helpers: helpers,
          dom: new DOMHelper(),
          partials: partials
        };
      }
    });

    function equalTokens(fragment, html) {
      var div = document.createElement("div");
      div.appendChild(fragment.cloneNode(true));
      var fragTokens = tokenize(div.innerHTML);

      div.removeChild(div.childNodes[0]);
      div.innerHTML = html;
      var htmlTokens = tokenize(div.innerHTML);

      function normalizeTokens(token) {
        if (token.type === 'StartTag') {
          token.attributes = token.attributes.sort(function(a,b){
            if (a.name > b.name) {
              return 1;
            }
            if (a.name < b.name) {
              return -1;
            }
            return 0;
          });
        }
      }

      forEach(fragTokens, normalizeTokens);
      forEach(htmlTokens, normalizeTokens);

      deepEqual(fragTokens, htmlTokens);
    }

    test("Simple content produces a document fragment", function() {
      var template = compile("content");
      var fragment = template({}, env);

      equalTokens(fragment, "content");
    });

    test("Simple elements are created", function() {
      var template = compile("<h1>hello!</h1><div>content</div>");
      var fragment = template({}, env);

      equalTokens(fragment, "<h1>hello!</h1><div>content</div>");
    });

    test("Simple elements can have attributes", function() {
      var template = compile("<div class='foo' id='bar'>content</div>");
      var fragment = template({}, env);

      equalTokens(fragment, '<div class="foo" id="bar">content</div>');
    });

    test("Null attribute value removes that attribute", function() {
      var template = compile('<input disabled="{{isDisabled}}">');
      var fragment = template({isDisabled: null}, env);

      equalTokens(fragment, '<input>');
    });

    test("Simple elements can have arbitrary attributes", function() {
      var template = compile("<div data-some-data='foo'>content</div>");
      var fragment = template({}, env);
      equalTokens(fragment, '<div data-some-data="foo">content</div>');
    });

    test("checked attribute and checked property are present after clone and hydrate", function() {
      var template = compile("<input checked=\"checked\">");
      var fragment = template({}, env);
      ok(fragment.checked, 'input is checked');
      equalTokens(fragment, "<input checked='checked'>");
    });

    test("SVG element can have capitalized attributes", function() {
      var template = compile("<svg viewBox=\"0 0 0 0\"></svg>");
      var fragment = template({}, env);
      equalTokens(fragment, '<svg viewBox=\"0 0 0 0\"></svg>');
    });

    test("checked attribute and checked property are present after clone and hydrate", function() {
      var template = compile("<input checked=\"checked\">");
      var fragment = template({}, env);
      ok(fragment.checked, 'input is checked');
      equalTokens(fragment, "<input checked='checked'>");
    });

    function shouldBeVoid(tagName) {
      var html = "<" + tagName + " data-foo='bar'><p>hello</p>";
      var template = compile(html);
      var fragment = template({}, env);


      var div = document.createElement("div");
      div.appendChild(fragment.cloneNode(true));

      var tag = '<' + tagName + ' data-foo="bar">';
      var closing = '</' + tagName + '>';
      var extra = "<p>hello</p>";
      html = normalizeInnerHTML(div.innerHTML);

      QUnit.push((html === tag + extra) || (html === tag + closing + extra), html, tag + closing + extra, tagName + "should be a void element");
    }

    test("Void elements are self-closing", function() {
      var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

      forEach(voidElements.split(" "), function(tagName) {
        shouldBeVoid(tagName);
      });
    });

    test("The compiler can handle nesting", function() {
      var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content';
      var template = compile(html);
      var fragment = template({}, env);

      equalTokens(fragment, html);
    });

    test("The compiler can handle quotes", function() {
      compilesTo('<div>"This is a title," we\'re on a boat</div>');
    });

    test("The compiler can handle newlines", function() {
      compilesTo("<div>common\n\nbro</div>");
    });

    test("The compiler can handle comments", function() {
      compilesTo("<div>{{! Better not break! }}content</div>", '<div>content</div>', {});
    });

    test("The compiler can handle partials in handlebars partial syntax", function() {
      registerPartial('partial_name', "<b>Partial Works!</b>");
      compilesTo('<div>{{>partial_name}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
    });

    test("The compiler can handle partials in helper partial syntax", function() {
      registerPartial('partial_name', "<b>Partial Works!</b>");
      compilesTo('<div>{{partial "partial_name"}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
    });

    test("The compiler can handle simple handlebars", function() {
      compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
    });

    test("The compiler can handle escaping HTML", function() {
      compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
    });

    test("The compiler can handle unescaped HTML", function() {
      compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
    });

    test("The compiler can handle top-level unescaped HTML", function() {
      compilesTo('{{{html}}}', '<strong>hello</strong>', { html: '<strong>hello</strong>' });
    });

    test("The compiler can handle top-level unescaped tr", function() {
      var template = compile('{{{html}}}');
      var fragment = template({
                       html: '<tr><td>Yo</td></tr>'
                     }, {
                       hooks: hooks,
                       dom: new DOMHelper()
                     }, document.createElement('table'));

      equal(
        fragment.childNodes[1].tagName, 'TR',
        "root tr is present" );
    });

    test("The compiler can handle top-level unescaped td inside tr contextualElement", function() {
      var template = compile('{{{html}}}');
      var fragment = template({
                       html: '<td>Yo</td>'
                     }, {
                       hooks: hooks,
                       dom: new DOMHelper()
                     }, document.createElement('tr'));

      equal(
        fragment.childNodes[1].tagName, 'TD',
        "root td is returned" );
    });

    test("The compiler can handle unescaped tr in top of content", function() {
      var helper = function(params, options, env) {
        return options.render(options.context, env, options.morph.contextualElement);
      };
      hooks.lookupHelper = function(name){
        if (name === 'test') {
          return helper;
        }
      };
      var template = compile('{{#test}}{{{html}}}{{/test}}');
      var fragment = template({
                       html: '<tr><td>Yo</td></tr>'
                     }, {
                       hooks: hooks,
                       dom: new DOMHelper()
                     }, document.createElement('table'));

      equal(
        fragment.childNodes[2].tagName, 'TR',
        "root tr is present" );
    });

    test("The compiler can handle unescaped tr inside fragment table", function() {
      var helper = function(params, options, env) {
        return options.render(options.context, env, options.morph.contextualElement);
      };
      hooks.lookupHelper = function(name){
        if (name === 'test') {
          return helper;
        }
      };
      var template = compile('<table>{{#test}}{{{html}}}{{/test}}</table>'),
          fragment = template({
                       html: '<tr><td>Yo</td></tr>'
                     }, {
                       hooks: hooks,
                       dom: new DOMHelper()
                     }, document.createElement('div'));

      equal(
        fragment.childNodes[1].tagName, 'TR',
        "root tr is present" );
    });

    test("The compiler can handle simple helpers", function() {
      registerHelper('testing', function(params, options) {
        var context = options.context;
        return context[params[0]];
      });

      compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
    });

    test("The compiler can handle sexpr helpers", function() {
      registerHelper('testing', function(params, options) {
        return params[0] + "!";
      });

      compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
    });

    test("The compiler can handle multiple invocations of sexprs", function() {
      function evalParam(context, param, type) {
        if (type === 'id') {
          return context[param];
        } else {
          return param;
        }
      }

      registerHelper('testing', function(params, options) {
        return evalParam(options.context, params[0], options.types[0]) +
               evalParam(options.context, params[1], options.types[1]);
      });

      compilesTo('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', '<div>helloFOOBARlolBAZ</div>', { foo: "FOO", bar: "BAR", baz: "BAZ" });
    });

    test("The compiler tells helpers what kind of expression the path is", function() {
      registerHelper('testing', function(params, options) {
        return options.types[0] + '-' + params[0];
      });

      compilesTo('<div>{{testing "title"}}</div>', '<div>string-title</div>');
      compilesTo('<div>{{testing 123}}</div>', '<div>number-123</div>');
      compilesTo('<div>{{testing true}}</div>', '<div>boolean-true</div>');
      compilesTo('<div>{{testing false}}</div>', '<div>boolean-false</div>');
    });

    test("The compiler passes along the hash arguments", function() {
      registerHelper('testing', function(params, options) {
        return options.hash.first + '-' + options.hash.second;
      });

      compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
    });

    test("The compiler passes along the types of the hash arguments", function() {
      registerHelper('testing', function(params, options) {
        return options.hashTypes.first + '-' + options.hash.first;
      });

      compilesTo('<div>{{testing first="one"}}</div>', '<div>string-one</div>');
      compilesTo('<div>{{testing first=one}}</div>', '<div>id-one</div>');
      compilesTo('<div>{{testing first=1}}</div>', '<div>number-1</div>');
      compilesTo('<div>{{testing first=true}}</div>', '<div>boolean-true</div>');
      compilesTo('<div>{{testing first=false}}</div>', '<div>boolean-false</div>');
    });

    test("It is possible to override the resolution mechanism", function() {
      hooks.simple = function(context, name, options) {
        if (name === 'zomg') {
          return context.zomg;
        } else {
          return name.replace('.', '-');
        }
      };

      compilesTo('<div>{{foo}}</div>', '<div>foo</div>');
      compilesTo('<div>{{foo.bar}}</div>', '<div>foo-bar</div>');
      compilesTo('<div>{{zomg}}</div>', '<div>hello</div>', { zomg: 'hello' });
    });

    test("Simple data binding using text nodes", function() {
      var callback;

      hooks.content = function(morph, path, context, params, options) {
        callback = function() {
          morph.update(context[path]);
        };
        callback();
      };

      var object = { title: 'hello' };
      var fragment = compilesTo('<div>{{title}} world</div>', '<div>hello world</div>', object);

      object.title = 'goodbye';
      callback();

      equalTokens(fragment, '<div>goodbye world</div>');

      object.title = 'brown cow';
      callback();

      equalTokens(fragment, '<div>brown cow world</div>');
    });

    test("Simple data binding on fragments", function() {
      var callback;

      hooks.content = function(morph, path, context, params, options) {
        morph.escaped = false;
        callback = function() {
          morph.update(context[path]);
        };
        callback();
      };

      var object = { title: '<p>hello</p> to the' };
      var fragment = compilesTo('<div>{{title}} world</div>', '<div><p>hello</p> to the world</div>', object);

      object.title = '<p>goodbye</p> to the';
      callback();

      equalTokens(fragment, '<div><p>goodbye</p> to the world</div>');

      object.title = '<p>brown cow</p> to the';
      callback();

      equalTokens(fragment, '<div><p>brown cow</p> to the world</div>');
    });

    test("content hook receives escaping information", function() {
      expect(3);

      hooks.content = function(morph, path, context, params, options) {
        if (path === 'escaped') {
          equal(options.escaped, true);
        } else if (path === 'unescaped') {
          equal(options.escaped, false);
        }

        morph.update(path);
      };

      // so we NEED a reference to div. because it's passed in twice.
      // not divs childNodes.
      // the parent we need to save is fragment.childNodes
      compilesTo('<div>{{escaped}}-{{{unescaped}}}</div>', '<div>escaped-unescaped</div>');
    });

    test("Helpers receive escaping information", function() {
      expect(3);

      registerHelper('testing', function(params, options) {
        if (params[0] === 'escaped') {
          equal(options.escaped, true);
        } else if (params[0] === 'unescaped') {
          equal(options.escaped, false);
        }

        return params[0];
      });

      compilesTo('<div>{{testing escaped}}-{{{testing unescaped}}}</div>', '<div>escaped-unescaped</div>');
    });

    test("Attributes can use computed values", function() {
      compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
    });

    test("Mountain range of nesting", function() {
      var context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
      compilesTo('{{foo}}<span></span>', 'FOO<span></span>', context);
      compilesTo('<span></span>{{foo}}', '<span></span>FOO', context);
      compilesTo('<span>{{foo}}</span>{{foo}}', '<span>FOO</span>FOO', context);
      compilesTo('{{foo}}<span>{{foo}}</span>{{foo}}', 'FOO<span>FOO</span>FOO', context);
      compilesTo('{{foo}}<span></span>{{foo}}', 'FOO<span></span>FOO', context);
      compilesTo('{{foo}}<span></span>{{bar}}<span><span><span>{{baz}}</span></span></span>',
                 'FOO<span></span>BAR<span><span><span>BAZ</span></span></span>', context);
      compilesTo('{{foo}}<span></span>{{bar}}<span>{{argh}}<span><span>{{baz}}</span></span></span>',
                 'FOO<span></span>BAR<span>ARGH<span><span>BAZ</span></span></span>', context);
      compilesTo('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}',
                 'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH', context);
    });

    // test("Attributes can use computed paths", function() {
    //   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
    // });

    function streamValue(value) {
      return {
        subscribe: function(callback) {
          callback(value);
          return { connect: function() {} };
        }
      };
    }

    function boundValue(valueGetter, binding) {
      var subscription;

      var stream = {
        subscribe: function(next) {
          subscription = next;
          callback();
          return { connect: function() {} };
        }
      };

      return stream;

      function callback() {
        subscription(valueGetter.call(binding, callback));
      }
    }

    test("It is possible to override the resolution mechanism for attributes", function() {
      hooks.attribute = function(params, options) {
        options.element.setAttribute(params[0], 'http://google.com/' + params[1]);
      };

      compilesTo('<a href="{{url}}">linky</a>', '<a href="http://google.com/linky.html">linky</a>', { url: 'linky.html' });
    });

    /*

    test("It is possible to use RESOLVE_IN_ATTR for data binding", function() {
      var callback;

      registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
        return boundValue(function(c) {
          callback = c;
          return this[parts[0]];
        }, this);
      });

      var object = { url: 'linky.html' };
      var fragment = compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', object);

      object.url = 'clippy.html';
      callback();

      equalTokens(fragment, '<a href="clippy.html">linky</a>');

      object.url = 'zippy.html';
      callback();

      equalTokens(fragment, '<a href="zippy.html">linky</a>');
    });
    */

    test("Attributes can be populated with helpers that generate a string", function() {
      registerHelper('testing', function(params, options) {
        return options.context[params[0]];
      });

      compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
    });
    /*
    test("A helper can return a stream for the attribute", function() {
      registerHelper('testing', function(path, options) {
        return streamValue(this[path]);
      });

      compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
    });
    */
    test("Attribute helpers take a hash", function() {
      registerHelper('testing', function(params, options) {
        return options.context[options.hash.path];
      });

      compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
    });
    /*
    test("Attribute helpers can use the hash for data binding", function() {
      var callback;

      registerHelper('testing', function(path, options) {
        return boundValue(function(c) {
          callback = c;
          return this[path] ? options.hash.truthy : options.hash.falsy;
        }, this);
      });

      var object = { on: true };
      var fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);

      object.on = false;
      callback();
      equalTokens(fragment, '<div class="nope">hi</div>');
    });
    */
    test("Attributes containing multiple helpers are treated like a block", function() {
      registerHelper('testing', function(params, options) {
        if (options.types[0] === 'id') {
          return options.context[params[0]];
        } else {
          return params[0];
        }
      });

      compilesTo('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', '<a href="http://foo.com/bar/baz">linky</a>', { foo: 'foo.com', bar: 'bar' });
    });

    test("Attributes containing a helper are treated like a block", function() {
      expect(2);

      registerHelper('testing', function(params, options) {
        deepEqual(params, [123]);
        return "example.com";
      });

      compilesTo('<a href="http://{{testing 123}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
    });
    /*
    test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
      var callback;

      registerHelper('RESOLVE_IN_ATTR', function(path, options) {
        return boundValue(function(c) {
          callback = c;
          return this[path];
        }, this);
      });

      var context = { url: "example.com" };
      var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

      context.url = "www.example.com";
      callback();

      equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
    });

    test("A child resolution can pass contextual information to the parent", function() {
      var callback;

      registerHelper('RESOLVE_IN_ATTR', function(path, options) {
        return boundValue(function(c) {
          callback = c;
          return this[path];
        }, this);
      });

      var context = { url: "example.com" };
      var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

      context.url = "www.example.com";
      callback();

      equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
    });

    test("Attribute runs can contain helpers", function() {
      var callbacks = [];

      registerHelper('RESOLVE_IN_ATTR', function(path, options) {
        return boundValue(function(c) {
          callbacks.push(c);
          return this[path];
        }, this);
      });

      registerHelper('testing', function(path, options) {
        return boundValue(function(c) {
          callbacks.push(c);

          if (options.types[0] === 'id') {
            return this[path] + '.html';
          } else {
            return path;
          }
        }, this);
      });

      var context = { url: "example.com", path: 'index' };
      var fragment = compilesTo('<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>', '<a href="http://example.com/index.html/linky">linky</a>', context);

      context.url = "www.example.com";
      context.path = "yep";
      forEach(callbacks, function(callback) { callback(); });

      equalTokens(fragment, '<a href="http://www.example.com/yep.html/linky">linky</a>');

      context.url = "nope.example.com";
      context.path = "nope";
      forEach(callbacks, function(callback) { callback(); });

      equalTokens(fragment, '<a href="http://nope.example.com/nope.html/linky">linky</a>');
    });
    */
    test("A simple block helper can return the default document fragment", function() {

      hooks.content = function(morph, path, context, params, options, env) {
        morph.update(options.render(context, env));
      };

      compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
    });

    test("A simple block helper can return text", function() {
      hooks.content = function(morph, path, context, params, options, env) {
        morph.update(options.render(context, env));
      };

      compilesTo('{{#testing}}test{{else}}not shown{{/testing}}', 'test');
    });

    test("A block helper can have an else block", function() {
      hooks.content = function(morph, path, context, params, options, env) {
        morph.update(options.inverse(context, env));
      };

      compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
    });

    test("A block helper can pass a context to be used in the child", function() {
      var originalContent = hooks.content;
      hooks.content = function(morph, path, context, params, options, env) {
        if (path === 'testing') {
          morph.update(options.render({ title: 'Rails is omakase' }, env));
        } else {
          originalContent.apply(this, arguments);
        }
      };

      compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
    });

    test("Block helpers receive hash arguments", function() {
      hooks.content = function(morph, path, context, params, options, env) {
        if (options.hash.truth) {
          options.hooks = this;
          morph.update(options.render(context, env));
        }
      };

      compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p>');
    });
    /*

    test("Data-bound block helpers", function() {
      var callback;

      registerHelper('testing', function(path, options) {
        var context = this, firstElement, lastElement;

        var frag = buildFrag();

        function buildFrag() {
          var frag;

          var value = context[path];

          if (value) {
            frag = options.render(context);
          } else {
            frag = document.createDocumentFragment();
          }

          if (!frag.firstChild) {
            firstElement = lastElement = document.createTextNode('');
            frag.appendChild(firstElement);
          } else {
            firstElement = frag.firstChild;
            lastElement = frag.lastChild;
          }

          return frag;
        }

        callback = function() {
          var range = document.createRange();
          range.setStartBefore(firstElement);
          range.setEndAfter(lastElement);

          var frag = buildFrag();

          range.deleteContents();
          range.insertNode(frag);
        };

        return frag;
      });

      var object = { shouldRender: false };
      var template = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
      var fragment = compilesTo(template, '<p>hi</p> content  more <em>content</em> here', object);

      object.shouldRender = true;
      callback();

      equalTokens(fragment, '<p>hi</p> content <p>Appears!</p> more <em>content</em> here');

      object.shouldRender = false;
      callback();

      equalTokens(fragment, '<p>hi</p> content  more <em>content</em> here');
    });
    */

    test("Node helpers can modify the node", function() {
      registerHelper('testing', function(params, options) {
        options.element.setAttribute('zomg', 'zomg');
      });

      compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
    });

    test("Node helpers can modify the node after one node appended by top-level helper", function() {
      registerHelper('top-helper', function(params, options) {
        return document.createElement('span');
      });
      registerHelper('attr-helper', function(params, options) {
        options.element.setAttribute('zomg', 'zomg');
      });

      compilesTo('<div {{attr-helper}}>Node helpers</div>{{top-helper}}', '<div zomg="zomg">Node helpers</div><span></span>');
    });

    test("Node helpers can modify the node after one node prepended by top-level helper", function() {
      registerHelper('top-helper', function(params, options) {
        return document.createElement('span');
      });
      registerHelper('attr-helper', function(params, options) {
        options.element.setAttribute('zomg', 'zomg');
      });

      compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><div zomg="zomg">Node helpers</div>');
    });

    test("Node helpers can modify the node after many nodes returned from top-level helper", function() {
      registerHelper('top-helper', function(params, options) {
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createElement('span'));
        frag.appendChild(document.createElement('span'));
        return frag;
      });
      registerHelper('attr-helper', function(params, options) {
        options.element.setAttribute('zomg', 'zomg');
      });

      compilesTo(
        '{{top-helper}}<div {{attr-helper}}>Node helpers</div>',
        '<span></span><span></span><div zomg="zomg">Node helpers</div>' );
    });

    test("Node helpers can be used for attribute bindings", function() {
      var callback;

      registerHelper('testing', function(params, options) {
        var path = options.hash.href,
            element = options.element;

        callback = function() {
          var value = options.context[path];
          element.setAttribute('href', value);
        };

        callback();
      });

      var object = { url: 'linky.html' };
      var fragment = compilesTo('<a {{testing href="url"}}>linky</a>', '<a href="linky.html">linky</a>', object);

      object.url = 'zippy.html';
      callback();

      equalTokens(fragment, '<a href="zippy.html">linky</a>');
    });


    test('Web components - Called as helpers', function () {
      registerHelper('x-append', function(params, options, env) {
        var fragment = options.render(options.context, env, options.morph.contextualElement);
        fragment.appendChild(document.createTextNode(options.hash.text));
        return fragment;
      });
      var object = { bar: 'e', baz: 'c' };
      compilesTo('a<x-append text="d{{bar}}">b{{baz}}</x-append>f','abcdef', object);
    });

    test('Web components - Unknown helpers fall back to elements', function () {
      var object = { size: 'med', foo: 'b' };
      compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>','<x-bar class="btn-med">abc</x-bar>', object);
    });

    test('Web components - Text-only attributes work', function () {
      var object = { foo: 'qux' };
      compilesTo('<x-bar id="test">{{foo}}</x-bar>','<x-bar id="test">qux</x-bar>', object);
    });

    test('Web components - Empty components work', function () {
      compilesTo('<x-bar></x-bar>','<x-bar></x-bar>', {});
    });

    test('Repaired text nodes are ensured in the right place', function () {
      var object = { a: "A", b: "B", c: "C", d: "D" };
      compilesTo('{{a}} {{b}}', 'A B', object);
      compilesTo('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', '<div>ABCwatD</div>', object);
      compilesTo('{{a}}{{b}}<img><img><img><img>', 'AB<img><img><img><img>', object);
    });

    if (document.createElement('div').namespaceURI) {

    QUnit.module("HTML-based compiler (output, svg)", {
      setup: function() {
        helpers = {};
        partials = {};
        hooks = hydrationHooks({lookupHelper : lookupHelper});

        env = {
          hooks: hooks,
          helpers: helpers,
          dom: new DOMHelper(),
          partials: partials
        };
      }
    });

    test("The compiler can handle namespaced elements", function() {
      var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
      var template = compile(html);
      var fragment = template({}, env);

      equal(fragment.namespaceURI, svgNamespace, "creates the svg element with a namespace");
      equalTokens(fragment, html);
    });

    test("The compiler sets namespaces on nested namespaced elements", function() {
      var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
      var template = compile(html);
      var fragment = template({}, env);

      equal( fragment.childNodes[0].namespaceURI, svgNamespace,
             "creates the path element with a namespace" );
      equalTokens(fragment, html);
    });

    test("The compiler sets a namespace on an HTML integration point", function() {
      var html = '<svg><foreignObject>Hi</foreignObject></svg>';
      var template = compile(html);
      var fragment = template({}, env);

      equal( fragment.namespaceURI, svgNamespace,
             "creates the path element with a namespace" );
      equal( fragment.childNodes[0].namespaceURI, svgNamespace,
             "creates the path element with a namespace" );
      equalTokens(fragment, html);
    });

    test("The compiler does not set a namespace on an element inside an HTML integration point", function() {
      var html = '<svg><foreignObject><div></div></foreignObject></svg>';
      var template = compile(html);
      var fragment = template({}, env);

      equal( fragment.childNodes[0].childNodes[0].namespaceURI, xhtmlNamespace,
             "creates the path element with a namespace" );
      equalTokens(fragment, html);
    });

    test("The compiler pops back to the correct namespace", function() {
      var html = '<svg></svg><svg></svg><div></div>';
      var template = compile(html);
      var fragment = template({}, env);

      equal( fragment.childNodes[0].namespaceURI, svgNamespace,
             "creates the path element with a namespace" );
      equal( fragment.childNodes[1].namespaceURI, svgNamespace,
             "creates the path element with a namespace" );
      equal( fragment.childNodes[2].namespaceURI, xhtmlNamespace,
             "creates the path element with a namespace" );
      equalTokens(fragment, html);
    });

    test("The compiler preserves capitalization of tags", function() {
      var html = '<svg><linearGradient id="gradient"></linearGradient></svg>';
      var template = compile(html);
      var fragment = template({}, env);

      equalTokens(fragment, html);
    });

    test("svg can live with hydration", function() {
      var template = compile('<svg></svg>{{name}}');

      var fragment = template({ name: 'Milly' }, env, document.body);
      equal(
        fragment.childNodes[0].namespaceURI, svgNamespace,
        "svg namespace inside a block is present" );
    });

    test("svg can take some hydration", function() {
      var template = compile('<div><svg>{{name}}</svg></div>');

      var fragment = template({ name: 'Milly' }, env);
      equal(
        fragment.childNodes[0].namespaceURI, svgNamespace,
        "svg namespace inside a block is present" );
      equalTokens( fragment, '<div><svg>Milly</svg></div>',
                 "html is valid" );
    });

    test("root svg can take some hydration", function() {
      var template = compile('<svg>{{name}}</svg>');
      var fragment = template({ name: 'Milly' }, env);
      equal(
        fragment.namespaceURI, svgNamespace,
        "svg namespace inside a block is present" );
      equalTokens( fragment, '<svg>Milly</svg>',
                 "html is valid" );
    });

    test("Block helper allows interior namespace", function() {
      var isTrue = true;
      hooks.content = function(morph, path, context, params, options, env) {
        if (isTrue) {
          morph.update(options.render(context, env, morph.contextualElement));
        } else {
         morph.update(options.inverse(context, env, morph.contextualElement));
        }
      };
      var template = compile('{{#testing}}<svg></svg>{{else}}<div><svg></svg></div>{{/testing}}');

      var fragment = template({ isTrue: true }, env, document.body);
      equal(
        fragment.childNodes[1].namespaceURI, svgNamespace,
        "svg namespace inside a block is present" );

      isTrue = false;
      fragment = template({ isTrue: false }, env, document.body);
      equal(
        fragment.childNodes[1].namespaceURI, xhtmlNamespace,
        "inverse block path has a normal namespace");
      equal(
        fragment.childNodes[1].childNodes[0].namespaceURI, svgNamespace,
        "svg namespace inside an element inside a block is present" );
    });

    test("Block helper allows namespace to bleed through", function() {
      hooks.content = function(morph, path, context, params, options, env) {
        morph.update(options.render(context, env, morph.contextualElement));
      };

      var template = compile('<div><svg>{{#testing}}<circle />{{/testing}}</svg></div>');

      var fragment = template({ isTrue: true }, env);
      equal( fragment.childNodes[0].namespaceURI, svgNamespace,
             "svg tag has an svg namespace" );
      equal( fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
             "circle tag inside block inside svg has an svg namespace" );
    });

    test("Block helper with root svg allows namespace to bleed through", function() {
      hooks.content = function(morph, path, context, params, options, env) {
        morph.update(options.render(context, env, morph.contextualElement));
      };

      var template = compile('<svg>{{#testing}}<circle />{{/testing}}</svg>');

      var fragment = template({ isTrue: true }, env);
      equal( fragment.namespaceURI, svgNamespace,
             "svg tag has an svg namespace" );
      equal( fragment.childNodes[0].namespaceURI, svgNamespace,
             "circle tag inside block inside svg has an svg namespace" );
    });

    test("Block helper with root foreignObject allows namespace to bleed through", function() {
      hooks.content = function(morph, path, context, params, options, env) {
        morph.update(options.render(context, env, morph.contextualElement));
      };

      var template = compile('<foreignObject>{{#testing}}<div></div>{{/testing}}</foreignObject>');

      var fragment = template({ isTrue: true }, env, document.createElementNS(svgNamespace, 'svg'));
      equal( fragment.namespaceURI, svgNamespace,
             "foreignObject tag has an svg namespace" );
      equal( fragment.childNodes[0].namespaceURI, xhtmlNamespace,
             "div inside morph and foreignObject has xhtml namespace" );
    });

    }
  });
define("htmlbars-compiler-tests/hydration_compiler_test",
  ["../htmlbars-compiler/compiler/hydration_opcode","../htmlbars-compiler/parser"],
  function(__dependency1__, __dependency2__) {
    "use strict";
    var HydrationOpcodeCompiler = __dependency1__.HydrationOpcodeCompiler;
    var preprocess = __dependency2__.preprocess;

    function opcodesFor(html, options) {
      var ast = preprocess(html, options),
          compiler1 = new HydrationOpcodeCompiler(options);
      compiler1.compile(ast);
      return compiler1.opcodes;
    }


    function mustache(name, morphNum) {
      return [ 'ambiguous', [name, true, morphNum] ];
    }

    function helper(name, params, morphNum) {
      return [ "helper", [name, params.length, true, morphNum] ];
    }

    QUnit.module("HydrationOpcodeCompiler opcode generation");

    test("simple example", function() {
      var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
      deepEqual(opcodes, [
        [ "morph", [ 0, [ 0 ], -1, 0 ] ],
        [ "morph", [ 1, [ 0 ], 0, -1 ] ],
        mustache('foo', 0),
        mustache('baz', 1)
      ]);
    });

    test("element with a sole mustache child", function() {
      var opcodes = opcodesFor("<div>{{foo}}</div>");
      deepEqual(opcodes, [
        [ "morph", [ 0, [ 0 ], -1, -1 ] ],
        mustache('foo', 0)
      ]);
    });

    test("element with a mustache between two text nodes", function() {
      var opcodes = opcodesFor("<div> {{foo}} </div>");
      deepEqual(opcodes, [
        [ "morph", [ 0, [ 0 ], 0, 1 ] ],
        mustache('foo', 0)
      ]);
    });

    test("mustache two elements deep", function() {
      var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
      deepEqual(opcodes, [
        [ "consumeParent", [ 0 ] ],
        [ "morph", [ 0, [ 0, 0 ], -1, -1 ] ],
        mustache('foo', 0),
        [ "popParent", [] ]
      ]);
    });

    test("two sibling elements with mustaches", function() {
      var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
      deepEqual(opcodes, [
        [ "consumeParent", [ 0 ] ],
        [ "morph", [ 0, [ 0 ], -1, -1 ] ],
        mustache('foo', 0),
        [ "popParent", [] ],
        [ "consumeParent", [ 1 ] ],
        [ "morph", [ 1, [ 1 ], -1, -1 ] ],
        mustache('bar', 1),
        [ "popParent", [] ]
      ]);
    });

    test("mustaches at the root", function() {
      var opcodes = opcodesFor("{{foo}} {{bar}}");
      deepEqual(opcodes, [
        [ "morph", [ 0, [ ], 0, 1 ] ],
        [ "morph", [ 1, [ ], 1, 2 ] ],
        [ "repairClonedNode", [ [ 0, 2 ] ] ],
        mustache('foo', 0),
        mustache('bar', 1)
      ]);
    });

    test("back to back mustaches should have a text node inserted between them", function() {
      var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
      deepEqual(opcodes, [
        [ "morph", [ 0, [0], -1, 0 ] ],
        [ "morph", [ 1, [0], 0, 1 ] ],
        [ "morph", [ 2, [0], 1, 2 ] ],
        [ "morph", [ 3, [0], 2, -1 ] ],
        [ "repairClonedNode", [ [ 0, 1 ], false ] ],
        mustache('foo', 0),
        mustache('bar', 1),
        mustache('baz', 2),
        mustache('qux', 3)
      ]);
    });

    test("helper usage", function() {
      var opcodes = opcodesFor("<div>{{foo 'bar'}}</div>");
      deepEqual(opcodes, [
        [ "morph", [ 0, [0], -1, -1 ] ],
        [ "program", [null, null] ],
        [ "stringLiteral", ['bar'] ],
        [ "stackLiteral", [0] ],
        helper('foo', ['bar'], 0)
      ]);
    });

    test("node mustache", function() {
      var opcodes = opcodesFor("<div {{foo}}></div>");
      deepEqual(opcodes, [
        [ "program", [null, null] ],
        [ "stackLiteral", [0] ],
        [ "element", [0] ],
        [ "nodeHelper", ["foo", 0, 0 ] ]
      ]);
    });

    test("node helper", function() {
      var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
      deepEqual(opcodes, [
        [ "program", [null, null] ],
        [ "stringLiteral", ['bar'] ],
        [ "stackLiteral", [0] ],
        [ "element", [0] ],
        [ "nodeHelper", ["foo", 1, 0 ] ]
      ]);
    });

    test("attribute mustache", function() {
      var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
      deepEqual(opcodes, [
        [ "program", [null, null] ],
        [ "stringLiteral", ["class"] ],
        [ "string", ["sexpr"] ],
        [ "program", [null, null] ],
        [ "stringLiteral", ["before "] ],
        [ "string", ["sexpr"] ],
        [ "program", [null, null] ],
        [ "stackLiteral", [0] ],
        [ "sexpr", [ "foo", 0 ] ],
        [ "stringLiteral", [" after"] ],
        [ "stackLiteral", [0] ],
        [ "sexpr", [ "concat", 3 ] ],
        [ "stackLiteral", [0] ],
        [ "element", [0] ],
        [ "nodeHelper", [ "attribute", 2, 0 ] ]
      ]);
    });


    test("attribute helper", function() {
      var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
      deepEqual(opcodes, [
        [ "program", [ null, null ] ],
        [ "stringLiteral", [ "class" ] ],
        [ "string", [ "sexpr" ] ],
        [ "program", [ null, null ] ],
        [ "stringLiteral", [ "before " ] ],
        [ "string", [ "sexpr" ] ],
        [ "program", [ null, null ] ],
        [ "stringLiteral", [ "bar" ] ],
        [ "stackLiteral", [ 0 ] ],
        [ "sexpr", [ "foo", 1 ] ],
        [ "stringLiteral", [ " after" ] ],
        [ "stackLiteral", [ 0 ] ],
        [ "sexpr", [ "concat", 3 ] ],
        [ "stackLiteral", [ 0 ] ],
        [ "element", [0] ],
        [ "nodeHelper", [ "attribute", 2, 0 ] ]
      ]);
    });
  });
define("htmlbars-compiler-tests/jshint-lib",
  [],
  function() {
    "use strict";
    module('JSHint - htmlbars-compiler');
    test('htmlbars-compiler/ast.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/ast.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/fragment.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/fragment.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/fragment_opcode.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/fragment_opcode.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/helpers.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/helpers.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/hydration.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/hydration.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/hydration_opcode.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/hydration_opcode.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/quoting.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/quoting.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/template.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/template.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/template_visitor.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/template_visitor.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/compiler');
    test('htmlbars-compiler/compiler/utils.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler/utils.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler');
    test('htmlbars-compiler/compiler.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/compiler.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/html-parser');
    test('htmlbars-compiler/html-parser/helpers.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/html-parser/helpers.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/html-parser');
    test('htmlbars-compiler/html-parser/node-handlers.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/html-parser/node-handlers.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/html-parser');
    test('htmlbars-compiler/html-parser/token-handlers.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/html-parser/token-handlers.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler/html-parser');
    test('htmlbars-compiler/html-parser/tokens.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/html-parser/tokens.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler');
    test('htmlbars-compiler/parser.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/parser.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler');
    test('htmlbars-compiler/utils.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler/utils.js should pass jshint.'); 
    });
  });
define("htmlbars-compiler-tests/jshint-tests",
  [],
  function() {
    "use strict";
    module('JSHint - htmlbars-compiler-tests');
    test('htmlbars-compiler-tests/combined_ast_node-test.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler-tests/combined_ast_node-test.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler-tests');
    test('htmlbars-compiler-tests/fragment_test.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler-tests/fragment_test.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler-tests');
    test('htmlbars-compiler-tests/html_compiler_test.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler-tests/html_compiler_test.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler-tests');
    test('htmlbars-compiler-tests/hydration_compiler_test.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler-tests/hydration_compiler_test.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler-tests');
    test('htmlbars-compiler-tests/template_compiler_test.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler-tests/template_compiler_test.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-compiler-tests');
    test('htmlbars-compiler-tests/template_visitor_test.js should pass jshint', function() { 
      ok(true, 'htmlbars-compiler-tests/template_visitor_test.js should pass jshint.'); 
    });
  });
define("htmlbars-compiler-tests/template_compiler_test",
  ["../htmlbars-compiler/compiler/template","../htmlbars-compiler/parser","../test/support/assertions","../morph"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__) {
    "use strict";
    var TemplateCompiler = __dependency1__.TemplateCompiler;
    var preprocess = __dependency2__.preprocess;
    var equalHTML = __dependency3__.equalHTML;
    var DOMHelper = __dependency4__.DOMHelper;

    QUnit.module("TemplateCompiler");

    var dom = new DOMHelper();

    var hooks = {
      content: function(morph, helperName, context, params, options, env) {
        if (helperName === 'if') {
          if (context[params[0]]) {
            options.hooks = this;
            morph.update(options.render(context, env, morph.contextualElement));
          }
          return;
        }
        morph.update(context[helperName]);
      }
    };

    test("it works", function testFunction() {
      /* jshint evil: true */
      var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>');
      var compiler = new TemplateCompiler();
      var program = compiler.compile(ast);
      var template = new Function("return " + program)();
      var env = {
        hooks: hooks,
        dom: dom
      };
      var frag = template(
        { working: true, firstName: 'Kris', lastName: 'Selden' },
        env,
        document.body
      );
      equalHTML(frag, '<div>Hello Kris Selden!</div>');
    });
  });
define("htmlbars-compiler-tests/template_visitor_test",
  ["../htmlbars-compiler/parser","../htmlbars-compiler/compiler/template_visitor"],
  function(__dependency1__, __dependency2__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var TemplateVisitor = __dependency2__["default"];

    function actionsEqual(input, expectedActions) {
      var ast = preprocess(input);

      var templateVisitor = new TemplateVisitor();
      templateVisitor.visit(ast);
      var actualActions = templateVisitor.actions;

      // Remove the AST node reference from the actions to keep tests leaner
      for (var i = 0; i < actualActions.length; i++) {
        actualActions[i][1].shift();
      }

      deepEqual(actualActions, expectedActions);
    }

    QUnit.module("TemplateVisitor");

    test("empty", function() {
      var input = "";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['endProgram', [0]]
      ]);
    });

    test("basic", function() {
      var input = "foo{{bar}}<div></div>";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['text', [0, 3, false]],
        ['mustache', [1, 3]],
        ['openElement', [2, 3, false, 0, []]],
        ['closeElement', [2, 3, false]],
        ['endProgram', [0]]
      ]);
    });

    test("nested HTML", function() {
      var input = "<a></a><a><a><a></a></a></a>";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['openElement', [0, 2, false, 0, []]],
        ['closeElement', [0, 2, false]],
        ['openElement', [1, 2, false, 0, []]],
        ['openElement', [0, 1, false, 0, []]],
        ['openElement', [0, 1, false, 0, []]],
        ['closeElement', [0, 1, false]],
        ['closeElement', [0, 1, false]],
        ['closeElement', [1, 2, false]],
        ['endProgram', [0]]
      ]);
    });

    test("mustaches are counted correctly", function() {
      var input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['openElement', [0, 1, true, 2, []]],
        ['openElement', [0, 2, false, 1, []]],
        ['mustache', [0, 1]],
        ['closeElement', [0, 2, false]],
        ['openElement', [1, 2, false, 3, []]],
        ['openElement', [0, 2, false, 1, []]],
        ['mustache', [0, 1]],
        ['closeElement', [0, 2, false]],
        ['openElement', [1, 2, false, 1, []]],
        ['mustache', [0, 1]],
        ['closeElement', [1, 2, false]],
        ['closeElement', [1, 2, false]],
        ['closeElement', [0, 1, true]],
        ['endProgram', [0]]
      ]);
    });

    test("empty block", function() {
      var input = "{{#a}}{{/a}}";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['endProgram', [1]],
        ['startProgram', [1, [0, 1]]],
        ['text', [0, 3, false]],
        ['block', [1, 3]],
        ['text', [2, 3, false]],
        ['endProgram', [0]]
      ]);
    });

    test("block with inverse", function() {
      var input = "{{#a}}b{{^}}{{/a}}";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['endProgram', [1]],
        ['startProgram', [0, []]],
        ['text', [0, 1, true]],
        ['endProgram', [1]],
        ['startProgram', [2, [0, 1]]],
        ['text', [0, 3, false]],
        ['block', [1, 3]],
        ['text', [2, 3, false]],
        ['endProgram', [0]]
      ]);
    });

    test("nested blocks", function() {
      var input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['text', [0, 1, true]],
        ['endProgram', [1]],
        ['startProgram', [0, [0, 1]]],
        ['text', [0, 3, false]],
        ['mustache', [1, 3]],
        ['text', [2, 3, false]],
        ['endProgram', [2]],
        ['startProgram', [0, []]],
        ['openElement', [0, 1, true, 0, []]],
        ['closeElement', [0, 1, true]],
        ['endProgram', [2]],
        ['startProgram', [2, [0, 1, 2]]],
        ['text', [0, 5, false]],
        ['block', [1, 5]],
        ['text', [2, 5, false]],
        ['block', [3, 5]],
        ['text', [4, 5, false]],
        ['endProgram', [1]],
        ['startProgram', [2, [0, 1, 2]]],
        ['text', [0, 5, false]],
        ['block', [1, 5]],
        ['text', [2, 5, false]],
        ['block', [3, 5]],
        ['text', [4, 5, false]],
        ['endProgram', [0]]
      ]);
    });

    test("web component", function() {
      var input = "<x-foo>bar</x-foo>";
      actionsEqual(input, [
        ['startProgram', [0, []]],
        ['text', [0, 1, true]],
        ['endProgram', [1]],
        ['startProgram', [1, [0, 1]]],
        ['text', [0, 3, false]],
        ['component', [1, 3]],
        ['text', [2, 3, false]],
        ['endProgram', [0]]
      ]);
    });
  });
define("htmlbars-runtime",
  ["htmlbars-runtime/hooks","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var hooks = __dependency1__;

    var hooks;
    __exports__.hooks = hooks;
  });
define("htmlbars-runtime/hooks",
  ["./utils","../handlebars/safe-string","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;
    var SafeString = __dependency2__["default"];

    function content(morph, helperName, context, params, options, env) {
      var value, helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        value = helper(params, options, env);
      } else {
        value = this.simple(context, helperName, options);
      }
      if (!options.escaped) {
        value = new SafeString(value);
      }
      morph.update(value);
    }

    __exports__.content = content;function webComponent(morph, tagName, context, options, env) {
      var value, helper = this.lookupHelper(tagName, context, options);
      if (helper) {
        value = helper(null, options, env);
      } else {
        value = this.webComponentFallback(morph, tagName, context, options, env);
      }
      morph.update(value);
    }

    __exports__.webComponent = webComponent;function webComponentFallback(morph, tagName, context, options, env) {
      var element = env.dom.createElement(tagName);
      var hash = options.hash, hashTypes = options.hashTypes;

      for (var name in hash) {
        if (hashTypes[name] === 'id') {
          element.setAttribute(name, this.simple(context, hash[name], options));
        } else {
          element.setAttribute(name, hash[name]);
        }
      }
      element.appendChild(options.render(context, env, morph.contextualElement));
      return element;
    }

    __exports__.webComponentFallback = webComponentFallback;function element(domElement, helperName, context, params, options, env) {
      var helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        helper(params, options, env);
      }
    }

    __exports__.element = element;function attribute(params, options, env) {
      var attrName = params[0];
      var attrValue = params[1];

      if (attrValue === null) {
        options.element.removeAttribute(attrName);
      } else {
        options.element.setAttribute(attrName, attrValue);
      }
    }

    __exports__.attribute = attribute;function concat(params, options, env) {
      var context = options.context;
      var value = "";
      for (var i = 0, l = params.length; i < l; i++) {
        if (options.types[i] === 'id') {
          value += this.simple(context, params[i], options);
        } else {
          value += params[i];
        }
      }
      return value;
    }

    __exports__.concat = concat;function partial(params, options, env) {
      return env.partials[params[0]](options.context, env);
    }

    __exports__.partial = partial;function subexpr(helperName, context, params, options, env) {
      var helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        return helper(params, options, env);
      } else {
        return this.simple(context, helperName, options);
      }
    }

    __exports__.subexpr = subexpr;function lookupHelper(helperName, context, options) {
      if (helperName === 'attribute') {
        return this.attribute;
      }
      else if (helperName === 'partial'){
        return this.partial;
      }
      else if (helperName === 'concat') {
        return this.concat;
      }
    }

    __exports__.lookupHelper = lookupHelper;function simple(context, name, options) {
      return context[name];
    }

    __exports__.simple = simple;function hydrationHooks(extensions) {
      var base = {
        content: content,
        webComponent: webComponent,
        webComponentFallback: webComponentFallback,
        element: element,
        attribute: attribute,
        concat: concat,
        subexpr: subexpr,
        lookupHelper: lookupHelper,
        simple: simple,
        partial: partial
      };

      return extensions ? merge(extensions, base) : base;
    }

    __exports__.hydrationHooks = hydrationHooks;
  });
define("htmlbars-runtime/utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });