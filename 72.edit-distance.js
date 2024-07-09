// 72. 编辑距离

// 给你两个单词 word1 和 word2， 请返回将 word1 转换成 word2 所使用的最少操作数  。

// 你可以对一个单词进行如下三种操作：

// 插入一个字符
// 删除一个字符
// 替换一个字符

// 示例 1：
// 输入：word1 = "horse", word2 = "ros"
// 输出：3
// 解释：
// horse -> rorse (将 'h' 替换为 'r')
// rorse -> rose (删除 'r')
// rose -> ros (删除 'e')

// 示例 2：
// 输入：word1 = "intention", word2 = "execution"
// 输出：5
// 解释：
// intention -> inention (删除 't')
// inention -> enention (将 'i' 替换为 'e')
// enention -> exention (将 'n' 替换为 'x')
// exention -> exection (将 'n' 替换为 'c')
// exection -> execution (插入 'u')

// 提示：
// 0 <= word1.length, word2.length <= 500
// word1 和 word2 由小写英文字母组成

/**
 * @param {string} word1
 * @param {string} word2
 * @return {number}
 */
var minDistance = function (word1, word2) {
  // dp[i][j]表示word1从第i个位置变化到word2到第j个位置需要的最少次数
  // word1[i] == word2[j]，说明两个位置相同，那么 dp[i][j] = dp[i-1][j-1]
  // word1[i] != word2[j], 这里讨论三种情况：
  // 删除：即 dp[i][j] = dp[i][j-1] + 1
  // 插入：即 dp[i][j] = dp[i-1][j] + 1
  // 替换：即 dp[i][j] = dp[i-1][j-1] + 1

  //    '' r o s
  // '' 0  1 2 3
  // h  1
  // o  2
  // r  3
  // s  4
  // e  5

  // dp[0][0] = 0, dp[0][1] = 1, dp[0][2] = 2 ...
  // dp[1][0] = 0, dp[2][0] = 2, ...

  let m = word1.length;
  let n = word2.length;

  let dp = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    dp[i][0] = dp[i - 1][0] + 1;
  }

  for (let j = 1; j <= n; j++) {
    dp[0][j] = dp[0][j - 1] + 1;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      // 索引上+1，这里在字符上取索引需要-1
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
};

console.log(minDistance('horse', 'ros'));
