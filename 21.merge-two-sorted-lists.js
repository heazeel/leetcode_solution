// 将两个升序链表合并为一个新的 升序 链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。

// 示例 1：
// 输入：l1 = [1,2,4], l2 = [1,3,4]
// 输出：[1,1,2,3,4,4]

// 示例 2：
// 输入：l1 = [], l2 = []
// 输出：[]

// 示例 3：
// 输入：l1 = [], l2 = [0]
// 输出：[0]

// 提示：
// 两个链表的节点数目范围是 [0, 50]
// -100 <= Node.val <= 100
// l1 和 l2 均按 非递减顺序 排列

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} list1
 * @param {ListNode} list2
 * @return {ListNode}
 */
var mergeTwoLists = function (list1, list2) {
  let node = new ListNode();
  let cur = node;
  while (list1 || list2) {
    if (list1 && list2) {
      if (list1.val <= list2.val) {
        cur.next = list1;
        list1 = list1.next;
      } else {
        cur.next = list2;
        list2 = list2.next;
      }
      cur = cur.next;
    } else {
      if (list1) {
        cur.next = list1;
      }
      if (list2) {
        cur.next = list2;
      }
      break;
    }
  }

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

console.log(output(mergeTwoLists(struct([1, 2, 4]), struct([1, 3, 4]))));
