exports.__esModule = true;
exports.compileSpec = compileSpec;
exports.template = template;
exports.compile = compile;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/*jshint evil:true*/

var _htmlbarsSyntaxParser = require("../htmlbars-syntax/parser");

var _templateCompiler = require("./template-compiler");

var _templateCompiler2 = _interopRequireDefault(_templateCompiler);

var _htmlbarsRuntimeHooks = require("../htmlbars-runtime/hooks");

var _htmlbarsRuntimeRender = require("../htmlbars-runtime/render");

var _htmlbarsRuntimeRender2 = _interopRequireDefault(_htmlbarsRuntimeRender);

/*
 * Compile a string into a template spec string. The template spec is a string
 * representation of a template. Usually, you would use compileSpec for
 * pre-compilation of a template on the server.
 *
 * Example usage:
 *
 *     var templateSpec = compileSpec("Howdy {{name}}");
 *     // This next step is basically what plain compile does
 *     var template = new Function("return " + templateSpec)();
 *
 * @method compileSpec
 * @param {String} string An HTMLBars template string
 * @return {TemplateSpec} A template spec string
 */

function compileSpec(string, options) {
  var ast = _htmlbarsSyntaxParser.preprocess(string, options);
  var compiler = new _templateCompiler2.default(options);
  var program = compiler.compile(ast);
  return program;
}

/*
 * @method template
 * @param {TemplateSpec} templateSpec A precompiled template
 * @return {Template} A template spec string
 */

function template(templateSpec) {
  return new Function("return " + templateSpec)();
}

/*
 * Compile a string into a template rendering function
 *
 * Example usage:
 *
 *     // Template is the hydration portion of the compiled template
 *     var template = compile("Howdy {{name}}");
 *
 *     // Template accepts three arguments:
 *     //
 *     //   1. A context object
 *     //   2. An env object
 *     //   3. A contextualElement (optional, document.body is the default)
 *     //
 *     // The env object *must* have at least these two properties:
 *     //
 *     //   1. `hooks` - Basic hooks for rendering a template
 *     //   2. `dom` - An instance of DOMHelper
 *     //
 *     import {hooks} from 'htmlbars-runtime';
 *     import {DOMHelper} from 'morph';
 *     var context = {name: 'whatever'},
 *         env = {hooks: hooks, dom: new DOMHelper()},
 *         contextualElement = document.body;
 *     var domFragment = template(context, env, contextualElement);
 *
 * @method compile
 * @param {String} string An HTMLBars template string
 * @param {Object} options A set of options to provide to the compiler
 * @return {Template} A function for rendering the template
 */

function compile(string, options) {
  return _htmlbarsRuntimeHooks.wrap(template(compileSpec(string, options)), _htmlbarsRuntimeRender2.default);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLWNvbXBpbGVyL2NvbXBpbGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztvQ0FDMkIsMkJBQTJCOztnQ0FDekIscUJBQXFCOzs7O29DQUM3QiwyQkFBMkI7O3FDQUM3Qiw0QkFBNEI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJ4QyxTQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFO0FBQzNDLE1BQUksR0FBRyxHQUFHLGlDQUFXLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN0QyxNQUFJLFFBQVEsR0FBRywrQkFBcUIsT0FBTyxDQUFDLENBQUM7QUFDN0MsTUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQyxTQUFPLE9BQU8sQ0FBQztDQUNoQjs7Ozs7Ozs7QUFPTSxTQUFTLFFBQVEsQ0FBQyxZQUFZLEVBQUU7QUFDckMsU0FBTyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLEVBQUUsQ0FBQztDQUNqRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWlDTSxTQUFTLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFO0FBQ3ZDLFNBQU8sMkJBQUssUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsa0NBQVMsQ0FBQztDQUM3RCIsImZpbGUiOiJodG1sYmFycy1jb21waWxlci9jb21waWxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qanNoaW50IGV2aWw6dHJ1ZSovXG5pbXBvcnQgeyBwcmVwcm9jZXNzIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXN5bnRheC9wYXJzZXJcIjtcbmltcG9ydCBUZW1wbGF0ZUNvbXBpbGVyIGZyb20gXCIuL3RlbXBsYXRlLWNvbXBpbGVyXCI7XG5pbXBvcnQgeyB3cmFwIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXJ1bnRpbWUvaG9va3NcIjtcbmltcG9ydCByZW5kZXIgZnJvbSBcIi4uL2h0bWxiYXJzLXJ1bnRpbWUvcmVuZGVyXCI7XG5cbi8qXG4gKiBDb21waWxlIGEgc3RyaW5nIGludG8gYSB0ZW1wbGF0ZSBzcGVjIHN0cmluZy4gVGhlIHRlbXBsYXRlIHNwZWMgaXMgYSBzdHJpbmdcbiAqIHJlcHJlc2VudGF0aW9uIG9mIGEgdGVtcGxhdGUuIFVzdWFsbHksIHlvdSB3b3VsZCB1c2UgY29tcGlsZVNwZWMgZm9yXG4gKiBwcmUtY29tcGlsYXRpb24gb2YgYSB0ZW1wbGF0ZSBvbiB0aGUgc2VydmVyLlxuICpcbiAqIEV4YW1wbGUgdXNhZ2U6XG4gKlxuICogICAgIHZhciB0ZW1wbGF0ZVNwZWMgPSBjb21waWxlU3BlYyhcIkhvd2R5IHt7bmFtZX19XCIpO1xuICogICAgIC8vIFRoaXMgbmV4dCBzdGVwIGlzIGJhc2ljYWxseSB3aGF0IHBsYWluIGNvbXBpbGUgZG9lc1xuICogICAgIHZhciB0ZW1wbGF0ZSA9IG5ldyBGdW5jdGlvbihcInJldHVybiBcIiArIHRlbXBsYXRlU3BlYykoKTtcbiAqXG4gKiBAbWV0aG9kIGNvbXBpbGVTcGVjXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIEFuIEhUTUxCYXJzIHRlbXBsYXRlIHN0cmluZ1xuICogQHJldHVybiB7VGVtcGxhdGVTcGVjfSBBIHRlbXBsYXRlIHNwZWMgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlU3BlYyhzdHJpbmcsIG9wdGlvbnMpIHtcbiAgdmFyIGFzdCA9IHByZXByb2Nlc3Moc3RyaW5nLCBvcHRpb25zKTtcbiAgdmFyIGNvbXBpbGVyID0gbmV3IFRlbXBsYXRlQ29tcGlsZXIob3B0aW9ucyk7XG4gIHZhciBwcm9ncmFtID0gY29tcGlsZXIuY29tcGlsZShhc3QpO1xuICByZXR1cm4gcHJvZ3JhbTtcbn1cblxuLypcbiAqIEBtZXRob2QgdGVtcGxhdGVcbiAqIEBwYXJhbSB7VGVtcGxhdGVTcGVjfSB0ZW1wbGF0ZVNwZWMgQSBwcmVjb21waWxlZCB0ZW1wbGF0ZVxuICogQHJldHVybiB7VGVtcGxhdGV9IEEgdGVtcGxhdGUgc3BlYyBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYykge1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwicmV0dXJuIFwiICsgdGVtcGxhdGVTcGVjKSgpO1xufVxuXG4vKlxuICogQ29tcGlsZSBhIHN0cmluZyBpbnRvIGEgdGVtcGxhdGUgcmVuZGVyaW5nIGZ1bmN0aW9uXG4gKlxuICogRXhhbXBsZSB1c2FnZTpcbiAqXG4gKiAgICAgLy8gVGVtcGxhdGUgaXMgdGhlIGh5ZHJhdGlvbiBwb3J0aW9uIG9mIHRoZSBjb21waWxlZCB0ZW1wbGF0ZVxuICogICAgIHZhciB0ZW1wbGF0ZSA9IGNvbXBpbGUoXCJIb3dkeSB7e25hbWV9fVwiKTtcbiAqXG4gKiAgICAgLy8gVGVtcGxhdGUgYWNjZXB0cyB0aHJlZSBhcmd1bWVudHM6XG4gKiAgICAgLy9cbiAqICAgICAvLyAgIDEuIEEgY29udGV4dCBvYmplY3RcbiAqICAgICAvLyAgIDIuIEFuIGVudiBvYmplY3RcbiAqICAgICAvLyAgIDMuIEEgY29udGV4dHVhbEVsZW1lbnQgKG9wdGlvbmFsLCBkb2N1bWVudC5ib2R5IGlzIHRoZSBkZWZhdWx0KVxuICogICAgIC8vXG4gKiAgICAgLy8gVGhlIGVudiBvYmplY3QgKm11c3QqIGhhdmUgYXQgbGVhc3QgdGhlc2UgdHdvIHByb3BlcnRpZXM6XG4gKiAgICAgLy9cbiAqICAgICAvLyAgIDEuIGBob29rc2AgLSBCYXNpYyBob29rcyBmb3IgcmVuZGVyaW5nIGEgdGVtcGxhdGVcbiAqICAgICAvLyAgIDIuIGBkb21gIC0gQW4gaW5zdGFuY2Ugb2YgRE9NSGVscGVyXG4gKiAgICAgLy9cbiAqICAgICBpbXBvcnQge2hvb2tzfSBmcm9tICdodG1sYmFycy1ydW50aW1lJztcbiAqICAgICBpbXBvcnQge0RPTUhlbHBlcn0gZnJvbSAnbW9ycGgnO1xuICogICAgIHZhciBjb250ZXh0ID0ge25hbWU6ICd3aGF0ZXZlcid9LFxuICogICAgICAgICBlbnYgPSB7aG9va3M6IGhvb2tzLCBkb206IG5ldyBET01IZWxwZXIoKX0sXG4gKiAgICAgICAgIGNvbnRleHR1YWxFbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAqICAgICB2YXIgZG9tRnJhZ21lbnQgPSB0ZW1wbGF0ZShjb250ZXh0LCBlbnYsIGNvbnRleHR1YWxFbGVtZW50KTtcbiAqXG4gKiBAbWV0aG9kIGNvbXBpbGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgQW4gSFRNTEJhcnMgdGVtcGxhdGUgc3RyaW5nXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBIHNldCBvZiBvcHRpb25zIHRvIHByb3ZpZGUgdG8gdGhlIGNvbXBpbGVyXG4gKiBAcmV0dXJuIHtUZW1wbGF0ZX0gQSBmdW5jdGlvbiBmb3IgcmVuZGVyaW5nIHRoZSB0ZW1wbGF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZShzdHJpbmcsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIHdyYXAodGVtcGxhdGUoY29tcGlsZVNwZWMoc3RyaW5nLCBvcHRpb25zKSksIHJlbmRlcik7XG59XG4iXX0=