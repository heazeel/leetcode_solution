// 64. 最小路径和

// 给定一个包含非负整数的 m x n 网格 grid ，请找出一条从左上角到右下角的路径，使得路径上的数字总和为最小。

// 说明：每次只能向下或者向右移动一步。

// 示例 1：
// 输入：grid = [[1,3,1],[1,5,1],[4,2,1]]
// 输出：7
// 解释：因为路径 1→3→1→1→1 的总和最小。

// 示例 2：
// 输入：grid = [[1,2,3],[4,5,6]]
// 输出：12

// 提示：
// m == grid.length
// n == grid[i].length
// 1 <= m, n <= 200
// 0 <= grid[i][j] <= 200

/**
 * @param {number[][]} grid
 * @return {number}
 */
var minPathSum = function (grid) {
  // dp[i][j] 表示到（i，j）最小的数字和
  // 由题意可知，dp[i][j] = Min(dp[i-1][j], dp[i][j-1]) + num(i,j)
  let dp = new Array(grid.length)
    .fill(0)
    .map((item, index) => new Array(grid[index].length).fill(0));

  dp[0][0] = grid[0][0];
  for (let i = 0; i < grid.length; i++) {
    if (i === 0) {
      dp[0][0] = grid[0][0];
    } else {
      dp[i][0] = dp[i - 1][0] + grid[i][0];
    }

    for (let j = 1; j < grid[i].length; j++) {
      dp[0][j] = dp[0][j - 1] + grid[0][j];
    }
  }

  for (let i = 1; i < grid.length; i++) {
    for (let j = 1; j < grid[i].length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
    }
  }

  return dp[grid.length - 1][grid[grid.length - 1].length - 1];
};

console.log(minPathSum([[9, 1, 4, 8]]));