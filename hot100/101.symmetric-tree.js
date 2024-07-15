// 101. 对称二叉树
// 给你一个二叉树的根节点 root ， 检查它是否轴对称。

// 示例 1：

// 输入：root = [1,2,2,3,4,4,3]
// 输出：true

// 示例 2：
// 输入：root = [1,2,2,null,3,null,3]
// 输出：false

// 提示：
// 树中节点数目在范围 [1, 1000] 内
// -100 <= Node.val <= 100

// 进阶：你可以运用递归和迭代两种方法解决这个问题吗？

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
 * @return {boolean}
 */
var isSymmetric = function (root) {
  // let res = [];
  // const inorderTraversalFunc = (node, level) => {
  //   if (node) {
  //     let _level1 = level + 1;
  //     inorderTraversalFunc(node.left, _level1);
  //     res.push({ val: node.val, level });
  //     let _level2 = level + 1;
  //     inorderTraversalFunc(node.right, _level2);
  //   } else {
  //     res.push({ val: null, level });
  //   }
  // };

  // inorderTraversalFunc(root, 0);

  // if (res % 2 === 0) return false;
  // for (let i = 0; i < Math.floor(res.length / 2); i++) {
  //   if (
  //     res[i].val !== res[res.length - 1 - i].val ||
  //     res[i].level !== res[res.length - 1 - i].level
  //   ) {
  //     return false;
  //   }
  // }
  if (!root) return false;
  const isSameTrue = (l, r) => {
    if (l === null || r === null) {
      return l === r;
    }

    if (l.val !== r.val) {
      return false;
    } else {
      return isSameTrue(l.left, r.right) && isSameTrue(l.right, r.left);
    }
  };

  return isSameTrue(root.left, root.right);
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

console.log(isSymmetric(arrayToBinaryTree([1, 2, 2, 3, 4, 4, 3])));
