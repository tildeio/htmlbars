exports.__esModule = true;
exports.parse = parse;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _ast = require('./ast');

var _ast2 = _interopRequireDefault(_ast);

var _whitespaceControl = require('./whitespace-control');

var _whitespaceControl2 = _interopRequireDefault(_whitespaceControl);

var _helpers = require('./helpers');

var Helpers = _interopRequireWildcard(_helpers);

var _utils = require('../utils');

exports.parser = _parser2.default;

var yy = {};
_utils.extend(yy, Helpers, _ast2.default);

function parse(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2.default.yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new _whitespaceControl2.default();
  return strip.accept(_parser2.default.parse(input));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztzQkFBbUIsVUFBVTs7OzttQkFDYixPQUFPOzs7O2lDQUNPLHNCQUFzQjs7Ozt1QkFDM0IsV0FBVzs7SUFBeEIsT0FBTzs7cUJBQ0ksVUFBVTs7UUFFeEIsTUFBTTs7QUFFZixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDWixjQUFPLEVBQUUsRUFBRSxPQUFPLGdCQUFNLENBQUM7O0FBRWxCLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUU7O0FBRXBDLE1BQUksS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7QUFBRSxXQUFPLEtBQUssQ0FBQztHQUFFOztBQUUvQyxtQkFBTyxFQUFFLEdBQUcsRUFBRSxDQUFDOzs7QUFHZixJQUFFLENBQUMsT0FBTyxHQUFHLFVBQVMsT0FBTyxFQUFFO0FBQzdCLFdBQU8sSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0dBQ25FLENBQUM7O0FBRUYsTUFBSSxLQUFLLEdBQUcsaUNBQXVCLENBQUM7QUFDcEMsU0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLGlCQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0NBQzFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGFyc2VyIGZyb20gJy4vcGFyc2VyJztcbmltcG9ydCBBU1QgZnJvbSAnLi9hc3QnO1xuaW1wb3J0IFdoaXRlc3BhY2VDb250cm9sIGZyb20gJy4vd2hpdGVzcGFjZS1jb250cm9sJztcbmltcG9ydCAqIGFzIEhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7IGV4dGVuZCB9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IHsgcGFyc2VyIH07XG5cbmxldCB5eSA9IHt9O1xuZXh0ZW5kKHl5LCBIZWxwZXJzLCBBU1QpO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgLy8gSnVzdCByZXR1cm4gaWYgYW4gYWxyZWFkeS1jb21waWxlZCBBU1Qgd2FzIHBhc3NlZCBpbi5cbiAgaWYgKGlucHV0LnR5cGUgPT09ICdQcm9ncmFtJykgeyByZXR1cm4gaW5wdXQ7IH1cblxuICBwYXJzZXIueXkgPSB5eTtcblxuICAvLyBBbHRlcmluZyB0aGUgc2hhcmVkIG9iamVjdCBoZXJlLCBidXQgdGhpcyBpcyBvayBhcyBwYXJzZXIgaXMgYSBzeW5jIG9wZXJhdGlvblxuICB5eS5sb2NJbmZvID0gZnVuY3Rpb24obG9jSW5mbykge1xuICAgIHJldHVybiBuZXcgeXkuU291cmNlTG9jYXRpb24ob3B0aW9ucyAmJiBvcHRpb25zLnNyY05hbWUsIGxvY0luZm8pO1xuICB9O1xuXG4gIGxldCBzdHJpcCA9IG5ldyBXaGl0ZXNwYWNlQ29udHJvbCgpO1xuICByZXR1cm4gc3RyaXAuYWNjZXB0KHBhcnNlci5wYXJzZShpbnB1dCkpO1xufVxuIl19