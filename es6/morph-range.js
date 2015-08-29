import { clear, insertBefore } from './morph-range/utils';

// constructor just initializes the fields
// use one of the static initializers to create a valid morph.
function Morph(domHelper, contextualElement) {
  this.domHelper = domHelper;
  // context if content if current content is detached
  this.contextualElement = contextualElement;
  // inclusive range of morph
  // these should be nodeType 1, 3, or 8
  this.firstNode = null;
  this.lastNode  = null;

  // flag to force text to setContent to be treated as html
  this.parseTextAsHTML = false;

  // morph list graph
  this.parentMorphList = null;
  this.previousMorph   = null;
  this.nextMorph       = null;
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

  if (firstNode &&
      lastNode === firstNode &&
      firstNode.nodeType === 3) {
    firstNode.nodeValue = text;
    return firstNode;
  }

  return this.setNode(
    text ? this.domHelper.createTextNode(text) : this.domHelper.createComment('')
  );
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
      insertBefore(parentNode, firstNode, lastNode, previousFirstNode);
      clear(parentNode, previousFirstNode, this.lastNode);
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

  clear(parentNode, firstNode, lastNode);
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

Morph.prototype.setHTML = function(text) {
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
  insertBefore(parentNode, this.firstNode, this.lastNode, refNode);
};

Morph.prototype.appendToNode = function Morph$appendToNode(parentNode) {
  insertBefore(parentNode, this.firstNode, this.lastNode, null);
};

export default Morph;
