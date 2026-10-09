// Safe: scroll listener that reads scroll position to drive a progress
// bar — never calls a scroll API itself.
const bar = document.querySelector(".scroll-progress");
window.addEventListener("scroll", () => {
  const pct = (window.scrollY / document.body.scrollHeight) * 100;
  bar.style.width = pct + "%";
}, { passive: true });
