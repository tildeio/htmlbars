define("htmlbars-runtime-tests/jshint-lib",
  [],
  function() {
    "use strict";
    module('JSHint - htmlbars-runtime');
    test('htmlbars-runtime/hooks.js should pass jshint', function() { 
      ok(true, 'htmlbars-runtime/hooks.js should pass jshint.'); 
    });


    module('JSHint - htmlbars-runtime');
    test('htmlbars-runtime/utils.js should pass jshint', function() { 
      ok(true, 'htmlbars-runtime/utils.js should pass jshint.'); 
    });
  });
define("htmlbars-runtime-tests/jshint-tests",
  [],
  function() {
    "use strict";
    module('JSHint - htmlbars-runtime-tests');
    test('htmlbars-runtime-tests/main-test.js should pass jshint', function() { 
      ok(true, 'htmlbars-runtime-tests/main-test.js should pass jshint.'); 
    });
  });
define("htmlbars-runtime-tests/main-test",
  ["../htmlbars-runtime"],
  function(__dependency1__) {
    "use strict";
    var hooks = __dependency1__.hooks;

    QUnit.module("htmlbars-runtime");

    test("hooks are present", function () {
      var hookNames = ['content', 'lookupHelper'];
      for (var i=0;i<hookNames.length;i++) {
        ok(hooks[hookNames[i]], "hook "+hookNames[i]+" is present");
      }
    });
  });