// 416. 分割等和子集

// 给你一个 只包含正整数 的 非空 数组 nums 。请你判断是否可以将这个数组分割成两个子集，使得两个子集的元素和相等。

// 示例 1：

// 输入：nums = [1,5,11,5]
// 输出：true
// 解释：数组可以分割成 [1, 5, 5] 和 [11] 。

// 示例 2：
// 输入：nums = [1,2,3,5]
// 输出：false
// 解释：数组不能分割成两个元素和相等的子集。

// 提示：
// 1 <= nums.length <= 200
// 1 <= nums[i] <= 100

/**
 * @param {number[]} nums
 * @return {boolean}
 */
var canPartition = function (nums) {
  const sum = nums.reduce((pre, cur) => pre + cur, 0);
  if (sum % 2 !== 0) return false;

  const taget = sum / 2;
  let dp = Array(taget + 1).fill(false);
  dp[0] = true;

  for (let i = 0; i <= nums.length; i++) {
    for (let j = taget; j >= 1; j--) {
      if (j - nums[i] >= 0) {
        dp[j] = dp[j] || dp[j - nums[i]];
      }
    }
  }

  return dp[taget];
};

console.log(canPartition([1, 2, 5]));
