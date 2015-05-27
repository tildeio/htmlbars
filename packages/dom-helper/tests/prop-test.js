import { normalizeProperty } from 'dom-helper/prop';

QUnit.module('dom-helper prop');

function tag(tagName) {
  return document.createElement(tagName);
}

var scenario = [
  ['div',     'id',                 'id'],
  ['select',  'form',               undefined],
  ['div',     'form',               undefined],
  ['select',  'labels',             'labels'],
  ['select',  'options',            'options'],
  ['select',  'selectIndex',        undefined],
  ['select',  'selectedOptions',    undefined],
  ['select',  'type',               'type'],
  ['select',  'validationMessage',  undefined],
  ['select',  'validity',           'validity'],
  ['select',  'willValidate',       undefined]
];

if (typeof document === 'object') {
  test('it throws when instantiated without document', function(){
    scenario.forEach(function(test, index) {
      var tagName      = test[0];
      var propertyName = test[1];
      var expected     = test[2];
      var element      = tag(tagName);
      var actual = normalizeProperty(element, propertyName);

      equal(actual, expected, '[scenario:' + index + '] expected: ' + tagName + '[' + propertyName+ '] to normalize to: ' + expected + ' but got: ' + actual);
    });
  });
}
