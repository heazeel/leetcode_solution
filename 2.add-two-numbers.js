// 给你两个非空的链表，表示两个非负的整数。它们每位数字都是按照逆序的方式存储的，并且每个节点只能存储一位数字。

// 请你将两个数相加，并以相同形式返回一个表示和的链表。
// [!](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2021/01/02/addtwonumber1.jpg)

// 你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

// 示例 1：

// 输入：l1 = [2,4,3], l2 = [5,6,4]
// 输出：[7,0,8]
// 解释：342 + 465 = 807.
// 示例 2：

// 输入：l1 = [0], l2 = [0]
// 输出：[0]
// 示例 3：

// 输入：l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]
// 输出：[8,9,9,9,0,0,0,1]

// 提示：

// 每个链表中的节点数在范围 [1, 100] 内
// 0 <= Node.val <= 9
// 题目数据保证列表表示的数字不含前导零

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */

function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
var addTwoNumbers = function (l1, l2) {
  let temp = new ListNode();
  let res = temp;
  let plus = 0;
  while (l1 || l2 || plus) {
    const num1 = l1?.val || 0;
    const num2 = l2?.val || 0;

    console.log(num1, num2);

    const sum = (num1 + num2 + plus) % 10;
    plus = Math.floor((num1 + num2 + plus) / 10);

    const node = new ListNode(sum);
    temp.next = node;
    temp = temp.next;

    if (l1) l1 = l1.next;
    if (l2) l2 = l2.next;
  }

  return res.next;
};

const struct = (numArr) => {
  const res = new ListNode(0);
  let temp = res;
  for (let i = 0; i < numArr.length - 1; i++) {
    temp.val = numArr[i];
    temp.next = new ListNode(numArr[i + 1]);
    temp = temp.next;
  }

  return res;
};

const l1 = struct([9, 9, 9, 9, 9, 9, 9]);
const l2 = struct([9, 9, 9, 9]);

console.log(addTwoNumbers(l1, l2));