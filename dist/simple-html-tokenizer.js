"use strict";
/*jshint boss:true*/

var namedCodepoints = require("./simple-html-tokenizer/char-refs").namedCodepoints;
var objectCreate = require("./simple-html-tokenizer/helpers").objectCreate;
var isSpace = require("./simple-html-tokenizer/helpers").isSpace;
var isAlpha = require("./simple-html-tokenizer/helpers").isAlpha;
var isUpper = require("./simple-html-tokenizer/helpers").isUpper;

function preprocessInput(input) {
  return input.replace(/\r\n?/g, "\n");
}

function Tokenizer(input) {
  this.input = preprocessInput(input);
  this.char = 0;
  this.line = 1;
  this.column = 0;

  this.state = 'data';
  this.token = null;
}

Tokenizer.prototype = {
  tokenize: function() {
    var tokens = [], token;

    while (true) {
      token = this.lex();
      if (token === 'EOF') { break; }
      if (token) { tokens.push(token); }
    }

    if (this.token) {
      tokens.push(this.token);
    }

    return tokens;
  },

  tokenizePart: function(string) {
    this.input += preprocessInput(string);
    var tokens = [], token;

    while (this.char < this.input.length) {
      token = this.lex();
      if (token) { tokens.push(token); }
    }

    this.tokens = (this.tokens || []).concat(tokens);
    return tokens;
  },

  tokenizeEOF: function() {
    var token = this.token;
    if (token) {
      this.token = null;
      return token;
    }
  },

  tag: function(Type, char) {
    var lastToken = this.token;
    this.token = new Type(char);
    this.state = 'tagName';
    return lastToken;
  },

  selfClosing: function() {
    this.token.selfClosing = true;
  },

  attribute: function(char) {
    this.token.startAttribute(char);
    this.state = 'attributeName';
  },

  addToAttributeName: function(char) {
    this.token.addToAttributeName(char);
  },

  addToAttributeValue: function(char) {
    this.token.addToAttributeValue(char);
  },

  commentStart: function() {
    var lastToken = this.token;
    this.token = new CommentToken();
    this.state = 'commentStart';
    return lastToken;
  },

  addToComment: function(char) {
    this.token.addChar(char);
  },

  emitData: function() {
    this.addLocInfo(this.line, this.column - 1);
    var lastToken = this.token;
    this.token = null;
    this.state = 'tagOpen';
    return lastToken;
  },

  emitToken: function() {
    this.addLocInfo();
    var lastToken = this.token.finalize();
    this.token = null;
    this.state = 'data';
    return lastToken;
  },

  addData: function(char) {
    if (this.token === null) {
      this.token = new Chars();
      this.markFirst();
    }

    this.token.addChar(char);
  },

  markFirst: function(line, column) {
    this.firstLine = (line === 0) ? 0 : (line || this.line);
    this.firstColumn = (column === 0) ? 0 : (column || this.column);
  },

  addLocInfo: function(line, column) {
    if (!this.token) return;
    this.token.firstLine = this.firstLine;
    this.token.firstColumn = this.firstColumn;
    this.token.lastLine = (line === 0) ? 0 : (line || this.line);
    this.token.lastColumn = (column === 0) ? 0 : (column || this.column);
  },

  consumeCharRef: function(allowedChar) {
    var matches;
    var input = this.input.slice(this.char);

    if (matches = input.match(/^#(?:x|X)([0-9A-Fa-f]+);/)) {
      this.char += matches[0].length;
      return String.fromCharCode(parseInt(matches[1], 16));
    } else if (matches = input.match(/^#([0-9]+);/)) {
      this.char += matches[0].length;
      return String.fromCharCode(parseInt(matches[1], 10));
    } else if (matches = input.match(/^([A-Za-z]+);/)) {
      var codepoints = namedCodepoints[matches[1]];
      if (codepoints) {
        this.char += matches[0].length;
        for (var i = 0, str = ""; i < codepoints.length; i++) {
          str += String.fromCharCode(codepoints[i]);
        }
        return str;
      }
    }

  },

  lex: function() {
    var char = this.input.charAt(this.char++);

    if (char) {
      if (char === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      // console.log(this.state, char);
      return this.states[this.state].call(this, char);
    } else {
      this.addLocInfo(this.line, this.column);
      return 'EOF';
    }
  },

  states: {
    data: function(char) {
      if (char === "<") {
        var chars = this.emitData();
        this.markFirst();
        return chars;
      } else if (char === "&") {
        this.addData(this.consumeCharRef() || "&");
      } else {
        this.addData(char);
      }
    },

    tagOpen: function(char) {
      if (char === "!") {
        this.state = 'markupDeclaration';
      } else if (char === "/") {
        this.state = 'endTagOpen';
      } else if (isAlpha(char)) {
        return this.tag(StartTag, char.toLowerCase());
      }
    },

    markupDeclaration: function(char) {
      if (char === "-" && this.input.charAt(this.char) === "-") {
        this.char++;
        this.commentStart();
      }
    },

    commentStart: function(char) {
      if (char === "-") {
        this.state = 'commentStartDash';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToComment(char);
        this.state = 'comment';
      }
    },

    commentStartDash: function(char) {
      if (char === "-") {
        this.state = 'commentEnd';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToComment("-");
        this.state = 'comment';
      }
    },

    comment: function(char) {
      if (char === "-") {
        this.state = 'commentEndDash';
      } else {
        this.addToComment(char);
      }
    },

    commentEndDash: function(char) {
      if (char === "-") {
        this.state = 'commentEnd';
      } else {
        this.addToComment("-" + char);
        this.state = 'comment';
      }
    },

    commentEnd: function(char) {
      if (char === ">") {
        return this.emitToken();
      } else {
        this.addToComment("--" + char);
        this.state = 'comment';
      }
    },

    tagName: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.token.addToTagName(char);
      }
    },

    beforeAttributeName: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.attribute(char);
      }
    },

    attributeName: function(char) {
      if (isSpace(char)) {
        this.state = 'afterAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToAttributeName(char);
      }
    },

    afterAttributeName: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.attribute(char);
      }
    },

    beforeAttributeValue: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === '"') {
        this.state = 'attributeValueDoubleQuoted';
      } else if (char === "'") {
        this.state = 'attributeValueSingleQuoted';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.state = 'attributeValueUnquoted';
        this.addToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted: function(char) {
      if (char === '"') {
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.addToAttributeValue(this.consumeCharRef('"') || "&");
      } else {
        this.addToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted: function(char) {
      if (char === "'") {
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.addToAttributeValue(this.consumeCharRef("'") || "&");
      } else {
        this.addToAttributeValue(char);
      }
    },

    attributeValueUnquoted: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "&") {
        this.addToAttributeValue(this.consumeCharRef(">") || "&");
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.char--;
        this.state = 'beforeAttributeName';
      }
    },

    selfClosingStartTag: function(char) {
      if (char === ">") {
        this.selfClosing();
        return this.emitToken();
      } else {
        this.char--;
        this.state = 'beforeAttributeName';
      }
    },

    endTagOpen: function(char) {
      if (isAlpha(char)) {
        this.tag(EndTag, char.toLowerCase());
      }
    }
  }
};

function Tag(tagName, attributes, options) {
  this.tagName = tagName || "";
  this.attributes = attributes || [];
  this.selfClosing = options ? options.selfClosing : false;
}

Tag.prototype = {
  constructor: Tag,

  addToTagName: function(char) {
    this.tagName += char;
  },

  startAttribute: function(char) {
    this.currentAttribute = [char.toLowerCase(), null];
    this.attributes.push(this.currentAttribute);
  },

  addToAttributeName: function(char) {
    this.currentAttribute[0] += char;
  },

  addToAttributeValue: function(char) {
    this.currentAttribute[1] = this.currentAttribute[1] || "";
    this.currentAttribute[1] += char;
  },

  finalize: function() {
    delete this.currentAttribute;
    return this;
  }
};

function StartTag() {
  Tag.apply(this, arguments);
}

StartTag.prototype = objectCreate(Tag.prototype);
StartTag.prototype.type = 'StartTag';
StartTag.prototype.constructor = StartTag;

StartTag.prototype.toHTML = function() {
  return config.generateTag(this);
};

function generateTag(tag) {
  var out = "<";
  out += tag.tagName;

  if (tag.attributes.length) {
    out += " " + config.generateAttributes(tag.attributes);
  }

  out += ">";

  return out;
}

function generateAttributes(attributes) {
  var out = [], attribute, attrString, value;

  for (var i=0, l=attributes.length; i<l; i++) {
    attribute = attributes[i];

    out.push(config.generateAttribute.apply(this, attribute));
  }

  return out.join(" ");
}

function generateAttribute(name, value) {
  var attrString = name;

  if (value) {
    value = value.replace(/"/, '\\"');
    attrString += "=\"" + value + "\"";
  }

  return attrString;
}

function EndTag() {
  Tag.apply(this, arguments);
}

EndTag.prototype = objectCreate(Tag.prototype);
EndTag.prototype.type = 'EndTag';
EndTag.prototype.constructor = EndTag;

EndTag.prototype.toHTML = function() {
  var out = "</";
  out += this.tagName;
  out += ">";

  return out;
};

function Chars(chars) {
  this.chars = chars || "";
}

Chars.prototype = {
  type: 'Chars',
  constructor: Chars,

  addChar: function(char) {
    this.chars += char;
  },

  toHTML: function() {
    return this.chars;
  }
};

function CommentToken(chars) {
  this.chars = chars || "";
}

CommentToken.prototype = {
  type: 'CommentToken',
  constructor: CommentToken,

  finalize: function() { return this; },

  addChar: function(char) {
    this.chars += char;
  },

  toHTML: function() {
    return "<!--" + this.chars + "-->";
  }
};

function tokenize(input) {
  var tokenizer = new Tokenizer(input);
  return tokenizer.tokenize();
}

function generate(tokens) {
  var output = "";

  for (var i=0, l=tokens.length; i<l; i++) {
    output += tokens[i].toHTML();
  }

  return output;
}

var config = {
  generateAttributes: generateAttributes,
  generateAttribute: generateAttribute,
  generateTag: generateTag
};

var original = {
  generateAttributes: generateAttributes,
  generateAttribute: generateAttribute,
  generateTag: generateTag
};

function configure(name, value) {
  config[name] = value;
}

exports.Tokenizer = Tokenizer;
exports.tokenize = tokenize;
exports.generate = generate;
exports.configure = configure;
exports.original = original;
exports.StartTag = StartTag;
exports.EndTag = EndTag;
exports.Chars = Chars;
exports.CommentToken = CommentToken;