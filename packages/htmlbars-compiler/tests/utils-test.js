import { generateId } from '../htmlbars-compiler/utils';

QUnit.module('generating a template ID');

QUnit.test('generates a different ID every time', function() {
  let seen = Object.create(null);

  for (let i=0; i<1000; i++) {
    seen[generateId()] = true;
  }

  equal(Object.keys(seen).length, 1000, '1000 different ids were generated');
});
