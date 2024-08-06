// 215. 数组中的第K个最大元素

// 给定整数数组 nums 和整数 k，请返回数组中第 k 个最大的元素。

// 请注意，你需要找的是数组排序后的第 k 个最大的元素，而不是第 k 个不同的元素。

// 你必须设计并实现时间复杂度为 O(n) 的算法解决此问题。

// 示例 1:
// 输入: [3,2,1,5,6,4], k = 2
// 输出: 5

// 示例 2:
// 输入: [3,2,3,1,2,4,5,5,6], k = 4
// 输出: 4

// 提示：
// 1 <= k <= nums.length <= 105
// -104 <= nums[i] <= 104

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
var findKthLargest = function (nums, k) {
  const quickSearch = (nums, left, right) => {
    const pivot = partition(nums, left, right);
    let goat = nums.length - k;
    if (goat === pivot) return nums[pivot];

    if (goat < pivot) {
      return quickSearch(nums, left, pivot - 1);
    }

    return quickSearch(nums, pivot + 1, right);
  };

  const midOfThree = (nums, left, right, mid) => {
    let l = nums[left],
      m = nums[mid],
      r = nums[right];
    // m 在 l 和 r 之间
    if ((l <= m && m <= r) || (r <= m && m <= l)) return mid;
    // l 在 m 和 r 之间
    if ((m <= l && l <= r) || (r <= l && l <= m)) return left;
    return right;
  };

  const partition = (nums, left, right) => {
    let i = left;
    let j = right;

    const mid = midOfThree(nums, left, right, Math.floor((left + right) / 2));
    [nums[left], nums[mid]] = [nums[mid], nums[left]];

    while (i < j) {
      while (i < j && nums[j] >= nums[left]) j--;
      while (i < j && nums[i] <= nums[left]) i++;
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    [nums[left], nums[i]] = [nums[i], nums[left]];

    return i;
  };

  return quickSearch(nums, 0, nums.length - 1);
};

console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2));
