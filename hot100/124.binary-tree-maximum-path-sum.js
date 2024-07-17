// 124. 二叉树中的最大路径和

// 二叉树中的 路径 被定义为一条节点序列，序列中每对相邻节点之间都存在一条边。同一个节点在一条路径序列中 至多出现一次 。该路径 至少包含一个 节点，且不一定经过根节点。

// 路径和 是路径中各节点值的总和。

// 给你一个二叉树的根节点 root ，返回其 最大路径和 。

// 示例 1：
// 输入：root = [1,2,3]
// 输出：6
// 解释：最优路径是 2 -> 1 -> 3 ，路径和为 2 + 1 + 3 = 6

// 示例 2：
// 输入：root = [-10,9,20,null,null,15,7]
// 输出：42
// 解释：最优路径是 15 -> 20 -> 7 ，路径和为 15 + 20 + 7 = 42

// 提示：
// 树中节点数目范围是 [1, 3 * 104]
// -1000 <= Node.val <= 1000

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
var maxPathSum = function (root) {
  let max = -Infinity;

  const maxGain = (node) => {
    if (!node) return 0;
    const maxLeftPathSum = Math.max(maxGain(node.left), 0);
    const maxRightPathSum = Math.max(maxGain(node.right), 0);
    const pathSum = node.val + maxLeftPathSum + maxRightPathSum;

    max = Math.max(max, pathSum);

    return node.val + Math.max(maxLeftPathSum, maxRightPathSum);
  };

  maxGain(root);

  return max;
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

console.log(maxPathSum(arrayToBinaryTree([1, 2, 3])));
