import { normalizeProperty, propertyCaches } from 'dom-helper/prop';

function createMockElement(tagName, props = {}) {
  props.tagName = {
    configurable: true,
    enumerable: true,
    get() {
      return tagName.toUpperCase();
    }
  };

  function MockElement() {}
  Object.defineProperties(MockElement.prototype, props);
  return new MockElement();
}

QUnit.module('dom-helper prop', {
  teardown() {
    for (let key in propertyCaches) {
      delete propertyCaches[key];
    }
  }
});

test('returns normalized property name for the typical cases', function() {
  expect(3);
  
  var element1 = createMockElement('element1');
  element1.form = null;
  var element2 = createMockElement('element2', {
    form: {
      enumerable: true,
      get() {
        return null;
      },
      set() {
        return null;
      }
    }
  });
  var element3 = createMockElement('element3', {
    form: {
      enumerable: true,
      writable: true,
      value: null
    }
  });

  [element1, element2, element3].forEach(function (el) {
    equal(normalizeProperty(el, 'form'), 'form');
  });
});

test('returns `undefined` for special element properties that are non-compliant in certain browsers', function() {
  expect(12);

  const blacklist = {
    INPUT: ['type', 'list', 'form'],
    BUTTON: ['type', 'form'],
    SELECT: ['form'],
    OPTION: ['form'],
    TEXTAREA: ['form'],
    LABEL: ['form'],
    FIELDSET: ['form'],
    LEGEND: ['form'],
    OBJECT: ['form']
  };

  for (let tagName in blacklist) {
    let badProps = blacklist[tagName];
    
    for (let i = 0, l = badProps.length; i < l; i++) {
      let key = badProps[i];
      let proto = {};
      proto[key] = {
        enumerable: true,
        set() {
          throw new Error('I am a bad browser! ');
        }
      };
      let element = createMockElement(tagName, proto);

      let actual = normalizeProperty(element, key);
      equal(actual, undefined);
    }
  }
});

test('returns `undefined` for Custom Element properties that are effectively read-only (writable=false or no setter)', function() {
  expect(2);
  
  var element1 = createMockElement('x-foo', {
    suchwow: {
      enumerable: true,
      get() {
        return null;
      }
    }
  });
  var element2 = createMockElement('x-bar', {
    suchwow: {
      enumerable: true,
      writable: false,
      value: null
    }
  });

  equal(normalizeProperty(element1, 'suchwow'), undefined);
  equal(normalizeProperty(element2, 'suchwow'), undefined);
});
