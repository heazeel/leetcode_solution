// 104. 二叉树的最大深度

// 给定一个二叉树 root ，返回其最大深度。

// 二叉树的 最大深度 是指从根节点到最远叶子节点的最长路径上的节点数。

// 示例 1：
// 输入：root = [3,9,20,null,null,15,7]
// 输出：3

// 示例 2：
// 输入：root = [1,null,2]
// 输出：2

// 提示：
// 树中节点的数量在 [0, 104] 区间内。
// -100 <= Node.val <= 100

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
 * @return {number}
 */
var maxDepth = function (root) {
  // if (!root) return 0;

  // let index = 0;
  // const queue = [root];

  // while (queue.length) {
  //   let temp = [];
  //   let len = queue.length;

  //   for (let i = len; i > 0; i--) {
  //     const node = queue.shift();
  //     if (!node) continue;

  //     node.left && queue.push(node.left);
  //     node.right && queue.push(node.right);
  //   }

  //   index++;
  // }

  // return index;

  if (!root) return 0;
  return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;
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

console.log(maxDepth(arrayToBinaryTree([1, 2, 3, 4, null, null, 5])));
