// basic statistical functions

export const compare = (a:number, b:number) =>{
  return a > b ? 1 : a < b ? -1 : 0;
}

export const add = (a:number,  b:number)=> {
  return a + b;
}

export const sum = (arr:number[]) => {
  return arr.reduce(add);
}

export const mean = (arr:number[]) => {
  return sum(arr) / arr.length;
}

export const std = (arr:number[]) => {
  return Math.sqrt(variance(arr));
}

export const variance = (arr:number[]) => {
  if (arr.length < 2) return 0;

  const _mean = mean(arr);
  return arr
          .map(x => Math.pow(x - _mean, 2))
          .reduce(add) / (arr.length - 1);
}

export const median = (arr:number[])=> {
  if (arr.length < 2) return arr[0];

  const sorted = arr.slice().sort(compare);
  if (sorted.length % 2 === 0) {
    // even
    return (sorted[arr.length / 2 - 1] + sorted[arr.length / 2]) / 2;
  }
  else {
    // odd
    return sorted[(arr.length - 1) / 2];
  }
}
