// 31. 下一个排列

// 整数数组的一个排列就是将其所有成员以序列或线性顺序排列。

// 例如，arr = [1,2,3] ，以下这些都可以视作 arr 的排列：[1,2,3]、[1,3,2]、[3,1,2]、[2,3,1] 。
// 整数数组的 下一个排列 是指其整数的下一个字典序更大的排列。更正式地，如果数组的所有排列根据其字典顺序从小到大排列在一个容器中，那么数组的 下一个排列 就是在这个有序容器中排在它后面的那个排列。如果不存在下一个更大的排列，那么这个数组必须重排为字典序最小的排列（即，其元素按升序排列）。

// 例如，arr = [1,2,3] 的下一个排列是 [1,3,2] 。
// 类似地，arr = [2,3,1] 的下一个排列是 [3,1,2] 。
// 而 arr = [3,2,1] 的下一个排列是 [1,2,3] ，因为 [3,2,1] 不存在一个字典序更大的排列。
// 给你一个整数数组 nums ，找出 nums 的下一个排列。

// 必须 原地 修改，只允许使用额外常数空间。

// 示例 1：
// 输入：nums = [1,2,3]
// 输出：[1,3,2]

// 示例 2：
// 输入：nums = [3,2,1]
// 输出：[1,2,3]

// 示例 3：
// 输入：nums = [1,1,5]
// 输出：[1,5,1]

// 提示：
// 1 <= nums.length <= 100
// 0 <= nums[i] <= 100

/**
 * @param {number[]} nums
 * @return {void} Do not return anything, modify nums in-place instead.
 */
var nextPermutation = function (nums) {
  if (nums.length < 2) return nums;
  let index1;
  let index2;
  for (let i = nums.length - 2; i >= 0; i--) {
    if (nums[i] < nums[i + 1]) {
      index1 = i;
      break;
    }
  }

  for (let i = nums.length - 1; i > index1; i--) {
    if (nums[i] > nums[index1]) {
      index2 = i;
      break;
    }
  }

  if (index1 === undefined && index2 === undefined) {
    nums.reverse();
    return nums;
  }

  [nums[index1], nums[index2]] = [nums[index2], nums[index1]];

  for (let i = index1 + 1; i < nums.length - 1; i++) {
    for (let j = index1 + 1; j < nums.length - i + index1; j++) {
      if (nums[j] > nums[j + 1]) {
        [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
      }
    }
  }

  return nums;
};

console.log(nextPermutation([3, 2, 1]));
