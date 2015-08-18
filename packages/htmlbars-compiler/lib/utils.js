/*globals window:false*/
/*globals Uint8Array:false*/

export function processOpcodes(compiler, opcodes) {
  for (var i=0, l=opcodes.length; i<l; i++) {
    var method = opcodes[i][0];
    var params = opcodes[i][1];
    if (params) {
      compiler[method].apply(compiler, params);
    } else {
      compiler[method].call(compiler);
    }
  }
}

let lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var generateId;

if (typeof window !== 'undefined' && window.crypto) {
  generateId = function() {
    let buf = new Uint8Array(12);
    window.crypto.getRandomValues(buf);

    buf = buf.map(i => i % 64);
    return [].slice.call(buf).map(i => lookup.charAt(i)).join('');
  };
} else {
  generateId = function() {
    let buf = [];

    for (let i=0; i<12; i++) {
      buf.push(lookup.charAt(Math.floor(Math.random() * 64)));
    }

    return buf.join('');
  };
}

// generateId() returns a unique 12-character string consisting of random
// base64 characters.
export { generateId };
