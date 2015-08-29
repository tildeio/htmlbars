define('htmlbars-util', ['exports', './htmlbars-util/safe-string', './htmlbars-util/handlebars/utils', './htmlbars-util/namespaces', './htmlbars-util/morph-utils'], function (exports, _htmlbarsUtilSafeString, _htmlbarsUtilHandlebarsUtils, _htmlbarsUtilNamespaces, _htmlbarsUtilMorphUtils) {
  exports.SafeString = _htmlbarsUtilSafeString.default;
  exports.escapeExpression = _htmlbarsUtilHandlebarsUtils.escapeExpression;
  exports.getAttrNamespace = _htmlbarsUtilNamespaces.getAttrNamespace;
  exports.validateChildMorphs = _htmlbarsUtilMorphUtils.validateChildMorphs;
  exports.linkParams = _htmlbarsUtilMorphUtils.linkParams;
  exports.dump = _htmlbarsUtilMorphUtils.dump;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtVQU1FLFVBQVU7VUFDVixnQkFBZ0IsZ0NBTlQsZ0JBQWdCO1VBT3ZCLGdCQUFnQiwyQkFOVCxnQkFBZ0I7VUFPdkIsbUJBQW1CLDJCQU5aLG1CQUFtQjtVQU8xQixVQUFVLDJCQVBrQixVQUFVO1VBUXRDLElBQUksMkJBUm9DLElBQUkiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTYWZlU3RyaW5nIGZyb20gJy4vaHRtbGJhcnMtdXRpbC9zYWZlLXN0cmluZyc7XG5pbXBvcnQgeyBlc2NhcGVFeHByZXNzaW9uIH0gZnJvbSAnLi9odG1sYmFycy11dGlsL2hhbmRsZWJhcnMvdXRpbHMnO1xuaW1wb3J0IHsgZ2V0QXR0ck5hbWVzcGFjZSB9IGZyb20gJy4vaHRtbGJhcnMtdXRpbC9uYW1lc3BhY2VzJztcbmltcG9ydCB7IHZhbGlkYXRlQ2hpbGRNb3JwaHMsIGxpbmtQYXJhbXMsIGR1bXAgfSBmcm9tICcuL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMnO1xuXG5leHBvcnQge1xuICBTYWZlU3RyaW5nLFxuICBlc2NhcGVFeHByZXNzaW9uLFxuICBnZXRBdHRyTmFtZXNwYWNlLFxuICB2YWxpZGF0ZUNoaWxkTW9ycGhzLFxuICBsaW5rUGFyYW1zLFxuICBkdW1wXG59O1xuIl19
define('htmlbars-util/array-utils', ['exports'], function (exports) {
  exports.forEach = forEach;
  exports.map = map;

  function forEach(array, callback, binding) {
    var i, l;
    if (binding === undefined) {
      for (i = 0, l = array.length; i < l; i++) {
        callback(array[i], i, array);
      }
    } else {
      for (i = 0, l = array.length; i < l; i++) {
        callback.call(binding, array[i], i, array);
      }
    }
  }

  function map(array, callback) {
    var output = [];
    var i, l;

    for (i = 0, l = array.length; i < l; i++) {
      output.push(callback(array[i], i, array));
    }

    return output;
  }

  var getIdx;
  if (Array.prototype.indexOf) {
    getIdx = function (array, obj, from) {
      return array.indexOf(obj, from);
    };
  } else {
    getIdx = function (array, obj, from) {
      if (from === undefined || from === null) {
        from = 0;
      } else if (from < 0) {
        from = Math.max(0, array.length + from);
      }
      for (var i = from, l = array.length; i < l; i++) {
        if (array[i] === obj) {
          return i;
        }
      }
      return -1;
    };
  }

  var isArray = Array.isArray || function (array) {
    return Object.prototype.toString.call(array) === '[object Array]';
  };

  exports.isArray = isArray;
  var indexOfArray = getIdx;
  exports.indexOfArray = indexOfArray;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvYXJyYXktdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFPLFdBQVMsT0FBTyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO0FBQ2hELFFBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNULFFBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTtBQUN6QixXQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN4QyxnQkFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDOUI7S0FDRixNQUFNO0FBQ0wsV0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDeEMsZ0JBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDNUM7S0FDRjtHQUNGOztBQUVNLFdBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUU7QUFDbkMsUUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFFBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFVCxTQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN4QyxZQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDM0M7O0FBRUQsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxNQUFJLE1BQU0sQ0FBQztBQUNYLE1BQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7QUFDM0IsVUFBTSxHQUFHLFVBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUM7QUFDakMsYUFBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNqQyxDQUFDO0dBQ0gsTUFBTTtBQUNMLFVBQU0sR0FBRyxVQUFTLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQ2xDLFVBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO0FBQ3ZDLFlBQUksR0FBRyxDQUFDLENBQUM7T0FDVixNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtBQUNuQixZQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQztPQUN6QztBQUNELFdBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDOUMsWUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3BCLGlCQUFPLENBQUMsQ0FBQztTQUNWO09BQ0Y7QUFDRCxhQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ1gsQ0FBQztHQUNIOztBQUVNLE1BQUksT0FBTyxHQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksVUFBUyxLQUFLLEVBQUU7QUFDckQsV0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssZ0JBQWdCLENBQUM7R0FDbkUsQUFBQyxDQUFDOzs7QUFFSSxNQUFJLFlBQVksR0FBRyxNQUFNLENBQUMiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC9hcnJheS11dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBmb3JFYWNoKGFycmF5LCBjYWxsYmFjaywgYmluZGluZykge1xuICB2YXIgaSwgbDtcbiAgaWYgKGJpbmRpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgIGZvciAoaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNhbGxiYWNrKGFycmF5W2ldLCBpLCBhcnJheSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAoaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwoYmluZGluZywgYXJyYXlbaV0sIGksIGFycmF5KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcChhcnJheSwgY2FsbGJhY2spIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICB2YXIgaSwgbDtcblxuICBmb3IgKGkgPSAwLCBsID0gYXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb3V0cHV0LnB1c2goY2FsbGJhY2soYXJyYXlbaV0sIGksIGFycmF5KSk7XG4gIH1cblxuICByZXR1cm4gb3V0cHV0O1xufVxuXG52YXIgZ2V0SWR4O1xuaWYgKEFycmF5LnByb3RvdHlwZS5pbmRleE9mKSB7XG4gIGdldElkeCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGZyb20pe1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKG9iaiwgZnJvbSk7XG4gIH07XG59IGVsc2Uge1xuICBnZXRJZHggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBmcm9tKSB7XG4gICAgaWYgKGZyb20gPT09IHVuZGVmaW5lZCB8fCBmcm9tID09PSBudWxsKSB7XG4gICAgICBmcm9tID0gMDtcbiAgICB9IGVsc2UgaWYgKGZyb20gPCAwKSB7XG4gICAgICBmcm9tID0gTWF0aC5tYXgoMCwgYXJyYXkubGVuZ3RoICsgZnJvbSk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSBmcm9tLCBsPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChhcnJheVtpXSA9PT0gb2JqKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgaXNBcnJheSA9IChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKGFycmF5KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xufSk7XG5cbmV4cG9ydCB2YXIgaW5kZXhPZkFycmF5ID0gZ2V0SWR4O1xuIl19
define('htmlbars-util/handlebars/safe-string', ['exports'], function (exports) {
  // Build out our basic SafeString type
  function SafeString(string) {
    this.string = string;
  }

  SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
    return '' + this.string;
  };

  exports.default = SafeString;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLFdBQVMsVUFBVSxDQUFDLE1BQU0sRUFBRTtBQUMxQixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztHQUN0Qjs7QUFFRCxZQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFXO0FBQ3ZFLFdBQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7R0FDekIsQ0FBQzs7b0JBRWEsVUFBVSIsImZpbGUiOiJodG1sYmFycy11dGlsL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnJyArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgU2FmZVN0cmluZztcbiJdfQ==
define('htmlbars-util/handlebars/utils', ['exports'], function (exports) {
  exports.extend = extend;
  exports.indexOf = indexOf;
  exports.escapeExpression = escapeExpression;
  exports.isEmpty = isEmpty;
  exports.blockParams = blockParams;
  exports.appendContextPath = appendContextPath;
  var escape = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };

  var badChars = /[&<>"'`]/g,
      possible = /[&<>"'`]/;

  function escapeChar(chr) {
    return escape[chr];
  }

  function extend(obj /* , ...source */) {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  }

  var toString = Object.prototype.toString;

  exports.toString = toString;
  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  /*eslint-disable func-style, no-var */
  var isFunction = function (value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    exports.isFunction = isFunction = function (value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  var isFunction;
  exports.isFunction = isFunction;
  /*eslint-enable func-style, no-var */

  /* istanbul ignore next */
  var isArray = Array.isArray || function (value) {
    return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
  };

  exports.isArray = isArray;
  // Older IE versions do not directly support indexOf so we must implement our own, sadly.

  function indexOf(array, value) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i] === value) {
        return i;
      }
    }
    return -1;
  }

  function escapeExpression(string) {
    if (typeof string !== 'string') {
      // don't escape SafeStrings, since they're already safe
      if (string && string.toHTML) {
        return string.toHTML();
      } else if (string == null) {
        return '';
      } else if (!string) {
        return string + '';
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = '' + string;
    }

    if (!possible.test(string)) {
      return string;
    }
    return string.replace(badChars, escapeChar);
  }

  function isEmpty(value) {
    if (!value && value !== 0) {
      return true;
    } else if (isArray(value) && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  function blockParams(params, ids) {
    params.path = ids;
    return params;
  }

  function appendContextPath(contextPath, id) {
    return (contextPath ? contextPath + '.' : '') + id;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvaGFuZGxlYmFycy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUEsTUFBTSxNQUFNLEdBQUc7QUFDYixPQUFHLEVBQUUsT0FBTztBQUNaLE9BQUcsRUFBRSxNQUFNO0FBQ1gsT0FBRyxFQUFFLE1BQU07QUFDWCxPQUFHLEVBQUUsUUFBUTtBQUNiLE9BQUcsRUFBRSxRQUFRO0FBQ2IsT0FBRyxFQUFFLFFBQVE7R0FDZCxDQUFDOztBQUVGLE1BQU0sUUFBUSxHQUFHLFdBQVc7TUFDdEIsUUFBUSxHQUFHLFVBQVUsQ0FBQzs7QUFFNUIsV0FBUyxVQUFVLENBQUMsR0FBRyxFQUFFO0FBQ3ZCLFdBQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ3BCOztBQUVNLFdBQVMsTUFBTSxDQUFDLEdBQUcsb0JBQW9CO0FBQzVDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3pDLFdBQUssSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVCLFlBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRTtBQUMzRCxhQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzlCO09BQ0Y7S0FDRjs7QUFFRCxXQUFPLEdBQUcsQ0FBQztHQUNaOztBQUVNLE1BQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDOzs7Ozs7QUFLaEQsTUFBSSxVQUFVLEdBQUcsVUFBUyxLQUFLLEVBQUU7QUFDL0IsV0FBTyxPQUFPLEtBQUssS0FBSyxVQUFVLENBQUM7R0FDcEMsQ0FBQzs7O0FBR0YsTUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDbkIsWUFJUyxVQUFVLEdBSm5CLFVBQVUsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUMzQixhQUFPLE9BQU8sS0FBSyxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLG1CQUFtQixDQUFDO0tBQ3BGLENBQUM7R0FDSDtBQUNNLE1BQUksVUFBVSxDQUFDOzs7OztBQUlmLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksVUFBUyxLQUFLLEVBQUU7QUFDdEQsV0FBTyxBQUFDLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEdBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7R0FDakcsQ0FBQzs7Ozs7QUFHSyxXQUFTLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQ3BDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUFFO0FBQ3RCLGVBQU8sQ0FBQyxDQUFDO09BQ1Y7S0FDRjtBQUNELFdBQU8sQ0FBQyxDQUFDLENBQUM7R0FDWDs7QUFHTSxXQUFTLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtBQUN2QyxRQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTs7QUFFOUIsVUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUMzQixlQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUN4QixNQUFNLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtBQUN6QixlQUFPLEVBQUUsQ0FBQztPQUNYLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNsQixlQUFPLE1BQU0sR0FBRyxFQUFFLENBQUM7T0FDcEI7Ozs7O0FBS0QsWUFBTSxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7S0FDdEI7O0FBRUQsUUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFBRSxhQUFPLE1BQU0sQ0FBQztLQUFFO0FBQzlDLFdBQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7R0FDN0M7O0FBRU0sV0FBUyxPQUFPLENBQUMsS0FBSyxFQUFFO0FBQzdCLFFBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtBQUN6QixhQUFPLElBQUksQ0FBQztLQUNiLE1BQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDL0MsYUFBTyxJQUFJLENBQUM7S0FDYixNQUFNO0FBQ0wsYUFBTyxLQUFLLENBQUM7S0FDZDtHQUNGOztBQUVNLFdBQVMsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7QUFDdkMsVUFBTSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7QUFDbEIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFTSxXQUFTLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUU7QUFDakQsV0FBTyxDQUFDLFdBQVcsR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQSxHQUFJLEVBQUUsQ0FBQztHQUNwRCIsImZpbGUiOiJodG1sYmFycy11dGlsL2hhbmRsZWJhcnMvdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnXG59O1xuXG5jb25zdCBiYWRDaGFycyA9IC9bJjw+XCInYF0vZyxcbiAgICAgIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZChvYmogLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKGxldCBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbmV4cG9ydCBsZXQgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4vKmVzbGludC1kaXNhYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbmV4cG9ydCB2YXIgaXNGdW5jdGlvbjtcbi8qZXNsaW50LWVuYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnQgZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufVxuIl19
define("htmlbars-util/morph-utils", ["exports"], function (exports) {
  exports.visitChildren = visitChildren;
  exports.validateChildMorphs = validateChildMorphs;
  exports.linkParams = linkParams;
  exports.dump = dump;
  /*globals console*/

  function visitChildren(nodes, callback) {
    if (!nodes || nodes.length === 0) {
      return;
    }

    nodes = nodes.slice();

    while (nodes.length) {
      var node = nodes.pop();
      callback(node);

      if (node.childNodes) {
        nodes.push.apply(nodes, node.childNodes);
      } else if (node.firstChildMorph) {
        var current = node.firstChildMorph;

        while (current) {
          nodes.push(current);
          current = current.nextMorph;
        }
      } else if (node.morphList) {
        nodes.push(node.morphList);
      }
    }
  }

  function validateChildMorphs(env, morph, visitor) {
    var morphList = morph.morphList;
    if (morph.morphList) {
      var current = morphList.firstChildMorph;

      while (current) {
        var next = current.nextMorph;
        validateChildMorphs(env, current, visitor);
        current = next;
      }
    } else if (morph.lastResult) {
      morph.lastResult.revalidateWith(env, undefined, undefined, undefined, visitor);
    } else if (morph.childNodes) {
      // This means that the childNodes were wired up manually
      for (var i = 0, l = morph.childNodes.length; i < l; i++) {
        validateChildMorphs(env, morph.childNodes[i], visitor);
      }
    }
  }

  function linkParams(env, scope, morph, path, params, hash) {
    if (morph.linkedParams) {
      return;
    }

    if (env.hooks.linkRenderNode(morph, env, scope, path, params, hash)) {
      morph.linkedParams = { params: params, hash: hash };
    }
  }

  function dump(node) {
    console.group(node, node.isDirty);

    if (node.childNodes) {
      map(node.childNodes, dump);
    } else if (node.firstChildMorph) {
      var current = node.firstChildMorph;

      while (current) {
        dump(current);
        current = current.nextMorph;
      }
    } else if (node.morphList) {
      dump(node.morphList);
    }

    console.groupEnd();
  }

  function map(nodes, cb) {
    for (var i = 0, l = nodes.length; i < l; i++) {
      cb(nodes[i]);
    }
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVPLFdBQVMsYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUU7QUFDN0MsUUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUFFLGFBQU87S0FBRTs7QUFFN0MsU0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQzs7QUFFdEIsV0FBTyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ25CLFVBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN2QixjQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRWYsVUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO0FBQ25CLGFBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7T0FDMUMsTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDL0IsWUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQzs7QUFFbkMsZUFBTyxPQUFPLEVBQUU7QUFDZCxlQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BCLGlCQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUM3QjtPQUNGLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ3pCLGFBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQzVCO0tBQ0Y7R0FDRjs7QUFFTSxXQUFTLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQ3ZELFFBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDaEMsUUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFO0FBQ25CLFVBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUM7O0FBRXhDLGFBQU8sT0FBTyxFQUFFO0FBQ2QsWUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUM3QiwyQkFBbUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzNDLGVBQU8sR0FBRyxJQUFJLENBQUM7T0FDaEI7S0FDRixNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtBQUMzQixXQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDaEYsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7O0FBRTNCLFdBQUssSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2pELDJCQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO09BQ3hEO0tBQ0Y7R0FDRjs7QUFFTSxXQUFTLFVBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtBQUNoRSxRQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7QUFDdEIsYUFBTztLQUNSOztBQUVELFFBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtBQUNuRSxXQUFLLENBQUMsWUFBWSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7S0FDckQ7R0FDRjs7QUFFTSxXQUFTLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDekIsV0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVsQyxRQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7QUFDbkIsU0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDNUIsTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDL0IsVUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQzs7QUFFbkMsYUFBTyxPQUFPLEVBQUU7QUFDZCxZQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDZCxlQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztPQUM3QjtLQUNGLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ3pCLFVBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDdEI7O0FBRUQsV0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0dBQ3BCOztBQUVELFdBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUU7QUFDdEIsU0FBSyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN0QyxRQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDZDtHQUNGIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKmdsb2JhbHMgY29uc29sZSovXG5cbmV4cG9ydCBmdW5jdGlvbiB2aXNpdENoaWxkcmVuKG5vZGVzLCBjYWxsYmFjaykge1xuICBpZiAoIW5vZGVzIHx8IG5vZGVzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICBub2RlcyA9IG5vZGVzLnNsaWNlKCk7XG5cbiAgd2hpbGUgKG5vZGVzLmxlbmd0aCkge1xuICAgIHZhciBub2RlID0gbm9kZXMucG9wKCk7XG4gICAgY2FsbGJhY2sobm9kZSk7XG5cbiAgICBpZiAobm9kZS5jaGlsZE5vZGVzKSB7XG4gICAgICBub2Rlcy5wdXNoLmFwcGx5KG5vZGVzLCBub2RlLmNoaWxkTm9kZXMpO1xuICAgIH0gZWxzZSBpZiAobm9kZS5maXJzdENoaWxkTW9ycGgpIHtcbiAgICAgIHZhciBjdXJyZW50ID0gbm9kZS5maXJzdENoaWxkTW9ycGg7XG5cbiAgICAgIHdoaWxlIChjdXJyZW50KSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VycmVudCk7XG4gICAgICAgIGN1cnJlbnQgPSBjdXJyZW50Lm5leHRNb3JwaDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGUubW9ycGhMaXN0KSB7XG4gICAgICBub2Rlcy5wdXNoKG5vZGUubW9ycGhMaXN0KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ2hpbGRNb3JwaHMoZW52LCBtb3JwaCwgdmlzaXRvcikge1xuICB2YXIgbW9ycGhMaXN0ID0gbW9ycGgubW9ycGhMaXN0O1xuICBpZiAobW9ycGgubW9ycGhMaXN0KSB7XG4gICAgdmFyIGN1cnJlbnQgPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuXG4gICAgd2hpbGUgKGN1cnJlbnQpIHtcbiAgICAgIHZhciBuZXh0ID0gY3VycmVudC5uZXh0TW9ycGg7XG4gICAgICB2YWxpZGF0ZUNoaWxkTW9ycGhzKGVudiwgY3VycmVudCwgdmlzaXRvcik7XG4gICAgICBjdXJyZW50ID0gbmV4dDtcbiAgICB9XG4gIH0gZWxzZSBpZiAobW9ycGgubGFzdFJlc3VsdCkge1xuICAgIG1vcnBoLmxhc3RSZXN1bHQucmV2YWxpZGF0ZVdpdGgoZW52LCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB2aXNpdG9yKTtcbiAgfSBlbHNlIGlmIChtb3JwaC5jaGlsZE5vZGVzKSB7XG4gICAgLy8gVGhpcyBtZWFucyB0aGF0IHRoZSBjaGlsZE5vZGVzIHdlcmUgd2lyZWQgdXAgbWFudWFsbHlcbiAgICBmb3IgKHZhciBpPTAsIGw9bW9ycGguY2hpbGROb2Rlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB2YWxpZGF0ZUNoaWxkTW9ycGhzKGVudiwgbW9ycGguY2hpbGROb2Rlc1tpXSwgdmlzaXRvcik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5rUGFyYW1zKGVudiwgc2NvcGUsIG1vcnBoLCBwYXRoLCBwYXJhbXMsIGhhc2gpIHtcbiAgaWYgKG1vcnBoLmxpbmtlZFBhcmFtcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChlbnYuaG9va3MubGlua1JlbmRlck5vZGUobW9ycGgsIGVudiwgc2NvcGUsIHBhdGgsIHBhcmFtcywgaGFzaCkpIHtcbiAgICBtb3JwaC5saW5rZWRQYXJhbXMgPSB7IHBhcmFtczogcGFyYW1zLCBoYXNoOiBoYXNoIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXAobm9kZSkge1xuICBjb25zb2xlLmdyb3VwKG5vZGUsIG5vZGUuaXNEaXJ0eSk7XG5cbiAgaWYgKG5vZGUuY2hpbGROb2Rlcykge1xuICAgIG1hcChub2RlLmNoaWxkTm9kZXMsIGR1bXApO1xuICB9IGVsc2UgaWYgKG5vZGUuZmlyc3RDaGlsZE1vcnBoKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBub2RlLmZpcnN0Q2hpbGRNb3JwaDtcblxuICAgIHdoaWxlIChjdXJyZW50KSB7XG4gICAgICBkdW1wKGN1cnJlbnQpO1xuICAgICAgY3VycmVudCA9IGN1cnJlbnQubmV4dE1vcnBoO1xuICAgIH1cbiAgfSBlbHNlIGlmIChub2RlLm1vcnBoTGlzdCkge1xuICAgIGR1bXAobm9kZS5tb3JwaExpc3QpO1xuICB9XG5cbiAgY29uc29sZS5ncm91cEVuZCgpO1xufVxuXG5mdW5jdGlvbiBtYXAobm9kZXMsIGNiKSB7XG4gIGZvciAodmFyIGk9MCwgbD1ub2Rlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgY2Iobm9kZXNbaV0pO1xuICB9XG59XG4iXX0=
define('htmlbars-util/namespaces', ['exports'], function (exports) {
  exports.getAttrNamespace = getAttrNamespace;
  // ref http://dev.w3.org/html5/spec-LC/namespaces.html
  var defaultNamespaces = {
    html: 'http://www.w3.org/1999/xhtml',
    mathml: 'http://www.w3.org/1998/Math/MathML',
    svg: 'http://www.w3.org/2000/svg',
    xlink: 'http://www.w3.org/1999/xlink',
    xml: 'http://www.w3.org/XML/1998/namespace'
  };

  function getAttrNamespace(attrName) {
    var namespace;

    var colonIndex = attrName.indexOf(':');
    if (colonIndex !== -1) {
      var prefix = attrName.slice(0, colonIndex);
      namespace = defaultNamespaces[prefix];
    }

    return namespace || null;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvbmFtZXNwYWNlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxNQUFJLGlCQUFpQixHQUFHO0FBQ3RCLFFBQUksRUFBRSw4QkFBOEI7QUFDcEMsVUFBTSxFQUFFLG9DQUFvQztBQUM1QyxPQUFHLEVBQUUsNEJBQTRCO0FBQ2pDLFNBQUssRUFBRSw4QkFBOEI7QUFDckMsT0FBRyxFQUFFLHNDQUFzQztHQUM1QyxDQUFDOztBQUVLLFdBQVMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFO0FBQ3pDLFFBQUksU0FBUyxDQUFDOztBQUVkLFFBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkMsUUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDckIsVUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDM0MsZUFBUyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3ZDOztBQUVELFdBQU8sU0FBUyxJQUFJLElBQUksQ0FBQztHQUMxQiIsImZpbGUiOiJodG1sYmFycy11dGlsL25hbWVzcGFjZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyByZWYgaHR0cDovL2Rldi53My5vcmcvaHRtbDUvc3BlYy1MQy9uYW1lc3BhY2VzLmh0bWxcbnZhciBkZWZhdWx0TmFtZXNwYWNlcyA9IHtcbiAgaHRtbDogJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnLFxuICBtYXRobWw6ICdodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MJyxcbiAgc3ZnOiAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLFxuICB4bGluazogJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLFxuICB4bWw6ICdodHRwOi8vd3d3LnczLm9yZy9YTUwvMTk5OC9uYW1lc3BhY2UnXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXR0ck5hbWVzcGFjZShhdHRyTmFtZSkge1xuICB2YXIgbmFtZXNwYWNlO1xuXG4gIHZhciBjb2xvbkluZGV4ID0gYXR0ck5hbWUuaW5kZXhPZignOicpO1xuICBpZiAoY29sb25JbmRleCAhPT0gLTEpIHtcbiAgICB2YXIgcHJlZml4ID0gYXR0ck5hbWUuc2xpY2UoMCwgY29sb25JbmRleCk7XG4gICAgbmFtZXNwYWNlID0gZGVmYXVsdE5hbWVzcGFjZXNbcHJlZml4XTtcbiAgfVxuXG4gIHJldHVybiBuYW1lc3BhY2UgfHwgbnVsbDtcbn1cbiJdfQ==
define("htmlbars-util/object-utils", ["exports"], function (exports) {
  exports.merge = merge;
  exports.shallowCopy = shallowCopy;
  exports.keySet = keySet;
  exports.keyLength = keyLength;

  function merge(options, defaults) {
    for (var prop in defaults) {
      if (options.hasOwnProperty(prop)) {
        continue;
      }
      options[prop] = defaults[prop];
    }
    return options;
  }

  function shallowCopy(obj) {
    return merge({}, obj);
  }

  function keySet(obj) {
    var set = {};

    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        set[prop] = true;
      }
    }

    return set;
  }

  function keyLength(obj) {
    var count = 0;

    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        count++;
      }
    }

    return count;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFPLFdBQVMsS0FBSyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUU7QUFDdkMsU0FBSyxJQUFJLElBQUksSUFBSSxRQUFRLEVBQUU7QUFDekIsVUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQUUsaUJBQVM7T0FBRTtBQUMvQyxhQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2hDO0FBQ0QsV0FBTyxPQUFPLENBQUM7R0FDaEI7O0FBRU0sV0FBUyxXQUFXLENBQUMsR0FBRyxFQUFFO0FBQy9CLFdBQU8sS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztHQUN2Qjs7QUFFTSxXQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUU7QUFDMUIsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDOztBQUViLFNBQUssSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFO0FBQ3BCLFVBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUM1QixXQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO09BQ2xCO0tBQ0Y7O0FBRUQsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFTSxXQUFTLFNBQVMsQ0FBQyxHQUFHLEVBQUU7QUFDN0IsUUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDOztBQUVkLFNBQUssSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFO0FBQ3BCLFVBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUM1QixhQUFLLEVBQUUsQ0FBQztPQUNUO0tBQ0Y7O0FBRUQsV0FBTyxLQUFLLENBQUM7R0FDZCIsImZpbGUiOiJodG1sYmFycy11dGlsL29iamVjdC11dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBtZXJnZShvcHRpb25zLCBkZWZhdWx0cykge1xuICBmb3IgKHZhciBwcm9wIGluIGRlZmF1bHRzKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcCkpIHsgY29udGludWU7IH1cbiAgICBvcHRpb25zW3Byb3BdID0gZGVmYXVsdHNbcHJvcF07XG4gIH1cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaGFsbG93Q29weShvYmopIHtcbiAgcmV0dXJuIG1lcmdlKHt9LCBvYmopO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5U2V0KG9iaikge1xuICB2YXIgc2V0ID0ge307XG5cbiAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICBzZXRbcHJvcF0gPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlMZW5ndGgob2JqKSB7XG4gIHZhciBjb3VudCA9IDA7XG5cbiAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICBjb3VudCsrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb3VudDtcbn1cbiJdfQ==
define("htmlbars-util/quoting", ["exports"], function (exports) {
  exports.hash = hash;
  exports.repeat = repeat;
  function escapeString(str) {
    str = str.replace(/\\/g, "\\\\");
    str = str.replace(/"/g, '\\"');
    str = str.replace(/\n/g, "\\n");
    return str;
  }

  exports.escapeString = escapeString;

  function string(str) {
    return '"' + escapeString(str) + '"';
  }

  exports.string = string;

  function array(a) {
    return "[" + a + "]";
  }

  exports.array = array;

  function hash(pairs) {
    return "{" + pairs.join(", ") + "}";
  }

  function repeat(chars, times) {
    var str = "";
    while (times--) {
      str += chars;
    }
    return str;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvcXVvdGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxXQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUU7QUFDekIsT0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2pDLE9BQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMvQixPQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDaEMsV0FBTyxHQUFHLENBQUM7R0FDWjs7VUFFUSxZQUFZLEdBQVosWUFBWTs7QUFFckIsV0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQ25CLFdBQU8sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDdEM7O1VBRVEsTUFBTSxHQUFOLE1BQU07O0FBRWYsV0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQ2hCLFdBQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDdEI7O1VBRVEsS0FBSyxHQUFMLEtBQUs7O0FBRVAsV0FBUyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQzFCLFdBQU8sR0FBRyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO0dBQ3JDOztBQUVNLFdBQVMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDbkMsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2IsV0FBTyxLQUFLLEVBQUUsRUFBRTtBQUNkLFNBQUcsSUFBSSxLQUFLLENBQUM7S0FDZDtBQUNELFdBQU8sR0FBRyxDQUFDO0dBQ1oiLCJmaWxlIjoiaHRtbGJhcnMtdXRpbC9xdW90aW5nLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gZXNjYXBlU3RyaW5nKHN0cikge1xuICBzdHIgPSBzdHIucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpO1xuICBzdHIgPSBzdHIucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICBzdHIgPSBzdHIucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIik7XG4gIHJldHVybiBzdHI7XG59XG5cbmV4cG9ydCB7IGVzY2FwZVN0cmluZyB9O1xuXG5mdW5jdGlvbiBzdHJpbmcoc3RyKSB7XG4gIHJldHVybiAnXCInICsgZXNjYXBlU3RyaW5nKHN0cikgKyAnXCInO1xufVxuXG5leHBvcnQgeyBzdHJpbmcgfTtcblxuZnVuY3Rpb24gYXJyYXkoYSkge1xuICByZXR1cm4gXCJbXCIgKyBhICsgXCJdXCI7XG59XG5cbmV4cG9ydCB7IGFycmF5IH07XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNoKHBhaXJzKSB7XG4gIHJldHVybiBcIntcIiArIHBhaXJzLmpvaW4oXCIsIFwiKSArIFwifVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVwZWF0KGNoYXJzLCB0aW1lcykge1xuICB2YXIgc3RyID0gXCJcIjtcbiAgd2hpbGUgKHRpbWVzLS0pIHtcbiAgICBzdHIgKz0gY2hhcnM7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cbiJdfQ==
define('htmlbars-util/safe-string', ['exports', './handlebars/safe-string'], function (exports, _handlebarsSafeString) {
  exports.default = _handlebarsSafeString.default;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJodG1sYmFycy11dGlsL3NhZmUtc3RyaW5nLmpzIiwic291cmNlc0NvbnRlbnQiOltdfQ==
define("htmlbars-util/template-utils", ["exports", "../htmlbars-util/morph-utils"], function (exports, _htmlbarsUtilMorphUtils) {
  exports.RenderState = RenderState;
  exports.blockFor = blockFor;
  exports.renderAndCleanup = renderAndCleanup;
  exports.clearMorph = clearMorph;
  exports.clearMorphList = clearMorphList;

  function RenderState(renderNode, morphList) {
    // The morph list that is no longer needed and can be
    // destroyed.
    this.morphListToClear = morphList;

    // The morph list that needs to be pruned of any items
    // that were not yielded on a subsequent render.
    this.morphListToPrune = null;

    // A map of morphs for each item yielded in during this
    // rendering pass. Any morphs in the DOM but not in this map
    // will be pruned during cleanup.
    this.handledMorphs = {};
    this.collisions = undefined;

    // The morph to clear once rendering is complete. By
    // default, we set this to the previous morph (to catch
    // the case where nothing is yielded; in that case, we
    // should just clear the morph). Otherwise this gets set
    // to null if anything is rendered.
    this.morphToClear = renderNode;

    this.shadowOptions = null;
  }

  function Block(render, template, blockOptions) {
    this.render = render;
    this.template = template;
    this.blockOptions = blockOptions;
    this.arity = template.arity;
  }

  Block.prototype.invoke = function (env, blockArguments, self, renderNode, parentScope, visitor) {
    var _this = this;

    if (renderNode.lastResult) {
      renderNode.lastResult.revalidateWith(env, undefined, self, blockArguments, visitor);
    } else {
      (function () {
        var options = { renderState: new RenderState(renderNode) };
        var render = _this.render;
        var template = _this.template;
        var scope = _this.blockOptions.scope;

        var shadowScope = scope ? env.hooks.createChildScope(scope) : env.hooks.createFreshScope();

        env.hooks.bindShadowScope(env, parentScope, shadowScope, _this.blockOptions.options);

        if (self !== undefined) {
          env.hooks.bindSelf(env, shadowScope, self);
        } else if (_this.blockOptions.self !== undefined) {
          env.hooks.bindSelf(env, shadowScope, _this.blockOptions.self);
        }

        bindBlocks(env, shadowScope, _this.blockOptions.yieldTo);

        renderAndCleanup(renderNode, env, options, null, function () {
          options.renderState.morphToClear = null;
          render(template, env, shadowScope, { renderNode: renderNode, blockArguments: blockArguments });
        });
      })();
    }
  };

  function blockFor(render, template, blockOptions) {
    return new Block(render, template, blockOptions);
  }

  function bindBlocks(env, shadowScope, blocks) {
    if (!blocks) {
      return;
    }
    if (blocks instanceof Block) {
      env.hooks.bindBlock(env, shadowScope, blocks);
    } else {
      for (var name in blocks) {
        if (blocks.hasOwnProperty(name)) {
          env.hooks.bindBlock(env, shadowScope, blocks[name], name);
        }
      }
    }
  }

  function renderAndCleanup(morph, env, options, shadowOptions, callback) {
    // The RenderState object is used to collect information about what the
    // helper or hook being invoked has yielded. Once it has finished either
    // yielding multiple items (via yieldItem) or a single template (via
    // yieldTemplate), we detect what was rendered and how it differs from
    // the previous render, cleaning up old state in DOM as appropriate.
    var renderState = options.renderState;
    renderState.collisions = undefined;
    renderState.shadowOptions = shadowOptions;

    // Invoke the callback, instructing it to save information about what it
    // renders into RenderState.
    var result = callback(options);

    // The hook can opt-out of cleanup if it handled cleanup itself.
    if (result && result.handled) {
      return;
    }

    var morphMap = morph.morphMap;

    // Walk the morph list, clearing any items that were yielded in a previous
    // render but were not yielded during this render.
    var morphList = renderState.morphListToPrune;
    if (morphList) {
      var handledMorphs = renderState.handledMorphs;
      var item = morphList.firstChildMorph;

      while (item) {
        var next = item.nextMorph;

        // If we don't see the key in handledMorphs, it wasn't
        // yielded in and we can safely remove it from DOM.
        if (!(item.key in handledMorphs)) {
          delete morphMap[item.key];
          clearMorph(item, env, true);
          item.destroy();
        }

        item = next;
      }
    }

    morphList = renderState.morphListToClear;
    if (morphList) {
      clearMorphList(morphList, morph, env);
    }

    var toClear = renderState.morphToClear;
    if (toClear) {
      clearMorph(toClear, env);
    }
  }

  function clearMorph(morph, env, destroySelf) {
    var cleanup = env.hooks.cleanupRenderNode;
    var destroy = env.hooks.destroyRenderNode;
    var willCleanup = env.hooks.willCleanupTree;
    var didCleanup = env.hooks.didCleanupTree;

    function destroyNode(node) {
      if (cleanup) {
        cleanup(node);
      }
      if (destroy) {
        destroy(node);
      }
    }

    if (willCleanup) {
      willCleanup(env, morph, destroySelf);
    }
    if (cleanup) {
      cleanup(morph);
    }
    if (destroySelf && destroy) {
      destroy(morph);
    }

    _htmlbarsUtilMorphUtils.visitChildren(morph.childNodes, destroyNode);

    // TODO: Deal with logical children that are not in the DOM tree
    morph.clear();
    if (didCleanup) {
      didCleanup(env, morph, destroySelf);
    }

    morph.lastResult = null;
    morph.lastYielded = null;
    morph.childNodes = null;
  }

  function clearMorphList(morphList, morph, env) {
    var item = morphList.firstChildMorph;

    while (item) {
      var next = item.nextMorph;
      delete morph.morphMap[item.key];
      clearMorph(item, env, true);
      item.destroy();

      item = next;
    }

    // Remove the MorphList from the morph.
    morphList.clear();
    morph.morphList = null;
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVPLFdBQVMsV0FBVyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUU7OztBQUdqRCxRQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDOzs7O0FBSWxDLFFBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7Ozs7O0FBSzdCLFFBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLFFBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDOzs7Ozs7O0FBTzVCLFFBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDOztBQUUvQixRQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztHQUMzQjs7QUFFRCxXQUFTLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRTtBQUM3QyxRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUN6QixRQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztBQUNqQyxRQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7R0FDN0I7O0FBRUQsT0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsVUFBUyxHQUFHLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRTs7O0FBQzdGLFFBQUksVUFBVSxDQUFDLFVBQVUsRUFBRTtBQUN6QixnQkFBVSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3JGLE1BQU07O0FBQ0wsWUFBSSxPQUFPLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFN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QUssRUFBRSxDQUFDO0FBQ2xCLFNBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0dBQ3hCIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvdGVtcGxhdGUtdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2aXNpdENoaWxkcmVuIH0gZnJvbSBcIi4uL2h0bWxiYXJzLXV0aWwvbW9ycGgtdXRpbHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIFJlbmRlclN0YXRlKHJlbmRlck5vZGUsIG1vcnBoTGlzdCkge1xuICAvLyBUaGUgbW9ycGggbGlzdCB0aGF0IGlzIG5vIGxvbmdlciBuZWVkZWQgYW5kIGNhbiBiZVxuICAvLyBkZXN0cm95ZWQuXG4gIHRoaXMubW9ycGhMaXN0VG9DbGVhciA9IG1vcnBoTGlzdDtcblxuICAvLyBUaGUgbW9ycGggbGlzdCB0aGF0IG5lZWRzIHRvIGJlIHBydW5lZCBvZiBhbnkgaXRlbXNcbiAgLy8gdGhhdCB3ZXJlIG5vdCB5aWVsZGVkIG9uIGEgc3Vic2VxdWVudCByZW5kZXIuXG4gIHRoaXMubW9ycGhMaXN0VG9QcnVuZSA9IG51bGw7XG5cbiAgLy8gQSBtYXAgb2YgbW9ycGhzIGZvciBlYWNoIGl0ZW0geWllbGRlZCBpbiBkdXJpbmcgdGhpc1xuICAvLyByZW5kZXJpbmcgcGFzcy4gQW55IG1vcnBocyBpbiB0aGUgRE9NIGJ1dCBub3QgaW4gdGhpcyBtYXBcbiAgLy8gd2lsbCBiZSBwcnVuZWQgZHVyaW5nIGNsZWFudXAuXG4gIHRoaXMuaGFuZGxlZE1vcnBocyA9IHt9O1xuICB0aGlzLmNvbGxpc2lvbnMgPSB1bmRlZmluZWQ7XG5cbiAgLy8gVGhlIG1vcnBoIHRvIGNsZWFyIG9uY2UgcmVuZGVyaW5nIGlzIGNvbXBsZXRlLiBCeVxuICAvLyBkZWZhdWx0LCB3ZSBzZXQgdGhpcyB0byB0aGUgcHJldmlvdXMgbW9ycGggKHRvIGNhdGNoXG4gIC8vIHRoZSBjYXNlIHdoZXJlIG5vdGhpbmcgaXMgeWllbGRlZDsgaW4gdGhhdCBjYXNlLCB3ZVxuICAvLyBzaG91bGQganVzdCBjbGVhciB0aGUgbW9ycGgpLiBPdGhlcndpc2UgdGhpcyBnZXRzIHNldFxuICAvLyB0byBudWxsIGlmIGFueXRoaW5nIGlzIHJlbmRlcmVkLlxuICB0aGlzLm1vcnBoVG9DbGVhciA9IHJlbmRlck5vZGU7XG5cbiAgdGhpcy5zaGFkb3dPcHRpb25zID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gQmxvY2socmVuZGVyLCB0ZW1wbGF0ZSwgYmxvY2tPcHRpb25zKSB7XG4gIHRoaXMucmVuZGVyID0gcmVuZGVyO1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gIHRoaXMuYmxvY2tPcHRpb25zID0gYmxvY2tPcHRpb25zO1xuICB0aGlzLmFyaXR5ID0gdGVtcGxhdGUuYXJpdHk7XG59XG5cbkJsb2NrLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbihlbnYsIGJsb2NrQXJndW1lbnRzLCBzZWxmLCByZW5kZXJOb2RlLCBwYXJlbnRTY29wZSwgdmlzaXRvcikge1xuICBpZiAocmVuZGVyTm9kZS5sYXN0UmVzdWx0KSB7XG4gICAgcmVuZGVyTm9kZS5sYXN0UmVzdWx0LnJldmFsaWRhdGVXaXRoKGVudiwgdW5kZWZpbmVkLCBzZWxmLCBibG9ja0FyZ3VtZW50cywgdmlzaXRvcik7XG4gIH0gZWxzZSB7XG4gICAgbGV0IG9wdGlvbnMgPSB7IHJlbmRlclN0YXRlOiBuZXcgUmVuZGVyU3RhdGUocmVuZGVyTm9kZSkgfTtcbiAgICBsZXQgeyByZW5kZXIsIHRlbXBsYXRlLCBibG9ja09wdGlvbnM6IHsgc2NvcGUgfSB9ID0gdGhpcztcbiAgICBsZXQgc2hhZG93U2NvcGUgPSBzY29wZSA/IGVudi5ob29rcy5jcmVhdGVDaGlsZFNjb3BlKHNjb3BlKSA6IGVudi5ob29rcy5jcmVhdGVGcmVzaFNjb3BlKCk7XG5cbiAgICBlbnYuaG9va3MuYmluZFNoYWRvd1Njb3BlKGVudiwgcGFyZW50U2NvcGUsIHNoYWRvd1Njb3BlLCB0aGlzLmJsb2NrT3B0aW9ucy5vcHRpb25zKTtcblxuICAgIGlmIChzZWxmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGVudi5ob29rcy5iaW5kU2VsZihlbnYsIHNoYWRvd1Njb3BlLCBzZWxmKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuYmxvY2tPcHRpb25zLnNlbGYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZW52Lmhvb2tzLmJpbmRTZWxmKGVudiwgc2hhZG93U2NvcGUsIHRoaXMuYmxvY2tPcHRpb25zLnNlbGYpO1xuICAgIH1cblxuICAgIGJpbmRCbG9ja3MoZW52LCBzaGFkb3dTY29wZSwgdGhpcy5ibG9ja09wdGlvbnMueWllbGRUbyk7XG5cbiAgICByZW5kZXJBbmRDbGVhbnVwKHJlbmRlck5vZGUsIGVudiwgb3B0aW9ucywgbnVsbCwgZnVuY3Rpb24oKSB7XG4gICAgICBvcHRpb25zLnJlbmRlclN0YXRlLm1vcnBoVG9DbGVhciA9IG51bGw7XG4gICAgICByZW5kZXIodGVtcGxhdGUsIGVudiwgc2hhZG93U2NvcGUsIHsgcmVuZGVyTm9kZSwgYmxvY2tBcmd1bWVudHMgfSk7XG4gICAgfSk7XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9ja0ZvcihyZW5kZXIsIHRlbXBsYXRlLCBibG9ja09wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBCbG9jayhyZW5kZXIsIHRlbXBsYXRlLCBibG9ja09wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBiaW5kQmxvY2tzKGVudiwgc2hhZG93U2NvcGUsIGJsb2Nrcykge1xuICBpZiAoIWJsb2Nrcykge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoYmxvY2tzIGluc3RhbmNlb2YgQmxvY2spIHtcbiAgICBlbnYuaG9va3MuYmluZEJsb2NrKGVudiwgc2hhZG93U2NvcGUsIGJsb2Nrcyk7XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiBibG9ja3MpIHtcbiAgICAgIGlmIChibG9ja3MuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZW52Lmhvb2tzLmJpbmRCbG9jayhlbnYsIHNoYWRvd1Njb3BlLCBibG9ja3NbbmFtZV0sIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQW5kQ2xlYW51cChtb3JwaCwgZW52LCBvcHRpb25zLCBzaGFkb3dPcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBUaGUgUmVuZGVyU3RhdGUgb2JqZWN0IGlzIHVzZWQgdG8gY29sbGVjdCBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IHRoZVxuICAvLyBoZWxwZXIgb3IgaG9vayBiZWluZyBpbnZva2VkIGhhcyB5aWVsZGVkLiBPbmNlIGl0IGhhcyBmaW5pc2hlZCBlaXRoZXJcbiAgLy8geWllbGRpbmcgbXVsdGlwbGUgaXRlbXMgKHZpYSB5aWVsZEl0ZW0pIG9yIGEgc2luZ2xlIHRlbXBsYXRlICh2aWFcbiAgLy8geWllbGRUZW1wbGF0ZSksIHdlIGRldGVjdCB3aGF0IHdhcyByZW5kZXJlZCBhbmQgaG93IGl0IGRpZmZlcnMgZnJvbVxuICAvLyB0aGUgcHJldmlvdXMgcmVuZGVyLCBjbGVhbmluZyB1cCBvbGQgc3RhdGUgaW4gRE9NIGFzIGFwcHJvcHJpYXRlLlxuICB2YXIgcmVuZGVyU3RhdGUgPSBvcHRpb25zLnJlbmRlclN0YXRlO1xuICByZW5kZXJTdGF0ZS5jb2xsaXNpb25zID0gdW5kZWZpbmVkO1xuICByZW5kZXJTdGF0ZS5zaGFkb3dPcHRpb25zID0gc2hhZG93T3B0aW9ucztcblxuICAvLyBJbnZva2UgdGhlIGNhbGxiYWNrLCBpbnN0cnVjdGluZyBpdCB0byBzYXZlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgaXRcbiAgLy8gcmVuZGVycyBpbnRvIFJlbmRlclN0YXRlLlxuICB2YXIgcmVzdWx0ID0gY2FsbGJhY2sob3B0aW9ucyk7XG5cbiAgLy8gVGhlIGhvb2sgY2FuIG9wdC1vdXQgb2YgY2xlYW51cCBpZiBpdCBoYW5kbGVkIGNsZWFudXAgaXRzZWxmLlxuICBpZiAocmVzdWx0ICYmIHJlc3VsdC5oYW5kbGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG1vcnBoTWFwID0gbW9ycGgubW9ycGhNYXA7XG5cbiAgLy8gV2FsayB0aGUgbW9ycGggbGlzdCwgY2xlYXJpbmcgYW55IGl0ZW1zIHRoYXQgd2VyZSB5aWVsZGVkIGluIGEgcHJldmlvdXNcbiAgLy8gcmVuZGVyIGJ1dCB3ZXJlIG5vdCB5aWVsZGVkIGR1cmluZyB0aGlzIHJlbmRlci5cbiAgbGV0IG1vcnBoTGlzdCA9IHJlbmRlclN0YXRlLm1vcnBoTGlzdFRvUHJ1bmU7XG4gIGlmIChtb3JwaExpc3QpIHtcbiAgICBsZXQgaGFuZGxlZE1vcnBocyA9IHJlbmRlclN0YXRlLmhhbmRsZWRNb3JwaHM7XG4gICAgbGV0IGl0ZW0gPSBtb3JwaExpc3QuZmlyc3RDaGlsZE1vcnBoO1xuXG4gICAgd2hpbGUgKGl0ZW0pIHtcbiAgICAgIGxldCBuZXh0ID0gaXRlbS5uZXh0TW9ycGg7XG5cbiAgICAgIC8vIElmIHdlIGRvbid0IHNlZSB0aGUga2V5IGluIGhhbmRsZWRNb3JwaHMsIGl0IHdhc24ndFxuICAgICAgLy8geWllbGRlZCBpbiBhbmQgd2UgY2FuIHNhZmVseSByZW1vdmUgaXQgZnJvbSBET00uXG4gICAgICBpZiAoIShpdGVtLmtleSBpbiBoYW5kbGVkTW9ycGhzKSkge1xuICAgICAgICBkZWxldGUgbW9ycGhNYXBbaXRlbS5rZXldO1xuICAgICAgICBjbGVhck1vcnBoKGl0ZW0sIGVudiwgdHJ1ZSk7XG4gICAgICAgIGl0ZW0uZGVzdHJveSgpO1xuICAgICAgfVxuXG4gICAgICBpdGVtID0gbmV4dDtcbiAgICB9XG4gIH1cblxuICBtb3JwaExpc3QgPSByZW5kZXJTdGF0ZS5tb3JwaExpc3RUb0NsZWFyO1xuICBpZiAobW9ycGhMaXN0KSB7XG4gICAgY2xlYXJNb3JwaExpc3QobW9ycGhMaXN0LCBtb3JwaCwgZW52KTtcbiAgfVxuXG4gIGxldCB0b0NsZWFyID0gcmVuZGVyU3RhdGUubW9ycGhUb0NsZWFyO1xuICBpZiAodG9DbGVhcikge1xuICAgIGNsZWFyTW9ycGgodG9DbGVhciwgZW52KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJNb3JwaChtb3JwaCwgZW52LCBkZXN0cm95U2VsZikge1xuICB2YXIgY2xlYW51cCA9IGVudi5ob29rcy5jbGVhbnVwUmVuZGVyTm9kZTtcbiAgdmFyIGRlc3Ryb3kgPSBlbnYuaG9va3MuZGVzdHJveVJlbmRlck5vZGU7XG4gIHZhciB3aWxsQ2xlYW51cCA9IGVudi5ob29rcy53aWxsQ2xlYW51cFRyZWU7XG4gIHZhciBkaWRDbGVhbnVwID0gZW52Lmhvb2tzLmRpZENsZWFudXBUcmVlO1xuXG4gIGZ1bmN0aW9uIGRlc3Ryb3lOb2RlKG5vZGUpIHtcbiAgICBpZiAoY2xlYW51cCkgeyBjbGVhbnVwKG5vZGUpOyB9XG4gICAgaWYgKGRlc3Ryb3kpIHsgZGVzdHJveShub2RlKTsgfVxuICB9XG5cbiAgaWYgKHdpbGxDbGVhbnVwKSB7IHdpbGxDbGVhbnVwKGVudiwgbW9ycGgsIGRlc3Ryb3lTZWxmKTsgfVxuICBpZiAoY2xlYW51cCkgeyBjbGVhbnVwKG1vcnBoKTsgfVxuICBpZiAoZGVzdHJveVNlbGYgJiYgZGVzdHJveSkgeyBkZXN0cm95KG1vcnBoKTsgfVxuXG4gIHZpc2l0Q2hpbGRyZW4obW9ycGguY2hpbGROb2RlcywgZGVzdHJveU5vZGUpO1xuXG4gIC8vIFRPRE86IERlYWwgd2l0aCBsb2dpY2FsIGNoaWxkcmVuIHRoYXQgYXJlIG5vdCBpbiB0aGUgRE9NIHRyZWVcbiAgbW9ycGguY2xlYXIoKTtcbiAgaWYgKGRpZENsZWFudXApIHsgZGlkQ2xlYW51cChlbnYsIG1vcnBoLCBkZXN0cm95U2VsZik7IH1cblxuICBtb3JwaC5sYXN0UmVzdWx0ID0gbnVsbDtcbiAgbW9ycGgubGFzdFlpZWxkZWQgPSBudWxsO1xuICBtb3JwaC5jaGlsZE5vZGVzID0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTW9ycGhMaXN0KG1vcnBoTGlzdCwgbW9ycGgsIGVudikge1xuICBsZXQgaXRlbSA9IG1vcnBoTGlzdC5maXJzdENoaWxkTW9ycGg7XG5cbiAgd2hpbGUgKGl0ZW0pIHtcbiAgICBsZXQgbmV4dCA9IGl0ZW0ubmV4dE1vcnBoO1xuICAgIGRlbGV0ZSBtb3JwaC5tb3JwaE1hcFtpdGVtLmtleV07XG4gICAgY2xlYXJNb3JwaChpdGVtLCBlbnYsIHRydWUpO1xuICAgIGl0ZW0uZGVzdHJveSgpO1xuXG4gICAgaXRlbSA9IG5leHQ7XG4gIH1cblxuICAvLyBSZW1vdmUgdGhlIE1vcnBoTGlzdCBmcm9tIHRoZSBtb3JwaC5cbiAgbW9ycGhMaXN0LmNsZWFyKCk7XG4gIG1vcnBoLm1vcnBoTGlzdCA9IG51bGw7XG59XG4iXX0=
define("htmlbars-util/void-tag-names", ["exports", "./array-utils"], function (exports, _arrayUtils) {

  // The HTML elements in this list are speced by
  // http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
  // and will be forced to close regardless of if they have a
  // self-closing /> at the end.
  var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
  var voidMap = {};

  _arrayUtils.forEach(voidTagNames.split(" "), function (tagName) {
    voidMap[tagName] = true;
  });

  exports.default = voidMap;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0bWxiYXJzLXV0aWwvdm9pZC10YWctbmFtZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBTUEsTUFBSSxZQUFZLEdBQUcscUZBQXFGLENBQUM7QUFDekcsTUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDOztBQUVqQixjQVRTLE9BQU8sQ0FTUixZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVMsT0FBTyxFQUFFO0FBQ2pELFdBQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7R0FDekIsQ0FBQyxDQUFDOztvQkFFWSxPQUFPIiwiZmlsZSI6Imh0bWxiYXJzLXV0aWwvdm9pZC10YWctbmFtZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JFYWNoIH0gZnJvbSBcIi4vYXJyYXktdXRpbHNcIjtcblxuLy8gVGhlIEhUTUwgZWxlbWVudHMgaW4gdGhpcyBsaXN0IGFyZSBzcGVjZWQgYnlcbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2h0bWwtbWFya3VwL3N5bnRheC5odG1sI3N5bnRheC1lbGVtZW50cyxcbi8vIGFuZCB3aWxsIGJlIGZvcmNlZCB0byBjbG9zZSByZWdhcmRsZXNzIG9mIGlmIHRoZXkgaGF2ZSBhXG4vLyBzZWxmLWNsb3NpbmcgLz4gYXQgdGhlIGVuZC5cbnZhciB2b2lkVGFnTmFtZXMgPSBcImFyZWEgYmFzZSBiciBjb2wgY29tbWFuZCBlbWJlZCBociBpbWcgaW5wdXQga2V5Z2VuIGxpbmsgbWV0YSBwYXJhbSBzb3VyY2UgdHJhY2sgd2JyXCI7XG52YXIgdm9pZE1hcCA9IHt9O1xuXG5mb3JFYWNoKHZvaWRUYWdOYW1lcy5zcGxpdChcIiBcIiksIGZ1bmN0aW9uKHRhZ05hbWUpIHtcbiAgdm9pZE1hcFt0YWdOYW1lXSA9IHRydWU7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgdm9pZE1hcDtcbiJdfQ==