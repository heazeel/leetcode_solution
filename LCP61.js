/**
 * @param {number[]} temperatureA
 * @param {number[]} temperatureB
 * @return {number}
 */
var temperatureTrend = function (temperatureA, temperatureB) {
  const handleArr = (arr) => {
    let t = [];
    for (let i = 0; i < arr.length - 1; i++) {
      t.push(arr[i + 1] - arr[i] > 0 ? 1 : arr[i + 1] - arr[i] == 0 ? 0 : -1);
    }
    return t;
  };

  const t1 = handleArr(temperatureA);
  const t2 = handleArr(temperatureB);

  let ans = 0;
  let large = ans;
  for (let i = 0; i < t1.length; i++) {
    if (t1[i] == t2[i]) {
      ans++;
    } else {
      large = ans > large ? ans : large;
      ans = 0;
    }
  }

  console.log(t1, t2);

  return large;
};

console.log(
  temperatureTrend(
    [1, 17, 37, 30, 28, -4, -4, 21, -6, 6],
    [40, 24, 6, 39, 28, 5, -17, 13, 40, -12],
  ),
);
