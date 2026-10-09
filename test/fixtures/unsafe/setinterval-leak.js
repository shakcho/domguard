// Unsafe: a polling interval started but never cleared. clearInterval
// is never referenced anywhere in the file.
setInterval(() => {
  fetch("/api/heartbeat").catch(() => {});
}, 5000);
