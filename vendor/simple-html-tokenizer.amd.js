define("simple-html-tokenizer",
  ["simple-html-tokenizer/char-refs","simple-html-tokenizer/helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*jshint boss:true*/

    var namedCodepoints = __dependency1__.namedCodepoints;
    var objectCreate = __dependency2__.objectCreate;
    var isSpace = __dependency2__.isSpace;
    var isAlpha = __dependency2__.isAlpha;
    var isUpper = __dependency2__.isUpper;

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
          if (char === "-" && this.input[this.char] === "-") {
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

    __exports__.Tokenizer = Tokenizer;
    __exports__.tokenize = tokenize;
    __exports__.generate = generate;
    __exports__.configure = configure;
    __exports__.original = original;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
    __exports__.Chars = Chars;
    __exports__.CommentToken = CommentToken;
  });
define("simple-html-tokenizer/char-refs",
  ["exports"],
  function(__exports__) {
    "use strict";
    var namedCodepoints = {
      AElig: [198],
      AMP: [38],
      Aacute: [193],
      Abreve: [258],
      Acirc: [194],
      Acy: [1040],
      Afr: [120068],
      Agrave: [192],
      Alpha: [913],
      Amacr: [256],
      And: [10835],
      Aogon: [260],
      Aopf: [120120],
      ApplyFunction: [8289],
      Aring: [197],
      Ascr: [119964],
      Assign: [8788],
      Atilde: [195],
      Auml: [196],
      Backslash: [8726],
      Barv: [10983],
      Barwed: [8966],
      Bcy: [1041],
      Because: [8757],
      Bernoullis: [8492],
      Beta: [914],
      Bfr: [120069],
      Bopf: [120121],
      Breve: [728],
      Bscr: [8492],
      Bumpeq: [8782],
      CHcy: [1063],
      COPY: [169],
      Cacute: [262],
      Cap: [8914],
      CapitalDifferentialD: [8517],
      Cayleys: [8493],
      Ccaron: [268],
      Ccedil: [199],
      Ccirc: [264],
      Cconint: [8752],
      Cdot: [266],
      Cedilla: [184],
      CenterDot: [183],
      Cfr: [8493],
      Chi: [935],
      CircleDot: [8857],
      CircleMinus: [8854],
      CirclePlus: [8853],
      CircleTimes: [8855],
      ClockwiseContourIntegral: [8754],
      CloseCurlyDoubleQuote: [8221],
      CloseCurlyQuote: [8217],
      Colon: [8759],
      Colone: [10868],
      Congruent: [8801],
      Conint: [8751],
      ContourIntegral: [8750],
      Copf: [8450],
      Coproduct: [8720],
      CounterClockwiseContourIntegral: [8755],
      Cross: [10799],
      Cscr: [119966],
      Cup: [8915],
      CupCap: [8781],
      DD: [8517],
      DDotrahd: [10513],
      DJcy: [1026],
      DScy: [1029],
      DZcy: [1039],
      Dagger: [8225],
      Darr: [8609],
      Dashv: [10980],
      Dcaron: [270],
      Dcy: [1044],
      Del: [8711],
      Delta: [916],
      Dfr: [120071],
      DiacriticalAcute: [180],
      DiacriticalDot: [729],
      DiacriticalDoubleAcute: [733],
      DiacriticalGrave: [96],
      DiacriticalTilde: [732],
      Diamond: [8900],
      DifferentialD: [8518],
      Dopf: [120123],
      Dot: [168],
      DotDot: [8412],
      DotEqual: [8784],
      DoubleContourIntegral: [8751],
      DoubleDot: [168],
      DoubleDownArrow: [8659],
      DoubleLeftArrow: [8656],
      DoubleLeftRightArrow: [8660],
      DoubleLeftTee: [10980],
      DoubleLongLeftArrow: [10232],
      DoubleLongLeftRightArrow: [10234],
      DoubleLongRightArrow: [10233],
      DoubleRightArrow: [8658],
      DoubleRightTee: [8872],
      DoubleUpArrow: [8657],
      DoubleUpDownArrow: [8661],
      DoubleVerticalBar: [8741],
      DownArrow: [8595],
      DownArrowBar: [10515],
      DownArrowUpArrow: [8693],
      DownBreve: [785],
      DownLeftRightVector: [10576],
      DownLeftTeeVector: [10590],
      DownLeftVector: [8637],
      DownLeftVectorBar: [10582],
      DownRightTeeVector: [10591],
      DownRightVector: [8641],
      DownRightVectorBar: [10583],
      DownTee: [8868],
      DownTeeArrow: [8615],
      Downarrow: [8659],
      Dscr: [119967],
      Dstrok: [272],
      ENG: [330],
      ETH: [208],
      Eacute: [201],
      Ecaron: [282],
      Ecirc: [202],
      Ecy: [1069],
      Edot: [278],
      Efr: [120072],
      Egrave: [200],
      Element: [8712],
      Emacr: [274],
      EmptySmallSquare: [9723],
      EmptyVerySmallSquare: [9643],
      Eogon: [280],
      Eopf: [120124],
      Epsilon: [917],
      Equal: [10869],
      EqualTilde: [8770],
      Equilibrium: [8652],
      Escr: [8496],
      Esim: [10867],
      Eta: [919],
      Euml: [203],
      Exists: [8707],
      ExponentialE: [8519],
      Fcy: [1060],
      Ffr: [120073],
      FilledSmallSquare: [9724],
      FilledVerySmallSquare: [9642],
      Fopf: [120125],
      ForAll: [8704],
      Fouriertrf: [8497],
      Fscr: [8497],
      GJcy: [1027],
      GT: [62],
      Gamma: [915],
      Gammad: [988],
      Gbreve: [286],
      Gcedil: [290],
      Gcirc: [284],
      Gcy: [1043],
      Gdot: [288],
      Gfr: [120074],
      Gg: [8921],
      Gopf: [120126],
      GreaterEqual: [8805],
      GreaterEqualLess: [8923],
      GreaterFullEqual: [8807],
      GreaterGreater: [10914],
      GreaterLess: [8823],
      GreaterSlantEqual: [10878],
      GreaterTilde: [8819],
      Gscr: [119970],
      Gt: [8811],
      HARDcy: [1066],
      Hacek: [711],
      Hat: [94],
      Hcirc: [292],
      Hfr: [8460],
      HilbertSpace: [8459],
      Hopf: [8461],
      HorizontalLine: [9472],
      Hscr: [8459],
      Hstrok: [294],
      HumpDownHump: [8782],
      HumpEqual: [8783],
      IEcy: [1045],
      IJlig: [306],
      IOcy: [1025],
      Iacute: [205],
      Icirc: [206],
      Icy: [1048],
      Idot: [304],
      Ifr: [8465],
      Igrave: [204],
      Im: [8465],
      Imacr: [298],
      ImaginaryI: [8520],
      Implies: [8658],
      Int: [8748],
      Integral: [8747],
      Intersection: [8898],
      InvisibleComma: [8291],
      InvisibleTimes: [8290],
      Iogon: [302],
      Iopf: [120128],
      Iota: [921],
      Iscr: [8464],
      Itilde: [296],
      Iukcy: [1030],
      Iuml: [207],
      Jcirc: [308],
      Jcy: [1049],
      Jfr: [120077],
      Jopf: [120129],
      Jscr: [119973],
      Jsercy: [1032],
      Jukcy: [1028],
      KHcy: [1061],
      KJcy: [1036],
      Kappa: [922],
      Kcedil: [310],
      Kcy: [1050],
      Kfr: [120078],
      Kopf: [120130],
      Kscr: [119974],
      LJcy: [1033],
      LT: [60],
      Lacute: [313],
      Lambda: [923],
      Lang: [10218],
      Laplacetrf: [8466],
      Larr: [8606],
      Lcaron: [317],
      Lcedil: [315],
      Lcy: [1051],
      LeftAngleBracket: [10216],
      LeftArrow: [8592],
      LeftArrowBar: [8676],
      LeftArrowRightArrow: [8646],
      LeftCeiling: [8968],
      LeftDoubleBracket: [10214],
      LeftDownTeeVector: [10593],
      LeftDownVector: [8643],
      LeftDownVectorBar: [10585],
      LeftFloor: [8970],
      LeftRightArrow: [8596],
      LeftRightVector: [10574],
      LeftTee: [8867],
      LeftTeeArrow: [8612],
      LeftTeeVector: [10586],
      LeftTriangle: [8882],
      LeftTriangleBar: [10703],
      LeftTriangleEqual: [8884],
      LeftUpDownVector: [10577],
      LeftUpTeeVector: [10592],
      LeftUpVector: [8639],
      LeftUpVectorBar: [10584],
      LeftVector: [8636],
      LeftVectorBar: [10578],
      Leftarrow: [8656],
      Leftrightarrow: [8660],
      LessEqualGreater: [8922],
      LessFullEqual: [8806],
      LessGreater: [8822],
      LessLess: [10913],
      LessSlantEqual: [10877],
      LessTilde: [8818],
      Lfr: [120079],
      Ll: [8920],
      Lleftarrow: [8666],
      Lmidot: [319],
      LongLeftArrow: [10229],
      LongLeftRightArrow: [10231],
      LongRightArrow: [10230],
      Longleftarrow: [10232],
      Longleftrightarrow: [10234],
      Longrightarrow: [10233],
      Lopf: [120131],
      LowerLeftArrow: [8601],
      LowerRightArrow: [8600],
      Lscr: [8466],
      Lsh: [8624],
      Lstrok: [321],
      Lt: [8810],
      Map: [10501],
      Mcy: [1052],
      MediumSpace: [8287],
      Mellintrf: [8499],
      Mfr: [120080],
      MinusPlus: [8723],
      Mopf: [120132],
      Mscr: [8499],
      Mu: [924],
      NJcy: [1034],
      Nacute: [323],
      Ncaron: [327],
      Ncedil: [325],
      Ncy: [1053],
      NegativeMediumSpace: [8203],
      NegativeThickSpace: [8203],
      NegativeThinSpace: [8203],
      NegativeVeryThinSpace: [8203],
      NestedGreaterGreater: [8811],
      NestedLessLess: [8810],
      NewLine: [10],
      Nfr: [120081],
      NoBreak: [8288],
      NonBreakingSpace: [160],
      Nopf: [8469],
      Not: [10988],
      NotCongruent: [8802],
      NotCupCap: [8813],
      NotDoubleVerticalBar: [8742],
      NotElement: [8713],
      NotEqual: [8800],
      NotEqualTilde: [8770, 824],
      NotExists: [8708],
      NotGreater: [8815],
      NotGreaterEqual: [8817],
      NotGreaterFullEqual: [8807, 824],
      NotGreaterGreater: [8811, 824],
      NotGreaterLess: [8825],
      NotGreaterSlantEqual: [10878, 824],
      NotGreaterTilde: [8821],
      NotHumpDownHump: [8782, 824],
      NotHumpEqual: [8783, 824],
      NotLeftTriangle: [8938],
      NotLeftTriangleBar: [10703, 824],
      NotLeftTriangleEqual: [8940],
      NotLess: [8814],
      NotLessEqual: [8816],
      NotLessGreater: [8824],
      NotLessLess: [8810, 824],
      NotLessSlantEqual: [10877, 824],
      NotLessTilde: [8820],
      NotNestedGreaterGreater: [10914, 824],
      NotNestedLessLess: [10913, 824],
      NotPrecedes: [8832],
      NotPrecedesEqual: [10927, 824],
      NotPrecedesSlantEqual: [8928],
      NotReverseElement: [8716],
      NotRightTriangle: [8939],
      NotRightTriangleBar: [10704, 824],
      NotRightTriangleEqual: [8941],
      NotSquareSubset: [8847, 824],
      NotSquareSubsetEqual: [8930],
      NotSquareSuperset: [8848, 824],
      NotSquareSupersetEqual: [8931],
      NotSubset: [8834, 8402],
      NotSubsetEqual: [8840],
      NotSucceeds: [8833],
      NotSucceedsEqual: [10928, 824],
      NotSucceedsSlantEqual: [8929],
      NotSucceedsTilde: [8831, 824],
      NotSuperset: [8835, 8402],
      NotSupersetEqual: [8841],
      NotTilde: [8769],
      NotTildeEqual: [8772],
      NotTildeFullEqual: [8775],
      NotTildeTilde: [8777],
      NotVerticalBar: [8740],
      Nscr: [119977],
      Ntilde: [209],
      Nu: [925],
      OElig: [338],
      Oacute: [211],
      Ocirc: [212],
      Ocy: [1054],
      Odblac: [336],
      Ofr: [120082],
      Ograve: [210],
      Omacr: [332],
      Omega: [937],
      Omicron: [927],
      Oopf: [120134],
      OpenCurlyDoubleQuote: [8220],
      OpenCurlyQuote: [8216],
      Or: [10836],
      Oscr: [119978],
      Oslash: [216],
      Otilde: [213],
      Otimes: [10807],
      Ouml: [214],
      OverBar: [8254],
      OverBrace: [9182],
      OverBracket: [9140],
      OverParenthesis: [9180],
      PartialD: [8706],
      Pcy: [1055],
      Pfr: [120083],
      Phi: [934],
      Pi: [928],
      PlusMinus: [177],
      Poincareplane: [8460],
      Popf: [8473],
      Pr: [10939],
      Precedes: [8826],
      PrecedesEqual: [10927],
      PrecedesSlantEqual: [8828],
      PrecedesTilde: [8830],
      Prime: [8243],
      Product: [8719],
      Proportion: [8759],
      Proportional: [8733],
      Pscr: [119979],
      Psi: [936],
      QUOT: [34],
      Qfr: [120084],
      Qopf: [8474],
      Qscr: [119980],
      RBarr: [10512],
      REG: [174],
      Racute: [340],
      Rang: [10219],
      Rarr: [8608],
      Rarrtl: [10518],
      Rcaron: [344],
      Rcedil: [342],
      Rcy: [1056],
      Re: [8476],
      ReverseElement: [8715],
      ReverseEquilibrium: [8651],
      ReverseUpEquilibrium: [10607],
      Rfr: [8476],
      Rho: [929],
      RightAngleBracket: [10217],
      RightArrow: [8594],
      RightArrowBar: [8677],
      RightArrowLeftArrow: [8644],
      RightCeiling: [8969],
      RightDoubleBracket: [10215],
      RightDownTeeVector: [10589],
      RightDownVector: [8642],
      RightDownVectorBar: [10581],
      RightFloor: [8971],
      RightTee: [8866],
      RightTeeArrow: [8614],
      RightTeeVector: [10587],
      RightTriangle: [8883],
      RightTriangleBar: [10704],
      RightTriangleEqual: [8885],
      RightUpDownVector: [10575],
      RightUpTeeVector: [10588],
      RightUpVector: [8638],
      RightUpVectorBar: [10580],
      RightVector: [8640],
      RightVectorBar: [10579],
      Rightarrow: [8658],
      Ropf: [8477],
      RoundImplies: [10608],
      Rrightarrow: [8667],
      Rscr: [8475],
      Rsh: [8625],
      RuleDelayed: [10740],
      SHCHcy: [1065],
      SHcy: [1064],
      SOFTcy: [1068],
      Sacute: [346],
      Sc: [10940],
      Scaron: [352],
      Scedil: [350],
      Scirc: [348],
      Scy: [1057],
      Sfr: [120086],
      ShortDownArrow: [8595],
      ShortLeftArrow: [8592],
      ShortRightArrow: [8594],
      ShortUpArrow: [8593],
      Sigma: [931],
      SmallCircle: [8728],
      Sopf: [120138],
      Sqrt: [8730],
      Square: [9633],
      SquareIntersection: [8851],
      SquareSubset: [8847],
      SquareSubsetEqual: [8849],
      SquareSuperset: [8848],
      SquareSupersetEqual: [8850],
      SquareUnion: [8852],
      Sscr: [119982],
      Star: [8902],
      Sub: [8912],
      Subset: [8912],
      SubsetEqual: [8838],
      Succeeds: [8827],
      SucceedsEqual: [10928],
      SucceedsSlantEqual: [8829],
      SucceedsTilde: [8831],
      SuchThat: [8715],
      Sum: [8721],
      Sup: [8913],
      Superset: [8835],
      SupersetEqual: [8839],
      Supset: [8913],
      THORN: [222],
      TRADE: [8482],
      TSHcy: [1035],
      TScy: [1062],
      Tab: [9],
      Tau: [932],
      Tcaron: [356],
      Tcedil: [354],
      Tcy: [1058],
      Tfr: [120087],
      Therefore: [8756],
      Theta: [920],
      ThickSpace: [8287, 8202],
      ThinSpace: [8201],
      Tilde: [8764],
      TildeEqual: [8771],
      TildeFullEqual: [8773],
      TildeTilde: [8776],
      Topf: [120139],
      TripleDot: [8411],
      Tscr: [119983],
      Tstrok: [358],
      Uacute: [218],
      Uarr: [8607],
      Uarrocir: [10569],
      Ubrcy: [1038],
      Ubreve: [364],
      Ucirc: [219],
      Ucy: [1059],
      Udblac: [368],
      Ufr: [120088],
      Ugrave: [217],
      Umacr: [362],
      UnderBar: [95],
      UnderBrace: [9183],
      UnderBracket: [9141],
      UnderParenthesis: [9181],
      Union: [8899],
      UnionPlus: [8846],
      Uogon: [370],
      Uopf: [120140],
      UpArrow: [8593],
      UpArrowBar: [10514],
      UpArrowDownArrow: [8645],
      UpDownArrow: [8597],
      UpEquilibrium: [10606],
      UpTee: [8869],
      UpTeeArrow: [8613],
      Uparrow: [8657],
      Updownarrow: [8661],
      UpperLeftArrow: [8598],
      UpperRightArrow: [8599],
      Upsi: [978],
      Upsilon: [933],
      Uring: [366],
      Uscr: [119984],
      Utilde: [360],
      Uuml: [220],
      VDash: [8875],
      Vbar: [10987],
      Vcy: [1042],
      Vdash: [8873],
      Vdashl: [10982],
      Vee: [8897],
      Verbar: [8214],
      Vert: [8214],
      VerticalBar: [8739],
      VerticalLine: [124],
      VerticalSeparator: [10072],
      VerticalTilde: [8768],
      VeryThinSpace: [8202],
      Vfr: [120089],
      Vopf: [120141],
      Vscr: [119985],
      Vvdash: [8874],
      Wcirc: [372],
      Wedge: [8896],
      Wfr: [120090],
      Wopf: [120142],
      Wscr: [119986],
      Xfr: [120091],
      Xi: [926],
      Xopf: [120143],
      Xscr: [119987],
      YAcy: [1071],
      YIcy: [1031],
      YUcy: [1070],
      Yacute: [221],
      Ycirc: [374],
      Ycy: [1067],
      Yfr: [120092],
      Yopf: [120144],
      Yscr: [119988],
      Yuml: [376],
      ZHcy: [1046],
      Zacute: [377],
      Zcaron: [381],
      Zcy: [1047],
      Zdot: [379],
      ZeroWidthSpace: [8203],
      Zeta: [918],
      Zfr: [8488],
      Zopf: [8484],
      Zscr: [119989],
      aacute: [225],
      abreve: [259],
      ac: [8766],
      acE: [8766, 819],
      acd: [8767],
      acirc: [226],
      acute: [180],
      acy: [1072],
      aelig: [230],
      af: [8289],
      afr: [120094],
      agrave: [224],
      alefsym: [8501],
      aleph: [8501],
      alpha: [945],
      amacr: [257],
      amalg: [10815],
      amp: [38],
      and: [8743],
      andand: [10837],
      andd: [10844],
      andslope: [10840],
      andv: [10842],
      ang: [8736],
      ange: [10660],
      angle: [8736],
      angmsd: [8737],
      angmsdaa: [10664],
      angmsdab: [10665],
      angmsdac: [10666],
      angmsdad: [10667],
      angmsdae: [10668],
      angmsdaf: [10669],
      angmsdag: [10670],
      angmsdah: [10671],
      angrt: [8735],
      angrtvb: [8894],
      angrtvbd: [10653],
      angsph: [8738],
      angst: [197],
      angzarr: [9084],
      aogon: [261],
      aopf: [120146],
      ap: [8776],
      apE: [10864],
      apacir: [10863],
      ape: [8778],
      apid: [8779],
      apos: [39],
      approx: [8776],
      approxeq: [8778],
      aring: [229],
      ascr: [119990],
      ast: [42],
      asymp: [8776],
      asympeq: [8781],
      atilde: [227],
      auml: [228],
      awconint: [8755],
      awint: [10769],
      bNot: [10989],
      backcong: [8780],
      backepsilon: [1014],
      backprime: [8245],
      backsim: [8765],
      backsimeq: [8909],
      barvee: [8893],
      barwed: [8965],
      barwedge: [8965],
      bbrk: [9141],
      bbrktbrk: [9142],
      bcong: [8780],
      bcy: [1073],
      bdquo: [8222],
      becaus: [8757],
      because: [8757],
      bemptyv: [10672],
      bepsi: [1014],
      bernou: [8492],
      beta: [946],
      beth: [8502],
      between: [8812],
      bfr: [120095],
      bigcap: [8898],
      bigcirc: [9711],
      bigcup: [8899],
      bigodot: [10752],
      bigoplus: [10753],
      bigotimes: [10754],
      bigsqcup: [10758],
      bigstar: [9733],
      bigtriangledown: [9661],
      bigtriangleup: [9651],
      biguplus: [10756],
      bigvee: [8897],
      bigwedge: [8896],
      bkarow: [10509],
      blacklozenge: [10731],
      blacksquare: [9642],
      blacktriangle: [9652],
      blacktriangledown: [9662],
      blacktriangleleft: [9666],
      blacktriangleright: [9656],
      blank: [9251],
      blk12: [9618],
      blk14: [9617],
      blk34: [9619],
      block: [9608],
      bne: [61, 8421],
      bnequiv: [8801, 8421],
      bnot: [8976],
      bopf: [120147],
      bot: [8869],
      bottom: [8869],
      bowtie: [8904],
      boxDL: [9559],
      boxDR: [9556],
      boxDl: [9558],
      boxDr: [9555],
      boxH: [9552],
      boxHD: [9574],
      boxHU: [9577],
      boxHd: [9572],
      boxHu: [9575],
      boxUL: [9565],
      boxUR: [9562],
      boxUl: [9564],
      boxUr: [9561],
      boxV: [9553],
      boxVH: [9580],
      boxVL: [9571],
      boxVR: [9568],
      boxVh: [9579],
      boxVl: [9570],
      boxVr: [9567],
      boxbox: [10697],
      boxdL: [9557],
      boxdR: [9554],
      boxdl: [9488],
      boxdr: [9484],
      boxh: [9472],
      boxhD: [9573],
      boxhU: [9576],
      boxhd: [9516],
      boxhu: [9524],
      boxminus: [8863],
      boxplus: [8862],
      boxtimes: [8864],
      boxuL: [9563],
      boxuR: [9560],
      boxul: [9496],
      boxur: [9492],
      boxv: [9474],
      boxvH: [9578],
      boxvL: [9569],
      boxvR: [9566],
      boxvh: [9532],
      boxvl: [9508],
      boxvr: [9500],
      bprime: [8245],
      breve: [728],
      brvbar: [166],
      bscr: [119991],
      bsemi: [8271],
      bsim: [8765],
      bsime: [8909],
      bsol: [92],
      bsolb: [10693],
      bsolhsub: [10184],
      bull: [8226],
      bullet: [8226],
      bump: [8782],
      bumpE: [10926],
      bumpe: [8783],
      bumpeq: [8783],
      cacute: [263],
      cap: [8745],
      capand: [10820],
      capbrcup: [10825],
      capcap: [10827],
      capcup: [10823],
      capdot: [10816],
      caps: [8745, 65024],
      caret: [8257],
      caron: [711],
      ccaps: [10829],
      ccaron: [269],
      ccedil: [231],
      ccirc: [265],
      ccups: [10828],
      ccupssm: [10832],
      cdot: [267],
      cedil: [184],
      cemptyv: [10674],
      cent: [162],
      centerdot: [183],
      cfr: [120096],
      chcy: [1095],
      check: [10003],
      checkmark: [10003],
      chi: [967],
      cir: [9675],
      cirE: [10691],
      circ: [710],
      circeq: [8791],
      circlearrowleft: [8634],
      circlearrowright: [8635],
      circledR: [174],
      circledS: [9416],
      circledast: [8859],
      circledcirc: [8858],
      circleddash: [8861],
      cire: [8791],
      cirfnint: [10768],
      cirmid: [10991],
      cirscir: [10690],
      clubs: [9827],
      clubsuit: [9827],
      colon: [58],
      colone: [8788],
      coloneq: [8788],
      comma: [44],
      commat: [64],
      comp: [8705],
      compfn: [8728],
      complement: [8705],
      complexes: [8450],
      cong: [8773],
      congdot: [10861],
      conint: [8750],
      copf: [120148],
      coprod: [8720],
      copy: [169],
      copysr: [8471],
      crarr: [8629],
      cross: [10007],
      cscr: [119992],
      csub: [10959],
      csube: [10961],
      csup: [10960],
      csupe: [10962],
      ctdot: [8943],
      cudarrl: [10552],
      cudarrr: [10549],
      cuepr: [8926],
      cuesc: [8927],
      cularr: [8630],
      cularrp: [10557],
      cup: [8746],
      cupbrcap: [10824],
      cupcap: [10822],
      cupcup: [10826],
      cupdot: [8845],
      cupor: [10821],
      cups: [8746, 65024],
      curarr: [8631],
      curarrm: [10556],
      curlyeqprec: [8926],
      curlyeqsucc: [8927],
      curlyvee: [8910],
      curlywedge: [8911],
      curren: [164],
      curvearrowleft: [8630],
      curvearrowright: [8631],
      cuvee: [8910],
      cuwed: [8911],
      cwconint: [8754],
      cwint: [8753],
      cylcty: [9005],
      dArr: [8659],
      dHar: [10597],
      dagger: [8224],
      daleth: [8504],
      darr: [8595],
      dash: [8208],
      dashv: [8867],
      dbkarow: [10511],
      dblac: [733],
      dcaron: [271],
      dcy: [1076],
      dd: [8518],
      ddagger: [8225],
      ddarr: [8650],
      ddotseq: [10871],
      deg: [176],
      delta: [948],
      demptyv: [10673],
      dfisht: [10623],
      dfr: [120097],
      dharl: [8643],
      dharr: [8642],
      diam: [8900],
      diamond: [8900],
      diamondsuit: [9830],
      diams: [9830],
      die: [168],
      digamma: [989],
      disin: [8946],
      div: [247],
      divide: [247],
      divideontimes: [8903],
      divonx: [8903],
      djcy: [1106],
      dlcorn: [8990],
      dlcrop: [8973],
      dollar: [36],
      dopf: [120149],
      dot: [729],
      doteq: [8784],
      doteqdot: [8785],
      dotminus: [8760],
      dotplus: [8724],
      dotsquare: [8865],
      doublebarwedge: [8966],
      downarrow: [8595],
      downdownarrows: [8650],
      downharpoonleft: [8643],
      downharpoonright: [8642],
      drbkarow: [10512],
      drcorn: [8991],
      drcrop: [8972],
      dscr: [119993],
      dscy: [1109],
      dsol: [10742],
      dstrok: [273],
      dtdot: [8945],
      dtri: [9663],
      dtrif: [9662],
      duarr: [8693],
      duhar: [10607],
      dwangle: [10662],
      dzcy: [1119],
      dzigrarr: [10239],
      eDDot: [10871],
      eDot: [8785],
      eacute: [233],
      easter: [10862],
      ecaron: [283],
      ecir: [8790],
      ecirc: [234],
      ecolon: [8789],
      ecy: [1101],
      edot: [279],
      ee: [8519],
      efDot: [8786],
      efr: [120098],
      eg: [10906],
      egrave: [232],
      egs: [10902],
      egsdot: [10904],
      el: [10905],
      elinters: [9191],
      ell: [8467],
      els: [10901],
      elsdot: [10903],
      emacr: [275],
      empty: [8709],
      emptyset: [8709],
      emptyv: [8709],
      emsp: [8195],
      emsp13: [8196],
      emsp14: [8197],
      eng: [331],
      ensp: [8194],
      eogon: [281],
      eopf: [120150],
      epar: [8917],
      eparsl: [10723],
      eplus: [10865],
      epsi: [949],
      epsilon: [949],
      epsiv: [1013],
      eqcirc: [8790],
      eqcolon: [8789],
      eqsim: [8770],
      eqslantgtr: [10902],
      eqslantless: [10901],
      equals: [61],
      equest: [8799],
      equiv: [8801],
      equivDD: [10872],
      eqvparsl: [10725],
      erDot: [8787],
      erarr: [10609],
      escr: [8495],
      esdot: [8784],
      esim: [8770],
      eta: [951],
      eth: [240],
      euml: [235],
      euro: [8364],
      excl: [33],
      exist: [8707],
      expectation: [8496],
      exponentiale: [8519],
      fallingdotseq: [8786],
      fcy: [1092],
      female: [9792],
      ffilig: [64259],
      fflig: [64256],
      ffllig: [64260],
      ffr: [120099],
      filig: [64257],
      fjlig: [102, 106],
      flat: [9837],
      fllig: [64258],
      fltns: [9649],
      fnof: [402],
      fopf: [120151],
      forall: [8704],
      fork: [8916],
      forkv: [10969],
      fpartint: [10765],
      frac12: [189],
      frac13: [8531],
      frac14: [188],
      frac15: [8533],
      frac16: [8537],
      frac18: [8539],
      frac23: [8532],
      frac25: [8534],
      frac34: [190],
      frac35: [8535],
      frac38: [8540],
      frac45: [8536],
      frac56: [8538],
      frac58: [8541],
      frac78: [8542],
      frasl: [8260],
      frown: [8994],
      fscr: [119995],
      gE: [8807],
      gEl: [10892],
      gacute: [501],
      gamma: [947],
      gammad: [989],
      gap: [10886],
      gbreve: [287],
      gcirc: [285],
      gcy: [1075],
      gdot: [289],
      ge: [8805],
      gel: [8923],
      geq: [8805],
      geqq: [8807],
      geqslant: [10878],
      ges: [10878],
      gescc: [10921],
      gesdot: [10880],
      gesdoto: [10882],
      gesdotol: [10884],
      gesl: [8923, 65024],
      gesles: [10900],
      gfr: [120100],
      gg: [8811],
      ggg: [8921],
      gimel: [8503],
      gjcy: [1107],
      gl: [8823],
      glE: [10898],
      gla: [10917],
      glj: [10916],
      gnE: [8809],
      gnap: [10890],
      gnapprox: [10890],
      gne: [10888],
      gneq: [10888],
      gneqq: [8809],
      gnsim: [8935],
      gopf: [120152],
      grave: [96],
      gscr: [8458],
      gsim: [8819],
      gsime: [10894],
      gsiml: [10896],
      gt: [62],
      gtcc: [10919],
      gtcir: [10874],
      gtdot: [8919],
      gtlPar: [10645],
      gtquest: [10876],
      gtrapprox: [10886],
      gtrarr: [10616],
      gtrdot: [8919],
      gtreqless: [8923],
      gtreqqless: [10892],
      gtrless: [8823],
      gtrsim: [8819],
      gvertneqq: [8809, 65024],
      gvnE: [8809, 65024],
      hArr: [8660],
      hairsp: [8202],
      half: [189],
      hamilt: [8459],
      hardcy: [1098],
      harr: [8596],
      harrcir: [10568],
      harrw: [8621],
      hbar: [8463],
      hcirc: [293],
      hearts: [9829],
      heartsuit: [9829],
      hellip: [8230],
      hercon: [8889],
      hfr: [120101],
      hksearow: [10533],
      hkswarow: [10534],
      hoarr: [8703],
      homtht: [8763],
      hookleftarrow: [8617],
      hookrightarrow: [8618],
      hopf: [120153],
      horbar: [8213],
      hscr: [119997],
      hslash: [8463],
      hstrok: [295],
      hybull: [8259],
      hyphen: [8208],
      iacute: [237],
      ic: [8291],
      icirc: [238],
      icy: [1080],
      iecy: [1077],
      iexcl: [161],
      iff: [8660],
      ifr: [120102],
      igrave: [236],
      ii: [8520],
      iiiint: [10764],
      iiint: [8749],
      iinfin: [10716],
      iiota: [8489],
      ijlig: [307],
      imacr: [299],
      image: [8465],
      imagline: [8464],
      imagpart: [8465],
      imath: [305],
      imof: [8887],
      imped: [437],
      in: [8712],
      incare: [8453],
      infin: [8734],
      infintie: [10717],
      inodot: [305],
      int: [8747],
      intcal: [8890],
      integers: [8484],
      intercal: [8890],
      intlarhk: [10775],
      intprod: [10812],
      iocy: [1105],
      iogon: [303],
      iopf: [120154],
      iota: [953],
      iprod: [10812],
      iquest: [191],
      iscr: [119998],
      isin: [8712],
      isinE: [8953],
      isindot: [8949],
      isins: [8948],
      isinsv: [8947],
      isinv: [8712],
      it: [8290],
      itilde: [297],
      iukcy: [1110],
      iuml: [239],
      jcirc: [309],
      jcy: [1081],
      jfr: [120103],
      jmath: [567],
      jopf: [120155],
      jscr: [119999],
      jsercy: [1112],
      jukcy: [1108],
      kappa: [954],
      kappav: [1008],
      kcedil: [311],
      kcy: [1082],
      kfr: [120104],
      kgreen: [312],
      khcy: [1093],
      kjcy: [1116],
      kopf: [120156],
      kscr: [120000],
      lAarr: [8666],
      lArr: [8656],
      lAtail: [10523],
      lBarr: [10510],
      lE: [8806],
      lEg: [10891],
      lHar: [10594],
      lacute: [314],
      laemptyv: [10676],
      lagran: [8466],
      lambda: [955],
      lang: [10216],
      langd: [10641],
      langle: [10216],
      lap: [10885],
      laquo: [171],
      larr: [8592],
      larrb: [8676],
      larrbfs: [10527],
      larrfs: [10525],
      larrhk: [8617],
      larrlp: [8619],
      larrpl: [10553],
      larrsim: [10611],
      larrtl: [8610],
      lat: [10923],
      latail: [10521],
      late: [10925],
      lates: [10925, 65024],
      lbarr: [10508],
      lbbrk: [10098],
      lbrace: [123],
      lbrack: [91],
      lbrke: [10635],
      lbrksld: [10639],
      lbrkslu: [10637],
      lcaron: [318],
      lcedil: [316],
      lceil: [8968],
      lcub: [123],
      lcy: [1083],
      ldca: [10550],
      ldquo: [8220],
      ldquor: [8222],
      ldrdhar: [10599],
      ldrushar: [10571],
      ldsh: [8626],
      le: [8804],
      leftarrow: [8592],
      leftarrowtail: [8610],
      leftharpoondown: [8637],
      leftharpoonup: [8636],
      leftleftarrows: [8647],
      leftrightarrow: [8596],
      leftrightarrows: [8646],
      leftrightharpoons: [8651],
      leftrightsquigarrow: [8621],
      leftthreetimes: [8907],
      leg: [8922],
      leq: [8804],
      leqq: [8806],
      leqslant: [10877],
      les: [10877],
      lescc: [10920],
      lesdot: [10879],
      lesdoto: [10881],
      lesdotor: [10883],
      lesg: [8922, 65024],
      lesges: [10899],
      lessapprox: [10885],
      lessdot: [8918],
      lesseqgtr: [8922],
      lesseqqgtr: [10891],
      lessgtr: [8822],
      lesssim: [8818],
      lfisht: [10620],
      lfloor: [8970],
      lfr: [120105],
      lg: [8822],
      lgE: [10897],
      lhard: [8637],
      lharu: [8636],
      lharul: [10602],
      lhblk: [9604],
      ljcy: [1113],
      ll: [8810],
      llarr: [8647],
      llcorner: [8990],
      llhard: [10603],
      lltri: [9722],
      lmidot: [320],
      lmoust: [9136],
      lmoustache: [9136],
      lnE: [8808],
      lnap: [10889],
      lnapprox: [10889],
      lne: [10887],
      lneq: [10887],
      lneqq: [8808],
      lnsim: [8934],
      loang: [10220],
      loarr: [8701],
      lobrk: [10214],
      longleftarrow: [10229],
      longleftrightarrow: [10231],
      longmapsto: [10236],
      longrightarrow: [10230],
      looparrowleft: [8619],
      looparrowright: [8620],
      lopar: [10629],
      lopf: [120157],
      loplus: [10797],
      lotimes: [10804],
      lowast: [8727],
      lowbar: [95],
      loz: [9674],
      lozenge: [9674],
      lozf: [10731],
      lpar: [40],
      lparlt: [10643],
      lrarr: [8646],
      lrcorner: [8991],
      lrhar: [8651],
      lrhard: [10605],
      lrm: [8206],
      lrtri: [8895],
      lsaquo: [8249],
      lscr: [120001],
      lsh: [8624],
      lsim: [8818],
      lsime: [10893],
      lsimg: [10895],
      lsqb: [91],
      lsquo: [8216],
      lsquor: [8218],
      lstrok: [322],
      lt: [60],
      ltcc: [10918],
      ltcir: [10873],
      ltdot: [8918],
      lthree: [8907],
      ltimes: [8905],
      ltlarr: [10614],
      ltquest: [10875],
      ltrPar: [10646],
      ltri: [9667],
      ltrie: [8884],
      ltrif: [9666],
      lurdshar: [10570],
      luruhar: [10598],
      lvertneqq: [8808, 65024],
      lvnE: [8808, 65024],
      mDDot: [8762],
      macr: [175],
      male: [9794],
      malt: [10016],
      maltese: [10016],
      map: [8614],
      mapsto: [8614],
      mapstodown: [8615],
      mapstoleft: [8612],
      mapstoup: [8613],
      marker: [9646],
      mcomma: [10793],
      mcy: [1084],
      mdash: [8212],
      measuredangle: [8737],
      mfr: [120106],
      mho: [8487],
      micro: [181],
      mid: [8739],
      midast: [42],
      midcir: [10992],
      middot: [183],
      minus: [8722],
      minusb: [8863],
      minusd: [8760],
      minusdu: [10794],
      mlcp: [10971],
      mldr: [8230],
      mnplus: [8723],
      models: [8871],
      mopf: [120158],
      mp: [8723],
      mscr: [120002],
      mstpos: [8766],
      mu: [956],
      multimap: [8888],
      mumap: [8888],
      nGg: [8921, 824],
      nGt: [8811, 8402],
      nGtv: [8811, 824],
      nLeftarrow: [8653],
      nLeftrightarrow: [8654],
      nLl: [8920, 824],
      nLt: [8810, 8402],
      nLtv: [8810, 824],
      nRightarrow: [8655],
      nVDash: [8879],
      nVdash: [8878],
      nabla: [8711],
      nacute: [324],
      nang: [8736, 8402],
      nap: [8777],
      napE: [10864, 824],
      napid: [8779, 824],
      napos: [329],
      napprox: [8777],
      natur: [9838],
      natural: [9838],
      naturals: [8469],
      nbsp: [160],
      nbump: [8782, 824],
      nbumpe: [8783, 824],
      ncap: [10819],
      ncaron: [328],
      ncedil: [326],
      ncong: [8775],
      ncongdot: [10861, 824],
      ncup: [10818],
      ncy: [1085],
      ndash: [8211],
      ne: [8800],
      neArr: [8663],
      nearhk: [10532],
      nearr: [8599],
      nearrow: [8599],
      nedot: [8784, 824],
      nequiv: [8802],
      nesear: [10536],
      nesim: [8770, 824],
      nexist: [8708],
      nexists: [8708],
      nfr: [120107],
      ngE: [8807, 824],
      nge: [8817],
      ngeq: [8817],
      ngeqq: [8807, 824],
      ngeqslant: [10878, 824],
      nges: [10878, 824],
      ngsim: [8821],
      ngt: [8815],
      ngtr: [8815],
      nhArr: [8654],
      nharr: [8622],
      nhpar: [10994],
      ni: [8715],
      nis: [8956],
      nisd: [8954],
      niv: [8715],
      njcy: [1114],
      nlArr: [8653],
      nlE: [8806, 824],
      nlarr: [8602],
      nldr: [8229],
      nle: [8816],
      nleftarrow: [8602],
      nleftrightarrow: [8622],
      nleq: [8816],
      nleqq: [8806, 824],
      nleqslant: [10877, 824],
      nles: [10877, 824],
      nless: [8814],
      nlsim: [8820],
      nlt: [8814],
      nltri: [8938],
      nltrie: [8940],
      nmid: [8740],
      nopf: [120159],
      not: [172],
      notin: [8713],
      notinE: [8953, 824],
      notindot: [8949, 824],
      notinva: [8713],
      notinvb: [8951],
      notinvc: [8950],
      notni: [8716],
      notniva: [8716],
      notnivb: [8958],
      notnivc: [8957],
      npar: [8742],
      nparallel: [8742],
      nparsl: [11005, 8421],
      npart: [8706, 824],
      npolint: [10772],
      npr: [8832],
      nprcue: [8928],
      npre: [10927, 824],
      nprec: [8832],
      npreceq: [10927, 824],
      nrArr: [8655],
      nrarr: [8603],
      nrarrc: [10547, 824],
      nrarrw: [8605, 824],
      nrightarrow: [8603],
      nrtri: [8939],
      nrtrie: [8941],
      nsc: [8833],
      nsccue: [8929],
      nsce: [10928, 824],
      nscr: [120003],
      nshortmid: [8740],
      nshortparallel: [8742],
      nsim: [8769],
      nsime: [8772],
      nsimeq: [8772],
      nsmid: [8740],
      nspar: [8742],
      nsqsube: [8930],
      nsqsupe: [8931],
      nsub: [8836],
      nsubE: [10949, 824],
      nsube: [8840],
      nsubset: [8834, 8402],
      nsubseteq: [8840],
      nsubseteqq: [10949, 824],
      nsucc: [8833],
      nsucceq: [10928, 824],
      nsup: [8837],
      nsupE: [10950, 824],
      nsupe: [8841],
      nsupset: [8835, 8402],
      nsupseteq: [8841],
      nsupseteqq: [10950, 824],
      ntgl: [8825],
      ntilde: [241],
      ntlg: [8824],
      ntriangleleft: [8938],
      ntrianglelefteq: [8940],
      ntriangleright: [8939],
      ntrianglerighteq: [8941],
      nu: [957],
      num: [35],
      numero: [8470],
      numsp: [8199],
      nvDash: [8877],
      nvHarr: [10500],
      nvap: [8781, 8402],
      nvdash: [8876],
      nvge: [8805, 8402],
      nvgt: [62, 8402],
      nvinfin: [10718],
      nvlArr: [10498],
      nvle: [8804, 8402],
      nvlt: [60, 8402],
      nvltrie: [8884, 8402],
      nvrArr: [10499],
      nvrtrie: [8885, 8402],
      nvsim: [8764, 8402],
      nwArr: [8662],
      nwarhk: [10531],
      nwarr: [8598],
      nwarrow: [8598],
      nwnear: [10535],
      oS: [9416],
      oacute: [243],
      oast: [8859],
      ocir: [8858],
      ocirc: [244],
      ocy: [1086],
      odash: [8861],
      odblac: [337],
      odiv: [10808],
      odot: [8857],
      odsold: [10684],
      oelig: [339],
      ofcir: [10687],
      ofr: [120108],
      ogon: [731],
      ograve: [242],
      ogt: [10689],
      ohbar: [10677],
      ohm: [937],
      oint: [8750],
      olarr: [8634],
      olcir: [10686],
      olcross: [10683],
      oline: [8254],
      olt: [10688],
      omacr: [333],
      omega: [969],
      omicron: [959],
      omid: [10678],
      ominus: [8854],
      oopf: [120160],
      opar: [10679],
      operp: [10681],
      oplus: [8853],
      or: [8744],
      orarr: [8635],
      ord: [10845],
      order: [8500],
      orderof: [8500],
      ordf: [170],
      ordm: [186],
      origof: [8886],
      oror: [10838],
      orslope: [10839],
      orv: [10843],
      oscr: [8500],
      oslash: [248],
      osol: [8856],
      otilde: [245],
      otimes: [8855],
      otimesas: [10806],
      ouml: [246],
      ovbar: [9021],
      par: [8741],
      para: [182],
      parallel: [8741],
      parsim: [10995],
      parsl: [11005],
      part: [8706],
      pcy: [1087],
      percnt: [37],
      period: [46],
      permil: [8240],
      perp: [8869],
      pertenk: [8241],
      pfr: [120109],
      phi: [966],
      phiv: [981],
      phmmat: [8499],
      phone: [9742],
      pi: [960],
      pitchfork: [8916],
      piv: [982],
      planck: [8463],
      planckh: [8462],
      plankv: [8463],
      plus: [43],
      plusacir: [10787],
      plusb: [8862],
      pluscir: [10786],
      plusdo: [8724],
      plusdu: [10789],
      pluse: [10866],
      plusmn: [177],
      plussim: [10790],
      plustwo: [10791],
      pm: [177],
      pointint: [10773],
      popf: [120161],
      pound: [163],
      pr: [8826],
      prE: [10931],
      prap: [10935],
      prcue: [8828],
      pre: [10927],
      prec: [8826],
      precapprox: [10935],
      preccurlyeq: [8828],
      preceq: [10927],
      precnapprox: [10937],
      precneqq: [10933],
      precnsim: [8936],
      precsim: [8830],
      prime: [8242],
      primes: [8473],
      prnE: [10933],
      prnap: [10937],
      prnsim: [8936],
      prod: [8719],
      profalar: [9006],
      profline: [8978],
      profsurf: [8979],
      prop: [8733],
      propto: [8733],
      prsim: [8830],
      prurel: [8880],
      pscr: [120005],
      psi: [968],
      puncsp: [8200],
      qfr: [120110],
      qint: [10764],
      qopf: [120162],
      qprime: [8279],
      qscr: [120006],
      quaternions: [8461],
      quatint: [10774],
      quest: [63],
      questeq: [8799],
      quot: [34],
      rAarr: [8667],
      rArr: [8658],
      rAtail: [10524],
      rBarr: [10511],
      rHar: [10596],
      race: [8765, 817],
      racute: [341],
      radic: [8730],
      raemptyv: [10675],
      rang: [10217],
      rangd: [10642],
      range: [10661],
      rangle: [10217],
      raquo: [187],
      rarr: [8594],
      rarrap: [10613],
      rarrb: [8677],
      rarrbfs: [10528],
      rarrc: [10547],
      rarrfs: [10526],
      rarrhk: [8618],
      rarrlp: [8620],
      rarrpl: [10565],
      rarrsim: [10612],
      rarrtl: [8611],
      rarrw: [8605],
      ratail: [10522],
      ratio: [8758],
      rationals: [8474],
      rbarr: [10509],
      rbbrk: [10099],
      rbrace: [125],
      rbrack: [93],
      rbrke: [10636],
      rbrksld: [10638],
      rbrkslu: [10640],
      rcaron: [345],
      rcedil: [343],
      rceil: [8969],
      rcub: [125],
      rcy: [1088],
      rdca: [10551],
      rdldhar: [10601],
      rdquo: [8221],
      rdquor: [8221],
      rdsh: [8627],
      real: [8476],
      realine: [8475],
      realpart: [8476],
      reals: [8477],
      rect: [9645],
      reg: [174],
      rfisht: [10621],
      rfloor: [8971],
      rfr: [120111],
      rhard: [8641],
      rharu: [8640],
      rharul: [10604],
      rho: [961],
      rhov: [1009],
      rightarrow: [8594],
      rightarrowtail: [8611],
      rightharpoondown: [8641],
      rightharpoonup: [8640],
      rightleftarrows: [8644],
      rightleftharpoons: [8652],
      rightrightarrows: [8649],
      rightsquigarrow: [8605],
      rightthreetimes: [8908],
      ring: [730],
      risingdotseq: [8787],
      rlarr: [8644],
      rlhar: [8652],
      rlm: [8207],
      rmoust: [9137],
      rmoustache: [9137],
      rnmid: [10990],
      roang: [10221],
      roarr: [8702],
      robrk: [10215],
      ropar: [10630],
      ropf: [120163],
      roplus: [10798],
      rotimes: [10805],
      rpar: [41],
      rpargt: [10644],
      rppolint: [10770],
      rrarr: [8649],
      rsaquo: [8250],
      rscr: [120007],
      rsh: [8625],
      rsqb: [93],
      rsquo: [8217],
      rsquor: [8217],
      rthree: [8908],
      rtimes: [8906],
      rtri: [9657],
      rtrie: [8885],
      rtrif: [9656],
      rtriltri: [10702],
      ruluhar: [10600],
      rx: [8478],
      sacute: [347],
      sbquo: [8218],
      sc: [8827],
      scE: [10932],
      scap: [10936],
      scaron: [353],
      sccue: [8829],
      sce: [10928],
      scedil: [351],
      scirc: [349],
      scnE: [10934],
      scnap: [10938],
      scnsim: [8937],
      scpolint: [10771],
      scsim: [8831],
      scy: [1089],
      sdot: [8901],
      sdotb: [8865],
      sdote: [10854],
      seArr: [8664],
      searhk: [10533],
      searr: [8600],
      searrow: [8600],
      sect: [167],
      semi: [59],
      seswar: [10537],
      setminus: [8726],
      setmn: [8726],
      sext: [10038],
      sfr: [120112],
      sfrown: [8994],
      sharp: [9839],
      shchcy: [1097],
      shcy: [1096],
      shortmid: [8739],
      shortparallel: [8741],
      shy: [173],
      sigma: [963],
      sigmaf: [962],
      sigmav: [962],
      sim: [8764],
      simdot: [10858],
      sime: [8771],
      simeq: [8771],
      simg: [10910],
      simgE: [10912],
      siml: [10909],
      simlE: [10911],
      simne: [8774],
      simplus: [10788],
      simrarr: [10610],
      slarr: [8592],
      smallsetminus: [8726],
      smashp: [10803],
      smeparsl: [10724],
      smid: [8739],
      smile: [8995],
      smt: [10922],
      smte: [10924],
      smtes: [10924, 65024],
      softcy: [1100],
      sol: [47],
      solb: [10692],
      solbar: [9023],
      sopf: [120164],
      spades: [9824],
      spadesuit: [9824],
      spar: [8741],
      sqcap: [8851],
      sqcaps: [8851, 65024],
      sqcup: [8852],
      sqcups: [8852, 65024],
      sqsub: [8847],
      sqsube: [8849],
      sqsubset: [8847],
      sqsubseteq: [8849],
      sqsup: [8848],
      sqsupe: [8850],
      sqsupset: [8848],
      sqsupseteq: [8850],
      squ: [9633],
      square: [9633],
      squarf: [9642],
      squf: [9642],
      srarr: [8594],
      sscr: [120008],
      ssetmn: [8726],
      ssmile: [8995],
      sstarf: [8902],
      star: [9734],
      starf: [9733],
      straightepsilon: [1013],
      straightphi: [981],
      strns: [175],
      sub: [8834],
      subE: [10949],
      subdot: [10941],
      sube: [8838],
      subedot: [10947],
      submult: [10945],
      subnE: [10955],
      subne: [8842],
      subplus: [10943],
      subrarr: [10617],
      subset: [8834],
      subseteq: [8838],
      subseteqq: [10949],
      subsetneq: [8842],
      subsetneqq: [10955],
      subsim: [10951],
      subsub: [10965],
      subsup: [10963],
      succ: [8827],
      succapprox: [10936],
      succcurlyeq: [8829],
      succeq: [10928],
      succnapprox: [10938],
      succneqq: [10934],
      succnsim: [8937],
      succsim: [8831],
      sum: [8721],
      sung: [9834],
      sup: [8835],
      sup1: [185],
      sup2: [178],
      sup3: [179],
      supE: [10950],
      supdot: [10942],
      supdsub: [10968],
      supe: [8839],
      supedot: [10948],
      suphsol: [10185],
      suphsub: [10967],
      suplarr: [10619],
      supmult: [10946],
      supnE: [10956],
      supne: [8843],
      supplus: [10944],
      supset: [8835],
      supseteq: [8839],
      supseteqq: [10950],
      supsetneq: [8843],
      supsetneqq: [10956],
      supsim: [10952],
      supsub: [10964],
      supsup: [10966],
      swArr: [8665],
      swarhk: [10534],
      swarr: [8601],
      swarrow: [8601],
      swnwar: [10538],
      szlig: [223],
      target: [8982],
      tau: [964],
      tbrk: [9140],
      tcaron: [357],
      tcedil: [355],
      tcy: [1090],
      tdot: [8411],
      telrec: [8981],
      tfr: [120113],
      there4: [8756],
      therefore: [8756],
      theta: [952],
      thetasym: [977],
      thetav: [977],
      thickapprox: [8776],
      thicksim: [8764],
      thinsp: [8201],
      thkap: [8776],
      thksim: [8764],
      thorn: [254],
      tilde: [732],
      times: [215],
      timesb: [8864],
      timesbar: [10801],
      timesd: [10800],
      tint: [8749],
      toea: [10536],
      top: [8868],
      topbot: [9014],
      topcir: [10993],
      topf: [120165],
      topfork: [10970],
      tosa: [10537],
      tprime: [8244],
      trade: [8482],
      triangle: [9653],
      triangledown: [9663],
      triangleleft: [9667],
      trianglelefteq: [8884],
      triangleq: [8796],
      triangleright: [9657],
      trianglerighteq: [8885],
      tridot: [9708],
      trie: [8796],
      triminus: [10810],
      triplus: [10809],
      trisb: [10701],
      tritime: [10811],
      trpezium: [9186],
      tscr: [120009],
      tscy: [1094],
      tshcy: [1115],
      tstrok: [359],
      twixt: [8812],
      twoheadleftarrow: [8606],
      twoheadrightarrow: [8608],
      uArr: [8657],
      uHar: [10595],
      uacute: [250],
      uarr: [8593],
      ubrcy: [1118],
      ubreve: [365],
      ucirc: [251],
      ucy: [1091],
      udarr: [8645],
      udblac: [369],
      udhar: [10606],
      ufisht: [10622],
      ufr: [120114],
      ugrave: [249],
      uharl: [8639],
      uharr: [8638],
      uhblk: [9600],
      ulcorn: [8988],
      ulcorner: [8988],
      ulcrop: [8975],
      ultri: [9720],
      umacr: [363],
      uml: [168],
      uogon: [371],
      uopf: [120166],
      uparrow: [8593],
      updownarrow: [8597],
      upharpoonleft: [8639],
      upharpoonright: [8638],
      uplus: [8846],
      upsi: [965],
      upsih: [978],
      upsilon: [965],
      upuparrows: [8648],
      urcorn: [8989],
      urcorner: [8989],
      urcrop: [8974],
      uring: [367],
      urtri: [9721],
      uscr: [120010],
      utdot: [8944],
      utilde: [361],
      utri: [9653],
      utrif: [9652],
      uuarr: [8648],
      uuml: [252],
      uwangle: [10663],
      vArr: [8661],
      vBar: [10984],
      vBarv: [10985],
      vDash: [8872],
      vangrt: [10652],
      varepsilon: [1013],
      varkappa: [1008],
      varnothing: [8709],
      varphi: [981],
      varpi: [982],
      varpropto: [8733],
      varr: [8597],
      varrho: [1009],
      varsigma: [962],
      varsubsetneq: [8842, 65024],
      varsubsetneqq: [10955, 65024],
      varsupsetneq: [8843, 65024],
      varsupsetneqq: [10956, 65024],
      vartheta: [977],
      vartriangleleft: [8882],
      vartriangleright: [8883],
      vcy: [1074],
      vdash: [8866],
      vee: [8744],
      veebar: [8891],
      veeeq: [8794],
      vellip: [8942],
      verbar: [124],
      vert: [124],
      vfr: [120115],
      vltri: [8882],
      vnsub: [8834, 8402],
      vnsup: [8835, 8402],
      vopf: [120167],
      vprop: [8733],
      vrtri: [8883],
      vscr: [120011],
      vsubnE: [10955, 65024],
      vsubne: [8842, 65024],
      vsupnE: [10956, 65024],
      vsupne: [8843, 65024],
      vzigzag: [10650],
      wcirc: [373],
      wedbar: [10847],
      wedge: [8743],
      wedgeq: [8793],
      weierp: [8472],
      wfr: [120116],
      wopf: [120168],
      wp: [8472],
      wr: [8768],
      wreath: [8768],
      wscr: [120012],
      xcap: [8898],
      xcirc: [9711],
      xcup: [8899],
      xdtri: [9661],
      xfr: [120117],
      xhArr: [10234],
      xharr: [10231],
      xi: [958],
      xlArr: [10232],
      xlarr: [10229],
      xmap: [10236],
      xnis: [8955],
      xodot: [10752],
      xopf: [120169],
      xoplus: [10753],
      xotime: [10754],
      xrArr: [10233],
      xrarr: [10230],
      xscr: [120013],
      xsqcup: [10758],
      xuplus: [10756],
      xutri: [9651],
      xvee: [8897],
      xwedge: [8896],
      yacute: [253],
      yacy: [1103],
      ycirc: [375],
      ycy: [1099],
      yen: [165],
      yfr: [120118],
      yicy: [1111],
      yopf: [120170],
      yscr: [120014],
      yucy: [1102],
      yuml: [255],
      zacute: [378],
      zcaron: [382],
      zcy: [1079],
      zdot: [380],
      zeetrf: [8488],
      zeta: [950],
      zfr: [120119],
      zhcy: [1078],
      zigrarr: [8669],
      zopf: [120171],
      zscr: [120015],
      zwj: [8205],
      zwnj: [8204]
    };
    __exports__.namedCodepoints = namedCodepoints;
  });
define("simple-html-tokenizer/helpers",
  ["exports"],
  function(__exports__) {
    "use strict";
    function makeArray(object) {
      if (object instanceof Array) {
        return object;
      } else {
        return [object];
      }
    }

    __exports__.makeArray = makeArray;var objectCreate = Object.create || function objectCreate(obj) {
      function F() {}
      F.prototype = obj;
      return new F();
    };
    __exports__.objectCreate = objectCreate;
    function isSpace(char) {
      return (/[\t\n\f ]/).test(char);
    }

    __exports__.isSpace = isSpace;function isAlpha(char) {
      return (/[A-Za-z]/).test(char);
    }

    __exports__.isAlpha = isAlpha;function isUpper(char) {
      return (/[A-Z]/).test(char);
    }

    __exports__.isUpper = isUpper;function removeLocInfo(tokens) {
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        delete token.firstLine;
        delete token.firstColumn;
        delete token.lastLine;
        delete token.lastColumn;
      }
    }

    __exports__.removeLocInfo = removeLocInfo;function tokensEqual(actual, expected, checkLocInfo, message) {
      if (!checkLocInfo) {
        removeLocInfo(actual);
      }
      deepEqual(actual, makeArray(expected), message);
    }

    __exports__.tokensEqual = tokensEqual;function locInfo(token, firstLine, firstColumn, lastLine, lastColumn) {
      token.firstLine = firstLine;
      token.firstColumn = firstColumn;
      token.lastLine = lastLine;
      token.lastColumn = lastColumn;
      return token;
    }

    __exports__.locInfo = locInfo;
  });