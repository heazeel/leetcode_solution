// 234. 回文链表

// 给你一个单链表的头节点 head ，请你判断该链表是否为
// 回文链表
// 。如果是，返回 true ；否则，返回 false 。

// 示例 1：
// 输入：head = [1,2,2,1]
// 输出：true

// 示例 2：
// 输入：head = [1,2]
// 输出：false

// 提示：

// 链表中节点数目在范围[1, 105] 内
// 0 <= Node.val <= 9

// 进阶：你能否用 O(n) 时间复杂度和 O(1) 空间复杂度解决此题？

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {boolean}
 */
// var isPalindrome = function (head) {
//   let arr = [];
//   while (head) {
//     arr.push(head.val);
//     head = head.next;
//   }

//   let flag = true;
//   for (let i = 0; i < Math.floor(arr.length / 2); i++) {
//     if (arr[i] !== arr[arr.length - 1 - i]) {
//       return (flag = false);
//     }
//   }

//   return flag;
// };

var isPalindrome = function (head) {
  let pre = null;
  let temp = head;

  let last;
  while (temp) {
    temp.pre = pre;
    pre = temp;

    last = temp;
    temp = temp.next;
  }

  let flag = true;
  while (last && head) {
    if (last.val !== head.val) {
      flag = false;
      break;
    }

    last = last.pre;
    head = head.next;
  }

  return flag;
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

console.log(output(isPalindrome(struct([1, 2, 2, 1]))));
