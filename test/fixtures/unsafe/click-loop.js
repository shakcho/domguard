// Unsafe: a click handler that, depending on state, triggers another
// element's click — which in turn triggers this same handler.
document.querySelector(".tab-a").addEventListener("click", () => {
  document.querySelector(".tab-b").click();
  document.querySelector(".tab-a").click();
});
