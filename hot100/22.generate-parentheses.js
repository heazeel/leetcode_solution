// 数字 n 代表生成括号的对数，请你设计一个函数，用于能够生成所有可能的并且 有效的 括号组合。

// 示例 1：
// 输入：n = 3
// 输出：["((()))","(()())","(())()","()(())","()()()"]

// 示例 2：
// 输入：n = 1
// 输出：["()"]

// 提示：
// 1 <= n <= 8

/**
 * @param {number} n
 * @return {string[]}
 */
var generateParenthesis = function (n) {
  if (n === 1) return ['()'];

  const res = [];
  const backtracking = (leftRest, rightRest, path) => {
    if (leftRest > rightRest) return;
    if (leftRest === 0 && rightRest === 0) {
      return res.push(path.join(''));
    }

    if (rightRest) {
      path.push(')');
      backtracking(leftRest, rightRest - 1, path);
      path.pop();
    }

    if (leftRest) {
      path.push('(');
      backtracking(leftRest - 1, rightRest, path);
      path.pop();
    }
  };

  backtracking(n, n, []);

  return res;
};

console.log(generateParenthesis(1));
