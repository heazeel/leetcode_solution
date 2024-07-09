// 给你一个链表数组，每个链表都已经按升序排列。

// 请你将所有链表合并到一个升序链表中，返回合并后的链表。

// 示例 1：
// 输入：lists = [[1,4,5],[1,3,4],[2,6]]
// 输出：[1,1,2,3,4,4,5,6]
// 解释：链表数组如下：
// [
//   1->4->5,
//   1->3->4,
//   2->6
// ]
// 将它们合并到一个有序链表中得到。
// 1->1->2->3->4->4->5->6

// 示例 2：
// 输入：lists = []
// 输出：[]
// 示例 3：

// 输入：lists = [[]]
// 输出：[]

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
var mergeKLists = function (lists) {
  if (lists.length === 0) return null;
  if (lists.length === 1) return lists[0];

  let preList = lists[0];

  for (let i = 1; i < lists.length; i++) {
    let node = new ListNode();
    let cur = node;
    while (preList || lists[i]) {
      if (preList && lists[i]) {
        if (preList.val <= lists[i].val) {
          cur.next = preList;
          preList = preList.next;
        } else {
          cur.next = lists[i];
          lists[i] = lists[i].next;
        }
        cur = cur.next;
      } else {
        if (preList) {
          cur.next = preList;
        }
        if (lists[i]) {
          cur.next = lists[i];
        }
        break;
      }
    }

    preList = node.next;
  }

  return preList;
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

console.log(
  output(mergeKLists([struct([1, 4, 5]), struct([1, 3, 4]), struct([2, 6])])),
);
