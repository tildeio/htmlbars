import { array, hash, string } from "./quoting";

export function prepareHelper(stack, size) {
  var args = [],
      types = [],
      hashPairs = [],
      hashTypes = [],
      keyName,
      i;

  var hashSize = stack.pop();

  for (i=0; i<hashSize; i++) {
    keyName = stack.pop();
    hashPairs.unshift(keyName + ':' + stack.pop());
    hashTypes.unshift(keyName + ':' + stack.pop());
  }

  for (i=0; i<size; i++) {
    args.unshift(stack.pop());
    types.unshift(stack.pop());
  }

  var programId = stack.pop();
  var inverseId = stack.pop();

  var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

  if (programId !== null) {
    options.push('render:child' + programId);
  }

  if (inverseId !== null) {
    options.push('inverse:child' + inverseId);
  }

  return {
    options: options,
    args: array(args)
  };
}

export function stripFirstOpcode(opcodes, types) {
  for (var i=0, length=opcodes.length; i<length; i++) {
    if (types.indexOf(opcodes[i][0]) > -1) {
      opcodes.splice(i, 1);
      break;
    }
  }
}

export function stripLastOpcode(opcodes, types) {
  for (var i=opcodes.length-1; i>=0; i--) {
    if (types.indexOf(opcodes[i][0]) > -1) {
      opcodes.splice(i, 1);
      break;
    }
  }
}

export function replaceFirstOpcode(opcodes, oldType, newType) {
  for (var i=0, length=opcodes.length; i<length; i++) {
    if (oldType === opcodes[i][0]) {
      opcodes[i][0] = newType;
      break;
    }
  }
}

export function replaceLastOpcode(opcodes, oldType, newType) {
  for (var i=opcodes.length-1; i>=0; i--) {
    if (oldType === opcodes[i][0]) {
      opcodes[i][0] = newType;
      break;
    }
  }
}
