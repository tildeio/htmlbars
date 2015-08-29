define("dom-helper", ["exports", "./htmlbars-runtime/morph", "./morph-attr", "./dom-helper/build-html-dom", "./dom-helper/classes", "./dom-helper/prop"], function (exports, _htmlbarsRuntimeMorph, _morphAttr, _domHelperBuildHtmlDom, _domHelperClasses, _domHelperProp) {

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

  prototype.AttrMorphClass = _morphAttr.default;

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

  prototype.MorphClass = _htmlbarsRuntimeMorph.default;

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
    return _htmlbarsRuntimeMorph.default.create(this, contextualElement, fragment);
  };

  prototype.replaceContentWithMorph = function (element) {
    var firstChild = element.firstChild;

    if (!firstChild) {
      var comment = this.createComment('');
      this.appendChild(element, comment);
      return _htmlbarsRuntimeMorph.default.create(this, element, comment);
    } else {
      var morph = _htmlbarsRuntimeMorph.default.attach(this, element, firstChild, element.lastChild);
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
});
//# sourceMappingURL=data:application/json;base64,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LEdBQUcsR0FBRyxDQUFDO0FBQ3ZCLFdBQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQztHQUM3QixDQUFDOztvQkFFYSxTQUFTIiwiZmlsZSI6ImRvbS1oZWxwZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTW9ycGggZnJvbSBcIi4vaHRtbGJhcnMtcnVudGltZS9tb3JwaFwiO1xuaW1wb3J0IEF0dHJNb3JwaCBmcm9tIFwiLi9tb3JwaC1hdHRyXCI7XG5pbXBvcnQge1xuICBidWlsZEhUTUxET00sXG4gIHN2Z05hbWVzcGFjZSxcbiAgc3ZnSFRNTEludGVncmF0aW9uUG9pbnRzXG59IGZyb20gXCIuL2RvbS1oZWxwZXIvYnVpbGQtaHRtbC1kb21cIjtcbmltcG9ydCB7XG4gIGFkZENsYXNzZXMsXG4gIHJlbW92ZUNsYXNzZXNcbn0gZnJvbSBcIi4vZG9tLWhlbHBlci9jbGFzc2VzXCI7XG5pbXBvcnQge1xuICBub3JtYWxpemVQcm9wZXJ0eVxufSBmcm9tIFwiLi9kb20taGVscGVyL3Byb3BcIjtcbmltcG9ydCB7IGlzQXR0clJlbW92YWxWYWx1ZSB9IGZyb20gXCIuL2RvbS1oZWxwZXIvcHJvcFwiO1xuXG52YXIgZG9jID0gdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogZG9jdW1lbnQ7XG5cbnZhciBkZWxldGVzQmxhbmtUZXh0Tm9kZXMgPSBkb2MgJiYgKGZ1bmN0aW9uKGRvY3VtZW50KXtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpICk7XG4gIHZhciBjbG9uZWRFbGVtZW50ID0gZWxlbWVudC5jbG9uZU5vZGUodHJ1ZSk7XG4gIHJldHVybiBjbG9uZWRFbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAwO1xufSkoZG9jKTtcblxudmFyIGlnbm9yZXNDaGVja2VkQXR0cmlidXRlID0gZG9jICYmIChmdW5jdGlvbihkb2N1bWVudCl7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpO1xuICB2YXIgY2xvbmVkRWxlbWVudCA9IGVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKTtcbiAgcmV0dXJuICFjbG9uZWRFbGVtZW50LmNoZWNrZWQ7XG59KShkb2MpO1xuXG52YXIgY2FuUmVtb3ZlU3ZnVmlld0JveEF0dHJpYnV0ZSA9IGRvYyAmJiAoZG9jLmNyZWF0ZUVsZW1lbnROUyA/IChmdW5jdGlvbihkb2N1bWVudCl7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z05hbWVzcGFjZSwgJ3N2ZycpO1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZSgndmlld0JveCcsICcwIDAgMTAwIDEwMCcpO1xuICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgndmlld0JveCcpO1xuICByZXR1cm4gIWVsZW1lbnQuZ2V0QXR0cmlidXRlKCd2aWV3Qm94Jyk7XG59KShkb2MpIDogdHJ1ZSk7XG5cbnZhciBjYW5DbG9uZSA9IGRvYyAmJiAoZnVuY3Rpb24oZG9jdW1lbnQpe1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBlbGVtZW50LmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICcpKTtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyAnKSk7XG4gIHZhciBjbG9uZWRFbGVtZW50ID0gZWxlbWVudC5jbG9uZU5vZGUodHJ1ZSk7XG4gIHJldHVybiBjbG9uZWRFbGVtZW50LmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlID09PSAnICc7XG59KShkb2MpO1xuXG4vLyBUaGlzIGlzIG5vdCB0aGUgbmFtZXNwYWNlIG9mIHRoZSBlbGVtZW50LCBidXQgb2Zcbi8vIHRoZSBlbGVtZW50cyBpbnNpZGUgdGhhdCBlbGVtZW50cy5cbmZ1bmN0aW9uIGludGVyaW9yTmFtZXNwYWNlKGVsZW1lbnQpe1xuICBpZiAoXG4gICAgZWxlbWVudCAmJlxuICAgIGVsZW1lbnQubmFtZXNwYWNlVVJJID09PSBzdmdOYW1lc3BhY2UgJiZcbiAgICAhc3ZnSFRNTEludGVncmF0aW9uUG9pbnRzW2VsZW1lbnQudGFnTmFtZV1cbiAgKSB7XG4gICAgcmV0dXJuIHN2Z05hbWVzcGFjZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyBUaGUgSFRNTCBzcGVjIGFsbG93cyBmb3IgXCJvbWl0dGVkIHN0YXJ0IHRhZ3NcIi4gVGhlc2UgdGFncyBhcmUgb3B0aW9uYWxcbi8vIHdoZW4gdGhlaXIgaW50ZW5kZWQgY2hpbGQgaXMgdGhlIGZpcnN0IHRoaW5nIGluIHRoZSBwYXJlbnQgdGFnLiBGb3Jcbi8vIGV4YW1wbGUsIHRoaXMgaXMgYSB0Ym9keSBzdGFydCB0YWc6XG4vL1xuLy8gPHRhYmxlPlxuLy8gICA8dGJvZHk+XG4vLyAgICAgPHRyPlxuLy9cbi8vIFRoZSB0Ym9keSBtYXkgYmUgb21pdHRlZCwgYW5kIHRoZSBicm93c2VyIHdpbGwgYWNjZXB0IGFuZCByZW5kZXI6XG4vL1xuLy8gPHRhYmxlPlxuLy8gICA8dHI+XG4vL1xuLy8gSG93ZXZlciwgdGhlIG9taXR0ZWQgc3RhcnQgdGFnIHdpbGwgc3RpbGwgYmUgYWRkZWQgdG8gdGhlIERPTS4gSGVyZVxuLy8gd2UgdGVzdCB0aGUgc3RyaW5nIGFuZCBjb250ZXh0IHRvIHNlZSBpZiB0aGUgYnJvd3NlciBpcyBhYm91dCB0b1xuLy8gcGVyZm9ybSB0aGlzIGNsZWFudXAuXG4vL1xuLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2Uvc3ludGF4Lmh0bWwjb3B0aW9uYWwtdGFnc1xuLy8gZGVzY3JpYmVzIHdoaWNoIHRhZ3MgYXJlIG9taXR0YWJsZS4gVGhlIHNwZWMgZm9yIHRib2R5IGFuZCBjb2xncm91cFxuLy8gZXhwbGFpbnMgdGhpcyBiZWhhdmlvcjpcbi8vXG4vLyBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS90YWJsZXMuaHRtbCN0aGUtdGJvZHktZWxlbWVudFxuLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvdGFibGVzLmh0bWwjdGhlLWNvbGdyb3VwLWVsZW1lbnRcbi8vXG5cbnZhciBvbWl0dGVkU3RhcnRUYWdDaGlsZFRlc3QgPSAvPChbXFx3Ol0rKS87XG5mdW5jdGlvbiBkZXRlY3RPbWl0dGVkU3RhcnRUYWcoc3RyaW5nLCBjb250ZXh0dWFsRWxlbWVudCl7XG4gIC8vIE9taXR0ZWQgc3RhcnQgdGFncyBhcmUgb25seSBpbnNpZGUgdGFibGUgdGFncy5cbiAgaWYgKGNvbnRleHR1YWxFbGVtZW50LnRhZ05hbWUgPT09ICdUQUJMRScpIHtcbiAgICB2YXIgb21pdHRlZFN0YXJ0VGFnQ2hpbGRNYXRjaCA9IG9taXR0ZWRTdGFydFRhZ0NoaWxkVGVzdC5leGVjKHN0cmluZyk7XG4gICAgaWYgKG9taXR0ZWRTdGFydFRhZ0NoaWxkTWF0Y2gpIHtcbiAgICAgIHZhciBvbWl0dGVkU3RhcnRUYWdDaGlsZCA9IG9taXR0ZWRTdGFydFRhZ0NoaWxkTWF0Y2hbMV07XG4gICAgICAvLyBJdCBpcyBhbHJlYWR5IGFzc2VydGVkIHRoYXQgdGhlIGNvbnRleHR1YWwgZWxlbWVudCBpcyBhIHRhYmxlXG4gICAgICAvLyBhbmQgbm90IHRoZSBwcm9wZXIgc3RhcnQgdGFnLiBKdXN0IHNlZSBpZiBhIHRhZyB3YXMgb21pdHRlZC5cbiAgICAgIHJldHVybiBvbWl0dGVkU3RhcnRUYWdDaGlsZCA9PT0gJ3RyJyB8fFxuICAgICAgICAgICAgIG9taXR0ZWRTdGFydFRhZ0NoaWxkID09PSAnY29sJztcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRTVkdET00oaHRtbCwgZG9tKXtcbiAgdmFyIGRpdiA9IGRvbS5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZGl2LmlubmVySFRNTCA9ICc8c3ZnPicraHRtbCsnPC9zdmc+JztcbiAgcmV0dXJuIGRpdi5maXJzdENoaWxkLmNoaWxkTm9kZXM7XG59XG5cbnZhciBndWlkID0gMTtcblxuZnVuY3Rpb24gRWxlbWVudE1vcnBoKGVsZW1lbnQsIGRvbSwgbmFtZXNwYWNlKSB7XG4gIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gIHRoaXMuZG9tID0gZG9tO1xuICB0aGlzLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcbiAgdGhpcy5ndWlkID0gXCJlbGVtZW50XCIgKyBndWlkKys7XG5cbiAgdGhpcy5zdGF0ZSA9IHt9O1xuICB0aGlzLmlzRGlydHkgPSB0cnVlO1xufVxuXG4vLyByZW5kZXJBbmRDbGVhbnVwIGNhbGxzIGBjbGVhcmAgb24gYWxsIGl0ZW1zIGluIHRoZSBtb3JwaCBtYXBcbi8vIGp1c3QgYmVmb3JlIGNhbGxpbmcgYGRlc3Ryb3lgIG9uIHRoZSBtb3JwaC5cbi8vXG4vLyBBcyBhIGZ1dHVyZSByZWZhY3RvciB0aGlzIGNvdWxkIGJlIGNoYW5nZWQgdG8gc2V0IHRoZSBwcm9wZXJ0eVxuLy8gYmFjayB0byBpdHMgb3JpZ2luYWwvZGVmYXVsdCB2YWx1ZS5cbkVsZW1lbnRNb3JwaC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHsgfTtcblxuRWxlbWVudE1vcnBoLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gIHRoaXMuZG9tID0gbnVsbDtcbn07XG5cblxuLypcbiAqIEEgY2xhc3Mgd3JhcHBpbmcgRE9NIGZ1bmN0aW9ucyB0byBhZGRyZXNzIGVudmlyb25tZW50IGNvbXBhdGliaWxpdHksXG4gKiBuYW1lc3BhY2VzLCBjb250ZXh0dWFsIGVsZW1lbnRzIGZvciBtb3JwaCB1bi1lc2NhcGVkIGNvbnRlbnRcbiAqIGluc2VydGlvbi5cbiAqXG4gKiBXaGVuIGVudGVyaW5nIGEgdGVtcGxhdGUsIGEgRE9NSGVscGVyIHNob3VsZCBiZSBwYXNzZWQ6XG4gKlxuICogICB0ZW1wbGF0ZShjb250ZXh0LCB7IGhvb2tzOiBob29rcywgZG9tOiBuZXcgRE9NSGVscGVyKCkgfSk7XG4gKlxuICogVE9ETzogc3VwcG9ydCBmb3JlaWduT2JqZWN0IGFzIGEgcGFzc2VkIGNvbnRleHR1YWwgZWxlbWVudC4gSXQgaGFzXG4gKiBhIG5hbWVzcGFjZSAoc3ZnKSB0aGF0IGRvZXMgbm90IG1hdGNoIGl0cyBpbnRlcm5hbCBuYW1lc3BhY2VcbiAqICh4aHRtbCkuXG4gKlxuICogQGNsYXNzIERPTUhlbHBlclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0hUTUxEb2N1bWVudH0gX2RvY3VtZW50IFRoZSBkb2N1bWVudCBET00gbWV0aG9kcyBhcmUgcHJveGllZCB0b1xuICovXG5mdW5jdGlvbiBET01IZWxwZXIoX2RvY3VtZW50KXtcbiAgdGhpcy5kb2N1bWVudCA9IF9kb2N1bWVudCB8fCBkb2N1bWVudDtcbiAgaWYgKCF0aGlzLmRvY3VtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQSBkb2N1bWVudCBvYmplY3QgbXVzdCBiZSBwYXNzZWQgdG8gdGhlIERPTUhlbHBlciwgb3IgYXZhaWxhYmxlIG9uIHRoZSBnbG9iYWwgc2NvcGVcIik7XG4gIH1cbiAgdGhpcy5jYW5DbG9uZSA9IGNhbkNsb25lO1xuICB0aGlzLm5hbWVzcGFjZSA9IG51bGw7XG59XG5cbnZhciBwcm90b3R5cGUgPSBET01IZWxwZXIucHJvdG90eXBlO1xucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRE9NSGVscGVyO1xuXG5wcm90b3R5cGUuZ2V0RWxlbWVudEJ5SWQgPSBmdW5jdGlvbihpZCwgcm9vdE5vZGUpIHtcbiAgcm9vdE5vZGUgPSByb290Tm9kZSB8fCB0aGlzLmRvY3VtZW50O1xuICByZXR1cm4gcm9vdE5vZGUuZ2V0RWxlbWVudEJ5SWQoaWQpO1xufTtcblxucHJvdG90eXBlLmluc2VydEJlZm9yZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNoaWxkRWxlbWVudCwgcmVmZXJlbmNlQ2hpbGQpIHtcbiAgcmV0dXJuIGVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNoaWxkRWxlbWVudCwgcmVmZXJlbmNlQ2hpbGQpO1xufTtcblxucHJvdG90eXBlLmFwcGVuZENoaWxkID0gZnVuY3Rpb24oZWxlbWVudCwgY2hpbGRFbGVtZW50KSB7XG4gIHJldHVybiBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkRWxlbWVudCk7XG59O1xuXG52YXIgaXRlbUF0O1xuXG4vLyBJdCBhcHBlYXJzIHRoYXQgc29tZXRpbWVzLCBpbiB5ZXQgdG8gYmUgaXRlbnRpZmllZCBzY2VuYXJpb3MgUGhhbnRvbUpTIDIuMFxuLy8gY3Jhc2hlcyBvbiBjaGlsZE5vZGVzLml0ZW0oaW5kZXgpLCBidXQgd29ya3MgYXMgZXhwZWN0ZWQgd2l0aCBjaGlsZE5vZGVzW2luZGV4XTtcbi8vXG4vLyBBbHRob3VnaCBpdCB3b3VsZCBiZSBuaWNlIHRvIG1vdmUgdG8gY2hpbGROb2Rlc1tpbmRleF0gaW4gYWxsIHNjZW5hcmlvcyxcbi8vIHRoaXMgd291bGQgcmVxdWlyZSBTaW1wbGVET00gdG8gbWFpbnRhaW4gdGhlIGNoaWxkTm9kZXMgYXJyYXkuIFRoaXMgd291bGQgYmVcbi8vIHF1aXRlIGNvc3RseSwgaW4gYm90aCBkZXYgdGltZSBhbmQgcnVudGltZS5cbi8vXG4vLyBTbyBpbnN0ZWFkLCB3ZSBjaG9vc2UgdGhlIGJlc3QgcG9zc2libGUgbWV0aG9kIGFuZCBjYWxsIGl0IGEgZGF5LlxuLy9cbi8qZ2xvYmFsIG5hdmlnYXRvciAqL1xuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmXG4gICAgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdQaGFudG9tSlMnKSkge1xuICBpdGVtQXQgPSBmdW5jdGlvbihub2RlcywgaW5kZXgpIHtcbiAgICByZXR1cm4gbm9kZXNbaW5kZXhdO1xuICB9O1xufSBlbHNlIHtcbiAgaXRlbUF0ID0gZnVuY3Rpb24obm9kZXMsIGluZGV4KSB7XG4gICAgcmV0dXJuIG5vZGVzLml0ZW0oaW5kZXgpO1xuICB9O1xufVxuXG5wcm90b3R5cGUuY2hpbGRBdCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGluZGljZXMpIHtcbiAgdmFyIGNoaWxkID0gZWxlbWVudDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjaGlsZCA9IGl0ZW1BdChjaGlsZC5jaGlsZE5vZGVzLCBpbmRpY2VzW2ldKTtcbiAgfVxuXG4gIHJldHVybiBjaGlsZDtcbn07XG5cbi8vIE5vdGUgdG8gYSBGZWxsb3cgSW1wbGVtZW50b3I6XG4vLyBBaGgsIGFjY2Vzc2luZyBhIGNoaWxkIG5vZGUgYXQgYW4gaW5kZXguIFNlZW1zIGxpa2UgaXQgc2hvdWxkIGJlIHNvIHNpbXBsZSxcbi8vIGRvZXNuJ3QgaXQ/IFVuZm9ydHVuYXRlbHksIHRoaXMgcGFydGljdWxhciBtZXRob2QgaGFzIGNhdXNlZCB1cyBhIHN1cnByaXNpbmdcbi8vIGFtb3VudCBvZiBwYWluLiBBcyB5b3UnbGwgbm90ZSBiZWxvdywgdGhpcyBtZXRob2QgaGFzIGJlZW4gbW9kaWZpZWQgdG8gd2Fsa1xuLy8gdGhlIGxpbmtlZCBsaXN0IG9mIGNoaWxkIG5vZGVzIHJhdGhlciB0aGFuIGFjY2VzcyB0aGUgY2hpbGQgYnkgaW5kZXhcbi8vIGRpcmVjdGx5LCBldmVuIHRob3VnaCB0aGVyZSBhcmUgdHdvICgyKSBBUElzIGluIHRoZSBET00gdGhhdCBkbyB0aGlzIGZvciB1cy5cbi8vIElmIHlvdSdyZSB0aGlua2luZyB0byB5b3Vyc2VsZiwgXCJXaGF0IGFuIG92ZXJzaWdodCEgV2hhdCBhbiBvcHBvcnR1bml0eSB0b1xuLy8gb3B0aW1pemUgdGhpcyBjb2RlIVwiIHRoZW4gdG8geW91IEkgc2F5OiBzdG9wISBGb3IgSSBoYXZlIGEgdGFsZSB0byB0ZWxsLlxuLy9cbi8vIEZpcnN0LCB0aGlzIGNvZGUgbXVzdCBiZSBjb21wYXRpYmxlIHdpdGggc2ltcGxlLWRvbSBmb3IgcmVuZGVyaW5nIG9uIHRoZVxuLy8gc2VydmVyIHdoZXJlIHRoZXJlIGlzIG5vIHJlYWwgRE9NLiBQcmV2aW91c2x5LCB3ZSBhY2Nlc3NlZCBhIGNoaWxkIG5vZGVcbi8vIGRpcmVjdGx5IHZpYSBgZWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XWAuIFdoaWxlIHdlICpjb3VsZCogaW4gdGhlb3J5IGRvIGFcbi8vIGZ1bGwtZmlkZWxpdHkgc2ltdWxhdGlvbiBvZiBhIGxpdmUgYGNoaWxkTm9kZXNgIGFycmF5LCB0aGlzIGlzIHNsb3csXG4vLyBjb21wbGljYXRlZCBhbmQgZXJyb3ItcHJvbmUuXG4vL1xuLy8gXCJObyBwcm9ibGVtLFwiIHdlIHRob3VnaHQsIFwid2UnbGwganVzdCB1c2UgdGhlIHNpbWlsYXJcbi8vIGBjaGlsZE5vZGVzLml0ZW0oaW5kZXgpYCBBUEkuXCIgVGhlbiwgd2UgY291bGQganVzdCBpbXBsZW1lbnQgb3VyIG93biBgaXRlbWBcbi8vIG1ldGhvZCBpbiBzaW1wbGUtZG9tIGFuZCB3YWxrIHRoZSBjaGlsZCBub2RlIGxpbmtlZCBsaXN0IHRoZXJlLCBhbGxvd2luZ1xuLy8gdXMgdG8gcmV0YWluIHRoZSBwZXJmb3JtYW5jZSBhZHZhbnRhZ2VzIG9mIHRoZSAoc3VyZWx5IG9wdGltaXplZCkgYGl0ZW0oKWBcbi8vIEFQSSBpbiB0aGUgYnJvd3Nlci5cbi8vXG4vLyBVbmZvcnR1bmF0ZWx5LCBhbiBlbnRlcnByaXNpbmcgc291bCBuYW1lZCBTYW15IEFsemFocmFuaSBkaXNjb3ZlcmVkIHRoYXQgaW5cbi8vIElFOCwgYWNjZXNzaW5nIGFuIGl0ZW0gb3V0LW9mLWJvdW5kcyB2aWEgYGl0ZW0oKWAgY2F1c2VzIGFuIGV4Y2VwdGlvbiB3aGVyZVxuLy8gb3RoZXIgYnJvd3NlcnMgcmV0dXJuIG51bGwuIFRoaXMgbmVjZXNzaXRhdGVkIGEuLi4gY2hlY2sgb2Zcbi8vIGBjaGlsZE5vZGVzLmxlbmd0aGAsIGJyaW5naW5nIHVzIGJhY2sgYXJvdW5kIHRvIGhhdmluZyB0byBzdXBwb3J0IGFcbi8vIGZ1bGwtZmlkZWxpdHkgYGNoaWxkTm9kZXNgIGFycmF5IVxuLy9cbi8vIFdvcnN0IG9mIGFsbCwgS3JpcyBTZWxkZW4gaW52ZXN0aWdhdGVkIGhvdyBicm93c2VycyBhcmUgYWN0dWFseSBpbXBsZW1lbnRlZFxuLy8gYW5kIGRpc2NvdmVyZWQgdGhhdCB0aGV5J3JlIGFsbCBsaW5rZWQgbGlzdHMgdW5kZXIgdGhlIGhvb2QgYW55d2F5LiBBY2Nlc3Npbmdcbi8vIGBjaGlsZE5vZGVzYCByZXF1aXJlcyB0aGVtIHRvIGFsbG9jYXRlIGEgbmV3IGxpdmUgY29sbGVjdGlvbiBiYWNrZWQgYnkgdGhhdFxuLy8gbGlua2VkIGxpc3QsIHdoaWNoIGlzIGl0c2VsZiBhIHJhdGhlciBleHBlbnNpdmUgb3BlcmF0aW9uLiBPdXIgYXNzdW1lZFxuLy8gb3B0aW1pemF0aW9uIGhhZCBiYWNrZmlyZWQhIFRoYXQgaXMgdGhlIGRhbmdlciBvZiBtYWdpY2FsIHRoaW5raW5nIGFib3V0XG4vLyB0aGUgcGVyZm9ybWFuY2Ugb2YgbmF0aXZlIGltcGxlbWVudGF0aW9ucy5cbi8vXG4vLyBBbmQgdGhpcywgbXkgZnJpZW5kcywgaXMgd2h5IHRoZSBmb2xsb3dpbmcgaW1wbGVtZW50YXRpb24ganVzdCB3YWxrcyB0aGVcbi8vIGxpbmtlZCBsaXN0LCBhcyBzdXJwcmlzZWQgYXMgdGhhdCBtYXkgbWFrZSB5b3UuIFBsZWFzZSBlbnN1cmUgeW91IHVuZGVyc3RhbmRcbi8vIHRoZSBhYm92ZSBiZWZvcmUgY2hhbmdpbmcgdGhpcyBhbmQgc3VibWl0dGluZyBhIFBSLlxuLy9cbi8vIFRvbSBEYWxlLCBKYW51YXJ5IDE4dGgsIDIwMTUsIFBvcnRsYW5kIE9SXG5wcm90b3R5cGUuY2hpbGRBdEluZGV4ID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgpIHtcbiAgdmFyIG5vZGUgPSBlbGVtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgZm9yICh2YXIgaWR4ID0gMDsgbm9kZSAmJiBpZHggPCBpbmRleDsgaWR4KyspIHtcbiAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgfVxuXG4gIHJldHVybiBub2RlO1xufTtcblxucHJvdG90eXBlLmFwcGVuZFRleHQgPSBmdW5jdGlvbihlbGVtZW50LCB0ZXh0KSB7XG4gIHJldHVybiBlbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCkpO1xufTtcblxucHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWx1ZSkpO1xufTtcblxucHJvdG90eXBlLmdldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWUpIHtcbiAgcmV0dXJuIGVsZW1lbnQuZ2V0QXR0cmlidXRlKG5hbWUpO1xufTtcblxucHJvdG90eXBlLnNldEF0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWxlbWVudCwgbmFtZXNwYWNlLCBuYW1lLCB2YWx1ZSkge1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZU5TKG5hbWVzcGFjZSwgbmFtZSwgU3RyaW5nKHZhbHVlKSk7XG59O1xuXG5wcm90b3R5cGUuZ2V0QXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lc3BhY2UsIG5hbWUpIHtcbiAgcmV0dXJuIGVsZW1lbnQuZ2V0QXR0cmlidXRlTlMobmFtZXNwYWNlLCBuYW1lKTtcbn07XG5cbmlmIChjYW5SZW1vdmVTdmdWaWV3Qm94QXR0cmlidXRlKXtcbiAgcHJvdG90eXBlLnJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWUpIHtcbiAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn0gZWxzZSB7XG4gIHByb3RvdHlwZS5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lKSB7XG4gICAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PT0gJ3N2ZycgJiYgbmFtZSA9PT0gJ3ZpZXdCb3gnKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCBudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgfVxuICB9O1xufVxuXG5wcm90b3R5cGUuc2V0UHJvcGVydHlTdHJpY3QgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhbHVlID0gbnVsbDtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCAmJiAobmFtZSA9PT0gJ3ZhbHVlJyB8fCBuYW1lID09PSAndHlwZScgfHwgbmFtZSA9PT0gJ3NyYycpKSB7XG4gICAgdmFsdWUgPSAnJztcbiAgfVxuXG4gIGVsZW1lbnRbbmFtZV0gPSB2YWx1ZTtcbn07XG5cbnByb3RvdHlwZS5nZXRQcm9wZXJ0eVN0cmljdCA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWUpIHtcbiAgcmV0dXJuIGVsZW1lbnRbbmFtZV07XG59O1xuXG5wcm90b3R5cGUuc2V0UHJvcGVydHkgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lLCB2YWx1ZSwgbmFtZXNwYWNlKSB7XG4gIGlmIChlbGVtZW50Lm5hbWVzcGFjZVVSSSA9PT0gc3ZnTmFtZXNwYWNlKSB7XG4gICAgaWYgKGlzQXR0clJlbW92YWxWYWx1ZSh2YWx1ZSkpIHtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlTlMobmFtZXNwYWNlLCBuYW1lLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciB7IG5vcm1hbGl6ZWQgLCB0eXBlIH0gPSBub3JtYWxpemVQcm9wZXJ0eShlbGVtZW50LCBuYW1lKTtcbiAgICBpZiAodHlwZSA9PT0gJ3Byb3AnKSB7XG4gICAgICBlbGVtZW50W25vcm1hbGl6ZWRdID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpc0F0dHJSZW1vdmFsVmFsdWUodmFsdWUpKSB7XG4gICAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG5hbWVzcGFjZSAmJiBlbGVtZW50LnNldEF0dHJpYnV0ZU5TKSB7XG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhuYW1lc3BhY2UsIG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbmlmIChkb2MgJiYgZG9jLmNyZWF0ZUVsZW1lbnROUykge1xuICAvLyBPbmx5IG9wdCBpbnRvIG5hbWVzcGFjZSBkZXRlY3Rpb24gaWYgYSBjb250ZXh0dWFsRWxlbWVudFxuICAvLyBpcyBwYXNzZWQuXG4gIHByb3RvdHlwZS5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24odGFnTmFtZSwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgICB2YXIgbmFtZXNwYWNlID0gdGhpcy5uYW1lc3BhY2U7XG4gICAgaWYgKGNvbnRleHR1YWxFbGVtZW50KSB7XG4gICAgICBpZiAodGFnTmFtZSA9PT0gJ3N2ZycpIHtcbiAgICAgICAgbmFtZXNwYWNlID0gc3ZnTmFtZXNwYWNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZXNwYWNlID0gaW50ZXJpb3JOYW1lc3BhY2UoY29udGV4dHVhbEVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlLCB0YWdOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgICB9XG4gIH07XG4gIHByb3RvdHlwZS5zZXRBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWVzcGFjZSwgbmFtZSwgdmFsdWUpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZU5TKG5hbWVzcGFjZSwgbmFtZSwgU3RyaW5nKHZhbHVlKSk7XG4gIH07XG59IGVsc2Uge1xuICBwcm90b3R5cGUuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uKHRhZ05hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICB9O1xuICBwcm90b3R5cGUuc2V0QXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbGVtZW50LCBuYW1lc3BhY2UsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbHVlKSk7XG4gIH07XG59XG5cbnByb3RvdHlwZS5hZGRDbGFzc2VzID0gYWRkQ2xhc3NlcztcbnByb3RvdHlwZS5yZW1vdmVDbGFzc2VzID0gcmVtb3ZlQ2xhc3NlcztcblxucHJvdG90eXBlLnNldE5hbWVzcGFjZSA9IGZ1bmN0aW9uKG5zKSB7XG4gIHRoaXMubmFtZXNwYWNlID0gbnM7XG59O1xuXG5wcm90b3R5cGUuZGV0ZWN0TmFtZXNwYWNlID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICB0aGlzLm5hbWVzcGFjZSA9IGludGVyaW9yTmFtZXNwYWNlKGVsZW1lbnQpO1xufTtcblxucHJvdG90eXBlLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG59O1xuXG5wcm90b3R5cGUuY3JlYXRlVGV4dE5vZGUgPSBmdW5jdGlvbih0ZXh0KXtcbiAgcmV0dXJuIHRoaXMuZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG59O1xuXG5wcm90b3R5cGUuY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uKHRleHQpe1xuICByZXR1cm4gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KHRleHQpO1xufTtcblxucHJvdG90eXBlLnJlcGFpckNsb25lZE5vZGUgPSBmdW5jdGlvbihlbGVtZW50LCBibGFua0NoaWxkVGV4dE5vZGVzLCBpc0NoZWNrZWQpe1xuICBpZiAoZGVsZXRlc0JsYW5rVGV4dE5vZGVzICYmIGJsYW5rQ2hpbGRUZXh0Tm9kZXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAodmFyIGk9MCwgbGVuPWJsYW5rQ2hpbGRUZXh0Tm9kZXMubGVuZ3RoO2k8bGVuO2krKyl7XG4gICAgICB2YXIgdGV4dE5vZGUgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSxcbiAgICAgICAgICBvZmZzZXQgPSBibGFua0NoaWxkVGV4dE5vZGVzW2ldLFxuICAgICAgICAgIGJlZm9yZSA9IHRoaXMuY2hpbGRBdEluZGV4KGVsZW1lbnQsIG9mZnNldCk7XG4gICAgICBpZiAoYmVmb3JlKSB7XG4gICAgICAgIGVsZW1lbnQuaW5zZXJ0QmVmb3JlKHRleHROb2RlLCBiZWZvcmUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh0ZXh0Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChpZ25vcmVzQ2hlY2tlZEF0dHJpYnV0ZSAmJiBpc0NoZWNrZWQpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnY2hlY2tlZCcsICdjaGVja2VkJyk7XG4gIH1cbn07XG5cbnByb3RvdHlwZS5jbG9uZU5vZGUgPSBmdW5jdGlvbihlbGVtZW50LCBkZWVwKXtcbiAgdmFyIGNsb25lID0gZWxlbWVudC5jbG9uZU5vZGUoISFkZWVwKTtcbiAgcmV0dXJuIGNsb25lO1xufTtcblxucHJvdG90eXBlLkF0dHJNb3JwaENsYXNzID0gQXR0ck1vcnBoO1xuXG5wcm90b3R5cGUuY3JlYXRlQXR0ck1vcnBoID0gZnVuY3Rpb24oZWxlbWVudCwgYXR0ck5hbWUsIG5hbWVzcGFjZSl7XG4gIHJldHVybiBuZXcgdGhpcy5BdHRyTW9ycGhDbGFzcyhlbGVtZW50LCBhdHRyTmFtZSwgdGhpcywgbmFtZXNwYWNlKTtcbn07XG5cbnByb3RvdHlwZS5FbGVtZW50TW9ycGhDbGFzcyA9IEVsZW1lbnRNb3JwaDtcblxucHJvdG90eXBlLmNyZWF0ZUVsZW1lbnRNb3JwaCA9IGZ1bmN0aW9uKGVsZW1lbnQsIG5hbWVzcGFjZSl7XG4gIHJldHVybiBuZXcgdGhpcy5FbGVtZW50TW9ycGhDbGFzcyhlbGVtZW50LCB0aGlzLCBuYW1lc3BhY2UpO1xufTtcblxucHJvdG90eXBlLmNyZWF0ZVVuc2FmZUF0dHJNb3JwaCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGF0dHJOYW1lLCBuYW1lc3BhY2Upe1xuICB2YXIgbW9ycGggPSB0aGlzLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCBhdHRyTmFtZSwgbmFtZXNwYWNlKTtcbiAgbW9ycGguZXNjYXBlZCA9IGZhbHNlO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG5wcm90b3R5cGUuTW9ycGhDbGFzcyA9IE1vcnBoO1xuXG5wcm90b3R5cGUuY3JlYXRlTW9ycGggPSBmdW5jdGlvbihwYXJlbnQsIHN0YXJ0LCBlbmQsIGNvbnRleHR1YWxFbGVtZW50KXtcbiAgaWYgKGNvbnRleHR1YWxFbGVtZW50ICYmIGNvbnRleHR1YWxFbGVtZW50Lm5vZGVUeXBlID09PSAxMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBwYXNzIGEgZnJhZ21lbnQgYXMgdGhlIGNvbnRleHR1YWwgZWxlbWVudCB0byBjcmVhdGVNb3JwaFwiKTtcbiAgfVxuXG4gIGlmICghY29udGV4dHVhbEVsZW1lbnQgJiYgcGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSA9PT0gMSkge1xuICAgIGNvbnRleHR1YWxFbGVtZW50ID0gcGFyZW50O1xuICB9XG4gIHZhciBtb3JwaCA9IG5ldyB0aGlzLk1vcnBoQ2xhc3ModGhpcywgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5maXJzdE5vZGUgPSBzdGFydDtcbiAgbW9ycGgubGFzdE5vZGUgPSBlbmQ7XG4gIHJldHVybiBtb3JwaDtcbn07XG5cbnByb3RvdHlwZS5jcmVhdGVGcmFnbWVudE1vcnBoID0gZnVuY3Rpb24oY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgaWYgKGNvbnRleHR1YWxFbGVtZW50ICYmIGNvbnRleHR1YWxFbGVtZW50Lm5vZGVUeXBlID09PSAxMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBwYXNzIGEgZnJhZ21lbnQgYXMgdGhlIGNvbnRleHR1YWwgZWxlbWVudCB0byBjcmVhdGVNb3JwaFwiKTtcbiAgfVxuXG4gIHZhciBmcmFnbWVudCA9IHRoaXMuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICByZXR1cm4gTW9ycGguY3JlYXRlKHRoaXMsIGNvbnRleHR1YWxFbGVtZW50LCBmcmFnbWVudCk7XG59O1xuXG5wcm90b3R5cGUucmVwbGFjZUNvbnRlbnRXaXRoTW9ycGggPSBmdW5jdGlvbihlbGVtZW50KSAge1xuICB2YXIgZmlyc3RDaGlsZCA9IGVsZW1lbnQuZmlyc3RDaGlsZDtcblxuICBpZiAoIWZpcnN0Q2hpbGQpIHtcbiAgICB2YXIgY29tbWVudCA9IHRoaXMuY3JlYXRlQ29tbWVudCgnJyk7XG4gICAgdGhpcy5hcHBlbmRDaGlsZChlbGVtZW50LCBjb21tZW50KTtcbiAgICByZXR1cm4gTW9ycGguY3JlYXRlKHRoaXMsIGVsZW1lbnQsIGNvbW1lbnQpO1xuICB9IGVsc2Uge1xuICAgIHZhciBtb3JwaCA9IE1vcnBoLmF0dGFjaCh0aGlzLCBlbGVtZW50LCBmaXJzdENoaWxkLCBlbGVtZW50Lmxhc3RDaGlsZCk7XG4gICAgbW9ycGguY2xlYXIoKTtcbiAgICByZXR1cm4gbW9ycGg7XG4gIH1cbn07XG5cbnByb3RvdHlwZS5jcmVhdGVVbnNhZmVNb3JwaCA9IGZ1bmN0aW9uKHBhcmVudCwgc3RhcnQsIGVuZCwgY29udGV4dHVhbEVsZW1lbnQpe1xuICB2YXIgbW9ycGggPSB0aGlzLmNyZWF0ZU1vcnBoKHBhcmVudCwgc3RhcnQsIGVuZCwgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5wYXJzZVRleHRBc0hUTUwgPSB0cnVlO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG4vLyBUaGlzIGhlbHBlciBpcyBqdXN0IHRvIGtlZXAgdGhlIHRlbXBsYXRlcyBnb29kIGxvb2tpbmcsXG4vLyBwYXNzaW5nIGludGVnZXJzIGluc3RlYWQgb2YgZWxlbWVudCByZWZlcmVuY2VzLlxucHJvdG90eXBlLmNyZWF0ZU1vcnBoQXQgPSBmdW5jdGlvbihwYXJlbnQsIHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBjb250ZXh0dWFsRWxlbWVudCl7XG4gIHZhciBzaW5nbGUgPSBzdGFydEluZGV4ID09PSBlbmRJbmRleDtcbiAgdmFyIHN0YXJ0ID0gdGhpcy5jaGlsZEF0SW5kZXgocGFyZW50LCBzdGFydEluZGV4KTtcbiAgdmFyIGVuZCA9IHNpbmdsZSA/IHN0YXJ0IDogdGhpcy5jaGlsZEF0SW5kZXgocGFyZW50LCBlbmRJbmRleCk7XG4gIHJldHVybiB0aGlzLmNyZWF0ZU1vcnBoKHBhcmVudCwgc3RhcnQsIGVuZCwgY29udGV4dHVhbEVsZW1lbnQpO1xufTtcblxucHJvdG90eXBlLmNyZWF0ZVVuc2FmZU1vcnBoQXQgPSBmdW5jdGlvbihwYXJlbnQsIHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBjb250ZXh0dWFsRWxlbWVudCkge1xuICB2YXIgbW9ycGggPSB0aGlzLmNyZWF0ZU1vcnBoQXQocGFyZW50LCBzdGFydEluZGV4LCBlbmRJbmRleCwgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5wYXJzZVRleHRBc0hUTUwgPSB0cnVlO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG5wcm90b3R5cGUuaW5zZXJ0TW9ycGhCZWZvcmUgPSBmdW5jdGlvbihlbGVtZW50LCByZWZlcmVuY2VDaGlsZCwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdmFyIGluc2VydGlvbiA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJyk7XG4gIGVsZW1lbnQuaW5zZXJ0QmVmb3JlKGluc2VydGlvbiwgcmVmZXJlbmNlQ2hpbGQpO1xuICByZXR1cm4gdGhpcy5jcmVhdGVNb3JwaChlbGVtZW50LCBpbnNlcnRpb24sIGluc2VydGlvbiwgY29udGV4dHVhbEVsZW1lbnQpO1xufTtcblxucHJvdG90eXBlLmFwcGVuZE1vcnBoID0gZnVuY3Rpb24oZWxlbWVudCwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdmFyIGluc2VydGlvbiA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJyk7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoaW5zZXJ0aW9uKTtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlTW9ycGgoZWxlbWVudCwgaW5zZXJ0aW9uLCBpbnNlcnRpb24sIGNvbnRleHR1YWxFbGVtZW50KTtcbn07XG5cbnByb3RvdHlwZS5pbnNlcnRCb3VuZGFyeSA9IGZ1bmN0aW9uKGZyYWdtZW50LCBpbmRleCkge1xuICAvLyB0aGlzIHdpbGwgYWx3YXlzIGJlIG51bGwgb3IgZmlyc3RDaGlsZFxuICB2YXIgY2hpbGQgPSBpbmRleCA9PT0gbnVsbCA/IG51bGwgOiB0aGlzLmNoaWxkQXRJbmRleChmcmFnbWVudCwgaW5kZXgpO1xuICB0aGlzLmluc2VydEJlZm9yZShmcmFnbWVudCwgdGhpcy5jcmVhdGVUZXh0Tm9kZSgnJyksIGNoaWxkKTtcbn07XG5cbnByb3RvdHlwZS5zZXRNb3JwaEhUTUwgPSBmdW5jdGlvbihtb3JwaCwgaHRtbCkge1xuICBtb3JwaC5zZXRIVE1MKGh0bWwpO1xufTtcblxucHJvdG90eXBlLnBhcnNlSFRNTCA9IGZ1bmN0aW9uKGh0bWwsIGNvbnRleHR1YWxFbGVtZW50KSB7XG4gIHZhciBjaGlsZE5vZGVzO1xuXG4gIGlmIChpbnRlcmlvck5hbWVzcGFjZShjb250ZXh0dWFsRWxlbWVudCkgPT09IHN2Z05hbWVzcGFjZSkge1xuICAgIGNoaWxkTm9kZXMgPSBidWlsZFNWR0RPTShodG1sLCB0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbm9kZXMgPSBidWlsZEhUTUxET00oaHRtbCwgY29udGV4dHVhbEVsZW1lbnQsIHRoaXMpO1xuICAgIGlmIChkZXRlY3RPbWl0dGVkU3RhcnRUYWcoaHRtbCwgY29udGV4dHVhbEVsZW1lbnQpKSB7XG4gICAgICB2YXIgbm9kZSA9IG5vZGVzWzBdO1xuICAgICAgd2hpbGUgKG5vZGUgJiYgbm9kZS5ub2RlVHlwZSAhPT0gMSkge1xuICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgIH1cbiAgICAgIGNoaWxkTm9kZXMgPSBub2RlLmNoaWxkTm9kZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkTm9kZXMgPSBub2RlcztcbiAgICB9XG4gIH1cblxuICAvLyBDb3B5IG5vZGUgbGlzdCB0byBhIGZyYWdtZW50LlxuICB2YXIgZnJhZ21lbnQgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICBpZiAoY2hpbGROb2RlcyAmJiBjaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgY3VycmVudE5vZGUgPSBjaGlsZE5vZGVzWzBdO1xuXG4gICAgLy8gV2UgcHJlcGVuZCBhbiA8b3B0aW9uPiB0byA8c2VsZWN0PiBib3hlcyB0byBhYnNvcmIgYW55IGJyb3dzZXIgYnVnc1xuICAgIC8vIHJlbGF0ZWQgdG8gYXV0by1zZWxlY3QgYmVoYXZpb3IuIFNraXAgcGFzdCBpdC5cbiAgICBpZiAoY29udGV4dHVhbEVsZW1lbnQudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUubmV4dFNpYmxpbmc7XG4gICAgfVxuXG4gICAgd2hpbGUgKGN1cnJlbnROb2RlKSB7XG4gICAgICB2YXIgdGVtcE5vZGUgPSBjdXJyZW50Tm9kZTtcbiAgICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUubmV4dFNpYmxpbmc7XG5cbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBOb2RlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnJhZ21lbnQ7XG59O1xuXG52YXIgcGFyc2luZ05vZGU7XG5cbi8vIFVzZWQgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBVUkwgbmVlZHMgdG8gYmUgc2FuaXRpemVkLlxucHJvdG90eXBlLnByb3RvY29sRm9yVVJMID0gZnVuY3Rpb24odXJsKSB7XG4gIGlmICghcGFyc2luZ05vZGUpIHtcbiAgICBwYXJzaW5nTm9kZSA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICB9XG5cbiAgcGFyc2luZ05vZGUuaHJlZiA9IHVybDtcbiAgcmV0dXJuIHBhcnNpbmdOb2RlLnByb3RvY29sO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgRE9NSGVscGVyO1xuIl19
define('dom-helper/build-html-dom', ['exports'], function (exports) {
  /* global XMLSerializer:false */
  var svgHTMLIntegrationPoints = { foreignObject: 1, desc: 1, title: 1 };
  exports.svgHTMLIntegrationPoints = svgHTMLIntegrationPoints;
  var svgNamespace = 'http://www.w3.org/2000/svg';

  exports.svgNamespace = svgNamespace;
  var doc = typeof document === 'undefined' ? false : document;

  // Safari does not like using innerHTML on SVG HTML integration
  // points (desc/title/foreignObject).
  var needsIntegrationPointFix = doc && (function (document) {
    if (document.createElementNS === undefined) {
      return;
    }
    // In FF title will not accept innerHTML.
    var testEl = document.createElementNS(svgNamespace, 'title');
    testEl.innerHTML = "<div></div>";
    return testEl.childNodes.length === 0 || testEl.childNodes[0].nodeType !== 1;
  })(doc);

  // Internet Explorer prior to 9 does not allow setting innerHTML if the first element
  // is a "zero-scope" element. This problem can be worked around by making
  // the first node an invisible text node. We, like Modernizr, use &shy;
  var needsShy = doc && (function (document) {
    var testEl = document.createElement('div');
    testEl.innerHTML = "<div></div>";
    testEl.firstChild.innerHTML = "<script><\/script>";
    return testEl.firstChild.innerHTML === '';
  })(doc);

  // IE 8 (and likely earlier) likes to move whitespace preceeding
  // a script tag to appear after it. This means that we can
  // accidentally remove whitespace when updating a morph.
  var movesWhitespace = doc && (function (document) {
    var testEl = document.createElement('div');
    testEl.innerHTML = "Test: <script type='text/x-placeholder'><\/script>Value";
    return testEl.childNodes[0].nodeValue === 'Test:' && testEl.childNodes[2].nodeValue === ' Value';
  })(doc);

  var tagNamesRequiringInnerHTMLFix = doc && (function (document) {
    var tagNamesRequiringInnerHTMLFix;
    // IE 9 and earlier don't allow us to set innerHTML on col, colgroup, frameset,
    // html, style, table, tbody, tfoot, thead, title, tr. Detect this and add
    // them to an initial list of corrected tags.
    //
    // Here we are only dealing with the ones which can have child nodes.
    //
    var tableNeedsInnerHTMLFix;
    var tableInnerHTMLTestElement = document.createElement('table');
    try {
      tableInnerHTMLTestElement.innerHTML = '<tbody></tbody>';
    } catch (e) {} finally {
      tableNeedsInnerHTMLFix = tableInnerHTMLTestElement.childNodes.length === 0;
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
    }

    // IE 8 doesn't allow setting innerHTML on a select tag. Detect this and
    // add it to the list of corrected tags.
    //
    var selectInnerHTMLTestElement = document.createElement('select');
    selectInnerHTMLTestElement.innerHTML = '<option></option>';
    if (!selectInnerHTMLTestElement.childNodes[0]) {
      tagNamesRequiringInnerHTMLFix = tagNamesRequiringInnerHTMLFix || {};
      tagNamesRequiringInnerHTMLFix.select = [];
    }
    return tagNamesRequiringInnerHTMLFix;
  })(doc);

  function scriptSafeInnerHTML(element, html) {
    // without a leading text node, IE will drop a leading script tag.
    html = '&shy;' + html;

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

  function buildDOMWithFix(html, contextualElement) {
    var tagName = contextualElement.tagName;

    // Firefox versions < 11 do not have support for element.outerHTML.
    var outerHTML = contextualElement.outerHTML || new XMLSerializer().serializeToString(contextualElement);
    if (!outerHTML) {
      throw "Can't set innerHTML on " + tagName + " in this browser";
    }

    html = fixSelect(html, contextualElement);

    var wrappingTags = tagNamesRequiringInnerHTMLFix[tagName.toLowerCase()];

    var startTag = outerHTML.match(new RegExp("<" + tagName + "([^>]*)>", 'i'))[0];
    var endTag = '</' + tagName + '>';

    var wrappedHTML = [startTag, html, endTag];

    var i = wrappingTags.length;
    var wrappedDepth = 1 + i;
    while (i--) {
      wrappedHTML.unshift('<' + wrappingTags[i] + '>');
      wrappedHTML.push('</' + wrappingTags[i] + '>');
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
    buildDOM = function buildDOM(html, contextualElement, dom) {
      html = fixSelect(html, contextualElement);

      contextualElement = dom.cloneNode(contextualElement, false);
      scriptSafeInnerHTML(contextualElement, html);
      return contextualElement.childNodes;
    };
  } else {
    buildDOM = function buildDOM(html, contextualElement, dom) {
      html = fixSelect(html, contextualElement);

      contextualElement = dom.cloneNode(contextualElement, false);
      contextualElement.innerHTML = html;
      return contextualElement.childNodes;
    };
  }

  function fixSelect(html, contextualElement) {
    if (contextualElement.tagName === 'SELECT') {
      html = "<option></option>" + html;
    }

    return html;
  }

  var buildIESafeDOM;
  if (tagNamesRequiringInnerHTMLFix || movesWhitespace) {
    buildIESafeDOM = function buildIESafeDOM(html, contextualElement, dom) {
      // Make a list of the leading text on script nodes. Include
      // script tags without any whitespace for easier processing later.
      var spacesBefore = [];
      var spacesAfter = [];
      if (typeof html === 'string') {
        html = html.replace(/(\s*)(<script)/g, function (match, spaces, tag) {
          spacesBefore.push(spaces);
          return tag;
        });

        html = html.replace(/(<\/script>)(\s*)/g, function (match, tag, spaces) {
          spacesAfter.push(spaces);
          return tag;
        });
      }

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
      for (i = 0; i < nodes.length; i++) {
        node = nodes[i];
        if (node.nodeType !== 1) {
          continue;
        }
        if (node.tagName === 'SCRIPT') {
          scriptNodes.push(node);
        } else {
          nodeScriptNodes = node.getElementsByTagName('script');
          for (j = 0; j < nodeScriptNodes.length; j++) {
            scriptNodes.push(nodeScriptNodes[j]);
          }
        }
      }

      // Walk the script tags and put back their leading text nodes.
      var scriptNode, textNode, spaceBefore, spaceAfter;
      for (i = 0; i < scriptNodes.length; i++) {
        scriptNode = scriptNodes[i];
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
  } else {
    buildIESafeDOM = buildDOM;
  }

  var buildHTMLDOM;
  if (needsIntegrationPointFix) {
    exports.buildHTMLDOM = buildHTMLDOM = function buildHTMLDOM(html, contextualElement, dom) {
      if (svgHTMLIntegrationPoints[contextualElement.tagName]) {
        return buildIESafeDOM(html, document.createElement('div'), dom);
      } else {
        return buildIESafeDOM(html, contextualElement, dom);
      }
    };
  } else {
    exports.buildHTMLDOM = buildHTMLDOM = buildIESafeDOM;
  }

  exports.buildHTMLDOM = buildHTMLDOM;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIvYnVpbGQtaHRtbC1kb20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDTyxNQUFJLHdCQUF3QixHQUFHLEVBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQzs7QUFDckUsTUFBSSxZQUFZLEdBQUcsNEJBQTRCLENBQUM7OztBQUV2RCxNQUFJLEdBQUcsR0FBRyxPQUFPLFFBQVEsS0FBSyxXQUFXLEdBQUcsS0FBSyxHQUFHLFFBQVEsQ0FBQzs7OztBQUk3RCxNQUFJLHdCQUF3QixHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVMsUUFBUSxFQUFFO0FBQ3hELFFBQUksUUFBUSxDQUFDLGVBQWUsS0FBSyxTQUFTLEVBQUU7QUFDMUMsYUFBTztLQUNSOztBQUVELFFBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzdELFVBQU0sQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDO0FBQ2pDLFdBQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQztHQUM5RSxDQUFBLENBQUUsR0FBRyxDQUFDLENBQUM7Ozs7O0FBS1IsTUFBSSxRQUFRLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBUyxRQUFRLEVBQUU7QUFDeEMsUUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQyxVQUFNLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQztBQUNqQyxVQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztBQUNuRCxXQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxLQUFLLEVBQUUsQ0FBQztHQUMzQyxDQUFBLENBQUUsR0FBRyxDQUFDLENB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LFlBQVksR0FIbEIsWUFBWSxHQUFHLGNBQWMsQ0FBQztHQUMvQjs7VUFFTyxZQUFZLEdBQVosWUFBWSIsImZpbGUiOiJkb20taGVscGVyL2J1aWxkLWh0bWwtZG9tLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIFhNTFNlcmlhbGl6ZXI6ZmFsc2UgKi9cbmV4cG9ydCB2YXIgc3ZnSFRNTEludGVncmF0aW9uUG9pbnRzID0ge2ZvcmVpZ25PYmplY3Q6IDEsIGRlc2M6IDEsIHRpdGxlOiAxfTtcbmV4cG9ydCB2YXIgc3ZnTmFtZXNwYWNlID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJztcblxudmFyIGRvYyA9IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IGRvY3VtZW50O1xuXG4vLyBTYWZhcmkgZG9lcyBub3QgbGlrZSB1c2luZyBpbm5lckhUTUwgb24gU1ZHIEhUTUwgaW50ZWdyYXRpb25cbi8vIHBvaW50cyAoZGVzYy90aXRsZS9mb3JlaWduT2JqZWN0KS5cbnZhciBuZWVkc0ludGVncmF0aW9uUG9pbnRGaXggPSBkb2MgJiYgKGZ1bmN0aW9uKGRvY3VtZW50KSB7XG4gIGlmIChkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBJbiBGRiB0aXRsZSB3aWxsIG5vdCBhY2NlcHQgaW5uZXJIVE1MLlxuICB2YXIgdGVzdEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z05hbWVzcGFjZSwgJ3RpdGxlJyk7XG4gIHRlc3RFbC5pbm5lckhUTUwgPSBcIjxkaXY+PC9kaXY+XCI7XG4gIHJldHVybiB0ZXN0RWwuY2hpbGROb2Rlcy5sZW5ndGggPT09IDAgfHwgdGVzdEVsLmNoaWxkTm9kZXNbMF0ubm9kZVR5cGUgIT09IDE7XG59KShkb2MpO1xuXG4vLyBJbnRlcm5ldCBFeHBsb3JlciBwcmlvciB0byA5IGRvZXMgbm90IGFsbG93IHNldHRpbmcgaW5uZXJIVE1MIGlmIHRoZSBmaXJzdCBlbGVtZW50XG4vLyBpcyBhIFwiemVyby1zY29wZVwiIGVsZW1lbnQuIFRoaXMgcHJvYmxlbSBjYW4gYmUgd29ya2VkIGFyb3VuZCBieSBtYWtpbmdcbi8vIHRoZSBmaXJzdCBub2RlIGFuIGludmlzaWJsZSB0ZXh0IG5vZGUuIFdlLCBsaWtlIE1vZGVybml6ciwgdXNlICZzaHk7XG52YXIgbmVlZHNTaHkgPSBkb2MgJiYgKGZ1bmN0aW9uKGRvY3VtZW50KSB7XG4gIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdGVzdEVsLmlubmVySFRNTCA9IFwiPGRpdj48L2Rpdj5cIjtcbiAgdGVzdEVsLmZpcnN0Q2hpbGQuaW5uZXJIVE1MID0gXCI8c2NyaXB0PjxcXC9zY3JpcHQ+XCI7XG4gIHJldHVybiB0ZXN0RWwuZmlyc3RDaGlsZC5pbm5lckhUTUwgPT09ICcnO1xufSkoZG9jKTtcblxuLy8gSUUgOCAoYW5kIGxpa2VseSBlYXJsaWVyKSBsaWtlcyB0byBtb3ZlIHdoaXRlc3BhY2UgcHJlY2VlZGluZ1xuLy8gYSBzY3JpcHQgdGFnIHRvIGFwcGVhciBhZnRlciBpdC4gVGhpcyBtZWFucyB0aGF0IHdlIGNhblxuLy8gYWNjaWRlbnRhbGx5IHJlbW92ZSB3aGl0ZXNwYWNlIHdoZW4gdXBkYXRpbmcgYSBtb3JwaC5cbnZhciBtb3Zlc1doaXRlc3BhY2UgPSBkb2MgJiYgKGZ1bmN0aW9uKGRvY3VtZW50KSB7XG4gIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdGVzdEVsLmlubmVySFRNTCA9IFwiVGVzdDogPHNjcmlwdCB0eXBlPSd0ZXh0L3gtcGxhY2Vob2xkZXInPjxcXC9zY3JpcHQ+VmFsdWVcIjtcbiAgcmV0dXJuIHRlc3RFbC5jaGlsZE5vZGVzWzBdLm5vZGVWYWx1ZSA9PT0gJ1Rlc3Q6JyAmJlxuICAgICAgICAgIHRlc3RFbC5jaGlsZE5vZGVzWzJdLm5vZGVWYWx1ZSA9PT0gJyBWYWx1ZSc7XG59KShkb2MpO1xuXG52YXIgdGFnTmFtZXNSZXF1aXJpbmdJbm5lckhUTUxGaXggPSBkb2MgJiYgKGZ1bmN0aW9uKGRvY3VtZW50KSB7XG4gIHZhciB0YWdOYW1lc1JlcXVpcmluZ0lubmVySFRNTEZpeDtcbiAgLy8gSUUgOSBhbmQgZWFybGllciBkb24ndCBhbGxvdyB1cyB0byBzZXQgaW5uZXJIVE1MIG9uIGNvbCwgY29sZ3JvdXAsIGZyYW1lc2V0LFxuICAvLyBodG1sLCBzdHlsZSwgdGFibGUsIHRib2R5LCB0Zm9vdCwgdGhlYWQsIHRpdGxlLCB0ci4gRGV0ZWN0IHRoaXMgYW5kIGFkZFxuICAvLyB0aGVtIHRvIGFuIGluaXRpYWwgbGlzdCBvZiBjb3JyZWN0ZWQgdGFncy5cbiAgLy9cbiAgLy8gSGVyZSB3ZSBhcmUgb25seSBkZWFsaW5nIHdpdGggdGhlIG9uZXMgd2hpY2ggY2FuIGhhdmUgY2hpbGQgbm9kZXMuXG4gIC8vXG4gIHZhciB0YWJsZU5lZWRzSW5uZXJIVE1MRml4O1xuICB2YXIgdGFibGVJbm5lckhUTUxUZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG4gIHRyeSB7XG4gICAgdGFibGVJbm5lckhUTUxUZXN0RWxlbWVudC5pbm5lckhUTUwgPSAnPHRib2R5PjwvdGJvZHk+JztcbiAgfSBjYXRjaCAoZSkge1xuICB9IGZpbmFsbHkge1xuICAgIHRhYmxlTmVlZHNJbm5lckhUTUxGaXggPSAodGFibGVJbm5lckhUTUxUZXN0RWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMCk7XG4gIH1cbiAgaWYgKHRhYmxlTmVlZHNJbm5lckhUTUxGaXgpIHtcbiAgICB0YWdOYW1lc1JlcXVpcmluZ0lubmVySFRNTEZpeCA9IHtcbiAgICAgIGNvbGdyb3VwOiBbJ3RhYmxlJ10sXG4gICAgICB0YWJsZTogW10sXG4gICAgICB0Ym9keTogWyd0YWJsZSddLFxuICAgICAgdGZvb3Q6IFsndGFibGUnXSxcbiAgICAgIHRoZWFkOiBbJ3RhYmxlJ10sXG4gICAgICB0cjogWyd0YWJsZScsICd0Ym9keSddXG4gICAgfTtcbiAgfVxuXG4gIC8vIElFIDggZG9lc24ndCBhbGxvdyBzZXR0aW5nIGlubmVySFRNTCBvbiBhIHNlbGVjdCB0YWcuIERldGVjdCB0aGlzIGFuZFxuICAvLyBhZGQgaXQgdG8gdGhlIGxpc3Qgb2YgY29ycmVjdGVkIHRhZ3MuXG4gIC8vXG4gIHZhciBzZWxlY3RJbm5lckhUTUxUZXN0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuICBzZWxlY3RJbm5lckhUTUxUZXN0RWxlbWVudC5pbm5lckhUTUwgPSAnPG9wdGlvbj48L29wdGlvbj4nO1xuICBpZiAoIXNlbGVjdElubmVySFRNTFRlc3RFbGVtZW50LmNoaWxkTm9kZXNbMF0pIHtcbiAgICB0YWdOYW1lc1JlcXVpcmluZ0lubmVySFRNTEZpeCA9IHRhZ05hbWVzUmVxdWlyaW5nSW5uZXJIVE1MRml4IHx8IHt9O1xuICAgIHRhZ05hbWVzUmVxdWlyaW5nSW5uZXJIVE1MRml4LnNlbGVjdCA9IFtdO1xuICB9XG4gIHJldHVybiB0YWdOYW1lc1JlcXVpcmluZ0lubmVySFRNTEZpeDtcbn0pKGRvYyk7XG5cbmZ1bmN0aW9uIHNjcmlwdFNhZmVJbm5lckhUTUwoZWxlbWVudCwgaHRtbCkge1xuICAvLyB3aXRob3V0IGEgbGVhZGluZyB0ZXh0IG5vZGUsIElFIHdpbGwgZHJvcCBhIGxlYWRpbmcgc2NyaXB0IHRhZy5cbiAgaHRtbCA9ICcmc2h5OycraHRtbDtcblxuICBlbGVtZW50LmlubmVySFRNTCA9IGh0bWw7XG5cbiAgdmFyIG5vZGVzID0gZWxlbWVudC5jaGlsZE5vZGVzO1xuXG4gIC8vIExvb2sgZm9yICZzaHk7IHRvIHJlbW92ZSBpdC5cbiAgdmFyIHNoeUVsZW1lbnQgPSBub2Rlc1swXTtcbiAgd2hpbGUgKHNoeUVsZW1lbnQubm9kZVR5cGUgPT09IDEgJiYgIXNoeUVsZW1lbnQubm9kZU5hbWUpIHtcbiAgICBzaHlFbGVtZW50ID0gc2h5RWxlbWVudC5maXJzdENoaWxkO1xuICB9XG4gIC8vIEF0IHRoaXMgcG9pbnQgaXQncyB0aGUgYWN0dWFsIHVuaWNvZGUgY2hhcmFjdGVyLlxuICBpZiAoc2h5RWxlbWVudC5ub2RlVHlwZSA9PT0gMyAmJiBzaHlFbGVtZW50Lm5vZGVWYWx1ZS5jaGFyQXQoMCkgPT09IFwiXFx1MDBBRFwiKSB7XG4gICAgdmFyIG5ld1ZhbHVlID0gc2h5RWxlbWVudC5ub2RlVmFsdWUuc2xpY2UoMSk7XG4gICAgaWYgKG5ld1ZhbHVlLmxlbmd0aCkge1xuICAgICAgc2h5RWxlbWVudC5ub2RlVmFsdWUgPSBzaHlFbGVtZW50Lm5vZGVWYWx1ZS5zbGljZSgxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2h5RWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNoeUVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBub2Rlcztcbn1cblxuZnVuY3Rpb24gYnVpbGRET01XaXRoRml4KGh0bWwsIGNvbnRleHR1YWxFbGVtZW50KXtcbiAgdmFyIHRhZ05hbWUgPSBjb250ZXh0dWFsRWxlbWVudC50YWdOYW1lO1xuXG4gIC8vIEZpcmVmb3ggdmVyc2lvbnMgPCAxMSBkbyBub3QgaGF2ZSBzdXBwb3J0IGZvciBlbGVtZW50Lm91dGVySFRNTC5cbiAgdmFyIG91dGVySFRNTCA9IGNvbnRleHR1YWxFbGVtZW50Lm91dGVySFRNTCB8fCBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGNvbnRleHR1YWxFbGVtZW50KTtcbiAgaWYgKCFvdXRlckhUTUwpIHtcbiAgICB0aHJvdyBcIkNhbid0IHNldCBpbm5lckhUTUwgb24gXCIrdGFnTmFtZStcIiBpbiB0aGlzIGJyb3dzZXJcIjtcbiAgfVxuXG4gIGh0bWwgPSBmaXhTZWxlY3QoaHRtbCwgY29udGV4dHVhbEVsZW1lbnQpO1xuXG4gIHZhciB3cmFwcGluZ1RhZ3MgPSB0YWdOYW1lc1JlcXVpcmluZ0lubmVySFRNTEZpeFt0YWdOYW1lLnRvTG93ZXJDYXNlKCldO1xuXG4gIHZhciBzdGFydFRhZyA9IG91dGVySFRNTC5tYXRjaChuZXcgUmVnRXhwKFwiPFwiK3RhZ05hbWUrXCIoW14+XSopPlwiLCAnaScpKVswXTtcbiAgdmFyIGVuZFRhZyA9ICc8LycrdGFnTmFtZSsnPic7XG5cbiAgdmFyIHdyYXBwZWRIVE1MID0gW3N0YXJ0VGFnLCBodG1sLCBlbmRUYWddO1xuXG4gIHZhciBpID0gd3JhcHBpbmdUYWdzLmxlbmd0aDtcbiAgdmFyIHdyYXBwZWREZXB0aCA9IDEgKyBpO1xuICB3aGlsZShpLS0pIHtcbiAgICB3cmFwcGVkSFRNTC51bnNoaWZ0KCc8Jyt3cmFwcGluZ1RhZ3NbaV0rJz4nKTtcbiAgICB3cmFwcGVkSFRNTC5wdXNoKCc8Lycrd3JhcHBpbmdUYWdzW2ldKyc+Jyk7XG4gIH1cblxuICB2YXIgd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBzY3JpcHRTYWZlSW5uZXJIVE1MKHdyYXBwZXIsIHdyYXBwZWRIVE1MLmpvaW4oJycpKTtcbiAgdmFyIGVsZW1lbnQgPSB3cmFwcGVyO1xuICB3aGlsZSAod3JhcHBlZERlcHRoLS0pIHtcbiAgICBlbGVtZW50ID0gZWxlbWVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChlbGVtZW50ICYmIGVsZW1lbnQubm9kZVR5cGUgIT09IDEpIHtcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgIH1cbiAgfVxuICB3aGlsZSAoZWxlbWVudCAmJiBlbGVtZW50LnRhZ05hbWUgIT09IHRhZ05hbWUpIHtcbiAgICBlbGVtZW50ID0gZWxlbWVudC5uZXh0U2libGluZztcbiAgfVxuICByZXR1cm4gZWxlbWVudCA/IGVsZW1lbnQuY2hpbGROb2RlcyA6IFtdO1xufVxuXG52YXIgYnVpbGRET007XG5pZiAobmVlZHNTaHkpIHtcbiAgYnVpbGRET00gPSBmdW5jdGlvbiBidWlsZERPTShodG1sLCBjb250ZXh0dWFsRWxlbWVudCwgZG9tKXtcbiAgICBodG1sID0gZml4U2VsZWN0KGh0bWwsIGNvbnRleHR1YWxFbGVtZW50KTtcblxuICAgIGNvbnRleHR1YWxFbGVtZW50ID0gZG9tLmNsb25lTm9kZShjb250ZXh0dWFsRWxlbWVudCwgZmFsc2UpO1xuICAgIHNjcmlwdFNhZmVJbm5lckhUTUwoY29udGV4dHVhbEVsZW1lbnQsIGh0bWwpO1xuICAgIHJldHVybiBjb250ZXh0dWFsRWxlbWVudC5jaGlsZE5vZGVzO1xuICB9O1xufSBlbHNlIHtcbiAgYnVpbGRET00gPSBmdW5jdGlvbiBidWlsZERPTShodG1sLCBjb250ZXh0dWFsRWxlbWVudCwgZG9tKXtcbiAgICBodG1sID0gZml4U2VsZWN0KGh0bWwsIGNvbnRleHR1YWxFbGVtZW50KTtcblxuICAgIGNvbnRleHR1YWxFbGVtZW50ID0gZG9tLmNsb25lTm9kZShjb250ZXh0dWFsRWxlbWVudCwgZmFsc2UpO1xuICAgIGNvbnRleHR1YWxFbGVtZW50LmlubmVySFRNTCA9IGh0bWw7XG4gICAgcmV0dXJuIGNvbnRleHR1YWxFbGVtZW50LmNoaWxkTm9kZXM7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpeFNlbGVjdChodG1sLCBjb250ZXh0dWFsRWxlbWVudCkge1xuICBpZiAoY29udGV4dHVhbEVsZW1lbnQudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICBodG1sID0gXCI8b3B0aW9uPjwvb3B0aW9uPlwiICsgaHRtbDtcbiAgfVxuXG4gIHJldHVybiBodG1sO1xufVxuXG52YXIgYnVpbGRJRVNhZmVET007XG5pZiAodGFnTmFtZXNSZXF1aXJpbmdJbm5lckhUTUxGaXggfHwgbW92ZXNXaGl0ZXNwYWNlKSB7XG4gIGJ1aWxkSUVTYWZlRE9NID0gZnVuY3Rpb24gYnVpbGRJRVNhZmVET00oaHRtbCwgY29udGV4dHVhbEVsZW1lbnQsIGRvbSkge1xuICAgIC8vIE1ha2UgYSBsaXN0IG9mIHRoZSBsZWFkaW5nIHRleHQgb24gc2NyaXB0IG5vZGVzLiBJbmNsdWRlXG4gICAgLy8gc2NyaXB0IHRhZ3Mgd2l0aG91dCBhbnkgd2hpdGVzcGFjZSBmb3IgZWFzaWVyIHByb2Nlc3NpbmcgbGF0ZXIuXG4gICAgdmFyIHNwYWNlc0JlZm9yZSA9IFtdO1xuICAgIHZhciBzcGFjZXNBZnRlciA9IFtdO1xuICAgIGlmICh0eXBlb2YgaHRtbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoLyhcXHMqKSg8c2NyaXB0KS9nLCBmdW5jdGlvbihtYXRjaCwgc3BhY2VzLCB0YWcpIHtcbiAgICAgICAgc3BhY2VzQmVmb3JlLnB1c2goc3BhY2VzKTtcbiAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgIH0pO1xuXG4gICAgICBodG1sID0gaHRtbC5yZXBsYWNlKC8oPFxcL3NjcmlwdD4pKFxccyopL2csIGZ1bmN0aW9uKG1hdGNoLCB0YWcsIHNwYWNlcykge1xuICAgICAgICBzcGFjZXNBZnRlci5wdXNoKHNwYWNlcyk7XG4gICAgICAgIHJldHVybiB0YWc7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCBub2Rlc1xuICAgIHZhciBub2RlcztcbiAgICBpZiAodGFnTmFtZXNSZXF1aXJpbmdJbm5lckhUTUxGaXhbY29udGV4dHVhbEVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpXSkge1xuICAgICAgLy8gYnVpbGRET01XaXRoRml4IHVzZXMgc3RyaW5nIHdyYXBwZXJzIGZvciBwcm9ibGVtYXRpYyBpbm5lckhUTUwuXG4gICAgICBub2RlcyA9IGJ1aWxkRE9NV2l0aEZpeChodG1sLCBjb250ZXh0dWFsRWxlbWVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGVzID0gYnVpbGRET00oaHRtbCwgY29udGV4dHVhbEVsZW1lbnQsIGRvbSk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgYSBsaXN0IG9mIHNjcmlwdCB0YWdzLCB0aGUgbm9kZXMgdGhlbXNlbHZlcyB3aWxsIGJlXG4gICAgLy8gbXV0YXRlZCBhcyB3ZSBhZGQgdGVzdCBub2Rlcy5cbiAgICB2YXIgaSwgaiwgbm9kZSwgbm9kZVNjcmlwdE5vZGVzO1xuICAgIHZhciBzY3JpcHROb2RlcyA9IFtdO1xuICAgIGZvciAoaT0wO2k8bm9kZXMubGVuZ3RoO2krKykge1xuICAgICAgbm9kZT1ub2Rlc1tpXTtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlICE9PSAxKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgc2NyaXB0Tm9kZXMucHVzaChub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGVTY3JpcHROb2RlcyA9IG5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuICAgICAgICBmb3IgKGo9MDtqPG5vZGVTY3JpcHROb2Rlcy5sZW5ndGg7aisrKSB7XG4gICAgICAgICAgc2NyaXB0Tm9kZXMucHVzaChub2RlU2NyaXB0Tm9kZXNbal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2FsayB0aGUgc2NyaXB0IHRhZ3MgYW5kIHB1dCBiYWNrIHRoZWlyIGxlYWRpbmcgdGV4dCBub2Rlcy5cbiAgICB2YXIgc2NyaXB0Tm9kZSwgdGV4dE5vZGUsIHNwYWNlQmVmb3JlLCBzcGFjZUFmdGVyO1xuICAgIGZvciAoaT0wO2k8c2NyaXB0Tm9kZXMubGVuZ3RoO2krKykge1xuICAgICAgc2NyaXB0Tm9kZSA9IHNjcmlwdE5vZGVzW2ldO1xuICAgICAgc3BhY2VCZWZvcmUgPSBzcGFjZXNCZWZvcmVbaV07XG4gICAgICBpZiAoc3BhY2VCZWZvcmUgJiYgc3BhY2VCZWZvcmUubGVuZ3RoID4gMCkge1xuICAgICAgICB0ZXh0Tm9kZSA9IGRvbS5kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzcGFjZUJlZm9yZSk7XG4gICAgICAgIHNjcmlwdE5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGV4dE5vZGUsIHNjcmlwdE5vZGUpO1xuICAgICAgfVxuXG4gICAgICBzcGFjZUFmdGVyID0gc3BhY2VzQWZ0ZXJbaV07XG4gICAgICBpZiAoc3BhY2VBZnRlciAmJiBzcGFjZUFmdGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGV4dE5vZGUgPSBkb20uZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3BhY2VBZnRlcik7XG4gICAgICAgIHNjcmlwdE5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGV4dE5vZGUsIHNjcmlwdE5vZGUubmV4dFNpYmxpbmcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2RlcztcbiAgfTtcbn0gZWxzZSB7XG4gIGJ1aWxkSUVTYWZlRE9NID0gYnVpbGRET007XG59XG5cbnZhciBidWlsZEhUTUxET007XG5pZiAobmVlZHNJbnRlZ3JhdGlvblBvaW50Rml4KSB7XG4gIGJ1aWxkSFRNTERPTSA9IGZ1bmN0aW9uIGJ1aWxkSFRNTERPTShodG1sLCBjb250ZXh0dWFsRWxlbWVudCwgZG9tKXtcbiAgICBpZiAoc3ZnSFRNTEludGVncmF0aW9uUG9pbnRzW2NvbnRleHR1YWxFbGVtZW50LnRhZ05hbWVdKSB7XG4gICAgICByZXR1cm4gYnVpbGRJRVNhZmVET00oaHRtbCwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksIGRvbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWlsZElFU2FmZURPTShodG1sLCBjb250ZXh0dWFsRWxlbWVudCwgZG9tKTtcbiAgICB9XG4gIH07XG59IGVsc2Uge1xuICBidWlsZEhUTUxET00gPSBidWlsZElFU2FmZURPTTtcbn1cblxuZXhwb3J0IHtidWlsZEhUTUxET019O1xuIl19
define('dom-helper/classes', ['exports'], function (exports) {
  var doc = typeof document === 'undefined' ? false : document;

  // PhantomJS has a broken classList. See https://github.com/ariya/phantomjs/issues/12782
  var canClassList = doc && (function () {
    var d = document.createElement('div');
    if (!d.classList) {
      return false;
    }
    d.classList.add('boo');
    d.classList.add('boo', 'baz');
    return d.className === 'boo baz';
  })();

  function buildClassList(element) {
    var classString = element.getAttribute('class') || '';
    return classString !== '' && classString !== ' ' ? classString.split(' ') : [];
  }

  function intersect(containingArray, valuesArray) {
    var containingIndex = 0;
    var containingLength = containingArray.length;
    var valuesIndex = 0;
    var valuesLength = valuesArray.length;

    var intersection = new Array(valuesLength);

    // TODO: rewrite this loop in an optimal manner
    for (; containingIndex < containingLength; containingIndex++) {
      valuesIndex = 0;
      for (; valuesIndex < valuesLength; valuesIndex++) {
        if (valuesArray[valuesIndex] === containingArray[containingIndex]) {
          intersection[valuesIndex] = containingIndex;
          break;
        }
      }
    }

    return intersection;
  }

  function addClassesViaAttribute(element, classNames) {
    var existingClasses = buildClassList(element);

    var indexes = intersect(existingClasses, classNames);
    var didChange = false;

    for (var i = 0, l = classNames.length; i < l; i++) {
      if (indexes[i] === undefined) {
        didChange = true;
        existingClasses.push(classNames[i]);
      }
    }

    if (didChange) {
      element.setAttribute('class', existingClasses.length > 0 ? existingClasses.join(' ') : '');
    }
  }

  function removeClassesViaAttribute(element, classNames) {
    var existingClasses = buildClassList(element);

    var indexes = intersect(classNames, existingClasses);
    var didChange = false;
    var newClasses = [];

    for (var i = 0, l = existingClasses.length; i < l; i++) {
      if (indexes[i] === undefined) {
        newClasses.push(existingClasses[i]);
      } else {
        didChange = true;
      }
    }

    if (didChange) {
      element.setAttribute('class', newClasses.length > 0 ? newClasses.join(' ') : '');
    }
  }

  var addClasses, removeClasses;
  if (canClassList) {
    exports.addClasses = addClasses = function addClasses(element, classNames) {
      if (element.classList) {
        if (classNames.length === 1) {
          element.classList.add(classNames[0]);
        } else if (classNames.length === 2) {
          element.classList.add(classNames[0], classNames[1]);
        } else {
          element.classList.add.apply(element.classList, classNames);
        }
      } else {
        addClassesViaAttribute(element, classNames);
      }
    };
    exports.removeClasses = removeClasses = function removeClasses(element, classNames) {
      if (element.classList) {
        if (classNames.length === 1) {
          element.classList.remove(classNames[0]);
        } else if (classNames.length === 2) {
          element.classList.remove(classNames[0], classNames[1]);
        } else {
          element.classList.remove.apply(element.classList, classNames);
        }
      } else {
        removeClassesViaAttribute(element, classNames);
      }
    };
  } else {
    exports.addClasses = addClasses = addClassesViaAttribute;
    exports.removeClasses = removeClasses = removeClassesViaAttribute;
  }

  exports.addClasses = addClasses;
  exports.removeClasses = removeClasses;
});
//# sourceMappingURL=data:application/json;base64,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bHBlci9jbGFzc2VzLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGRvYyA9IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IGRvY3VtZW50O1xuXG4vLyBQaGFudG9tSlMgaGFzIGEgYnJva2VuIGNsYXNzTGlzdC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hcml5YS9waGFudG9tanMvaXNzdWVzLzEyNzgyXG52YXIgY2FuQ2xhc3NMaXN0ID0gZG9jICYmIChmdW5jdGlvbigpe1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpZiAoIWQuY2xhc3NMaXN0KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGQuY2xhc3NMaXN0LmFkZCgnYm9vJyk7XG4gIGQuY2xhc3NMaXN0LmFkZCgnYm9vJywgJ2JheicpO1xuICByZXR1cm4gKGQuY2xhc3NOYW1lID09PSAnYm9vIGJheicpO1xufSkoKTtcblxuZnVuY3Rpb24gYnVpbGRDbGFzc0xpc3QoZWxlbWVudCkge1xuICB2YXIgY2xhc3NTdHJpbmcgPSAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgfHwgJycpO1xuICByZXR1cm4gY2xhc3NTdHJpbmcgIT09ICcnICYmIGNsYXNzU3RyaW5nICE9PSAnICcgPyBjbGFzc1N0cmluZy5zcGxpdCgnICcpIDogW107XG59XG5cbmZ1bmN0aW9uIGludGVyc2VjdChjb250YWluaW5nQXJyYXksIHZhbHVlc0FycmF5KSB7XG4gIHZhciBjb250YWluaW5nSW5kZXggPSAwO1xuICB2YXIgY29udGFpbmluZ0xlbmd0aCA9IGNvbnRhaW5pbmdBcnJheS5sZW5ndGg7XG4gIHZhciB2YWx1ZXNJbmRleCA9IDA7XG4gIHZhciB2YWx1ZXNMZW5ndGggPSB2YWx1ZXNBcnJheS5sZW5ndGg7XG5cbiAgdmFyIGludGVyc2VjdGlvbiA9IG5ldyBBcnJheSh2YWx1ZXNMZW5ndGgpO1xuXG4gIC8vIFRPRE86IHJld3JpdGUgdGhpcyBsb29wIGluIGFuIG9wdGltYWwgbWFubmVyXG4gIGZvciAoO2NvbnRhaW5pbmdJbmRleDxjb250YWluaW5nTGVuZ3RoO2NvbnRhaW5pbmdJbmRleCsrKSB7XG4gICAgdmFsdWVzSW5kZXggPSAwO1xuICAgIGZvciAoO3ZhbHVlc0luZGV4PHZhbHVlc0xlbmd0aDt2YWx1ZXNJbmRleCsrKSB7XG4gICAgICBpZiAodmFsdWVzQXJyYXlbdmFsdWVzSW5kZXhdID09PSBjb250YWluaW5nQXJyYXlbY29udGFpbmluZ0luZGV4XSkge1xuICAgICAgICBpbnRlcnNlY3Rpb25bdmFsdWVzSW5kZXhdID0gY29udGFpbmluZ0luZGV4O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gaW50ZXJzZWN0aW9uO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzc2VzVmlhQXR0cmlidXRlKGVsZW1lbnQsIGNsYXNzTmFtZXMpIHtcbiAgdmFyIGV4aXN0aW5nQ2xhc3NlcyA9IGJ1aWxkQ2xhc3NMaXN0KGVsZW1lbnQpO1xuXG4gIHZhciBpbmRleGVzID0gaW50ZXJzZWN0KGV4aXN0aW5nQ2xhc3NlcywgY2xhc3NOYW1lcyk7XG4gIHZhciBkaWRDaGFuZ2UgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpPTAsIGw9Y2xhc3NOYW1lcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgaWYgKGluZGV4ZXNbaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGlkQ2hhbmdlID0gdHJ1ZTtcbiAgICAgIGV4aXN0aW5nQ2xhc3Nlcy5wdXNoKGNsYXNzTmFtZXNbaV0pO1xuICAgIH1cbiAgfVxuXG4gIGlmIChkaWRDaGFuZ2UpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBleGlzdGluZ0NsYXNzZXMubGVuZ3RoID4gMCA/IGV4aXN0aW5nQ2xhc3Nlcy5qb2luKCcgJykgOiAnJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2xhc3Nlc1ZpYUF0dHJpYnV0ZShlbGVtZW50LCBjbGFzc05hbWVzKSB7XG4gIHZhciBleGlzdGluZ0NsYXNzZXMgPSBidWlsZENsYXNzTGlzdChlbGVtZW50KTtcblxuICB2YXIgaW5kZXhlcyA9IGludGVyc2VjdChjbGFzc05hbWVzLCBleGlzdGluZ0NsYXNzZXMpO1xuICB2YXIgZGlkQ2hhbmdlID0gZmFsc2U7XG4gIHZhciBuZXdDbGFzc2VzID0gW107XG5cbiAgZm9yICh2YXIgaT0wLCBsPWV4aXN0aW5nQ2xhc3Nlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgaWYgKGluZGV4ZXNbaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgbmV3Q2xhc3Nlcy5wdXNoKGV4aXN0aW5nQ2xhc3Nlc1tpXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpZENoYW5nZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRpZENoYW5nZSkge1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdjbGFzcycsIG5ld0NsYXNzZXMubGVuZ3RoID4gMCA/IG5ld0NsYXNzZXMuam9pbignICcpIDogJycpO1xuICB9XG59XG5cbnZhciBhZGRDbGFzc2VzLCByZW1vdmVDbGFzc2VzO1xuaWYgKGNhbkNsYXNzTGlzdCkge1xuICBhZGRDbGFzc2VzID0gZnVuY3Rpb24gYWRkQ2xhc3NlcyhlbGVtZW50LCBjbGFzc05hbWVzKSB7XG4gICAgaWYgKGVsZW1lbnQuY2xhc3NMaXN0KSB7XG4gICAgICBpZiAoY2xhc3NOYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZXNbMF0pO1xuICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWVzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lc1swXSwgY2xhc3NOYW1lc1sxXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQuYXBwbHkoZWxlbWVudC5jbGFzc0xpc3QsIGNsYXNzTmFtZXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhZGRDbGFzc2VzVmlhQXR0cmlidXRlKGVsZW1lbnQsIGNsYXNzTmFtZXMpO1xuICAgIH1cbiAgfTtcbiAgcmVtb3ZlQ2xhc3NlcyA9IGZ1bmN0aW9uIHJlbW92ZUNsYXNzZXMoZWxlbWVudCwgY2xhc3NOYW1lcykge1xuICAgIGlmIChlbGVtZW50LmNsYXNzTGlzdCkge1xuICAgICAgaWYgKGNsYXNzTmFtZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWVzWzBdKTtcbiAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lcy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZXNbMF0sIGNsYXNzTmFtZXNbMV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlLmFwcGx5KGVsZW1lbnQuY2xhc3NMaXN0LCBjbGFzc05hbWVzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVtb3ZlQ2xhc3Nlc1ZpYUF0dHJpYnV0ZShlbGVtZW50LCBjbGFzc05hbWVzKTtcbiAgICB9XG4gIH07XG59IGVsc2Uge1xuICBhZGRDbGFzc2VzID0gYWRkQ2xhc3Nlc1ZpYUF0dHJpYnV0ZTtcbiAgcmVtb3ZlQ2xhc3NlcyA9IHJlbW92ZUNsYXNzZXNWaWFBdHRyaWJ1dGU7XG59XG5cbmV4cG9ydCB7XG4gIGFkZENsYXNzZXMsXG4gIHJlbW92ZUNsYXNzZXNcbn07XG4iXX0=
define('dom-helper/prop', ['exports'], function (exports) {
  exports.isAttrRemovalValue = isAttrRemovalValue;
  exports.normalizeProperty = normalizeProperty;

  function isAttrRemovalValue(value) {
    return value === null || value === undefined;
  }

  /*
   *
   * @method normalizeProperty
   * @param element {HTMLElement}
   * @param slotName {String}
   * @returns {Object} { name, type }
   */

  function normalizeProperty(element, slotName) {
    var type, normalized;

    if (slotName in element) {
      normalized = slotName;
      type = 'prop';
    } else {
      var lower = slotName.toLowerCase();
      if (lower in element) {
        type = 'prop';
        normalized = lower;
      } else {
        type = 'attr';
        normalized = slotName;
      }
    }

    if (type === 'prop' && (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))) {
      type = 'attr';
    }

    return { normalized: normalized, type: type };
  }

  // properties that MUST be set as attributes, due to:
  // * browser bug
  // * strange spec outlier
  var ATTR_OVERRIDES = {

    // phantomjs < 2.0 lets you set it as a prop but won't reflect it
    // back to the attribute. button.getAttribute('type') === null
    BUTTON: { type: true, form: true },

    INPUT: {
      // TODO: remove when IE8 is droped
      // Some versions of IE (IE8) throw an exception when setting
      // `input.list = 'somestring'`:
      // https://github.com/emberjs/ember.js/issues/10908
      // https://github.com/emberjs/ember.js/issues/11364
      list: true,
      // Some version of IE (like IE9) actually throw an exception
      // if you set input.type = 'something-unknown'
      type: true,
      form: true
    },

    // element.form is actually a legitimate readOnly property, that is to be
    // mutated, but must be mutated by setAttribute...
    SELECT: { form: true },
    OPTION: { form: true },
    TEXTAREA: { form: true },
    LABEL: { form: true },
    FIELDSET: { form: true },
    LEGEND: { form: true },
    OBJECT: { form: true }
  };

  function preferAttr(tagName, propName) {
    var tag = ATTR_OVERRIDES[tagName.toUpperCase()];
    return tag && tag[propName.toLowerCase()] || false;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIvcHJvcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQU8sV0FBUyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUU7QUFDeEMsV0FBTyxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLENBQUM7R0FDOUM7Ozs7Ozs7Ozs7QUFRTSxXQUFTLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUU7QUFDbkQsUUFBSSxJQUFJLEVBQUUsVUFBVSxDQUFDOztBQUVyQixRQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUU7QUFDdkIsZ0JBQVUsR0FBRyxRQUFRLENBQUM7QUFDdEIsVUFBSSxHQUFHLE1BQU0sQ0FBQztLQUNmLE1BQU07QUFDTCxVQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbkMsVUFBSSxLQUFLLElBQUksT0FBTyxFQUFFO0FBQ3BCLFlBQUksR0FBRyxNQUFNLENBQUM7QUFDZCxrQkFBVSxHQUFHLEtBQUssQ0FBQztPQUNwQixNQUFNO0FBQ0wsWUFBSSxHQUFHLE1BQU0sQ0FBQztBQUNkLGtCQUFVLEdBQUcsUUFBUSxDQUFDO09BQ3ZCO0tBQ0Y7O0FBRUQsUUFBSSxJQUFJLEtBQUssTUFBTSxLQUNkLFVBQVUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLElBQ3BDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBLEFBQUMsRUFBRTtBQUM3QyxVQUFJLEdBQUcsTUFBTSxDQUFDO0tBQ2Y7O0FBRUQsV0FBTyxFQUFFLFVBQVUsRUFBVixVQUFVLEVBQUUsSUFBSSxFQUFKLElBQUksRUFBRSxDQUFDO0dBQzdCOzs7OztBQUtELE1BQUksY0FBYyxHQUFHOzs7O0FBSW5CLFVBQU0sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTs7QUFFbEMsU0FBSyxFQUFFOzs7Ozs7QUFNTCxVQUFJLEVBQUUsSUFBSTs7O0FBR1YsVUFBSSxFQUFFLElBQUk7QUFDVixVQUFJLEVBQUUsSUFBSTtLQUNYOzs7O0FBSUQsVUFBTSxFQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtBQUN4QixVQUFNLEVBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ3hCLFlBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7QUFDeEIsU0FBSyxFQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtBQUN4QixZQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ3hCLFVBQU0sRUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7QUFDeEIsVUFBTSxFQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtHQUN6QixDQUFDOztBQUVGLFdBQVMsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUU7QUFDckMsUUFBSSxHQUFHLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2hELFdBQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUM7R0FDcEQiLCJmaWxlIjoiZG9tLWhlbHBlci9wcm9wLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGlzQXR0clJlbW92YWxWYWx1ZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZDtcbn1cbi8qXG4gKlxuICogQG1ldGhvZCBub3JtYWxpemVQcm9wZXJ0eVxuICogQHBhcmFtIGVsZW1lbnQge0hUTUxFbGVtZW50fVxuICogQHBhcmFtIHNsb3ROYW1lIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7T2JqZWN0fSB7IG5hbWUsIHR5cGUgfVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUHJvcGVydHkoZWxlbWVudCwgc2xvdE5hbWUpIHtcbiAgdmFyIHR5cGUsIG5vcm1hbGl6ZWQ7XG5cbiAgaWYgKHNsb3ROYW1lIGluIGVsZW1lbnQpIHtcbiAgICBub3JtYWxpemVkID0gc2xvdE5hbWU7XG4gICAgdHlwZSA9ICdwcm9wJztcbiAgfSBlbHNlIHtcbiAgICB2YXIgbG93ZXIgPSBzbG90TmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChsb3dlciBpbiBlbGVtZW50KSB7XG4gICAgICB0eXBlID0gJ3Byb3AnO1xuICAgICAgbm9ybWFsaXplZCA9IGxvd2VyO1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlID0gJ2F0dHInO1xuICAgICAgbm9ybWFsaXplZCA9IHNsb3ROYW1lO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlID09PSAncHJvcCcgJiZcbiAgICAgIChub3JtYWxpemVkLnRvTG93ZXJDYXNlKCkgPT09ICdzdHlsZScgfHxcbiAgICAgICBwcmVmZXJBdHRyKGVsZW1lbnQudGFnTmFtZSwgbm9ybWFsaXplZCkpKSB7XG4gICAgdHlwZSA9ICdhdHRyJztcbiAgfVxuXG4gIHJldHVybiB7IG5vcm1hbGl6ZWQsIHR5cGUgfTtcbn1cblxuLy8gcHJvcGVydGllcyB0aGF0IE1VU1QgYmUgc2V0IGFzIGF0dHJpYnV0ZXMsIGR1ZSB0bzpcbi8vICogYnJvd3NlciBidWdcbi8vICogc3RyYW5nZSBzcGVjIG91dGxpZXJcbnZhciBBVFRSX09WRVJSSURFUyA9IHtcblxuICAvLyBwaGFudG9tanMgPCAyLjAgbGV0cyB5b3Ugc2V0IGl0IGFzIGEgcHJvcCBidXQgd29uJ3QgcmVmbGVjdCBpdFxuICAvLyBiYWNrIHRvIHRoZSBhdHRyaWJ1dGUuIGJ1dHRvbi5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gbnVsbFxuICBCVVRUT046IHsgdHlwZTogdHJ1ZSwgZm9ybTogdHJ1ZSB9LFxuXG4gIElOUFVUOiB7XG4gICAgLy8gVE9ETzogcmVtb3ZlIHdoZW4gSUU4IGlzIGRyb3BlZFxuICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSUUgKElFOCkgdGhyb3cgYW4gZXhjZXB0aW9uIHdoZW4gc2V0dGluZ1xuICAgIC8vIGBpbnB1dC5saXN0ID0gJ3NvbWVzdHJpbmcnYDpcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZW1iZXJqcy9lbWJlci5qcy9pc3N1ZXMvMTA5MDhcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZW1iZXJqcy9lbWJlci5qcy9pc3N1ZXMvMTEzNjRcbiAgICBsaXN0OiB0cnVlLFxuICAgIC8vIFNvbWUgdmVyc2lvbiBvZiBJRSAobGlrZSBJRTkpIGFjdHVhbGx5IHRocm93IGFuIGV4Y2VwdGlvblxuICAgIC8vIGlmIHlvdSBzZXQgaW5wdXQudHlwZSA9ICdzb21ldGhpbmctdW5rbm93bidcbiAgICB0eXBlOiB0cnVlLFxuICAgIGZvcm06IHRydWVcbiAgfSxcblxuICAvLyBlbGVtZW50LmZvcm0gaXMgYWN0dWFsbHkgYSBsZWdpdGltYXRlIHJlYWRPbmx5IHByb3BlcnR5LCB0aGF0IGlzIHRvIGJlXG4gIC8vIG11dGF0ZWQsIGJ1dCBtdXN0IGJlIG11dGF0ZWQgYnkgc2V0QXR0cmlidXRlLi4uXG4gIFNFTEVDVDogICB7IGZvcm06IHRydWUgfSxcbiAgT1BUSU9OOiAgIHsgZm9ybTogdHJ1ZSB9LFxuICBURVhUQVJFQTogeyBmb3JtOiB0cnVlIH0sXG4gIExBQkVMOiAgICB7IGZvcm06IHRydWUgfSxcbiAgRklFTERTRVQ6IHsgZm9ybTogdHJ1ZSB9LFxuICBMRUdFTkQ6ICAgeyBmb3JtOiB0cnVlIH0sXG4gIE9CSkVDVDogICB7IGZvcm06IHRydWUgfVxufTtcblxuZnVuY3Rpb24gcHJlZmVyQXR0cih0YWdOYW1lLCBwcm9wTmFtZSkge1xuICB2YXIgdGFnID0gQVRUUl9PVkVSUklERVNbdGFnTmFtZS50b1VwcGVyQ2FzZSgpXTtcbiAgcmV0dXJuIHRhZyAmJiB0YWdbcHJvcE5hbWUudG9Mb3dlckNhc2UoKV0gfHwgZmFsc2U7XG59XG4iXX0=
define('htmlbars-runtime', ['exports', './htmlbars-runtime/hooks', './htmlbars-runtime/render', '../htmlbars-util/morph-utils', '../htmlbars-util/template-utils', 'htmlbars-runtime/hooks'], function (exports, _htmlbarsRuntimeHooks, _htmlbarsRuntimeRender, _htmlbarsUtilMorphUtils, _htmlbarsUtilTemplateUtils, _htmlbarsRuntimeHooks2) {

  var internal = {
    blockFor: _htmlbarsUtilTemplateUtils.blockFor,
    manualElement: _htmlbarsRuntimeRender.manualElement,
    hostBlock: _htmlbarsRuntimeHooks2.hostBlock,
    continueBlock: _htmlbarsRuntimeHooks2.continueBlock,
    hostYieldWithShadowTemplate: _htmlbarsRuntimeHooks2.hostYieldWithShadowTemplate,
    visitChildren: _htmlbarsUtilMorphUtils.visitChildren,
    validateChildMorphs: _htmlbarsUtilMorphUtils.validateChildMorphs,
    clearMorph: _htmlbarsUtilTemplateUtils.clearMorph
  };

  exports.hooks = _htmlbarsRuntimeHooks.default;
  exports.render = _htmlbarsRuntimeRender.default;
  exports.internal = internal;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFZQSxNQUFJLFFBQVEsR0FBRztBQUNiLFlBQVEsNkJBVEQsUUFBUSxBQVNHO0FBQ2xCLGlCQUFhLHlCQVpOLGFBQWEsQUFZUTtBQUM1QixhQUFTLHlCQVRULFNBQVMsQUFTVztBQUNwQixpQkFBYSx5QkFUYixhQUFhLEFBU2U7QUFDNUIsK0JBQTJCLHlCQVQzQiwyQkFBMkIsQUFTNkI7QUFDeEQsaUJBQWEsMEJBZmUsYUFBYSxBQWViO0FBQzVCLHVCQUFtQiwwQkFoQlosbUJBQW1CLEFBZ0JjO0FBQ3hDLGNBQVUsNkJBaEJPLFVBQVUsQUFnQkw7R0FDdkIsQ0FBQzs7VUFHQSxLQUFLO1VBQ0wsTUFBTTtVQUNOLFFBQVEsR0FBUixRQUFRIiwiZmlsZSI6Imh0bWxiYXJzLXJ1bnRpbWUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgaG9va3MgZnJvbSAnLi9odG1sYmFycy1ydW50aW1lL2hvb2tzJztcbmltcG9ydCByZW5kZXIgZnJvbSAnLi9odG1sYmFycy1ydW50aW1lL3JlbmRlcic7XG5pbXBvcnQgeyBtYW51YWxFbGVtZW50IH0gZnJvbSAnLi9odG1sYmFycy1ydW50aW1lL3JlbmRlcic7XG5pbXBvcnQgeyB2YWxpZGF0ZUNoaWxkTW9ycGhzLCB2aXNpdENoaWxkcmVuIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcbmltcG9ydCB7IGJsb2NrRm9yLCBjbGVhck1vcnBoIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHNcIjtcbmltcG9ydCB7XG4gIGhvc3RCbG9jayxcbiAgY29udGludWVCbG9jayxcbiAgaG9zdFlpZWxkV2l0aFNoYWRvd1RlbXBsYXRlXG59IGZyb20gJ2h0bWxiYXJzLXJ1bnRpbWUvaG9va3MnO1xuXG5cbnZhciBpbnRlcm5hbCA9IHtcbiAgYmxvY2tGb3I6IGJsb2NrRm9yLFxuICBtYW51YWxFbGVtZW50OiBtYW51YWxFbGVtZW50LFxuICBob3N0QmxvY2s6IGhvc3RCbG9jayxcbiAgY29udGludWVCbG9jazogY29udGludWVCbG9jayxcbiAgaG9zdFlpZWxkV2l0aFNoYWRvd1RlbXBsYXRlOiBob3N0WWllbGRXaXRoU2hhZG93VGVtcGxhdGUsXG4gIHZpc2l0Q2hpbGRyZW46IHZpc2l0Q2hpbGRyZW4sXG4gIHZhbGlkYXRlQ2hpbGRNb3JwaHM6IHZhbGlkYXRlQ2hpbGRNb3JwaHMsXG4gIGNsZWFyTW9ycGg6IGNsZWFyTW9ycGhcbn07XG5cbmV4cG9ydCB7XG4gIGhvb2tzLFxuICByZW5kZXIsXG4gIGludGVybmFsXG59O1xuIl19
define('htmlbars-runtime/expression-visitor', ['exports'], function (exports) {
  exports.acceptParams = acceptParams;
  exports.acceptHash = acceptHash;
  /**
    # Expression Nodes:
  
    These nodes are not directly responsible for any part of the DOM, but are
    eventually passed to a Statement Node.
  
    * get
    * subexpr
    * concat
  */

  function acceptParams(nodes, env, scope) {
    var array = [];

    for (var i = 0, l = nodes.length; i < l; i++) {
      array.push(acceptExpression(nodes[i], env, scope).value);
    }

    return array;
  }

  function acceptHash(pairs, env, scope) {
    var object = {};

    for (var i = 0, l = pairs.length; i < l; i += 2) {
      var key = pairs[i];
      var value = pairs[i + 1];
      object[key] = acceptExpression(value, env, scope).value;
    }

    return object;
  }

  function acceptExpression(node, env, scope) {
    var ret = { value: null };

    // Primitive literals are unambiguously non-array representations of
    // themselves.
    if (typeof node !== 'object' || node === null) {
      ret.value = node;
    } else {
      ret.value = evaluateNode(node, env, scope);
    }

    return ret;
  }

  function evaluateNode(node, env, scope) {
    switch (node[0]) {
      // can be used by manualElement
      case 'value':
        return node[1];
      case 'get':
        return evaluateGet(node, env, scope);
      case 'subexpr':
        return evaluateSubexpr(node, env, scope);
      case 'concat':
        return evaluateConcat(node, env, scope);
    }
  }

  function evaluateGet(node, env, scope) {
    var path = node[1];

    return env.hooks.get(env, scope, path);
  }

  function evaluateSubexpr(node, env, scope) {
    var path = node[1];
    var rawParams = node[2];
    var rawHash = node[3];

    var params = acceptParams(rawParams, env, scope);
    var hash = acceptHash(rawHash, env, scope);

    return env.hooks.subexpr(env, scope, path, params, hash);
  }

  function evaluateConcat(node, env, scope) {
    var rawParts = node[1];

    var parts = acceptParams(rawParts, env, scope);

    return env.hooks.concat(env, parts);
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvZXhwcmVzc2lvbi12aXNpdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBV08sV0FBUyxZQUFZLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDOUMsUUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVmLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUMsV0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzFEOztBQUVELFdBQU8sS0FBSyxDQUFDO0dBQ2Q7O0FBRU0sV0FBUyxVQUFVLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDNUMsUUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDOztBQUVoQixTQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLFVBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsWUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQ3pEOztBQUVELFdBQU8sTUFBTSxDQUFDO0dBQ2Y7O0FBRUQsV0FBUyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUMxQyxRQUFJLEdBQUcsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQzs7OztBQUkxQixRQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO0FBQzdDLFNBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0tBQ2xCLE1BQU07QUFDTCxTQUFHLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzVDOztBQUVELFdBQU8sR0FBRyxDQUFDO0dBQ1o7O0FBRUQsV0FBUyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDdEMsWUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDOztBQUViLFdBQUssT0FBTztBQUFJLGVBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQUEsQUFDL0IsV0FBSyxLQUFLO0FBQU0sZUFBTyxXQUFXLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUFBLEFBQ3JELFdBQUssU0FBUztBQUFFLGVBQU8sZUFBZSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFBQSxBQUN6RCxXQUFLLFFBQVE7QUFBRyxlQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQUEsS0FDekQ7R0FDRjs7QUFFRCxXQUFTLFdBQVcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRTtRQUM5QixJQUFJLEdBQUksSUFBSTs7QUFFbkIsV0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0dBQ3hDOztBQUVELFdBQVMsZUFBZSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFO1FBQ2xDLElBQUksR0FBd0IsSUFBSTtRQUExQixTQUFTLEdBQWEsSUFBSTtRQUFmLE9BQU8sR0FBSSxJQUFJOztBQUV2QyxRQUFJLE1BQU0sR0FBRyxZQUFZLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNqRCxRQUFJLElBQUksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQzs7QUFFM0MsV0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDMUQ7O0FBRUQsV0FBUyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7UUFDakMsUUFBUSxHQUFJLElBQUk7O0FBRXZCLFFBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDOztBQUUvQyxXQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztHQUNyQyIsImZpbGUiOiJodG1sYmFycy1ydW50aW1lL2V4cHJlc3Npb24tdmlzaXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICAjIEV4cHJlc3Npb24gTm9kZXM6XG5cbiAgVGhlc2Ugbm9kZXMgYXJlIG5vdCBkaXJlY3RseSByZXNwb25zaWJsZSBmb3IgYW55IHBhcnQgb2YgdGhlIERPTSwgYnV0IGFyZVxuICBldmVudHVhbGx5IHBhc3NlZCB0byBhIFN0YXRlbWVudCBOb2RlLlxuXG4gICogZ2V0XG4gICogc3ViZXhwclxuICAqIGNvbmNhdFxuKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGFjY2VwdFBhcmFtcyhub2RlcywgZW52LCBzY29wZSkge1xuICBsZXQgYXJyYXkgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGFycmF5LnB1c2goYWNjZXB0RXhwcmVzc2lvbihub2Rlc1tpXSwgZW52LCBzY29wZSkudmFsdWUpO1xuICB9XG5cbiAgcmV0dXJuIGFycmF5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWNjZXB0SGFzaChwYWlycywgZW52LCBzY29wZSkge1xuICBsZXQgb2JqZWN0ID0ge307XG5cbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwYWlycy5sZW5ndGg7IGkgPCBsOyBpICs9IDIpIHtcbiAgICBsZXQga2V5ID0gcGFpcnNbaV07XG4gICAgbGV0IHZhbHVlID0gcGFpcnNbaSsxXTtcbiAgICBvYmplY3Rba2V5XSA9IGFjY2VwdEV4cHJlc3Npb24odmFsdWUsIGVudiwgc2NvcGUpLnZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iamVjdDtcbn1cblxuZnVuY3Rpb24gYWNjZXB0RXhwcmVzc2lvbihub2RlLCBlbnYsIHNjb3BlKSB7XG4gIGxldCByZXQgPSB7IHZhbHVlOiBudWxsIH07XG5cbiAgLy8gUHJpbWl0aXZlIGxpdGVyYWxzIGFyZSB1bmFtYmlndW91c2x5IG5vbi1hcnJheSByZXByZXNlbnRhdGlvbnMgb2ZcbiAgLy8gdGhlbXNlbHZlcy5cbiAgaWYgKHR5cGVvZiBub2RlICE9PSAnb2JqZWN0JyB8fCBub2RlID09PSBudWxsKSB7XG4gICAgcmV0LnZhbHVlID0gbm9kZTtcbiAgfSBlbHNlIHtcbiAgICByZXQudmFsdWUgPSBldmFsdWF0ZU5vZGUobm9kZSwgZW52LCBzY29wZSk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBldmFsdWF0ZU5vZGUobm9kZSwgZW52LCBzY29wZSkge1xuICBzd2l0Y2ggKG5vZGVbMF0pIHtcbiAgICAvLyBjYW4gYmUgdXNlZCBieSBtYW51YWxFbGVtZW50XG4gICAgY2FzZSAndmFsdWUnOiAgIHJldHVybiBub2RlWzFdO1xuICAgIGNhc2UgJ2dldCc6ICAgICByZXR1cm4gZXZhbHVhdGVHZXQobm9kZSwgZW52LCBzY29wZSk7XG4gICAgY2FzZSAnc3ViZXhwcic6IHJldHVybiBldmFsdWF0ZVN1YmV4cHIobm9kZSwgZW52LCBzY29wZSk7XG4gICAgY2FzZSAnY29uY2F0JzogIHJldHVybiBldmFsdWF0ZUNvbmNhdChub2RlLCBlbnYsIHNjb3BlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmFsdWF0ZUdldChub2RlLCBlbnYsIHNjb3BlKSB7XG4gIGxldCBbLCBwYXRoXSA9IG5vZGU7XG5cbiAgcmV0dXJuIGVudi5ob29rcy5nZXQoZW52LCBzY29wZSwgcGF0aCk7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlU3ViZXhwcihub2RlLCBlbnYsIHNjb3BlKSB7XG4gIGxldCBbLCBwYXRoLCByYXdQYXJhbXMsIHJhd0hhc2hdID0gbm9kZTtcblxuICBsZXQgcGFyYW1zID0gYWNjZXB0UGFyYW1zKHJhd1BhcmFtcywgZW52LCBzY29wZSk7XG4gIGxldCBoYXNoID0gYWNjZXB0SGFzaChyYXdIYXNoLCBlbnYsIHNjb3BlKTtcblxuICByZXR1cm4gZW52Lmhvb2tzLnN1YmV4cHIoZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoKTtcbn1cblxuZnVuY3Rpb24gZXZhbHVhdGVDb25jYXQobm9kZSwgZW52LCBzY29wZSkge1xuICBsZXQgWywgcmF3UGFydHNdID0gbm9kZTtcblxuICBsZXQgcGFydHMgPSBhY2NlcHRQYXJhbXMocmF3UGFydHMsIGVudiwgc2NvcGUpO1xuXG4gIHJldHVybiBlbnYuaG9va3MuY29uY2F0KGVudiwgcGFydHMpO1xufVxuIl19
define("htmlbars-runtime/hooks", ["exports", "./render", "../morph-range/morph-list", "../htmlbars-util/object-utils", "../htmlbars-util/morph-utils", "../htmlbars-util/template-utils"], function (exports, _render, _morphRangeMorphList, _htmlbarsUtilObjectUtils, _htmlbarsUtilMorphUtils, _htmlbarsUtilTemplateUtils) {
  exports.wrap = wrap;
  exports.wrapForHelper = wrapForHelper;
  exports.createScope = createScope;
  exports.createFreshScope = createFreshScope;
  exports.bindShadowScope = bindShadowScope;
  exports.createChildScope = createChildScope;
  exports.bindSelf = bindSelf;
  exports.updateSelf = updateSelf;
  exports.bindLocal = bindLocal;
  exports.updateLocal = updateLocal;
  exports.bindBlock = bindBlock;
  exports.block = block;
  exports.continueBlock = continueBlock;
  exports.hostBlock = hostBlock;
  exports.handleRedirect = handleRedirect;
  exports.handleKeyword = handleKeyword;
  exports.linkRenderNode = linkRenderNode;
  exports.inline = inline;
  exports.keyword = keyword;
  exports.invokeHelper = invokeHelper;
  exports.classify = classify;
  exports.partial = partial;
  exports.range = range;
  exports.element = element;
  exports.attribute = attribute;
  exports.subexpr = subexpr;
  exports.get = get;
  exports.getRoot = getRoot;
  exports.getChild = getChild;
  exports.getValue = getValue;
  exports.getCellOrValue = getCellOrValue;
  exports.component = component;
  exports.concat = concat;
  exports.hasHelper = hasHelper;
  exports.lookupHelper = lookupHelper;
  exports.bindScope = bindScope;
  exports.updateScope = updateScope;

  /**
    HTMLBars delegates the runtime behavior of a template to
    hooks provided by the host environment. These hooks explain
    the lexical environment of a Handlebars template, the internal
    representation of references, and the interaction between an
    HTMLBars template and the DOM it is managing.
  
    While HTMLBars host hooks have access to all of this internal
    machinery, templates and helpers have access to the abstraction
    provided by the host hooks.
  
    ## The Lexical Environment
  
    The default lexical environment of an HTMLBars template includes:
  
    * Any local variables, provided by *block arguments*
    * The current value of `self`
  
    ## Simple Nesting
  
    Let's look at a simple template with a nested block:
  
    ```hbs
    <h1>{{title}}</h1>
  
    {{#if author}}
      <p class="byline">{{author}}</p>
    {{/if}}
    ```
  
    In this case, the lexical environment at the top-level of the
    template does not change inside of the `if` block. This is
    achieved via an implementation of `if` that looks like this:
  
    ```js
    registerHelper('if', function(params) {
      if (!!params[0]) {
        return this.yield();
      }
    });
    ```
  
    A call to `this.yield` invokes the child template using the
    current lexical environment.
  
    ## Block Arguments
  
    It is possible for nested blocks to introduce new local
    variables:
  
    ```hbs
    {{#count-calls as |i|}}
    <h1>{{title}}</h1>
    <p>Called {{i}} times</p>
    {{/count}}
    ```
  
    In this example, the child block inherits its surrounding
    lexical environment, but augments it with a single new
    variable binding.
  
    The implementation of `count-calls` supplies the value of
    `i`, but does not otherwise alter the environment:
  
    ```js
    var count = 0;
    registerHelper('count-calls', function() {
      return this.yield([ ++count ]);
    });
    ```
  */

  function wrap(template) {
    if (template === null) {
      return null;
    }

    return {
      meta: template.meta,
      arity: template.arity,
      raw: template,
      render: function (self, env, options, blockArguments) {
        var scope = env.hooks.createFreshScope();

        options = options || {};
        options.self = self;
        options.blockArguments = blockArguments;

        return _render.default(template, env, scope, options);
      }
    };
  }

  function wrapForHelper(template, env, scope, morph, renderState, visitor) {
    if (!template) {
      return {};
    }

    var yieldArgs = yieldTemplate(template, env, scope, morph, renderState, visitor);

    return {
      meta: template.meta,
      arity: template.arity,
      yield: yieldArgs,
      yieldItem: yieldItem(template, env, scope, morph, renderState, visitor),
      raw: template,

      render: function (self, blockArguments) {
        yieldArgs(blockArguments, self);
      }
    };
  }

  // Called by a user-land helper to render a template.
  function yieldTemplate(template, env, parentScope, morph, renderState, visitor) {
    return function (blockArguments, self) {
      // Render state is used to track the progress of the helper (since it
      // may call into us multiple times). As the user-land helper calls
      // into library code, we track what needs to be cleaned up after the
      // helper has returned.
      //
      // Here, we remember that a template has been yielded and so we do not
      // need to remove the previous template. (If no template is yielded
      // this render by the helper, we assume nothing should be shown and
      // remove any previous rendered templates.)
      renderState.morphToClear = null;

      // In this conditional is true, it means that on the previous rendering pass
      // the helper yielded multiple items via `yieldItem()`, but this time they
      // are yielding a single template. In that case, we mark the morph list for
      // cleanup so it is removed from the DOM.
      if (morph.morphList) {
        _htmlbarsUtilTemplateUtils.clearMorphList(morph.morphList, morph, env);
        renderState.morphListToClear = null;
      }

      var scope = parentScope;

      if (morph.lastYielded && isStableTemplate(template, morph.lastYielded)) {
        return morph.lastResult.revalidateWith(env, undefined, self, blockArguments, visitor);
      }

      // Check to make sure that we actually **need** a new scope, and can't
      // share the parent scope. Note that we need to move this check into
      // a host hook, because the host's notion of scope may require a new
      // scope in more cases than the ones we can determine statically.
      if (self !== undefined || parentScope === null || template.arity) {
        scope = env.hooks.createChildScope(parentScope);
      }

      morph.lastYielded = { self: self, template: template, shadowTemplate: null };

      // Render the template that was selected by the helper
      _render.default(template, env, scope, { renderNode: morph, self: self, blockArguments: blockArguments });
    };
  }

  function yieldItem(template, env, parentScope, morph, renderState, visitor) {
    // Initialize state that tracks multiple items being
    // yielded in.
    var currentMorph = null;

    // Candidate morphs for deletion.
    var candidates = {};

    // Reuse existing MorphList if this is not a first-time
    // render.
    var morphList = morph.morphList;
    if (morphList) {
      currentMorph = morphList.firstChildMorph;
    }

    // Advances the currentMorph pointer to the morph in the previously-rendered
    // list that matches the yielded key. While doing so, it marks any morphs
    // that it advances past as candidates for deletion. Assuming those morphs
    // are not yielded in later, they will be removed in the prune step during
    // cleanup.
    // Note that this helper function assumes that the morph being seeked to is
    // guaranteed to exist in the previous MorphList; if this is called and the
    // morph does not exist, it will result in an infinite loop
    function advanceToKey(key) {
      var seek = currentMorph;

      while (seek.key !== key) {
        candidates[seek.key] = seek;
        seek = seek.nextMorph;
      }

      currentMorph = seek.nextMorph;
      return seek;
    }

    return function (_key, blockArguments, self) {
      if (typeof _key !== 'string') {
        throw new Error("You must provide a string key when calling `yieldItem`; you provided " + _key);
      }

      // At least one item has been yielded, so we do not wholesale
      // clear the last MorphList but instead apply a prune operation.
      renderState.morphListToClear = null;
      morph.lastYielded = null;

      var morphList, morphMap;

      if (!morph.morphList) {
        morph.morphList = new _morphRangeMorphList.default();
        morph.morphMap = {};
        morph.setMorphList(morph.morphList);
      }

      morphList = morph.morphList;
      morphMap = morph.morphMap;

      // A map of morphs that have been yielded in on this
      // rendering pass. Any morphs that do not make it into
      // this list will be pruned from the MorphList during the cleanup
      // process.
      var handledMorphs = renderState.handledMorphs;
      var key = undefined;

      if (_key in handledMorphs) {
        // In this branch we are dealing with a duplicate key. The strategy
        // is to take the original key and append a counter to it that is
        // incremented every time the key is reused. In order to greatly
        // reduce the chance of colliding with another valid key we also add
        // an extra string "--z8mS2hvDW0A--" to the new key.
        var collisions = renderState.collisions;
        if (collisions === undefined) {
          collisions = renderState.collisions = {};
        }
        var count = collisions[_key] | 0;
        collisions[_key] = ++count;

        key = _key + '--z8mS2hvDW0A--' + count;
      } else {
        key = _key;
      }

      if (currentMorph && currentMorph.key === key) {
        yieldTemplate(template, env, parentScope, currentMorph, renderState, visitor)(blockArguments, self);
        currentMorph = currentMorph.nextMorph;
        handledMorphs[key] = currentMorph;
      } else if (morphMap[key] !== undefined) {
        var foundMorph = morphMap[key];

        if (key in candidates) {
          // If we already saw this morph, move it forward to this position
          morphList.insertBeforeMorph(foundMorph, currentMorph);
        } else {
          // Otherwise, move the pointer forward to the existing morph for this key
          advanceToKey(key);
        }

        handledMorphs[foundMorph.key] = foundMorph;
        yieldTemplate(template, env, parentScope, foundMorph, renderState, visitor)(blockArguments, self);
      } else {
        var childMorph = _render.createChildMorph(env.dom, morph);
        childMorph.key = key;
        morphMap[key] = handledMorphs[key] = childMorph;
        morphList.insertBeforeMorph(childMorph, currentMorph);
        yieldTemplate(template, env, parentScope, childMorph, renderState, visitor)(blockArguments, self);
      }

      renderState.morphListToPrune = morphList;
      morph.childNodes = null;
    };
  }

  function isStableTemplate(template, lastYielded) {
    return !lastYielded.shadowTemplate && template === lastYielded.template;
  }
  function optionsFor(template, inverse, env, scope, morph, visitor) {
    // If there was a template yielded last time, set morphToClear so it will be cleared
    // if no template is yielded on this render.
    var morphToClear = morph.lastResult ? morph : null;
    var renderState = new _htmlbarsUtilTemplateUtils.RenderState(morphToClear, morph.morphList || null);

    return {
      templates: {
        template: wrapForHelper(template, env, scope, morph, renderState, visitor),
        inverse: wrapForHelper(inverse, env, scope, morph, renderState, visitor)
      },
      renderState: renderState
    };
  }

  function thisFor(options) {
    return {
      arity: options.template.arity,
      yield: options.template.yield,
      yieldItem: options.template.yieldItem,
      yieldIn: options.template.yieldIn
    };
  }

  /**
    Host Hook: createScope
  
    @param {Scope?} parentScope
    @return Scope
  
    Corresponds to entering a new HTMLBars block.
  
    This hook is invoked when a block is entered with
    a new `self` or additional local variables.
  
    When invoked for a top-level template, the
    `parentScope` is `null`, and this hook should return
    a fresh Scope.
  
    When invoked for a child template, the `parentScope`
    is the scope for the parent environment.
  
    Note that the `Scope` is an opaque value that is
    passed to other host hooks. For example, the `get`
    hook uses the scope to retrieve a value for a given
    scope and variable name.
  */

  function createScope(env, parentScope) {
    if (parentScope) {
      return env.hooks.createChildScope(parentScope);
    } else {
      return env.hooks.createFreshScope();
    }
  }

  function createFreshScope() {
    // because `in` checks have unpredictable performance, keep a
    // separate dictionary to track whether a local was bound.
    // See `bindLocal` for more information.
    return { self: null, blocks: {}, locals: {}, localPresent: {} };
  }

  /**
    Host Hook: bindShadowScope
  
    @param {Scope?} parentScope
    @return Scope
  
    Corresponds to rendering a new template into an existing
    render tree, but with a new top-level lexical scope. This
    template is called the "shadow root".
  
    If a shadow template invokes `{{yield}}`, it will render
    the block provided to the shadow root in the original
    lexical scope.
  
    ```hbs
    {{!-- post template --}}
    <p>{{props.title}}</p>
    {{yield}}
  
    {{!-- blog template --}}
    {{#post title="Hello world"}}
      <p>by {{byline}}</p>
      <article>This is my first post</article>
    {{/post}}
  
    {{#post title="Goodbye world"}}
      <p>by {{byline}}</p>
      <article>This is my last post</article>
    {{/post}}
    ```
  
    ```js
    helpers.post = function(params, hash, options) {
      options.template.yieldIn(postTemplate, { props: hash });
    };
  
    blog.render({ byline: "Yehuda Katz" });
    ```
  
    Produces:
  
    ```html
    <p>Hello world</p>
    <p>by Yehuda Katz</p>
    <article>This is my first post</article>
  
    <p>Goodbye world</p>
    <p>by Yehuda Katz</p>
    <article>This is my last post</article>
    ```
  
    In short, `yieldIn` creates a new top-level scope for the
    provided template and renders it, making the original block
    available to `{{yield}}` in that template.
  */

  function bindShadowScope(env /*, parentScope, shadowScope */) {
    return env.hooks.createFreshScope();
  }

  function createChildScope(parent) {
    var scope = Object.create(parent);
    scope.locals = Object.create(parent.locals);
    scope.localPresent = Object.create(parent.localPresent);
    scope.blocks = Object.create(parent.blocks);
    return scope;
  }

  /**
    Host Hook: bindSelf
  
    @param {Scope} scope
    @param {any} self
  
    Corresponds to entering a template.
  
    This hook is invoked when the `self` value for a scope is ready to be bound.
  
    The host must ensure that child scopes reflect the change to the `self` in
    future calls to the `get` hook.
  */

  function bindSelf(env, scope, self) {
    scope.self = self;
  }

  function updateSelf(env, scope, self) {
    env.hooks.bindSelf(env, scope, self);
  }

  /**
    Host Hook: bindLocal
  
    @param {Environment} env
    @param {Scope} scope
    @param {String} name
    @param {any} value
  
    Corresponds to entering a template with block arguments.
  
    This hook is invoked when a local variable for a scope has been provided.
  
    The host must ensure that child scopes reflect the change in future calls
    to the `get` hook.
  */

  function bindLocal(env, scope, name, value) {
    scope.localPresent[name] = true;
    scope.locals[name] = value;
  }

  function updateLocal(env, scope, name, value) {
    env.hooks.bindLocal(env, scope, name, value);
  }

  /**
    Host Hook: bindBlock
  
    @param {Environment} env
    @param {Scope} scope
    @param {Function} block
  
    Corresponds to entering a shadow template that was invoked by a block helper with
    `yieldIn`.
  
    This hook is invoked with an opaque block that will be passed along
    to the shadow template, and inserted into the shadow template when
    `{{yield}}` is used. Optionally provide a non-default block name
    that can be targeted by `{{yield to=blockName}}`.
  */

  function bindBlock(env, scope, block) {
    var name = arguments.length <= 3 || arguments[3] === undefined ? 'default' : arguments[3];

    scope.blocks[name] = block;
  }

  /**
    Host Hook: block
  
    @param {RenderNode} renderNode
    @param {Environment} env
    @param {Scope} scope
    @param {String} path
    @param {Array} params
    @param {Object} hash
    @param {Block} block
    @param {Block} elseBlock
  
    Corresponds to:
  
    ```hbs
    {{#helper param1 param2 key1=val1 key2=val2}}
      {{!-- child template --}}
    {{/helper}}
    ```
  
    This host hook is a workhorse of the system. It is invoked
    whenever a block is encountered, and is responsible for
    resolving the helper to call, and then invoke it.
  
    The helper should be invoked with:
  
    - `{Array} params`: the parameters passed to the helper
      in the template.
    - `{Object} hash`: an object containing the keys and values passed
      in the hash position in the template.
  
    The values in `params` and `hash` will already be resolved
    through a previous call to the `get` host hook.
  
    The helper should be invoked with a `this` value that is
    an object with one field:
  
    `{Function} yield`: when invoked, this function executes the
    block with the current scope. It takes an optional array of
    block parameters. If block parameters are supplied, HTMLBars
    will invoke the `bindLocal` host hook to bind the supplied
    values to the block arguments provided by the template.
  
    In general, the default implementation of `block` should work
    for most host environments. It delegates to other host hooks
    where appropriate, and properly invokes the helper with the
    appropriate arguments.
  */

  function block(morph, env, scope, path, params, hash, template, inverse, visitor) {
    if (handleRedirect(morph, env, scope, path, params, hash, template, inverse, visitor)) {
      return;
    }

    continueBlock(morph, env, scope, path, params, hash, template, inverse, visitor);
  }

  function continueBlock(morph, env, scope, path, params, hash, template, inverse, visitor) {
    hostBlock(morph, env, scope, template, inverse, null, visitor, function (options) {
      var helper = env.hooks.lookupHelper(env, scope, path);
      return env.hooks.invokeHelper(morph, env, scope, visitor, params, hash, helper, options.templates, thisFor(options.templates));
    });
  }

  function hostBlock(morph, env, scope, template, inverse, shadowOptions, visitor, callback) {
    var options = optionsFor(template, inverse, env, scope, morph, visitor);
    _htmlbarsUtilTemplateUtils.renderAndCleanup(morph, env, options, shadowOptions, callback);
  }

  function handleRedirect(morph, env, scope, path, params, hash, template, inverse, visitor) {
    if (!path) {
      return false;
    }

    var redirect = env.hooks.classify(env, scope, path);
    if (redirect) {
      switch (redirect) {
        case 'component':
          env.hooks.component(morph, env, scope, path, params, hash, { default: template, inverse: inverse }, visitor);break;
        case 'inline':
          env.hooks.inline(morph, env, scope, path, params, hash, visitor);break;
        case 'block':
          env.hooks.block(morph, env, scope, path, params, hash, template, inverse, visitor);break;
        default:
          throw new Error("Internal HTMLBars redirection to " + redirect + " not supported");
      }
      return true;
    }

    if (handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor)) {
      return true;
    }

    return false;
  }

  function handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor) {
    var keyword = env.hooks.keywords[path];
    if (!keyword) {
      return false;
    }

    if (typeof keyword === 'function') {
      return keyword(morph, env, scope, params, hash, template, inverse, visitor);
    }

    if (keyword.willRender) {
      keyword.willRender(morph, env);
    }

    var lastState, newState;
    if (keyword.setupState) {
      lastState = _htmlbarsUtilObjectUtils.shallowCopy(morph.state);
      newState = morph.state = keyword.setupState(lastState, env, scope, params, hash);
    }

    if (keyword.childEnv) {
      // Build the child environment...
      env = keyword.childEnv(morph.state, env);

      // ..then save off the child env builder on the render node. If the render
      // node tree is re-rendered and this node is not dirty, the child env
      // builder will still be invoked so that child dirty render nodes still get
      // the correct child env.
      morph.buildChildEnv = keyword.childEnv;
    }

    var firstTime = !morph.rendered;

    if (keyword.isEmpty) {
      var isEmpty = keyword.isEmpty(morph.state, env, scope, params, hash);

      if (isEmpty) {
        if (!firstTime) {
          _htmlbarsUtilTemplateUtils.clearMorph(morph, env, false);
        }
        return true;
      }
    }

    if (firstTime) {
      if (keyword.render) {
        keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
      }
      morph.rendered = true;
      return true;
    }

    var isStable;
    if (keyword.isStable) {
      isStable = keyword.isStable(lastState, newState);
    } else {
      isStable = stableState(lastState, newState);
    }

    if (isStable) {
      if (keyword.rerender) {
        var newEnv = keyword.rerender(morph, env, scope, params, hash, template, inverse, visitor);
        env = newEnv || env;
      }
      _htmlbarsUtilMorphUtils.validateChildMorphs(env, morph, visitor);
      return true;
    } else {
      _htmlbarsUtilTemplateUtils.clearMorph(morph, env, false);
    }

    // If the node is unstable, re-render from scratch
    if (keyword.render) {
      keyword.render(morph, env, scope, params, hash, template, inverse, visitor);
      morph.rendered = true;
      return true;
    }
  }

  function stableState(oldState, newState) {
    if (_htmlbarsUtilObjectUtils.keyLength(oldState) !== _htmlbarsUtilObjectUtils.keyLength(newState)) {
      return false;
    }

    for (var prop in oldState) {
      if (oldState[prop] !== newState[prop]) {
        return false;
      }
    }

    return true;
  }

  function linkRenderNode() /* morph, env, scope, params, hash */{
    return;
  }

  /**
    Host Hook: inline
  
    @param {RenderNode} renderNode
    @param {Environment} env
    @param {Scope} scope
    @param {String} path
    @param {Array} params
    @param {Hash} hash
  
    Corresponds to:
  
    ```hbs
    {{helper param1 param2 key1=val1 key2=val2}}
    ```
  
    This host hook is similar to the `block` host hook, but it
    invokes helpers that do not supply an attached block.
  
    Like the `block` hook, the helper should be invoked with:
  
    - `{Array} params`: the parameters passed to the helper
      in the template.
    - `{Object} hash`: an object containing the keys and values passed
      in the hash position in the template.
  
    The values in `params` and `hash` will already be resolved
    through a previous call to the `get` host hook.
  
    In general, the default implementation of `inline` should work
    for most host environments. It delegates to other host hooks
    where appropriate, and properly invokes the helper with the
    appropriate arguments.
  
    The default implementation of `inline` also makes `partial`
    a keyword. Instead of invoking a helper named `partial`,
    it invokes the `partial` host hook.
  */

  function inline(morph, env, scope, path, params, hash, visitor) {
    if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
      return;
    }

    var value = undefined,
        hasValue = undefined;
    if (morph.linkedResult) {
      value = env.hooks.getValue(morph.linkedResult);
      hasValue = true;
    } else {
      var options = optionsFor(null, null, env, scope, morph);

      var helper = env.hooks.lookupHelper(env, scope, path);
      var result = env.hooks.invokeHelper(morph, env, scope, visitor, params, hash, helper, options.templates, thisFor(options.templates));

      if (result && result.link) {
        morph.linkedResult = result.value;
        _htmlbarsUtilMorphUtils.linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
      }

      if (result && 'value' in result) {
        value = env.hooks.getValue(result.value);
        hasValue = true;
      }
    }

    if (hasValue) {
      if (morph.lastValue !== value) {
        morph.setContent(value);
      }
      morph.lastValue = value;
    }
  }

  function keyword(path, morph, env, scope, params, hash, template, inverse, visitor) {
    handleKeyword(path, morph, env, scope, params, hash, template, inverse, visitor);
  }

  function invokeHelper(morph, env, scope, visitor, _params, _hash, helper, templates, context) {
    var params = normalizeArray(env, _params);
    var hash = normalizeObject(env, _hash);
    return { value: helper.call(context, params, hash, templates) };
  }

  function normalizeArray(env, array) {
    var out = new Array(array.length);

    for (var i = 0, l = array.length; i < l; i++) {
      out[i] = env.hooks.getCellOrValue(array[i]);
    }

    return out;
  }

  function normalizeObject(env, object) {
    var out = {};

    for (var prop in object) {
      out[prop] = env.hooks.getCellOrValue(object[prop]);
    }

    return out;
  }

  function classify() /* env, scope, path */{
    return null;
  }

  var keywords = {
    partial: function (morph, env, scope, params) {
      var value = env.hooks.partial(morph, env, scope, params[0]);
      morph.setContent(value);
      return true;
    },

    yield: function (morph, env, scope, params, hash, template, inverse, visitor) {
      // the current scope is provided purely for the creation of shadow
      // scopes; it should not be provided to user code.

      var to = env.hooks.getValue(hash.to) || 'default';
      if (scope.blocks[to]) {
        scope.blocks[to].invoke(env, params, hash.self, morph, scope, visitor);
      }
      return true;
    },

    hasBlock: function (morph, env, scope, params) {
      var name = env.hooks.getValue(params[0]) || 'default';
      return !!scope.blocks[name];
    },

    hasBlockParams: function (morph, env, scope, params) {
      var name = env.hooks.getValue(params[0]) || 'default';
      return !!(scope.blocks[name] && scope.blocks[name].arity);
    }

  };

  exports.keywords = keywords;
  /**
    Host Hook: partial
  
    @param {RenderNode} renderNode
    @param {Environment} env
    @param {Scope} scope
    @param {String} path
  
    Corresponds to:
  
    ```hbs
    {{partial "location"}}
    ```
  
    This host hook is invoked by the default implementation of
    the `inline` hook. This makes `partial` a keyword in an
    HTMLBars environment using the default `inline` host hook.
  
    It is implemented as a host hook so that it can retrieve
    the named partial out of the `Environment`. Helpers, in
    contrast, only have access to the values passed in to them,
    and not to the ambient lexical environment.
  
    The host hook should invoke the referenced partial with
    the ambient `self`.
  */

  function partial(renderNode, env, scope, path) {
    var template = env.partials[path];
    return template.render(scope.self, env, {}).fragment;
  }

  /**
    Host hook: range
  
    @param {RenderNode} renderNode
    @param {Environment} env
    @param {Scope} scope
    @param {any} value
  
    Corresponds to:
  
    ```hbs
    {{content}}
    {{{unescaped}}}
    ```
  
    This hook is responsible for updating a render node
    that represents a range of content with a value.
  */

  function range(morph, env, scope, path, value, visitor) {
    if (handleRedirect(morph, env, scope, path, [value], {}, null, null, visitor)) {
      return;
    }

    value = env.hooks.getValue(value);

    if (morph.lastValue !== value) {
      morph.setContent(value);
    }

    morph.lastValue = value;
  }

  /**
    Host hook: element
  
    @param {RenderNode} renderNode
    @param {Environment} env
    @param {Scope} scope
    @param {String} path
    @param {Array} params
    @param {Hash} hash
  
    Corresponds to:
  
    ```hbs
    <div {{bind-attr foo=bar}}></div>
    ```
  
    This hook is responsible for invoking a helper that
    modifies an element.
  
    Its purpose is largely legacy support for awkward
    idioms that became common when using the string-based
    Handlebars engine.
  
    Most of the uses of the `element` hook are expected
    to be superseded by component syntax and the
    `attribute` hook.
  */

  function element(morph, env, scope, path, params, hash, visitor) {
    if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
      return;
    }

    var helper = env.hooks.lookupHelper(env, scope, path);
    if (helper) {
      env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, { element: morph.element });
    }
  }

  /**
    Host hook: attribute
  
    @param {RenderNode} renderNode
    @param {Environment} env
    @param {String} name
    @param {any} value
  
    Corresponds to:
  
    ```hbs
    <div foo={{bar}}></div>
    ```
  
    This hook is responsible for updating a render node
    that represents an element's attribute with a value.
  
    It receives the name of the attribute as well as an
    already-resolved value, and should update the render
    node with the value if appropriate.
  */

  function attribute(morph, env, scope, name, value) {
    value = env.hooks.getValue(value);

    if (morph.lastValue !== value) {
      morph.setContent(value);
    }

    morph.lastValue = value;
  }

  function subexpr(env, scope, helperName, params, hash) {
    var helper = env.hooks.lookupHelper(env, scope, helperName);
    var result = env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, {});
    if (result && 'value' in result) {
      return env.hooks.getValue(result.value);
    }
  }

  /**
    Host Hook: get
  
    @param {Environment} env
    @param {Scope} scope
    @param {String} path
  
    Corresponds to:
  
    ```hbs
    {{foo.bar}}
      ^
  
    {{helper foo.bar key=value}}
             ^           ^
    ```
  
    This hook is the "leaf" hook of the system. It is used to
    resolve a path relative to the current scope.
  */

  function get(env, scope, path) {
    if (path === '') {
      return scope.self;
    }

    var keys = path.split('.');
    var value = env.hooks.getRoot(scope, keys[0])[0];

    for (var i = 1; i < keys.length; i++) {
      if (value) {
        value = env.hooks.getChild(value, keys[i]);
      } else {
        break;
      }
    }

    return value;
  }

  function getRoot(scope, key) {
    if (scope.localPresent[key]) {
      return [scope.locals[key]];
    } else if (scope.self) {
      return [scope.self[key]];
    } else {
      return [undefined];
    }
  }

  function getChild(value, key) {
    return value[key];
  }

  function getValue(reference) {
    return reference;
  }

  function getCellOrValue(reference) {
    return reference;
  }

  function component(morph, env, scope, tagName, params, attrs, templates, visitor) {
    if (env.hooks.hasHelper(env, scope, tagName)) {
      return env.hooks.block(morph, env, scope, tagName, params, attrs, templates.default, templates.inverse, visitor);
    }

    componentFallback(morph, env, scope, tagName, attrs, templates.default);
  }

  function concat(env, params) {
    var value = "";
    for (var i = 0, l = params.length; i < l; i++) {
      value += env.hooks.getValue(params[i]);
    }
    return value;
  }

  function componentFallback(morph, env, scope, tagName, attrs, template) {
    var element = env.dom.createElement(tagName);
    for (var name in attrs) {
      element.setAttribute(name, env.hooks.getValue(attrs[name]));
    }
    var fragment = _render.default(template, env, scope, {}).fragment;
    element.appendChild(fragment);
    morph.setNode(element);
  }

  function hasHelper(env, scope, helperName) {
    return env.helpers[helperName] !== undefined;
  }

  function lookupHelper(env, scope, helperName) {
    return env.helpers[helperName];
  }

  function bindScope() /* env, scope */{
    // this function is used to handle host-specified extensions to scope
    // other than `self`, `locals` and `block`.
  }

  function updateScope(env, scope) {
    env.hooks.bindScope(env, scope);
  }

  exports.default = {
    // fundamental hooks that you will likely want to override
    bindLocal: bindLocal,
    bindSelf: bindSelf,
    bindScope: bindScope,
    classify: classify,
    component: component,
    concat: concat,
    createFreshScope: createFreshScope,
    getChild: getChild,
    getRoot: getRoot,
    getValue: getValue,
    getCellOrValue: getCellOrValue,
    keywords: keywords,
    linkRenderNode: linkRenderNode,
    partial: partial,
    subexpr: subexpr,

    // fundamental hooks with good default behavior
    bindBlock: bindBlock,
    bindShadowScope: bindShadowScope,
    updateLocal: updateLocal,
    updateSelf: updateSelf,
    updateScope: updateScope,
    createChildScope: createChildScope,
    hasHelper: hasHelper,
    lookupHelper: lookupHelper,
    invokeHelper: invokeHelper,
    cleanupRenderNode: null,
    destroyRenderNode: null,
    willCleanupTree: null,
    didCleanupTree: null,
    willRenderNode: null,
    didRenderNode: null,

    // derived hooks
    attribute: attribute,
    block: block,
    createScope: createScope,
    element: element,
    get: get,
    inline: inline,
    range: range,
    keyword: keyword
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvaG9va3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBZ0ZPLFdBQVMsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUM3QixRQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7QUFBRSxhQUFPLElBQUksQ0FBQztLQUFHOztBQUV4QyxXQUFPO0FBQ0wsVUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO0FBQ25CLFdBQUssRUFBRSxRQUFRLENBQUMsS0FBSztBQUNyQixTQUFHLEVBQUUsUUFBUTtBQUNiLFlBQU0sRUFBRSxVQUFTLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRTtBQUNuRCxZQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7O0FBRXpDLGVBQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0FBQ3hCLGVBQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ3BCLGVBQU8sQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDOztBQUV4QyxlQUFPLGdCQUFPLFFBQVEsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO09BQzlDO0tBQ0YsQ0FBQztHQUNIOztBQUVNLFdBQVMsYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFO0FBQy9FLFFBQUksQ0FBQyxRQUFRLEVBQUU7QUFBRSxhQUFPLEVBQUUsQ0FBQztLQUFFOztBQUU3QixRQUFJLFNBQVMsR0FBRyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxPQUFPLENB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QUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDOUUsYUFBTztLQUNSOztBQUVELFFBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdEQsUUFBSSxNQUFNLEVBQUU7QUFDVixTQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7S0FDbEc7R0FDRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBdUJNLFdBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDeEQsU0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUVsQyxRQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO0FBQzdCLFdBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDekI7O0FBRUQsU0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7R0FDekI7O0FBRU0sV0FBUyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtBQUM1RCxRQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzVELFFBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFB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ImltcG9ydCByZW5kZXIgZnJvbSBcIi4vcmVuZGVyXCI7XG5pbXBvcnQgTW9ycGhMaXN0IGZyb20gXCIuLi9tb3JwaC1yYW5nZS9tb3JwaC1saXN0XCI7XG5pbXBvcnQgeyBjcmVhdGVDaGlsZE1vcnBoIH0gZnJvbSBcIi4vcmVuZGVyXCI7XG5pbXBvcnQgeyBrZXlMZW5ndGgsIHNoYWxsb3dDb3B5IH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzXCI7XG5pbXBvcnQgeyB2YWxpZGF0ZUNoaWxkTW9ycGhzIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcbmltcG9ydCB7IFJlbmRlclN0YXRlLCBjbGVhck1vcnBoLCBjbGVhck1vcnBoTGlzdCwgcmVuZGVyQW5kQ2xlYW51cCB9IGZyb20gXCIuLi9odG1sYmFycy11dGlsL3RlbXBsYXRlLXV0aWxzXCI7XG5pbXBvcnQgeyBsaW5rUGFyYW1zIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcblxuLyoqXG4gIEhUTUxCYXJzIGRlbGVnYXRlcyB0aGUgcnVudGltZSBiZWhhdmlvciBvZiBhIHRlbXBsYXRlIHRvXG4gIGhvb2tzIHByb3ZpZGVkIGJ5IHRoZSBob3N0IGVudmlyb25tZW50LiBUaGVzZSBob29rcyBleHBsYWluXG4gIHRoZSBsZXhpY2FsIGVudmlyb25tZW50IG9mIGEgSGFuZGxlYmFycyB0ZW1wbGF0ZSwgdGhlIGludGVybmFsXG4gIHJlcHJlc2VudGF0aW9uIG9mIHJlZmVyZW5jZXMsIGFuZCB0aGUgaW50ZXJhY3Rpb24gYmV0d2VlbiBhblxuICBIVE1MQmFycyB0ZW1wbGF0ZSBhbmQgdGhlIERPTSBpdCBpcyBtYW5hZ2luZy5cblxuICBXaGlsZSBIVE1MQmFycyBob3N0IGhvb2tzIGhhdmUgYWNjZXNzIHRvIGFsbCBvZiB0aGlzIGludGVybmFsXG4gIG1hY2hpbmVyeSwgdGVtcGxhdGVzIGFuZCBoZWxwZXJzIGhhdmUgYWNjZXNzIHRvIHRoZSBhYnN0cmFjdGlvblxuICBwcm92aWRlZCBieSB0aGUgaG9zdCBob29rcy5cblxuICAjIyBUaGUgTGV4aWNhbCBFbnZpcm9ubWVudFxuXG4gIFRoZSBkZWZhdWx0IGxleGljYWwgZW52aXJvbm1lbnQgb2YgYW4gSFRNTEJhcnMgdGVtcGxhdGUgaW5jbHVkZXM6XG5cbiAgKiBBbnkgbG9jYWwgdmFyaWFibGVzLCBwcm92aWRlZCBieSAqYmxvY2sgYXJndW1lbnRzKlxuICAqIFRoZSBjdXJyZW50IHZhbHVlIG9mIGBzZWxmYFxuXG4gICMjIFNpbXBsZSBOZXN0aW5nXG5cbiAgTGV0J3MgbG9vayBhdCBhIHNpbXBsZSB0ZW1wbGF0ZSB3aXRoIGEgbmVzdGVkIGJsb2NrOlxuXG4gIGBgYGhic1xuICA8aDE+e3t0aXRsZX19PC9oMT5cblxuICB7eyNpZiBhdXRob3J9fVxuICAgIDxwIGNsYXNzPVwiYnlsaW5lXCI+e3thdXRob3J9fTwvcD5cbiAge3svaWZ9fVxuICBgYGBcblxuICBJbiB0aGlzIGNhc2UsIHRoZSBsZXhpY2FsIGVudmlyb25tZW50IGF0IHRoZSB0b3AtbGV2ZWwgb2YgdGhlXG4gIHRlbXBsYXRlIGRvZXMgbm90IGNoYW5nZSBpbnNpZGUgb2YgdGhlIGBpZmAgYmxvY2suIFRoaXMgaXNcbiAgYWNoaWV2ZWQgdmlhIGFuIGltcGxlbWVudGF0aW9uIG9mIGBpZmAgdGhhdCBsb29rcyBsaWtlIHRoaXM6XG5cbiAgYGBganNcbiAgcmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgaWYgKCEhcGFyYW1zWzBdKSB7XG4gICAgICByZXR1cm4gdGhpcy55aWVsZCgpO1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuXG4gIEEgY2FsbCB0byBgdGhpcy55aWVsZGAgaW52b2tlcyB0aGUgY2hpbGQgdGVtcGxhdGUgdXNpbmcgdGhlXG4gIGN1cnJlbnQgbGV4aWNhbCBlbnZpcm9ubWVudC5cblxuICAjIyBCbG9jayBBcmd1bWVudHNcblxuICBJdCBpcyBwb3NzaWJsZSBmb3IgbmVzdGVkIGJsb2NrcyB0byBpbnRyb2R1Y2UgbmV3IGxvY2FsXG4gIHZhcmlhYmxlczpcblxuICBgYGBoYnNcbiAge3sjY291bnQtY2FsbHMgYXMgfGl8fX1cbiAgPGgxPnt7dGl0bGV9fTwvaDE+XG4gIDxwPkNhbGxlZCB7e2l9fSB0aW1lczwvcD5cbiAge3svY291bnR9fVxuICBgYGBcblxuICBJbiB0aGlzIGV4YW1wbGUsIHRoZSBjaGlsZCBibG9jayBpbmhlcml0cyBpdHMgc3Vycm91bmRpbmdcbiAgbGV4aWNhbCBlbnZpcm9ubWVudCwgYnV0IGF1Z21lbnRzIGl0IHdpdGggYSBzaW5nbGUgbmV3XG4gIHZhcmlhYmxlIGJpbmRpbmcuXG5cbiAgVGhlIGltcGxlbWVudGF0aW9uIG9mIGBjb3VudC1jYWxsc2Agc3VwcGxpZXMgdGhlIHZhbHVlIG9mXG4gIGBpYCwgYnV0IGRvZXMgbm90IG90aGVyd2lzZSBhbHRlciB0aGUgZW52aXJvbm1lbnQ6XG5cbiAgYGBganNcbiAgdmFyIGNvdW50ID0gMDtcbiAgcmVnaXN0ZXJIZWxwZXIoJ2NvdW50LWNhbGxzJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoWyArK2NvdW50IF0pO1xuICB9KTtcbiAgYGBgXG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gd3JhcCh0ZW1wbGF0ZSkge1xuICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHsgcmV0dXJuIG51bGw7ICB9XG5cbiAgcmV0dXJuIHtcbiAgICBtZXRhOiB0ZW1wbGF0ZS5tZXRhLFxuICAgIGFyaXR5OiB0ZW1wbGF0ZS5hcml0eSxcbiAgICByYXc6IHRlbXBsYXRlLFxuICAgIHJlbmRlcjogZnVuY3Rpb24oc2VsZiwgZW52LCBvcHRpb25zLCBibG9ja0FyZ3VtZW50cykge1xuICAgICAgdmFyIHNjb3BlID0gZW52Lmhvb2tzLmNyZWF0ZUZyZXNoU2NvcGUoKTtcblxuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICBvcHRpb25zLnNlbGYgPSBzZWxmO1xuICAgICAgb3B0aW9ucy5ibG9ja0FyZ3VtZW50cyA9IGJsb2NrQXJndW1lbnRzO1xuXG4gICAgICByZXR1cm4gcmVuZGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCBvcHRpb25zKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cmFwRm9ySGVscGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCBtb3JwaCwgcmVuZGVyU3RhdGUsIHZpc2l0b3IpIHtcbiAgaWYgKCF0ZW1wbGF0ZSkgeyByZXR1cm4ge307IH1cblxuICB2YXIgeWllbGRBcmdzID0geWllbGRUZW1wbGF0ZSh0ZW1wbGF0ZSwgZW52LCBzY29wZSwgbW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKTtcblxuICByZXR1cm4ge1xuICAgIG1ldGE6IHRlbXBsYXRlLm1ldGEsXG4gICAgYXJpdHk6IHRlbXBsYXRlLmFyaXR5LFxuICAgIHlpZWxkOiB5aWVsZEFyZ3MsXG4gICAgeWllbGRJdGVtOiB5aWVsZEl0ZW0odGVtcGxhdGUsIGVudiwgc2NvcGUsIG1vcnBoLCByZW5kZXJTdGF0ZSwgdmlzaXRvciksXG4gICAgcmF3OiB0ZW1wbGF0ZSxcblxuICAgIHJlbmRlcjogZnVuY3Rpb24oc2VsZiwgYmxvY2tBcmd1bWVudHMpIHtcbiAgICAgIHlpZWxkQXJncyhibG9ja0FyZ3VtZW50cywgc2VsZik7XG4gICAgfVxuICB9O1xufVxuXG4vLyBDYWxsZWQgYnkgYSB1c2VyLWxhbmQgaGVscGVyIHRvIHJlbmRlciBhIHRlbXBsYXRlLlxuZnVuY3Rpb24geWllbGRUZW1wbGF0ZSh0ZW1wbGF0ZSwgZW52LCBwYXJlbnRTY29wZSwgbW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbihibG9ja0FyZ3VtZW50cywgc2VsZikge1xuICAgIC8vIFJlbmRlciBzdGF0ZSBpcyB1c2VkIHRvIHRyYWNrIHRoZSBwcm9ncmVzcyBvZiB0aGUgaGVscGVyIChzaW5jZSBpdFxuICAgIC8vIG1heSBjYWxsIGludG8gdXMgbXVsdGlwbGUgdGltZXMpLiBBcyB0aGUgdXNlci1sYW5kIGhlbHBlciBjYWxsc1xuICAgIC8vIGludG8gbGlicmFyeSBjb2RlLCB3ZSB0cmFjayB3aGF0IG5lZWRzIHRvIGJlIGNsZWFuZWQgdXAgYWZ0ZXIgdGhlXG4gICAgLy8gaGVscGVyIGhhcyByZXR1cm5lZC5cbiAgICAvL1xuICAgIC8vIEhlcmUsIHdlIHJlbWVtYmVyIHRoYXQgYSB0ZW1wbGF0ZSBoYXMgYmVlbiB5aWVsZGVkIGFuZCBzbyB3ZSBkbyBub3RcbiAgICAvLyBuZWVkIHRvIHJlbW92ZSB0aGUgcHJldmlvdXMgdGVtcGxhdGUuIChJZiBubyB0ZW1wbGF0ZSBpcyB5aWVsZGVkXG4gICAgLy8gdGhpcyByZW5kZXIgYnkgdGhlIGhlbHBlciwgd2UgYXNzdW1lIG5vdGhpbmcgc2hvdWxkIGJlIHNob3duIGFuZFxuICAgIC8vIHJlbW92ZSBhbnkgcHJldmlvdXMgcmVuZGVyZWQgdGVtcGxhdGVzLilcbiAgICByZW5kZXJTdGF0ZS5tb3JwaFRvQ2xlYXIgPSBudWxsO1xuXG4gICAgLy8gSW4gdGhpcyBjb25kaXRpb25hbCBpcyB0cnVlLCBpdCBtZWFucyB0aGF0IG9uIHRoZSBwcmV2aW91cyByZW5kZXJpbmcgcGFzc1xuICAgIC8vIHRoZSBoZWxwZXIgeWllbGRlZCBtdWx0aXBsZSBpdGVtcyB2aWEgYHlpZWxkSXRlbSgpYCwgYnV0IHRoaXMgdGltZSB0aGV5XG4gICAgLy8gYXJlIHlpZWxkaW5nIGEgc2luZ2xlIHRlbXBsYXRlLiBJbiB0aGF0IGNhc2UsIHdlIG1hcmsgdGhlIG1vcnBoIGxpc3QgZm9yXG4gICAgLy8gY2xlYW51cCBzbyBpdCBpcyByZW1vdmVkIGZyb20gdGhlIERPTS5cbiAgICBpZiAobW9ycGgubW9ycGhMaXN0KSB7XG4gICAgICBjbGVhck1vcnBoTGlzdChtb3JwaC5tb3JwaExpc3QsIG1vcnBoLCBlbnYpO1xuICAgICAgcmVuZGVyU3RhdGUubW9ycGhMaXN0VG9DbGVhciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHNjb3BlID0gcGFyZW50U2NvcGU7XG5cbiAgICBpZiAobW9ycGgubGFzdFlpZWxkZWQgJiYgaXNTdGFibGVUZW1wbGF0ZSh0ZW1wbGF0ZSwgbW9ycGgubGFzdFlpZWxkZWQpKSB7XG4gICAgICByZXR1cm4gbW9ycGgubGFzdFJlc3VsdC5yZXZhbGlkYXRlV2l0aChlbnYsIHVuZGVmaW5lZCwgc2VsZiwgYmxvY2tBcmd1bWVudHMsIHZpc2l0b3IpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHdlIGFjdHVhbGx5ICoqbmVlZCoqIGEgbmV3IHNjb3BlLCBhbmQgY2FuJ3RcbiAgICAvLyBzaGFyZSB0aGUgcGFyZW50IHNjb3BlLiBOb3RlIHRoYXQgd2UgbmVlZCB0byBtb3ZlIHRoaXMgY2hlY2sgaW50b1xuICAgIC8vIGEgaG9zdCBob29rLCBiZWNhdXNlIHRoZSBob3N0J3Mgbm90aW9uIG9mIHNjb3BlIG1heSByZXF1aXJlIGEgbmV3XG4gICAgLy8gc2NvcGUgaW4gbW9yZSBjYXNlcyB0aGFuIHRoZSBvbmVzIHdlIGNhbiBkZXRlcm1pbmUgc3RhdGljYWxseS5cbiAgICBpZiAoc2VsZiAhPT0gdW5kZWZpbmVkIHx8IHBhcmVudFNjb3BlID09PSBudWxsIHx8IHRlbXBsYXRlLmFyaXR5KSB7XG4gICAgICBzY29wZSA9IGVudi5ob29rcy5jcmVhdGVDaGlsZFNjb3BlKHBhcmVudFNjb3BlKTtcbiAgICB9XG5cbiAgICBtb3JwaC5sYXN0WWllbGRlZCA9IHsgc2VsZjogc2VsZiwgdGVtcGxhdGU6IHRlbXBsYXRlLCBzaGFkb3dUZW1wbGF0ZTogbnVsbCB9O1xuXG4gICAgLy8gUmVuZGVyIHRoZSB0ZW1wbGF0ZSB0aGF0IHdhcyBzZWxlY3RlZCBieSB0aGUgaGVscGVyXG4gICAgcmVuZGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCB7IHJlbmRlck5vZGU6IG1vcnBoLCBzZWxmOiBzZWxmLCBibG9ja0FyZ3VtZW50czogYmxvY2tBcmd1bWVudHMgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHlpZWxkSXRlbSh0ZW1wbGF0ZSwgZW52LCBwYXJlbnRTY29wZSwgbW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKSB7XG4gIC8vIEluaXRpYWxpemUgc3RhdGUgdGhhdCB0cmFja3MgbXVsdGlwbGUgaXRlbXMgYmVpbmdcbiAgLy8geWllbGRlZCBpbi5cbiAgdmFyIGN1cnJlbnRNb3JwaCA9IG51bGw7XG5cbiAgLy8gQ2FuZGlkYXRlIG1vcnBocyBmb3IgZGVsZXRpb24uXG4gIHZhciBjYW5kaWRhdGVzID0ge307XG5cbiAgLy8gUmV1c2UgZXhpc3RpbmcgTW9ycGhMaXN0IGlmIHRoaXMgaXMgbm90IGEgZmlyc3QtdGltZVxuICAvLyByZW5kZXIuXG4gIHZhciBtb3JwaExpc3QgPSBtb3JwaC5tb3JwaExpc3Q7XG4gIGlmIChtb3JwaExpc3QpIHtcbiAgICBjdXJyZW50TW9ycGggPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuICB9XG5cbiAgLy8gQWR2YW5jZXMgdGhlIGN1cnJlbnRNb3JwaCBwb2ludGVyIHRvIHRoZSBtb3JwaCBpbiB0aGUgcHJldmlvdXNseS1yZW5kZXJlZFxuICAvLyBsaXN0IHRoYXQgbWF0Y2hlcyB0aGUgeWllbGRlZCBrZXkuIFdoaWxlIGRvaW5nIHNvLCBpdCBtYXJrcyBhbnkgbW9ycGhzXG4gIC8vIHRoYXQgaXQgYWR2YW5jZXMgcGFzdCBhcyBjYW5kaWRhdGVzIGZvciBkZWxldGlvbi4gQXNzdW1pbmcgdGhvc2UgbW9ycGhzXG4gIC8vIGFyZSBub3QgeWllbGRlZCBpbiBsYXRlciwgdGhleSB3aWxsIGJlIHJlbW92ZWQgaW4gdGhlIHBydW5lIHN0ZXAgZHVyaW5nXG4gIC8vIGNsZWFudXAuXG4gIC8vIE5vdGUgdGhhdCB0aGlzIGhlbHBlciBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgdGhlIG1vcnBoIGJlaW5nIHNlZWtlZCB0byBpc1xuICAvLyBndWFyYW50ZWVkIHRvIGV4aXN0IGluIHRoZSBwcmV2aW91cyBNb3JwaExpc3Q7IGlmIHRoaXMgaXMgY2FsbGVkIGFuZCB0aGVcbiAgLy8gbW9ycGggZG9lcyBub3QgZXhpc3QsIGl0IHdpbGwgcmVzdWx0IGluIGFuIGluZmluaXRlIGxvb3BcbiAgZnVuY3Rpb24gYWR2YW5jZVRvS2V5KGtleSkge1xuICAgIGxldCBzZWVrID0gY3VycmVudE1vcnBoO1xuXG4gICAgd2hpbGUgKHNlZWsua2V5ICE9PSBrZXkpIHtcbiAgICAgIGNhbmRpZGF0ZXNbc2Vlay5rZXldID0gc2VlaztcbiAgICAgIHNlZWsgPSBzZWVrLm5leHRNb3JwaDtcbiAgICB9XG5cbiAgICBjdXJyZW50TW9ycGggPSBzZWVrLm5leHRNb3JwaDtcbiAgICByZXR1cm4gc2VlaztcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihfa2V5LCBibG9ja0FyZ3VtZW50cywgc2VsZikge1xuICAgIGlmICh0eXBlb2YgX2tleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IHByb3ZpZGUgYSBzdHJpbmcga2V5IHdoZW4gY2FsbGluZyBgeWllbGRJdGVtYDsgeW91IHByb3ZpZGVkIFwiICsgX2tleSk7XG4gICAgfVxuXG4gICAgLy8gQXQgbGVhc3Qgb25lIGl0ZW0gaGFzIGJlZW4geWllbGRlZCwgc28gd2UgZG8gbm90IHdob2xlc2FsZVxuICAgIC8vIGNsZWFyIHRoZSBsYXN0IE1vcnBoTGlzdCBidXQgaW5zdGVhZCBhcHBseSBhIHBydW5lIG9wZXJhdGlvbi5cbiAgICByZW5kZXJTdGF0ZS5tb3JwaExpc3RUb0NsZWFyID0gbnVsbDtcbiAgICBtb3JwaC5sYXN0WWllbGRlZCA9IG51bGw7XG5cbiAgICB2YXIgbW9ycGhMaXN0LCBtb3JwaE1hcDtcblxuICAgIGlmICghbW9ycGgubW9ycGhMaXN0KSB7XG4gICAgICBtb3JwaC5tb3JwaExpc3QgPSBuZXcgTW9ycGhMaXN0KCk7XG4gICAgICBtb3JwaC5tb3JwaE1hcCA9IHt9O1xuICAgICAgbW9ycGguc2V0TW9ycGhMaXN0KG1vcnBoLm1vcnBoTGlzdCk7XG4gICAgfVxuXG4gICAgbW9ycGhMaXN0ID0gbW9ycGgubW9ycGhMaXN0O1xuICAgIG1vcnBoTWFwID0gbW9ycGgubW9ycGhNYXA7XG5cbiAgICAvLyBBIG1hcCBvZiBtb3JwaHMgdGhhdCBoYXZlIGJlZW4geWllbGRlZCBpbiBvbiB0aGlzXG4gICAgLy8gcmVuZGVyaW5nIHBhc3MuIEFueSBtb3JwaHMgdGhhdCBkbyBub3QgbWFrZSBpdCBpbnRvXG4gICAgLy8gdGhpcyBsaXN0IHdpbGwgYmUgcHJ1bmVkIGZyb20gdGhlIE1vcnBoTGlzdCBkdXJpbmcgdGhlIGNsZWFudXBcbiAgICAvLyBwcm9jZXNzLlxuICAgIGxldCBoYW5kbGVkTW9ycGhzID0gcmVuZGVyU3RhdGUuaGFuZGxlZE1vcnBocztcbiAgICBsZXQga2V5O1xuXG4gICAgaWYgKF9rZXkgaW4gaGFuZGxlZE1vcnBocykge1xuICAgICAgLy8gSW4gdGhpcyBicmFuY2ggd2UgYXJlIGRlYWxpbmcgd2l0aCBhIGR1cGxpY2F0ZSBrZXkuIFRoZSBzdHJhdGVneVxuICAgICAgLy8gaXMgdG8gdGFrZSB0aGUgb3JpZ2luYWwga2V5IGFuZCBhcHBlbmQgYSBjb3VudGVyIHRvIGl0IHRoYXQgaXNcbiAgICAgIC8vIGluY3JlbWVudGVkIGV2ZXJ5IHRpbWUgdGhlIGtleSBpcyByZXVzZWQuIEluIG9yZGVyIHRvIGdyZWF0bHlcbiAgICAgIC8vIHJlZHVjZSB0aGUgY2hhbmNlIG9mIGNvbGxpZGluZyB3aXRoIGFub3RoZXIgdmFsaWQga2V5IHdlIGFsc28gYWRkXG4gICAgICAvLyBhbiBleHRyYSBzdHJpbmcgXCItLXo4bVMyaHZEVzBBLS1cIiB0byB0aGUgbmV3IGtleS5cbiAgICAgIGxldCBjb2xsaXNpb25zID0gcmVuZGVyU3RhdGUuY29sbGlzaW9ucztcbiAgICAgIGlmIChjb2xsaXNpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29sbGlzaW9ucyA9IHJlbmRlclN0YXRlLmNvbGxpc2lvbnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGxldCBjb3VudCA9IGNvbGxpc2lvbnNbX2tleV0gfCAwO1xuICAgICAgY29sbGlzaW9uc1tfa2V5XSA9ICsrY291bnQ7XG5cbiAgICAgIGtleSA9IF9rZXkgKyAnLS16OG1TMmh2RFcwQS0tJyArIGNvdW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXkgPSBfa2V5O1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50TW9ycGggJiYgY3VycmVudE1vcnBoLmtleSA9PT0ga2V5KSB7XG4gICAgICB5aWVsZFRlbXBsYXRlKHRlbXBsYXRlLCBlbnYsIHBhcmVudFNjb3BlLCBjdXJyZW50TW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKShibG9ja0FyZ3VtZW50cywgc2VsZik7XG4gICAgICBjdXJyZW50TW9ycGggPSBjdXJyZW50TW9ycGgubmV4dE1vcnBoO1xuICAgICAgaGFuZGxlZE1vcnBoc1trZXldID0gY3VycmVudE1vcnBoO1xuICAgIH0gZWxzZSBpZiAobW9ycGhNYXBba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBsZXQgZm91bmRNb3JwaCA9IG1vcnBoTWFwW2tleV07XG5cbiAgICAgIGlmIChrZXkgaW4gY2FuZGlkYXRlcykge1xuICAgICAgICAvLyBJZiB3ZSBhbHJlYWR5IHNhdyB0aGlzIG1vcnBoLCBtb3ZlIGl0IGZvcndhcmQgdG8gdGhpcyBwb3NpdGlvblxuICAgICAgICBtb3JwaExpc3QuaW5zZXJ0QmVmb3JlTW9ycGgoZm91bmRNb3JwaCwgY3VycmVudE1vcnBoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgbW92ZSB0aGUgcG9pbnRlciBmb3J3YXJkIHRvIHRoZSBleGlzdGluZyBtb3JwaCBmb3IgdGhpcyBrZXlcbiAgICAgICAgYWR2YW5jZVRvS2V5KGtleSk7XG4gICAgICB9XG5cbiAgICAgIGhhbmRsZWRNb3JwaHNbZm91bmRNb3JwaC5rZXldID0gZm91bmRNb3JwaDtcbiAgICAgIHlpZWxkVGVtcGxhdGUodGVtcGxhdGUsIGVudiwgcGFyZW50U2NvcGUsIGZvdW5kTW9ycGgsIHJlbmRlclN0YXRlLCB2aXNpdG9yKShibG9ja0FyZ3VtZW50cywgc2VsZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjaGlsZE1vcnBoID0gY3JlYXRlQ2hpbGRNb3JwaChlbnYuZG9tLCBtb3JwaCk7XG4gICAgICBjaGlsZE1vcnBoLmtleSA9IGtleTtcbiAgICAgIG1vcnBoTWFwW2tleV0gPSBoYW5kbGVkTW9ycGhzW2tleV0gPSBjaGlsZE1vcnBoO1xuICAgICAgbW9ycGhMaXN0Lmluc2VydEJlZm9yZU1vcnBoKGNoaWxkTW9ycGgsIGN1cnJlbnRNb3JwaCk7XG4gICAgICB5aWVsZFRlbXBsYXRlKHRlbXBsYXRlLCBlbnYsIHBhcmVudFNjb3BlLCBjaGlsZE1vcnBoLCByZW5kZXJTdGF0ZSwgdmlzaXRvcikoYmxvY2tBcmd1bWVudHMsIHNlbGYpO1xuICAgIH1cblxuICAgIHJlbmRlclN0YXRlLm1vcnBoTGlzdFRvUHJ1bmUgPSBtb3JwaExpc3Q7XG4gICAgbW9ycGguY2hpbGROb2RlcyA9IG51bGw7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzU3RhYmxlVGVtcGxhdGUodGVtcGxhdGUsIGxhc3RZaWVsZGVkKSB7XG4gIHJldHVybiAhbGFzdFlpZWxkZWQuc2hhZG93VGVtcGxhdGUgJiYgdGVtcGxhdGUgPT09IGxhc3RZaWVsZGVkLnRlbXBsYXRlO1xufVxuZnVuY3Rpb24gb3B0aW9uc0Zvcih0ZW1wbGF0ZSwgaW52ZXJzZSwgZW52LCBzY29wZSwgbW9ycGgsIHZpc2l0b3IpIHtcbiAgLy8gSWYgdGhlcmUgd2FzIGEgdGVtcGxhdGUgeWllbGRlZCBsYXN0IHRpbWUsIHNldCBtb3JwaFRvQ2xlYXIgc28gaXQgd2lsbCBiZSBjbGVhcmVkXG4gIC8vIGlmIG5vIHRlbXBsYXRlIGlzIHlpZWxkZWQgb24gdGhpcyByZW5kZXIuXG4gIHZhciBtb3JwaFRvQ2xlYXIgPSBtb3JwaC5sYXN0UmVzdWx0ID8gbW9ycGggOiBudWxsO1xuICB2YXIgcmVuZGVyU3RhdGUgPSBuZXcgUmVuZGVyU3RhdGUobW9ycGhUb0NsZWFyLCBtb3JwaC5tb3JwaExpc3QgfHwgbnVsbCk7XG5cbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgIHRlbXBsYXRlOiB3cmFwRm9ySGVscGVyKHRlbXBsYXRlLCBlbnYsIHNjb3BlLCBtb3JwaCwgcmVuZGVyU3RhdGUsIHZpc2l0b3IpLFxuICAgICAgaW52ZXJzZTogd3JhcEZvckhlbHBlcihpbnZlcnNlLCBlbnYsIHNjb3BlLCBtb3JwaCwgcmVuZGVyU3RhdGUsIHZpc2l0b3IpXG4gICAgfSxcbiAgICByZW5kZXJTdGF0ZTogcmVuZGVyU3RhdGVcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGhpc0ZvcihvcHRpb25zKSB7XG4gIHJldHVybiB7XG4gICAgYXJpdHk6IG9wdGlvbnMudGVtcGxhdGUuYXJpdHksXG4gICAgeWllbGQ6IG9wdGlvbnMudGVtcGxhdGUueWllbGQsXG4gICAgeWllbGRJdGVtOiBvcHRpb25zLnRlbXBsYXRlLnlpZWxkSXRlbSxcbiAgICB5aWVsZEluOiBvcHRpb25zLnRlbXBsYXRlLnlpZWxkSW5cbiAgfTtcbn1cblxuLyoqXG4gIEhvc3QgSG9vazogY3JlYXRlU2NvcGVcblxuICBAcGFyYW0ge1Njb3BlP30gcGFyZW50U2NvcGVcbiAgQHJldHVybiBTY29wZVxuXG4gIENvcnJlc3BvbmRzIHRvIGVudGVyaW5nIGEgbmV3IEhUTUxCYXJzIGJsb2NrLlxuXG4gIFRoaXMgaG9vayBpcyBpbnZva2VkIHdoZW4gYSBibG9jayBpcyBlbnRlcmVkIHdpdGhcbiAgYSBuZXcgYHNlbGZgIG9yIGFkZGl0aW9uYWwgbG9jYWwgdmFyaWFibGVzLlxuXG4gIFdoZW4gaW52b2tlZCBmb3IgYSB0b3AtbGV2ZWwgdGVtcGxhdGUsIHRoZVxuICBgcGFyZW50U2NvcGVgIGlzIGBudWxsYCwgYW5kIHRoaXMgaG9vayBzaG91bGQgcmV0dXJuXG4gIGEgZnJlc2ggU2NvcGUuXG5cbiAgV2hlbiBpbnZva2VkIGZvciBhIGNoaWxkIHRlbXBsYXRlLCB0aGUgYHBhcmVudFNjb3BlYFxuICBpcyB0aGUgc2NvcGUgZm9yIHRoZSBwYXJlbnQgZW52aXJvbm1lbnQuXG5cbiAgTm90ZSB0aGF0IHRoZSBgU2NvcGVgIGlzIGFuIG9wYXF1ZSB2YWx1ZSB0aGF0IGlzXG4gIHBhc3NlZCB0byBvdGhlciBob3N0IGhvb2tzLiBGb3IgZXhhbXBsZSwgdGhlIGBnZXRgXG4gIGhvb2sgdXNlcyB0aGUgc2NvcGUgdG8gcmV0cmlldmUgYSB2YWx1ZSBmb3IgYSBnaXZlblxuICBzY29wZSBhbmQgdmFyaWFibGUgbmFtZS5cbiovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2NvcGUoZW52LCBwYXJlbnRTY29wZSkge1xuICBpZiAocGFyZW50U2NvcGUpIHtcbiAgICByZXR1cm4gZW52Lmhvb2tzLmNyZWF0ZUNoaWxkU2NvcGUocGFyZW50U2NvcGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBlbnYuaG9va3MuY3JlYXRlRnJlc2hTY29wZSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGcmVzaFNjb3BlKCkge1xuICAvLyBiZWNhdXNlIGBpbmAgY2hlY2tzIGhhdmUgdW5wcmVkaWN0YWJsZSBwZXJmb3JtYW5jZSwga2VlcCBhXG4gIC8vIHNlcGFyYXRlIGRpY3Rpb25hcnkgdG8gdHJhY2sgd2hldGhlciBhIGxvY2FsIHdhcyBib3VuZC5cbiAgLy8gU2VlIGBiaW5kTG9jYWxgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICByZXR1cm4geyBzZWxmOiBudWxsLCBibG9ja3M6IHt9LCBsb2NhbHM6IHt9LCBsb2NhbFByZXNlbnQ6IHt9IH07XG59XG5cbi8qKlxuICBIb3N0IEhvb2s6IGJpbmRTaGFkb3dTY29wZVxuXG4gIEBwYXJhbSB7U2NvcGU/fSBwYXJlbnRTY29wZVxuICBAcmV0dXJuIFNjb3BlXG5cbiAgQ29ycmVzcG9uZHMgdG8gcmVuZGVyaW5nIGEgbmV3IHRlbXBsYXRlIGludG8gYW4gZXhpc3RpbmdcbiAgcmVuZGVyIHRyZWUsIGJ1dCB3aXRoIGEgbmV3IHRvcC1sZXZlbCBsZXhpY2FsIHNjb3BlLiBUaGlzXG4gIHRlbXBsYXRlIGlzIGNhbGxlZCB0aGUgXCJzaGFkb3cgcm9vdFwiLlxuXG4gIElmIGEgc2hhZG93IHRlbXBsYXRlIGludm9rZXMgYHt7eWllbGR9fWAsIGl0IHdpbGwgcmVuZGVyXG4gIHRoZSBibG9jayBwcm92aWRlZCB0byB0aGUgc2hhZG93IHJvb3QgaW4gdGhlIG9yaWdpbmFsXG4gIGxleGljYWwgc2NvcGUuXG5cbiAgYGBgaGJzXG4gIHt7IS0tIHBvc3QgdGVtcGxhdGUgLS19fVxuICA8cD57e3Byb3BzLnRpdGxlfX08L3A+XG4gIHt7eWllbGR9fVxuXG4gIHt7IS0tIGJsb2cgdGVtcGxhdGUgLS19fVxuICB7eyNwb3N0IHRpdGxlPVwiSGVsbG8gd29ybGRcIn19XG4gICAgPHA+Ynkge3tieWxpbmV9fTwvcD5cbiAgICA8YXJ0aWNsZT5UaGlzIGlzIG15IGZpcnN0IHBvc3Q8L2FydGljbGU+XG4gIHt7L3Bvc3R9fVxuXG4gIHt7I3Bvc3QgdGl0bGU9XCJHb29kYnllIHdvcmxkXCJ9fVxuICAgIDxwPmJ5IHt7YnlsaW5lfX08L3A+XG4gICAgPGFydGljbGU+VGhpcyBpcyBteSBsYXN0IHBvc3Q8L2FydGljbGU+XG4gIHt7L3Bvc3R9fVxuICBgYGBcblxuICBgYGBqc1xuICBoZWxwZXJzLnBvc3QgPSBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zLnRlbXBsYXRlLnlpZWxkSW4ocG9zdFRlbXBsYXRlLCB7IHByb3BzOiBoYXNoIH0pO1xuICB9O1xuXG4gIGJsb2cucmVuZGVyKHsgYnlsaW5lOiBcIlllaHVkYSBLYXR6XCIgfSk7XG4gIGBgYFxuXG4gIFByb2R1Y2VzOlxuXG4gIGBgYGh0bWxcbiAgPHA+SGVsbG8gd29ybGQ8L3A+XG4gIDxwPmJ5IFllaHVkYSBLYXR6PC9wPlxuICA8YXJ0aWNsZT5UaGlzIGlzIG15IGZpcnN0IHBvc3Q8L2FydGljbGU+XG5cbiAgPHA+R29vZGJ5ZSB3b3JsZDwvcD5cbiAgPHA+YnkgWWVodWRhIEthdHo8L3A+XG4gIDxhcnRpY2xlPlRoaXMgaXMgbXkgbGFzdCBwb3N0PC9hcnRpY2xlPlxuICBgYGBcblxuICBJbiBzaG9ydCwgYHlpZWxkSW5gIGNyZWF0ZXMgYSBuZXcgdG9wLWxldmVsIHNjb3BlIGZvciB0aGVcbiAgcHJvdmlkZWQgdGVtcGxhdGUgYW5kIHJlbmRlcnMgaXQsIG1ha2luZyB0aGUgb3JpZ2luYWwgYmxvY2tcbiAgYXZhaWxhYmxlIHRvIGB7e3lpZWxkfX1gIGluIHRoYXQgdGVtcGxhdGUuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRTaGFkb3dTY29wZShlbnYgLyosIHBhcmVudFNjb3BlLCBzaGFkb3dTY29wZSAqLykge1xuICByZXR1cm4gZW52Lmhvb2tzLmNyZWF0ZUZyZXNoU2NvcGUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNoaWxkU2NvcGUocGFyZW50KSB7XG4gIHZhciBzY29wZSA9IE9iamVjdC5jcmVhdGUocGFyZW50KTtcbiAgc2NvcGUubG9jYWxzID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQubG9jYWxzKTtcbiAgc2NvcGUubG9jYWxQcmVzZW50ID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQubG9jYWxQcmVzZW50KTtcbiAgc2NvcGUuYmxvY2tzID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQuYmxvY2tzKTtcbiAgcmV0dXJuIHNjb3BlO1xufVxuXG4vKipcbiAgSG9zdCBIb29rOiBiaW5kU2VsZlxuXG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7YW55fSBzZWxmXG5cbiAgQ29ycmVzcG9uZHMgdG8gZW50ZXJpbmcgYSB0ZW1wbGF0ZS5cblxuICBUaGlzIGhvb2sgaXMgaW52b2tlZCB3aGVuIHRoZSBgc2VsZmAgdmFsdWUgZm9yIGEgc2NvcGUgaXMgcmVhZHkgdG8gYmUgYm91bmQuXG5cbiAgVGhlIGhvc3QgbXVzdCBlbnN1cmUgdGhhdCBjaGlsZCBzY29wZXMgcmVmbGVjdCB0aGUgY2hhbmdlIHRvIHRoZSBgc2VsZmAgaW5cbiAgZnV0dXJlIGNhbGxzIHRvIHRoZSBgZ2V0YCBob29rLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kU2VsZihlbnYsIHNjb3BlLCBzZWxmKSB7XG4gIHNjb3BlLnNlbGYgPSBzZWxmO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU2VsZihlbnYsIHNjb3BlLCBzZWxmKSB7XG4gIGVudi5ob29rcy5iaW5kU2VsZihlbnYsIHNjb3BlLCBzZWxmKTtcbn1cblxuLyoqXG4gIEhvc3QgSG9vazogYmluZExvY2FsXG5cbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gIEBwYXJhbSB7YW55fSB2YWx1ZVxuXG4gIENvcnJlc3BvbmRzIHRvIGVudGVyaW5nIGEgdGVtcGxhdGUgd2l0aCBibG9jayBhcmd1bWVudHMuXG5cbiAgVGhpcyBob29rIGlzIGludm9rZWQgd2hlbiBhIGxvY2FsIHZhcmlhYmxlIGZvciBhIHNjb3BlIGhhcyBiZWVuIHByb3ZpZGVkLlxuXG4gIFRoZSBob3N0IG11c3QgZW5zdXJlIHRoYXQgY2hpbGQgc2NvcGVzIHJlZmxlY3QgdGhlIGNoYW5nZSBpbiBmdXR1cmUgY2FsbHNcbiAgdG8gdGhlIGBnZXRgIGhvb2suXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRMb2NhbChlbnYsIHNjb3BlLCBuYW1lLCB2YWx1ZSkge1xuICBzY29wZS5sb2NhbFByZXNlbnRbbmFtZV0gPSB0cnVlO1xuICBzY29wZS5sb2NhbHNbbmFtZV0gPSB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUxvY2FsKGVudiwgc2NvcGUsIG5hbWUsIHZhbHVlKSB7XG4gIGVudi5ob29rcy5iaW5kTG9jYWwoZW52LCBzY29wZSwgbmFtZSwgdmFsdWUpO1xufVxuXG4vKipcbiAgSG9zdCBIb29rOiBiaW5kQmxvY2tcblxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHtGdW5jdGlvbn0gYmxvY2tcblxuICBDb3JyZXNwb25kcyB0byBlbnRlcmluZyBhIHNoYWRvdyB0ZW1wbGF0ZSB0aGF0IHdhcyBpbnZva2VkIGJ5IGEgYmxvY2sgaGVscGVyIHdpdGhcbiAgYHlpZWxkSW5gLlxuXG4gIFRoaXMgaG9vayBpcyBpbnZva2VkIHdpdGggYW4gb3BhcXVlIGJsb2NrIHRoYXQgd2lsbCBiZSBwYXNzZWQgYWxvbmdcbiAgdG8gdGhlIHNoYWRvdyB0ZW1wbGF0ZSwgYW5kIGluc2VydGVkIGludG8gdGhlIHNoYWRvdyB0ZW1wbGF0ZSB3aGVuXG4gIGB7e3lpZWxkfX1gIGlzIHVzZWQuIE9wdGlvbmFsbHkgcHJvdmlkZSBhIG5vbi1kZWZhdWx0IGJsb2NrIG5hbWVcbiAgdGhhdCBjYW4gYmUgdGFyZ2V0ZWQgYnkgYHt7eWllbGQgdG89YmxvY2tOYW1lfX1gLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kQmxvY2soZW52LCBzY29wZSwgYmxvY2ssIG5hbWU9J2RlZmF1bHQnKSB7XG4gIHNjb3BlLmJsb2Nrc1tuYW1lXSA9IGJsb2NrO1xufVxuXG4vKipcbiAgSG9zdCBIb29rOiBibG9ja1xuXG4gIEBwYXJhbSB7UmVuZGVyTm9kZX0gcmVuZGVyTm9kZVxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgQHBhcmFtIHtBcnJheX0gcGFyYW1zXG4gIEBwYXJhbSB7T2JqZWN0fSBoYXNoXG4gIEBwYXJhbSB7QmxvY2t9IGJsb2NrXG4gIEBwYXJhbSB7QmxvY2t9IGVsc2VCbG9ja1xuXG4gIENvcnJlc3BvbmRzIHRvOlxuXG4gIGBgYGhic1xuICB7eyNoZWxwZXIgcGFyYW0xIHBhcmFtMiBrZXkxPXZhbDEga2V5Mj12YWwyfX1cbiAgICB7eyEtLSBjaGlsZCB0ZW1wbGF0ZSAtLX19XG4gIHt7L2hlbHBlcn19XG4gIGBgYFxuXG4gIFRoaXMgaG9zdCBob29rIGlzIGEgd29ya2hvcnNlIG9mIHRoZSBzeXN0ZW0uIEl0IGlzIGludm9rZWRcbiAgd2hlbmV2ZXIgYSBibG9jayBpcyBlbmNvdW50ZXJlZCwgYW5kIGlzIHJlc3BvbnNpYmxlIGZvclxuICByZXNvbHZpbmcgdGhlIGhlbHBlciB0byBjYWxsLCBhbmQgdGhlbiBpbnZva2UgaXQuXG5cbiAgVGhlIGhlbHBlciBzaG91bGQgYmUgaW52b2tlZCB3aXRoOlxuXG4gIC0gYHtBcnJheX0gcGFyYW1zYDogdGhlIHBhcmFtZXRlcnMgcGFzc2VkIHRvIHRoZSBoZWxwZXJcbiAgICBpbiB0aGUgdGVtcGxhdGUuXG4gIC0gYHtPYmplY3R9IGhhc2hgOiBhbiBvYmplY3QgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIHBhc3NlZFxuICAgIGluIHRoZSBoYXNoIHBvc2l0aW9uIGluIHRoZSB0ZW1wbGF0ZS5cblxuICBUaGUgdmFsdWVzIGluIGBwYXJhbXNgIGFuZCBgaGFzaGAgd2lsbCBhbHJlYWR5IGJlIHJlc29sdmVkXG4gIHRocm91Z2ggYSBwcmV2aW91cyBjYWxsIHRvIHRoZSBgZ2V0YCBob3N0IGhvb2suXG5cbiAgVGhlIGhlbHBlciBzaG91bGQgYmUgaW52b2tlZCB3aXRoIGEgYHRoaXNgIHZhbHVlIHRoYXQgaXNcbiAgYW4gb2JqZWN0IHdpdGggb25lIGZpZWxkOlxuXG4gIGB7RnVuY3Rpb259IHlpZWxkYDogd2hlbiBpbnZva2VkLCB0aGlzIGZ1bmN0aW9uIGV4ZWN1dGVzIHRoZVxuICBibG9jayB3aXRoIHRoZSBjdXJyZW50IHNjb3BlLiBJdCB0YWtlcyBhbiBvcHRpb25hbCBhcnJheSBvZlxuICBibG9jayBwYXJhbWV0ZXJzLiBJZiBibG9jayBwYXJhbWV0ZXJzIGFyZSBzdXBwbGllZCwgSFRNTEJhcnNcbiAgd2lsbCBpbnZva2UgdGhlIGBiaW5kTG9jYWxgIGhvc3QgaG9vayB0byBiaW5kIHRoZSBzdXBwbGllZFxuICB2YWx1ZXMgdG8gdGhlIGJsb2NrIGFyZ3VtZW50cyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuXG5cbiAgSW4gZ2VuZXJhbCwgdGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgYGJsb2NrYCBzaG91bGQgd29ya1xuICBmb3IgbW9zdCBob3N0IGVudmlyb25tZW50cy4gSXQgZGVsZWdhdGVzIHRvIG90aGVyIGhvc3QgaG9va3NcbiAgd2hlcmUgYXBwcm9wcmlhdGUsIGFuZCBwcm9wZXJseSBpbnZva2VzIHRoZSBoZWxwZXIgd2l0aCB0aGVcbiAgYXBwcm9wcmlhdGUgYXJndW1lbnRzLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcikge1xuICBpZiAoaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29udGludWVCbG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250aW51ZUJsb2NrKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKSB7XG4gIGhvc3RCbG9jayhtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIGludmVyc2UsIG51bGwsIHZpc2l0b3IsIGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgaGVscGVyID0gZW52Lmhvb2tzLmxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBwYXRoKTtcbiAgICByZXR1cm4gZW52Lmhvb2tzLmludm9rZUhlbHBlcihtb3JwaCwgZW52LCBzY29wZSwgdmlzaXRvciwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIG9wdGlvbnMudGVtcGxhdGVzLCB0aGlzRm9yKG9wdGlvbnMudGVtcGxhdGVzKSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaG9zdEJsb2NrKG1vcnBoLCBlbnYsIHNjb3BlLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgc2hhZG93T3B0aW9ucywgdmlzaXRvciwgY2FsbGJhY2spIHtcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zRm9yKHRlbXBsYXRlLCBpbnZlcnNlLCBlbnYsIHNjb3BlLCBtb3JwaCwgdmlzaXRvcik7XG4gIHJlbmRlckFuZENsZWFudXAobW9ycGgsIGVudiwgb3B0aW9ucywgc2hhZG93T3B0aW9ucywgY2FsbGJhY2spO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpIHtcbiAgaWYgKCFwYXRoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdmFyIHJlZGlyZWN0ID0gZW52Lmhvb2tzLmNsYXNzaWZ5KGVudiwgc2NvcGUsIHBhdGgpO1xuICBpZiAocmVkaXJlY3QpIHtcbiAgICBzd2l0Y2gocmVkaXJlY3QpIHtcbiAgICAgIGNhc2UgJ2NvbXBvbmVudCc6IGVudi5ob29rcy5jb21wb25lbnQobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwge2RlZmF1bHQ6IHRlbXBsYXRlLCBpbnZlcnNlfSwgdmlzaXRvcik7IGJyZWFrO1xuICAgICAgY2FzZSAnaW5saW5lJzogZW52Lmhvb2tzLmlubGluZShtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgICBjYXNlICdibG9jayc6IGVudi5ob29rcy5ibG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcik7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKFwiSW50ZXJuYWwgSFRNTEJhcnMgcmVkaXJlY3Rpb24gdG8gXCIgKyByZWRpcmVjdCArIFwiIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKGhhbmRsZUtleXdvcmQocGF0aCwgbW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYW5kbGVLZXl3b3JkKHBhdGgsIG1vcnBoLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKSB7XG4gIHZhciBrZXl3b3JkID0gZW52Lmhvb2tzLmtleXdvcmRzW3BhdGhdO1xuICBpZiAoIWtleXdvcmQpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgaWYgKHR5cGVvZiBrZXl3b3JkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGtleXdvcmQobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpO1xuICB9XG5cbiAgaWYgKGtleXdvcmQud2lsbFJlbmRlcikge1xuICAgIGtleXdvcmQud2lsbFJlbmRlcihtb3JwaCwgZW52KTtcbiAgfVxuXG4gIHZhciBsYXN0U3RhdGUsIG5ld1N0YXRlO1xuICBpZiAoa2V5d29yZC5zZXR1cFN0YXRlKSB7XG4gICAgbGFzdFN0YXRlID0gc2hhbGxvd0NvcHkobW9ycGguc3RhdGUpO1xuICAgIG5ld1N0YXRlID0gbW9ycGguc3RhdGUgPSBrZXl3b3JkLnNldHVwU3RhdGUobGFzdFN0YXRlLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gpO1xuICB9XG5cbiAgaWYgKGtleXdvcmQuY2hpbGRFbnYpIHtcbiAgICAvLyBCdWlsZCB0aGUgY2hpbGQgZW52aXJvbm1lbnQuLi5cbiAgICBlbnYgPSBrZXl3b3JkLmNoaWxkRW52KG1vcnBoLnN0YXRlLCBlbnYpO1xuXG4gICAgLy8gLi50aGVuIHNhdmUgb2ZmIHRoZSBjaGlsZCBlbnYgYnVpbGRlciBvbiB0aGUgcmVuZGVyIG5vZGUuIElmIHRoZSByZW5kZXJcbiAgICAvLyBub2RlIHRyZWUgaXMgcmUtcmVuZGVyZWQgYW5kIHRoaXMgbm9kZSBpcyBub3QgZGlydHksIHRoZSBjaGlsZCBlbnZcbiAgICAvLyBidWlsZGVyIHdpbGwgc3RpbGwgYmUgaW52b2tlZCBzbyB0aGF0IGNoaWxkIGRpcnR5IHJlbmRlciBub2RlcyBzdGlsbCBnZXRcbiAgICAvLyB0aGUgY29ycmVjdCBjaGlsZCBlbnYuXG4gICAgbW9ycGguYnVpbGRDaGlsZEVudiA9IGtleXdvcmQuY2hpbGRFbnY7XG4gIH1cblxuICB2YXIgZmlyc3RUaW1lID0gIW1vcnBoLnJlbmRlcmVkO1xuXG4gIGlmIChrZXl3b3JkLmlzRW1wdHkpIHtcbiAgICB2YXIgaXNFbXB0eSA9IGtleXdvcmQuaXNFbXB0eShtb3JwaC5zdGF0ZSwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoKTtcblxuICAgIGlmIChpc0VtcHR5KSB7XG4gICAgICBpZiAoIWZpcnN0VGltZSkgeyBjbGVhck1vcnBoKG1vcnBoLCBlbnYsIGZhbHNlKTsgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKGZpcnN0VGltZSkge1xuICAgIGlmIChrZXl3b3JkLnJlbmRlcikge1xuICAgICAga2V5d29yZC5yZW5kZXIobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpO1xuICAgIH1cbiAgICBtb3JwaC5yZW5kZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB2YXIgaXNTdGFibGU7XG4gIGlmIChrZXl3b3JkLmlzU3RhYmxlKSB7XG4gICAgaXNTdGFibGUgPSBrZXl3b3JkLmlzU3RhYmxlKGxhc3RTdGF0ZSwgbmV3U3RhdGUpO1xuICB9IGVsc2Uge1xuICAgIGlzU3RhYmxlID0gc3RhYmxlU3RhdGUobGFzdFN0YXRlLCBuZXdTdGF0ZSk7XG4gIH1cblxuICBpZiAoaXNTdGFibGUpIHtcbiAgICBpZiAoa2V5d29yZC5yZXJlbmRlcikge1xuICAgICAgdmFyIG5ld0VudiA9IGtleXdvcmQucmVyZW5kZXIobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpO1xuICAgICAgZW52ID0gbmV3RW52IHx8IGVudjtcbiAgICB9XG4gICAgdmFsaWRhdGVDaGlsZE1vcnBocyhlbnYsIG1vcnBoLCB2aXNpdG9yKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBjbGVhck1vcnBoKG1vcnBoLCBlbnYsIGZhbHNlKTtcbiAgfVxuXG4gIC8vIElmIHRoZSBub2RlIGlzIHVuc3RhYmxlLCByZS1yZW5kZXIgZnJvbSBzY3JhdGNoXG4gIGlmIChrZXl3b3JkLnJlbmRlcikge1xuICAgIGtleXdvcmQucmVuZGVyKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKTtcbiAgICBtb3JwaC5yZW5kZXJlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhYmxlU3RhdGUob2xkU3RhdGUsIG5ld1N0YXRlKSB7XG4gIGlmIChrZXlMZW5ndGgob2xkU3RhdGUpICE9PSBrZXlMZW5ndGgobmV3U3RhdGUpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIGZvciAodmFyIHByb3AgaW4gb2xkU3RhdGUpIHtcbiAgICBpZiAob2xkU3RhdGVbcHJvcF0gIT09IG5ld1N0YXRlW3Byb3BdKSB7IHJldHVybiBmYWxzZTsgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5rUmVuZGVyTm9kZSgvKiBtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoICovKSB7XG4gIHJldHVybjtcbn1cblxuLyoqXG4gIEhvc3QgSG9vazogaW5saW5lXG5cbiAgQHBhcmFtIHtSZW5kZXJOb2RlfSByZW5kZXJOb2RlXG4gIEBwYXJhbSB7RW52aXJvbm1lbnR9IGVudlxuICBAcGFyYW0ge1Njb3BlfSBzY29wZVxuICBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICBAcGFyYW0ge0FycmF5fSBwYXJhbXNcbiAgQHBhcmFtIHtIYXNofSBoYXNoXG5cbiAgQ29ycmVzcG9uZHMgdG86XG5cbiAgYGBgaGJzXG4gIHt7aGVscGVyIHBhcmFtMSBwYXJhbTIga2V5MT12YWwxIGtleTI9dmFsMn19XG4gIGBgYFxuXG4gIFRoaXMgaG9zdCBob29rIGlzIHNpbWlsYXIgdG8gdGhlIGBibG9ja2AgaG9zdCBob29rLCBidXQgaXRcbiAgaW52b2tlcyBoZWxwZXJzIHRoYXQgZG8gbm90IHN1cHBseSBhbiBhdHRhY2hlZCBibG9jay5cblxuICBMaWtlIHRoZSBgYmxvY2tgIGhvb2ssIHRoZSBoZWxwZXIgc2hvdWxkIGJlIGludm9rZWQgd2l0aDpcblxuICAtIGB7QXJyYXl9IHBhcmFtc2A6IHRoZSBwYXJhbWV0ZXJzIHBhc3NlZCB0byB0aGUgaGVscGVyXG4gICAgaW4gdGhlIHRlbXBsYXRlLlxuICAtIGB7T2JqZWN0fSBoYXNoYDogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBwYXNzZWRcbiAgICBpbiB0aGUgaGFzaCBwb3NpdGlvbiBpbiB0aGUgdGVtcGxhdGUuXG5cbiAgVGhlIHZhbHVlcyBpbiBgcGFyYW1zYCBhbmQgYGhhc2hgIHdpbGwgYWxyZWFkeSBiZSByZXNvbHZlZFxuICB0aHJvdWdoIGEgcHJldmlvdXMgY2FsbCB0byB0aGUgYGdldGAgaG9zdCBob29rLlxuXG4gIEluIGdlbmVyYWwsIHRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mIGBpbmxpbmVgIHNob3VsZCB3b3JrXG4gIGZvciBtb3N0IGhvc3QgZW52aXJvbm1lbnRzLiBJdCBkZWxlZ2F0ZXMgdG8gb3RoZXIgaG9zdCBob29rc1xuICB3aGVyZSBhcHByb3ByaWF0ZSwgYW5kIHByb3Blcmx5IGludm9rZXMgdGhlIGhlbHBlciB3aXRoIHRoZVxuICBhcHByb3ByaWF0ZSBhcmd1bWVudHMuXG5cbiAgVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgYGlubGluZWAgYWxzbyBtYWtlcyBgcGFydGlhbGBcbiAgYSBrZXl3b3JkLiBJbnN0ZWFkIG9mIGludm9raW5nIGEgaGVscGVyIG5hbWVkIGBwYXJ0aWFsYCxcbiAgaXQgaW52b2tlcyB0aGUgYHBhcnRpYWxgIGhvc3QgaG9vay5cbiovXG5leHBvcnQgZnVuY3Rpb24gaW5saW5lKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXMsIGhhc2gsIHZpc2l0b3IpIHtcbiAgaWYgKGhhbmRsZVJlZGlyZWN0KG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXMsIGhhc2gsIG51bGwsIG51bGwsIHZpc2l0b3IpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHZhbHVlLCBoYXNWYWx1ZTtcbiAgaWYgKG1vcnBoLmxpbmtlZFJlc3VsdCkge1xuICAgIHZhbHVlID0gZW52Lmhvb2tzLmdldFZhbHVlKG1vcnBoLmxpbmtlZFJlc3VsdCk7XG4gICAgaGFzVmFsdWUgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHZhciBvcHRpb25zID0gb3B0aW9uc0ZvcihudWxsLCBudWxsLCBlbnYsIHNjb3BlLCBtb3JwaCk7XG5cbiAgICB2YXIgaGVscGVyID0gZW52Lmhvb2tzLmxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBwYXRoKTtcbiAgICB2YXIgcmVzdWx0ID0gZW52Lmhvb2tzLmludm9rZUhlbHBlcihtb3JwaCwgZW52LCBzY29wZSwgdmlzaXRvciwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIG9wdGlvbnMudGVtcGxhdGVzLCB0aGlzRm9yKG9wdGlvbnMudGVtcGxhdGVzKSk7XG5cbiAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5saW5rKSB7XG4gICAgICBtb3JwaC5saW5rZWRSZXN1bHQgPSByZXN1bHQudmFsdWU7XG4gICAgICBsaW5rUGFyYW1zKGVudiwgc2NvcGUsIG1vcnBoLCAnQGNvbnRlbnQtaGVscGVyJywgW21vcnBoLmxpbmtlZFJlc3VsdF0sIG51bGwpO1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQgJiYgJ3ZhbHVlJyBpbiByZXN1bHQpIHtcbiAgICAgIHZhbHVlID0gZW52Lmhvb2tzLmdldFZhbHVlKHJlc3VsdC52YWx1ZSk7XG4gICAgICBoYXNWYWx1ZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKGhhc1ZhbHVlKSB7XG4gICAgaWYgKG1vcnBoLmxhc3RWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgIG1vcnBoLnNldENvbnRlbnQodmFsdWUpO1xuICAgIH1cbiAgICBtb3JwaC5sYXN0VmFsdWUgPSB2YWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5d29yZChwYXRoLCBtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcikgIHtcbiAgaGFuZGxlS2V5d29yZChwYXRoLCBtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSwgdmlzaXRvcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnZva2VIZWxwZXIobW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IsIF9wYXJhbXMsIF9oYXNoLCBoZWxwZXIsIHRlbXBsYXRlcywgY29udGV4dCkge1xuICB2YXIgcGFyYW1zID0gbm9ybWFsaXplQXJyYXkoZW52LCBfcGFyYW1zKTtcbiAgdmFyIGhhc2ggPSBub3JtYWxpemVPYmplY3QoZW52LCBfaGFzaCk7XG4gIHJldHVybiB7IHZhbHVlOiBoZWxwZXIuY2FsbChjb250ZXh0LCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlcykgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkoZW52LCBhcnJheSkge1xuICB2YXIgb3V0ID0gbmV3IEFycmF5KGFycmF5Lmxlbmd0aCk7XG5cbiAgZm9yICh2YXIgaT0wLCBsPWFycmF5Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICBvdXRbaV0gPSBlbnYuaG9va3MuZ2V0Q2VsbE9yVmFsdWUoYXJyYXlbaV0pO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplT2JqZWN0KGVudiwgb2JqZWN0KSB7XG4gIHZhciBvdXQgPSB7fTtcblxuICBmb3IgKHZhciBwcm9wIGluIG9iamVjdCkgIHtcbiAgICBvdXRbcHJvcF0gPSBlbnYuaG9va3MuZ2V0Q2VsbE9yVmFsdWUob2JqZWN0W3Byb3BdKTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeSgvKiBlbnYsIHNjb3BlLCBwYXRoICovKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgdmFyIGtleXdvcmRzID0ge1xuICBwYXJ0aWFsOiBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zKSB7XG4gICAgdmFyIHZhbHVlID0gZW52Lmhvb2tzLnBhcnRpYWwobW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtc1swXSk7XG4gICAgbW9ycGguc2V0Q29udGVudCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgeWllbGQ6IGZ1bmN0aW9uKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXJhbXMsIGhhc2gsIHRlbXBsYXRlLCBpbnZlcnNlLCB2aXNpdG9yKSB7XG4gICAgLy8gdGhlIGN1cnJlbnQgc2NvcGUgaXMgcHJvdmlkZWQgcHVyZWx5IGZvciB0aGUgY3JlYXRpb24gb2Ygc2hhZG93XG4gICAgLy8gc2NvcGVzOyBpdCBzaG91bGQgbm90IGJlIHByb3ZpZGVkIHRvIHVzZXIgY29kZS5cblxuICAgIHZhciB0byA9IGVudi5ob29rcy5nZXRWYWx1ZShoYXNoLnRvKSB8fCAnZGVmYXVsdCc7XG4gICAgaWYgKHNjb3BlLmJsb2Nrc1t0b10pIHtcbiAgICAgIHNjb3BlLmJsb2Nrc1t0b10uaW52b2tlKGVudiwgcGFyYW1zLCBoYXNoLnNlbGYsIG1vcnBoLCBzY29wZSwgdmlzaXRvcik7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGhhc0Jsb2NrOiBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zKSB7XG4gICAgdmFyIG5hbWUgPSBlbnYuaG9va3MuZ2V0VmFsdWUocGFyYW1zWzBdKSB8fCAnZGVmYXVsdCc7XG4gICAgcmV0dXJuICEhc2NvcGUuYmxvY2tzW25hbWVdO1xuICB9LFxuXG4gIGhhc0Jsb2NrUGFyYW1zOiBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgcGFyYW1zKSB7XG4gICAgdmFyIG5hbWUgPSBlbnYuaG9va3MuZ2V0VmFsdWUocGFyYW1zWzBdKSB8fCAnZGVmYXVsdCc7XG4gICAgcmV0dXJuICEhKHNjb3BlLmJsb2Nrc1tuYW1lXSAmJiBzY29wZS5ibG9ja3NbbmFtZV0uYXJpdHkpO1xuICB9XG5cbn07XG5cbi8qKlxuICBIb3N0IEhvb2s6IHBhcnRpYWxcblxuICBAcGFyYW0ge1JlbmRlck5vZGV9IHJlbmRlck5vZGVcbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG5cbiAgQ29ycmVzcG9uZHMgdG86XG5cbiAgYGBgaGJzXG4gIHt7cGFydGlhbCBcImxvY2F0aW9uXCJ9fVxuICBgYGBcblxuICBUaGlzIGhvc3QgaG9vayBpcyBpbnZva2VkIGJ5IHRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mXG4gIHRoZSBgaW5saW5lYCBob29rLiBUaGlzIG1ha2VzIGBwYXJ0aWFsYCBhIGtleXdvcmQgaW4gYW5cbiAgSFRNTEJhcnMgZW52aXJvbm1lbnQgdXNpbmcgdGhlIGRlZmF1bHQgYGlubGluZWAgaG9zdCBob29rLlxuXG4gIEl0IGlzIGltcGxlbWVudGVkIGFzIGEgaG9zdCBob29rIHNvIHRoYXQgaXQgY2FuIHJldHJpZXZlXG4gIHRoZSBuYW1lZCBwYXJ0aWFsIG91dCBvZiB0aGUgYEVudmlyb25tZW50YC4gSGVscGVycywgaW5cbiAgY29udHJhc3QsIG9ubHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIHZhbHVlcyBwYXNzZWQgaW4gdG8gdGhlbSxcbiAgYW5kIG5vdCB0byB0aGUgYW1iaWVudCBsZXhpY2FsIGVudmlyb25tZW50LlxuXG4gIFRoZSBob3N0IGhvb2sgc2hvdWxkIGludm9rZSB0aGUgcmVmZXJlbmNlZCBwYXJ0aWFsIHdpdGhcbiAgdGhlIGFtYmllbnQgYHNlbGZgLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJ0aWFsKHJlbmRlck5vZGUsIGVudiwgc2NvcGUsIHBhdGgpIHtcbiAgdmFyIHRlbXBsYXRlID0gZW52LnBhcnRpYWxzW3BhdGhdO1xuICByZXR1cm4gdGVtcGxhdGUucmVuZGVyKHNjb3BlLnNlbGYsIGVudiwge30pLmZyYWdtZW50O1xufVxuXG4vKipcbiAgSG9zdCBob29rOiByYW5nZVxuXG4gIEBwYXJhbSB7UmVuZGVyTm9kZX0gcmVuZGVyTm9kZVxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHthbnl9IHZhbHVlXG5cbiAgQ29ycmVzcG9uZHMgdG86XG5cbiAgYGBgaGJzXG4gIHt7Y29udGVudH19XG4gIHt7e3VuZXNjYXBlZH19fVxuICBgYGBcblxuICBUaGlzIGhvb2sgaXMgcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGEgcmVuZGVyIG5vZGVcbiAgdGhhdCByZXByZXNlbnRzIGEgcmFuZ2Ugb2YgY29udGVudCB3aXRoIGEgdmFsdWUuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCB2YWx1ZSwgdmlzaXRvcikge1xuICBpZiAoaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIFt2YWx1ZV0sIHt9LCBudWxsLCBudWxsLCB2aXNpdG9yKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhbHVlID0gZW52Lmhvb2tzLmdldFZhbHVlKHZhbHVlKTtcblxuICBpZiAobW9ycGgubGFzdFZhbHVlICE9PSB2YWx1ZSkge1xuICAgIG1vcnBoLnNldENvbnRlbnQodmFsdWUpO1xuICB9XG5cbiAgbW9ycGgubGFzdFZhbHVlID0gdmFsdWU7XG59XG5cbi8qKlxuICBIb3N0IGhvb2s6IGVsZW1lbnRcblxuICBAcGFyYW0ge1JlbmRlck5vZGV9IHJlbmRlck5vZGVcbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U2NvcGV9IHNjb3BlXG4gIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gIEBwYXJhbSB7QXJyYXl9IHBhcmFtc1xuICBAcGFyYW0ge0hhc2h9IGhhc2hcblxuICBDb3JyZXNwb25kcyB0bzpcblxuICBgYGBoYnNcbiAgPGRpdiB7e2JpbmQtYXR0ciBmb289YmFyfX0+PC9kaXY+XG4gIGBgYFxuXG4gIFRoaXMgaG9vayBpcyByZXNwb25zaWJsZSBmb3IgaW52b2tpbmcgYSBoZWxwZXIgdGhhdFxuICBtb2RpZmllcyBhbiBlbGVtZW50LlxuXG4gIEl0cyBwdXJwb3NlIGlzIGxhcmdlbHkgbGVnYWN5IHN1cHBvcnQgZm9yIGF3a3dhcmRcbiAgaWRpb21zIHRoYXQgYmVjYW1lIGNvbW1vbiB3aGVuIHVzaW5nIHRoZSBzdHJpbmctYmFzZWRcbiAgSGFuZGxlYmFycyBlbmdpbmUuXG5cbiAgTW9zdCBvZiB0aGUgdXNlcyBvZiB0aGUgYGVsZW1lbnRgIGhvb2sgYXJlIGV4cGVjdGVkXG4gIHRvIGJlIHN1cGVyc2VkZWQgYnkgY29tcG9uZW50IHN5bnRheCBhbmQgdGhlXG4gIGBhdHRyaWJ1dGVgIGhvb2suXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnQobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgdmlzaXRvcikge1xuICBpZiAoaGFuZGxlUmVkaXJlY3QobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCwgbnVsbCwgbnVsbCwgdmlzaXRvcikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaGVscGVyID0gZW52Lmhvb2tzLmxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBwYXRoKTtcbiAgaWYgKGhlbHBlcikge1xuICAgIGVudi5ob29rcy5pbnZva2VIZWxwZXIobnVsbCwgZW52LCBzY29wZSwgbnVsbCwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIHsgZWxlbWVudDogbW9ycGguZWxlbWVudCB9KTtcbiAgfVxufVxuXG4vKipcbiAgSG9zdCBob29rOiBhdHRyaWJ1dGVcblxuICBAcGFyYW0ge1JlbmRlck5vZGV9IHJlbmRlck5vZGVcbiAgQHBhcmFtIHtFbnZpcm9ubWVudH0gZW52XG4gIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gIEBwYXJhbSB7YW55fSB2YWx1ZVxuXG4gIENvcnJlc3BvbmRzIHRvOlxuXG4gIGBgYGhic1xuICA8ZGl2IGZvbz17e2Jhcn19PjwvZGl2PlxuICBgYGBcblxuICBUaGlzIGhvb2sgaXMgcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGEgcmVuZGVyIG5vZGVcbiAgdGhhdCByZXByZXNlbnRzIGFuIGVsZW1lbnQncyBhdHRyaWJ1dGUgd2l0aCBhIHZhbHVlLlxuXG4gIEl0IHJlY2VpdmVzIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgYXMgd2VsbCBhcyBhblxuICBhbHJlYWR5LXJlc29sdmVkIHZhbHVlLCBhbmQgc2hvdWxkIHVwZGF0ZSB0aGUgcmVuZGVyXG4gIG5vZGUgd2l0aCB0aGUgdmFsdWUgaWYgYXBwcm9wcmlhdGUuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGF0dHJpYnV0ZShtb3JwaCwgZW52LCBzY29wZSwgbmFtZSwgdmFsdWUpIHtcbiAgdmFsdWUgPSBlbnYuaG9va3MuZ2V0VmFsdWUodmFsdWUpO1xuXG4gIGlmIChtb3JwaC5sYXN0VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgbW9ycGguc2V0Q29udGVudCh2YWx1ZSk7XG4gIH1cblxuICBtb3JwaC5sYXN0VmFsdWUgPSB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN1YmV4cHIoZW52LCBzY29wZSwgaGVscGVyTmFtZSwgcGFyYW1zLCBoYXNoKSB7XG4gIHZhciBoZWxwZXIgPSBlbnYuaG9va3MubG9va3VwSGVscGVyKGVudiwgc2NvcGUsIGhlbHBlck5hbWUpO1xuICB2YXIgcmVzdWx0ID0gZW52Lmhvb2tzLmludm9rZUhlbHBlcihudWxsLCBlbnYsIHNjb3BlLCBudWxsLCBwYXJhbXMsIGhhc2gsIGhlbHBlciwge30pO1xuICBpZiAocmVzdWx0ICYmICd2YWx1ZScgaW4gcmVzdWx0KSB7IHJldHVybiBlbnYuaG9va3MuZ2V0VmFsdWUocmVzdWx0LnZhbHVlKTsgfVxufVxuXG4vKipcbiAgSG9zdCBIb29rOiBnZXRcblxuICBAcGFyYW0ge0Vudmlyb25tZW50fSBlbnZcbiAgQHBhcmFtIHtTY29wZX0gc2NvcGVcbiAgQHBhcmFtIHtTdHJpbmd9IHBhdGhcblxuICBDb3JyZXNwb25kcyB0bzpcblxuICBgYGBoYnNcbiAge3tmb28uYmFyfX1cbiAgICBeXG5cbiAge3toZWxwZXIgZm9vLmJhciBrZXk9dmFsdWV9fVxuICAgICAgICAgICBeICAgICAgICAgICBeXG4gIGBgYFxuXG4gIFRoaXMgaG9vayBpcyB0aGUgXCJsZWFmXCIgaG9vayBvZiB0aGUgc3lzdGVtLiBJdCBpcyB1c2VkIHRvXG4gIHJlc29sdmUgYSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHNjb3BlLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQoZW52LCBzY29wZSwgcGF0aCkge1xuICBpZiAocGF0aCA9PT0gJycpIHtcbiAgICByZXR1cm4gc2NvcGUuc2VsZjtcbiAgfVxuXG4gIHZhciBrZXlzID0gcGF0aC5zcGxpdCgnLicpO1xuICB2YXIgdmFsdWUgPSBlbnYuaG9va3MuZ2V0Um9vdChzY29wZSwga2V5c1swXSlbMF07XG5cbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IGVudi5ob29rcy5nZXRDaGlsZCh2YWx1ZSwga2V5c1tpXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJvb3Qoc2NvcGUsIGtleSkge1xuICBpZiAoc2NvcGUubG9jYWxQcmVzZW50W2tleV0pIHtcbiAgICByZXR1cm4gW3Njb3BlLmxvY2Fsc1trZXldXTtcbiAgfSBlbHNlIGlmIChzY29wZS5zZWxmKSB7XG4gICAgcmV0dXJuIFtzY29wZS5zZWxmW2tleV1dO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbdW5kZWZpbmVkXTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2hpbGQodmFsdWUsIGtleSkge1xuICByZXR1cm4gdmFsdWVba2V5XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFZhbHVlKHJlZmVyZW5jZSkge1xuICByZXR1cm4gcmVmZXJlbmNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2VsbE9yVmFsdWUocmVmZXJlbmNlKSB7XG4gIHJldHVybiByZWZlcmVuY2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wb25lbnQobW9ycGgsIGVudiwgc2NvcGUsIHRhZ05hbWUsIHBhcmFtcywgYXR0cnMsIHRlbXBsYXRlcywgdmlzaXRvcikge1xuICBpZiAoZW52Lmhvb2tzLmhhc0hlbHBlcihlbnYsIHNjb3BlLCB0YWdOYW1lKSkge1xuICAgIHJldHVybiBlbnYuaG9va3MuYmxvY2sobW9ycGgsIGVudiwgc2NvcGUsIHRhZ05hbWUsIHBhcmFtcywgYXR0cnMsIHRlbXBsYXRlcy5kZWZhdWx0LCB0ZW1wbGF0ZXMuaW52ZXJzZSwgdmlzaXRvcik7XG4gIH1cblxuICBjb21wb25lbnRGYWxsYmFjayhtb3JwaCwgZW52LCBzY29wZSwgdGFnTmFtZSwgYXR0cnMsIHRlbXBsYXRlcy5kZWZhdWx0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmNhdChlbnYsIHBhcmFtcykge1xuICB2YXIgdmFsdWUgPSBcIlwiO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcmFtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YWx1ZSArPSBlbnYuaG9va3MuZ2V0VmFsdWUocGFyYW1zW2ldKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBvbmVudEZhbGxiYWNrKG1vcnBoLCBlbnYsIHNjb3BlLCB0YWdOYW1lLCBhdHRycywgdGVtcGxhdGUpIHtcbiAgdmFyIGVsZW1lbnQgPSBlbnYuZG9tLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIGZvciAodmFyIG5hbWUgaW4gYXR0cnMpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCBlbnYuaG9va3MuZ2V0VmFsdWUoYXR0cnNbbmFtZV0pKTtcbiAgfVxuICB2YXIgZnJhZ21lbnQgPSByZW5kZXIodGVtcGxhdGUsIGVudiwgc2NvcGUsIHt9KS5mcmFnbWVudDtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gIG1vcnBoLnNldE5vZGUoZWxlbWVudCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNIZWxwZXIoZW52LCBzY29wZSwgaGVscGVyTmFtZSkge1xuICByZXR1cm4gZW52LmhlbHBlcnNbaGVscGVyTmFtZV0gIT09IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvb2t1cEhlbHBlcihlbnYsIHNjb3BlLCBoZWxwZXJOYW1lKSB7XG4gIHJldHVybiBlbnYuaGVscGVyc1toZWxwZXJOYW1lXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRTY29wZSgvKiBlbnYsIHNjb3BlICovKSB7XG4gIC8vIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBoYW5kbGUgaG9zdC1zcGVjaWZpZWQgZXh0ZW5zaW9ucyB0byBzY29wZVxuICAvLyBvdGhlciB0aGFuIGBzZWxmYCwgYGxvY2Fsc2AgYW5kIGBibG9ja2AuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVTY29wZShlbnYsIHNjb3BlKSB7XG4gIGVudi5ob29rcy5iaW5kU2NvcGUoZW52LCBzY29wZSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgLy8gZnVuZGFtZW50YWwgaG9va3MgdGhhdCB5b3Ugd2lsbCBsaWtlbHkgd2FudCB0byBvdmVycmlkZVxuICBiaW5kTG9jYWw6IGJpbmRMb2NhbCxcbiAgYmluZFNlbGY6IGJpbmRTZWxmLFxuICBiaW5kU2NvcGU6IGJpbmRTY29wZSxcbiAgY2xhc3NpZnk6IGNsYXNzaWZ5LFxuICBjb21wb25lbnQ6IGNvbXBvbmVudCxcbiAgY29uY2F0OiBjb25jYXQsXG4gIGNyZWF0ZUZyZXNoU2NvcGU6IGNyZWF0ZUZyZXNoU2NvcGUsXG4gIGdldENoaWxkOiBnZXRDaGlsZCxcbiAgZ2V0Um9vdDogZ2V0Um9vdCxcbiAgZ2V0VmFsdWU6IGdldFZhbHVlLFxuICBnZXRDZWxsT3JWYWx1ZTogZ2V0Q2VsbE9yVmFsdWUsXG4gIGtleXdvcmRzOiBrZXl3b3JkcyxcbiAgbGlua1JlbmRlck5vZGU6IGxpbmtSZW5kZXJOb2RlLFxuICBwYXJ0aWFsOiBwYXJ0aWFsLFxuICBzdWJleHByOiBzdWJleHByLFxuXG4gIC8vIGZ1bmRhbWVudGFsIGhvb2tzIHdpdGggZ29vZCBkZWZhdWx0IGJlaGF2aW9yXG4gIGJpbmRCbG9jazogYmluZEJsb2NrLFxuICBiaW5kU2hhZG93U2NvcGU6IGJpbmRTaGFkb3dTY29wZSxcbiAgdXBkYXRlTG9jYWw6IHVwZGF0ZUxvY2FsLFxuICB1cGRhdGVTZWxmOiB1cGRhdGVTZWxmLFxuICB1cGRhdGVTY29wZTogdXBkYXRlU2NvcGUsXG4gIGNyZWF0ZUNoaWxkU2NvcGU6IGNyZWF0ZUNoaWxkU2NvcGUsXG4gIGhhc0hlbHBlcjogaGFzSGVscGVyLFxuICBsb29rdXBIZWxwZXI6IGxvb2t1cEhlbHBlcixcbiAgaW52b2tlSGVscGVyOiBpbnZva2VIZWxwZXIsXG4gIGNsZWFudXBSZW5kZXJOb2RlOiBudWxsLFxuICBkZXN0cm95UmVuZGVyTm9kZTogbnVsbCxcbiAgd2lsbENsZWFudXBUcmVlOiBudWxsLFxuICBkaWRDbGVhbnVwVHJlZTogbnVsbCxcbiAgd2lsbFJlbmRlck5vZGU6IG51bGwsXG4gIGRpZFJlbmRlck5vZGU6IG51bGwsXG5cbiAgLy8gZGVyaXZlZCBob29rc1xuICBhdHRyaWJ1dGU6IGF0dHJpYnV0ZSxcbiAgYmxvY2s6IGJsb2NrLFxuICBjcmVhdGVTY29wZTogY3JlYXRlU2NvcGUsXG4gIGVsZW1lbnQ6IGVsZW1lbnQsXG4gIGdldDogZ2V0LFxuICBpbmxpbmU6IGlubGluZSxcbiAgcmFuZ2U6IHJhbmdlLFxuICBrZXl3b3JkOiBrZXl3b3JkXG59O1xuIl19
define("htmlbars-runtime/morph", ["exports", "../morph-range"], function (exports, _morphRange) {

  var guid = 1;

  function HTMLBarsMorph(domHelper, contextualElement) {
    this.super$constructor(domHelper, contextualElement);

    this.state = {};
    this.ownerNode = null;
    this.isDirty = false;
    this.isSubtreeDirty = false;
    this.lastYielded = null;
    this.lastResult = null;
    this.lastValue = null;
    this.buildChildEnv = null;
    this.morphList = null;
    this.morphMap = null;
    this.key = null;
    this.linkedParams = null;
    this.linkedResult = null;
    this.childNodes = null;
    this.rendered = false;
    this.guid = "range" + guid++;
  }

  HTMLBarsMorph.empty = function (domHelper, contextualElement) {
    var morph = new HTMLBarsMorph(domHelper, contextualElement);
    morph.clear();
    return morph;
  };

  HTMLBarsMorph.create = function (domHelper, contextualElement, node) {
    var morph = new HTMLBarsMorph(domHelper, contextualElement);
    morph.setNode(node);
    return morph;
  };

  HTMLBarsMorph.attach = function (domHelper, contextualElement, firstNode, lastNode) {
    var morph = new HTMLBarsMorph(domHelper, contextualElement);
    morph.setRange(firstNode, lastNode);
    return morph;
  };

  var prototype = HTMLBarsMorph.prototype = Object.create(_morphRange.default.prototype);
  prototype.constructor = HTMLBarsMorph;
  prototype.super$constructor = _morphRange.default;

  exports.default = HTMLBarsMorph;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvbW9ycGguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFJLElBQUksR0FBRyxDQUFDLENBQUM7O0FBRWIsV0FBUyxhQUFhLENBQUMsU0FBUyxFQUFFLGlCQUFpQixFQUFFO0FBQ25ELFFBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7QUFFckQsUUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDaEIsUUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdEIsUUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDckIsUUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDNUIsUUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDeEIsUUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDdkIsUUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdEIsUUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFDMUIsUUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdEIsUUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7QUFDckIsUUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7QUFDaEIsUUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDekIsUUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDekIsUUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDdkIsUUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDdEIsUUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsSUFBSSxFQUFFLENBQUM7R0FDOUI7O0FBRUQsZUFBYSxDQUFDLEtBQUssR0FBRyxVQUFTLFNBQVMsRUFBRSxpQkFBaUIsRUFBRTtBQUMzRCxRQUFJLEtBQUssR0FBRyxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUM1RCxTQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDZCxXQUFPLEtBQUssQ0FBQztHQUNkLENBQUM7O0FBRUYsZUFBYSxDQUFDLE1BQU0sR0FBRyxVQUFVLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUU7QUFDbkUsUUFBSSxLQUFLLEdBQUcsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFDNUQsU0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixXQUFPLEtBQUssQ0FBQztHQUNkLENBQUM7O0FBRUYsZUFBYSxDQUFDLE1BQU0sR0FBRyxVQUFVLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFO0FBQ2xGLFFBQUksS0FBSyxHQUFHLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBQzVELFNBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLFdBQU8sS0FBSyxDQUFDO0dBQ2QsQ0FBQzs7QUFFRixNQUFJLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsb0JBQVUsU0FBUyxDQUFDLENBQUM7QUFDN0UsV0FBUyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUM7QUFDdEMsV0FBUyxDQUFDLGlCQUFpQixzQkFBWSxDQUFDOztvQkFFekIsYUFBYSIsImZpbGUiOiJodG1sYmFycy1ydW50aW1lL21vcnBoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1vcnBoQmFzZSBmcm9tIFwiLi4vbW9ycGgtcmFuZ2VcIjtcblxudmFyIGd1aWQgPSAxO1xuXG5mdW5jdGlvbiBIVE1MQmFyc01vcnBoKGRvbUhlbHBlciwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdGhpcy5zdXBlciRjb25zdHJ1Y3Rvcihkb21IZWxwZXIsIGNvbnRleHR1YWxFbGVtZW50KTtcblxuICB0aGlzLnN0YXRlID0ge307XG4gIHRoaXMub3duZXJOb2RlID0gbnVsbDtcbiAgdGhpcy5pc0RpcnR5ID0gZmFsc2U7XG4gIHRoaXMuaXNTdWJ0cmVlRGlydHkgPSBmYWxzZTtcbiAgdGhpcy5sYXN0WWllbGRlZCA9IG51bGw7XG4gIHRoaXMubGFzdFJlc3VsdCA9IG51bGw7XG4gIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgdGhpcy5idWlsZENoaWxkRW52ID0gbnVsbDtcbiAgdGhpcy5tb3JwaExpc3QgPSBudWxsO1xuICB0aGlzLm1vcnBoTWFwID0gbnVsbDtcbiAgdGhpcy5rZXkgPSBudWxsO1xuICB0aGlzLmxpbmtlZFBhcmFtcyA9IG51bGw7XG4gIHRoaXMubGlua2VkUmVzdWx0ID0gbnVsbDtcbiAgdGhpcy5jaGlsZE5vZGVzID0gbnVsbDtcbiAgdGhpcy5yZW5kZXJlZCA9IGZhbHNlO1xuICB0aGlzLmd1aWQgPSBcInJhbmdlXCIgKyBndWlkKys7XG59XG5cbkhUTUxCYXJzTW9ycGguZW1wdHkgPSBmdW5jdGlvbihkb21IZWxwZXIsIGNvbnRleHR1YWxFbGVtZW50KSB7XG4gIHZhciBtb3JwaCA9IG5ldyBIVE1MQmFyc01vcnBoKGRvbUhlbHBlciwgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5jbGVhcigpO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG5IVE1MQmFyc01vcnBoLmNyZWF0ZSA9IGZ1bmN0aW9uIChkb21IZWxwZXIsIGNvbnRleHR1YWxFbGVtZW50LCBub2RlKSB7XG4gIHZhciBtb3JwaCA9IG5ldyBIVE1MQmFyc01vcnBoKGRvbUhlbHBlciwgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5zZXROb2RlKG5vZGUpO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG5IVE1MQmFyc01vcnBoLmF0dGFjaCA9IGZ1bmN0aW9uIChkb21IZWxwZXIsIGNvbnRleHR1YWxFbGVtZW50LCBmaXJzdE5vZGUsIGxhc3ROb2RlKSB7XG4gIHZhciBtb3JwaCA9IG5ldyBIVE1MQmFyc01vcnBoKGRvbUhlbHBlciwgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5zZXRSYW5nZShmaXJzdE5vZGUsIGxhc3ROb2RlKTtcbiAgcmV0dXJuIG1vcnBoO1xufTtcblxudmFyIHByb3RvdHlwZSA9IEhUTUxCYXJzTW9ycGgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShNb3JwaEJhc2UucHJvdG90eXBlKTtcbnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEhUTUxCYXJzTW9ycGg7XG5wcm90b3R5cGUuc3VwZXIkY29uc3RydWN0b3IgPSBNb3JwaEJhc2U7XG5cbmV4cG9ydCBkZWZhdWx0IEhUTUxCYXJzTW9ycGg7XG4iXX0=
define("htmlbars-runtime/node-visitor", ["exports", "../htmlbars-util/morph-utils", "./expression-visitor"], function (exports, _htmlbarsUtilMorphUtils, _expressionVisitor) {

  /**
    Node classification:
  
    # Primary Statement Nodes:
  
    These nodes are responsible for a render node that represents a morph-range.
  
    * block
    * inline
    * content
    * element
    * component
  
    # Leaf Statement Nodes:
  
    This node is responsible for a render node that represents a morph-attr.
  
    * attribute
  */

  function linkParamsAndHash(env, scope, morph, path, params, hash) {
    if (morph.linkedParams) {
      params = morph.linkedParams.params;
      hash = morph.linkedParams.hash;
    } else {
      params = params && _expressionVisitor.acceptParams(params, env, scope);
      hash = hash && _expressionVisitor.acceptHash(hash, env, scope);
    }

    _htmlbarsUtilMorphUtils.linkParams(env, scope, morph, path, params, hash);
    return [params, hash];
  }

  var AlwaysDirtyVisitor = {

    block: function (node, morph, env, scope, template, visitor) {
      var path = node[1];
      var params = node[2];
      var hash = node[3];
      var templateId = node[4];
      var inverseId = node[5];

      var paramsAndHash = linkParamsAndHash(env, scope, morph, path, params, hash);

      morph.isDirty = morph.isSubtreeDirty = false;
      env.hooks.block(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], templateId === null ? null : template.templates[templateId], inverseId === null ? null : template.templates[inverseId], visitor);
    },

    inline: function (node, morph, env, scope, visitor) {
      var path = node[1];
      var params = node[2];
      var hash = node[3];

      var paramsAndHash = linkParamsAndHash(env, scope, morph, path, params, hash);

      morph.isDirty = morph.isSubtreeDirty = false;
      env.hooks.inline(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], visitor);
    },

    content: function (node, morph, env, scope, visitor) {
      var path = node[1];

      morph.isDirty = morph.isSubtreeDirty = false;

      if (isHelper(env, scope, path)) {
        env.hooks.inline(morph, env, scope, path, [], {}, visitor);
        if (morph.linkedResult) {
          _htmlbarsUtilMorphUtils.linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
        }
        return;
      }

      var params = undefined;
      if (morph.linkedParams) {
        params = morph.linkedParams.params;
      } else {
        params = [env.hooks.get(env, scope, path)];
      }

      _htmlbarsUtilMorphUtils.linkParams(env, scope, morph, '@range', params, null);
      env.hooks.range(morph, env, scope, path, params[0], visitor);
    },

    element: function (node, morph, env, scope, visitor) {
      var path = node[1];
      var params = node[2];
      var hash = node[3];

      var paramsAndHash = linkParamsAndHash(env, scope, morph, path, params, hash);

      morph.isDirty = morph.isSubtreeDirty = false;
      env.hooks.element(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], visitor);
    },

    attribute: function (node, morph, env, scope) {
      var name = node[1];
      var value = node[2];

      var paramsAndHash = linkParamsAndHash(env, scope, morph, '@attribute', [value], null);

      morph.isDirty = morph.isSubtreeDirty = false;
      env.hooks.attribute(morph, env, scope, name, paramsAndHash[0][0]);
    },

    component: function (node, morph, env, scope, template, visitor) {
      var path = node[1];
      var attrs = node[2];
      var templateId = node[3];
      var inverseId = node[4];

      var paramsAndHash = linkParamsAndHash(env, scope, morph, path, [], attrs);
      var templates = {
        default: template.templates[templateId],
        inverse: template.templates[inverseId]
      };

      morph.isDirty = morph.isSubtreeDirty = false;
      env.hooks.component(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], templates, visitor);
    },

    attributes: function (node, morph, env, scope, parentMorph, visitor) {
      var template = node[1];

      env.hooks.attributes(morph, env, scope, template, parentMorph, visitor);
    }

  };

  exports.AlwaysDirtyVisitor = AlwaysDirtyVisitor;
  exports.default = {
    block: function (node, morph, env, scope, template, visitor) {
      dirtyCheck(env, morph, visitor, function (visitor) {
        AlwaysDirtyVisitor.block(node, morph, env, scope, template, visitor);
      });
    },

    inline: function (node, morph, env, scope, visitor) {
      dirtyCheck(env, morph, visitor, function (visitor) {
        AlwaysDirtyVisitor.inline(node, morph, env, scope, visitor);
      });
    },

    content: function (node, morph, env, scope, visitor) {
      dirtyCheck(env, morph, visitor, function (visitor) {
        AlwaysDirtyVisitor.content(node, morph, env, scope, visitor);
      });
    },

    element: function (node, morph, env, scope, template, visitor) {
      dirtyCheck(env, morph, visitor, function (visitor) {
        AlwaysDirtyVisitor.element(node, morph, env, scope, template, visitor);
      });
    },

    attribute: function (node, morph, env, scope, template) {
      dirtyCheck(env, morph, null, function () {
        AlwaysDirtyVisitor.attribute(node, morph, env, scope, template);
      });
    },

    component: function (node, morph, env, scope, template, visitor) {
      dirtyCheck(env, morph, visitor, function (visitor) {
        AlwaysDirtyVisitor.component(node, morph, env, scope, template, visitor);
      });
    },

    attributes: function (node, morph, env, scope, parentMorph, visitor) {
      AlwaysDirtyVisitor.attributes(node, morph, env, scope, parentMorph, visitor);
    }
  };

  function dirtyCheck(_env, morph, visitor, callback) {
    var isDirty = morph.isDirty;
    var isSubtreeDirty = morph.isSubtreeDirty;
    var env = _env;

    if (isSubtreeDirty) {
      visitor = AlwaysDirtyVisitor;
    }

    if (isDirty || isSubtreeDirty) {
      callback(visitor);
    } else {
      if (morph.buildChildEnv) {
        env = morph.buildChildEnv(morph.state, env);
      }
      _htmlbarsUtilMorphUtils.validateChildMorphs(env, morph, visitor);
    }
  }

  function isHelper(env, scope, path) {
    return env.hooks.keywords[path] !== undefined || env.hooks.hasHelper(env, scope, path);
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvbm9kZS12aXNpdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1QkEsV0FBUyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtBQUNoRSxRQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7QUFDdEIsWUFBTSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0FBQ25DLFVBQUksR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztLQUNoQyxNQUFNO0FBQ0wsWUFBTSxHQUFHLE1BQU0sSUFBSSxtQkEzQmQsWUFBWSxDQTJCZSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3BELFVBQUksR0FBRyxJQUFJLElBQUksbUJBNUJJLFVBQVUsQ0E0QkgsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM3Qzs7QUFFRCw0QkFoQzRCLFVBQVUsQ0FnQzNCLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEQsV0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztHQUN2Qjs7QUFFTSxNQUFJLGtCQUFrQixHQUFHOztBQUU5QixTQUFLLEVBQUEsVUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRTtVQUN6QyxJQUFJLEdBQXlDLElBQUk7VUFBM0MsTUFBTSxHQUFpQyxJQUFJO1VBQW5DLElBQUksR0FBMkIsSUFBSTtVQUE3QixVQUFVLEdBQWUsSUFBSTtVQUFqQixTQUFTLEdBQUksSUFBSTs7QUFDeEQsVUFBSSxhQUFhLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUs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LEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7T0FDN0M7QUFDRCw4QkE5S0ssbUJBQW1CLENBOEtKLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDMUM7R0FDRjs7QUFFRCxXQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtBQUNsQyxXQUFPLEFBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxJQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDMUYiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9ub2RlLXZpc2l0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2YWxpZGF0ZUNoaWxkTW9ycGhzLCBsaW5rUGFyYW1zIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcbmltcG9ydCB7IGFjY2VwdFBhcmFtcywgYWNjZXB0SGFzaCB9IGZyb20gXCIuL2V4cHJlc3Npb24tdmlzaXRvclwiO1xuXG4vKipcbiAgTm9kZSBjbGFzc2lmaWNhdGlvbjpcblxuICAjIFByaW1hcnkgU3RhdGVtZW50IE5vZGVzOlxuXG4gIFRoZXNlIG5vZGVzIGFyZSByZXNwb25zaWJsZSBmb3IgYSByZW5kZXIgbm9kZSB0aGF0IHJlcHJlc2VudHMgYSBtb3JwaC1yYW5nZS5cblxuICAqIGJsb2NrXG4gICogaW5saW5lXG4gICogY29udGVudFxuICAqIGVsZW1lbnRcbiAgKiBjb21wb25lbnRcblxuICAjIExlYWYgU3RhdGVtZW50IE5vZGVzOlxuXG4gIFRoaXMgbm9kZSBpcyByZXNwb25zaWJsZSBmb3IgYSByZW5kZXIgbm9kZSB0aGF0IHJlcHJlc2VudHMgYSBtb3JwaC1hdHRyLlxuXG4gICogYXR0cmlidXRlXG4qL1xuXG5mdW5jdGlvbiBsaW5rUGFyYW1zQW5kSGFzaChlbnYsIHNjb3BlLCBtb3JwaCwgcGF0aCwgcGFyYW1zLCBoYXNoKSB7XG4gIGlmIChtb3JwaC5saW5rZWRQYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBtb3JwaC5saW5rZWRQYXJhbXMucGFyYW1zO1xuICAgIGhhc2ggPSBtb3JwaC5saW5rZWRQYXJhbXMuaGFzaDtcbiAgfSBlbHNlIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgJiYgYWNjZXB0UGFyYW1zKHBhcmFtcywgZW52LCBzY29wZSk7XG4gICAgaGFzaCA9IGhhc2ggJiYgYWNjZXB0SGFzaChoYXNoLCBlbnYsIHNjb3BlKTtcbiAgfVxuXG4gIGxpbmtQYXJhbXMoZW52LCBzY29wZSwgbW9ycGgsIHBhdGgsIHBhcmFtcywgaGFzaCk7XG4gIHJldHVybiBbcGFyYW1zLCBoYXNoXTtcbn1cblxuZXhwb3J0IGxldCBBbHdheXNEaXJ0eVZpc2l0b3IgPSB7XG5cbiAgYmxvY2sobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCB2aXNpdG9yKSB7XG4gICAgbGV0IFssIHBhdGgsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGVJZCwgaW52ZXJzZUlkXSA9IG5vZGU7XG4gICAgbGV0IHBhcmFtc0FuZEhhc2ggPSBsaW5rUGFyYW1zQW5kSGFzaChlbnYsIHNjb3BlLCBtb3JwaCwgcGF0aCwgcGFyYW1zLCBoYXNoKTtcblxuICAgIG1vcnBoLmlzRGlydHkgPSBtb3JwaC5pc1N1YnRyZWVEaXJ0eSA9IGZhbHNlO1xuICAgIGVudi5ob29rcy5ibG9jayhtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zQW5kSGFzaFswXSwgcGFyYW1zQW5kSGFzaFsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlSWQgPT09IG51bGwgPyBudWxsIDogdGVtcGxhdGUudGVtcGxhdGVzW3RlbXBsYXRlSWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52ZXJzZUlkID09PSBudWxsID8gbnVsbCA6IHRlbXBsYXRlLnRlbXBsYXRlc1tpbnZlcnNlSWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRvcik7XG4gIH0sXG5cbiAgaW5saW5lKG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yKSB7XG4gICAgbGV0IFssIHBhdGgsIHBhcmFtcywgaGFzaF0gPSBub2RlO1xuICAgIGxldCBwYXJhbXNBbmRIYXNoID0gbGlua1BhcmFtc0FuZEhhc2goZW52LCBzY29wZSwgbW9ycGgsIHBhdGgsIHBhcmFtcywgaGFzaCk7XG5cbiAgICBtb3JwaC5pc0RpcnR5ID0gbW9ycGguaXNTdWJ0cmVlRGlydHkgPSBmYWxzZTtcbiAgICBlbnYuaG9va3MuaW5saW5lKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBwYXJhbXNBbmRIYXNoWzBdLCBwYXJhbXNBbmRIYXNoWzFdLCB2aXNpdG9yKTtcbiAgfSxcblxuICBjb250ZW50KG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yKSB7XG4gICAgbGV0IFssIHBhdGhdID0gbm9kZTtcblxuICAgIG1vcnBoLmlzRGlydHkgPSBtb3JwaC5pc1N1YnRyZWVEaXJ0eSA9IGZhbHNlO1xuXG4gICAgaWYgKGlzSGVscGVyKGVudiwgc2NvcGUsIHBhdGgpKSB7XG4gICAgICBlbnYuaG9va3MuaW5saW5lKG1vcnBoLCBlbnYsIHNjb3BlLCBwYXRoLCBbXSwge30sIHZpc2l0b3IpO1xuICAgICAgaWYgKG1vcnBoLmxpbmtlZFJlc3VsdCkge1xuICAgICAgICBsaW5rUGFyYW1zKGVudiwgc2NvcGUsIG1vcnBoLCAnQGNvbnRlbnQtaGVscGVyJywgW21vcnBoLmxpbmtlZFJlc3VsdF0sIG51bGwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBwYXJhbXM7XG4gICAgaWYgKG1vcnBoLmxpbmtlZFBhcmFtcykge1xuICAgICAgcGFyYW1zID0gbW9ycGgubGlua2VkUGFyYW1zLnBhcmFtcztcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zID0gW2Vudi5ob29rcy5nZXQoZW52LCBzY29wZSwgcGF0aCldO1xuICAgIH1cblxuICAgIGxpbmtQYXJhbXMoZW52LCBzY29wZSwgbW9ycGgsICdAcmFuZ2UnLCBwYXJhbXMsIG51bGwpO1xuICAgIGVudi5ob29rcy5yYW5nZShtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zWzBdLCB2aXNpdG9yKTtcbiAgfSxcblxuICBlbGVtZW50KG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yKSB7XG4gICAgbGV0IFssIHBhdGgsIHBhcmFtcywgaGFzaF0gPSBub2RlO1xuICAgIGxldCBwYXJhbXNBbmRIYXNoID0gbGlua1BhcmFtc0FuZEhhc2goZW52LCBzY29wZSwgbW9ycGgsIHBhdGgsIHBhcmFtcywgaGFzaCk7XG5cbiAgICBtb3JwaC5pc0RpcnR5ID0gbW9ycGguaXNTdWJ0cmVlRGlydHkgPSBmYWxzZTtcbiAgICBlbnYuaG9va3MuZWxlbWVudChtb3JwaCwgZW52LCBzY29wZSwgcGF0aCwgcGFyYW1zQW5kSGFzaFswXSwgcGFyYW1zQW5kSGFzaFsxXSwgdmlzaXRvcik7XG4gIH0sXG5cbiAgYXR0cmlidXRlKG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlKSB7XG4gICAgbGV0IFssIG5hbWUsIHZhbHVlXSA9IG5vZGU7XG4gICAgbGV0IHBhcmFtc0FuZEhhc2ggPSBsaW5rUGFyYW1zQW5kSGFzaChlbnYsIHNjb3BlLCBtb3JwaCwgJ0BhdHRyaWJ1dGUnLCBbdmFsdWVdLCBudWxsKTtcblxuICAgIG1vcnBoLmlzRGlydHkgPSBtb3JwaC5pc1N1YnRyZWVEaXJ0eSA9IGZhbHNlO1xuICAgIGVudi5ob29rcy5hdHRyaWJ1dGUobW9ycGgsIGVudiwgc2NvcGUsIG5hbWUsIHBhcmFtc0FuZEhhc2hbMF1bMF0pO1xuICB9LFxuXG4gIGNvbXBvbmVudChub2RlLCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIHZpc2l0b3IpIHtcbiAgICBsZXQgWywgcGF0aCwgYXR0cnMsIHRlbXBsYXRlSWQsIGludmVyc2VJZF0gPSBub2RlO1xuICAgIGxldCBwYXJhbXNBbmRIYXNoID0gbGlua1BhcmFtc0FuZEhhc2goZW52LCBzY29wZSwgbW9ycGgsIHBhdGgsIFtdLCBhdHRycyk7XG4gICAgbGV0IHRlbXBsYXRlcyA9IHtcbiAgICAgIGRlZmF1bHQ6IHRlbXBsYXRlLnRlbXBsYXRlc1t0ZW1wbGF0ZUlkXSxcbiAgICAgIGludmVyc2U6IHRlbXBsYXRlLnRlbXBsYXRlc1tpbnZlcnNlSWRdXG4gICAgfTtcblxuICAgIG1vcnBoLmlzRGlydHkgPSBtb3JwaC5pc1N1YnRyZWVEaXJ0eSA9IGZhbHNlO1xuICAgIGVudi5ob29rcy5jb21wb25lbnQobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtc0FuZEhhc2hbMF0sIHBhcmFtc0FuZEhhc2hbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZXMsIHZpc2l0b3IpO1xuICB9LFxuXG4gIGF0dHJpYnV0ZXMobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHBhcmVudE1vcnBoLCB2aXNpdG9yKSB7XG4gICAgbGV0IFssIHRlbXBsYXRlXSA9IG5vZGU7XG4gICAgZW52Lmhvb2tzLmF0dHJpYnV0ZXMobW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCBwYXJlbnRNb3JwaCwgdmlzaXRvcik7XG4gIH1cblxufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBibG9jayhub2RlLCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIHZpc2l0b3IpIHtcbiAgICBkaXJ0eUNoZWNrKGVudiwgbW9ycGgsIHZpc2l0b3IsIHZpc2l0b3IgPT4ge1xuICAgICAgQWx3YXlzRGlydHlWaXNpdG9yLmJsb2NrKG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB0ZW1wbGF0ZSwgdmlzaXRvcik7XG4gICAgfSk7XG4gIH0sXG5cbiAgaW5saW5lKG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yKSB7XG4gICAgZGlydHlDaGVjayhlbnYsIG1vcnBoLCB2aXNpdG9yLCB2aXNpdG9yID0+IHtcbiAgICAgIEFsd2F5c0RpcnR5VmlzaXRvci5pbmxpbmUobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IpO1xuICAgIH0pO1xuICB9LFxuXG4gIGNvbnRlbnQobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IpIHtcbiAgICBkaXJ0eUNoZWNrKGVudiwgbW9ycGgsIHZpc2l0b3IsIHZpc2l0b3IgPT4ge1xuICAgICAgQWx3YXlzRGlydHlWaXNpdG9yLmNvbnRlbnQobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IpO1xuICAgIH0pO1xuICB9LFxuXG4gIGVsZW1lbnQobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCB2aXNpdG9yKSB7XG4gICAgZGlydHlDaGVjayhlbnYsIG1vcnBoLCB2aXNpdG9yLCB2aXNpdG9yID0+IHtcbiAgICAgIEFsd2F5c0RpcnR5VmlzaXRvci5lbGVtZW50KG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB0ZW1wbGF0ZSwgdmlzaXRvcik7XG4gICAgfSk7XG4gIH0sXG5cbiAgYXR0cmlidXRlKG5vZGUsIG1vcnBoLCBlbnYsIHNjb3BlLCB0ZW1wbGF0ZSkge1xuICAgIGRpcnR5Q2hlY2soZW52LCBtb3JwaCwgbnVsbCwgKCkgPT4ge1xuICAgICAgQWx3YXlzRGlydHlWaXNpdG9yLmF0dHJpYnV0ZShub2RlLCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUpO1xuICAgIH0pO1xuICB9LFxuXG4gIGNvbXBvbmVudChub2RlLCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIHZpc2l0b3IpIHtcbiAgICBkaXJ0eUNoZWNrKGVudiwgbW9ycGgsIHZpc2l0b3IsIHZpc2l0b3IgPT4ge1xuICAgICAgQWx3YXlzRGlydHlWaXNpdG9yLmNvbXBvbmVudChub2RlLCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIHZpc2l0b3IpO1xuICAgIH0pO1xuICB9LFxuXG4gIGF0dHJpYnV0ZXMobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHBhcmVudE1vcnBoLCB2aXNpdG9yKSB7XG4gICAgQWx3YXlzRGlydHlWaXNpdG9yLmF0dHJpYnV0ZXMobm9kZSwgbW9ycGgsIGVudiwgc2NvcGUsIHBhcmVudE1vcnBoLCB2aXNpdG9yKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZGlydHlDaGVjayhfZW52LCBtb3JwaCwgdmlzaXRvciwgY2FsbGJhY2spIHtcbiAgdmFyIGlzRGlydHkgPSBtb3JwaC5pc0RpcnR5O1xuICB2YXIgaXNTdWJ0cmVlRGlydHkgPSBtb3JwaC5pc1N1YnRyZWVEaXJ0eTtcbiAgdmFyIGVudiA9IF9lbnY7XG5cbiAgaWYgKGlzU3VidHJlZURpcnR5KSB7XG4gICAgdmlzaXRvciA9IEFsd2F5c0RpcnR5VmlzaXRvcjtcbiAgfVxuXG4gIGlmIChpc0RpcnR5IHx8IGlzU3VidHJlZURpcnR5KSB7XG4gICAgY2FsbGJhY2sodmlzaXRvcik7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG1vcnBoLmJ1aWxkQ2hpbGRFbnYpIHtcbiAgICAgIGVudiA9IG1vcnBoLmJ1aWxkQ2hpbGRFbnYobW9ycGguc3RhdGUsIGVudik7XG4gICAgfVxuICAgIHZhbGlkYXRlQ2hpbGRNb3JwaHMoZW52LCBtb3JwaCwgdmlzaXRvcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNIZWxwZXIoZW52LCBzY29wZSwgcGF0aCkge1xuICByZXR1cm4gKGVudi5ob29rcy5rZXl3b3Jkc1twYXRoXSAhPT0gdW5kZWZpbmVkKSB8fCBlbnYuaG9va3MuaGFzSGVscGVyKGVudiwgc2NvcGUsIHBhdGgpO1xufVxuIl19
define("htmlbars-runtime/render", ["exports", "../htmlbars-util/array-utils", "../htmlbars-util/morph-utils", "./node-visitor", "./morph", "../htmlbars-util/template-utils", "../htmlbars-util/void-tag-names"], function (exports, _htmlbarsUtilArrayUtils, _htmlbarsUtilMorphUtils, _nodeVisitor, _morph, _htmlbarsUtilTemplateUtils, _htmlbarsUtilVoidTagNames) {
  exports.default = render;
  exports.manualElement = manualElement;
  exports.attachAttributes = attachAttributes;
  exports.createChildMorph = createChildMorph;
  exports.getCachedFragment = getCachedFragment;

  var svgNamespace = "http://www.w3.org/2000/svg";

  function render(template, env, scope, options) {
    var dom = env.dom;
    var contextualElement;

    if (options) {
      if (options.renderNode) {
        contextualElement = options.renderNode.contextualElement;
      } else if (options.contextualElement) {
        contextualElement = options.contextualElement;
      }
    }

    dom.detectNamespace(contextualElement);

    var renderResult = RenderResult.build(env, scope, template, options, contextualElement);
    renderResult.render();

    return renderResult;
  }

  function RenderResult(env, scope, options, rootNode, ownerNode, nodes, fragment, template, shouldSetContent) {
    this.root = rootNode;
    this.fragment = fragment;

    this.nodes = nodes;
    this.template = template;
    this.statements = template.statements.slice();
    this.env = env;
    this.scope = scope;
    this.shouldSetContent = shouldSetContent;

    this.bindScope();

    if (options.self !== undefined) {
      this.bindSelf(options.self);
    }
    if (options.blockArguments !== undefined) {
      this.bindLocals(options.blockArguments);
    }

    this.initializeNodes(ownerNode);
  }

  RenderResult.build = function (env, scope, template, options, contextualElement) {
    var dom = env.dom;
    var fragment = getCachedFragment(template, env);
    var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

    var rootNode, ownerNode, shouldSetContent;

    if (options && options.renderNode) {
      rootNode = options.renderNode;
      ownerNode = rootNode.ownerNode;
      shouldSetContent = true;
    } else {
      rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
      ownerNode = rootNode;
      initializeNode(rootNode, ownerNode);
      shouldSetContent = false;
    }

    if (rootNode.childNodes) {
      _htmlbarsUtilMorphUtils.visitChildren(rootNode.childNodes, function (node) {
        _htmlbarsUtilTemplateUtils.clearMorph(node, env, true);
      });
    }

    rootNode.childNodes = nodes;
    return new RenderResult(env, scope, options, rootNode, ownerNode, nodes, fragment, template, shouldSetContent);
  };

  function manualElement(tagName, attributes, _isEmpty) {
    var statements = [];

    for (var key in attributes) {
      if (typeof attributes[key] === 'string') {
        continue;
      }
      statements.push(["attribute", key, attributes[key]]);
    }

    var isEmpty = _isEmpty || _htmlbarsUtilVoidTagNames.default[tagName];

    if (!isEmpty) {
      statements.push(['content', 'yield']);
    }

    var template = {
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        if (tagName === 'svg') {
          dom.setNamespace(svgNamespace);
        }
        var el1 = dom.createElement(tagName);

        for (var key in attributes) {
          if (typeof attributes[key] !== 'string') {
            continue;
          }
          dom.setAttribute(el1, key, attributes[key]);
        }

        if (!isEmpty) {
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
        }

        dom.appendChild(el0, el1);

        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment) {
        var element = dom.childAt(fragment, [0]);
        var morphs = [];

        for (var key in attributes) {
          if (typeof attributes[key] === 'string') {
            continue;
          }
          morphs.push(dom.createAttrMorph(element, key));
        }

        if (!isEmpty) {
          morphs.push(dom.createMorphAt(element, 0, 0));
        }

        return morphs;
      },
      statements: statements,
      locals: [],
      templates: []
    };

    return template;
  }

  function attachAttributes(attributes) {
    var statements = [];

    for (var key in attributes) {
      if (typeof attributes[key] === 'string') {
        continue;
      }
      statements.push(["attribute", key, attributes[key]]);
    }

    var template = {
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = this.element;
        if (el0.namespaceURI === "http://www.w3.org/2000/svg") {
          dom.setNamespace(svgNamespace);
        }
        for (var key in attributes) {
          if (typeof attributes[key] !== 'string') {
            continue;
          }
          dom.setAttribute(el0, key, attributes[key]);
        }

        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom) {
        var element = this.element;
        var morphs = [];

        for (var key in attributes) {
          if (typeof attributes[key] === 'string') {
            continue;
          }
          morphs.push(dom.createAttrMorph(element, key));
        }

        return morphs;
      },
      statements: statements,
      locals: [],
      templates: [],
      element: null
    };

    return template;
  }

  RenderResult.prototype.initializeNodes = function (ownerNode) {
    _htmlbarsUtilArrayUtils.forEach(this.root.childNodes, function (node) {
      initializeNode(node, ownerNode);
    });
  };

  RenderResult.prototype.render = function () {
    this.root.lastResult = this;
    this.root.rendered = true;
    this.populateNodes(_nodeVisitor.AlwaysDirtyVisitor);

    if (this.shouldSetContent && this.root.setContent) {
      this.root.setContent(this.fragment);
    }
  };

  RenderResult.prototype.dirty = function () {
    _htmlbarsUtilMorphUtils.visitChildren([this.root], function (node) {
      node.isDirty = true;
    });
  };

  RenderResult.prototype.revalidate = function (env, self, blockArguments, scope) {
    this.revalidateWith(env, scope, self, blockArguments, _nodeVisitor.default);
  };

  RenderResult.prototype.rerender = function (env, self, blockArguments, scope) {
    this.revalidateWith(env, scope, self, blockArguments, _nodeVisitor.AlwaysDirtyVisitor);
  };

  RenderResult.prototype.revalidateWith = function (env, scope, self, blockArguments, visitor) {
    if (env !== undefined) {
      this.env = env;
    }
    if (scope !== undefined) {
      this.scope = scope;
    }
    this.updateScope();

    if (self !== undefined) {
      this.updateSelf(self);
    }
    if (blockArguments !== undefined) {
      this.updateLocals(blockArguments);
    }

    this.populateNodes(visitor);
  };

  RenderResult.prototype.destroy = function () {
    var rootNode = this.root;
    _htmlbarsUtilTemplateUtils.clearMorph(rootNode, this.env, true);
  };

  RenderResult.prototype.populateNodes = function (visitor) {
    var env = this.env;
    var scope = this.scope;
    var template = this.template;
    var nodes = this.nodes;
    var statements = this.statements;
    var i, l;

    for (i = 0, l = statements.length; i < l; i++) {
      var statement = statements[i];
      var morph = nodes[i];

      if (env.hooks.willRenderNode) {
        env.hooks.willRenderNode(morph, env, scope);
      }

      switch (statement[0]) {
        case 'block':
          visitor.block(statement, morph, env, scope, template, visitor);break;
        case 'inline':
          visitor.inline(statement, morph, env, scope, visitor);break;
        case 'content':
          visitor.content(statement, morph, env, scope, visitor);break;
        case 'element':
          visitor.element(statement, morph, env, scope, template, visitor);break;
        case 'attribute':
          visitor.attribute(statement, morph, env, scope);break;
        case 'component':
          visitor.component(statement, morph, env, scope, template, visitor);break;
      }

      if (env.hooks.didRenderNode) {
        env.hooks.didRenderNode(morph, env, scope);
      }
    }
  };

  RenderResult.prototype.bindScope = function () {
    this.env.hooks.bindScope(this.env, this.scope);
  };

  RenderResult.prototype.updateScope = function () {
    this.env.hooks.updateScope(this.env, this.scope);
  };

  RenderResult.prototype.bindSelf = function (self) {
    this.env.hooks.bindSelf(this.env, this.scope, self);
  };

  RenderResult.prototype.updateSelf = function (self) {
    this.env.hooks.updateSelf(this.env, this.scope, self);
  };

  RenderResult.prototype.bindLocals = function (blockArguments) {
    var localNames = this.template.locals;

    for (var i = 0, l = localNames.length; i < l; i++) {
      this.env.hooks.bindLocal(this.env, this.scope, localNames[i], blockArguments[i]);
    }
  };

  RenderResult.prototype.updateLocals = function (blockArguments) {
    var localNames = this.template.locals;

    for (var i = 0, l = localNames.length; i < l; i++) {
      this.env.hooks.updateLocal(this.env, this.scope, localNames[i], blockArguments[i]);
    }
  };

  function initializeNode(node, owner) {
    node.ownerNode = owner;
  }

  function createChildMorph(dom, parentMorph, contextualElement) {
    var morph = _morph.default.empty(dom, contextualElement || parentMorph.contextualElement);
    initializeNode(morph, parentMorph.ownerNode);
    return morph;
  }

  function getCachedFragment(template, env) {
    var dom = env.dom,
        fragment;
    if (env.useFragmentCache && dom.canClone) {
      if (template.cachedFragment === null) {
        fragment = template.buildFragment(dom);
        if (template.hasRendered) {
          template.cachedFragment = fragment;
        } else {
          template.hasRendered = true;
        }
      }
      if (template.cachedFragment) {
        fragment = dom.cloneNode(template.cachedFragment, true);
      }
    } else if (!fragment) {
      fragment = template.buildFragment(dom);
    }

    return fragment;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvcmVuZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7b0JBVXdCLE1BQU07Ozs7OztBQUY5QixNQUFJLFlBQVksR0FBRyw0QkFBNEIsQ0FBQzs7QUFFakMsV0FBUyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQzVELFFBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDbEIsUUFBSSxpQkFBaUIsQ0FBQzs7QUFFdEIsUUFBSSxPQUFPLEVBQUU7QUFDWCxVQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7QUFDdEIseUJBQWlCLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztPQUMxRCxNQUFNLElBQUksT0FBTyxDQUFDLGlCQUFpQixFQUFFO0FBQ3BDLHlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztPQUMvQztLQUNGOztBQUVELE9BQUcsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs7QUFFdkMsUUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUN4RixnQkFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDOztBQUV0QixXQUFPLFlBQVksQ0FBQztHQUNyQjs7QUFFRCxXQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFO0FBQzNHLFFBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO0FBQ3JCLFFBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDOztBQUV6QixRQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNuQixRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUN6QixRQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDOUMsUUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFDZixRQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNuQixRQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7O0FBRXpDLFFBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzs7QUFFakIsUUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUFFLFVBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQUU7QUFDaEUsUUFBSSxPQUFPLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRTtBQUFFLFVBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0tBQUU7O0FBRXRGLFFBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7R0FDakM7O0FBRUQsY0FBWSxDQUFDLEtBQUssR0FBRyxVQUFTLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRTtBQUM5RSxRQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQ2xCLFFBQUksUUFBUSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNoRCxRQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDOztBQUV4RSxRQUFJLFFBQVEsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUM7O0FBRTFDLFFBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7QUFDakMsY0FBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7QUFDOUIsZUFBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7QUFDL0Isc0JBQWdCLEdBQUcsSUFBSSxDQUFDO0tBQ3pCLE1BQU07QUFDTCxjQUFRLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFDN0YsZUFBUyxHQUFHLFFBQVEsQ0FBQztBQUNyQixvQkFBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNwQyxzQkFBZ0IsR0FBRyxLQUFLLENBQUM7S0FDMUI7O0FBRUQsUUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFO0FBQ3ZCLDhCQW5FSyxhQUFhLENBbUVKLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBUyxJQUFJLEVBQUU7QUFDaEQsbUNBaEVHLFVBQVUsQ0FnRUYsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztPQUM3QixDQUFDLENBQUM7S0FDSjs7QUFFRCxZQUFRLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztBQUM1QixXQUFPLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztHQUNoSCxDQUFDOztBQUVLLFdBQVMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO0FBQzNELFFBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQzs7QUFFcEIsU0FBSyxJQUFJLEdBQUcsSUFBSSxVQUFVLEVBQUU7QUFDMUIsVUFBSSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFBRSxpQkFBUztPQUFFO0FBQ3RELGdCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3REOztBQUVELFFBQUksT0FBTyxHQUFHLFFBQVEsSUFBSSxrQ0FBUSxPQUFPLENBQUMsQ0FBQzs7QUFFM0MsUUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNaLGdCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDdkM7O0FBRUQsUUFBSSxRQUFRLEdBQUc7QUFDYixXQUFLLEVBQUUsQ0FBQztBQUNSLG9CQUFjLEVBQUUsSUFBSTtBQUNwQixpQkFBVyxFQUFFLEtBQUs7QUFDbEIsbUJBQWEsRUFBRSxTQUFTLGFBQWEsQ0FBQyxHQUFHLEVBQUU7QUFDekMsWUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUM7QUFDdkMsWUFBSSxPQUFPLEtBQUssS0FBSyxFQUFFO0FBQ3JCLGFBQUcsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDaEM7QUFDRCxZQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVyQyxhQUFLLElBQUksR0FBRyxJQUFJLFVBQVUsRUFBRTtBQUMxQixjQUFJLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsRUFBRTtBQUFFLHFCQUFTO1dBQUU7QUFDdEQsYUFBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzdDOztBQUVELFlBQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixjQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2hDLGFBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzNCOztBQUVELFdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDOztBQUUxQixlQUFPLEdBQUcsQ0FBQztPQUNaO0FBQ0Qsc0JBQWdCLEVBQUUsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFO0FBQ3pELFlBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxZQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRWhCLGFBQUssSUFBSSxHQUFHLElBQUksVUFBVSxFQUFFO0FBQzFCLGNBQUksT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxFQUFFO0FBQUUscUJBQVM7V0FBRTtBQUN0RCxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2hEOztBQUVELFlBQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQzs7QUFFRCxlQUFPLE1BQU0sQ0FBQztPQUNmO0FBQ0QsZ0JBQVUsRUFBRSxVQUFVO0FBQ3RCLFlBQU0sRUFBRSxFQUFFO0FBQ1YsZUFBUyxFQUFFLEVBQUU7S0FDZCxDQUFDOztBQUVGLFdBQU8sUUFBUSxDQUFDO0dBQ2pCOztBQUVNLFdBQVMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFO0FBQzNDLFFBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQzs7QUFFcEIsU0FBSyxJQUFJLEdBQUcsSUFBSSxVQUFVLEVBQUU7QUFDMUIsVUFBSSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFBRSxpQkFBUztPQUFFO0FBQ3RELGdCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3REOztBQUVELFFBQUksUUFBUSxHQUFHO0FBQ2IsV0FBSyxFQUFFLENBQUM7QUFDUixvQkFBYyxFQUFFLElBQUk7QUFDcEIsaUJBQVcsRUFBRSxLQUFLO0FBQ2xCLG1CQUFhLEVBQUUsU0FBUyxhQUFhLENBQUMsR0FBRyxFQUFFO0FBQ3pDLFlBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDdkIsWUFBSSxHQUFHLENBQUMsWUFBWSxLQUFLLDRCQUE0QixFQUFFO0FBQ3JELGFBQUcsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDaEM7QUFDRCxhQUFLLElBQUksR0FBRyxJQUFJLFVBQVUsRUFBRTtBQUMxQixjQUFJLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsRUFBRTtBQUFFLHFCQUFTO1dBQUU7QUFDdEQsYUFBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzdDOztBQUVELGVBQU8sR0FBRyxDQUFDO09BQ1o7QUFDRCxzQkFBZ0IsRUFBRSxTQUFTLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtBQUMvQyxZQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQzNCLFlBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsYUFBSyxJQUFJLEdBQUcsSUFBSSxVQUFVLEVBQUU7QUFDMUIsY0FBSSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFBRSxxQkFBUztXQUFFO0FBQ3RELGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDaEQ7O0FBRUQsZUFBTyxNQUFNLENBQUM7T0FDZjtBQUNELGdCQUFVLEVBQUUsVUFBVTtBQUN0QixZQUFNLEVBQUUsRUFBRTtBQUNWLGVBQVMsRUFBRSxFQUFFO0FBQ2IsYUFBTyxFQUFFLElBQUk7S0FDZCxDQUFDOztBQUVGLFdBQU8sUUFBUSxDQUFDO0dBQ2pCOztBQUVELGNBQVksQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFHLFVBQVMsU0FBUyxFQUFFO0FBQzNELDRCQXhMTyxPQUFPLENBd0xOLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQzNDLG9CQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0tBQ2pDLENBQUMsQ0FBQztHQUNKLENBQUM7O0FBRUYsY0FBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBVztBQUN6QyxRQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDNUIsUUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBQzFCLFFBQUksQ0FBQyxhQUFhLGNBN0xYLGtCQUFrQixDQTZMYSxDQUFDOztBQUV2QyxRQUFJLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNqRCxVQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDckM7R0FDRixDQUFDOztBQUVGLGNBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVc7QUFDeEMsNEJBdk1PLGFBQWEsQ0F1TU4sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBUyxJQUFJLEVBQUU7QUFBRSxVQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztLQUFFLENBQUMsQ0FBQztHQUNyRSxDQUFDOztBQUVGLGNBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVMsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO0FBQzdFLFFBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsY0FBYyx1QkFBb0IsQ0FBQztHQUMxRSxDQUFDOztBQUVGLGNBQVksQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFVBQVMsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO0FBQzNFLFFBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsY0FBYyxlQTdNN0Msa0JBQWtCLENBNk1nRCxDQUFDO0dBQzNFLENBQUM7O0FBRUYsY0FBWSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsVUFBUyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFO0FBQzFGLFFBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtBQUFFLFVBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0tBQUU7QUFDMUMsUUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO0FBQUUsVUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7S0FBRTtBQUNoRCxRQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7O0FBRW5CLFFBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUFFLFVBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7S0FBRTtBQUNsRCxRQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7QUFBRSxVQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0tBQUU7O0FBRXhFLFFBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDN0IsQ0FBQzs7QUFFRixjQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFXO0FBQzFDLFFBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDekIsK0JBM05PLFVBQVUsQ0EyTk4sUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDdEMsQ0FBQzs7QUFFRixjQUFZLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBRyxVQUFTLE9BQU8sRUFBRTtBQUN2RCxRQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ25CLFFBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDdkIsUUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUM3QixRQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ3ZCLFFBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDakMsUUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDOztBQUVULFNBQUssQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLFVBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixVQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXJCLFVBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUU7QUFDNUIsV0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztPQUM3Qzs7QUFFRCxjQUFRLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsYUFBSyxPQUFPO0FBQUUsaUJBQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxBQUFDLE1BQU07QUFBQSxBQUNwRixhQUFLLFFBQVE7QUFBRSxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQUFBQyxNQUFNO0FBQUEsQUFDNUUsYUFBSyxTQUFTO0FBQUUsaUJBQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEFBQUMsTUFBTTtBQUFBLEFBQzlFLGFBQUssU0FBUztBQUFFLGlCQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQUFBQyxNQUFNO0FBQUEsQUFDeEYsYUFBSyxXQUFXO0FBQUUsaUJBQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQUFBQyxNQUFNO0FBQUEsQUFDekUsYUFBSyxXQUFXO0FBQUUsaUJBQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxBQUFDLE1BQU07QUFBQSxPQUM3Rjs7QUFFRCxVQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFO0FBQzNCLFdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDNUM7S0FDRjtHQUNGLENBQUM7O0FBRUYsY0FBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsWUFBVztBQUM1QyxRQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDaEQsQ0FBQzs7QUFFRixjQUFZLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxZQUFXO0FBQzlDLFFBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUNsRCxDQUFDOztBQUVGLGNBQVksQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFVBQVMsSUFBSSxFQUFFO0FBQy9DLFFBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDckQsQ0FBQzs7QUFFRixjQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFTLElBQUksRUFBRTtBQUNqRCxRQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0dBQ3ZELENBQUM7O0FBRUYsY0FBWSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsVUFBUyxjQUFjLEVBQUU7QUFDM0QsUUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7O0FBRXRDLFNBQUssSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDM0MsVUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEY7R0FDRixDQUFDOztBQUVGLGNBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVMsY0FBYyxFQUFFO0FBQzdELFFBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDOztBQUV0QyxTQUFLLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzNDLFVBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3BGO0dBQ0YsQ0FBQzs7QUFFRixXQUFTLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQ25DLFFBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0dBQ3hCOztBQUVNLFdBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRTtBQUNwRSxRQUFJLEtBQUssR0FBRyxlQUFNLEtBQUssQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLElBQUksV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakYsa0JBQWMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdDLFdBQU8sS0FBSyxDQUFDO0dBQ2Q7O0FBRU0sV0FBUyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0FBQy9DLFFBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHO1FBQUUsUUFBUSxDQUFDO0FBQzVCLFFBQUksR0FBRyxDQUFDLGdCQUFnQixJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7QUFDeEMsVUFBSSxRQUFRLENBQUMsY0FBYyxLQUFLLElBQUksRUFBRTtBQUNwQyxnQkFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkMsWUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFO0FBQ3hCLGtCQUFRLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztTQUNwQyxNQUFNO0FBQ0wsa0JBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1NBQzdCO09BQ0Y7QUFDRCxVQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUU7QUFDM0IsZ0JBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7T0FDekQ7S0FDRixNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDcEIsY0FBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDeEM7O0FBRUQsV0FBTyxRQUFRLENBQUM7R0FDakIiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9yZW5kZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JFYWNoIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvYXJyYXktdXRpbHNcIjtcbmltcG9ydCB7IHZpc2l0Q2hpbGRyZW4gfSBmcm9tIFwiLi4vaHRtbGJhcnMtdXRpbC9tb3JwaC11dGlsc1wiO1xuaW1wb3J0IEV4cHJlc3Npb25WaXNpdG9yIGZyb20gXCIuL25vZGUtdmlzaXRvclwiO1xuaW1wb3J0IHsgQWx3YXlzRGlydHlWaXNpdG9yIH0gZnJvbSBcIi4vbm9kZS12aXNpdG9yXCI7XG5pbXBvcnQgTW9ycGggZnJvbSBcIi4vbW9ycGhcIjtcbmltcG9ydCB7IGNsZWFyTW9ycGggfSBmcm9tIFwiLi4vaHRtbGJhcnMtdXRpbC90ZW1wbGF0ZS11dGlsc1wiO1xuaW1wb3J0IHZvaWRNYXAgZnJvbSAnLi4vaHRtbGJhcnMtdXRpbC92b2lkLXRhZy1uYW1lcyc7XG5cbnZhciBzdmdOYW1lc3BhY2UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlbmRlcih0ZW1wbGF0ZSwgZW52LCBzY29wZSwgb3B0aW9ucykge1xuICB2YXIgZG9tID0gZW52LmRvbTtcbiAgdmFyIGNvbnRleHR1YWxFbGVtZW50O1xuXG4gIGlmIChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMucmVuZGVyTm9kZSkge1xuICAgICAgY29udGV4dHVhbEVsZW1lbnQgPSBvcHRpb25zLnJlbmRlck5vZGUuY29udGV4dHVhbEVsZW1lbnQ7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnRleHR1YWxFbGVtZW50KSB7XG4gICAgICBjb250ZXh0dWFsRWxlbWVudCA9IG9wdGlvbnMuY29udGV4dHVhbEVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgZG9tLmRldGVjdE5hbWVzcGFjZShjb250ZXh0dWFsRWxlbWVudCk7XG5cbiAgdmFyIHJlbmRlclJlc3VsdCA9IFJlbmRlclJlc3VsdC5idWlsZChlbnYsIHNjb3BlLCB0ZW1wbGF0ZSwgb3B0aW9ucywgY29udGV4dHVhbEVsZW1lbnQpO1xuICByZW5kZXJSZXN1bHQucmVuZGVyKCk7XG5cbiAgcmV0dXJuIHJlbmRlclJlc3VsdDtcbn1cblxuZnVuY3Rpb24gUmVuZGVyUmVzdWx0KGVudiwgc2NvcGUsIG9wdGlvbnMsIHJvb3ROb2RlLCBvd25lck5vZGUsIG5vZGVzLCBmcmFnbWVudCwgdGVtcGxhdGUsIHNob3VsZFNldENvbnRlbnQpIHtcbiAgdGhpcy5yb290ID0gcm9vdE5vZGU7XG4gIHRoaXMuZnJhZ21lbnQgPSBmcmFnbWVudDtcblxuICB0aGlzLm5vZGVzID0gbm9kZXM7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgdGhpcy5zdGF0ZW1lbnRzID0gdGVtcGxhdGUuc3RhdGVtZW50cy5zbGljZSgpO1xuICB0aGlzLmVudiA9IGVudjtcbiAgdGhpcy5zY29wZSA9IHNjb3BlO1xuICB0aGlzLnNob3VsZFNldENvbnRlbnQgPSBzaG91bGRTZXRDb250ZW50O1xuXG4gIHRoaXMuYmluZFNjb3BlKCk7XG5cbiAgaWYgKG9wdGlvbnMuc2VsZiAhPT0gdW5kZWZpbmVkKSB7IHRoaXMuYmluZFNlbGYob3B0aW9ucy5zZWxmKTsgfVxuICBpZiAob3B0aW9ucy5ibG9ja0FyZ3VtZW50cyAhPT0gdW5kZWZpbmVkKSB7IHRoaXMuYmluZExvY2FscyhvcHRpb25zLmJsb2NrQXJndW1lbnRzKTsgfVxuXG4gIHRoaXMuaW5pdGlhbGl6ZU5vZGVzKG93bmVyTm9kZSk7XG59XG5cblJlbmRlclJlc3VsdC5idWlsZCA9IGZ1bmN0aW9uKGVudiwgc2NvcGUsIHRlbXBsYXRlLCBvcHRpb25zLCBjb250ZXh0dWFsRWxlbWVudCkge1xuICB2YXIgZG9tID0gZW52LmRvbTtcbiAgdmFyIGZyYWdtZW50ID0gZ2V0Q2FjaGVkRnJhZ21lbnQodGVtcGxhdGUsIGVudik7XG4gIHZhciBub2RlcyA9IHRlbXBsYXRlLmJ1aWxkUmVuZGVyTm9kZXMoZG9tLCBmcmFnbWVudCwgY29udGV4dHVhbEVsZW1lbnQpO1xuXG4gIHZhciByb290Tm9kZSwgb3duZXJOb2RlLCBzaG91bGRTZXRDb250ZW50O1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVuZGVyTm9kZSkge1xuICAgIHJvb3ROb2RlID0gb3B0aW9ucy5yZW5kZXJOb2RlO1xuICAgIG93bmVyTm9kZSA9IHJvb3ROb2RlLm93bmVyTm9kZTtcbiAgICBzaG91bGRTZXRDb250ZW50ID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByb290Tm9kZSA9IGRvbS5jcmVhdGVNb3JwaChudWxsLCBmcmFnbWVudC5maXJzdENoaWxkLCBmcmFnbWVudC5sYXN0Q2hpbGQsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAgICBvd25lck5vZGUgPSByb290Tm9kZTtcbiAgICBpbml0aWFsaXplTm9kZShyb290Tm9kZSwgb3duZXJOb2RlKTtcbiAgICBzaG91bGRTZXRDb250ZW50ID0gZmFsc2U7XG4gIH1cblxuICBpZiAocm9vdE5vZGUuY2hpbGROb2Rlcykge1xuICAgIHZpc2l0Q2hpbGRyZW4ocm9vdE5vZGUuY2hpbGROb2RlcywgZnVuY3Rpb24obm9kZSkge1xuICAgICAgY2xlYXJNb3JwaChub2RlLCBlbnYsIHRydWUpO1xuICAgIH0pO1xuICB9XG5cbiAgcm9vdE5vZGUuY2hpbGROb2RlcyA9IG5vZGVzO1xuICByZXR1cm4gbmV3IFJlbmRlclJlc3VsdChlbnYsIHNjb3BlLCBvcHRpb25zLCByb290Tm9kZSwgb3duZXJOb2RlLCBub2RlcywgZnJhZ21lbnQsIHRlbXBsYXRlLCBzaG91bGRTZXRDb250ZW50KTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBtYW51YWxFbGVtZW50KHRhZ05hbWUsIGF0dHJpYnV0ZXMsIF9pc0VtcHR5KSB7XG4gIHZhciBzdGF0ZW1lbnRzID0gW107XG5cbiAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXNba2V5XSA9PT0gJ3N0cmluZycpIHsgY29udGludWU7IH1cbiAgICBzdGF0ZW1lbnRzLnB1c2goW1wiYXR0cmlidXRlXCIsIGtleSwgYXR0cmlidXRlc1trZXldXSk7XG4gIH1cblxuICB2YXIgaXNFbXB0eSA9IF9pc0VtcHR5IHx8IHZvaWRNYXBbdGFnTmFtZV07XG5cbiAgaWYgKCFpc0VtcHR5KSB7XG4gICAgc3RhdGVtZW50cy5wdXNoKFsnY29udGVudCcsICd5aWVsZCddKTtcbiAgfVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHtcbiAgICBhcml0eTogMCxcbiAgICBjYWNoZWRGcmFnbWVudDogbnVsbCxcbiAgICBoYXNSZW5kZXJlZDogZmFsc2UsXG4gICAgYnVpbGRGcmFnbWVudDogZnVuY3Rpb24gYnVpbGRGcmFnbWVudChkb20pIHtcbiAgICAgIHZhciBlbDAgPSBkb20uY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgaWYgKHRhZ05hbWUgPT09ICdzdmcnKSB7XG4gICAgICAgIGRvbS5zZXROYW1lc3BhY2Uoc3ZnTmFtZXNwYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBlbDEgPSBkb20uY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcblxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhdHRyaWJ1dGVzW2tleV0gIT09ICdzdHJpbmcnKSB7IGNvbnRpbnVlOyB9XG4gICAgICAgIGRvbS5zZXRBdHRyaWJ1dGUoZWwxLCBrZXksIGF0dHJpYnV0ZXNba2V5XSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNFbXB0eSkge1xuICAgICAgICB2YXIgZWwyID0gZG9tLmNyZWF0ZUNvbW1lbnQoXCJcIik7XG4gICAgICAgIGRvbS5hcHBlbmRDaGlsZChlbDEsIGVsMik7XG4gICAgICB9XG5cbiAgICAgIGRvbS5hcHBlbmRDaGlsZChlbDAsIGVsMSk7XG5cbiAgICAgIHJldHVybiBlbDA7XG4gICAgfSxcbiAgICBidWlsZFJlbmRlck5vZGVzOiBmdW5jdGlvbiBidWlsZFJlbmRlck5vZGVzKGRvbSwgZnJhZ21lbnQpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZG9tLmNoaWxkQXQoZnJhZ21lbnQsIFswXSk7XG4gICAgICB2YXIgbW9ycGhzID0gW107XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXR0cmlidXRlc1trZXldID09PSAnc3RyaW5nJykgeyBjb250aW51ZTsgfVxuICAgICAgICBtb3JwaHMucHVzaChkb20uY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsIGtleSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzRW1wdHkpIHtcbiAgICAgICAgbW9ycGhzLnB1c2goZG9tLmNyZWF0ZU1vcnBoQXQoZWxlbWVudCwgMCwgMCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbW9ycGhzO1xuICAgIH0sXG4gICAgc3RhdGVtZW50czogc3RhdGVtZW50cyxcbiAgICBsb2NhbHM6IFtdLFxuICAgIHRlbXBsYXRlczogW11cbiAgfTtcblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdHRhY2hBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpIHtcbiAgdmFyIHN0YXRlbWVudHMgPSBbXTtcblxuICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgIGlmICh0eXBlb2YgYXR0cmlidXRlc1trZXldID09PSAnc3RyaW5nJykgeyBjb250aW51ZTsgfVxuICAgIHN0YXRlbWVudHMucHVzaChbXCJhdHRyaWJ1dGVcIiwga2V5LCBhdHRyaWJ1dGVzW2tleV1dKTtcbiAgfVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHtcbiAgICBhcml0eTogMCxcbiAgICBjYWNoZWRGcmFnbWVudDogbnVsbCxcbiAgICBoYXNSZW5kZXJlZDogZmFsc2UsXG4gICAgYnVpbGRGcmFnbWVudDogZnVuY3Rpb24gYnVpbGRGcmFnbWVudChkb20pIHtcbiAgICAgIHZhciBlbDAgPSB0aGlzLmVsZW1lbnQ7XG4gICAgICBpZiAoZWwwLm5hbWVzcGFjZVVSSSA9PT0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKSB7XG4gICAgICAgIGRvbS5zZXROYW1lc3BhY2Uoc3ZnTmFtZXNwYWNlKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXR0cmlidXRlc1trZXldICE9PSAnc3RyaW5nJykgeyBjb250aW51ZTsgfVxuICAgICAgICBkb20uc2V0QXR0cmlidXRlKGVsMCwga2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZWwwO1xuICAgIH0sXG4gICAgYnVpbGRSZW5kZXJOb2RlczogZnVuY3Rpb24gYnVpbGRSZW5kZXJOb2Rlcyhkb20pIHtcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIG1vcnBocyA9IFtdO1xuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXNba2V5XSA9PT0gJ3N0cmluZycpIHsgY29udGludWU7IH1cbiAgICAgICAgbW9ycGhzLnB1c2goZG9tLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCBrZXkpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1vcnBocztcbiAgICB9LFxuICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgbG9jYWxzOiBbXSxcbiAgICB0ZW1wbGF0ZXM6IFtdLFxuICAgIGVsZW1lbnQ6IG51bGxcbiAgfTtcblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUuaW5pdGlhbGl6ZU5vZGVzID0gZnVuY3Rpb24ob3duZXJOb2RlKSB7XG4gIGZvckVhY2godGhpcy5yb290LmNoaWxkTm9kZXMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpbml0aWFsaXplTm9kZShub2RlLCBvd25lck5vZGUpO1xuICB9KTtcbn07XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucm9vdC5sYXN0UmVzdWx0ID0gdGhpcztcbiAgdGhpcy5yb290LnJlbmRlcmVkID0gdHJ1ZTtcbiAgdGhpcy5wb3B1bGF0ZU5vZGVzKEFsd2F5c0RpcnR5VmlzaXRvcik7XG5cbiAgaWYgKHRoaXMuc2hvdWxkU2V0Q29udGVudCAmJiB0aGlzLnJvb3Quc2V0Q29udGVudCkge1xuICAgIHRoaXMucm9vdC5zZXRDb250ZW50KHRoaXMuZnJhZ21lbnQpO1xuICB9XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmRpcnR5ID0gZnVuY3Rpb24oKSB7XG4gIHZpc2l0Q2hpbGRyZW4oW3RoaXMucm9vdF0sIGZ1bmN0aW9uKG5vZGUpIHsgbm9kZS5pc0RpcnR5ID0gdHJ1ZTsgfSk7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnJldmFsaWRhdGUgPSBmdW5jdGlvbihlbnYsIHNlbGYsIGJsb2NrQXJndW1lbnRzLCBzY29wZSkge1xuICB0aGlzLnJldmFsaWRhdGVXaXRoKGVudiwgc2NvcGUsIHNlbGYsIGJsb2NrQXJndW1lbnRzLCBFeHByZXNzaW9uVmlzaXRvcik7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnJlcmVuZGVyID0gZnVuY3Rpb24oZW52LCBzZWxmLCBibG9ja0FyZ3VtZW50cywgc2NvcGUpIHtcbiAgdGhpcy5yZXZhbGlkYXRlV2l0aChlbnYsIHNjb3BlLCBzZWxmLCBibG9ja0FyZ3VtZW50cywgQWx3YXlzRGlydHlWaXNpdG9yKTtcbn07XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUucmV2YWxpZGF0ZVdpdGggPSBmdW5jdGlvbihlbnYsIHNjb3BlLCBzZWxmLCBibG9ja0FyZ3VtZW50cywgdmlzaXRvcikge1xuICBpZiAoZW52ICE9PSB1bmRlZmluZWQpIHsgdGhpcy5lbnYgPSBlbnY7IH1cbiAgaWYgKHNjb3BlICE9PSB1bmRlZmluZWQpIHsgdGhpcy5zY29wZSA9IHNjb3BlOyB9XG4gIHRoaXMudXBkYXRlU2NvcGUoKTtcblxuICBpZiAoc2VsZiAhPT0gdW5kZWZpbmVkKSB7IHRoaXMudXBkYXRlU2VsZihzZWxmKTsgfVxuICBpZiAoYmxvY2tBcmd1bWVudHMgIT09IHVuZGVmaW5lZCkgeyB0aGlzLnVwZGF0ZUxvY2FscyhibG9ja0FyZ3VtZW50cyk7IH1cblxuICB0aGlzLnBvcHVsYXRlTm9kZXModmlzaXRvcik7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJvb3ROb2RlID0gdGhpcy5yb290O1xuICBjbGVhck1vcnBoKHJvb3ROb2RlLCB0aGlzLmVudiwgdHJ1ZSk7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnBvcHVsYXRlTm9kZXMgPSBmdW5jdGlvbih2aXNpdG9yKSB7XG4gIHZhciBlbnYgPSB0aGlzLmVudjtcbiAgdmFyIHNjb3BlID0gdGhpcy5zY29wZTtcbiAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZTtcbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgdmFyIHN0YXRlbWVudHMgPSB0aGlzLnN0YXRlbWVudHM7XG4gIHZhciBpLCBsO1xuXG4gIGZvciAoaT0wLCBsPXN0YXRlbWVudHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuICAgIHZhciBtb3JwaCA9IG5vZGVzW2ldO1xuXG4gICAgaWYgKGVudi5ob29rcy53aWxsUmVuZGVyTm9kZSkge1xuICAgICAgZW52Lmhvb2tzLndpbGxSZW5kZXJOb2RlKG1vcnBoLCBlbnYsIHNjb3BlKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHN0YXRlbWVudFswXSkge1xuICAgICAgY2FzZSAnYmxvY2snOiB2aXNpdG9yLmJsb2NrKHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgICBjYXNlICdpbmxpbmUnOiB2aXNpdG9yLmlubGluZShzdGF0ZW1lbnQsIG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgICBjYXNlICdjb250ZW50JzogdmlzaXRvci5jb250ZW50KHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IpOyBicmVhaztcbiAgICAgIGNhc2UgJ2VsZW1lbnQnOiB2aXNpdG9yLmVsZW1lbnQoc3RhdGVtZW50LCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIHZpc2l0b3IpOyBicmVhaztcbiAgICAgIGNhc2UgJ2F0dHJpYnV0ZSc6IHZpc2l0b3IuYXR0cmlidXRlKHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUpOyBicmVhaztcbiAgICAgIGNhc2UgJ2NvbXBvbmVudCc6IHZpc2l0b3IuY29tcG9uZW50KHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGVudi5ob29rcy5kaWRSZW5kZXJOb2RlKSB7XG4gICAgICBlbnYuaG9va3MuZGlkUmVuZGVyTm9kZShtb3JwaCwgZW52LCBzY29wZSk7XG4gICAgfVxuICB9XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmJpbmRTY29wZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVudi5ob29rcy5iaW5kU2NvcGUodGhpcy5lbnYsIHRoaXMuc2NvcGUpO1xufTtcblxuUmVuZGVyUmVzdWx0LnByb3RvdHlwZS51cGRhdGVTY29wZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVudi5ob29rcy51cGRhdGVTY29wZSh0aGlzLmVudiwgdGhpcy5zY29wZSk7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmJpbmRTZWxmID0gZnVuY3Rpb24oc2VsZikge1xuICB0aGlzLmVudi5ob29rcy5iaW5kU2VsZih0aGlzLmVudiwgdGhpcy5zY29wZSwgc2VsZik7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnVwZGF0ZVNlbGYgPSBmdW5jdGlvbihzZWxmKSB7XG4gIHRoaXMuZW52Lmhvb2tzLnVwZGF0ZVNlbGYodGhpcy5lbnYsIHRoaXMuc2NvcGUsIHNlbGYpO1xufTtcblxuUmVuZGVyUmVzdWx0LnByb3RvdHlwZS5iaW5kTG9jYWxzID0gZnVuY3Rpb24oYmxvY2tBcmd1bWVudHMpIHtcbiAgdmFyIGxvY2FsTmFtZXMgPSB0aGlzLnRlbXBsYXRlLmxvY2FscztcblxuICBmb3IgKHZhciBpPTAsIGw9bG9jYWxOYW1lcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgdGhpcy5lbnYuaG9va3MuYmluZExvY2FsKHRoaXMuZW52LCB0aGlzLnNjb3BlLCBsb2NhbE5hbWVzW2ldLCBibG9ja0FyZ3VtZW50c1tpXSk7XG4gIH1cbn07XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUudXBkYXRlTG9jYWxzID0gZnVuY3Rpb24oYmxvY2tBcmd1bWVudHMpIHtcbiAgdmFyIGxvY2FsTmFtZXMgPSB0aGlzLnRlbXBsYXRlLmxvY2FscztcblxuICBmb3IgKHZhciBpPTAsIGw9bG9jYWxOYW1lcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgdGhpcy5lbnYuaG9va3MudXBkYXRlTG9jYWwodGhpcy5lbnYsIHRoaXMuc2NvcGUsIGxvY2FsTmFtZXNbaV0sIGJsb2NrQXJndW1lbnRzW2ldKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZU5vZGUobm9kZSwgb3duZXIpIHtcbiAgbm9kZS5vd25lck5vZGUgPSBvd25lcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNoaWxkTW9ycGgoZG9tLCBwYXJlbnRNb3JwaCwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdmFyIG1vcnBoID0gTW9ycGguZW1wdHkoZG9tLCBjb250ZXh0dWFsRWxlbWVudCB8fCBwYXJlbnRNb3JwaC5jb250ZXh0dWFsRWxlbWVudCk7XG4gIGluaXRpYWxpemVOb2RlKG1vcnBoLCBwYXJlbnRNb3JwaC5vd25lck5vZGUpO1xuICByZXR1cm4gbW9ycGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYWNoZWRGcmFnbWVudCh0ZW1wbGF0ZSwgZW52KSB7XG4gIHZhciBkb20gPSBlbnYuZG9tLCBmcmFnbWVudDtcbiAgaWYgKGVudi51c2VGcmFnbWVudENhY2hlICYmIGRvbS5jYW5DbG9uZSkge1xuICAgIGlmICh0ZW1wbGF0ZS5jYWNoZWRGcmFnbWVudCA9PT0gbnVsbCkge1xuICAgICAgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5idWlsZEZyYWdtZW50KGRvbSk7XG4gICAgICBpZiAodGVtcGxhdGUuaGFzUmVuZGVyZWQpIHtcbiAgICAgICAgdGVtcGxhdGUuY2FjaGVkRnJhZ21lbnQgPSBmcmFnbWVudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRlbXBsYXRlLmhhc1JlbmRlcmVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLmNhY2hlZEZyYWdtZW50KSB7XG4gICAgICBmcmFnbWVudCA9IGRvbS5jbG9uZU5vZGUodGVtcGxhdGUuY2FjaGVkRnJhZ21lbnQsIHRydWUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICghZnJhZ21lbnQpIHtcbiAgICBmcmFnbWVudCA9IHRlbXBsYXRlLmJ1aWxkRnJhZ21lbnQoZG9tKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn1cbiJdfQ==
define('htmlbars-util', ['exports', './htmlbars-util/safe-string', './htmlbars-util/handlebars/utils', './htmlbars-util/namespaces', './htmlbars-util/morph-utils'], function (exports, _htmlbarsUtilSafeString, _htmlbarsUtilHandlebarsUtils, _htmlbarsUtilNamespaces, _htmlbarsUtilMorphUtils) {
  exports.SafeString = _htmlbarsUtilSafeString.default;
  exports.escapeExpression = _htmlbarsUtilHandlebarsUtils.escapeExpression;
  exports.getAttrNamespace = _htmlbarsUtilNamespaces.getAttrNamespace;
  exports.validateChildMorphs = _htmlbarsUtilMorphUtils.validateChildMorphs;
  exports.linkParams = _htmlbarsUtilMorphUtils.linkParams;
  exports.dump = _htmlbarsUtilMorphUtils.dump;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtVQU1FLFVBQVU7VUFDVixnQkFBZ0IsZ0NBTlQsZ0JBQWdCO1VBT3ZCLGdCQUFnQiwyQkFOVCxnQkFBZ0I7VUFPdkIsbUJBQW1CLDJCQU5aLG1CQUFtQjtVQU8xQixVQUFVLDJCQVBrQixVQUFVO1VBUXRDLElBQUksMkJBUm9DLElBQUkiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTYWZlU3RyaW5nIGZyb20gJy4vaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZyc7XG5pbXBvcnQgeyBlc2NhcGVFeHByZXNzaW9uIH0gZnJvbSAnLi9odG1sYmFycy11dGlsL2hhbmRsZWJhcnMvdXRpbHMnO1xuaW1wb3J0IHsgZ2V0QXR0ck5hbWVzcGFjZSB9IGZyb20gJy4vaHRtbGJhcnMtdXRpbC9uYW1lc3BhY2VzJztcbmltcG9ydCB7IHZhbGlkYXRlQ2hpbGRNb3JwaHMsIGxpbmtQYXJhbXMsIGR1bXAgfSBmcm9tICcuL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMnO1xuXG5leHBvcnQge1xuICBTYWZlU3RyaW5nLFxuICBlc2NhcGVFeHByZXNzaW9uLFxuICBnZXRBdHRyTmFtZXNwYWNlLFxuICB2YWxpZGF0ZUNoaWxkTW9ycGhzLFxuICBsaW5rUGFyYW1zLFxuICBkdW1wXG59O1xuIl19
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
define('htmlbars-util/safe-string', ['exports', './handlebars/safe-string'], function (exports, _handlebarsSafeString) {
  exports.default = _handlebarsSafeString.default;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJodG1sYmFycy11dGlsL3NhZmUtc3RyaW5nLmpzIiwic291cmNlc0NvbnRlbnQiOltdfQ==
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
define("morph-attr", ["exports", "./morph-attr/sanitize-attribute-value", "./dom-helper/prop", "./dom-helper/build-html-dom", "./htmlbars-util"], function (exports, _morphAttrSanitizeAttributeValue, _domHelperProp, _domHelperBuildHtmlDom, _htmlbarsUtil) {

  function getProperty() {
    return this.domHelper.getPropertyStrict(this.element, this.attrName);
  }

  function updateProperty(value) {
    if (this._renderedInitially === true || !_domHelperProp.isAttrRemovalValue(value)) {
      // do not render if initial value is undefined or null
      this.domHelper.setPropertyStrict(this.element, this.attrName, value);
    }

    this._renderedInitially = true;
  }

  function getAttribute() {
    return this.domHelper.getAttribute(this.element, this.attrName);
  }

  function updateAttribute(value) {
    if (_domHelperProp.isAttrRemovalValue(value)) {
      this.domHelper.removeAttribute(this.element, this.attrName);
    } else {
      this.domHelper.setAttribute(this.element, this.attrName, value);
    }
  }

  function getAttributeNS() {
    return this.domHelper.getAttributeNS(this.element, this.namespace, this.attrName);
  }

  function updateAttributeNS(value) {
    if (_domHelperProp.isAttrRemovalValue(value)) {
      this.domHelper.removeAttribute(this.element, this.attrName);
    } else {
      this.domHelper.setAttributeNS(this.element, this.namespace, this.attrName, value);
    }
  }

  var UNSET = { unset: true };

  var guid = 1;

  function AttrMorph(element, attrName, domHelper, namespace) {
    this.element = element;
    this.domHelper = domHelper;
    this.namespace = namespace !== undefined ? namespace : _htmlbarsUtil.getAttrNamespace(attrName);
    this.state = {};
    this.isDirty = false;
    this.isSubtreeDirty = false;
    this.escaped = true;
    this.lastValue = UNSET;
    this.lastResult = null;
    this.lastYielded = null;
    this.childNodes = null;
    this.linkedParams = null;
    this.linkedResult = null;
    this.guid = "attr" + guid++;
    this.ownerNode = null;
    this.rendered = false;
    this._renderedInitially = false;

    if (this.namespace) {
      this._update = updateAttributeNS;
      this._get = getAttributeNS;
      this.attrName = attrName;
    } else {
      var _normalizeProperty = _domHelperProp.normalizeProperty(this.element, attrName);

      var normalized = _normalizeProperty.normalized;
      var type = _normalizeProperty.type;

      if (element.namespaceURI === _domHelperBuildHtmlDom.svgNamespace || attrName === 'style' || type === 'attr') {
        this._update = updateAttribute;
        this._get = getAttribute;
        this.attrName = normalized;
      } else {
        this._update = updateProperty;
        this._get = getProperty;
        this.attrName = normalized;
      }
    }
  }

  AttrMorph.prototype.setContent = function (value) {
    if (this.lastValue === value) {
      return;
    }
    this.lastValue = value;

    if (this.escaped) {
      var sanitized = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(this.domHelper, this.element, this.attrName, value);
      this._update(sanitized, this.namespace);
    } else {
      this._update(value, this.namespace);
    }
  };

  AttrMorph.prototype.getContent = function () {
    var value = this.lastValue = this._get();
    return value;
  };

  // renderAndCleanup calls `clear` on all items in the morph map
  // just before calling `destroy` on the morph.
  //
  // As a future refactor this could be changed to set the property
  // back to its original/default value.
  AttrMorph.prototype.clear = function () {};

  AttrMorph.prototype.destroy = function () {
    this.element = null;
    this.domHelper = null;
  };

  exports.default = AttrMorph;
  exports.sanitizeAttributeValue = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue;
});
//# sourceMappingURL=data:application/json;base64,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S0FBSyxFQUFFO0FBQ2hELFFBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUU7QUFBRSxhQUFPO0tBQUU7QUFDekMsUUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7O0FBRXZCLFFBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNoQixVQUFJLFNBQVMsR0FBRyxpQ0ExRlgsc0JBQXNCLENBMEZZLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzNGLFVBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN6QyxNQUFNO0FBQ0wsVUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3JDO0dBQ0YsQ0FBQzs7QUFFRixXQUFTLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxZQUFZO0FBQzNDLFFBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3pDLFdBQU8sS0FBSyxDQUFDO0dBQ2QsQ0FBQzs7Ozs7OztBQU9GLFdBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVcsRUFBRyxDQUFDOztBQUUzQyxXQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFXO0FBQ3ZDLFFBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0FBQ3BCLFFBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0dBQ3ZCLENBQUM7O29CQUVhLFNBQVM7VUFFZixzQkFBc0Isb0NBcEh0QixzQkFBc0IiLCJmaWxlIjoibW9ycGgtYXR0ci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhbml0aXplQXR0cmlidXRlVmFsdWUgfSBmcm9tIFwiLi9tb3JwaC1hdHRyL3Nhbml0aXplLWF0dHJpYnV0ZS12YWx1ZVwiO1xuaW1wb3J0IHsgaXNBdHRyUmVtb3ZhbFZhbHVlLCBub3JtYWxpemVQcm9wZXJ0eSB9IGZyb20gXCIuL2RvbS1oZWxwZXIvcHJvcFwiO1xuaW1wb3J0IHsgc3ZnTmFtZXNwYWNlIH0gZnJvbSBcIi4vZG9tLWhlbHBlci9idWlsZC1odG1sLWRvbVwiO1xuaW1wb3J0IHsgZ2V0QXR0ck5hbWVzcGFjZSB9IGZyb20gXCIuL2h0bWxiYXJzLXV0aWxcIjtcblxuZnVuY3Rpb24gZ2V0UHJvcGVydHkoKSB7XG4gIHJldHVybiB0aGlzLmRvbUhlbHBlci5nZXRQcm9wZXJ0eVN0cmljdCh0aGlzLmVsZW1lbnQsIHRoaXMuYXR0ck5hbWUpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQcm9wZXJ0eSh2YWx1ZSkge1xuICBpZiAodGhpcy5fcmVuZGVyZWRJbml0aWFsbHkgPT09IHRydWUgfHwgIWlzQXR0clJlbW92YWxWYWx1ZSh2YWx1ZSkpIHtcbiAgICAvLyBkbyBub3QgcmVuZGVyIGlmIGluaXRpYWwgdmFsdWUgaXMgdW5kZWZpbmVkIG9yIG51bGxcbiAgICB0aGlzLmRvbUhlbHBlci5zZXRQcm9wZXJ0eVN0cmljdCh0aGlzLmVsZW1lbnQsIHRoaXMuYXR0ck5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIHRoaXMuX3JlbmRlcmVkSW5pdGlhbGx5ID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlKCkge1xuICByZXR1cm4gdGhpcy5kb21IZWxwZXIuZ2V0QXR0cmlidXRlKHRoaXMuZWxlbWVudCwgdGhpcy5hdHRyTmFtZSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUF0dHJpYnV0ZSh2YWx1ZSkge1xuICBpZiAoaXNBdHRyUmVtb3ZhbFZhbHVlKHZhbHVlKSkge1xuICAgIHRoaXMuZG9tSGVscGVyLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLmVsZW1lbnQsIHRoaXMuYXR0ck5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZG9tSGVscGVyLnNldEF0dHJpYnV0ZSh0aGlzLmVsZW1lbnQsIHRoaXMuYXR0ck5hbWUsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVOUygpIHtcbiAgcmV0dXJuIHRoaXMuZG9tSGVscGVyLmdldEF0dHJpYnV0ZU5TKHRoaXMuZWxlbWVudCwgdGhpcy5uYW1lc3BhY2UsIHRoaXMuYXR0ck5hbWUpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVBdHRyaWJ1dGVOUyh2YWx1ZSkge1xuICBpZiAoaXNBdHRyUmVtb3ZhbFZhbHVlKHZhbHVlKSkge1xuICAgIHRoaXMuZG9tSGVscGVyLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLmVsZW1lbnQsIHRoaXMuYXR0ck5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZG9tSGVscGVyLnNldEF0dHJpYnV0ZU5TKHRoaXMuZWxlbWVudCwgdGhpcy5uYW1lc3BhY2UsIHRoaXMuYXR0ck5hbWUsIHZhbHVlKTtcbiAgfVxufVxuXG52YXIgVU5TRVQgPSB7IHVuc2V0OiB0cnVlIH07XG5cbnZhciBndWlkID0gMTtcblxuZnVuY3Rpb24gQXR0ck1vcnBoKGVsZW1lbnQsIGF0dHJOYW1lLCBkb21IZWxwZXIsIG5hbWVzcGFjZSkge1xuICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICB0aGlzLmRvbUhlbHBlciA9IGRvbUhlbHBlcjtcbiAgdGhpcy5uYW1lc3BhY2UgPSBuYW1lc3BhY2UgIT09IHVuZGVmaW5lZCA/IG5hbWVzcGFjZSA6IGdldEF0dHJOYW1lc3BhY2UoYXR0ck5hbWUpO1xuICB0aGlzLnN0YXRlID0ge307XG4gIHRoaXMuaXNEaXJ0eSA9IGZhbHNlO1xuICB0aGlzLmlzU3VidHJlZURpcnR5ID0gZmFsc2U7XG4gIHRoaXMuZXNjYXBlZCA9IHRydWU7XG4gIHRoaXMubGFzdFZhbHVlID0gVU5TRVQ7XG4gIHRoaXMubGFzdFJlc3VsdCA9IG51bGw7XG4gIHRoaXMubGFzdFlpZWxkZWQgPSBudWxsO1xuICB0aGlzLmNoaWxkTm9kZXMgPSBudWxsO1xuICB0aGlzLmxpbmtlZFBhcmFtcyA9IG51bGw7XG4gIHRoaXMubGlua2VkUmVzdWx0ID0gbnVsbDtcbiAgdGhpcy5ndWlkID0gXCJhdHRyXCIgKyBndWlkKys7XG4gIHRoaXMub3duZXJOb2RlID0gbnVsbDtcbiAgdGhpcy5yZW5kZXJlZCA9IGZhbHNlO1xuICB0aGlzLl9yZW5kZXJlZEluaXRpYWxseSA9IGZhbHNlO1xuXG5cbiAgaWYgKHRoaXMubmFtZXNwYWNlKSB7XG4gICAgdGhpcy5fdXBkYXRlID0gdXBkYXRlQXR0cmlidXRlTlM7XG4gICAgdGhpcy5fZ2V0ID0gZ2V0QXR0cmlidXRlTlM7XG4gICAgdGhpcy5hdHRyTmFtZSA9IGF0dHJOYW1lO1xuICB9IGVsc2Uge1xuICAgIHZhciB7IG5vcm1hbGl6ZWQsIHR5cGUgfSA9IG5vcm1hbGl6ZVByb3BlcnR5KHRoaXMuZWxlbWVudCwgYXR0ck5hbWUpO1xuXG4gICAgaWYgKGVsZW1lbnQubmFtZXNwYWNlVVJJID09PSBzdmdOYW1lc3BhY2UgfHwgYXR0ck5hbWUgPT09ICdzdHlsZScgfHwgdHlwZSA9PT0gJ2F0dHInKSB7XG4gICAgICB0aGlzLl91cGRhdGUgPSB1cGRhdGVBdHRyaWJ1dGU7XG4gICAgICB0aGlzLl9nZXQgPSBnZXRBdHRyaWJ1dGU7XG4gICAgICB0aGlzLmF0dHJOYW1lID0gbm9ybWFsaXplZCA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3VwZGF0ZSA9IHVwZGF0ZVByb3BlcnR5O1xuICAgICAgdGhpcy5fZ2V0ID0gZ2V0UHJvcGVydHk7XG4gICAgICB0aGlzLmF0dHJOYW1lID0gbm9ybWFsaXplZCA7XG4gICAgfVxuICB9XG59XG5cbkF0dHJNb3JwaC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodGhpcy5sYXN0VmFsdWUgPT09IHZhbHVlKSB7IHJldHVybjsgfVxuICB0aGlzLmxhc3RWYWx1ZSA9IHZhbHVlO1xuXG4gIGlmICh0aGlzLmVzY2FwZWQpIHtcbiAgICB2YXIgc2FuaXRpemVkID0gc2FuaXRpemVBdHRyaWJ1dGVWYWx1ZSh0aGlzLmRvbUhlbHBlciwgdGhpcy5lbGVtZW50LCB0aGlzLmF0dHJOYW1lLCB2YWx1ZSk7XG4gICAgdGhpcy5fdXBkYXRlKHNhbml0aXplZCwgdGhpcy5uYW1lc3BhY2UpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX3VwZGF0ZSh2YWx1ZSwgdGhpcy5uYW1lc3BhY2UpO1xuICB9XG59O1xuXG5BdHRyTW9ycGgucHJvdG90eXBlLmdldENvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2YWx1ZSA9IHRoaXMubGFzdFZhbHVlID0gdGhpcy5fZ2V0KCk7XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cbi8vIHJlbmRlckFuZENsZWFudXAgY2FsbHMgYGNsZWFyYCBvbiBhbGwgaXRlbXMgaW4gdGhlIG1vcnBoIG1hcFxuLy8ganVzdCBiZWZvcmUgY2FsbGluZyBgZGVzdHJveWAgb24gdGhlIG1vcnBoLlxuLy9cbi8vIEFzIGEgZnV0dXJlIHJlZmFjdG9yIHRoaXMgY291bGQgYmUgY2hhbmdlZCB0byBzZXQgdGhlIHByb3BlcnR5XG4vLyBiYWNrIHRvIGl0cyBvcmlnaW5hbC9kZWZhdWx0IHZhbHVlLlxuQXR0ck1vcnBoLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkgeyB9O1xuXG5BdHRyTW9ycGgucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgdGhpcy5kb21IZWxwZXIgPSBudWxsO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgQXR0ck1vcnBoO1xuXG5leHBvcnQgeyBzYW5pdGl6ZUF0dHJpYnV0ZVZhbHVlIH07XG4iXX0=
define('morph-attr/sanitize-attribute-value', ['exports'], function (exports) {
  exports.sanitizeAttributeValue = sanitizeAttributeValue;
  /* jshint scripturl:true */

  var badProtocols = {
    'javascript:': true,
    'vbscript:': true
  };

  var badTags = {
    'A': true,
    'BODY': true,
    'LINK': true,
    'IMG': true,
    'IFRAME': true,
    'BASE': true,
    'FORM': true
  };

  var badTagsForDataURI = {
    'EMBED': true
  };

  var badAttributes = {
    'href': true,
    'src': true,
    'background': true,
    'action': true
  };

  exports.badAttributes = badAttributes;
  var badAttributesForDataURI = {
    'src': true
  };

  function sanitizeAttributeValue(dom, element, attribute, value) {
    var tagName;

    if (!element) {
      tagName = null;
    } else {
      tagName = element.tagName.toUpperCase();
    }

    if (value && value.toHTML) {
      return value.toHTML();
    }

    if ((tagName === null || badTags[tagName]) && badAttributes[attribute]) {
      var protocol = dom.protocolForURL(value);
      if (badProtocols[protocol] === true) {
        return 'unsafe:' + value;
      }
    }

    if (badTagsForDataURI[tagName] && badAttributesForDataURI[attribute]) {
      return 'unsafe:' + value;
    }

    return value;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHIvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFFQSxNQUFJLFlBQVksR0FBRztBQUNqQixpQkFBYSxFQUFFLElBQUk7QUFDbkIsZUFBVyxFQUFFLElBQUk7R0FDbEIsQ0FBQzs7QUFFRixNQUFJLE9BQU8sR0FBRztBQUNaLE9BQUcsRUFBRSxJQUFJO0FBQ1QsVUFBTSxFQUFFLElBQUk7QUFDWixVQUFNLEVBQUUsSUFBSTtBQUNaLFNBQUssRUFBRSxJQUFJO0FBQ1gsWUFBUSxFQUFFLElBQUk7QUFDZCxVQUFNLEVBQUUsSUFBSTtBQUNaLFVBQU0sRUFBRSxJQUFJO0dBQ2IsQ0FBQzs7QUFFRixNQUFJLGlCQUFpQixHQUFHO0FBQ3RCLFdBQU8sRUFBRSxJQUFJO0dBQ2QsQ0FBQzs7QUFFSyxNQUFJLGFBQWEsR0FBRztBQUN6QixVQUFNLEVBQUUsSUFBSTtBQUNaLFNBQUssRUFBRSxJQUFJO0FBQ1gsZ0JBQVksRUFBRSxJQUFJO0FBQ2xCLFlBQVEsRUFBRSxJQUFJO0dBQ2YsQ0FBQzs7O0FBRUYsTUFBSSx1QkFBdUIsR0FBRztBQUM1QixTQUFLLEVBQUUsSUFBSTtHQUNaLENBQUM7O0FBRUssV0FBUyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUU7QUFDckUsUUFBSSxPQUFPLENBQUM7O0FBRVosUUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNaLGFBQU8sR0FBRyxJQUFJLENBQUM7S0FDaEIsTUFBTTtBQUNMLGFBQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0tBQ3pDOztBQUVELFFBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDekIsYUFBTyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDdkI7O0FBRUQsUUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBLElBQUssYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQ3RFLFVBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekMsVUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO0FBQ25DLGVBQU8sU0FBUyxHQUFHLEtBQUssQ0FBQztPQUMxQjtLQUNGOztBQUVELFFBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksdUJBQXVCLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDcEUsYUFBTyxTQUFTLEdBQUcsS0FBSyxDQUFDO0tBQzFCOztBQUVELFdBQU8sS0FBSyxDQUFDO0dBQ2QiLCJmaWxlIjoibW9ycGgtYXR0ci9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBqc2hpbnQgc2NyaXB0dXJsOnRydWUgKi9cblxudmFyIGJhZFByb3RvY29scyA9IHtcbiAgJ2phdmFzY3JpcHQ6JzogdHJ1ZSxcbiAgJ3Zic2NyaXB0Oic6IHRydWVcbn07XG5cbnZhciBiYWRUYWdzID0ge1xuICAnQSc6IHRydWUsXG4gICdCT0RZJzogdHJ1ZSxcbiAgJ0xJTksnOiB0cnVlLFxuICAnSU1HJzogdHJ1ZSxcbiAgJ0lGUkFNRSc6IHRydWUsXG4gICdCQVNFJzogdHJ1ZSxcbiAgJ0ZPUk0nOiB0cnVlXG59O1xuXG52YXIgYmFkVGFnc0ZvckRhdGFVUkkgPSB7XG4gICdFTUJFRCc6IHRydWVcbn07XG5cbmV4cG9ydCB2YXIgYmFkQXR0cmlidXRlcyA9IHtcbiAgJ2hyZWYnOiB0cnVlLFxuICAnc3JjJzogdHJ1ZSxcbiAgJ2JhY2tncm91bmQnOiB0cnVlLFxuICAnYWN0aW9uJzogdHJ1ZVxufTtcblxudmFyIGJhZEF0dHJpYnV0ZXNGb3JEYXRhVVJJID0ge1xuICAnc3JjJzogdHJ1ZVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNhbml0aXplQXR0cmlidXRlVmFsdWUoZG9tLCBlbGVtZW50LCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gIHZhciB0YWdOYW1lO1xuXG4gIGlmICghZWxlbWVudCkge1xuICAgIHRhZ05hbWUgPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIHRhZ05hbWUgPSBlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSAmJiB2YWx1ZS50b0hUTUwpIHtcbiAgICByZXR1cm4gdmFsdWUudG9IVE1MKCk7XG4gIH1cblxuICBpZiAoKHRhZ05hbWUgPT09IG51bGwgfHwgYmFkVGFnc1t0YWdOYW1lXSkgJiYgYmFkQXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgdmFyIHByb3RvY29sID0gZG9tLnByb3RvY29sRm9yVVJMKHZhbHVlKTtcbiAgICBpZiAoYmFkUHJvdG9jb2xzW3Byb3RvY29sXSA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuICd1bnNhZmU6JyArIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGlmIChiYWRUYWdzRm9yRGF0YVVSSVt0YWdOYW1lXSAmJiBiYWRBdHRyaWJ1dGVzRm9yRGF0YVVSSVthdHRyaWJ1dGVdKSB7XG4gICAgcmV0dXJuICd1bnNhZmU6JyArIHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuIl19
define('morph-range', ['exports', './morph-range/utils'], function (exports, _morphRangeUtils) {

  // constructor just initializes the fields
  // use one of the static initializers to create a valid morph.
  function Morph(domHelper, contextualElement) {
    this.domHelper = domHelper;
    // context if content if current content is detached
    this.contextualElement = contextualElement;
    // inclusive range of morph
    // these should be nodeType 1, 3, or 8
    this.firstNode = null;
    this.lastNode = null;

    // flag to force text to setContent to be treated as html
    this.parseTextAsHTML = false;

    // morph list graph
    this.parentMorphList = null;
    this.previousMorph = null;
    this.nextMorph = null;
  }

  Morph.empty = function (domHelper, contextualElement) {
    var morph = new Morph(domHelper, contextualElement);
    morph.clear();
    return morph;
  };

  Morph.create = function (domHelper, contextualElement, node) {
    var morph = new Morph(domHelper, contextualElement);
    morph.setNode(node);
    return morph;
  };

  Morph.attach = function (domHelper, contextualElement, firstNode, lastNode) {
    var morph = new Morph(domHelper, contextualElement);
    morph.setRange(firstNode, lastNode);
    return morph;
  };

  Morph.prototype.setContent = function Morph$setContent(content) {
    if (content === null || content === undefined) {
      return this.clear();
    }

    var type = typeof content;
    switch (type) {
      case 'string':
        if (this.parseTextAsHTML) {
          return this.domHelper.setMorphHTML(this, content);
        }
        return this.setText(content);
      case 'object':
        if (typeof content.nodeType === 'number') {
          return this.setNode(content);
        }
        /* Handlebars.SafeString */
        if (typeof content.string === 'string') {
          return this.setHTML(content.string);
        }
        if (this.parseTextAsHTML) {
          return this.setHTML(content.toString());
        }
      /* falls through */
      case 'boolean':
      case 'number':
        return this.setText(content.toString());
      default:
        throw new TypeError('unsupported content');
    }
  };

  Morph.prototype.clear = function Morph$clear() {
    var node = this.setNode(this.domHelper.createComment(''));
    return node;
  };

  Morph.prototype.setText = function Morph$setText(text) {
    var firstNode = this.firstNode;
    var lastNode = this.lastNode;

    if (firstNode && lastNode === firstNode && firstNode.nodeType === 3) {
      firstNode.nodeValue = text;
      return firstNode;
    }

    return this.setNode(text ? this.domHelper.createTextNode(text) : this.domHelper.createComment(''));
  };

  Morph.prototype.setNode = function Morph$setNode(newNode) {
    var firstNode, lastNode;
    switch (newNode.nodeType) {
      case 3:
        firstNode = newNode;
        lastNode = newNode;
        break;
      case 11:
        firstNode = newNode.firstChild;
        lastNode = newNode.lastChild;
        if (firstNode === null) {
          firstNode = this.domHelper.createComment('');
          newNode.appendChild(firstNode);
          lastNode = firstNode;
        }
        break;
      default:
        firstNode = newNode;
        lastNode = newNode;
        break;
    }

    this.setRange(firstNode, lastNode);

    return newNode;
  };

  Morph.prototype.setRange = function (firstNode, lastNode) {
    var previousFirstNode = this.firstNode;
    if (previousFirstNode !== null) {

      var parentNode = previousFirstNode.parentNode;
      if (parentNode !== null) {
        _morphRangeUtils.insertBefore(parentNode, firstNode, lastNode, previousFirstNode);
        _morphRangeUtils.clear(parentNode, previousFirstNode, this.lastNode);
      }
    }

    this.firstNode = firstNode;
    this.lastNode = lastNode;

    if (this.parentMorphList) {
      this._syncFirstNode();
      this._syncLastNode();
    }
  };

  Morph.prototype.destroy = function Morph$destroy() {
    this.unlink();

    var firstNode = this.firstNode;
    var lastNode = this.lastNode;
    var parentNode = firstNode && firstNode.parentNode;

    this.firstNode = null;
    this.lastNode = null;

    _morphRangeUtils.clear(parentNode, firstNode, lastNode);
  };

  Morph.prototype.unlink = function Morph$unlink() {
    var parentMorphList = this.parentMorphList;
    var previousMorph = this.previousMorph;
    var nextMorph = this.nextMorph;

    if (previousMorph) {
      if (nextMorph) {
        previousMorph.nextMorph = nextMorph;
        nextMorph.previousMorph = previousMorph;
      } else {
        previousMorph.nextMorph = null;
        parentMorphList.lastChildMorph = previousMorph;
      }
    } else {
      if (nextMorph) {
        nextMorph.previousMorph = null;
        parentMorphList.firstChildMorph = nextMorph;
      } else if (parentMorphList) {
        parentMorphList.lastChildMorph = parentMorphList.firstChildMorph = null;
      }
    }

    this.parentMorphList = null;
    this.nextMorph = null;
    this.previousMorph = null;

    if (parentMorphList && parentMorphList.mountedMorph) {
      if (!parentMorphList.firstChildMorph) {
        // list is empty
        parentMorphList.mountedMorph.clear();
        return;
      } else {
        parentMorphList.firstChildMorph._syncFirstNode();
        parentMorphList.lastChildMorph._syncLastNode();
      }
    }
  };

  Morph.prototype.setHTML = function (text) {
    var fragment = this.domHelper.parseHTML(text, this.contextualElement);
    return this.setNode(fragment);
  };

  Morph.prototype.setMorphList = function Morph$appendMorphList(morphList) {
    morphList.mountedMorph = this;
    this.clear();

    var originalFirstNode = this.firstNode;

    if (morphList.firstChildMorph) {
      this.firstNode = morphList.firstChildMorph.firstNode;
      this.lastNode = morphList.lastChildMorph.lastNode;

      var current = morphList.firstChildMorph;

      while (current) {
        var next = current.nextMorph;
        current.insertBeforeNode(originalFirstNode, null);
        current = next;
      }
      originalFirstNode.parentNode.removeChild(originalFirstNode);
    }
  };

  Morph.prototype._syncFirstNode = function Morph$syncFirstNode() {
    var morph = this;
    var parentMorphList;
    while (parentMorphList = morph.parentMorphList) {
      if (parentMorphList.mountedMorph === null) {
        break;
      }
      if (morph !== parentMorphList.firstChildMorph) {
        break;
      }
      if (morph.firstNode === parentMorphList.mountedMorph.firstNode) {
        break;
      }

      parentMorphList.mountedMorph.firstNode = morph.firstNode;

      morph = parentMorphList.mountedMorph;
    }
  };

  Morph.prototype._syncLastNode = function Morph$syncLastNode() {
    var morph = this;
    var parentMorphList;
    while (parentMorphList = morph.parentMorphList) {
      if (parentMorphList.mountedMorph === null) {
        break;
      }
      if (morph !== parentMorphList.lastChildMorph) {
        break;
      }
      if (morph.lastNode === parentMorphList.mountedMorph.lastNode) {
        break;
      }

      parentMorphList.mountedMorph.lastNode = morph.lastNode;

      morph = parentMorphList.mountedMorph;
    }
  };

  Morph.prototype.insertBeforeNode = function Morph$insertBeforeNode(parentNode, refNode) {
    _morphRangeUtils.insertBefore(parentNode, this.firstNode, this.lastNode, refNode);
  };

  Morph.prototype.appendToNode = function Morph$appendToNode(parentNode) {
    _morphRangeUtils.insertBefore(parentNode, this.firstNode, this.lastNode, null);
  };

  exports.default = Morph;
});
//# sourceMappingURL=data:application/json;base64,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QUFLLENBQUMsZUFBZSxFQUFFO0FBQzlDLFVBQUksZUFBZSxDQUFDLFlBQVksS0FBSyxJQUFJLEVBQUU7QUFDekMsY0FBTTtPQUNQO0FBQ0QsVUFBSSxLQUFLLEtBQUssZUFBZSxDQUFDLGNBQWMsRUFBRTtBQUM1QyxjQUFNO09BQ1A7QUFDRCxVQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssZUFBZSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUU7QUFDNUQsY0FBTTtPQUNQOztBQUVELHFCQUFlLENBQUMsWUFBWSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDOztBQUV2RCxXQUFLLEdBQUcsZUFBZSxDQUFDLFlBQVksQ0FBQztLQUN0QztHQUNGLENBQUM7O0FBRUYsT0FBSyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUU7QUFDdEYscUJBbFFjLFlBQVksQ0FrUWIsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztHQUNsRSxDQUFDOztBQUVGLE9BQUssQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFNBQVMsa0JBQWtCLENBQUMsVUFBVSxFQUFFO0FBQ3JFLHFCQXRRYyxZQUFZLENBc1FiLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDL0QsQ0FBQzs7b0JBRWEsS0FBSyIsImZpbGUiOiJtb3JwaC1yYW5nZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNsZWFyLCBpbnNlcnRCZWZvcmUgfSBmcm9tICcuL21vcnBoLXJhbmdlL3V0aWxzJztcblxuLy8gY29uc3RydWN0b3IganVzdCBpbml0aWFsaXplcyB0aGUgZmllbGRzXG4vLyB1c2Ugb25lIG9mIHRoZSBzdGF0aWMgaW5pdGlhbGl6ZXJzIHRvIGNyZWF0ZSBhIHZhbGlkIG1vcnBoLlxuZnVuY3Rpb24gTW9ycGgoZG9tSGVscGVyLCBjb250ZXh0dWFsRWxlbWVudCkge1xuICB0aGlzLmRvbUhlbHBlciA9IGRvbUhlbHBlcjtcbiAgLy8gY29udGV4dCBpZiBjb250ZW50IGlmIGN1cnJlbnQgY29udGVudCBpcyBkZXRhY2hlZFxuICB0aGlzLmNvbnRleHR1YWxFbGVtZW50ID0gY29udGV4dHVhbEVsZW1lbnQ7XG4gIC8vIGluY2x1c2l2ZSByYW5nZSBvZiBtb3JwaFxuICAvLyB0aGVzZSBzaG91bGQgYmUgbm9kZVR5cGUgMSwgMywgb3IgOFxuICB0aGlzLmZpcnN0Tm9kZSA9IG51bGw7XG4gIHRoaXMubGFzdE5vZGUgID0gbnVsbDtcblxuICAvLyBmbGFnIHRvIGZvcmNlIHRleHQgdG8gc2V0Q29udGVudCB0byBiZSB0cmVhdGVkIGFzIGh0bWxcbiAgdGhpcy5wYXJzZVRleHRBc0hUTUwgPSBmYWxzZTtcblxuICAvLyBtb3JwaCBsaXN0IGdyYXBoXG4gIHRoaXMucGFyZW50TW9ycGhMaXN0ID0gbnVsbDtcbiAgdGhpcy5wcmV2aW91c01vcnBoICAgPSBudWxsO1xuICB0aGlzLm5leHRNb3JwaCAgICAgICA9IG51bGw7XG59XG5cbk1vcnBoLmVtcHR5ID0gZnVuY3Rpb24gKGRvbUhlbHBlciwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdmFyIG1vcnBoID0gbmV3IE1vcnBoKGRvbUhlbHBlciwgY29udGV4dHVhbEVsZW1lbnQpO1xuICBtb3JwaC5jbGVhcigpO1xuICByZXR1cm4gbW9ycGg7XG59O1xuXG5Nb3JwaC5jcmVhdGUgPSBmdW5jdGlvbiAoZG9tSGVscGVyLCBjb250ZXh0dWFsRWxlbWVudCwgbm9kZSkge1xuICB2YXIgbW9ycGggPSBuZXcgTW9ycGgoZG9tSGVscGVyLCBjb250ZXh0dWFsRWxlbWVudCk7XG4gIG1vcnBoLnNldE5vZGUobm9kZSk7XG4gIHJldHVybiBtb3JwaDtcbn07XG5cbk1vcnBoLmF0dGFjaCA9IGZ1bmN0aW9uIChkb21IZWxwZXIsIGNvbnRleHR1YWxFbGVtZW50LCBmaXJzdE5vZGUsIGxhc3ROb2RlKSB7XG4gIHZhciBtb3JwaCA9IG5ldyBNb3JwaChkb21IZWxwZXIsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAgbW9ycGguc2V0UmFuZ2UoZmlyc3ROb2RlLCBsYXN0Tm9kZSk7XG4gIHJldHVybiBtb3JwaDtcbn07XG5cbk1vcnBoLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gTW9ycGgkc2V0Q29udGVudChjb250ZW50KSB7XG4gIGlmIChjb250ZW50ID09PSBudWxsIHx8IGNvbnRlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0aGlzLmNsZWFyKCk7XG4gIH1cblxuICB2YXIgdHlwZSA9IHR5cGVvZiBjb250ZW50O1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgaWYgKHRoaXMucGFyc2VUZXh0QXNIVE1MKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRvbUhlbHBlci5zZXRNb3JwaEhUTUwodGhpcywgY29udGVudCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5zZXRUZXh0KGNvbnRlbnQpO1xuICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICBpZiAodHlwZW9mIGNvbnRlbnQubm9kZVR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldE5vZGUoY29udGVudCk7XG4gICAgICB9XG4gICAgICAvKiBIYW5kbGViYXJzLlNhZmVTdHJpbmcgKi9cbiAgICAgIGlmICh0eXBlb2YgY29udGVudC5zdHJpbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldEhUTUwoY29udGVudC5zdHJpbmcpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMucGFyc2VUZXh0QXNIVE1MKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldEhUTUwoY29udGVudC50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICBjYXNlICdudW1iZXInOlxuICAgICAgcmV0dXJuIHRoaXMuc2V0VGV4dChjb250ZW50LnRvU3RyaW5nKCkpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd1bnN1cHBvcnRlZCBjb250ZW50Jyk7XG4gIH1cbn07XG5cbk1vcnBoLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIE1vcnBoJGNsZWFyKCkge1xuICB2YXIgbm9kZSA9IHRoaXMuc2V0Tm9kZSh0aGlzLmRvbUhlbHBlci5jcmVhdGVDb21tZW50KCcnKSk7XG4gIHJldHVybiBub2RlO1xufTtcblxuTW9ycGgucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbiBNb3JwaCRzZXRUZXh0KHRleHQpIHtcbiAgdmFyIGZpcnN0Tm9kZSA9IHRoaXMuZmlyc3ROb2RlO1xuICB2YXIgbGFzdE5vZGUgPSB0aGlzLmxhc3ROb2RlO1xuXG4gIGlmIChmaXJzdE5vZGUgJiZcbiAgICAgIGxhc3ROb2RlID09PSBmaXJzdE5vZGUgJiZcbiAgICAgIGZpcnN0Tm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgIGZpcnN0Tm9kZS5ub2RlVmFsdWUgPSB0ZXh0O1xuICAgIHJldHVybiBmaXJzdE5vZGU7XG4gIH1cblxuICByZXR1cm4gdGhpcy5zZXROb2RlKFxuICAgIHRleHQgPyB0aGlzLmRvbUhlbHBlci5jcmVhdGVUZXh0Tm9kZSh0ZXh0KSA6IHRoaXMuZG9tSGVscGVyLmNyZWF0ZUNvbW1lbnQoJycpXG4gICk7XG59O1xuXG5Nb3JwaC5wcm90b3R5cGUuc2V0Tm9kZSA9IGZ1bmN0aW9uIE1vcnBoJHNldE5vZGUobmV3Tm9kZSkge1xuICB2YXIgZmlyc3ROb2RlLCBsYXN0Tm9kZTtcbiAgc3dpdGNoIChuZXdOb2RlLm5vZGVUeXBlKSB7XG4gICAgY2FzZSAzOlxuICAgICAgZmlyc3ROb2RlID0gbmV3Tm9kZTtcbiAgICAgIGxhc3ROb2RlID0gbmV3Tm9kZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMTE6XG4gICAgICBmaXJzdE5vZGUgPSBuZXdOb2RlLmZpcnN0Q2hpbGQ7XG4gICAgICBsYXN0Tm9kZSA9IG5ld05vZGUubGFzdENoaWxkO1xuICAgICAgaWYgKGZpcnN0Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgICBmaXJzdE5vZGUgPSB0aGlzLmRvbUhlbHBlci5jcmVhdGVDb21tZW50KCcnKTtcbiAgICAgICAgbmV3Tm9kZS5hcHBlbmRDaGlsZChmaXJzdE5vZGUpO1xuICAgICAgICBsYXN0Tm9kZSA9IGZpcnN0Tm9kZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBmaXJzdE5vZGUgPSBuZXdOb2RlO1xuICAgICAgbGFzdE5vZGUgPSBuZXdOb2RlO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICB0aGlzLnNldFJhbmdlKGZpcnN0Tm9kZSwgbGFzdE5vZGUpO1xuXG4gIHJldHVybiBuZXdOb2RlO1xufTtcblxuTW9ycGgucHJvdG90eXBlLnNldFJhbmdlID0gZnVuY3Rpb24gKGZpcnN0Tm9kZSwgbGFzdE5vZGUpIHtcbiAgdmFyIHByZXZpb3VzRmlyc3ROb2RlID0gdGhpcy5maXJzdE5vZGU7XG4gIGlmIChwcmV2aW91c0ZpcnN0Tm9kZSAhPT0gbnVsbCkge1xuXG4gICAgdmFyIHBhcmVudE5vZGUgPSBwcmV2aW91c0ZpcnN0Tm9kZS5wYXJlbnROb2RlO1xuICAgIGlmIChwYXJlbnROb2RlICE9PSBudWxsKSB7XG4gICAgICBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgZmlyc3ROb2RlLCBsYXN0Tm9kZSwgcHJldmlvdXNGaXJzdE5vZGUpO1xuICAgICAgY2xlYXIocGFyZW50Tm9kZSwgcHJldmlvdXNGaXJzdE5vZGUsIHRoaXMubGFzdE5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuZmlyc3ROb2RlID0gZmlyc3ROb2RlO1xuICB0aGlzLmxhc3ROb2RlID0gbGFzdE5vZGU7XG5cbiAgaWYgKHRoaXMucGFyZW50TW9ycGhMaXN0KSB7XG4gICAgdGhpcy5fc3luY0ZpcnN0Tm9kZSgpO1xuICAgIHRoaXMuX3N5bmNMYXN0Tm9kZSgpO1xuICB9XG59O1xuXG5Nb3JwaC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIE1vcnBoJGRlc3Ryb3koKSB7XG4gIHRoaXMudW5saW5rKCk7XG5cbiAgdmFyIGZpcnN0Tm9kZSA9IHRoaXMuZmlyc3ROb2RlO1xuICB2YXIgbGFzdE5vZGUgPSB0aGlzLmxhc3ROb2RlO1xuICB2YXIgcGFyZW50Tm9kZSA9IGZpcnN0Tm9kZSAmJiBmaXJzdE5vZGUucGFyZW50Tm9kZTtcblxuICB0aGlzLmZpcnN0Tm9kZSA9IG51bGw7XG4gIHRoaXMubGFzdE5vZGUgPSBudWxsO1xuXG4gIGNsZWFyKHBhcmVudE5vZGUsIGZpcnN0Tm9kZSwgbGFzdE5vZGUpO1xufTtcblxuTW9ycGgucHJvdG90eXBlLnVubGluayA9IGZ1bmN0aW9uIE1vcnBoJHVubGluaygpIHtcbiAgdmFyIHBhcmVudE1vcnBoTGlzdCA9IHRoaXMucGFyZW50TW9ycGhMaXN0O1xuICB2YXIgcHJldmlvdXNNb3JwaCA9IHRoaXMucHJldmlvdXNNb3JwaDtcbiAgdmFyIG5leHRNb3JwaCA9IHRoaXMubmV4dE1vcnBoO1xuXG4gIGlmIChwcmV2aW91c01vcnBoKSB7XG4gICAgaWYgKG5leHRNb3JwaCkge1xuICAgICAgcHJldmlvdXNNb3JwaC5uZXh0TW9ycGggPSBuZXh0TW9ycGg7XG4gICAgICBuZXh0TW9ycGgucHJldmlvdXNNb3JwaCA9IHByZXZpb3VzTW9ycGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByZXZpb3VzTW9ycGgubmV4dE1vcnBoID0gbnVsbDtcbiAgICAgIHBhcmVudE1vcnBoTGlzdC5sYXN0Q2hpbGRNb3JwaCA9IHByZXZpb3VzTW9ycGg7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChuZXh0TW9ycGgpIHtcbiAgICAgIG5leHRNb3JwaC5wcmV2aW91c01vcnBoID0gbnVsbDtcbiAgICAgIHBhcmVudE1vcnBoTGlzdC5maXJzdENoaWxkTW9ycGggPSBuZXh0TW9ycGg7XG4gICAgfSBlbHNlIGlmIChwYXJlbnRNb3JwaExpc3QpIHtcbiAgICAgIHBhcmVudE1vcnBoTGlzdC5sYXN0Q2hpbGRNb3JwaCA9IHBhcmVudE1vcnBoTGlzdC5maXJzdENoaWxkTW9ycGggPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMucGFyZW50TW9ycGhMaXN0ID0gbnVsbDtcbiAgdGhpcy5uZXh0TW9ycGggPSBudWxsO1xuICB0aGlzLnByZXZpb3VzTW9ycGggPSBudWxsO1xuXG4gIGlmIChwYXJlbnRNb3JwaExpc3QgJiYgcGFyZW50TW9ycGhMaXN0Lm1vdW50ZWRNb3JwaCkge1xuICAgIGlmICghcGFyZW50TW9ycGhMaXN0LmZpcnN0Q2hpbGRNb3JwaCkge1xuICAgICAgLy8gbGlzdCBpcyBlbXB0eVxuICAgICAgcGFyZW50TW9ycGhMaXN0Lm1vdW50ZWRNb3JwaC5jbGVhcigpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJlbnRNb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoLl9zeW5jRmlyc3ROb2RlKCk7XG4gICAgICBwYXJlbnRNb3JwaExpc3QubGFzdENoaWxkTW9ycGguX3N5bmNMYXN0Tm9kZSgpO1xuICAgIH1cbiAgfVxufTtcblxuTW9ycGgucHJvdG90eXBlLnNldEhUTUwgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciBmcmFnbWVudCA9IHRoaXMuZG9tSGVscGVyLnBhcnNlSFRNTCh0ZXh0LCB0aGlzLmNvbnRleHR1YWxFbGVtZW50KTtcbiAgcmV0dXJuIHRoaXMuc2V0Tm9kZShmcmFnbWVudCk7XG59O1xuXG5Nb3JwaC5wcm90b3R5cGUuc2V0TW9ycGhMaXN0ID0gZnVuY3Rpb24gTW9ycGgkYXBwZW5kTW9ycGhMaXN0KG1vcnBoTGlzdCkge1xuICBtb3JwaExpc3QubW91bnRlZE1vcnBoID0gdGhpcztcbiAgdGhpcy5jbGVhcigpO1xuXG4gIHZhciBvcmlnaW5hbEZpcnN0Tm9kZSA9IHRoaXMuZmlyc3ROb2RlO1xuXG4gIGlmIChtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoKSB7XG4gICAgdGhpcy5maXJzdE5vZGUgPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoLmZpcnN0Tm9kZTtcbiAgICB0aGlzLmxhc3ROb2RlID0gbW9ycGhMaXN0Lmxhc3RDaGlsZE1vcnBoLmxhc3ROb2RlO1xuXG4gICAgdmFyIGN1cnJlbnQgPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuXG4gICAgd2hpbGUgKGN1cnJlbnQpIHtcbiAgICAgIHZhciBuZXh0ID0gY3VycmVudC5uZXh0TW9ycGg7XG4gICAgICBjdXJyZW50Lmluc2VydEJlZm9yZU5vZGUob3JpZ2luYWxGaXJzdE5vZGUsIG51bGwpO1xuICAgICAgY3VycmVudCA9IG5leHQ7XG4gICAgfVxuICAgIG9yaWdpbmFsRmlyc3ROb2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQob3JpZ2luYWxGaXJzdE5vZGUpO1xuICB9XG59O1xuXG5Nb3JwaC5wcm90b3R5cGUuX3N5bmNGaXJzdE5vZGUgPSBmdW5jdGlvbiBNb3JwaCRzeW5jRmlyc3ROb2RlKCkge1xuICB2YXIgbW9ycGggPSB0aGlzO1xuICB2YXIgcGFyZW50TW9ycGhMaXN0O1xuICB3aGlsZSAocGFyZW50TW9ycGhMaXN0ID0gbW9ycGgucGFyZW50TW9ycGhMaXN0KSB7XG4gICAgaWYgKHBhcmVudE1vcnBoTGlzdC5tb3VudGVkTW9ycGggPT09IG51bGwpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAobW9ycGggIT09IHBhcmVudE1vcnBoTGlzdC5maXJzdENoaWxkTW9ycGgpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAobW9ycGguZmlyc3ROb2RlID09PSBwYXJlbnRNb3JwaExpc3QubW91bnRlZE1vcnBoLmZpcnN0Tm9kZSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcGFyZW50TW9ycGhMaXN0Lm1vdW50ZWRNb3JwaC5maXJzdE5vZGUgPSBtb3JwaC5maXJzdE5vZGU7XG5cbiAgICBtb3JwaCA9IHBhcmVudE1vcnBoTGlzdC5tb3VudGVkTW9ycGg7XG4gIH1cbn07XG5cbk1vcnBoLnByb3RvdHlwZS5fc3luY0xhc3ROb2RlID0gZnVuY3Rpb24gTW9ycGgkc3luY0xhc3ROb2RlKCkge1xuICB2YXIgbW9ycGggPSB0aGlzO1xuICB2YXIgcGFyZW50TW9ycGhMaXN0O1xuICB3aGlsZSAocGFyZW50TW9ycGhMaXN0ID0gbW9ycGgucGFyZW50TW9ycGhMaXN0KSB7XG4gICAgaWYgKHBhcmVudE1vcnBoTGlzdC5tb3VudGVkTW9ycGggPT09IG51bGwpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAobW9ycGggIT09IHBhcmVudE1vcnBoTGlzdC5sYXN0Q2hpbGRNb3JwaCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChtb3JwaC5sYXN0Tm9kZSA9PT0gcGFyZW50TW9ycGhMaXN0Lm1vdW50ZWRNb3JwaC5sYXN0Tm9kZSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcGFyZW50TW9ycGhMaXN0Lm1vdW50ZWRNb3JwaC5sYXN0Tm9kZSA9IG1vcnBoLmxhc3ROb2RlO1xuXG4gICAgbW9ycGggPSBwYXJlbnRNb3JwaExpc3QubW91bnRlZE1vcnBoO1xuICB9XG59O1xuXG5Nb3JwaC5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlTm9kZSA9IGZ1bmN0aW9uIE1vcnBoJGluc2VydEJlZm9yZU5vZGUocGFyZW50Tm9kZSwgcmVmTm9kZSkge1xuICBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgdGhpcy5maXJzdE5vZGUsIHRoaXMubGFzdE5vZGUsIHJlZk5vZGUpO1xufTtcblxuTW9ycGgucHJvdG90eXBlLmFwcGVuZFRvTm9kZSA9IGZ1bmN0aW9uIE1vcnBoJGFwcGVuZFRvTm9kZShwYXJlbnROb2RlKSB7XG4gIGluc2VydEJlZm9yZShwYXJlbnROb2RlLCB0aGlzLmZpcnN0Tm9kZSwgdGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBNb3JwaDtcbiJdfQ==
define('morph-range.umd', ['exports', './morph-range'], function (exports, _morphRange) {

  (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory);
    } else if (typeof exports === 'object') {
      module.exports = factory();
    } else {
      root.Morph = factory();
    }
  })(this, function () {
    return _morphRange.default;
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlLnVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLEFBQUMsR0FBQSxVQUFVLElBQUksRUFBRSxPQUFPLEVBQUU7QUFDeEIsUUFBSSxPQUFPLE1BQU0sS0FBSyxVQUFVLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtBQUM5QyxZQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3JCLE1BQU0sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7QUFDdEMsWUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLEVBQUUsQ0FBQztLQUM1QixNQUFNO0FBQ0wsVUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLEVBQUUsQ0FBQztLQUN4QjtHQUNGLENBQUEsQ0FBQyxJQUFJLEVBQUUsWUFBWTtBQUNsQiwrQkFBYTtHQUNkLENBQUMsQ0FBRSIsImZpbGUiOiJtb3JwaC1yYW5nZS51bWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTW9ycGggZnJvbSAnLi9tb3JwaC1yYW5nZSc7XG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICByb290Lk1vcnBoID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIE1vcnBoO1xufSkpO1xuIl19
define('morph-range/morph-list', ['exports', './utils'], function (exports, _utils) {

  function MorphList() {
    // morph graph
    this.firstChildMorph = null;
    this.lastChildMorph = null;

    this.mountedMorph = null;
  }

  var prototype = MorphList.prototype;

  prototype.clear = function MorphList$clear() {
    var current = this.firstChildMorph;

    while (current) {
      var next = current.nextMorph;
      current.previousMorph = null;
      current.nextMorph = null;
      current.parentMorphList = null;
      current = next;
    }

    this.firstChildMorph = this.lastChildMorph = null;
  };

  prototype.destroy = function MorphList$destroy() {};

  prototype.appendMorph = function MorphList$appendMorph(morph) {
    this.insertBeforeMorph(morph, null);
  };

  prototype.insertBeforeMorph = function MorphList$insertBeforeMorph(morph, referenceMorph) {
    if (morph.parentMorphList !== null) {
      morph.unlink();
    }
    if (referenceMorph && referenceMorph.parentMorphList !== this) {
      throw new Error('The morph before which the new morph is to be inserted is not a child of this morph.');
    }

    var mountedMorph = this.mountedMorph;

    if (mountedMorph) {

      var parentNode = mountedMorph.firstNode.parentNode;
      var referenceNode = referenceMorph ? referenceMorph.firstNode : mountedMorph.lastNode.nextSibling;

      _utils.insertBefore(parentNode, morph.firstNode, morph.lastNode, referenceNode);

      // was not in list mode replace current content
      if (!this.firstChildMorph) {
        _utils.clear(this.mountedMorph.firstNode.parentNode, this.mountedMorph.firstNode, this.mountedMorph.lastNode);
      }
    }

    morph.parentMorphList = this;

    var previousMorph = referenceMorph ? referenceMorph.previousMorph : this.lastChildMorph;
    if (previousMorph) {
      previousMorph.nextMorph = morph;
      morph.previousMorph = previousMorph;
    } else {
      this.firstChildMorph = morph;
    }

    if (referenceMorph) {
      referenceMorph.previousMorph = morph;
      morph.nextMorph = referenceMorph;
    } else {
      this.lastChildMorph = morph;
    }

    this.firstChildMorph._syncFirstNode();
    this.lastChildMorph._syncLastNode();
  };

  prototype.removeChildMorph = function MorphList$removeChildMorph(morph) {
    if (morph.parentMorphList !== this) {
      throw new Error("Cannot remove a morph from a parent it is not inside of");
    }

    morph.destroy();
  };

  exports.default = MorphList;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL21vcnBoLWxpc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxXQUFTLFNBQVMsR0FBRzs7QUFFbkIsUUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7QUFDNUIsUUFBSSxDQUFDLGNBQWMsR0FBSSxJQUFJLENBQUM7O0FBRTVCLFFBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0dBQzFCOztBQUVELE1BQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7O0FBRXBDLFdBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxlQUFlLEdBQUc7QUFDM0MsUUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQzs7QUFFbkMsV0FBTyxPQUFPLEVBQUU7QUFDZCxVQUFJLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQzdCLGFBQU8sQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQzdCLGFBQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3pCLGFBQU8sQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBQy9CLGFBQU8sR0FBRyxJQUFJLENBQUM7S0FDaEI7O0FBRUQsUUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztHQUNuRCxDQUFDOztBQUVGLFdBQVMsQ0FBQyxPQUFPLEdBQUcsU0FBUyxpQkFBaUIsR0FBRyxFQUNoRCxDQUFDOztBQUVGLFdBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUU7QUFDNUQsUUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztHQUNyQyxDQUFDOztBQUVGLFdBQVMsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLDJCQUEyQixDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUU7QUFDeEYsUUFBSSxLQUFLLENBQUMsZUFBZSxLQUFLLElBQUksRUFBRTtBQUNsQyxXQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDaEI7QUFDRCxRQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsZUFBZSxLQUFLLElBQUksRUFBRTtBQUM3RCxZQUFNLElBQUksS0FBSyxDQUFDLHNGQUFzRixDQUFDLENBQUM7S0FDekc7O0FBRUQsUUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQzs7QUFFckMsUUFBSSxZQUFZLEVBQUU7O0FBRWhCLFVBQUksVUFBVSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO0FBQ25ELFVBQUksYUFBYSxHQUFHLGNBQWMsR0FBRyxjQUFjLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDOztBQUVsRyxhQWhEWSxZQUFZLENBaUR0QixVQUFVLEVBQ1YsS0FBSyxDQUFDLFNBQVMsRUFDZixLQUFLLENBQUMsUUFBUSxFQUNkLGFBQWEsQ0FDZCxDQUFDOzs7QUFHRixVQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRTtBQUN6QixlQXpERyxLQUFLLENBeURGLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7T0FDbkM7S0FDRjs7QUFFRCxTQUFLLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzs7QUFFN0IsUUFBSSxhQUFhLEdBQUcsY0FBYyxHQUFHLGNBQWMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztBQUN4RixRQUFJLGFBQWEsRUFBRTtBQUNqQixtQkFBYSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFDaEMsV0FBSyxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7S0FDckMsTUFBTTtBQUNMLFVBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0tBQzlCOztBQUVELFFBQUksY0FBYyxFQUFFO0FBQ2xCLG9CQUFjLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztBQUNyQyxXQUFLLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQztLQUNsQyxNQUFNO0FBQ0wsVUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7S0FDN0I7O0FBRUQsUUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUN0QyxRQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO0dBQ3JDLENBQUM7O0FBRUYsV0FBUyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsMEJBQTBCLENBQUMsS0FBSyxFQUFFO0FBQ3RFLFFBQUksS0FBSyxDQUFDLGVBQWUsS0FBSyxJQUFJLEVBQUU7QUFDbEMsWUFBTSxJQUFJLEtBQUssQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0tBQzVFOztBQUVELFNBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUNqQixDQUFDOztvQkFFYSxTQUFTIiwiZmlsZSI6Im1vcnBoLXJhbmdlL21vcnBoLWxpc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbGVhciwgaW5zZXJ0QmVmb3JlIH0gZnJvbSAnLi91dGlscyc7XG5cbmZ1bmN0aW9uIE1vcnBoTGlzdCgpIHtcbiAgLy8gbW9ycGggZ3JhcGhcbiAgdGhpcy5maXJzdENoaWxkTW9ycGggPSBudWxsO1xuICB0aGlzLmxhc3RDaGlsZE1vcnBoICA9IG51bGw7XG5cbiAgdGhpcy5tb3VudGVkTW9ycGggPSBudWxsO1xufVxuXG52YXIgcHJvdG90eXBlID0gTW9ycGhMaXN0LnByb3RvdHlwZTtcblxucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gTW9ycGhMaXN0JGNsZWFyKCkge1xuICB2YXIgY3VycmVudCA9IHRoaXMuZmlyc3RDaGlsZE1vcnBoO1xuXG4gIHdoaWxlIChjdXJyZW50KSB7XG4gICAgdmFyIG5leHQgPSBjdXJyZW50Lm5leHRNb3JwaDtcbiAgICBjdXJyZW50LnByZXZpb3VzTW9ycGggPSBudWxsO1xuICAgIGN1cnJlbnQubmV4dE1vcnBoID0gbnVsbDtcbiAgICBjdXJyZW50LnBhcmVudE1vcnBoTGlzdCA9IG51bGw7XG4gICAgY3VycmVudCA9IG5leHQ7XG4gIH1cblxuICB0aGlzLmZpcnN0Q2hpbGRNb3JwaCA9IHRoaXMubGFzdENoaWxkTW9ycGggPSBudWxsO1xufTtcblxucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiBNb3JwaExpc3QkZGVzdHJveSgpIHtcbn07XG5cbnByb3RvdHlwZS5hcHBlbmRNb3JwaCA9IGZ1bmN0aW9uIE1vcnBoTGlzdCRhcHBlbmRNb3JwaChtb3JwaCkge1xuICB0aGlzLmluc2VydEJlZm9yZU1vcnBoKG1vcnBoLCBudWxsKTtcbn07XG5cbnByb3RvdHlwZS5pbnNlcnRCZWZvcmVNb3JwaCA9IGZ1bmN0aW9uIE1vcnBoTGlzdCRpbnNlcnRCZWZvcmVNb3JwaChtb3JwaCwgcmVmZXJlbmNlTW9ycGgpIHtcbiAgaWYgKG1vcnBoLnBhcmVudE1vcnBoTGlzdCAhPT0gbnVsbCkge1xuICAgIG1vcnBoLnVubGluaygpO1xuICB9XG4gIGlmIChyZWZlcmVuY2VNb3JwaCAmJiByZWZlcmVuY2VNb3JwaC5wYXJlbnRNb3JwaExpc3QgIT09IHRoaXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBtb3JwaCBiZWZvcmUgd2hpY2ggdGhlIG5ldyBtb3JwaCBpcyB0byBiZSBpbnNlcnRlZCBpcyBub3QgYSBjaGlsZCBvZiB0aGlzIG1vcnBoLicpO1xuICB9XG5cbiAgdmFyIG1vdW50ZWRNb3JwaCA9IHRoaXMubW91bnRlZE1vcnBoO1xuXG4gIGlmIChtb3VudGVkTW9ycGgpIHtcblxuICAgIHZhciBwYXJlbnROb2RlID0gbW91bnRlZE1vcnBoLmZpcnN0Tm9kZS5wYXJlbnROb2RlO1xuICAgIHZhciByZWZlcmVuY2VOb2RlID0gcmVmZXJlbmNlTW9ycGggPyByZWZlcmVuY2VNb3JwaC5maXJzdE5vZGUgOiBtb3VudGVkTW9ycGgubGFzdE5vZGUubmV4dFNpYmxpbmc7XG5cbiAgICBpbnNlcnRCZWZvcmUoXG4gICAgICBwYXJlbnROb2RlLFxuICAgICAgbW9ycGguZmlyc3ROb2RlLFxuICAgICAgbW9ycGgubGFzdE5vZGUsXG4gICAgICByZWZlcmVuY2VOb2RlXG4gICAgKTtcblxuICAgIC8vIHdhcyBub3QgaW4gbGlzdCBtb2RlIHJlcGxhY2UgY3VycmVudCBjb250ZW50XG4gICAgaWYgKCF0aGlzLmZpcnN0Q2hpbGRNb3JwaCkge1xuICAgICAgY2xlYXIodGhpcy5tb3VudGVkTW9ycGguZmlyc3ROb2RlLnBhcmVudE5vZGUsXG4gICAgICAgICAgICB0aGlzLm1vdW50ZWRNb3JwaC5maXJzdE5vZGUsXG4gICAgICAgICAgICB0aGlzLm1vdW50ZWRNb3JwaC5sYXN0Tm9kZSk7XG4gICAgfVxuICB9XG5cbiAgbW9ycGgucGFyZW50TW9ycGhMaXN0ID0gdGhpcztcblxuICB2YXIgcHJldmlvdXNNb3JwaCA9IHJlZmVyZW5jZU1vcnBoID8gcmVmZXJlbmNlTW9ycGgucHJldmlvdXNNb3JwaCA6IHRoaXMubGFzdENoaWxkTW9ycGg7XG4gIGlmIChwcmV2aW91c01vcnBoKSB7XG4gICAgcHJldmlvdXNNb3JwaC5uZXh0TW9ycGggPSBtb3JwaDtcbiAgICBtb3JwaC5wcmV2aW91c01vcnBoID0gcHJldmlvdXNNb3JwaDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmZpcnN0Q2hpbGRNb3JwaCA9IG1vcnBoO1xuICB9XG5cbiAgaWYgKHJlZmVyZW5jZU1vcnBoKSB7XG4gICAgcmVmZXJlbmNlTW9ycGgucHJldmlvdXNNb3JwaCA9IG1vcnBoO1xuICAgIG1vcnBoLm5leHRNb3JwaCA9IHJlZmVyZW5jZU1vcnBoO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubGFzdENoaWxkTW9ycGggPSBtb3JwaDtcbiAgfVxuXG4gIHRoaXMuZmlyc3RDaGlsZE1vcnBoLl9zeW5jRmlyc3ROb2RlKCk7XG4gIHRoaXMubGFzdENoaWxkTW9ycGguX3N5bmNMYXN0Tm9kZSgpO1xufTtcblxucHJvdG90eXBlLnJlbW92ZUNoaWxkTW9ycGggPSBmdW5jdGlvbiBNb3JwaExpc3QkcmVtb3ZlQ2hpbGRNb3JwaChtb3JwaCkge1xuICBpZiAobW9ycGgucGFyZW50TW9ycGhMaXN0ICE9PSB0aGlzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJlbW92ZSBhIG1vcnBoIGZyb20gYSBwYXJlbnQgaXQgaXMgbm90IGluc2lkZSBvZlwiKTtcbiAgfVxuXG4gIG1vcnBoLmRlc3Ryb3koKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IE1vcnBoTGlzdDtcbiJdfQ==
define('morph-range/morph-list.umd', ['exports', './morph-list'], function (exports, _morphList) {

  (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory);
    } else if (typeof exports === 'object') {
      module.exports = factory();
    } else {
      root.MorphList = factory();
    }
  })(this, function () {
    return _morphList.default;
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL21vcnBoLWxpc3QudW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsQUFBQyxHQUFBLFVBQVUsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUN4QixRQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQzlDLFlBQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDckIsTUFBTSxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTtBQUN0QyxZQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sRUFBRSxDQUFDO0tBQzVCLE1BQU07QUFDTCxVQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sRUFBRSxDQUFDO0tBQzVCO0dBQ0YsQ0FBQSxDQUFDLElBQUksRUFBRSxZQUFZO0FBQ2xCLDhCQUFpQjtHQUNsQixDQUFDLENBQUUiLCJmaWxlIjoibW9ycGgtcmFuZ2UvbW9ycGgtbGlzdC51bWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTW9ycGhMaXN0IGZyb20gJy4vbW9ycGgtbGlzdCc7XG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICByb290Lk1vcnBoTGlzdCA9IGZhY3RvcnkoKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBNb3JwaExpc3Q7XG59KSk7XG4iXX0=
define("morph-range/utils", ["exports"], function (exports) {
  exports.clear = clear;
  exports.insertBefore = insertBefore;
  // inclusive of both nodes

  function clear(parentNode, firstNode, lastNode) {
    if (!parentNode) {
      return;
    }

    var node = firstNode;
    var nextNode;
    do {
      nextNode = node.nextSibling;
      parentNode.removeChild(node);
      if (node === lastNode) {
        break;
      }
      node = nextNode;
    } while (node);
  }

  function insertBefore(parentNode, firstNode, lastNode, refNode) {
    var node = firstNode;
    var nextNode;
    do {
      nextNode = node.nextSibling;
      parentNode.insertBefore(node, refNode);
      if (node === lastNode) {
        break;
      }
      node = nextNode;
    } while (node);
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQ08sV0FBUyxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUU7QUFDckQsUUFBSSxDQUFDLFVBQVUsRUFBRTtBQUFFLGFBQU87S0FBRTs7QUFFNUIsUUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDO0FBQ3JCLFFBQUksUUFBUSxDQUFDO0FBQ2IsT0FBRztBQUNELGNBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO0FBQzVCLGdCQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdCLFVBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtBQUNyQixjQUFNO09BQ1A7QUFDRCxVQUFJLEdBQUcsUUFBUSxDQUFDO0tBQ2pCLFFBQVEsSUFBSSxFQUFFO0dBQ2hCOztBQUVNLFdBQVMsWUFBWSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUNyRSxRQUFJLElBQUksR0FBRyxTQUFTLENBQUM7QUFDckIsUUFBSSxRQUFRLENBQUM7QUFDYixPQUFHO0FBQ0QsY0FBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDNUIsZ0JBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLFVBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtBQUNyQixjQUFNO09BQ1A7QUFDRCxVQUFJLEdBQUcsUUFBUSxDQUFDO0tBQ2pCLFFBQVEsSUFBSSxFQUFFO0dBQ2hCIiwiZmlsZSI6Im1vcnBoLXJhbmdlL3V0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW5jbHVzaXZlIG9mIGJvdGggbm9kZXNcbmV4cG9ydCBmdW5jdGlvbiBjbGVhcihwYXJlbnROb2RlLCBmaXJzdE5vZGUsIGxhc3ROb2RlKSB7XG4gIGlmICghcGFyZW50Tm9kZSkgeyByZXR1cm47IH1cblxuICB2YXIgbm9kZSA9IGZpcnN0Tm9kZTtcbiAgdmFyIG5leHROb2RlO1xuICBkbyB7XG4gICAgbmV4dE5vZGUgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgaWYgKG5vZGUgPT09IGxhc3ROb2RlKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbm9kZSA9IG5leHROb2RlO1xuICB9IHdoaWxlIChub2RlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEJlZm9yZShwYXJlbnROb2RlLCBmaXJzdE5vZGUsIGxhc3ROb2RlLCByZWZOb2RlKSB7XG4gIHZhciBub2RlID0gZmlyc3ROb2RlO1xuICB2YXIgbmV4dE5vZGU7XG4gIGRvIHtcbiAgICBuZXh0Tm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgcmVmTm9kZSk7XG4gICAgaWYgKG5vZGUgPT09IGxhc3ROb2RlKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbm9kZSA9IG5leHROb2RlO1xuICB9IHdoaWxlIChub2RlKTtcbn1cbiJdfQ==