// Unsafe: scroll listener that programmatically scrolls back to top once
// the user scrolls past a threshold. This re-fires the scroll event and
// hangs the browser.
window.addEventListener("scroll", () => {
  if (window.scrollY > 1000) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
