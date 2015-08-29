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
define('dom-helper.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('dom-helper.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNCLE9BQUssQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDOUQsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUNBQW1DLENBQUMsQ0FBQztHQUN0RCxDQUFDLENBQUMiLCJmaWxlIjoiZG9tLWhlbHBlci5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIC4nKTtcblFVbml0LnRlc3QoJ2RvbS1oZWxwZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2RvbS1oZWxwZXIuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('dom-helper/build-html-dom.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper');
  QUnit.test('dom-helper/build-html-dom.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper/build-html-dom.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIvYnVpbGQtaHRtbC1kb20uanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDcEMsT0FBSyxDQUFDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUM3RSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0dBQ3JFLENBQUMsQ0FBQyIsImZpbGUiOiJkb20taGVscGVyL2J1aWxkLWh0bWwtZG9tLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gZG9tLWhlbHBlcicpO1xuUVVuaXQudGVzdCgnZG9tLWhlbHBlci9idWlsZC1odG1sLWRvbS5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci9idWlsZC1odG1sLWRvbS5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
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
define('dom-helper/classes.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper');
  QUnit.test('dom-helper/classes.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper/classes.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIvY2xhc3Nlcy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNwQyxPQUFLLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3RFLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDJDQUEyQyxDQUFDLENBQUM7R0FDOUQsQ0FBQyxDQUFDIiwiZmlsZSI6ImRvbS1oZWxwZXIvY2xhc3Nlcy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGRvbS1oZWxwZXInKTtcblFVbml0LnRlc3QoJ2RvbS1oZWxwZXIvY2xhc3Nlcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci9jbGFzc2VzLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
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
define('dom-helper/prop.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - dom-helper');
  QUnit.test('dom-helper/prop.js should pass jshint', function (assert) {
    assert.ok(true, 'dom-helper/prop.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIvcHJvcC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNwQyxPQUFLLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ25FLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLHdDQUF3QyxDQUFDLENBQUM7R0FDM0QsQ0FBQyxDQUFDIiwiZmlsZSI6ImRvbS1oZWxwZXIvcHJvcC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGRvbS1oZWxwZXInKTtcblFVbml0LnRlc3QoJ2RvbS1oZWxwZXIvcHJvcC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnZG9tLWhlbHBlci9wcm9wLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-compiler-tests/compile-tests', ['exports', '../htmlbars-compiler/compiler'], function (exports, _htmlbarsCompilerCompiler) {

  QUnit.module('compile: buildMeta');

  test('is merged into meta in template', function () {
    var template = _htmlbarsCompilerCompiler.compile('Hi, {{name}}!', {
      buildMeta: function () {
        return { blah: 'zorz' };
      }
    });

    equal(template.meta.blah, 'zorz', 'return value from buildMeta was pass through');
  });

  test('the program is passed to the callback function', function () {
    var template = _htmlbarsCompilerCompiler.compile('Hi, {{name}}!', {
      buildMeta: function (program) {
        return { loc: program.loc };
      }
    });

    equal(template.meta.loc.start.line, 1, 'the loc was passed through from program');
  });

  test('value keys are properly stringified', function () {
    var template = _htmlbarsCompilerCompiler.compile('Hi, {{name}}!', {
      buildMeta: function () {
        return { 'loc-derp.lol': 'zorz' };
      }
    });

    equal(template.meta['loc-derp.lol'], 'zorz', 'return value from buildMeta was pass through');
  });

  test('returning undefined does not throw errors', function () {
    var template = _htmlbarsCompilerCompiler.compile('Hi, {{name}}!', {
      buildMeta: function () {
        return;
      }
    });

    ok(template.meta, 'meta is present in template, even if empty');
  });

  test('options are not required for `compile`', function () {
    var template = _htmlbarsCompilerCompiler.compile('Hi, {{name}}!');

    ok(template.meta, 'meta is present in template, even if empty');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2NvbXBpbGUtdGVzdHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxPQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7O0FBRW5DLE1BQUksQ0FBQyxpQ0FBaUMsRUFBRSxZQUFXO0FBQ2pELFFBQUksUUFBUSxHQUFHLDBCQUxSLE9BQU8sQ0FLUyxlQUFlLEVBQUU7QUFDdEMsZUFBUyxFQUFFLFlBQVc7QUFDcEIsZUFBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztPQUN6QjtLQUNGLENBQUMsQ0FBQzs7QUFFSCxTQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLDhDQUE4QyxDQUFDLENBQUM7R0FDbkYsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxnREFBZ0QsRUFBRSxZQUFXO0FBQ2hFLFFBQUksUUFBUSxHQUFHLDBCQWZSLE9BQU8sQ0FlUyxlQUFlLEVBQUU7QUFDdEMsZUFBUyxFQUFFLFVBQVMsT0FBTyxFQUFFO0FBQzNCLGVBQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO09BQzdCO0tBQ0YsQ0FBQyxDQUFDOztBQUVILFNBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO0dBQ25GLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMscUNBQXFDLEVBQUUsWUFBVztBQUNyRCxRQUFJLFFBQVEsR0FBRywwQkF6QlIsT0FBTyxDQXlCUyxlQUFlLEVBQUU7QUFDdEMsZUFBUyxFQUFFLFlBQVc7QUFDcEIsZUFBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsQ0FBQztPQUNuQztLQUNGLENBQUMsQ0FBQzs7QUFFSCxTQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsOENBQThDLENBQUMsQ0FBQztHQUM5RixDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLDJDQUEyQyxFQUFFLFlBQVk7QUFDNUQsUUFBSSxRQUFRLEdBQUcsMEJBbkNSLE9BQU8sQ0FtQ1MsZUFBZSxFQUFFO0FBQ3RDLGVBQVMsRUFBRSxZQUFXO0FBQ3BCLGVBQU87T0FDUjtLQUNGLENBQUMsQ0FBQzs7QUFFSCxNQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSw0Q0FBNEMsQ0FBQyxDQUFDO0dBQ2pFLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsd0NBQXdDLEVBQUUsWUFBWTtBQUN6RCxRQUFJLFFBQVEsR0FBRywwQkE3Q1IsT0FBTyxDQTZDUyxlQUFlLENBQUMsQ0FBQzs7QUFFeEMsTUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsNENBQTRDLENBQUMsQ0FBQztHQUNqRSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvY29tcGlsZS10ZXN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNvbXBpbGUgfSBmcm9tIFwiLi4vaHRtbGJhcnMtY29tcGlsZXIvY29tcGlsZXJcIjtcblxuUVVuaXQubW9kdWxlKCdjb21waWxlOiBidWlsZE1ldGEnKTtcblxudGVzdCgnaXMgbWVyZ2VkIGludG8gbWV0YSBpbiB0ZW1wbGF0ZScsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCdIaSwge3tuYW1lfX0hJywge1xuICAgIGJ1aWxkTWV0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4geyBibGFoOiAnem9yeicgfTtcbiAgICB9XG4gIH0pO1xuXG4gIGVxdWFsKHRlbXBsYXRlLm1ldGEuYmxhaCwgJ3pvcnonLCAncmV0dXJuIHZhbHVlIGZyb20gYnVpbGRNZXRhIHdhcyBwYXNzIHRocm91Z2gnKTtcbn0pO1xuXG50ZXN0KCd0aGUgcHJvZ3JhbSBpcyBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uJywgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJ0hpLCB7e25hbWV9fSEnLCB7XG4gICAgYnVpbGRNZXRhOiBmdW5jdGlvbihwcm9ncmFtKSB7XG4gICAgICByZXR1cm4geyBsb2M6IHByb2dyYW0ubG9jIH07XG4gICAgfVxuICB9KTtcblxuICBlcXVhbCh0ZW1wbGF0ZS5tZXRhLmxvYy5zdGFydC5saW5lLCAxLCAndGhlIGxvYyB3YXMgcGFzc2VkIHRocm91Z2ggZnJvbSBwcm9ncmFtJyk7XG59KTtcblxudGVzdCgndmFsdWUga2V5cyBhcmUgcHJvcGVybHkgc3RyaW5naWZpZWQnLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnSGksIHt7bmFtZX19IScsIHtcbiAgICBidWlsZE1ldGE6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHsgJ2xvYy1kZXJwLmxvbCc6ICd6b3J6JyB9O1xuICAgIH1cbiAgfSk7XG5cbiAgZXF1YWwodGVtcGxhdGUubWV0YVsnbG9jLWRlcnAubG9sJ10sICd6b3J6JywgJ3JldHVybiB2YWx1ZSBmcm9tIGJ1aWxkTWV0YSB3YXMgcGFzcyB0aHJvdWdoJyk7XG59KTtcblxudGVzdCgncmV0dXJuaW5nIHVuZGVmaW5lZCBkb2VzIG5vdCB0aHJvdyBlcnJvcnMnLCBmdW5jdGlvbiAoKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJ0hpLCB7e25hbWV9fSEnLCB7XG4gICAgYnVpbGRNZXRhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0pO1xuXG4gIG9rKHRlbXBsYXRlLm1ldGEsICdtZXRhIGlzIHByZXNlbnQgaW4gdGVtcGxhdGUsIGV2ZW4gaWYgZW1wdHknKTtcbn0pO1xuXG50ZXN0KCdvcHRpb25zIGFyZSBub3QgcmVxdWlyZWQgZm9yIGBjb21waWxlYCcsIGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnSGksIHt7bmFtZX19IScpO1xuXG4gIG9rKHRlbXBsYXRlLm1ldGEsICdtZXRhIGlzIHByZXNlbnQgaW4gdGVtcGxhdGUsIGV2ZW4gaWYgZW1wdHknKTtcbn0pO1xuIl19
define('htmlbars-compiler-tests/compile-tests.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/compile-tests.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/compile-tests.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2NvbXBpbGUtdGVzdHMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFDakQsT0FBSyxDQUFDLElBQUksQ0FBQyw2REFBNkQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN6RixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw4REFBOEQsQ0FBQyxDQUFDO0dBQ2pGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9jb21waWxlLXRlc3RzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2NvbXBpbGUtdGVzdHMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2NvbXBpbGUtdGVzdHMuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-compiler-tests/diffing-test", ["exports", "../htmlbars-compiler/compiler", "../htmlbars-runtime/hooks", "../htmlbars-util/object-utils", "../dom-helper", "../htmlbars-test-helpers"], function (exports, _htmlbarsCompilerCompiler, _htmlbarsRuntimeHooks, _htmlbarsUtilObjectUtils, _domHelper, _htmlbarsTestHelpers) {

  var hooks, helpers, partials, env;

  function registerHelper(name, callback) {
    helpers[name] = callback;
  }

  function commonSetup() {
    hooks = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default);
    hooks.keywords = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default.keywords);
    helpers = {};
    partials = {};

    env = {
      dom: new _domHelper.default(),
      hooks: hooks,
      helpers: helpers,
      partials: partials,
      useFragmentCache: true
    };

    registerHelper('each', function (params) {
      var list = params[0];

      for (var i = 0, l = list.length; i < l; i++) {
        var item = list[i];
        if (this.arity > 0) {
          this.yieldItem(item.key, [item]);
        }
      }
    });
  }

  QUnit.module("Diffing", {
    beforeEach: commonSetup
  });

  test("Morph order is preserved when rerendering with duplicate keys", function () {
    var template = _htmlbarsCompilerCompiler.compile("<ul>{{#each items as |item|}}<li>{{item.name}}</li>{{/each}}</ul>");

    var a1 = { key: "a", name: "A1" };
    var a2 = { key: "a", name: "A2" };
    var b1 = { key: "b", name: "B1" };
    var b2 = { key: "b", name: "B2" };

    var result = template.render({ items: [a1, a2, b1, b2] }, env);
    _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li>A1</li><li>A2</li><li>B1</li><li>B2</li></ul>");

    var morph = result.nodes[0].morphList.firstChildMorph;
    morph.state.initialName = 'A1';
    morph.nextMorph.state.initialName = 'A2';
    morph.nextMorph.nextMorph.state.initialName = 'B1';
    morph.nextMorph.nextMorph.nextMorph.state.initialName = 'B2';

    function getNames() {
      var names = [];
      var morph = result.nodes[0].morphList.firstChildMorph;

      while (morph) {
        names.push(morph.state.initialName);
        morph = morph.nextMorph;
      }

      return names;
    }

    result.rerender(env, { items: [a1, b2, b1, a2] });

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li>A1</li><li>B2</li><li>B1</li><li>A2</li></ul>");
    deepEqual(getNames(), ['A1', 'B1', 'B2', 'A2']);

    result.rerender(env, { items: [b1, a2] });

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li>B1</li><li>A2</li></ul>");
    deepEqual(getNames(), ['B1', 'A1']);
  });

  test("duplicate keys are allowed when duplicate is last morph", function () {
    var template = _htmlbarsCompilerCompiler.compile("<ul>{{#each items as |item|}}<li>{{item.name}}</li>{{/each}}</ul>");

    var a1 = { key: "a", name: "A1" };
    var a2 = { key: "a", name: "A2" };

    var result = template.render({ items: [] }, env);

    result.rerender(env, { items: [a1] });
    _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li>A1</li></ul>");

    result.rerender(env, { items: [a1, a2] });
    _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li>A1</li><li>A2</li></ul>");
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpZmZpbmctdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU1BLE1BQUksS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDOztBQUVsQyxXQUFTLGNBQWMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO0FBQ3RDLFdBQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUM7R0FDMUI7O0FBRUQsV0FBUyxXQUFXLEdBQUc7QUFDckIsU0FBSyxHQUFHLHlCQVhELEtBQUssQ0FXRSxFQUFFLGdDQUFlLENBQUM7QUFDaEMsU0FBSyxDQUFDLFFBQVEsR0FBRyx5QkFaVixLQUFLLENBWVcsRUFBRSxFQUFFLDhCQUFhLFFBQVEsQ0FBQyxDQUFDO0FBQ2xELFdBQU8sR0FBRyxFQUFFLENBQUM7QUFDYixZQUFRLEdBQUcsRUFBRSxDQUFDOztBQUVkLE9BQUcsR0FBRztBQUNKLFNBQUcsRUFBRSx3QkFBZTtBQUNwQixXQUFLLEVBQUUsS0FBSztBQUNaLGFBQU8sRUFBRSxPQUFPO0FBQ2hCLGNBQVEsRUFBRSxRQUFRO0FBQ2xCLHNCQUFnQixFQUFFLElBQUk7S0FDdkIsQ0FBQzs7QUFFRixrQkFBYyxDQUFDLE1BQU0sRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN0QyxVQUFJLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXJCLFdBQUssSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDckMsWUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLFlBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUU7QUFDbEIsY0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMs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QUFDOztBQUU1RixRQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ2xDLFFBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7O0FBRWxDLFFBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7O0FBRWxELFVBQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUUsRUFBRSxDQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hDLHlCQXhGTyxXQUFXLENBd0ZOLE1BQU0sQ0FBQyxRQUFRLHlCQUF5QixDQUFDOztBQUVyRCxVQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUMseUJBM0ZPLFdBQVcsQ0EyRk4sTUFBTSxDQUFDLFFBQVEsb0NBQW9DLENBQUM7R0FDakUsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpZmZpbmctdGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNvbXBpbGUgfSBmcm9tIFwiLi4vaHRtbGJhcnMtY29tcGlsZXIvY29tcGlsZXJcIjtcbmltcG9ydCBkZWZhdWx0SG9va3MgZnJvbSBcIi4uL2h0bWxiYXJzLXJ1bnRpbWUvaG9va3NcIjtcbmltcG9ydCB7IG1lcmdlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzXCI7XG5pbXBvcnQgRE9NSGVscGVyIGZyb20gXCIuLi9kb20taGVscGVyXCI7XG5pbXBvcnQgeyBlcXVhbFRva2VucyB9IGZyb20gXCIuLi9odG1sYmFycy10ZXN0LWhlbHBlcnNcIjtcblxudmFyIGhvb2tzLCBoZWxwZXJzLCBwYXJ0aWFscywgZW52O1xuXG5mdW5jdGlvbiByZWdpc3RlckhlbHBlcihuYW1lLCBjYWxsYmFjaykge1xuICBoZWxwZXJzW25hbWVdID0gY2FsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGNvbW1vblNldHVwKCkge1xuICBob29rcyA9IG1lcmdlKHt9LCBkZWZhdWx0SG9va3MpO1xuICBob29rcy5rZXl3b3JkcyA9IG1lcmdlKHt9LCBkZWZhdWx0SG9va3Mua2V5d29yZHMpO1xuICBoZWxwZXJzID0ge307XG4gIHBhcnRpYWxzID0ge307XG5cbiAgZW52ID0ge1xuICAgIGRvbTogbmV3IERPTUhlbHBlcigpLFxuICAgIGhvb2tzOiBob29rcyxcbiAgICBoZWxwZXJzOiBoZWxwZXJzLFxuICAgIHBhcnRpYWxzOiBwYXJ0aWFscyxcbiAgICB1c2VGcmFnbWVudENhY2hlOiB0cnVlXG4gIH07XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB2YXIgbGlzdCA9IHBhcmFtc1swXTtcblxuICAgIGZvciAodmFyIGk9MCwgbD1saXN0Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICAgIGlmICh0aGlzLmFyaXR5ID4gMCkge1xuICAgICAgICB0aGlzLnlpZWxkSXRlbShpdGVtLmtleSwgW2l0ZW1dKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG59XG5cblFVbml0Lm1vZHVsZShcIkRpZmZpbmdcIiwge1xuICBiZWZvcmVFYWNoOiBjb21tb25TZXR1cFxufSk7XG5cbnRlc3QoXCJNb3JwaCBvcmRlciBpcyBwcmVzZXJ2ZWQgd2hlbiByZXJlbmRlcmluZyB3aXRoIGR1cGxpY2F0ZSBrZXlzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKGA8dWw+e3sjZWFjaCBpdGVtcyBhcyB8aXRlbXx9fTxsaT57e2l0ZW0ubmFtZX19PC9saT57ey9lYWNofX08L3VsPmApO1xuXG4gIGxldCBhMSA9IHsga2V5OiBcImFcIiwgbmFtZTogXCJBMVwiIH07XG4gIGxldCBhMiA9IHsga2V5OiBcImFcIiwgbmFtZTogXCJBMlwiIH07XG4gIGxldCBiMSA9IHsga2V5OiBcImJcIiwgbmFtZTogXCJCMVwiIH07XG4gIGxldCBiMiA9IHsga2V5OiBcImJcIiwgbmFtZTogXCJCMlwiIH07XG5cbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcih7IGl0ZW1zOiBbYTEsIGEyLCBiMSwgYjJdIH0sIGVudik7XG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgYDx1bD48bGk+QTE8L2xpPjxsaT5BMjwvbGk+PGxpPkIxPC9saT48bGk+QjI8L2xpPjwvdWw+YCk7XG5cbiAgbGV0IG1vcnBoID0gcmVzdWx0Lm5vZGVzWzBdLm1vcnBoTGlzdC5maXJzdENoaWxkTW9ycGg7XG4gIG1vcnBoLnN0YXRlLmluaXRpYWxOYW1lID0gJ0ExJztcbiAgbW9ycGgubmV4dE1vcnBoLnN0YXRlLmluaXRpYWxOYW1lID0gJ0EyJztcbiAgbW9ycGgubmV4dE1vcnBoLm5leHRNb3JwaC5zdGF0ZS5pbml0aWFsTmFtZSA9ICdCMSc7XG4gIG1vcnBoLm5leHRNb3JwaC5uZXh0TW9ycGgubmV4dE1vcnBoLnN0YXRlLmluaXRpYWxOYW1lID0gJ0IyJztcblxuICBmdW5jdGlvbiBnZXROYW1lcygpIHtcbiAgICBsZXQgbmFtZXMgPSBbXTtcbiAgICBsZXQgbW9ycGggPSByZXN1bHQubm9kZXNbMF0ubW9ycGhMaXN0LmZpcnN0Q2hpbGRNb3JwaDtcblxuICAgIHdoaWxlIChtb3JwaCkge1xuICAgICAgbmFtZXMucHVzaChtb3JwaC5zdGF0ZS5pbml0aWFsTmFtZSk7XG4gICAgICBtb3JwaCA9IG1vcnBoLm5leHRNb3JwaDtcbiAgICB9XG5cbiAgICByZXR1cm4gbmFtZXM7XG4gIH1cblxuICByZXN1bHQucmVyZW5kZXIoZW52LCB7IGl0ZW1zOiBbYTEsIGIyLCBiMSwgYTJdIH0pO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgYDx1bD48bGk+QTE8L2xpPjxsaT5CMjwvbGk+PGxpPkIxPC9saT48bGk+QTI8L2xpPjwvdWw+YCk7XG4gIGRlZXBFcXVhbChnZXROYW1lcygpLCBbJ0ExJywgJ0IxJywgJ0IyJywgJ0EyJ10pO1xuXG4gIHJlc3VsdC5yZXJlbmRlcihlbnYsIHsgaXRlbXM6IFtiMSwgYTJdIH0pO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgYDx1bD48bGk+QjE8L2xpPjxsaT5BMjwvbGk+PC91bD5gKTtcbiAgZGVlcEVxdWFsKGdldE5hbWVzKCksIFsnQjEnLCAnQTEnXSk7XG59KTtcblxudGVzdChcImR1cGxpY2F0ZSBrZXlzIGFyZSBhbGxvd2VkIHdoZW4gZHVwbGljYXRlIGlzIGxhc3QgbW9ycGhcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoYDx1bD57eyNlYWNoIGl0ZW1zIGFzIHxpdGVtfH19PGxpPnt7aXRlbS5uYW1lfX08L2xpPnt7L2VhY2h9fTwvdWw+YCk7XG5cbiAgbGV0IGExID0geyBrZXk6IFwiYVwiLCBuYW1lOiBcIkExXCIgfTtcbiAgbGV0IGEyID0geyBrZXk6IFwiYVwiLCBuYW1lOiBcIkEyXCIgfTtcblxuICB2YXIgcmVzdWx0ID0gdGVtcGxhdGUucmVuZGVyKHsgaXRlbXM6IFsgXSB9LCBlbnYpO1xuXG4gIHJlc3VsdC5yZXJlbmRlcihlbnYsIHsgaXRlbXM6IFsgYTEgXSB9KTtcbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBgPHVsPjxsaT5BMTwvbGk+PC91bD5gKTtcblxuICByZXN1bHQucmVyZW5kZXIoZW52LCB7IGl0ZW1zOiBbYTEsIGEyXSB9KTtcbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBgPHVsPjxsaT5BMTwvbGk+PGxpPkEyPC9saT48L3VsPmApO1xufSk7XG4iXX0=
define('htmlbars-compiler-tests/diffing-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/diffing-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/diffing-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpZmZpbmctdGVzdC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQUNqRCxPQUFLLENBQUMsSUFBSSxDQUFDLDREQUE0RCxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3hGLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDZEQUE2RCxDQUFDLENBQUM7R0FDaEYsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpZmZpbmctdGVzdC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1jb21waWxlci10ZXN0cy9kaWZmaW5nLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpZmZpbmctdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("htmlbars-compiler-tests/dirtying-test", ["exports", "../htmlbars-compiler/compiler", "../htmlbars-runtime/render", "../htmlbars-runtime/hooks", "../htmlbars-util/template-utils", "../htmlbars-util/object-utils", "../dom-helper", "../htmlbars-test-helpers"], function (exports, _htmlbarsCompilerCompiler, _htmlbarsRuntimeRender, _htmlbarsRuntimeHooks, _htmlbarsUtilTemplateUtils, _htmlbarsUtilObjectUtils, _domHelper, _htmlbarsTestHelpers) {

  var hooks, helpers, partials, env;

  function registerHelper(name, callback) {
    helpers[name] = callback;
  }

  function commonSetup() {
    hooks = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default);
    hooks.keywords = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default.keywords);
    helpers = {};
    partials = {};

    env = {
      dom: new _domHelper.default(),
      hooks: hooks,
      helpers: helpers,
      partials: partials,
      useFragmentCache: true
    };

    registerHelper('if', function (params, hash, options) {
      if (!!params[0]) {
        return options.template.yield();
      } else if (options.inverse.yield) {
        return options.inverse.yield();
      }
    });

    registerHelper('each', function (params) {
      var list = params[0];

      for (var i = 0, l = list.length; i < l; i++) {
        var item = list[i];
        if (this.arity > 0) {
          this.yieldItem(item.key, [item]);
        } else {
          this.yieldItem(item.key, undefined, item);
        }
      }
    });
  }

  QUnit.module("HTML-based compiler (dirtying)", {
    beforeEach: commonSetup
  });

  test("a simple implementation of a dirtying rerender", function () {
    var object = { condition: true, value: 'hello world' };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
    var result = template.render(object, env);
    var valueNode = result.fragment.firstChild.firstChild.firstChild;

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>hello world</p></div>', "Initial render");

    result.rerender();

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>hello world</p></div>', "After dirtying but not updating");
    strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

    // Even though the #if was stable, a dirty child node is updated
    object.value = 'goodbye world';
    result.rerender();
    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>goodbye world</p></div>', "After updating and dirtying");
    strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

    // Should not update since render node is not marked as dirty
    object.condition = false;
    result.revalidate();
    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>goodbye world</p></div>', "After flipping the condition but not dirtying");
    strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

    result.rerender();
    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>Nothing</p></div>', "And then dirtying");
    QUnit.notStrictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
  });

  test("a simple implementation of a dirtying rerender without inverse", function () {
    var object = { condition: true, value: 'hello world' };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>hello world</p></div>', "Initial render");

    // Should not update since render node is not marked as dirty
    object.condition = false;

    result.rerender();
    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><!----></div>', "If the condition is false, the morph becomes empty");

    object.condition = true;

    result.rerender();
    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p>hello world</p></div>', "If the condition is false, the morph becomes empty");
  });

  test("block helpers whose template has a morph at the edge", function () {
    registerHelper('id', function (params, hash, options) {
      return options.template.yield();
    });

    var template = _htmlbarsCompilerCompiler.compile("{{#id}}{{value}}{{/id}}");
    var object = { value: "hello world" };
    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, 'hello world');
    var firstNode = result.root.firstNode;
    equal(firstNode.nodeType, 3, "first node of the parent template");
    equal(firstNode.nodeValue, "", "its content should be empty");

    var secondNode = firstNode.nextSibling;
    equal(secondNode.nodeType, 3, "first node of the helper template should be a text node");
    equal(secondNode.nodeValue, "", "its content should be empty");

    var textContent = secondNode.nextSibling;
    equal(textContent.nodeType, 3, "second node of the helper should be a text node");
    equal(textContent.nodeValue, "hello world", "its content should be hello world");

    var fourthNode = textContent.nextSibling;
    equal(fourthNode.nodeType, 3, "last node of the helper should be a text node");
    equal(fourthNode.nodeValue, "", "its content should be empty");

    var lastNode = fourthNode.nextSibling;
    equal(lastNode.nodeType, 3, "last node of the parent template should be a text node");
    equal(lastNode.nodeValue, "", "its content should be empty");

    strictEqual(lastNode.nextSibling, null, "there should only be five nodes");
  });

  test("clean content doesn't get blown away", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div>{{value}}</div>");
    var object = { value: "hello" };
    var result = template.render(object, env);

    var textNode = result.fragment.firstChild.firstChild;
    equal(textNode.nodeValue, "hello");

    object.value = "goodbye";
    result.revalidate(); // without setting the node to dirty

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div>hello</div>');

    var textRenderNode = result.root.childNodes[0];

    textRenderNode.setContent = function () {
      ok(false, "Should not get called");
    };

    object.value = "hello";
    result.rerender();
  });

  test("helper calls follow the normal dirtying rules", function () {
    registerHelper('capitalize', function (params) {
      return params[0].toUpperCase();
    });

    var template = _htmlbarsCompilerCompiler.compile("<div>{{capitalize value}}</div>");
    var object = { value: "hello" };
    var result = template.render(object, env);

    var textNode = result.fragment.firstChild.firstChild;
    equal(textNode.nodeValue, "HELLO");

    object.value = "goodbye";
    result.revalidate(); // without setting the node to dirty

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div>HELLO</div>');

    var textRenderNode = result.root.childNodes[0];

    result.rerender();

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div>GOODBYE</div>');

    textRenderNode.setContent = function () {
      ok(false, "Should not get called");
    };

    // Checks normalized value, not raw value
    object.value = "GoOdByE";
    result.rerender();
  });

  test("attribute nodes follow the normal dirtying rules", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div class={{value}}>hello</div>");
    var object = { value: "world" };

    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='world'>hello</div>", "Initial render");

    object.value = "universe";
    result.revalidate(); // without setting the node to dirty

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='world'>hello</div>", "Revalidating without dirtying");

    var attrRenderNode = result.root.childNodes[0];

    result.rerender();

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='universe'>hello</div>", "Revalidating after dirtying");

    attrRenderNode.setContent = function () {
      ok(false, "Should not get called");
    };

    object.value = "universe";
    result.rerender();
  });

  test("attribute nodes w/ concat follow the normal dirtying rules", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div class='hello {{value}}'>hello</div>");
    var object = { value: "world" };
    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='hello world'>hello</div>");

    object.value = "universe";
    result.revalidate(); // without setting the node to dirty

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='hello world'>hello</div>");

    var attrRenderNode = result.root.childNodes[0];

    result.rerender();

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='hello universe'>hello</div>");

    attrRenderNode.setContent = function () {
      ok(false, "Should not get called");
    };

    object.value = "universe";
    result.rerender();
  });

  testEachHelper("An implementation of #each using block params", "<ul>{{#each list as |item|}}<li class={{item.class}}>{{item.name}}</li>{{/each}}</ul>");

  testEachHelper("An implementation of #each using a self binding", "<ul>{{#each list}}<li class={{class}}>{{name}}</li>{{/each}}</ul>");

  function testEachHelper(testName, templateSource) {
    test(testName, function () {
      var template = _htmlbarsCompilerCompiler.compile(templateSource);
      var object = { list: [{ key: "1", name: "Tom Dale", "class": "tomdale" }, { key: "2", name: "Yehuda Katz", "class": "wycats" }] };
      var result = template.render(object, env);

      var itemNode = getItemNode('tomdale');
      var nameNode = getNameNode('tomdale');

      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "Initial render");

      rerender();
      assertStableNodes('tomdale', "after no-op rerender");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

      result.revalidate();
      assertStableNodes('tomdale', "after non-dirty rerender");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

      object = { list: [object.list[1], object.list[0]] };
      rerender(object);
      assertStableNodes('tomdale', "after changing the list order");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>", "After changing the list order");

      object = { list: [{ key: "1", name: "Martin Muñoz", "class": "mmun" }, { key: "2", name: "Kris Selden", "class": "krisselden" }] };
      rerender(object);
      assertStableNodes('mmun', "after changing the list entries, but with stable keys");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kris Selden</li></ul>", "After changing the list entries, but with stable keys");

      object = { list: [{ key: "1", name: "Martin Muñoz", "class": "mmun" }, { key: "2", name: "Kristoph Selden", "class": "krisselden" }, { key: "3", name: "Matthew Beale", "class": "mixonic" }] };

      rerender(object);
      assertStableNodes('mmun', "after adding an additional entry");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kristoph Selden</li><li class='mixonic'>Matthew Beale</li></ul>", "After adding an additional entry");

      object = { list: [{ key: "1", name: "Martin Muñoz", "class": "mmun" }, { key: "3", name: "Matthew Beale", "class": "mixonic" }] };

      rerender(object);
      assertStableNodes('mmun', "after removing the middle entry");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='mixonic'>Matthew Beale</li></ul>", "after removing the middle entry");

      object = { list: [{ key: "1", name: "Martin Muñoz", "class": "mmun" }, { key: "4", name: "Stefan Penner", "class": "stefanpenner" }, { key: "5", name: "Robert Jackson", "class": "rwjblue" }] };

      rerender(object);
      assertStableNodes('mmun', "after adding two more entries");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding two more entries");

      // New node for stability check
      itemNode = getItemNode('rwjblue');
      nameNode = getNameNode('rwjblue');

      object = { list: [{ key: "5", name: "Robert Jackson", "class": "rwjblue" }] };

      rerender(object);
      assertStableNodes('rwjblue', "after removing two entries");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='rwjblue'>Robert Jackson</li></ul>", "After removing two entries");

      object = { list: [{ key: "1", name: "Martin Muñoz", "class": "mmun" }, { key: "4", name: "Stefan Penner", "class": "stefanpenner" }, { key: "5", name: "Robert Jackson", "class": "rwjblue" }] };

      rerender(object);
      assertStableNodes('rwjblue', "after adding back entries");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding back entries");

      // New node for stability check
      itemNode = getItemNode('mmun');
      nameNode = getNameNode('mmun');

      object = { list: [{ key: "1", name: "Martin Muñoz", "class": "mmun" }] };

      rerender(object);
      assertStableNodes('mmun', "after removing from the back");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li></ul>", "After removing from the back");

      object = { list: [] };

      rerender(object);
      strictEqual(result.fragment.firstChild.firstChild.nodeType, 8, "there are no li's after removing the remaining entry");
      _htmlbarsTestHelpers.equalTokens(result.fragment, "<ul><!----></ul>", "After removing the remaining entries");

      function rerender(context) {
        result.rerender(env, context);
      }

      function assertStableNodes(className, message) {
        strictEqual(getItemNode(className), itemNode, "The item node has not changed " + message);
        strictEqual(getNameNode(className), nameNode, "The name node has not changed " + message);
      }

      function getItemNode(className) {
        // <li>
        var itemNode = result.fragment.firstChild.firstChild;

        while (itemNode) {
          if (itemNode.getAttribute('class') === className) {
            break;
          }
          itemNode = itemNode.nextSibling;
        }

        ok(itemNode, "Expected node with class='" + className + "'");
        return itemNode;
      }

      function getNameNode(className) {
        // {{item.name}}
        var itemNode = getItemNode(className);
        ok(itemNode, "Expected child node of node with class='" + className + "', but no parent node found");

        var childNode = itemNode && itemNode.firstChild;
        ok(childNode, "Expected child node of node with class='" + className + "', but not child node found");

        return childNode;
      }
    });
  }

  test("Returning true from `linkRenderNodes` makes the value itself stable across renders", function () {
    var streams = { hello: { value: "hello" }, world: { value: "world" } };

    hooks.linkRenderNode = function () {
      return true;
    };

    hooks.getValue = function (stream) {
      return stream();
    };

    var concatCalled = 0;
    hooks.concat = function (env, params) {
      ok(++concatCalled === 1, "The concat hook is only invoked one time (invoked " + concatCalled + " times)");
      return function () {
        return params[0].value + params[1] + params[2].value;
      };
    };

    var template = _htmlbarsCompilerCompiler.compile("<div class='{{hello}} {{world}}'></div>");
    var result = template.render(streams, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='hello world'></div>");

    streams.hello.value = "goodbye";

    result.rerender();

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div class='goodbye world'></div>");
  });

  var destroyedRenderNodeCount;
  var destroyedRenderNode;

  QUnit.module("HTML-based compiler (dirtying) - pruning", {
    beforeEach: function () {
      commonSetup();
      destroyedRenderNodeCount = 0;
      destroyedRenderNode = null;

      hooks.destroyRenderNode = function (renderNode) {
        destroyedRenderNode = renderNode;
        destroyedRenderNodeCount++;
      };
    }
  });

  test("Pruned render nodes invoke a cleanup hook when replaced", function () {
    var object = { condition: true, value: 'hello world', falsy: "Nothing" };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>{{falsy}}</p>{{/if}}</div>');

    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div><p>hello world</p></div>");

    object.condition = false;
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
    strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");

    object.condition = true;
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked again");
    strictEqual(destroyedRenderNode.lastValue, 'Nothing', "The correct render node is passed in");
  });

  test("Pruned render nodes invoke a cleanup hook when cleared", function () {
    var object = { condition: true, value: 'hello world' };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');

    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div><p>hello world</p></div>");

    object.condition = false;
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
    strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");

    object.condition = true;
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was not invoked again");
  });

  test("Pruned lists invoke a cleanup hook when removing elements", function () {
    var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}</div>');

    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div><p>hello</p><p>world</p></div>");

    object.list.pop();
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");

    object.list.pop();
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 4, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
  });

  test("Pruned lists invoke a cleanup hook on their subtrees when removing elements", function () {
    var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{#each list as |item|}}<p>{{#if item.word}}{{item.word}}{{/if}}</p>{{/each}}</div>');

    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<div><p>hello</p><p>world</p></div>");

    object.list.pop();
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 3, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");

    object.list.pop();
    result.rerender();

    strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
  });

  QUnit.module("Manual elements", {
    beforeEach: commonSetup
  });

  QUnit.skip("Setting up a manual element renders and revalidates", function () {
    hooks.keywords['manual-element'] = {
      render: function (morph, env, scope, params, hash, template, inverse, visitor) {
        var attributes = {
          title: "Tom Dale",
          href: ['concat', ['http://tomdale.', ['get', 'tld']]],
          'data-bar': ['get', 'bar']
        };

        var layout = _htmlbarsRuntimeRender.manualElement('span', attributes);

        _htmlbarsRuntimeHooks.hostBlock(morph, env, scope, template, inverse, null, visitor, function (options) {
          options.templates.template.yieldIn({ raw: layout }, hash);
        });

        _htmlbarsRuntimeRender.manualElement(env, scope, 'span', attributes, morph);
      },

      isStable: function () {
        return true;
      }
    };

    var template = _htmlbarsCompilerCompiler.compile("{{#manual-element bar='baz' tld='net'}}Hello {{world}}!{{/manual-element}}");
    var result = template.render({ world: "world" }, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<span title='Tom Dale' href='http://tomdale.net' data-bar='baz'>Hello world!</span>");
  });

  test("It is possible to nest multiple templates into a manual element", function () {
    hooks.keywords['manual-element'] = {
      render: function (morph, env, scope, params, hash, template, inverse, visitor) {
        var attributes = {
          title: "Tom Dale",
          href: ['concat', ['http://tomdale.', ['get', 'tld']]],
          'data-bar': ['get', 'bar']
        };

        var elementTemplate = _htmlbarsRuntimeRender.manualElement('span', attributes);

        var contentBlock = _htmlbarsUtilTemplateUtils.blockFor(_htmlbarsRuntimeRender.default, template, { scope: scope });

        var layoutBlock = _htmlbarsUtilTemplateUtils.blockFor(_htmlbarsRuntimeRender.default, layout.raw, {
          yieldTo: contentBlock,
          self: { attrs: hash }
        });

        var elementBlock = _htmlbarsUtilTemplateUtils.blockFor(_htmlbarsRuntimeRender.default, elementTemplate, {
          yieldTo: layoutBlock,
          self: hash
        });

        elementBlock.invoke(env, null, undefined, morph, null, visitor);
      },

      isStable: function () {
        return true;
      }
    };

    var layout = _htmlbarsCompilerCompiler.compile("<em>{{attrs.foo}}. {{yield}}</em>");
    var template = _htmlbarsCompilerCompiler.compile("{{#manual-element foo='foo' bar='baz' tld='net'}}Hello {{world}}!{{/manual-element}}");
    var result = template.render({ world: "world" }, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "<span title='Tom Dale' href='http://tomdale.net' data-bar='baz'><em>foo. Hello world!</em></span>");
  });

  test("The invoke helper hook can instruct the runtime to link the result", function () {
    var invokeCount = 0;

    env.hooks.invokeHelper = function (morph, env, scope, visitor, params, hash, helper) {
      invokeCount++;
      return { value: helper(params, hash), link: true };
    };

    helpers.double = function (_ref) {
      var input = _ref[0];

      return input * 2;
    };

    var template = _htmlbarsCompilerCompiler.compile("{{double 12}}");
    var result = template.render({}, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, "24");
    equal(invokeCount, 1);

    result.rerender();

    _htmlbarsTestHelpers.equalTokens(result.fragment, "24");
    equal(invokeCount, 1);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpcnR5aW5nLXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFVQSxNQUFJLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQzs7QUFFbEMsV0FBUyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtBQUN0QyxXQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDO0dBQzFCOztBQUVELFdBQVMsV0FBVyxHQUFHO0FBQ3JCLFNBQUssR0FBRyx5QkFYRCxLQUFLLENBV0UsRUFBRSxnQ0FBZSxDQUFDO0FBQ2hDLFNBQUssQ0FBQyxRQUFRLEdBQUcseUJBWlYsS0FBSyxDQVlXLEVBQUUsRUFBRSw4QkFBYSxRQUFRLENBQUMsQ0FBQztBQUNsRCxXQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2IsWUFBUSxHQUFHLEVBQUUsQ0FBQzs7QUFFZCxPQUFHLEdBQUc7QUFDSixTQUFHLEVBQUUsd0JBQWU7QUFDcEIsV0FBSyxFQUFFLEtBQUs7QUFDWixhQUFPLEVBQUUsT0FBTztBQUNoQixjQUFRLEVBQUUsUUFBUTtBQUNsQixzQkFBZ0IsRUFBRSxJQUFJO0tBQ3ZCLENBQUM7O0FBRUYsa0JBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBUyxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUNuRCxVQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDZixlQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7T0FDakMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO0FBQ2hDLGVBQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztPQUNoQztLQUNGLENBQUMsQ0FBQzs7QUFFSCxrQkFBYyxDQUFDLE1BQU0sRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN0QyxVQUFJLElBQUksR0FBRyxNQUFNLENBQUMsQ0FB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LXRlc3RzL2RpcnR5aW5nLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjb21waWxlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLWNvbXBpbGVyL2NvbXBpbGVyXCI7XG5pbXBvcnQgeyBtYW51YWxFbGVtZW50IH0gZnJvbSBcIi4uL2h0bWxiYXJzLXJ1bnRpbWUvcmVuZGVyXCI7XG5pbXBvcnQgeyBob3N0QmxvY2sgfSBmcm9tIFwiLi4vaHRtbGJhcnMtcnVudGltZS9ob29rc1wiO1xuaW1wb3J0IHJlbmRlciBmcm9tIFwiLi4vaHRtbGJhcnMtcnVudGltZS9yZW5kZXJcIjtcbmltcG9ydCB7IGJsb2NrRm9yIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHNcIjtcbmltcG9ydCBkZWZhdWx0SG9va3MgZnJvbSBcIi4uL2h0bWxiYXJzLXJ1bnRpbWUvaG9va3NcIjtcbmltcG9ydCB7IG1lcmdlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzXCI7XG5pbXBvcnQgRE9NSGVscGVyIGZyb20gXCIuLi9kb20taGVscGVyXCI7XG5pbXBvcnQgeyBlcXVhbFRva2VucyB9IGZyb20gXCIuLi9odG1sYmFycy10ZXN0LWhlbHBlcnNcIjtcblxudmFyIGhvb2tzLCBoZWxwZXJzLCBwYXJ0aWFscywgZW52O1xuXG5mdW5jdGlvbiByZWdpc3RlckhlbHBlcihuYW1lLCBjYWxsYmFjaykge1xuICBoZWxwZXJzW25hbWVdID0gY2FsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGNvbW1vblNldHVwKCkge1xuICBob29rcyA9IG1lcmdlKHt9LCBkZWZhdWx0SG9va3MpO1xuICBob29rcy5rZXl3b3JkcyA9IG1lcmdlKHt9LCBkZWZhdWx0SG9va3Mua2V5d29yZHMpO1xuICBoZWxwZXJzID0ge307XG4gIHBhcnRpYWxzID0ge307XG5cbiAgZW52ID0ge1xuICAgIGRvbTogbmV3IERPTUhlbHBlcigpLFxuICAgIGhvb2tzOiBob29rcyxcbiAgICBoZWxwZXJzOiBoZWxwZXJzLFxuICAgIHBhcnRpYWxzOiBwYXJ0aWFscyxcbiAgICB1c2VGcmFnbWVudENhY2hlOiB0cnVlXG4gIH07XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zKSB7XG4gICAgaWYgKCEhcGFyYW1zWzBdKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZS55aWVsZCgpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pbnZlcnNlLnlpZWxkKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlLnlpZWxkKCk7XG4gICAgfVxuICB9KTtcblxuICByZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBsaXN0ID0gcGFyYW1zWzBdO1xuXG4gICAgZm9yICh2YXIgaT0wLCBsPWxpc3QubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdmFyIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgaWYgKHRoaXMuYXJpdHkgPiAwKSB7XG4gICAgICAgIHRoaXMueWllbGRJdGVtKGl0ZW0ua2V5LCBbaXRlbV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy55aWVsZEl0ZW0oaXRlbS5rZXksIHVuZGVmaW5lZCwgaXRlbSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxufVxuXG5RVW5pdC5tb2R1bGUoXCJIVE1MLWJhc2VkIGNvbXBpbGVyIChkaXJ0eWluZylcIiwge1xuICBiZWZvcmVFYWNoOiBjb21tb25TZXR1cFxufSk7XG5cbnRlc3QoXCJhIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGRpcnR5aW5nIHJlcmVuZGVyXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgb2JqZWN0ID0geyBjb25kaXRpb246IHRydWUsIHZhbHVlOiAnaGVsbG8gd29ybGQnIH07XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxkaXY+e3sjaWYgY29uZGl0aW9ufX08cD57e3ZhbHVlfX08L3A+e3tlbHNlfX08cD5Ob3RoaW5nPC9wPnt7L2lmfX08L2Rpdj4nKTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG4gIHZhciB2YWx1ZU5vZGUgPSByZXN1bHQuZnJhZ21lbnQuZmlyc3RDaGlsZC5maXJzdENoaWxkLmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnPGRpdj48cD5oZWxsbyB3b3JsZDwvcD48L2Rpdj4nLCBcIkluaXRpYWwgcmVuZGVyXCIpO1xuXG4gIHJlc3VsdC5yZXJlbmRlcigpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+PHA+aGVsbG8gd29ybGQ8L3A+PC9kaXY+JywgXCJBZnRlciBkaXJ0eWluZyBidXQgbm90IHVwZGF0aW5nXCIpO1xuICBzdHJpY3RFcXVhbChyZXN1bHQuZnJhZ21lbnQuZmlyc3RDaGlsZC5maXJzdENoaWxkLmZpcnN0Q2hpbGQsIHZhbHVlTm9kZSwgXCJUaGUgdGV4dCBub2RlIHdhcyBub3QgYmxvd24gYXdheVwiKTtcblxuICAvLyBFdmVuIHRob3VnaCB0aGUgI2lmIHdhcyBzdGFibGUsIGEgZGlydHkgY2hpbGQgbm9kZSBpcyB1cGRhdGVkXG4gIG9iamVjdC52YWx1ZSA9ICdnb29kYnllIHdvcmxkJztcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+PHA+Z29vZGJ5ZSB3b3JsZDwvcD48L2Rpdj4nLCBcIkFmdGVyIHVwZGF0aW5nIGFuZCBkaXJ0eWluZ1wiKTtcbiAgc3RyaWN0RXF1YWwocmVzdWx0LmZyYWdtZW50LmZpcnN0Q2hpbGQuZmlyc3RDaGlsZC5maXJzdENoaWxkLCB2YWx1ZU5vZGUsIFwiVGhlIHRleHQgbm9kZSB3YXMgbm90IGJsb3duIGF3YXlcIik7XG5cbiAgLy8gU2hvdWxkIG5vdCB1cGRhdGUgc2luY2UgcmVuZGVyIG5vZGUgaXMgbm90IG1hcmtlZCBhcyBkaXJ0eVxuICBvYmplY3QuY29uZGl0aW9uID0gZmFsc2U7XG4gIHJlc3VsdC5yZXZhbGlkYXRlKCk7XG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+PHA+Z29vZGJ5ZSB3b3JsZDwvcD48L2Rpdj4nLCBcIkFmdGVyIGZsaXBwaW5nIHRoZSBjb25kaXRpb24gYnV0IG5vdCBkaXJ0eWluZ1wiKTtcbiAgc3RyaWN0RXF1YWwocmVzdWx0LmZyYWdtZW50LmZpcnN0Q2hpbGQuZmlyc3RDaGlsZC5maXJzdENoaWxkLCB2YWx1ZU5vZGUsIFwiVGhlIHRleHQgbm9kZSB3YXMgbm90IGJsb3duIGF3YXlcIik7XG5cbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+PHA+Tm90aGluZzwvcD48L2Rpdj4nLCBcIkFuZCB0aGVuIGRpcnR5aW5nXCIpO1xuICBRVW5pdC5ub3RTdHJpY3RFcXVhbChyZXN1bHQuZnJhZ21lbnQuZmlyc3RDaGlsZC5maXJzdENoaWxkLmZpcnN0Q2hpbGQsIHZhbHVlTm9kZSwgXCJUaGUgdGV4dCBub2RlIHdhcyBub3QgYmxvd24gYXdheVwiKTtcbn0pO1xuXG50ZXN0KFwiYSBzaW1wbGUgaW1wbGVtZW50YXRpb24gb2YgYSBkaXJ0eWluZyByZXJlbmRlciB3aXRob3V0IGludmVyc2VcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBvYmplY3QgPSB7IGNvbmRpdGlvbjogdHJ1ZSwgdmFsdWU6ICdoZWxsbyB3b3JsZCcgfTtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPGRpdj57eyNpZiBjb25kaXRpb259fTxwPnt7dmFsdWV9fTwvcD57ey9pZn19PC9kaXY+Jyk7XG4gIHZhciByZXN1bHQgPSB0ZW1wbGF0ZS5yZW5kZXIob2JqZWN0LCBlbnYpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+PHA+aGVsbG8gd29ybGQ8L3A+PC9kaXY+JywgXCJJbml0aWFsIHJlbmRlclwiKTtcblxuICAvLyBTaG91bGQgbm90IHVwZGF0ZSBzaW5jZSByZW5kZXIgbm9kZSBpcyBub3QgbWFya2VkIGFzIGRpcnR5XG4gIG9iamVjdC5jb25kaXRpb24gPSBmYWxzZTtcblxuICByZXN1bHQucmVyZW5kZXIoKTtcbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnPGRpdj48IS0tLS0+PC9kaXY+JywgXCJJZiB0aGUgY29uZGl0aW9uIGlzIGZhbHNlLCB0aGUgbW9ycGggYmVjb21lcyBlbXB0eVwiKTtcblxuICBvYmplY3QuY29uZGl0aW9uID0gdHJ1ZTtcblxuICByZXN1bHQucmVyZW5kZXIoKTtcbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnPGRpdj48cD5oZWxsbyB3b3JsZDwvcD48L2Rpdj4nLCBcIklmIHRoZSBjb25kaXRpb24gaXMgZmFsc2UsIHRoZSBtb3JwaCBiZWNvbWVzIGVtcHR5XCIpO1xufSk7XG5cbnRlc3QoXCJibG9jayBoZWxwZXJzIHdob3NlIHRlbXBsYXRlIGhhcyBhIG1vcnBoIGF0IHRoZSBlZGdlXCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlckhlbHBlcignaWQnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZS55aWVsZCgpO1xuICB9KTtcblxuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwie3sjaWR9fXt7dmFsdWV9fXt7L2lkfX1cIik7XG4gIHZhciBvYmplY3QgPSB7IHZhbHVlOiBcImhlbGxvIHdvcmxkXCIgfTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnaGVsbG8gd29ybGQnKTtcbiAgdmFyIGZpcnN0Tm9kZSA9IHJlc3VsdC5yb290LmZpcnN0Tm9kZTtcbiAgZXF1YWwoZmlyc3ROb2RlLm5vZGVUeXBlLCAzLCBcImZpcnN0IG5vZGUgb2YgdGhlIHBhcmVudCB0ZW1wbGF0ZVwiKTtcbiAgZXF1YWwoZmlyc3ROb2RlLm5vZGVWYWx1ZSwgXCJcIiwgXCJpdHMgY29udGVudCBzaG91bGQgYmUgZW1wdHlcIik7XG5cbiAgdmFyIHNlY29uZE5vZGUgPSBmaXJzdE5vZGUubmV4dFNpYmxpbmc7XG4gIGVxdWFsKHNlY29uZE5vZGUubm9kZVR5cGUsIDMsIFwiZmlyc3Qgbm9kZSBvZiB0aGUgaGVscGVyIHRlbXBsYXRlIHNob3VsZCBiZSBhIHRleHQgbm9kZVwiKTtcbiAgZXF1YWwoc2Vjb25kTm9kZS5ub2RlVmFsdWUsIFwiXCIsIFwiaXRzIGNvbnRlbnQgc2hvdWxkIGJlIGVtcHR5XCIpO1xuXG4gIHZhciB0ZXh0Q29udGVudCA9IHNlY29uZE5vZGUubmV4dFNpYmxpbmc7XG4gIGVxdWFsKHRleHRDb250ZW50Lm5vZGVUeXBlLCAzLCBcInNlY29uZCBub2RlIG9mIHRoZSBoZWxwZXIgc2hvdWxkIGJlIGEgdGV4dCBub2RlXCIpO1xuICBlcXVhbCh0ZXh0Q29udGVudC5ub2RlVmFsdWUsIFwiaGVsbG8gd29ybGRcIiwgXCJpdHMgY29udGVudCBzaG91bGQgYmUgaGVsbG8gd29ybGRcIik7XG5cbiAgdmFyIGZvdXJ0aE5vZGUgPSB0ZXh0Q29udGVudC5uZXh0U2libGluZztcbiAgZXF1YWwoZm91cnRoTm9kZS5ub2RlVHlwZSwgMywgXCJsYXN0IG5vZGUgb2YgdGhlIGhlbHBlciBzaG91bGQgYmUgYSB0ZXh0IG5vZGVcIik7XG4gIGVxdWFsKGZvdXJ0aE5vZGUubm9kZVZhbHVlLCBcIlwiLCBcIml0cyBjb250ZW50IHNob3VsZCBiZSBlbXB0eVwiKTtcblxuICB2YXIgbGFzdE5vZGUgPSBmb3VydGhOb2RlLm5leHRTaWJsaW5nO1xuICBlcXVhbChsYXN0Tm9kZS5ub2RlVHlwZSwgMywgXCJsYXN0IG5vZGUgb2YgdGhlIHBhcmVudCB0ZW1wbGF0ZSBzaG91bGQgYmUgYSB0ZXh0IG5vZGVcIik7XG4gIGVxdWFsKGxhc3ROb2RlLm5vZGVWYWx1ZSwgXCJcIiwgXCJpdHMgY29udGVudCBzaG91bGQgYmUgZW1wdHlcIik7XG5cbiAgc3RyaWN0RXF1YWwobGFzdE5vZGUubmV4dFNpYmxpbmcsIG51bGwsIFwidGhlcmUgc2hvdWxkIG9ubHkgYmUgZml2ZSBub2Rlc1wiKTtcbn0pO1xuXG50ZXN0KFwiY2xlYW4gY29udGVudCBkb2Vzbid0IGdldCBibG93biBhd2F5XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwiPGRpdj57e3ZhbHVlfX08L2Rpdj5cIik7XG4gIHZhciBvYmplY3QgPSB7IHZhbHVlOiBcImhlbGxvXCIgfTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG5cbiAgdmFyIHRleHROb2RlID0gcmVzdWx0LmZyYWdtZW50LmZpcnN0Q2hpbGQuZmlyc3RDaGlsZDtcbiAgZXF1YWwodGV4dE5vZGUubm9kZVZhbHVlLCBcImhlbGxvXCIpO1xuXG4gIG9iamVjdC52YWx1ZSA9IFwiZ29vZGJ5ZVwiO1xuICByZXN1bHQucmV2YWxpZGF0ZSgpOyAvLyB3aXRob3V0IHNldHRpbmcgdGhlIG5vZGUgdG8gZGlydHlcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsICc8ZGl2PmhlbGxvPC9kaXY+Jyk7XG5cbiAgdmFyIHRleHRSZW5kZXJOb2RlID0gcmVzdWx0LnJvb3QuY2hpbGROb2Rlc1swXTtcblxuICB0ZXh0UmVuZGVyTm9kZS5zZXRDb250ZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgb2soZmFsc2UsIFwiU2hvdWxkIG5vdCBnZXQgY2FsbGVkXCIpO1xuICB9O1xuXG4gIG9iamVjdC52YWx1ZSA9IFwiaGVsbG9cIjtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG59KTtcblxudGVzdChcImhlbHBlciBjYWxscyBmb2xsb3cgdGhlIG5vcm1hbCBkaXJ0eWluZyBydWxlc1wiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ2NhcGl0YWxpemUnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICByZXR1cm4gcGFyYW1zWzBdLnRvVXBwZXJDYXNlKCk7XG4gIH0pO1xuXG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8ZGl2Pnt7Y2FwaXRhbGl6ZSB2YWx1ZX19PC9kaXY+XCIpO1xuICB2YXIgb2JqZWN0ID0geyB2YWx1ZTogXCJoZWxsb1wiIH07XG4gIHZhciByZXN1bHQgPSB0ZW1wbGF0ZS5yZW5kZXIob2JqZWN0LCBlbnYpO1xuXG4gIHZhciB0ZXh0Tm9kZSA9IHJlc3VsdC5mcmFnbWVudC5maXJzdENoaWxkLmZpcnN0Q2hpbGQ7XG4gIGVxdWFsKHRleHROb2RlLm5vZGVWYWx1ZSwgXCJIRUxMT1wiKTtcblxuICBvYmplY3QudmFsdWUgPSBcImdvb2RieWVcIjtcbiAgcmVzdWx0LnJldmFsaWRhdGUoKTsgLy8gd2l0aG91dCBzZXR0aW5nIHRoZSBub2RlIHRvIGRpcnR5XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnPGRpdj5IRUxMTzwvZGl2PicpO1xuXG4gIHZhciB0ZXh0UmVuZGVyTm9kZSA9IHJlc3VsdC5yb290LmNoaWxkTm9kZXNbMF07XG5cbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnPGRpdj5HT09EQllFPC9kaXY+Jyk7XG5cbiAgdGV4dFJlbmRlck5vZGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uKCkge1xuICAgIG9rKGZhbHNlLCBcIlNob3VsZCBub3QgZ2V0IGNhbGxlZFwiKTtcbiAgfTtcblxuICAvLyBDaGVja3Mgbm9ybWFsaXplZCB2YWx1ZSwgbm90IHJhdyB2YWx1ZVxuICBvYmplY3QudmFsdWUgPSBcIkdvT2RCeUVcIjtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG59KTtcblxudGVzdChcImF0dHJpYnV0ZSBub2RlcyBmb2xsb3cgdGhlIG5vcm1hbCBkaXJ0eWluZyBydWxlc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZShcIjxkaXYgY2xhc3M9e3t2YWx1ZX19PmhlbGxvPC9kaXY+XCIpO1xuICB2YXIgb2JqZWN0ID0geyB2YWx1ZTogXCJ3b3JsZFwiIH07XG5cbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjxkaXYgY2xhc3M9J3dvcmxkJz5oZWxsbzwvZGl2PlwiLCBcIkluaXRpYWwgcmVuZGVyXCIpO1xuXG4gIG9iamVjdC52YWx1ZSA9IFwidW5pdmVyc2VcIjtcbiAgcmVzdWx0LnJldmFsaWRhdGUoKTsgLy8gd2l0aG91dCBzZXR0aW5nIHRoZSBub2RlIHRvIGRpcnR5XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjxkaXYgY2xhc3M9J3dvcmxkJz5oZWxsbzwvZGl2PlwiLCBcIlJldmFsaWRhdGluZyB3aXRob3V0IGRpcnR5aW5nXCIpO1xuXG4gIHZhciBhdHRyUmVuZGVyTm9kZSA9IHJlc3VsdC5yb290LmNoaWxkTm9kZXNbMF07XG5cbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjxkaXYgY2xhc3M9J3VuaXZlcnNlJz5oZWxsbzwvZGl2PlwiLCBcIlJldmFsaWRhdGluZyBhZnRlciBkaXJ0eWluZ1wiKTtcblxuICBhdHRyUmVuZGVyTm9kZS5zZXRDb250ZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgb2soZmFsc2UsIFwiU2hvdWxkIG5vdCBnZXQgY2FsbGVkXCIpO1xuICB9O1xuXG4gIG9iamVjdC52YWx1ZSA9IFwidW5pdmVyc2VcIjtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG59KTtcblxudGVzdChcImF0dHJpYnV0ZSBub2RlcyB3LyBjb25jYXQgZm9sbG93IHRoZSBub3JtYWwgZGlydHlpbmcgcnVsZXNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8ZGl2IGNsYXNzPSdoZWxsbyB7e3ZhbHVlfX0nPmhlbGxvPC9kaXY+XCIpO1xuICB2YXIgb2JqZWN0ID0geyB2YWx1ZTogXCJ3b3JsZFwiIH07XG4gIHZhciByZXN1bHQgPSB0ZW1wbGF0ZS5yZW5kZXIob2JqZWN0LCBlbnYpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8ZGl2IGNsYXNzPSdoZWxsbyB3b3JsZCc+aGVsbG88L2Rpdj5cIik7XG5cbiAgb2JqZWN0LnZhbHVlID0gXCJ1bml2ZXJzZVwiO1xuICByZXN1bHQucmV2YWxpZGF0ZSgpOyAvLyB3aXRob3V0IHNldHRpbmcgdGhlIG5vZGUgdG8gZGlydHlcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPGRpdiBjbGFzcz0naGVsbG8gd29ybGQnPmhlbGxvPC9kaXY+XCIpO1xuXG4gIHZhciBhdHRyUmVuZGVyTm9kZSA9IHJlc3VsdC5yb290LmNoaWxkTm9kZXNbMF07XG5cbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjxkaXYgY2xhc3M9J2hlbGxvIHVuaXZlcnNlJz5oZWxsbzwvZGl2PlwiKTtcblxuICBhdHRyUmVuZGVyTm9kZS5zZXRDb250ZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgb2soZmFsc2UsIFwiU2hvdWxkIG5vdCBnZXQgY2FsbGVkXCIpO1xuICB9O1xuXG4gIG9iamVjdC52YWx1ZSA9IFwidW5pdmVyc2VcIjtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG59KTtcblxudGVzdEVhY2hIZWxwZXIoXG4gIFwiQW4gaW1wbGVtZW50YXRpb24gb2YgI2VhY2ggdXNpbmcgYmxvY2sgcGFyYW1zXCIsXG4gIFwiPHVsPnt7I2VhY2ggbGlzdCBhcyB8aXRlbXx9fTxsaSBjbGFzcz17e2l0ZW0uY2xhc3N9fT57e2l0ZW0ubmFtZX19PC9saT57ey9lYWNofX08L3VsPlwiXG4pO1xuXG50ZXN0RWFjaEhlbHBlcihcbiAgXCJBbiBpbXBsZW1lbnRhdGlvbiBvZiAjZWFjaCB1c2luZyBhIHNlbGYgYmluZGluZ1wiLFxuICBcIjx1bD57eyNlYWNoIGxpc3R9fTxsaSBjbGFzcz17e2NsYXNzfX0+e3tuYW1lfX08L2xpPnt7L2VhY2h9fTwvdWw+XCJcbik7XG5cbmZ1bmN0aW9uIHRlc3RFYWNoSGVscGVyKHRlc3ROYW1lLCB0ZW1wbGF0ZVNvdXJjZSkge1xuICB0ZXN0KHRlc3ROYW1lLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKHRlbXBsYXRlU291cmNlKTtcbiAgICB2YXIgb2JqZWN0ID0geyBsaXN0OiBbXG4gICAgICB7IGtleTogXCIxXCIsIG5hbWU6IFwiVG9tIERhbGVcIiwgXCJjbGFzc1wiOiBcInRvbWRhbGVcIiB9LFxuICAgICAgeyBrZXk6IFwiMlwiLCBuYW1lOiBcIlllaHVkYSBLYXR6XCIsIFwiY2xhc3NcIjogXCJ3eWNhdHNcIiB9XG4gICAgXX07XG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG5cbiAgICB2YXIgaXRlbU5vZGUgPSBnZXRJdGVtTm9kZSgndG9tZGFsZScpO1xuICAgIHZhciBuYW1lTm9kZSA9IGdldE5hbWVOb2RlKCd0b21kYWxlJyk7XG5cbiAgICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPHVsPjxsaSBjbGFzcz0ndG9tZGFsZSc+VG9tIERhbGU8L2xpPjxsaSBjbGFzcz0nd3ljYXRzJz5ZZWh1ZGEgS2F0ejwvbGk+PC91bD5cIiwgXCJJbml0aWFsIHJlbmRlclwiKTtcblxuICAgIHJlcmVuZGVyKCk7XG4gICAgYXNzZXJ0U3RhYmxlTm9kZXMoJ3RvbWRhbGUnLCBcImFmdGVyIG5vLW9wIHJlcmVuZGVyXCIpO1xuICAgIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8dWw+PGxpIGNsYXNzPSd0b21kYWxlJz5Ub20gRGFsZTwvbGk+PGxpIGNsYXNzPSd3eWNhdHMnPlllaHVkYSBLYXR6PC9saT48L3VsPlwiLCBcIkFmdGVyIG5vLW9wIHJlLXJlbmRlclwiKTtcblxuICAgIHJlc3VsdC5yZXZhbGlkYXRlKCk7XG4gICAgYXNzZXJ0U3RhYmxlTm9kZXMoJ3RvbWRhbGUnLCBcImFmdGVyIG5vbi1kaXJ0eSByZXJlbmRlclwiKTtcbiAgICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPHVsPjxsaSBjbGFzcz0ndG9tZGFsZSc+VG9tIERhbGU8L2xpPjxsaSBjbGFzcz0nd3ljYXRzJz5ZZWh1ZGEgS2F0ejwvbGk+PC91bD5cIiwgXCJBZnRlciBuby1vcCByZS1yZW5kZXJcIik7XG5cbiAgICBvYmplY3QgPSB7IGxpc3Q6IFtvYmplY3QubGlzdFsxXSwgb2JqZWN0Lmxpc3RbMF1dIH07XG4gICAgcmVyZW5kZXIob2JqZWN0KTtcbiAgICBhc3NlcnRTdGFibGVOb2RlcygndG9tZGFsZScsIFwiYWZ0ZXIgY2hhbmdpbmcgdGhlIGxpc3Qgb3JkZXJcIik7XG4gICAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjx1bD48bGkgY2xhc3M9J3d5Y2F0cyc+WWVodWRhIEthdHo8L2xpPjxsaSBjbGFzcz0ndG9tZGFsZSc+VG9tIERhbGU8L2xpPjwvdWw+XCIsIFwiQWZ0ZXIgY2hhbmdpbmcgdGhlIGxpc3Qgb3JkZXJcIik7XG5cbiAgICBvYmplY3QgPSB7IGxpc3Q6IFtcbiAgICAgIHsga2V5OiBcIjFcIiwgbmFtZTogXCJNYXJ0aW4gTXXDsW96XCIsIFwiY2xhc3NcIjogXCJtbXVuXCIgfSxcbiAgICAgIHsga2V5OiBcIjJcIiwgbmFtZTogXCJLcmlzIFNlbGRlblwiLCBcImNsYXNzXCI6IFwia3Jpc3NlbGRlblwiIH1cbiAgICBdfTtcbiAgICByZXJlbmRlcihvYmplY3QpO1xuICAgIGFzc2VydFN0YWJsZU5vZGVzKCdtbXVuJywgXCJhZnRlciBjaGFuZ2luZyB0aGUgbGlzdCBlbnRyaWVzLCBidXQgd2l0aCBzdGFibGUga2V5c1wiKTtcbiAgICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPHVsPjxsaSBjbGFzcz0nbW11bic+TWFydGluIE11w7FvejwvbGk+PGxpIGNsYXNzPSdrcmlzc2VsZGVuJz5LcmlzIFNlbGRlbjwvbGk+PC91bD5cIiwgXCJBZnRlciBjaGFuZ2luZyB0aGUgbGlzdCBlbnRyaWVzLCBidXQgd2l0aCBzdGFibGUga2V5c1wiKTtcblxuICAgIG9iamVjdCA9IHsgbGlzdDogW1xuICAgICAgeyBrZXk6IFwiMVwiLCBuYW1lOiBcIk1hcnRpbiBNdcOxb3pcIiwgXCJjbGFzc1wiOiBcIm1tdW5cIiB9LFxuICAgICAgeyBrZXk6IFwiMlwiLCBuYW1lOiBcIktyaXN0b3BoIFNlbGRlblwiLCBcImNsYXNzXCI6IFwia3Jpc3NlbGRlblwiIH0sXG4gICAgICB7IGtleTogXCIzXCIsIG5hbWU6IFwiTWF0dGhldyBCZWFsZVwiLCBcImNsYXNzXCI6IFwibWl4b25pY1wiIH1cbiAgICBdfTtcblxuICAgIHJlcmVuZGVyKG9iamVjdCk7XG4gICAgYXNzZXJ0U3RhYmxlTm9kZXMoJ21tdW4nLCBcImFmdGVyIGFkZGluZyBhbiBhZGRpdGlvbmFsIGVudHJ5XCIpO1xuICAgIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8dWw+PGxpIGNsYXNzPSdtbXVuJz5NYXJ0aW4gTXXDsW96PC9saT48bGkgY2xhc3M9J2tyaXNzZWxkZW4nPktyaXN0b3BoIFNlbGRlbjwvbGk+PGxpIGNsYXNzPSdtaXhvbmljJz5NYXR0aGV3IEJlYWxlPC9saT48L3VsPlwiLCBcIkFmdGVyIGFkZGluZyBhbiBhZGRpdGlvbmFsIGVudHJ5XCIpO1xuXG4gICAgb2JqZWN0ID0geyBsaXN0OiBbXG4gICAgICB7IGtleTogXCIxXCIsIG5hbWU6IFwiTWFydGluIE11w7FvelwiLCBcImNsYXNzXCI6IFwibW11blwiIH0sXG4gICAgICB7IGtleTogXCIzXCIsIG5hbWU6IFwiTWF0dGhldyBCZWFsZVwiLCBcImNsYXNzXCI6IFwibWl4b25pY1wiIH1cbiAgICBdfTtcblxuICAgIHJlcmVuZGVyKG9iamVjdCk7XG4gICAgYXNzZXJ0U3RhYmxlTm9kZXMoJ21tdW4nLCBcImFmdGVyIHJlbW92aW5nIHRoZSBtaWRkbGUgZW50cnlcIik7XG4gICAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjx1bD48bGkgY2xhc3M9J21tdW4nPk1hcnRpbiBNdcOxb3o8L2xpPjxsaSBjbGFzcz0nbWl4b25pYyc+TWF0dGhldyBCZWFsZTwvbGk+PC91bD5cIiwgXCJhZnRlciByZW1vdmluZyB0aGUgbWlkZGxlIGVudHJ5XCIpO1xuXG4gICAgb2JqZWN0ID0geyBsaXN0OiBbXG4gICAgICB7IGtleTogXCIxXCIsIG5hbWU6IFwiTWFydGluIE11w7FvelwiLCBcImNsYXNzXCI6IFwibW11blwiIH0sXG4gICAgICB7IGtleTogXCI0XCIsIG5hbWU6IFwiU3RlZmFuIFBlbm5lclwiLCBcImNsYXNzXCI6IFwic3RlZmFucGVubmVyXCIgfSxcbiAgICAgIHsga2V5OiBcIjVcIiwgbmFtZTogXCJSb2JlcnQgSmFja3NvblwiLCBcImNsYXNzXCI6IFwicndqYmx1ZVwiIH1cbiAgICBdfTtcblxuICAgIHJlcmVuZGVyKG9iamVjdCk7XG4gICAgYXNzZXJ0U3RhYmxlTm9kZXMoJ21tdW4nLCBcImFmdGVyIGFkZGluZyB0d28gbW9yZSBlbnRyaWVzXCIpO1xuICAgIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8dWw+PGxpIGNsYXNzPSdtbXVuJz5NYXJ0aW4gTXXDsW96PC9saT48bGkgY2xhc3M9J3N0ZWZhbnBlbm5lcic+U3RlZmFuIFBlbm5lcjwvbGk+PGxpIGNsYXNzPSdyd2pibHVlJz5Sb2JlcnQgSmFja3NvbjwvbGk+PC91bD5cIiwgXCJBZnRlciBhZGRpbmcgdHdvIG1vcmUgZW50cmllc1wiKTtcblxuICAgIC8vIE5ldyBub2RlIGZvciBzdGFiaWxpdHkgY2hlY2tcbiAgICBpdGVtTm9kZSA9IGdldEl0ZW1Ob2RlKCdyd2pibHVlJyk7XG4gICAgbmFtZU5vZGUgPSBnZXROYW1lTm9kZSgncndqYmx1ZScpO1xuXG4gICAgb2JqZWN0ID0geyBsaXN0OiBbXG4gICAgICB7IGtleTogXCI1XCIsIG5hbWU6IFwiUm9iZXJ0IEphY2tzb25cIiwgXCJjbGFzc1wiOiBcInJ3amJsdWVcIiB9XG4gICAgXX07XG5cbiAgICByZXJlbmRlcihvYmplY3QpO1xuICAgIGFzc2VydFN0YWJsZU5vZGVzKCdyd2pibHVlJywgXCJhZnRlciByZW1vdmluZyB0d28gZW50cmllc1wiKTtcbiAgICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPHVsPjxsaSBjbGFzcz0ncndqYmx1ZSc+Um9iZXJ0IEphY2tzb248L2xpPjwvdWw+XCIsIFwiQWZ0ZXIgcmVtb3ZpbmcgdHdvIGVudHJpZXNcIik7XG5cbiAgICBvYmplY3QgPSB7IGxpc3Q6IFtcbiAgICAgIHsga2V5OiBcIjFcIiwgbmFtZTogXCJNYXJ0aW4gTXXDsW96XCIsIFwiY2xhc3NcIjogXCJtbXVuXCIgfSxcbiAgICAgIHsga2V5OiBcIjRcIiwgbmFtZTogXCJTdGVmYW4gUGVubmVyXCIsIFwiY2xhc3NcIjogXCJzdGVmYW5wZW5uZXJcIiB9LFxuICAgICAgeyBrZXk6IFwiNVwiLCBuYW1lOiBcIlJvYmVydCBKYWNrc29uXCIsIFwiY2xhc3NcIjogXCJyd2pibHVlXCIgfVxuICAgIF19O1xuXG4gICAgcmVyZW5kZXIob2JqZWN0KTtcbiAgICBhc3NlcnRTdGFibGVOb2RlcygncndqYmx1ZScsIFwiYWZ0ZXIgYWRkaW5nIGJhY2sgZW50cmllc1wiKTtcbiAgICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPHVsPjxsaSBjbGFzcz0nbW11bic+TWFydGluIE11w7FvejwvbGk+PGxpIGNsYXNzPSdzdGVmYW5wZW5uZXInPlN0ZWZhbiBQZW5uZXI8L2xpPjxsaSBjbGFzcz0ncndqYmx1ZSc+Um9iZXJ0IEphY2tzb248L2xpPjwvdWw+XCIsIFwiQWZ0ZXIgYWRkaW5nIGJhY2sgZW50cmllc1wiKTtcblxuICAgIC8vIE5ldyBub2RlIGZvciBzdGFiaWxpdHkgY2hlY2tcbiAgICBpdGVtTm9kZSA9IGdldEl0ZW1Ob2RlKCdtbXVuJyk7XG4gICAgbmFtZU5vZGUgPSBnZXROYW1lTm9kZSgnbW11bicpO1xuXG4gICAgb2JqZWN0ID0geyBsaXN0OiBbXG4gICAgICB7IGtleTogXCIxXCIsIG5hbWU6IFwiTWFydGluIE11w7FvelwiLCBcImNsYXNzXCI6IFwibW11blwiIH1cbiAgICBdfTtcblxuICAgIHJlcmVuZGVyKG9iamVjdCk7XG4gICAgYXNzZXJ0U3RhYmxlTm9kZXMoJ21tdW4nLCBcImFmdGVyIHJlbW92aW5nIGZyb20gdGhlIGJhY2tcIik7XG4gICAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjx1bD48bGkgY2xhc3M9J21tdW4nPk1hcnRpbiBNdcOxb3o8L2xpPjwvdWw+XCIsIFwiQWZ0ZXIgcmVtb3ZpbmcgZnJvbSB0aGUgYmFja1wiKTtcblxuICAgIG9iamVjdCA9IHsgbGlzdDogW10gfTtcblxuICAgIHJlcmVuZGVyKG9iamVjdCk7XG4gICAgc3RyaWN0RXF1YWwocmVzdWx0LmZyYWdtZW50LmZpcnN0Q2hpbGQuZmlyc3RDaGlsZC5ub2RlVHlwZSwgOCwgXCJ0aGVyZSBhcmUgbm8gbGkncyBhZnRlciByZW1vdmluZyB0aGUgcmVtYWluaW5nIGVudHJ5XCIpO1xuICAgIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8dWw+PCEtLS0tPjwvdWw+XCIsIFwiQWZ0ZXIgcmVtb3ZpbmcgdGhlIHJlbWFpbmluZyBlbnRyaWVzXCIpO1xuXG4gICAgZnVuY3Rpb24gcmVyZW5kZXIoY29udGV4dCkge1xuICAgICAgcmVzdWx0LnJlcmVuZGVyKGVudiwgY29udGV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNzZXJ0U3RhYmxlTm9kZXMoY2xhc3NOYW1lLCBtZXNzYWdlKSB7XG4gICAgICBzdHJpY3RFcXVhbChnZXRJdGVtTm9kZShjbGFzc05hbWUpLCBpdGVtTm9kZSwgXCJUaGUgaXRlbSBub2RlIGhhcyBub3QgY2hhbmdlZCBcIiArIG1lc3NhZ2UpO1xuICAgICAgc3RyaWN0RXF1YWwoZ2V0TmFtZU5vZGUoY2xhc3NOYW1lKSwgbmFtZU5vZGUsIFwiVGhlIG5hbWUgbm9kZSBoYXMgbm90IGNoYW5nZWQgXCIgKyBtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVtTm9kZShjbGFzc05hbWUpIHtcbiAgICAgIC8vIDxsaT5cbiAgICAgIHZhciBpdGVtTm9kZSA9IHJlc3VsdC5mcmFnbWVudC5maXJzdENoaWxkLmZpcnN0Q2hpbGQ7XG5cbiAgICAgIHdoaWxlIChpdGVtTm9kZSkge1xuICAgICAgICBpZiAoaXRlbU5vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpID09PSBjbGFzc05hbWUpIHsgYnJlYWs7IH1cbiAgICAgICAgaXRlbU5vZGUgPSBpdGVtTm9kZS5uZXh0U2libGluZztcbiAgICAgIH1cblxuICAgICAgb2soaXRlbU5vZGUsIFwiRXhwZWN0ZWQgbm9kZSB3aXRoIGNsYXNzPSdcIiArIGNsYXNzTmFtZSArIFwiJ1wiKTtcbiAgICAgIHJldHVybiBpdGVtTm9kZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROYW1lTm9kZShjbGFzc05hbWUpIHtcbiAgICAgIC8vIHt7aXRlbS5uYW1lfX1cbiAgICAgIHZhciBpdGVtTm9kZSA9IGdldEl0ZW1Ob2RlKGNsYXNzTmFtZSk7XG4gICAgICBvayhpdGVtTm9kZSwgXCJFeHBlY3RlZCBjaGlsZCBub2RlIG9mIG5vZGUgd2l0aCBjbGFzcz0nXCIgKyBjbGFzc05hbWUgKyBcIicsIGJ1dCBubyBwYXJlbnQgbm9kZSBmb3VuZFwiKTtcblxuICAgICAgdmFyIGNoaWxkTm9kZSA9IGl0ZW1Ob2RlICYmIGl0ZW1Ob2RlLmZpcnN0Q2hpbGQ7XG4gICAgICBvayhjaGlsZE5vZGUsIFwiRXhwZWN0ZWQgY2hpbGQgbm9kZSBvZiBub2RlIHdpdGggY2xhc3M9J1wiICsgY2xhc3NOYW1lICsgXCInLCBidXQgbm90IGNoaWxkIG5vZGUgZm91bmRcIik7XG5cbiAgICAgIHJldHVybiBjaGlsZE5vZGU7XG4gICAgfVxuICB9KTtcbn1cblxudGVzdChcIlJldHVybmluZyB0cnVlIGZyb20gYGxpbmtSZW5kZXJOb2Rlc2AgbWFrZXMgdGhlIHZhbHVlIGl0c2VsZiBzdGFibGUgYWNyb3NzIHJlbmRlcnNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBzdHJlYW1zID0geyBoZWxsbzogeyB2YWx1ZTogXCJoZWxsb1wiIH0sIHdvcmxkOiB7IHZhbHVlOiBcIndvcmxkXCIgfSB9O1xuXG4gIGhvb2tzLmxpbmtSZW5kZXJOb2RlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgaG9va3MuZ2V0VmFsdWUgPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICByZXR1cm4gc3RyZWFtKCk7XG4gIH07XG5cbiAgdmFyIGNvbmNhdENhbGxlZCA9IDA7XG4gIGhvb2tzLmNvbmNhdCA9IGZ1bmN0aW9uKGVudiwgcGFyYW1zKSB7XG4gICAgb2soKytjb25jYXRDYWxsZWQgPT09IDEsIFwiVGhlIGNvbmNhdCBob29rIGlzIG9ubHkgaW52b2tlZCBvbmUgdGltZSAoaW52b2tlZCBcIiArIGNvbmNhdENhbGxlZCArIFwiIHRpbWVzKVwiKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGFyYW1zWzBdLnZhbHVlICsgcGFyYW1zWzFdICsgcGFyYW1zWzJdLnZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZShcIjxkaXYgY2xhc3M9J3t7aGVsbG99fSB7e3dvcmxkfX0nPjwvZGl2PlwiKTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihzdHJlYW1zLCBlbnYpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8ZGl2IGNsYXNzPSdoZWxsbyB3b3JsZCc+PC9kaXY+XCIpO1xuXG4gIHN0cmVhbXMuaGVsbG8udmFsdWUgPSBcImdvb2RieWVcIjtcblxuICByZXN1bHQucmVyZW5kZXIoKTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPGRpdiBjbGFzcz0nZ29vZGJ5ZSB3b3JsZCc+PC9kaXY+XCIpO1xufSk7XG5cbnZhciBkZXN0cm95ZWRSZW5kZXJOb2RlQ291bnQ7XG52YXIgZGVzdHJveWVkUmVuZGVyTm9kZTtcblxuUVVuaXQubW9kdWxlKFwiSFRNTC1iYXNlZCBjb21waWxlciAoZGlydHlpbmcpIC0gcHJ1bmluZ1wiLCB7XG4gIGJlZm9yZUVhY2g6IGZ1bmN0aW9uKCkge1xuICAgIGNvbW1vblNldHVwKCk7XG4gICAgZGVzdHJveWVkUmVuZGVyTm9kZUNvdW50ID0gMDtcbiAgICBkZXN0cm95ZWRSZW5kZXJOb2RlID0gbnVsbDtcblxuICAgIGhvb2tzLmRlc3Ryb3lSZW5kZXJOb2RlID0gZnVuY3Rpb24ocmVuZGVyTm9kZSkge1xuICAgICAgZGVzdHJveWVkUmVuZGVyTm9kZSA9IHJlbmRlck5vZGU7XG4gICAgICBkZXN0cm95ZWRSZW5kZXJOb2RlQ291bnQrKztcbiAgICB9O1xuICB9XG59KTtcblxudGVzdChcIlBydW5lZCByZW5kZXIgbm9kZXMgaW52b2tlIGEgY2xlYW51cCBob29rIHdoZW4gcmVwbGFjZWRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBvYmplY3QgPSB7IGNvbmRpdGlvbjogdHJ1ZSwgdmFsdWU6ICdoZWxsbyB3b3JsZCcsIGZhbHN5OiBcIk5vdGhpbmdcIiB9O1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8ZGl2Pnt7I2lmIGNvbmRpdGlvbn19PHA+e3t2YWx1ZX19PC9wPnt7ZWxzZX19PHA+e3tmYWxzeX19PC9wPnt7L2lmfX08L2Rpdj4nKTtcblxuICB2YXIgcmVzdWx0ID0gdGVtcGxhdGUucmVuZGVyKG9iamVjdCwgZW52KTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPGRpdj48cD5oZWxsbyB3b3JsZDwvcD48L2Rpdj5cIik7XG5cbiAgb2JqZWN0LmNvbmRpdGlvbiA9IGZhbHNlO1xuICByZXN1bHQucmVyZW5kZXIoKTtcblxuICBzdHJpY3RFcXVhbChkZXN0cm95ZWRSZW5kZXJOb2RlQ291bnQsIDEsIFwiY2xlYW51cCBob29rIHdhcyBpbnZva2VkIG9uY2VcIik7XG4gIHN0cmljdEVxdWFsKGRlc3Ryb3llZFJlbmRlck5vZGUubGFzdFZhbHVlLCAnaGVsbG8gd29ybGQnLCBcIlRoZSBjb3JyZWN0IHJlbmRlciBub2RlIGlzIHBhc3NlZCBpblwiKTtcblxuICBvYmplY3QuY29uZGl0aW9uID0gdHJ1ZTtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG5cbiAgc3RyaWN0RXF1YWwoZGVzdHJveWVkUmVuZGVyTm9kZUNvdW50LCAyLCBcImNsZWFudXAgaG9vayB3YXMgaW52b2tlZCBhZ2FpblwiKTtcbiAgc3RyaWN0RXF1YWwoZGVzdHJveWVkUmVuZGVyTm9kZS5sYXN0VmFsdWUsICdOb3RoaW5nJywgXCJUaGUgY29ycmVjdCByZW5kZXIgbm9kZSBpcyBwYXNzZWQgaW5cIik7XG59KTtcblxudGVzdChcIlBydW5lZCByZW5kZXIgbm9kZXMgaW52b2tlIGEgY2xlYW51cCBob29rIHdoZW4gY2xlYXJlZFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIG9iamVjdCA9IHsgY29uZGl0aW9uOiB0cnVlLCB2YWx1ZTogJ2hlbGxvIHdvcmxkJyB9O1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8ZGl2Pnt7I2lmIGNvbmRpdGlvbn19PHA+e3t2YWx1ZX19PC9wPnt7L2lmfX08L2Rpdj4nKTtcblxuICB2YXIgcmVzdWx0ID0gdGVtcGxhdGUucmVuZGVyKG9iamVjdCwgZW52KTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPGRpdj48cD5oZWxsbyB3b3JsZDwvcD48L2Rpdj5cIik7XG5cbiAgb2JqZWN0LmNvbmRpdGlvbiA9IGZhbHNlO1xuICByZXN1bHQucmVyZW5kZXIoKTtcblxuICBzdHJpY3RFcXVhbChkZXN0cm95ZWRSZW5kZXJOb2RlQ291bnQsIDEsIFwiY2xlYW51cCBob29rIHdhcyBpbnZva2VkIG9uY2VcIik7XG4gIHN0cmljdEVxdWFsKGRlc3Ryb3llZFJlbmRlck5vZGUubGFzdFZhbHVlLCAnaGVsbG8gd29ybGQnLCBcIlRoZSBjb3JyZWN0IHJlbmRlciBub2RlIGlzIHBhc3NlZCBpblwiKTtcblxuICBvYmplY3QuY29uZGl0aW9uID0gdHJ1ZTtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG5cbiAgc3RyaWN0RXF1YWwoZGVzdHJveWVkUmVuZGVyTm9kZUNvdW50LCAxLCBcImNsZWFudXAgaG9vayB3YXMgbm90IGludm9rZWQgYWdhaW5cIik7XG59KTtcblxudGVzdChcIlBydW5lZCBsaXN0cyBpbnZva2UgYSBjbGVhbnVwIGhvb2sgd2hlbiByZW1vdmluZyBlbGVtZW50c1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIG9iamVjdCA9IHsgbGlzdDogW3sga2V5OiBcIjFcIiwgd29yZDogXCJoZWxsb1wiIH0sIHsga2V5OiBcIjJcIiwgd29yZDogXCJ3b3JsZFwiIH1dIH07XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxkaXY+e3sjZWFjaCBsaXN0IGFzIHxpdGVtfH19PHA+e3tpdGVtLndvcmR9fTwvcD57ey9lYWNofX08L2Rpdj4nKTtcblxuICB2YXIgcmVzdWx0ID0gdGVtcGxhdGUucmVuZGVyKG9iamVjdCwgZW52KTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiPGRpdj48cD5oZWxsbzwvcD48cD53b3JsZDwvcD48L2Rpdj5cIik7XG5cbiAgb2JqZWN0Lmxpc3QucG9wKCk7XG4gIHJlc3VsdC5yZXJlbmRlcigpO1xuXG4gIHN0cmljdEVxdWFsKGRlc3Ryb3llZFJlbmRlck5vZGVDb3VudCwgMiwgXCJjbGVhbnVwIGhvb2sgd2FzIGludm9rZWQgb25jZSBmb3IgdGhlIHdyYXBwZXIgbW9ycGggYW5kIG9uY2UgZm9yIHRoZSB7e2l0ZW0ud29yZH19XCIpO1xuICBzdHJpY3RFcXVhbChkZXN0cm95ZWRSZW5kZXJOb2RlLmxhc3RWYWx1ZSwgXCJ3b3JsZFwiLCBcIlRoZSBjb3JyZWN0IHJlbmRlciBub2RlIGlzIHBhc3NlZCBpblwiKTtcblxuICBvYmplY3QubGlzdC5wb3AoKTtcbiAgcmVzdWx0LnJlcmVuZGVyKCk7XG5cbiAgc3RyaWN0RXF1YWwoZGVzdHJveWVkUmVuZGVyTm9kZUNvdW50LCA0LCBcImNsZWFudXAgaG9vayB3YXMgaW52b2tlZCBvbmNlIGZvciB0aGUgd3JhcHBlciBtb3JwaCBhbmQgb25jZSBmb3IgdGhlIHt7aXRlbS53b3JkfX1cIik7XG4gIHN0cmljdEVxdWFsKGRlc3Ryb3llZFJlbmRlck5vZGUubGFzdFZhbHVlLCBcImhlbGxvXCIsIFwiVGhlIGNvcnJlY3QgcmVuZGVyIG5vZGUgaXMgcGFzc2VkIGluXCIpO1xufSk7XG5cbnRlc3QoXCJQcnVuZWQgbGlzdHMgaW52b2tlIGEgY2xlYW51cCBob29rIG9uIHRoZWlyIHN1YnRyZWVzIHdoZW4gcmVtb3ZpbmcgZWxlbWVudHNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBvYmplY3QgPSB7IGxpc3Q6IFt7IGtleTogXCIxXCIsIHdvcmQ6IFwiaGVsbG9cIiB9LCB7IGtleTogXCIyXCIsIHdvcmQ6IFwid29ybGRcIiB9XSB9O1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8ZGl2Pnt7I2VhY2ggbGlzdCBhcyB8aXRlbXx9fTxwPnt7I2lmIGl0ZW0ud29yZH19e3tpdGVtLndvcmR9fXt7L2lmfX08L3A+e3svZWFjaH19PC9kaXY+Jyk7XG5cbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjxkaXY+PHA+aGVsbG88L3A+PHA+d29ybGQ8L3A+PC9kaXY+XCIpO1xuXG4gIG9iamVjdC5saXN0LnBvcCgpO1xuICByZXN1bHQucmVyZW5kZXIoKTtcblxuICBzdHJpY3RFcXVhbChkZXN0cm95ZWRSZW5kZXJOb2RlQ291bnQsIDMsIFwiY2xlYW51cCBob29rIHdhcyBpbnZva2VkIG9uY2UgZm9yIHRoZSB3cmFwcGVyIG1vcnBoIGFuZCBvbmNlIGZvciB0aGUge3tpdGVtLndvcmR9fVwiKTtcbiAgc3RyaWN0RXF1YWwoZGVzdHJveWVkUmVuZGVyTm9kZS5sYXN0VmFsdWUsIFwid29ybGRcIiwgXCJUaGUgY29ycmVjdCByZW5kZXIgbm9kZSBpcyBwYXNzZWQgaW5cIik7XG5cbiAgb2JqZWN0Lmxpc3QucG9wKCk7XG4gIHJlc3VsdC5yZXJlbmRlcigpO1xuXG4gIHN0cmljdEVxdWFsKGRlc3Ryb3llZFJlbmRlck5vZGVDb3VudCwgNiwgXCJjbGVhbnVwIGhvb2sgd2FzIGludm9rZWQgb25jZSBmb3IgdGhlIHdyYXBwZXIgbW9ycGggYW5kIG9uY2UgZm9yIHRoZSB7e2l0ZW0ud29yZH19XCIpO1xuICBzdHJpY3RFcXVhbChkZXN0cm95ZWRSZW5kZXJOb2RlLmxhc3RWYWx1ZSwgXCJoZWxsb1wiLCBcIlRoZSBjb3JyZWN0IHJlbmRlciBub2RlIGlzIHBhc3NlZCBpblwiKTtcbn0pO1xuXG5RVW5pdC5tb2R1bGUoXCJNYW51YWwgZWxlbWVudHNcIiwge1xuICBiZWZvcmVFYWNoOiBjb21tb25TZXR1cFxufSk7XG5cblFVbml0LnNraXAoXCJTZXR0aW5nIHVwIGEgbWFudWFsIGVsZW1lbnQgcmVuZGVycyBhbmQgcmV2YWxpZGF0ZXNcIiwgZnVuY3Rpb24oKSB7XG4gIGhvb2tzLmtleXdvcmRzWydtYW51YWwtZWxlbWVudCddID0ge1xuICAgIHJlbmRlcjogZnVuY3Rpb24obW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpIHtcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICAgICB0aXRsZTogXCJUb20gRGFsZVwiLFxuICAgICAgICBocmVmOiBbJ2NvbmNhdCcsIFsnaHR0cDovL3RvbWRhbGUuJywgWydnZXQnLCAndGxkJ11dXSxcbiAgICAgICAgJ2RhdGEtYmFyJzogWydnZXQnLCAnYmFyJ11cbiAgICAgIH07XG5cbiAgICAgIHZhciBsYXlvdXQgPSBtYW51YWxFbGVtZW50KCdzcGFuJywgYXR0cmlidXRlcyk7XG5cbiAgICAgIGhvc3RCbG9jayhtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIGludmVyc2UsIG51bGwsIHZpc2l0b3IsIGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucy50ZW1wbGF0ZXMudGVtcGxhdGUueWllbGRJbih7IHJhdzogbGF5b3V0IH0sIGhhc2gpO1xuICAgICAgfSk7XG5cbiAgICAgIG1hbnVhbEVsZW1lbnQoZW52LCBzY29wZSwgJ3NwYW4nLCBhdHRyaWJ1dGVzLCBtb3JwaCk7XG4gICAgfSxcblxuICAgIGlzU3RhYmxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWU7IH1cbiAgfTtcblxuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwie3sjbWFudWFsLWVsZW1lbnQgYmFyPSdiYXonIHRsZD0nbmV0J319SGVsbG8ge3t3b3JsZH19IXt7L21hbnVhbC1lbGVtZW50fX1cIik7XG4gIHZhciByZXN1bHQgPSB0ZW1wbGF0ZS5yZW5kZXIoeyB3b3JsZDogXCJ3b3JsZFwiIH0sIGVudik7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCBcIjxzcGFuIHRpdGxlPSdUb20gRGFsZScgaHJlZj0naHR0cDovL3RvbWRhbGUubmV0JyBkYXRhLWJhcj0nYmF6Jz5IZWxsbyB3b3JsZCE8L3NwYW4+XCIpO1xufSk7XG5cbnRlc3QoXCJJdCBpcyBwb3NzaWJsZSB0byBuZXN0IG11bHRpcGxlIHRlbXBsYXRlcyBpbnRvIGEgbWFudWFsIGVsZW1lbnRcIiwgZnVuY3Rpb24oKSB7XG4gIGhvb2tzLmtleXdvcmRzWydtYW51YWwtZWxlbWVudCddID0ge1xuICAgIHJlbmRlcjogZnVuY3Rpb24obW9ycGgsIGVudiwgc2NvcGUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHZpc2l0b3IpIHtcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICAgICB0aXRsZTogXCJUb20gRGFsZVwiLFxuICAgICAgICBocmVmOiBbJ2NvbmNhdCcsIFsnaHR0cDovL3RvbWRhbGUuJywgWydnZXQnLCAndGxkJ11dXSxcbiAgICAgICAgJ2RhdGEtYmFyJzogWydnZXQnLCAnYmFyJ11cbiAgICAgIH07XG5cbiAgICAgIHZhciBlbGVtZW50VGVtcGxhdGUgPSBtYW51YWxFbGVtZW50KCdzcGFuJywgYXR0cmlidXRlcyk7XG5cbiAgICAgIHZhciBjb250ZW50QmxvY2sgPSBibG9ja0ZvcihyZW5kZXIsIHRlbXBsYXRlLCB7IHNjb3BlOiBzY29wZSB9KTtcblxuICAgICAgdmFyIGxheW91dEJsb2NrID0gYmxvY2tGb3IocmVuZGVyLCBsYXlvdXQucmF3LCB7XG4gICAgICAgIHlpZWxkVG86IGNvbnRlbnRCbG9jayxcbiAgICAgICAgc2VsZjogeyBhdHRyczogaGFzaCB9LFxuICAgICAgfSk7XG5cbiAgICAgIHZhciBlbGVtZW50QmxvY2sgPSBibG9ja0ZvcihyZW5kZXIsIGVsZW1lbnRUZW1wbGF0ZSwge1xuICAgICAgICB5aWVsZFRvOiBsYXlvdXRCbG9jayxcbiAgICAgICAgc2VsZjogaGFzaFxuICAgICAgfSk7XG5cbiAgICAgIGVsZW1lbnRCbG9jay5pbnZva2UoZW52LCBudWxsLCB1bmRlZmluZWQsIG1vcnBoLCBudWxsLCB2aXNpdG9yKTtcbiAgICB9LFxuXG4gICAgaXNTdGFibGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfVxuICB9O1xuXG4gIHZhciBsYXlvdXQgPSBjb21waWxlKFwiPGVtPnt7YXR0cnMuZm9vfX0uIHt7eWllbGR9fTwvZW0+XCIpO1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwie3sjbWFudWFsLWVsZW1lbnQgZm9vPSdmb28nIGJhcj0nYmF6JyB0bGQ9J25ldCd9fUhlbGxvIHt7d29ybGR9fSF7ey9tYW51YWwtZWxlbWVudH19XCIpO1xuICB2YXIgcmVzdWx0ID0gdGVtcGxhdGUucmVuZGVyKHsgd29ybGQ6IFwid29ybGRcIiB9LCBlbnYpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgXCI8c3BhbiB0aXRsZT0nVG9tIERhbGUnIGhyZWY9J2h0dHA6Ly90b21kYWxlLm5ldCcgZGF0YS1iYXI9J2Jheic+PGVtPmZvby4gSGVsbG8gd29ybGQhPC9lbT48L3NwYW4+XCIpO1xufSk7XG5cbnRlc3QoXCJUaGUgaW52b2tlIGhlbHBlciBob29rIGNhbiBpbnN0cnVjdCB0aGUgcnVudGltZSB0byBsaW5rIHRoZSByZXN1bHRcIiwgZnVuY3Rpb24oKSB7XG4gIGxldCBpbnZva2VDb3VudCA9IDA7XG5cbiAgZW52Lmhvb2tzLmludm9rZUhlbHBlciA9IGZ1bmN0aW9uKG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yLCBwYXJhbXMsIGhhc2gsIGhlbHBlcikge1xuICAgIGludm9rZUNvdW50Kys7XG4gICAgcmV0dXJuIHsgdmFsdWU6IGhlbHBlcihwYXJhbXMsIGhhc2gpLCBsaW5rOiB0cnVlIH07XG4gIH07XG5cbiAgaGVscGVycy5kb3VibGUgPSBmdW5jdGlvbihbaW5wdXRdKSB7XG4gICAgcmV0dXJuIGlucHV0ICogMjtcbiAgfTtcblxuICBsZXQgdGVtcGxhdGUgPSBjb21waWxlKFwie3tkb3VibGUgMTJ9fVwiKTtcbiAgbGV0IHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiMjRcIik7XG4gIGVxdWFsKGludm9rZUNvdW50LCAxKTtcblxuICByZXN1bHQucmVyZW5kZXIoKTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsIFwiMjRcIik7XG4gIGVxdWFsKGludm9rZUNvdW50LCAxKTtcbn0pO1xuIl19
define('htmlbars-compiler-tests/dirtying-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/dirtying-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/dirtying-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpcnR5aW5nLXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFDakQsT0FBSyxDQUFDLElBQUksQ0FBQyw2REFBNkQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN6RixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw4REFBOEQsQ0FBQyxDQUFDO0dBQ2pGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9kaXJ0eWluZy10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpcnR5aW5nLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2RpcnR5aW5nLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-compiler-tests/fragment-test", ["exports", "../htmlbars-compiler/fragment-opcode-compiler", "../htmlbars-compiler/fragment-javascript-compiler", "../dom-helper", "../htmlbars-syntax/parser", "../htmlbars-test-helpers"], function (exports, _htmlbarsCompilerFragmentOpcodeCompiler, _htmlbarsCompilerFragmentJavascriptCompiler, _domHelper, _htmlbarsSyntaxParser, _htmlbarsTestHelpers) {

  var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
      svgNamespace = "http://www.w3.org/2000/svg";

  function fragmentFor(ast) {
    /* jshint evil: true */
    var fragmentOpcodeCompiler = new _htmlbarsCompilerFragmentOpcodeCompiler.default(),
        fragmentCompiler = new _htmlbarsCompilerFragmentJavascriptCompiler.default();

    var opcodes = fragmentOpcodeCompiler.compile(ast);
    var program = fragmentCompiler.compile(opcodes);

    var fn = new Function("dom", 'return ' + program)();

    return fn(new _domHelper.default());
  }

  QUnit.module('fragment');

  test('compiles a fragment', function () {
    var ast = _htmlbarsSyntaxParser.preprocess("<div>{{foo}} bar {{baz}}</div>");
    var divNode = fragmentFor(ast).firstChild;

    _htmlbarsTestHelpers.equalHTML(divNode, "<div><!----> bar <!----></div>");
  });

  if (document && document.createElementNS) {
    test('compiles an svg fragment', function () {
      var ast = _htmlbarsSyntaxParser.preprocess("<div><svg><circle/><foreignObject><span></span></foreignObject></svg></div>");
      var divNode = fragmentFor(ast).firstChild;

      equal(divNode.childNodes[0].namespaceURI, svgNamespace, 'svg has the right namespace');
      equal(divNode.childNodes[0].childNodes[0].namespaceURI, svgNamespace, 'circle has the right namespace');
      equal(divNode.childNodes[0].childNodes[1].namespaceURI, svgNamespace, 'foreignObject has the right namespace');
      equal(divNode.childNodes[0].childNodes[1].childNodes[0].namespaceURI, xhtmlNamespace, 'span has the right namespace');
    });
  }

  test('compiles an svg element with classes', function () {
    var ast = _htmlbarsSyntaxParser.preprocess('<svg class="red right hand"></svg>');
    var svgNode = fragmentFor(ast).firstChild;

    equal(svgNode.getAttribute('class'), 'red right hand');
  });

  if (document && document.createElementNS) {
    test('compiles an svg element with proper namespace', function () {
      var ast = _htmlbarsSyntaxParser.preprocess('<svg><use xlink:title="nice-title"></use></svg>');
      var svgNode = fragmentFor(ast).firstChild;

      equal(svgNode.childNodes[0].getAttributeNS('http://www.w3.org/1999/xlink', 'title'), 'nice-title');
      equal(svgNode.childNodes[0].attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
      equal(svgNode.childNodes[0].attributes[0].name, 'xlink:title');
      equal(svgNode.childNodes[0].attributes[0].localName, 'title');
      equal(svgNode.childNodes[0].attributes[0].value, 'nice-title');
    });
  }

  test('converts entities to their char/string equivalent', function () {
    var ast = _htmlbarsSyntaxParser.preprocess("<div title=\"&quot;Foo &amp; Bar&quot;\">lol &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax;</div>");
    var divNode = fragmentFor(ast).firstChild;

    equal(divNode.getAttribute('title'), '"Foo & Bar"');
    equal(_htmlbarsTestHelpers.getTextContent(divNode), "lol < << < < ≧̸ &Borksnorlax;");
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2ZyYWdtZW50LXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFNQSxNQUFJLGNBQWMsR0FBRyw4QkFBOEI7TUFDL0MsWUFBWSxHQUFHLDRCQUE0QixDQUFDOztBQUVoRCxXQUFTLFdBQVcsQ0FBQyxHQUFHLEVBQUU7O0FBRXhCLFFBQUksc0JBQXNCLEdBQUcscURBQTRCO1FBQ3JELGdCQUFnQixHQUFHLHlEQUFnQyxDQUFDOztBQUV4RCxRQUFJLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEQsUUFBSSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVoRCxRQUFJLEVBQUUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7O0FBRXBELFdBQU8sRUFBRSxDQUFDLHdCQUFlLENBQUMsQ0FBQztHQUM1Qjs7QUFFRCxPQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDOztBQUV6QixNQUFJLENBQUMscUJBQXFCLEVBQUUsWUFBWTtBQUN0QyxRQUFJLEdBQUcsR0FBRyxzQkF0QkgsVUFBVSxDQXNCSSxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3ZELFFBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUM7O0FBRTFDLHlCQXhCTyxTQUFTLENBd0JOLE9BQU8sRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0dBQ3RELENBQUMsQ0FBQzs7QUFFSCxNQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFO0FBQ3hDLFFBQUksQ0FBQywwQkFBMEIsRUFBRSxZQUFZO0FBQzNDLFVBQUksR0FBRyxHQUFHLHNCQTlCTCxVQUFVLENBOEJNLDZFQUE2RSxDQUFDLENBQUM7QUFDcEcsVUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcs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bnRlbnQiOlsiaW1wb3J0IEZyYWdtZW50T3Bjb2RlQ29tcGlsZXIgZnJvbSBcIi4uL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LW9wY29kZS1jb21waWxlclwiO1xuaW1wb3J0IEZyYWdtZW50SmF2YVNjcmlwdENvbXBpbGVyIGZyb20gXCIuLi9odG1sYmFycy1jb21waWxlci9mcmFnbWVudC1qYXZhc2NyaXB0LWNvbXBpbGVyXCI7XG5pbXBvcnQgRE9NSGVscGVyIGZyb20gXCIuLi9kb20taGVscGVyXCI7XG5pbXBvcnQgeyBwcmVwcm9jZXNzIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheC9wYXJzZXJcIjtcbmltcG9ydCB7IGVxdWFsSFRNTCwgZ2V0VGV4dENvbnRlbnQgfSBmcm9tIFwiLi4vaHRtbGJhcnMtdGVzdC1oZWxwZXJzXCI7XG5cbnZhciB4aHRtbE5hbWVzcGFjZSA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLFxuICAgIHN2Z05hbWVzcGFjZSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcblxuZnVuY3Rpb24gZnJhZ21lbnRGb3IoYXN0KSB7XG4gIC8qIGpzaGludCBldmlsOiB0cnVlICovXG4gIHZhciBmcmFnbWVudE9wY29kZUNvbXBpbGVyID0gbmV3IEZyYWdtZW50T3Bjb2RlQ29tcGlsZXIoKSxcbiAgICAgIGZyYWdtZW50Q29tcGlsZXIgPSBuZXcgRnJhZ21lbnRKYXZhU2NyaXB0Q29tcGlsZXIoKTtcblxuICB2YXIgb3Bjb2RlcyA9IGZyYWdtZW50T3Bjb2RlQ29tcGlsZXIuY29tcGlsZShhc3QpO1xuICB2YXIgcHJvZ3JhbSA9IGZyYWdtZW50Q29tcGlsZXIuY29tcGlsZShvcGNvZGVzKTtcblxuICB2YXIgZm4gPSBuZXcgRnVuY3Rpb24oXCJkb21cIiwgJ3JldHVybiAnICsgcHJvZ3JhbSkoKTtcblxuICByZXR1cm4gZm4obmV3IERPTUhlbHBlcigpKTtcbn1cblxuUVVuaXQubW9kdWxlKCdmcmFnbWVudCcpO1xuXG50ZXN0KCdjb21waWxlcyBhIGZyYWdtZW50JywgZnVuY3Rpb24gKCkge1xuICB2YXIgYXN0ID0gcHJlcHJvY2VzcyhcIjxkaXY+e3tmb299fSBiYXIge3tiYXp9fTwvZGl2PlwiKTtcbiAgdmFyIGRpdk5vZGUgPSBmcmFnbWVudEZvcihhc3QpLmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWxIVE1MKGRpdk5vZGUsIFwiPGRpdj48IS0tLS0+IGJhciA8IS0tLS0+PC9kaXY+XCIpO1xufSk7XG5cbmlmIChkb2N1bWVudCAmJiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgdGVzdCgnY29tcGlsZXMgYW4gc3ZnIGZyYWdtZW50JywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBhc3QgPSBwcmVwcm9jZXNzKFwiPGRpdj48c3ZnPjxjaXJjbGUvPjxmb3JlaWduT2JqZWN0PjxzcGFuPjwvc3Bhbj48L2ZvcmVpZ25PYmplY3Q+PC9zdmc+PC9kaXY+XCIpO1xuICAgIHZhciBkaXZOb2RlID0gZnJhZ21lbnRGb3IoYXN0KS5maXJzdENoaWxkO1xuXG4gICAgZXF1YWwoIGRpdk5vZGUuY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSxcbiAgICAgICAgICAgJ3N2ZyBoYXMgdGhlIHJpZ2h0IG5hbWVzcGFjZScgKTtcbiAgICBlcXVhbCggZGl2Tm9kZS5jaGlsZE5vZGVzWzBdLmNoaWxkTm9kZXNbMF0ubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UsXG4gICAgICAgICAgICdjaXJjbGUgaGFzIHRoZSByaWdodCBuYW1lc3BhY2UnICk7XG4gICAgZXF1YWwoIGRpdk5vZGUuY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzWzFdLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAgICAnZm9yZWlnbk9iamVjdCBoYXMgdGhlIHJpZ2h0IG5hbWVzcGFjZScgKTtcbiAgICBlcXVhbCggZGl2Tm9kZS5jaGlsZE5vZGVzWzBdLmNoaWxkTm9kZXNbMV0uY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHhodG1sTmFtZXNwYWNlLFxuICAgICAgICAgICAnc3BhbiBoYXMgdGhlIHJpZ2h0IG5hbWVzcGFjZScgKTtcbiAgfSk7XG59XG4gIFxudGVzdCgnY29tcGlsZXMgYW4gc3ZnIGVsZW1lbnQgd2l0aCBjbGFzc2VzJywgZnVuY3Rpb24gKCkge1xuICB2YXIgYXN0ID0gcHJlcHJvY2VzcygnPHN2ZyBjbGFzcz1cInJlZCByaWdodCBoYW5kXCI+PC9zdmc+Jyk7XG4gIHZhciBzdmdOb2RlID0gZnJhZ21lbnRGb3IoYXN0KS5maXJzdENoaWxkO1xuXG4gIGVxdWFsKHN2Z05vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpLCAncmVkIHJpZ2h0IGhhbmQnKTtcbn0pO1xuXG5pZiAoZG9jdW1lbnQgJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gIHRlc3QoJ2NvbXBpbGVzIGFuIHN2ZyBlbGVtZW50IHdpdGggcHJvcGVyIG5hbWVzcGFjZScsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXN0ID0gcHJlcHJvY2VzcygnPHN2Zz48dXNlIHhsaW5rOnRpdGxlPVwibmljZS10aXRsZVwiPjwvdXNlPjwvc3ZnPicpO1xuICAgIHZhciBzdmdOb2RlID0gZnJhZ21lbnRGb3IoYXN0KS5maXJzdENoaWxkO1xuXG4gICAgZXF1YWwoc3ZnTm9kZS5jaGlsZE5vZGVzWzBdLmdldEF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgJ3RpdGxlJyksICduaWNlLXRpdGxlJyk7XG4gICAgZXF1YWwoc3ZnTm9kZS5jaGlsZE5vZGVzWzBdLmF0dHJpYnV0ZXNbMF0ubmFtZXNwYWNlVVJJLCAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycpO1xuICAgIGVxdWFsKHN2Z05vZGUuY2hpbGROb2Rlc1swXS5hdHRyaWJ1dGVzWzBdLm5hbWUsICd4bGluazp0aXRsZScpO1xuICAgIGVxdWFsKHN2Z05vZGUuY2hpbGROb2Rlc1swXS5hdHRyaWJ1dGVzWzBdLmxvY2FsTmFtZSwgJ3RpdGxlJyk7XG4gICAgZXF1YWwoc3ZnTm9kZS5jaGlsZE5vZGVzWzBdLmF0dHJpYnV0ZXNbMF0udmFsdWUsICduaWNlLXRpdGxlJyk7XG4gIH0pO1xuXG59XG4gIFxudGVzdCgnY29udmVydHMgZW50aXRpZXMgdG8gdGhlaXIgY2hhci9zdHJpbmcgZXF1aXZhbGVudCcsIGZ1bmN0aW9uICgpIHtcbiAgdmFyIGFzdCA9IHByZXByb2Nlc3MoXCI8ZGl2IHRpdGxlPVxcXCImcXVvdDtGb28gJmFtcDsgQmFyJnF1b3Q7XFxcIj5sb2wgJmx0OyAmIzYwOyYjeDNjOyAmI3gzQzsgJkxUOyAmTm90R3JlYXRlckZ1bGxFcXVhbDsgJkJvcmtzbm9ybGF4OzwvZGl2PlwiKTtcbiAgdmFyIGRpdk5vZGUgPSBmcmFnbWVudEZvcihhc3QpLmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWwoZGl2Tm9kZS5nZXRBdHRyaWJ1dGUoJ3RpdGxlJyksICdcIkZvbyAmIEJhclwiJyk7XG4gIGVxdWFsKGdldFRleHRDb250ZW50KGRpdk5vZGUpLCBcImxvbCA8IDw8IDwgPCDiiafMuCAmQm9ya3Nub3JsYXg7XCIpO1xufSk7XG4iXX0=
define('htmlbars-compiler-tests/fragment-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/fragment-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/fragment-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2ZyYWdtZW50LXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFDakQsT0FBSyxDQUFDLElBQUksQ0FBQyw2REFBNkQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN6RixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw4REFBOEQsQ0FBQyxDQUFDO0dBQ2pGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9mcmFnbWVudC10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2ZyYWdtZW50LXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2ZyYWdtZW50LXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-compiler-tests/hooks-test", ["exports", "../htmlbars-compiler/compiler", "../htmlbars-runtime/hooks", "../htmlbars-util/object-utils", "../dom-helper", "../htmlbars-test-helpers"], function (exports, _htmlbarsCompilerCompiler, _htmlbarsRuntimeHooks, _htmlbarsUtilObjectUtils, _domHelper, _htmlbarsTestHelpers) {

  var hooks, helpers, partials, env;

  function registerHelper(name, callback) {
    helpers[name] = callback;
  }

  function commonSetup() {
    hooks = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default);
    hooks.keywords = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default.keywords);
    helpers = {};
    partials = {};

    env = {
      dom: new _domHelper.default(),
      hooks: hooks,
      helpers: helpers,
      partials: partials,
      useFragmentCache: true
    };
  }

  QUnit.module("HTML-based compiler (dirtying)", {
    beforeEach: commonSetup
  });

  test("the invokeHelper hook gets invoked to call helpers", function () {
    hooks.getRoot = function (scope, key) {
      return [{ value: scope.self[key] }];
    };

    var invoked = false;
    hooks.invokeHelper = function (morph, env, scope, visitor, params, hash, helper, templates, context) {
      invoked = true;
      deepEqual(params, [{ value: "hello world" }]);
      ok(scope.self, "the scope was passed");
      ok(morph.state, "the morph was passed");

      return { value: helper.call(context, [params[0].value], hash, templates) };
    };

    registerHelper('print', function (params) {
      return params.join('');
    });

    var object = { val: 'hello world' };
    var template = _htmlbarsCompilerCompiler.compile('<div>{{print val}}</div>');
    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div>hello world</div>');

    ok(invoked, "The invokeHelper hook was invoked");
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2hvb2tzLXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFNQSxNQUFJLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQzs7QUFFbEMsV0FBUyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtBQUN0QyxXQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDO0dBQzFCOztBQUVELFdBQVMsV0FBVyxHQUFHO0FBQ3JCLFNBQUssR0FBRyx5QkFYRCxLQUFLLENBV0UsRUFBRSxnQ0FBZSxDQUFDO0FBQ2hDLFNBQUssQ0FBQyxRQUFRLEdBQUcseUJBWlYsS0FBSyxDQVlXLEVBQUUsRUFBRSw4QkFBYSxRQUFRLENBQUMsQ0FBQztBQUNsRCxXQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2IsWUFBUSxHQUFHLEVBQUUsQ0FBQzs7QUFFZCxPQUFHLEdBQUc7QUFDSixTQUFHLEVBQUUsd0JBQWU7QUFDcEIsV0FBSyxFQUFFLEtBQUs7QUFDWixhQUFPLEVBQUUsT0FBTztBQUNoQixjQUFRLEVBQUUsUUFBUTtBQUNsQixzQkFBZ0IsRUFBRSxJQUFJO0tBQ3ZCLENBQUM7R0FDSDs7QUFFRCxPQUFLLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxFQUFFO0FBQzdDLGNBQVUsRUFBRSxXQUFXO0dBQ3hCLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsb0RBQW9ELEVBQUUsWUFBVztBQUNwRSxTQUFLLENBQUMsT0FBTyxHQUFHLFVBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtBQUNuQyxhQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDckMsQ0FBQzs7QUFFRixRQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsU0FBSyxDQUFDLFlBQVksR0FBRyxVQUFTLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO0FBQ2xHLGFBQU8sR0FBRyxJQUFJLENBQUM7QUFDZixlQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzlDLFFBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUM7QUFDdkMsUUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsc0JBQXNCLENBQUMsQ0FBQzs7QUFFeEMsYUFBTyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztLQUM1RSxDQUFDOztBQUVGLGtCQUFjLENBQUMsT0FBTyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3ZDLGFBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN4QixDQUFDLENBQUM7O0FBRUgsUUFBSSxNQUFNLEdBQUcsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLENBQUM7QUFDcEMsUUFBSSxRQUFRLEdBQUcsMEJBbkRSLE9BQU8sQ0FtRFMsMEJBQTBCLENBQUMsQ0FBQztBQUNuRCxRQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFMUMseUJBbERPLFdBQVcsQ0FrRE4sTUFBTSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDOztBQUV2RCxNQUFFLENBQUMsT0FBTyxFQUFFLG1DQUFtQyxDQUFDLENBQUM7R0FDbEQsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2hvb2tzLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjb21waWxlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLWNvbXBpbGVyL2NvbXBpbGVyXCI7XG5pbXBvcnQgZGVmYXVsdEhvb2tzIGZyb20gXCIuLi9odG1sYmFycy1ydW50aW1lL2hvb2tzXCI7XG5pbXBvcnQgeyBtZXJnZSB9IGZyb20gXCIuLi9odG1sYmFycy11dGlsL29iamVjdC11dGlsc1wiO1xuaW1wb3J0IERPTUhlbHBlciBmcm9tIFwiLi4vZG9tLWhlbHBlclwiO1xuaW1wb3J0IHsgZXF1YWxUb2tlbnMgfSBmcm9tIFwiLi4vaHRtbGJhcnMtdGVzdC1oZWxwZXJzXCI7XG5cbnZhciBob29rcywgaGVscGVycywgcGFydGlhbHMsIGVudjtcblxuZnVuY3Rpb24gcmVnaXN0ZXJIZWxwZXIobmFtZSwgY2FsbGJhY2spIHtcbiAgaGVscGVyc1tuYW1lXSA9IGNhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBjb21tb25TZXR1cCgpIHtcbiAgaG9va3MgPSBtZXJnZSh7fSwgZGVmYXVsdEhvb2tzKTtcbiAgaG9va3Mua2V5d29yZHMgPSBtZXJnZSh7fSwgZGVmYXVsdEhvb2tzLmtleXdvcmRzKTtcbiAgaGVscGVycyA9IHt9O1xuICBwYXJ0aWFscyA9IHt9O1xuXG4gIGVudiA9IHtcbiAgICBkb206IG5ldyBET01IZWxwZXIoKSxcbiAgICBob29rczogaG9va3MsXG4gICAgaGVscGVyczogaGVscGVycyxcbiAgICBwYXJ0aWFsczogcGFydGlhbHMsXG4gICAgdXNlRnJhZ21lbnRDYWNoZTogdHJ1ZVxuICB9O1xufVxuXG5RVW5pdC5tb2R1bGUoXCJIVE1MLWJhc2VkIGNvbXBpbGVyIChkaXJ0eWluZylcIiwge1xuICBiZWZvcmVFYWNoOiBjb21tb25TZXR1cFxufSk7XG5cbnRlc3QoXCJ0aGUgaW52b2tlSGVscGVyIGhvb2sgZ2V0cyBpbnZva2VkIHRvIGNhbGwgaGVscGVyc1wiLCBmdW5jdGlvbigpIHtcbiAgaG9va3MuZ2V0Um9vdCA9IGZ1bmN0aW9uKHNjb3BlLCBrZXkpIHtcbiAgICByZXR1cm4gW3sgdmFsdWU6IHNjb3BlLnNlbGZba2V5XSB9XTtcbiAgfTtcblxuICB2YXIgaW52b2tlZCA9IGZhbHNlO1xuICBob29rcy5pbnZva2VIZWxwZXIgPSBmdW5jdGlvbihtb3JwaCwgZW52LCBzY29wZSwgdmlzaXRvciwgcGFyYW1zLCBoYXNoLCBoZWxwZXIsIHRlbXBsYXRlcywgY29udGV4dCkge1xuICAgIGludm9rZWQgPSB0cnVlO1xuICAgIGRlZXBFcXVhbChwYXJhbXMsIFt7IHZhbHVlOiBcImhlbGxvIHdvcmxkXCIgfV0pO1xuICAgIG9rKHNjb3BlLnNlbGYsIFwidGhlIHNjb3BlIHdhcyBwYXNzZWRcIik7XG4gICAgb2sobW9ycGguc3RhdGUsIFwidGhlIG1vcnBoIHdhcyBwYXNzZWRcIik7XG5cbiAgICByZXR1cm4geyB2YWx1ZTogaGVscGVyLmNhbGwoY29udGV4dCwgW3BhcmFtc1swXS52YWx1ZV0sIGhhc2gsIHRlbXBsYXRlcykgfTtcbiAgfTtcblxuICByZWdpc3RlckhlbHBlcigncHJpbnQnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICByZXR1cm4gcGFyYW1zLmpvaW4oJycpO1xuICB9KTtcblxuICB2YXIgb2JqZWN0ID0geyB2YWw6ICdoZWxsbyB3b3JsZCcgfTtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPGRpdj57e3ByaW50IHZhbH19PC9kaXY+Jyk7XG4gIHZhciByZXN1bHQgPSB0ZW1wbGF0ZS5yZW5kZXIob2JqZWN0LCBlbnYpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+aGVsbG8gd29ybGQ8L2Rpdj4nKTtcblxuICBvayhpbnZva2VkLCBcIlRoZSBpbnZva2VIZWxwZXIgaG9vayB3YXMgaW52b2tlZFwiKTtcbn0pO1xuIl19
define('htmlbars-compiler-tests/hooks-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/hooks-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/hooks-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2hvb2tzLXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFDakQsT0FBSyxDQUFDLElBQUksQ0FBQywwREFBMEQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN0RixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSwyREFBMkQsQ0FBQyxDQUFDO0dBQzlFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9ob29rcy10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2hvb2tzLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2hvb2tzLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-compiler-tests/html-compiler-test", ["exports", "../htmlbars-compiler/compiler", "../htmlbars-util/array-utils", "../htmlbars-runtime/hooks", "../htmlbars-util/object-utils", "../dom-helper", "../htmlbars-test-helpers"], function (exports, _htmlbarsCompilerCompiler, _htmlbarsUtilArrayUtils, _htmlbarsRuntimeHooks, _htmlbarsUtilObjectUtils, _domHelper, _htmlbarsTestHelpers) {

  var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
      svgNamespace = "http://www.w3.org/2000/svg";

  var hooks, helpers, partials, env;

  function registerHelper(name, callback) {
    helpers[name] = callback;
  }

  function registerPartial(name, html) {
    partials[name] = _htmlbarsCompilerCompiler.compile(html);
  }

  function compilesTo(html, expected, context) {
    var template = _htmlbarsCompilerCompiler.compile(html);
    var fragment = template.render(context, env, { contextualElement: document.body }).fragment;
    _htmlbarsTestHelpers.equalTokens(fragment, expected === undefined ? html : expected);
    return fragment;
  }

  function commonSetup() {
    hooks = _htmlbarsUtilObjectUtils.merge({}, _htmlbarsRuntimeHooks.default);
    helpers = {};
    partials = {};

    env = {
      dom: new _domHelper.default(),
      hooks: hooks,
      helpers: helpers,
      partials: partials,
      useFragmentCache: true
    };
  }

  QUnit.module("HTML-based compiler (output)", {
    beforeEach: commonSetup
  });

  test("Simple content produces a document fragment", function () {
    var template = _htmlbarsCompilerCompiler.compile("content");
    var fragment = template.render({}, env).fragment;

    _htmlbarsTestHelpers.equalTokens(fragment, "content");
  });

  test("Simple elements are created", function () {
    var template = _htmlbarsCompilerCompiler.compile("<h1>hello!</h1><div>content</div>");
    var fragment = template.render({}, env).fragment;

    _htmlbarsTestHelpers.equalTokens(fragment, "<h1>hello!</h1><div>content</div>");
  });

  test("Simple elements can be re-rendered", function () {
    var template = _htmlbarsCompilerCompiler.compile("<h1>hello!</h1><div>content</div>");
    var result = template.render({}, env);
    var fragment = result.fragment;

    var oldFirstChild = fragment.firstChild;

    result.revalidate();

    strictEqual(fragment.firstChild, oldFirstChild);
    _htmlbarsTestHelpers.equalTokens(fragment, "<h1>hello!</h1><div>content</div>");
  });

  test("Simple elements can have attributes", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div class='foo' id='bar'>content</div>");
    var fragment = template.render({}, env).fragment;

    _htmlbarsTestHelpers.equalTokens(fragment, '<div class="foo" id="bar">content</div>');
  });

  test("Simple elements can have an empty attribute", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div class=''>content</div>");
    var fragment = template.render({}, env).fragment;

    _htmlbarsTestHelpers.equalTokens(fragment, '<div class="">content</div>');
  });

  test("presence of `disabled` attribute without value marks as disabled", function () {
    var template = _htmlbarsCompilerCompiler.compile('<input disabled>');
    var inputNode = template.render({}, env).fragment.firstChild;

    ok(inputNode.disabled, 'disabled without value set as property is true');
  });

  test("Null quoted attribute value calls toString on the value", function () {
    var template = _htmlbarsCompilerCompiler.compile('<input disabled="{{isDisabled}}">');
    var inputNode = template.render({ isDisabled: null }, env).fragment.firstChild;

    ok(inputNode.disabled, 'string of "null" set as property is true');
  });

  test("Null unquoted attribute value removes that attribute", function () {
    var template = _htmlbarsCompilerCompiler.compile('<input disabled={{isDisabled}}>');
    var inputNode = template.render({ isDisabled: null }, env).fragment.firstChild;

    _htmlbarsTestHelpers.equalTokens(inputNode, '<input>');
  });

  test("unquoted attribute string is just that", function () {
    var template = _htmlbarsCompilerCompiler.compile('<input value=funstuff>');
    var inputNode = template.render({}, env).fragment.firstChild;

    equal(inputNode.tagName, 'INPUT', 'input tag');
    equal(inputNode.value, 'funstuff', 'value is set as property');
  });

  test("unquoted attribute expression is string", function () {
    var template = _htmlbarsCompilerCompiler.compile('<input value={{funstuff}}>');
    var inputNode = template.render({ funstuff: "oh my" }, env).fragment.firstChild;

    equal(inputNode.tagName, 'INPUT', 'input tag');
    equal(inputNode.value, 'oh my', 'string is set to property');
  });

  test("unquoted attribute expression works when followed by another attribute", function () {
    var template = _htmlbarsCompilerCompiler.compile('<div foo={{funstuff}} name="Alice"></div>');
    var divNode = template.render({ funstuff: "oh my" }, env).fragment.firstChild;

    _htmlbarsTestHelpers.equalTokens(divNode, '<div name="Alice" foo="oh my"></div>');
  });

  test("Unquoted attribute value with multiple nodes throws an exception", function () {
    expect(4);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<img class=foo{{bar}}>');
    }, expectedError(1));
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<img class={{foo}}{{bar}}>');
    }, expectedError(1));
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<img \nclass={{foo}}bar>');
    }, expectedError(2));
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<div \nclass\n=\n{{foo}}&amp;bar ></div>');
    }, expectedError(4));

    function expectedError(line) {
      return new Error("An unquoted attribute value must be a string or a mustache, " + "preceeded by whitespace or a '=' character, and " + ("followed by whitespace or a '>' character (on line " + line + ")"));
    }
  });

  test("Simple elements can have arbitrary attributes", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div data-some-data='foo'>content</div>");
    var divNode = template.render({}, env).fragment.firstChild;
    _htmlbarsTestHelpers.equalTokens(divNode, '<div data-some-data="foo">content</div>');
  });

  test("checked attribute and checked property are present after clone and hydrate", function () {
    var template = _htmlbarsCompilerCompiler.compile("<input checked=\"checked\">");
    var inputNode = template.render({}, env).fragment.firstChild;
    equal(inputNode.tagName, 'INPUT', 'input tag');
    equal(inputNode.checked, true, 'input tag is checked');
  });

  function shouldBeVoid(tagName) {
    var html = "<" + tagName + " data-foo='bar'><p>hello</p>";
    var template = _htmlbarsCompilerCompiler.compile(html);
    var fragment = template.render({}, env).fragment;

    var div = document.createElement("div");
    div.appendChild(fragment.cloneNode(true));

    var tag = '<' + tagName + ' data-foo="bar">';
    var closing = '</' + tagName + '>';
    var extra = "<p>hello</p>";
    html = _htmlbarsTestHelpers.normalizeInnerHTML(div.innerHTML);

    QUnit.push(html === tag + extra || html === tag + closing + extra, html, tag + closing + extra, tagName + " should be a void element");
  }

  test("Void elements are self-closing", function () {
    var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

    _htmlbarsUtilArrayUtils.forEach(voidElements.split(" "), function (tagName) {
      shouldBeVoid(tagName);
    });
  });

  test("The compiler can handle nesting", function () {
    var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content';
    var template = _htmlbarsCompilerCompiler.compile(html);
    var fragment = template.render({}, env).fragment;

    _htmlbarsTestHelpers.equalTokens(fragment, html);
  });

  test("The compiler can handle quotes", function () {
    compilesTo('<div>"This is a title," we\'re on a boat</div>');
  });

  test("The compiler can handle backslashes", function () {
    compilesTo('<div>This is a backslash: \\</div>');
  });

  test("The compiler can handle newlines", function () {
    compilesTo("<div>common\n\nbro</div>");
  });

  test("The compiler can handle comments", function () {
    compilesTo("<div>{{! Better not break! }}content</div>", '<div>content</div>', {});
  });

  test("The compiler can handle HTML comments", function () {
    compilesTo('<div><!-- Just passing through --></div>');
  });

  test("The compiler can handle HTML comments with mustaches in them", function () {
    compilesTo('<div><!-- {{foo}} --></div>', '<div><!-- {{foo}} --></div>', { foo: 'bar' });
  });

  test("The compiler can handle HTML comments with complex mustaches in them", function () {
    compilesTo('<div><!-- {{foo bar baz}} --></div>', '<div><!-- {{foo bar baz}} --></div>', { foo: 'bar' });
  });

  test("The compiler can handle HTML comments with multi-line mustaches in them", function () {
    compilesTo('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
  });

  test('The compiler can handle comments with no parent element', function () {
    compilesTo('<!-- {{foo}} -->');
  });

  // TODO: Revisit partial syntax.
  // test("The compiler can handle partials in handlebars partial syntax", function() {
  //   registerPartial('partial_name', "<b>Partial Works!</b>");
  //   compilesTo('<div>{{>partial_name}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
  // });

  test("The compiler can handle partials in helper partial syntax", function () {
    registerPartial('partial_name', "<b>Partial Works!</b>");
    compilesTo('<div>{{partial "partial_name"}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
  });

  test("The compiler can handle simple handlebars", function () {
    compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
  });

  test("The compiler can handle escaping HTML", function () {
    compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
  });

  test("The compiler can handle unescaped HTML", function () {
    compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
  });

  test("The compiler can handle top-level unescaped HTML", function () {
    compilesTo('{{{html}}}', '<strong>hello</strong>', { html: '<strong>hello</strong>' });
  });

  test("The compiler can handle top-level unescaped tr", function () {
    var template = _htmlbarsCompilerCompiler.compile('{{{html}}}');
    var context = { html: '<tr><td>Yo</td></tr>' };
    var fragment = template.render(context, env, { contextualElement: document.createElement('table') }).fragment;

    equal(fragment.firstChild.nextSibling.tagName, 'TR', "root tr is present");
  });

  test("The compiler can handle top-level unescaped td inside tr contextualElement", function () {
    var template = _htmlbarsCompilerCompiler.compile('{{{html}}}');
    var context = { html: '<td>Yo</td>' };
    var fragment = template.render(context, env, { contextualElement: document.createElement('tr') }).fragment;

    equal(fragment.firstChild.nextSibling.tagName, 'TD', "root td is returned");
  });

  test("The compiler can handle unescaped tr in top of content", function () {
    registerHelper('test', function () {
      return this.yield();
    });

    var template = _htmlbarsCompilerCompiler.compile('{{#test}}{{{html}}}{{/test}}');
    var context = { html: '<tr><td>Yo</td></tr>' };
    var fragment = template.render(context, env, { contextualElement: document.createElement('table') }).fragment;

    equal(fragment.firstChild.nextSibling.nextSibling.tagName, 'TR', "root tr is present");
  });

  test("The compiler can handle unescaped tr inside fragment table", function () {
    registerHelper('test', function () {
      return this.yield();
    });

    var template = _htmlbarsCompilerCompiler.compile('<table>{{#test}}{{{html}}}{{/test}}</table>');
    var context = { html: '<tr><td>Yo</td></tr>' };
    var fragment = template.render(context, env, { contextualElement: document.createElement('div') }).fragment;
    var tableNode = fragment.firstChild;

    equal(tableNode.firstChild.nextSibling.tagName, 'TR', "root tr is present");
  });

  test("The compiler can handle simple helpers", function () {
    registerHelper('testing', function (params) {
      return params[0];
    });

    compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
  });

  test("Helpers propagate the owner render node", function () {
    registerHelper('id', function () {
      return this.yield();
    });

    var template = _htmlbarsCompilerCompiler.compile('<div>{{#id}}<p>{{#id}}<span>{{#id}}{{name}}{{/id}}</span>{{/id}}</p>{{/id}}</div>');
    var context = { name: "Tom Dale" };
    var result = template.render(context, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<div><p><span>Tom Dale</span></p></div>');

    var root = result.root;
    strictEqual(root, root.childNodes[0].ownerNode);
    strictEqual(root, root.childNodes[0].childNodes[0].ownerNode);
    strictEqual(root, root.childNodes[0].childNodes[0].childNodes[0].ownerNode);
  });

  test("The compiler can handle sexpr helpers", function () {
    registerHelper('testing', function (params) {
      return params[0] + "!";
    });

    compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
  });

  test("The compiler can handle multiple invocations of sexprs", function () {
    registerHelper('testing', function (params) {
      return "" + params[0] + params[1];
    });

    compilesTo('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', '<div>helloFOOBARlolBAZ</div>', { foo: "FOO", bar: "BAR", baz: "BAZ" });
  });

  test("The compiler passes along the hash arguments", function () {
    registerHelper('testing', function (params, hash) {
      return hash.first + '-' + hash.second;
    });

    compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
  });

  test("second render respects whitespace", function () {
    var template = _htmlbarsCompilerCompiler.compile('Hello {{ foo }} ');
    template.render({}, env, { contextualElement: document.createElement('div') });
    var fragment = template.render({}, env, { contextualElement: document.createElement('div') }).fragment;
    equal(fragment.childNodes.length, 3, 'fragment contains 3 text nodes');
    equal(_htmlbarsTestHelpers.getTextContent(fragment.childNodes[0]), 'Hello ', 'first text node ends with one space character');
    equal(_htmlbarsTestHelpers.getTextContent(fragment.childNodes[2]), ' ', 'last text node contains one space character');
  });

  test("Morphs are escaped correctly", function () {
    registerHelper('testing-unescaped', function (params) {
      return params[0];
    });

    registerHelper('testing-escaped', function (params) {
      if (this.yield) {
        return this.yield();
      }

      return params[0];
    });

    compilesTo('<div>{{{testing-unescaped "<span>hi</span>"}}}</div>', '<div><span>hi</span></div>');
    compilesTo('<div>{{testing-escaped "<hi>"}}</div>', '<div>&lt;hi&gt;</div>');
    compilesTo('<div>{{#testing-escaped}}<em></em>{{/testing-escaped}}</div>', '<div><em></em></div>');
    compilesTo('<div><testing-escaped><em></em></testing-escaped></div>', '<div><em></em></div>');
  });

  test("Attributes can use computed values", function () {
    compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
  });

  test("Mountain range of nesting", function () {
    var context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
    compilesTo('{{foo}}<span></span>', 'FOO<span></span>', context);
    compilesTo('<span></span>{{foo}}', '<span></span>FOO', context);
    compilesTo('<span>{{foo}}</span>{{foo}}', '<span>FOO</span>FOO', context);
    compilesTo('{{foo}}<span>{{foo}}</span>{{foo}}', 'FOO<span>FOO</span>FOO', context);
    compilesTo('{{foo}}<span></span>{{foo}}', 'FOO<span></span>FOO', context);
    compilesTo('{{foo}}<span></span>{{bar}}<span><span><span>{{baz}}</span></span></span>', 'FOO<span></span>BAR<span><span><span>BAZ</span></span></span>', context);
    compilesTo('{{foo}}<span></span>{{bar}}<span>{{argh}}<span><span>{{baz}}</span></span></span>', 'FOO<span></span>BAR<span>ARGH<span><span>BAZ</span></span></span>', context);
    compilesTo('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}', 'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH', context);
  });

  // test("Attributes can use computed paths", function() {
  //   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
  // });

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

  test("Attributes can be populated with helpers that generate a string", function () {
    registerHelper('testing', function (params) {
      return params[0];
    });

    compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
  });
  /*
  test("A helper can return a stream for the attribute", function() {
    registerHelper('testing', function(path, options) {
      return streamValue(this[path]);
    });
  
    compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
  });
  */
  test("Attribute helpers take a hash", function () {
    registerHelper('testing', function (params, hash) {
      return hash.path;
    });

    compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
  });
  /*
  test("Attribute helpers can use the hash for data binding", function() {
    var callback;
  
    registerHelper('testing', function(path, hash, options) {
      return boundValue(function(c) {
        callback = c;
        return this[path] ? hash.truthy : hash.falsy;
      }, this);
    });
  
    var object = { on: true };
    var fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);
  
    object.on = false;
    callback();
    equalTokens(fragment, '<div class="nope">hi</div>');
  });
  */
  test("Attributes containing multiple helpers are treated like a block", function () {
    registerHelper('testing', function (params) {
      return params[0];
    });

    compilesTo('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', '<a href="http://foo.com/bar/baz">linky</a>', { foo: 'foo.com', bar: 'bar' });
  });

  test("Attributes containing a helper are treated like a block", function () {
    expect(2);

    registerHelper('testing', function (params) {
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
  
        if (options.paramTypes[0] === 'id') {
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
  test("A simple block helper can return the default document fragment", function () {
    registerHelper('testing', function () {
      return this.yield();
    });

    compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
  });

  // TODO: NEXT
  test("A simple block helper can return text", function () {
    registerHelper('testing', function () {
      return this.yield();
    });

    compilesTo('{{#testing}}test{{else}}not shown{{/testing}}', 'test');
  });

  test("A block helper can have an else block", function () {
    registerHelper('testing', function (params, hash, options) {
      return options.inverse.yield();
    });

    compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
  });

  test("A block helper can pass a context to be used in the child", function () {
    registerHelper('testing', function (params, hash, options) {
      var context = { title: 'Rails is omakase' };
      return options.template.render(context);
    });

    compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
  });

  test("Block helpers receive hash arguments", function () {
    registerHelper('testing', function (params, hash) {
      if (hash.truth) {
        return this.yield();
      }
    });

    compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p><!---->');
  });

  test("Node helpers can modify the node", function () {
    registerHelper('testing', function (params, hash, options) {
      options.element.setAttribute('zomg', 'zomg');
    });

    compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
  });

  test("Node helpers can modify the node after one node appended by top-level helper", function () {
    registerHelper('top-helper', function () {
      return document.createElement('span');
    });
    registerHelper('attr-helper', function (params, hash, options) {
      options.element.setAttribute('zomg', 'zomg');
    });

    compilesTo('<div {{attr-helper}}>Node helpers</div>{{top-helper}}', '<div zomg="zomg">Node helpers</div><span></span>');
  });

  test("Node helpers can modify the node after one node prepended by top-level helper", function () {
    registerHelper('top-helper', function () {
      return document.createElement('span');
    });
    registerHelper('attr-helper', function (params, hash, options) {
      options.element.setAttribute('zomg', 'zomg');
    });

    compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><div zomg="zomg">Node helpers</div>');
  });

  test("Node helpers can modify the node after many nodes returned from top-level helper", function () {
    registerHelper('top-helper', function () {
      var frag = document.createDocumentFragment();
      frag.appendChild(document.createElement('span'));
      frag.appendChild(document.createElement('span'));
      return frag;
    });
    registerHelper('attr-helper', function (params, hash, options) {
      options.element.setAttribute('zomg', 'zomg');
    });

    compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><span></span><div zomg="zomg">Node helpers</div>');
  });

  test("Node helpers can be used for attribute bindings", function () {
    registerHelper('testing', function (params, hash, options) {
      var value = hash.href,
          element = options.element;

      element.setAttribute('href', value);
    });

    var object = { url: 'linky.html' };
    var template = _htmlbarsCompilerCompiler.compile('<a {{testing href=url}}>linky</a>');
    var result = template.render(object, env);

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<a href="linky.html">linky</a>');
    object.url = 'zippy.html';

    result.dirty();
    result.revalidate();

    _htmlbarsTestHelpers.equalTokens(result.fragment, '<a href="zippy.html">linky</a>');
  });

  test('Components - Called as helpers', function () {
    registerHelper('x-append', function (params, hash) {
      QUnit.deepEqual(hash, { text: "de" });
      this.yield();
    });
    var object = { bar: 'e', baz: 'c' };
    compilesTo('a<x-append text="d{{bar}}">b{{baz}}</x-append>f', 'abcf', object);
  });

  test('Components - Unknown helpers fall back to elements', function () {
    var object = { size: 'med', foo: 'b' };
    compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>', '<x-bar class="btn-med">abc</x-bar>', object);
  });

  test('Components - Text-only attributes work', function () {
    var object = { foo: 'qux' };
    compilesTo('<x-bar id="test">{{foo}}</x-bar>', '<x-bar id="test">qux</x-bar>', object);
  });

  test('Components - Empty components work', function () {
    compilesTo('<x-bar></x-bar>', '<x-bar></x-bar>', {});
  });

  test('Components - Text-only dashed attributes work', function () {
    var object = { foo: 'qux' };
    compilesTo('<x-bar aria-label="foo" id="test">{{foo}}</x-bar>', '<x-bar aria-label="foo" id="test">qux</x-bar>', object);
  });

  test('Repaired text nodes are ensured in the right place', function () {
    var object = { a: "A", b: "B", c: "C", d: "D" };
    compilesTo('{{a}} {{b}}', 'A B', object);
    compilesTo('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', '<div>ABCwatD</div>', object);
    compilesTo('{{a}}{{b}}<img><img><img><img>', 'AB<img><img><img><img>', object);
  });

  test("Simple elements can have dashed attributes", function () {
    var template = _htmlbarsCompilerCompiler.compile("<div aria-label='foo'>content</div>");
    var fragment = template.render({}, env).fragment;

    _htmlbarsTestHelpers.equalTokens(fragment, '<div aria-label="foo">content</div>');
  });

  QUnit.skip("Block params", function () {
    registerHelper('a', function () {
      this.yieldIn(_htmlbarsCompilerCompiler.compile("A({{yield 'W' 'X1'}})"));
    });
    registerHelper('b', function () {
      this.yieldIn(_htmlbarsCompilerCompiler.compile("B({{yield 'X2' 'Y'}})"));
    });
    registerHelper('c', function () {
      this.yieldIn(_htmlbarsCompilerCompiler.compile("C({{yield 'Z'}})"));
    });
    var t = '{{#a as |w x|}}{{w}},{{x}} {{#b as |x y|}}{{x}},{{y}}{{/b}} {{w}},{{x}} {{#c as |z|}}{{x}},{{z}}{{/c}}{{/a}}';
    compilesTo(t, 'A(W,X1 B(X2,Y) W,X1 C(X1,Z))', {});
  });

  test("Block params - Helper should know how many block params it was called with", function () {
    expect(4);

    registerHelper('count-block-params', function (params, hash, options) {
      equal(options.template.arity, hash.count, 'Helpers should receive the correct number of block params in options.template.blockParams.');
    });

    _htmlbarsCompilerCompiler.compile('{{#count-block-params count=0}}{{/count-block-params}}').render({}, env, { contextualElement: document.body });
    _htmlbarsCompilerCompiler.compile('{{#count-block-params count=1 as |x|}}{{/count-block-params}}').render({}, env, { contextualElement: document.body });
    _htmlbarsCompilerCompiler.compile('{{#count-block-params count=2 as |x y|}}{{/count-block-params}}').render({}, env, { contextualElement: document.body });
    _htmlbarsCompilerCompiler.compile('{{#count-block-params count=3 as |x y z|}}{{/count-block-params}}').render({}, env, { contextualElement: document.body });
  });

  QUnit.skip('Block params in HTML syntax', function () {
    var layout = _htmlbarsCompilerCompiler.compile("BAR({{yield 'Xerxes' 'York' 'Zed'}})");

    registerHelper('x-bar', function () {
      this.yieldIn(layout);
    });
    compilesTo('<x-bar as |x y zee|>{{zee}},{{y}},{{x}}</x-bar>', 'BAR(Zed,York,Xerxes)', {});
  });

  test('Block params in HTML syntax - Throws exception if given zero parameters', function () {
    expect(2);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as ||>foo</x-bar>');
    }, /Cannot use zero block parameters: 'as \|\|'/);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as | |>foo</x-bar>');
    }, /Cannot use zero block parameters: 'as \| \|'/);
  });

  test('Block params in HTML syntax - Works with a single parameter', function () {
    registerHelper('x-bar', function () {
      return this.yield(['Xerxes']);
    });
    compilesTo('<x-bar as |x|>{{x}}</x-bar>', 'Xerxes', {});
  });

  test('Block params in HTML syntax - Works with other attributes', function () {
    registerHelper('x-bar', function (params, hash) {
      deepEqual(hash, { firstName: 'Alice', lastName: 'Smith' });
    });
    _htmlbarsCompilerCompiler.compile('<x-bar firstName="Alice" lastName="Smith" as |x y|></x-bar>').render({}, env, { contextualElement: document.body });
  });

  test('Block params in HTML syntax - Ignores whitespace', function () {
    expect(3);

    registerHelper('x-bar', function () {
      return this.yield(['Xerxes', 'York']);
    });
    compilesTo('<x-bar as |x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
    compilesTo('<x-bar as | x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
    compilesTo('<x-bar as | x y |>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
  });

  test('Block params in HTML syntax - Helper should know how many block params it was called with', function () {
    expect(4);

    registerHelper('count-block-params', function (params, hash, options) {
      equal(options.template.arity, parseInt(hash.count, 10), 'Helpers should receive the correct number of block params in options.template.blockParams.');
    });

    _htmlbarsCompilerCompiler.compile('<count-block-params count="0"></count-block-params>').render({ count: 0 }, env, { contextualElement: document.body });
    _htmlbarsCompilerCompiler.compile('<count-block-params count="1" as |x|></count-block-params>').render({ count: 1 }, env, { contextualElement: document.body });
    _htmlbarsCompilerCompiler.compile('<count-block-params count="2" as |x y|></count-block-params>').render({ count: 2 }, env, { contextualElement: document.body });
    _htmlbarsCompilerCompiler.compile('<count-block-params count="3" as |x y z|></count-block-params>').render({ count: 3 }, env, { contextualElement: document.body });
  });

  test("Block params in HTML syntax - Throws an error on invalid block params syntax", function () {
    expect(3);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as |x y>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as |x y'/);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as |x| y>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as \|x\| y'/);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as |x| y|>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as \|x\| y\|'/);
  });

  test("Block params in HTML syntax - Throws an error on invalid identifiers for params", function () {
    expect(3);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as |x foo.bar|></x-bar>');
    }, /Invalid identifier for block parameters: 'foo\.bar' in 'as \|x foo\.bar|'/);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as |x "foo"|></x-bar>');
    }, /Invalid identifier for block parameters: '"foo"' in 'as \|x "foo"|'/);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<x-bar as |foo[bar]|></x-bar>');
    }, /Invalid identifier for block parameters: 'foo\[bar\]' in 'as \|foo\[bar\]\|'/);
  });

  QUnit.module("HTML-based compiler (invalid HTML errors)", {
    beforeEach: commonSetup
  });

  test("A helpful error message is provided for unclosed elements", function () {
    expect(2);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n');
    }, /Unclosed element `div` \(on line 2\)\./);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('\n<div class="my-div">\n<span>\n');
    }, /Unclosed element `span` \(on line 3\)\./);
  });

  test("A helpful error message is provided for unmatched end tags", function () {
    expect(2);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("</p>");
    }, /Closing tag `p` \(on line 1\) without an open tag\./);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<em>{{ foo }}</em> \n {{ bar }}\n</div>");
    }, /Closing tag `div` \(on line 3\) without an open tag\./);
  });

  test("A helpful error message is provided for end tags for void elements", function () {
    expect(3);

    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<input></input>");
    }, /Invalid end tag `input` \(on line 1\) \(void elements cannot have end tags\)./);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n  <input></input>\n</div>");
    }, /Invalid end tag `input` \(on line 2\) \(void elements cannot have end tags\)./);
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("\n\n</br>");
    }, /Invalid end tag `br` \(on line 3\) \(void elements cannot have end tags\)./);
  });

  test("A helpful error message is provided for end tags with attributes", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile('<div>\nSomething\n\n</div foo="bar">');
    }, /Invalid end tag: closing tag must not have attributes, in `div` \(on line 4\)\./);
  });

  test("A helpful error message is provided for mismatched start/end tags", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n<p>\nSomething\n\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  });

  test("error line numbers include comment lines", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n<p>\n{{! some comment}}\n\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  });

  test("error line numbers include mustache only lines", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n<p>\n{{someProp}}\n\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  });

  test("error line numbers include block lines", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  });

  test("error line numbers include whitespace control mustaches", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  });

  test("error line numbers include multiple mustache lines", function () {
    QUnit.throws(function () {
      _htmlbarsCompilerCompiler.compile("<div>\n<p>\n{{some-comment}}</div>{{some-comment}}");
    }, /Closing tag `div` \(on line 3\) did not match last open tag `p` \(on line 2\)\./);
  });

  if (document.createElement('div').namespaceURI) {

    QUnit.module("HTML-based compiler (output, svg)", {
      beforeEach: commonSetup
    });

    test("Simple elements can have namespaced attributes", function () {
      var template = _htmlbarsCompilerCompiler.compile("<svg xlink:title='svg-title'>content</svg>");
      var svgNode = template.render({}, env).fragment.firstChild;

      _htmlbarsTestHelpers.equalTokens(svgNode, '<svg xlink:title="svg-title">content</svg>');
      equal(svgNode.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
    });

    test("Simple elements can have bound namespaced attributes", function () {
      var template = _htmlbarsCompilerCompiler.compile("<svg xlink:title={{title}}>content</svg>");
      var svgNode = template.render({ title: 'svg-title' }, env).fragment.firstChild;

      _htmlbarsTestHelpers.equalTokens(svgNode, '<svg xlink:title="svg-title">content</svg>');
      equal(svgNode.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
    });

    test("SVG element can have capitalized attributes", function () {
      var template = _htmlbarsCompilerCompiler.compile("<svg viewBox=\"0 0 0 0\"></svg>");
      var svgNode = template.render({}, env).fragment.firstChild;
      _htmlbarsTestHelpers.equalTokens(svgNode, '<svg viewBox=\"0 0 0 0\"></svg>');
    });

    test("The compiler can handle namespaced elements", function () {
      var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
      var template = _htmlbarsCompilerCompiler.compile(html);
      var svgNode = template.render({}, env).fragment.firstChild;

      equal(svgNode.namespaceURI, svgNamespace, "creates the svg element with a namespace");
      _htmlbarsTestHelpers.equalTokens(svgNode, html);
    });

    test("The compiler sets namespaces on nested namespaced elements", function () {
      var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
      var template = _htmlbarsCompilerCompiler.compile(html);
      var svgNode = template.render({}, env).fragment.firstChild;

      equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "creates the path element with a namespace");
      _htmlbarsTestHelpers.equalTokens(svgNode, html);
    });

    test("The compiler sets a namespace on an HTML integration point", function () {
      var html = '<svg><foreignObject>Hi</foreignObject></svg>';
      var template = _htmlbarsCompilerCompiler.compile(html);
      var svgNode = template.render({}, env).fragment.firstChild;

      equal(svgNode.namespaceURI, svgNamespace, "creates the svg element with a namespace");
      equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "creates the foreignObject element with a namespace");
      _htmlbarsTestHelpers.equalTokens(svgNode, html);
    });

    test("The compiler does not set a namespace on an element inside an HTML integration point", function () {
      var html = '<svg><foreignObject><div></div></foreignObject></svg>';
      var template = _htmlbarsCompilerCompiler.compile(html);
      var svgNode = template.render({}, env).fragment.firstChild;

      equal(svgNode.childNodes[0].childNodes[0].namespaceURI, xhtmlNamespace, "creates the div inside the foreignObject without a namespace");
      _htmlbarsTestHelpers.equalTokens(svgNode, html);
    });

    test("The compiler pops back to the correct namespace", function () {
      var html = '<svg></svg><svg></svg><div></div>';
      var template = _htmlbarsCompilerCompiler.compile(html);
      var fragment = template.render({}, env).fragment;

      equal(fragment.childNodes[0].namespaceURI, svgNamespace, "creates the first svg element with a namespace");
      equal(fragment.childNodes[1].namespaceURI, svgNamespace, "creates the second svg element with a namespace");
      equal(fragment.childNodes[2].namespaceURI, xhtmlNamespace, "creates the div element without a namespace");
      _htmlbarsTestHelpers.equalTokens(fragment, html);
    });

    test("The compiler pops back to the correct namespace even if exiting last child", function () {
      var html = '<div><svg></svg></div><div></div>';
      var fragment = _htmlbarsCompilerCompiler.compile(html).render({}, env).fragment;

      equal(fragment.firstChild.namespaceURI, xhtmlNamespace, "first div's namespace is xhtmlNamespace");
      equal(fragment.firstChild.firstChild.namespaceURI, svgNamespace, "svg's namespace is svgNamespace");
      equal(fragment.lastChild.namespaceURI, xhtmlNamespace, "last div's namespace is xhtmlNamespace");
    });

    test("The compiler preserves capitalization of tags", function () {
      var html = '<svg><linearGradient id="gradient"></linearGradient></svg>';
      var template = _htmlbarsCompilerCompiler.compile(html);
      var fragment = template.render({}, env).fragment;

      _htmlbarsTestHelpers.equalTokens(fragment, html);
    });

    test("svg can live with hydration", function () {
      var template = _htmlbarsCompilerCompiler.compile('<svg></svg>{{name}}');

      var fragment = template.render({ name: 'Milly' }, env, { contextualElement: document.body }).fragment;

      equal(fragment.childNodes[0].namespaceURI, svgNamespace, "svg namespace inside a block is present");
    });

    test("top-level unsafe morph uses the correct namespace", function () {
      var template = _htmlbarsCompilerCompiler.compile('<svg></svg>{{{foo}}}');
      var fragment = template.render({ foo: '<span>FOO</span>' }, env, { contextualElement: document.body }).fragment;

      equal(_htmlbarsTestHelpers.getTextContent(fragment), 'FOO', 'element from unsafe morph is displayed');
      equal(fragment.childNodes[1].namespaceURI, xhtmlNamespace, 'element from unsafe morph has correct namespace');
    });

    test("nested unsafe morph uses the correct namespace", function () {
      var template = _htmlbarsCompilerCompiler.compile('<svg>{{{foo}}}</svg><div></div>');
      var fragment = template.render({ foo: '<path></path>' }, env, { contextualElement: document.body }).fragment;

      equal(fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace, 'element from unsafe morph has correct namespace');
    });

    test("svg can take some hydration", function () {
      var template = _htmlbarsCompilerCompiler.compile('<div><svg>{{name}}</svg></div>');

      var fragment = template.render({ name: 'Milly' }, env).fragment;
      equal(fragment.firstChild.childNodes[0].namespaceURI, svgNamespace, "svg namespace inside a block is present");
      _htmlbarsTestHelpers.equalTokens(fragment.firstChild, '<div><svg>Milly</svg></div>', "html is valid");
    });

    test("root svg can take some hydration", function () {
      var template = _htmlbarsCompilerCompiler.compile('<svg>{{name}}</svg>');
      var fragment = template.render({ name: 'Milly' }, env).fragment;
      var svgNode = fragment.firstChild;

      equal(svgNode.namespaceURI, svgNamespace, "svg namespace inside a block is present");
      _htmlbarsTestHelpers.equalTokens(svgNode, '<svg>Milly</svg>', "html is valid");
    });

    test("Block helper allows interior namespace", function () {
      var isTrue = true;

      registerHelper('testing', function (params, hash, options) {
        if (isTrue) {
          return this.yield();
        } else {
          return options.inverse.yield();
        }
      });

      var template = _htmlbarsCompilerCompiler.compile('{{#testing}}<svg></svg>{{else}}<div><svg></svg></div>{{/testing}}');

      var fragment = template.render({ isTrue: true }, env, { contextualElement: document.body }).fragment;
      equal(fragment.firstChild.nextSibling.namespaceURI, svgNamespace, "svg namespace inside a block is present");

      isTrue = false;
      fragment = template.render({ isTrue: false }, env, { contextualElement: document.body }).fragment;
      equal(fragment.firstChild.nextSibling.namespaceURI, xhtmlNamespace, "inverse block path has a normal namespace");
      equal(fragment.firstChild.nextSibling.firstChild.namespaceURI, svgNamespace, "svg namespace inside an element inside a block is present");
    });

    test("Block helper allows namespace to bleed through", function () {
      registerHelper('testing', function () {
        return this.yield();
      });

      var template = _htmlbarsCompilerCompiler.compile('<div><svg>{{#testing}}<circle />{{/testing}}</svg></div>');

      var fragment = template.render({ isTrue: true }, env).fragment;
      var svgNode = fragment.firstChild.firstChild;
      equal(svgNode.namespaceURI, svgNamespace, "svg tag has an svg namespace");
      equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "circle tag inside block inside svg has an svg namespace");
    });

    test("Block helper with root svg allows namespace to bleed through", function () {
      registerHelper('testing', function () {
        return this.yield();
      });

      var template = _htmlbarsCompilerCompiler.compile('<svg>{{#testing}}<circle />{{/testing}}</svg>');

      var fragment = template.render({ isTrue: true }, env).fragment;
      var svgNode = fragment.firstChild;
      equal(svgNode.namespaceURI, svgNamespace, "svg tag has an svg namespace");
      equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "circle tag inside block inside svg has an svg namespace");
    });

    test("Block helper with root foreignObject allows namespace to bleed through", function () {
      registerHelper('testing', function () {
        return this.yield();
      });

      var template = _htmlbarsCompilerCompiler.compile('<foreignObject>{{#testing}}<div></div>{{/testing}}</foreignObject>');

      var fragment = template.render({ isTrue: true }, env, { contextualElement: document.createElementNS(svgNamespace, 'svg') }).fragment;
      var svgNode = fragment.firstChild;
      equal(svgNode.namespaceURI, svgNamespace, "foreignObject tag has an svg namespace");
      equal(svgNode.childNodes[0].namespaceURI, xhtmlNamespace, "div inside morph and foreignObject has xhtml namespace");
    });
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWwtY29tcGlsZXItdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLE1BQUksY0FBYyxHQUFHLDhCQUE4QjtNQUMvQyxZQUFZLEdBQUssNEJBQTRCLENBQUM7O0FBRWxELE1BQUksS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDOztBQUVsQyxXQUFTLGNBQWMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO0FBQ3RDLFdBQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUM7R0FDMUI7O0FBRUQsV0FBUyxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNuQyxZQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsMEJBakJWLE9BQU8sQ0FpQlcsSUFBSSxDQUFDLENBQUM7R0FDaEM7O0FBRUQsV0FBUyxVQUFVLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFDM0MsUUFBSSxRQUFRLEdBQUcsMEJBckJSLE9BQU8sQ0FxQlMsSUFBSSxDQUFDLENBQUM7QUFDN0IsUUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzVGLHlCQWxCMkMsV0FBVyxDQWtCMUMsUUFBUSxFQUFFLFFBQVEsS0FBSyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDO0FBQ2hFLFdBQU8sUUFBUSxDQUFDO0dBQ2pCOztBQUdELFdBQVMsV0FBVyxHQUFHO0FBQ3JCLFNBQUssR0FBRyx5QkExQkQsS0FBSyxDQTBCRSxFQUFFLGdDQUFlLENBQUM7QUFDaEMsV0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNiLFlBQVEsR0FBRyxFQUFFLENBQUM7O0FBRWQsT0FBRyxHQUFHO0FBQ0osU0FBRyxFQUFFLHdCQUFlO0FBQ3BC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LENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQ2xELHdEQUF3RCxDQUFFLENBQUM7S0FDbkUsQ0FBQyxDQUFDO0dBRUYiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbC1jb21waWxlci10ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tcGlsZSB9IGZyb20gXCIuLi9odG1sYmFycy1jb21waWxlci9jb21waWxlclwiO1xuaW1wb3J0IHsgZm9yRWFjaCB9IGZyb20gXCIuLi9odG1sYmFycy11dGlsL2FycmF5LXV0aWxzXCI7XG5pbXBvcnQgZGVmYXVsdEhvb2tzIGZyb20gXCIuLi9odG1sYmFycy1ydW50aW1lL2hvb2tzXCI7XG5pbXBvcnQgeyBtZXJnZSB9IGZyb20gXCIuLi9odG1sYmFycy11dGlsL29iamVjdC11dGlsc1wiO1xuaW1wb3J0IERPTUhlbHBlciBmcm9tIFwiLi4vZG9tLWhlbHBlclwiO1xuaW1wb3J0IHsgbm9ybWFsaXplSW5uZXJIVE1MLCBnZXRUZXh0Q29udGVudCwgZXF1YWxUb2tlbnMgfSBmcm9tIFwiLi4vaHRtbGJhcnMtdGVzdC1oZWxwZXJzXCI7XG5cbnZhciB4aHRtbE5hbWVzcGFjZSA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLFxuICAgIHN2Z05hbWVzcGFjZSAgID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xuXG52YXIgaG9va3MsIGhlbHBlcnMsIHBhcnRpYWxzLCBlbnY7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVySGVscGVyKG5hbWUsIGNhbGxiYWNrKSB7XG4gIGhlbHBlcnNbbmFtZV0gPSBjYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJQYXJ0aWFsKG5hbWUsIGh0bWwpIHtcbiAgcGFydGlhbHNbbmFtZV0gPSBjb21waWxlKGh0bWwpO1xufVxuXG5mdW5jdGlvbiBjb21waWxlc1RvKGh0bWwsIGV4cGVjdGVkLCBjb250ZXh0KSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoaHRtbCk7XG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcihjb250ZXh0LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSkuZnJhZ21lbnQ7XG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCBleHBlY3RlZCA9PT0gdW5kZWZpbmVkID8gaHRtbCA6IGV4cGVjdGVkKTtcbiAgcmV0dXJuIGZyYWdtZW50O1xufVxuXG5cbmZ1bmN0aW9uIGNvbW1vblNldHVwKCkge1xuICBob29rcyA9IG1lcmdlKHt9LCBkZWZhdWx0SG9va3MpO1xuICBoZWxwZXJzID0ge307XG4gIHBhcnRpYWxzID0ge307XG5cbiAgZW52ID0ge1xuICAgIGRvbTogbmV3IERPTUhlbHBlcigpLFxuICAgIGhvb2tzOiBob29rcyxcbiAgICBoZWxwZXJzOiBoZWxwZXJzLFxuICAgIHBhcnRpYWxzOiBwYXJ0aWFscyxcbiAgICB1c2VGcmFnbWVudENhY2hlOiB0cnVlXG4gIH07XG59XG5cblFVbml0Lm1vZHVsZShcIkhUTUwtYmFzZWQgY29tcGlsZXIgKG91dHB1dClcIiwge1xuICBiZWZvcmVFYWNoOiBjb21tb25TZXR1cFxufSk7XG5cbnRlc3QoXCJTaW1wbGUgY29udGVudCBwcm9kdWNlcyBhIGRvY3VtZW50IGZyYWdtZW50XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwiY29udGVudFwiKTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50O1xuXG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCBcImNvbnRlbnRcIik7XG59KTtcblxudGVzdChcIlNpbXBsZSBlbGVtZW50cyBhcmUgY3JlYXRlZFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZShcIjxoMT5oZWxsbyE8L2gxPjxkaXY+Y29udGVudDwvZGl2PlwiKTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50O1xuXG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCBcIjxoMT5oZWxsbyE8L2gxPjxkaXY+Y29udGVudDwvZGl2PlwiKTtcbn0pO1xuXG50ZXN0KFwiU2ltcGxlIGVsZW1lbnRzIGNhbiBiZSByZS1yZW5kZXJlZFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZShcIjxoMT5oZWxsbyE8L2gxPjxkaXY+Y29udGVudDwvZGl2PlwiKTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KTtcbiAgdmFyIGZyYWdtZW50ID0gcmVzdWx0LmZyYWdtZW50O1xuXG4gIHZhciBvbGRGaXJzdENoaWxkID0gZnJhZ21lbnQuZmlyc3RDaGlsZDtcblxuICByZXN1bHQucmV2YWxpZGF0ZSgpO1xuXG4gIHN0cmljdEVxdWFsKGZyYWdtZW50LmZpcnN0Q2hpbGQsIG9sZEZpcnN0Q2hpbGQpO1xuICBlcXVhbFRva2VucyhmcmFnbWVudCwgXCI8aDE+aGVsbG8hPC9oMT48ZGl2PmNvbnRlbnQ8L2Rpdj5cIik7XG59KTtcblxudGVzdChcIlNpbXBsZSBlbGVtZW50cyBjYW4gaGF2ZSBhdHRyaWJ1dGVzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwiPGRpdiBjbGFzcz0nZm9vJyBpZD0nYmFyJz5jb250ZW50PC9kaXY+XCIpO1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoe30sIGVudikuZnJhZ21lbnQ7XG5cbiAgZXF1YWxUb2tlbnMoZnJhZ21lbnQsICc8ZGl2IGNsYXNzPVwiZm9vXCIgaWQ9XCJiYXJcIj5jb250ZW50PC9kaXY+Jyk7XG59KTtcblxudGVzdChcIlNpbXBsZSBlbGVtZW50cyBjYW4gaGF2ZSBhbiBlbXB0eSBhdHRyaWJ1dGVcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8ZGl2IGNsYXNzPScnPmNvbnRlbnQ8L2Rpdj5cIik7XG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudDtcblxuICBlcXVhbFRva2VucyhmcmFnbWVudCwgJzxkaXYgY2xhc3M9XCJcIj5jb250ZW50PC9kaXY+Jyk7XG59KTtcblxudGVzdChcInByZXNlbmNlIG9mIGBkaXNhYmxlZGAgYXR0cmlidXRlIHdpdGhvdXQgdmFsdWUgbWFya3MgYXMgZGlzYWJsZWRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxpbnB1dCBkaXNhYmxlZD4nKTtcbiAgdmFyIGlucHV0Tm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIG9rKGlucHV0Tm9kZS5kaXNhYmxlZCwgJ2Rpc2FibGVkIHdpdGhvdXQgdmFsdWUgc2V0IGFzIHByb3BlcnR5IGlzIHRydWUnKTtcbn0pO1xuXG50ZXN0KFwiTnVsbCBxdW90ZWQgYXR0cmlidXRlIHZhbHVlIGNhbGxzIHRvU3RyaW5nIG9uIHRoZSB2YWx1ZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPGlucHV0IGRpc2FibGVkPVwie3tpc0Rpc2FibGVkfX1cIj4nKTtcbiAgdmFyIGlucHV0Tm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7aXNEaXNhYmxlZDogbnVsbH0sIGVudikuZnJhZ21lbnQuZmlyc3RDaGlsZDtcblxuICBvayhpbnB1dE5vZGUuZGlzYWJsZWQsICdzdHJpbmcgb2YgXCJudWxsXCIgc2V0IGFzIHByb3BlcnR5IGlzIHRydWUnKTtcbn0pO1xuXG50ZXN0KFwiTnVsbCB1bnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUgcmVtb3ZlcyB0aGF0IGF0dHJpYnV0ZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPGlucHV0IGRpc2FibGVkPXt7aXNEaXNhYmxlZH19PicpO1xuICB2YXIgaW5wdXROb2RlID0gdGVtcGxhdGUucmVuZGVyKHtpc0Rpc2FibGVkOiBudWxsfSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIGVxdWFsVG9rZW5zKGlucHV0Tm9kZSwgJzxpbnB1dD4nKTtcbn0pO1xuXG50ZXN0KFwidW5xdW90ZWQgYXR0cmlidXRlIHN0cmluZyBpcyBqdXN0IHRoYXRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxpbnB1dCB2YWx1ZT1mdW5zdHVmZj4nKTtcbiAgdmFyIGlucHV0Tm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIGVxdWFsKGlucHV0Tm9kZS50YWdOYW1lLCAnSU5QVVQnLCAnaW5wdXQgdGFnJyk7XG4gIGVxdWFsKGlucHV0Tm9kZS52YWx1ZSwgJ2Z1bnN0dWZmJywgJ3ZhbHVlIGlzIHNldCBhcyBwcm9wZXJ0eScpO1xufSk7XG5cbnRlc3QoXCJ1bnF1b3RlZCBhdHRyaWJ1dGUgZXhwcmVzc2lvbiBpcyBzdHJpbmdcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxpbnB1dCB2YWx1ZT17e2Z1bnN0dWZmfX0+Jyk7XG4gIHZhciBpbnB1dE5vZGUgPSB0ZW1wbGF0ZS5yZW5kZXIoe2Z1bnN0dWZmOiBcIm9oIG15XCJ9LCBlbnYpLmZyYWdtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWwoaW5wdXROb2RlLnRhZ05hbWUsICdJTlBVVCcsICdpbnB1dCB0YWcnKTtcbiAgZXF1YWwoaW5wdXROb2RlLnZhbHVlLCAnb2ggbXknLCAnc3RyaW5nIGlzIHNldCB0byBwcm9wZXJ0eScpO1xufSk7XG5cbnRlc3QoXCJ1bnF1b3RlZCBhdHRyaWJ1dGUgZXhwcmVzc2lvbiB3b3JrcyB3aGVuIGZvbGxvd2VkIGJ5IGFub3RoZXIgYXR0cmlidXRlXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8ZGl2IGZvbz17e2Z1bnN0dWZmfX0gbmFtZT1cIkFsaWNlXCI+PC9kaXY+Jyk7XG4gIHZhciBkaXZOb2RlID0gdGVtcGxhdGUucmVuZGVyKHtmdW5zdHVmZjogXCJvaCBteVwifSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIGVxdWFsVG9rZW5zKGRpdk5vZGUsICc8ZGl2IG5hbWU9XCJBbGljZVwiIGZvbz1cIm9oIG15XCI+PC9kaXY+Jyk7XG59KTtcblxudGVzdChcIlVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSB3aXRoIG11bHRpcGxlIG5vZGVzIHRocm93cyBhbiBleGNlcHRpb25cIiwgZnVuY3Rpb24gKCkge1xuICBleHBlY3QoNCk7XG5cbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkgeyBjb21waWxlKCc8aW1nIGNsYXNzPWZvb3t7YmFyfX0+Jyk7IH0sIGV4cGVjdGVkRXJyb3IoMSkpO1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7IGNvbXBpbGUoJzxpbWcgY2xhc3M9e3tmb299fXt7YmFyfX0+Jyk7IH0sIGV4cGVjdGVkRXJyb3IoMSkpO1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7IGNvbXBpbGUoJzxpbWcgXFxuY2xhc3M9e3tmb299fWJhcj4nKTsgfSwgZXhwZWN0ZWRFcnJvcigyKSk7XG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHsgY29tcGlsZSgnPGRpdiBcXG5jbGFzc1xcbj1cXG57e2Zvb319JmFtcDtiYXIgPjwvZGl2PicpOyB9LCBleHBlY3RlZEVycm9yKDQpKTtcblxuICBmdW5jdGlvbiBleHBlY3RlZEVycm9yKGxpbmUpIHtcbiAgICByZXR1cm4gbmV3IEVycm9yKFxuICAgICAgYEFuIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgbXVzdGFjaGUsIGAgK1xuICAgICAgYHByZWNlZWRlZCBieSB3aGl0ZXNwYWNlIG9yIGEgJz0nIGNoYXJhY3RlciwgYW5kIGAgK1xuICAgICAgYGZvbGxvd2VkIGJ5IHdoaXRlc3BhY2Ugb3IgYSAnPicgY2hhcmFjdGVyIChvbiBsaW5lICR7bGluZX0pYFxuICAgICk7XG4gIH1cbn0pO1xuXG50ZXN0KFwiU2ltcGxlIGVsZW1lbnRzIGNhbiBoYXZlIGFyYml0cmFyeSBhdHRyaWJ1dGVzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwiPGRpdiBkYXRhLXNvbWUtZGF0YT0nZm9vJz5jb250ZW50PC9kaXY+XCIpO1xuICB2YXIgZGl2Tm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuICBlcXVhbFRva2VucyhkaXZOb2RlLCAnPGRpdiBkYXRhLXNvbWUtZGF0YT1cImZvb1wiPmNvbnRlbnQ8L2Rpdj4nKTtcbn0pO1xuXG50ZXN0KFwiY2hlY2tlZCBhdHRyaWJ1dGUgYW5kIGNoZWNrZWQgcHJvcGVydHkgYXJlIHByZXNlbnQgYWZ0ZXIgY2xvbmUgYW5kIGh5ZHJhdGVcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8aW5wdXQgY2hlY2tlZD1cXFwiY2hlY2tlZFxcXCI+XCIpO1xuICB2YXIgaW5wdXROb2RlID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gIGVxdWFsKGlucHV0Tm9kZS50YWdOYW1lLCAnSU5QVVQnLCAnaW5wdXQgdGFnJyk7XG4gIGVxdWFsKGlucHV0Tm9kZS5jaGVja2VkLCB0cnVlLCAnaW5wdXQgdGFnIGlzIGNoZWNrZWQnKTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHNob3VsZEJlVm9pZCh0YWdOYW1lKSB7XG4gIHZhciBodG1sID0gXCI8XCIgKyB0YWdOYW1lICsgXCIgZGF0YS1mb289J2Jhcic+PHA+aGVsbG88L3A+XCI7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoaHRtbCk7XG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudDtcblxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBkaXYuYXBwZW5kQ2hpbGQoZnJhZ21lbnQuY2xvbmVOb2RlKHRydWUpKTtcblxuICB2YXIgdGFnID0gJzwnICsgdGFnTmFtZSArICcgZGF0YS1mb289XCJiYXJcIj4nO1xuICB2YXIgY2xvc2luZyA9ICc8LycgKyB0YWdOYW1lICsgJz4nO1xuICB2YXIgZXh0cmEgPSBcIjxwPmhlbGxvPC9wPlwiO1xuICBodG1sID0gbm9ybWFsaXplSW5uZXJIVE1MKGRpdi5pbm5lckhUTUwpO1xuXG4gIFFVbml0LnB1c2goKGh0bWwgPT09IHRhZyArIGV4dHJhKSB8fCAoaHRtbCA9PT0gdGFnICsgY2xvc2luZyArIGV4dHJhKSwgaHRtbCwgdGFnICsgY2xvc2luZyArIGV4dHJhLCB0YWdOYW1lICsgXCIgc2hvdWxkIGJlIGEgdm9pZCBlbGVtZW50XCIpO1xufVxuXG50ZXN0KFwiVm9pZCBlbGVtZW50cyBhcmUgc2VsZi1jbG9zaW5nXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdm9pZEVsZW1lbnRzID0gXCJhcmVhIGJhc2UgYnIgY29sIGNvbW1hbmQgZW1iZWQgaHIgaW1nIGlucHV0IGtleWdlbiBsaW5rIG1ldGEgcGFyYW0gc291cmNlIHRyYWNrIHdiclwiO1xuXG4gIGZvckVhY2godm9pZEVsZW1lbnRzLnNwbGl0KFwiIFwiKSwgZnVuY3Rpb24odGFnTmFtZSkge1xuICAgIHNob3VsZEJlVm9pZCh0YWdOYW1lKTtcbiAgfSk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIG5lc3RpbmdcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBodG1sID0gJzxkaXYgY2xhc3M9XCJmb29cIj48cD48c3BhbiBpZD1cImJhclwiIGRhdGEtZm9vPVwiYmFyXCI+aGkhPC9zcGFuPjwvcD48L2Rpdj4mbmJzcDtNb3JlIGNvbnRlbnQnO1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKGh0bWwpO1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoe30sIGVudikuZnJhZ21lbnQ7XG5cbiAgZXF1YWxUb2tlbnMoZnJhZ21lbnQsIGh0bWwpO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBxdW90ZXNcIiwgZnVuY3Rpb24oKSB7XG4gIGNvbXBpbGVzVG8oJzxkaXY+XCJUaGlzIGlzIGEgdGl0bGUsXCIgd2VcXCdyZSBvbiBhIGJvYXQ8L2Rpdj4nKTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgYmFja3NsYXNoZXNcIiwgZnVuY3Rpb24oKSB7XG4gIGNvbXBpbGVzVG8oJzxkaXY+VGhpcyBpcyBhIGJhY2tzbGFzaDogXFxcXDwvZGl2PicpO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBuZXdsaW5lc1wiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbyhcIjxkaXY+Y29tbW9uXFxuXFxuYnJvPC9kaXY+XCIpO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBjb21tZW50c1wiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbyhcIjxkaXY+e3shIEJldHRlciBub3QgYnJlYWshIH19Y29udGVudDwvZGl2PlwiLCAnPGRpdj5jb250ZW50PC9kaXY+Jywge30pO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBIVE1MIGNvbW1lbnRzXCIsIGZ1bmN0aW9uKCkge1xuICBjb21waWxlc1RvKCc8ZGl2PjwhLS0gSnVzdCBwYXNzaW5nIHRocm91Z2ggLS0+PC9kaXY+Jyk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIEhUTUwgY29tbWVudHMgd2l0aCBtdXN0YWNoZXMgaW4gdGhlbVwiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbygnPGRpdj48IS0tIHt7Zm9vfX0gLS0+PC9kaXY+JywgJzxkaXY+PCEtLSB7e2Zvb319IC0tPjwvZGl2PicsIHsgZm9vOiAnYmFyJyB9KTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgSFRNTCBjb21tZW50cyB3aXRoIGNvbXBsZXggbXVzdGFjaGVzIGluIHRoZW1cIiwgZnVuY3Rpb24oKSB7XG4gIGNvbXBpbGVzVG8oJzxkaXY+PCEtLSB7e2ZvbyBiYXIgYmF6fX0gLS0+PC9kaXY+JywgJzxkaXY+PCEtLSB7e2ZvbyBiYXIgYmF6fX0gLS0+PC9kaXY+JywgeyBmb286ICdiYXInIH0pO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBIVE1MIGNvbW1lbnRzIHdpdGggbXVsdGktbGluZSBtdXN0YWNoZXMgaW4gdGhlbVwiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbygnPGRpdj48IS0tIHt7I2VhY2ggZm9vIGFzIHxiYXJ8fX1cXG57e2Jhcn19XFxuXFxue3svZWFjaH19IC0tPjwvZGl2PicpO1xufSk7XG5cbnRlc3QoJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIGNvbW1lbnRzIHdpdGggbm8gcGFyZW50IGVsZW1lbnQnLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbygnPCEtLSB7e2Zvb319IC0tPicpO1xufSk7XG5cbi8vIFRPRE86IFJldmlzaXQgcGFydGlhbCBzeW50YXguXG4vLyB0ZXN0KFwiVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgcGFydGlhbHMgaW4gaGFuZGxlYmFycyBwYXJ0aWFsIHN5bnRheFwiLCBmdW5jdGlvbigpIHtcbi8vICAgcmVnaXN0ZXJQYXJ0aWFsKCdwYXJ0aWFsX25hbWUnLCBcIjxiPlBhcnRpYWwgV29ya3MhPC9iPlwiKTtcbi8vICAgY29tcGlsZXNUbygnPGRpdj57ez5wYXJ0aWFsX25hbWV9fSBQbGFpbnRleHQgY29udGVudDwvZGl2PicsICc8ZGl2PjxiPlBhcnRpYWwgV29ya3MhPC9iPiBQbGFpbnRleHQgY29udGVudDwvZGl2PicsIHt9KTtcbi8vIH0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgcGFydGlhbHMgaW4gaGVscGVyIHBhcnRpYWwgc3ludGF4XCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlclBhcnRpYWwoJ3BhcnRpYWxfbmFtZScsIFwiPGI+UGFydGlhbCBXb3JrcyE8L2I+XCIpO1xuICBjb21waWxlc1RvKCc8ZGl2Pnt7cGFydGlhbCBcInBhcnRpYWxfbmFtZVwifX0gUGxhaW50ZXh0IGNvbnRlbnQ8L2Rpdj4nLCAnPGRpdj48Yj5QYXJ0aWFsIFdvcmtzITwvYj4gUGxhaW50ZXh0IGNvbnRlbnQ8L2Rpdj4nLCB7fSk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIHNpbXBsZSBoYW5kbGViYXJzXCIsIGZ1bmN0aW9uKCkge1xuICBjb21waWxlc1RvKCc8ZGl2Pnt7dGl0bGV9fTwvZGl2PicsICc8ZGl2PmhlbGxvPC9kaXY+JywgeyB0aXRsZTogJ2hlbGxvJyB9KTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgZXNjYXBpbmcgSFRNTFwiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbygnPGRpdj57e3RpdGxlfX08L2Rpdj4nLCAnPGRpdj4mbHQ7c3Ryb25nJmd0O2hlbGxvJmx0Oy9zdHJvbmcmZ3Q7PC9kaXY+JywgeyB0aXRsZTogJzxzdHJvbmc+aGVsbG88L3N0cm9uZz4nIH0pO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSB1bmVzY2FwZWQgSFRNTFwiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbygnPGRpdj57e3t0aXRsZX19fTwvZGl2PicsICc8ZGl2PjxzdHJvbmc+aGVsbG88L3N0cm9uZz48L2Rpdj4nLCB7IHRpdGxlOiAnPHN0cm9uZz5oZWxsbzwvc3Ryb25nPicgfSk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIHRvcC1sZXZlbCB1bmVzY2FwZWQgSFRNTFwiLCBmdW5jdGlvbigpIHtcbiAgY29tcGlsZXNUbygne3t7aHRtbH19fScsICc8c3Ryb25nPmhlbGxvPC9zdHJvbmc+JywgeyBodG1sOiAnPHN0cm9uZz5oZWxsbzwvc3Ryb25nPicgfSk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIHRvcC1sZXZlbCB1bmVzY2FwZWQgdHJcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJ3t7e2h0bWx9fX0nKTtcbiAgdmFyIGNvbnRleHQgPSB7IGh0bWw6ICc8dHI+PHRkPllvPC90ZD48L3RyPicgfTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKGNvbnRleHQsIGVudiwgeyBjb250ZXh0dWFsRWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGFibGUnKSB9KS5mcmFnbWVudDtcblxuICBlcXVhbChcbiAgICBmcmFnbWVudC5maXJzdENoaWxkLm5leHRTaWJsaW5nLnRhZ05hbWUsICdUUicsXG4gICAgXCJyb290IHRyIGlzIHByZXNlbnRcIiApO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSB0b3AtbGV2ZWwgdW5lc2NhcGVkIHRkIGluc2lkZSB0ciBjb250ZXh0dWFsRWxlbWVudFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgne3t7aHRtbH19fScpO1xuICB2YXIgY29udGV4dCA9IHsgaHRtbDogJzx0ZD5ZbzwvdGQ+JyB9O1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoY29udGV4dCwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpIH0pLmZyYWdtZW50O1xuXG4gIGVxdWFsKFxuICAgIGZyYWdtZW50LmZpcnN0Q2hpbGQubmV4dFNpYmxpbmcudGFnTmFtZSwgJ1REJyxcbiAgICBcInJvb3QgdGQgaXMgcmV0dXJuZWRcIiApO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSB1bmVzY2FwZWQgdHIgaW4gdG9wIG9mIGNvbnRlbnRcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoKTtcbiAgfSk7XG5cbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgne3sjdGVzdH19e3t7aHRtbH19fXt7L3Rlc3R9fScpO1xuICB2YXIgY29udGV4dCA9IHsgaHRtbDogJzx0cj48dGQ+WW88L3RkPjwvdHI+JyB9O1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoY29udGV4dCwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpIH0pLmZyYWdtZW50O1xuXG4gIGVxdWFsKFxuICAgIGZyYWdtZW50LmZpcnN0Q2hpbGQubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcudGFnTmFtZSwgJ1RSJyxcbiAgICBcInJvb3QgdHIgaXMgcHJlc2VudFwiICk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIHVuZXNjYXBlZCB0ciBpbnNpZGUgZnJhZ21lbnQgdGFibGVcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoKTtcbiAgfSk7XG5cbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPHRhYmxlPnt7I3Rlc3R9fXt7e2h0bWx9fX17ey90ZXN0fX08L3RhYmxlPicpO1xuICB2YXIgY29udGV4dCA9IHsgaHRtbDogJzx0cj48dGQ+WW88L3RkPjwvdHI+JyB9O1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoY29udGV4dCwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSB9KS5mcmFnbWVudDtcbiAgdmFyIHRhYmxlTm9kZSA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWwoXG4gICAgdGFibGVOb2RlLmZpcnN0Q2hpbGQubmV4dFNpYmxpbmcudGFnTmFtZSwgJ1RSJyxcbiAgICBcInJvb3QgdHIgaXMgcHJlc2VudFwiICk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIHNpbXBsZSBoZWxwZXJzXCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlckhlbHBlcigndGVzdGluZycsIGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHJldHVybiBwYXJhbXNbMF07XG4gIH0pO1xuXG4gIGNvbXBpbGVzVG8oJzxkaXY+e3t0ZXN0aW5nIHRpdGxlfX08L2Rpdj4nLCAnPGRpdj5oZWxsbzwvZGl2PicsIHsgdGl0bGU6ICdoZWxsbycgfSk7XG59KTtcblxudGVzdChcIkhlbHBlcnMgcHJvcGFnYXRlIHRoZSBvd25lciByZW5kZXIgbm9kZVwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ2lkJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoKTtcbiAgfSk7XG5cbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPGRpdj57eyNpZH19PHA+e3sjaWR9fTxzcGFuPnt7I2lkfX17e25hbWV9fXt7L2lkfX08L3NwYW4+e3svaWR9fTwvcD57ey9pZH19PC9kaXY+Jyk7XG4gIHZhciBjb250ZXh0ID0geyBuYW1lOiBcIlRvbSBEYWxlXCIgfTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihjb250ZXh0LCBlbnYpO1xuXG4gIGVxdWFsVG9rZW5zKHJlc3VsdC5mcmFnbWVudCwgJzxkaXY+PHA+PHNwYW4+VG9tIERhbGU8L3NwYW4+PC9wPjwvZGl2PicpO1xuXG4gIHZhciByb290ID0gcmVzdWx0LnJvb3Q7XG4gIHN0cmljdEVxdWFsKHJvb3QsIHJvb3QuY2hpbGROb2Rlc1swXS5vd25lck5vZGUpO1xuICBzdHJpY3RFcXVhbChyb290LCByb290LmNoaWxkTm9kZXNbMF0uY2hpbGROb2Rlc1swXS5vd25lck5vZGUpO1xuICBzdHJpY3RFcXVhbChyb290LCByb290LmNoaWxkTm9kZXNbMF0uY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzWzBdLm93bmVyTm9kZSk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBjYW4gaGFuZGxlIHNleHByIGhlbHBlcnNcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgcmV0dXJuIHBhcmFtc1swXSArIFwiIVwiO1xuICB9KTtcblxuICBjb21waWxlc1RvKCc8ZGl2Pnt7dGVzdGluZyAodGVzdGluZyBcImhlbGxvXCIpfX08L2Rpdj4nLCAnPGRpdj5oZWxsbyEhPC9kaXY+Jywge30pO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBtdWx0aXBsZSBpbnZvY2F0aW9ucyBvZiBzZXhwcnNcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgcmV0dXJuIFwiXCIgKyBwYXJhbXNbMF0gKyBwYXJhbXNbMV07XG4gIH0pO1xuXG4gIGNvbXBpbGVzVG8oJzxkaXY+e3t0ZXN0aW5nICh0ZXN0aW5nIFwiaGVsbG9cIiBmb28pICh0ZXN0aW5nICh0ZXN0aW5nIGJhciBcImxvbFwiKSBiYXopfX08L2Rpdj4nLCAnPGRpdj5oZWxsb0ZPT0JBUmxvbEJBWjwvZGl2PicsIHsgZm9vOiBcIkZPT1wiLCBiYXI6IFwiQkFSXCIsIGJhejogXCJCQVpcIiB9KTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIHBhc3NlcyBhbG9uZyB0aGUgaGFzaCBhcmd1bWVudHNcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGFyYW1zLCBoYXNoKSB7XG4gICAgcmV0dXJuIGhhc2guZmlyc3QgKyAnLScgKyBoYXNoLnNlY29uZDtcbiAgfSk7XG5cbiAgY29tcGlsZXNUbygnPGRpdj57e3Rlc3RpbmcgZmlyc3Q9XCJvbmVcIiBzZWNvbmQ9XCJ0d29cIn19PC9kaXY+JywgJzxkaXY+b25lLXR3bzwvZGl2PicpO1xufSk7XG5cbnRlc3QoXCJzZWNvbmQgcmVuZGVyIHJlc3BlY3RzIHdoaXRlc3BhY2VcIiwgZnVuY3Rpb24gKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCdIZWxsbyB7eyBmb28gfX0gJyk7XG4gIHRlbXBsYXRlLnJlbmRlcih7fSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSB9KTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpIH0pLmZyYWdtZW50O1xuICBlcXVhbChmcmFnbWVudC5jaGlsZE5vZGVzLmxlbmd0aCwgMywgJ2ZyYWdtZW50IGNvbnRhaW5zIDMgdGV4dCBub2RlcycpO1xuICBlcXVhbChnZXRUZXh0Q29udGVudChmcmFnbWVudC5jaGlsZE5vZGVzWzBdKSwgJ0hlbGxvICcsICdmaXJzdCB0ZXh0IG5vZGUgZW5kcyB3aXRoIG9uZSBzcGFjZSBjaGFyYWN0ZXInKTtcbiAgZXF1YWwoZ2V0VGV4dENvbnRlbnQoZnJhZ21lbnQuY2hpbGROb2Rlc1syXSksICcgJywgJ2xhc3QgdGV4dCBub2RlIGNvbnRhaW5zIG9uZSBzcGFjZSBjaGFyYWN0ZXInKTtcbn0pO1xuXG50ZXN0KFwiTW9ycGhzIGFyZSBlc2NhcGVkIGNvcnJlY3RseVwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmctdW5lc2NhcGVkJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgcmV0dXJuIHBhcmFtc1swXTtcbiAgfSk7XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmctZXNjYXBlZCcsIGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIGlmICh0aGlzLnlpZWxkKSB7XG4gICAgICByZXR1cm4gdGhpcy55aWVsZCgpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJhbXNbMF07XG4gIH0pO1xuXG4gIGNvbXBpbGVzVG8oJzxkaXY+e3t7dGVzdGluZy11bmVzY2FwZWQgXCI8c3Bhbj5oaTwvc3Bhbj5cIn19fTwvZGl2PicsICc8ZGl2PjxzcGFuPmhpPC9zcGFuPjwvZGl2PicpO1xuICBjb21waWxlc1RvKCc8ZGl2Pnt7dGVzdGluZy1lc2NhcGVkIFwiPGhpPlwifX08L2Rpdj4nLCAnPGRpdj4mbHQ7aGkmZ3Q7PC9kaXY+Jyk7XG4gIGNvbXBpbGVzVG8oJzxkaXY+e3sjdGVzdGluZy1lc2NhcGVkfX08ZW0+PC9lbT57ey90ZXN0aW5nLWVzY2FwZWR9fTwvZGl2PicsICc8ZGl2PjxlbT48L2VtPjwvZGl2PicpO1xuICBjb21waWxlc1RvKCc8ZGl2Pjx0ZXN0aW5nLWVzY2FwZWQ+PGVtPjwvZW0+PC90ZXN0aW5nLWVzY2FwZWQ+PC9kaXY+JywgJzxkaXY+PGVtPjwvZW0+PC9kaXY+Jyk7XG59KTtcblxudGVzdChcIkF0dHJpYnV0ZXMgY2FuIHVzZSBjb21wdXRlZCB2YWx1ZXNcIiwgZnVuY3Rpb24oKSB7XG4gIGNvbXBpbGVzVG8oJzxhIGhyZWY9XCJ7e3VybH19XCI+bGlua3k8L2E+JywgJzxhIGhyZWY9XCJsaW5reS5odG1sXCI+bGlua3k8L2E+JywgeyB1cmw6ICdsaW5reS5odG1sJyB9KTtcbn0pO1xuXG50ZXN0KFwiTW91bnRhaW4gcmFuZ2Ugb2YgbmVzdGluZ1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGNvbnRleHQgPSB7IGZvbzogXCJGT09cIiwgYmFyOiBcIkJBUlwiLCBiYXo6IFwiQkFaXCIsIGJvbzogXCJCT09cIiwgYnJldzogXCJCUkVXXCIsIGJhdDogXCJCQVRcIiwgZmx1dGU6IFwiRkxVVEVcIiwgYXJnaDogXCJBUkdIXCIgfTtcbiAgY29tcGlsZXNUbygne3tmb299fTxzcGFuPjwvc3Bhbj4nLCAnRk9PPHNwYW4+PC9zcGFuPicsIGNvbnRleHQpO1xuICBjb21waWxlc1RvKCc8c3Bhbj48L3NwYW4+e3tmb299fScsICc8c3Bhbj48L3NwYW4+Rk9PJywgY29udGV4dCk7XG4gIGNvbXBpbGVzVG8oJzxzcGFuPnt7Zm9vfX08L3NwYW4+e3tmb299fScsICc8c3Bhbj5GT088L3NwYW4+Rk9PJywgY29udGV4dCk7XG4gIGNvbXBpbGVzVG8oJ3t7Zm9vfX08c3Bhbj57e2Zvb319PC9zcGFuPnt7Zm9vfX0nLCAnRk9PPHNwYW4+Rk9PPC9zcGFuPkZPTycsIGNvbnRleHQpO1xuICBjb21waWxlc1RvKCd7e2Zvb319PHNwYW4+PC9zcGFuPnt7Zm9vfX0nLCAnRk9PPHNwYW4+PC9zcGFuPkZPTycsIGNvbnRleHQpO1xuICBjb21waWxlc1RvKCd7e2Zvb319PHNwYW4+PC9zcGFuPnt7YmFyfX08c3Bhbj48c3Bhbj48c3Bhbj57e2Jhen19PC9zcGFuPjwvc3Bhbj48L3NwYW4+JyxcbiAgICAgICAgICAgICAnRk9PPHNwYW4+PC9zcGFuPkJBUjxzcGFuPjxzcGFuPjxzcGFuPkJBWjwvc3Bhbj48L3NwYW4+PC9zcGFuPicsIGNvbnRleHQpO1xuICBjb21waWxlc1RvKCd7e2Zvb319PHNwYW4+PC9zcGFuPnt7YmFyfX08c3Bhbj57e2FyZ2h9fTxzcGFuPjxzcGFuPnt7YmF6fX08L3NwYW4+PC9zcGFuPjwvc3Bhbj4nLFxuICAgICAgICAgICAgICdGT088c3Bhbj48L3NwYW4+QkFSPHNwYW4+QVJHSDxzcGFuPjxzcGFuPkJBWjwvc3Bhbj48L3NwYW4+PC9zcGFuPicsIGNvbnRleHQpO1xuICBjb21waWxlc1RvKCd7e2Zvb319PHNwYW4+e3tiYXJ9fTxhPnt7YmF6fX08ZW0+e3tib299fXt7YnJld319PC9lbT57e2JhdH19PC9hPjwvc3Bhbj48c3Bhbj48c3Bhbj57e2ZsdXRlfX08L3NwYW4+PC9zcGFuPnt7YXJnaH19JyxcbiAgICAgICAgICAgICAnRk9PPHNwYW4+QkFSPGE+QkFaPGVtPkJPT0JSRVc8L2VtPkJBVDwvYT48L3NwYW4+PHNwYW4+PHNwYW4+RkxVVEU8L3NwYW4+PC9zcGFuPkFSR0gnLCBjb250ZXh0KTtcbn0pO1xuXG4vLyB0ZXN0KFwiQXR0cmlidXRlcyBjYW4gdXNlIGNvbXB1dGVkIHBhdGhzXCIsIGZ1bmN0aW9uKCkge1xuLy8gICBjb21waWxlc1RvKCc8YSBocmVmPVwie3twb3N0LnVybH19XCI+bGlua3k8L2E+JywgJzxhIGhyZWY9XCJsaW5reS5odG1sXCI+bGlua3k8L2E+JywgeyBwb3N0OiB7IHVybDogJ2xpbmt5Lmh0bWwnIH19KTtcbi8vIH0pO1xuXG4vKlxuXG50ZXN0KFwiSXQgaXMgcG9zc2libGUgdG8gdXNlIFJFU09MVkVfSU5fQVRUUiBmb3IgZGF0YSBiaW5kaW5nXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2s7XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ1JFU09MVkVfSU5fQVRUUicsIGZ1bmN0aW9uKHBhcnRzLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGJvdW5kVmFsdWUoZnVuY3Rpb24oYykge1xuICAgICAgY2FsbGJhY2sgPSBjO1xuICAgICAgcmV0dXJuIHRoaXNbcGFydHNbMF1dO1xuICAgIH0sIHRoaXMpO1xuICB9KTtcblxuICB2YXIgb2JqZWN0ID0geyB1cmw6ICdsaW5reS5odG1sJyB9O1xuICB2YXIgZnJhZ21lbnQgPSBjb21waWxlc1RvKCc8YSBocmVmPVwie3t1cmx9fVwiPmxpbmt5PC9hPicsICc8YSBocmVmPVwibGlua3kuaHRtbFwiPmxpbmt5PC9hPicsIG9iamVjdCk7XG5cbiAgb2JqZWN0LnVybCA9ICdjbGlwcHkuaHRtbCc7XG4gIGNhbGxiYWNrKCk7XG5cbiAgZXF1YWxUb2tlbnMoZnJhZ21lbnQsICc8YSBocmVmPVwiY2xpcHB5Lmh0bWxcIj5saW5reTwvYT4nKTtcblxuICBvYmplY3QudXJsID0gJ3ppcHB5Lmh0bWwnO1xuICBjYWxsYmFjaygpO1xuXG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCAnPGEgaHJlZj1cInppcHB5Lmh0bWxcIj5saW5reTwvYT4nKTtcbn0pO1xuKi9cblxudGVzdChcIkF0dHJpYnV0ZXMgY2FuIGJlIHBvcHVsYXRlZCB3aXRoIGhlbHBlcnMgdGhhdCBnZW5lcmF0ZSBhIHN0cmluZ1wiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICByZXR1cm4gcGFyYW1zWzBdO1xuICB9KTtcblxuICBjb21waWxlc1RvKCc8YSBocmVmPVwie3t0ZXN0aW5nIHVybH19XCI+bGlua3k8L2E+JywgJzxhIGhyZWY9XCJsaW5reS5odG1sXCI+bGlua3k8L2E+JywgeyB1cmw6ICdsaW5reS5odG1sJ30pO1xufSk7XG4vKlxudGVzdChcIkEgaGVscGVyIGNhbiByZXR1cm4gYSBzdHJlYW0gZm9yIHRoZSBhdHRyaWJ1dGVcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGF0aCwgb3B0aW9ucykge1xuICAgIHJldHVybiBzdHJlYW1WYWx1ZSh0aGlzW3BhdGhdKTtcbiAgfSk7XG5cbiAgY29tcGlsZXNUbygnPGEgaHJlZj1cInt7dGVzdGluZyB1cmx9fVwiPmxpbmt5PC9hPicsICc8YSBocmVmPVwibGlua3kuaHRtbFwiPmxpbmt5PC9hPicsIHsgdXJsOiAnbGlua3kuaHRtbCd9KTtcbn0pO1xuKi9cbnRlc3QoXCJBdHRyaWJ1dGUgaGVscGVycyB0YWtlIGEgaGFzaFwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gpIHtcbiAgICByZXR1cm4gaGFzaC5wYXRoO1xuICB9KTtcblxuICBjb21waWxlc1RvKCc8YSBocmVmPVwie3t0ZXN0aW5nIHBhdGg9dXJsfX1cIj5saW5reTwvYT4nLCAnPGEgaHJlZj1cImxpbmt5Lmh0bWxcIj5saW5reTwvYT4nLCB7IHVybDogJ2xpbmt5Lmh0bWwnIH0pO1xufSk7XG4vKlxudGVzdChcIkF0dHJpYnV0ZSBoZWxwZXJzIGNhbiB1c2UgdGhlIGhhc2ggZm9yIGRhdGEgYmluZGluZ1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbGxiYWNrO1xuXG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGF0aCwgaGFzaCwgb3B0aW9ucykge1xuICAgIHJldHVybiBib3VuZFZhbHVlKGZ1bmN0aW9uKGMpIHtcbiAgICAgIGNhbGxiYWNrID0gYztcbiAgICAgIHJldHVybiB0aGlzW3BhdGhdID8gaGFzaC50cnV0aHkgOiBoYXNoLmZhbHN5O1xuICAgIH0sIHRoaXMpO1xuICB9KTtcblxuICB2YXIgb2JqZWN0ID0geyBvbjogdHJ1ZSB9O1xuICB2YXIgZnJhZ21lbnQgPSBjb21waWxlc1RvKCc8ZGl2IGNsYXNzPVwie3t0ZXN0aW5nIG9uIHRydXRoeT1cInllYWhcIiBmYWxzeT1cIm5vcGVcIn19XCI+aGk8L2Rpdj4nLCAnPGRpdiBjbGFzcz1cInllYWhcIj5oaTwvZGl2PicsIG9iamVjdCk7XG5cbiAgb2JqZWN0Lm9uID0gZmFsc2U7XG4gIGNhbGxiYWNrKCk7XG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCAnPGRpdiBjbGFzcz1cIm5vcGVcIj5oaTwvZGl2PicpO1xufSk7XG4qL1xudGVzdChcIkF0dHJpYnV0ZXMgY29udGFpbmluZyBtdWx0aXBsZSBoZWxwZXJzIGFyZSB0cmVhdGVkIGxpa2UgYSBibG9ja1wiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICByZXR1cm4gcGFyYW1zWzBdO1xuICB9KTtcblxuICBjb21waWxlc1RvKCc8YSBocmVmPVwiaHR0cDovL3t7Zm9vfX0ve3t0ZXN0aW5nIGJhcn19L3t7dGVzdGluZyBcImJhelwifX1cIj5saW5reTwvYT4nLCAnPGEgaHJlZj1cImh0dHA6Ly9mb28uY29tL2Jhci9iYXpcIj5saW5reTwvYT4nLCB7IGZvbzogJ2Zvby5jb20nLCBiYXI6ICdiYXInIH0pO1xufSk7XG5cbnRlc3QoXCJBdHRyaWJ1dGVzIGNvbnRhaW5pbmcgYSBoZWxwZXIgYXJlIHRyZWF0ZWQgbGlrZSBhIGJsb2NrXCIsIGZ1bmN0aW9uKCkge1xuICBleHBlY3QoMik7XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICBkZWVwRXF1YWwocGFyYW1zLCBbMTIzXSk7XG4gICAgcmV0dXJuIFwiZXhhbXBsZS5jb21cIjtcbiAgfSk7XG5cbiAgY29tcGlsZXNUbygnPGEgaHJlZj1cImh0dHA6Ly97e3Rlc3RpbmcgMTIzfX0vaW5kZXguaHRtbFwiPmxpbmt5PC9hPicsICc8YSBocmVmPVwiaHR0cDovL2V4YW1wbGUuY29tL2luZGV4Lmh0bWxcIj5saW5reTwvYT4nLCB7IHBlcnNvbjogeyB1cmw6ICdleGFtcGxlLmNvbScgfSB9KTtcbn0pO1xuLypcbnRlc3QoXCJJdCBpcyBwb3NzaWJsZSB0byB0cmlnZ2VyIGEgcmUtcmVuZGVyIG9mIGFuIGF0dHJpYnV0ZSBmcm9tIGEgY2hpbGQgcmVzb2x1dGlvblwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbGxiYWNrO1xuXG4gIHJlZ2lzdGVySGVscGVyKCdSRVNPTFZFX0lOX0FUVFInLCBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGJvdW5kVmFsdWUoZnVuY3Rpb24oYykge1xuICAgICAgY2FsbGJhY2sgPSBjO1xuICAgICAgcmV0dXJuIHRoaXNbcGF0aF07XG4gICAgfSwgdGhpcyk7XG4gIH0pO1xuXG4gIHZhciBjb250ZXh0ID0geyB1cmw6IFwiZXhhbXBsZS5jb21cIiB9O1xuICB2YXIgZnJhZ21lbnQgPSBjb21waWxlc1RvKCc8YSBocmVmPVwiaHR0cDovL3t7dXJsfX0vaW5kZXguaHRtbFwiPmxpbmt5PC9hPicsICc8YSBocmVmPVwiaHR0cDovL2V4YW1wbGUuY29tL2luZGV4Lmh0bWxcIj5saW5reTwvYT4nLCBjb250ZXh0KTtcblxuICBjb250ZXh0LnVybCA9IFwid3d3LmV4YW1wbGUuY29tXCI7XG4gIGNhbGxiYWNrKCk7XG5cbiAgZXF1YWxUb2tlbnMoZnJhZ21lbnQsICc8YSBocmVmPVwiaHR0cDovL3d3dy5leGFtcGxlLmNvbS9pbmRleC5odG1sXCI+bGlua3k8L2E+Jyk7XG59KTtcblxudGVzdChcIkEgY2hpbGQgcmVzb2x1dGlvbiBjYW4gcGFzcyBjb250ZXh0dWFsIGluZm9ybWF0aW9uIHRvIHRoZSBwYXJlbnRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBjYWxsYmFjaztcblxuICByZWdpc3RlckhlbHBlcignUkVTT0xWRV9JTl9BVFRSJywgZnVuY3Rpb24ocGF0aCwgb3B0aW9ucykge1xuICAgIHJldHVybiBib3VuZFZhbHVlKGZ1bmN0aW9uKGMpIHtcbiAgICAgIGNhbGxiYWNrID0gYztcbiAgICAgIHJldHVybiB0aGlzW3BhdGhdO1xuICAgIH0sIHRoaXMpO1xuICB9KTtcblxuICB2YXIgY29udGV4dCA9IHsgdXJsOiBcImV4YW1wbGUuY29tXCIgfTtcbiAgdmFyIGZyYWdtZW50ID0gY29tcGlsZXNUbygnPGEgaHJlZj1cImh0dHA6Ly97e3VybH19L2luZGV4Lmh0bWxcIj5saW5reTwvYT4nLCAnPGEgaHJlZj1cImh0dHA6Ly9leGFtcGxlLmNvbS9pbmRleC5odG1sXCI+bGlua3k8L2E+JywgY29udGV4dCk7XG5cbiAgY29udGV4dC51cmwgPSBcInd3dy5leGFtcGxlLmNvbVwiO1xuICBjYWxsYmFjaygpO1xuXG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCAnPGEgaHJlZj1cImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vaW5kZXguaHRtbFwiPmxpbmt5PC9hPicpO1xufSk7XG5cbnRlc3QoXCJBdHRyaWJ1dGUgcnVucyBjYW4gY29udGFpbiBoZWxwZXJzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2tzID0gW107XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ1JFU09MVkVfSU5fQVRUUicsIGZ1bmN0aW9uKHBhdGgsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gYm91bmRWYWx1ZShmdW5jdGlvbihjKSB7XG4gICAgICBjYWxsYmFja3MucHVzaChjKTtcbiAgICAgIHJldHVybiB0aGlzW3BhdGhdO1xuICAgIH0sIHRoaXMpO1xuICB9KTtcblxuICByZWdpc3RlckhlbHBlcigndGVzdGluZycsIGZ1bmN0aW9uKHBhdGgsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gYm91bmRWYWx1ZShmdW5jdGlvbihjKSB7XG4gICAgICBjYWxsYmFja3MucHVzaChjKTtcblxuICAgICAgaWYgKG9wdGlvbnMucGFyYW1UeXBlc1swXSA9PT0gJ2lkJykge1xuICAgICAgICByZXR1cm4gdGhpc1twYXRoXSArICcuaHRtbCc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfSk7XG5cbiAgdmFyIGNvbnRleHQgPSB7IHVybDogXCJleGFtcGxlLmNvbVwiLCBwYXRoOiAnaW5kZXgnIH07XG4gIHZhciBmcmFnbWVudCA9IGNvbXBpbGVzVG8oJzxhIGhyZWY9XCJodHRwOi8ve3t1cmx9fS97e3Rlc3RpbmcgcGF0aH19L3t7dGVzdGluZyBcImxpbmt5XCJ9fVwiPmxpbmt5PC9hPicsICc8YSBocmVmPVwiaHR0cDovL2V4YW1wbGUuY29tL2luZGV4Lmh0bWwvbGlua3lcIj5saW5reTwvYT4nLCBjb250ZXh0KTtcblxuICBjb250ZXh0LnVybCA9IFwid3d3LmV4YW1wbGUuY29tXCI7XG4gIGNvbnRleHQucGF0aCA9IFwieWVwXCI7XG4gIGZvckVhY2goY2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9KTtcblxuICBlcXVhbFRva2VucyhmcmFnbWVudCwgJzxhIGhyZWY9XCJodHRwOi8vd3d3LmV4YW1wbGUuY29tL3llcC5odG1sL2xpbmt5XCI+bGlua3k8L2E+Jyk7XG5cbiAgY29udGV4dC51cmwgPSBcIm5vcGUuZXhhbXBsZS5jb21cIjtcbiAgY29udGV4dC5wYXRoID0gXCJub3BlXCI7XG4gIGZvckVhY2goY2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9KTtcblxuICBlcXVhbFRva2VucyhmcmFnbWVudCwgJzxhIGhyZWY9XCJodHRwOi8vbm9wZS5leGFtcGxlLmNvbS9ub3BlLmh0bWwvbGlua3lcIj5saW5reTwvYT4nKTtcbn0pO1xuKi9cbnRlc3QoXCJBIHNpbXBsZSBibG9jayBoZWxwZXIgY2FuIHJldHVybiB0aGUgZGVmYXVsdCBkb2N1bWVudCBmcmFnbWVudFwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMueWllbGQoKTsgfSk7XG5cbiAgY29tcGlsZXNUbygne3sjdGVzdGluZ319PGRpdiBpZD1cInRlc3RcIj4xMjM8L2Rpdj57ey90ZXN0aW5nfX0nLCAnPGRpdiBpZD1cInRlc3RcIj4xMjM8L2Rpdj4nKTtcbn0pO1xuXG4vLyBUT0RPOiBORVhUXG50ZXN0KFwiQSBzaW1wbGUgYmxvY2sgaGVscGVyIGNhbiByZXR1cm4gdGV4dFwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMueWllbGQoKTsgfSk7XG5cbiAgY29tcGlsZXNUbygne3sjdGVzdGluZ319dGVzdHt7ZWxzZX19bm90IHNob3due3svdGVzdGluZ319JywgJ3Rlc3QnKTtcbn0pO1xuXG50ZXN0KFwiQSBibG9jayBoZWxwZXIgY2FuIGhhdmUgYW4gZWxzZSBibG9ja1wiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlLnlpZWxkKCk7XG4gIH0pO1xuXG4gIGNvbXBpbGVzVG8oJ3t7I3Rlc3Rpbmd9fU5vcGV7e2Vsc2V9fTxkaXYgaWQ9XCJ0ZXN0XCI+MTIzPC9kaXY+e3svdGVzdGluZ319JywgJzxkaXYgaWQ9XCJ0ZXN0XCI+MTIzPC9kaXY+Jyk7XG59KTtcblxudGVzdChcIkEgYmxvY2sgaGVscGVyIGNhbiBwYXNzIGEgY29udGV4dCB0byBiZSB1c2VkIGluIHRoZSBjaGlsZFwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCA9IHsgdGl0bGU6ICdSYWlscyBpcyBvbWFrYXNlJyB9O1xuICAgIHJldHVybiBvcHRpb25zLnRlbXBsYXRlLnJlbmRlcihjb250ZXh0KTtcbiAgfSk7XG5cbiAgY29tcGlsZXNUbygne3sjdGVzdGluZ319PGRpdiBpZD1cInRlc3RcIj57e3RpdGxlfX08L2Rpdj57ey90ZXN0aW5nfX0nLCAnPGRpdiBpZD1cInRlc3RcIj5SYWlscyBpcyBvbWFrYXNlPC9kaXY+Jyk7XG59KTtcblxudGVzdChcIkJsb2NrIGhlbHBlcnMgcmVjZWl2ZSBoYXNoIGFyZ3VtZW50c1wiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gpIHtcbiAgICBpZiAoaGFzaC50cnV0aCkge1xuICAgICAgcmV0dXJuIHRoaXMueWllbGQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbXBpbGVzVG8oJ3t7I3Rlc3RpbmcgdHJ1dGg9dHJ1ZX19PHA+WWVwITwvcD57ey90ZXN0aW5nfX17eyN0ZXN0aW5nIHRydXRoPWZhbHNlfX08cD5Ob3BlITwvcD57ey90ZXN0aW5nfX0nLCAnPHA+WWVwITwvcD48IS0tLS0+Jyk7XG59KTtcblxudGVzdChcIk5vZGUgaGVscGVycyBjYW4gbW9kaWZ5IHRoZSBub2RlXCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlckhlbHBlcigndGVzdGluZycsIGZ1bmN0aW9uKHBhcmFtcywgaGFzaCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3pvbWcnLCAnem9tZycpO1xuICB9KTtcblxuICBjb21waWxlc1RvKCc8ZGl2IHt7dGVzdGluZ319Pk5vZGUgaGVscGVyczwvZGl2PicsICc8ZGl2IHpvbWc9XCJ6b21nXCI+Tm9kZSBoZWxwZXJzPC9kaXY+Jyk7XG59KTtcblxudGVzdChcIk5vZGUgaGVscGVycyBjYW4gbW9kaWZ5IHRoZSBub2RlIGFmdGVyIG9uZSBub2RlIGFwcGVuZGVkIGJ5IHRvcC1sZXZlbCBoZWxwZXJcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0b3AtaGVscGVyJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgfSk7XG4gIHJlZ2lzdGVySGVscGVyKCdhdHRyLWhlbHBlcicsIGZ1bmN0aW9uKHBhcmFtcywgaGFzaCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3pvbWcnLCAnem9tZycpO1xuICB9KTtcblxuICBjb21waWxlc1RvKCc8ZGl2IHt7YXR0ci1oZWxwZXJ9fT5Ob2RlIGhlbHBlcnM8L2Rpdj57e3RvcC1oZWxwZXJ9fScsICc8ZGl2IHpvbWc9XCJ6b21nXCI+Tm9kZSBoZWxwZXJzPC9kaXY+PHNwYW4+PC9zcGFuPicpO1xufSk7XG5cbnRlc3QoXCJOb2RlIGhlbHBlcnMgY2FuIG1vZGlmeSB0aGUgbm9kZSBhZnRlciBvbmUgbm9kZSBwcmVwZW5kZWQgYnkgdG9wLWxldmVsIGhlbHBlclwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3RvcC1oZWxwZXInLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICB9KTtcbiAgcmVnaXN0ZXJIZWxwZXIoJ2F0dHItaGVscGVyJywgZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucy5lbGVtZW50LnNldEF0dHJpYnV0ZSgnem9tZycsICd6b21nJyk7XG4gIH0pO1xuXG4gIGNvbXBpbGVzVG8oJ3t7dG9wLWhlbHBlcn19PGRpdiB7e2F0dHItaGVscGVyfX0+Tm9kZSBoZWxwZXJzPC9kaXY+JywgJzxzcGFuPjwvc3Bhbj48ZGl2IHpvbWc9XCJ6b21nXCI+Tm9kZSBoZWxwZXJzPC9kaXY+Jyk7XG59KTtcblxudGVzdChcIk5vZGUgaGVscGVycyBjYW4gbW9kaWZ5IHRoZSBub2RlIGFmdGVyIG1hbnkgbm9kZXMgcmV0dXJuZWQgZnJvbSB0b3AtbGV2ZWwgaGVscGVyXCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlckhlbHBlcigndG9wLWhlbHBlcicsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIGZyYWcuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpKTtcbiAgICBmcmFnLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSk7XG4gICAgcmV0dXJuIGZyYWc7XG4gIH0pO1xuICByZWdpc3RlckhlbHBlcignYXR0ci1oZWxwZXInLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zLmVsZW1lbnQuc2V0QXR0cmlidXRlKCd6b21nJywgJ3pvbWcnKTtcbiAgfSk7XG5cbiAgY29tcGlsZXNUbyhcbiAgICAne3t0b3AtaGVscGVyfX08ZGl2IHt7YXR0ci1oZWxwZXJ9fT5Ob2RlIGhlbHBlcnM8L2Rpdj4nLFxuICAgICc8c3Bhbj48L3NwYW4+PHNwYW4+PC9zcGFuPjxkaXYgem9tZz1cInpvbWdcIj5Ob2RlIGhlbHBlcnM8L2Rpdj4nICk7XG59KTtcblxudGVzdChcIk5vZGUgaGVscGVycyBjYW4gYmUgdXNlZCBmb3IgYXR0cmlidXRlIGJpbmRpbmdzXCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlckhlbHBlcigndGVzdGluZycsIGZ1bmN0aW9uKHBhcmFtcywgaGFzaCwgb3B0aW9ucykge1xuICAgIHZhciB2YWx1ZSA9IGhhc2guaHJlZixcbiAgICAgICAgZWxlbWVudCA9IG9wdGlvbnMuZWxlbWVudDtcblxuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdocmVmJywgdmFsdWUpO1xuICB9KTtcblxuICB2YXIgb2JqZWN0ID0geyB1cmw6ICdsaW5reS5odG1sJyB9O1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8YSB7e3Rlc3RpbmcgaHJlZj11cmx9fT5saW5reTwvYT4nKTtcbiAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlLnJlbmRlcihvYmplY3QsIGVudik7XG5cbiAgZXF1YWxUb2tlbnMocmVzdWx0LmZyYWdtZW50LCAnPGEgaHJlZj1cImxpbmt5Lmh0bWxcIj5saW5reTwvYT4nKTtcbiAgb2JqZWN0LnVybCA9ICd6aXBweS5odG1sJztcblxuICByZXN1bHQuZGlydHkoKTtcbiAgcmVzdWx0LnJldmFsaWRhdGUoKTtcblxuICBlcXVhbFRva2VucyhyZXN1bHQuZnJhZ21lbnQsICc8YSBocmVmPVwiemlwcHkuaHRtbFwiPmxpbmt5PC9hPicpO1xufSk7XG5cblxudGVzdCgnQ29tcG9uZW50cyAtIENhbGxlZCBhcyBoZWxwZXJzJywgZnVuY3Rpb24gKCkge1xuICByZWdpc3RlckhlbHBlcigneC1hcHBlbmQnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gpIHtcbiAgICBRVW5pdC5kZWVwRXF1YWwoaGFzaCwgeyB0ZXh0OiBcImRlXCIgfSk7XG4gICAgdGhpcy55aWVsZCgpO1xuICB9KTtcbiAgdmFyIG9iamVjdCA9IHsgYmFyOiAnZScsIGJhejogJ2MnIH07XG4gIGNvbXBpbGVzVG8oJ2E8eC1hcHBlbmQgdGV4dD1cImR7e2Jhcn19XCI+Ynt7YmF6fX08L3gtYXBwZW5kPmYnLCdhYmNmJywgb2JqZWN0KTtcbn0pO1xuXG50ZXN0KCdDb21wb25lbnRzIC0gVW5rbm93biBoZWxwZXJzIGZhbGwgYmFjayB0byBlbGVtZW50cycsIGZ1bmN0aW9uICgpIHtcbiAgdmFyIG9iamVjdCA9IHsgc2l6ZTogJ21lZCcsIGZvbzogJ2InIH07XG4gIGNvbXBpbGVzVG8oJzx4LWJhciBjbGFzcz1cImJ0bi17e3NpemV9fVwiPmF7e2Zvb319YzwveC1iYXI+JywnPHgtYmFyIGNsYXNzPVwiYnRuLW1lZFwiPmFiYzwveC1iYXI+Jywgb2JqZWN0KTtcbn0pO1xuXG50ZXN0KCdDb21wb25lbnRzIC0gVGV4dC1vbmx5IGF0dHJpYnV0ZXMgd29yaycsIGZ1bmN0aW9uICgpIHtcbiAgdmFyIG9iamVjdCA9IHsgZm9vOiAncXV4JyB9O1xuICBjb21waWxlc1RvKCc8eC1iYXIgaWQ9XCJ0ZXN0XCI+e3tmb299fTwveC1iYXI+JywnPHgtYmFyIGlkPVwidGVzdFwiPnF1eDwveC1iYXI+Jywgb2JqZWN0KTtcbn0pO1xuXG50ZXN0KCdDb21wb25lbnRzIC0gRW1wdHkgY29tcG9uZW50cyB3b3JrJywgZnVuY3Rpb24gKCkge1xuICBjb21waWxlc1RvKCc8eC1iYXI+PC94LWJhcj4nLCc8eC1iYXI+PC94LWJhcj4nLCB7fSk7XG59KTtcblxudGVzdCgnQ29tcG9uZW50cyAtIFRleHQtb25seSBkYXNoZWQgYXR0cmlidXRlcyB3b3JrJywgZnVuY3Rpb24gKCkge1xuICB2YXIgb2JqZWN0ID0geyBmb286ICdxdXgnIH07XG4gIGNvbXBpbGVzVG8oJzx4LWJhciBhcmlhLWxhYmVsPVwiZm9vXCIgaWQ9XCJ0ZXN0XCI+e3tmb299fTwveC1iYXI+JywnPHgtYmFyIGFyaWEtbGFiZWw9XCJmb29cIiBpZD1cInRlc3RcIj5xdXg8L3gtYmFyPicsIG9iamVjdCk7XG59KTtcblxudGVzdCgnUmVwYWlyZWQgdGV4dCBub2RlcyBhcmUgZW5zdXJlZCBpbiB0aGUgcmlnaHQgcGxhY2UnLCBmdW5jdGlvbiAoKSB7XG4gIHZhciBvYmplY3QgPSB7IGE6IFwiQVwiLCBiOiBcIkJcIiwgYzogXCJDXCIsIGQ6IFwiRFwiIH07XG4gIGNvbXBpbGVzVG8oJ3t7YX19IHt7Yn19JywgJ0EgQicsIG9iamVjdCk7XG4gIGNvbXBpbGVzVG8oJzxkaXY+e3thfX17e2J9fXt7Y319d2F0e3tkfX08L2Rpdj4nLCAnPGRpdj5BQkN3YXREPC9kaXY+Jywgb2JqZWN0KTtcbiAgY29tcGlsZXNUbygne3thfX17e2J9fTxpbWc+PGltZz48aW1nPjxpbWc+JywgJ0FCPGltZz48aW1nPjxpbWc+PGltZz4nLCBvYmplY3QpO1xufSk7XG5cbnRlc3QoXCJTaW1wbGUgZWxlbWVudHMgY2FuIGhhdmUgZGFzaGVkIGF0dHJpYnV0ZXNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8ZGl2IGFyaWEtbGFiZWw9J2Zvbyc+Y29udGVudDwvZGl2PlwiKTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50O1xuXG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCAnPGRpdiBhcmlhLWxhYmVsPVwiZm9vXCI+Y29udGVudDwvZGl2PicpO1xufSk7XG5cblFVbml0LnNraXAoXCJCbG9jayBwYXJhbXNcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCdhJywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy55aWVsZEluKGNvbXBpbGUoXCJBKHt7eWllbGQgJ1cnICdYMSd9fSlcIikpO1xuICB9KTtcbiAgcmVnaXN0ZXJIZWxwZXIoJ2InLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnlpZWxkSW4oY29tcGlsZShcIkIoe3t5aWVsZCAnWDInICdZJ319KVwiKSk7XG4gIH0pO1xuICByZWdpc3RlckhlbHBlcignYycsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueWllbGRJbihjb21waWxlKFwiQyh7e3lpZWxkICdaJ319KVwiKSk7XG4gIH0pO1xuICB2YXIgdCA9ICd7eyNhIGFzIHx3IHh8fX17e3d9fSx7e3h9fSB7eyNiIGFzIHx4IHl8fX17e3h9fSx7e3l9fXt7L2J9fSB7e3d9fSx7e3h9fSB7eyNjIGFzIHx6fH19e3t4fX0se3t6fX17ey9jfX17ey9hfX0nO1xuICBjb21waWxlc1RvKHQsICdBKFcsWDEgQihYMixZKSBXLFgxIEMoWDEsWikpJywge30pO1xufSk7XG5cbnRlc3QoXCJCbG9jayBwYXJhbXMgLSBIZWxwZXIgc2hvdWxkIGtub3cgaG93IG1hbnkgYmxvY2sgcGFyYW1zIGl0IHdhcyBjYWxsZWQgd2l0aFwiLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDQpO1xuXG4gIHJlZ2lzdGVySGVscGVyKCdjb3VudC1ibG9jay1wYXJhbXMnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICBlcXVhbChvcHRpb25zLnRlbXBsYXRlLmFyaXR5LCBoYXNoLmNvdW50LCAnSGVscGVycyBzaG91bGQgcmVjZWl2ZSB0aGUgY29ycmVjdCBudW1iZXIgb2YgYmxvY2sgcGFyYW1zIGluIG9wdGlvbnMudGVtcGxhdGUuYmxvY2tQYXJhbXMuJyk7XG4gIH0pO1xuXG4gIGNvbXBpbGUoJ3t7I2NvdW50LWJsb2NrLXBhcmFtcyBjb3VudD0wfX17ey9jb3VudC1ibG9jay1wYXJhbXN9fScpLnJlbmRlcih7fSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pO1xuICBjb21waWxlKCd7eyNjb3VudC1ibG9jay1wYXJhbXMgY291bnQ9MSBhcyB8eHx9fXt7L2NvdW50LWJsb2NrLXBhcmFtc319JykucmVuZGVyKHt9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSk7XG4gIGNvbXBpbGUoJ3t7I2NvdW50LWJsb2NrLXBhcmFtcyBjb3VudD0yIGFzIHx4IHl8fX17ey9jb3VudC1ibG9jay1wYXJhbXN9fScpLnJlbmRlcih7fSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pO1xuICBjb21waWxlKCd7eyNjb3VudC1ibG9jay1wYXJhbXMgY291bnQ9MyBhcyB8eCB5IHp8fX17ey9jb3VudC1ibG9jay1wYXJhbXN9fScpLnJlbmRlcih7fSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pO1xufSk7XG5cblFVbml0LnNraXAoJ0Jsb2NrIHBhcmFtcyBpbiBIVE1MIHN5bnRheCcsIGZ1bmN0aW9uICgpIHtcbiAgdmFyIGxheW91dCA9IGNvbXBpbGUoXCJCQVIoe3t5aWVsZCAnWGVyeGVzJyAnWW9yaycgJ1plZCd9fSlcIik7XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ3gtYmFyJywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy55aWVsZEluKGxheW91dCk7XG4gIH0pO1xuICBjb21waWxlc1RvKCc8eC1iYXIgYXMgfHggeSB6ZWV8Pnt7emVlfX0se3t5fX0se3t4fX08L3gtYmFyPicsICdCQVIoWmVkLFlvcmssWGVyeGVzKScsIHt9KTtcbn0pO1xuXG50ZXN0KCdCbG9jayBwYXJhbXMgaW4gSFRNTCBzeW50YXggLSBUaHJvd3MgZXhjZXB0aW9uIGlmIGdpdmVuIHplcm8gcGFyYW1ldGVycycsIGZ1bmN0aW9uICgpIHtcbiAgZXhwZWN0KDIpO1xuXG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKCc8eC1iYXIgYXMgfHw+Zm9vPC94LWJhcj4nKTtcbiAgfSwgL0Nhbm5vdCB1c2UgemVybyBibG9jayBwYXJhbWV0ZXJzOiAnYXMgXFx8XFx8Jy8pO1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZSgnPHgtYmFyIGFzIHwgfD5mb288L3gtYmFyPicpO1xuICB9LCAvQ2Fubm90IHVzZSB6ZXJvIGJsb2NrIHBhcmFtZXRlcnM6ICdhcyBcXHwgXFx8Jy8pO1xufSk7XG5cblxudGVzdCgnQmxvY2sgcGFyYW1zIGluIEhUTUwgc3ludGF4IC0gV29ya3Mgd2l0aCBhIHNpbmdsZSBwYXJhbWV0ZXInLCBmdW5jdGlvbiAoKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd4LWJhcicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnlpZWxkKFsnWGVyeGVzJ10pO1xuICB9KTtcbiAgY29tcGlsZXNUbygnPHgtYmFyIGFzIHx4fD57e3h9fTwveC1iYXI+JywgJ1hlcnhlcycsIHt9KTtcbn0pO1xuXG50ZXN0KCdCbG9jayBwYXJhbXMgaW4gSFRNTCBzeW50YXggLSBXb3JrcyB3aXRoIG90aGVyIGF0dHJpYnV0ZXMnLCBmdW5jdGlvbiAoKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd4LWJhcicsIGZ1bmN0aW9uKHBhcmFtcywgaGFzaCkge1xuICAgIGRlZXBFcXVhbChoYXNoLCB7Zmlyc3ROYW1lOiAnQWxpY2UnLCBsYXN0TmFtZTogJ1NtaXRoJ30pO1xuICB9KTtcbiAgY29tcGlsZSgnPHgtYmFyIGZpcnN0TmFtZT1cIkFsaWNlXCIgbGFzdE5hbWU9XCJTbWl0aFwiIGFzIHx4IHl8PjwveC1iYXI+JykucmVuZGVyKHt9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSk7XG59KTtcblxudGVzdCgnQmxvY2sgcGFyYW1zIGluIEhUTUwgc3ludGF4IC0gSWdub3JlcyB3aGl0ZXNwYWNlJywgZnVuY3Rpb24gKCkge1xuICBleHBlY3QoMyk7XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ3gtYmFyJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoWydYZXJ4ZXMnLCAnWW9yayddKTtcbiAgfSk7XG4gIGNvbXBpbGVzVG8oJzx4LWJhciBhcyB8eCB5fD57e3h9fSx7e3l9fTwveC1iYXI+JywgJ1hlcnhlcyxZb3JrJywge30pO1xuICBjb21waWxlc1RvKCc8eC1iYXIgYXMgfCB4IHl8Pnt7eH19LHt7eX19PC94LWJhcj4nLCAnWGVyeGVzLFlvcmsnLCB7fSk7XG4gIGNvbXBpbGVzVG8oJzx4LWJhciBhcyB8IHggeSB8Pnt7eH19LHt7eX19PC94LWJhcj4nLCAnWGVyeGVzLFlvcmsnLCB7fSk7XG59KTtcblxudGVzdCgnQmxvY2sgcGFyYW1zIGluIEhUTUwgc3ludGF4IC0gSGVscGVyIHNob3VsZCBrbm93IGhvdyBtYW55IGJsb2NrIHBhcmFtcyBpdCB3YXMgY2FsbGVkIHdpdGgnLCBmdW5jdGlvbiAoKSB7XG4gIGV4cGVjdCg0KTtcblxuICByZWdpc3RlckhlbHBlcignY291bnQtYmxvY2stcGFyYW1zJywgZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zKSB7XG4gICAgZXF1YWwob3B0aW9ucy50ZW1wbGF0ZS5hcml0eSwgcGFyc2VJbnQoaGFzaC5jb3VudCwgMTApLCAnSGVscGVycyBzaG91bGQgcmVjZWl2ZSB0aGUgY29ycmVjdCBudW1iZXIgb2YgYmxvY2sgcGFyYW1zIGluIG9wdGlvbnMudGVtcGxhdGUuYmxvY2tQYXJhbXMuJyk7XG4gIH0pO1xuXG4gIGNvbXBpbGUoJzxjb3VudC1ibG9jay1wYXJhbXMgY291bnQ9XCIwXCI+PC9jb3VudC1ibG9jay1wYXJhbXM+JykucmVuZGVyKHsgY291bnQ6IDAgfSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pO1xuICBjb21waWxlKCc8Y291bnQtYmxvY2stcGFyYW1zIGNvdW50PVwiMVwiIGFzIHx4fD48L2NvdW50LWJsb2NrLXBhcmFtcz4nKS5yZW5kZXIoeyBjb3VudDogMSB9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSk7XG4gIGNvbXBpbGUoJzxjb3VudC1ibG9jay1wYXJhbXMgY291bnQ9XCIyXCIgYXMgfHggeXw+PC9jb3VudC1ibG9jay1wYXJhbXM+JykucmVuZGVyKHsgY291bnQ6IDIgfSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pO1xuICBjb21waWxlKCc8Y291bnQtYmxvY2stcGFyYW1zIGNvdW50PVwiM1wiIGFzIHx4IHkgenw+PC9jb3VudC1ibG9jay1wYXJhbXM+JykucmVuZGVyKHsgY291bnQ6IDMgfSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pO1xufSk7XG5cbnRlc3QoXCJCbG9jayBwYXJhbXMgaW4gSFRNTCBzeW50YXggLSBUaHJvd3MgYW4gZXJyb3Igb24gaW52YWxpZCBibG9jayBwYXJhbXMgc3ludGF4XCIsIGZ1bmN0aW9uKCkge1xuICBleHBlY3QoMyk7XG5cbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoJzx4LWJhciBhcyB8eCB5Pnt7eH19LHt7eX19PC94LWJhcj4nKTtcbiAgfSwgL0ludmFsaWQgYmxvY2sgcGFyYW1ldGVycyBzeW50YXg6ICdhcyB8eCB5Jy8pO1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZSgnPHgtYmFyIGFzIHx4fCB5Pnt7eH19LHt7eX19PC94LWJhcj4nKTtcbiAgfSwgL0ludmFsaWQgYmxvY2sgcGFyYW1ldGVycyBzeW50YXg6ICdhcyBcXHx4XFx8IHknLyk7XG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKCc8eC1iYXIgYXMgfHh8IHl8Pnt7eH19LHt7eX19PC94LWJhcj4nKTtcbiAgfSwgL0ludmFsaWQgYmxvY2sgcGFyYW1ldGVycyBzeW50YXg6ICdhcyBcXHx4XFx8IHlcXHwnLyk7XG59KTtcblxudGVzdChcIkJsb2NrIHBhcmFtcyBpbiBIVE1MIHN5bnRheCAtIFRocm93cyBhbiBlcnJvciBvbiBpbnZhbGlkIGlkZW50aWZpZXJzIGZvciBwYXJhbXNcIiwgZnVuY3Rpb24oKSB7XG4gIGV4cGVjdCgzKTtcblxuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZSgnPHgtYmFyIGFzIHx4IGZvby5iYXJ8PjwveC1iYXI+Jyk7XG4gIH0sIC9JbnZhbGlkIGlkZW50aWZpZXIgZm9yIGJsb2NrIHBhcmFtZXRlcnM6ICdmb29cXC5iYXInIGluICdhcyBcXHx4IGZvb1xcLmJhcnwnLyk7XG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKCc8eC1iYXIgYXMgfHggXCJmb29cInw+PC94LWJhcj4nKTtcbiAgfSwgL0ludmFsaWQgaWRlbnRpZmllciBmb3IgYmxvY2sgcGFyYW1ldGVyczogJ1wiZm9vXCInIGluICdhcyBcXHx4IFwiZm9vXCJ8Jy8pO1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZSgnPHgtYmFyIGFzIHxmb29bYmFyXXw+PC94LWJhcj4nKTtcbiAgfSwgL0ludmFsaWQgaWRlbnRpZmllciBmb3IgYmxvY2sgcGFyYW1ldGVyczogJ2Zvb1xcW2JhclxcXScgaW4gJ2FzIFxcfGZvb1xcW2JhclxcXVxcfCcvKTtcbn0pO1xuXG5RVW5pdC5tb2R1bGUoXCJIVE1MLWJhc2VkIGNvbXBpbGVyIChpbnZhbGlkIEhUTUwgZXJyb3JzKVwiLCB7XG4gIGJlZm9yZUVhY2g6IGNvbW1vblNldHVwXG59KTtcblxudGVzdChcIkEgaGVscGZ1bCBlcnJvciBtZXNzYWdlIGlzIHByb3ZpZGVkIGZvciB1bmNsb3NlZCBlbGVtZW50c1wiLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDIpO1xuXG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKCdcXG48ZGl2IGNsYXNzPVwibXktZGl2XCIgXFxuIGZvbz17e2Jhcn19PlxcbjxzcGFuPlxcbjwvc3Bhbj5cXG4nKTtcbiAgfSwgL1VuY2xvc2VkIGVsZW1lbnQgYGRpdmAgXFwob24gbGluZSAyXFwpXFwuLyk7XG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKCdcXG48ZGl2IGNsYXNzPVwibXktZGl2XCI+XFxuPHNwYW4+XFxuJyk7XG4gIH0sIC9VbmNsb3NlZCBlbGVtZW50IGBzcGFuYCBcXChvbiBsaW5lIDNcXClcXC4vKTtcbn0pO1xuXG50ZXN0KFwiQSBoZWxwZnVsIGVycm9yIG1lc3NhZ2UgaXMgcHJvdmlkZWQgZm9yIHVubWF0Y2hlZCBlbmQgdGFnc1wiLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDIpO1xuXG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKFwiPC9wPlwiKTtcbiAgfSwgL0Nsb3NpbmcgdGFnIGBwYCBcXChvbiBsaW5lIDFcXCkgd2l0aG91dCBhbiBvcGVuIHRhZ1xcLi8pO1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZShcIjxlbT57eyBmb28gfX08L2VtPiBcXG4ge3sgYmFyIH19XFxuPC9kaXY+XCIpO1xuICB9LCAvQ2xvc2luZyB0YWcgYGRpdmAgXFwob24gbGluZSAzXFwpIHdpdGhvdXQgYW4gb3BlbiB0YWdcXC4vKTtcbn0pO1xuXG50ZXN0KFwiQSBoZWxwZnVsIGVycm9yIG1lc3NhZ2UgaXMgcHJvdmlkZWQgZm9yIGVuZCB0YWdzIGZvciB2b2lkIGVsZW1lbnRzXCIsIGZ1bmN0aW9uKCkge1xuICBleHBlY3QoMyk7XG5cbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoXCI8aW5wdXQ+PC9pbnB1dD5cIik7XG4gIH0sIC9JbnZhbGlkIGVuZCB0YWcgYGlucHV0YCBcXChvbiBsaW5lIDFcXCkgXFwodm9pZCBlbGVtZW50cyBjYW5ub3QgaGF2ZSBlbmQgdGFnc1xcKS4vKTtcbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoXCI8ZGl2PlxcbiAgPGlucHV0PjwvaW5wdXQ+XFxuPC9kaXY+XCIpO1xuICB9LCAvSW52YWxpZCBlbmQgdGFnIGBpbnB1dGAgXFwob24gbGluZSAyXFwpIFxcKHZvaWQgZWxlbWVudHMgY2Fubm90IGhhdmUgZW5kIHRhZ3NcXCkuLyk7XG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKFwiXFxuXFxuPC9icj5cIik7XG4gIH0sIC9JbnZhbGlkIGVuZCB0YWcgYGJyYCBcXChvbiBsaW5lIDNcXCkgXFwodm9pZCBlbGVtZW50cyBjYW5ub3QgaGF2ZSBlbmQgdGFnc1xcKS4vKTtcbn0pO1xuXG50ZXN0KFwiQSBoZWxwZnVsIGVycm9yIG1lc3NhZ2UgaXMgcHJvdmlkZWQgZm9yIGVuZCB0YWdzIHdpdGggYXR0cmlidXRlc1wiLCBmdW5jdGlvbigpIHtcbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoJzxkaXY+XFxuU29tZXRoaW5nXFxuXFxuPC9kaXYgZm9vPVwiYmFyXCI+Jyk7XG4gIH0sIC9JbnZhbGlkIGVuZCB0YWc6IGNsb3NpbmcgdGFnIG11c3Qgbm90IGhhdmUgYXR0cmlidXRlcywgaW4gYGRpdmAgXFwob24gbGluZSA0XFwpXFwuLyk7XG59KTtcblxudGVzdChcIkEgaGVscGZ1bCBlcnJvciBtZXNzYWdlIGlzIHByb3ZpZGVkIGZvciBtaXNtYXRjaGVkIHN0YXJ0L2VuZCB0YWdzXCIsIGZ1bmN0aW9uKCkge1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZShcIjxkaXY+XFxuPHA+XFxuU29tZXRoaW5nXFxuXFxuPC9kaXY+XCIpO1xuICB9LCAvQ2xvc2luZyB0YWcgYGRpdmAgXFwob24gbGluZSA1XFwpIGRpZCBub3QgbWF0Y2ggbGFzdCBvcGVuIHRhZyBgcGAgXFwob24gbGluZSAyXFwpXFwuLyk7XG59KTtcblxudGVzdChcImVycm9yIGxpbmUgbnVtYmVycyBpbmNsdWRlIGNvbW1lbnQgbGluZXNcIiwgZnVuY3Rpb24oKSB7XG4gIFFVbml0LnRocm93cyhmdW5jdGlvbigpIHtcbiAgICBjb21waWxlKFwiPGRpdj5cXG48cD5cXG57eyEgc29tZSBjb21tZW50fX1cXG5cXG48L2Rpdj5cIik7XG4gIH0sIC9DbG9zaW5nIHRhZyBgZGl2YCBcXChvbiBsaW5lIDVcXCkgZGlkIG5vdCBtYXRjaCBsYXN0IG9wZW4gdGFnIGBwYCBcXChvbiBsaW5lIDJcXClcXC4vKTtcbn0pO1xuXG50ZXN0KFwiZXJyb3IgbGluZSBudW1iZXJzIGluY2x1ZGUgbXVzdGFjaGUgb25seSBsaW5lc1wiLCBmdW5jdGlvbigpIHtcbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoXCI8ZGl2PlxcbjxwPlxcbnt7c29tZVByb3B9fVxcblxcbjwvZGl2PlwiKTtcbiAgfSwgL0Nsb3NpbmcgdGFnIGBkaXZgIFxcKG9uIGxpbmUgNVxcKSBkaWQgbm90IG1hdGNoIGxhc3Qgb3BlbiB0YWcgYHBgIFxcKG9uIGxpbmUgMlxcKVxcLi8pO1xufSk7XG5cbnRlc3QoXCJlcnJvciBsaW5lIG51bWJlcnMgaW5jbHVkZSBibG9jayBsaW5lc1wiLCBmdW5jdGlvbigpIHtcbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoXCI8ZGl2PlxcbjxwPlxcbnt7I3NvbWUtY29tbWVudH19XFxue3svc29tZS1jb21tZW50fX1cXG48L2Rpdj5cIik7XG4gIH0sIC9DbG9zaW5nIHRhZyBgZGl2YCBcXChvbiBsaW5lIDVcXCkgZGlkIG5vdCBtYXRjaCBsYXN0IG9wZW4gdGFnIGBwYCBcXChvbiBsaW5lIDJcXClcXC4vKTtcbn0pO1xuXG50ZXN0KFwiZXJyb3IgbGluZSBudW1iZXJzIGluY2x1ZGUgd2hpdGVzcGFjZSBjb250cm9sIG11c3RhY2hlc1wiLCBmdW5jdGlvbigpIHtcbiAgUVVuaXQudGhyb3dzKGZ1bmN0aW9uKCkge1xuICAgIGNvbXBpbGUoXCI8ZGl2PlxcbjxwPlxcbnt7c29tZVByb3B+fX1cXG5cXG48L2Rpdj57e3NvbWUtY29tbWVudH19XCIpO1xuICB9LCAvQ2xvc2luZyB0YWcgYGRpdmAgXFwob24gbGluZSA1XFwpIGRpZCBub3QgbWF0Y2ggbGFzdCBvcGVuIHRhZyBgcGAgXFwob24gbGluZSAyXFwpXFwuLyk7XG59KTtcblxudGVzdChcImVycm9yIGxpbmUgbnVtYmVycyBpbmNsdWRlIG11bHRpcGxlIG11c3RhY2hlIGxpbmVzXCIsIGZ1bmN0aW9uKCkge1xuICBRVW5pdC50aHJvd3MoZnVuY3Rpb24oKSB7XG4gICAgY29tcGlsZShcIjxkaXY+XFxuPHA+XFxue3tzb21lLWNvbW1lbnR9fTwvZGl2Pnt7c29tZS1jb21tZW50fX1cIik7XG4gIH0sIC9DbG9zaW5nIHRhZyBgZGl2YCBcXChvbiBsaW5lIDNcXCkgZGlkIG5vdCBtYXRjaCBsYXN0IG9wZW4gdGFnIGBwYCBcXChvbiBsaW5lIDJcXClcXC4vKTtcbn0pO1xuXG5pZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykubmFtZXNwYWNlVVJJKSB7XG5cblFVbml0Lm1vZHVsZShcIkhUTUwtYmFzZWQgY29tcGlsZXIgKG91dHB1dCwgc3ZnKVwiLCB7XG4gIGJlZm9yZUVhY2g6IGNvbW1vblNldHVwXG59KTtcblxudGVzdChcIlNpbXBsZSBlbGVtZW50cyBjYW4gaGF2ZSBuYW1lc3BhY2VkIGF0dHJpYnV0ZXNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8c3ZnIHhsaW5rOnRpdGxlPSdzdmctdGl0bGUnPmNvbnRlbnQ8L3N2Zz5cIik7XG4gIHZhciBzdmdOb2RlID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWxUb2tlbnMoc3ZnTm9kZSwgJzxzdmcgeGxpbms6dGl0bGU9XCJzdmctdGl0bGVcIj5jb250ZW50PC9zdmc+Jyk7XG4gIGVxdWFsKHN2Z05vZGUuYXR0cmlidXRlc1swXS5uYW1lc3BhY2VVUkksICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyk7XG59KTtcblxudGVzdChcIlNpbXBsZSBlbGVtZW50cyBjYW4gaGF2ZSBib3VuZCBuYW1lc3BhY2VkIGF0dHJpYnV0ZXNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCI8c3ZnIHhsaW5rOnRpdGxlPXt7dGl0bGV9fT5jb250ZW50PC9zdmc+XCIpO1xuICB2YXIgc3ZnTm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7dGl0bGU6ICdzdmctdGl0bGUnfSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIGVxdWFsVG9rZW5zKHN2Z05vZGUsICc8c3ZnIHhsaW5rOnRpdGxlPVwic3ZnLXRpdGxlXCI+Y29udGVudDwvc3ZnPicpO1xuICBlcXVhbChzdmdOb2RlLmF0dHJpYnV0ZXNbMF0ubmFtZXNwYWNlVVJJLCAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycpO1xufSk7XG5cbnRlc3QoXCJTVkcgZWxlbWVudCBjYW4gaGF2ZSBjYXBpdGFsaXplZCBhdHRyaWJ1dGVzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKFwiPHN2ZyB2aWV3Qm94PVxcXCIwIDAgMCAwXFxcIj48L3N2Zz5cIik7XG4gIHZhciBzdmdOb2RlID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gIGVxdWFsVG9rZW5zKHN2Z05vZGUsICc8c3ZnIHZpZXdCb3g9XFxcIjAgMCAwIDBcXFwiPjwvc3ZnPicpO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBuYW1lc3BhY2VkIGVsZW1lbnRzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgaHRtbCA9ICc8c3ZnPjxwYXRoIHN0cm9rZT1cImJsYWNrXCIgZD1cIk0gMCAwIEwgMTAwIDEwMFwiPjwvcGF0aD48L3N2Zz4nO1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKGh0bWwpO1xuICB2YXIgc3ZnTm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIGVxdWFsKHN2Z05vZGUubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UsIFwiY3JlYXRlcyB0aGUgc3ZnIGVsZW1lbnQgd2l0aCBhIG5hbWVzcGFjZVwiKTtcbiAgZXF1YWxUb2tlbnMoc3ZnTm9kZSwgaHRtbCk7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBzZXRzIG5hbWVzcGFjZXMgb24gbmVzdGVkIG5hbWVzcGFjZWQgZWxlbWVudHNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBodG1sID0gJzxzdmc+PHBhdGggc3Ryb2tlPVwiYmxhY2tcIiBkPVwiTSAwIDAgTCAxMDAgMTAwXCI+PC9wYXRoPjwvc3ZnPic7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoaHRtbCk7XG4gIHZhciBzdmdOb2RlID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWwoIHN2Z05vZGUuY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSxcbiAgICAgICAgIFwiY3JlYXRlcyB0aGUgcGF0aCBlbGVtZW50IHdpdGggYSBuYW1lc3BhY2VcIiApO1xuICBlcXVhbFRva2VucyhzdmdOb2RlLCBodG1sKTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIHNldHMgYSBuYW1lc3BhY2Ugb24gYW4gSFRNTCBpbnRlZ3JhdGlvbiBwb2ludFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGh0bWwgPSAnPHN2Zz48Zm9yZWlnbk9iamVjdD5IaTwvZm9yZWlnbk9iamVjdD48L3N2Zz4nO1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKGh0bWwpO1xuICB2YXIgc3ZnTm9kZSA9IHRlbXBsYXRlLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudC5maXJzdENoaWxkO1xuXG4gIGVxdWFsKCBzdmdOb2RlLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAgXCJjcmVhdGVzIHRoZSBzdmcgZWxlbWVudCB3aXRoIGEgbmFtZXNwYWNlXCIgKTtcbiAgZXF1YWwoIHN2Z05vZGUuY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSxcbiAgICAgICAgIFwiY3JlYXRlcyB0aGUgZm9yZWlnbk9iamVjdCBlbGVtZW50IHdpdGggYSBuYW1lc3BhY2VcIiApO1xuICBlcXVhbFRva2VucyhzdmdOb2RlLCBodG1sKTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIGRvZXMgbm90IHNldCBhIG5hbWVzcGFjZSBvbiBhbiBlbGVtZW50IGluc2lkZSBhbiBIVE1MIGludGVncmF0aW9uIHBvaW50XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgaHRtbCA9ICc8c3ZnPjxmb3JlaWduT2JqZWN0PjxkaXY+PC9kaXY+PC9mb3JlaWduT2JqZWN0Pjwvc3ZnPic7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoaHRtbCk7XG4gIHZhciBzdmdOb2RlID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgZXF1YWwoIHN2Z05vZGUuY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzWzBdLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UsXG4gICAgICAgICBcImNyZWF0ZXMgdGhlIGRpdiBpbnNpZGUgdGhlIGZvcmVpZ25PYmplY3Qgd2l0aG91dCBhIG5hbWVzcGFjZVwiICk7XG4gIGVxdWFsVG9rZW5zKHN2Z05vZGUsIGh0bWwpO1xufSk7XG5cbnRlc3QoXCJUaGUgY29tcGlsZXIgcG9wcyBiYWNrIHRvIHRoZSBjb3JyZWN0IG5hbWVzcGFjZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGh0bWwgPSAnPHN2Zz48L3N2Zz48c3ZnPjwvc3ZnPjxkaXY+PC9kaXY+JztcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZShodG1sKTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50O1xuXG4gIGVxdWFsKCBmcmFnbWVudC5jaGlsZE5vZGVzWzBdLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAgXCJjcmVhdGVzIHRoZSBmaXJzdCBzdmcgZWxlbWVudCB3aXRoIGEgbmFtZXNwYWNlXCIgKTtcbiAgZXF1YWwoIGZyYWdtZW50LmNoaWxkTm9kZXNbMV0ubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UsXG4gICAgICAgICBcImNyZWF0ZXMgdGhlIHNlY29uZCBzdmcgZWxlbWVudCB3aXRoIGEgbmFtZXNwYWNlXCIgKTtcbiAgZXF1YWwoIGZyYWdtZW50LmNoaWxkTm9kZXNbMl0ubmFtZXNwYWNlVVJJLCB4aHRtbE5hbWVzcGFjZSxcbiAgICAgICAgIFwiY3JlYXRlcyB0aGUgZGl2IGVsZW1lbnQgd2l0aG91dCBhIG5hbWVzcGFjZVwiICk7XG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCBodG1sKTtcbn0pO1xuXG50ZXN0KFwiVGhlIGNvbXBpbGVyIHBvcHMgYmFjayB0byB0aGUgY29ycmVjdCBuYW1lc3BhY2UgZXZlbiBpZiBleGl0aW5nIGxhc3QgY2hpbGRcIiwgZnVuY3Rpb24gKCkge1xuICB2YXIgaHRtbCA9ICc8ZGl2Pjxzdmc+PC9zdmc+PC9kaXY+PGRpdj48L2Rpdj4nO1xuICB2YXIgZnJhZ21lbnQgPSBjb21waWxlKGh0bWwpLnJlbmRlcih7fSwgZW52KS5mcmFnbWVudDtcblxuICBlcXVhbChmcmFnbWVudC5maXJzdENoaWxkLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UsIFwiZmlyc3QgZGl2J3MgbmFtZXNwYWNlIGlzIHhodG1sTmFtZXNwYWNlXCIpO1xuICBlcXVhbChmcmFnbWVudC5maXJzdENoaWxkLmZpcnN0Q2hpbGQubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UsIFwic3ZnJ3MgbmFtZXNwYWNlIGlzIHN2Z05hbWVzcGFjZVwiKTtcbiAgZXF1YWwoZnJhZ21lbnQubGFzdENoaWxkLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UsIFwibGFzdCBkaXYncyBuYW1lc3BhY2UgaXMgeGh0bWxOYW1lc3BhY2VcIik7XG59KTtcblxudGVzdChcIlRoZSBjb21waWxlciBwcmVzZXJ2ZXMgY2FwaXRhbGl6YXRpb24gb2YgdGFnc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGh0bWwgPSAnPHN2Zz48bGluZWFyR3JhZGllbnQgaWQ9XCJncmFkaWVudFwiPjwvbGluZWFyR3JhZGllbnQ+PC9zdmc+JztcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZShodG1sKTtcbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHt9LCBlbnYpLmZyYWdtZW50O1xuXG4gIGVxdWFsVG9rZW5zKGZyYWdtZW50LCBodG1sKTtcbn0pO1xuXG50ZXN0KFwic3ZnIGNhbiBsaXZlIHdpdGggaHlkcmF0aW9uXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8c3ZnPjwvc3ZnPnt7bmFtZX19Jyk7XG5cbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHsgbmFtZTogJ01pbGx5JyB9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSkuZnJhZ21lbnQ7XG5cbiAgZXF1YWwoXG4gICAgZnJhZ21lbnQuY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSxcbiAgICBcInN2ZyBuYW1lc3BhY2UgaW5zaWRlIGEgYmxvY2sgaXMgcHJlc2VudFwiICk7XG59KTtcblxudGVzdChcInRvcC1sZXZlbCB1bnNhZmUgbW9ycGggdXNlcyB0aGUgY29ycmVjdCBuYW1lc3BhY2VcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxzdmc+PC9zdmc+e3t7Zm9vfX19Jyk7XG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7IGZvbzogJzxzcGFuPkZPTzwvc3Bhbj4nIH0sIGVudiwgeyBjb250ZXh0dWFsRWxlbWVudDogZG9jdW1lbnQuYm9keSB9KS5mcmFnbWVudDtcblxuICBlcXVhbChnZXRUZXh0Q29udGVudChmcmFnbWVudCksICdGT08nLCAnZWxlbWVudCBmcm9tIHVuc2FmZSBtb3JwaCBpcyBkaXNwbGF5ZWQnKTtcbiAgZXF1YWwoZnJhZ21lbnQuY2hpbGROb2Rlc1sxXS5uYW1lc3BhY2VVUkksIHhodG1sTmFtZXNwYWNlLCAnZWxlbWVudCBmcm9tIHVuc2FmZSBtb3JwaCBoYXMgY29ycmVjdCBuYW1lc3BhY2UnKTtcbn0pO1xuXG50ZXN0KFwibmVzdGVkIHVuc2FmZSBtb3JwaCB1c2VzIHRoZSBjb3JyZWN0IG5hbWVzcGFjZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPHN2Zz57e3tmb299fX08L3N2Zz48ZGl2PjwvZGl2PicpO1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoeyBmb286ICc8cGF0aD48L3BhdGg+JyB9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSkuZnJhZ21lbnQ7XG5cbiAgZXF1YWwoZnJhZ21lbnQuY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzWzBdLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAnZWxlbWVudCBmcm9tIHVuc2FmZSBtb3JwaCBoYXMgY29ycmVjdCBuYW1lc3BhY2UnKTtcbn0pO1xuXG50ZXN0KFwic3ZnIGNhbiB0YWtlIHNvbWUgaHlkcmF0aW9uXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8ZGl2Pjxzdmc+e3tuYW1lfX08L3N2Zz48L2Rpdj4nKTtcblxuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoeyBuYW1lOiAnTWlsbHknIH0sIGVudikuZnJhZ21lbnQ7XG4gIGVxdWFsKFxuICAgIGZyYWdtZW50LmZpcnN0Q2hpbGQuY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSxcbiAgICBcInN2ZyBuYW1lc3BhY2UgaW5zaWRlIGEgYmxvY2sgaXMgcHJlc2VudFwiICk7XG4gIGVxdWFsVG9rZW5zKCBmcmFnbWVudC5maXJzdENoaWxkLCAnPGRpdj48c3ZnPk1pbGx5PC9zdmc+PC9kaXY+JyxcbiAgICAgICAgICAgICBcImh0bWwgaXMgdmFsaWRcIiApO1xufSk7XG5cbnRlc3QoXCJyb290IHN2ZyBjYW4gdGFrZSBzb21lIGh5ZHJhdGlvblwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPHN2Zz57e25hbWV9fTwvc3ZnPicpO1xuICB2YXIgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5yZW5kZXIoeyBuYW1lOiAnTWlsbHknIH0sIGVudikuZnJhZ21lbnQ7XG4gIHZhciBzdmdOb2RlID0gZnJhZ21lbnQuZmlyc3RDaGlsZDtcblxuICBlcXVhbChcbiAgICBzdmdOb2RlLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgIFwic3ZnIG5hbWVzcGFjZSBpbnNpZGUgYSBibG9jayBpcyBwcmVzZW50XCIgKTtcbiAgZXF1YWxUb2tlbnMoIHN2Z05vZGUsICc8c3ZnPk1pbGx5PC9zdmc+JyxcbiAgICAgICAgICAgICBcImh0bWwgaXMgdmFsaWRcIiApO1xufSk7XG5cbnRlc3QoXCJCbG9jayBoZWxwZXIgYWxsb3dzIGludGVyaW9yIG5hbWVzcGFjZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGlzVHJ1ZSA9IHRydWU7XG5cbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNUcnVlKSB7XG4gICAgICByZXR1cm4gdGhpcy55aWVsZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlLnlpZWxkKCk7XG4gICAgfVxuICB9KTtcblxuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCd7eyN0ZXN0aW5nfX08c3ZnPjwvc3ZnPnt7ZWxzZX19PGRpdj48c3ZnPjwvc3ZnPjwvZGl2Pnt7L3Rlc3Rpbmd9fScpO1xuXG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7IGlzVHJ1ZTogdHJ1ZSB9LCBlbnYsIHsgY29udGV4dHVhbEVsZW1lbnQ6IGRvY3VtZW50LmJvZHkgfSkuZnJhZ21lbnQ7XG4gIGVxdWFsKFxuICAgIGZyYWdtZW50LmZpcnN0Q2hpbGQubmV4dFNpYmxpbmcubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UsXG4gICAgXCJzdmcgbmFtZXNwYWNlIGluc2lkZSBhIGJsb2NrIGlzIHByZXNlbnRcIiApO1xuXG4gIGlzVHJ1ZSA9IGZhbHNlO1xuICBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7IGlzVHJ1ZTogZmFsc2UgfSwgZW52LCB7IGNvbnRleHR1YWxFbGVtZW50OiBkb2N1bWVudC5ib2R5IH0pLmZyYWdtZW50O1xuICBlcXVhbChcbiAgICBmcmFnbWVudC5maXJzdENoaWxkLm5leHRTaWJsaW5nLm5hbWVzcGFjZVVSSSwgeGh0bWxOYW1lc3BhY2UsXG4gICAgXCJpbnZlcnNlIGJsb2NrIHBhdGggaGFzIGEgbm9ybWFsIG5hbWVzcGFjZVwiKTtcbiAgZXF1YWwoXG4gICAgZnJhZ21lbnQuZmlyc3RDaGlsZC5uZXh0U2libGluZy5maXJzdENoaWxkLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgIFwic3ZnIG5hbWVzcGFjZSBpbnNpZGUgYW4gZWxlbWVudCBpbnNpZGUgYSBibG9jayBpcyBwcmVzZW50XCIgKTtcbn0pO1xuXG50ZXN0KFwiQmxvY2sgaGVscGVyIGFsbG93cyBuYW1lc3BhY2UgdG8gYmxlZWQgdGhyb3VnaFwiLCBmdW5jdGlvbigpIHtcbiAgcmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy55aWVsZCgpO1xuICB9KTtcblxuICB2YXIgdGVtcGxhdGUgPSBjb21waWxlKCc8ZGl2Pjxzdmc+e3sjdGVzdGluZ319PGNpcmNsZSAvPnt7L3Rlc3Rpbmd9fTwvc3ZnPjwvZGl2PicpO1xuXG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7IGlzVHJ1ZTogdHJ1ZSB9LCBlbnYpLmZyYWdtZW50O1xuICB2YXIgc3ZnTm9kZSA9IGZyYWdtZW50LmZpcnN0Q2hpbGQuZmlyc3RDaGlsZDtcbiAgZXF1YWwoIHN2Z05vZGUubmFtZXNwYWNlVVJJLCBzdmdOYW1lc3BhY2UsXG4gICAgICAgICBcInN2ZyB0YWcgaGFzIGFuIHN2ZyBuYW1lc3BhY2VcIiApO1xuICBlcXVhbCggc3ZnTm9kZS5jaGlsZE5vZGVzWzBdLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAgXCJjaXJjbGUgdGFnIGluc2lkZSBibG9jayBpbnNpZGUgc3ZnIGhhcyBhbiBzdmcgbmFtZXNwYWNlXCIgKTtcbn0pO1xuXG50ZXN0KFwiQmxvY2sgaGVscGVyIHdpdGggcm9vdCBzdmcgYWxsb3dzIG5hbWVzcGFjZSB0byBibGVlZCB0aHJvdWdoXCIsIGZ1bmN0aW9uKCkge1xuICByZWdpc3RlckhlbHBlcigndGVzdGluZycsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnlpZWxkKCk7XG4gIH0pO1xuXG4gIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoJzxzdmc+e3sjdGVzdGluZ319PGNpcmNsZSAvPnt7L3Rlc3Rpbmd9fTwvc3ZnPicpO1xuXG4gIHZhciBmcmFnbWVudCA9IHRlbXBsYXRlLnJlbmRlcih7IGlzVHJ1ZTogdHJ1ZSB9LCBlbnYpLmZyYWdtZW50O1xuICB2YXIgc3ZnTm9kZSA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gIGVxdWFsKCBzdmdOb2RlLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAgXCJzdmcgdGFnIGhhcyBhbiBzdmcgbmFtZXNwYWNlXCIgKTtcbiAgZXF1YWwoIHN2Z05vZGUuY2hpbGROb2Rlc1swXS5uYW1lc3BhY2VVUkksIHN2Z05hbWVzcGFjZSxcbiAgICAgICAgIFwiY2lyY2xlIHRhZyBpbnNpZGUgYmxvY2sgaW5zaWRlIHN2ZyBoYXMgYW4gc3ZnIG5hbWVzcGFjZVwiICk7XG59KTtcblxudGVzdChcIkJsb2NrIGhlbHBlciB3aXRoIHJvb3QgZm9yZWlnbk9iamVjdCBhbGxvd3MgbmFtZXNwYWNlIHRvIGJsZWVkIHRocm91Z2hcIiwgZnVuY3Rpb24oKSB7XG4gIHJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMueWllbGQoKTtcbiAgfSk7XG5cbiAgdmFyIHRlbXBsYXRlID0gY29tcGlsZSgnPGZvcmVpZ25PYmplY3Q+e3sjdGVzdGluZ319PGRpdj48L2Rpdj57ey90ZXN0aW5nfX08L2ZvcmVpZ25PYmplY3Q+Jyk7XG5cbiAgdmFyIGZyYWdtZW50ID0gdGVtcGxhdGUucmVuZGVyKHsgaXNUcnVlOiB0cnVlIH0sIGVudiwgeyBjb250ZXh0dWFsRWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z05hbWVzcGFjZSwgJ3N2ZycpIH0pLmZyYWdtZW50O1xuICB2YXIgc3ZnTm9kZSA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG4gIGVxdWFsKCBzdmdOb2RlLm5hbWVzcGFjZVVSSSwgc3ZnTmFtZXNwYWNlLFxuICAgICAgICAgXCJmb3JlaWduT2JqZWN0IHRhZyBoYXMgYW4gc3ZnIG5hbWVzcGFjZVwiICk7XG4gIGVxdWFsKCBzdmdOb2RlLmNoaWxkTm9kZXNbMF0ubmFtZXNwYWNlVVJJLCB4aHRtbE5hbWVzcGFjZSxcbiAgICAgICAgIFwiZGl2IGluc2lkZSBtb3JwaCBhbmQgZm9yZWlnbk9iamVjdCBoYXMgeGh0bWwgbmFtZXNwYWNlXCIgKTtcbn0pO1xuXG59XG4iXX0=
define('htmlbars-compiler-tests/html-compiler-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/html-compiler-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/html-compiler-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWwtY29tcGlsZXItdGVzdC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQUNqRCxPQUFLLENBQUMsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzlGLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLG1FQUFtRSxDQUFDLENBQUM7R0FDdEYsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWwtY29tcGlsZXItdGVzdC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sLWNvbXBpbGVyLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWwtY29tcGlsZXItdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-compiler-tests/htmlbars-compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBQ2pELE9BQUssQ0FBQyxJQUFJLENBQUMsaUVBQWlFLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDN0YsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsa0VBQWtFLENBQUMsQ0FBQztHQUNyRixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1jb21waWxlci10ZXN0cycpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-compiler-tests/htmlbars-compiler/compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2NvbXBpbGVyLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0FBQ25FLE9BQUssQ0FBQyxJQUFJLENBQUMsMEVBQTBFLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdEcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMkVBQTJFLENBQUMsQ0FBQztHQUM5RixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvY29tcGlsZXIuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlcicpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2NvbXBpbGVyLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-compiler-tests/htmlbars-compiler/fragment-javascript-compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/fragment-javascript-compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/fragment-javascript-compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LWphdmFzY3JpcHQtY29tcGlsZXIuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7QUFDbkUsT0FBSyxDQUFDLElBQUksQ0FBQyw4RkFBOEYsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMxSCxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSwrRkFBK0YsQ0FBQyxDQUFDO0dBQ2xILENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlci9mcmFnbWVudC1qYXZhc2NyaXB0LWNvbXBpbGVyLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXInKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LWphdmFzY3JpcHQtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LWphdmFzY3JpcHQtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-compiler-tests/htmlbars-compiler/fragment-opcode-compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/fragment-opcode-compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/fragment-opcode-compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LW9wY29kZS1jb21waWxlci5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsb0RBQW9ELENBQUMsQ0FBQztBQUNuRSxPQUFLLENBQUMsSUFBSSxDQUFDLDBGQUEwRixFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3RILFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDJGQUEyRixDQUFDLENBQUM7R0FDOUcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LW9wY29kZS1jb21waWxlci5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlci9mcmFnbWVudC1vcGNvZGUtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2ZyYWdtZW50LW9wY29kZS1jb21waWxlci5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-compiler-tests/htmlbars-compiler/hydration-javascript-compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/hydration-javascript-compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/hydration-javascript-compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2h5ZHJhdGlvbi1qYXZhc2NyaXB0LWNvbXBpbGVyLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0FBQ25FLE9BQUssQ0FBQyxJQUFJLENBQUMsK0ZBQStGLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDM0gsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZ0dBQWdHLENBQUMsQ0FBQztHQUNuSCxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvaHlkcmF0aW9uLWphdmFzY3JpcHQtY29tcGlsZXIuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlcicpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvaHlkcmF0aW9uLWphdmFzY3JpcHQtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2h5ZHJhdGlvbi1qYXZhc2NyaXB0LWNvbXBpbGVyLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-compiler-tests/htmlbars-compiler/hydration-opcode-compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/hydration-opcode-compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/hydration-opcode-compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXIuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7QUFDbkUsT0FBSyxDQUFDLElBQUksQ0FBQywyRkFBMkYsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN2SCxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw0RkFBNEYsQ0FBQyxDQUFDO0dBQy9HLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlci9oeWRyYXRpb24tb3Bjb2RlLWNvbXBpbGVyLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXInKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-compiler-tests/htmlbars-compiler/template-compiler.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/template-compiler.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/template-compiler.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3RlbXBsYXRlLWNvbXBpbGVyLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0FBQ25FLE9BQUssQ0FBQyxJQUFJLENBQUMsbUZBQW1GLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDL0csVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0ZBQW9GLENBQUMsQ0FBQztHQUN2RyxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvdGVtcGxhdGUtY29tcGlsZXIuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlcicpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvdGVtcGxhdGUtY29tcGlsZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3RlbXBsYXRlLWNvbXBpbGVyLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-compiler-tests/htmlbars-compiler/template-visitor.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/template-visitor.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/template-visitor.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3RlbXBsYXRlLXZpc2l0b3IuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7QUFDbkUsT0FBSyxDQUFDLElBQUksQ0FBQyxrRkFBa0YsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUM5RyxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxtRkFBbUYsQ0FBQyxDQUFDO0dBQ3RHLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlci90ZW1wbGF0ZS12aXNpdG9yLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXInKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3RlbXBsYXRlLXZpc2l0b3IuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3RlbXBsYXRlLXZpc2l0b3IuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-compiler-tests/htmlbars-compiler/utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests/htmlbars-compiler');
  QUnit.test('htmlbars-compiler-tests/htmlbars-compiler/utils.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/htmlbars-compiler/utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3V0aWxzLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0FBQ25FLE9BQUssQ0FBQyxJQUFJLENBQUMsdUVBQXVFLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDbkcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0VBQXdFLENBQUMsQ0FBQztHQUMzRixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvdXRpbHMuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1jb21waWxlci10ZXN0cy9odG1sYmFycy1jb21waWxlcicpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvaHRtbGJhcnMtY29tcGlsZXIvdXRpbHMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h0bWxiYXJzLWNvbXBpbGVyL3V0aWxzLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define("htmlbars-compiler-tests/hydration-opcode-compiler-test", ["exports", "../htmlbars-compiler/hydration-opcode-compiler", "../htmlbars-syntax/parser", "../htmlbars-compiler/compiler"], function (exports, _htmlbarsCompilerHydrationOpcodeCompiler, _htmlbarsSyntaxParser, _htmlbarsCompilerCompiler) {

  function opcodesFor(html, options) {
    var ast = _htmlbarsSyntaxParser.preprocess(html, options),
        compiler1 = new _htmlbarsCompilerHydrationOpcodeCompiler.default(options);
    compiler1.compile(ast);
    return compiler1.opcodes;
  }

  QUnit.module("HydrationOpcodeCompiler opcode generation");

  function loc(startCol, endCol) {
    var startLine = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
    var endLine = arguments.length <= 3 || arguments[3] === undefined ? 1 : arguments[3];
    var source = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

    return ['loc', [source, [startLine, startCol], [endLine, endCol]]];
  }

  function sloc(startCol, endCol) {
    var startLine = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
    var endLine = arguments.length <= 3 || arguments[3] === undefined ? 1 : arguments[3];
    var source = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

    return ['loc', [source, [startLine, startCol], [endLine, endCol]]];
  }

  function equalOpcodes(actual, expected) {
    var equiv = QUnit.equiv(actual, expected);

    var exString = "";
    var acString = "";
    var i = 0;

    for (; i < actual.length; i++) {
      var a = actual[i];
      var e = expected && expected[i];

      a = a ? JSON.stringify(a).replace(/"/g, "'") : "";
      e = e ? JSON.stringify(e).replace(/"/g, "'") : "";

      exString += e + "\n";
      acString += a + "\n";
    }

    if (expected) {
      for (; i < expected.length; i++) {
        var e = expected[i];

        e = e ? JSON.stringify(e).replace(/"/g, "'") : "";

        acString += "\n";
        exString += e + "\n";
      }
    }

    QUnit.push(equiv, acString, exString);
  }

  function equalStatements(actual, expected) {
    equalOpcodes(actual, expected);
  }

  function testCompile(string, templateSource, opcodes) {
    for (var _len = arguments.length, statementList = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      statementList[_key - 3] = arguments[_key];
    }

    var template, childTemplates;
    QUnit.module("Compiling " + string + ": " + templateSource, {
      setup: function () {
        template = _htmlbarsCompilerCompiler.compile(templateSource).raw;
        childTemplates = template.templates;
      }
    });

    test("opcodes", function () {
      equalOpcodes(opcodesFor(templateSource), opcodes);
    });

    var statements = statementList.shift();

    test("statements for the root template", function () {
      equalStatements(template.statements, statements);
    });

    test("correct list of child templates", function () {
      equal(template.templates.length, statementList.length, "list of child templates should match the expected list of statements");
    });

    for (var i = 0, l = statementList.length; i < l; i++) {
      statementTest(statementList, i);
    }

    function statementTest(list, i) {
      test("statements for template " + i, function () {
        equalStatements(childTemplates[i].statements, list[i]);
      });
    }
  }

  var s = {
    content: function (path, loc) {
      return ['content', path, sloc.apply(undefined, loc)];
    },

    block: function (name, loc) {
      var template = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
      var params = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];
      var hash = arguments.length <= 4 || arguments[4] === undefined ? [] : arguments[4];
      var inverse = arguments.length <= 5 || arguments[5] === undefined ? null : arguments[5];

      return ['block', name, params, hash, template, inverse, sloc.apply(undefined, loc)];
    },

    inline: function (name) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var hash = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
      var loc = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

      return ['inline', name, params, hash, sloc.apply(undefined, loc)];
    },

    element: function (name) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var hash = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
      var loc = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

      return ['element', name, params, hash, sloc.apply(undefined, loc)];
    },

    attribute: function (name, expression) {
      return ['attribute', name, expression];
    },

    component: function (path) {
      var attrs = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var template = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

      return ['component', path, attrs, template];
    },

    get: function (path, loc) {
      return ['get', path, sloc.apply(undefined, loc)];
    },

    concat: function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return ['concat', args];
    },

    subexpr: function (name) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var hash = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
      var loc = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

      return ['subexpr', name, params, hash, sloc.apply(undefined, loc)];
    }
  };

  QUnit.module("Compiling <my-component> with isStatic plugin: <my-component />");

  test("isStatic skips boundary nodes", function () {
    var ast = _htmlbarsSyntaxParser.preprocess('<my-component />');
    ast.body[0].isStatic = true;
    var compiler1 = new _htmlbarsCompilerHydrationOpcodeCompiler.default();
    compiler1.compile(ast);
    equalOpcodes(compiler1.opcodes, [['createMorph', [0, [], 0, 0, true]], ['prepareObject', [0]], ['pushLiteral', ['my-component']], ['printComponentHook', [0, 0, ['loc', [null, [1, 0], [1, 16]]]]]]);
  });

  testCompile("simple example", "<div>{{foo}} bar {{baz}}</div>", [["consumeParent", [0]], ["shareElement", [0]], ["createMorph", [0, [0], 0, 0, true]], ["createMorph", [1, [0], 2, 2, true]], ["pushLiteral", ["foo"]], ["printContentHook", [loc(5, 12)]], ["pushLiteral", ["baz"]], ["printContentHook", [loc(17, 24)]], ["popParent", []]], [s.content('foo', [5, 12]), s.content('baz', [17, 24])]);

  testCompile("simple block", "<div>{{#foo}}{{/foo}}</div>", [["consumeParent", [0]], ["createMorph", [0, [0], 0, 0, true]], ["prepareObject", [0]], ["prepareArray", [0]], ["pushLiteral", ["foo"]], ["printBlockHook", [0, null, loc(5, 21)]], ["popParent", []]], [s.block('foo', [5, 21], 0)], []);

  testCompile("simple block with block params", "<div>{{#foo as |bar baz|}}{{/foo}}</div>", [["consumeParent", [0]], ["createMorph", [0, [0], 0, 0, true]], ["prepareObject", [0]], ["prepareArray", [0]], ["pushLiteral", ["foo"]], ["printBlockHook", [0, null, loc(5, 34)]], ["popParent", []]], [s.block('foo', [5, 34], 0)], []);

  testCompile("element with a sole mustache child", "<div>{{foo}}</div>", [["consumeParent", [0]], ["createMorph", [0, [0], 0, 0, true]], ["pushLiteral", ["foo"]], ["printContentHook", [loc(5, 12)]], ["popParent", []]], [s.content('foo', [5, 12])]);

  testCompile("element with a mustache between two text nodes", "<div> {{foo}} </div>", [["consumeParent", [0]], ["createMorph", [0, [0], 1, 1, true]], ["pushLiteral", ["foo"]], ["printContentHook", [loc(6, 13)]], ["popParent", []]], [s.content('foo', [6, 13])]);

  testCompile("mustache two elements deep", "<div><div>{{foo}}</div></div>", [["consumeParent", [0]], ["consumeParent", [0]], ["createMorph", [0, [0, 0], 0, 0, true]], ["pushLiteral", ["foo"]], ["printContentHook", [loc(10, 17)]], ["popParent", []], ["popParent", []]], [s.content('foo', [10, 17])]);

  testCompile("two sibling elements with mustaches", "<div>{{foo}}</div><div>{{bar}}</div>", [["consumeParent", [0]], ["createMorph", [0, [0], 0, 0, true]], ["pushLiteral", ["foo"]], ["printContentHook", [loc(5, 12)]], ["popParent", []], ["consumeParent", [1]], ["createMorph", [1, [1], 0, 0, true]], ["pushLiteral", ["bar"]], ["printContentHook", [loc(23, 30)]], ["popParent", []]], [s.content('foo', [5, 12]), s.content('bar', [23, 30])]);

  testCompile("mustaches at the root", "{{foo}} {{bar}}", [["createMorph", [0, [], 0, 0, true]], ["createMorph", [1, [], 2, 2, true]], ["openBoundary", []], ["pushLiteral", ["foo"]], ["printContentHook", [loc(0, 7)]], ["closeBoundary", []], ["pushLiteral", ["bar"]], ["printContentHook", [loc(8, 15)]]], [s.content('foo', [0, 7]), s.content('bar', [8, 15])]);

  testCompile("back to back mustaches should have a text node inserted between them", "<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>", [["consumeParent", [0]], ["shareElement", [0]], ["createMorph", [0, [0], 0, 0, true]], ["createMorph", [1, [0], 1, 1, true]], ["createMorph", [2, [0], 2, 2, true]], ["createMorph", [3, [0], 4, 4, true]], ["pushLiteral", ["foo"]], ["printContentHook", [loc(5, 12)]], ["pushLiteral", ["bar"]], ["printContentHook", [loc(12, 19)]], ["pushLiteral", ["baz"]], ["printContentHook", [loc(19, 26)]], ["pushLiteral", ["qux"]], ["printContentHook", [loc(29, 36)]], ["popParent", []]], [s.content('foo', [5, 12]), s.content('bar', [12, 19]), s.content('baz', [19, 26]), s.content('qux', [29, 36])]);

  testCompile("helper usage", "<div>{{foo 'bar' baz.bat true 3.14}}</div>", [["consumeParent", [0]], ["createMorph", [0, [0], 0, 0, true]], ["prepareObject", [0]], ["pushLiteral", [3.14]], ["pushLiteral", [true]], ["pushGetHook", ["baz.bat", loc(17, 24)]], ["pushLiteral", ["bar"]], ["prepareArray", [4]], ["pushLiteral", ["foo"]], ["printInlineHook", [loc(5, 36)]], ["popParent", []]], [s.inline('foo', ['bar', s.get('baz.bat', [17, 24]), true, 3.14], [], [5, 36])]);

  testCompile("node mustache", "<div {{foo}}></div>", [["consumeParent", [0]], ["prepareObject", [0]], ["prepareArray", [0]], ["pushLiteral", ["foo"]], ["shareElement", [0]], ["createElementMorph", [0, 0]], ["printElementHook", [loc(5, 12)]], ["popParent", []]], [s.element('foo', [], [], [5, 12])]);

  testCompile("node helper", "<div {{foo 'bar'}}></div>", [["consumeParent", [0]], ["prepareObject", [0]], ["pushLiteral", ["bar"]], ["prepareArray", [1]], ["pushLiteral", ["foo"]], ["shareElement", [0]], ["createElementMorph", [0, 0]], ["printElementHook", [loc(5, 18)]], ["popParent", []]], [s.element('foo', ['bar'], [], [5, 18])]);

  testCompile("attribute mustache", "<div class='before {{foo}} after'></div>", [["consumeParent", [0]], ["pushLiteral", [" after"]], ["pushGetHook", ["foo", loc(21, 24)]], ["pushLiteral", ["before "]], ["prepareArray", [3]], ["pushConcatHook", [0]], ["pushLiteral", ["class"]], ["shareElement", [0]], ["createAttrMorph", [0, 0, "class", true, null]], ["printAttributeHook", []], ["popParent", []]], [s.attribute('class', s.concat('before ', s.get('foo', [21, 24]), ' after'))]);

  testCompile("quoted attribute mustache", "<div class='{{foo}}'></div>", [["consumeParent", [0]], ["pushGetHook", ["foo", loc(14, 17)]], ["prepareArray", [1]], ["pushConcatHook", [0]], ["pushLiteral", ["class"]], ["shareElement", [0]], ["createAttrMorph", [0, 0, "class", true, null]], ["printAttributeHook", []], ["popParent", []]], [s.attribute('class', s.concat(s.get('foo', [14, 17])))]);

  testCompile("safe bare attribute mustache", "<div class={{foo}}></div>", [["consumeParent", [0]], ["pushGetHook", ["foo", loc(13, 16)]], ["pushLiteral", ["class"]], ["shareElement", [0]], ["createAttrMorph", [0, 0, "class", true, null]], ["printAttributeHook", []], ["popParent", []]], [s.attribute('class', s.get('foo', [13, 16]))]);

  testCompile("unsafe bare attribute mustache", "<div class={{{foo}}}></div>", [["consumeParent", [0]], ["pushGetHook", ["foo", loc(14, 17)]], ["pushLiteral", ["class"]], ["shareElement", [0]], ["createAttrMorph", [0, 0, "class", false, null]], ["printAttributeHook", []], ["popParent", []]], [s.attribute('class', s.get('foo', [14, 17]))]);

  testCompile("attribute helper", "<div class='before {{foo 'bar'}} after'></div>", [["consumeParent", [0]], ["pushLiteral", [" after"]], ["prepareObject", [0]], ["pushLiteral", ["bar"]], ["prepareArray", [1]], ["pushLiteral", ["foo"]], ["pushSexprHook", [loc(19, 32)]], ["pushLiteral", ["before "]], ["prepareArray", [3]], ["pushConcatHook", [0]], ["pushLiteral", ["class"]], ["shareElement", [0]], ["createAttrMorph", [0, 0, "class", true, null]], ["printAttributeHook", []], ["popParent", []]], [s.attribute('class', s.concat('before ', s.subexpr('foo', ['bar'], [], [19, 32]), ' after'))]);

  testCompile("attribute helpers", "<div class='before {{foo 'bar'}} after' id={{bare}}></div>{{morphThing}}<span class='{{ohMy}}'></span>", [["consumeParent", [0]], ["shareElement", [0]], ["pushLiteral", [" after"]], ["prepareObject", [0]], ["pushLiteral", ["bar"]], ["prepareArray", [1]], ["pushLiteral", ["foo"]], ["pushSexprHook", [loc(19, 32)]], ["pushLiteral", ["before "]], ["prepareArray", [3]], ["pushConcatHook", [0]], ["pushLiteral", ["class"]], ["createAttrMorph", [0, 0, "class", true, null]], ["printAttributeHook", []], ["pushGetHook", ['bare', loc(45, 49)]], ["pushLiteral", ['id']], ["createAttrMorph", [1, 0, 'id', true, null]], ["printAttributeHook", []], ["popParent", []], ["createMorph", [2, [], 1, 1, true]], ["pushLiteral", ['morphThing']], ["printContentHook", [loc(58, 72)]], ["consumeParent", [2]], ["pushGetHook", ['ohMy', loc(87, 91)]], ["prepareArray", [1]], ["pushConcatHook", [3]], ["pushLiteral", ['class']], ["shareElement", [1]], ["createAttrMorph", [3, 1, 'class', true, null]], ["printAttributeHook", []], ["popParent", []]], [s.attribute('class', s.concat('before ', s.subexpr('foo', ['bar'], [], [19, 32]), ' after')), s.attribute('id', s.get('bare', [45, 49])), s.content('morphThing', [58, 72]), s.attribute('class', s.concat(s.get('ohMy', [87, 91])))]);

  testCompile('component helpers', "<my-component>hello</my-component>", [["createMorph", [0, [], 0, 0, true]], ["openBoundary", []], ["closeBoundary", []], ["prepareObject", [0]], ["pushLiteral", ["my-component"]], ["printComponentHook", [0, 0, loc(0, 34)]]], [s.component('my-component', [], 0)], []);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXItdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLFdBQVMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7QUFDakMsUUFBSSxHQUFHLEdBQUcsc0JBSkgsVUFBVSxDQUlJLElBQUksRUFBRSxPQUFPLENBQUM7UUFDL0IsU0FBUyxHQUFHLHFEQUE0QixPQUFPLENBQUMsQ0FBQztBQUNyRCxhQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLFdBQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQztHQUMxQjs7QUFFRCxPQUFLLENBQUMsTUFBTSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7O0FBRTFELFdBQVMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQXVDO1FBQXJDLFNBQVMseURBQUMsQ0FBQztRQUFFLE9BQU8seURBQUMsQ0FBQztRQUFFLE1BQU0seURBQUMsSUFBSTs7QUFDaEUsV0FBTyxDQUNMLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUMxRCxDQUFDO0dBQ0g7O0FBRUQsV0FBUyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBdUM7UUFBckMsU0FBUyx5REFBQyxDQUFDO1FBQUUsT0FBTyx5REFBQyxDQUFDO1FBQUUsTUFBTSx5REFBQyxJQUFJOztBQUNqRSxXQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNwRTs7QUFFRCxXQUFTLFlBQVksQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQ3RDLFFBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFB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Q0FBRSxFQUN2QixDQUFFLGVBQWUsRUFBRSxFQUFHLENBQUUsRUFDeEIsQ0FBRSxlQUFlLEVBQUUsQ0FBRSxDQUFDLENBQUUsQ0FBRSxFQUMxQixDQUFFLGFBQWEsRUFBRSxDQUFFLGNBQWMsQ0FBRSxDQUFFLEVBQ3JDLENBQUUsb0JBQW9CLEVBQUUsQ0FBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUUsQ0FBRSxDQUMvQyxFQUFFLENBQ0QsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNuQyxFQUFFLEVBQUUsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXItdGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBIeWRyYXRpb25PcGNvZGVDb21waWxlciBmcm9tIFwiLi4vaHRtbGJhcnMtY29tcGlsZXIvaHlkcmF0aW9uLW9wY29kZS1jb21waWxlclwiO1xuaW1wb3J0IHsgcHJlcHJvY2VzcyB9IGZyb20gXCIuLi9odG1sYmFycy1zeW50YXgvcGFyc2VyXCI7XG5pbXBvcnQgeyBjb21waWxlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLWNvbXBpbGVyL2NvbXBpbGVyXCI7XG5cbmZ1bmN0aW9uIG9wY29kZXNGb3IoaHRtbCwgb3B0aW9ucykge1xuICB2YXIgYXN0ID0gcHJlcHJvY2VzcyhodG1sLCBvcHRpb25zKSxcbiAgICAgIGNvbXBpbGVyMSA9IG5ldyBIeWRyYXRpb25PcGNvZGVDb21waWxlcihvcHRpb25zKTtcbiAgY29tcGlsZXIxLmNvbXBpbGUoYXN0KTtcbiAgcmV0dXJuIGNvbXBpbGVyMS5vcGNvZGVzO1xufVxuXG5RVW5pdC5tb2R1bGUoXCJIeWRyYXRpb25PcGNvZGVDb21waWxlciBvcGNvZGUgZ2VuZXJhdGlvblwiKTtcblxuZnVuY3Rpb24gbG9jKHN0YXJ0Q29sLCBlbmRDb2wsIHN0YXJ0TGluZT0xLCBlbmRMaW5lPTEsIHNvdXJjZT1udWxsKSB7XG4gIHJldHVybiBbXG4gICAgJ2xvYycsIFtzb3VyY2UsIFtzdGFydExpbmUsIHN0YXJ0Q29sXSwgW2VuZExpbmUsIGVuZENvbF1dXG4gIF07XG59XG5cbmZ1bmN0aW9uIHNsb2Moc3RhcnRDb2wsIGVuZENvbCwgc3RhcnRMaW5lPTEsIGVuZExpbmU9MSwgc291cmNlPW51bGwpIHtcbiAgcmV0dXJuIFsnbG9jJywgW3NvdXJjZSwgW3N0YXJ0TGluZSwgc3RhcnRDb2xdLCBbZW5kTGluZSwgZW5kQ29sXV1dO1xufVxuXG5mdW5jdGlvbiBlcXVhbE9wY29kZXMoYWN0dWFsLCBleHBlY3RlZCkge1xuICBsZXQgZXF1aXYgPSBRVW5pdC5lcXVpdihhY3R1YWwsIGV4cGVjdGVkKTtcblxuICBsZXQgZXhTdHJpbmcgPSBcIlwiO1xuICBsZXQgYWNTdHJpbmcgPSBcIlwiO1xuICBsZXQgaSA9IDA7XG5cbiAgZm9yICg7IGk8YWN0dWFsLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGEgPSBhY3R1YWxbaV07XG4gICAgbGV0IGUgPSBleHBlY3RlZCAmJiBleHBlY3RlZFtpXTtcblxuICAgIGEgPSBhID8gSlNPTi5zdHJpbmdpZnkoYSkucmVwbGFjZSgvXCIvZywgXCInXCIpIDogXCJcIjtcbiAgICBlID0gZSA/IEpTT04uc3RyaW5naWZ5KGUpLnJlcGxhY2UoL1wiL2csIFwiJ1wiKSA6IFwiXCI7XG5cbiAgICBleFN0cmluZyArPSBlICsgXCJcXG5cIjtcbiAgICBhY1N0cmluZyArPSBhICsgXCJcXG5cIjtcbiAgfVxuXG4gIGlmIChleHBlY3RlZCkge1xuICAgIGZvciAoOyBpPGV4cGVjdGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgZSA9IGV4cGVjdGVkW2ldO1xuXG4gICAgICBlID0gZSA/IEpTT04uc3RyaW5naWZ5KGUpLnJlcGxhY2UoL1wiL2csIFwiJ1wiKSA6IFwiXCI7XG5cbiAgICAgIGFjU3RyaW5nICs9IFwiXFxuXCI7XG4gICAgICBleFN0cmluZyArPSBlICsgXCJcXG5cIjtcbiAgICB9XG4gIH1cblxuICBRVW5pdC5wdXNoKGVxdWl2LCBhY1N0cmluZywgZXhTdHJpbmcpO1xufVxuXG5mdW5jdGlvbiBlcXVhbFN0YXRlbWVudHMoYWN0dWFsLCBleHBlY3RlZCkge1xuICBlcXVhbE9wY29kZXMoYWN0dWFsLCBleHBlY3RlZCk7XG59XG5cbmZ1bmN0aW9uIHRlc3RDb21waWxlKHN0cmluZywgdGVtcGxhdGVTb3VyY2UsIG9wY29kZXMsIC4uLnN0YXRlbWVudExpc3QpIHtcbiAgdmFyIHRlbXBsYXRlLCBjaGlsZFRlbXBsYXRlcztcbiAgUVVuaXQubW9kdWxlKGBDb21waWxpbmcgJHtzdHJpbmd9OiAke3RlbXBsYXRlU291cmNlfWAsIHtcbiAgICBzZXR1cDogZnVuY3Rpb24oKSB7XG4gICAgICB0ZW1wbGF0ZSA9IGNvbXBpbGUodGVtcGxhdGVTb3VyY2UpLnJhdztcbiAgICAgIGNoaWxkVGVtcGxhdGVzID0gdGVtcGxhdGUudGVtcGxhdGVzO1xuICAgIH1cbiAgfSk7XG5cbiAgdGVzdChcIm9wY29kZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgZXF1YWxPcGNvZGVzKG9wY29kZXNGb3IodGVtcGxhdGVTb3VyY2UpLCBvcGNvZGVzKTtcbiAgfSk7XG5cbiAgbGV0IHN0YXRlbWVudHMgPSBzdGF0ZW1lbnRMaXN0LnNoaWZ0KCk7XG5cbiAgdGVzdChcInN0YXRlbWVudHMgZm9yIHRoZSByb290IHRlbXBsYXRlXCIsIGZ1bmN0aW9uKCkge1xuICAgIGVxdWFsU3RhdGVtZW50cyh0ZW1wbGF0ZS5zdGF0ZW1lbnRzLCBzdGF0ZW1lbnRzKTtcbiAgfSk7XG5cbiAgdGVzdChcImNvcnJlY3QgbGlzdCBvZiBjaGlsZCB0ZW1wbGF0ZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgZXF1YWwodGVtcGxhdGUudGVtcGxhdGVzLmxlbmd0aCwgc3RhdGVtZW50TGlzdC5sZW5ndGgsIFwibGlzdCBvZiBjaGlsZCB0ZW1wbGF0ZXMgc2hvdWxkIG1hdGNoIHRoZSBleHBlY3RlZCBsaXN0IG9mIHN0YXRlbWVudHNcIik7XG4gIH0pO1xuXG4gIGZvciAobGV0IGk9MCwgbD1zdGF0ZW1lbnRMaXN0Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICBzdGF0ZW1lbnRUZXN0KHN0YXRlbWVudExpc3QsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhdGVtZW50VGVzdChsaXN0LCBpKSB7XG4gICAgdGVzdChgc3RhdGVtZW50cyBmb3IgdGVtcGxhdGUgJHtpfWAsIGZ1bmN0aW9uKCkge1xuICAgICAgZXF1YWxTdGF0ZW1lbnRzKGNoaWxkVGVtcGxhdGVzW2ldLnN0YXRlbWVudHMsIGxpc3RbaV0pO1xuICAgIH0pO1xuICB9XG59XG5cbmxldCBzID0ge1xuICBjb250ZW50KHBhdGgsIGxvYykge1xuICAgIHJldHVybiBbJ2NvbnRlbnQnLCBwYXRoLCBzbG9jKC4uLmxvYyldO1xuICB9LFxuXG4gIGJsb2NrKG5hbWUsIGxvYywgdGVtcGxhdGU9bnVsbCwgcGFyYW1zPVtdLCBoYXNoPVtdLCBpbnZlcnNlPW51bGwpIHtcbiAgICByZXR1cm4gWydibG9jaycsIG5hbWUsIHBhcmFtcywgaGFzaCwgdGVtcGxhdGUsIGludmVyc2UsIHNsb2MoLi4ubG9jKV07XG4gIH0sXG5cbiAgaW5saW5lKG5hbWUsIHBhcmFtcz1bXSwgaGFzaD1bXSwgbG9jPW51bGwpIHtcbiAgICByZXR1cm4gWyAnaW5saW5lJywgbmFtZSwgcGFyYW1zLCBoYXNoLCBzbG9jKC4uLmxvYykgXTtcbiAgfSxcblxuICBlbGVtZW50KG5hbWUsIHBhcmFtcz1bXSwgaGFzaD1bXSwgbG9jPW51bGwpIHtcbiAgICByZXR1cm4gWyAnZWxlbWVudCcsIG5hbWUsIHBhcmFtcywgaGFzaCwgc2xvYyguLi5sb2MpIF07XG4gIH0sXG5cbiAgYXR0cmlidXRlKG5hbWUsIGV4cHJlc3Npb24pIHtcbiAgICByZXR1cm4gWyAnYXR0cmlidXRlJywgbmFtZSwgZXhwcmVzc2lvbiBdO1xuICB9LFxuXG4gIGNvbXBvbmVudChwYXRoLCBhdHRycz1bXSwgdGVtcGxhdGU9bnVsbCkge1xuICAgIHJldHVybiBbICdjb21wb25lbnQnLCBwYXRoLCBhdHRycywgdGVtcGxhdGUgXTtcbiAgfSxcblxuICBnZXQocGF0aCwgbG9jKSB7XG4gICAgcmV0dXJuIFsgJ2dldCcsIHBhdGgsIHNsb2MoLi4ubG9jKSBdO1xuICB9LFxuXG4gIGNvbmNhdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIFsgJ2NvbmNhdCcsIGFyZ3MgXTtcbiAgfSxcblxuICBzdWJleHByKG5hbWUsIHBhcmFtcz1bXSwgaGFzaD1bXSwgbG9jPW51bGwpIHtcbiAgICByZXR1cm4gWyAnc3ViZXhwcicsIG5hbWUsIHBhcmFtcywgaGFzaCwgc2xvYyguLi5sb2MpIF07XG4gIH1cbn07XG5cblxuUVVuaXQubW9kdWxlKGBDb21waWxpbmcgPG15LWNvbXBvbmVudD4gd2l0aCBpc1N0YXRpYyBwbHVnaW46IDxteS1jb21wb25lbnQgLz5gKTtcblxudGVzdChcImlzU3RhdGljIHNraXBzIGJvdW5kYXJ5IG5vZGVzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgYXN0ID0gcHJlcHJvY2VzcygnPG15LWNvbXBvbmVudCAvPicpO1xuICBhc3QuYm9keVswXS5pc1N0YXRpYyA9IHRydWU7XG4gIHZhciBjb21waWxlcjEgPSBuZXcgSHlkcmF0aW9uT3Bjb2RlQ29tcGlsZXIoKTtcbiAgY29tcGlsZXIxLmNvbXBpbGUoYXN0KTtcbiAgZXF1YWxPcGNvZGVzKGNvbXBpbGVyMS5vcGNvZGVzLCBbXG4gICAgWydjcmVhdGVNb3JwaCcsWzAsW10sMCwwLHRydWVdXSxcbiAgICBbJ3ByZXBhcmVPYmplY3QnLFswXV0sXG4gICAgWydwdXNoTGl0ZXJhbCcsWydteS1jb21wb25lbnQnXV0sXG4gICAgWydwcmludENvbXBvbmVudEhvb2snLFswLDAsWydsb2MnLFtudWxsLFsxLDBdLFsxLDE2XV1dXV1cbiAgXSk7XG59KTtcblxudGVzdENvbXBpbGUoXCJzaW1wbGUgZXhhbXBsZVwiLCBcIjxkaXY+e3tmb299fSBiYXIge3tiYXp9fTwvZGl2PlwiLCBbXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJzaGFyZUVsZW1lbnRcIiwgWyAwIF0gXSxcbiAgWyBcImNyZWF0ZU1vcnBoXCIsIFsgMCwgWyAwIF0sIDAsIDAsIHRydWUgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAxLCBbIDAgXSwgMiwgMiwgdHJ1ZSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLCBbIGxvYyg1LCAxMikgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImJhelwiIF0gXSxcbiAgWyBcInByaW50Q29udGVudEhvb2tcIiwgWyBsb2MoMTcsIDI0KSBdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmNvbnRlbnQoJ2ZvbycsIFsgNSwgMTIgXSksXG4gIHMuY29udGVudCgnYmF6JywgWyAxNywgMjQgXSlcbl0pO1xuXG50ZXN0Q29tcGlsZShcInNpbXBsZSBibG9ja1wiLCBcIjxkaXY+e3sjZm9vfX17ey9mb299fTwvZGl2PlwiLCBbXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDAsIFsgMCBdLCAwLCAwLCB0cnVlIF0gXSxcbiAgWyBcInByZXBhcmVPYmplY3RcIiwgWyAwIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImZvb1wiIF0gXSxcbiAgWyBcInByaW50QmxvY2tIb29rXCIsIFsgMCwgbnVsbCwgbG9jKDUsIDIxKSBdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmJsb2NrKCdmb28nLCBbIDUsIDIxIF0sIDApXG5dLCBbXSk7XG5cbnRlc3RDb21waWxlKFwic2ltcGxlIGJsb2NrIHdpdGggYmxvY2sgcGFyYW1zXCIsIFwiPGRpdj57eyNmb28gYXMgfGJhciBiYXp8fX17ey9mb299fTwvZGl2PlwiLCBbXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDAsIFsgMCBdLCAwLCAwLCB0cnVlIF0gXSxcbiAgWyBcInByZXBhcmVPYmplY3RcIiwgWyAwIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImZvb1wiIF0gXSxcbiAgWyBcInByaW50QmxvY2tIb29rXCIsIFsgMCwgbnVsbCwgbG9jKDUsIDM0KSBdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmJsb2NrKCdmb28nLCBbNSwgMzRdLCAwKVxuXSwgW10pO1xuXG50ZXN0Q29tcGlsZShcImVsZW1lbnQgd2l0aCBhIHNvbGUgbXVzdGFjaGUgY2hpbGRcIiwgXCI8ZGl2Pnt7Zm9vfX08L2Rpdj5cIiwgW1xuICBbIFwiY29uc3VtZVBhcmVudFwiLCBbIDAgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAwLCBbIDAgXSwgMCwgMCwgdHJ1ZSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLFsgbG9jKDUsIDEyKSBdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmNvbnRlbnQoJ2ZvbycsIFs1LCAxMl0pXG5dKTtcblxudGVzdENvbXBpbGUoXCJlbGVtZW50IHdpdGggYSBtdXN0YWNoZSBiZXR3ZWVuIHR3byB0ZXh0IG5vZGVzXCIsIFwiPGRpdj4ge3tmb299fSA8L2Rpdj5cIiwgW1xuICBbIFwiY29uc3VtZVBhcmVudFwiLCBbIDAgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAwLCBbIDAgXSwgMSwgMSwgdHJ1ZSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLCBbIGxvYyg2LCAxMykgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5jb250ZW50KCdmb28nLCBbNiwgMTNdKVxuXSk7XG5cbnRlc3RDb21waWxlKFwibXVzdGFjaGUgdHdvIGVsZW1lbnRzIGRlZXBcIiwgXCI8ZGl2PjxkaXY+e3tmb299fTwvZGl2PjwvZGl2PlwiLCBbXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDAsIFsgMCwgMCBdLCAwLCAwLCB0cnVlIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCJmb29cIiBdIF0sXG4gIFsgXCJwcmludENvbnRlbnRIb29rXCIsIFsgbG9jKDEwLCAxNykgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmNvbnRlbnQoJ2ZvbycsIFsxMCwgMTddKVxuXSk7XG5cbnRlc3RDb21waWxlKFwidHdvIHNpYmxpbmcgZWxlbWVudHMgd2l0aCBtdXN0YWNoZXNcIiwgXCI8ZGl2Pnt7Zm9vfX08L2Rpdj48ZGl2Pnt7YmFyfX08L2Rpdj5cIiwgW1xuICBbIFwiY29uc3VtZVBhcmVudFwiLCBbIDAgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAwLCBbIDAgXSwgMCwgMCwgdHJ1ZSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLCBbIGxvYyg1LCAxMikgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF0sXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMSBdIF0sXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDEsIFsgMSBdLCAwLCAwLCB0cnVlIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCJiYXJcIiBdIF0sXG4gIFsgXCJwcmludENvbnRlbnRIb29rXCIsIFsgbG9jKDIzLCAzMCkgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5jb250ZW50KCdmb28nLCBbNSwgMTJdKSxcbiAgcy5jb250ZW50KCdiYXInLCBbMjMsIDMwXSlcbl0pO1xuXG50ZXN0Q29tcGlsZShcIm11c3RhY2hlcyBhdCB0aGUgcm9vdFwiLCBcInt7Zm9vfX0ge3tiYXJ9fVwiLCBbXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDAsIFsgXSwgMCwgMCwgdHJ1ZSBdIF0sXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDEsIFsgXSwgMiwgMiwgdHJ1ZSBdIF0sXG4gIFsgXCJvcGVuQm91bmRhcnlcIiwgWyBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLCBbIGxvYygwLCA3KSBdIF0sXG4gIFsgXCJjbG9zZUJvdW5kYXJ5XCIsIFsgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImJhclwiIF0gXSxcbiAgWyBcInByaW50Q29udGVudEhvb2tcIiwgWyBsb2MoOCwgMTUpIF0gXVxuXSwgW1xuICBzLmNvbnRlbnQoJ2ZvbycsIFswLCA3XSksXG4gIHMuY29udGVudCgnYmFyJywgWzgsIDE1XSlcbl0pO1xuXG50ZXN0Q29tcGlsZShcImJhY2sgdG8gYmFjayBtdXN0YWNoZXMgc2hvdWxkIGhhdmUgYSB0ZXh0IG5vZGUgaW5zZXJ0ZWQgYmV0d2VlbiB0aGVtXCIsIFwiPGRpdj57e2Zvb319e3tiYXJ9fXt7YmF6fX13YXR7e3F1eH19PC9kaXY+XCIsIFtcbiAgWyBcImNvbnN1bWVQYXJlbnRcIiwgWyAwIF0gXSxcbiAgWyBcInNoYXJlRWxlbWVudFwiLCBbIDAgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAwLCBbMF0sIDAsIDAsIHRydWUgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAxLCBbMF0sIDEsIDEsIHRydWUgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAyLCBbMF0sIDIsIDIsIHRydWUgXSBdLFxuICBbIFwiY3JlYXRlTW9ycGhcIiwgWyAzLCBbMF0sIDQsIDQsIHRydWVdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLCBbIGxvYyg1LCAxMikgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImJhclwiIF0gXSxcbiAgWyBcInByaW50Q29udGVudEhvb2tcIiwgWyBsb2MoMTIsIDE5KSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiYmF6XCIgXSBdLFxuICBbIFwicHJpbnRDb250ZW50SG9va1wiLCBbIGxvYygxOSwgMjYpIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCJxdXhcIiBdIF0sXG4gIFsgXCJwcmludENvbnRlbnRIb29rXCIsIFsgbG9jKDI5LCAzNikgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5jb250ZW50KCdmb28nLCBbNSwgMTJdKSxcbiAgcy5jb250ZW50KCdiYXInLCBbMTIsIDE5XSksXG4gIHMuY29udGVudCgnYmF6JywgWzE5LCAyNl0pLFxuICBzLmNvbnRlbnQoJ3F1eCcsIFsyOSwgMzZdKVxuXSk7XG5cbnRlc3RDb21waWxlKFwiaGVscGVyIHVzYWdlXCIsIFwiPGRpdj57e2ZvbyAnYmFyJyBiYXouYmF0IHRydWUgMy4xNH19PC9kaXY+XCIsIFtcbiAgWyBcImNvbnN1bWVQYXJlbnRcIiwgWyAwIF0gXSxcbiAgWyBcImNyZWF0ZU1vcnBoXCIsIFsgMCwgWzBdLCAwLCAwLCB0cnVlIF0gXSxcbiAgWyBcInByZXBhcmVPYmplY3RcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgMy4xNCBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIHRydWUgXSBdLFxuICBbIFwicHVzaEdldEhvb2tcIiwgWyBcImJhei5iYXRcIiwgbG9jKDE3LCAyNCkgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImJhclwiIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDQgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImZvb1wiIF0gXSxcbiAgWyBcInByaW50SW5saW5lSG9va1wiLCBbIGxvYyg1LCAzNikgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5pbmxpbmUoJ2ZvbycsIFsgJ2JhcicsIHMuZ2V0KCdiYXouYmF0JywgWzE3LCAyNF0pLCB0cnVlLCAzLjE0IF0sIFtdLCBbNSwgMzZdKVxuXSk7XG5cbnRlc3RDb21waWxlKFwibm9kZSBtdXN0YWNoZVwiLCBcIjxkaXYge3tmb299fT48L2Rpdj5cIiwgW1xuICBbIFwiY29uc3VtZVBhcmVudFwiLCBbIDAgXSBdLFxuICBbIFwicHJlcGFyZU9iamVjdFwiLCBbIDAgXSBdLFxuICBbIFwicHJlcGFyZUFycmF5XCIsIFsgMCBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwic2hhcmVFbGVtZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVFbGVtZW50TW9ycGhcIiwgWyAwLCAwIF0gXSxcbiAgWyBcInByaW50RWxlbWVudEhvb2tcIiwgWyBsb2MoNSwgMTIpIF0gXSxcbiAgWyBcInBvcFBhcmVudFwiLCBbXSBdXG5dLCBbXG4gIHMuZWxlbWVudCgnZm9vJywgW10sIFtdLCBbIDUsIDEyIF0pXG5dKTtcblxudGVzdENvbXBpbGUoXCJub2RlIGhlbHBlclwiLCBcIjxkaXYge3tmb28gJ2Jhcid9fT48L2Rpdj5cIiwgW1xuICBbIFwiY29uc3VtZVBhcmVudFwiLCBbIDAgXSBdLFxuICBbIFwicHJlcGFyZU9iamVjdFwiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImJhclwiIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDEgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImZvb1wiIF0gXSxcbiAgWyBcInNoYXJlRWxlbWVudFwiLCBbIDAgXSBdLFxuICBbIFwiY3JlYXRlRWxlbWVudE1vcnBoXCIsIFsgMCwgMCBdIF0sXG4gIFsgXCJwcmludEVsZW1lbnRIb29rXCIsIFsgbG9jKDUsIDE4KSBdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmVsZW1lbnQoJ2ZvbycsIFsnYmFyJ10sIFtdLCBbNSwgMThdKVxuXSk7XG5cbnRlc3RDb21waWxlKFwiYXR0cmlidXRlIG11c3RhY2hlXCIsIFwiPGRpdiBjbGFzcz0nYmVmb3JlIHt7Zm9vfX0gYWZ0ZXInPjwvZGl2PlwiLCBbXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiIGFmdGVyXCIgXSBdLFxuICBbIFwicHVzaEdldEhvb2tcIiwgWyBcImZvb1wiLCBsb2MoMjEsIDI0KSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiYmVmb3JlIFwiIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDMgXSBdLFxuICBbIFwicHVzaENvbmNhdEhvb2tcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCJjbGFzc1wiIF0gXSxcbiAgWyBcInNoYXJlRWxlbWVudFwiLCBbIDAgXSBdLFxuICBbIFwiY3JlYXRlQXR0ck1vcnBoXCIsIFsgMCwgMCwgXCJjbGFzc1wiLCB0cnVlLCBudWxsIF0gXSxcbiAgWyBcInByaW50QXR0cmlidXRlSG9va1wiLCBbIF0gXSxcbiAgWyBcInBvcFBhcmVudFwiLCBbXSBdXG5dLCBbXG4gIHMuYXR0cmlidXRlKCdjbGFzcycsIHMuY29uY2F0KCdiZWZvcmUgJywgcy5nZXQoJ2ZvbycsIFsgMjEsIDI0IF0pLCAnIGFmdGVyJykpXG5dKTtcblxudGVzdENvbXBpbGUoXCJxdW90ZWQgYXR0cmlidXRlIG11c3RhY2hlXCIsIFwiPGRpdiBjbGFzcz0ne3tmb299fSc+PC9kaXY+XCIsIFtcbiAgWyBcImNvbnN1bWVQYXJlbnRcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hHZXRIb29rXCIsIFsgXCJmb29cIiwgbG9jKDE0LCAxNykgXSBdLFxuICBbIFwicHJlcGFyZUFycmF5XCIsIFsgMSBdIF0sXG4gIFsgXCJwdXNoQ29uY2F0SG9va1wiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImNsYXNzXCIgXSBdLFxuICBbIFwic2hhcmVFbGVtZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVBdHRyTW9ycGhcIiwgWyAwLCAwLCBcImNsYXNzXCIsIHRydWUsIG51bGwgXSBdLFxuICBbIFwicHJpbnRBdHRyaWJ1dGVIb29rXCIsIFsgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5hdHRyaWJ1dGUoJ2NsYXNzJywgcy5jb25jYXQocy5nZXQoJ2ZvbycsIFsgMTQsIDE3IF0pKSlcbl0pO1xuXG50ZXN0Q29tcGlsZShcInNhZmUgYmFyZSBhdHRyaWJ1dGUgbXVzdGFjaGVcIiwgXCI8ZGl2IGNsYXNzPXt7Zm9vfX0+PC9kaXY+XCIsIFtcbiAgWyBcImNvbnN1bWVQYXJlbnRcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hHZXRIb29rXCIsIFsgXCJmb29cIiwgbG9jKDEzLCAxNikgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImNsYXNzXCIgXSBdLFxuICBbIFwic2hhcmVFbGVtZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVBdHRyTW9ycGhcIiwgWyAwLCAwLCBcImNsYXNzXCIsIHRydWUsIG51bGwgXSBdLFxuICBbIFwicHJpbnRBdHRyaWJ1dGVIb29rXCIsIFsgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5hdHRyaWJ1dGUoJ2NsYXNzJywgcy5nZXQoJ2ZvbycsIFsgMTMsIDE2IF0pKVxuXSk7XG5cbnRlc3RDb21waWxlKFwidW5zYWZlIGJhcmUgYXR0cmlidXRlIG11c3RhY2hlXCIsIFwiPGRpdiBjbGFzcz17e3tmb299fX0+PC9kaXY+XCIsIFtcbiAgWyBcImNvbnN1bWVQYXJlbnRcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hHZXRIb29rXCIsIFsgXCJmb29cIiwgbG9jKDE0LCAxNykgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImNsYXNzXCIgXSBdLFxuICBbIFwic2hhcmVFbGVtZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVBdHRyTW9ycGhcIiwgWyAwLCAwLCBcImNsYXNzXCIsIGZhbHNlLCBudWxsIF0gXSxcbiAgWyBcInByaW50QXR0cmlidXRlSG9va1wiLCBbIF0gXSxcbiAgWyBcInBvcFBhcmVudFwiLCBbXSBdXG5dLCBbXG4gIHMuYXR0cmlidXRlKCdjbGFzcycsIHMuZ2V0KCdmb28nLCBbIDE0LCAxNyBdKSlcbl0pO1xuXG50ZXN0Q29tcGlsZShcImF0dHJpYnV0ZSBoZWxwZXJcIiwgXCI8ZGl2IGNsYXNzPSdiZWZvcmUge3tmb28gJ2Jhcid9fSBhZnRlcic+PC9kaXY+XCIsIFtcbiAgWyBcImNvbnN1bWVQYXJlbnRcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCIgYWZ0ZXJcIiBdIF0sXG4gIFsgXCJwcmVwYXJlT2JqZWN0XCIsIFsgMCBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiYmFyXCIgXSBdLFxuICBbIFwicHJlcGFyZUFycmF5XCIsIFsgMSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiZm9vXCIgXSBdLFxuICBbIFwicHVzaFNleHBySG9va1wiLCBbIGxvYygxOSwgMzIpIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCJiZWZvcmUgXCIgXSBdLFxuICBbIFwicHJlcGFyZUFycmF5XCIsIFsgMyBdIF0sXG4gIFsgXCJwdXNoQ29uY2F0SG9va1wiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImNsYXNzXCIgXSBdLFxuICBbIFwic2hhcmVFbGVtZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJjcmVhdGVBdHRyTW9ycGhcIiwgWyAwLCAwLCBcImNsYXNzXCIsIHRydWUsIG51bGwgXSBdLFxuICBbIFwicHJpbnRBdHRyaWJ1dGVIb29rXCIsIFsgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF1cbl0sIFtcbiAgcy5hdHRyaWJ1dGUoJ2NsYXNzJywgcy5jb25jYXQoJ2JlZm9yZSAnLCBzLnN1YmV4cHIoJ2ZvbycsIFsgJ2JhcicgXSwgW10sIFsxOSwgMzJdKSwgJyBhZnRlcicpKVxuXSk7XG5cbnRlc3RDb21waWxlKFwiYXR0cmlidXRlIGhlbHBlcnNcIiwgXCI8ZGl2IGNsYXNzPSdiZWZvcmUge3tmb28gJ2Jhcid9fSBhZnRlcicgaWQ9e3tiYXJlfX0+PC9kaXY+e3ttb3JwaFRoaW5nfX08c3BhbiBjbGFzcz0ne3tvaE15fX0nPjwvc3Bhbj5cIiwgW1xuICBbIFwiY29uc3VtZVBhcmVudFwiLCBbIDAgXSBdLFxuICBbIFwic2hhcmVFbGVtZW50XCIsIFsgMCBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiIGFmdGVyXCIgXSBdLFxuICBbIFwicHJlcGFyZU9iamVjdFwiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImJhclwiIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDEgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcImZvb1wiIF0gXSxcbiAgWyBcInB1c2hTZXhwckhvb2tcIiwgWyBsb2MoMTksIDMyKSBdIF0sXG4gIFsgXCJwdXNoTGl0ZXJhbFwiLCBbIFwiYmVmb3JlIFwiIF0gXSxcbiAgWyBcInByZXBhcmVBcnJheVwiLCBbIDMgXSBdLFxuICBbIFwicHVzaENvbmNhdEhvb2tcIiwgWyAwIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgXCJjbGFzc1wiIF0gXSxcbiAgWyBcImNyZWF0ZUF0dHJNb3JwaFwiLCBbIDAsIDAsIFwiY2xhc3NcIiwgdHJ1ZSwgbnVsbCBdIF0sXG4gIFsgXCJwcmludEF0dHJpYnV0ZUhvb2tcIiwgWyBdIF0sXG4gIFsgXCJwdXNoR2V0SG9va1wiLCBbICdiYXJlJywgbG9jKDQ1LCA0OSkgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyAnaWQnIF0gXSxcbiAgWyBcImNyZWF0ZUF0dHJNb3JwaFwiLCBbIDEsIDAsICdpZCcsIHRydWUsIG51bGwgXSBdLFxuICBbIFwicHJpbnRBdHRyaWJ1dGVIb29rXCIsIFsgXSBdLFxuICBbIFwicG9wUGFyZW50XCIsIFtdIF0sXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDIsIFtdLCAxLCAxLCB0cnVlIF0gXSxcbiAgWyBcInB1c2hMaXRlcmFsXCIsIFsgJ21vcnBoVGhpbmcnIF0gXSxcbiAgWyBcInByaW50Q29udGVudEhvb2tcIiwgWyBsb2MoNTgsIDcyKSBdIF0sXG4gIFsgXCJjb25zdW1lUGFyZW50XCIsIFsgMiBdIF0sXG4gIFsgXCJwdXNoR2V0SG9va1wiLCBbICdvaE15JywgbG9jKDg3LCA5MSkgXSBdLFxuICBbIFwicHJlcGFyZUFycmF5XCIsIFsgMSBdIF0sXG4gIFsgXCJwdXNoQ29uY2F0SG9va1wiLCBbIDMgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyAnY2xhc3MnIF0gXSxcbiAgWyBcInNoYXJlRWxlbWVudFwiLCBbIDEgXSBdLFxuICBbIFwiY3JlYXRlQXR0ck1vcnBoXCIsIFsgMywgMSwgJ2NsYXNzJywgdHJ1ZSwgbnVsbCBdIF0sXG4gIFsgXCJwcmludEF0dHJpYnV0ZUhvb2tcIiwgWyBdIF0sXG4gIFsgXCJwb3BQYXJlbnRcIiwgW10gXVxuXSwgW1xuICBzLmF0dHJpYnV0ZSgnY2xhc3MnLCBzLmNvbmNhdCgnYmVmb3JlICcsIHMuc3ViZXhwcignZm9vJywgWydiYXInXSwgW10sIFsgMTksIDMyIF0pLCAnIGFmdGVyJykpLFxuICBzLmF0dHJpYnV0ZSgnaWQnLCBzLmdldCgnYmFyZScsIFsgNDUsIDQ5IF0pKSxcbiAgcy5jb250ZW50KCdtb3JwaFRoaW5nJywgWyA1OCwgNzIgXSksXG4gIHMuYXR0cmlidXRlKCdjbGFzcycsIHMuY29uY2F0KHMuZ2V0KCdvaE15JywgWyA4NywgOTEgXSkpKVxuXSk7XG5cbnRlc3RDb21waWxlKCdjb21wb25lbnQgaGVscGVycycsIFwiPG15LWNvbXBvbmVudD5oZWxsbzwvbXktY29tcG9uZW50PlwiLCBbXG4gIFsgXCJjcmVhdGVNb3JwaFwiLCBbIDAsIFsgXSwgMCwgMCwgdHJ1ZSBdIF0sXG4gIFsgXCJvcGVuQm91bmRhcnlcIiwgWyBdIF0sXG4gIFsgXCJjbG9zZUJvdW5kYXJ5XCIsIFsgXSBdLFxuICBbIFwicHJlcGFyZU9iamVjdFwiLCBbIDAgXSBdLFxuICBbIFwicHVzaExpdGVyYWxcIiwgWyBcIm15LWNvbXBvbmVudFwiIF0gXSxcbiAgWyBcInByaW50Q29tcG9uZW50SG9va1wiLCBbIDAsIDAsIGxvYygwLCAzNCkgXSBdXG5dLCBbXG4gIHMuY29tcG9uZW50KCdteS1jb21wb25lbnQnLCBbXSwgMClcbl0sIFtdKTtcbiJdfQ==
define('htmlbars-compiler-tests/hydration-opcode-compiler-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/hydration-opcode-compiler-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/hydration-opcode-compiler-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXItdGVzdC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQUNqRCxPQUFLLENBQUMsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzFHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLCtFQUErRSxDQUFDLENBQUM7R0FDbEcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXItdGVzdC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1jb21waWxlci10ZXN0cy9oeWRyYXRpb24tb3Bjb2RlLWNvbXBpbGVyLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXItdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("htmlbars-compiler-tests/template-compiler-test", ["exports", "../htmlbars-compiler/template-compiler", "../htmlbars-syntax/parser"], function (exports, _htmlbarsCompilerTemplateCompiler, _htmlbarsSyntaxParser) {

  QUnit.module("TemplateCompiler");

  function countNamespaceChanges(template) {
    var ast = _htmlbarsSyntaxParser.preprocess(template);
    var compiler = new _htmlbarsCompilerTemplateCompiler.default();
    var program = compiler.compile(ast);
    var matches = program.match(/dom\.setNamespace/g);
    return matches ? matches.length : 0;
  }

  test("it omits unnecessary namespace changes", function () {
    equal(countNamespaceChanges('<div></div>'), 0); // sanity check
    equal(countNamespaceChanges('<div><svg></svg></div><svg></svg>'), 1);
    equal(countNamespaceChanges('<div><svg></svg></div><div></div>'), 2);
    equal(countNamespaceChanges('<div><svg><title>foobar</title></svg></div><svg></svg>'), 1);
    equal(countNamespaceChanges('<div><svg><title><h1>foobar</h1></title></svg></div><svg></svg>'), 3);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLWNvbXBpbGVyLXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFHQSxPQUFLLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7O0FBRWpDLFdBQVMscUJBQXFCLENBQUMsUUFBUSxFQUFFO0FBQ3ZDLFFBQUksR0FBRyxHQUFHLHNCQUxILFVBQVUsQ0FLSSxRQUFRLENBQUMsQ0FBQztBQUMvQixRQUFJLFFBQVEsR0FBRywrQ0FBc0IsQ0FBQztBQUN0QyxRQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLFFBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUNsRCxXQUFPLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztHQUNyQzs7QUFFRCxNQUFJLENBQUMsd0NBQXdDLEVBQUUsWUFBWTtBQUN6RCxTQUFLLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0MsU0FBSyxDQUFDLHFCQUFxQixDQUFDLG1DQUFtQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDckUsU0FBSyxDQUFDLHFCQUFxQixDQUFDLG1DQUFtQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDckUsU0FBSyxDQUFDLHFCQUFxQixDQUFDLHdEQUF3RCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDMUYsU0FBSyxDQUFDLHFCQUFxQixDQUFDLGlFQUFpRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDcEcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLWNvbXBpbGVyLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGVtcGxhdGVDb21waWxlciBmcm9tIFwiLi4vaHRtbGJhcnMtY29tcGlsZXIvdGVtcGxhdGUtY29tcGlsZXJcIjtcbmltcG9ydCB7IHByZXByb2Nlc3MgfSBmcm9tIFwiLi4vaHRtbGJhcnMtc3ludGF4L3BhcnNlclwiO1xuXG5RVW5pdC5tb2R1bGUoXCJUZW1wbGF0ZUNvbXBpbGVyXCIpO1xuXG5mdW5jdGlvbiBjb3VudE5hbWVzcGFjZUNoYW5nZXModGVtcGxhdGUpIHtcbiAgdmFyIGFzdCA9IHByZXByb2Nlc3ModGVtcGxhdGUpO1xuICB2YXIgY29tcGlsZXIgPSBuZXcgVGVtcGxhdGVDb21waWxlcigpO1xuICB2YXIgcHJvZ3JhbSA9IGNvbXBpbGVyLmNvbXBpbGUoYXN0KTtcbiAgdmFyIG1hdGNoZXMgPSBwcm9ncmFtLm1hdGNoKC9kb21cXC5zZXROYW1lc3BhY2UvZyk7XG4gIHJldHVybiBtYXRjaGVzID8gbWF0Y2hlcy5sZW5ndGggOiAwO1xufVxuXG50ZXN0KFwiaXQgb21pdHMgdW5uZWNlc3NhcnkgbmFtZXNwYWNlIGNoYW5nZXNcIiwgZnVuY3Rpb24gKCkge1xuICBlcXVhbChjb3VudE5hbWVzcGFjZUNoYW5nZXMoJzxkaXY+PC9kaXY+JyksIDApOyAgLy8gc2FuaXR5IGNoZWNrXG4gIGVxdWFsKGNvdW50TmFtZXNwYWNlQ2hhbmdlcygnPGRpdj48c3ZnPjwvc3ZnPjwvZGl2Pjxzdmc+PC9zdmc+JyksIDEpO1xuICBlcXVhbChjb3VudE5hbWVzcGFjZUNoYW5nZXMoJzxkaXY+PHN2Zz48L3N2Zz48L2Rpdj48ZGl2PjwvZGl2PicpLCAyKTtcbiAgZXF1YWwoY291bnROYW1lc3BhY2VDaGFuZ2VzKCc8ZGl2Pjxzdmc+PHRpdGxlPmZvb2JhcjwvdGl0bGU+PC9zdmc+PC9kaXY+PHN2Zz48L3N2Zz4nKSwgMSk7XG4gIGVxdWFsKGNvdW50TmFtZXNwYWNlQ2hhbmdlcygnPGRpdj48c3ZnPjx0aXRsZT48aDE+Zm9vYmFyPC9oMT48L3RpdGxlPjwvc3ZnPjwvZGl2Pjxzdmc+PC9zdmc+JyksIDMpO1xufSk7XG4iXX0=
define('htmlbars-compiler-tests/template-compiler-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/template-compiler-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/template-compiler-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLWNvbXBpbGVyLXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFDakQsT0FBSyxDQUFDLElBQUksQ0FBQyxzRUFBc0UsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUNsRyxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSx1RUFBdUUsQ0FBQyxDQUFDO0dBQzFGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci10ZXN0cy90ZW1wbGF0ZS1jb21waWxlci10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtY29tcGlsZXItdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLWNvbXBpbGVyLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLWNvbXBpbGVyLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("htmlbars-compiler-tests/template-visitor-node-test", ["exports", "../htmlbars-syntax/parser", "../htmlbars-compiler/template-visitor"], function (exports, _htmlbarsSyntaxParser, _htmlbarsCompilerTemplateVisitor) {

  function actionsEqual(input, expectedActions) {
    var ast = _htmlbarsSyntaxParser.preprocess(input);

    var templateVisitor = new _htmlbarsCompilerTemplateVisitor.default();
    templateVisitor.visit(ast);
    var actualActions = templateVisitor.actions;

    // Remove the AST node reference from the actions to keep tests leaner
    for (var i = 0; i < actualActions.length; i++) {
      actualActions[i][1].shift();
    }

    deepEqual(actualActions, expectedActions);
  }

  QUnit.module("TemplateVisitor");

  test("empty", function () {
    var input = "";
    actionsEqual(input, [['startProgram', [0, []]], ['endProgram', [0]]]);
  });

  test("basic", function () {
    var input = "foo{{bar}}<div></div>";
    actionsEqual(input, [['startProgram', [0, []]], ['text', [0, 3]], ['mustache', [1, 3]], ['openElement', [2, 3, 0, []]], ['closeElement', [2, 3]], ['endProgram', [0]]]);
  });

  test("nested HTML", function () {
    var input = "<a></a><a><a><a></a></a></a>";
    actionsEqual(input, [['startProgram', [0, []]], ['openElement', [0, 2, 0, []]], ['closeElement', [0, 2]], ['openElement', [1, 2, 0, []]], ['openElement', [0, 1, 0, []]], ['openElement', [0, 1, 0, []]], ['closeElement', [0, 1]], ['closeElement', [0, 1]], ['closeElement', [1, 2]], ['endProgram', [0]]]);
  });

  test("mustaches are counted correctly", function () {
    var input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
    actionsEqual(input, [['startProgram', [0, []]], ['openElement', [0, 1, 2, []]], ['openElement', [0, 2, 1, []]], ['mustache', [0, 1]], ['closeElement', [0, 2]], ['openElement', [1, 2, 3, []]], ['openElement', [0, 2, 1, []]], ['mustache', [0, 1]], ['closeElement', [0, 2]], ['openElement', [1, 2, 1, []]], ['mustache', [0, 1]], ['closeElement', [1, 2]], ['closeElement', [1, 2]], ['closeElement', [0, 1]], ['endProgram', [0]]]);
  });

  test("empty block", function () {
    var input = "{{#a}}{{/a}}";
    actionsEqual(input, [['startProgram', [0, []]], ['endProgram', [1]], ['startProgram', [1, []]], ['block', [0, 1]], ['endProgram', [0]]]);
  });

  test("block with inverse", function () {
    var input = "{{#a}}b{{^}}{{/a}}";
    actionsEqual(input, [['startProgram', [0, []]], ['endProgram', [1]], ['startProgram', [0, []]], ['text', [0, 1]], ['endProgram', [1]], ['startProgram', [2, []]], ['block', [0, 1]], ['endProgram', [0]]]);
  });

  test("nested blocks", function () {
    var input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
    actionsEqual(input, [['startProgram', [0, []]], ['text', [0, 1]], ['endProgram', [1]], ['startProgram', [0, []]], ['mustache', [0, 1]], ['endProgram', [2]], ['startProgram', [0, []]], ['openElement', [0, 1, 0, []]], ['closeElement', [0, 1]], ['endProgram', [2]], ['startProgram', [2, []]], ['block', [0, 2]], ['block', [1, 2]], ['endProgram', [1]], ['startProgram', [2, []]], ['block', [0, 2]], ['block', [1, 2]], ['endProgram', [0]]]);
  });

  test("component", function () {
    var input = "<x-foo>bar</x-foo>";
    actionsEqual(input, [['startProgram', [0, []]], ['text', [0, 1]], ['endProgram', [1]], ['startProgram', [1, []]], ['component', [0, 1]], ['endProgram', [0]]]);
  });

  test("comment", function () {
    var input = "<!-- some comment -->";
    actionsEqual(input, [['startProgram', [0, []]], ['comment', [0, 1]], ['endProgram', [0]]]);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLXZpc2l0b3Itbm9kZS10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBR0EsV0FBUyxZQUFZLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRTtBQUM1QyxRQUFJLEdBQUcsR0FBRyxzQkFKSCxVQUFVLENBSUksS0FBSyxDQUFDLENBQUM7O0FBRTVCLFFBQUksZUFBZSxHQUFHLDhDQUFxQixDQUFDO0FBQzVDLG1CQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLFFBQUksYUFBYSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUM7OztBQUc1QyxTQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM3QyxtQkFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQzdCOztBQUVELGFBQVMsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUM7R0FDM0M7O0FBRUQsT0FBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOztBQUVoQyxNQUFJLENBQUMsT0FBTyxFQUFFLFlBQVc7QUFDdkIsUUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2YsZ0JBQVksQ0FBQyxLQUFLLEVBQUUsQ0FDbEIsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNwQixDQUFDLENBQUM7R0FDSixDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFXO0FBQ3ZCLFFBQUksS0FBSyxHQUFHLHVCQUF1QixDQUFDO0FBQ3BDLGdCQUFZLENBQUMsS0FBSyxFQUFFLENBQ2xCLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUs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QixDQUFDLENBQUM7R0FDSixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvdGVtcGxhdGUtdmlzaXRvci1ub2RlLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwcmVwcm9jZXNzIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheC9wYXJzZXJcIjtcbmltcG9ydCBUZW1wbGF0ZVZpc2l0b3IgZnJvbSBcIi4uL2h0bWxiYXJzLWNvbXBpbGVyL3RlbXBsYXRlLXZpc2l0b3JcIjtcblxuZnVuY3Rpb24gYWN0aW9uc0VxdWFsKGlucHV0LCBleHBlY3RlZEFjdGlvbnMpIHtcbiAgdmFyIGFzdCA9IHByZXByb2Nlc3MoaW5wdXQpO1xuXG4gIHZhciB0ZW1wbGF0ZVZpc2l0b3IgPSBuZXcgVGVtcGxhdGVWaXNpdG9yKCk7XG4gIHRlbXBsYXRlVmlzaXRvci52aXNpdChhc3QpO1xuICB2YXIgYWN0dWFsQWN0aW9ucyA9IHRlbXBsYXRlVmlzaXRvci5hY3Rpb25zO1xuXG4gIC8vIFJlbW92ZSB0aGUgQVNUIG5vZGUgcmVmZXJlbmNlIGZyb20gdGhlIGFjdGlvbnMgdG8ga2VlcCB0ZXN0cyBsZWFuZXJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3R1YWxBY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgYWN0dWFsQWN0aW9uc1tpXVsxXS5zaGlmdCgpO1xuICB9XG5cbiAgZGVlcEVxdWFsKGFjdHVhbEFjdGlvbnMsIGV4cGVjdGVkQWN0aW9ucyk7XG59XG5cblFVbml0Lm1vZHVsZShcIlRlbXBsYXRlVmlzaXRvclwiKTtcblxudGVzdChcImVtcHR5XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgaW5wdXQgPSBcIlwiO1xuICBhY3Rpb25zRXF1YWwoaW5wdXQsIFtcbiAgICBbJ3N0YXJ0UHJvZ3JhbScsIFswLCBbXV1dLFxuICAgIFsnZW5kUHJvZ3JhbScsIFswXV1cbiAgXSk7XG59KTtcblxudGVzdChcImJhc2ljXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgaW5wdXQgPSBcImZvb3t7YmFyfX08ZGl2PjwvZGl2PlwiO1xuICBhY3Rpb25zRXF1YWwoaW5wdXQsIFtcbiAgICBbJ3N0YXJ0UHJvZ3JhbScsIFswLCBbXV1dLFxuICAgIFsndGV4dCcsIFswLCAzXV0sXG4gICAgWydtdXN0YWNoZScsIFsxLCAzXV0sXG4gICAgWydvcGVuRWxlbWVudCcsIFsyLCAzLCAwLCBbXV1dLFxuICAgIFsnY2xvc2VFbGVtZW50JywgWzIsIDNdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMF1dXG4gIF0pO1xufSk7XG5cbnRlc3QoXCJuZXN0ZWQgSFRNTFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGlucHV0ID0gXCI8YT48L2E+PGE+PGE+PGE+PC9hPjwvYT48L2E+XCI7XG4gIGFjdGlvbnNFcXVhbChpbnB1dCwgW1xuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWydvcGVuRWxlbWVudCcsIFswLCAyLCAwLCBbXV1dLFxuICAgIFsnY2xvc2VFbGVtZW50JywgWzAsIDJdXSxcbiAgICBbJ29wZW5FbGVtZW50JywgWzEsIDIsIDAsIFtdXV0sXG4gICAgWydvcGVuRWxlbWVudCcsIFswLCAxLCAwLCBbXV1dLFxuICAgIFsnb3BlbkVsZW1lbnQnLCBbMCwgMSwgMCwgW11dXSxcbiAgICBbJ2Nsb3NlRWxlbWVudCcsIFswLCAxXV0sXG4gICAgWydjbG9zZUVsZW1lbnQnLCBbMCwgMV1dLFxuICAgIFsnY2xvc2VFbGVtZW50JywgWzEsIDJdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMF1dXG4gIF0pO1xufSk7XG5cbnRlc3QoXCJtdXN0YWNoZXMgYXJlIGNvdW50ZWQgY29ycmVjdGx5XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgaW5wdXQgPSBcIjxhPjxhPnt7Zm9vfX08L2E+PGEge3tmb299fT48YT57e2Zvb319PC9hPjxhPnt7Zm9vfX08L2E+PC9hPjwvYT5cIjtcbiAgYWN0aW9uc0VxdWFsKGlucHV0LCBbXG4gICAgWydzdGFydFByb2dyYW0nLCBbMCwgW11dXSxcbiAgICBbJ29wZW5FbGVtZW50JywgWzAsIDEsIDIsIFtdXV0sXG4gICAgWydvcGVuRWxlbWVudCcsIFswLCAyLCAxLCBbXV1dLFxuICAgIFsnbXVzdGFjaGUnLCBbMCwgMV1dLFxuICAgIFsnY2xvc2VFbGVtZW50JywgWzAsIDJdXSxcbiAgICBbJ29wZW5FbGVtZW50JywgWzEsIDIsIDMsIFtdXV0sXG4gICAgWydvcGVuRWxlbWVudCcsIFswLCAyLCAxLCBbXV1dLFxuICAgIFsnbXVzdGFjaGUnLCBbMCwgMV1dLFxuICAgIFsnY2xvc2VFbGVtZW50JywgWzAsIDJdXSxcbiAgICBbJ29wZW5FbGVtZW50JywgWzEsIDIsIDEsIFtdXV0sXG4gICAgWydtdXN0YWNoZScsIFswLCAxXV0sXG4gICAgWydjbG9zZUVsZW1lbnQnLCBbMSwgMl1dLFxuICAgIFsnY2xvc2VFbGVtZW50JywgWzEsIDJdXSxcbiAgICBbJ2Nsb3NlRWxlbWVudCcsIFswLCAxXV0sXG4gICAgWydlbmRQcm9ncmFtJywgWzBdXVxuICBdKTtcbn0pO1xuXG50ZXN0KFwiZW1wdHkgYmxvY2tcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBpbnB1dCA9IFwie3sjYX19e3svYX19XCI7XG4gIGFjdGlvbnNFcXVhbChpbnB1dCwgW1xuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWydlbmRQcm9ncmFtJywgWzFdXSxcbiAgICBbJ3N0YXJ0UHJvZ3JhbScsIFsxLCBbXV1dLFxuICAgIFsnYmxvY2snLCBbMCwgMV1dLFxuICAgIFsnZW5kUHJvZ3JhbScsIFswXV1cbiAgXSk7XG59KTtcblxudGVzdChcImJsb2NrIHdpdGggaW52ZXJzZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGlucHV0ID0gXCJ7eyNhfX1ie3tefX17ey9hfX1cIjtcbiAgYWN0aW9uc0VxdWFsKGlucHV0LCBbXG4gICAgWydzdGFydFByb2dyYW0nLCBbMCwgW11dXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMV1dLFxuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWyd0ZXh0JywgWzAsIDFdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMV1dLFxuICAgIFsnc3RhcnRQcm9ncmFtJywgWzIsIFtdXV0sXG4gICAgWydibG9jaycsIFswLCAxXV0sXG4gICAgWydlbmRQcm9ncmFtJywgWzBdXVxuICBdKTtcbn0pO1xuXG50ZXN0KFwibmVzdGVkIGJsb2Nrc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGlucHV0ID0gXCJ7eyNhfX17eyNhfX08Yj48L2I+e3svYX19e3sjYX19e3tifX17ey9hfX17ey9hfX17eyNhfX1ie3svYX19XCI7XG4gIGFjdGlvbnNFcXVhbChpbnB1dCwgW1xuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWyd0ZXh0JywgWzAsIDFdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMV1dLFxuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWydtdXN0YWNoZScsIFswLCAxXV0sXG4gICAgWydlbmRQcm9ncmFtJywgWzJdXSxcbiAgICBbJ3N0YXJ0UHJvZ3JhbScsIFswLCBbXV1dLFxuICAgIFsnb3BlbkVsZW1lbnQnLCBbMCwgMSwgMCwgW11dXSxcbiAgICBbJ2Nsb3NlRWxlbWVudCcsIFswLCAxXV0sXG4gICAgWydlbmRQcm9ncmFtJywgWzJdXSxcbiAgICBbJ3N0YXJ0UHJvZ3JhbScsIFsyLCBbXV1dLFxuICAgIFsnYmxvY2snLCBbMCwgMl1dLFxuICAgIFsnYmxvY2snLCBbMSwgMl1dLFxuICAgIFsnZW5kUHJvZ3JhbScsIFsxXV0sXG4gICAgWydzdGFydFByb2dyYW0nLCBbMiwgW11dXSxcbiAgICBbJ2Jsb2NrJywgWzAsIDJdXSxcbiAgICBbJ2Jsb2NrJywgWzEsIDJdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMF1dXG4gIF0pO1xufSk7XG5cbnRlc3QoXCJjb21wb25lbnRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBpbnB1dCA9IFwiPHgtZm9vPmJhcjwveC1mb28+XCI7XG4gIGFjdGlvbnNFcXVhbChpbnB1dCwgW1xuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWyd0ZXh0JywgWzAsIDFdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMV1dLFxuICAgIFsnc3RhcnRQcm9ncmFtJywgWzEsIFtdXV0sXG4gICAgWydjb21wb25lbnQnLCBbMCwgMV1dLFxuICAgIFsnZW5kUHJvZ3JhbScsIFswXV1cbiAgXSk7XG59KTtcblxudGVzdChcImNvbW1lbnRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBpbnB1dCA9IFwiPCEtLSBzb21lIGNvbW1lbnQgLS0+XCI7XG4gIGFjdGlvbnNFcXVhbChpbnB1dCwgW1xuICAgIFsnc3RhcnRQcm9ncmFtJywgWzAsIFtdXV0sXG4gICAgWydjb21tZW50JywgWzAsIDFdXSxcbiAgICBbJ2VuZFByb2dyYW0nLCBbMF1dXG4gIF0pO1xufSk7XG4iXX0=
define('htmlbars-compiler-tests/template-visitor-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-compiler-tests');
  QUnit.test('htmlbars-compiler-tests/template-visitor-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-compiler-tests/template-visitor-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLXZpc2l0b3Itbm9kZS10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBQ2pELE9BQUssQ0FBQyxJQUFJLENBQUMsMEVBQTBFLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdEcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMkVBQTJFLENBQUMsQ0FBQztHQUM5RixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvdGVtcGxhdGUtdmlzaXRvci1ub2RlLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1jb21waWxlci10ZXN0cycpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtY29tcGlsZXItdGVzdHMvdGVtcGxhdGUtdmlzaXRvci1ub2RlLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLWNvbXBpbGVyLXRlc3RzL3RlbXBsYXRlLXZpc2l0b3Itbm9kZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
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
define('htmlbars-runtime.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('htmlbars-runtime.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-runtime.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNCLE9BQUssQ0FBQyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDcEUsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUNBQXlDLENBQUMsQ0FBQztHQUM1RCxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIC4nKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXJ1bnRpbWUuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXJ1bnRpbWUuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('htmlbars-runtime/expression-visitor.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-runtime');
  QUnit.test('htmlbars-runtime/expression-visitor.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-runtime/expression-visitor.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvZXhwcmVzc2lvbi12aXNpdG9yLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdkYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNERBQTRELENBQUMsQ0FBQztHQUMvRSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9leHByZXNzaW9uLXZpc2l0b3IuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1ydW50aW1lJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1ydW50aW1lL2V4cHJlc3Npb24tdmlzaXRvci5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtcnVudGltZS9leHByZXNzaW9uLXZpc2l0b3IuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('htmlbars-runtime/hooks.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-runtime');
  QUnit.test('htmlbars-runtime/hooks.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-runtime/hooks.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvaG9va3MuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDMUMsT0FBSyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMxRSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO0dBQ2xFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1ydW50aW1lL2hvb2tzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtcnVudGltZScpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtcnVudGltZS9ob29rcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtcnVudGltZS9ob29rcy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
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
define('htmlbars-runtime/morph.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-runtime');
  QUnit.test('htmlbars-runtime/morph.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-runtime/morph.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvbW9ycGguanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDMUMsT0FBSyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMxRSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO0dBQ2xFLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1ydW50aW1lL21vcnBoLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtcnVudGltZScpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtcnVudGltZS9tb3JwaC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtcnVudGltZS9tb3JwaC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
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
define('htmlbars-runtime/node-visitor.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-runtime');
  QUnit.test('htmlbars-runtime/node-visitor.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-runtime/node-visitor.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvbm9kZS12aXNpdG9yLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMscURBQXFELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDakYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0RBQXNELENBQUMsQ0FBQztHQUN6RSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9ub2RlLXZpc2l0b3IuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1ydW50aW1lJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1ydW50aW1lL25vZGUtdmlzaXRvci5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtcnVudGltZS9ub2RlLXZpc2l0b3IuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvcmVuZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7b0JBVXdCLE1BQU07Ozs7OztBQUY5QixNQUFJLFlBQVksR0FBRyw0QkFBNEIsQ0FBQzs7QUFFakMsV0FBUyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQzVELFFBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDbEIsUUFBSSxpQkFBaUIsQ0FBQzs7QUFFdEIsUUFBSSxPQUFPLEVBQUU7QUFDWCxVQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7QUFDdEIseUJBQWlCLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztPQUMxRCxNQUFNLElBQUksT0FBTyxDQUFDLGlCQUFpQixFQUFFO0FBQ3BDLHlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztPQUMvQztLQUNGOztBQUVELE9BQUcsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs7QUFFdkMsUUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUN4RixnQkFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDOztBQUV0QixXQUFPLFlBQVksQ0FBQztHQUNyQjs7QUFFRCxXQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFO0FBQzNHLFFBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO0FBQ3JCLFFBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDOztBQUV6QixRQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNuQixRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEs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QUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakYsa0JBQWMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdDLFdBQU8sS0FBSyxDQUFDO0dBQ2Q7O0FBRU0sV0FBUyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0FBQy9DLFFBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHO1FBQUUsUUFBUSxDQUFDO0FBQzVCLFFBQUksR0FBRyxDQUFDLGdCQUFnQixJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7QUFDeEMsVUFBSSxRQUFRLENBQUMsY0FBYyxLQUFLLElBQUksRUFBRTtBQUNwQyxnQkFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkMsWUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFO0FBQ3hCLGtCQUFRLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztTQUNwQyxNQUFNO0FBQ0wsa0JBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1NBQzdCO09BQ0Y7QUFDRCxVQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUU7QUFDM0IsZ0JBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7T0FDekQ7S0FDRixNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDcEIsY0FBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDeEM7O0FBRUQsV0FBTyxRQUFRLENBQUM7R0FDakIiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9yZW5kZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JFYWNoIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvYXJyYXktdXRpbHNcIjtcbmltcG9ydCB7IHZpc2l0Q2hpbGRyZW4gfSBmcm9tIFwiLi4vaHRtbGJhcnMtdXRpbC9tb3JwaC11dGlsc1wiO1xuaW1wb3J0IEV4cHJlc3Npb25WaXNpdG9yIGZyb20gXCIuL25vZGUtdmlzaXRvclwiO1xuaW1wb3J0IHsgQWx3YXlzRGlydHlWaXNpdG9yIH0gZnJvbSBcIi4vbm9kZS12aXNpdG9yXCI7XG5pbXBvcnQgTW9ycGggZnJvbSBcIi4vbW9ycGhcIjtcbmltcG9ydCB7IGNsZWFyTW9ycGggfSBmcm9tIFwiLi4vaHRtbGJhcnMtdXRpbC90ZW1wbGF0ZS11dGlsc1wiO1xuaW1wb3J0IHZvaWRNYXAgZnJvbSAnLi4vaHRtbGJhcnMtdXRpbC92b2lkLXRhZy1uYW1lcyc7XG5cbnZhciBzdmdOYW1lc3BhY2UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlbmRlcih0ZW1wbGF0ZSwgZW52LCBzY29wZSwgb3B0aW9ucykge1xuICB2YXIgZG9tID0gZW52LmRvbTtcbiAgdmFyIGNvbnRleHR1YWxFbGVtZW50O1xuXG4gIGlmIChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMucmVuZGVyTm9kZSkge1xuICAgICAgY29udGV4dHVhbEVsZW1lbnQgPSBvcHRpb25zLnJlbmRlck5vZGUuY29udGV4dHVhbEVsZW1lbnQ7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnRleHR1YWxFbGVtZW50KSB7XG4gICAgICBjb250ZXh0dWFsRWxlbWVudCA9IG9wdGlvbnMuY29udGV4dHVhbEVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgZG9tLmRldGVjdE5hbWVzcGFjZShjb250ZXh0dWFsRWxlbWVudCk7XG5cbiAgdmFyIHJlbmRlclJlc3VsdCA9IFJlbmRlclJlc3VsdC5idWlsZChlbnYsIHNjb3BlLCB0ZW1wbGF0ZSwgb3B0aW9ucywgY29udGV4dHVhbEVsZW1lbnQpO1xuICByZW5kZXJSZXN1bHQucmVuZGVyKCk7XG5cbiAgcmV0dXJuIHJlbmRlclJlc3VsdDtcbn1cblxuZnVuY3Rpb24gUmVuZGVyUmVzdWx0KGVudiwgc2NvcGUsIG9wdGlvbnMsIHJvb3ROb2RlLCBvd25lck5vZGUsIG5vZGVzLCBmcmFnbWVudCwgdGVtcGxhdGUsIHNob3VsZFNldENvbnRlbnQpIHtcbiAgdGhpcy5yb290ID0gcm9vdE5vZGU7XG4gIHRoaXMuZnJhZ21lbnQgPSBmcmFnbWVudDtcblxuICB0aGlzLm5vZGVzID0gbm9kZXM7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgdGhpcy5zdGF0ZW1lbnRzID0gdGVtcGxhdGUuc3RhdGVtZW50cy5zbGljZSgpO1xuICB0aGlzLmVudiA9IGVudjtcbiAgdGhpcy5zY29wZSA9IHNjb3BlO1xuICB0aGlzLnNob3VsZFNldENvbnRlbnQgPSBzaG91bGRTZXRDb250ZW50O1xuXG4gIHRoaXMuYmluZFNjb3BlKCk7XG5cbiAgaWYgKG9wdGlvbnMuc2VsZiAhPT0gdW5kZWZpbmVkKSB7IHRoaXMuYmluZFNlbGYob3B0aW9ucy5zZWxmKTsgfVxuICBpZiAob3B0aW9ucy5ibG9ja0FyZ3VtZW50cyAhPT0gdW5kZWZpbmVkKSB7IHRoaXMuYmluZExvY2FscyhvcHRpb25zLmJsb2NrQXJndW1lbnRzKTsgfVxuXG4gIHRoaXMuaW5pdGlhbGl6ZU5vZGVzKG93bmVyTm9kZSk7XG59XG5cblJlbmRlclJlc3VsdC5idWlsZCA9IGZ1bmN0aW9uKGVudiwgc2NvcGUsIHRlbXBsYXRlLCBvcHRpb25zLCBjb250ZXh0dWFsRWxlbWVudCkge1xuICB2YXIgZG9tID0gZW52LmRvbTtcbiAgdmFyIGZyYWdtZW50ID0gZ2V0Q2FjaGVkRnJhZ21lbnQodGVtcGxhdGUsIGVudik7XG4gIHZhciBub2RlcyA9IHRlbXBsYXRlLmJ1aWxkUmVuZGVyTm9kZXMoZG9tLCBmcmFnbWVudCwgY29udGV4dHVhbEVsZW1lbnQpO1xuXG4gIHZhciByb290Tm9kZSwgb3duZXJOb2RlLCBzaG91bGRTZXRDb250ZW50O1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVuZGVyTm9kZSkge1xuICAgIHJvb3ROb2RlID0gb3B0aW9ucy5yZW5kZXJOb2RlO1xuICAgIG93bmVyTm9kZSA9IHJvb3ROb2RlLm93bmVyTm9kZTtcbiAgICBzaG91bGRTZXRDb250ZW50ID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByb290Tm9kZSA9IGRvbS5jcmVhdGVNb3JwaChudWxsLCBmcmFnbWVudC5maXJzdENoaWxkLCBmcmFnbWVudC5sYXN0Q2hpbGQsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAgICBvd25lck5vZGUgPSByb290Tm9kZTtcbiAgICBpbml0aWFsaXplTm9kZShyb290Tm9kZSwgb3duZXJOb2RlKTtcbiAgICBzaG91bGRTZXRDb250ZW50ID0gZmFsc2U7XG4gIH1cblxuICBpZiAocm9vdE5vZGUuY2hpbGROb2Rlcykge1xuICAgIHZpc2l0Q2hpbGRyZW4ocm9vdE5vZGUuY2hpbGROb2RlcywgZnVuY3Rpb24obm9kZSkge1xuICAgICAgY2xlYXJNb3JwaChub2RlLCBlbnYsIHRydWUpO1xuICAgIH0pO1xuICB9XG5cbiAgcm9vdE5vZGUuY2hpbGROb2RlcyA9IG5vZGVzO1xuICByZXR1cm4gbmV3IFJlbmRlclJlc3VsdChlbnYsIHNjb3BlLCBvcHRpb25zLCByb290Tm9kZSwgb3duZXJOb2RlLCBub2RlcywgZnJhZ21lbnQsIHRlbXBsYXRlLCBzaG91bGRTZXRDb250ZW50KTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBtYW51YWxFbGVtZW50KHRhZ05hbWUsIGF0dHJpYnV0ZXMsIF9pc0VtcHR5KSB7XG4gIHZhciBzdGF0ZW1lbnRzID0gW107XG5cbiAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXNba2V5XSA9PT0gJ3N0cmluZycpIHsgY29udGludWU7IH1cbiAgICBzdGF0ZW1lbnRzLnB1c2goW1wiYXR0cmlidXRlXCIsIGtleSwgYXR0cmlidXRlc1trZXldXSk7XG4gIH1cblxuICB2YXIgaXNFbXB0eSA9IF9pc0VtcHR5IHx8IHZvaWRNYXBbdGFnTmFtZV07XG5cbiAgaWYgKCFpc0VtcHR5KSB7XG4gICAgc3RhdGVtZW50cy5wdXNoKFsnY29udGVudCcsICd5aWVsZCddKTtcbiAgfVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHtcbiAgICBhcml0eTogMCxcbiAgICBjYWNoZWRGcmFnbWVudDogbnVsbCxcbiAgICBoYXNSZW5kZXJlZDogZmFsc2UsXG4gICAgYnVpbGRGcmFnbWVudDogZnVuY3Rpb24gYnVpbGRGcmFnbWVudChkb20pIHtcbiAgICAgIHZhciBlbDAgPSBkb20uY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgaWYgKHRhZ05hbWUgPT09ICdzdmcnKSB7XG4gICAgICAgIGRvbS5zZXROYW1lc3BhY2Uoc3ZnTmFtZXNwYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBlbDEgPSBkb20uY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcblxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhdHRyaWJ1dGVzW2tleV0gIT09ICdzdHJpbmcnKSB7IGNvbnRpbnVlOyB9XG4gICAgICAgIGRvbS5zZXRBdHRyaWJ1dGUoZWwxLCBrZXksIGF0dHJpYnV0ZXNba2V5XSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNFbXB0eSkge1xuICAgICAgICB2YXIgZWwyID0gZG9tLmNyZWF0ZUNvbW1lbnQoXCJcIik7XG4gICAgICAgIGRvbS5hcHBlbmRDaGlsZChlbDEsIGVsMik7XG4gICAgICB9XG5cbiAgICAgIGRvbS5hcHBlbmRDaGlsZChlbDAsIGVsMSk7XG5cbiAgICAgIHJldHVybiBlbDA7XG4gICAgfSxcbiAgICBidWlsZFJlbmRlck5vZGVzOiBmdW5jdGlvbiBidWlsZFJlbmRlck5vZGVzKGRvbSwgZnJhZ21lbnQpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZG9tLmNoaWxkQXQoZnJhZ21lbnQsIFswXSk7XG4gICAgICB2YXIgbW9ycGhzID0gW107XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXR0cmlidXRlc1trZXldID09PSAnc3RyaW5nJykgeyBjb250aW51ZTsgfVxuICAgICAgICBtb3JwaHMucHVzaChkb20uY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsIGtleSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzRW1wdHkpIHtcbiAgICAgICAgbW9ycGhzLnB1c2goZG9tLmNyZWF0ZU1vcnBoQXQoZWxlbWVudCwgMCwgMCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbW9ycGhzO1xuICAgIH0sXG4gICAgc3RhdGVtZW50czogc3RhdGVtZW50cyxcbiAgICBsb2NhbHM6IFtdLFxuICAgIHRlbXBsYXRlczogW11cbiAgfTtcblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdHRhY2hBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpIHtcbiAgdmFyIHN0YXRlbWVudHMgPSBbXTtcblxuICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgIGlmICh0eXBlb2YgYXR0cmlidXRlc1trZXldID09PSAnc3RyaW5nJykgeyBjb250aW51ZTsgfVxuICAgIHN0YXRlbWVudHMucHVzaChbXCJhdHRyaWJ1dGVcIiwga2V5LCBhdHRyaWJ1dGVzW2tleV1dKTtcbiAgfVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHtcbiAgICBhcml0eTogMCxcbiAgICBjYWNoZWRGcmFnbWVudDogbnVsbCxcbiAgICBoYXNSZW5kZXJlZDogZmFsc2UsXG4gICAgYnVpbGRGcmFnbWVudDogZnVuY3Rpb24gYnVpbGRGcmFnbWVudChkb20pIHtcbiAgICAgIHZhciBlbDAgPSB0aGlzLmVsZW1lbnQ7XG4gICAgICBpZiAoZWwwLm5hbWVzcGFjZVVSSSA9PT0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKSB7XG4gICAgICAgIGRvbS5zZXROYW1lc3BhY2Uoc3ZnTmFtZXNwYWNlKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXR0cmlidXRlc1trZXldICE9PSAnc3RyaW5nJykgeyBjb250aW51ZTsgfVxuICAgICAgICBkb20uc2V0QXR0cmlidXRlKGVsMCwga2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZWwwO1xuICAgIH0sXG4gICAgYnVpbGRSZW5kZXJOb2RlczogZnVuY3Rpb24gYnVpbGRSZW5kZXJOb2Rlcyhkb20pIHtcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIG1vcnBocyA9IFtdO1xuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXNba2V5XSA9PT0gJ3N0cmluZycpIHsgY29udGludWU7IH1cbiAgICAgICAgbW9ycGhzLnB1c2goZG9tLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCBrZXkpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1vcnBocztcbiAgICB9LFxuICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgbG9jYWxzOiBbXSxcbiAgICB0ZW1wbGF0ZXM6IFtdLFxuICAgIGVsZW1lbnQ6IG51bGxcbiAgfTtcblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUuaW5pdGlhbGl6ZU5vZGVzID0gZnVuY3Rpb24ob3duZXJOb2RlKSB7XG4gIGZvckVhY2godGhpcy5yb290LmNoaWxkTm9kZXMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpbml0aWFsaXplTm9kZShub2RlLCBvd25lck5vZGUpO1xuICB9KTtcbn07XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucm9vdC5sYXN0UmVzdWx0ID0gdGhpcztcbiAgdGhpcy5yb290LnJlbmRlcmVkID0gdHJ1ZTtcbiAgdGhpcy5wb3B1bGF0ZU5vZGVzKEFsd2F5c0RpcnR5VmlzaXRvcik7XG5cbiAgaWYgKHRoaXMuc2hvdWxkU2V0Q29udGVudCAmJiB0aGlzLnJvb3Quc2V0Q29udGVudCkge1xuICAgIHRoaXMucm9vdC5zZXRDb250ZW50KHRoaXMuZnJhZ21lbnQpO1xuICB9XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmRpcnR5ID0gZnVuY3Rpb24oKSB7XG4gIHZpc2l0Q2hpbGRyZW4oW3RoaXMucm9vdF0sIGZ1bmN0aW9uKG5vZGUpIHsgbm9kZS5pc0RpcnR5ID0gdHJ1ZTsgfSk7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnJldmFsaWRhdGUgPSBmdW5jdGlvbihlbnYsIHNlbGYsIGJsb2NrQXJndW1lbnRzLCBzY29wZSkge1xuICB0aGlzLnJldmFsaWRhdGVXaXRoKGVudiwgc2NvcGUsIHNlbGYsIGJsb2NrQXJndW1lbnRzLCBFeHByZXNzaW9uVmlzaXRvcik7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnJlcmVuZGVyID0gZnVuY3Rpb24oZW52LCBzZWxmLCBibG9ja0FyZ3VtZW50cywgc2NvcGUpIHtcbiAgdGhpcy5yZXZhbGlkYXRlV2l0aChlbnYsIHNjb3BlLCBzZWxmLCBibG9ja0FyZ3VtZW50cywgQWx3YXlzRGlydHlWaXNpdG9yKTtcbn07XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUucmV2YWxpZGF0ZVdpdGggPSBmdW5jdGlvbihlbnYsIHNjb3BlLCBzZWxmLCBibG9ja0FyZ3VtZW50cywgdmlzaXRvcikge1xuICBpZiAoZW52ICE9PSB1bmRlZmluZWQpIHsgdGhpcy5lbnYgPSBlbnY7IH1cbiAgaWYgKHNjb3BlICE9PSB1bmRlZmluZWQpIHsgdGhpcy5zY29wZSA9IHNjb3BlOyB9XG4gIHRoaXMudXBkYXRlU2NvcGUoKTtcblxuICBpZiAoc2VsZiAhPT0gdW5kZWZpbmVkKSB7IHRoaXMudXBkYXRlU2VsZihzZWxmKTsgfVxuICBpZiAoYmxvY2tBcmd1bWVudHMgIT09IHVuZGVmaW5lZCkgeyB0aGlzLnVwZGF0ZUxvY2FscyhibG9ja0FyZ3VtZW50cyk7IH1cblxuICB0aGlzLnBvcHVsYXRlTm9kZXModmlzaXRvcik7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJvb3ROb2RlID0gdGhpcy5yb290O1xuICBjbGVhck1vcnBoKHJvb3ROb2RlLCB0aGlzLmVudiwgdHJ1ZSk7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnBvcHVsYXRlTm9kZXMgPSBmdW5jdGlvbih2aXNpdG9yKSB7XG4gIHZhciBlbnYgPSB0aGlzLmVudjtcbiAgdmFyIHNjb3BlID0gdGhpcy5zY29wZTtcbiAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZTtcbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgdmFyIHN0YXRlbWVudHMgPSB0aGlzLnN0YXRlbWVudHM7XG4gIHZhciBpLCBsO1xuXG4gIGZvciAoaT0wLCBsPXN0YXRlbWVudHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuICAgIHZhciBtb3JwaCA9IG5vZGVzW2ldO1xuXG4gICAgaWYgKGVudi5ob29rcy53aWxsUmVuZGVyTm9kZSkge1xuICAgICAgZW52Lmhvb2tzLndpbGxSZW5kZXJOb2RlKG1vcnBoLCBlbnYsIHNjb3BlKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHN0YXRlbWVudFswXSkge1xuICAgICAgY2FzZSAnYmxvY2snOiB2aXNpdG9yLmJsb2NrKHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgICBjYXNlICdpbmxpbmUnOiB2aXNpdG9yLmlubGluZShzdGF0ZW1lbnQsIG1vcnBoLCBlbnYsIHNjb3BlLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgICBjYXNlICdjb250ZW50JzogdmlzaXRvci5jb250ZW50KHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUsIHZpc2l0b3IpOyBicmVhaztcbiAgICAgIGNhc2UgJ2VsZW1lbnQnOiB2aXNpdG9yLmVsZW1lbnQoc3RhdGVtZW50LCBtb3JwaCwgZW52LCBzY29wZSwgdGVtcGxhdGUsIHZpc2l0b3IpOyBicmVhaztcbiAgICAgIGNhc2UgJ2F0dHJpYnV0ZSc6IHZpc2l0b3IuYXR0cmlidXRlKHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUpOyBicmVhaztcbiAgICAgIGNhc2UgJ2NvbXBvbmVudCc6IHZpc2l0b3IuY29tcG9uZW50KHN0YXRlbWVudCwgbW9ycGgsIGVudiwgc2NvcGUsIHRlbXBsYXRlLCB2aXNpdG9yKTsgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGVudi5ob29rcy5kaWRSZW5kZXJOb2RlKSB7XG4gICAgICBlbnYuaG9va3MuZGlkUmVuZGVyTm9kZShtb3JwaCwgZW52LCBzY29wZSk7XG4gICAgfVxuICB9XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmJpbmRTY29wZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVudi5ob29rcy5iaW5kU2NvcGUodGhpcy5lbnYsIHRoaXMuc2NvcGUpO1xufTtcblxuUmVuZGVyUmVzdWx0LnByb3RvdHlwZS51cGRhdGVTY29wZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVudi5ob29rcy51cGRhdGVTY29wZSh0aGlzLmVudiwgdGhpcy5zY29wZSk7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLmJpbmRTZWxmID0gZnVuY3Rpb24oc2VsZikge1xuICB0aGlzLmVudi5ob29rcy5iaW5kU2VsZih0aGlzLmVudiwgdGhpcy5zY29wZSwgc2VsZik7XG59O1xuXG5SZW5kZXJSZXN1bHQucHJvdG90eXBlLnVwZGF0ZVNlbGYgPSBmdW5jdGlvbihzZWxmKSB7XG4gIHRoaXMuZW52Lmhvb2tzLnVwZGF0ZVNlbGYodGhpcy5lbnYsIHRoaXMuc2NvcGUsIHNlbGYpO1xufTtcblxuUmVuZGVyUmVzdWx0LnByb3RvdHlwZS5iaW5kTG9jYWxzID0gZnVuY3Rpb24oYmxvY2tBcmd1bWVudHMpIHtcbiAgdmFyIGxvY2FsTmFtZXMgPSB0aGlzLnRlbXBsYXRlLmxvY2FscztcblxuICBmb3IgKHZhciBpPTAsIGw9bG9jYWxOYW1lcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgdGhpcy5lbnYuaG9va3MuYmluZExvY2FsKHRoaXMuZW52LCB0aGlzLnNjb3BlLCBsb2NhbE5hbWVzW2ldLCBibG9ja0FyZ3VtZW50c1tpXSk7XG4gIH1cbn07XG5cblJlbmRlclJlc3VsdC5wcm90b3R5cGUudXBkYXRlTG9jYWxzID0gZnVuY3Rpb24oYmxvY2tBcmd1bWVudHMpIHtcbiAgdmFyIGxvY2FsTmFtZXMgPSB0aGlzLnRlbXBsYXRlLmxvY2FscztcblxuICBmb3IgKHZhciBpPTAsIGw9bG9jYWxOYW1lcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgdGhpcy5lbnYuaG9va3MudXBkYXRlTG9jYWwodGhpcy5lbnYsIHRoaXMuc2NvcGUsIGxvY2FsTmFtZXNbaV0sIGJsb2NrQXJndW1lbnRzW2ldKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZU5vZGUobm9kZSwgb3duZXIpIHtcbiAgbm9kZS5vd25lck5vZGUgPSBvd25lcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNoaWxkTW9ycGgoZG9tLCBwYXJlbnRNb3JwaCwgY29udGV4dHVhbEVsZW1lbnQpIHtcbiAgdmFyIG1vcnBoID0gTW9ycGguZW1wdHkoZG9tLCBjb250ZXh0dWFsRWxlbWVudCB8fCBwYXJlbnRNb3JwaC5jb250ZXh0dWFsRWxlbWVudCk7XG4gIGluaXRpYWxpemVOb2RlKG1vcnBoLCBwYXJlbnRNb3JwaC5vd25lck5vZGUpO1xuICByZXR1cm4gbW9ycGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYWNoZWRGcmFnbWVudCh0ZW1wbGF0ZSwgZW52KSB7XG4gIHZhciBkb20gPSBlbnYuZG9tLCBmcmFnbWVudDtcbiAgaWYgKGVudi51c2VGcmFnbWVudENhY2hlICYmIGRvbS5jYW5DbG9uZSkge1xuICAgIGlmICh0ZW1wbGF0ZS5jYWNoZWRGcmFnbWVudCA9PT0gbnVsbCkge1xuICAgICAgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5idWlsZEZyYWdtZW50KGRvbSk7XG4gICAgICBpZiAodGVtcGxhdGUuaGFzUmVuZGVyZWQpIHtcbiAgICAgICAgdGVtcGxhdGUuY2FjaGVkRnJhZ21lbnQgPSBmcmFnbWVudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRlbXBsYXRlLmhhc1JlbmRlcmVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLmNhY2hlZEZyYWdtZW50KSB7XG4gICAgICBmcmFnbWVudCA9IGRvbS5jbG9uZU5vZGUodGVtcGxhdGUuY2FjaGVkRnJhZ21lbnQsIHRydWUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICghZnJhZ21lbnQpIHtcbiAgICBmcmFnbWVudCA9IHRlbXBsYXRlLmJ1aWxkRnJhZ21lbnQoZG9tKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn1cbiJdfQ==
define('htmlbars-runtime/render.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-runtime');
  QUnit.test('htmlbars-runtime/render.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-runtime/render.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXJ1bnRpbWUvcmVuZGVyLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMsK0NBQStDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDM0UsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZ0RBQWdELENBQUMsQ0FBQztHQUNuRSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtcnVudGltZS9yZW5kZXIuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1ydW50aW1lJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1ydW50aW1lL3JlbmRlci5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtcnVudGltZS9yZW5kZXIuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('morph-attr.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('morph-attr.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-attr.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHIuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNCLE9BQUssQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDOUQsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUNBQW1DLENBQUMsQ0FBQztHQUN0RCxDQUFDLENBQUMiLCJmaWxlIjoibW9ycGgtYXR0ci5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIC4nKTtcblFVbml0LnRlc3QoJ21vcnBoLWF0dHIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ21vcnBoLWF0dHIuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('morph-attr/sanitize-attribute-value.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-attr');
  QUnit.test('morph-attr/sanitize-attribute-value.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-attr/sanitize-attribute-value.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHIvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BDLE9BQUssQ0FBQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdkYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNERBQTRELENBQUMsQ0FBQztHQUMvRSxDQUFDLENBQUMiLCJmaWxlIjoibW9ycGgtYXR0ci9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBtb3JwaC1hdHRyJyk7XG5RVW5pdC50ZXN0KCdtb3JwaC1hdHRyL3Nhbml0aXplLWF0dHJpYnV0ZS12YWx1ZS5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnbW9ycGgtYXR0ci9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('morph-range.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('morph-range.js should pass jshint', function (assert) {
    assert.ok(false, 'morph-range.js should pass jshint.\nmorph-range.js: line 221, col 49, Expected a conditional expression and instead saw an assignment.\nmorph-range.js: line 241, col 49, Expected a conditional expression and instead saw an assignment.\n\n2 errors');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMzQixPQUFLLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQy9ELFVBQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLHdQQUF3UCxDQUFDLENBQUM7R0FDNVEsQ0FBQyxDQUFDIiwiZmlsZSI6Im1vcnBoLXJhbmdlLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gLicpO1xuUVVuaXQudGVzdCgnbW9ycGgtcmFuZ2UuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2soZmFsc2UsICdtb3JwaC1yYW5nZS5qcyBzaG91bGQgcGFzcyBqc2hpbnQuXFxubW9ycGgtcmFuZ2UuanM6IGxpbmUgMjIxLCBjb2wgNDksIEV4cGVjdGVkIGEgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBhbmQgaW5zdGVhZCBzYXcgYW4gYXNzaWdubWVudC5cXG5tb3JwaC1yYW5nZS5qczogbGluZSAyNDEsIGNvbCA0OSwgRXhwZWN0ZWQgYSBjb25kaXRpb25hbCBleHByZXNzaW9uIGFuZCBpbnN0ZWFkIHNhdyBhbiBhc3NpZ25tZW50LlxcblxcbjIgZXJyb3JzJyk7IFxufSk7XG4iXX0=
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
define('morph-range.umd.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - .');
  QUnit.test('morph-range.umd.js should pass jshint', function (assert) {
    assert.ok(false, 'morph-range.umd.js should pass jshint.\nmorph-range.umd.js: line 4, col 39, \'define\' is not defined.\nmorph-range.umd.js: line 5, col 5, \'define\' is not defined.\nmorph-range.umd.js: line 7, col 5, \'module\' is not defined.\n\n3 errors');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlLnVtZC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDM0IsT0FBSyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUNuRSxVQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxrUEFBa1AsQ0FBQyxDQUFDO0dBQ3RRLENBQUMsQ0FBQyIsImZpbGUiOiJtb3JwaC1yYW5nZS51bWQuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSAuJyk7XG5RVW5pdC50ZXN0KCdtb3JwaC1yYW5nZS51bWQuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2soZmFsc2UsICdtb3JwaC1yYW5nZS51bWQuanMgc2hvdWxkIHBhc3MganNoaW50Llxcbm1vcnBoLXJhbmdlLnVtZC5qczogbGluZSA0LCBjb2wgMzksIFxcJ2RlZmluZVxcJyBpcyBub3QgZGVmaW5lZC5cXG5tb3JwaC1yYW5nZS51bWQuanM6IGxpbmUgNSwgY29sIDUsIFxcJ2RlZmluZVxcJyBpcyBub3QgZGVmaW5lZC5cXG5tb3JwaC1yYW5nZS51bWQuanM6IGxpbmUgNywgY29sIDUsIFxcJ21vZHVsZVxcJyBpcyBub3QgZGVmaW5lZC5cXG5cXG4zIGVycm9ycycpOyBcbn0pO1xuIl19
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
define('morph-range/morph-list.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-range');
  QUnit.test('morph-range/morph-list.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-range/morph-list.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL21vcnBoLWxpc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDckMsT0FBSyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMxRSxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO0dBQ2xFLENBQUMsQ0FBQyIsImZpbGUiOiJtb3JwaC1yYW5nZS9tb3JwaC1saXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gbW9ycGgtcmFuZ2UnKTtcblFVbml0LnRlc3QoJ21vcnBoLXJhbmdlL21vcnBoLWxpc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ21vcnBoLXJhbmdlL21vcnBoLWxpc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
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
define('morph-range/morph-list.umd.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-range');
  QUnit.test('morph-range/morph-list.umd.js should pass jshint', function (assert) {
    assert.ok(false, 'morph-range/morph-list.umd.js should pass jshint.\nmorph-range/morph-list.umd.js: line 4, col 39, \'define\' is not defined.\nmorph-range/morph-list.umd.js: line 5, col 5, \'define\' is not defined.\nmorph-range/morph-list.umd.js: line 7, col 5, \'module\' is not defined.\n\n3 errors');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL21vcnBoLWxpc3QudW1kLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ3JDLE9BQUssQ0FBQyxJQUFJLENBQUMsa0RBQWtELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDOUUsVUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsOFJBQThSLENBQUMsQ0FBQztHQUNsVCxDQUFDLENBQUMiLCJmaWxlIjoibW9ycGgtcmFuZ2UvbW9ycGgtbGlzdC51bWQuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBtb3JwaC1yYW5nZScpO1xuUVVuaXQudGVzdCgnbW9ycGgtcmFuZ2UvbW9ycGgtbGlzdC51bWQuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2soZmFsc2UsICdtb3JwaC1yYW5nZS9tb3JwaC1saXN0LnVtZC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuXFxubW9ycGgtcmFuZ2UvbW9ycGgtbGlzdC51bWQuanM6IGxpbmUgNCwgY29sIDM5LCBcXCdkZWZpbmVcXCcgaXMgbm90IGRlZmluZWQuXFxubW9ycGgtcmFuZ2UvbW9ycGgtbGlzdC51bWQuanM6IGxpbmUgNSwgY29sIDUsIFxcJ2RlZmluZVxcJyBpcyBub3QgZGVmaW5lZC5cXG5tb3JwaC1yYW5nZS9tb3JwaC1saXN0LnVtZC5qczogbGluZSA3LCBjb2wgNSwgXFwnbW9kdWxlXFwnIGlzIG5vdCBkZWZpbmVkLlxcblxcbjMgZXJyb3JzJyk7IFxufSk7XG4iXX0=
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
define('morph-range/utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-range');
  QUnit.test('morph-range/utils.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-range/utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL3V0aWxzLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ3JDLE9BQUssQ0FBQyxJQUFJLENBQUMseUNBQXlDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDckUsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMENBQTBDLENBQUMsQ0FBQztHQUM3RCxDQUFDLENBQUMiLCJmaWxlIjoibW9ycGgtcmFuZ2UvdXRpbHMuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBtb3JwaC1yYW5nZScpO1xuUVVuaXQudGVzdCgnbW9ycGgtcmFuZ2UvdXRpbHMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ21vcnBoLXJhbmdlL3V0aWxzLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==