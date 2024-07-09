// 40. 组合总和 II

// 给定一个候选人编号的集合 candidates 和一个目标数 target ，找出 candidates 中所有可以使数字和为 target 的组合。

// candidates 中的每个数字在每个组合中只能使用 一次 。

// 注意：解集不能包含重复的组合。

// 示例 1:
// 输入: candidates = [10,1,2,7,6,1,5], target = 8,
// 输出:
// [
// [1,1,6],
// [1,2,5],
// [1,7],
// [2,6]
// ]

// 示例 2:
// 输入: candidates = [2,5,2,1,2], target = 5,
// 输出:
// [
// [1,2,2],
// [5]
// ]

/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
var combinationSum2 = function (candidates, target) {
  let res = [];
  candidates.sort((a, b) => a - b);

  const backtracking = (sum, index, path, used) => {
    if (sum === target) {
      res.push([...path]);
      return;
    }

    for (let i = index; i < candidates.length; i++) {
      if (
        i > 0 &&
        candidates[i] === candidates[i - 1] &&
        used[i - 1] == false
      ) {
        continue;
      }

      if (sum + candidates[i] <= target) {
        used[i] = true;
        backtracking(
          sum + candidates[i],
          i + 1,
          [...path, candidates[i]],
          used,
        );
        used[i] = false;
      }
    }
  };

  backtracking(0, 0, [], Array(candidates.length).fill(false));

  return res;
};

console.log(combinationSum2([10, 1, 2, 7, 6, 1, 5], 8));
