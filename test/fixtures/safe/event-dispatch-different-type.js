// Safe: a click listener that dispatches a custom event of a different
// type. The custom event is handled by an unrelated listener and does
// not loop back.
document.querySelector("#open-modal").addEventListener("click", () => {
  window.dispatchEvent(new CustomEvent("modal:open", { detail: { id: "settings" } }));
});
