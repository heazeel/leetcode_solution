// 105. 从前序与中序遍历序列构造二叉树

// 给定两个整数数组 preorder 和 inorder ，其中 preorder 是二叉树的先序遍历， inorder 是同一棵树的中序遍历，请构造二叉树并返回其根节点。

// 示例 1:
// 输入: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
// 输出: [3,9,20,null,null,15,7]

// 示例 2:
// 输入: preorder = [-1], inorder = [-1]
// 输出: [-1]

// 提示:
// 1 <= preorder.length <= 3000
// inorder.length == preorder.length
// -3000 <= preorder[i], inorder[i] <= 3000
// preorder 和 inorder 均 无重复 元素
// inorder 均出现在 preorder
// preorder 保证 为二叉树的前序遍历序列
// inorder 保证 为二叉树的中序遍历序列

/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {number[]} preorder
 * @param {number[]} inorder
 * @return {TreeNode}
 */
var buildTree = function (preorder, inorder) {
  let len = preorder.length;

  const map = new Map();
  for (let i = 0; i < len; i++) {
    map.set(inorder[i], i);
  }

  const build = (preorderL, preorderR, inorderL, inorderR) => {
    if (preorderL > preorderR) return null;
    // 前序遍历的根结点就是前序数组的左界
    const preorderRoot = preorderL;

    // 找到中序遍历的根结点位置
    const inorderRoot = map.get(preorder[preorderL]);

    // 中序数组左子树长度
    const inorderLeftTreeLen = inorderRoot - inorderL;

    // 创建根结点
    const rootNode = new TreeNode(preorder[preorderRoot]);

    rootNode.left = build(
      preorderL + 1,
      preorderL + inorderLeftTreeLen,
      inorderL,
      inorderRoot - 1,
    );

    rootNode.right = build(
      preorderL + inorderLeftTreeLen + 1,
      preorderR,
      inorderRoot + 1,
      inorderR,
    );

    return rootNode;
  };

  return build(0, len - 1, 0, len - 1);
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

console.log(buildTree([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]));
