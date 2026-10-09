// Safe: an interval whose handle is stored and cleared on a stop event.
let handle = setInterval(() => {
  document.querySelector(".status").textContent = new Date().toISOString();
}, 1000);

document.querySelector("#stop").addEventListener("click", () => {
  clearInterval(handle);
});
