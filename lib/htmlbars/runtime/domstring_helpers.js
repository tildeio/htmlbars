import { merge, NodeTypes } from "htmlbars/utils";

function DomStringNode(ownerDocument){
  this.childNodes = [];
  this.ownerDocument = ownerDocument;
  this.lastChild = null;
  this.previousSibling = null;
  this.nextSibling = null;
}

var base = {
  _setupChild: function(child, idx) {
    child.parent = this;
    if (idx > 0) {
      child.previousSibling = this.childNodes[idx - 1];

      child.previousSibling.nextSibling = child;
    } else {
      child.previousSibling = null;
    }

    if (idx < (this.childNodes.length-1)) {
      child.nextSibling = this.childNodes[idx + 1];
      child.nextSibling.previousSibling = child;
    } else {
      child.nextSibling = null;
    }
  },

  appendChild: function(child) {
    this.insertBefore(child, null);
  },

  removeChild: function(child) {
    var idx = this.childNodes.indexOf(child);

    if (idx >= 0) {
      this.childNodes.splice(idx, 1);

      if (idx < this.childNodes.length) {
        this._setupChild(this.childNodes[idx], idx);
      }

      return child;
    } else {
      return null;
    }
  },

  _insertSingleBefore: function(child, anchor) {
    this.removeChild(child);

    var idx = this.childNodes.indexOf(anchor);

    if (idx >= 0) {
      this.childNodes.splice(idx, 0, child);
    } else {
      this.childNodes.push(child);
      idx = this.childNodes.length - 1;
    }

    this._setupChild(child, idx);
  },

  insertBefore: function(child, anchor) {
    var self = this;

    if (child instanceof DomStringDocumentFragment) {
      var grandChildNodes = child.childNodes;
      var length = grandChildNodes.length;

      for (var i = 0; i < length; i++) {
        self._insertSingleBefore(grandChildNodes[i], anchor);
      }
    } else {
      this._insertSingleBefore(child, anchor);
    }

    this.lastChild = this.childNodes[this.childNodes.length - 1];
  }
};

Object.defineProperty(base, 'textContent', {
  get: function() {
    if (this.nodeType === NodeTypes.TEXT_NODE || this.nodeType === NodeTypes.COMMENT_NODE) {
      return this._textContent;
    } else {
      var res = '';

      var childNodes = this.childNodes;
      var length = childNodes.length;
      for (var i = 0; i < length; i++) {
        var child = childNodes[i];
        if (child.nodeType !== NodeTypes.COMMENT_NODE) {
          res += child.textContent;
        }
      }

      return res;
    }
  },

  set: function(val) {
    if (this.nodeType === NodeTypes.TEXT_NODE || this.nodeType === NodeTypes.COMMENT_NODE) {
      this._textContent = val;
    } else {
      var child = new DomStringTextNode(val, this.ownerDocument);
      this.childNodes.length = 0;
      this.appendChild(child);
    }
  }
});

DomStringNode.prototype = base;

function DomStringDocumentFragment(ownerDocument) {
  DomStringNode.call(this, ownerDocument);
  this.nodeName = '#document-fragment';
}
DomStringDocumentFragment.prototype = Object.create(DomStringNode.prototype);
DomStringDocumentFragment.prototype.constructor = DomStringDocumentFragment;

DomStringDocumentFragment.prototype.cloneNode = function(deep) {
  var res = new DomStringDocumentFragment(this.ownerDocument);

  if (deep === true) {
    var childNodes = this.childNodes;
    var length = childNodes.length;
    for (var i = 0; i < length; i++) {
      res.appendChild(childNodes[i].cloneNode(deep));
    }
  }

  return res;
};

DomStringDocumentFragment.prototype.toString = function() {
  var res = "";

  var childNodes = this.childNodes;
  var length = childNodes.length;
  for (var i = 0; i < length; i++) {
    res += childNodes[i].toString();
  }

  return res;
};

function DomStringElement(ownerDocument, tagName) {
  DomStringNode.call(this, ownerDocument);
  this.nodeName = tagName;
  this.attributes = {};
}
DomStringElement.prototype = Object.create(DomStringNode.prototype);
DomStringElement.prototype.constructor = DomStringElement;

DomStringElement.prototype.createComment = function(comment) {
  this.appendChild(new DomStringCommentNode(comment, this.ownerDocument));
};

DomStringElement.prototype.cloneNode = function(deep) {
  var res = new DomStringElement(this.ownerDocument, this.nodeName);

  if (deep === true) {
    var childNodes = this.childNodes;
    var length = childNodes.length;
    for (var i = 0; i < length; i++) {
      res.appendChild(childNodes[i].cloneNode(deep));
    }
  }

  var attributes = this.attributes;
  for (var attr in attributes) {
    res.setAttribute(attr, attributes[attr]);
  }

  return res;
};

DomStringElement.prototype.setAttribute = function(name, value) {
  this.attributes[name] = value;
};

DomStringElement.prototype.toString = function() {
  var res = "<" + this.nodeName;

  // TODO: support <input disabled> syntax
  // TODO: support <br/> syntax
  // TODO: check unicode entities
  var attributes = this.attributes;
  for(var attr in attributes) {
    res += ' ' + attr + '=' + '"' + attributes[attr] + '"';
  }

  res += '>';

  var childNodes = this.childNodes;
  var length = childNodes.length;
  for (var i = 0; i < length; i++) {
    res += childNodes[i].toString();
  }

  res += '</' + this.nodeName + '>';

  return res;
};

function DomStringTextNode(text, ownerDocument) {
  DomStringNode.call(this, ownerDocument);
  this._textContent = text;
  this.nodeType = NodeTypes.TEXT_NODE;
  this.nodeName = '#text';
}
DomStringTextNode.prototype = Object.create(DomStringNode.prototype);
DomStringTextNode.prototype.constructor = DomStringTextNode;

DomStringTextNode.prototype.cloneNode = function() {
  return new DomStringTextNode(this._textContent, this.ownerDocument);
};

DomStringTextNode.prototype.toString = function() {
  return this._textContent;
};

function DomStringCommentNode(text, ownerDocument) {
  DomStringNode.call(this, ownerDocument);
  this._textContent = text;
  this.nodeType = NodeTypes.COMMENT_NODE;
  this.nodeName = '#comment';
}
DomStringCommentNode.prototype = Object.create(DomStringNode.prototype);
DomStringCommentNode.prototype.constructor = DomStringCommentNode;

DomStringCommentNode.prototype.cloneNode = function() {
  return new DomStringCommentNode(this._textContent, this.ownerDocument);
};

DomStringCommentNode.prototype.toString = function() {
  return '<!--' + this._textContent + '-->';
};


export function domStringHelpers(extensions) {
  var doc;

  var base = {
    appendText: function(element, text) {
      element.appendChild(new DomStringTextNode(text, doc));
    },

    createElement: function(tagName) {
      return new DomStringElement(doc, tagName);
    },

    createTextNode: function(text) {
      return new DomStringTextNode(text, doc);
    },

    createDocumentFragment: function() {
      return new DomStringDocumentFragment(doc);
    },
  };

  doc = extensions ? merge(extensions, base) : base;

  return doc;
}

export function runtimeHelpers(dom) {
  var markerId = 0;

  function getMarkerPair(){
    var res = [dom.createElement('script'), dom.createElement('script')];

    //This naming scheme allows for easy finding end node, having the start one (get id of start, append '-end', document.getElementById).
    //Might be helpful in runtime. Or not.
    res[0].setAttribute('id', 'htmlbars-' + markerId);
    res[1].setAttribute('id', 'htmlbars-' + markerId + '-end');

    markerId++;

    return res;
  }

  var helpers = {
    //TODO: ELEMENT, SUBEXPR, maybe LOOKUP_HELPER, ATTRIBUTE
    //TODO: all helpers

    CONTENT: function(placeholder, helperName, context, params, options, helpers) {
      var markers = getMarkerPair();

      placeholder.appendChild(markers[0]);

      placeholder.appendText(context[helperName]);

      placeholder.appendChild(markers[1]);
    }
  };

  return helpers;
}
