// 78. 子集

// 给你一个整数数组 nums ，数组中的元素 互不相同 。返回该数组所有可能的子集（幂集）。

// 解集 不能 包含重复的子集。你可以按 任意顺序 返回解集。

// 示例 1：
// 输入：nums = [1,2,3]
// 输出：[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]

// 示例 2：
// 输入：nums = [0]
// 输出：[[],[0]]

// 提示：
// 1 <= nums.length <= 10
// -10 <= nums[i] <= 10
// nums 中的所有元素 互不相同

/**
 * @param {number[]} nums
 * @return {number[][]}
 */
// var subsets = function (nums) {
//   let res = [];

//   nums.sort((a, b) => a - b);

//   const backtracking = (used, path) => {
//     res.push([...path]);

//     for (let i = 0; i < nums.length; i++) {
//       if (used[i] || (path.length && nums[i] < path[path.length - 1])) continue;
//       path.push(nums[i]);
//       used[i] = 1;
//       backtracking(used, path);
//       path.pop();
//       used[i] = 0;
//     }
//   };

//   backtracking(Array(nums.length).fill(0), []);

//   return res;
// };

var subsets = function (nums) {
  let res = [];

  const backtracking = (starIndex, path) => {
    res.push([...path]);

    for (let i = starIndex; i < nums.length; i++) {
      path.push(nums[i]);
      backtracking(i + 1, path);
      path.pop();
    }
  };

  backtracking(0, []);

  return res;
};

console.log(subsets([1, 2, 3]));
