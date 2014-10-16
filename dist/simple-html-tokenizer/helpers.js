"use strict";
function makeArray(object) {
  if (object instanceof Array) {
    return object;
  } else {
    return [object];
  }
}

exports.makeArray = makeArray;var objectCreate = Object.create || function objectCreate(obj) {
  function F() {}
  F.prototype = obj;
  return new F();
};
exports.objectCreate = objectCreate;
function isSpace(char) {
  return (/[\t\n\f ]/).test(char);
}

exports.isSpace = isSpace;function isAlpha(char) {
  return (/[A-Za-z]/).test(char);
}

exports.isAlpha = isAlpha;function isUpper(char) {
  return (/[A-Z]/).test(char);
}

exports.isUpper = isUpper;function removeLocInfo(tokens) {
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    delete token.firstLine;
    delete token.firstColumn;
    delete token.lastLine;
    delete token.lastColumn;
  }
}

exports.removeLocInfo = removeLocInfo;function tokensEqual(actual, expected, checkLocInfo, message) {
  if (!checkLocInfo) {
    removeLocInfo(actual);
  }
  deepEqual(actual, makeArray(expected), message);
}

exports.tokensEqual = tokensEqual;function locInfo(token, firstLine, firstColumn, lastLine, lastColumn) {
  token.firstLine = firstLine;
  token.firstColumn = firstColumn;
  token.lastLine = lastLine;
  token.lastColumn = lastColumn;
  return token;
}

exports.locInfo = locInfo;