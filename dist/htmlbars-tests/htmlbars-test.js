"use strict";
var compile = require("../htmlbars").compile;

QUnit.module('htmlbars');

test("compile is exported", function(){
  ok(typeof compile == 'function', 'compile is exported');
});