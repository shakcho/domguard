// Unsafe: a "submit" listener that dispatches another "submit" event.
document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();
  document.querySelector("form").dispatchEvent(new Event("submit"));
});
