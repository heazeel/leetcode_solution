// 85. 最大矩形

// 给定一个仅包含 0 和 1 、大小为 rows x cols 的二维二进制矩阵，找出只包含 1 的最大矩形，并返回其面积。

// 示例 1：
// https://assets.leetcode.com/uploads/2020/09/14/maximal.jpg
// 输入：matrix = [
// ["1","0","1","0","0"],
// ["1","0","1","1","1"],
// ["1","1","1","1","1"],
// ["1","0","0","1","0"]
// ]
// 输出：6
// 解释：最大矩形如上图所示。

// 示例 2：
// 输入：matrix = [["0"]]
// 输出：0

// 示例 3：
// 输入：matrix = [["1"]]
// 输出：1

// 提示：
// rows == matrix.length
// cols == matrix[0].length
// 1 <= row, cols <= 200
// matrix[i][j] 为 '0' 或 '1'

/**
 * @param {character[][]} matrix
 * @return {number}
 */
var maximalRectangle = function (matrix) {
  const findMaxArea = (heights) => {
    let stack = [];
    let max = 0;
    for (let i = 0; i < heights.length; i++) {
      while (heights.length && heights[i] < heights[stack[stack.length - 1]]) {
        let curH = heights[stack.pop()];
        while (stack.length && curH === heights[stack[stack.length - 1]]) {
          stack.pop();
        }

        let curW = stack.length ? i - stack[stack.length - 1] - 1 : i;

        max = Math.max(max, curH * curW);
      }

      stack.push(i);
    }

    while (stack.length) {
      let pollIndex = stack.pop();
      let area = 0;
      if (stack.length) {
        area =
          (heights.length - stack[stack.length - 1] - 1) * heights[pollIndex];
      } else {
        area = heights.length * heights[pollIndex];
      }

      max = Math.max(max, area);
    }

    return max;
  };

  let max = 0;
  let heightArr = new Array(matrix.length)
    .fill(0)
    .map(() => new Array(matrix[0].length).fill(0));

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (Number(matrix[i][j]) != 0) {
        heightArr[i][j] =
          i != 0
            ? Number(heightArr[i - 1]?.[j]) + Number(matrix[i][j])
            : Number(matrix[i][j]);
      } else {
        heightArr[i][j] = 0;
      }
    }

    max = Math.max(max, findMaxArea(heightArr[i]));
  }

  return max;
};

console.log(
  maximalRectangle([
    ['1', '0', '1', '0', '0'],
    ['1', '0', '1', '1', '1'],
    ['1', '1', '1', '1', '1'],
    ['1', '0', '0', '1', '0'],
  ]),
);
