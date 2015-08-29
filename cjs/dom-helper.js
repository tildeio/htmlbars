exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _htmlbarsRuntimeMorph = require("./htmlbars-runtime/morph");

var _htmlbarsRuntimeMorph2 = _interopRequireDefault(_htmlbarsRuntimeMorph);

var _morphAttr = require("./morph-attr");

var _morphAttr2 = _interopRequireDefault(_morphAttr);

var _domHelperBuildHtmlDom = require("./dom-helper/build-html-dom");

var _domHelperClasses = require("./dom-helper/classes");

var _domHelperProp = require("./dom-helper/prop");

var doc = typeof document === 'undefined' ? false : document;

var deletesBlankTextNodes = doc && (function (document) {
  var element = document.createElement('div');
  element.appendChild(document.createTextNode(''));
  var clonedElement = element.cloneNode(true);
  return clonedElement.childNodes.length === 0;
})(doc);

var ignoresCheckedAttribute = doc && (function (document) {
  var element = document.createElement('input');
  element.setAttribute('checked', 'checked');
  var clonedElement = element.cloneNode(false);
  return !clonedElement.checked;
})(doc);

var canRemoveSvgViewBoxAttribute = doc && (doc.createElementNS ? (function (document) {
  var element = document.createElementNS(_domHelperBuildHtmlDom.svgNamespace, 'svg');
  element.setAttribute('viewBox', '0 0 100 100');
  element.removeAttribute('viewBox');
  return !element.getAttribute('viewBox');
})(doc) : true);

var canClone = doc && (function (document) {
  var element = document.createElement('div');
  element.appendChild(document.createTextNode(' '));
  element.appendChild(document.createTextNode(' '));
  var clonedElement = element.cloneNode(true);
  return clonedElement.childNodes[0].nodeValue === ' ';
})(doc);

// This is not the namespace of the element, but of
// the elements inside that elements.
function interiorNamespace(element) {
  if (element && element.namespaceURI === _domHelperBuildHtmlDom.svgNamespace && !_domHelperBuildHtmlDom.svgHTMLIntegrationPoints[element.tagName]) {
    return _domHelperBuildHtmlDom.svgNamespace;
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
function detectOmittedStartTag(string, contextualElement) {
  // Omitted start tags are only inside table tags.
  if (contextualElement.tagName === 'TABLE') {
    var omittedStartTagChildMatch = omittedStartTagChildTest.exec(string);
    if (omittedStartTagChildMatch) {
      var omittedStartTagChild = omittedStartTagChildMatch[1];
      // It is already asserted that the contextual element is a table
      // and not the proper start tag. Just see if a tag was omitted.
      return omittedStartTagChild === 'tr' || omittedStartTagChild === 'col';
    }
  }
}

function buildSVGDOM(html, dom) {
  var div = dom.document.createElement('div');
  div.innerHTML = '<svg>' + html + '</svg>';
  return div.firstChild.childNodes;
}

var guid = 1;

function ElementMorph(element, dom, namespace) {
  this.element = element;
  this.dom = dom;
  this.namespace = namespace;
  this.guid = "element" + guid++;

  this.state = {};
  this.isDirty = true;
}

// renderAndCleanup calls `clear` on all items in the morph map
// just before calling `destroy` on the morph.
//
// As a future refactor this could be changed to set the property
// back to its original/default value.
ElementMorph.prototype.clear = function () {};

ElementMorph.prototype.destroy = function () {
  this.element = null;
  this.dom = null;
};

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
function DOMHelper(_document) {
  this.document = _document || document;
  if (!this.document) {
    throw new Error("A document object must be passed to the DOMHelper, or available on the global scope");
  }
  this.canClone = canClone;
  this.namespace = null;
}

var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;

prototype.getElementById = function (id, rootNode) {
  rootNode = rootNode || this.document;
  return rootNode.getElementById(id);
};

prototype.insertBefore = function (element, childElement, referenceChild) {
  return element.insertBefore(childElement, referenceChild);
};

prototype.appendChild = function (element, childElement) {
  return element.appendChild(childElement);
};

var itemAt;

// It appears that sometimes, in yet to be itentified scenarios PhantomJS 2.0
// crashes on childNodes.item(index), but works as expected with childNodes[index];
//
// Although it would be nice to move to childNodes[index] in all scenarios,
// this would require SimpleDOM to maintain the childNodes array. This would be
// quite costly, in both dev time and runtime.
//
// So instead, we choose the best possible method and call it a day.
//
/*global navigator */
if (typeof navigator !== 'undefined' && navigator.userAgent.indexOf('PhantomJS')) {
  itemAt = function (nodes, index) {
    return nodes[index];
  };
} else {
  itemAt = function (nodes, index) {
    return nodes.item(index);
  };
}

prototype.childAt = function (element, indices) {
  var child = element;

  for (var i = 0; i < indices.length; i++) {
    child = itemAt(child.childNodes, indices[i]);
  }

  return child;
};

// Note to a Fellow Implementor:
// Ahh, accessing a child node at an index. Seems like it should be so simple,
// doesn't it? Unfortunately, this particular method has caused us a surprising
// amount of pain. As you'll note below, this method has been modified to walk
// the linked list of child nodes rather than access the child by index
// directly, even though there are two (2) APIs in the DOM that do this for us.
// If you're thinking to yourself, "What an oversight! What an opportunity to
// optimize this code!" then to you I say: stop! For I have a tale to tell.
//
// First, this code must be compatible with simple-dom for rendering on the
// server where there is no real DOM. Previously, we accessed a child node
// directly via `element.childNodes[index]`. While we *could* in theory do a
// full-fidelity simulation of a live `childNodes` array, this is slow,
// complicated and error-prone.
//
// "No problem," we thought, "we'll just use the similar
// `childNodes.item(index)` API." Then, we could just implement our own `item`
// method in simple-dom and walk the child node linked list there, allowing
// us to retain the performance advantages of the (surely optimized) `item()`
// API in the browser.
//
// Unfortunately, an enterprising soul named Samy Alzahrani discovered that in
// IE8, accessing an item out-of-bounds via `item()` causes an exception where
// other browsers return null. This necessitated a... check of
// `childNodes.length`, bringing us back around to having to support a
// full-fidelity `childNodes` array!
//
// Worst of all, Kris Selden investigated how browsers are actualy implemented
// and discovered that they're all linked lists under the hood anyway. Accessing
// `childNodes` requires them to allocate a new live collection backed by that
// linked list, which is itself a rather expensive operation. Our assumed
// optimization had backfired! That is the danger of magical thinking about
// the performance of native implementations.
//
// And this, my friends, is why the following implementation just walks the
// linked list, as surprised as that may make you. Please ensure you understand
// the above before changing this and submitting a PR.
//
// Tom Dale, January 18th, 2015, Portland OR
prototype.childAtIndex = function (element, index) {
  var node = element.firstChild;

  for (var idx = 0; node && idx < index; idx++) {
    node = node.nextSibling;
  }

  return node;
};

prototype.appendText = function (element, text) {
  return element.appendChild(this.document.createTextNode(text));
};

prototype.setAttribute = function (element, name, value) {
  element.setAttribute(name, String(value));
};

prototype.getAttribute = function (element, name) {
  return element.getAttribute(name);
};

prototype.setAttributeNS = function (element, namespace, name, value) {
  element.setAttributeNS(namespace, name, String(value));
};

prototype.getAttributeNS = function (element, namespace, name) {
  return element.getAttributeNS(namespace, name);
};

if (canRemoveSvgViewBoxAttribute) {
  prototype.removeAttribute = function (element, name) {
    element.removeAttribute(name);
  };
} else {
  prototype.removeAttribute = function (element, name) {
    if (element.tagName === 'svg' && name === 'viewBox') {
      element.setAttribute(name, null);
    } else {
      element.removeAttribute(name);
    }
  };
}

prototype.setPropertyStrict = function (element, name, value) {
  if (value === undefined) {
    value = null;
  }

  if (value === null && (name === 'value' || name === 'type' || name === 'src')) {
    value = '';
  }

  element[name] = value;
};

prototype.getPropertyStrict = function (element, name) {
  return element[name];
};

prototype.setProperty = function (element, name, value, namespace) {
  if (element.namespaceURI === _domHelperBuildHtmlDom.svgNamespace) {
    if (_domHelperProp.isAttrRemovalValue(value)) {
      element.removeAttribute(name);
    } else {
      if (namespace) {
        element.setAttributeNS(namespace, name, value);
      } else {
        element.setAttribute(name, value);
      }
    }
  } else {
    var _normalizeProperty = _domHelperProp.normalizeProperty(element, name);

    var normalized = _normalizeProperty.normalized;
    var type = _normalizeProperty.type;

    if (type === 'prop') {
      element[normalized] = value;
    } else {
      if (_domHelperProp.isAttrRemovalValue(value)) {
        element.removeAttribute(name);
      } else {
        if (namespace && element.setAttributeNS) {
          element.setAttributeNS(namespace, name, value);
        } else {
          element.setAttribute(name, value);
        }
      }
    }
  }
};

if (doc && doc.createElementNS) {
  // Only opt into namespace detection if a contextualElement
  // is passed.
  prototype.createElement = function (tagName, contextualElement) {
    var namespace = this.namespace;
    if (contextualElement) {
      if (tagName === 'svg') {
        namespace = _domHelperBuildHtmlDom.svgNamespace;
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
  prototype.setAttributeNS = function (element, namespace, name, value) {
    element.setAttributeNS(namespace, name, String(value));
  };
} else {
  prototype.createElement = function (tagName) {
    return this.document.createElement(tagName);
  };
  prototype.setAttributeNS = function (element, namespace, name, value) {
    element.setAttribute(name, String(value));
  };
}

prototype.addClasses = _domHelperClasses.addClasses;
prototype.removeClasses = _domHelperClasses.removeClasses;

prototype.setNamespace = function (ns) {
  this.namespace = ns;
};

prototype.detectNamespace = function (element) {
  this.namespace = interiorNamespace(element);
};

prototype.createDocumentFragment = function () {
  return this.document.createDocumentFragment();
};

prototype.createTextNode = function (text) {
  return this.document.createTextNode(text);
};

prototype.createComment = function (text) {
  return this.document.createComment(text);
};

prototype.repairClonedNode = function (element, blankChildTextNodes, isChecked) {
  if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
    for (var i = 0, len = blankChildTextNodes.length; i < len; i++) {
      var textNode = this.document.createTextNode(''),
          offset = blankChildTextNodes[i],
          before = this.childAtIndex(element, offset);
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

prototype.cloneNode = function (element, deep) {
  var clone = element.cloneNode(!!deep);
  return clone;
};

prototype.AttrMorphClass = _morphAttr2.default;

prototype.createAttrMorph = function (element, attrName, namespace) {
  return new this.AttrMorphClass(element, attrName, this, namespace);
};

prototype.ElementMorphClass = ElementMorph;

prototype.createElementMorph = function (element, namespace) {
  return new this.ElementMorphClass(element, this, namespace);
};

prototype.createUnsafeAttrMorph = function (element, attrName, namespace) {
  var morph = this.createAttrMorph(element, attrName, namespace);
  morph.escaped = false;
  return morph;
};

prototype.MorphClass = _htmlbarsRuntimeMorph2.default;

prototype.createMorph = function (parent, start, end, contextualElement) {
  if (contextualElement && contextualElement.nodeType === 11) {
    throw new Error("Cannot pass a fragment as the contextual element to createMorph");
  }

  if (!contextualElement && parent && parent.nodeType === 1) {
    contextualElement = parent;
  }
  var morph = new this.MorphClass(this, contextualElement);
  morph.firstNode = start;
  morph.lastNode = end;
  return morph;
};

prototype.createFragmentMorph = function (contextualElement) {
  if (contextualElement && contextualElement.nodeType === 11) {
    throw new Error("Cannot pass a fragment as the contextual element to createMorph");
  }

  var fragment = this.createDocumentFragment();
  return _htmlbarsRuntimeMorph2.default.create(this, contextualElement, fragment);
};

prototype.replaceContentWithMorph = function (element) {
  var firstChild = element.firstChild;

  if (!firstChild) {
    var comment = this.createComment('');
    this.appendChild(element, comment);
    return _htmlbarsRuntimeMorph2.default.create(this, element, comment);
  } else {
    var morph = _htmlbarsRuntimeMorph2.default.attach(this, element, firstChild, element.lastChild);
    morph.clear();
    return morph;
  }
};

prototype.createUnsafeMorph = function (parent, start, end, contextualElement) {
  var morph = this.createMorph(parent, start, end, contextualElement);
  morph.parseTextAsHTML = true;
  return morph;
};

// This helper is just to keep the templates good looking,
// passing integers instead of element references.
prototype.createMorphAt = function (parent, startIndex, endIndex, contextualElement) {
  var single = startIndex === endIndex;
  var start = this.childAtIndex(parent, startIndex);
  var end = single ? start : this.childAtIndex(parent, endIndex);
  return this.createMorph(parent, start, end, contextualElement);
};

prototype.createUnsafeMorphAt = function (parent, startIndex, endIndex, contextualElement) {
  var morph = this.createMorphAt(parent, startIndex, endIndex, contextualElement);
  morph.parseTextAsHTML = true;
  return morph;
};

prototype.insertMorphBefore = function (element, referenceChild, contextualElement) {
  var insertion = this.document.createComment('');
  element.insertBefore(insertion, referenceChild);
  return this.createMorph(element, insertion, insertion, contextualElement);
};

prototype.appendMorph = function (element, contextualElement) {
  var insertion = this.document.createComment('');
  element.appendChild(insertion);
  return this.createMorph(element, insertion, insertion, contextualElement);
};

prototype.insertBoundary = function (fragment, index) {
  // this will always be null or firstChild
  var child = index === null ? null : this.childAtIndex(fragment, index);
  this.insertBefore(fragment, this.createTextNode(''), child);
};

prototype.setMorphHTML = function (morph, html) {
  morph.setHTML(html);
};

prototype.parseHTML = function (html, contextualElement) {
  var childNodes;

  if (interiorNamespace(contextualElement) === _domHelperBuildHtmlDom.svgNamespace) {
    childNodes = buildSVGDOM(html, this);
  } else {
    var nodes = _domHelperBuildHtmlDom.buildHTMLDOM(html, contextualElement, this);
    if (detectOmittedStartTag(html, contextualElement)) {
      var node = nodes[0];
      while (node && node.nodeType !== 1) {
        node = node.nextSibling;
      }
      childNodes = node.childNodes;
    } else {
      childNodes = nodes;
    }
  }

  // Copy node list to a fragment.
  var fragment = this.document.createDocumentFragment();

  if (childNodes && childNodes.length > 0) {
    var currentNode = childNodes[0];

    // We prepend an <option> to <select> boxes to absorb any browser bugs
    // related to auto-select behavior. Skip past it.
    if (contextualElement.tagName === 'SELECT') {
      currentNode = currentNode.nextSibling;
    }

    while (currentNode) {
      var tempNode = currentNode;
      currentNode = currentNode.nextSibling;

      fragment.appendChild(tempNode);
    }
  }

  return fragment;
};

var parsingNode;

// Used to determine whether a URL needs to be sanitized.
prototype.protocolForURL = function (url) {
  if (!parsingNode) {
    parsingNode = this.document.createElement('a');
  }

  parsingNode.href = url;
  return parsingNode.protocol;
};

exports.default = DOMHelper;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;base64,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cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1vcnBoIGZyb20gXCIuL2h0bWxiYXJzLXJ1bnRpbWUvbW9ycGhcIjtcbmltcG9ydCBBdHRyTW9ycGggZnJvbSBcIi4vbW9ycGgtYXR0clwiO1xuaW1wb3J0IHtcbiAgYnVpbGRIVE1MRE9NLFxuICBzdmdOYW1lc3BhY2UsXG4gIHN2Z0hUTUxJbnRlZ3JhdGlvblBvaW50c1xufSBmcm9tIFwiLi9kb20taGVscGVyL2J1aWxkLWh0bWwtZG9tXCI7XG5pbXBvcnQge1xuICBhZGRDbGFzc2VzLFxuICByZW1vdmVDbGFzc2VzXG59IGZyb20gXCIuL2RvbS1oZWxwZXIvY2xhc3Nlc1wiO1xuaW1wb3J0IHtcbiAgbm9ybWFsaXplUHJvcGVydHlcbn0gZnJvbSBcIi4vZG9tLWhlbHBlci9wcm9wXCI7XG5pbXBvcnQgeyBpc0F0dHJSZW1vdmFsVmFsdWUgfSBmcm9tIFwiLi9kb20taGVscGVyL3Byb3BcIjtcblxudmFyIGRvYyA9IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IGRvY3VtZW50O1xuXG52YXIgZGVsZXRlc0JsYW5rVGV4dE5vZGVzID0gZG9jICYmIChmdW5jdGlvbihkb2N1bWVudCl7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSApO1xuICB2YXIgY2xvbmVkRWxlbWVudCA9IGVsZW1lbnQuY2xvbmVOb2RlKHRydWUpO1xuICByZXR1cm4gY2xvbmVkRWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMDtcbn0pKGRvYyk7XG5cbnZhciBpZ25vcmVzQ2hlY2tlZEF0dHJpYnV0ZSA9IGRvYyAmJiAoZnVuY3Rpb24oZG9jdW1lbnQpe1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcbiAgdmFyIGNsb25lZEVsZW1lbnQgPSBlbGVtZW50LmNsb25lTm9kZShmYWxzZSk7XG4gIHJldHVybiAhY2xvbmVkRWxlbWVudC5jaGVja2VkO1xufSkoZG9jKTtcblxudmFyIGNhblJlbW92ZVN2Z1ZpZXdCb3hBdHRyaWJ1dGUgPSBkb2MgJiYgKGRvYy5jcmVhdGVFbGVtZW50TlMgPyAoZnVuY3Rpb24oZG9jdW1lbnQpe1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhzdmdOYW1lc3BhY2UsICdzdmcnKTtcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3ZpZXdCb3gnLCAnMCAwIDEwMCAxMDAnKTtcbiAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3ZpZXdCb3gnKTtcbiAgcmV0dXJuICFlbGVtZW50LmdldEF0dHJpYnV0ZSgndmlld0JveCcpO1xufSkoZG9jKSA6IHRydWUpO1xuXG52YXIgY2FuQ2xvbmUgPSBkb2MgJiYgKGZ1bmN0aW9uKGRvY3VtZW50KXtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyAnKSk7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcgJykpO1xuICB2YXIgY2xvbmVkRWxlbWVudCA9IGVsZW1lbnQuY2xvbmVOb2RlKHRydWUpO1xuICByZXR1cm4gY2xvbmVkRWxlbWVudC5jaGlsZE5vZGVzWzBdLm5vZGVWYWx1ZSA9PT0gJyAnO1xufSkoZG9jKTtcblxuLy8gVGhpcyBpcyBub3QgdGhlIG5hbWVzcGFjZSBvZiB0aGUgZWxlbWVudCwgYnV0IG9mXG4vLyB0aGUgZWxlbWVudHMgaW5zaWRlIHRoYXQgZWxlbWVudHMuXG5mdW5jdGlvbiBpbnRlcmlvck5hbWVzcGFjZShlbGVtZW50KXtcbiAgaWYgKFxuICAgIGVsZW1lbnQgJiZcbiAgICBlbGVtZW50Lm5hbWVzcGFjZVVSSSA9PT0gc3ZnTmFtZXNwYWNlICYmXG4gICAgIXN2Z0hUTUxJbnRlZ3JhdGlvblBvaW50c1tlbGVtZW50LnRhZ05hbWVdXG4gICkge1xuICAgIHJldHVybiBzdmdOYW1lc3BhY2U7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLy8gVGhlIEhUTUwgc3BlYyBhbGxvd3MgZm9yIFwib21pdHRlZCBzdGFydCB0YWdzXCIuIFRoZXNlIHRhZ3MgYXJlIG9wdGlvbmFsXG4vLyB3aGVuIHRoZWlyIGludGVuZGVkIGNoaWxkIGlzIHRoZSBmaXJzdCB0aGluZyBpbiB0aGUgcGFyZW50IHRhZy4gRm9yXG4vLyBleGFtcGxlLCB0aGlzIGlzIGEgdGJvZHkgc3RhcnQgdGFnOlxuLy9cbi8vIDx0YWJsZT5cbi8vICAgPHRib2R5PlxuLy8gICAgIDx0cj5cbi8vXG4vLyBUaGUgdGJvZHkgbWF5IGJlIG9taXR0ZWQsIGFuZCB0aGUgYnJvd3NlciB3aWxsIGFjY2VwdCBhbmQgcmVuZGVyOlxuLy9cbi8vIDx0YWJsZT5cbi8vICAgPHRyPlxuLy9cbi8vIEhvd2V2ZXIsIHRoZSBvbWl0dGVkIHN0YXJ0IHRhZyB3aWxsIHN0aWxsIGJlIGFkZGVkIHRvIHRoZSBET00uIEhlcmVcbi8vIHdlIHRlc3QgdGhlIHN0cmluZyBhbmQgY29udGV4dCB0byBzZWUgaWYgdGhlIGJyb3dzZXIgaXMgYWJvdXQgdG9cbi8vIHBlcmZvcm0gdGhpcyBjbGVhbnVwLlxuLy9cbi8vIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3N5bnRheC5odG1sI29wdGlvbmFsLXRhZ3Ncbi8vIGRlc2NyaWJlcyB3aGljaCB0YWdzIGFyZSBvbWl0dGFibGUuIFRoZSBzcGVjIGZvciB0Ym9keSBhbmQgY29sZ3JvdXBcbi8vIGV4cGxhaW5zIHRoaXMgYmVoYXZpb3I6XG4vL1xuLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvdGFibGVzLmh0bWwjdGhlLXRib2R5LWVsZW1lbnRcbi8vIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3RhYmxlcy5odG1sI3RoZS1jb2xncm91cC1lbGVtZW50XG4vL1xuXG52YXIgb21pdHRlZFN0YXJ0VGFnQ2hpbGRUZXN0ID0gLzwoW1xcdzpdKykvO1xuZnVuY3Rpb24gZGV0ZWN0T21pdHRlZFN0YXJ0VGFnKHN0cmluZywgY29udGV4dHVhbEVsZW1lbnQpe1xuICAvLyBPbWl0dGVkIHN0YXJ0IHRhZ3MgYXJlIG9ubHkgaW5zaWRlIHRhYmxlIHRhZ3MuXG4gIGlmIChjb250ZXh0dWFsRWxlbWVudC50YWdOYW1lID09PSAnVEFCTEUnKSB7XG4gICAgdmFyIG9taXR0ZWRTdGFydFRhZ0NoaWxkTWF0Y2ggPSBvbWl0dGVkU3RhcnRUYWdDaGlsZFRlc3QuZXhlYyhzdHJpbmcpO1xuICAgIGlmIChvbWl0dGVkU3RhcnRUYWdDaGlsZE1hdGNoKSB7XG4gICAgICB2YXIgb21pdHRlZFN0YXJ0VGFnQ2hpbGQgPSBvbWl0dGVkU3RhcnRUYWdDaGlsZE1hdGNoWzFdO1xuICAgICAgLy8gSXQgaXMgYWxyZWFkeSBhc3NlcnRlZCB0aGF0IHRoZSBjb250ZXh0dWFsIGVsZW1lbnQgaXMgYSB0YWJsZVxuICAgICAgLy8gYW5kIG5vdCB0aGUgcHJvcGVyIHN0YXJ0IHRhZy4gSnVzdCBzZWUgaWYgYSB0YWcgd2FzIG9taXR0ZWQuXG4gICAgICByZXR1cm4gb21pdHRlZFN0YXJ0VGFnQ2hpbGQgPT09ICd0cicgfHxcbiAgICAgICAgICAgICBvbWl0dGVkU3RhcnRUYWdDaGlsZCA9PT0gJ2NvbCc7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU1ZHRE9NKGh0bWwsIGRvbSl7XG4gIHZhciBkaXYgPSBkb20uZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRpdi5pbm5lckhUTUwgPSAnPHN2Zz4nK2h0bWwrJzwvc3ZnPic7XG4gIHJldHVybiBkaXYuZmlyc3RDaGlsZC5jaGlsZE5vZGVzO1xufVxuXG52YXIgZ3VpZCA9IDE7XG5cbmZ1bmN0aW9uIEVsZW1lbnRNb3JwaChlbGVtZW50LCBkb20sIG5hbWVzcGFjZSkge1xuICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICB0aGlzLmRvbSA9IGRvbTtcbiAgdGhpcy5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gIHRoaXMuZ3VpZCA9IFwiZWxlbWVudFwiICsgZ3VpZCsrO1xuXG4gIHRoaXMuc3RhdGUgPSB7fTtcbiAgdGhpcy5pc0RpcnR5ID0gdHJ1ZTtcbn1cblxuLy8gcmVuZGVyQW5kQ2xlYW51cCBjYWxscyBgY2xlYXJgIG9uIGFsbCBpdGVtcyBpbiB0aGUgbW9ycGggbWFwXG4vLyBqdXN0IGJlZm9yZSBjYWxsaW5nIGBkZXN0cm95YCBvbiB0aGUgbW9ycGguXG4vL1xuLy8gQXMgYSBmdXR1cmUgcmVmYWN0b3IgdGhpcyBjb3VsZCBiZSBjaGFuZ2VkIHRvIHNldCB0aGUgcHJvcGVydHlcbi8vIGJhY2sgdG8gaXRzIG9yaWdpbmFsL2RlZmF1bHQgdmFsdWUuXG5FbGVtZW50TW9ycGgucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7IH07XG5cbkVsZW1lbnRNb3JwaC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB0aGlzLmRvbSA9IG51bGw7XG59O1xuXG5cbi8qXG4gKiBBIGNsYXNzIHdyYXBwaW5nIERPTSBmdW5jdGlvbnMgdG8gYWRkcmVzcyBlbnZpcm9ubWVudCBjb21wYXRpYmlsaXR5LFxuICogbmFtZXNwYWNlcywgY29udGV4dHVhbCBlbGVtZW50cyBmb3IgbW9ycGggdW4tZXNjYXBlZCBjb250ZW50XG4gKiBpbnNlcnRpb24uXG4gKlxuICogV2hlbiBlbnRlcmluZyBhIHRlbXBsYXRlLCBhIERPTUhlbHBlciBzaG91bGQgYmUgcGFzc2VkOlxuICpcbiAqICAgdGVtcGxhdGUoY29udGV4dCwgeyBob29rczogaG9va3MsIGRvbTogbmV3IERPTUhlbHBlcigpIH0pO1xuICpcbiAqIFRPRE86IHN1cHBvcnQgZm9yZWlnbk9iamVjdCBhcyBhIHBhc3NlZCBjb250ZXh0dWFsIGVsZW1lbnQuIEl0IGhhc1xuICogYSBuYW1lc3BhY2UgKHN2ZykgdGhhdCBkb2VzIG5vdCBtYXRjaCBpdHMgaW50ZXJuYWwgbmFtZXNwYWNlXG4gKiAoeGh0bWwpLlxuICpcbiAqIEBjbGFzcyBET01IZWxwZXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtIVE1MRG9jdW1lbnR9IF9kb2N1bWVudCBUaGUgZG9jdW1lbnQgRE9NIG1ldGhvZHMgYXJlIHByb3hpZWQgdG9cbiAqL1xuZnVuY3Rpb24gRE9NSGVscGVyKF9kb2N1bWVudCl7XG4gIHRoaXMuZG9jdW1lbnQgPSBfZG9jdW1lbnQgfHwgZG9jdW1lbnQ7XG4gIGlmICghdGhpcy5kb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkEgZG9jdW1lbnQgb2JqZWN0IG11c3QgYmUgcGFzc2VkIHRvIHRoZSBET01IZWxwZXIsIG9yIGF2YWlsYWJsZSBvbiB0aGUgZ2xvYmFsIHNjb3BlXCIpO1xuICB9XG4gIHRoaXMuY2FuQ2xvbmUgPSBjYW5DbG9uZTtcbiAgdGhpcy5uYW1lc3BhY2UgPSBudWxsO1xufVxuXG52YXIgcHJvdG90eXBlID0gRE9NSGVscGVyLnByb3RvdHlwZTtcbnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERPTUhlbHBlcjtcblxucHJvdG90eXBlLmdldEVsZW1lbnRCeUlkID0gZnVuY3Rpb24oaWQsIHJvb3ROb2RlKSB7XG4gIHJvb3ROb2RlID0gcm9vdE5vZGUgfHwgdGhpcy5kb2N1bWVudDtcbiAgcmV0dXJuIHJvb3ROb2RlLmdldEVsZW1lbnRCeUlkKGlkKTtcbn07XG5cbnByb3RvdHlwZS5pbnNlcnRCZWZvcmUgPSBmdW5jdGlvbihlbGVtZW50LCBjaGlsZEVsZW1lbnQsIHJlZmVyZW5jZUNoaWxkKSB7XG4gIHJldHVybiBlbGVtZW50Lmluc2VydEJlZm9yZShjaGlsZEVsZW1lbnQsIHJlZmVyZW5jZUNoaWxkKTtcbn07XG5cbnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNoaWxkRWxlbWVudCkge1xuICByZXR1cm4gZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZEVsZW1lbnQpO1xufTtcblxudmFyIGl0ZW1BdDtcblxuLy8gSXQgYXBwZWFycyB0aGF0IHNvbWV0aW1lcywgaW4geWV0IHRvIGJlIGl0ZW50aWZpZWQgc2NlbmFyaW9zIFBoYW50b21KUyAyLjBcbi8vIGNyYXNoZXMgb24gY2hpbGROb2Rlcy5pdGVtKGluZGV4KSwgYnV0IHdvcmtzIGFzIGV4cGVjdGVkIHdpdGggY2hpbGROb2Rlc1tpbmRleF07XG4vL1xuLy8gQWx0aG91Z2ggaXQgd291bGQgYmUgbmljZSB0byBtb3ZlIHRvIGNoaWxkTm9kZXNbaW5kZXhdIGluIGFsbCBzY2VuYXJpb3MsXG4vLyB0aGlzIHdvdWxkIHJlcXVpcmUgU2ltcGxlRE9NIHRvIG1haW50YWluIHRoZSBjaGlsZE5vZGVzIGFycmF5LiBUaGlzIHdvdWxkIGJlXG4vLyBxdWl0ZSBjb3N0bHksIGluIGJvdGggZGV2IHRpbWUgYW5kIHJ1bnRpbWUuXG4vL1xuLy8gU28gaW5zdGVhZCwgd2UgY2hvb3NlIHRoZSBiZXN0IHBvc3NpYmxlIG1ldGhvZCBhbmQgY2FsbCBpdCBhIGRheS5cbi8vXG4vKmdsb2JhbCBuYXZpZ2F0b3IgKi9cbmlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignUGhhbnRvbUpTJykpIHtcbiAgaXRlbUF0ID0gZnVuY3Rpb24obm9kZXMsIGluZGV4KSB7XG4gICAgcmV0dXJuIG5vZGVzW2luZGV4XTtcbiAgfTtcbn0gZWxzZSB7XG4gIGl0ZW1BdCA9IGZ1bmN0aW9uKG5vZGVzLCBpbmRleCkge1xuICAgIHJldHVybiBub2Rlcy5pdGVtKGluZGV4KTtcbiAgfTtcbn1cblxucHJvdG90eXBlLmNoaWxkQXQgPSBmdW5jdGlvbihlbGVtZW50LCBpbmRpY2VzKSB7XG4gIHZhciBjaGlsZCA9IGVsZW1lbnQ7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hpbGQgPSBpdGVtQXQoY2hpbGQuY2hpbGROb2RlcywgaW5kaWNlc1tpXSk7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59O1xuXG4vLyBOb3RlIHRvIGEgRmVsbG93IEltcGxlbWVudG9yOlxuLy8gQWhoLCBhY2Nlc3NpbmcgYSBjaGlsZCBub2RlIGF0IGFuIGluZGV4LiBTZWVtcyBsaWtlIGl0IHNob3VsZCBiZSBzbyBzaW1wbGUsXG4vLyBkb2Vzbid0IGl0PyBVbmZvcnR1bmF0ZWx5LCB0aGlzIHBhcnRpY3VsYXIgbWV0aG9kIGhhcyBjYXVzZWQgdXMgYSBzdXJwcmlzaW5nXG4vLyBhbW91bnQgb2YgcGFpbi4gQXMgeW91J2xsIG5vdGUgYmVsb3csIHRoaXMgbWV0aG9kIGhhcyBiZWVuIG1vZGlmaWVkIHRvIHdhbGtcbi8vIHRoZSBsaW5rZWQgbGlzdCBvZiBjaGlsZCBub2RlcyByYXRoZXIgdGhhbiBhY2Nlc3MgdGhlIGNoaWxkIGJ5IGluZGV4XG4vLyBkaXJlY3RseSwgZXZlbiB0aG91Z2ggdGhlcmUgYXJlIHR3byAoMikgQVBJcyBpbiB0aGUgRE9NIHRoYXQgZG8gdGhpcyBmb3IgdXMuXG4vLyBJZiB5b3UncmUgdGhpbmtpbmcgdG8geW91cnNlbGYsIFwiV2hhdCBhbiBvdmVyc2lnaHQhIFdoYXQgYW4gb3Bwb3J0dW5pdHkgdG9cbi8vIG9wdGltaXplIHRoaXMgY29kZSFcIiB0aGVuIHRvIHlvdSBJIHNheTogc3RvcCEgRm9yIEkgaGF2ZSBhIHRhbGUgdG8gdGVsbC5cbi8vXG4vLyBGaXJzdCwgdGhpcyBjb2RlIG11c3QgYmUgY29tcGF0aWJsZSB3aXRoIHNpbXBsZS1kb20gZm9yIHJlbmRlcmluZyBvbiB0aGVcbi8vIHNlcnZlciB3aGVyZSB0aGVyZSBpcyBubyByZWFsIERPTS4gUHJldmlvdXNseSwgd2UgYWNjZXNzZWQgYSBjaGlsZCBub2RlXG4vLyBkaXJlY3RseSB2aWEgYGVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF1gLiBXaGlsZSB3ZSAqY291bGQqIGluIHRoZW9yeSBkbyBhXG4vLyBmdWxsLWZpZGVsaXR5IHNpbXVsYXRpb24gb2YgYSBsaXZlIGBjaGlsZE5vZGVzYCBhcnJheSwgdGhpcyBpcyBzbG93LFxuLy8gY29tcGxpY2F0ZWQgYW5kIGVycm9yLXByb25lLlxuLy9cbi8vIFwiTm8gcHJvYmxlbSxcIiB3ZSB0aG91Z2h0LCBcIndlJ2xsIGp1c3QgdXNlIHRoZSBzaW1pbGFyXG4vLyBgY2hpbGROb2Rlcy5pdGVtKGluZGV4KWAgQVBJLlwiIFRoZW4sIHdlIGNvdWxkIGp1c3QgaW1wbGVtZW50IG91ciBvd24gYGl0ZW1gXG4vLyBtZXRob2QgaW4gc2ltcGxlLWRvbSBhbmQgd2FsayB0aGUgY2hpbGQgbm9kZSBsaW5rZWQgbGlzdCB0aGVyZSwgYWxsb3dpbmdcbi8vIHVzIHRvIHJldGFpbiB0aGUgcGVyZm9ybWFuY2UgYWR2YW50YWdlcyBvZiB0aGUgKHN1cmVseSBvcHRpbWl6ZWQpIGBpdGVtKClgXG4vLyBBUEkgaW4gdGhlIGJyb3dzZXIuXG4vL1xuLy8gVW5mb3J0dW5hdGVseSwgYW4gZW50ZXJwcmlzaW5nIHNvdWwgbmFtZWQgU2FteSBBbHphaHJhbmkgZGlzY292ZXJlZCB0aGF0IGluXG4vLyBJRTgsIGFjY2Vzc2luZyBhbiBpdGVtIG91dC1vZi1ib3VuZHMgdmlhIGBpdGVtKClgIGNhdXNlcyBhbiBleGNlcHRpb24gd2hlcmVcbi8vIG90aGVyIGJyb3dzZXJzIHJldHVybiBudWxsLiBUaGlzIG5lY2Vzc2l0YXRlZCBhLi4uIGNoZWNrIG9mXG4vLyBgY2hpbGROb2Rlcy5sZW5ndGhgLCBicmluZ2luZyB1cyBiYWNrIGFyb3VuZCB0byBoYXZpbmcgdG8gc3VwcG9ydCBhXG4vLyBmdWxsLWZpZGVsaXR5IGBjaGlsZE5vZGVzYCBhcnJheSFcbi8vXG4vLyBXb3JzdCBvZiBhbGwsIEtyaXMgU2VsZGVuIGludmVzdGlnYXRlZCBob3cgYnJvd3NlcnMgYXJlIGFjdHVhbHkgaW1wbGVtZW50ZWRcbi8vIGFuZCBkaXNjb3ZlcmVkIHRoYXQgdGhleSdyZSBhbGwgbGlua2VkIGxpc3RzIHVuZGVyIHRoZSBob29kIGFueXdheS4gQWNjZXNzaW5nXG4vLyBgY2hpbGROb2Rlc2AgcmVxdWlyZXMgdGhlbSB0byBhbGxvY2F0ZSBhIG5ldyBsaXZlIGNvbGxlY3Rpb24gYmFja2VkIGJ5IHRoYXRcbi8vIGxpbmtlZCBsaXN0LCB3aGljaCBpcyBpdHNlbGYgYSByYXRoZXIgZXhwZW5zaXZlIG9wZXJhdGlvbi4gT3VyIGFzc3VtZWRcbi8vIG9wdGltaXphdGlvbiBoYWQgYmFja2ZpcmVkISBUaGF0IGlzIHRoZSBkYW5nZXIgb2YgbWFnaWNhbCB0aGlua2luZyBhYm91dFxuLy8gdGhlIHBlcmZvcm1hbmNlIG9mIG5hdGl2ZSBpbXBsZW1lbnRhdGlvbnMuXG4vL1xuLy8gQW5kIHRoaXMsIG15IGZyaWVuZHMsIGlzIHdoeSB0aGUgZm9sbG93aW5nIGltcGxlbWVudGF0aW9uIGp1c3Qgd2Fsa3MgdGhlXG4vLyBsaW5rZWQgbGlzdCwgYXMgc3VycHJpc2VkIGFzIHRoYXQgbWF5IG1ha2UgeW91LiBQbGVhc2UgZW5zdXJlIHlvdSB1bmRlcnN0YW5kXG4vLyB0aGUgYWJvdmUgYmVmb3JlIGNoYW5naW5nIHRoaXMgYW5kIHN1Ym1pdHRpbmcgYSBQUi5cbi8vXG4vLyBUb20gRGFsZSwgSmFudWFyeSAxOHRoLCAyMDE1LCBQb3J0bGFuZCBPUlxucHJvdG90eXBlLmNoaWxkQXRJbmRleCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGluZGV4KSB7XG4gIHZhciBub2RlID0gZWxlbWVudC5maXJzdENoaWxkO1xuXG4gIGZvciAodmFyIGlkeCA9IDA7IG5vZGUgJiYgaWR4IDwgaW5kZXg7IGlkeCsrKSB7XG4gICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gIH1cblxuICByZXR1cm4gbm9kZTtcbn07XG5cbnByb3RvdHlwZS5hcHBlbmRUZXh0ID0gZnVuY3Rpb24oZWxlbWVudCwgdGV4dCkge1xuICByZXR1cm4gZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpKTtcbn07XG5cbnByb3RvdHlwZS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsdWUpKTtcbn07XG5cbnByb3RvdHlwZS5nZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lKSB7XG4gIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShuYW1lKTtcbn07XG5cbnByb3RvdHlwZS5zZXRBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWVzcGFjZSwgbmFtZSwgdmFsdWUpIHtcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhuYW1lc3BhY2UsIG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xufTtcblxucHJvdG90eXBlLmdldEF0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWxlbWVudCwgbmFtZXNwYWNlLCBuYW1lKSB7XG4gIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZU5TKG5hbWVzcGFjZSwgbmFtZSk7XG59O1xuXG5pZiAoY2FuUmVtb3ZlU3ZnVmlld0JveEF0dHJpYnV0ZSl7XG4gIHByb3RvdHlwZS5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lKSB7XG4gICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIH07XG59IGVsc2Uge1xuICBwcm90b3R5cGUucmVtb3ZlQXR0cmlidXRlID0gZnVuY3Rpb24oZWxlbWVudCwgbmFtZSkge1xuICAgIGlmIChlbGVtZW50LnRhZ05hbWUgPT09ICdzdmcnICYmIG5hbWUgPT09ICd2aWV3Qm94Jykge1xuICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgbnVsbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgfTtcbn1cblxucHJvdG90eXBlLnNldFByb3BlcnR5U3RyaWN0ID0gZnVuY3Rpb24oZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IG51bGw7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IG51bGwgJiYgKG5hbWUgPT09ICd2YWx1ZScgfHwgbmFtZSA9PT0gJ3R5cGUnIHx8IG5hbWUgPT09ICdzcmMnKSkge1xuICAgIHZhbHVlID0gJyc7XG4gIH1cblxuICBlbGVtZW50W25hbWVdID0gdmFsdWU7XG59O1xuXG5wcm90b3R5cGUuZ2V0UHJvcGVydHlTdHJpY3QgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lKSB7XG4gIHJldHVybiBlbGVtZW50W25hbWVdO1xufTtcblxucHJvdG90eXBlLnNldFByb3BlcnR5ID0gZnVuY3Rpb24oZWxlbWVudCwgbmFtZSwgdmFsdWUsIG5hbWVzcGFjZSkge1xuICBpZiAoZWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IHN2Z05hbWVzcGFjZSkge1xuICAgIGlmIChpc0F0dHJSZW1vdmFsVmFsdWUodmFsdWUpKSB7XG4gICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZU5TKG5hbWVzcGFjZSwgbmFtZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgeyBub3JtYWxpemVkICwgdHlwZSB9ID0gbm9ybWFsaXplUHJvcGVydHkoZWxlbWVudCwgbmFtZSk7XG4gICAgaWYgKHR5cGUgPT09ICdwcm9wJykge1xuICAgICAgZWxlbWVudFtub3JtYWxpemVkXSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaXNBdHRyUmVtb3ZhbFZhbHVlKHZhbHVlKSkge1xuICAgICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuYW1lc3BhY2UgJiYgZWxlbWVudC5zZXRBdHRyaWJ1dGVOUykge1xuICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlTlMobmFtZXNwYWNlLCBuYW1lLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5pZiAoZG9jICYmIGRvYy5jcmVhdGVFbGVtZW50TlMpIHtcbiAgLy8gT25seSBvcHQgaW50byBuYW1lc3BhY2UgZGV0ZWN0aW9uIGlmIGEgY29udGV4dHVhbEVsZW1lbnRcbiAgLy8gaXMgcGFzc2VkLlxuICBwcm90b3R5cGUuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uKHRhZ05hbWUsIGNvbnRleHR1YWxFbGVtZW50KSB7XG4gICAgdmFyIG5hbWVzcGFjZSA9IHRoaXMubmFtZXNwYWNlO1xuICAgIGlmIChjb250ZXh0dWFsRWxlbWVudCkge1xuICAgICAgaWYgKHRhZ05hbWUgPT09ICdzdmcnKSB7XG4gICAgICAgIG5hbWVzcGFjZSA9IHN2Z05hbWVzcGFjZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWVzcGFjZSA9IGludGVyaW9yTmFtZXNwYWNlKGNvbnRleHR1YWxFbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZSwgdGFnTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgfVxuICB9O1xuICBwcm90b3R5cGUuc2V0QXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lc3BhY2UsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhuYW1lc3BhY2UsIG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xuICB9O1xufSBlbHNlIHtcbiAgcHJvdG90eXBlLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbih0YWdOYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfTtcbiAgcHJvdG90eXBlLnNldEF0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWxlbWVudCwgbmFtZXNwYWNlLCBuYW1lLCB2YWx1ZSkge1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xuICB9O1xufVxuXG5wcm90b3R5cGUuYWRkQ2xhc3NlcyA9IGFkZENsYXNzZXM7XG5wcm90b3R5cGUucmVtb3ZlQ2xhc3NlcyA9IHJlbW92ZUNsYXNzZXM7XG5cbnByb3RvdHlwZS5zZXROYW1lc3BhY2UgPSBmdW5jdGlvbihucykge1xuICB0aGlzLm5hbWVzcGFjZSA9IG5zO1xufTtcblxucHJvdG90eXBlLmRldGVjdE5hbWVzcGFjZSA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgdGhpcy5uYW1lc3BhY2UgPSBpbnRlcmlvck5hbWVzcGFjZShlbGVtZW50KTtcbn07XG5cbnByb3RvdHlwZS5jcmVhdGVEb2N1bWVudEZyYWdtZW50ID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xufTtcblxucHJvdG90eXBlLmNyZWF0ZVRleHROb2RlID0gZnVuY3Rpb24odGV4dCl7XG4gIHJldHVybiB0aGlzLmRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpO1xufTtcblxucHJvdG90eXBlLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbih0ZXh0KXtcbiAgcmV0dXJuIHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCh0ZXh0KTtcbn07XG5cbnByb3RvdHlwZS5yZXBhaXJDbG9uZWROb2RlID0gZnVuY3Rpb24oZWxlbWVudCwgYmxhbmtDaGlsZFRleHROb2RlcywgaXNDaGVja2VkKXtcbiAgaWYgKGRlbGV0ZXNCbGFua1RleHROb2RlcyAmJiBibGFua0NoaWxkVGV4dE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKHZhciBpPTAsIGxlbj1ibGFua0NoaWxkVGV4dE5vZGVzLmxlbmd0aDtpPGxlbjtpKyspe1xuICAgICAgdmFyIHRleHROb2RlID0gdGhpcy5kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyksXG4gICAgICAgICAgb2Zmc2V0ID0gYmxhbmtDaGlsZFRleHROb2Rlc1tpXSxcbiAgICAgICAgICBiZWZvcmUgPSB0aGlzLmNoaWxkQXRJbmRleChlbGVtZW50LCBvZmZzZXQpO1xuICAgICAgaWYgKGJlZm9yZSkge1xuICAgICAgICBlbGVtZW50Lmluc2VydEJlZm9yZSh0ZXh0Tm9kZSwgYmVmb3JlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQodGV4dE5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoaWdub3Jlc0NoZWNrZWRBdHRyaWJ1dGUgJiYgaXNDaGVja2VkKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpO1xuICB9XG59O1xuXG5wcm90b3R5cGUuY2xvbmVOb2RlID0gZnVuY3Rpb24oZWxlbWVudCwgZGVlcCl7XG4gIHZhciBjbG9uZSA9IGVsZW1lbnQuY2xvbmVOb2RlKCEhZGVlcCk7XG4gIHJldHVybiBjbG9uZTtcbn07XG5cbnByb3RvdHlwZS5BdHRyTW9ycGhDbGFzcyA9IEF0dHJNb3JwaDtcblxucHJvdG90eXBlLmNyZWF0ZUF0dHJNb3JwaCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGF0dHJOYW1lLCBuYW1lc3BhY2Upe1xuICByZXR1cm4gbmV3IHRoaXMuQXR0ck1vcnBoQ2xhc3MoZWxlbWVudCwgYXR0ck5hbWUsIHRoaXMsIG5hbWVzcGFjZSk7XG59O1xuXG5wcm90b3R5cGUuRWxlbWVudE1vcnBoQ2xhc3MgPSBFbGVtZW50TW9ycGg7XG5cbnByb3RvdHlwZS5jcmVhdGVFbGVtZW50TW9ycGggPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lc3BhY2Upe1xuICByZXR1cm4gbmV3IHRoaXMuRWxlbWVudE1vcnBoQ2xhc3MoZWxlbWVudCwgdGhpcywgbmFtZXNwYWNlKTtcbn07XG5cbnByb3RvdHlwZS5jcmVhdGVVbnNhZmVBdHRyTW9ycGggPSBmdW5jdGlvbihlbGVtZW50LCBhdHRyTmFtZSwgbmFtZXNwYWNlKXtcbiAgdmFyIG1vcnBoID0gdGhpcy5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgYXR0ck5hbWUsIG5hbWVzcGFjZSk7XG4gIG1vcnBoLmVzY2FwZWQgPSBmYWxzZTtcbiAgcmV0dXJuIG1vcnBoO1xufTtcblxucHJvdG90eXBlLk1vcnBoQ2xhc3MgPSBNb3JwaDtcblxucHJvdG90eXBlLmNyZWF0ZU1vcnBoID0gZnVuY3Rpb24ocGFyZW50LCBzdGFydCwgZW5kLCBjb250ZXh0dWFsRWxlbWVudCl7XG4gIGlmIChjb250ZXh0dWFsRWxlbWVudCAmJiBjb250ZXh0dWFsRWxlbWVudC5ub2RlVHlwZSA9PT0gMTEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcGFzcyBhIGZyYWdtZW50IGFzIHRoZSBjb250ZXh0dWFsIGVsZW1lbnQgdG8gY3JlYXRlTW9ycGhcIik7XG4gIH1cblxuICBpZiAoIWNvbnRleHR1YWxFbGVtZW50ICYmIHBhcmVudCAmJiBwYXJlbnQubm9kZVR5cGUgPT09IDEpIHtcbiAgICBjb250ZXh0dWFsRWxlbWVudCA9IHBhcmVudDtcbiAgfVxuICB2YXIgbW9ycGggPSBuZXcgdGhpcy5Nb3JwaENsYXNzKHRoaXMsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAgbW9ycGguZmlyc3ROb2RlID0gc3RhcnQ7XG4gIG1vcnBoLmxhc3ROb2RlID0gZW5kO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG5wcm90b3R5cGUuY3JlYXRlRnJhZ21lbnRNb3JwaCA9IGZ1bmN0aW9uKGNvbnRleHR1YWxFbGVtZW50KSB7XG4gIGlmIChjb250ZXh0dWFsRWxlbWVudCAmJiBjb250ZXh0dWFsRWxlbWVudC5ub2RlVHlwZSA9PT0gMTEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcGFzcyBhIGZyYWdtZW50IGFzIHRoZSBjb250ZXh0dWFsIGVsZW1lbnQgdG8gY3JlYXRlTW9ycGhcIik7XG4gIH1cblxuICB2YXIgZnJhZ21lbnQgPSB0aGlzLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgcmV0dXJuIE1vcnBoLmNyZWF0ZSh0aGlzLCBjb250ZXh0dWFsRWxlbWVudCwgZnJhZ21lbnQpO1xufTtcblxucHJvdG90eXBlLnJlcGxhY2VDb250ZW50V2l0aE1vcnBoID0gZnVuY3Rpb24oZWxlbWVudCkgIHtcbiAgdmFyIGZpcnN0Q2hpbGQgPSBlbGVtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgaWYgKCFmaXJzdENoaWxkKSB7XG4gICAgdmFyIGNvbW1lbnQgPSB0aGlzLmNyZWF0ZUNvbW1lbnQoJycpO1xuICAgIHRoaXMuYXBwZW5kQ2hpbGQoZWxlbWVudCwgY29tbWVudCk7XG4gICAgcmV0dXJuIE1vcnBoLmNyZWF0ZSh0aGlzLCBlbGVtZW50LCBjb21tZW50KTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbW9ycGggPSBNb3JwaC5hdHRhY2godGhpcywgZWxlbWVudCwgZmlyc3RDaGlsZCwgZWxlbWVudC5sYXN0Q2hpbGQpO1xuICAgIG1vcnBoLmNsZWFyKCk7XG4gICAgcmV0dXJuIG1vcnBoO1xuICB9XG59O1xuXG5wcm90b3R5cGUuY3JlYXRlVW5zYWZlTW9ycGggPSBmdW5jdGlvbihwYXJlbnQsIHN0YXJ0LCBlbmQsIGNvbnRleHR1YWxFbGVtZW50KXtcbiAgdmFyIG1vcnBoID0gdGhpcy5jcmVhdGVNb3JwaChwYXJlbnQsIHN0YXJ0LCBlbmQsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAgbW9ycGgucGFyc2VUZXh0QXNIVE1MID0gdHJ1ZTtcbiAgcmV0dXJuIG1vcnBoO1xufTtcblxuLy8gVGhpcyBoZWxwZXIgaXMganVzdCB0byBrZWVwIHRoZSB0ZW1wbGF0ZXMgZ29vZCBsb29raW5nLFxuLy8gcGFzc2luZyBpbnRlZ2VycyBpbnN0ZWFkIG9mIGVsZW1lbnQgcmVmZXJlbmNlcy5cbnByb3RvdHlwZS5jcmVhdGVNb3JwaEF0ID0gZnVuY3Rpb24ocGFyZW50LCBzdGFydEluZGV4LCBlbmRJbmRleCwgY29udGV4dHVhbEVsZW1lbnQpe1xuICB2YXIgc2luZ2xlID0gc3RhcnRJbmRleCA9PT0gZW5kSW5kZXg7XG4gIHZhciBzdGFydCA9IHRoaXMuY2hpbGRBdEluZGV4KHBhcmVudCwgc3RhcnRJbmRleCk7XG4gIHZhciBlbmQgPSBzaW5nbGUgPyBzdGFydCA6IHRoaXMuY2hpbGRBdEluZGV4KHBhcmVudCwgZW5kSW5kZXgpO1xuICByZXR1cm4gdGhpcy5jcmVhdGVNb3JwaChwYXJlbnQsIHN0YXJ0LCBlbmQsIGNvbnRleHR1YWxFbGVtZW50KTtcbn07XG5cbnByb3RvdHlwZS5jcmVhdGVVbnNhZmVNb3JwaEF0ID0gZnVuY3Rpb24ocGFyZW50LCBzdGFydEluZGV4LCBlbmRJbmRleCwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdmFyIG1vcnBoID0gdGhpcy5jcmVhdGVNb3JwaEF0KHBhcmVudCwgc3RhcnRJbmRleCwgZW5kSW5kZXgsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAgbW9ycGgucGFyc2VUZXh0QXNIVE1MID0gdHJ1ZTtcbiAgcmV0dXJuIG1vcnBoO1xufTtcblxucHJvdG90eXBlLmluc2VydE1vcnBoQmVmb3JlID0gZnVuY3Rpb24oZWxlbWVudCwgcmVmZXJlbmNlQ2hpbGQsIGNvbnRleHR1YWxFbGVtZW50KSB7XG4gIHZhciBpbnNlcnRpb24gPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuICBlbGVtZW50Lmluc2VydEJlZm9yZShpbnNlcnRpb24sIHJlZmVyZW5jZUNoaWxkKTtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlTW9ycGgoZWxlbWVudCwgaW5zZXJ0aW9uLCBpbnNlcnRpb24sIGNvbnRleHR1YWxFbGVtZW50KTtcbn07XG5cbnByb3RvdHlwZS5hcHBlbmRNb3JwaCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNvbnRleHR1YWxFbGVtZW50KSB7XG4gIHZhciBpbnNlcnRpb24gPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuICBlbGVtZW50LmFwcGVuZENoaWxkKGluc2VydGlvbik7XG4gIHJldHVybiB0aGlzLmNyZWF0ZU1vcnBoKGVsZW1lbnQsIGluc2VydGlvbiwgaW5zZXJ0aW9uLCBjb250ZXh0dWFsRWxlbWVudCk7XG59O1xuXG5wcm90b3R5cGUuaW5zZXJ0Qm91bmRhcnkgPSBmdW5jdGlvbihmcmFnbWVudCwgaW5kZXgpIHtcbiAgLy8gdGhpcyB3aWxsIGFsd2F5cyBiZSBudWxsIG9yIGZpcnN0Q2hpbGRcbiAgdmFyIGNoaWxkID0gaW5kZXggPT09IG51bGwgPyBudWxsIDogdGhpcy5jaGlsZEF0SW5kZXgoZnJhZ21lbnQsIGluZGV4KTtcbiAgdGhpcy5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIHRoaXMuY3JlYXRlVGV4dE5vZGUoJycpLCBjaGlsZCk7XG59O1xuXG5wcm90b3R5cGUuc2V0TW9ycGhIVE1MID0gZnVuY3Rpb24obW9ycGgsIGh0bWwpIHtcbiAgbW9ycGguc2V0SFRNTChodG1sKTtcbn07XG5cbnByb3RvdHlwZS5wYXJzZUhUTUwgPSBmdW5jdGlvbihodG1sLCBjb250ZXh0dWFsRWxlbWVudCkge1xuICB2YXIgY2hpbGROb2RlcztcblxuICBpZiAoaW50ZXJpb3JOYW1lc3BhY2UoY29udGV4dHVhbEVsZW1lbnQpID09PSBzdmdOYW1lc3BhY2UpIHtcbiAgICBjaGlsZE5vZGVzID0gYnVpbGRTVkdET00oaHRtbCwgdGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG5vZGVzID0gYnVpbGRIVE1MRE9NKGh0bWwsIGNvbnRleHR1YWxFbGVtZW50LCB0aGlzKTtcbiAgICBpZiAoZGV0ZWN0T21pdHRlZFN0YXJ0VGFnKGh0bWwsIGNvbnRleHR1YWxFbGVtZW50KSkge1xuICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXTtcbiAgICAgIHdoaWxlIChub2RlICYmIG5vZGUubm9kZVR5cGUgIT09IDEpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICB9XG4gICAgICBjaGlsZE5vZGVzID0gbm9kZS5jaGlsZE5vZGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZE5vZGVzID0gbm9kZXM7XG4gICAgfVxuICB9XG5cbiAgLy8gQ29weSBub2RlIGxpc3QgdG8gYSBmcmFnbWVudC5cbiAgdmFyIGZyYWdtZW50ID0gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgaWYgKGNoaWxkTm9kZXMgJiYgY2hpbGROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGN1cnJlbnROb2RlID0gY2hpbGROb2Rlc1swXTtcblxuICAgIC8vIFdlIHByZXBlbmQgYW4gPG9wdGlvbj4gdG8gPHNlbGVjdD4gYm94ZXMgdG8gYWJzb3JiIGFueSBicm93c2VyIGJ1Z3NcbiAgICAvLyByZWxhdGVkIHRvIGF1dG8tc2VsZWN0IGJlaGF2aW9yLiBTa2lwIHBhc3QgaXQuXG4gICAgaWYgKGNvbnRleHR1YWxFbGVtZW50LnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICBjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLm5leHRTaWJsaW5nO1xuICAgIH1cblxuICAgIHdoaWxlIChjdXJyZW50Tm9kZSkge1xuICAgICAgdmFyIHRlbXBOb2RlID0gY3VycmVudE5vZGU7XG4gICAgICBjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLm5leHRTaWJsaW5nO1xuXG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wTm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZyYWdtZW50O1xufTtcblxudmFyIHBhcnNpbmdOb2RlO1xuXG4vLyBVc2VkIHRvIGRldGVybWluZSB3aGV0aGVyIGEgVVJMIG5lZWRzIHRvIGJlIHNhbml0aXplZC5cbnByb3RvdHlwZS5wcm90b2NvbEZvclVSTCA9IGZ1bmN0aW9uKHVybCkge1xuICBpZiAoIXBhcnNpbmdOb2RlKSB7XG4gICAgcGFyc2luZ05vZGUgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgfVxuXG4gIHBhcnNpbmdOb2RlLmhyZWYgPSB1cmw7XG4gIHJldHVybiBwYXJzaW5nTm9kZS5wcm90b2NvbDtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IERPTUhlbHBlcjtcbiJdfQ==