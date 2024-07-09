// 假设你正在爬楼梯。需要 n 阶你才能到达楼顶。

// 每次你可以爬 1 或 2 个台阶。你有多少种不同的方法可以爬到楼顶呢？

// 示例 1：
// 输入：n = 2
// 输出：2
// 解释：有两种方法可以爬到楼顶。
// 1. 1 阶 + 1 阶
// 2. 2 阶

// 示例 2：
// 输入：n = 3
// 输出：3
// 解释：有三种方法可以爬到楼顶。
// 1. 1 阶 + 1 阶 + 1 阶
// 2. 1 阶 + 2 阶
// 3. 2 阶 + 1 阶

// 提示：
// 1 <= n <= 45

/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function (n) {
  // dp[i] 表示爬到第n阶需要的次数
  // 根据题意得，dp[i] = dp[i-1] + dp[i-2]
  // dp[0] = 1
  // dp[1] = 2
  // dp[2] = 3
  let pre1 = 1;
  let pre2 = 2;

  if (n === 1) return pre1;
  if (n === 2) return pre2;

  let count = 0;
  for (let i = 2; i < n; i++) {
    count = pre1 + pre2;
    pre1 = pre2;
    pre2 = count;
  }

  return count;
};

console.log(climbStairs(3));
