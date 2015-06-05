export function isAttrRemovalValue(value) {
  return value === null || value === undefined;
}

function UNDEFINED() {}

// TODO should this be an o_create kind of thing?
export var propertyCaches = {};

export function normalizeProperty(element, attrName) {
  var tagName = element.tagName;
  var cache = propertyCaches[tagName];
  if (!cache) {
    // TODO should this be an o_create kind of thing?
    cache = {};
    for (let key in element) {
      let lowerKey = key.toLowerCase();
      if (isSettable(element, key)) {
        cache[lowerKey] = key;
      } else {
        cache[lowerKey] = UNDEFINED;
      }
    }
    propertyCaches[tagName] = cache;
  }

  // presumes that the attrName has been lowercased.
  var value = cache[attrName];
  return value === UNDEFINED ? undefined : value;
}

const NATIVE_TAGS_WITH_HYPHENS = 'ANNOTATION-XML COLOR-PROFILE FONT-FACE FONT-FACE-SRC FONT-FACE-URI FONT-FACE-FORMAT FONT-FACE-NAME MISSING-GLYPH'.split(' ');

/**
  elements with a property that does not conform to the spec in certain
  browsers. In these cases, we'll end up using setAttribute instead
 */
const BLACKLIST = {
  /*
    input.type
      Some versions of IE (like IE9) actually throw an exception
      if you set input.type = 'something-unknown'
      https://github.com/emberjs/ember.js/issues/10860
      https://github.com/emberjs/ember.js/pull/10690

    input.list
      Some versions of IE (like IE8) throw an exception when setting
      `input.list = 'somestring'`:
      https://github.com/emberjs/ember.js/issues/10908
      https://github.com/emberjs/ember.js/issues/11364

    input.form
      Like the rest of the form-aware elements, this property does not have
      an actual setter so is effectively read-only.
      https://github.com/emberjs/ember.js/issues/11221
   */
  INPUT: ['type', 'list', 'form'],
  /*
    button.type
      phantomjs < 2.0 lets you set it as a prop but won't reflect it
      back to the attribute. button.getAttribute('type') === null
      https://github.com/emberjs/ember.js/issues/11112
   */
  BUTTON: ['type', 'form'],
  SELECT: ['form'],
  OPTION: ['form'],
  TEXTAREA: ['form'],
  LABEL: ['form'],
  FIELDSET: ['form'],
  LEGEND: ['form'],
  OBJECT: ['form']
};

/**
  Checking whether an elements property isn't as simple as it might seem.
  Primarily we need to deal with browser spec differences or non-compliance, as
  well as Custom Elements. Be very mindful changing this section as there are
  many many edge cases.
 */
function isSettable(element, attrName) {
  const { tagName } = element;
  const blackListedProps = BLACKLIST[tagName];

  if (blackListedProps && blackListedProps.indexOf(attrName) !== -1) {
    return false;
  }

  // Custom Elements require a hyphen, but don't count the list of native
  // elements which also contain one.
  if (tagName.indexOf('-') !== -1 && NATIVE_TAGS_WITH_HYPHENS.indexOf(tagName) === -1) {
    // This is the ideal way to check if a property is settable, but can only
    // be trusted on Custom Elements because of browser differences.
    // Properties can be effectively read-only two ways.
    // If actually marked as writable = false, an exception is thrown if you attempt
    // to assign. If it's simply missing a setter, it silently just doesn't
    // assign anything. Both cases we will defer to setAttribute instead
    var desc = getPropertyDescriptor(element, attrName);
    if (!desc) { return true; }
    if (desc.writable === false || !desc.hasOwnProperty('value') && typeof desc.set !== 'function') {
      return false;
    }
  }

  return true;
}

// Polyfill :(
const getPrototypeOf = (function() {
  let fn = Object.getPrototypeOf;

  if (!fn) {
    /* jshint ignore:start */
    if (typeof 'test'.__proto__ === 'object') {
      fn = function getPrototypeOf(obj) {
        return obj.__proto__; 
      };
    } else {
      // IE8
      fn = function getPrototypeOf(obj) {
        return obj.constructor.prototype;
      };
    }
    /* jshint ignore:end */
  }

  return fn;
})();

const { getOwnPropertyDescriptor } = Object;

// Walks up the chain to find the desc by name
function getPropertyDescriptor(obj, key) {
  let proto = obj, desc;
  while (proto && !(desc = getOwnPropertyDescriptor(proto, key))) {
    proto = getPrototypeOf(proto);
  }

  return desc;
}
