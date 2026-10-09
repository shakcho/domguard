// Safe: recursion with an explicit numeric base case.
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
