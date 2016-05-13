import { sanitizeAttributeValue } from "./morph-attr/sanitize-attribute-value";
import { isAttrRemovalValue, normalizeProperty } from "./dom-helper/prop";
import { svgNamespace } from "./dom-helper/build-html-dom";
import { getAttrNamespace } from "./htmlbars-util";

function getProperty() {
  return this.domHelper.getPropertyStrict(this.element, this.attrName);
}

function updateProperty(value) {
  if (this._renderedInitially === true || !isAttrRemovalValue(value)) {
    let element = this.element;
    let attrName = this.attrName;

    if (attrName === 'value' && element.tagName === 'INPUT' && element.value === value) {
      // Do nothing. Attempts to avoid accidently changing the input cursor location.
      // See https://github.com/tildeio/htmlbars/pull/447 for more details.
    } else {
      // do not render if initial value is undefined or null
      this.domHelper.setPropertyStrict(element, attrName, value);
    }
  }

  this._renderedInitially = true;
}

function getAttribute() {
  return this.domHelper.getAttribute(this.element, this.attrName);
}

// normalize to be more inline with updateProperty behavior
function normalizeAttributeValue(value) {
  if (value === false || value === undefined || value === null) {
    return null;
  }
  if (value === true) {
    return '';
  }
  // onclick function etc in SSR
  if (typeof value === 'function') {
    return null;
  }
  return String(value);
}

function updateAttribute(_value) {
  var value = normalizeAttributeValue(_value);
  if (isAttrRemovalValue(value)) {
    this.domHelper.removeAttribute(this.element, this.attrName);
  } else {
    this.domHelper.setAttribute(this.element, this.attrName, value);
  }
}

function getAttributeNS() {
  return this.domHelper.getAttributeNS(this.element, this.namespace, this.attrName);
}

function updateAttributeNS(_value) {
  var value = normalizeAttributeValue(_value);
  if (isAttrRemovalValue(value)) {
    this.domHelper.removeAttribute(this.element, this.attrName);
  } else {
    this.domHelper.setAttributeNS(this.element, this.namespace, this.attrName, value);
  }
}

var UNSET = { unset: true };

var guid = 1;

AttrMorph.create = function(element, attrName, domHelper, namespace) {
  let ns = getAttrNamespace(attrName, namespace);

  if (ns) {
    return new AttributeNSAttrMorph(element, attrName, domHelper, ns);
  } else {
    return createNonNamespacedAttrMorph(element, attrName, domHelper);
  }
};

function createNonNamespacedAttrMorph(element, attrName, domHelper) {
  let { normalized, type } = normalizeProperty(element, attrName);

  if (element.namespaceURI === svgNamespace || attrName === 'style' || type === 'attr') {
    return new AttributeAttrMorph(element, normalized, domHelper);
  } else {
    return new PropertyAttrMorph(element, normalized, domHelper);
  }
}

function AttrMorph(element, attrName, domHelper) {
  this.element = element;
  this.domHelper = domHelper;
  this.attrName = attrName;
  this._state = undefined;
  this.isDirty = false;
  this.isSubtreeDirty = false;
  this.escaped = true;
  this.lastValue = UNSET;
  this.lastResult = null;
  this.lastYielded = null;
  this.childNodes = null;
  this.linkedParams = null;
  this.linkedResult = null;
  this.guid = "attr" + guid++;
  this.seen = false;
  this.ownerNode = null;
  this.rendered = false;
  this._renderedInitially = false;
  this.namespace = undefined;
  this.didInit();
}

AttrMorph.prototype.getState = function() {
  if (!this._state) {
    this._state = {};
  }

  return this._state;
};

AttrMorph.prototype.setState = function(newState) {
  /*jshint -W093 */

  return this._state = newState;
};

AttrMorph.prototype.didInit = function() {};
AttrMorph.prototype.willSetContent = function() {};

AttrMorph.prototype.setContent = function (value) {
  this.willSetContent(value);

  if (this.lastValue === value) { return; }
  this.lastValue = value;

  if (this.escaped) {
    var sanitized = sanitizeAttributeValue(this.domHelper, this.element, this.attrName, value);
    this._update(sanitized, this.namespace);
  } else {
    this._update(value, this.namespace);
  }
};

AttrMorph.prototype.getContent = function () {
  var value = this.lastValue = this._get();
  return value;
};

// renderAndCleanup calls `clear` on all items in the morph map
// just before calling `destroy` on the morph.
//
// As a future refactor this could be changed to set the property
// back to its original/default value.
AttrMorph.prototype.clear = function() { };

AttrMorph.prototype.destroy = function() {
  this.element = null;
  this.domHelper = null;
};

AttrMorph.prototype._$superAttrMorph = AttrMorph;

function PropertyAttrMorph(element, attrName, domHelper) {
  this._$superAttrMorph(element, attrName, domHelper);
}

PropertyAttrMorph.prototype = Object.create(AttrMorph.prototype);
PropertyAttrMorph.prototype._update = updateProperty;
PropertyAttrMorph.prototype._get = getProperty;

function AttributeNSAttrMorph(element, attrName, domHelper, namespace) {
  this._$superAttrMorph(element, attrName, domHelper);
  this.namespace = namespace;
}

AttributeNSAttrMorph.prototype = Object.create(AttrMorph.prototype);
AttributeNSAttrMorph.prototype._update = updateAttributeNS;
AttributeNSAttrMorph.prototype._get = getAttributeNS;

function AttributeAttrMorph(element, attrName, domHelper) {
  this._$superAttrMorph(element, attrName, domHelper);
}

AttributeAttrMorph.prototype = Object.create(AttrMorph.prototype);
AttributeAttrMorph.prototype._update = updateAttribute;
AttributeAttrMorph.prototype._get = getAttribute;

export default AttrMorph;

export { sanitizeAttributeValue };
