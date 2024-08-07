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
  let dp = Array(taget + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= taget; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i - nums[j] >= 0) {
        dp[i] = Math.min(dp[i - nums[j]] + 1, dp[i]);
      }
    }
  }

  console.log(dp);

  return dp[taget] !== Infinity;
};

console.log(canPartition([1, 2, 5]));
