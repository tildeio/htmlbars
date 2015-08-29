/* global QUnit, after */
window.global_test_results = null;

if (typeof QUnit !== 'undefined') {
  window.exportTestResultsForSauce = function (testResults) {
    window.global_test_results = testResults;
  };
  QUnit.done(window.exportTestResultsForSauce);
} else if (typeof Mocha !== 'undefined') {
  after(function() {
    window.global_test_results = window.mochaRunner.stats;
    window.global_test_results.reports = [];
  });
}
