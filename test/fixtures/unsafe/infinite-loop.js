// Unsafe: while(true) with no escape.
function poll() {
  while (true) {
    const n = Math.random();
    console.log(n);
  }
}
