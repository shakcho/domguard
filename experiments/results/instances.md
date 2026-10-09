# domguard — flagged instances with triage verdicts

Total **58** flags, manually triaged.

**Verdict summary:** genuine-hang 2, leak 19, borderline 2, conservative 35

- **genuine-hang** — freezes the tab as written (sync infinite loop/recursion/event/observer feedback).
- **leak** — `setInterval` with no `clearInterval`: real resource leak, worst in long-lived/SPA contexts; not a freeze.
- **borderline** — depends on a helper/data not fully visible in the file.
- **conservative** — detector heuristic fired but the code terminates / mutates a different subtree / is event-driven; over-flag.

| # | verdict | severity | detector | tier | model | prompt | line | culprit code | reason |
|--|--|--|--|--|--|--|--|--|--|
| 1 | **genuine-hang** | high | event-dispatch-loop | multifile | qwen3-coder_480b | m009 | 263 | `inputEl.dispatchEvent(new CustomEvent("input", {` | input handler dispatches its own 'input' event -> infinite synchronous recursion, freezes the tab |
| 2 | **genuine-hang** | medium | recursive-fn | multifile | gemma3_27b | m007 | 202 | `function createFolderNode(items, startId, endId, depth = 0) {` | createFolderNode recurses on the same 10-id range with no size base case -> infinite recursion / stack overflow |
| 3 | **leak** | medium | setinterval-leak | interactive | deepseek-v3.1_671b | i018 | 90 | `setInterval(async () => {` | presence poll never cleared |
| 4 | **leak** | medium | setinterval-leak | interactive | deepseek-v3.1_671b | i010 | 143 | `setInterval(pollNotifications, pollInterval);` | notification poll never cleared |
| 5 | **leak** | medium | setinterval-leak | interactive | deepseek-v3.1_671b | i002 | 148 | `updateInterval = setInterval(updateMetrics, 1000);` | poll interval never cleared; pause only flags |
| 6 | **leak** | medium | setinterval-leak | static | deepseek-v3.1_671b | p008 | 201 | `setInterval(() => {` | carousel timer never cleared |
| 7 | **leak** | medium | setinterval-leak | multifile | deepseek-v3.1_671b | m010 | 252 | `keepAliveInterval = setInterval(() => {` | keep-alive interval never cleared -- leaks on unmount |
| 8 | **leak** | medium | setinterval-leak | static | deepseek-v3.1_671b | p013 | 336 | `setInterval(updateTime, 60000);` | clock interval never cleared |
| 9 | **leak** | medium | setinterval-leak | interactive | gemma3_27b | i018 | 76 | `setInterval(updatePresence, 2000);` | presence poll never cleared |
| 10 | **leak** | medium | setinterval-leak | interactive | gemma3_27b | i010 | 88 | `setInterval(fetchNotifications, 5000);` | notification poll never cleared |
| 11 | **leak** | medium | setinterval-leak | interactive | gemma3_27b | i012 | 88 | `setInterval(updateCountdown, 1000);` | countdown interval never cleared |
| 12 | **leak** | medium | setinterval-leak | interactive | gemma3_27b | i002 | 134 | `setInterval(updateMetrics, 1000);` | metrics poll never cleared |
| 13 | **leak** | medium | setinterval-leak | multifile | gemma3_27b | m010 | 216 | `keepAliveInterval = setInterval(keepSessionAlive, 30000);` | keep-alive interval never cleared -- leaks on unmount |
| 14 | **leak** | medium | setinterval-leak | interactive | gpt-oss_120b | i018 | 100 | `setInterval(updatePresence, 2000);` | presence poll never cleared |
| 15 | **leak** | medium | setinterval-leak | static | gpt-oss_120b | p008 | 198 | `setInterval(() => {` | carousel timer never cleared |
| 16 | **leak** | medium | setinterval-leak | interactive | qwen3-coder_480b | i018 | 165 | `setInterval(updatePresence, 2000);` | presence poll never cleared |
| 17 | **leak** | medium | setinterval-leak | interactive | qwen3-coder_480b | i012 | 171 | `setInterval(() => {` | countdown interval never cleared |
| 18 | **leak** | medium | setinterval-leak | interactive | qwen3-coder_480b | i010 | 186 | `setInterval(pollNotifications, 5000);` | notification poll never cleared |
| 19 | **leak** | medium | setinterval-leak | interactive | qwen3-coder_480b | i002 | 214 | `updateInterval = setInterval(updateMetrics, 1000);` | metrics poll never cleared; pause only flags |
| 20 | **leak** | medium | setinterval-leak | multifile | qwen3-coder_480b | m010 | 243 | `setInterval(() => {` | keep-alive interval never cleared -- leaks on unmount |
| 21 | **leak** | medium | setinterval-leak | interactive | qwen3-coder_480b | i009 | 321 | `setInterval(() => {` | order-total timer never cleared |
| 22 | **borderline** | high | mutation-observer-feedback | multifile | deepseek-v3.1_671b | m009 | 262 | `const listObserver = new MutationObserver(() => {` | observer on .list calls filterItems(); a genuine loop iff filterItems rebuilds list nodes |
| 23 | **borderline** | high | mutation-observer-feedback | multifile | gemma3_27b | m009 | 204 | `const observer = new MutationObserver((mutations) => {` | observeDensity callback target not fully visible; likely updates aside count (safe) |
| 24 | **conservative** | high | mutation-observer-feedback | interactive | deepseek-v3.1_671b | i008 | 43 | `const observer = new MutationObserver(function(mutations) {` | observes childList only; callback writes position attributes -- attribute writes do not re-fire the observer |
| 25 | **conservative** | high | mutation-observer-feedback | interactive | deepseek-v3.1_671b | i021 | 124 | `const observer = new MutationObserver(function(mutations) {` | callback mutates the cloned sticky header, not the observed table |
| 26 | **conservative** | high | mutation-observer-feedback | multifile | deepseek-v3.1_671b | m003 | 202 | `const observer = new MutationObserver((mutations) => {` | sets data-theme/class on added nodes; childList observation ignores attribute changes |
| 27 | **conservative** | high | mutation-observer-feedback | multifile | deepseek-v3.1_671b | m009 | 203 | `const observer = new MutationObserver((mutations) => {` | callback only dispatches an event; flag is from the detector's 2KB window bleeding into the next function |
| 28 | **conservative** | high | mutation-observer-feedback | interactive | gemma3_27b | i008 | 45 | `const observer = new MutationObserver(mutations => {` | sets data-position attributes under childList-only observation -- no re-fire |
| 29 | **conservative** | high | mutation-observer-feedback | multifile | gemma3_27b | m003 | 202 | `const observer = new MutationObserver((mutations) => {` | applyCurrentTheme sets attributes on added nodes; no childList re-trigger |
| 30 | **conservative** | high | mutation-observer-feedback | interactive | gpt-oss_120b | i008 | 87 | `const observer = new MutationObserver(() => {` | writes dataset.position + localStorage under childList-only observation |
| 31 | **conservative** | high | mutation-observer-feedback | interactive | gpt-oss_120b | i003 | 97 | `const observer = new MutationObserver(mutations => {` | themeElement sets classes/CSS vars on added nodes; attribute writes do not re-fire |
| 32 | **conservative** | high | mutation-observer-feedback | multifile | qwen3-coder_480b | m003 | 202 | `const observer = new MutationObserver((mutations) => {` | sets class + inline style on added nodes; childList observation ignores these |
| 33 | **conservative** | medium | recursive-fn | interactive | deepseek-v3.1_671b | i005 | 66 | `function renderComments(comments, container, level = 0) {` | recurses over a finite comment tree; terminates |
| 34 | **conservative** | medium | recursive-fn | interactive | deepseek-v3.1_671b | i005 | 105 | `function attachEventListeners() {` | event handler; not unbounded recursion |
| 35 | **conservative** | medium | recursive-fn | interactive | deepseek-v3.1_671b | i017 | 113 | `function showStep(stepNumber) {` | step recursion bounded by totalSteps |
| 36 | **conservative** | medium | recursive-fn | multifile | deepseek-v3.1_671b | m007 | 205 | `function addToTree(item, node, depth = 0) {` | base case: returns when depth >= id length |
| 37 | **conservative** | medium | recursive-fn | multifile | deepseek-v3.1_671b | m010 | 211 | `function processToastQueue() {` | guarded by queue length; drains |
| 38 | **conservative** | medium | recursive-fn | multifile | deepseek-v3.1_671b | m007 | 235 | `function countItems(node) {` | countItems over a finite tree |
| 39 | **conservative** | medium | recursive-fn | multifile | deepseek-v3.1_671b | m007 | 240 | `function renderFolder(node, onToggle) {` | renderFolder over a finite tree |
| 40 | **conservative** | medium | recursive-fn | multifile | deepseek-v3.1_671b | m007 | 306 | `function toggleNode(node) {` | toggleNode walks finite tree, returns on match |
| 41 | **conservative** | medium | recursive-fn | multifile | deepseek-v3.1_671b | m007 | 327 | `function setAllNodes(node, expanded) {` | setAllNodes walks finite tree |
| 42 | **conservative** | medium | recursive-fn | interactive | gemma3_27b | i005 | 48 | `function renderComment(comment, depth = 0) {` | renders finite reply tree; terminates |
| 43 | **conservative** | medium | recursive-fn | interactive | gemma3_27b | i010 | 57 | `function updateNotifications() {` | re-invoked on click; not unbounded |
| 44 | **conservative** | medium | recursive-fn | multifile | gemma3_27b | m010 | 227 | `function displayNextToast() {` | guarded by queue length; setTimeout-driven |
| 45 | **conservative** | medium | recursive-fn | multifile | gemma3_27b | m007 | 242 | `function renderNode(node, level = 0) {` | renderNode over finite tree |
| 46 | **conservative** | medium | recursive-fn | interactive | gpt-oss_120b | i015 | 30 | `function showNext() {` | base case: returns when queue empty |
| 47 | **conservative** | medium | recursive-fn | interactive | gpt-oss_120b | i005 | 55 | `function findComment(comments, id) {` | findComment returns on match/empty; terminates |
| 48 | **conservative** | medium | recursive-fn | interactive | gpt-oss_120b | i023 | 81 | `function createRow(data = {}) {` | createRow is user-triggered, not self-recursive in a loop |
| 49 | **conservative** | medium | recursive-fn | interactive | gpt-oss_120b | i010 | 86 | `function renderNotifications() {` | re-invoked on click; not unbounded |
| 50 | **conservative** | medium | recursive-fn | static | gpt-oss_120b | p017 | 135 | `function type() {` | typewriter re-schedules via setTimeout (async, no stack growth) |
| 51 | **conservative** | medium | recursive-fn | multifile | gpt-oss_120b | m010 | 207 | `function processQueue() {` | guarded by queue length; setTimeout-driven |
| 52 | **conservative** | medium | recursive-fn | multifile | gpt-oss_120b | m007 | 209 | `function buildTree(items) {` | divide-and-conquer with base cases + split guard |
| 53 | **conservative** | medium | recursive-fn | multifile | gpt-oss_120b | m007 | 251 | `function renderNode(node, path) {` | renderNode over finite tree |
| 54 | **conservative** | medium | recursive-fn | interactive | qwen3-coder_480b | i023 | 74 | `function addItem(description = '', quantity = 1, unitPrice = 0) {` | addItem is user-triggered; not unbounded |
| 55 | **conservative** | medium | recursive-fn | static | qwen3-coder_480b | p017 | 201 | `function typeEffect() {` | typewriter re-schedules via setTimeout (async) |
| 56 | **conservative** | medium | recursive-fn | multifile | qwen3-coder_480b | m010 | 205 | `function showNextToast() {` | guarded by queue length; setTimeout-driven |
| 57 | **conservative** | medium | recursive-fn | multifile | qwen3-coder_480b | m007 | 238 | `function renderNode(node, path = "", depth = 0) {` | renderNode over finite tree, recurses only when expanded |
| 58 | **conservative** | high | scroll-loop | interactive | gemma3_27b | i011 | 154 | `window.scrollTo({` | scrollTo is in the TOC click handler; the detector's listener window over-reached past the scroll handler (false positive) |

---

## Evidence per instance

### 1. [genuine-hang] event-dispatch-loop — qwen3-coder_480b / m009 (multifile)
**`ollama-cloud_qwen3-coder_480b/m009.html` line 263** — input handler dispatches its own 'input' event -> infinite synchronous recursion, freezes the tab

```js
inputEl.dispatchEvent(new CustomEvent("input", {
```
Context:
```js
tems, countEl, emptyEl); }); // Handle input inputEl.addEventListener("input", (e) => { currentFilter = e.target.value; filteredItems = filterItems(store.state.items, currentFilter); updateList(fil…
```

### 2. [genuine-hang] recursive-fn — gemma3_27b / m007 (multifile)
**`ollama-cloud_gemma3_27b/m007.html` line 202** — createFolderNode recurses on the same 10-id range with no size base case -> infinite recursion / stack overflow

```js
function createFolderNode(items, startId, endId, depth = 0) {
```
Context:
```js
n { ok: true, settings }; } /* feature.js (generated) */ function createFolderNode(items, startId, endId, depth = 0) { const folderItems = items.filter(item => item.id >= start
```

### 3. [leak] setinterval-leak — deepseek-v3.1_671b / i018 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i018.html` line 90** — presence poll never cleared

```js
setInterval(async () => {
```
Context:
```js
ment); } }); } setInterval(async () => { const presence = await getPresence
```

### 4. [leak] setinterval-leak — deepseek-v3.1_671b / i010 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i010.html` line 143** — notification poll never cleared

```js
setInterval(pollNotifications, pollInterval);
```
Context:
```js
ay = 'none'; } }); setInterval(pollNotifications, pollInterval); pollNotificati
```

### 5. [leak] setinterval-leak — deepseek-v3.1_671b / i002 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i002.html` line 148** — poll interval never cleared; pause only flags

```js
updateInterval = setInterval(updateMetrics, 1000);
```
Context:
```js
entListener('click', togglePause); updateInterval = setInterval(updateMetrics, 1000); updateMetrics(); // Initial lo
```

### 6. [leak] setinterval-leak — deepseek-v3.1_671b / p008 (static)
**`ollama-cloud_deepseek-v3.1_671b/p008.html` line 201** — carousel timer never cleared

```js
setInterval(() => {
```
Context:
```js
// Auto-advance carousel every 5 seconds setInterval(() => { currentIndex = (currentIndex < testi
```

### 7. [leak] setinterval-leak — deepseek-v3.1_671b / m010 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m010.html` line 252** — keep-alive interval never cleared -- leaks on unmount

```js
keepAliveInterval = setInterval(() => {
```
Context:
```js
4000); } function startKeepAlive() { keepAliveInterval = setInterval(() => { saveSettings(store.state.settings) .then((
```

### 8. [leak] setinterval-leak — deepseek-v3.1_671b / p013 (static)
**`ollama-cloud_deepseek-v3.1_671b/p013.html` line 336** — clock interval never cleared

```js
setInterval(updateTime, 60000);
```
Context:
```js
w.toLocaleString(); } updateTime(); setInterval(updateTime, 60000);
```

### 9. [leak] setinterval-leak — gemma3_27b / i018 (interactive)
**`ollama-cloud_gemma3_27b/i018.html` line 76** — presence poll never cleared

```js
setInterval(updatePresence, 2000);
```
Context:
```js
pdatePresence(); // Update every 2 seconds setInterval(updatePresence, 2000); // Keyframes for fadeIn anim
```

### 10. [leak] setinterval-leak — gemma3_27b / i010 (interactive)
**`ollama-cloud_gemma3_27b/i010.html` line 88** — notification poll never cleared

```js
setInterval(fetchNotifications, 5000);
```
Context:
```js
poll every 5 seconds fetchNotifications(); setInterval(fetchNotifications, 5000);
```

### 11. [leak] setinterval-leak — gemma3_27b / i012 (interactive)
**`ollama-cloud_gemma3_27b/i012.html` line 88** — countdown interval never cleared

```js
setInterval(updateCountdown, 1000);
```
Context:
```js
} } updateCountdown(); setInterval(updateCountdown, 1000);
```

### 12. [leak] setinterval-leak — gemma3_27b / i002 (interactive)
**`ollama-cloud_gemma3_27b/i002.html` line 134** — metrics poll never cleared

```js
setInterval(updateMetrics, 1000);
```
Context:
```js
date and then every second updateMetrics(); setInterval(updateMetrics, 1000);
```

### 13. [leak] setinterval-leak — gemma3_27b / m010 (multifile)
**`ollama-cloud_gemma3_27b/m010.html` line 216** — keep-alive interval never cleared -- leaks on unmount

```js
keepAliveInterval = setInterval(keepSessionAlive, 30000);
```
Context:
```js
may be logged out."); }); } keepAliveInterval = setInterval(keepSessionAlive, 30000); // Toast System const toastQu
```

### 14. [leak] setinterval-leak — gpt-oss_120b / i018 (interactive)
**`ollama-cloud_gpt-oss_120b/i018.html` line 100** — presence poll never cleared

```js
setInterval(updatePresence, 2000);
```
Context:
```js
load updatePresence(); // Poll every 2 seconds setInterval(updatePresence, 2000);
```

### 15. [leak] setinterval-leak — gpt-oss_120b / p008 (static)
**`ollama-cloud_gpt-oss_120b/p008.html` line 198** — carousel timer never cleared

```js
setInterval(() => {
```
Context:
```js
lide(index); }); // Auto slide every 5 seconds setInterval(() => { index = (index + 1) % total; showSlide(i
```

### 16. [leak] setinterval-leak — qwen3-coder_480b / i018 (interactive)
**`ollama-cloud_qwen3-coder_480b/i018.html` line 165** — presence poll never cleared

```js
setInterval(updatePresence, 2000);
```
Context:
```js
// Update every 2 seconds setInterval(updatePresence, 2000); });
```

### 17. [leak] setinterval-leak — qwen3-coder_480b / i012 (interactive)
**`ollama-cloud_qwen3-coder_480b/i012.html` line 171** — countdown interval never cleared

```js
setInterval(() => {
```
Context:
```js
ceBadges(); // Update every second setInterval(() => { updateCountdown(); const now
```

### 18. [leak] setinterval-leak — qwen3-coder_480b / i010 (interactive)
**`ollama-cloud_qwen3-coder_480b/i010.html` line 186** — notification poll never cleared

```js
setInterval(pollNotifications, 5000);
```
Context:
```js
cations(); // Poll every 5 seconds setInterval(pollNotifications, 5000);
```

### 19. [leak] setinterval-leak — qwen3-coder_480b / i002 (interactive)
**`ollama-cloud_qwen3-coder_480b/i002.html` line 214** — metrics poll never cleared; pause only flags

```js
updateInterval = setInterval(updateMetrics, 1000);
```
Context:
```js
{ updateMetrics(); updateInterval = setInterval(updateMetrics, 1000); } // Start the dashbo
```

### 20. [leak] setinterval-leak — qwen3-coder_480b / m010 (multifile)
**`ollama-cloud_qwen3-coder_480b/m010.html` line 243** — keep-alive interval never cleared -- leaks on unmount

```js
setInterval(() => {
```
Context:
```js
n mountFeature(asideEl, mainEl) { // Session keep-alive setInterval(() => { saveSettings(store.state.settings) .then((
```

### 21. [leak] setinterval-leak — qwen3-coder_480b / i009 (interactive)
**`ollama-cloud_qwen3-coder_480b/i009.html` line 321** — order-total timer never cleared

```js
setInterval(() => {
```
Context:
```js
}); // Simulate order total update setInterval(() => { const randomTotal = (Math.random() *
```

### 22. [borderline] mutation-observer-feedback — deepseek-v3.1_671b / m009 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m009.html` line 262** — observer on .list calls filterItems(); a genuine loop iff filterItems rebuilds list nodes

```js
const listObserver = new MutationObserver(() => {
```
Context:
```js
il: { term: searchTerm } })); }); const listObserver = new MutationObserver(() => { const searchTerm = searchInput.value; filter
```

### 23. [borderline] mutation-observer-feedback — gemma3_27b / m009 (multifile)
**`ollama-cloud_gemma3_27b/m009.html` line 204** — observeDensity callback target not fully visible; likely updates aside count (safe)

```js
const observer = new MutationObserver((mutations) => {
```
Context:
```js
ity. function observeDensity(callback) { const observer = new MutationObserver((mutations) => { callback(); }); observer.observe(do
```

### 24. [conservative] mutation-observer-feedback — deepseek-v3.1_671b / i008 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i008.html` line 43** — observes childList only; callback writes position attributes -- attribute writes do not re-fire the observer

```js
const observer = new MutationObserver(function(mutations) {
```
Context:
```js
for changes in the list order const observer = new MutationObserver(function(mutations) { mutations.forEach(func
```

### 25. [conservative] mutation-observer-feedback — deepseek-v3.1_671b / i021 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i021.html` line 124** — callback mutates the cloned sticky header, not the observed table

```js
const observer = new MutationObserver(function(mutations) {
```
Context:
```js
(for when new rows are added) const observer = new MutationObserver(function(mutations) { mutations.forEach(func
```

### 26. [conservative] mutation-observer-feedback — deepseek-v3.1_671b / m003 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m003.html` line 202** — sets data-theme/class on added nodes; childList observation ignores attribute changes

```js
const observer = new MutationObserver((mutations) => {
```
Context:
```js
function mountFeature(asideEl, mainEl) { const observer = new MutationObserver((mutations) => { mutations.forEach((mutation) => {
```

### 27. [conservative] mutation-observer-feedback — deepseek-v3.1_671b / m009 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m009.html` line 203** — callback only dispatches an event; flag is from the detector's 2KB window bleeding into the next function

```js
const observer = new MutationObserver((mutations) => {
```
Context:
```js
d) */ function mountDensityObserver() { const observer = new MutationObserver((mutations) => { mutations.forEach((mutation) => {
```

### 28. [conservative] mutation-observer-feedback — gemma3_27b / i008 (interactive)
**`ollama-cloud_gemma3_27b/i008.html` line 45** — sets data-position attributes under childList-only observation -- no re-fire

```js
const observer = new MutationObserver(mutations => {
```
Context:
```js
to keep data-position in sync const observer = new MutationObserver(mutations => { mutations.forEach(mutation =>
```

### 29. [conservative] mutation-observer-feedback — gemma3_27b / m003 (multifile)
**`ollama-cloud_gemma3_27b/m003.html` line 202** — applyCurrentTheme sets attributes on added nodes; no childList re-trigger

```js
const observer = new MutationObserver((mutations) => {
```
Context:
```js
function mountFeature(asideEl, mainEl) { const observer = new MutationObserver((mutations) => { mutations.forEach((mutation) => {
```

### 30. [conservative] mutation-observer-feedback — gpt-oss_120b / i008 (interactive)
**`ollama-cloud_gpt-oss_120b/i008.html` line 87** — writes dataset.position + localStorage under childList-only observation

```js
const observer = new MutationObserver(() => {
```
Context:
```js
server to sync positions and persist const observer = new MutationObserver(() => { const items = Array.from(list.children);
```

### 31. [conservative] mutation-observer-feedback — gpt-oss_120b / i003 (interactive)
**`ollama-cloud_gpt-oss_120b/i003.html` line 97** — themeElement sets classes/CSS vars on added nodes; attribute writes do not re-fire

```js
const observer = new MutationObserver(mutations => {
```
Context:
```js
ationObserver to watch for new nodes const observer = new MutationObserver(mutations => { for (const mutation of mutations) {
```

### 32. [conservative] mutation-observer-feedback — qwen3-coder_480b / m003 (multifile)
**`ollama-cloud_qwen3-coder_480b/m003.html` line 202** — sets class + inline style on added nodes; childList observation ignores these

```js
const observer = new MutationObserver((mutations) => {
```
Context:
```js
function mountFeature(asideEl, mainEl) { const observer = new MutationObserver((mutations) => { for (const mutation of mutations) {
```

### 33. [conservative] recursive-fn — deepseek-v3.1_671b / i005 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i005.html` line 66** — recurses over a finite comment tree; terminates

```js
function renderComments(comments, container, level = 0) {
```
Context:
```js
replies: [] } ]; function renderComments(comments, container, level = 0) { comments.forEach(comment => { c
```

### 34. [conservative] recursive-fn — deepseek-v3.1_671b / i005 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i005.html` line 105** — event handler; not unbounded recursion

```js
function attachEventListeners() {
```
Context:
```js
+ 1); } }); } function attachEventListeners() { document.addEventListener('click', function(e)
```

### 35. [conservative] recursive-fn — deepseek-v3.1_671b / i017 (interactive)
**`ollama-cloud_deepseek-v3.1_671b/i017.html` line 113** — step recursion bounded by totalSteps

```js
function showStep(stepNumber) {
```
Context:
```js
ar.style.width = `${progress}%`; } function showStep(stepNumber) { steps.forEach(step => {
```

### 36. [conservative] recursive-fn — deepseek-v3.1_671b / m007 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m007.html` line 205** — base case: returns when depth >= id length

```js
function addToTree(item, node, depth = 0) {
```
Context:
```js
", label: "All Items", children: [], expanded: true }; function addToTree(item, node, depth = 0) { const idStr = item.id.toString(); const currentDigi
```

### 37. [conservative] recursive-fn — deepseek-v3.1_671b / m010 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m010.html` line 211** — guarded by queue length; drains

```js
function processToastQueue() {
```
Context:
```js
st(msg) { toastQueue.push(msg); processToastQueue(); } function processToastQueue() { if (isToastVisible || toastQueue.length === 0) return;
```

### 38. [conservative] recursive-fn — deepseek-v3.1_671b / m007 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m007.html` line 235** — countItems over a finite tree

```js
function countItems(node) {
```
Context:
```js
s.forEach(item => addToTree(item, root)); return root; } function countItems(node) { if (node.type === "item") return 1; return node.childre
```

### 39. [conservative] recursive-fn — deepseek-v3.1_671b / m007 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m007.html` line 240** — renderFolder over a finite tree

```js
function renderFolder(node, onToggle) {
```
Context:
```js
.reduce((total, child) => total + countItems(child), 0); } function renderFolder(node, onToggle) { const isFolder = node.type === "folder"; const count =
```

### 40. [conservative] recursive-fn — deepseek-v3.1_671b / m007 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m007.html` line 306** — toggleNode walks finite tree, returns on match

```js
function toggleNode(node) {
```
Context:
```js
}); }); } function toggleFolder(folderId) { function toggleNode(node) { if (node.id === folderId && node.type === "folder") {
```

### 41. [conservative] recursive-fn — deepseek-v3.1_671b / m007 (multifile)
**`ollama-cloud_deepseek-v3.1_671b/m007.html` line 327** — setAllNodes walks finite tree

```js
function setAllNodes(node, expanded) {
```
Context:
```js
d = tree.children.every(child => !child.expanded); function setAllNodes(node, expanded) { if (node.type === "folder") { node.expanded =
```

### 42. [conservative] recursive-fn — gemma3_27b / i005 (interactive)
**`ollama-cloud_gemma3_27b/i005.html` line 48** — renders finite reply tree; terminates

```js
function renderComment(comment, depth = 0) {
```
Context:
```js
replies: [] } ]; function renderComment(comment, depth = 0) { const indent = ' '.repeat(depth);
```

### 43. [conservative] recursive-fn — gemma3_27b / i010 (interactive)
**`ollama-cloud_gemma3_27b/i010.html` line 57** — re-invoked on click; not unbounded

```js
function updateNotifications() {
```
Context:
```js
]; updateNotifications(); } function updateNotifications() { unreadCount = notifications.filter(n => !n.read
```

### 44. [conservative] recursive-fn — gemma3_27b / m010 (multifile)
**`ollama-cloud_gemma3_27b/m010.html` line 227** — guarded by queue length; setTimeout-driven

```js
function displayNextToast() {
```
Context:
```js
{ toastQueue.push(msg); displayNextToast(); } function displayNextToast() { if (currentToast || toastQueue.length === 0) return;
```

### 45. [conservative] recursive-fn — gemma3_27b / m007 (multifile)
**`ollama-cloud_gemma3_27b/m007.html` line 242** — renderNode over finite tree

```js
function renderNode(node, level = 0) {
```
Context:
```js
ateElement('ul'); ul.classList.add('folder-tree'); function renderNode(node, level = 0) { const li = document.createElement('li'); li.cla
```

### 46. [conservative] recursive-fn — gpt-oss_120b / i015 (interactive)
**`ollama-cloud_gpt-oss_120b/i015.html` line 30** — base case: returns when queue empty

```js
function showNext() {
```
Context:
```js
nt}`); if (!isShowing) showNext(); }); function showNext() { if (queue.length === 0) { isShowing = fal
```

### 47. [conservative] recursive-fn — gpt-oss_120b / i005 (interactive)
**`ollama-cloud_gpt-oss_120b/i005.html` line 55** — findComment returns on match/empty; terminates

```js
function findComment(comments, id) {
```
Context:
```js
// for new comments // Utility: find comment by id function findComment(comments, id) { for (const c of comments) { if (c.id === id)
```

### 48. [conservative] recursive-fn — gpt-oss_120b / i023 (interactive)
**`ollama-cloud_gpt-oss_120b/i023.html` line 81** — createRow is user-triggered, not self-recursive in a loop

```js
function createRow(data = {}) {
```
Context:
```js
= fmt(total); } // Create a new line item row function createRow(data = {}) { const tbody = document.getElementById('line-items');
```

### 49. [conservative] recursive-fn — gpt-oss_120b / i010 (interactive)
**`ollama-cloud_gpt-oss_120b/i010.html` line 86** — re-invoked on click; not unbounded

```js
function renderNotifications() {
```
Context:
```js
unreadBadge.classList.add('hidden'); } } function renderNotifications() { notificationList.innerHTML = ''; if (notificati
```

### 50. [conservative] recursive-fn — gpt-oss_120b / p017 (static)
**`ollama-cloud_gpt-oss_120b/p017.html` line 135** — typewriter re-schedules via setTimeout (async, no stack growth)

```js
function type() {
```
Context:
```js
terminal = document.getElementById('terminal-output'); function type() { if (idx >= commands.length) { // Loop after a
```

### 51. [conservative] recursive-fn — gpt-oss_120b / m010 (multifile)
**`ollama-cloud_gpt-oss_120b/m010.html` line 207** — guarded by queue length; setTimeout-driven

```js
function processQueue() {
```
Context:
```js
tContainer = null; // Process the next toast in the queue. function processQueue() { if (isShowing || toastQueue.length === 0) return; isSho
```

### 52. [conservative] recursive-fn — gpt-oss_120b / m007 (multifile)
**`ollama-cloud_gpt-oss_120b/m007.html` line 209** — divide-and-conquer with base cases + split guard

```js
function buildTree(items) {
```
Context:
```js
// Build a hierarchical tree from a flat list of items. function buildTree(items) { if (items.length === 0) { return { type: "leaf",
```

### 53. [conservative] recursive-fn — gpt-oss_120b / m007 (multifile)
**`ollama-cloud_gpt-oss_120b/m007.html` line 251** — renderNode over finite tree

```js
function renderNode(node, path) {
```
Context:
```js
ree(right)], }; } // Render a tree node to HTML. function renderNode(node, path) { if (node.type === "leaf") { if (node.items.length
```

### 54. [conservative] recursive-fn — qwen3-coder_480b / i023 (interactive)
**`ollama-cloud_qwen3-coder_480b/i023.html` line 74** — addItem is user-triggered; not unbounded

```js
function addItem(description = '', quantity = 1, unitPrice = 0) {
```
Context:
```js
nitial item addItem(); function addItem(description = '', quantity = 1, unitPrice = 0) { itemId++; const itemElement
```

### 55. [conservative] recursive-fn — qwen3-coder_480b / p017 (static)
**`ollama-cloud_qwen3-coder_480b/p017.html` line 201** — typewriter re-schedules via setTimeout (async)

```js
function typeEffect() {
```
Context:
```js
= false; let currentCommand = ''; function typeEffect() { const currentFullCommand = commands[commandInde
```

### 56. [conservative] recursive-fn — qwen3-coder_480b / m010 (multifile)
**`ollama-cloud_qwen3-coder_480b/m010.html` line 205** — guarded by queue length; setTimeout-driven

```js
function showNextToast() {
```
Context:
```js
ated) */ let toastQueue = []; let isShowingToast = false; function showNextToast() { if (isShowingToast || toastQueue.length === 0) return;
```

### 57. [conservative] recursive-fn — qwen3-coder_480b / m007 (multifile)
**`ollama-cloud_qwen3-coder_480b/m007.html` line 238** — renderNode over finite tree, recurses only when expanded

```js
function renderNode(node, path = "", depth = 0) {
```
Context:
```js
entNode.count++; } } return root; } function renderNode(node, path = "", depth = 0) { const isExpanded = expandedFolders.has(path); const
```

### 58. [conservative] scroll-loop — gemma3_27b / i011 (interactive)
**`ollama-cloud_gemma3_27b/i011.html` line 154** — scrollTo is in the TOC click handler; the detector's listener window over-reached past the scroll handler (false positive)

```js
window.scrollTo({
```
Context:
```js
}); } } window.addEventListener('scroll', highlightTOC); tocLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); const targetId = this.href.split('#')[1]; const …
```

