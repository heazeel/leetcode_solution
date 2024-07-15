// 94. 二叉树的中序遍历

// 给定一个二叉树的根节点 root ，返回 它的 中序 遍历 。

// 示例 1：
// 输入：root = [1,null,2,3]
// 输出：[1,3,2]

// 示例 2：
// 输入：root = []
// 输出：[]

// 示例 3：
// 输入：root = [1]
// 输出：[1]

// 提示：

// 树中节点数目在范围 [0, 100] 内
// -100 <= Node.val <= 100

// 进阶: 递归算法很简单，你可以通过迭代算法完成吗？

/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
var inorderTraversal = function (root) {
  let res = [];
  // const inorderTraversalFunc = (node) => {
  //   if (node) {
  //     inorderTraversalFunc(node.left);
  //     res.push(node.val);
  //     inorderTraversalFunc(node.right);
  //   }
  // };

  // inorderTraversalFunc(root);

  let stack = [];
  let head = root;
  while (head || stack.length) {
    if (head) {
      stack.push(head);
      head = head.left;
    } else {
      let node = stack.pop();
      res.push(node.val);
      head = node.right;
    }
  }

  return res;
};

function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
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

console.log(inorderTraversal(arrayToBinaryTree([1, null, 2, 3])));
