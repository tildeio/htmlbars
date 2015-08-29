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
define("morph-attr-tests/attr-morph-test", ["exports", "../dom-helper", "htmlbars-util/safe-string"], function (exports, _domHelper, _htmlbarsUtilSafeString) {

  var svgNamespace = "http://www.w3.org/2000/svg",
      xlinkNamespace = "http://www.w3.org/1999/xlink";
  var domHelper = new _domHelper.default();

  QUnit.module('AttrMorph');

  test("can update a dom node", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.setContent('twang');
    equal(element.id, 'twang', 'id property is set');
    equal(element.getAttribute('id'), 'twang', 'id attribute is set');
  });

  test("can clear", function () {
    expect(0);
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.clear();
  });

  test("calling destroy does not throw", function () {
    expect(1);
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');

    morph.destroy();

    equal(morph.element, null, 'clears element from morph');
  });

  test("can update property", function () {
    var element = domHelper.createElement('input');
    var morph = domHelper.createAttrMorph(element, 'disabled');
    morph.setContent(true);
    equal(element.disabled, true, 'disabled property is set');
    morph.setContent(false);
    equal(element.disabled, false, 'disabled property is set');
  });

  test("input.maxLength", function () {
    var element = domHelper.createElement('input');
    var morph = domHelper.createAttrMorph(element, 'maxLength');
    // different browsers have different defaults FF: -1, Chrome/Blink: 524288;
    var MAX_LENGTH = element.maxLength;

    morph.setContent(null);
    equal(element.maxLength, MAX_LENGTH, 'property is w/e is default');

    morph.setContent(1);
    equal(element.maxLength, 1, 'should be 1');

    morph.setContent(null);
    equal(element.maxLength, 0, 'property 0, result of element.maxLength = ""');
  });

  test("input.maxlength (all lowercase)", function () {
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

  test("does not add undefined properties on initial render", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.setContent(undefined);
    equal(element.id, '', 'property should not be set');
    morph.setContent('foo-bar');
    equal(element.id, 'foo-bar', 'property should be set');
  });

  test("does not add null properties on initial render", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.setContent(null);
    equal(element.id, '', 'property should not be set');
    morph.setContent('foo-bar');
    equal(element.id, 'foo-bar', 'property should be set');
  });

  test("can update attribute", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'data-bop');
    morph.setContent('kpow');
    equal(element.getAttribute('data-bop'), 'kpow', 'data-bop attribute is set');
    morph.setContent(null);
    equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
  });

  test("can remove ns attribute with null", function () {
    var element = domHelper.createElement('svg');
    domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
    var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
    morph.setContent(null);
    equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
  });

  test("can remove attribute with undefined", function () {
    var element = domHelper.createElement('div');
    element.setAttribute('data-bop', 'kpow');
    var morph = domHelper.createAttrMorph(element, 'data-bop');
    morph.setContent(undefined);
    equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
  });

  test("can remove ns attribute with undefined", function () {
    var element = domHelper.createElement('svg');
    domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
    var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
    morph.setContent(undefined);
    equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
  });

  test("can update svg attribute", function () {
    domHelper.setNamespace(svgNamespace);
    var element = domHelper.createElement('svg');
    var morph = domHelper.createAttrMorph(element, 'height');
    morph.setContent('50%');
    equal(element.getAttribute('height'), '50%', 'svg attr is set');
    morph.setContent(null);
    equal(element.getAttribute('height'), undefined, 'svg attr is removed');
  });

  test("can update style attribute", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'style');
    morph.setContent('color: red;');
    equal(element.getAttribute('style'), 'color: red;', 'style attr is set');
    morph.setContent(null);
    equal(element.getAttribute('style'), undefined, 'style attr is removed');
  });

  var badTags = [{ tag: 'a', attr: 'href' }, { tag: 'body', attr: 'background' }, { tag: 'link', attr: 'href' }, { tag: 'img', attr: 'src' }, { tag: 'iframe', attr: 'src' }];

  for (var i = 0, l = badTags.length; i < l; i++) {
    (function () {
      var subject = badTags[i];

      test(subject.tag + " " + subject.attr + " is sanitized when using blacklisted protocol", function () {
        var element = document.createElement(subject.tag);
        var morph = domHelper.createAttrMorph(element, subject.attr);
        morph.setContent('javascript://example.com');

        equal(element.getAttribute(subject.attr), 'unsafe:javascript://example.com', 'attribute is escaped');
      });

      test(subject.tag + " " + subject.attr + " is not sanitized when using non-whitelisted protocol with a SafeString", function () {
        var element = document.createElement(subject.tag);
        var morph = domHelper.createAttrMorph(element, subject.attr);
        try {
          morph.setContent(new _htmlbarsUtilSafeString.default('javascript://example.com'));

          equal(element.getAttribute(subject.attr), 'javascript://example.com', 'attribute is not escaped');
        } catch (e) {
          // IE does not allow javascript: to be set on img src
          ok(true, 'caught exception ' + e);
        }
      });

      test(subject.tag + " " + subject.attr + " is not sanitized when using unsafe attr morph", function () {
        var element = document.createElement(subject.tag);
        var morph = domHelper.createUnsafeAttrMorph(element, subject.attr);
        try {
          morph.setContent('javascript://example.com');

          equal(element.getAttribute(subject.attr), 'javascript://example.com', 'attribute is not escaped');
        } catch (e) {
          // IE does not allow javascript: to be set on img src
          ok(true, 'caught exception ' + e);
        }
      });
    })(); //jshint ignore:line
  }

  if (document && document.createElementNS) {

    test("detects attribute's namespace if it is not passed as an argument", function () {
      var element = domHelper.createElement('div');
      var morph = domHelper.createAttrMorph(element, 'xlink:href');
      morph.setContent('#circle');
      equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink', 'attribute has correct namespace');
    });

    test("can update namespaced attribute", function () {
      domHelper.setNamespace(svgNamespace);
      var element = domHelper.createElement('svg');
      var morph = domHelper.createAttrMorph(element, 'xlink:href', 'http://www.w3.org/1999/xlink');
      morph.setContent('#other');
      equal(element.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), '#other', 'namespaced attr is set');
      equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
      equal(element.attributes[0].name, 'xlink:href');
      equal(element.attributes[0].localName, 'href');
      equal(element.attributes[0].value, '#other');
      morph.setContent(null);
      // safari returns '' while other browsers return undefined
      equal(!!element.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), false, 'namespaced attr is removed');
    });
  }

  test("embed src as data uri is sanitized", function () {
    var element = document.createElement('embed');
    var morph = domHelper.createAttrMorph(element, 'src');
    morph.setContent('data:image/svg+xml;base64,PH');

    equal(element.getAttribute('src'), 'unsafe:data:image/svg+xml;base64,PH', 'attribute is escaped');
  });
});
/* jshint scripturl:true */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHItdGVzdHMvYXR0ci1tb3JwaC10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsTUFBSSxZQUFZLEdBQUcsNEJBQTRCO01BQzNDLGNBQWMsR0FBRyw4QkFBOEIsQ0FBQztBQUNwRCxNQUFJLFNBQVMsR0FBRyx3QkFBZSxDQUFDOztBQUVoQyxPQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztBQUUxQixNQUFJLENBQUMsdUJBQXVCLEVBQUUsWUFBVTtBQUN0QyxRQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzdDLFFBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JELFNBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUIsU0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7QUFDakQsU0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixDQUFDLENBQUM7R0FDbkUsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxXQUFXLEVBQUUsWUFBVTtBQUMxQixVQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixRQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzdDLFFBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JELFNBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztHQUNmLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsZ0NBQWdDLEVBQUUsWUFBVTtBQUMvQyxVQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixRQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxD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QyxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0FBQ3pHLFdBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO0FBQzFFLFdBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNoRCxXQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDL0MsV0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzdDLFdBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXZCLFdBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyw4QkFBOEIsRUFBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztLQUM3RyxDQUFDLENBQUM7R0FFRjs7QUFFRCxNQUFJLENBQUMsb0NBQW9DLEVBQUUsWUFBVztBQUNwRCxRQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLFFBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3RELFNBQUssQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMsQ0FBQzs7QUFFakQsU0FBSyxDQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQzVCLHFDQUFxQyxFQUNyQyxzQkFBc0IsQ0FBQyxDQUFDO0dBQy9CLENBQUMsQ0FBQyIsImZpbGUiOiJtb3JwaC1hdHRyLXRlc3RzL2F0dHItbW9ycGgtdGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGpzaGludCBzY3JpcHR1cmw6dHJ1ZSAqL1xuXG5pbXBvcnQgRE9NSGVscGVyIGZyb20gXCIuLi9kb20taGVscGVyXCI7XG5pbXBvcnQgU2FmZVN0cmluZyBmcm9tIFwiaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZ1wiO1xuXG52YXIgc3ZnTmFtZXNwYWNlID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLFxuICAgIHhsaW5rTmFtZXNwYWNlID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG52YXIgZG9tSGVscGVyID0gbmV3IERPTUhlbHBlcigpO1xuXG5RVW5pdC5tb2R1bGUoJ0F0dHJNb3JwaCcpO1xuXG50ZXN0KFwiY2FuIHVwZGF0ZSBhIGRvbSBub2RlXCIsIGZ1bmN0aW9uKCl7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgbW9ycGggPSBkb21IZWxwZXIuY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsICdpZCcpO1xuICBtb3JwaC5zZXRDb250ZW50KCd0d2FuZycpO1xuICBlcXVhbChlbGVtZW50LmlkLCAndHdhbmcnLCAnaWQgcHJvcGVydHkgaXMgc2V0Jyk7XG4gIGVxdWFsKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdpZCcpLCAndHdhbmcnLCAnaWQgYXR0cmlidXRlIGlzIHNldCcpO1xufSk7XG5cbnRlc3QoXCJjYW4gY2xlYXJcIiwgZnVuY3Rpb24oKXtcbiAgZXhwZWN0KDApO1xuICB2YXIgZWxlbWVudCA9IGRvbUhlbHBlci5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdmFyIG1vcnBoID0gZG9tSGVscGVyLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCAnaWQnKTtcbiAgbW9ycGguY2xlYXIoKTtcbn0pO1xuXG50ZXN0KFwiY2FsbGluZyBkZXN0cm95IGRvZXMgbm90IHRocm93XCIsIGZ1bmN0aW9uKCl7XG4gIGV4cGVjdCgxKTtcbiAgdmFyIGVsZW1lbnQgPSBkb21IZWxwZXIuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ2lkJyk7XG5cbiAgbW9ycGguZGVzdHJveSgpO1xuXG4gIGVxdWFsKG1vcnBoLmVsZW1lbnQsIG51bGwsICdjbGVhcnMgZWxlbWVudCBmcm9tIG1vcnBoJyk7XG59KTtcblxudGVzdChcImNhbiB1cGRhdGUgcHJvcGVydHlcIiwgZnVuY3Rpb24oKXtcbiAgdmFyIGVsZW1lbnQgPSBkb21IZWxwZXIuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgdmFyIG1vcnBoID0gZG9tSGVscGVyLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCAnZGlzYWJsZWQnKTtcbiAgbW9ycGguc2V0Q29udGVudCh0cnVlKTtcbiAgZXF1YWwoZWxlbWVudC5kaXNhYmxlZCwgdHJ1ZSwgJ2Rpc2FibGVkIHByb3BlcnR5IGlzIHNldCcpO1xuICBtb3JwaC5zZXRDb250ZW50KGZhbHNlKTtcbiAgZXF1YWwoZWxlbWVudC5kaXNhYmxlZCwgZmFsc2UsICdkaXNhYmxlZCBwcm9wZXJ0eSBpcyBzZXQnKTtcbn0pO1xuXG50ZXN0KFwiaW5wdXQubWF4TGVuZ3RoXCIsIGZ1bmN0aW9uKCl7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ21heExlbmd0aCcpO1xuICAvLyBkaWZmZXJlbnQgYnJvd3NlcnMgaGF2ZSBkaWZmZXJlbnQgZGVmYXVsdHMgRkY6IC0xLCBDaHJvbWUvQmxpbms6IDUyNDI4ODtcbiAgdmFyIE1BWF9MRU5HVEggPSBlbGVtZW50Lm1heExlbmd0aDtcblxuICBtb3JwaC5zZXRDb250ZW50KG51bGwpO1xuICBlcXVhbChlbGVtZW50Lm1heExlbmd0aCwgTUFYX0xFTkdUSCwgJ3Byb3BlcnR5IGlzIHcvZSBpcyBkZWZhdWx0Jyk7XG5cbiAgbW9ycGguc2V0Q29udGVudCgxKTtcbiAgZXF1YWwoZWxlbWVudC5tYXhMZW5ndGgsIDEsICdzaG91bGQgYmUgMScpO1xuXG4gIG1vcnBoLnNldENvbnRlbnQobnVsbCk7XG4gIGVxdWFsKGVsZW1lbnQubWF4TGVuZ3RoLCAwLCAncHJvcGVydHkgMCwgcmVzdWx0IG9mIGVsZW1lbnQubWF4TGVuZ3RoID0gXCJcIicpO1xufSk7XG5cbnRlc3QoXCJpbnB1dC5tYXhsZW5ndGggKGFsbCBsb3dlcmNhc2UpXCIsIGZ1bmN0aW9uKCl7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ21heGxlbmd0aCcpO1xuICAvLyBkaWZmZXJlbnQgYnJvd3NlcnMgaGF2ZSBkaWZmZXJlbnQgZGVmYXVsdHMgRkY6IC0xLCBDaHJvbWUvQmxpbms6IDUyNDI4ODtcbiAgdmFyIERFRkFVTFRfTUFYX0xFTkdUSCA9IGVsZW1lbnQubWF4TGVuZ3RoO1xuXG4gIG1vcnBoLnNldENvbnRlbnQobnVsbCk7XG4gIGVxdWFsKGVsZW1lbnQubWF4TGVuZ3RoLCBERUZBVUxUX01BWF9MRU5HVEgsICdwcm9wZXJ0eSBpcyB3L2UgaXMgZGVmYXVsdCcpO1xuXG4gIG1vcnBoLnNldENvbnRlbnQoMSk7XG4gIGVxdWFsKGVsZW1lbnQubWF4TGVuZ3RoLCAxLCAncHJvcGVydHkgaXMgdy9lIGlzIGRlZmF1bHQnKTtcblxuICBtb3JwaC5zZXRDb250ZW50KG51bGwpO1xuICBlcXVhbChlbGVtZW50Lm1heExlbmd0aCwgREVGQVVMVF9NQVhfTEVOR1RILCAncHJvcGVydHkgaXMgdy9lIGlzIGRlZmF1bHQnKTtcbn0pO1xuXG50ZXN0KFwiZG9lcyBub3QgYWRkIHVuZGVmaW5lZCBwcm9wZXJ0aWVzIG9uIGluaXRpYWwgcmVuZGVyXCIsIGZ1bmN0aW9uKCl7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgbW9ycGggPSBkb21IZWxwZXIuY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsICdpZCcpO1xuICBtb3JwaC5zZXRDb250ZW50KHVuZGVmaW5lZCk7XG4gIGVxdWFsKGVsZW1lbnQuaWQsICcnLCAncHJvcGVydHkgc2hvdWxkIG5vdCBiZSBzZXQnKTtcbiAgbW9ycGguc2V0Q29udGVudCgnZm9vLWJhcicpO1xuICBlcXVhbChlbGVtZW50LmlkLCAnZm9vLWJhcicsICdwcm9wZXJ0eSBzaG91bGQgYmUgc2V0Jyk7XG59KTtcblxudGVzdChcImRvZXMgbm90IGFkZCBudWxsIHByb3BlcnRpZXMgb24gaW5pdGlhbCByZW5kZXJcIiwgZnVuY3Rpb24oKXtcbiAgdmFyIGVsZW1lbnQgPSBkb21IZWxwZXIuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ2lkJyk7XG4gIG1vcnBoLnNldENvbnRlbnQobnVsbCk7XG4gIGVxdWFsKGVsZW1lbnQuaWQsICcnLCAncHJvcGVydHkgc2hvdWxkIG5vdCBiZSBzZXQnKTtcbiAgbW9ycGguc2V0Q29udGVudCgnZm9vLWJhcicpO1xuICBlcXVhbChlbGVtZW50LmlkLCAnZm9vLWJhcicsICdwcm9wZXJ0eSBzaG91bGQgYmUgc2V0Jyk7XG59KTtcblxudGVzdChcImNhbiB1cGRhdGUgYXR0cmlidXRlXCIsIGZ1bmN0aW9uKCl7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgbW9ycGggPSBkb21IZWxwZXIuY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsICdkYXRhLWJvcCcpO1xuICBtb3JwaC5zZXRDb250ZW50KCdrcG93Jyk7XG4gIGVxdWFsKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWJvcCcpLCAna3BvdycsICdkYXRhLWJvcCBhdHRyaWJ1dGUgaXMgc2V0Jyk7XG4gIG1vcnBoLnNldENvbnRlbnQobnVsbCk7XG4gIGVxdWFsKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWJvcCcpLCB1bmRlZmluZWQsICdkYXRhLWJvcCBhdHRyaWJ1dGUgaXMgcmVtb3ZlZCcpO1xufSk7XG5cbnRlc3QoXCJjYW4gcmVtb3ZlIG5zIGF0dHJpYnV0ZSB3aXRoIG51bGxcIiwgZnVuY3Rpb24oKXtcbiAgdmFyIGVsZW1lbnQgPSBkb21IZWxwZXIuY3JlYXRlRWxlbWVudCgnc3ZnJyk7XG4gIGRvbUhlbHBlci5zZXRBdHRyaWJ1dGUoZWxlbWVudCwgJ3hsaW5rOnRpdGxlJywgJ0dyZWF0IFRpdGxlJywgeGxpbmtOYW1lc3BhY2UpO1xuICB2YXIgbW9ycGggPSBkb21IZWxwZXIuY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsICd4bGluazp0aXRsZScsIHhsaW5rTmFtZXNwYWNlKTtcbiAgbW9ycGguc2V0Q29udGVudChudWxsKTtcbiAgZXF1YWwoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3hsaW5rOnRpdGxlJyksIHVuZGVmaW5lZCwgJ25zIGF0dHJpYnV0ZSBpcyByZW1vdmVkJyk7XG59KTtcblxudGVzdChcImNhbiByZW1vdmUgYXR0cmlidXRlIHdpdGggdW5kZWZpbmVkXCIsIGZ1bmN0aW9uKCl7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1ib3AnLCAna3BvdycpO1xuICB2YXIgbW9ycGggPSBkb21IZWxwZXIuY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsICdkYXRhLWJvcCcpO1xuICBtb3JwaC5zZXRDb250ZW50KHVuZGVmaW5lZCk7XG4gIGVxdWFsKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWJvcCcpLCB1bmRlZmluZWQsICdkYXRhLWJvcCBhdHRyaWJ1dGUgaXMgcmVtb3ZlZCcpO1xufSk7XG5cbnRlc3QoXCJjYW4gcmVtb3ZlIG5zIGF0dHJpYnV0ZSB3aXRoIHVuZGVmaW5lZFwiLCBmdW5jdGlvbigpe1xuICB2YXIgZWxlbWVudCA9IGRvbUhlbHBlci5jcmVhdGVFbGVtZW50KCdzdmcnKTtcbiAgZG9tSGVscGVyLnNldEF0dHJpYnV0ZShlbGVtZW50LCAneGxpbms6dGl0bGUnLCAnR3JlYXQgVGl0bGUnLCB4bGlua05hbWVzcGFjZSk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ3hsaW5rOnRpdGxlJywgeGxpbmtOYW1lc3BhY2UpO1xuICBtb3JwaC5zZXRDb250ZW50KHVuZGVmaW5lZCk7XG4gIGVxdWFsKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCd4bGluazp0aXRsZScpLCB1bmRlZmluZWQsICducyBhdHRyaWJ1dGUgaXMgcmVtb3ZlZCcpO1xufSk7XG5cbnRlc3QoXCJjYW4gdXBkYXRlIHN2ZyBhdHRyaWJ1dGVcIiwgZnVuY3Rpb24oKXtcbiAgZG9tSGVscGVyLnNldE5hbWVzcGFjZShzdmdOYW1lc3BhY2UpO1xuICB2YXIgZWxlbWVudCA9IGRvbUhlbHBlci5jcmVhdGVFbGVtZW50KCdzdmcnKTtcbiAgdmFyIG1vcnBoID0gZG9tSGVscGVyLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCAnaGVpZ2h0Jyk7XG4gIG1vcnBoLnNldENvbnRlbnQoJzUwJScpO1xuICBlcXVhbChlbGVtZW50LmdldEF0dHJpYnV0ZSgnaGVpZ2h0JyksICc1MCUnLCAnc3ZnIGF0dHIgaXMgc2V0Jyk7XG4gIG1vcnBoLnNldENvbnRlbnQobnVsbCk7XG4gIGVxdWFsKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSwgdW5kZWZpbmVkLCAnc3ZnIGF0dHIgaXMgcmVtb3ZlZCcpO1xufSk7XG5cbnRlc3QoXCJjYW4gdXBkYXRlIHN0eWxlIGF0dHJpYnV0ZVwiLCBmdW5jdGlvbigpe1xuICB2YXIgZWxlbWVudCA9IGRvbUhlbHBlci5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdmFyIG1vcnBoID0gZG9tSGVscGVyLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCAnc3R5bGUnKTtcbiAgbW9ycGguc2V0Q29udGVudCgnY29sb3I6IHJlZDsnKTtcbiAgZXF1YWwoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJyksICdjb2xvcjogcmVkOycsICdzdHlsZSBhdHRyIGlzIHNldCcpO1xuICBtb3JwaC5zZXRDb250ZW50KG51bGwpO1xuICBlcXVhbChlbGVtZW50LmdldEF0dHJpYnV0ZSgnc3R5bGUnKSwgdW5kZWZpbmVkLCAnc3R5bGUgYXR0ciBpcyByZW1vdmVkJyk7XG59KTtcblxudmFyIGJhZFRhZ3MgPSBbXG4gIHsgdGFnOiAnYScsIGF0dHI6ICdocmVmJyB9LFxuICB7IHRhZzogJ2JvZHknLCBhdHRyOiAnYmFja2dyb3VuZCcgfSxcbiAgeyB0YWc6ICdsaW5rJywgYXR0cjogJ2hyZWYnIH0sXG4gIHsgdGFnOiAnaW1nJywgYXR0cjogJ3NyYycgfSxcbiAgeyB0YWc6ICdpZnJhbWUnLCBhdHRyOiAnc3JjJ31cbl07XG5cbmZvciAodmFyIGk9MCwgbD1iYWRUYWdzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgKGZ1bmN0aW9uKCl7XG4gICAgdmFyIHN1YmplY3QgPSBiYWRUYWdzW2ldO1xuXG4gICAgdGVzdChzdWJqZWN0LnRhZyArXCIgXCIrc3ViamVjdC5hdHRyK1wiIGlzIHNhbml0aXplZCB3aGVuIHVzaW5nIGJsYWNrbGlzdGVkIHByb3RvY29sXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHN1YmplY3QudGFnKTtcbiAgICAgIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgc3ViamVjdC5hdHRyKTtcbiAgICAgIG1vcnBoLnNldENvbnRlbnQoJ2phdmFzY3JpcHQ6Ly9leGFtcGxlLmNvbScpO1xuXG4gICAgICBlcXVhbCggZWxlbWVudC5nZXRBdHRyaWJ1dGUoc3ViamVjdC5hdHRyKSxcbiAgICAgICAgICAgICd1bnNhZmU6amF2YXNjcmlwdDovL2V4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICdhdHRyaWJ1dGUgaXMgZXNjYXBlZCcpO1xuICAgIH0pO1xuXG4gICAgdGVzdChzdWJqZWN0LnRhZyArXCIgXCIrc3ViamVjdC5hdHRyK1wiIGlzIG5vdCBzYW5pdGl6ZWQgd2hlbiB1c2luZyBub24td2hpdGVsaXN0ZWQgcHJvdG9jb2wgd2l0aCBhIFNhZmVTdHJpbmdcIiwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoc3ViamVjdC50YWcpO1xuICAgICAgdmFyIG1vcnBoID0gZG9tSGVscGVyLmNyZWF0ZUF0dHJNb3JwaChlbGVtZW50LCBzdWJqZWN0LmF0dHIpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbW9ycGguc2V0Q29udGVudChuZXcgU2FmZVN0cmluZygnamF2YXNjcmlwdDovL2V4YW1wbGUuY29tJykpO1xuXG4gICAgICAgIGVxdWFsKCBlbGVtZW50LmdldEF0dHJpYnV0ZShzdWJqZWN0LmF0dHIpLFxuICAgICAgICAgICAgICAnamF2YXNjcmlwdDovL2V4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICAgJ2F0dHJpYnV0ZSBpcyBub3QgZXNjYXBlZCcpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIC8vIElFIGRvZXMgbm90IGFsbG93IGphdmFzY3JpcHQ6IHRvIGJlIHNldCBvbiBpbWcgc3JjXG4gICAgICAgIG9rKHRydWUsICdjYXVnaHQgZXhjZXB0aW9uICcrZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0ZXN0KHN1YmplY3QudGFnICtcIiBcIitzdWJqZWN0LmF0dHIrXCIgaXMgbm90IHNhbml0aXplZCB3aGVuIHVzaW5nIHVuc2FmZSBhdHRyIG1vcnBoXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHN1YmplY3QudGFnKTtcbiAgICAgIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVVbnNhZmVBdHRyTW9ycGgoZWxlbWVudCwgc3ViamVjdC5hdHRyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIG1vcnBoLnNldENvbnRlbnQoJ2phdmFzY3JpcHQ6Ly9leGFtcGxlLmNvbScpO1xuXG4gICAgICAgIGVxdWFsKCBlbGVtZW50LmdldEF0dHJpYnV0ZShzdWJqZWN0LmF0dHIpLFxuICAgICAgICAgICAgICAnamF2YXNjcmlwdDovL2V4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICAgJ2F0dHJpYnV0ZSBpcyBub3QgZXNjYXBlZCcpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIC8vIElFIGRvZXMgbm90IGFsbG93IGphdmFzY3JpcHQ6IHRvIGJlIHNldCBvbiBpbWcgc3JjXG4gICAgICAgIG9rKHRydWUsICdjYXVnaHQgZXhjZXB0aW9uICcrZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSkoKTsgLy9qc2hpbnQgaWdub3JlOmxpbmVcbn1cblxuaWYgKGRvY3VtZW50ICYmIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuXG50ZXN0KFwiZGV0ZWN0cyBhdHRyaWJ1dGUncyBuYW1lc3BhY2UgaWYgaXQgaXMgbm90IHBhc3NlZCBhcyBhbiBhcmd1bWVudFwiLCBmdW5jdGlvbiAoKSB7XG4gIHZhciBlbGVtZW50ID0gZG9tSGVscGVyLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgbW9ycGggPSBkb21IZWxwZXIuY3JlYXRlQXR0ck1vcnBoKGVsZW1lbnQsICd4bGluazpocmVmJyk7XG4gIG1vcnBoLnNldENvbnRlbnQoJyNjaXJjbGUnKTtcbiAgZXF1YWwoZWxlbWVudC5hdHRyaWJ1dGVzWzBdLm5hbWVzcGFjZVVSSSwgJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCAnYXR0cmlidXRlIGhhcyBjb3JyZWN0IG5hbWVzcGFjZScpO1xufSk7XG5cbnRlc3QoXCJjYW4gdXBkYXRlIG5hbWVzcGFjZWQgYXR0cmlidXRlXCIsIGZ1bmN0aW9uKCl7XG4gIGRvbUhlbHBlci5zZXROYW1lc3BhY2Uoc3ZnTmFtZXNwYWNlKTtcbiAgdmFyIGVsZW1lbnQgPSBkb21IZWxwZXIuY3JlYXRlRWxlbWVudCgnc3ZnJyk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ3hsaW5rOmhyZWYnLCAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycpO1xuICBtb3JwaC5zZXRDb250ZW50KCcjb3RoZXInKTtcbiAgZXF1YWwoZWxlbWVudC5nZXRBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsJ2hyZWYnKSwgJyNvdGhlcicsICduYW1lc3BhY2VkIGF0dHIgaXMgc2V0Jyk7XG4gIGVxdWFsKGVsZW1lbnQuYXR0cmlidXRlc1swXS5uYW1lc3BhY2VVUkksICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyk7XG4gIGVxdWFsKGVsZW1lbnQuYXR0cmlidXRlc1swXS5uYW1lLCAneGxpbms6aHJlZicpO1xuICBlcXVhbChlbGVtZW50LmF0dHJpYnV0ZXNbMF0ubG9jYWxOYW1lLCAnaHJlZicpO1xuICBlcXVhbChlbGVtZW50LmF0dHJpYnV0ZXNbMF0udmFsdWUsICcjb3RoZXInKTtcbiAgbW9ycGguc2V0Q29udGVudChudWxsKTtcbiAgLy8gc2FmYXJpIHJldHVybnMgJycgd2hpbGUgb3RoZXIgYnJvd3NlcnMgcmV0dXJuIHVuZGVmaW5lZFxuICBlcXVhbCghIWVsZW1lbnQuZ2V0QXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCdocmVmJyksIGZhbHNlLCAnbmFtZXNwYWNlZCBhdHRyIGlzIHJlbW92ZWQnKTtcbn0pO1xuXG59XG5cbnRlc3QoXCJlbWJlZCBzcmMgYXMgZGF0YSB1cmkgaXMgc2FuaXRpemVkXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2VtYmVkJyk7XG4gIHZhciBtb3JwaCA9IGRvbUhlbHBlci5jcmVhdGVBdHRyTW9ycGgoZWxlbWVudCwgJ3NyYycpO1xuICBtb3JwaC5zZXRDb250ZW50KCdkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBIJyk7XG5cbiAgZXF1YWwoIGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdzcmMnKSxcbiAgICAgICAgJ3Vuc2FmZTpkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBIJyxcbiAgICAgICAgJ2F0dHJpYnV0ZSBpcyBlc2NhcGVkJyk7XG59KTtcbiJdfQ==
define('morph-attr-tests/attr-morph-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-attr-tests');
  QUnit.test('morph-attr-tests/attr-morph-test.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-attr-tests/attr-morph-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHItdGVzdHMvYXR0ci1tb3JwaC10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFDLE9BQUssQ0FBQyxJQUFJLENBQUMsd0RBQXdELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDcEYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUseURBQXlELENBQUMsQ0FBQztHQUM1RSxDQUFDLENBQUMiLCJmaWxlIjoibW9ycGgtYXR0ci10ZXN0cy9hdHRyLW1vcnBoLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBtb3JwaC1hdHRyLXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdtb3JwaC1hdHRyLXRlc3RzL2F0dHItbW9ycGgtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnbW9ycGgtYXR0ci10ZXN0cy9hdHRyLW1vcnBoLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define("morph-attr-tests/attr-morph/sanitize-attribute-value-test", ["exports", "morph-attr/sanitize-attribute-value", "htmlbars-util/safe-string", "htmlbars-util/array-utils", "../../dom-helper"], function (exports, _morphAttrSanitizeAttributeValue, _htmlbarsUtilSafeString, _htmlbarsUtilArrayUtils, _domHelper) {

  var domHelper = new _domHelper.default();

  QUnit.module('sanitizeAttributeValue(null, "*")');

  var goodProtocols = ['https', 'http', 'ftp', 'tel', 'file'];

  for (var i = 0, l = goodProtocols.length; i < l; i++) {
    buildProtocolTest(goodProtocols[i]);
  }

  function buildProtocolTest(protocol) {
    test('allows ' + protocol + ' protocol when element is not provided', function () {
      expect(1);

      var attributeValue = protocol + '://foo.com';
      var actual = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, null, 'href', attributeValue);

      equal(actual, attributeValue, 'protocol not escaped');
    });
  }

  test('blocks javascript: protocol', function () {
    /* jshint scripturl:true */

    expect(1);

    var attributeValue = 'javascript:alert("foo")';
    var actual = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, null, 'href', attributeValue);

    equal(actual, 'unsafe:' + attributeValue, 'protocol escaped');
  });

  test('blocks blacklisted protocols', function () {
    /* jshint scripturl:true */

    expect(1);

    var attributeValue = 'javascript:alert("foo")';
    var actual = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, null, 'href', attributeValue);

    equal(actual, 'unsafe:' + attributeValue, 'protocol escaped');
  });

  test('does not block SafeStrings', function () {
    /* jshint scripturl:true */

    expect(1);

    var attributeValue = 'javascript:alert("foo")';
    var actual = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, null, 'href', new _htmlbarsUtilSafeString.default(attributeValue));

    equal(actual, attributeValue, 'protocol unescaped');
  });

  test("blocks data uri for EMBED", function () {
    /* jshint scripturl:true */

    expect(1);

    var attributeValue = 'data:image/svg+xml;base64,...';
    var actual = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, { tagName: 'EMBED' }, 'src', attributeValue);

    equal(actual, 'unsafe:' + attributeValue, 'protocol escaped');
  });

  test("doesn't sanitize data uri for IMG", function () {
    /* jshint scripturl:true */

    expect(1);

    var attributeValue = 'data:image/svg+xml;base64,...';
    var actual = _morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, { tagName: 'IMG' }, 'src', attributeValue);

    equal(actual, attributeValue, 'protocol should not have been escaped');
  });

  var badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];

  var badAttributes = ['href', 'src', 'background', 'action'];

  var someIllegalProtocols = ['javascript', 'vbscript'];

  _htmlbarsUtilArrayUtils.forEach(badTags, function (tagName) {
    _htmlbarsUtilArrayUtils.forEach(badAttributes, function (attrName) {
      _htmlbarsUtilArrayUtils.forEach(someIllegalProtocols, function (protocol) {
        test(' <' + tagName + ' ' + attrName + '="' + protocol + ':something"> ...', function () {
          equal(_morphAttrSanitizeAttributeValue.sanitizeAttributeValue(domHelper, { tagName: tagName }, attrName, protocol + ':something'), 'unsafe:' + protocol + ':something');
        });
      });
    });
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHItdGVzdHMvYXR0ci1tb3JwaC9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUtdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU1BLE1BQUksU0FBUyxHQUFHLHdCQUFlLENBQUM7O0FBRWhDLE9BQUssQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQzs7QUFFbEQsTUFBSSxhQUFhLEdBQUcsQ0FBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7O0FBRTdELE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDcEQscUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDckM7O0FBRUQsV0FBUyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUU7QUFDbkMsUUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLEdBQUcsd0NBQXdDLEVBQUUsWUFBVztBQUMvRSxZQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVYsVUFBSSxjQUFjLEdBQUcsUUFBUSxHQUFHLFlBQVksQ0FBQztBQUM3QyxVQUFJLE1BQU0sR0FBRyxpQ0FyQlIsc0JBQXNCLENBcUJTLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDOztBQUU3RSxXQUFLLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0tBQ3ZELENBQUMsQ0FBQztHQUNKOztBQUVELE1BQUksQ0FBQyw2QkFBNkIsRUFBRSxZQUFXOzs7QUFHN0MsVUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVWLFFBQUksY0FBYyxHQUFHLHlCQUF5QixDQUFDO0FBQy9DLFFBQUksTUFBTSxHQUFHLGlDQWpDTixzQkFBc0IsQ0FpQ08sU0FBUyxFQUFFLElBQUks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LFlBQVksQ0FBQyxDQUFDO1NBQ3hJLENBQUMsQ0FBQztPQUNKLENBQUMsQ0FBQztLQUNKLENBQUMsQ0FBQztHQUNKLENBQUMsQ0FBQyIsImZpbGUiOiJtb3JwaC1hdHRyLXRlc3RzL2F0dHItbW9ycGgvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYW5pdGl6ZUF0dHJpYnV0ZVZhbHVlIH0gZnJvbSBcIm1vcnBoLWF0dHIvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlXCI7XG5pbXBvcnQgU2FmZVN0cmluZyBmcm9tIFwiaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZ1wiO1xuaW1wb3J0IHsgZm9yRWFjaCB9IGZyb20gXCJodG1sYmFycy11dGlsL2FycmF5LXV0aWxzXCI7XG5cbmltcG9ydCBET01IZWxwZXIgZnJvbSBcIi4uLy4uL2RvbS1oZWxwZXJcIjtcblxudmFyIGRvbUhlbHBlciA9IG5ldyBET01IZWxwZXIoKTtcblxuUVVuaXQubW9kdWxlKCdzYW5pdGl6ZUF0dHJpYnV0ZVZhbHVlKG51bGwsIFwiKlwiKScpO1xuXG52YXIgZ29vZFByb3RvY29scyA9IFsgJ2h0dHBzJywgJ2h0dHAnLCAnZnRwJywgJ3RlbCcsICdmaWxlJ107XG5cbmZvciAodmFyIGkgPSAwLCBsID0gZ29vZFByb3RvY29scy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgYnVpbGRQcm90b2NvbFRlc3QoZ29vZFByb3RvY29sc1tpXSk7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUHJvdG9jb2xUZXN0KHByb3RvY29sKSB7XG4gIHRlc3QoJ2FsbG93cyAnICsgcHJvdG9jb2wgKyAnIHByb3RvY29sIHdoZW4gZWxlbWVudCBpcyBub3QgcHJvdmlkZWQnLCBmdW5jdGlvbigpIHtcbiAgICBleHBlY3QoMSk7XG5cbiAgICB2YXIgYXR0cmlidXRlVmFsdWUgPSBwcm90b2NvbCArICc6Ly9mb28uY29tJztcbiAgICB2YXIgYWN0dWFsID0gc2FuaXRpemVBdHRyaWJ1dGVWYWx1ZShkb21IZWxwZXIsIG51bGwsICdocmVmJywgYXR0cmlidXRlVmFsdWUpO1xuXG4gICAgZXF1YWwoYWN0dWFsLCBhdHRyaWJ1dGVWYWx1ZSwgJ3Byb3RvY29sIG5vdCBlc2NhcGVkJyk7XG4gIH0pO1xufVxuXG50ZXN0KCdibG9ja3MgamF2YXNjcmlwdDogcHJvdG9jb2wnLCBmdW5jdGlvbigpIHtcbiAgLyoganNoaW50IHNjcmlwdHVybDp0cnVlICovXG5cbiAgZXhwZWN0KDEpO1xuXG4gIHZhciBhdHRyaWJ1dGVWYWx1ZSA9ICdqYXZhc2NyaXB0OmFsZXJ0KFwiZm9vXCIpJztcbiAgdmFyIGFjdHVhbCA9IHNhbml0aXplQXR0cmlidXRlVmFsdWUoZG9tSGVscGVyLCBudWxsLCAnaHJlZicsIGF0dHJpYnV0ZVZhbHVlKTtcblxuICBlcXVhbChhY3R1YWwsICd1bnNhZmU6JyArIGF0dHJpYnV0ZVZhbHVlLCAncHJvdG9jb2wgZXNjYXBlZCcpO1xufSk7XG5cbnRlc3QoJ2Jsb2NrcyBibGFja2xpc3RlZCBwcm90b2NvbHMnLCBmdW5jdGlvbigpIHtcbiAgLyoganNoaW50IHNjcmlwdHVybDp0cnVlICovXG5cbiAgZXhwZWN0KDEpO1xuXG4gIHZhciBhdHRyaWJ1dGVWYWx1ZSA9ICdqYXZhc2NyaXB0OmFsZXJ0KFwiZm9vXCIpJztcbiAgdmFyIGFjdHVhbCA9IHNhbml0aXplQXR0cmlidXRlVmFsdWUoZG9tSGVscGVyLCBudWxsLCAnaHJlZicsIGF0dHJpYnV0ZVZhbHVlKTtcblxuICBlcXVhbChhY3R1YWwsICd1bnNhZmU6JyArIGF0dHJpYnV0ZVZhbHVlLCAncHJvdG9jb2wgZXNjYXBlZCcpO1xufSk7XG5cbnRlc3QoJ2RvZXMgbm90IGJsb2NrIFNhZmVTdHJpbmdzJywgZnVuY3Rpb24oKSB7XG4gIC8qIGpzaGludCBzY3JpcHR1cmw6dHJ1ZSAqL1xuXG4gIGV4cGVjdCgxKTtcblxuICB2YXIgYXR0cmlidXRlVmFsdWUgPSAnamF2YXNjcmlwdDphbGVydChcImZvb1wiKSc7XG4gIHZhciBhY3R1YWwgPSBzYW5pdGl6ZUF0dHJpYnV0ZVZhbHVlKGRvbUhlbHBlciwgbnVsbCwgJ2hyZWYnLCBuZXcgU2FmZVN0cmluZyhhdHRyaWJ1dGVWYWx1ZSkpO1xuXG4gIGVxdWFsKGFjdHVhbCwgYXR0cmlidXRlVmFsdWUsICdwcm90b2NvbCB1bmVzY2FwZWQnKTtcbn0pO1xuXG50ZXN0KFwiYmxvY2tzIGRhdGEgdXJpIGZvciBFTUJFRFwiLCBmdW5jdGlvbigpIHtcbiAgLyoganNoaW50IHNjcmlwdHVybDp0cnVlICovXG5cbiAgZXhwZWN0KDEpO1xuXG4gIHZhciBhdHRyaWJ1dGVWYWx1ZSA9ICdkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LC4uLic7XG4gIHZhciBhY3R1YWwgPSBzYW5pdGl6ZUF0dHJpYnV0ZVZhbHVlKGRvbUhlbHBlciwgeyB0YWdOYW1lOiAnRU1CRUQnIH0sICdzcmMnLCBhdHRyaWJ1dGVWYWx1ZSk7XG5cbiAgZXF1YWwoYWN0dWFsLCAndW5zYWZlOicgKyBhdHRyaWJ1dGVWYWx1ZSwgJ3Byb3RvY29sIGVzY2FwZWQnKTtcbn0pO1xuXG50ZXN0KFwiZG9lc24ndCBzYW5pdGl6ZSBkYXRhIHVyaSBmb3IgSU1HXCIsIGZ1bmN0aW9uKCkge1xuICAvKiBqc2hpbnQgc2NyaXB0dXJsOnRydWUgKi9cblxuICBleHBlY3QoMSk7XG5cbiAgdmFyIGF0dHJpYnV0ZVZhbHVlID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsLi4uJztcbiAgdmFyIGFjdHVhbCA9IHNhbml0aXplQXR0cmlidXRlVmFsdWUoZG9tSGVscGVyLCB7IHRhZ05hbWU6ICdJTUcnIH0sICdzcmMnLCBhdHRyaWJ1dGVWYWx1ZSk7XG5cbiAgZXF1YWwoYWN0dWFsLCBhdHRyaWJ1dGVWYWx1ZSwgJ3Byb3RvY29sIHNob3VsZCBub3QgaGF2ZSBiZWVuIGVzY2FwZWQnKTtcbn0pO1xuXG52YXIgYmFkVGFncyA9IFtcbiAgJ0EnLFxuICAnQk9EWScsXG4gICdMSU5LJyxcbiAgJ0lNRycsXG4gICdJRlJBTUUnLFxuICAnQkFTRScsXG4gICdGT1JNJyxcbl07XG5cbnZhciBiYWRBdHRyaWJ1dGVzID0gW1xuICAnaHJlZicsXG4gICdzcmMnLFxuICAnYmFja2dyb3VuZCcsXG4gICdhY3Rpb24nXG5dO1xuXG52YXIgc29tZUlsbGVnYWxQcm90b2NvbHMgPSBbXG4gICdqYXZhc2NyaXB0JyxcbiAgJ3Zic2NyaXB0J1xuXTtcblxuZm9yRWFjaChiYWRUYWdzLCBmdW5jdGlvbih0YWdOYW1lKSB7XG4gIGZvckVhY2goYmFkQXR0cmlidXRlcywgZnVuY3Rpb24oYXR0ck5hbWUpIHtcbiAgICBmb3JFYWNoKHNvbWVJbGxlZ2FsUHJvdG9jb2xzLCBmdW5jdGlvbihwcm90b2NvbCkge1xuICAgICAgdGVzdCgnIDwnICsgdGFnTmFtZSArICcgJyArIGF0dHJOYW1lICsgJz1cIicgKyBwcm90b2NvbCArICc6c29tZXRoaW5nXCI+IC4uLicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBlcXVhbChzYW5pdGl6ZUF0dHJpYnV0ZVZhbHVlKGRvbUhlbHBlciwgeyB0YWdOYW1lOiB0YWdOYW1lIH0sIGF0dHJOYW1lLCBwcm90b2NvbCArICc6c29tZXRoaW5nJyksICd1bnNhZmU6JyArIHByb3RvY29sICsgJzpzb21ldGhpbmcnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19
define('morph-attr-tests/attr-morph/sanitize-attribute-value-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-attr-tests/attr-morph');
  QUnit.test('morph-attr-tests/attr-morph/sanitize-attribute-value-test.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-attr-tests/attr-morph/sanitize-attribute-value-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHItdGVzdHMvYXR0ci1tb3JwaC9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUtdGVzdC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsc0NBQXNDLENBQUMsQ0FBQztBQUNyRCxPQUFLLENBQUMsSUFBSSxDQUFDLGlGQUFpRixFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzdHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLGtGQUFrRixDQUFDLENBQUM7R0FDckcsQ0FBQyxDQUFDIiwiZmlsZSI6Im1vcnBoLWF0dHItdGVzdHMvYXR0ci1tb3JwaC9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUtdGVzdC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIG1vcnBoLWF0dHItdGVzdHMvYXR0ci1tb3JwaCcpO1xuUVVuaXQudGVzdCgnbW9ycGgtYXR0ci10ZXN0cy9hdHRyLW1vcnBoL3Nhbml0aXplLWF0dHJpYnV0ZS12YWx1ZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdtb3JwaC1hdHRyLXRlc3RzL2F0dHItbW9ycGgvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('morph-attr-tests/morph-attr.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-attr-tests');
  QUnit.test('morph-attr-tests/morph-attr.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-attr-tests/morph-attr.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHItdGVzdHMvbW9ycGgtYXR0ci5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUMxQyxPQUFLLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQy9FLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLG9EQUFvRCxDQUFDLENBQUM7R0FDdkUsQ0FBQyxDQUFDIiwiZmlsZSI6Im1vcnBoLWF0dHItdGVzdHMvbW9ycGgtYXR0ci5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIG1vcnBoLWF0dHItdGVzdHMnKTtcblFVbml0LnRlc3QoJ21vcnBoLWF0dHItdGVzdHMvbW9ycGgtYXR0ci5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnbW9ycGgtYXR0ci10ZXN0cy9tb3JwaC1hdHRyLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('morph-attr-tests/morph-attr/sanitize-attribute-value.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - morph-attr-tests/morph-attr');
  QUnit.test('morph-attr-tests/morph-attr/sanitize-attribute-value.js should pass jshint', function (assert) {
    assert.ok(true, 'morph-attr-tests/morph-attr/sanitize-attribute-value.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLWF0dHItdGVzdHMvbW9ycGgtYXR0ci9zYW5pdGl6ZS1hdHRyaWJ1dGUtdmFsdWUuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7QUFDckQsT0FBSyxDQUFDLElBQUksQ0FBQyw0RUFBNEUsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN4RyxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw2RUFBNkUsQ0FBQyxDQUFDO0dBQ2hHLENBQUMsQ0FBQyIsImZpbGUiOiJtb3JwaC1hdHRyLXRlc3RzL21vcnBoLWF0dHIvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gbW9ycGgtYXR0ci10ZXN0cy9tb3JwaC1hdHRyJyk7XG5RVW5pdC50ZXN0KCdtb3JwaC1hdHRyLXRlc3RzL21vcnBoLWF0dHIvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdtb3JwaC1hdHRyLXRlc3RzL21vcnBoLWF0dHIvc2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==