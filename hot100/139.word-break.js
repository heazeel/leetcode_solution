// 139. 单词拆分

// 给你一个字符串 s 和一个字符串列表 wordDict 作为字典。如果可以利用字典中出现的一个或多个单词拼接出 s 则返回 true。

// 注意：不要求字典中出现的单词全部都使用，并且字典中的单词可以重复使用。

// 示例 1：
// 输入: s = "leetcode", wordDict = ["leet", "code"]
// 输出: true
// 解释: 返回 true 因为 "leetcode" 可以由 "leet" 和 "code" 拼接成。

// 示例 2：
// 输入: s = "applepenapple", wordDict = ["apple", "pen"]
// 输出: true
// 解释: 返回 true 因为 "applepenapple" 可以由 "apple" "pen" "apple" 拼接成。
// 注意，你可以重复使用字典中的单词。

// 示例 3：
// 输入: s = "catsandog", wordDict = ["cats", "dog", "sand", "and", "cat"]
// 输出: false

// 提示：
// 1 <= s.length <= 300
// 1 <= wordDict.length <= 1000
// 1 <= wordDict[i].length <= 20
// s 和 wordDict[i] 仅由小写英文字母组成
// wordDict 中的所有字符串 互不相同

/**
 * @param {string} s
 * @param {string[]} wordDict
 * @return {boolean}
 */
var wordBreak = function (s, wordDict) {
  const set = new Set(wordDict);
  const hasMatched = new Array(s.length);

  // const dfs = (path) => {
  //   if (path === s) {
  //     return (res = true);
  //   }

  //   if (hasMatched.includes(path)) return;
  //   hasMatched.push(path);

  //   for (let i = 0; i < wordDict.length; i++) {
  //     if (s.startsWith(path + wordDict[i])) {
  //       dfs(path + wordDict[i]);
  //     }
  //   }
  // };

  const dfs = (start) => {
    if (start === s.length) return true;

    if (hasMatched[start] !== undefined) return hasMatched[start];

    for (let i = start + 1; i <= s.length; i++) {
      if (set.has(s.substring(start, i)) && dfs(i)) {
        hasMatched[start] = true;
        return true;
      }
    }

    hasMatched[start] = false;

    return false;
  };

  return dfs(0);
};

console.log(
  wordBreak(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
    [
      'a',
      'aa',
      'aaa',
      'aaaa',
      'aaaaa',
      'aaaaaa',
      'aaaaaaa',
      'aaaaaaaa',
      'aaaaaaaaa',
      'aaaaaaaaaa',
    ],
  ),
);
