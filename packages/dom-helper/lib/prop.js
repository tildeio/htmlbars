export function isAttrRemovalValue(value) {
  return value === null || value === undefined;
}

function UNDEFINED() {}
// TODO should this be an o_create kind of thing?
export var propertyCaches = {};


var FORM_REQUIRES_SET_ATTRIBUTE_BY_TAG = {
  SELECT:   true,
  OPTION:   true,
  INPUT:    true,
  TEXTAREA: true,
  BUTTON:   true,
  LABEL:    true,
  FIELDSET: true,
  LEGEND:   true,
  OBJECT:   true
};

export function normalizeProperty(element, attrName) {
  var tagName = element.tagName;
  var key;
  var cache = propertyCaches[tagName];

  if (cache === undefined) {
    // TODO should this be an o_create kind of thing?
    cache = {};

    for (key in element) {
      if (key === 'form' && FORM_REQUIRES_SET_ATTRIBUTE_BY_TAG[tagName]) {
        cache[key] = UNDEFINED;
      } else {
        cache[key.toLowerCase()] = key;
      }
    }
    propertyCaches[tagName] = cache;
  }

  var value = cache[attrName];
  return value === UNDEFINED ? undefined : value;
}
