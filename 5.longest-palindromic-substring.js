// 给你一个字符串 s，找到 s 中最长的回文子串

// 示例 1：
// 输入：s = "babad"
// 输出："bab"
// 解释："aba" 同样是符合题意的答案。

// 示例 2：
// 输入：s = "cbbd"
// 输出："bb"

// 提示：
// 1 <= s.length <= 1000
// s 仅由数字和英文字母组成

/**
 * @param {string} s
 * @return {string}
 */
var longestPalindrome = function (s) {
  let left = 0;
  let right = 0;
  let max = 0;
  let str = '';

  for (let i = 0; i < s.length; i++) {
    let len = 1;
    let leftIndex = i;
    let rightIndex = i;

    left = i - 1;
    right = i + 1;
    while (left >= 0 && s[left] === s[i]) {
      leftIndex = left;
      left--;
      len++;
    }

    while (right < s.length && s[right] === s[i]) {
      rightIndex = right;
      right++;
      len++;
    }

    while (left >= 0 && right < s.length && s[left] === s[right]) {
      len += 2;
      leftIndex = left;
      rightIndex = right;

      left--;
      right++;
    }

    if (len > max) {
      max = len;
      str = s.slice(leftIndex, rightIndex + 1);
    }
  }

  return str;
};

console.log(longestPalindrome('cdodcabcwwqq'));
