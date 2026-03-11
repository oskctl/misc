#!/usr/bin/env python3
"""Trie (prefix tree) with insert, search, prefix matching, and autocomplete."""

class TrieNode:
    __slots__ = ("children", "is_end", "count")

    def __init__(self):
        self.children = {}
        self.is_end = False
        self.count = 0  # number of words through this node

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
            node.count += 1
        node.is_end = True

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def count_prefix(self, prefix):
        node = self._find(prefix)
        return node.count if node else 0

    def autocomplete(self, prefix, limit=10):
        """Return up to `limit` words starting with prefix."""
        node = self._find(prefix)
        if node is None:
            return []
        results = []
        self._collect(node, list(prefix), results, limit)
        return results

    def delete(self, word):
        """Delete a word. Returns True if it existed."""
        def _delete(node, word, depth):
            if depth == len(word):
                if not node.is_end:
                    return False
                node.is_end = False
                return len(node.children) == 0
            ch = word[depth]
            if ch not in node.children:
                return False
            child = node.children[ch]
            should_delete = _delete(child, word, depth + 1)
            if should_delete:
                del node.children[ch]
                child.count -= 1
                return not node.is_end and len(node.children) == 0
            child.count -= 1
            return False

        return _delete(self.root, word, 0) or not self.search(word)

    def _find(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def _collect(self, node, path, results, limit):
        if len(results) >= limit:
            return
        if node.is_end:
            results.append("".join(path))
        for ch in sorted(node.children):
            path.append(ch)
            self._collect(node.children[ch], path, results, limit)
            path.pop()
            if len(results) >= limit:
                return


def main():
    """Interactive demo."""
    t = Trie()
    words = ["apple", "app", "application", "apply", "ape", "banana", "band", "ban"]
    for w in words:
        t.insert(w)

    print(f"Inserted: {', '.join(words)}\n")
    print(f"  search('app'):       {t.search('app')}")
    print(f"  search('apex'):      {t.search('apex')}")
    print(f"  starts_with('app'):  {t.starts_with('app')}")
    print(f"  count_prefix('app'): {t.count_prefix('app')}")
    print(f"  autocomplete('app'): {t.autocomplete('app')}")
    print(f"  autocomplete('ba'):  {t.autocomplete('ba')}")

    print(f"\n  delete('app'):       {t.delete('app')}")
    print(f"  search('app'):       {t.search('app')}")
    print(f"  search('apple'):     {t.search('apple')}")

if __name__ == "__main__":
    main()
