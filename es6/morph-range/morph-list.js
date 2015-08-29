import { clear, insertBefore } from './utils';

function MorphList() {
  // morph graph
  this.firstChildMorph = null;
  this.lastChildMorph  = null;

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

prototype.destroy = function MorphList$destroy() {
};

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

    insertBefore(
      parentNode,
      morph.firstNode,
      morph.lastNode,
      referenceNode
    );

    // was not in list mode replace current content
    if (!this.firstChildMorph) {
      clear(this.mountedMorph.firstNode.parentNode,
            this.mountedMorph.firstNode,
            this.mountedMorph.lastNode);
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

export default MorphList;
