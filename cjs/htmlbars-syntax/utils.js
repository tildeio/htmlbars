exports.__esModule = true;
exports.parseComponentBlockParams = parseComponentBlockParams;
exports.childrenFor = childrenFor;
exports.appendChild = appendChild;
exports.isHelper = isHelper;
exports.unwrapMustache = unwrapMustache;

var _htmlbarsUtilArrayUtils = require("../htmlbars-util/array-utils");

// Regex to validate the identifier for block parameters.
// Based on the ID validation regex in Handlebars.

var ID_INVERSE_PATTERN = /[!"#%-,\.\/;->@\[-\^`\{-~]/;

// Checks the component's attributes to see if it uses block params.
// If it does, registers the block params with the program and
// removes the corresponding attributes from the element.

function parseComponentBlockParams(element, program) {
  var l = element.attributes.length;
  var attrNames = [];

  for (var i = 0; i < l; i++) {
    attrNames.push(element.attributes[i].name);
  }

  var asIndex = _htmlbarsUtilArrayUtils.indexOfArray(attrNames, 'as');

  if (asIndex !== -1 && l > asIndex && attrNames[asIndex + 1].charAt(0) === '|') {
    // Some basic validation, since we're doing the parsing ourselves
    var paramsString = attrNames.slice(asIndex).join(' ');
    if (paramsString.charAt(paramsString.length - 1) !== '|' || paramsString.match(/\|/g).length !== 2) {
      throw new Error('Invalid block parameters syntax: \'' + paramsString + '\'');
    }

    var params = [];
    for (i = asIndex + 1; i < l; i++) {
      var param = attrNames[i].replace(/\|/g, '');
      if (param !== '') {
        if (ID_INVERSE_PATTERN.test(param)) {
          throw new Error('Invalid identifier for block parameters: \'' + param + '\' in \'' + paramsString + '\'');
        }
        params.push(param);
      }
    }

    if (params.length === 0) {
      throw new Error('Cannot use zero block parameters: \'' + paramsString + '\'');
    }

    element.attributes = element.attributes.slice(0, asIndex);
    program.blockParams = params;
  }
}

function childrenFor(node) {
  if (node.type === 'Program') {
    return node.body;
  }
  if (node.type === 'ElementNode') {
    return node.children;
  }
}

function appendChild(parent, node) {
  childrenFor(parent).push(node);
}

function isHelper(mustache) {
  return mustache.params && mustache.params.length > 0 || mustache.hash && mustache.hash.pairs.length > 0;
}

function unwrapMustache(mustache) {
  if (isHelper(mustache)) {
    return mustache;
  } else {
    return mustache.path;
  }
}
//# sourceMappingURL=data:application/json;base64,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QUFJLENBQUMsQ0FBQztDQUNoQzs7QUFFTSxTQUFTLFFBQVEsQ0FBQyxRQUFRLEVBQUU7QUFDakMsU0FBTyxBQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUNsRCxRQUFRLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEFBQUMsQ0FBQztDQUNyRDs7QUFFTSxTQUFTLGNBQWMsQ0FBQyxRQUFRLEVBQUU7QUFDdkMsTUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDdEIsV0FBTyxRQUFRLENBQUM7R0FDakIsTUFBTTtBQUNMLFdBQU8sUUFBUSxDQUFDLElBQUksQ0FBQztHQUN0QjtDQUNGIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC91dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluZGV4T2ZBcnJheSB9IGZyb20gXCIuLi9odG1sYmFycy11dGlsL2FycmF5LXV0aWxzXCI7XG4vLyBSZWdleCB0byB2YWxpZGF0ZSB0aGUgaWRlbnRpZmllciBmb3IgYmxvY2sgcGFyYW1ldGVycy4gXG4vLyBCYXNlZCBvbiB0aGUgSUQgdmFsaWRhdGlvbiByZWdleCBpbiBIYW5kbGViYXJzLlxuXG52YXIgSURfSU5WRVJTRV9QQVRURVJOID0gL1shXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dLztcblxuLy8gQ2hlY2tzIHRoZSBjb21wb25lbnQncyBhdHRyaWJ1dGVzIHRvIHNlZSBpZiBpdCB1c2VzIGJsb2NrIHBhcmFtcy5cbi8vIElmIGl0IGRvZXMsIHJlZ2lzdGVycyB0aGUgYmxvY2sgcGFyYW1zIHdpdGggdGhlIHByb2dyYW0gYW5kXG4vLyByZW1vdmVzIHRoZSBjb3JyZXNwb25kaW5nIGF0dHJpYnV0ZXMgZnJvbSB0aGUgZWxlbWVudC5cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ29tcG9uZW50QmxvY2tQYXJhbXMoZWxlbWVudCwgcHJvZ3JhbSkge1xuICB2YXIgbCA9IGVsZW1lbnQuYXR0cmlidXRlcy5sZW5ndGg7XG4gIHZhciBhdHRyTmFtZXMgPSBbXTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGF0dHJOYW1lcy5wdXNoKGVsZW1lbnQuYXR0cmlidXRlc1tpXS5uYW1lKTtcbiAgfVxuXG4gIHZhciBhc0luZGV4ID0gaW5kZXhPZkFycmF5KGF0dHJOYW1lcywgJ2FzJyk7XG5cbiAgaWYgKGFzSW5kZXggIT09IC0xICYmIGwgPiBhc0luZGV4ICYmIGF0dHJOYW1lc1thc0luZGV4ICsgMV0uY2hhckF0KDApID09PSAnfCcpIHtcbiAgICAvLyBTb21lIGJhc2ljIHZhbGlkYXRpb24sIHNpbmNlIHdlJ3JlIGRvaW5nIHRoZSBwYXJzaW5nIG91cnNlbHZlc1xuICAgIHZhciBwYXJhbXNTdHJpbmcgPSBhdHRyTmFtZXMuc2xpY2UoYXNJbmRleCkuam9pbignICcpO1xuICAgIGlmIChwYXJhbXNTdHJpbmcuY2hhckF0KHBhcmFtc1N0cmluZy5sZW5ndGggLSAxKSAhPT0gJ3wnIHx8IHBhcmFtc1N0cmluZy5tYXRjaCgvXFx8L2cpLmxlbmd0aCAhPT0gMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGJsb2NrIHBhcmFtZXRlcnMgc3ludGF4OiBcXCcnICsgcGFyYW1zU3RyaW5nICsgJ1xcJycpO1xuICAgIH1cblxuICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICBmb3IgKGkgPSBhc0luZGV4ICsgMTsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIHBhcmFtID0gYXR0ck5hbWVzW2ldLnJlcGxhY2UoL1xcfC9nLCAnJyk7XG4gICAgICBpZiAocGFyYW0gIT09ICcnKSB7XG4gICAgICAgIGlmIChJRF9JTlZFUlNFX1BBVFRFUk4udGVzdChwYXJhbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaWRlbnRpZmllciBmb3IgYmxvY2sgcGFyYW1ldGVyczogXFwnJyArIHBhcmFtICsgJ1xcJyBpbiBcXCcnICsgcGFyYW1zU3RyaW5nICsgJ1xcJycpO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgdXNlIHplcm8gYmxvY2sgcGFyYW1ldGVyczogXFwnJyArIHBhcmFtc1N0cmluZyArICdcXCcnKTtcbiAgICB9XG5cbiAgICBlbGVtZW50LmF0dHJpYnV0ZXMgPSBlbGVtZW50LmF0dHJpYnV0ZXMuc2xpY2UoMCwgYXNJbmRleCk7XG4gICAgcHJvZ3JhbS5ibG9ja1BhcmFtcyA9IHBhcmFtcztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hpbGRyZW5Gb3Iobm9kZSkge1xuICBpZiAobm9kZS50eXBlID09PSAnUHJvZ3JhbScpIHtcbiAgICByZXR1cm4gbm9kZS5ib2R5O1xuICB9XG4gIGlmIChub2RlLnR5cGUgPT09ICdFbGVtZW50Tm9kZScpIHtcbiAgICByZXR1cm4gbm9kZS5jaGlsZHJlbjtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ2hpbGQocGFyZW50LCBub2RlKSB7XG4gIGNoaWxkcmVuRm9yKHBhcmVudCkucHVzaChub2RlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSGVscGVyKG11c3RhY2hlKSB7XG4gIHJldHVybiAobXVzdGFjaGUucGFyYW1zICYmIG11c3RhY2hlLnBhcmFtcy5sZW5ndGggPiAwKSB8fFxuICAgIChtdXN0YWNoZS5oYXNoICYmIG11c3RhY2hlLmhhc2gucGFpcnMubGVuZ3RoID4gMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBNdXN0YWNoZShtdXN0YWNoZSkge1xuICBpZiAoaXNIZWxwZXIobXVzdGFjaGUpKSB7XG4gICAgcmV0dXJuIG11c3RhY2hlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBtdXN0YWNoZS5wYXRoO1xuICB9XG59XG4iXX0=