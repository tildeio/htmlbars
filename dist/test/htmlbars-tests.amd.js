define("htmlbars-tests/htmlbars-test",
  ["../htmlbars"],
  function(__dependency1__) {
    "use strict";
    var compile = __dependency1__.compile;

    QUnit.module('htmlbars');

    test("compile is exported", function(){
      ok(typeof compile == 'function', 'compile is exported');
    });
  });
define("htmlbars-tests/jshint-lib",
  [],
  function() {
    "use strict";

  });
define("htmlbars-tests/jshint-tests",
  [],
  function() {
    "use strict";
    module('JSHint - htmlbars-tests');
    test('htmlbars-tests/htmlbars-test.js should pass jshint', function() { 
      ok(true, 'htmlbars-tests/htmlbars-test.js should pass jshint.'); 
    });
  });