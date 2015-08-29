define('htmlbars-syntax-tests/generation/print-test', ['exports', '../../htmlbars-syntax'], function (exports, _htmlbarsSyntax) {

  var b = _htmlbarsSyntax.builders;

  function printEqual(template) {
    var ast = _htmlbarsSyntax.parse(template);
    equal(_htmlbarsSyntax.print(ast), template);
  }

  QUnit.module('[htmlbars-syntax] Generation - printing');

  test('ElementNode: tag', function () {
    printEqual('<h1></h1>');
  });

  test('ElementNode: nested tags with indent', function () {
    printEqual('<div>\n  <p>Test</p>\n</div>');
  });

  test('ElementNode: attributes', function () {
    printEqual('<h1 class="foo" id="title"></h1>');
  });

  test('TextNode: chars', function () {
    printEqual('<h1>Test</h1>');
  });

  test('MustacheStatement: slash in path', function () {
    printEqual('{{namespace/foo "bar" baz="qux"}}');
  });

  test('MustacheStatement: path', function () {
    printEqual('<h1>{{model.title}}</h1>');
  });

  test('MustacheStatement: StringLiteral param', function () {
    printEqual('<h1>{{link-to "Foo"}}</h1>');
  });

  test('MustacheStatement: hash', function () {
    printEqual('<h1>{{link-to "Foo" class="bar"}}</h1>');
  });

  test('MustacheStatement: as element attribute', function () {
    printEqual('<h1 class={{if foo "foo" "bar"}}>Test</h1>');
  });

  test('MustacheStatement: as element attribute with path', function () {
    printEqual('<h1 class={{color}}>Test</h1>');
  });

  test('ConcatStatement: in element attribute string', function () {
    printEqual('<h1 class="{{if active "active" "inactive"}} foo">Test</h1>');
  });

  test('ElementModifierStatement', function () {
    printEqual('<p {{action "activate"}} {{someting foo="bar"}}>Test</p>');
  });

  test('PartialStatement', function () {
    printEqual('<p>{{>something "param"}}</p>');
  });

  test('SubExpression', function () {
    printEqual('<p>{{my-component submit=(action (mut model.name) (full-name model.firstName "Smith"))}}</p>');
  });

  test('BlockStatement: multiline', function () {
    printEqual('<ul>{{#each foos as |foo|}}\n  {{foo}}\n{{/each}}</ul>');
  });

  test('BlockStatement: inline', function () {
    printEqual('{{#if foo}}<p>{{foo}}</p>{{/if}}');
  });

  test('UndefinedLiteral', function () {
    var ast = b.program([b.mustache(b['undefined']())]);
    equal(_htmlbarsSyntax.print(ast), '{{undefined}}');
  });

  test('NumberLiteral', function () {
    var ast = b.program([b.mustache('foo', null, b.hash([b.pair('bar', b.number(5))]))]);
    equal(_htmlbarsSyntax.print(ast), '{{foo bar=5}}');
  });

  test('BooleanLiteral', function () {
    var ast = b.program([b.mustache('foo', null, b.hash([b.pair('bar', b.boolean(true))]))]);
    equal(_htmlbarsSyntax.print(ast), '{{foo bar=true}}');
  });

  test('HTML comment', function () {
    printEqual('<!-- foo -->');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9nZW5lcmF0aW9uL3ByaW50LXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFNLENBQUMsbUJBRmdCLFFBQVEsQUFFYixDQUFDOztBQUVuQixXQUFTLFVBQVUsQ0FBQyxRQUFRLEVBQUU7QUFDNUIsUUFBTSxHQUFHLEdBQUcsZ0JBTEwsS0FBSyxDQUtNLFFBQVEsQ0FBQyxDQUFDO0FBQzVCLFNBQUssQ0FBQyxnQkFOUSxLQUFLLENBTVAsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDN0I7O0FBRUQsT0FBSyxDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDOztBQUV4RCxNQUFJLENBQUMsa0JBQWtCLEVBQUUsWUFBVztBQUNsQyxjQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDekIsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxzQ0FBc0MsRUFBRSxZQUFXO0FBQ3RELGNBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0dBQzVDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMseUJBQXlCLEVBQUUsWUFBVztBQUN6QyxjQUFVLENBQUMsa0NBQWtDLENBQUMsQ0FBQztHQUNoRCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLGlCQUFpQixFQUFFLFlBQVc7QUFDakMsY0FBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0dBQzdCLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsa0NBQWtDLEVBQUUsWUFBVztBQUNsRCxjQUFVLENBQUMsbUNBQW1DLENBQUMsQ0FBQztHQUNqRCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLHlCQUF5QixFQUFFLFlBQVc7QUFDekMsY0FBVSxDQUFDLDBCQUEwQixDQUFDLENBQUM7R0FDeEMsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyx3Q0FBd0MsRUFBRSxZQUFXO0FBQ3hELGNBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0dBQzFDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMseUJBQXlCLEVBQUUsWUFBVztBQUN6QyxjQUFVLENBQUMsd0NBQXdDLENBQUMsQ0FBQztHQUN0RCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLHlDQUF5QyxFQUFFLFlBQVc7QUFDekQsY0FBVSxDQUFDLDRDQUE0QyxDQUFDLENBQUM7R0FDMUQsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxtREFBbUQsRUFBRSxZQUFXO0FBQ25FLGNBQVUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0dBQzdDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsOENBQThDLEVBQUUsWUFBVztBQUM5RCxjQUFVLENBQUMsNkRBQTZELENBQUMsQ0FBQztHQUMzRSxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLDBCQUEwQixFQUFFLFlBQVc7QUFDMUMsY0FBVSxDQUFDLDBEQUEwRCxDQUFDLENBQUM7R0FDeEUsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFXO0FBQ2xDLGNBQVUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0dBQzdDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsZUFBZSxFQUFFLFlBQVc7QUFDL0IsY0FBVSxDQUFDLDhGQUE4RixDQUFDLENBQUM7R0FDNUcsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQywyQkFBMkIsRUFBRSxZQUFXO0FBQzNDLGNBQVUsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0dBQ3RFLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsd0JBQXdCLEVBQUUsWUFBVztBQUN4QyxjQUFVLENBQUMsa0NBQWtDLENBQUMsQ0FBQztHQUNoRCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLGtCQUFrQixFQUFFLFlBQVc7QUFDbEMsUUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsU0FBSyxDQUFDLGdCQTdFUSxLQUFLLENBNkVQLEdBQUcsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0dBQ3BDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsZUFBZSxFQUFFLFlBQVc7QUFDL0IsUUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUNwQixDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNyQyxDQUNGLENBQUMsQ0FBQztBQUNILFNBQUssQ0FBQyxnQkF0RlEsS0FBSyxDQXNGUCxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztHQUNwQyxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLGdCQUFnQixFQUFFLFlBQVc7QUFDaEMsUUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUNwQixDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN6QyxDQUNGLENBQUMsQ0FBQztBQUNILFNBQUssQ0FBQyxnQkEvRlEsS0FBSyxDQStGUCxHQUFHLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0dBQ3ZDLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsY0FBYyxFQUFFLFlBQVc7QUFDOUIsY0FBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0dBQzVCLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvZ2VuZXJhdGlvbi9wcmludC10ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyc2UsIHByaW50LCBidWlsZGVycyB9IGZyb20gJy4uLy4uL2h0bWxiYXJzLXN5bnRheCc7XG5cbmNvbnN0IGIgPSBidWlsZGVycztcblxuZnVuY3Rpb24gcHJpbnRFcXVhbCh0ZW1wbGF0ZSkge1xuICBjb25zdCBhc3QgPSBwYXJzZSh0ZW1wbGF0ZSk7XG4gIGVxdWFsKHByaW50KGFzdCksIHRlbXBsYXRlKTtcbn1cblxuUVVuaXQubW9kdWxlKCdbaHRtbGJhcnMtc3ludGF4XSBHZW5lcmF0aW9uIC0gcHJpbnRpbmcnKTtcblxudGVzdCgnRWxlbWVudE5vZGU6IHRhZycsIGZ1bmN0aW9uKCkge1xuICBwcmludEVxdWFsKCc8aDE+PC9oMT4nKTtcbn0pO1xuXG50ZXN0KCdFbGVtZW50Tm9kZTogbmVzdGVkIHRhZ3Mgd2l0aCBpbmRlbnQnLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPGRpdj5cXG4gIDxwPlRlc3Q8L3A+XFxuPC9kaXY+Jyk7XG59KTtcblxudGVzdCgnRWxlbWVudE5vZGU6IGF0dHJpYnV0ZXMnLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPGgxIGNsYXNzPVwiZm9vXCIgaWQ9XCJ0aXRsZVwiPjwvaDE+Jyk7XG59KTtcblxudGVzdCgnVGV4dE5vZGU6IGNoYXJzJywgZnVuY3Rpb24oKSB7XG4gIHByaW50RXF1YWwoJzxoMT5UZXN0PC9oMT4nKTtcbn0pO1xuXG50ZXN0KCdNdXN0YWNoZVN0YXRlbWVudDogc2xhc2ggaW4gcGF0aCcsIGZ1bmN0aW9uKCkge1xuICBwcmludEVxdWFsKCd7e25hbWVzcGFjZS9mb28gXCJiYXJcIiBiYXo9XCJxdXhcIn19Jyk7XG59KTtcblxudGVzdCgnTXVzdGFjaGVTdGF0ZW1lbnQ6IHBhdGgnLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPGgxPnt7bW9kZWwudGl0bGV9fTwvaDE+Jyk7XG59KTtcblxudGVzdCgnTXVzdGFjaGVTdGF0ZW1lbnQ6IFN0cmluZ0xpdGVyYWwgcGFyYW0nLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPGgxPnt7bGluay10byBcIkZvb1wifX08L2gxPicpO1xufSk7XG5cbnRlc3QoJ011c3RhY2hlU3RhdGVtZW50OiBoYXNoJywgZnVuY3Rpb24oKSB7XG4gIHByaW50RXF1YWwoJzxoMT57e2xpbmstdG8gXCJGb29cIiBjbGFzcz1cImJhclwifX08L2gxPicpO1xufSk7XG5cbnRlc3QoJ011c3RhY2hlU3RhdGVtZW50OiBhcyBlbGVtZW50IGF0dHJpYnV0ZScsIGZ1bmN0aW9uKCkge1xuICBwcmludEVxdWFsKCc8aDEgY2xhc3M9e3tpZiBmb28gXCJmb29cIiBcImJhclwifX0+VGVzdDwvaDE+Jyk7XG59KTtcblxudGVzdCgnTXVzdGFjaGVTdGF0ZW1lbnQ6IGFzIGVsZW1lbnQgYXR0cmlidXRlIHdpdGggcGF0aCcsIGZ1bmN0aW9uKCkge1xuICBwcmludEVxdWFsKCc8aDEgY2xhc3M9e3tjb2xvcn19PlRlc3Q8L2gxPicpO1xufSk7XG5cbnRlc3QoJ0NvbmNhdFN0YXRlbWVudDogaW4gZWxlbWVudCBhdHRyaWJ1dGUgc3RyaW5nJywgZnVuY3Rpb24oKSB7XG4gIHByaW50RXF1YWwoJzxoMSBjbGFzcz1cInt7aWYgYWN0aXZlIFwiYWN0aXZlXCIgXCJpbmFjdGl2ZVwifX0gZm9vXCI+VGVzdDwvaDE+Jyk7XG59KTtcblxudGVzdCgnRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50JywgZnVuY3Rpb24oKSB7XG4gIHByaW50RXF1YWwoJzxwIHt7YWN0aW9uIFwiYWN0aXZhdGVcIn19IHt7c29tZXRpbmcgZm9vPVwiYmFyXCJ9fT5UZXN0PC9wPicpO1xufSk7XG5cbnRlc3QoJ1BhcnRpYWxTdGF0ZW1lbnQnLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPHA+e3s+c29tZXRoaW5nIFwicGFyYW1cIn19PC9wPicpO1xufSk7XG5cbnRlc3QoJ1N1YkV4cHJlc3Npb24nLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPHA+e3tteS1jb21wb25lbnQgc3VibWl0PShhY3Rpb24gKG11dCBtb2RlbC5uYW1lKSAoZnVsbC1uYW1lIG1vZGVsLmZpcnN0TmFtZSBcIlNtaXRoXCIpKX19PC9wPicpO1xufSk7XG5cbnRlc3QoJ0Jsb2NrU3RhdGVtZW50OiBtdWx0aWxpbmUnLCBmdW5jdGlvbigpIHtcbiAgcHJpbnRFcXVhbCgnPHVsPnt7I2VhY2ggZm9vcyBhcyB8Zm9vfH19XFxuICB7e2Zvb319XFxue3svZWFjaH19PC91bD4nKTtcbn0pO1xuXG50ZXN0KCdCbG9ja1N0YXRlbWVudDogaW5saW5lJywgZnVuY3Rpb24oKSB7XG4gIHByaW50RXF1YWwoJ3t7I2lmIGZvb319PHA+e3tmb299fTwvcD57ey9pZn19Jyk7XG59KTtcblxudGVzdCgnVW5kZWZpbmVkTGl0ZXJhbCcsIGZ1bmN0aW9uKCkge1xuICBjb25zdCBhc3QgPSBiLnByb2dyYW0oW2IubXVzdGFjaGUoYlsndW5kZWZpbmVkJ10oKSldKTtcbiAgZXF1YWwocHJpbnQoYXN0KSwgJ3t7dW5kZWZpbmVkfX0nKTtcbn0pO1xuXG50ZXN0KCdOdW1iZXJMaXRlcmFsJywgZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGFzdCA9IGIucHJvZ3JhbShbXG4gICAgYi5tdXN0YWNoZSgnZm9vJywgbnVsbCxcbiAgICAgIGIuaGFzaChbYi5wYWlyKCdiYXInLCBiLm51bWJlcig1KSldKVxuICAgIClcbiAgXSk7XG4gIGVxdWFsKHByaW50KGFzdCksICd7e2ZvbyBiYXI9NX19Jyk7XG59KTtcblxudGVzdCgnQm9vbGVhbkxpdGVyYWwnLCBmdW5jdGlvbigpIHtcbiAgY29uc3QgYXN0ID0gYi5wcm9ncmFtKFtcbiAgICBiLm11c3RhY2hlKCdmb28nLCBudWxsLFxuICAgICAgYi5oYXNoKFtiLnBhaXIoJ2JhcicsIGIuYm9vbGVhbih0cnVlKSldKVxuICAgIClcbiAgXSk7XG4gIGVxdWFsKHByaW50KGFzdCksICd7e2ZvbyBiYXI9dHJ1ZX19Jyk7XG59KTtcblxudGVzdCgnSFRNTCBjb21tZW50JywgZnVuY3Rpb24oKSB7XG4gIHByaW50RXF1YWwoJzwhLS0gZm9vIC0tPicpO1xufSk7XG4iXX0=
define('htmlbars-syntax-tests/generation/print-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/generation');
  QUnit.test('htmlbars-syntax-tests/generation/print-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/generation/print-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9nZW5lcmF0aW9uL3ByaW50LXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7QUFDMUQsT0FBSyxDQUFDLElBQUksQ0FBQyxtRUFBbUUsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMvRixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxvRUFBb0UsQ0FBQyxDQUFDO0dBQ3ZGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvZ2VuZXJhdGlvbi9wcmludC10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtc3ludGF4LXRlc3RzL2dlbmVyYXRpb24nKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9nZW5lcmF0aW9uL3ByaW50LXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9nZW5lcmF0aW9uL3ByaW50LXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-syntax-tests/htmlbars-syntax.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXguanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0MsT0FBSyxDQUFDLElBQUksQ0FBQyw2REFBNkQsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUN6RixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSw4REFBOEQsQ0FBQyxDQUFDO0dBQ2pGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtc3ludGF4LXRlc3RzJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4LmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/htmlbars-syntax/builders.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/builders.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/builders.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvYnVpbGRlcnMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxDQUFDLENBQUM7QUFDL0QsT0FBSyxDQUFDLElBQUksQ0FBQyxzRUFBc0UsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUNsRyxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSx1RUFBdUUsQ0FBQyxDQUFDO0dBQzFGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L2J1aWxkZXJzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC9idWlsZGVycy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC9idWlsZGVycy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/htmlbars-syntax/generation/print.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/generation');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/generation/print.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/generation/print.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvZ2VuZXJhdGlvbi9wcmludC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMkRBQTJELENBQUMsQ0FBQztBQUMxRSxPQUFLLENBQUMsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzFHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLCtFQUErRSxDQUFDLENBQUM7R0FDbEcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvZ2VuZXJhdGlvbi9wcmludC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvZ2VuZXJhdGlvbicpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC9nZW5lcmF0aW9uL3ByaW50LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L2dlbmVyYXRpb24vcHJpbnQuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-syntax-tests/htmlbars-syntax/parser.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/parser.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/parser.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0FBQy9ELE9BQUssQ0FBQyxJQUFJLENBQUMsb0VBQW9FLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDaEcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUscUVBQXFFLENBQUMsQ0FBQztHQUN4RixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC9wYXJzZXIuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4Jyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3BhcnNlci5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC9wYXJzZXIuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-syntax-tests/htmlbars-syntax/parser/handlebars-node-visitors.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/parser');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/parser/handlebars-node-visitors.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/parser/handlebars-node-visitors.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsdURBQXVELENBQUMsQ0FBQztBQUN0RSxPQUFLLENBQUMsSUFBSSxDQUFDLDZGQUE2RixFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3pILFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDhGQUE4RixDQUFDLENBQUM7R0FDakgsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3BhcnNlci9oYW5kbGViYXJzLW5vZGUtdmlzaXRvcnMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/htmlbars-syntax/parser/tokenizer-event-handlers.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/parser');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/parser/tokenizer-event-handlers.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/parser/tokenizer-event-handlers.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsdURBQXVELENBQUMsQ0FBQztBQUN0RSxPQUFLLENBQUMsSUFBSSxDQUFDLDZGQUE2RixFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3pILFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLDhGQUE4RixDQUFDLENBQUM7R0FDakgsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3BhcnNlci90b2tlbml6ZXItZXZlbnQtaGFuZGxlcnMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/htmlbars-syntax/traversal/errors.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/traversal');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/traversal/errors.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/traversal/errors.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL2Vycm9ycy5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMERBQTBELENBQUMsQ0FBQztBQUN6RSxPQUFLLENBQUMsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzFHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLCtFQUErRSxDQUFDLENBQUM7R0FDbEcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL2Vycm9ycy5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3RyYXZlcnNhbC9lcnJvcnMuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL2Vycm9ycy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/htmlbars-syntax/traversal/traverse.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/traversal');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/traversal/traverse.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/traversal/traverse.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL3RyYXZlcnNlLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywwREFBMEQsQ0FBQyxDQUFDO0FBQ3pFLE9BQUssQ0FBQyxJQUFJLENBQUMsZ0ZBQWdGLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDNUcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUZBQWlGLENBQUMsQ0FBQztHQUNwRyxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC90cmF2ZXJzYWwvdHJhdmVyc2UuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3RyYXZlcnNhbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC90cmF2ZXJzYWwvdHJhdmVyc2UuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL3RyYXZlcnNlLmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/htmlbars-syntax/traversal/walker.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/traversal');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/traversal/walker.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/traversal/walker.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL3dhbGtlci5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMERBQTBELENBQUMsQ0FBQztBQUN6RSxPQUFLLENBQUMsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzFHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLCtFQUErRSxDQUFDLENBQUM7R0FDbEcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL3dhbGtlci5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3RyYXZlcnNhbC93YWxrZXIuanMgc2hvdWxkIHBhc3MganNoaW50JywgZnVuY3Rpb24oYXNzZXJ0KSB7IFxuICBhc3NlcnQub2sodHJ1ZSwgJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL3dhbGtlci5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/htmlbars-syntax/types/visitor-keys.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax/types');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/types/visitor-keys.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/types/visitor-keys.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdHlwZXMvdmlzaXRvci1rZXlzLmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO0FBQ3JFLE9BQUssQ0FBQyxJQUFJLENBQUMsZ0ZBQWdGLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDNUcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUZBQWlGLENBQUMsQ0FBQztHQUNwRyxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC90eXBlcy92aXNpdG9yLWtleXMuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3R5cGVzJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3R5cGVzL3Zpc2l0b3Ita2V5cy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC90eXBlcy92aXNpdG9yLWtleXMuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-syntax-tests/htmlbars-syntax/utils.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/htmlbars-syntax');
  QUnit.test('htmlbars-syntax-tests/htmlbars-syntax/utils.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/htmlbars-syntax/utils.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9odG1sYmFycy1zeW50YXgvdXRpbHMuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxDQUFDLENBQUM7QUFDL0QsT0FBSyxDQUFDLElBQUksQ0FBQyxtRUFBbUUsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMvRixVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxvRUFBb0UsQ0FBQyxDQUFDO0dBQ3ZGLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvaHRtbGJhcnMtc3ludGF4L3V0aWxzLmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC91dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL2h0bWxiYXJzLXN5bnRheC91dGlscy5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("htmlbars-syntax-tests/loc-node-test", ["exports", "../htmlbars-syntax"], function (exports, _htmlbarsSyntax) {

  QUnit.module("[htmlbars-syntax] Parser - Location Info");

  function locEqual(node, startLine, startColumn, endLine, endColumn, message) {

    var expected = {
      source: null,
      start: { line: startLine, column: startColumn },
      end: { line: endLine, column: endColumn }
    };

    deepEqual(node.loc, expected, message);
  }

  test("programs", function () {
    var ast = _htmlbarsSyntax.parse("\n  {{#if foo}}\n    {{bar}}\n       {{/if}}\n    ");

    locEqual(ast, 1, 0, 5, 4, 'outer program');

    // startColumn should be 13 not 2.
    // This should be fixed upstream in Handlebars.
    locEqual(ast.body[1].program, 2, 2, 4, 7, 'nested program');
  });

  test("blocks", function () {
    var ast = _htmlbarsSyntax.parse("\n  {{#if foo}}\n    {{#if bar}}\n        test\n        {{else}}\n      test\n  {{/if    }}\n       {{/if\n      }}\n    ");

    locEqual(ast.body[1], 2, 2, 9, 8, 'outer block');
    locEqual(ast.body[1].program.body[0], 3, 4, 7, 13, 'nested block');
  });

  test("mustache", function () {
    var ast = _htmlbarsSyntax.parse("\n    {{foo}}\n    {{#if foo}}\n      bar: {{bar\n        }}\n    {{/if}}\n  ");

    locEqual(ast.body[1], 2, 4, 2, 11, 'outer mustache');
    locEqual(ast.body[3].program.body[1], 4, 11, 5, 10, 'inner mustache');
  });

  test("element modifier", function () {
    var ast = _htmlbarsSyntax.parse("\n    <div {{bind-attr\n      foo\n      bar=wat}}></div>\n  ");

    locEqual(ast.body[1].modifiers[0], 2, 9, 4, 15, 'element modifier');
  });

  test("html elements", function () {
    var ast = _htmlbarsSyntax.parse("\n    <section>\n      <br>\n      <div>\n        <hr />\n      </div>\n    </section>\n  ");

    var _ast$body = ast.body;
    var section = _ast$body[1];
    var _section$children = section.children;
    var br = _section$children[1];
    var div = _section$children[3];
    var _div$children = div.children;
    var hr = _div$children[1];

    locEqual(section, 2, 4, 7, 14, 'section element');
    locEqual(br, 3, 6, 3, 10, 'br element');
    locEqual(div, 4, 6, 6, 12, 'div element');
    locEqual(hr, 5, 8, 5, 14, 'hr element');
  });

  test("components", function () {
    var ast = _htmlbarsSyntax.parse("\n    <el-page>\n      <el-header></el-header>\n      <el-input />\n      <el-footer>\n          </el-footer>\n    </el-page>\n  ");

    var _ast$body2 = ast.body;
    var page = _ast$body2[1];
    var _page$program$body = page.program.body;
    var header = _page$program$body[1];
    var input = _page$program$body[3];
    var footer = _page$program$body[5];

    locEqual(page, 2, 4, 7, 14, 'page component');
    locEqual(header, 3, 6, 3, 29, 'header component');
    locEqual(input, 4, 6, 4, 18, 'input component');
    locEqual(footer, 5, 6, 6, 22, 'footer component');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9sb2Mtbm9kZS10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDOztBQUV6RCxXQUFTLFFBQVEsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTs7QUFFM0UsUUFBSSxRQUFRLEdBQUc7QUFDYixZQUFNLEVBQUUsSUFBSTtBQUNaLFdBQUssRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRTtBQUMvQyxTQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7S0FDMUMsQ0FBQzs7QUFFRixhQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDeEM7O0FBRUQsTUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFXO0FBQzFCLFFBQUksR0FBRyxHQUFHLGdCQWhCSCxLQUFLLHNEQW9CUixDQUFDOztBQUVMLFlBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDOzs7O0FBSTNDLFlBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztHQUM3RCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLFFBQVEsRUFBRSxZQUFXO0FBQ3hCLFFBQUksR0FBRyxHQUFHLGdCQTlCSCxLQUFLLDZIQXVDUixDQUFDOztBQUVMLFlBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FB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Q0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvbG9jLW5vZGUtdGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheFwiO1xuXG5RVW5pdC5tb2R1bGUoXCJbaHRtbGJhcnMtc3ludGF4XSBQYXJzZXIgLSBMb2NhdGlvbiBJbmZvXCIpO1xuXG5mdW5jdGlvbiBsb2NFcXVhbChub2RlLCBzdGFydExpbmUsIHN0YXJ0Q29sdW1uLCBlbmRMaW5lLCBlbmRDb2x1bW4sIG1lc3NhZ2UpIHtcblxuICB2YXIgZXhwZWN0ZWQgPSB7XG4gICAgc291cmNlOiBudWxsLFxuICAgIHN0YXJ0OiB7IGxpbmU6IHN0YXJ0TGluZSwgY29sdW1uOiBzdGFydENvbHVtbiB9LFxuICAgIGVuZDogeyBsaW5lOiBlbmRMaW5lLCBjb2x1bW46IGVuZENvbHVtbiB9XG4gIH07XG5cbiAgZGVlcEVxdWFsKG5vZGUubG9jLCBleHBlY3RlZCwgbWVzc2FnZSk7XG59XG5cbnRlc3QoXCJwcm9ncmFtc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKGBcbiAge3sjaWYgZm9vfX1cbiAgICB7e2Jhcn19XG4gICAgICAge3svaWZ9fVxuICAgIGApO1xuXG4gIGxvY0VxdWFsKGFzdCwgMSwgMCwgNSwgNCwgJ291dGVyIHByb2dyYW0nKTtcblxuICAvLyBzdGFydENvbHVtbiBzaG91bGQgYmUgMTMgbm90IDIuXG4gIC8vIFRoaXMgc2hvdWxkIGJlIGZpeGVkIHVwc3RyZWFtIGluIEhhbmRsZWJhcnMuXG4gIGxvY0VxdWFsKGFzdC5ib2R5WzFdLnByb2dyYW0sIDIsIDIsIDQsIDcsICduZXN0ZWQgcHJvZ3JhbScpO1xufSk7XG5cbnRlc3QoXCJibG9ja3NcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBhc3QgPSBwYXJzZShgXG4gIHt7I2lmIGZvb319XG4gICAge3sjaWYgYmFyfX1cbiAgICAgICAgdGVzdFxuICAgICAgICB7e2Vsc2V9fVxuICAgICAgdGVzdFxuICB7ey9pZiAgICB9fVxuICAgICAgIHt7L2lmXG4gICAgICB9fVxuICAgIGApO1xuXG4gIGxvY0VxdWFsKGFzdC5ib2R5WzFdLCAyLCAyLCA5LCA4LCAnb3V0ZXIgYmxvY2snKTtcbiAgbG9jRXF1YWwoYXN0LmJvZHlbMV0ucHJvZ3JhbS5ib2R5WzBdLCAzLCA0LCA3LCAxMywgJ25lc3RlZCBibG9jaycpO1xufSk7XG5cbnRlc3QoXCJtdXN0YWNoZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKGBcbiAgICB7e2Zvb319XG4gICAge3sjaWYgZm9vfX1cbiAgICAgIGJhcjoge3tiYXJcbiAgICAgICAgfX1cbiAgICB7ey9pZn19XG4gIGApO1xuXG4gIGxvY0VxdWFsKGFzdC5ib2R5WzFdLCAyLCA0LCAyLCAxMSwgJ291dGVyIG11c3RhY2hlJyk7XG4gIGxvY0VxdWFsKGFzdC5ib2R5WzNdLnByb2dyYW0uYm9keVsxXSwgNCwgMTEsIDUsIDEwLCAnaW5uZXIgbXVzdGFjaGUnKTtcbn0pO1xuXG50ZXN0KFwiZWxlbWVudCBtb2RpZmllclwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKGBcbiAgICA8ZGl2IHt7YmluZC1hdHRyXG4gICAgICBmb29cbiAgICAgIGJhcj13YXR9fT48L2Rpdj5cbiAgYCk7XG5cbiAgbG9jRXF1YWwoYXN0LmJvZHlbMV0ubW9kaWZpZXJzWzBdLCAyLCA5LCA0LCAxNSwgJ2VsZW1lbnQgbW9kaWZpZXInKTtcbn0pO1xuXG50ZXN0KFwiaHRtbCBlbGVtZW50c1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKGBcbiAgICA8c2VjdGlvbj5cbiAgICAgIDxicj5cbiAgICAgIDxkaXY+XG4gICAgICAgIDxociAvPlxuICAgICAgPC9kaXY+XG4gICAgPC9zZWN0aW9uPlxuICBgKTtcblxuICBsZXQgWyxzZWN0aW9uXSA9IGFzdC5ib2R5O1xuICBsZXQgWyxiciwsZGl2XSA9IHNlY3Rpb24uY2hpbGRyZW47XG4gIGxldCBbLGhyXSA9IGRpdi5jaGlsZHJlbjtcblxuICBsb2NFcXVhbChzZWN0aW9uLCAyLCA0LCA3LCAxNCwgJ3NlY3Rpb24gZWxlbWVudCcpO1xuICBsb2NFcXVhbChiciwgMywgNiwgMywgMTAsICdiciBlbGVtZW50Jyk7XG4gIGxvY0VxdWFsKGRpdiwgNCwgNiwgNiwgMTIsICdkaXYgZWxlbWVudCcpO1xuICBsb2NFcXVhbChociwgNSwgOCwgNSwgMTQsICdociBlbGVtZW50Jyk7XG59KTtcblxudGVzdChcImNvbXBvbmVudHNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBhc3QgPSBwYXJzZShgXG4gICAgPGVsLXBhZ2U+XG4gICAgICA8ZWwtaGVhZGVyPjwvZWwtaGVhZGVyPlxuICAgICAgPGVsLWlucHV0IC8+XG4gICAgICA8ZWwtZm9vdGVyPlxuICAgICAgICAgIDwvZWwtZm9vdGVyPlxuICAgIDwvZWwtcGFnZT5cbiAgYCk7XG5cbiAgbGV0IFsscGFnZV0gPSBhc3QuYm9keTtcbiAgbGV0IFssaGVhZGVyLCxpbnB1dCwsZm9vdGVyXSA9IHBhZ2UucHJvZ3JhbS5ib2R5O1xuXG4gIGxvY0VxdWFsKHBhZ2UsIDIsIDQsIDcsIDE0LCAncGFnZSBjb21wb25lbnQnKTtcbiAgbG9jRXF1YWwoaGVhZGVyLCAzLCA2LCAzLCAyOSwgJ2hlYWRlciBjb21wb25lbnQnKTtcbiAgbG9jRXF1YWwoaW5wdXQsIDQsIDYsIDQsIDE4LCAnaW5wdXQgY29tcG9uZW50Jyk7XG4gIGxvY0VxdWFsKGZvb3RlciwgNSwgNiwgNiwgMjIsICdmb290ZXIgY29tcG9uZW50Jyk7XG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/loc-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests');
  QUnit.test('htmlbars-syntax-tests/loc-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/loc-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9sb2Mtbm9kZS10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9DLE9BQUssQ0FBQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdkYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNERBQTRELENBQUMsQ0FBQztHQUMvRSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL2xvYy1ub2RlLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9sb2Mtbm9kZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy1zeW50YXgtdGVzdHMvbG9jLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define("htmlbars-syntax-tests/parser-node-test", ["exports", "../htmlbars-syntax/handlebars/compiler/base", "../htmlbars-syntax", "../htmlbars-syntax/builders", "./support"], function (exports, _htmlbarsSyntaxHandlebarsCompilerBase, _htmlbarsSyntax, _htmlbarsSyntaxBuilders, _support) {

  QUnit.module("[htmlbars-syntax] HTML-based compiler (AST)");

  test("a simple piece of content", function () {
    var t = 'some content';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('some content')]));
  });

  test("allow simple AST to be passed", function () {
    var ast = _htmlbarsSyntax.parse(_htmlbarsSyntaxHandlebarsCompilerBase.parse("simple"));

    _support.astEqual(ast, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("simple")]));
  });

  test("allow an AST with mustaches to be passed", function () {
    var ast = _htmlbarsSyntax.parse(_htmlbarsSyntaxHandlebarsCompilerBase.parse("<h1>some</h1> ast {{foo}}"));

    _support.astEqual(ast, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("h1", [], [], [_htmlbarsSyntaxBuilders.default.text("some")]), _htmlbarsSyntaxBuilders.default.text(" ast "), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('foo'))]));
  });

  test("self-closed element", function () {
    var t = '<g />';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("g")]));
  });

  test("elements can have empty attributes", function () {
    var t = '<img id="">';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("img", [_htmlbarsSyntaxBuilders.default.attr("id", _htmlbarsSyntaxBuilders.default.text(""))])]));
  });

  test("svg content", function () {
    var t = "<svg></svg>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("svg")]));
  });

  test("html content with html content inline", function () {
    var t = '<div><p></p></div>';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("div", [], [], [_htmlbarsSyntaxBuilders.default.element("p")])]));
  });

  test("html content with svg content inline", function () {
    var t = '<div><svg></svg></div>';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("div", [], [], [_htmlbarsSyntaxBuilders.default.element("svg")])]));
  });

  var integrationPoints = ['foreignObject', 'desc', 'title'];
  function buildIntegrationPointTest(integrationPoint) {
    return function integrationPointTest() {
      var t = '<svg><' + integrationPoint + '><div></div></' + integrationPoint + '></svg>';
      _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element("svg", [], [], [_htmlbarsSyntaxBuilders.default.element(integrationPoint, [], [], [_htmlbarsSyntaxBuilders.default.element("div")])])]));
    };
  }
  for (var i = 0, length = integrationPoints.length; i < length; i++) {
    test("svg content with html content inline for " + integrationPoints[i], buildIntegrationPointTest(integrationPoints[i]));
  }

  test("a piece of content with HTML", function () {
    var t = 'some <div>content</div> done';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("some "), _htmlbarsSyntaxBuilders.default.element("div", [], [], [_htmlbarsSyntaxBuilders.default.text("content")]), _htmlbarsSyntaxBuilders.default.text(" done")]));
  });

  test("a piece of Handlebars with HTML", function () {
    var t = 'some <div>{{content}}</div> done';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("some "), _htmlbarsSyntaxBuilders.default.element("div", [], [], [_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('content'))]), _htmlbarsSyntaxBuilders.default.text(" done")]));
  });

  test("Handlebars embedded in an attribute (quoted)", function () {
    var t = 'some <div class="{{foo}}">content</div> done';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("some "), _htmlbarsSyntaxBuilders.default.element("div", [_htmlbarsSyntaxBuilders.default.attr("class", _htmlbarsSyntaxBuilders.default.concat([_htmlbarsSyntaxBuilders.default.path('foo')]))], [], [_htmlbarsSyntaxBuilders.default.text("content")]), _htmlbarsSyntaxBuilders.default.text(" done")]));
  });

  test("Handlebars embedded in an attribute (unquoted)", function () {
    var t = 'some <div class={{foo}}>content</div> done';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("some "), _htmlbarsSyntaxBuilders.default.element("div", [_htmlbarsSyntaxBuilders.default.attr("class", _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('foo')))], [], [_htmlbarsSyntaxBuilders.default.text("content")]), _htmlbarsSyntaxBuilders.default.text(" done")]));
  });

  test("Handlebars embedded in an attribute (sexprs)", function () {
    var t = 'some <div class="{{foo (foo "abc")}}">content</div> done';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("some "), _htmlbarsSyntaxBuilders.default.element("div", [_htmlbarsSyntaxBuilders.default.attr("class", _htmlbarsSyntaxBuilders.default.concat([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('foo'), [_htmlbarsSyntaxBuilders.default.sexpr(_htmlbarsSyntaxBuilders.default.path('foo'), [_htmlbarsSyntaxBuilders.default.string('abc')])])]))], [], [_htmlbarsSyntaxBuilders.default.text("content")]), _htmlbarsSyntaxBuilders.default.text(" done")]));
  });

  test("Handlebars embedded in an attribute with other content surrounding it", function () {
    var t = 'some <a href="http://{{link}}/">content</a> done';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("some "), _htmlbarsSyntaxBuilders.default.element("a", [_htmlbarsSyntaxBuilders.default.attr("href", _htmlbarsSyntaxBuilders.default.concat([_htmlbarsSyntaxBuilders.default.string("http://"), _htmlbarsSyntaxBuilders.default.path('link'), _htmlbarsSyntaxBuilders.default.string("/")]))], [], [_htmlbarsSyntaxBuilders.default.text("content")]), _htmlbarsSyntaxBuilders.default.text(" done")]));
  });

  test("A more complete embedding example", function () {
    var t = "{{embed}} {{some 'content'}} " + "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" + " {{more 'embed'}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('embed')), _htmlbarsSyntaxBuilders.default.text(' '), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('some'), [_htmlbarsSyntaxBuilders.default.string('content')]), _htmlbarsSyntaxBuilders.default.text(' '), _htmlbarsSyntaxBuilders.default.element("div", [_htmlbarsSyntaxBuilders.default.attr("class", _htmlbarsSyntaxBuilders.default.concat([_htmlbarsSyntaxBuilders.default.path('foo'), _htmlbarsSyntaxBuilders.default.string(' '), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('bind-class'), [_htmlbarsSyntaxBuilders.default.path('isEnabled')], _htmlbarsSyntaxBuilders.default.hash([_htmlbarsSyntaxBuilders.default.pair('truthy', _htmlbarsSyntaxBuilders.default.string('enabled'))]))]))], [], [_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('content'))]), _htmlbarsSyntaxBuilders.default.text(' '), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('more'), [_htmlbarsSyntaxBuilders.default.string('embed')])]));
  });

  test("Simple embedded block helpers", function () {
    var t = "{{#if foo}}<div>{{content}}</div>{{/if}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('if'), [_htmlbarsSyntaxBuilders.default.path('foo')], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('div', [], [], [_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('content'))])]))]));
  });

  test("Involved block helper", function () {
    var t = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('p', [], [], [_htmlbarsSyntaxBuilders.default.text('hi')]), _htmlbarsSyntaxBuilders.default.text(' content '), _htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('testing'), [_htmlbarsSyntaxBuilders.default.path('shouldRender')], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('p', [], [], [_htmlbarsSyntaxBuilders.default.text('Appears!')])])), _htmlbarsSyntaxBuilders.default.text(' more '), _htmlbarsSyntaxBuilders.default.element('em', [], [], [_htmlbarsSyntaxBuilders.default.text('content')]), _htmlbarsSyntaxBuilders.default.text(' here')]));
  });

  test("Element modifiers", function () {
    var t = "<p {{action 'boom'}} class='bar'>Some content</p>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('p', [_htmlbarsSyntaxBuilders.default.attr('class', _htmlbarsSyntaxBuilders.default.text('bar'))], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('action'), [_htmlbarsSyntaxBuilders.default.string('boom')])], [_htmlbarsSyntaxBuilders.default.text('Some content')])]));
  });

  test("Tokenizer: MustacheStatement encountered in tagName state", function () {
    var t = "<input{{bar}}>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('input', [], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('bar'))])]));
  });

  test("Tokenizer: MustacheStatement encountered in beforeAttributeName state", function () {
    var t = "<input {{bar}}>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('input', [], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('bar'))])]));
  });

  test("Tokenizer: MustacheStatement encountered in attributeName state", function () {
    var t = "<input foo{{bar}}>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('input', [_htmlbarsSyntaxBuilders.default.attr('foo', _htmlbarsSyntaxBuilders.default.text(''))], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('bar'))])]));
  });

  test("Tokenizer: MustacheStatement encountered in afterAttributeName state", function () {
    var t = "<input foo {{bar}}>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('input', [_htmlbarsSyntaxBuilders.default.attr('foo', _htmlbarsSyntaxBuilders.default.text(''))], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('bar'))])]));
  });

  test("Tokenizer: MustacheStatement encountered in afterAttributeValue state", function () {
    var t = "<input foo=1 {{bar}}>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('input', [_htmlbarsSyntaxBuilders.default.attr('foo', _htmlbarsSyntaxBuilders.default.text('1'))], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('bar'))])]));
  });

  test("Tokenizer: MustacheStatement encountered in afterAttributeValueQuoted state", function () {
    var t = "<input foo='1'{{bar}}>";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('input', [_htmlbarsSyntaxBuilders.default.attr('foo', _htmlbarsSyntaxBuilders.default.text('1'))], [_htmlbarsSyntaxBuilders.default.elementModifier(_htmlbarsSyntaxBuilders.default.path('bar'))])]));
  });

  test("Stripping - mustaches", function () {
    var t = "foo {{~content}} bar";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('foo'), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('content')), _htmlbarsSyntaxBuilders.default.text(' bar')]));

    t = "foo {{content~}} bar";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('foo '), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('content')), _htmlbarsSyntaxBuilders.default.text('bar')]));
  });

  test("Stripping - blocks", function () {
    var t = "foo {{~#wat}}{{/wat}} bar";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('foo'), _htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('wat'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program()), _htmlbarsSyntaxBuilders.default.text(' bar')]));

    t = "foo {{#wat}}{{/wat~}} bar";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('foo '), _htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('wat'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program()), _htmlbarsSyntaxBuilders.default.text('bar')]));
  });

  test("Stripping - programs", function () {
    var t = "{{#wat~}} foo {{else}}{{/wat}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('wat'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('foo ')]), _htmlbarsSyntaxBuilders.default.program())]));

    t = "{{#wat}} foo {{~else}}{{/wat}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('wat'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text(' foo')]), _htmlbarsSyntaxBuilders.default.program())]));

    t = "{{#wat}}{{else~}} foo {{/wat}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('wat'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text('foo ')]))]));

    t = "{{#wat}}{{else}} foo {{~/wat}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('wat'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text(' foo')]))]));
  });

  test("Stripping - removes unnecessary text nodes", function () {
    var t = "{{#each~}}\n  <li> foo </li>\n{{~/each}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.block(_htmlbarsSyntaxBuilders.default.path('each'), [], _htmlbarsSyntaxBuilders.default.hash(), _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.element('li', [], [], [_htmlbarsSyntaxBuilders.default.text(' foo ')])]))]));
  });

  // TODO: Make these throw an error.
  //test("Awkward mustache in unquoted attribute value", function() {
  //  var t = "<div class=a{{foo}}></div>";
  //  astEqual(t, b.program([
  //    b.element('div', [ b.attr('class', concat([b.string("a"), b.sexpr([b.path('foo')])])) ])
  //  ]));
  //
  //  t = "<div class=a{{foo}}b></div>";
  //  astEqual(t, b.program([
  //    b.element('div', [ b.attr('class', concat([b.string("a"), b.sexpr([b.path('foo')]), b.string("b")])) ])
  //  ]));
  //
  //  t = "<div class={{foo}}b></div>";
  //  astEqual(t, b.program([
  //    b.element('div', [ b.attr('class', concat([b.sexpr([b.path('foo')]), b.string("b")])) ])
  //  ]));
  //});

  test("Components", function () {
    var t = "<x-foo a=b c='d' e={{f}} id='{{bar}}' class='foo-{{bar}}'>{{a}}{{b}}c{{d}}</x-foo>{{e}}";
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.component('x-foo', [_htmlbarsSyntaxBuilders.default.attr('a', _htmlbarsSyntaxBuilders.default.text('b')), _htmlbarsSyntaxBuilders.default.attr('c', _htmlbarsSyntaxBuilders.default.text('d')), _htmlbarsSyntaxBuilders.default.attr('e', _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('f'))), _htmlbarsSyntaxBuilders.default.attr('id', _htmlbarsSyntaxBuilders.default.concat([_htmlbarsSyntaxBuilders.default.path('bar')])), _htmlbarsSyntaxBuilders.default.attr('class', _htmlbarsSyntaxBuilders.default.concat([_htmlbarsSyntaxBuilders.default.string('foo-'), _htmlbarsSyntaxBuilders.default.path('bar')]))], _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('a')), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('b')), _htmlbarsSyntaxBuilders.default.text('c'), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('d'))])), _htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('e'))]));
  });

  test("Components with disableComponentGeneration", function () {
    var t = "begin <x-foo>content</x-foo> finish";
    var actual = _htmlbarsSyntax.parse(t, {
      disableComponentGeneration: true
    });

    _support.astEqual(actual, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("begin "), _htmlbarsSyntaxBuilders.default.element("x-foo", [], [], [_htmlbarsSyntaxBuilders.default.text("content")]), _htmlbarsSyntaxBuilders.default.text(" finish")]));
  });

  test("Components with disableComponentGeneration === false", function () {
    var t = "begin <x-foo>content</x-foo> finish";
    var actual = _htmlbarsSyntax.parse(t, {
      disableComponentGeneration: false
    });

    _support.astEqual(actual, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("begin "), _htmlbarsSyntaxBuilders.default.component("x-foo", [], _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("content")])), _htmlbarsSyntaxBuilders.default.text(" finish")]));
  });

  test("an HTML comment", function () {
    var t = 'before <!-- some comment --> after';
    _support.astEqual(t, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.text("before "), _htmlbarsSyntaxBuilders.default.comment(" some comment "), _htmlbarsSyntaxBuilders.default.text(" after")]));
  });

  test("allow {{null}} to be passed as helper name", function () {
    var ast = _htmlbarsSyntax.parse("{{null}}");

    _support.astEqual(ast, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.null())]));
  });

  test("allow {{null}} to be passed as a param", function () {
    var ast = _htmlbarsSyntax.parse("{{foo null}}");

    _support.astEqual(ast, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('foo'), [_htmlbarsSyntaxBuilders.default.null()])]));
  });

  test("allow {{undefined}} to be passed as helper name", function () {
    var ast = _htmlbarsSyntax.parse("{{undefined}}");

    _support.astEqual(ast, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.undefined())]));
  });

  test("allow {{undefined}} to be passed as a param", function () {
    var ast = _htmlbarsSyntax.parse("{{foo undefined}}");

    _support.astEqual(ast, _htmlbarsSyntaxBuilders.default.program([_htmlbarsSyntaxBuilders.default.mustache(_htmlbarsSyntaxBuilders.default.path('foo'), [_htmlbarsSyntaxBuilders.default.undefined()])]));
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9wYXJzZXItbm9kZS10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsT0FBSyxDQUFDLE1BQU0sQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDOztBQUU1RCxNQUFJLENBQUMsMkJBQTJCLEVBQUUsWUFBVztBQUMzQyxRQUFJLENBQUMsR0FBRyxjQUFjLENBQUM7QUFDdkIsYUFOTyxRQUFRLENBTU4sQ0FBQyxFQUFFLGdDQUFFLE9BQU8sQ0FBQyxDQUNwQixnQ0FBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQ3ZCLENBQUMsQ0FBQyxDQUFDO0dBQ0wsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQywrQkFBK0IsRUFBRSxZQUFXO0FBQy9DLFFBQUksR0FBRyxHQUFHLGdCQWRILEtBQUssQ0FjSSxzQ0FmVCxLQUFLLENBZW9CLFFBQVEsQ0FBQyxDQUFDLENBQUM7O0FBRTNDLGFBZE8sUUFBUSxDQWNOLEdBQUcsRUFBRSxnQ0FBRSxPQUFPLENBQUMsQ0FDdEIsZ0NBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUNqQixDQUFDLENBQUMsQ0FBQztHQUNMLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsMENBQTBDLEVBQUUsWUFBVztBQUMxRCxRQUFJLEdBQUcsR0FBRyxnQkF0QkgsS0FBSyxDQXNCSSxzQ0F2QlQsS0FBSyxDQXVCb0IsMkJBQTJCLENBQUMsQ0FBQyxDQUFDOztBQUU5RCxhQXRCTyxRQUFRLENBc0JOLEdBQUcsRUFBRSxnQ0FBRSxPQUFPLENBQUMsQ0FDdEIsZ0NBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQ3RCLGdDQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FDZixDQUFDLEVBQ0YsZ0NBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUNmLGdDQUFFLFFBQVEsQ0FBQyxnQ0FBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDMUIsQ0FBQyxDQUFDLENBQUM7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QU8sQ0FBQyxDQUN0QixnQ0FBRSxRQUFRLENBQUMsZ0NBQUUsU0FBUyxFQUFFLENBQUMsQ0FDMUIsQ0FBQyxDQUFDLENBQUM7R0FDTCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLDZDQUE2QyxFQUFFLFlBQVc7QUFDN0QsUUFBSSxHQUFHLEdBQUcsZ0JBbmNILEtBQUssQ0FtY0ksbUJBQW1CLENBQUMsQ0FBQzs7QUFFckMsYUFuY08sUUFBUSxDQW1jTixHQUFHLEVBQUUsZ0NBQUUsT0FBTyxDQUFDLENBQ3RCLGdDQUFFLFFBQVEsQ0FBQyxnQ0FBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxnQ0FBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQzNDLENBQUMsQ0FBQyxDQUFDO0dBQ0wsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9wYXJzZXItbm9kZS10ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyc2UgYXMgaGFuZGxlYmFyc1BhcnNlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheC9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2VcIjtcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheFwiO1xuaW1wb3J0IGIgZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheC9idWlsZGVyc1wiO1xuaW1wb3J0IHsgYXN0RXF1YWwgfSBmcm9tIFwiLi9zdXBwb3J0XCI7XG5cblFVbml0Lm1vZHVsZShcIltodG1sYmFycy1zeW50YXhdIEhUTUwtYmFzZWQgY29tcGlsZXIgKEFTVClcIik7XG5cbnRlc3QoXCJhIHNpbXBsZSBwaWVjZSBvZiBjb250ZW50XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICdzb21lIGNvbnRlbnQnO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIudGV4dCgnc29tZSBjb250ZW50JylcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJhbGxvdyBzaW1wbGUgQVNUIHRvIGJlIHBhc3NlZFwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKGhhbmRsZWJhcnNQYXJzZShcInNpbXBsZVwiKSk7XG5cbiAgYXN0RXF1YWwoYXN0LCBiLnByb2dyYW0oW1xuICAgIGIudGV4dChcInNpbXBsZVwiKVxuICBdKSk7XG59KTtcblxudGVzdChcImFsbG93IGFuIEFTVCB3aXRoIG11c3RhY2hlcyB0byBiZSBwYXNzZWRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBhc3QgPSBwYXJzZShoYW5kbGViYXJzUGFyc2UoXCI8aDE+c29tZTwvaDE+IGFzdCB7e2Zvb319XCIpKTtcblxuICBhc3RFcXVhbChhc3QsIGIucHJvZ3JhbShbXG4gICAgYi5lbGVtZW50KFwiaDFcIiwgW10sIFtdLCBbXG4gICAgICBiLnRleHQoXCJzb21lXCIpXG4gICAgXSksXG4gICAgYi50ZXh0KFwiIGFzdCBcIiksXG4gICAgYi5tdXN0YWNoZShiLnBhdGgoJ2ZvbycpKVxuICBdKSk7XG59KTtcblxudGVzdChcInNlbGYtY2xvc2VkIGVsZW1lbnRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gJzxnIC8+JztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoXCJnXCIpXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiZWxlbWVudHMgY2FuIGhhdmUgZW1wdHkgYXR0cmlidXRlc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSAnPGltZyBpZD1cIlwiPic7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi5lbGVtZW50KFwiaW1nXCIsIFtcbiAgICAgIGIuYXR0cihcImlkXCIsIGIudGV4dChcIlwiKSlcbiAgICBdKVxuICBdKSk7XG59KTtcblxudGVzdChcInN2ZyBjb250ZW50XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IFwiPHN2Zz48L3N2Zz5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoXCJzdmdcIilcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJodG1sIGNvbnRlbnQgd2l0aCBodG1sIGNvbnRlbnQgaW5saW5lXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICc8ZGl2PjxwPjwvcD48L2Rpdj4nO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIuZWxlbWVudChcImRpdlwiLCBbXSwgW10sIFtcbiAgICAgIGIuZWxlbWVudChcInBcIilcbiAgICBdKVxuICBdKSk7XG59KTtcblxudGVzdChcImh0bWwgY29udGVudCB3aXRoIHN2ZyBjb250ZW50IGlubGluZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSAnPGRpdj48c3ZnPjwvc3ZnPjwvZGl2Pic7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi5lbGVtZW50KFwiZGl2XCIsIFtdLCBbXSwgW1xuICAgICAgYi5lbGVtZW50KFwic3ZnXCIpXG4gICAgXSlcbiAgXSkpO1xufSk7XG5cbnZhciBpbnRlZ3JhdGlvblBvaW50cyA9IFsnZm9yZWlnbk9iamVjdCcsICdkZXNjJywgJ3RpdGxlJ107XG5mdW5jdGlvbiBidWlsZEludGVncmF0aW9uUG9pbnRUZXN0KGludGVncmF0aW9uUG9pbnQpe1xuICByZXR1cm4gZnVuY3Rpb24gaW50ZWdyYXRpb25Qb2ludFRlc3QoKXtcbiAgICB2YXIgdCA9ICc8c3ZnPjwnK2ludGVncmF0aW9uUG9pbnQrJz48ZGl2PjwvZGl2PjwvJytpbnRlZ3JhdGlvblBvaW50Kyc+PC9zdmc+JztcbiAgICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgICAgYi5lbGVtZW50KFwic3ZnXCIsIFtdLCBbXSwgW1xuICAgICAgICBiLmVsZW1lbnQoaW50ZWdyYXRpb25Qb2ludCwgW10sIFtdLCBbXG4gICAgICAgICAgYi5lbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIF0pXG4gICAgICBdKVxuICAgIF0pKTtcbiAgfTtcbn1cbmZvciAodmFyIGk9MCwgbGVuZ3RoID0gaW50ZWdyYXRpb25Qb2ludHMubGVuZ3RoOyBpPGxlbmd0aDsgaSsrKSB7XG4gIHRlc3QoXG4gICAgXCJzdmcgY29udGVudCB3aXRoIGh0bWwgY29udGVudCBpbmxpbmUgZm9yIFwiK2ludGVncmF0aW9uUG9pbnRzW2ldLFxuICAgIGJ1aWxkSW50ZWdyYXRpb25Qb2ludFRlc3QoaW50ZWdyYXRpb25Qb2ludHNbaV0pXG4gICk7XG59XG5cbnRlc3QoXCJhIHBpZWNlIG9mIGNvbnRlbnQgd2l0aCBIVE1MXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICdzb21lIDxkaXY+Y29udGVudDwvZGl2PiBkb25lJztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoXCJzb21lIFwiKSxcbiAgICBiLmVsZW1lbnQoXCJkaXZcIiwgW10sIFtdLCBbXG4gICAgICBiLnRleHQoXCJjb250ZW50XCIpXG4gICAgXSksXG4gICAgYi50ZXh0KFwiIGRvbmVcIilcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJhIHBpZWNlIG9mIEhhbmRsZWJhcnMgd2l0aCBIVE1MXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICdzb21lIDxkaXY+e3tjb250ZW50fX08L2Rpdj4gZG9uZSc7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi50ZXh0KFwic29tZSBcIiksXG4gICAgYi5lbGVtZW50KFwiZGl2XCIsIFtdLCBbXSwgW1xuICAgICAgYi5tdXN0YWNoZShiLnBhdGgoJ2NvbnRlbnQnKSlcbiAgICBdKSxcbiAgICBiLnRleHQoXCIgZG9uZVwiKVxuICBdKSk7XG59KTtcblxudGVzdChcIkhhbmRsZWJhcnMgZW1iZWRkZWQgaW4gYW4gYXR0cmlidXRlIChxdW90ZWQpXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICdzb21lIDxkaXYgY2xhc3M9XCJ7e2Zvb319XCI+Y29udGVudDwvZGl2PiBkb25lJztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoXCJzb21lIFwiKSxcbiAgICBiLmVsZW1lbnQoXCJkaXZcIiwgWyBiLmF0dHIoXCJjbGFzc1wiLCBiLmNvbmNhdChbIGIucGF0aCgnZm9vJykgXSkpIF0sIFtdLCBbXG4gICAgICBiLnRleHQoXCJjb250ZW50XCIpXG4gICAgXSksXG4gICAgYi50ZXh0KFwiIGRvbmVcIilcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJIYW5kbGViYXJzIGVtYmVkZGVkIGluIGFuIGF0dHJpYnV0ZSAodW5xdW90ZWQpXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICdzb21lIDxkaXYgY2xhc3M9e3tmb299fT5jb250ZW50PC9kaXY+IGRvbmUnO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIudGV4dChcInNvbWUgXCIpLFxuICAgIGIuZWxlbWVudChcImRpdlwiLCBbIGIuYXR0cihcImNsYXNzXCIsIGIubXVzdGFjaGUoYi5wYXRoKCdmb28nKSkpIF0sIFtdLCBbXG4gICAgICBiLnRleHQoXCJjb250ZW50XCIpXG4gICAgXSksXG4gICAgYi50ZXh0KFwiIGRvbmVcIilcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJIYW5kbGViYXJzIGVtYmVkZGVkIGluIGFuIGF0dHJpYnV0ZSAoc2V4cHJzKVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSAnc29tZSA8ZGl2IGNsYXNzPVwie3tmb28gKGZvbyBcImFiY1wiKX19XCI+Y29udGVudDwvZGl2PiBkb25lJztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoXCJzb21lIFwiKSxcbiAgICBiLmVsZW1lbnQoXCJkaXZcIiwgW1xuICAgICAgYi5hdHRyKFwiY2xhc3NcIiwgYi5jb25jYXQoWyBiLm11c3RhY2hlKGIucGF0aCgnZm9vJyksIFsgYi5zZXhwcihiLnBhdGgoJ2ZvbycpLCBbIGIuc3RyaW5nKCdhYmMnKSBdKSBdKSBdKSlcbiAgICBdLCBbXSwgW1xuICAgICAgYi50ZXh0KFwiY29udGVudFwiKVxuICAgIF0pLFxuICAgIGIudGV4dChcIiBkb25lXCIpXG4gIF0pKTtcbn0pO1xuXG5cbnRlc3QoXCJIYW5kbGViYXJzIGVtYmVkZGVkIGluIGFuIGF0dHJpYnV0ZSB3aXRoIG90aGVyIGNvbnRlbnQgc3Vycm91bmRpbmcgaXRcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gJ3NvbWUgPGEgaHJlZj1cImh0dHA6Ly97e2xpbmt9fS9cIj5jb250ZW50PC9hPiBkb25lJztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoXCJzb21lIFwiKSxcbiAgICBiLmVsZW1lbnQoXCJhXCIsIFtcbiAgICAgIGIuYXR0cihcImhyZWZcIiwgYi5jb25jYXQoW1xuICAgICAgICBiLnN0cmluZyhcImh0dHA6Ly9cIiksXG4gICAgICAgIGIucGF0aCgnbGluaycpLFxuICAgICAgICBiLnN0cmluZyhcIi9cIilcbiAgICAgIF0pKVxuICAgIF0sIFtdLCBbXG4gICAgICBiLnRleHQoXCJjb250ZW50XCIpXG4gICAgXSksXG4gICAgYi50ZXh0KFwiIGRvbmVcIilcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJBIG1vcmUgY29tcGxldGUgZW1iZWRkaW5nIGV4YW1wbGVcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gXCJ7e2VtYmVkfX0ge3tzb21lICdjb250ZW50J319IFwiICtcbiAgICAgICAgICBcIjxkaXYgY2xhc3M9J3t7Zm9vfX0ge3tiaW5kLWNsYXNzIGlzRW5hYmxlZCB0cnV0aHk9J2VuYWJsZWQnfX0nPnt7IGNvbnRlbnQgfX08L2Rpdj5cIiArXG4gICAgICAgICAgXCIge3ttb3JlICdlbWJlZCd9fVwiO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIubXVzdGFjaGUoYi5wYXRoKCdlbWJlZCcpKSxcbiAgICBiLnRleHQoJyAnKSxcbiAgICBiLm11c3RhY2hlKGIucGF0aCgnc29tZScpLCBbYi5zdHJpbmcoJ2NvbnRlbnQnKV0pLFxuICAgIGIudGV4dCgnICcpLFxuICAgIGIuZWxlbWVudChcImRpdlwiLCBbXG4gICAgICBiLmF0dHIoXCJjbGFzc1wiLCBiLmNvbmNhdChbXG4gICAgICAgIGIucGF0aCgnZm9vJyksXG4gICAgICAgIGIuc3RyaW5nKCcgJyksXG4gICAgICAgIGIubXVzdGFjaGUoYi5wYXRoKCdiaW5kLWNsYXNzJyksIFtiLnBhdGgoJ2lzRW5hYmxlZCcpXSwgYi5oYXNoKFtiLnBhaXIoJ3RydXRoeScsIGIuc3RyaW5nKCdlbmFibGVkJykpXSkpXG4gICAgICBdKSlcbiAgICBdLCBbXSwgW1xuICAgICAgYi5tdXN0YWNoZShiLnBhdGgoJ2NvbnRlbnQnKSlcbiAgICBdKSxcbiAgICBiLnRleHQoJyAnKSxcbiAgICBiLm11c3RhY2hlKGIucGF0aCgnbW9yZScpLCBbYi5zdHJpbmcoJ2VtYmVkJyldKVxuICBdKSk7XG59KTtcblxudGVzdChcIlNpbXBsZSBlbWJlZGRlZCBibG9jayBoZWxwZXJzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IFwie3sjaWYgZm9vfX08ZGl2Pnt7Y29udGVudH19PC9kaXY+e3svaWZ9fVwiO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIuYmxvY2soYi5wYXRoKCdpZicpLCBbYi5wYXRoKCdmb28nKV0sIGIuaGFzaCgpLCBiLnByb2dyYW0oW1xuICAgICAgYi5lbGVtZW50KCdkaXYnLCBbXSwgW10sIFtcbiAgICAgICAgYi5tdXN0YWNoZShiLnBhdGgoJ2NvbnRlbnQnKSlcbiAgICAgIF0pXG4gICAgXSkpXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiSW52b2x2ZWQgYmxvY2sgaGVscGVyXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICc8cD5oaTwvcD4gY29udGVudCB7eyN0ZXN0aW5nIHNob3VsZFJlbmRlcn19PHA+QXBwZWFycyE8L3A+e3svdGVzdGluZ319IG1vcmUgPGVtPmNvbnRlbnQ8L2VtPiBoZXJlJztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ3AnLCBbXSwgW10sIFtcbiAgICAgIGIudGV4dCgnaGknKVxuICAgIF0pLFxuICAgIGIudGV4dCgnIGNvbnRlbnQgJyksXG4gICAgYi5ibG9jayhiLnBhdGgoJ3Rlc3RpbmcnKSwgW2IucGF0aCgnc2hvdWxkUmVuZGVyJyldLCBiLmhhc2goKSwgYi5wcm9ncmFtKFtcbiAgICAgIGIuZWxlbWVudCgncCcsIFtdLCBbXSwgW1xuICAgICAgICBiLnRleHQoJ0FwcGVhcnMhJylcbiAgICAgIF0pXG4gICAgXSkpLFxuICAgIGIudGV4dCgnIG1vcmUgJyksXG4gICAgYi5lbGVtZW50KCdlbScsIFtdLCBbXSwgW1xuICAgICAgYi50ZXh0KCdjb250ZW50JylcbiAgICBdKSxcbiAgICBiLnRleHQoJyBoZXJlJylcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJFbGVtZW50IG1vZGlmaWVyc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSBcIjxwIHt7YWN0aW9uICdib29tJ319IGNsYXNzPSdiYXInPlNvbWUgY29udGVudDwvcD5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ3AnLCBbIGIuYXR0cignY2xhc3MnLCBiLnRleHQoJ2JhcicpKSBdLCBbXG4gICAgICBiLmVsZW1lbnRNb2RpZmllcihiLnBhdGgoJ2FjdGlvbicpLCBbYi5zdHJpbmcoJ2Jvb20nKV0pXG4gICAgXSwgW1xuICAgICAgYi50ZXh0KCdTb21lIGNvbnRlbnQnKVxuICAgIF0pXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiVG9rZW5pemVyOiBNdXN0YWNoZVN0YXRlbWVudCBlbmNvdW50ZXJlZCBpbiB0YWdOYW1lIHN0YXRlXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IFwiPGlucHV0e3tiYXJ9fT5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ2lucHV0JywgW10sIFsgYi5lbGVtZW50TW9kaWZpZXIoYi5wYXRoKCdiYXInKSkgXSlcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJUb2tlbml6ZXI6IE11c3RhY2hlU3RhdGVtZW50IGVuY291bnRlcmVkIGluIGJlZm9yZUF0dHJpYnV0ZU5hbWUgc3RhdGVcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gXCI8aW5wdXQge3tiYXJ9fT5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ2lucHV0JywgW10sIFsgYi5lbGVtZW50TW9kaWZpZXIoYi5wYXRoKCdiYXInKSkgXSlcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJUb2tlbml6ZXI6IE11c3RhY2hlU3RhdGVtZW50IGVuY291bnRlcmVkIGluIGF0dHJpYnV0ZU5hbWUgc3RhdGVcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gXCI8aW5wdXQgZm9ve3tiYXJ9fT5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ2lucHV0JywgWyBiLmF0dHIoJ2ZvbycsIGIudGV4dCgnJykpIF0sIFsgYi5lbGVtZW50TW9kaWZpZXIoYi5wYXRoKCdiYXInKSkgXSlcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJUb2tlbml6ZXI6IE11c3RhY2hlU3RhdGVtZW50IGVuY291bnRlcmVkIGluIGFmdGVyQXR0cmlidXRlTmFtZSBzdGF0ZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSBcIjxpbnB1dCBmb28ge3tiYXJ9fT5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ2lucHV0JywgWyBiLmF0dHIoJ2ZvbycsIGIudGV4dCgnJykpIF0sIFsgYi5lbGVtZW50TW9kaWZpZXIoYi5wYXRoKCdiYXInKSkgXSlcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJUb2tlbml6ZXI6IE11c3RhY2hlU3RhdGVtZW50IGVuY291bnRlcmVkIGluIGFmdGVyQXR0cmlidXRlVmFsdWUgc3RhdGVcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gXCI8aW5wdXQgZm9vPTEge3tiYXJ9fT5cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmVsZW1lbnQoJ2lucHV0JywgWyBiLmF0dHIoJ2ZvbycsIGIudGV4dCgnMScpKSBdLCBbIGIuZWxlbWVudE1vZGlmaWVyKGIucGF0aCgnYmFyJykpIF0pXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiVG9rZW5pemVyOiBNdXN0YWNoZVN0YXRlbWVudCBlbmNvdW50ZXJlZCBpbiBhZnRlckF0dHJpYnV0ZVZhbHVlUXVvdGVkIHN0YXRlXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IFwiPGlucHV0IGZvbz0nMSd7e2Jhcn19PlwiO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIuZWxlbWVudCgnaW5wdXQnLCBbIGIuYXR0cignZm9vJywgYi50ZXh0KCcxJykpIF0sIFsgYi5lbGVtZW50TW9kaWZpZXIoYi5wYXRoKCdiYXInKSkgXSlcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJTdHJpcHBpbmcgLSBtdXN0YWNoZXNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gXCJmb28ge3t+Y29udGVudH19IGJhclwiO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIudGV4dCgnZm9vJyksXG4gICAgYi5tdXN0YWNoZShiLnBhdGgoJ2NvbnRlbnQnKSksXG4gICAgYi50ZXh0KCcgYmFyJylcbiAgXSkpO1xuXG4gIHQgPSBcImZvbyB7e2NvbnRlbnR+fX0gYmFyXCI7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi50ZXh0KCdmb28gJyksXG4gICAgYi5tdXN0YWNoZShiLnBhdGgoJ2NvbnRlbnQnKSksXG4gICAgYi50ZXh0KCdiYXInKVxuICBdKSk7XG59KTtcblxudGVzdChcIlN0cmlwcGluZyAtIGJsb2Nrc1wiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSBcImZvbyB7e34jd2F0fX17ey93YXR9fSBiYXJcIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoJ2ZvbycpLFxuICAgIGIuYmxvY2soYi5wYXRoKCd3YXQnKSwgW10sIGIuaGFzaCgpLCBiLnByb2dyYW0oKSksXG4gICAgYi50ZXh0KCcgYmFyJylcbiAgXSkpO1xuXG4gIHQgPSBcImZvbyB7eyN3YXR9fXt7L3dhdH59fSBiYXJcIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoJ2ZvbyAnKSxcbiAgICBiLmJsb2NrKGIucGF0aCgnd2F0JyksIFtdLCBiLmhhc2goKSwgYi5wcm9ncmFtKCkpLFxuICAgIGIudGV4dCgnYmFyJylcbiAgXSkpO1xufSk7XG5cblxudGVzdChcIlN0cmlwcGluZyAtIHByb2dyYW1zXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IFwie3sjd2F0fn19IGZvbyB7e2Vsc2V9fXt7L3dhdH19XCI7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi5ibG9jayhiLnBhdGgoJ3dhdCcpLCBbXSwgYi5oYXNoKCksIGIucHJvZ3JhbShbXG4gICAgICBiLnRleHQoJ2ZvbyAnKVxuICAgIF0pLCBiLnByb2dyYW0oKSlcbiAgXSkpO1xuXG4gIHQgPSBcInt7I3dhdH19IGZvbyB7e35lbHNlfX17ey93YXR9fVwiO1xuICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuICAgIGIuYmxvY2soYi5wYXRoKCd3YXQnKSwgW10sIGIuaGFzaCgpLCBiLnByb2dyYW0oW1xuICAgICAgYi50ZXh0KCcgZm9vJylcbiAgICBdKSwgYi5wcm9ncmFtKCkpXG4gIF0pKTtcblxuICB0ID0gXCJ7eyN3YXR9fXt7ZWxzZX59fSBmb28ge3svd2F0fX1cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmJsb2NrKGIucGF0aCgnd2F0JyksIFtdLCBiLmhhc2goKSwgYi5wcm9ncmFtKCksIGIucHJvZ3JhbShbXG4gICAgICBiLnRleHQoJ2ZvbyAnKVxuICAgIF0pKVxuICBdKSk7XG5cbiAgdCA9IFwie3sjd2F0fX17e2Vsc2V9fSBmb28ge3t+L3dhdH19XCI7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi5ibG9jayhiLnBhdGgoJ3dhdCcpLCBbXSwgYi5oYXNoKCksIGIucHJvZ3JhbSgpLCBiLnByb2dyYW0oW1xuICAgICAgYi50ZXh0KCcgZm9vJylcbiAgICBdKSlcbiAgXSkpO1xufSk7XG5cbnRlc3QoXCJTdHJpcHBpbmcgLSByZW1vdmVzIHVubmVjZXNzYXJ5IHRleHQgbm9kZXNcIiwgZnVuY3Rpb24oKSB7XG4gIHZhciB0ID0gXCJ7eyNlYWNofn19XFxuICA8bGk+IGZvbyA8L2xpPlxcbnt7fi9lYWNofX1cIjtcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLmJsb2NrKGIucGF0aCgnZWFjaCcpLCBbXSwgYi5oYXNoKCksIGIucHJvZ3JhbShbXG4gICAgICBiLmVsZW1lbnQoJ2xpJywgW10sIFtdLCBbYi50ZXh0KCcgZm9vICcpXSlcbiAgICBdKSlcbiAgXSkpO1xufSk7XG5cbi8vIFRPRE86IE1ha2UgdGhlc2UgdGhyb3cgYW4gZXJyb3IuXG4vL3Rlc3QoXCJBd2t3YXJkIG11c3RhY2hlIGluIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZVwiLCBmdW5jdGlvbigpIHtcbi8vICB2YXIgdCA9IFwiPGRpdiBjbGFzcz1he3tmb299fT48L2Rpdj5cIjtcbi8vICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuLy8gICAgYi5lbGVtZW50KCdkaXYnLCBbIGIuYXR0cignY2xhc3MnLCBjb25jYXQoW2Iuc3RyaW5nKFwiYVwiKSwgYi5zZXhwcihbYi5wYXRoKCdmb28nKV0pXSkpIF0pXG4vLyAgXSkpO1xuLy9cbi8vICB0ID0gXCI8ZGl2IGNsYXNzPWF7e2Zvb319Yj48L2Rpdj5cIjtcbi8vICBhc3RFcXVhbCh0LCBiLnByb2dyYW0oW1xuLy8gICAgYi5lbGVtZW50KCdkaXYnLCBbIGIuYXR0cignY2xhc3MnLCBjb25jYXQoW2Iuc3RyaW5nKFwiYVwiKSwgYi5zZXhwcihbYi5wYXRoKCdmb28nKV0pLCBiLnN0cmluZyhcImJcIildKSkgXSlcbi8vICBdKSk7XG4vL1xuLy8gIHQgPSBcIjxkaXYgY2xhc3M9e3tmb299fWI+PC9kaXY+XCI7XG4vLyAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbi8vICAgIGIuZWxlbWVudCgnZGl2JywgWyBiLmF0dHIoJ2NsYXNzJywgY29uY2F0KFtiLnNleHByKFtiLnBhdGgoJ2ZvbycpXSksIGIuc3RyaW5nKFwiYlwiKV0pKSBdKVxuLy8gIF0pKTtcbi8vfSk7XG5cbnRlc3QoXCJDb21wb25lbnRzXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IFwiPHgtZm9vIGE9YiBjPSdkJyBlPXt7Zn19IGlkPSd7e2Jhcn19JyBjbGFzcz0nZm9vLXt7YmFyfX0nPnt7YX19e3tifX1je3tkfX08L3gtZm9vPnt7ZX19XCI7XG4gIGFzdEVxdWFsKHQsIGIucHJvZ3JhbShbXG4gICAgYi5jb21wb25lbnQoJ3gtZm9vJywgW1xuICAgICAgYi5hdHRyKCdhJywgYi50ZXh0KCdiJykpLFxuICAgICAgYi5hdHRyKCdjJywgYi50ZXh0KCdkJykpLFxuICAgICAgYi5hdHRyKCdlJywgYi5tdXN0YWNoZShiLnBhdGgoJ2YnKSkpLFxuICAgICAgYi5hdHRyKCdpZCcsIGIuY29uY2F0KFsgYi5wYXRoKCdiYXInKSBdKSksXG4gICAgICBiLmF0dHIoJ2NsYXNzJywgYi5jb25jYXQoWyBiLnN0cmluZygnZm9vLScpLCBiLnBhdGgoJ2JhcicpIF0pKVxuICAgIF0sIGIucHJvZ3JhbShbXG4gICAgICBiLm11c3RhY2hlKGIucGF0aCgnYScpKSxcbiAgICAgIGIubXVzdGFjaGUoYi5wYXRoKCdiJykpLFxuICAgICAgYi50ZXh0KCdjJyksXG4gICAgICBiLm11c3RhY2hlKGIucGF0aCgnZCcpKVxuICAgIF0pKSxcbiAgICBiLm11c3RhY2hlKGIucGF0aCgnZScpKVxuICBdKSk7XG59KTtcblxudGVzdChcIkNvbXBvbmVudHMgd2l0aCBkaXNhYmxlQ29tcG9uZW50R2VuZXJhdGlvblwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSBcImJlZ2luIDx4LWZvbz5jb250ZW50PC94LWZvbz4gZmluaXNoXCI7XG4gIHZhciBhY3R1YWwgPSBwYXJzZSh0LCB7XG4gICAgZGlzYWJsZUNvbXBvbmVudEdlbmVyYXRpb246IHRydWVcbiAgfSk7XG5cbiAgYXN0RXF1YWwoYWN0dWFsLCBiLnByb2dyYW0oW1xuICAgIGIudGV4dChcImJlZ2luIFwiKSxcbiAgICBiLmVsZW1lbnQoXCJ4LWZvb1wiLCBbXSwgW10sIFtcbiAgICAgIGIudGV4dChcImNvbnRlbnRcIilcbiAgICBdKSxcbiAgICBiLnRleHQoXCIgZmluaXNoXCIpXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiQ29tcG9uZW50cyB3aXRoIGRpc2FibGVDb21wb25lbnRHZW5lcmF0aW9uID09PSBmYWxzZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIHQgPSBcImJlZ2luIDx4LWZvbz5jb250ZW50PC94LWZvbz4gZmluaXNoXCI7XG4gIHZhciBhY3R1YWwgPSBwYXJzZSh0LCB7XG4gICAgZGlzYWJsZUNvbXBvbmVudEdlbmVyYXRpb246IGZhbHNlXG4gIH0pO1xuXG4gIGFzdEVxdWFsKGFjdHVhbCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoXCJiZWdpbiBcIiksXG4gICAgYi5jb21wb25lbnQoXCJ4LWZvb1wiLCBbXSxcbiAgICAgIGIucHJvZ3JhbShbXG4gICAgICAgIGIudGV4dChcImNvbnRlbnRcIilcbiAgICAgIF0pXG4gICAgKSxcbiAgICBiLnRleHQoXCIgZmluaXNoXCIpXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiYW4gSFRNTCBjb21tZW50XCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9ICdiZWZvcmUgPCEtLSBzb21lIGNvbW1lbnQgLS0+IGFmdGVyJztcbiAgYXN0RXF1YWwodCwgYi5wcm9ncmFtKFtcbiAgICBiLnRleHQoXCJiZWZvcmUgXCIpLFxuICAgIGIuY29tbWVudChcIiBzb21lIGNvbW1lbnQgXCIpLFxuICAgIGIudGV4dChcIiBhZnRlclwiKVxuICBdKSk7XG59KTtcblxudGVzdChcImFsbG93IHt7bnVsbH19IHRvIGJlIHBhc3NlZCBhcyBoZWxwZXIgbmFtZVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKFwie3tudWxsfX1cIik7XG5cbiAgYXN0RXF1YWwoYXN0LCBiLnByb2dyYW0oW1xuICAgIGIubXVzdGFjaGUoYi5udWxsKCkpXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiYWxsb3cge3tudWxsfX0gdG8gYmUgcGFzc2VkIGFzIGEgcGFyYW1cIiwgZnVuY3Rpb24oKSB7XG4gIHZhciBhc3QgPSBwYXJzZShcInt7Zm9vIG51bGx9fVwiKTtcblxuICBhc3RFcXVhbChhc3QsIGIucHJvZ3JhbShbXG4gICAgYi5tdXN0YWNoZShiLnBhdGgoJ2ZvbycpLCBbYi5udWxsKCldKVxuICBdKSk7XG59KTtcblxudGVzdChcImFsbG93IHt7dW5kZWZpbmVkfX0gdG8gYmUgcGFzc2VkIGFzIGhlbHBlciBuYW1lXCIsIGZ1bmN0aW9uKCkge1xuICB2YXIgYXN0ID0gcGFyc2UoXCJ7e3VuZGVmaW5lZH19XCIpO1xuXG4gIGFzdEVxdWFsKGFzdCwgYi5wcm9ncmFtKFtcbiAgICBiLm11c3RhY2hlKGIudW5kZWZpbmVkKCkpXG4gIF0pKTtcbn0pO1xuXG50ZXN0KFwiYWxsb3cge3t1bmRlZmluZWR9fSB0byBiZSBwYXNzZWQgYXMgYSBwYXJhbVwiLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFzdCA9IHBhcnNlKFwie3tmb28gdW5kZWZpbmVkfX1cIik7XG5cbiAgYXN0RXF1YWwoYXN0LCBiLnByb2dyYW0oW1xuICAgIGIubXVzdGFjaGUoYi5wYXRoKCdmb28nKSwgW2IudW5kZWZpbmVkKCldKVxuICBdKSk7XG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/parser-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests');
  QUnit.test('htmlbars-syntax-tests/parser-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/parser-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9wYXJzZXItbm9kZS10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9DLE9BQUssQ0FBQyxJQUFJLENBQUMsOERBQThELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDMUYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsK0RBQStELENBQUMsQ0FBQztHQUNsRixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3BhcnNlci1ub2RlLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9wYXJzZXItbm9kZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy1zeW50YXgtdGVzdHMvcGFyc2VyLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/plugin-node-test', ['exports', '../htmlbars-syntax'], function (exports, _htmlbarsSyntax) {

  QUnit.module('[htmlbars-syntax] Compiler plugins: AST');

  test('AST plugins can be provided to the compiler', function () {
    expect(1);

    function Plugin() {}
    Plugin.prototype.transform = function () {
      ok(true, 'transform was called!');
    };

    _htmlbarsSyntax.parse('<div></div>', {
      plugins: {
        ast: [Plugin]
      }
    });
  });

  test('provides syntax package as `syntax` prop if value is null', function () {
    expect(1);

    function Plugin() {}
    Plugin.prototype.transform = function () {
      equal(this.syntax.Walker, _htmlbarsSyntax.Walker);
    };

    _htmlbarsSyntax.parse('<div></div>', {
      plugins: {
        ast: [Plugin]
      }
    });
  });

  test('AST plugins can modify the AST', function () {
    expect(1);

    var expected = "OOOPS, MESSED THAT UP!";

    function Plugin() {}
    Plugin.prototype.transform = function () {
      return expected;
    };

    var ast = _htmlbarsSyntax.parse('<div></div>', {
      plugins: {
        ast: [Plugin]
      }
    });

    equal(ast, expected, 'return value from AST transform is used');
  });

  test('AST plugins can be chained', function () {
    expect(2);

    var expected = "OOOPS, MESSED THAT UP!";

    function Plugin() {}
    Plugin.prototype.transform = function () {
      return expected;
    };

    function SecondaryPlugin() {}
    SecondaryPlugin.prototype.transform = function (ast) {
      equal(ast, expected, 'return value from AST transform is used');

      return 'BOOM!';
    };

    var ast = _htmlbarsSyntax.parse('<div></div>', {
      plugins: {
        ast: [Plugin, SecondaryPlugin]
      }
    });

    equal(ast, 'BOOM!', 'return value from last AST transform is used');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9wbHVnaW4tbm9kZS10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDOztBQUV4RCxNQUFJLENBQUMsNkNBQTZDLEVBQUUsWUFBVztBQUM3RCxVQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVYsYUFBUyxNQUFNLEdBQUcsRUFBRztBQUNyQixVQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxZQUFXO0FBQ3RDLFFBQUUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztLQUNuQyxDQUFDOztBQUVGLG9CQVpPLEtBQUssQ0FZTixhQUFhLEVBQUU7QUFDbkIsYUFBTyxFQUFFO0FBQ1AsV0FBRyxFQUFFLENBQUUsTUFBTSxDQUFFO09BQ2hCO0tBQ0YsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQywyREFBMkQsRUFBRSxZQUFXO0FBQzNFLFVBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFVixhQUFTLE1BQU0sR0FBRyxFQUFHO0FBQ3JCLFVBQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFlBQVc7QUFDdEMsV0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxrQkF4QlosTUFBTSxDQXdCZSxDQUFDO0tBQ25DLENBQUM7O0FBRUYsb0JBM0JPLEtBQUssQ0EyQk4sYUFBYSxFQUFFO0FBQ25CLGFBQU8sRUFBRTtBQUNQLFdBQUcsRUFBRSxDQUFFLE1BQU0sQ0FBRTtPQUNoQjtLQUNGLENBQUMsQ0FBQztHQUNKLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsZ0NBQWdDLEVBQUUsWUFBVztBQUNoRCxVQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVYsUUFBSSxRQUFRLEdBQUcsd0JBQXdCLENBQUM7O0FBRXhDLGFBQVMsTUFBTSxHQUFHLEVBQUc7QUFDckIsVUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsWUFBVztBQUN0QyxhQUFPLFFBQVEsQ0FBQztLQUNqQixDQUFDOztBQUVGLFFBQUksR0FBRyxHQUFHLGdCQTVDSCxLQUFLLENBNENJLGFBQWEsRUFBRTtBQUM3QixhQUFPLEVBQUU7QUFDUCxXQUFHLEVBQUUsQ0FBRSxNQUFNLENBQUU7T0FDaEI7S0FDRixDQUFDLENBQUM7O0FBRUgsU0FBSyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUseUNBQXlDLENBQUMsQ0FBQztHQUNqRSxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLDRCQUE0QixFQUFFLFlBQVc7QUFDNUMsVUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVWLFFBQUksUUFBUSxHQUFHLHdCQUF3QixDQUFDOztBQUV4QyxhQUFTLE1BQU0sR0FBRyxFQUFHO0FBQ3JCLFVBQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFlBQVc7QUFDdEMsYUFBTyxRQUFRLENBQUM7S0FDakIsQ0FBQzs7QUFFRixhQUFTLGVBQWUsR0FBRyxFQUFHO0FBQzlCLG1CQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxVQUFTLEdBQUcsRUFBRTtBQUNsRCxXQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDOztBQUVoRSxhQUFPLE9BQU8sQ0FBQztLQUNoQixDQUFDOztBQUVGLFFBQUksR0FBRyxHQUFHLGdCQXRFSCxLQUFLLENBc0VJLGFBQWEsRUFBRTtBQUM3QixhQUFPLEVBQUU7QUFDUCxXQUFHLEVBQUUsQ0FDSCxNQUFNLEVBQ04sZUFBZSxDQUNoQjtPQUNGO0tBQ0YsQ0FBQyxDQUFDOztBQUVILFNBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLDhDQUE4QyxDQUFDLENBQUM7R0FDckUsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy9wbHVnaW4tbm9kZS10ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyc2UsIFdhbGtlciB9IGZyb20gJy4uL2h0bWxiYXJzLXN5bnRheCc7XG5cblFVbml0Lm1vZHVsZSgnW2h0bWxiYXJzLXN5bnRheF0gQ29tcGlsZXIgcGx1Z2luczogQVNUJyk7XG5cbnRlc3QoJ0FTVCBwbHVnaW5zIGNhbiBiZSBwcm92aWRlZCB0byB0aGUgY29tcGlsZXInLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDEpO1xuXG4gIGZ1bmN0aW9uIFBsdWdpbigpIHsgfVxuICBQbHVnaW4ucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgIG9rKHRydWUsICd0cmFuc2Zvcm0gd2FzIGNhbGxlZCEnKTtcbiAgfTtcblxuICBwYXJzZSgnPGRpdj48L2Rpdj4nLCB7XG4gICAgcGx1Z2luczoge1xuICAgICAgYXN0OiBbIFBsdWdpbiBdXG4gICAgfVxuICB9KTtcbn0pO1xuXG50ZXN0KCdwcm92aWRlcyBzeW50YXggcGFja2FnZSBhcyBgc3ludGF4YCBwcm9wIGlmIHZhbHVlIGlzIG51bGwnLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDEpO1xuXG4gIGZ1bmN0aW9uIFBsdWdpbigpIHsgfVxuICBQbHVnaW4ucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgIGVxdWFsKHRoaXMuc3ludGF4LldhbGtlciwgV2Fsa2VyKTtcbiAgfTtcblxuICBwYXJzZSgnPGRpdj48L2Rpdj4nLCB7XG4gICAgcGx1Z2luczoge1xuICAgICAgYXN0OiBbIFBsdWdpbiBdXG4gICAgfVxuICB9KTtcbn0pO1xuXG50ZXN0KCdBU1QgcGx1Z2lucyBjYW4gbW9kaWZ5IHRoZSBBU1QnLCBmdW5jdGlvbigpIHtcbiAgZXhwZWN0KDEpO1xuXG4gIHZhciBleHBlY3RlZCA9IFwiT09PUFMsIE1FU1NFRCBUSEFUIFVQIVwiO1xuXG4gIGZ1bmN0aW9uIFBsdWdpbigpIHsgfVxuICBQbHVnaW4ucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBleHBlY3RlZDtcbiAgfTtcblxuICB2YXIgYXN0ID0gcGFyc2UoJzxkaXY+PC9kaXY+Jywge1xuICAgIHBsdWdpbnM6IHtcbiAgICAgIGFzdDogWyBQbHVnaW4gXVxuICAgIH1cbiAgfSk7XG5cbiAgZXF1YWwoYXN0LCBleHBlY3RlZCwgJ3JldHVybiB2YWx1ZSBmcm9tIEFTVCB0cmFuc2Zvcm0gaXMgdXNlZCcpO1xufSk7XG5cbnRlc3QoJ0FTVCBwbHVnaW5zIGNhbiBiZSBjaGFpbmVkJywgZnVuY3Rpb24oKSB7XG4gIGV4cGVjdCgyKTtcblxuICB2YXIgZXhwZWN0ZWQgPSBcIk9PT1BTLCBNRVNTRUQgVEhBVCBVUCFcIjtcblxuICBmdW5jdGlvbiBQbHVnaW4oKSB7IH1cbiAgUGx1Z2luLnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQ7XG4gIH07XG5cbiAgZnVuY3Rpb24gU2Vjb25kYXJ5UGx1Z2luKCkgeyB9XG4gIFNlY29uZGFyeVBsdWdpbi5wcm90b3R5cGUudHJhbnNmb3JtID0gZnVuY3Rpb24oYXN0KSB7XG4gICAgZXF1YWwoYXN0LCBleHBlY3RlZCwgJ3JldHVybiB2YWx1ZSBmcm9tIEFTVCB0cmFuc2Zvcm0gaXMgdXNlZCcpO1xuXG4gICAgcmV0dXJuICdCT09NISc7XG4gIH07XG5cbiAgdmFyIGFzdCA9IHBhcnNlKCc8ZGl2PjwvZGl2PicsIHtcbiAgICBwbHVnaW5zOiB7XG4gICAgICBhc3Q6IFsgXG4gICAgICAgIFBsdWdpbixcbiAgICAgICAgU2Vjb25kYXJ5UGx1Z2luXG4gICAgICBdXG4gICAgfVxuICB9KTtcblxuICBlcXVhbChhc3QsICdCT09NIScsICdyZXR1cm4gdmFsdWUgZnJvbSBsYXN0IEFTVCB0cmFuc2Zvcm0gaXMgdXNlZCcpO1xufSk7XG4iXX0=
define('htmlbars-syntax-tests/plugin-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests');
  QUnit.test('htmlbars-syntax-tests/plugin-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/plugin-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9wbHVnaW4tbm9kZS10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9DLE9BQUssQ0FBQyxJQUFJLENBQUMsOERBQThELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDMUYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsK0RBQStELENBQUMsQ0FBQztHQUNsRixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3BsdWdpbi1ub2RlLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9wbHVnaW4tbm9kZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy1zeW50YXgtdGVzdHMvcGx1Z2luLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/support', ['exports', '../htmlbars-syntax'], function (exports, _htmlbarsSyntax) {
  exports.astEqual = astEqual;

  function normalizeNode(obj) {
    if (obj && typeof obj === 'object') {
      var newObj;
      if (obj.splice) {
        newObj = new Array(obj.length);

        for (var i = 0; i < obj.length; i++) {
          newObj[i] = normalizeNode(obj[i]);
        }
      } else {
        newObj = {};

        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            newObj[key] = normalizeNode(obj[key]);
          }
        }

        if (newObj.type) {
          newObj._type = newObj.type;
          delete newObj.type;
        }

        delete newObj.loc;
      }
      return newObj;
    } else {
      return obj;
    }
  }

  function astEqual(actual, expected, message) {
    if (typeof actual === 'string') {
      actual = _htmlbarsSyntax.parse(actual);
    }
    if (typeof expected === 'string') {
      expected = _htmlbarsSyntax.parse(expected);
    }

    actual = normalizeNode(actual);
    expected = normalizeNode(expected);

    deepEqual(actual, expected, message);
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9zdXBwb3J0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLFdBQVMsYUFBYSxDQUFDLEdBQUcsRUFBRTtBQUMxQixRQUFJLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7QUFDbEMsVUFBSSxNQUFNLENBQUM7QUFDWCxVQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7QUFDZCxjQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUUvQixhQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNuQyxnQkFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQztPQUNGLE1BQU07QUFDTCxjQUFNLEdBQUcsRUFBRSxDQUFDOztBQUVaLGFBQUssSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFO0FBQ25CLGNBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUMzQixrQkFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztXQUN2QztTQUNGOztBQUVELFlBQUksTUFBTSxDQUFDLElBQUksRUFBRTtBQUNmLGdCQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDM0IsaUJBQU8sTUFBTSxDQUFDLElBQUksQ0FBQztTQUNwQjs7QUFFRCxlQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUM7T0FDbkI7QUFDRCxhQUFPLE1BQU0sQ0FBQztLQUNmLE1BQU07QUFDTCxhQUFPLEdBQUcsQ0FBQztLQUNaO0dBQ0Y7O0FBRU0sV0FBUyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFDbEQsUUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUU7QUFDOUIsWUFBTSxHQUFHLGdCQW5DSixLQUFLLENBbUNLLE1BQU0sQ0FBQyxDQUFDO0tBQ3hCO0FBQ0QsUUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUU7QUFDaEMsY0FBUSxHQUFHLGdCQXRDTixLQUFLLENBc0NPLFFBQVEsQ0FBQyxDQUFDO0tBQzVCOztBQUVELFVBQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDL0IsWUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7QUFFbkMsYUFBUyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDdEMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3N1cHBvcnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYXJzZSB9IGZyb20gJy4uL2h0bWxiYXJzLXN5bnRheCc7XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU5vZGUob2JqKSB7XG4gIGlmIChvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICB2YXIgbmV3T2JqO1xuICAgIGlmIChvYmouc3BsaWNlKSB7XG4gICAgICBuZXdPYmogPSBuZXcgQXJyYXkob2JqLmxlbmd0aCk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ld09ialtpXSA9IG5vcm1hbGl6ZU5vZGUob2JqW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbmV3T2JqID0ge307XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgbmV3T2JqW2tleV0gPSBub3JtYWxpemVOb2RlKG9ialtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobmV3T2JqLnR5cGUpIHtcbiAgICAgICAgbmV3T2JqLl90eXBlID0gbmV3T2JqLnR5cGU7XG4gICAgICAgIGRlbGV0ZSBuZXdPYmoudHlwZTtcbiAgICAgIH1cblxuICAgICAgZGVsZXRlIG5ld09iai5sb2M7XG4gICAgfVxuICAgIHJldHVybiBuZXdPYmo7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAodHlwZW9mIGFjdHVhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBhY3R1YWwgPSBwYXJzZShhY3R1YWwpO1xuICB9XG4gIGlmICh0eXBlb2YgZXhwZWN0ZWQgPT09ICdzdHJpbmcnKSB7XG4gICAgZXhwZWN0ZWQgPSBwYXJzZShleHBlY3RlZCk7XG4gIH1cblxuICBhY3R1YWwgPSBub3JtYWxpemVOb2RlKGFjdHVhbCk7XG4gIGV4cGVjdGVkID0gbm9ybWFsaXplTm9kZShleHBlY3RlZCk7XG5cbiAgZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpO1xufVxuIl19
define('htmlbars-syntax-tests/support.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests');
  QUnit.test('htmlbars-syntax-tests/support.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/support.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy9zdXBwb3J0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9DLE9BQUssQ0FBQyxJQUFJLENBQUMscURBQXFELEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDakYsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0RBQXNELENBQUMsQ0FBQztHQUN6RSxDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3N1cHBvcnQuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy9zdXBwb3J0LmpzIHNob3VsZCBwYXNzIGpzaGludCcsIGZ1bmN0aW9uKGFzc2VydCkgeyBcbiAgYXNzZXJ0Lm9rKHRydWUsICdodG1sYmFycy1zeW50YXgtdGVzdHMvc3VwcG9ydC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/traversal/manipulating-node-test', ['exports', '../support', '../../htmlbars-syntax', '../../htmlbars-syntax/traversal/errors'], function (exports, _support, _htmlbarsSyntax, _htmlbarsSyntaxTraversalErrors) {

  QUnit.module('[htmlbars-syntax] Traversal - manipulating');

  ['enter', 'exit'].forEach(function (eventName) {
    QUnit.test('[' + eventName + '] Replacing self in a key (returning null)', function (assert) {
      var ast = _htmlbarsSyntax.parse('<x y={{z}} />');
      var attr = ast.body[0].attributes[0];

      assert.throws(function () {
        var _MustacheStatement;

        _htmlbarsSyntax.traverse(ast, {
          MustacheStatement: (_MustacheStatement = {}, _MustacheStatement[eventName] = function (node) {
            if (node.path.parts[0] === 'z') {
              return null;
            }
          }, _MustacheStatement)
        });
      }, _htmlbarsSyntaxTraversalErrors.cannotRemoveNode(attr.value, attr, 'value'));
    });

    QUnit.test('[' + eventName + '] Replacing self in a key (returning an empty array)', function (assert) {
      var ast = _htmlbarsSyntax.parse('<x y={{z}} />');
      var attr = ast.body[0].attributes[0];

      assert.throws(function () {
        var _MustacheStatement2;

        _htmlbarsSyntax.traverse(ast, {
          MustacheStatement: (_MustacheStatement2 = {}, _MustacheStatement2[eventName] = function (node) {
            if (node.path.parts[0] === 'z') {
              return [];
            }
          }, _MustacheStatement2)
        });
      }, _htmlbarsSyntaxTraversalErrors.cannotRemoveNode(attr.value, attr, 'value'));
    });

    QUnit.test('[' + eventName + '] Replacing self in a key (returning a node)', function () {
      var _MustacheStatement3;

      var ast = _htmlbarsSyntax.parse('<x y={{z}} />');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement3 = {}, _MustacheStatement3[eventName] = function (node) {
          if (node.path.parts[0] === 'z') {
            return _htmlbarsSyntax.builders.mustache('a');
          }
        }, _MustacheStatement3)
      });

      _support.astEqual(ast, '<x y={{a}} />');
    });

    QUnit.test('[' + eventName + '] Replacing self in a key (returning an array with a single node)', function () {
      var _MustacheStatement4;

      var ast = _htmlbarsSyntax.parse('<x y={{z}} />');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement4 = {}, _MustacheStatement4[eventName] = function (node) {
          if (node.path.parts[0] === 'z') {
            return [_htmlbarsSyntax.builders.mustache('a')];
          }
        }, _MustacheStatement4)
      });

      _support.astEqual(ast, '<x y={{a}} />');
    });

    QUnit.test('[' + eventName + '] Replacing self in a key (returning an array with multiple nodes)', function (assert) {
      var ast = _htmlbarsSyntax.parse('<x y={{z}} />');
      var attr = ast.body[0].attributes[0];

      assert.throws(function () {
        var _MustacheStatement5;

        _htmlbarsSyntax.traverse(ast, {
          MustacheStatement: (_MustacheStatement5 = {}, _MustacheStatement5[eventName] = function (node) {
            if (node.path.parts[0] === 'z') {
              return [_htmlbarsSyntax.builders.mustache('a'), _htmlbarsSyntax.builders.mustache('b'), _htmlbarsSyntax.builders.mustache('c')];
            }
          }, _MustacheStatement5)
        });
      }, _htmlbarsSyntaxTraversalErrors.cannotReplaceNode(attr.value, attr, 'value'));
    });

    QUnit.test('[' + eventName + '] Replacing self in an array (returning null)', function () {
      var _MustacheStatement6;

      var ast = _htmlbarsSyntax.parse('{{x}}{{y}}{{z}}');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement6 = {}, _MustacheStatement6[eventName] = function (node) {
          if (node.path.parts[0] === 'y') {
            return null;
          }
        }, _MustacheStatement6)
      });

      _support.astEqual(ast, '{{x}}{{z}}');
    });

    QUnit.test('[' + eventName + '] Replacing self in an array (returning an empty array)', function () {
      var _MustacheStatement7;

      var ast = _htmlbarsSyntax.parse('{{x}}{{y}}{{z}}');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement7 = {}, _MustacheStatement7[eventName] = function (node) {
          if (node.path.parts[0] === 'y') {
            return [];
          }
        }, _MustacheStatement7)
      });

      _support.astEqual(ast, '{{x}}{{z}}');
    });

    QUnit.test('[' + eventName + '] Replacing self in an array (returning a node)', function () {
      var _MustacheStatement8;

      var ast = _htmlbarsSyntax.parse('{{x}}{{y}}{{z}}');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement8 = {}, _MustacheStatement8[eventName] = function (node) {
          if (node.path.parts[0] === 'y') {
            return _htmlbarsSyntax.builders.mustache('a');
          }
        }, _MustacheStatement8)
      });

      _support.astEqual(ast, '{{x}}{{a}}{{z}}');
    });

    QUnit.test('[' + eventName + '] Replacing self in an array (returning an array with a single node)', function () {
      var _MustacheStatement9;

      var ast = _htmlbarsSyntax.parse('{{x}}{{y}}{{z}}');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement9 = {}, _MustacheStatement9[eventName] = function (node) {
          if (node.path.parts[0] === 'y') {
            return [_htmlbarsSyntax.builders.mustache('a')];
          }
        }, _MustacheStatement9)
      });

      _support.astEqual(ast, '{{x}}{{a}}{{z}}');
    });

    QUnit.test('[' + eventName + '] Replacing self in an array (returning an array with multiple nodes)', function () {
      var _MustacheStatement10;

      var ast = _htmlbarsSyntax.parse('{{x}}{{y}}{{z}}');

      _htmlbarsSyntax.traverse(ast, {
        MustacheStatement: (_MustacheStatement10 = {}, _MustacheStatement10[eventName] = function (node) {
          if (node.path.parts[0] === 'y') {
            return [_htmlbarsSyntax.builders.mustache('a'), _htmlbarsSyntax.builders.mustache('b'), _htmlbarsSyntax.builders.mustache('c')];
          }
        }, _MustacheStatement10)
      });

      _support.astEqual(ast, '{{x}}{{a}}{{b}}{{c}}{{z}}');
    });
  });

  QUnit.module('[htmlbars-syntax] Traversal - manipulating (edge cases)');

  QUnit.test('Inside of a block', function () {
    var ast = _htmlbarsSyntax.parse('{{y}}{{#w}}{{x}}{{y}}{{z}}{{/w}}');

    _htmlbarsSyntax.traverse(ast, {
      MustacheStatement: function (node) {
        if (node.path.parts[0] === 'y') {
          return [_htmlbarsSyntax.builders.mustache('a'), _htmlbarsSyntax.builders.mustache('b'), _htmlbarsSyntax.builders.mustache('c')];
        }
      }
    });

    _support.astEqual(ast, '{{a}}{{b}}{{c}}{{#w}}{{x}}{{a}}{{b}}{{c}}{{z}}{{/w}}');
  });

  QUnit.test('Exit event is not triggered if the node is replaced during the enter event', function (assert) {
    var ast = _htmlbarsSyntax.parse('{{x}}');
    var didExit = false;

    _htmlbarsSyntax.traverse(ast, {
      MustacheStatement: {
        enter: function () {
          return _htmlbarsSyntax.builders.mustache('y');
        },
        exit: function () {
          didExit = true;
        }
      }
    });

    assert.strictEqual(didExit, false);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvbWFuaXB1bGF0aW5nLW5vZGUtdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVdBLE9BQUssQ0FBQyxNQUFNLENBQUMsNENBQTRDLENBQUMsQ0FBQzs7QUFFM0QsR0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsU0FBUyxFQUFJO0FBQ3JDLFNBQUssQ0FBQyxJQUFJLE9BQUssU0FBUyxpREFBOEMsVUFBQSxNQUFNLEVBQUk7QUFDOUUsVUFBSSxHQUFHLEdBQUcsZ0JBYlosS0FBSyxpQkFhNkIsQ0FBQztBQUNqQyxVQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFckMsWUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFNOzs7QUFDbEIsd0JBaEJKLFFBQVEsQ0FnQkssR0FBRyxFQUFFO0FBQ1osMkJBQWlCLCtDQUNkLFNBQVMsSUFBQyxVQUFDLElBQUksRUFBRTtBQUNoQixnQkFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDOUIscUJBQU8sSUFBSSxDQUFDO2FBQ2I7V0FDRixxQkFDRjtTQUNGLENBQUMsQ0FBQztPQUNKLEVBQUUsK0JBckJMLGdCQUFnQixDQXFCTSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ2pELENBQUMsQ0FBQzs7QUFFSCxTQUFLLENBQUMsSUFBSSxPQUFLLFNBQVMsMkRBQXdELFVBQUEsTUFBTSxFQUFJO0FBQ3hGLFVBQUksR0FBRyxHQUFHLGdCQTlCWixLQUFLLGlCQThCNkIsQ0FBQztBQUNqQyxVQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7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LENBQUM7O0FBRUgsVUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7R0FDcEMsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvbWFuaXB1bGF0aW5nLW5vZGUtdGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGFzdEVxdWFsIH0gZnJvbSAnLi4vc3VwcG9ydCc7XG5pbXBvcnQge1xuICBwYXJzZSxcbiAgdHJhdmVyc2UsXG4gIGJ1aWxkZXJzIGFzIGJcbn0gZnJvbSAnLi4vLi4vaHRtbGJhcnMtc3ludGF4JztcbmltcG9ydCB7XG4gIGNhbm5vdFJlbW92ZU5vZGUsXG4gIGNhbm5vdFJlcGxhY2VOb2RlLFxufSBmcm9tICcuLi8uLi9odG1sYmFycy1zeW50YXgvdHJhdmVyc2FsL2Vycm9ycyc7XG5cblFVbml0Lm1vZHVsZSgnW2h0bWxiYXJzLXN5bnRheF0gVHJhdmVyc2FsIC0gbWFuaXB1bGF0aW5nJyk7XG5cblsnZW50ZXInLCAnZXhpdCddLmZvckVhY2goZXZlbnROYW1lID0+IHtcbiAgUVVuaXQudGVzdChgWyR7ZXZlbnROYW1lfV0gUmVwbGFjaW5nIHNlbGYgaW4gYSBrZXkgKHJldHVybmluZyBudWxsKWAsIGFzc2VydCA9PiB7XG4gICAgbGV0IGFzdCA9IHBhcnNlKGA8eCB5PXt7en19IC8+YCk7XG4gICAgbGV0IGF0dHIgPSBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzBdO1xuXG4gICAgYXNzZXJ0LnRocm93cygoKSA9PiB7XG4gICAgICB0cmF2ZXJzZShhc3QsIHtcbiAgICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICBbZXZlbnROYW1lXShub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5wYXRoLnBhcnRzWzBdID09PSAneicpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LCBjYW5ub3RSZW1vdmVOb2RlKGF0dHIudmFsdWUsIGF0dHIsICd2YWx1ZScpKTtcbiAgfSk7XG5cbiAgUVVuaXQudGVzdChgWyR7ZXZlbnROYW1lfV0gUmVwbGFjaW5nIHNlbGYgaW4gYSBrZXkgKHJldHVybmluZyBhbiBlbXB0eSBhcnJheSlgLCBhc3NlcnQgPT4ge1xuICAgIGxldCBhc3QgPSBwYXJzZShgPHggeT17e3p9fSAvPmApO1xuICAgIGxldCBhdHRyID0gYXN0LmJvZHlbMF0uYXR0cmlidXRlc1swXTtcblxuICAgIGFzc2VydC50aHJvd3MoKCkgPT4ge1xuICAgICAgdHJhdmVyc2UoYXN0LCB7XG4gICAgICAgIE11c3RhY2hlU3RhdGVtZW50OiB7XG4gICAgICAgICAgW2V2ZW50TmFtZV0obm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUucGF0aC5wYXJ0c1swXSA9PT0gJ3onKSB7XG4gICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sIGNhbm5vdFJlbW92ZU5vZGUoYXR0ci52YWx1ZSwgYXR0ciwgJ3ZhbHVlJykpO1xuICB9KTtcblxuICBRVW5pdC50ZXN0KGBbJHtldmVudE5hbWV9XSBSZXBsYWNpbmcgc2VsZiBpbiBhIGtleSAocmV0dXJuaW5nIGEgbm9kZSlgLCAoKSA9PiB7XG4gICAgbGV0IGFzdCA9IHBhcnNlKGA8eCB5PXt7en19IC8+YCk7XG5cbiAgICB0cmF2ZXJzZShhc3QsIHtcbiAgICAgIE11c3RhY2hlU3RhdGVtZW50OiB7XG4gICAgICAgIFtldmVudE5hbWVdKG5vZGUpIHtcbiAgICAgICAgICBpZiAobm9kZS5wYXRoLnBhcnRzWzBdID09PSAneicpIHtcbiAgICAgICAgICAgIHJldHVybiBiLm11c3RhY2hlKCdhJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhc3RFcXVhbChhc3QsIGA8eCB5PXt7YX19IC8+YCk7XG4gIH0pO1xuXG4gIFFVbml0LnRlc3QoYFske2V2ZW50TmFtZX1dIFJlcGxhY2luZyBzZWxmIGluIGEga2V5IChyZXR1cm5pbmcgYW4gYXJyYXkgd2l0aCBhIHNpbmdsZSBub2RlKWAsICgpID0+IHtcbiAgICBsZXQgYXN0ID0gcGFyc2UoYDx4IHk9e3t6fX0gLz5gKTtcblxuICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IHtcbiAgICAgICAgW2V2ZW50TmFtZV0obm9kZSkge1xuICAgICAgICAgIGlmIChub2RlLnBhdGgucGFydHNbMF0gPT09ICd6Jykge1xuICAgICAgICAgICAgcmV0dXJuIFtiLm11c3RhY2hlKCdhJyldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXN0RXF1YWwoYXN0LCBgPHggeT17e2F9fSAvPmApO1xuICB9KTtcblxuICBRVW5pdC50ZXN0KGBbJHtldmVudE5hbWV9XSBSZXBsYWNpbmcgc2VsZiBpbiBhIGtleSAocmV0dXJuaW5nIGFuIGFycmF5IHdpdGggbXVsdGlwbGUgbm9kZXMpYCwgYXNzZXJ0ID0+IHtcbiAgICBsZXQgYXN0ID0gcGFyc2UoYDx4IHk9e3t6fX0gLz5gKTtcbiAgICBsZXQgYXR0ciA9IGFzdC5ib2R5WzBdLmF0dHJpYnV0ZXNbMF07XG5cbiAgICBhc3NlcnQudGhyb3dzKCgpID0+IHtcbiAgICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgICBNdXN0YWNoZVN0YXRlbWVudDoge1xuICAgICAgICAgIFtldmVudE5hbWVdKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChub2RlLnBhdGgucGFydHNbMF0gPT09ICd6Jykge1xuICAgICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIGIubXVzdGFjaGUoJ2EnKSxcbiAgICAgICAgICAgICAgICBiLm11c3RhY2hlKCdiJyksXG4gICAgICAgICAgICAgICAgYi5tdXN0YWNoZSgnYycpXG4gICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LCBjYW5ub3RSZXBsYWNlTm9kZShhdHRyLnZhbHVlLCBhdHRyLCAndmFsdWUnKSk7XG4gIH0pO1xuXG5cbiAgUVVuaXQudGVzdChgWyR7ZXZlbnROYW1lfV0gUmVwbGFjaW5nIHNlbGYgaW4gYW4gYXJyYXkgKHJldHVybmluZyBudWxsKWAsICgpID0+IHtcbiAgICBsZXQgYXN0ID0gcGFyc2UoYHt7eH19e3t5fX17e3p9fWApO1xuXG4gICAgdHJhdmVyc2UoYXN0LCB7XG4gICAgICBNdXN0YWNoZVN0YXRlbWVudDoge1xuICAgICAgICBbZXZlbnROYW1lXShub2RlKSB7XG4gICAgICAgICAgaWYgKG5vZGUucGF0aC5wYXJ0c1swXSA9PT0gJ3knKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGFzdEVxdWFsKGFzdCwgYHt7eH19e3t6fX1gKTtcbiAgfSk7XG5cbiAgUVVuaXQudGVzdChgWyR7ZXZlbnROYW1lfV0gUmVwbGFjaW5nIHNlbGYgaW4gYW4gYXJyYXkgKHJldHVybmluZyBhbiBlbXB0eSBhcnJheSlgLCAoKSA9PiB7XG4gICAgbGV0IGFzdCA9IHBhcnNlKGB7e3h9fXt7eX19e3t6fX1gKTtcblxuICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IHtcbiAgICAgICAgW2V2ZW50TmFtZV0obm9kZSkge1xuICAgICAgICAgIGlmIChub2RlLnBhdGgucGFydHNbMF0gPT09ICd5Jykge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXN0RXF1YWwoYXN0LCBge3t4fX17e3p9fWApO1xuICB9KTtcblxuICBRVW5pdC50ZXN0KGBbJHtldmVudE5hbWV9XSBSZXBsYWNpbmcgc2VsZiBpbiBhbiBhcnJheSAocmV0dXJuaW5nIGEgbm9kZSlgLCAoKSA9PiB7XG4gICAgbGV0IGFzdCA9IHBhcnNlKGB7e3h9fXt7eX19e3t6fX1gKTtcblxuICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IHtcbiAgICAgICAgW2V2ZW50TmFtZV0obm9kZSkge1xuICAgICAgICAgIGlmIChub2RlLnBhdGgucGFydHNbMF0gPT09ICd5Jykge1xuICAgICAgICAgICAgcmV0dXJuIGIubXVzdGFjaGUoJ2EnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGFzdEVxdWFsKGFzdCwgYHt7eH19e3thfX17e3p9fWApO1xuICB9KTtcblxuICBRVW5pdC50ZXN0KGBbJHtldmVudE5hbWV9XSBSZXBsYWNpbmcgc2VsZiBpbiBhbiBhcnJheSAocmV0dXJuaW5nIGFuIGFycmF5IHdpdGggYSBzaW5nbGUgbm9kZSlgLCAoKSA9PiB7XG4gICAgbGV0IGFzdCA9IHBhcnNlKGB7e3h9fXt7eX19e3t6fX1gKTtcblxuICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IHtcbiAgICAgICAgW2V2ZW50TmFtZV0obm9kZSkge1xuICAgICAgICAgIGlmIChub2RlLnBhdGgucGFydHNbMF0gPT09ICd5Jykge1xuICAgICAgICAgICAgcmV0dXJuIFtiLm11c3RhY2hlKCdhJyldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXN0RXF1YWwoYXN0LCBge3t4fX17e2F9fXt7en19YCk7XG4gIH0pO1xuXG4gIFFVbml0LnRlc3QoYFske2V2ZW50TmFtZX1dIFJlcGxhY2luZyBzZWxmIGluIGFuIGFycmF5IChyZXR1cm5pbmcgYW4gYXJyYXkgd2l0aCBtdWx0aXBsZSBub2RlcylgLCAoKSA9PiB7XG4gICAgbGV0IGFzdCA9IHBhcnNlKGB7e3h9fXt7eX19e3t6fX1gKTtcblxuICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IHtcbiAgICAgICAgW2V2ZW50TmFtZV0obm9kZSkge1xuICAgICAgICAgIGlmIChub2RlLnBhdGgucGFydHNbMF0gPT09ICd5Jykge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgYi5tdXN0YWNoZSgnYScpLFxuICAgICAgICAgICAgICBiLm11c3RhY2hlKCdiJyksXG4gICAgICAgICAgICAgIGIubXVzdGFjaGUoJ2MnKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGFzdEVxdWFsKGFzdCwgYHt7eH19e3thfX17e2J9fXt7Y319e3t6fX1gKTtcbiAgfSk7XG59KTtcblxuXG5RVW5pdC5tb2R1bGUoJ1todG1sYmFycy1zeW50YXhdIFRyYXZlcnNhbCAtIG1hbmlwdWxhdGluZyAoZWRnZSBjYXNlcyknKTtcblxuUVVuaXQudGVzdCgnSW5zaWRlIG9mIGEgYmxvY2snLCAoKSA9PiB7XG4gIGxldCBhc3QgPSBwYXJzZShge3t5fX17eyN3fX17e3h9fXt7eX19e3t6fX17ey93fX1gKTtcblxuICB0cmF2ZXJzZShhc3QsIHtcbiAgICBNdXN0YWNoZVN0YXRlbWVudChub2RlKSB7XG4gICAgICBpZiAobm9kZS5wYXRoLnBhcnRzWzBdID09PSAneScpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICBiLm11c3RhY2hlKCdhJyksXG4gICAgICAgICAgYi5tdXN0YWNoZSgnYicpLFxuICAgICAgICAgIGIubXVzdGFjaGUoJ2MnKVxuICAgICAgICBdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgYXN0RXF1YWwoYXN0LCBge3thfX17e2J9fXt7Y319e3sjd319e3t4fX17e2F9fXt7Yn19e3tjfX17e3p9fXt7L3d9fWApO1xufSk7XG5cblFVbml0LnRlc3QoJ0V4aXQgZXZlbnQgaXMgbm90IHRyaWdnZXJlZCBpZiB0aGUgbm9kZSBpcyByZXBsYWNlZCBkdXJpbmcgdGhlIGVudGVyIGV2ZW50JywgYXNzZXJ0ID0+IHtcbiAgbGV0IGFzdCA9IHBhcnNlKGB7e3h9fWApO1xuICBsZXQgZGlkRXhpdCA9IGZhbHNlO1xuXG4gIHRyYXZlcnNlKGFzdCwge1xuICAgIE11c3RhY2hlU3RhdGVtZW50OiB7XG4gICAgICBlbnRlcigpIHsgcmV0dXJuIGIubXVzdGFjaGUoJ3knKTsgfSxcbiAgICAgIGV4aXQoKSB7IGRpZEV4aXQgPSB0cnVlOyB9XG4gICAgfVxuICB9KTtcblxuICBhc3NlcnQuc3RyaWN0RXF1YWwoZGlkRXhpdCwgZmFsc2UpO1xufSk7XG4iXX0=
define('htmlbars-syntax-tests/traversal/manipulating-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/traversal');
  QUnit.test('htmlbars-syntax-tests/traversal/manipulating-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/traversal/manipulating-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvbWFuaXB1bGF0aW5nLW5vZGUtdGVzdC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMENBQTBDLENBQUMsQ0FBQztBQUN6RCxPQUFLLENBQUMsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzFHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLCtFQUErRSxDQUFDLENBQUM7R0FDbEcsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvbWFuaXB1bGF0aW5nLW5vZGUtdGVzdC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvbWFuaXB1bGF0aW5nLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC9tYW5pcHVsYXRpbmctbm9kZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/traversal/visiting-keys-node-test', ['exports', '../../htmlbars-syntax'], function (exports, _htmlbarsSyntax) {

  function traversalEqual(node, expectedTraversal) {
    var actualTraversal = [];

    _htmlbarsSyntax.traverse(node, {
      All: {
        enter: function (node) {
          actualTraversal.push(['enter', node]);
        },
        exit: function (node) {
          actualTraversal.push(['exit', node]);
        },
        keys: {
          All: {
            enter: function (node, key) {
              actualTraversal.push(['enter:' + key, node]);
            },
            exit: function (node, key) {
              actualTraversal.push(['exit:' + key, node]);
            }
          }
        }
      }
    });

    deepEqual(actualTraversal.map(function (a) {
      return a[0] + ' ' + a[1].type;
    }), expectedTraversal.map(function (a) {
      return a[0] + ' ' + a[1].type;
    }));

    var nodesEqual = true;

    for (var i = 0; i < actualTraversal.length; i++) {
      if (actualTraversal[i][1] !== expectedTraversal[i][1]) {
        nodesEqual = false;
        break;
      }
    }

    ok(nodesEqual, "Actual nodes match expected nodes");
  }

  QUnit.module('[htmlbars-syntax] Traversal - visiting keys');

  test('Blocks', function () {
    var ast = _htmlbarsSyntax.parse('{{#block param1 param2 key1=value key2=value}}<b></b><b></b>{{/block}}');

    traversalEqual(ast, [['enter', ast], ['enter:body', ast], ['enter', ast.body[0]], ['enter:path', ast.body[0]], ['enter', ast.body[0].path], ['exit', ast.body[0].path], ['exit:path', ast.body[0]], ['enter:params', ast.body[0]], ['enter', ast.body[0].params[0]], ['exit', ast.body[0].params[0]], ['enter', ast.body[0].params[1]], ['exit', ast.body[0].params[1]], ['exit:params', ast.body[0]], ['enter:hash', ast.body[0]], ['enter', ast.body[0].hash], ['enter:pairs', ast.body[0].hash], ['enter', ast.body[0].hash.pairs[0]], ['enter:value', ast.body[0].hash.pairs[0]], ['enter', ast.body[0].hash.pairs[0].value], ['exit', ast.body[0].hash.pairs[0].value], ['exit:value', ast.body[0].hash.pairs[0]], ['exit', ast.body[0].hash.pairs[0]], ['enter', ast.body[0].hash.pairs[1]], ['enter:value', ast.body[0].hash.pairs[1]], ['enter', ast.body[0].hash.pairs[1].value], ['exit', ast.body[0].hash.pairs[1].value], ['exit:value', ast.body[0].hash.pairs[1]], ['exit', ast.body[0].hash.pairs[1]], ['exit:pairs', ast.body[0].hash], ['exit', ast.body[0].hash], ['exit:hash', ast.body[0]], ['enter:program', ast.body[0]], ['enter', ast.body[0].program], ['enter:body', ast.body[0].program], ['enter', ast.body[0].program.body[0]], ['enter:attributes', ast.body[0].program.body[0]], ['exit:attributes', ast.body[0].program.body[0]], ['enter:modifiers', ast.body[0].program.body[0]], ['exit:modifiers', ast.body[0].program.body[0]], ['enter:children', ast.body[0].program.body[0]], ['exit:children', ast.body[0].program.body[0]], ['exit', ast.body[0].program.body[0]], ['enter', ast.body[0].program.body[1]], ['enter:attributes', ast.body[0].program.body[1]], ['exit:attributes', ast.body[0].program.body[1]], ['enter:modifiers', ast.body[0].program.body[1]], ['exit:modifiers', ast.body[0].program.body[1]], ['enter:children', ast.body[0].program.body[1]], ['exit:children', ast.body[0].program.body[1]], ['exit', ast.body[0].program.body[1]], ['exit:body', ast.body[0].program], ['exit', ast.body[0].program], ['exit:program', ast.body[0]], ['exit', ast.body[0]], ['exit:body', ast], ['exit', ast]]);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvdmlzaXRpbmcta2V5cy1ub2RlLXRlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxXQUFTLGNBQWMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7QUFDL0MsUUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDOztBQUV6QixvQkFMYyxRQUFRLENBS2IsSUFBSSxFQUFFO0FBQ2IsU0FBRyxFQUFFO0FBQ0gsYUFBSyxFQUFBLFVBQUMsSUFBSSxFQUFFO0FBQUUseUJBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUFFO0FBQ3RELFlBQUksRUFBQSxVQUFDLElBQUksRUFBRTtBQUFFLHlCQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7U0FBRTtBQUNyRCxZQUFJLEVBQUU7QUFDSixhQUFHLEVBQUU7QUFDSCxpQkFBSyxFQUFBLFVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtBQUFFLDZCQUFlLENBQUMsSUFBSSxDQUFDLFlBQVUsR0FBRyxFQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7YUFBRTtBQUNsRSxnQkFBSSxFQUFBLFVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtBQUFFLDZCQUFlLENBQUMsSUFBSSxDQUFDLFdBQVMsR0FBRyxFQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7YUFBRTtXQUNsRTtTQUNGO09BQ0Y7S0FDRixDQUFDLENBQUM7O0FBRUgsYUFBUyxDQUNQLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2FBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0tBQUUsQ0FBQyxFQUNoRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2FBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0tBQUUsQ0FBQyxDQUNuRCxDQUFDOztBQUVGLFFBQUksVUFBVSxHQUFHLElBQUksQ0FBQzs7QUFFdEIsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDL0MsVUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDckQsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsY0FBTTtPQUNQO0tBQ0Y7O0FBRUQsTUFBRSxDQUFDLFVBQVUsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO0dBQ3JEOztBQUVELE9BQUssQ0FBQyxNQUFNLENBQUMsNkNBQTZDLENBQUMsQ0FBQzs7QUFFNUQsTUFBSSxDQUFDLFFBQVEsRUFBRSxZQUFXO0FBQ3hCLFFBQUksR0FBRyxHQUFHLGdCQXRDSCxLQUFLLDBFQXNDNkUsQ0FBQzs7QUFFMUYsa0JBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FDbEIsQ0FBQyxPQUFPLEVBQWEsR0FBRyxDQUFDLEVBQ3pCLENBQUMsWUFBWSxFQUFRLEdBQUcsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pDLENBQUMsWUFBWSxFQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakMsQ0FBQyxPQUFPLEVBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDdEMsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDdEMsQ0FBQyxXQUFXLEVBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqQyxDQUFDLGNBQWMsRUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pDLENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzNDLENBQUMsTUFBTSxFQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzNDLENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzNDLENBQUMsTUFBTSxFQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzNDLENBQUMsYUFBYSxFQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakMsQ0FBQyxZQUFZLEVBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqQyxDQUFDLE9BQU8sRUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN0QyxDQUFDLGFBQWEsRUFBTyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN0QyxDQUFDLE9BQU8sRUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDL0MsQ0FBQyxhQUFhLEVBQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQy9DLENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDckQsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNyRCxDQUFDLFlBQVksRUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDL0MsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQy9DLENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMvQyxDQUFDLGFBQWEsRUFBTyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDL0MsQ0FBQyxPQUFPLEVBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNyRCxDQUFDLE1BQU0sRUFBYyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQ3JELENBQUMsWUFBWSxFQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMvQyxDQUFDLE1BQU0sRUFBYyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDL0MsQ0FBQyxZQUFZLEVBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDdEMsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDdEMsQ0FBQyxXQUFXLEVBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqQyxDQUFDLGVBQWUsRUFBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pDLENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQ3pDLENBQUMsWUFBWSxFQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQ3pDLENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGlCQUFpQixFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGlCQUFpQixFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGdCQUFnQixFQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGdCQUFnQixFQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGVBQWUsRUFBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakQsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pELENBQUMsT0FBTyxFQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGlCQUFpQixFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGlCQUFpQixFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGdCQUFnQixFQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGdCQUFnQixFQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxDQUFDLGVBQWUsRUFBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakQsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pELENBQUMsV0FBVyxFQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQ3pDLENBQUMsTUFBTSxFQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQ3pDLENBQUMsY0FBYyxFQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakMsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqQyxDQUFDLFdBQVcsRUFBUyxHQUFHLENBQUMsRUFDekIsQ0FBQyxNQUFNLEVBQWMsR0FBRyxDQUFDLENBQzFCLENBQUMsQ0FBQztHQUNKLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvdHJhdmVyc2FsL3Zpc2l0aW5nLWtleXMtbm9kZS10ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyc2UsIHRyYXZlcnNlIH0gZnJvbSAnLi4vLi4vaHRtbGJhcnMtc3ludGF4JztcblxuZnVuY3Rpb24gdHJhdmVyc2FsRXF1YWwobm9kZSwgZXhwZWN0ZWRUcmF2ZXJzYWwpIHtcbiAgbGV0IGFjdHVhbFRyYXZlcnNhbCA9IFtdO1xuXG4gIHRyYXZlcnNlKG5vZGUsIHtcbiAgICBBbGw6IHtcbiAgICAgIGVudGVyKG5vZGUpIHsgYWN0dWFsVHJhdmVyc2FsLnB1c2goWydlbnRlcicsIG5vZGVdKTsgfSxcbiAgICAgIGV4aXQobm9kZSkgeyBhY3R1YWxUcmF2ZXJzYWwucHVzaChbJ2V4aXQnLCAgbm9kZV0pOyB9LFxuICAgICAga2V5czoge1xuICAgICAgICBBbGw6IHtcbiAgICAgICAgICBlbnRlcihub2RlLCBrZXkpIHsgYWN0dWFsVHJhdmVyc2FsLnB1c2goW2BlbnRlcjoke2tleX1gLCBub2RlXSk7IH0sXG4gICAgICAgICAgZXhpdChub2RlLCBrZXkpIHsgYWN0dWFsVHJhdmVyc2FsLnB1c2goW2BleGl0OiR7a2V5fWAsICBub2RlXSk7IH0sXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGRlZXBFcXVhbChcbiAgICBhY3R1YWxUcmF2ZXJzYWwubWFwKGEgPT4gYCR7YVswXX0gJHthWzFdLnR5cGV9YCksXG4gICAgZXhwZWN0ZWRUcmF2ZXJzYWwubWFwKGEgPT4gYCR7YVswXX0gJHthWzFdLnR5cGV9YClcbiAgKTtcblxuICBsZXQgbm9kZXNFcXVhbCA9IHRydWU7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY3R1YWxUcmF2ZXJzYWwubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYWN0dWFsVHJhdmVyc2FsW2ldWzFdICE9PSBleHBlY3RlZFRyYXZlcnNhbFtpXVsxXSkge1xuICAgICAgbm9kZXNFcXVhbCA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgb2sobm9kZXNFcXVhbCwgXCJBY3R1YWwgbm9kZXMgbWF0Y2ggZXhwZWN0ZWQgbm9kZXNcIik7XG59XG5cblFVbml0Lm1vZHVsZSgnW2h0bWxiYXJzLXN5bnRheF0gVHJhdmVyc2FsIC0gdmlzaXRpbmcga2V5cycpO1xuXG50ZXN0KCdCbG9ja3MnLCBmdW5jdGlvbigpIHtcbiAgbGV0IGFzdCA9IHBhcnNlKGB7eyNibG9jayBwYXJhbTEgcGFyYW0yIGtleTE9dmFsdWUga2V5Mj12YWx1ZX19PGI+PC9iPjxiPjwvYj57ey9ibG9ja319YCk7XG5cbiAgdHJhdmVyc2FsRXF1YWwoYXN0LCBbXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0XSxcbiAgICBbJ2VudGVyOmJvZHknLCAgICAgICBhc3RdLFxuICAgIFsnZW50ZXInLCAgICAgICAgICAgIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyOnBhdGgnLCAgICAgICBhc3QuYm9keVswXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0ucGF0aF0sXG4gICAgWydleGl0JywgICAgICAgICAgICAgYXN0LmJvZHlbMF0ucGF0aF0sXG4gICAgWydleGl0OnBhdGgnLCAgICAgICAgYXN0LmJvZHlbMF1dLFxuICAgIFsnZW50ZXI6cGFyYW1zJywgICAgIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgICAgICAgICAgICBhc3QuYm9keVswXS5wYXJhbXNbMF1dLFxuICAgIFsnZXhpdCcsICAgICAgICAgICAgIGFzdC5ib2R5WzBdLnBhcmFtc1swXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0ucGFyYW1zWzFdXSxcbiAgICBbJ2V4aXQnLCAgICAgICAgICAgICBhc3QuYm9keVswXS5wYXJhbXNbMV1dLFxuICAgIFsnZXhpdDpwYXJhbXMnLCAgICAgIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyOmhhc2gnLCAgICAgICBhc3QuYm9keVswXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaF0sXG4gICAgWydlbnRlcjpwYWlycycsICAgICAgYXN0LmJvZHlbMF0uaGFzaF0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcjp2YWx1ZScsICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydleGl0JywgICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydleGl0OnZhbHVlJywgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydleGl0JywgICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydlbnRlcjp2YWx1ZScsICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZV0sXG4gICAgWydleGl0JywgICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZV0sXG4gICAgWydleGl0OnZhbHVlJywgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydleGl0JywgICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydleGl0OnBhaXJzJywgICAgICAgYXN0LmJvZHlbMF0uaGFzaF0sXG4gICAgWydleGl0JywgICAgICAgICAgICAgYXN0LmJvZHlbMF0uaGFzaF0sXG4gICAgWydleGl0Omhhc2gnLCAgICAgICAgYXN0LmJvZHlbMF1dLFxuICAgIFsnZW50ZXI6cHJvZ3JhbScsICAgIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgICAgICAgICAgICBhc3QuYm9keVswXS5wcm9ncmFtXSxcbiAgICBbJ2VudGVyOmJvZHknLCAgICAgICBhc3QuYm9keVswXS5wcm9ncmFtXSxcbiAgICBbJ2VudGVyJywgICAgICAgICAgICBhc3QuYm9keVswXS5wcm9ncmFtLmJvZHlbMF1dLFxuICAgIFsnZW50ZXI6YXR0cmlidXRlcycsIGFzdC5ib2R5WzBdLnByb2dyYW0uYm9keVswXV0sXG4gICAgWydleGl0OmF0dHJpYnV0ZXMnLCAgYXN0LmJvZHlbMF0ucHJvZ3JhbS5ib2R5WzBdXSxcbiAgICBbJ2VudGVyOm1vZGlmaWVycycsICBhc3QuYm9keVswXS5wcm9ncmFtLmJvZHlbMF1dLFxuICAgIFsnZXhpdDptb2RpZmllcnMnLCAgIGFzdC5ib2R5WzBdLnByb2dyYW0uYm9keVswXV0sXG4gICAgWydlbnRlcjpjaGlsZHJlbicsICAgYXN0LmJvZHlbMF0ucHJvZ3JhbS5ib2R5WzBdXSxcbiAgICBbJ2V4aXQ6Y2hpbGRyZW4nLCAgICBhc3QuYm9keVswXS5wcm9ncmFtLmJvZHlbMF1dLFxuICAgIFsnZXhpdCcsICAgICAgICAgICAgIGFzdC5ib2R5WzBdLnByb2dyYW0uYm9keVswXV0sXG4gICAgWydlbnRlcicsICAgICAgICAgICAgYXN0LmJvZHlbMF0ucHJvZ3JhbS5ib2R5WzFdXSxcbiAgICBbJ2VudGVyOmF0dHJpYnV0ZXMnLCBhc3QuYm9keVswXS5wcm9ncmFtLmJvZHlbMV1dLFxuICAgIFsnZXhpdDphdHRyaWJ1dGVzJywgIGFzdC5ib2R5WzBdLnByb2dyYW0uYm9keVsxXV0sXG4gICAgWydlbnRlcjptb2RpZmllcnMnLCAgYXN0LmJvZHlbMF0ucHJvZ3JhbS5ib2R5WzFdXSxcbiAgICBbJ2V4aXQ6bW9kaWZpZXJzJywgICBhc3QuYm9keVswXS5wcm9ncmFtLmJvZHlbMV1dLFxuICAgIFsnZW50ZXI6Y2hpbGRyZW4nLCAgIGFzdC5ib2R5WzBdLnByb2dyYW0uYm9keVsxXV0sXG4gICAgWydleGl0OmNoaWxkcmVuJywgICAgYXN0LmJvZHlbMF0ucHJvZ3JhbS5ib2R5WzFdXSxcbiAgICBbJ2V4aXQnLCAgICAgICAgICAgICBhc3QuYm9keVswXS5wcm9ncmFtLmJvZHlbMV1dLFxuICAgIFsnZXhpdDpib2R5JywgICAgICAgIGFzdC5ib2R5WzBdLnByb2dyYW1dLFxuICAgIFsnZXhpdCcsICAgICAgICAgICAgIGFzdC5ib2R5WzBdLnByb2dyYW1dLFxuICAgIFsnZXhpdDpwcm9ncmFtJywgICAgIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2V4aXQnLCAgICAgICAgICAgICBhc3QuYm9keVswXV0sXG4gICAgWydleGl0OmJvZHknLCAgICAgICAgYXN0XSxcbiAgICBbJ2V4aXQnLCAgICAgICAgICAgICBhc3RdXG4gIF0pO1xufSk7XG4iXX0=
define('htmlbars-syntax-tests/traversal/visiting-keys-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/traversal');
  QUnit.test('htmlbars-syntax-tests/traversal/visiting-keys-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/traversal/visiting-keys-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvdmlzaXRpbmcta2V5cy1ub2RlLXRlc3QuanNoaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFLLENBQUMsTUFBTSxDQUFDLDBDQUEwQyxDQUFDLENBQUM7QUFDekQsT0FBSyxDQUFDLElBQUksQ0FBQywrRUFBK0UsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUMzRyxVQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxnRkFBZ0YsQ0FBQyxDQUFDO0dBQ25HLENBQUMsQ0FBQyIsImZpbGUiOiJodG1sYmFycy1zeW50YXgtdGVzdHMvdHJhdmVyc2FsL3Zpc2l0aW5nLWtleXMtbm9kZS10ZXN0LmpzaGludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlFVbml0Lm1vZHVsZSgnSlNIaW50IC0gaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbCcpO1xuUVVuaXQudGVzdCgnaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC92aXNpdGluZy1rZXlzLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC92aXNpdGluZy1rZXlzLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQuJyk7IFxufSk7XG4iXX0=
define('htmlbars-syntax-tests/traversal/visiting-node-test', ['exports', '../../htmlbars-syntax'], function (exports, _htmlbarsSyntax) {

  function traversalEqual(node, expectedTraversal) {
    var actualTraversal = [];

    _htmlbarsSyntax.traverse(node, {
      All: {
        enter: function (node) {
          actualTraversal.push(['enter', node]);
        },
        exit: function (node) {
          actualTraversal.push(['exit', node]);
        }
      }
    });

    deepEqual(actualTraversal.map(function (a) {
      return a[0] + ' ' + a[1].type;
    }), expectedTraversal.map(function (a) {
      return a[0] + ' ' + a[1].type;
    }));

    var nodesEqual = true;

    for (var i = 0; i < actualTraversal.length; i++) {
      if (actualTraversal[i][1] !== expectedTraversal[i][1]) {
        nodesEqual = false;
        break;
      }
    }

    ok(nodesEqual, "Actual nodes match expected nodes");
  }

  QUnit.module('[htmlbars-syntax] Traversal - visiting');

  test('Elements and attributes', function () {
    var ast = _htmlbarsSyntax.parse('<div id="id" class="large {{classes}}" value={{value}}><b></b><b></b></div>');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['enter', ast.body[0].attributes[0]], ['enter', ast.body[0].attributes[0].value], ['exit', ast.body[0].attributes[0].value], ['exit', ast.body[0].attributes[0]], ['enter', ast.body[0].attributes[1]], ['enter', ast.body[0].attributes[1].value], ['enter', ast.body[0].attributes[1].value.parts[0]], ['exit', ast.body[0].attributes[1].value.parts[0]], ['enter', ast.body[0].attributes[1].value.parts[1]], ['exit', ast.body[0].attributes[1].value.parts[1]], ['exit', ast.body[0].attributes[1].value], ['exit', ast.body[0].attributes[1]], ['enter', ast.body[0].attributes[2]], ['enter', ast.body[0].attributes[2].value], ['enter', ast.body[0].attributes[2].value.path], ['exit', ast.body[0].attributes[2].value.path], ['enter', ast.body[0].attributes[2].value.hash], ['exit', ast.body[0].attributes[2].value.hash], ['exit', ast.body[0].attributes[2].value], ['exit', ast.body[0].attributes[2]], ['enter', ast.body[0].children[0]], ['exit', ast.body[0].children[0]], ['enter', ast.body[0].children[1]], ['exit', ast.body[0].children[1]], ['exit', ast.body[0]], ['exit', ast]]);
  });

  test('Element modifiers', function () {
    var ast = _htmlbarsSyntax.parse('<div {{modifier}}{{modifier param1 param2 key1=value key2=value}}></div>');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['enter', ast.body[0].modifiers[0]], ['enter', ast.body[0].modifiers[0].path], ['exit', ast.body[0].modifiers[0].path], ['enter', ast.body[0].modifiers[0].hash], ['exit', ast.body[0].modifiers[0].hash], ['exit', ast.body[0].modifiers[0]], ['enter', ast.body[0].modifiers[1]], ['enter', ast.body[0].modifiers[1].path], ['exit', ast.body[0].modifiers[1].path], ['enter', ast.body[0].modifiers[1].params[0]], ['exit', ast.body[0].modifiers[1].params[0]], ['enter', ast.body[0].modifiers[1].params[1]], ['exit', ast.body[0].modifiers[1].params[1]], ['enter', ast.body[0].modifiers[1].hash], ['enter', ast.body[0].modifiers[1].hash.pairs[0]], ['enter', ast.body[0].modifiers[1].hash.pairs[0].value], ['exit', ast.body[0].modifiers[1].hash.pairs[0].value], ['exit', ast.body[0].modifiers[1].hash.pairs[0]], ['enter', ast.body[0].modifiers[1].hash.pairs[1]], ['enter', ast.body[0].modifiers[1].hash.pairs[1].value], ['exit', ast.body[0].modifiers[1].hash.pairs[1].value], ['exit', ast.body[0].modifiers[1].hash.pairs[1]], ['exit', ast.body[0].modifiers[1].hash], ['exit', ast.body[0].modifiers[1]], ['exit', ast.body[0]], ['exit', ast]]);
  });

  test('Blocks', function () {
    var ast = _htmlbarsSyntax.parse('{{#block}}{{/block}}' + '{{#block param1 param2 key1=value key2=value}}<b></b><b></b>{{/block}}');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['enter', ast.body[0].path], ['exit', ast.body[0].path], ['enter', ast.body[0].hash], ['exit', ast.body[0].hash], ['enter', ast.body[0].program], ['exit', ast.body[0].program], ['exit', ast.body[0]], ['enter', ast.body[1]], ['enter', ast.body[1].path], ['exit', ast.body[1].path], ['enter', ast.body[1].params[0]], ['exit', ast.body[1].params[0]], ['enter', ast.body[1].params[1]], ['exit', ast.body[1].params[1]], ['enter', ast.body[1].hash], ['enter', ast.body[1].hash.pairs[0]], ['enter', ast.body[1].hash.pairs[0].value], ['exit', ast.body[1].hash.pairs[0].value], ['exit', ast.body[1].hash.pairs[0]], ['enter', ast.body[1].hash.pairs[1]], ['enter', ast.body[1].hash.pairs[1].value], ['exit', ast.body[1].hash.pairs[1].value], ['exit', ast.body[1].hash.pairs[1]], ['exit', ast.body[1].hash], ['enter', ast.body[1].program], ['enter', ast.body[1].program.body[0]], ['exit', ast.body[1].program.body[0]], ['enter', ast.body[1].program.body[1]], ['exit', ast.body[1].program.body[1]], ['exit', ast.body[1].program], ['exit', ast.body[1]], ['exit', ast]]);
  });

  test('Mustaches', function () {
    var ast = _htmlbarsSyntax.parse('{{mustache}}' + '{{mustache param1 param2 key1=value key2=value}}');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['enter', ast.body[0].path], ['exit', ast.body[0].path], ['enter', ast.body[0].hash], ['exit', ast.body[0].hash], ['exit', ast.body[0]], ['enter', ast.body[1]], ['enter', ast.body[1].path], ['exit', ast.body[1].path], ['enter', ast.body[1].params[0]], ['exit', ast.body[1].params[0]], ['enter', ast.body[1].params[1]], ['exit', ast.body[1].params[1]], ['enter', ast.body[1].hash], ['enter', ast.body[1].hash.pairs[0]], ['enter', ast.body[1].hash.pairs[0].value], ['exit', ast.body[1].hash.pairs[0].value], ['exit', ast.body[1].hash.pairs[0]], ['enter', ast.body[1].hash.pairs[1]], ['enter', ast.body[1].hash.pairs[1].value], ['exit', ast.body[1].hash.pairs[1].value], ['exit', ast.body[1].hash.pairs[1]], ['exit', ast.body[1].hash], ['exit', ast.body[1]], ['exit', ast]]);
  });

  test('Components', function () {
    var ast = _htmlbarsSyntax.parse('<x-block />' + '<x-block></x-block>' + '<x-block id="id" class="large {{classes}}" value={{value}}><b></b><b></b></x-block>');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['enter', ast.body[0].program], ['exit', ast.body[0].program], ['exit', ast.body[0]], ['enter', ast.body[1]], ['enter', ast.body[1].program], ['exit', ast.body[1].program], ['exit', ast.body[1]], ['enter', ast.body[2]], ['enter', ast.body[2].attributes[0]], ['enter', ast.body[2].attributes[0].value], ['exit', ast.body[2].attributes[0].value], ['exit', ast.body[2].attributes[0]], ['enter', ast.body[2].attributes[1]], ['enter', ast.body[2].attributes[1].value], ['enter', ast.body[2].attributes[1].value.parts[0]], ['exit', ast.body[2].attributes[1].value.parts[0]], ['enter', ast.body[2].attributes[1].value.parts[1]], ['exit', ast.body[2].attributes[1].value.parts[1]], ['exit', ast.body[2].attributes[1].value], ['exit', ast.body[2].attributes[1]], ['enter', ast.body[2].attributes[2]], ['enter', ast.body[2].attributes[2].value], ['enter', ast.body[2].attributes[2].value.path], ['exit', ast.body[2].attributes[2].value.path], ['enter', ast.body[2].attributes[2].value.hash], ['exit', ast.body[2].attributes[2].value.hash], ['exit', ast.body[2].attributes[2].value], ['exit', ast.body[2].attributes[2]], ['enter', ast.body[2].program], ['enter', ast.body[2].program.body[0]], ['exit', ast.body[2].program.body[0]], ['enter', ast.body[2].program.body[1]], ['exit', ast.body[2].program.body[1]], ['exit', ast.body[2].program], ['exit', ast.body[2]], ['exit', ast]]);
  });

  test('Nested helpers', function () {
    var ast = _htmlbarsSyntax.parse('{{helper\n    (helper param1 param2 key1=value key2=value)\n    key1=(helper param)\n    key2=(helper key=(helper param))\n  }}');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['enter', ast.body[0].path], ['exit', ast.body[0].path], ['enter', ast.body[0].params[0]], ['enter', ast.body[0].params[0].path], ['exit', ast.body[0].params[0].path], ['enter', ast.body[0].params[0].params[0]], ['exit', ast.body[0].params[0].params[0]], ['enter', ast.body[0].params[0].params[1]], ['exit', ast.body[0].params[0].params[1]], ['enter', ast.body[0].params[0].hash], ['enter', ast.body[0].params[0].hash.pairs[0]], ['enter', ast.body[0].params[0].hash.pairs[0].value], ['exit', ast.body[0].params[0].hash.pairs[0].value], ['exit', ast.body[0].params[0].hash.pairs[0]], ['enter', ast.body[0].params[0].hash.pairs[1]], ['enter', ast.body[0].params[0].hash.pairs[1].value], ['exit', ast.body[0].params[0].hash.pairs[1].value], ['exit', ast.body[0].params[0].hash.pairs[1]], ['exit', ast.body[0].params[0].hash], ['exit', ast.body[0].params[0]], ['enter', ast.body[0].hash], ['enter', ast.body[0].hash.pairs[0]], ['enter', ast.body[0].hash.pairs[0].value], ['enter', ast.body[0].hash.pairs[0].value.path], ['exit', ast.body[0].hash.pairs[0].value.path], ['enter', ast.body[0].hash.pairs[0].value.params[0]], ['exit', ast.body[0].hash.pairs[0].value.params[0]], ['enter', ast.body[0].hash.pairs[0].value.hash], ['exit', ast.body[0].hash.pairs[0].value.hash], ['exit', ast.body[0].hash.pairs[0].value], ['exit', ast.body[0].hash.pairs[0]], ['enter', ast.body[0].hash.pairs[1]], ['enter', ast.body[0].hash.pairs[1].value], ['enter', ast.body[0].hash.pairs[1].value.path], ['exit', ast.body[0].hash.pairs[1].value.path], ['enter', ast.body[0].hash.pairs[1].value.hash], ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0]], ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value], ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.path], ['exit', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.path], ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.params[0]], ['exit', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.params[0]], ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.hash], ['exit', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.hash], ['exit', ast.body[0].hash.pairs[1].value.hash.pairs[0].value], ['exit', ast.body[0].hash.pairs[1].value.hash.pairs[0]], ['exit', ast.body[0].hash.pairs[1].value.hash], ['exit', ast.body[0].hash.pairs[1].value], ['exit', ast.body[0].hash.pairs[1]], ['exit', ast.body[0].hash], ['exit', ast.body[0]], ['exit', ast]]);
  });

  test('Comments', function () {
    var ast = _htmlbarsSyntax.parse('<!-- HTML comment -->{{!-- Handlebars comment --}}');

    traversalEqual(ast, [['enter', ast], ['enter', ast.body[0]], ['exit', ast.body[0]],
    // TODO: Ensure Handlebars comments are in the AST.
    // ['enter', ast.body[1]],
    // ['exit',  ast.body[1]],
    ['exit', ast]]);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvdmlzaXRpbmctbm9kZS10ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsV0FBUyxjQUFjLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO0FBQy9DLFFBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQzs7QUFFekIsb0JBTGMsUUFBUSxDQUtiLElBQUksRUFBRTtBQUNiLFNBQUcsRUFBRTtBQUNILGFBQUssRUFBQSxVQUFDLElBQUksRUFBRTtBQUFFLHlCQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FBRTtBQUN0RCxZQUFJLEVBQUEsVUFBQyxJQUFJLEVBQUU7QUFBRSx5QkFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQUU7T0FDdEQ7S0FDRixDQUFDLENBQUM7O0FBRUgsYUFBUyxDQUNQLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2FBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0tBQUUsQ0FBQyxFQUNoRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2FBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0tBQUUsQ0FBQyxDQUNuRCxDQUFDOztBQUVGLFFBQUksVUFBVSxHQUFHLElBQUksQ0FBQzs7QUFFdEIsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDL0MsVUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDckQsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsY0FBTTtPQUNQO0tBQ0Y7O0FBRUQsTUFBRSxDQUFDLFVBQVUsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO0dBQ3JEOztBQUVELE9BQUssQ0FBQyxNQUFNLENBQUMsd0NBQXdDLENBQUMsQ0FBQzs7QUFFdkQsTUFBSSxDQUFDLHlCQUF5QixFQUFFLFlBQVc7QUFDekMsUUFBSSxHQUFHLEdBQUcsZ0JBaENILEtBQUssK0VBZ0NrRixDQUFDOztBQUUvRixrQkFBYyxDQUFDLEdBQUcsRUFBRSxDQUNsQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFDZCxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkQsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNuRCxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25ELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkQsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFDL0MsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUMvQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxDQUNmLENBQUMsQ0FBQztHQUNKLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsbUJBQW1CLEVBQUUsWUFBVztBQUNuQyxRQUFJLEdBQUcsR0FBRyxnQkFuRUgsS0FBSyw0RUFtRStFLENBQUM7O0FBRTVGLGtCQUFjLENBQUMsR0FBRyxFQUFFLENBQ2xCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUNkLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3hDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN4QyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDeEMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3hDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25DLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25DLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN4QyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDeEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzdDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUM3QyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDN0MsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzdDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN4QyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pELENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQ3ZELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FB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QUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDOUIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN0QyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQzlCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLENBQ2YsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxXQUFXLEVBQUUsWUFBVztBQUMzQixRQUFJLEdBQUcsR0FBRyxnQkFsSkgsS0FBSyxDQW1KVixtRUFDa0QsQ0FDbkQsQ0FBQzs7QUFFRixrQkFBYyxDQUFDLEdBQUcsRUFBRSxDQUNsQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFDZCxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN0QixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNoQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNoQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNoQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNoQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxDQUNmLENBQUMsQ0FBQztHQUNKLENBQUMsQ0FBQzs7QUFFSCxNQUFJLENBQUMsWUFBWSxFQUFFLFlBQVc7QUFDNUIsUUFBSSxHQUFHLEdBQUcsZ0JBdExILEtBQUssQ0F1TFYscUNBQ3FCLHdGQUNnRSxDQUN0RixDQUFDOztBQUVGLGtCQUFjLENBQUMsR0FBRyxFQUFFLENBQ2xCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUNkLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDOUIsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDOUIsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN0QixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQzlCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQzlCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN0QixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25ELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkQsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNuRCxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25ELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUMvQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFDL0MsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUMvQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDOUIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN0QyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3RDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQzlCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLENBQ2YsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxnQkFBZ0IsRUFBRSxZQUFXO0FBQ2hDLFFBQUksR0FBRyxHQUFHLGdCQXZPSCxLQUFLLG1JQTJPUixDQUFDOztBQUVMLGtCQUFjLENBQUMsR0FBRyxFQUFFLENBQ2xCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUNkLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3JDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUNyQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzFDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMxQyxDQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDMUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3JDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDOUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDcEQsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDcEQsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUM5QyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzlDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQ3BELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQ3BELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDOUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3JDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2hDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BELENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN4RCxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQzlELENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQ25FLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQ25FLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hFLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQ25FLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQ25FLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDOUQsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hELENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9DLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDMUMsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsTUFBTSxFQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLENBQ2YsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxVQUFVLEVBQUUsWUFBVztBQUMxQixRQUFJLEdBQUcsR0FBRyxnQkF4U0gsS0FBSyxzREF3U3lELENBQUM7O0FBRXRFLGtCQUFjLENBQUMsR0FBRyxFQUFFLENBQ2xCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUNkLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEIsQ0FBQyxNQUFNLEVBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztBQUl0QixLQUFDLE1BQU0sRUFBRyxHQUFHLENBQUMsQ0FDZixDQUFDLENBQUM7R0FDSixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC92aXNpdGluZy1ub2RlLXRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYXJzZSwgdHJhdmVyc2UgfSBmcm9tICcuLi8uLi9odG1sYmFycy1zeW50YXgnO1xuXG5mdW5jdGlvbiB0cmF2ZXJzYWxFcXVhbChub2RlLCBleHBlY3RlZFRyYXZlcnNhbCkge1xuICBsZXQgYWN0dWFsVHJhdmVyc2FsID0gW107XG5cbiAgdHJhdmVyc2Uobm9kZSwge1xuICAgIEFsbDoge1xuICAgICAgZW50ZXIobm9kZSkgeyBhY3R1YWxUcmF2ZXJzYWwucHVzaChbJ2VudGVyJywgbm9kZV0pOyB9LFxuICAgICAgZXhpdChub2RlKSB7IGFjdHVhbFRyYXZlcnNhbC5wdXNoKFsnZXhpdCcsICBub2RlXSk7IH1cbiAgICB9XG4gIH0pO1xuXG4gIGRlZXBFcXVhbChcbiAgICBhY3R1YWxUcmF2ZXJzYWwubWFwKGEgPT4gYCR7YVswXX0gJHthWzFdLnR5cGV9YCksXG4gICAgZXhwZWN0ZWRUcmF2ZXJzYWwubWFwKGEgPT4gYCR7YVswXX0gJHthWzFdLnR5cGV9YClcbiAgKTtcblxuICBsZXQgbm9kZXNFcXVhbCA9IHRydWU7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY3R1YWxUcmF2ZXJzYWwubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYWN0dWFsVHJhdmVyc2FsW2ldWzFdICE9PSBleHBlY3RlZFRyYXZlcnNhbFtpXVsxXSkge1xuICAgICAgbm9kZXNFcXVhbCA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgb2sobm9kZXNFcXVhbCwgXCJBY3R1YWwgbm9kZXMgbWF0Y2ggZXhwZWN0ZWQgbm9kZXNcIik7XG59XG5cblFVbml0Lm1vZHVsZSgnW2h0bWxiYXJzLXN5bnRheF0gVHJhdmVyc2FsIC0gdmlzaXRpbmcnKTtcblxudGVzdCgnRWxlbWVudHMgYW5kIGF0dHJpYnV0ZXMnLCBmdW5jdGlvbigpIHtcbiAgbGV0IGFzdCA9IHBhcnNlKGA8ZGl2IGlkPVwiaWRcIiBjbGFzcz1cImxhcmdlIHt7Y2xhc3Nlc319XCIgdmFsdWU9e3t2YWx1ZX19PjxiPjwvYj48Yj48L2I+PC9kaXY+YCk7XG5cbiAgdHJhdmVyc2FsRXF1YWwoYXN0LCBbXG4gICAgWydlbnRlcicsIGFzdF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0uYXR0cmlidXRlc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmF0dHJpYnV0ZXNbMF0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzBdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uYXR0cmlidXRlc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmF0dHJpYnV0ZXNbMV1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzFdLnZhbHVlXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0uYXR0cmlidXRlc1sxXS52YWx1ZS5wYXJ0c1swXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmF0dHJpYnV0ZXNbMV0udmFsdWUucGFydHNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzFdLnZhbHVlLnBhcnRzWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uYXR0cmlidXRlc1sxXS52YWx1ZS5wYXJ0c1sxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmF0dHJpYnV0ZXNbMV0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0uYXR0cmlidXRlc1syXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmF0dHJpYnV0ZXNbMl0udmFsdWVdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzJdLnZhbHVlLnBhdGhdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzJdLnZhbHVlLnBhdGhdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzJdLnZhbHVlLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzJdLnZhbHVlLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5hdHRyaWJ1dGVzWzJdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uYXR0cmlidXRlc1syXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmNoaWxkcmVuWzBdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uY2hpbGRyZW5bMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5jaGlsZHJlblsxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmNoaWxkcmVuWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF1dLFxuICAgIFsnZXhpdCcsICBhc3RdXG4gIF0pO1xufSk7XG5cbnRlc3QoJ0VsZW1lbnQgbW9kaWZpZXJzJywgZnVuY3Rpb24oKSB7XG4gIGxldCBhc3QgPSBwYXJzZShgPGRpdiB7e21vZGlmaWVyfX17e21vZGlmaWVyIHBhcmFtMSBwYXJhbTIga2V5MT12YWx1ZSBrZXkyPXZhbHVlfX0+PC9kaXY+YCk7XG5cbiAgdHJhdmVyc2FsRXF1YWwoYXN0LCBbXG4gICAgWydlbnRlcicsIGFzdF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzBdLnBhdGhdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5tb2RpZmllcnNbMF0ucGF0aF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1swXS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzBdLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5tb2RpZmllcnNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5tb2RpZmllcnNbMV1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5tb2RpZmllcnNbMV0ucGF0aF0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1sxXS5wYXRoXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzFdLnBhcmFtc1swXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1sxXS5wYXJhbXNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5tb2RpZmllcnNbMV0ucGFyYW1zWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzFdLnBhcmFtc1sxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1sxXS5oYXNoXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzFdLmhhc2gucGFpcnNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5tb2RpZmllcnNbMV0uaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1sxXS5oYXNoLnBhaXJzWzBdLnZhbHVlXSxcbiAgICBbJ2V4aXQnICwgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzFdLmhhc2gucGFpcnNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5tb2RpZmllcnNbMV0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1sxXS5oYXNoLnBhaXJzWzFdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzFdLmhhc2gucGFpcnNbMV0udmFsdWVdLFxuICAgIFsnZXhpdCcgLCBhc3QuYm9keVswXS5tb2RpZmllcnNbMV0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLm1vZGlmaWVyc1sxXS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ubW9kaWZpZXJzWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF1dLFxuICAgIFsnZXhpdCcsICBhc3RdXG4gIF0pO1xufSk7XG5cbnRlc3QoJ0Jsb2NrcycsIGZ1bmN0aW9uKCkge1xuICBsZXQgYXN0ID0gcGFyc2UoXG4gICAgYHt7I2Jsb2NrfX17ey9ibG9ja319YCArXG4gICAgYHt7I2Jsb2NrIHBhcmFtMSBwYXJhbTIga2V5MT12YWx1ZSBrZXkyPXZhbHVlfX08Yj48L2I+PGI+PC9iPnt7L2Jsb2NrfX1gXG4gICk7XG5cbiAgdHJhdmVyc2FsRXF1YWwoYXN0LCBbXG4gICAgWydlbnRlcicsIGFzdF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ucGF0aF0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLnBhdGhdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnByb2dyYW1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5wcm9ncmFtXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLnBhdGhdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5wYXRoXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV0ucGFyYW1zWzBdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV0ucGFyYW1zWzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV0ucGFyYW1zWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV0ucGFyYW1zWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV0uaGFzaF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLmhhc2gucGFpcnNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXS5oYXNoLnBhaXJzWzBdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV0uaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzFdLmhhc2gucGFpcnNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXS5oYXNoLnBhaXJzWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV0uaGFzaC5wYWlyc1sxXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzFdLmhhc2gucGFpcnNbMV0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5oYXNoLnBhaXJzWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV0uaGFzaF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLnByb2dyYW1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXS5wcm9ncmFtLmJvZHlbMF1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5wcm9ncmFtLmJvZHlbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXS5wcm9ncmFtLmJvZHlbMV1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5wcm9ncmFtLmJvZHlbMV1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5wcm9ncmFtXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV1dLFxuICAgIFsnZXhpdCcsICBhc3RdXG4gIF0pO1xufSk7XG5cbnRlc3QoJ011c3RhY2hlcycsIGZ1bmN0aW9uKCkge1xuICBsZXQgYXN0ID0gcGFyc2UoXG4gICAgYHt7bXVzdGFjaGV9fWAgK1xuICAgIGB7e211c3RhY2hlIHBhcmFtMSBwYXJhbTIga2V5MT12YWx1ZSBrZXkyPXZhbHVlfX1gXG4gICk7XG5cbiAgdHJhdmVyc2FsRXF1YWwoYXN0LCBbXG4gICAgWydlbnRlcicsIGFzdF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ucGF0aF0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLnBhdGhdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaF0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXS5wYXRoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV0ucGF0aF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLnBhcmFtc1swXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzFdLnBhcmFtc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLnBhcmFtc1sxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzFdLnBhcmFtc1sxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLmhhc2hdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXS5oYXNoLnBhaXJzWzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV0uaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzFdLmhhc2gucGFpcnNbMF0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5oYXNoLnBhaXJzWzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMV0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLmhhc2gucGFpcnNbMV0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5oYXNoLnBhaXJzWzFdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzFdLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXV0sXG4gICAgWydleGl0JywgIGFzdF1cbiAgXSk7XG59KTtcblxudGVzdCgnQ29tcG9uZW50cycsIGZ1bmN0aW9uKCkge1xuICBsZXQgYXN0ID0gcGFyc2UoXG4gICAgYDx4LWJsb2NrIC8+YCArXG4gICAgYDx4LWJsb2NrPjwveC1ibG9jaz5gICtcbiAgICBgPHgtYmxvY2sgaWQ9XCJpZFwiIGNsYXNzPVwibGFyZ2Uge3tjbGFzc2VzfX1cIiB2YWx1ZT17e3ZhbHVlfX0+PGI+PC9iPjxiPjwvYj48L3gtYmxvY2s+YFxuICApO1xuXG4gIHRyYXZlcnNhbEVxdWFsKGFzdCwgW1xuICAgIFsnZW50ZXInLCBhc3RdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnByb2dyYW1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5wcm9ncmFtXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzFdLnByb2dyYW1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsxXS5wcm9ncmFtXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMV1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsyXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzJdLmF0dHJpYnV0ZXNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsyXS5hdHRyaWJ1dGVzWzBdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1swXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzJdLmF0dHJpYnV0ZXNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsyXS5hdHRyaWJ1dGVzWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1sxXS52YWx1ZV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzJdLmF0dHJpYnV0ZXNbMV0udmFsdWUucGFydHNbMF1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsyXS5hdHRyaWJ1dGVzWzFdLnZhbHVlLnBhcnRzWzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1sxXS52YWx1ZS5wYXJ0c1sxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzJdLmF0dHJpYnV0ZXNbMV0udmFsdWUucGFydHNbMV1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVsyXS5hdHRyaWJ1dGVzWzFdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1sxXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzJdLmF0dHJpYnV0ZXNbMl1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsyXS5hdHRyaWJ1dGVzWzJdLnZhbHVlXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1syXS52YWx1ZS5wYXRoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1syXS52YWx1ZS5wYXRoXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1syXS52YWx1ZS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1syXS52YWx1ZS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0uYXR0cmlidXRlc1syXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzJdLmF0dHJpYnV0ZXNbMl1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVsyXS5wcm9ncmFtXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMl0ucHJvZ3JhbS5ib2R5WzBdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0ucHJvZ3JhbS5ib2R5WzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMl0ucHJvZ3JhbS5ib2R5WzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0ucHJvZ3JhbS5ib2R5WzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMl0ucHJvZ3JhbV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzJdXSxcbiAgICBbJ2V4aXQnLCAgYXN0XVxuICBdKTtcbn0pO1xuXG50ZXN0KCdOZXN0ZWQgaGVscGVycycsIGZ1bmN0aW9uKCkge1xuICBsZXQgYXN0ID0gcGFyc2UoYHt7aGVscGVyXG4gICAgKGhlbHBlciBwYXJhbTEgcGFyYW0yIGtleTE9dmFsdWUga2V5Mj12YWx1ZSlcbiAgICBrZXkxPShoZWxwZXIgcGFyYW0pXG4gICAga2V5Mj0oaGVscGVyIGtleT0oaGVscGVyIHBhcmFtKSlcbiAgfX1gKTtcblxuICB0cmF2ZXJzYWxFcXVhbChhc3QsIFtcbiAgICBbJ2VudGVyJywgYXN0XSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5wYXRoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ucGF0aF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnBhcmFtc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnBhcmFtc1swXS5wYXRoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ucGFyYW1zWzBdLnBhdGhdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5wYXJhbXNbMF0ucGFyYW1zWzBdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ucGFyYW1zWzBdLnBhcmFtc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnBhcmFtc1swXS5wYXJhbXNbMV1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5wYXJhbXNbMF0ucGFyYW1zWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ucGFyYW1zWzBdLmhhc2hdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5wYXJhbXNbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnBhcmFtc1swXS5oYXNoLnBhaXJzWzBdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ucGFyYW1zWzBdLmhhc2gucGFpcnNbMF0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5wYXJhbXNbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLnBhcmFtc1swXS5oYXNoLnBhaXJzWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0ucGFyYW1zWzBdLmhhc2gucGFpcnNbMV0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5wYXJhbXNbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLnBhcmFtc1swXS5oYXNoLnBhaXJzWzFdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0ucGFyYW1zWzBdLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5wYXJhbXNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMF0udmFsdWVdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzBdLnZhbHVlLnBhdGhdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzBdLnZhbHVlLnBhdGhdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzBdLnZhbHVlLnBhcmFtc1swXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMF0udmFsdWUucGFyYW1zWzBdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXS52YWx1ZS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXS52YWx1ZS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMF1dLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzFdXSxcbiAgICBbJ2VudGVyJywgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUucGF0aF0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUucGF0aF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUuaGFzaF0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUuaGFzaC5wYWlyc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUuaGFzaC5wYWlyc1swXS52YWx1ZV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUuaGFzaC5wYWlyc1swXS52YWx1ZS5wYXRoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZS5oYXNoLnBhaXJzWzBdLnZhbHVlLnBhdGhdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzFdLnZhbHVlLmhhc2gucGFpcnNbMF0udmFsdWUucGFyYW1zWzBdXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZS5oYXNoLnBhaXJzWzBdLnZhbHVlLnBhcmFtc1swXV0sXG4gICAgWydlbnRlcicsIGFzdC5ib2R5WzBdLmhhc2gucGFpcnNbMV0udmFsdWUuaGFzaC5wYWlyc1swXS52YWx1ZS5oYXNoXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXS52YWx1ZS5oYXNoLnBhaXJzWzBdLnZhbHVlLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzFdLnZhbHVlLmhhc2gucGFpcnNbMF0udmFsdWVdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzFdLnZhbHVlLmhhc2gucGFpcnNbMF1dLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzFdLnZhbHVlLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXS5oYXNoLnBhaXJzWzFdLnZhbHVlXSxcbiAgICBbJ2V4aXQnLCAgYXN0LmJvZHlbMF0uaGFzaC5wYWlyc1sxXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdLmhhc2hdLFxuICAgIFsnZXhpdCcsICBhc3QuYm9keVswXV0sXG4gICAgWydleGl0JywgIGFzdF1cbiAgXSk7XG59KTtcblxudGVzdCgnQ29tbWVudHMnLCBmdW5jdGlvbigpIHtcbiAgbGV0IGFzdCA9IHBhcnNlKGA8IS0tIEhUTUwgY29tbWVudCAtLT57eyEtLSBIYW5kbGViYXJzIGNvbW1lbnQgLS19fWApO1xuXG4gIHRyYXZlcnNhbEVxdWFsKGFzdCwgW1xuICAgIFsnZW50ZXInLCBhc3RdLFxuICAgIFsnZW50ZXInLCBhc3QuYm9keVswXV0sXG4gICAgWydleGl0JywgIGFzdC5ib2R5WzBdXSxcbiAgICAvLyBUT0RPOiBFbnN1cmUgSGFuZGxlYmFycyBjb21tZW50cyBhcmUgaW4gdGhlIEFTVC5cbiAgICAvLyBbJ2VudGVyJywgYXN0LmJvZHlbMV1dLFxuICAgIC8vIFsnZXhpdCcsICBhc3QuYm9keVsxXV0sXG4gICAgWydleGl0JywgIGFzdF1cbiAgXSk7XG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/traversal/visiting-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/traversal');
  QUnit.test('htmlbars-syntax-tests/traversal/visiting-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/traversal/visiting-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvdmlzaXRpbmctbm9kZS10ZXN0LmpzaGludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBSyxDQUFDLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0FBQ3pELE9BQUssQ0FBQyxJQUFJLENBQUMsMEVBQTBFLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDdEcsVUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMkVBQTJFLENBQUMsQ0FBQztHQUM5RixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC92aXNpdGluZy1ub2RlLXRlc3QuanNoaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiUVVuaXQubW9kdWxlKCdKU0hpbnQgLSBodG1sYmFycy1zeW50YXgtdGVzdHMvdHJhdmVyc2FsJyk7XG5RVW5pdC50ZXN0KCdodG1sYmFycy1zeW50YXgtdGVzdHMvdHJhdmVyc2FsL3Zpc2l0aW5nLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC92aXNpdGluZy1ub2RlLXRlc3QuanMgc2hvdWxkIHBhc3MganNoaW50LicpOyBcbn0pO1xuIl19
define('htmlbars-syntax-tests/traversal/walker-node-test', ['exports', '../../htmlbars-syntax'], function (exports, _htmlbarsSyntax) {

  function compareWalkedNodes(html, expected) {
    var ast = _htmlbarsSyntax.parse(html);
    var walker = new _htmlbarsSyntax.Walker();
    var nodes = [];

    walker.visit(ast, function (node) {
      nodes.push(node.type);
    });

    deepEqual(nodes, expected);
  }

  QUnit.module('[htmlbars-syntax] AST Walker');

  test('walks elements', function () {
    compareWalkedNodes('<div><li></li></div>', ['Program', 'ElementNode', 'ElementNode']);
  });

  test('walks blocks', function () {
    compareWalkedNodes('{{#foo}}<li></li>{{/foo}}', ['Program', 'BlockStatement', 'Program', 'ElementNode']);
  });

  test('walks components', function () {
    compareWalkedNodes('<my-foo><li></li></my-foo>', ['Program', 'ComponentNode', 'Program', 'ElementNode']);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvd2Fsa2VyLW5vZGUtdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLFdBQVMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtBQUMxQyxRQUFJLEdBQUcsR0FBRyxnQkFISCxLQUFLLENBR0ksSUFBSSxDQUFDLENBQUM7QUFDdEIsUUFBSSxNQUFNLEdBQUcsb0JBSkMsTUFBTSxFQUlLLENBQUM7QUFDMUIsUUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVmLFVBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQy9CLFdBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3ZCLENBQUMsQ0FBQzs7QUFFSCxhQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQzVCOztBQUVELE9BQUssQ0FBQyxNQUFNLENBQUMsOEJBQThCLENBQUMsQ0FBQzs7QUFFN0MsTUFBSSxDQUFDLGdCQUFnQixFQUFFLFlBQVc7QUFDaEMsc0JBQWtCLENBQUMsc0JBQXNCLEVBQUUsQ0FDekMsU0FBUyxFQUNULGFBQWEsRUFDYixhQUFhLENBQ2QsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxjQUFjLEVBQUUsWUFBVztBQUM5QixzQkFBa0IsQ0FBQywyQkFBMkIsRUFBRSxDQUM5QyxTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLFNBQVMsRUFDVCxhQUFhLENBQ2QsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFXO0FBQ2xDLHNCQUFrQixDQUFDLDRCQUE0QixFQUFFLENBQy9DLFNBQVMsRUFDVCxlQUFlLEVBQ2YsU0FBUyxFQUNULGFBQWEsQ0FDZCxDQUFDLENBQUM7R0FDSixDQUFDLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC93YWxrZXItbm9kZS10ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyc2UsIFdhbGtlciB9IGZyb20gJy4uLy4uL2h0bWxiYXJzLXN5bnRheCc7XG5cbmZ1bmN0aW9uIGNvbXBhcmVXYWxrZWROb2RlcyhodG1sLCBleHBlY3RlZCkge1xuICB2YXIgYXN0ID0gcGFyc2UoaHRtbCk7XG4gIHZhciB3YWxrZXIgPSBuZXcgV2Fsa2VyKCk7XG4gIHZhciBub2RlcyA9IFtdO1xuXG4gIHdhbGtlci52aXNpdChhc3QsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBub2Rlcy5wdXNoKG5vZGUudHlwZSk7XG4gIH0pO1xuXG4gIGRlZXBFcXVhbChub2RlcywgZXhwZWN0ZWQpO1xufVxuXG5RVW5pdC5tb2R1bGUoJ1todG1sYmFycy1zeW50YXhdIEFTVCBXYWxrZXInKTtcblxudGVzdCgnd2Fsa3MgZWxlbWVudHMnLCBmdW5jdGlvbigpIHtcbiAgY29tcGFyZVdhbGtlZE5vZGVzKCc8ZGl2PjxsaT48L2xpPjwvZGl2PicsIFtcbiAgICAnUHJvZ3JhbScsXG4gICAgJ0VsZW1lbnROb2RlJyxcbiAgICAnRWxlbWVudE5vZGUnXG4gIF0pO1xufSk7XG5cbnRlc3QoJ3dhbGtzIGJsb2NrcycsIGZ1bmN0aW9uKCkge1xuICBjb21wYXJlV2Fsa2VkTm9kZXMoJ3t7I2Zvb319PGxpPjwvbGk+e3svZm9vfX0nLCBbXG4gICAgJ1Byb2dyYW0nLFxuICAgICdCbG9ja1N0YXRlbWVudCcsXG4gICAgJ1Byb2dyYW0nLFxuICAgICdFbGVtZW50Tm9kZSdcbiAgXSk7XG59KTtcblxudGVzdCgnd2Fsa3MgY29tcG9uZW50cycsIGZ1bmN0aW9uKCkge1xuICBjb21wYXJlV2Fsa2VkTm9kZXMoJzxteS1mb28+PGxpPjwvbGk+PC9teS1mb28+JywgW1xuICAgICdQcm9ncmFtJyxcbiAgICAnQ29tcG9uZW50Tm9kZScsXG4gICAgJ1Byb2dyYW0nLFxuICAgICdFbGVtZW50Tm9kZSdcbiAgXSk7XG59KTtcbiJdfQ==
define('htmlbars-syntax-tests/traversal/walker-node-test.jshint', ['exports'], function (exports) {
  QUnit.module('JSHint - htmlbars-syntax-tests/traversal');
  QUnit.test('htmlbars-syntax-tests/traversal/walker-node-test.js should pass jshint', function (assert) {
    assert.ok(true, 'htmlbars-syntax-tests/traversal/walker-node-test.js should pass jshint.');
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvd2Fsa2VyLW5vZGUtdGVzdC5qc2hpbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQUssQ0FBQyxNQUFNLENBQUMsMENBQTBDLENBQUMsQ0FBQztBQUN6RCxPQUFLLENBQUMsSUFBSSxDQUFDLHdFQUF3RSxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3BHLFVBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLHlFQUF5RSxDQUFDLENBQUM7R0FDNUYsQ0FBQyxDQUFDIiwiZmlsZSI6Imh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvd2Fsa2VyLW5vZGUtdGVzdC5qc2hpbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJRVW5pdC5tb2R1bGUoJ0pTSGludCAtIGh0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwnKTtcblFVbml0LnRlc3QoJ2h0bWxiYXJzLXN5bnRheC10ZXN0cy90cmF2ZXJzYWwvd2Fsa2VyLW5vZGUtdGVzdC5qcyBzaG91bGQgcGFzcyBqc2hpbnQnLCBmdW5jdGlvbihhc3NlcnQpIHsgXG4gIGFzc2VydC5vayh0cnVlLCAnaHRtbGJhcnMtc3ludGF4LXRlc3RzL3RyYXZlcnNhbC93YWxrZXItbm9kZS10ZXN0LmpzIHNob3VsZCBwYXNzIGpzaGludC4nKTsgXG59KTtcbiJdfQ==