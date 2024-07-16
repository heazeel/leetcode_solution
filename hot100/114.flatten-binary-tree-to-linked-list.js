// 114. 二叉树展开为链表

// 给你二叉树的根结点 root ，请你将它展开为一个单链表：

// 展开后的单链表应该同样使用 TreeNode ，其中 right 子指针指向链表中下一个结点，而左子指针始终为 null 。
// 展开后的单链表应该与二叉树 先序遍历 顺序相同。

// 示例 1：
// 输入：root = [1,2,5,3,4,null,6]
// 输出：[1,null,2,null,3,null,4,null,5,null,6]

// 示例 2：
// 输入：root = []
// 输出：[]

// 示例 3：
// 输入：root = [0]
// 输出：[0]

// 提示：
// 树中结点数在范围 [0, 2000] 内
// -100 <= Node.val <= 100

// 进阶：你可以使用原地算法（O(1) 额外空间）展开这棵树吗？

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
 * @return {void} Do not return anything, modify root in-place instead.
 */
var flatten = function (root) {
  let temp = root;
  while (temp) {
    if (!temp.left) {
      temp = temp.right;
    } else {
      let leftNode = temp.left;
      while (leftNode.right) {
        leftNode = leftNode.right;
      }

      leftNode.right = temp.right;
      temp.right = temp.left;
      temp.left = null;
    }
  }

  return root;
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

console.log(printTree(flatten(arrayToBinaryTree([1, 2, 5, 3, 4, null, 6]))));
