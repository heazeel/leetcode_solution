// 42. 接雨水

// 给定 n 个非负整数表示每个宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

// 示例 1：
// 输入：height = [0,1,0,2,1,0,1,3,2,1,2,1]
// 输出：6
// 解释：上面是由数组 [0,1,0,2,1,0,1,3,2,1,2,1] 表示的高度图，在这种情况下，可以接 6 个单位的雨水（蓝色部分表示雨水）。

// 示例 2：
// 输入：height = [4,2,0,3,2,5]
// 输出：9

// 提示：
// n == height.length
// 1 <= n <= 2 * 104
// 0 <= height[i] <= 105

/**
 * @param {number[]} height
 * @return {number}
 */
var trap = function (height) {
  let count = 0;

  let maxRightArr = Array(height.length).fill(0);
  maxRightArr[height.length - 1] = height[height.length - 1];
  for (let i = height.length - 2; i >= 0; i--) {
    maxRightArr[i] = Math.max(height[i], maxRightArr[i + 1]);
  }

  let maxLeftArr = [height[0]];
  for (let i = 0; i < height.length; i++) {
    let left = i - 1;
    let right = i + 1;
    if (left < 0 || right >= height.length) continue;

    let maxLeft = maxLeftArr[i - 1];
    let maxRight = maxRightArr[i];

    maxLeftArr[i] = Math.max(maxLeftArr[maxLeftArr.length - 1], height[i]);

    const h = Math.min(maxLeft, maxRight);
    count += h > height[i] ? h - height[i] : 0;
  }

  return count;
};

console.log(trap([4, 2, 0, 3, 2, 5]));
