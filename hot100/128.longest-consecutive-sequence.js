// 128. 最长连续序列

// 给定一个未排序的整数数组 nums ，找出数字连续的最长序列（不要求序列元素在原数组中连续）的长度。

// 请你设计并实现时间复杂度为 O(n) 的算法解决此问题。

// 示例 1：
// 输入：nums = [100,4,200,1,3,2]
// 输出：4
// 解释：最长数字连续序列是 [1, 2, 3, 4]。它的长度为 4。

// 示例 2：
// 输入：nums = [0,3,7,2,5,8,4,6,0,1]
// 输出：9

// 提示：
// 0 <= nums.length <= 105
// -109 <= nums[i] <= 109

/**
 * @param {number[]} nums
 * @return {number}
 */
var longestConsecutive = function (nums) {
  if (!nums.length) return 0;

  const map = new Set();
  for (let i = 0; i < nums.length; i++) {
    map.add(nums[i]);
  }

  let maxLen = 0;
  for (let i = 0; i < nums.length; i++) {
    if (!map.has(nums[i] - 1)) {
      let len = 1;
      for (let j = 1; j <= nums.length; j++) {
        if (map.has(nums[i] + j)) {
          len++;
          maxLen = Math.max(maxLen, len);
        } else {
          maxLen = Math.max(maxLen, len);
          break;
        }
      }
    }
  }

  return maxLen;
};

console.log(longestConsecutive([0]));
