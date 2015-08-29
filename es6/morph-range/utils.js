// inclusive of both nodes
export function clear(parentNode, firstNode, lastNode) {
  if (!parentNode) { return; }

  var node = firstNode;
  var nextNode;
  do {
    nextNode = node.nextSibling;
    parentNode.removeChild(node);
    if (node === lastNode) {
      break;
    }
    node = nextNode;
  } while (node);
}

export function insertBefore(parentNode, firstNode, lastNode, refNode) {
  var node = firstNode;
  var nextNode;
  do {
    nextNode = node.nextSibling;
    parentNode.insertBefore(node, refNode);
    if (node === lastNode) {
      break;
    }
    node = nextNode;
  } while (node);
}
