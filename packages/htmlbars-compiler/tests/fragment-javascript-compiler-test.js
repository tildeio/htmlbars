import FragmentJavaScriptCompiler from "../htmlbars-compiler/fragment-javascript-compiler";

QUnit.module('FragmentJavaScriptCompiler');

test('createElement correctly generates code for tagName with contextualElement', assert => {
  assert.expect(1);
  let fragmentCompiler = new FragmentJavaScriptCompiler();
  fragmentCompiler.source.length = 0;
  fragmentCompiler.depth = -1;
  fragmentCompiler.indent = "";
  fragmentCompiler.namespaceFrameStack = [{namespace: null, depth: null}];

  const tagName = 'button';
  const contextualElement = 'my-button';

  fragmentCompiler.createElement(tagName, contextualElement);

  const pattern = new RegExp(`dom\\.createElement\\("${tagName}", "${contextualElement}"\\)`);

  assert.equal(pattern.test(fragmentCompiler.source[1]), true);
});

test('createElement correctly generates code for tagName without contextualElement', assert => {
  assert.expect(1);
  let fragmentCompiler = new FragmentJavaScriptCompiler();
  fragmentCompiler.source.length = 0;
  fragmentCompiler.depth = -1;
  fragmentCompiler.indent = "";
  fragmentCompiler.namespaceFrameStack = [{namespace: null, depth: null}];

  const tagName = 'button';

  fragmentCompiler.createElement(tagName);

  const pattern = new RegExp(`dom\\.createElement\\("${tagName}"\\)`);

  assert.equal(pattern.test(fragmentCompiler.source[1]), true);
});
