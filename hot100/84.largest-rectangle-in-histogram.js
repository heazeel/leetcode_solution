// 84. 柱状图中最大的矩形

// 给定 n 个非负整数，用来表示柱状图中各个柱子的高度。每个柱子彼此相邻，且宽度为 1 。

// 求在该柱状图中，能够勾勒出来的矩形的最大面积。

// 示例 1:
// 输入：heights = [2,1,5,6,2,3]
// 输出：10
// 解释：最大的矩形为图中红色区域，面积为 10

// 示例 2：
// 输入： heights = [2,4]
// 输出： 4

// 提示：
// 1 <= heights.length <=105
// 0 <= heights[i] <= 104

// 单调栈：https://leetcode.cn/problems/largest-rectangle-in-histogram/solutions/142012/bao-li-jie-fa-zhan-by-liweiwei1419/

/**
 * @param {number[]} heights
 * @return {number}
 */
var largestRectangleArea = function (heights) {
  let max = 0;
  let stack = [];

  for (let i = 0; i < heights.length; i++) {
    while (stack.length && heights[i] < heights[stack[stack.length - 1]]) {
      const pollIndex = stack.pop();
      const curH = heights[pollIndex];

      while (stack.length && curH === heights[stack[stack.length - 1]]) {
        stack.pop();
      }

      let curWidth = stack.length ? i - stack[stack.length - 1] - 1 : i;
      max = Math.max(max, curH * curWidth);
    }

    stack.push(i);
  }

  while (stack.length) {
    const pollIndex = stack.pop();
    let area = 0;
    if (stack.length) {
      area =
        (heights.length - stack[stack.length - 1] - 1) * heights[pollIndex];
    } else {
      area = heights[pollIndex] * heights.length;
    }

    max = Math.max(max, area);
  }

  return max;
};

console.log(largestRectangleArea([1, 0, 1, 0, 1]));
