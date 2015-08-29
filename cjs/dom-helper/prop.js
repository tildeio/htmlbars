exports.__esModule = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRvbS1oZWxwZXIvcHJvcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQU8sU0FBUyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUU7QUFDeEMsU0FBTyxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLENBQUM7Q0FDOUM7Ozs7Ozs7Ozs7QUFRTSxTQUFTLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUU7QUFDbkQsTUFBSSxJQUFJLEVBQUUsVUFBVSxDQUFDOztBQUVyQixNQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUU7QUFDdkIsY0FBVSxHQUFHLFFBQVEsQ0FBQztBQUN0QixRQUFJLEdBQUcsTUFBTSxDQUFDO0dBQ2YsTUFBTTtBQUNMLFFBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNuQyxRQUFJLEtBQUssSUFBSSxPQUFPLEVBQUU7QUFDcEIsVUFBSSxHQUFHLE1BQU0sQ0FBQztBQUNkLGdCQUFVLEdBQUcsS0FBSyxDQUFDO0tBQ3BCLE1BQU07QUFDTCxVQUFJLEdBQUcsTUFBTSxDQUFDO0FBQ2QsZ0JBQVUsR0FBRyxRQUFRLENBQUM7S0FDdkI7R0FDRjs7QUFFRCxNQUFJLElBQUksS0FBSyxNQUFNLEtBQ2QsVUFBVSxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sSUFDcEMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUEsQUFBQyxFQUFFO0FBQzdDLFFBQUksR0FBRyxNQUFNLENBQUM7R0FDZjs7QUFFRCxTQUFPLEVBQUUsVUFBVSxFQUFWLFVBQVUsRUFBRSxJQUFJLEVBQUosSUFBSSxFQUFFLENBQUM7Q0FDN0I7Ozs7O0FBS0QsSUFBSSxjQUFjLEdBQUc7Ozs7QUFJbkIsUUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFOztBQUVsQyxPQUFLLEVBQUU7Ozs7OztBQU1MLFFBQUksRUFBRSxJQUFJOzs7QUFHVixRQUFJLEVBQUUsSUFBSTtBQUNWLFFBQUksRUFBRSxJQUFJO0dBQ1g7Ozs7QUFJRCxRQUFNLEVBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ3hCLFFBQU0sRUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7QUFDeEIsVUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtBQUN4QixPQUFLLEVBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ3hCLFVBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7QUFDeEIsUUFBTSxFQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtBQUN4QixRQUFNLEVBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0NBQ3pCLENBQUM7O0FBRUYsU0FBUyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRTtBQUNyQyxNQUFJLEdBQUcsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDaEQsU0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQztDQUNwRCIsImZpbGUiOiJkb20taGVscGVyL3Byb3AuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gaXNBdHRyUmVtb3ZhbFZhbHVlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkO1xufVxuLypcbiAqXG4gKiBAbWV0aG9kIG5vcm1hbGl6ZVByb3BlcnR5XG4gKiBAcGFyYW0gZWxlbWVudCB7SFRNTEVsZW1lbnR9XG4gKiBAcGFyYW0gc2xvdE5hbWUge1N0cmluZ31cbiAqIEByZXR1cm5zIHtPYmplY3R9IHsgbmFtZSwgdHlwZSB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVQcm9wZXJ0eShlbGVtZW50LCBzbG90TmFtZSkge1xuICB2YXIgdHlwZSwgbm9ybWFsaXplZDtcblxuICBpZiAoc2xvdE5hbWUgaW4gZWxlbWVudCkge1xuICAgIG5vcm1hbGl6ZWQgPSBzbG90TmFtZTtcbiAgICB0eXBlID0gJ3Byb3AnO1xuICB9IGVsc2Uge1xuICAgIHZhciBsb3dlciA9IHNsb3ROYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKGxvd2VyIGluIGVsZW1lbnQpIHtcbiAgICAgIHR5cGUgPSAncHJvcCc7XG4gICAgICBub3JtYWxpemVkID0gbG93ZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGUgPSAnYXR0cic7XG4gICAgICBub3JtYWxpemVkID0gc2xvdE5hbWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGUgPT09ICdwcm9wJyAmJlxuICAgICAgKG5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSA9PT0gJ3N0eWxlJyB8fFxuICAgICAgIHByZWZlckF0dHIoZWxlbWVudC50YWdOYW1lLCBub3JtYWxpemVkKSkpIHtcbiAgICB0eXBlID0gJ2F0dHInO1xuICB9XG5cbiAgcmV0dXJuIHsgbm9ybWFsaXplZCwgdHlwZSB9O1xufVxuXG4vLyBwcm9wZXJ0aWVzIHRoYXQgTVVTVCBiZSBzZXQgYXMgYXR0cmlidXRlcywgZHVlIHRvOlxuLy8gKiBicm93c2VyIGJ1Z1xuLy8gKiBzdHJhbmdlIHNwZWMgb3V0bGllclxudmFyIEFUVFJfT1ZFUlJJREVTID0ge1xuXG4gIC8vIHBoYW50b21qcyA8IDIuMCBsZXRzIHlvdSBzZXQgaXQgYXMgYSBwcm9wIGJ1dCB3b24ndCByZWZsZWN0IGl0XG4gIC8vIGJhY2sgdG8gdGhlIGF0dHJpYnV0ZS4gYnV0dG9uLmdldEF0dHJpYnV0ZSgndHlwZScpID09PSBudWxsXG4gIEJVVFRPTjogeyB0eXBlOiB0cnVlLCBmb3JtOiB0cnVlIH0sXG5cbiAgSU5QVVQ6IHtcbiAgICAvLyBUT0RPOiByZW1vdmUgd2hlbiBJRTggaXMgZHJvcGVkXG4gICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJRSAoSUU4KSB0aHJvdyBhbiBleGNlcHRpb24gd2hlbiBzZXR0aW5nXG4gICAgLy8gYGlucHV0Lmxpc3QgPSAnc29tZXN0cmluZydgOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9lbWJlcmpzL2VtYmVyLmpzL2lzc3Vlcy8xMDkwOFxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9lbWJlcmpzL2VtYmVyLmpzL2lzc3Vlcy8xMTM2NFxuICAgIGxpc3Q6IHRydWUsXG4gICAgLy8gU29tZSB2ZXJzaW9uIG9mIElFIChsaWtlIElFOSkgYWN0dWFsbHkgdGhyb3cgYW4gZXhjZXB0aW9uXG4gICAgLy8gaWYgeW91IHNldCBpbnB1dC50eXBlID0gJ3NvbWV0aGluZy11bmtub3duJ1xuICAgIHR5cGU6IHRydWUsXG4gICAgZm9ybTogdHJ1ZVxuICB9LFxuXG4gIC8vIGVsZW1lbnQuZm9ybSBpcyBhY3R1YWxseSBhIGxlZ2l0aW1hdGUgcmVhZE9ubHkgcHJvcGVydHksIHRoYXQgaXMgdG8gYmVcbiAgLy8gbXV0YXRlZCwgYnV0IG11c3QgYmUgbXV0YXRlZCBieSBzZXRBdHRyaWJ1dGUuLi5cbiAgU0VMRUNUOiAgIHsgZm9ybTogdHJ1ZSB9LFxuICBPUFRJT046ICAgeyBmb3JtOiB0cnVlIH0sXG4gIFRFWFRBUkVBOiB7IGZvcm06IHRydWUgfSxcbiAgTEFCRUw6ICAgIHsgZm9ybTogdHJ1ZSB9LFxuICBGSUVMRFNFVDogeyBmb3JtOiB0cnVlIH0sXG4gIExFR0VORDogICB7IGZvcm06IHRydWUgfSxcbiAgT0JKRUNUOiAgIHsgZm9ybTogdHJ1ZSB9XG59O1xuXG5mdW5jdGlvbiBwcmVmZXJBdHRyKHRhZ05hbWUsIHByb3BOYW1lKSB7XG4gIHZhciB0YWcgPSBBVFRSX09WRVJSSURFU1t0YWdOYW1lLnRvVXBwZXJDYXNlKCldO1xuICByZXR1cm4gdGFnICYmIHRhZ1twcm9wTmFtZS50b0xvd2VyQ2FzZSgpXSB8fCBmYWxzZTtcbn1cbiJdfQ==