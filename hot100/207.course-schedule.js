// 207. 课程表

// 你这个学期必须选修 numCourses 门课程，记为 0 到 numCourses - 1 。

// 在选修某些课程之前需要一些先修课程。 先修课程按数组 prerequisites 给出，其中 prerequisites[i] = [ai, bi] ，表示如果要学习课程 ai 则 必须 先学习课程  bi 。

// 例如，先修课程对 [0, 1] 表示：想要学习课程 0 ，你需要先完成课程 1 。
// 请你判断是否可能完成所有课程的学习？如果可以，返回 true ；否则，返回 false 。

// 示例 1：
// 输入：numCourses = 2, prerequisites = [[1,0]]
// 输出：true
// 解释：总共有 2 门课程。学习课程 1 之前，你需要完成课程 0 。这是可能的。

// 示例 2：
// 输入：numCourses = 2, prerequisites = [[1,0],[0,1]]
// 输出：false
// 解释：总共有 2 门课程。学习课程 1 之前，你需要先完成​课程 0 ；并且学习课程 0 之前，你还应先完成课程 1 。这是不可能的。

// 提示：
// 1 <= numCourses <= 2000
// 0 <= prerequisites.length <= 5000
// prerequisites[i].length == 2
// 0 <= ai, bi < numCourses
// prerequisites[i] 中的所有课程对 互不相同

/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
var canFinish = function (numCourses, prerequisites) {
  // 课程入度
  const inDegree = new Array(numCourses).fill(0);
  // 课程依赖
  const courseDep = new Map();

  for (let i = 0; i < prerequisites.length; i++) {
    const targetCourse = prerequisites[i][0];
    // 当前课程的入度+1
    inDegree[targetCourse]++;

    const dep = prerequisites[i][1];
    if (courseDep.has(dep)) {
      courseDep.set(dep, [...courseDep.get(dep), targetCourse]);
    } else {
      courseDep.set(dep, [targetCourse]);
    }
  }

  const queue = [];
  for (let i = 0; i < inDegree.length; i++) {
    if (inDegree[i] === 0) {
      queue.push(i);
    }
  }

  let learn = 0;
  while (queue.length) {
    learn++;
    const course = queue.pop();
    if (courseDep.has(course)) {
      const deps = courseDep.get(course);
      for (let i = 0; i < deps.length; i++) {
        inDegree[deps[i]]--;
        if (inDegree[deps[i]] === 0) {
          queue.push(deps[i]);
        }
      }
    }
  }

  return learn === numCourses;
};

console.log(
  canFinish(6, [
    [3, 0],
    [3, 1],
    [4, 1],
    [4, 2],
    [5, 3],
    [5, 4],
  ]),
);
