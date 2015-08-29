function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _morphList = require('./morph-list');

var _morphList2 = _interopRequireDefault(_morphList);

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.MorphList = factory();
  }
})(this, function () {
  return _morphList2.default;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vcnBoLXJhbmdlL21vcnBoLWxpc3QudW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O3lCQUFzQixjQUFjOzs7O0FBRXBDLEFBQUMsQ0FBQSxVQUFVLElBQUksRUFBRSxPQUFPLEVBQUU7QUFDeEIsTUFBSSxPQUFPLE1BQU0sS0FBSyxVQUFVLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtBQUM5QyxVQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0dBQ3JCLE1BQU0sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7QUFDdEMsVUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLEVBQUUsQ0FBQztHQUM1QixNQUFNO0FBQ0wsUUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLEVBQUUsQ0FBQztHQUM1QjtDQUNGLENBQUEsQ0FBQyxJQUFJLEVBQUUsWUFBWTtBQUNsQiw2QkFBaUI7Q0FDbEIsQ0FBQyxDQUFFIiwiZmlsZSI6Im1vcnBoLXJhbmdlL21vcnBoLWxpc3QudW1kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1vcnBoTGlzdCBmcm9tICcuL21vcnBoLWxpc3QnO1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5Nb3JwaExpc3QgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gTW9ycGhMaXN0O1xufSkpO1xuIl19