// Unsafe: a tree walker that recurses without a depth guard or base case.
function walk(node) {
  console.log(node.tagName);
  for (const child of node.children) {
    walk(child);
  }
  walk(node);
}
