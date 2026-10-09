// Safe: while(true) that breaks once a condition is met.
function nextEven(start) {
  let n = start;
  while (true) {
    if (n % 2 === 0) break;
    n++;
  }
  return n;
}
