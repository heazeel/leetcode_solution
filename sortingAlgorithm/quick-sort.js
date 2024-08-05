const quickSort = (arr, left, right) => {
  if (left >= right) return;

  const pivot = partition(arr, left, right);
  quickSort(arr, left, pivot - 1);
  quickSort(arr, pivot + 1, right);
};

const midOfThree = (arr, left, right, mid) => {
  let l = nums[left],
    m = nums[mid],
    r = nums[right];
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
    while (i < j && arr[i] <= nums[left]) i++;
    while (i < j && arr[j] >= nums[left]) j--;

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  [arr[left], arr[i]] = [arr[i], arr[left]];

  return i;
};

const nums = [5, 3, 4, 1, 2];
quickSort(nums, 0, nums.length - 1);

console.log(nums);
