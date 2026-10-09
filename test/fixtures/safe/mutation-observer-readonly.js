// Safe: observer logs mutations but never mutates the DOM itself.
const observer = new MutationObserver((records) => {
  for (const r of records) {
    console.log("mutation:", r.type, r.target.nodeName);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
