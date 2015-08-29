exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _htmlbarsUtilVoidTagNames = require('../../htmlbars-util/void-tag-names');

var _htmlbarsUtilVoidTagNames2 = _interopRequireDefault(_htmlbarsUtilVoidTagNames);

var _builders = require("../builders");

var _builders2 = _interopRequireDefault(_builders);

var _utils = require("../utils");

exports.default = {
  reset: function () {
    this.currentNode = null;
  },

  // Comment

  beginComment: function () {
    this.currentNode = _builders2.default.comment("");
  },

  appendToCommentData: function (char) {
    this.currentNode.value += char;
  },

  finishComment: function () {
    _utils.appendChild(this.currentElement(), this.currentNode);
  },

  // Data

  beginData: function () {
    this.currentNode = _builders2.default.text();
  },

  appendToData: function (char) {
    this.currentNode.chars += char;
  },

  finishData: function () {
    _utils.appendChild(this.currentElement(), this.currentNode);
  },

  // Tags - basic

  beginStartTag: function () {
    this.currentNode = {
      type: 'StartTag',
      name: "",
      attributes: [],
      modifiers: [],
      selfClosing: false,
      loc: null
    };
  },

  beginEndTag: function () {
    this.currentNode = {
      type: 'EndTag',
      name: "",
      attributes: [],
      modifiers: [],
      selfClosing: false,
      loc: null
    };
  },

  finishTag: function () {
    var _tokenizer = this.tokenizer;
    var tagLine = _tokenizer.tagLine;
    var tagColumn = _tokenizer.tagColumn;
    var line = _tokenizer.line;
    var column = _tokenizer.column;

    var tag = this.currentNode;
    tag.loc = _builders2.default.loc(tagLine, tagColumn, line, column);

    if (tag.type === 'StartTag') {
      this.finishStartTag();

      if (_htmlbarsUtilVoidTagNames2.default.hasOwnProperty(tag.name) || tag.selfClosing) {
        this.finishEndTag(true);
      }
    } else if (tag.type === 'EndTag') {
      this.finishEndTag(false);
    }
  },

  finishStartTag: function () {
    var _currentNode = this.currentNode;
    var name = _currentNode.name;
    var attributes = _currentNode.attributes;
    var modifiers = _currentNode.modifiers;

    var loc = _builders2.default.loc(this.tokenizer.tagLine, this.tokenizer.tagColumn);
    var element = _builders2.default.element(name, attributes, modifiers, [], loc);
    this.elementStack.push(element);
  },

  finishEndTag: function (isVoid) {
    var tag = this.currentNode;

    var element = this.elementStack.pop();
    var parent = this.currentElement();
    var disableComponentGeneration = this.options.disableComponentGeneration === true;

    validateEndTag(tag, element, isVoid);

    element.loc.end.line = this.tokenizer.line;
    element.loc.end.column = this.tokenizer.column;

    if (disableComponentGeneration || element.tag.indexOf("-") === -1) {
      _utils.appendChild(parent, element);
    } else {
      var program = _builders2.default.program(element.children);
      _utils.parseComponentBlockParams(element, program);
      var component = _builders2.default.component(element.tag, element.attributes, program, element.loc);
      _utils.appendChild(parent, component);
    }
  },

  markTagAsSelfClosing: function () {
    this.currentNode.selfClosing = true;
  },

  // Tags - name

  appendToTagName: function (char) {
    this.currentNode.name += char;
  },

  // Tags - attributes

  beginAttribute: function () {
    var tag = this.currentNode;
    if (tag.type === 'EndTag') {
      throw new Error("Invalid end tag: closing tag must not have attributes, " + ("in `" + tag.name + "` (on line " + this.tokenizer.line + ")."));
    }

    this.currentAttribute = {
      name: "",
      parts: [],
      isQuoted: false,
      isDynamic: false
    };
  },

  appendToAttributeName: function (char) {
    this.currentAttribute.name += char;
  },

  beginAttributeValue: function (isQuoted) {
    this.currentAttribute.isQuoted = isQuoted;
  },

  appendToAttributeValue: function (char) {
    var parts = this.currentAttribute.parts;

    if (typeof parts[parts.length - 1] === 'string') {
      parts[parts.length - 1] += char;
    } else {
      parts.push(char);
    }
  },

  finishAttributeValue: function () {
    var _currentAttribute = this.currentAttribute;
    var name = _currentAttribute.name;
    var parts = _currentAttribute.parts;
    var isQuoted = _currentAttribute.isQuoted;
    var isDynamic = _currentAttribute.isDynamic;

    var value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);

    this.currentNode.attributes.push(_builders2.default.attr(name, value));
  }
};

function assembleAttributeValue(parts, isQuoted, isDynamic, line) {
  if (isDynamic) {
    if (isQuoted) {
      return assembleConcatenatedValue(parts);
    } else {
      if (parts.length === 1) {
        return parts[0];
      } else {
        throw new Error("An unquoted attribute value must be a string or a mustache, " + "preceeded by whitespace or a '=' character, and " + ("followed by whitespace or a '>' character (on line " + line + ")"));
      }
    }
  } else {
    return _builders2.default.text(parts.length > 0 ? parts[0] : "");
  }
}

function assembleConcatenatedValue(parts) {
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];

    if (typeof part === 'string') {
      parts[i] = _builders2.default.string(parts[i]);
    } else {
      if (part.type === 'MustacheStatement') {
        parts[i] = _utils.unwrapMustache(part);
      } else {
        throw new Error("Unsupported node in quoted attribute value: " + part.type);
      }
    }
  }

  return _builders2.default.concat(parts);
}

function validateEndTag(tag, element, selfClosing) {
  var error;

  if (_htmlbarsUtilVoidTagNames2.default[tag.name] && !selfClosing) {
    // EngTag is also called by StartTag for void and self-closing tags (i.e.
    // <input> or <br />, so we need to check for that here. Otherwise, we would
    // throw an error for those cases.
    error = "Invalid end tag " + formatEndTagInfo(tag) + " (void elements cannot have end tags).";
  } else if (element.tag === undefined) {
    error = "Closing tag " + formatEndTagInfo(tag) + " without an open tag.";
  } else if (element.tag !== tag.name) {
    error = "Closing tag " + formatEndTagInfo(tag) + " did not match last open tag `" + element.tag + "` (on line " + element.loc.start.line + ").";
  }

  if (error) {
    throw new Error(error);
  }
}

function formatEndTagInfo(tag) {
  return "`" + tag.name + "` (on line " + tag.loc.end.line + ")";
}
module.exports = exports.default;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC9wYXJzZXIvdG9rZW5pemVyLWV2ZW50LWhhbmRsZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7d0NBQW9CLG9DQUFvQzs7Ozt3QkFDMUMsYUFBYTs7OztxQkFDNEMsVUFBVTs7a0JBRWxFO0FBQ2IsT0FBSyxFQUFFLFlBQVc7QUFDaEIsUUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7R0FDekI7Ozs7QUFJRCxjQUFZLEVBQUUsWUFBVztBQUN2QixRQUFJLENBQUMsV0FBVyxHQUFHLG1CQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUNsQzs7QUFFRCxxQkFBbUIsRUFBRSxVQUFTLElBQUksRUFBRTtBQUNsQyxRQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUM7R0FDaEM7O0FBRUQsZUFBYSxFQUFFLFlBQVc7QUFDeEIsdUJBQVksSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUN0RDs7OztBQUtELFdBQVMsRUFBRSxZQUFXO0FBQ3BCLFFBQUksQ0FBQyxXQUFXLEdBQUcsbUJBQUUsSUFBSSxFQUFFLENBQUM7R0FDN0I7O0FBRUQsY0FBWSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQzNCLFFBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQztHQUNoQzs7QUFFRCxZQUFVLEVBQUUsWUFBVztBQUNyQix1QkFBWSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0dBQ3REOzs7O0FBSUQsZUFBYSxFQUFFLFlBQVc7QUFDeEIsUUFBSSxDQUFDLFdBQVcsR0FBRztBQUNqQixVQUFJLEVBQUUsVUFBVTtBQUNoQixVQUFJLEVBQUUsRUFBRTtBQUNSLGdCQUFVLEVBQUUsRUFBRTtBQUNkLGVBQVMsRUFBRSxFQUFFO0FBQ2IsaUJBQVcsRUFBRSxLQUFLO0FBQ2xCLFNBQUcsRUFBRSxJQUFJ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QU8sQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLElBQUksRUFBRTtBQUNuQyxTQUFLLEdBQUcsY0FBYyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLGdDQUFnQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsYUFBYSxHQUN2RyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0dBQ3ZDOztBQUVELE1BQUksS0FBSyxFQUFFO0FBQUUsVUFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUFFO0NBQ3ZDOztBQUVELFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO0FBQzdCLFNBQU8sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsYUFBYSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7Q0FDaEUiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4L3BhcnNlci90b2tlbml6ZXItZXZlbnQtaGFuZGxlcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdm9pZE1hcCBmcm9tICcuLi8uLi9odG1sYmFycy11dGlsL3ZvaWQtdGFnLW5hbWVzJztcbmltcG9ydCBiIGZyb20gXCIuLi9idWlsZGVyc1wiO1xuaW1wb3J0IHsgYXBwZW5kQ2hpbGQsIHBhcnNlQ29tcG9uZW50QmxvY2tQYXJhbXMsIHVud3JhcE11c3RhY2hlIH0gZnJvbSBcIi4uL3V0aWxzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY3VycmVudE5vZGUgPSBudWxsO1xuICB9LFxuXG4gIC8vIENvbW1lbnRcblxuICBiZWdpbkNvbW1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY3VycmVudE5vZGUgPSBiLmNvbW1lbnQoXCJcIik7XG4gIH0sXG5cbiAgYXBwZW5kVG9Db21tZW50RGF0YTogZnVuY3Rpb24oY2hhcikge1xuICAgIHRoaXMuY3VycmVudE5vZGUudmFsdWUgKz0gY2hhcjtcbiAgfSxcblxuICBmaW5pc2hDb21tZW50OiBmdW5jdGlvbigpIHtcbiAgICBhcHBlbmRDaGlsZCh0aGlzLmN1cnJlbnRFbGVtZW50KCksIHRoaXMuY3VycmVudE5vZGUpO1xuICB9LFxuXG5cbiAgLy8gRGF0YVxuXG4gIGJlZ2luRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jdXJyZW50Tm9kZSA9IGIudGV4dCgpO1xuICB9LFxuXG4gIGFwcGVuZFRvRGF0YTogZnVuY3Rpb24oY2hhcikge1xuICAgIHRoaXMuY3VycmVudE5vZGUuY2hhcnMgKz0gY2hhcjtcbiAgfSxcblxuICBmaW5pc2hEYXRhOiBmdW5jdGlvbigpIHtcbiAgICBhcHBlbmRDaGlsZCh0aGlzLmN1cnJlbnRFbGVtZW50KCksIHRoaXMuY3VycmVudE5vZGUpO1xuICB9LFxuXG4gIC8vIFRhZ3MgLSBiYXNpY1xuXG4gIGJlZ2luU3RhcnRUYWc6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY3VycmVudE5vZGUgPSB7XG4gICAgICB0eXBlOiAnU3RhcnRUYWcnLFxuICAgICAgbmFtZTogXCJcIixcbiAgICAgIGF0dHJpYnV0ZXM6IFtdLFxuICAgICAgbW9kaWZpZXJzOiBbXSxcbiAgICAgIHNlbGZDbG9zaW5nOiBmYWxzZSxcbiAgICAgIGxvYzogbnVsbFxuICAgIH07XG4gIH0sXG5cbiAgYmVnaW5FbmRUYWc6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY3VycmVudE5vZGUgPSB7XG4gICAgICB0eXBlOiAnRW5kVGFnJyxcbiAgICAgIG5hbWU6IFwiXCIsXG4gICAgICBhdHRyaWJ1dGVzOiBbXSxcbiAgICAgIG1vZGlmaWVyczogW10sXG4gICAgICBzZWxmQ2xvc2luZzogZmFsc2UsXG4gICAgICBsb2M6IG51bGxcbiAgICB9O1xuICB9LFxuXG4gIGZpbmlzaFRhZzogZnVuY3Rpb24oKSB7XG4gICAgbGV0IHsgdGFnTGluZSwgdGFnQ29sdW1uLCBsaW5lLCBjb2x1bW4gfSA9IHRoaXMudG9rZW5pemVyO1xuXG4gICAgbGV0IHRhZyA9IHRoaXMuY3VycmVudE5vZGU7XG4gICAgdGFnLmxvYyA9IGIubG9jKHRhZ0xpbmUsIHRhZ0NvbHVtbiwgbGluZSwgY29sdW1uKTtcbiAgICBcbiAgICBpZiAodGFnLnR5cGUgPT09ICdTdGFydFRhZycpIHtcbiAgICAgIHRoaXMuZmluaXNoU3RhcnRUYWcoKTtcblxuICAgICAgaWYgKHZvaWRNYXAuaGFzT3duUHJvcGVydHkodGFnLm5hbWUpIHx8IHRhZy5zZWxmQ2xvc2luZykge1xuICAgICAgICB0aGlzLmZpbmlzaEVuZFRhZyh0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRhZy50eXBlID09PSAnRW5kVGFnJykge1xuICAgICAgdGhpcy5maW5pc2hFbmRUYWcoZmFsc2UpO1xuICAgIH1cbiAgfSxcblxuICBmaW5pc2hTdGFydFRhZzogZnVuY3Rpb24oKSB7XG4gICAgbGV0IHsgbmFtZSwgYXR0cmlidXRlcywgbW9kaWZpZXJzIH0gPSB0aGlzLmN1cnJlbnROb2RlO1xuXG4gICAgbGV0IGxvYyA9IGIubG9jKHRoaXMudG9rZW5pemVyLnRhZ0xpbmUsIHRoaXMudG9rZW5pemVyLnRhZ0NvbHVtbik7XG4gICAgbGV0IGVsZW1lbnQgPSBiLmVsZW1lbnQobmFtZSwgYXR0cmlidXRlcywgbW9kaWZpZXJzLCBbXSwgbG9jKTtcbiAgICB0aGlzLmVsZW1lbnRTdGFjay5wdXNoKGVsZW1lbnQpO1xuICB9LFxuXG4gIGZpbmlzaEVuZFRhZzogZnVuY3Rpb24oaXNWb2lkKSB7XG4gICAgbGV0IHRhZyA9IHRoaXMuY3VycmVudE5vZGU7XG5cbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuZWxlbWVudFN0YWNrLnBvcCgpO1xuICAgIGxldCBwYXJlbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50KCk7XG4gICAgbGV0IGRpc2FibGVDb21wb25lbnRHZW5lcmF0aW9uID0gKHRoaXMub3B0aW9ucy5kaXNhYmxlQ29tcG9uZW50R2VuZXJhdGlvbiA9PT0gdHJ1ZSk7XG5cbiAgICB2YWxpZGF0ZUVuZFRhZyh0YWcsIGVsZW1lbnQsIGlzVm9pZCk7XG5cbiAgICBlbGVtZW50LmxvYy5lbmQubGluZSA9IHRoaXMudG9rZW5pemVyLmxpbmU7XG4gICAgZWxlbWVudC5sb2MuZW5kLmNvbHVtbiA9IHRoaXMudG9rZW5pemVyLmNvbHVtbjtcblxuICAgIGlmIChkaXNhYmxlQ29tcG9uZW50R2VuZXJhdGlvbiB8fCBlbGVtZW50LnRhZy5pbmRleE9mKFwiLVwiKSA9PT0gLTEpIHtcbiAgICAgIGFwcGVuZENoaWxkKHBhcmVudCwgZWxlbWVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBwcm9ncmFtID0gYi5wcm9ncmFtKGVsZW1lbnQuY2hpbGRyZW4pO1xuICAgICAgcGFyc2VDb21wb25lbnRCbG9ja1BhcmFtcyhlbGVtZW50LCBwcm9ncmFtKTtcbiAgICAgIGxldCBjb21wb25lbnQgPSBiLmNvbXBvbmVudChlbGVtZW50LnRhZywgZWxlbWVudC5hdHRyaWJ1dGVzLCBwcm9ncmFtLCBlbGVtZW50LmxvYyk7XG4gICAgICBhcHBlbmRDaGlsZChwYXJlbnQsIGNvbXBvbmVudCk7XG4gICAgfVxuICB9LFxuXG4gIG1hcmtUYWdBc1NlbGZDbG9zaW5nOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmN1cnJlbnROb2RlLnNlbGZDbG9zaW5nID0gdHJ1ZTtcbiAgfSxcblxuICAvLyBUYWdzIC0gbmFtZVxuXG4gIGFwcGVuZFRvVGFnTmFtZTogZnVuY3Rpb24oY2hhcikge1xuICAgIHRoaXMuY3VycmVudE5vZGUubmFtZSArPSBjaGFyO1xuICB9LFxuXG4gIC8vIFRhZ3MgLSBhdHRyaWJ1dGVzXG5cbiAgYmVnaW5BdHRyaWJ1dGU6IGZ1bmN0aW9uKCkge1xuICAgIGxldCB0YWcgPSB0aGlzLmN1cnJlbnROb2RlO1xuICAgIGlmICh0YWcudHlwZSA9PT0gJ0VuZFRhZycpIHtcbiAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGVuZCB0YWc6IGNsb3NpbmcgdGFnIG11c3Qgbm90IGhhdmUgYXR0cmlidXRlcywgYCArXG4gICAgICAgIGBpbiBcXGAke3RhZy5uYW1lfVxcYCAob24gbGluZSAke3RoaXMudG9rZW5pemVyLmxpbmV9KS5gXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudEF0dHJpYnV0ZSA9IHtcbiAgICAgIG5hbWU6IFwiXCIsXG4gICAgICBwYXJ0czogW10sXG4gICAgICBpc1F1b3RlZDogZmFsc2UsXG4gICAgICBpc0R5bmFtaWM6IGZhbHNlXG4gICAgfTtcbiAgfSxcblxuICBhcHBlbmRUb0F0dHJpYnV0ZU5hbWU6IGZ1bmN0aW9uKGNoYXIpIHtcbiAgICB0aGlzLmN1cnJlbnRBdHRyaWJ1dGUubmFtZSArPSBjaGFyO1xuICB9LFxuXG4gIGJlZ2luQXR0cmlidXRlVmFsdWU6IGZ1bmN0aW9uKGlzUXVvdGVkKSB7XG4gICAgdGhpcy5jdXJyZW50QXR0cmlidXRlLmlzUXVvdGVkID0gaXNRdW90ZWQ7XG4gIH0sXG5cbiAgYXBwZW5kVG9BdHRyaWJ1dGVWYWx1ZTogZnVuY3Rpb24oY2hhcikge1xuICAgIGxldCBwYXJ0cyA9IHRoaXMuY3VycmVudEF0dHJpYnV0ZS5wYXJ0cztcblxuICAgIGlmICh0eXBlb2YgcGFydHNbcGFydHMubGVuZ3RoIC0gMV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSArPSBjaGFyO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0cy5wdXNoKGNoYXIpO1xuICAgIH1cbiAgfSxcblxuICBmaW5pc2hBdHRyaWJ1dGVWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgbGV0IHsgbmFtZSwgcGFydHMsIGlzUXVvdGVkLCBpc0R5bmFtaWMgfSA9IHRoaXMuY3VycmVudEF0dHJpYnV0ZTtcbiAgICBsZXQgdmFsdWUgPSBhc3NlbWJsZUF0dHJpYnV0ZVZhbHVlKHBhcnRzLCBpc1F1b3RlZCwgaXNEeW5hbWljLCB0aGlzLnRva2VuaXplci5saW5lKTtcblxuICAgIHRoaXMuY3VycmVudE5vZGUuYXR0cmlidXRlcy5wdXNoKGIuYXR0cihuYW1lLCB2YWx1ZSkpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZUF0dHJpYnV0ZVZhbHVlKHBhcnRzLCBpc1F1b3RlZCwgaXNEeW5hbWljLCBsaW5lKSB7XG4gIGlmIChpc0R5bmFtaWMpIHtcbiAgICBpZiAoaXNRdW90ZWQpIHtcbiAgICAgIHJldHVybiBhc3NlbWJsZUNvbmNhdGVuYXRlZFZhbHVlKHBhcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gcGFydHNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEFuIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgbXVzdGFjaGUsIGAgK1xuICAgICAgICAgIGBwcmVjZWVkZWQgYnkgd2hpdGVzcGFjZSBvciBhICc9JyBjaGFyYWN0ZXIsIGFuZCBgICtcbiAgICAgICAgICBgZm9sbG93ZWQgYnkgd2hpdGVzcGFjZSBvciBhICc+JyBjaGFyYWN0ZXIgKG9uIGxpbmUgJHtsaW5lfSlgXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiLnRleHQoKHBhcnRzLmxlbmd0aCA+IDApID8gcGFydHNbMF0gOiBcIlwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlbWJsZUNvbmNhdGVuYXRlZFZhbHVlKHBhcnRzKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKHR5cGVvZiBwYXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgcGFydHNbaV0gPSBiLnN0cmluZyhwYXJ0c1tpXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChwYXJ0LnR5cGUgPT09ICdNdXN0YWNoZVN0YXRlbWVudCcpIHtcbiAgICAgICAgcGFydHNbaV0gPSB1bndyYXBNdXN0YWNoZShwYXJ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIG5vZGUgaW4gcXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZTogXCIgKyBwYXJ0LnR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBiLmNvbmNhdChwYXJ0cyk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlRW5kVGFnKHRhZywgZWxlbWVudCwgc2VsZkNsb3NpbmcpIHtcbiAgdmFyIGVycm9yO1xuXG4gIGlmICh2b2lkTWFwW3RhZy5uYW1lXSAmJiAhc2VsZkNsb3NpbmcpIHtcbiAgICAvLyBFbmdUYWcgaXMgYWxzbyBjYWxsZWQgYnkgU3RhcnRUYWcgZm9yIHZvaWQgYW5kIHNlbGYtY2xvc2luZyB0YWdzIChpLmUuXG4gICAgLy8gPGlucHV0PiBvciA8YnIgLz4sIHNvIHdlIG5lZWQgdG8gY2hlY2sgZm9yIHRoYXQgaGVyZS4gT3RoZXJ3aXNlLCB3ZSB3b3VsZFxuICAgIC8vIHRocm93IGFuIGVycm9yIGZvciB0aG9zZSBjYXNlcy5cbiAgICBlcnJvciA9IFwiSW52YWxpZCBlbmQgdGFnIFwiICsgZm9ybWF0RW5kVGFnSW5mbyh0YWcpICsgXCIgKHZvaWQgZWxlbWVudHMgY2Fubm90IGhhdmUgZW5kIHRhZ3MpLlwiO1xuICB9IGVsc2UgaWYgKGVsZW1lbnQudGFnID09PSB1bmRlZmluZWQpIHtcbiAgICBlcnJvciA9IFwiQ2xvc2luZyB0YWcgXCIgKyBmb3JtYXRFbmRUYWdJbmZvKHRhZykgKyBcIiB3aXRob3V0IGFuIG9wZW4gdGFnLlwiO1xuICB9IGVsc2UgaWYgKGVsZW1lbnQudGFnICE9PSB0YWcubmFtZSkge1xuICAgIGVycm9yID0gXCJDbG9zaW5nIHRhZyBcIiArIGZvcm1hdEVuZFRhZ0luZm8odGFnKSArIFwiIGRpZCBub3QgbWF0Y2ggbGFzdCBvcGVuIHRhZyBgXCIgKyBlbGVtZW50LnRhZyArIFwiYCAob24gbGluZSBcIiArXG4gICAgICAgICAgICBlbGVtZW50LmxvYy5zdGFydC5saW5lICsgXCIpLlwiO1xuICB9XG5cbiAgaWYgKGVycm9yKSB7IHRocm93IG5ldyBFcnJvcihlcnJvcik7IH1cbn1cblxuZnVuY3Rpb24gZm9ybWF0RW5kVGFnSW5mbyh0YWcpIHtcbiAgcmV0dXJuIFwiYFwiICsgdGFnLm5hbWUgKyBcImAgKG9uIGxpbmUgXCIgKyB0YWcubG9jLmVuZC5saW5lICsgXCIpXCI7XG59XG4iXX0=