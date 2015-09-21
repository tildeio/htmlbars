import FragmentOpcodeCompiler from "../htmlbars-compiler/fragment-opcode-compiler";

QUnit.module('FragmentOpcodeCompiler');

test('openElement calls opcode with correct arguments when element has `is` attribute', assert => {
  assert.expect(2);
  let opcodeCompiler = new FragmentOpcodeCompiler();

  const tagName = 'button';
  const typeExtension = 'my-button';
  const attributeName = 'is';

  const element = {
    tag: tagName,
    attributes: [
      {
        name: attributeName,
        value: {
          chars: typeExtension
        }
      }
    ]
  };

  // monkey patch
  opcodeCompiler.opcode = (opname, args) => {
    assert.equal(opname, 'createElement');
    assert.deepEqual(args, [ tagName, typeExtension ]);
  };

  opcodeCompiler.openElement(element);
});
