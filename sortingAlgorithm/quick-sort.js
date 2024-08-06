const quickSort = (arr, left, right) => {
  if (left >= right) return;

  const pivot = partition(arr, left, right);
  quickSort(arr, left, pivot - 1);
  quickSort(arr, pivot + 1, right);
};

const midOfThree = (arr, left, right, mid) => {
  let l = arr[left],
    m = arr[mid],
    r = arr[right];
  // m 在 l 和 r 之间
  if ((l <= m && m <= r) || (r <= m && m <= l)) return mid;
  // l 在 m 和 r 之间
  if ((m <= l && l <= r) || (r <= l && l <= m)) return left;
  return right;
};

const partition = (arr, left, right) => {
  let i = left;
  let j = right;

  const mid = midOfThree(arr, left, right, Math.floor((left + right) / 2));
  [arr[left], arr[mid]] = [arr[mid], arr[left]];

  while (i < j) {
    while (i < j && arr[j] >= arr[left]) j--;
    while (i < j && arr[i] <= arr[left]) i++;

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  [arr[left], arr[i]] = [arr[i], arr[left]];

  return i;
};

const nums = [5, 3, 4, 1, 2];
quickSort(nums, 0, nums.length - 1);

console.log(nums);

// Q：哨兵划分中“从右往左查找”与“从左往右查找”的顺序可以交换吗？

// A: 不行，当我们以最左端元素为基准数时，必须先“从右往左查找”再“从左往右查找”。
// 这个结论有些反直觉，我们来剖析一下原因。
// 哨兵划分 partition() 的最后一步是交换 nums[left] 和 nums[i] 。
// 完成交换后，基准数左边的元素都 <= 基准数，这就要求最后一步交换前 nums[left] >= nums[i] 必须成立。
// 假设我们先“从左往右查找”，那么如果找不到比基准数更大的元素，则会在 i == j 时跳出循环，此时可能 nums[j] == nums[i] > nums[left]。
// 也就是说，此时最后一步交换操作会把一个比基准数更大的元素交换至数组最左端，导致哨兵划分失败。
// 举个例子，给定数组 [0, 0, 0, 0, 1] ，如果先“从左向右查找”，哨兵划分后数组为 [1, 0, 0, 0, 0] ，这个结果是不正确的。
// 再深入思考一下，如果我们选择 nums[right] 为基准数，那么正好反过来，必须先“从左往右查找”。
