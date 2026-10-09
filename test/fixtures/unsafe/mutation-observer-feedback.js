// Unsafe: observer callback mutates the same body it observes.
const observer = new MutationObserver((records) => {
  for (const r of records) {
    document.body.appendChild(document.createElement("div"));
  }
});
observer.observe(document.body, { childList: true });
