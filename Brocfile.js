var Funnel = require('broccoli-funnel');
var compileModules = require('broccoli-compile-modules');
var PackageResolver = require('es6-module-transpiler-package-resolver');
var mergeTrees = require('broccoli-merge-trees');

var handlebars = require('./build-support/handlebars-inliner');
var simpleHtmlTokenizer = new Funnel('bower_components/simple-html-tokenizer/lib', {
  destDir: '/htmlbars-compiler/simple-html-tokenizer'
});

// TODO: Reintroduce broccoli-jshint?
// TODO: Reintroduce broccoli-uglifyjs.

/**
 * Build a Ember-style package structure containing all tests and support files.
 */
function buildTestPackage() {
  var packagesWithTests = [
    'htmlbars',
    'htmlbars-compiler',
    'htmlbars-runtime',
    'htmlbars-util',
    'morph'
  ];

  var destination = '/tests/lib';

  var testModulesTrees = packagesWithTests.map(function(packageName) {
    return new Funnel('packages/' + packageName + '/tests', {
      destDir: destination
    });
  });

  var testEntryPoint = new Funnel('test', {
    files: [ 'main.js' ],
    destDir: destination
  });

  var testSupport = new Funnel('test', {
    files: [ 'support/assertions.js' ],
    destDir: destination
  });

  var testPackageTrees = testModulesTrees.concat([ testEntryPoint, testSupport ]);

  return mergeTrees(testPackageTrees);
}

/**
 * Build test harness infrastructure, including the test runner page and QUnit.
 */
function buildTestHarness() {
  return mergeTrees([
    new Funnel('test', {
      files: [ 'index.html' ],
      destDir: '/tests'
    }),
    new Funnel('bower_components/qunit/qunit', {
      files: [ 'qunit.js', 'qunit.css' ],
      destDir: '/tests'
    })
  ]);
}

/**
 * Build a bundle containing both htmlbars and all its tests.
 */
function buildTestBundle(allPackages) {
  return compileModules(allPackages, {
    inputFiles: ['tests'],
    formatter: 'bundle',
    resolvers: [PackageResolver],
    output: '/tests/htmlbars-test-bundle.js'
  });
}

/**
 * Build htmlbars.js for use in ???.
 */
function buildDistBundle(libPackages) {
  return compileModules(libPackages, {
    inputFiles: ['htmlbars'],
    formatter: 'bundle',
    resolvers: [PackageResolver],
    output: '/htmlbars.js'
  });
}

var libPackages = mergeTrees(['packages', handlebars, simpleHtmlTokenizer]);
var testPackages = buildTestPackage();
var allPackages = mergeTrees([libPackages, testPackages]);
var testHarness = buildTestHarness();

module.exports = mergeTrees([
  buildDistBundle(libPackages),
  buildTestBundle(allPackages),
  testHarness
]);