// 55. 跳跃游戏

// 给你一个非负整数数组 nums ，你最初位于数组的 第一个下标 。数组中的每个元素代表你在该位置可以跳跃的最大长度。

// 判断你是否能够到达最后一个下标，如果可以，返回 true ；否则，返回 false 。

// 示例 1：

// 输入：nums = [2,3,1,1,4]
// 输出：true
// 解释：可以先跳 1 步，从下标 0 到达下标 1, 然后再从下标 1 跳 3 步到达最后一个下标。
// 示例 2：

// 输入：nums = [3,2,1,0,4]
// 输出：false
// 解释：无论怎样，总会到达下标为 3 的位置。但该下标的最大跳跃长度是 0 ， 所以永远不可能到达最后一个下标。

// 提示：

// 1 <= nums.length <= 104
// 0 <= nums[i] <= 105

/**
 * @param {number[]} nums
 * @return {boolean}
 */
// 动态规划
// var canJump = function (nums) {
//   let dp = [nums[0]];

//   for (let i = 1; i < nums.length; i++) {
//     // 子问题：dp[i]为能够跳跃的最远距离
//     // dp[0] = nums[0]
//     // dp[1] = Math.max(dp[0] - 1, nums[1])
//     if (dp[i - 1] < 1) return false;
//     dp[i] = Math.max(dp[i - 1] - 1, nums[i]);
//   }

//   return true;
// };

// 贪心
var canJump = function (nums) {
  let max = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (i > max) return false;
    max = Math.max(nums[i] + i, max);
  }

  return true;
};

console.log(canJump([3, 2, 1, 0, 4]));
