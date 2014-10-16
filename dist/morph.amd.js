define("morph",
  ["./morph/morph","./morph/dom-helper","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];
    var Morph;
    __exports__.Morph = Morph;
    var DOMHelper = __dependency2__["default"];
    var DOMHelper;
    __exports__.DOMHelper = DOMHelper;
  });
define("morph/dom-helper",
  ["../morph/morph","./dom-helper/build-html-dom","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];
    var buildHTMLDOM = __dependency2__.buildHTMLDOM;
    var svgNamespace = __dependency2__.svgNamespace;
    var svgHTMLIntegrationPoints = __dependency2__.svgHTMLIntegrationPoints;

    var deletesBlankTextNodes = (function(){
      var element = document.createElement('div');
      element.appendChild( document.createTextNode('') );
      var clonedElement = element.cloneNode(true);
      return clonedElement.childNodes.length === 0;
    })();

    var ignoresCheckedAttribute = (function(){
      var element = document.createElement('input');
      element.setAttribute('checked', 'checked');
      var clonedElement = element.cloneNode(false);
      return !clonedElement.checked;
    })();

    function isSVG(ns){
      return ns === svgNamespace;
    }

    // This is not the namespace of the element, but of
    // the elements inside that elements.
    function interiorNamespace(element){
      if (
        element &&
        element.namespaceURI === svgNamespace &&
        !svgHTMLIntegrationPoints[element.tagName]
      ) {
        return svgNamespace;
      } else {
        return null;
      }
    }

    // The HTML spec allows for "omitted start tags". These tags are optional
    // when their intended child is the first thing in the parent tag. For
    // example, this is a tbody start tag:
    //
    // <table>
    //   <tbody>
    //     <tr>
    //
    // The tbody may be omitted, and the browser will accept and render:
    //
    // <table>
    //   <tr>
    //
    // However, the omitted start tag will still be added to the DOM. Here
    // we test the string and context to see if the browser is about to
    // perform this cleanup.
    //
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
    // describes which tags are omittable. The spec for tbody and colgroup
    // explains this behavior:
    //
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
    //

    var omittedStartTagChildTest = /<([\w:]+)/;
    function detectOmittedStartTag(string, contextualElement){
      // Omitted start tags are only inside table tags.
      if (contextualElement.tagName === 'TABLE') {
        var omittedStartTagChildMatch = omittedStartTagChildTest.exec(string);
        if (omittedStartTagChildMatch) {
          var omittedStartTagChild = omittedStartTagChildMatch[1];
          // It is already asserted that the contextual element is a table
          // and not the proper start tag. Just see if a tag was omitted.
          return omittedStartTagChild === 'tr' ||
                 omittedStartTagChild === 'col';
        }
      }
    }

    function buildSVGDOM(html, dom){
      var div = dom.document.createElement('div');
      div.innerHTML = '<svg>'+html+'</svg>';
      return div.firstChild.childNodes;
    }

    /*
     * A class wrapping DOM functions to address environment compatibility,
     * namespaces, contextual elements for morph un-escaped content
     * insertion.
     *
     * When entering a template, a DOMHelper should be passed:
     *
     *   template(context, { hooks: hooks, dom: new DOMHelper() });
     *
     * TODO: support foreignObject as a passed contextual element. It has
     * a namespace (svg) that does not match its internal namespace
     * (xhtml).
     *
     * @class DOMHelper
     * @constructor
     * @param {HTMLDocument} _document The document DOM methods are proxied to
     */
    function DOMHelper(_document){
      this.document = _document || window.document;
      this.namespace = null;
    }

    var prototype = DOMHelper.prototype;
    prototype.constructor = DOMHelper;

    prototype.insertBefore = function(element, childElement, referenceChild) {
      return element.insertBefore(childElement, referenceChild);
    };

    prototype.appendChild = function(element, childElement) {
      return element.appendChild(childElement);
    };

    prototype.appendText = function(element, text) {
      return element.appendChild(this.document.createTextNode(text));
    };

    prototype.setAttribute = function(element, name, value) {
      element.setAttribute(name, value);
    };

    if (document.createElementNS) {
      // Only opt into namespace detection if a contextualElement
      // is passed.
      prototype.createElement = function(tagName, contextualElement) {
        var namespace = this.namespace;
        if (contextualElement) {
          if (tagName === 'svg') {
            namespace = svgNamespace;
          } else {
            namespace = interiorNamespace(contextualElement);
          }
        }
        if (namespace) {
          return this.document.createElementNS(namespace, tagName);
        } else {
          return this.document.createElement(tagName);
        }
      };
    } else {
      prototype.createElement = function(tagName) {
        return this.document.createElement(tagName);
      };
    }

    prototype.setNamespace = function(ns) {
      this.namespace = ns;
    };

    prototype.detectNamespace = function(element) {
      this.namespace = interiorNamespace(element);
    };

    prototype.createDocumentFragment = function(){
      return this.document.createDocumentFragment();
    };

    prototype.createTextNode = function(text){
      return this.document.createTextNode(text);
    };

    prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
      if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
        for (var i=0, len=blankChildTextNodes.length;i<len;i++){
          var textNode = this.document.createTextNode(''),
              offset = blankChildTextNodes[i],
              before = element.childNodes[offset];
          if (before) {
            element.insertBefore(textNode, before);
          } else {
            element.appendChild(textNode);
          }
        }
      }
      if (ignoresCheckedAttribute && isChecked) {
        element.setAttribute('checked', 'checked');
      }
    };

    prototype.cloneNode = function(element, deep){
      var clone = element.cloneNode(!!deep);
      return clone;
    };

    prototype.createMorph = function(parent, start, end, contextualElement){
      if (!contextualElement && parent.nodeType === 1) {
        contextualElement = parent;
      }
      return new Morph(parent, start, end, this, contextualElement);
    };

    // This helper is just to keep the templates good looking,
    // passing integers instead of element references.
    prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
      var childNodes = parent.childNodes,
          start = startIndex === -1 ? null : childNodes[startIndex],
          end = endIndex === -1 ? null : childNodes[endIndex];
      return this.createMorph(parent, start, end, contextualElement);
    };

    prototype.insertMorphBefore = function(element, referenceChild, contextualElement) {
      var start = this.document.createTextNode('');
      var end = this.document.createTextNode('');
      element.insertBefore(start, referenceChild);
      element.insertBefore(end, referenceChild);
      return this.createMorph(element, start, end, contextualElement);
    };

    prototype.appendMorph = function(element, contextualElement) {
      var start = this.document.createTextNode('');
      var end = this.document.createTextNode('');
      element.appendChild(start);
      element.appendChild(end);
      return this.createMorph(element, start, end, contextualElement);
    };

    prototype.parseHTML = function(html, contextualElement) {
      var isSVGContent = (
        isSVG(this.namespace) &&
        !svgHTMLIntegrationPoints[contextualElement.tagName]
      );

      if (isSVGContent) {
        return buildSVGDOM(html, this);
      } else {
        var nodes = buildHTMLDOM(html, contextualElement, this);
        if (detectOmittedStartTag(html, contextualElement)) {
          var node = nodes[0];
          while (node && node.nodeType !== 1) {
            node = node.nextSibling;
          }
          return node.childNodes;
        } else {
          return nodes;
        }
      }
    };

    __exports__["default"] = DOMHelper;
  });
define("morph/dom-helper/build-html-dom",
  ["exports"],
  function(__exports__) {
    "use strict";
    var svgHTMLIntegrationPoints = {foreignObject: 1, desc: 1, title: 1};
    __exports__.svgHTMLIntegrationPoints = svgHTMLIntegrationPoints;var svgNamespace = 'http://www.w3.org/2000/svg';
    __exports__.svgNamespace = svgNamespace;
    // Safari does not like using innerHTML on SVG HTML integration
    // points.
    var needsIntegrationPointFix = document.createElementNS && (function() {
      var testEl = document.createElementNS(svgNamespace, 'foreignObject');
      testEl.innerHTML = "<div></div>";
      return testEl.childNodes.length === 0;
    })();

    // Internet Explorer prior to 9 does not allow setting innerHTML if the first element
    // is a "zero-scope" element. This problem can be worked around by making
    // the first node an invisible text node. We, like Modernizr, use &shy;
    var needsShy = (function() {
      var testEl = document.createElement('div');
      testEl.innerHTML = "<div></div>";
      testEl.firstChild.innerHTML = "<script><\/script>";
      return testEl.firstChild.innerHTML === '';
    })();

    // IE 8 (and likely earlier) likes to move whitespace preceeding
    // a script tag to appear after it. This means that we can
    // accidentally remove whitespace when updating a morph.
    var movesWhitespace = document && (function() {
      var testEl = document.createElement('div');
      testEl.innerHTML = "Test: <script type='text/x-placeholder'><\/script>Value";
      return testEl.childNodes[0].nodeValue === 'Test:' &&
              testEl.childNodes[2].nodeValue === ' Value';
    })();

    // IE 9 and earlier don't allow us to set innerHTML on col, colgroup, frameset,
    // html, style, table, tbody, tfoot, thead, title, tr. Detect this and add
    // them to an initial list of corrected tags.
    //
    // Here we are only dealing with the ones which can have child nodes.
    //
    var tagNamesRequiringInnerHTMLFix, tableNeedsInnerHTMLFix;
    var tableInnerHTMLTestElement = document.createElement('table');
    try {
      tableInnerHTMLTestElement.innerHTML = '<tbody></tbody>';
    } catch (e) {
    } finally {
      tableNeedsInnerHTMLFix = (tableInnerHTMLTestElement.childNodes.length === 0);
    }
    if (tableNeedsInnerHTMLFix) {
      tagNamesRequiringInnerHTMLFix = {
        colgroup: ['table'],
        table: [],
        tbody: ['table'],
        tfoot: ['table'],
        thead: ['table'],
        tr: ['table', 'tbody']
      };
    } else {
      tagNamesRequiringInnerHTMLFix = {};
    }

    // IE 8 doesn't allow setting innerHTML on a select tag. Detect this and
    // add it to the list of corrected tags.
    //
    var selectInnerHTMLTestElement = document.createElement('select');
    selectInnerHTMLTestElement.innerHTML = '<option></option>';
    if (selectInnerHTMLTestElement) {
      tagNamesRequiringInnerHTMLFix.select = [];
    }

    function scriptSafeInnerHTML(element, html) {
      // without a leading text node, IE will drop a leading script tag.
      html = '&shy;'+html;

      element.innerHTML = html;

      var nodes = element.childNodes;

      // Look for &shy; to remove it.
      var shyElement = nodes[0];
      while (shyElement.nodeType === 1 && !shyElement.nodeName) {
        shyElement = shyElement.firstChild;
      }
      // At this point it's the actual unicode character.
      if (shyElement.nodeType === 3 && shyElement.nodeValue.charAt(0) === "\u00AD") {
        var newValue = shyElement.nodeValue.slice(1);
        if (newValue.length) {
          shyElement.nodeValue = shyElement.nodeValue.slice(1);
        } else {
          shyElement.parentNode.removeChild(shyElement);
        }
      }

      return nodes;
    }

    function buildDOMWithFix(html, contextualElement){
      var tagName = contextualElement.tagName;

      // Firefox versions < 11 do not have support for element.outerHTML.
      var outerHTML = contextualElement.outerHTML || new XMLSerializer().serializeToString(contextualElement);
      if (!outerHTML) {
        throw "Can't set innerHTML on "+tagName+" in this browser";
      }

      var wrappingTags = tagNamesRequiringInnerHTMLFix[tagName.toLowerCase()];
      var startTag = outerHTML.match(new RegExp("<"+tagName+"([^>]*)>", 'i'))[0];
      var endTag = '</'+tagName+'>';

      var wrappedHTML = [startTag, html, endTag];

      var i = wrappingTags.length;
      var wrappedDepth = 1 + i;
      while(i--) {
        wrappedHTML.unshift('<'+wrappingTags[i]+'>');
        wrappedHTML.push('</'+wrappingTags[i]+'>');
      }

      var wrapper = document.createElement('div');
      scriptSafeInnerHTML(wrapper, wrappedHTML.join(''));
      var element = wrapper;
      while (wrappedDepth--) {
        element = element.firstChild;
        while (element && element.nodeType !== 1) {
          element = element.nextSibling;
        }
      }
      while (element && element.tagName !== tagName) {
        element = element.nextSibling;
      }
      return element ? element.childNodes : [];
    }

    var buildDOM;
    if (needsShy) {
      buildDOM = function buildDOM(html, contextualElement, dom){
        contextualElement = dom.cloneNode(contextualElement, false);
        scriptSafeInnerHTML(contextualElement, html);
        return contextualElement.childNodes;
      };
    } else {
      buildDOM = function buildDOM(html, contextualElement, dom){
        contextualElement = dom.cloneNode(contextualElement, false);
        contextualElement.innerHTML = html;
        return contextualElement.childNodes;
      };
    }


    var buildHTMLDOM;
    // Really, this just means IE8 and IE9 get a slower buildHTMLDOM
    if (tagNamesRequiringInnerHTMLFix.length > 0 || movesWhitespace) {
      buildHTMLDOM = function buildHTMLDOM(html, contextualElement, dom) {
        // Make a list of the leading text on script nodes. Include
        // script tags without any whitespace for easier processing later.
        var spacesBefore = [];
        var spacesAfter = [];
        html = html.replace(/(\s*)(<script)/g, function(match, spaces, tag) {
          spacesBefore.push(spaces);
          return tag;
        });

        html = html.replace(/(<\/script>)(\s*)/g, function(match, tag, spaces) {
          spacesAfter.push(spaces);
          return tag;
        });

        // Fetch nodes
        var nodes;
        if (tagNamesRequiringInnerHTMLFix[contextualElement.tagName.toLowerCase()]) {
          // buildDOMWithFix uses string wrappers for problematic innerHTML.
          nodes = buildDOMWithFix(html, contextualElement);
        } else {
          nodes = buildDOM(html, contextualElement, dom);
        }

        // Build a list of script tags, the nodes themselves will be
        // mutated as we add test nodes.
        var i, j, node, nodeScriptNodes;
        var scriptNodes = [];
        for (i=0;node=nodes[i];i++) {
          if (node.nodeType !== 1) {
            continue;
          }
          if (node.tagName === 'SCRIPT') {
            scriptNodes.push(node);
          } else {
            nodeScriptNodes = node.getElementsByTagName('script');
            for (j=0;j<nodeScriptNodes.length;j++) {
              scriptNodes.push(nodeScriptNodes[j]);
            }
          }
        }

        // Walk the script tags and put back their leading text nodes.
        var scriptNode, textNode, spaceBefore, spaceAfter;
        for (i=0;scriptNode=scriptNodes[i];i++) {
          spaceBefore = spacesBefore[i];
          if (spaceBefore && spaceBefore.length > 0) {
            textNode = dom.document.createTextNode(spaceBefore);
            scriptNode.parentNode.insertBefore(textNode, scriptNode);
          }

          spaceAfter = spacesAfter[i];
          if (spaceAfter && spaceAfter.length > 0) {
            textNode = dom.document.createTextNode(spaceAfter);
            scriptNode.parentNode.insertBefore(textNode, scriptNode.nextSibling);
          }
        }

        return nodes;
      };
    } else if (needsIntegrationPointFix) {
      buildHTMLDOM = function buildHTMLDOM(html, contextualElement, dom){
        if (svgHTMLIntegrationPoints[contextualElement.tagName]) {
          return buildDOM(html, document.createElement('div'), dom);
        } else {
          return buildDOM(html, contextualElement, dom);
        }
      };
    } else {
      buildHTMLDOM = buildDOM;
    }

    __exports__.buildHTMLDOM = buildHTMLDOM;
  });
define("morph/morph",
  ["exports"],
  function(__exports__) {
    "use strict";
    var splice = Array.prototype.splice;

    function ensureStartEnd(start, end) {
      if (start === null || end === null) {
        throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
      }
    }

    function ensureContext(contextualElement) {
      if (!contextualElement || contextualElement.nodeType !== 1) {
        throw new Error('An element node must be provided for a contextualElement, you provided ' +
                        (contextualElement ? 'nodeType ' + contextualElement.nodeType : 'nothing'));
      }
    }

    // TODO: this is an internal API, this should be an assert
    function Morph(parent, start, end, domHelper, contextualElement) {
      if (parent.nodeType === 11) {
        ensureStartEnd(start, end);
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.domHelper = domHelper;
      ensureContext(contextualElement);
      this.contextualElement = contextualElement;
      this.reset();
    }

    Morph.prototype.reset = function() {
      this.text = null;
      this.owner = null;
      this.morphs = null;
      this.before = null;
      this.after = null;
      this.escaped = true;
    };

    Morph.prototype.parent = function () {
      if (!this.element) {
        var parent = this.start.parentNode;
        if (this._parent !== parent) {
          this.element = this._parent = parent;
        }
      }
      return this._parent;
    };

    Morph.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removeMorph(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Morph.prototype.removeMorph = function (morph) {
      var morphs = this.morphs;
      for (var i=0, l=morphs.length; i<l; i++) {
        if (morphs[i] === morph) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Morph.prototype.update = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Morph.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) return this._updateText(parent, '');
      this._updateNode(parent, node);
    };

    Morph.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Morph.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) return this._updateText(parent, '');
      this._updateHTML(parent, html);
    };

    Morph.prototype._update = function (parent, nodeOrString) {
      if (nodeOrString === null || nodeOrString === undefined) {
        this._updateText(parent, '');
      } else if (typeof nodeOrString === 'string') {
        if (this.escaped) {
          this._updateText(parent, nodeOrString);
        } else {
          this._updateHTML(parent, nodeOrString);
        }
      } else if (nodeOrString.nodeType) {
        this._updateNode(parent, nodeOrString);
      } else if (nodeOrString.string) { // duck typed SafeString
        this._updateHTML(parent, nodeOrString.string);
      } else {
        this._updateText(parent, nodeOrString.toString());
      }
    };

    Morph.prototype._updateNode = function (parent, node) {
      if (this.text) {
        if (node.nodeType === 3) {
          this.text.nodeValue = node.nodeValue;
          return;
        } else {
          this.text = null;
        }
      }
      var start = this.start, end = this.end;
      clear(parent, start, end);
      parent.insertBefore(node, end);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = this.domHelper.createTextNode(text);
      this.text = node;
      clear(parent, this.start, this.end);
      parent.insertBefore(node, this.end);
      if (this.before !== null) {
        this.before.end = node;
      }
      if (this.after !== null) {
        this.after.start = node;
      }
    };

    Morph.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
      var childNodes = this.domHelper.parseHTML(html, this.contextualElement);
      appendChildren(parent, end, childNodes);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype.append = function (node) {
      if (this.morphs === null) this.morphs = [];
      var index = this.morphs.length;
      return this.insert(index, node);
    };

    Morph.prototype.insert = function (index, node) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent();
      var morphs = this.morphs;
      var before = index > 0 ? morphs[index-1] : null;
      var after  = index < morphs.length ? morphs[index] : null;
      var start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
      var end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
      var morph  = new Morph(parent, start, end, this.domHelper, this.contextualElement);

      morph.owner = this;
      morph._update(parent, node);

      if (before !== null) {
        morph.before = before;
        before.end = start.nextSibling;
        before.after = morph;
      }

      if (after !== null) {
        morph.after = after;
        after.before = morph;
        after.start = end.previousSibling;
      }

      this.morphs.splice(index, 0, morph);
      return morph;
    };

    Morph.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent();
      var morphs = this.morphs;
      var before = index > 0 ? morphs[index-1] : null;
      var after = index+removedLength < morphs.length ? morphs[index+removedLength] : null;
      var start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
      var end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
      var addedLength = addedNodes === undefined ? 0 : addedNodes.length;
      var args, i, current;

      if (removedLength > 0) {
        clear(parent, start, end);
      }

      if (addedLength === 0) {
        if (before !== null) {
          before.after = after;
          before.end = end;
        }
        if (after !== null) {
          after.before = before;
          after.start = start;
        }
        morphs.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Morph(parent, start, end, this.domHelper, this.contextualElement);
          current._update(parent, addedNodes[i]);
          current.owner = this;
          if (before !== null) {
            current.before = before;
            before.end = start.nextSibling;
            before.after = current;
          }
          before = current;
          start = end === null ? parent.lastChild : end.previousSibling;
        }
        if (after !== null) {
          current.after = after;
          after.before = current;
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(morphs, args);
    };

    function appendChildren(parent, end, nodeList) {
      var ref = end;
      var i = nodeList.length;
      var node;

      while (i--) {
        node = nodeList[i];
        parent.insertBefore(node, ref);
        ref = node;
      }
    }

    function clear(parent, start, end) {
      var current, previous;
      if (end === null) {
        current = parent.lastChild;
      } else {
        current = end.previousSibling;
      }

      while (current !== null && current !== start) {
        previous = current.previousSibling;
        parent.removeChild(current);
        current = previous;
      }
    }

    __exports__["default"] = Morph;
  });