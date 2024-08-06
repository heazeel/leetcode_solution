function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

const arrayToLinkedList = (numArr) => {
  const res = new ListNode(0);
  let temp = res;
  for (let i = 0; i < numArr.length - 1; i++) {
    temp.val = numArr[i];
    temp.next = new ListNode(numArr[i + 1]);
    temp = temp.next;
  }

  return res;
};

const printList = (list) => {
  let arr = [];
  while (list) {
    arr.push(list.val);
    list = list.next;
  }

  return arr;
};

module.exports = {
  arrayToLinkedList,
  printList,
};
