const Colors = [
  'rgb(0, 109, 44)',
  'rgb(44, 162, 95)',
  'rgb(102, 194, 164)',
  'rgb(165, 15, 21)',
  'rgb(222, 45, 38)',
  'rgb(251, 106, 74)',
];

export const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * Colors.length);
  return Colors[randomIndex];
};

// 找到离选择时间点最近的时间戳
export const findClosestLargerStamp = (array: number[], target: number) => {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (array[mid] <= target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  console.log(left, right, array[left], array[right]);

  return array[left];
};

// 时间补间
export const fillMissingDates = (data: any) => {
  if (data.length < 2) return data;
  const result = [];
  for (let i = 0; i < data.length - 1; i++) {
    result.push(data[i]);
    let next = data[i].date + 1;
    while (next < data[i + 1].date) {
      result.push({ date: next, value: 0, timeStamps: [] });
      next++;
    }
  }
  result.push(data[data.length - 1]);
  return result;
};
