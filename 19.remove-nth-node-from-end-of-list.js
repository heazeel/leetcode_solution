// 给你一个链表，删除链表的倒数第 n 个结点，并且返回链表的头结点。

// 示例 1：
// 输入：head = [1,2,3,4,5], n = 2
// 输出：[1,2,3,5]

// 示例 2：
// 输入：head = [1], n = 1
// 输出：[]

// 示例 3：
// 输入：head = [1,2], n = 1
// 输出：[1]

// 提示：
// 链表中结点的数目为 sz
// 1 <= sz <= 30
// 0 <= Node.val <= 100
// 1 <= n <= sz

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @param {number} n
 * @return {ListNode}
 */
var removeNthFromEnd = function (head, n) {
  let len = 0;
  let node = new ListNode();
  node.next = head;

  let head2 = node;

  while (head2) {
    len++;
    head2 = head2.next;
  }

  let head3 = node;
  let head4 = node;
  let total = len - n;
  let count = 0;
  while (count < total) {
    if (count < total - 1) {
      head3 = head3.next;
    }
    count++;
    head4 = head4.next;
  }

  head3.next = head4.next;
  head4.next = null;

  return node.next;
};

function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

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

const output = (list) => {
  let arr = [];
  while (list) {
    arr.push(list.val);
    list = list.next;
  }

  return arr;
};

console.log(output(removeNthFromEnd(struct([1]), 1)));
