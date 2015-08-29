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