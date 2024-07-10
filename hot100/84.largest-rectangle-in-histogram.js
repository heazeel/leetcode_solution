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

/**
 * @param {number[]} heights
 * @return {number}
 */
var largestRectangleArea = function (heights) {
  let max = 0;

  let leftFirstMin = new Array(heights.length).fill(-1);
  leftFirstMin[0] = 0;
  for (let i = 1; i < heights.length; i++) {
    if (heights[i - 1] <= heights[i]) {
      leftFirstMin[i] = i - 1;
    } else {
      leftFirstMin[i] =
        heights[i] >= heights[leftFirstMin[i - 1]] ? leftFirstMin[i - 1] : i;
    }
  }

  let rightFirstMin = new Array(heights.length).fill(-1);
  rightFirstMin[heights.length - 1] = heights.length - 1;
  for (let i = heights.length - 2; i >= 0; i--) {
    if (heights[i + 1] <= heights[i]) {
      rightFirstMin[i] = i + 1;
    } else {
      rightFirstMin[i] =
        heights[i] >= heights[rightFirstMin[i + 1]] ? rightFirstMin[i + 1] : i;
    }
  }

  console.log(leftFirstMin, rightFirstMin);

  for (let i = 0; i < heights.length; i++) {
    max = Math.max(max, (rightFirstMin[i] - leftFirstMin[i] - 1) * heights[i]);
  }

  return max;
};

console.log(largestRectangleArea([2, 4, 4, 4]));
