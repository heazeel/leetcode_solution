// 79. 单词搜索

// 给定一个 m x n 二维字符网格 board 和一个字符串单词 word 。如果 word 存在于网格中，返回 true ；否则，返回 false 。

// 单词必须按照字母顺序，通过相邻的单元格内的字母构成，其中“相邻”单元格是那些水平相邻或垂直相邻的单元格。同一个单元格内的字母不允许被重复使用。

// 示例 1：
// ![image](https://assets.leetcode.com/uploads/2020/11/04/word2.jpg)
// 输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
// 输出：true

// 示例 2：
// https://assets.leetcode.com/uploads/2020/11/04/word-1.jpg
// 输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"
// 输出：true

// 示例 3：
// https://assets.leetcode.com/uploads/2020/10/15/word3.jpg
// 输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"
// 输出：false

// 提示：
// m == board.length
// n = board[i].length
// 1 <= m, n <= 6
// 1 <= word.length <= 15
// board 和 word 仅由大小写英文字母组成

// 进阶：你可以使用搜索剪枝的技术来优化解决方案，使其在 board 更大的情况下可以更快解决问题？

/**
 * @param {character[][]} board
 * @param {string} word
 * @return {boolean}
 */
var exist = function (board, word) {
  let m = board.length;
  let n = board[0].length;
  let used = new Array(m).fill(0).map(() => new Array(n).fill(0));

  const dfs = (i, j, startIndex) => {
    if (startIndex === word.length) return true;

    if (
      i >= m ||
      j >= n ||
      i < 0 ||
      j < 0 ||
      used[i][j] ||
      board[i][j] !== word[startIndex]
    )
      return false;

    used[i][j] = 1;
    if (
      dfs(i + 1, j, startIndex + 1) ||
      dfs(i - 1, j, startIndex + 1) ||
      dfs(i, j + 1, startIndex + 1) ||
      dfs(i, j - 1, startIndex + 1)
    ) {
      return true;
    }
    used[i][j] = 0;

    return false;
  };

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] == word[0] && dfs(i, j, 0)) {
        return true;
      }
    }
  }

  return false;
};

console.log(
  exist(
    [
      ['C', 'A', 'A'],
      ['A', 'A', 'A'],
      ['B', 'C', 'D'],
    ],
    'AAB',
  ),
);
