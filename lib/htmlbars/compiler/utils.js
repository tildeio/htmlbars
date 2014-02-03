export function processOpcodes(compiler, opcodes) {
  for (var i=0, l=opcodes.length; i<l; i++) {
    var method = opcodes[i][0];
    var params = opcodes[i][1];
    compiler[method].apply(compiler, params);
  }
}

export function getIdAttribute(attributes) {
  for (var i = 0; i < attributes.length; ++i) {
    var attr = attributes[i];
    if (attr[0] === 'id') {
      if (attr[1].length > 1) {
        throw new Error("HTMLBars doesn't support dynamic IDs (yet)");
      }
      return attr[1][0];
    }
  }
}

export function idFromPath(indexes) {
  return 'HTMLBARS-' + indexes.join('-');
}

