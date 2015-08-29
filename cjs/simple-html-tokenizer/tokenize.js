exports.__esModule = true;
exports.default = tokenize;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _tokenizer = require('./tokenizer');

var _tokenizer2 = _interopRequireDefault(_tokenizer);

var _entityParser = require('./entity-parser');

var _entityParser2 = _interopRequireDefault(_entityParser);

var _charRefsFull = require('./char-refs/full');

var _charRefsFull2 = _interopRequireDefault(_charRefsFull);

function tokenize(input) {
  var tokenizer = new _tokenizer2.default(new _entityParser2.default(_charRefsFull2.default));
  return tokenizer.tokenize(input);
}

module.exports = exports.default;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpbXBsZS1odG1sLXRva2VuaXplci90b2tlbml6ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO2tCQUl3QixRQUFROzs7O3lCQUpWLGFBQWE7Ozs7NEJBQ1YsaUJBQWlCOzs7OzRCQUNkLGtCQUFrQjs7OztBQUUvQixTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUU7QUFDdEMsTUFBSSxTQUFTLEdBQUcsd0JBQWMsa0RBQWlDLENBQUMsQ0FBQztBQUNqRSxTQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDbEMiLCJmaWxlIjoic2ltcGxlLWh0bWwtdG9rZW5pemVyL3Rva2VuaXplLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRva2VuaXplciBmcm9tICcuL3Rva2VuaXplcic7XG5pbXBvcnQgRW50aXR5UGFyc2VyIGZyb20gJy4vZW50aXR5LXBhcnNlcic7XG5pbXBvcnQgbmFtZWRDb2RlcG9pbnRzIGZyb20gJy4vY2hhci1yZWZzL2Z1bGwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0b2tlbml6ZShpbnB1dCkge1xuICB2YXIgdG9rZW5pemVyID0gbmV3IFRva2VuaXplcihuZXcgRW50aXR5UGFyc2VyKG5hbWVkQ29kZXBvaW50cykpO1xuICByZXR1cm4gdG9rZW5pemVyLnRva2VuaXplKGlucHV0KTtcbn1cbiJdfQ==