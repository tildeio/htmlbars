import { merge } from "htmlbars/utils";

function DomStringNode(ownerDocument){
  this.childNodes = [];
  this.ownerDocument = ownerDocument;
  this.lastChild = null;
  this.previousSibling = null;
  this.nextSibling = null;
}

DomStringNode.prototype._setupChild = function(child, idx) {
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
};

Object.defineProperty(DomStringNode.prototype, 'textContent', {
  get: function() {
    if ((this.nodeType == 3) || (this.nodeType == 8)) {
      return this._textContent;
    } else {
      var res = '';

      this.childNodes.forEach(function(child) {
        if (child.nodeType != 8) { //skip comments
          res += child.textContent;
        }
      } );

      return res;
    }
  },

  set: function(val) {
    if ((this.nodeType == 3) || (this.nodeType == 8)) {
      this._textContent = val;
    } else {
      var child = new DomStringTextNode(val, this.ownerDocument);
      this.childNodes.splice(0, this.childNodes.length);
      this.appendChild(child);
    }
  }
});

DomStringNode.prototype.appendChild = function(child) {
  this.insertBefore(child, null);
};

DomStringNode.prototype.removeChild = function(child) {
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
};

DomStringNode.prototype._insertSingleBefore = function(child, anchor) {
  this.removeChild(child);

  var idx = this.childNodes.indexOf(anchor);

  if (idx >= 0) {
    this.childNodes.splice(idx, 0, child);
  } else {
    this.childNodes.push(child);
    idx = this.childNodes.length - 1;
  }

  this._setupChild(child, idx);
};

DomStringNode.prototype.insertBefore = function(child, anchor) {
  var self = this;

  if (child instanceof DomStringDocumentFragment) {
    child.childNodes.forEach(function(grandChild){
      self._insertSingleBefore(grandChild, anchor);
    });
  } else {
    this._insertSingleBefore(child, anchor);
  }

  this.lastChild = this.childNodes[this.childNodes.length - 1];
};

function DomStringDocumentFragment(ownerDocument) {
  DomStringNode.call(this, ownerDocument);
  this.nodeName = '#document-fragment';
}
DomStringDocumentFragment.prototype = Object.create(DomStringNode.prototype);
DomStringDocumentFragment.prototype.constructor = DomStringDocumentFragment;

DomStringDocumentFragment.prototype.cloneNode = function(deep) {
  var res = new DomStringDocumentFragment(this.ownerDocument);

  if (deep === true) {
    this.childNodes.forEach(function(child){
      res.appendChild(child.cloneNode(deep));
    });
  }

  return res;
};

DomStringDocumentFragment.prototype.toString = function() {
  var res = "";

  this.childNodes.forEach(function(child) {
    res += child.toString();
  });

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
    this.childNodes.forEach(function(child){
      res.appendChild(child.cloneNode(deep));
    });
  }

  for (var attr in this.attributes) {
    res.setAttribute(attr, this.attributes[attr]);
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
  for(var attr in this.attributes) {
    res += ' ' + attr + '=' + '"' + this.attributes[attr] + '"';
  }

  res += '>';

  this.childNodes.forEach(function(child) {
    res += child.toString();
  });

  res += '</' + this.nodeName + '>';

  return res;
};

function DomStringTextNode(text, ownerDocument) {
  DomStringNode.call(this, ownerDocument);
  this._textContent = text;
  this.nodeType = 3;
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
  this.nodeType = 8;
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
      element.appendChild( new DomStringTextNode(text, doc) );
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

      if (helperName === 'if') {
        options.helpers = helpers;
        if (context[params[0]]) {
          placeholder.appendChild(
            options.render(context, options)
          );
        } else {
          placeholder.appendChild(
            options.inverse(context, options)
          );
        }
      } else {
        placeholder.appendText(context[helperName]);
      }

      placeholder.appendChild(markers[1]);
    }
  };

  return helpers;
}
