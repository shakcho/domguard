// Safe: a click handler that opens a hidden file input by programmatically
// clicking it once. One .click() inside a click listener is fine.
document.querySelector("#upload-btn").addEventListener("click", () => {
  document.querySelector("#file-input").click();
});
