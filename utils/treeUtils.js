function TreeNode(val) {
  this.val = val;
  this.left = this.right = null;
}

function arrayToBinaryTree(arr) {
  if (!arr || !arr.length) {
    return null;
  }
  let index = 0;
  const queue = [];
  const len = arr.length;
  const head = new TreeNode(arr[index]);
  queue.push(head);

  while (index < len) {
    index++;
    const parent = queue.shift();
    if (arr[index] !== null && arr[index] !== undefined) {
      const node = new TreeNode(arr[index]);
      parent.left = node;
      queue.push(node);
    }

    index++;
    if (arr[index] !== null && arr[index] !== undefined) {
      const node = new TreeNode(arr[index]);
      parent.right = node;
      queue.push(node);
    }
  }
  return head;
}

function printTree(root) {
  let result = [];
  let nodesQueue = [root];

  while (nodesQueue.length) {
    let currentNode = nodesQueue.shift();
    if (currentNode !== null) {
      result.push(currentNode.val);
      nodesQueue.push(currentNode.left);
      nodesQueue.push(currentNode.right);
    } else {
      result.push(null);
    }
  }

  return result;
}

module.exports = {
  arrayToBinaryTree,
  printTree,
  TreeNode,
};
