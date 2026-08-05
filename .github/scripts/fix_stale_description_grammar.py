from pathlib import Path

replacements = {
    "Parent SPE-1028 remains open for broader scope. because": "Parent SPE-1028 remains open because",
    "Parent SPE-1028 remains open for broader scope.:": "Parent SPE-1028 remains open because",
    "Parent SPE-1028 remains open for broader scope. while": "Parent SPE-1028 remains open while",
    "Parent SPE-1028 remains open for broader scope. as": "Parent SPE-1028 remains open as",
}

changed = []
for path in Path("planning").rglob("*.md"):
    original = path.read_text(encoding="utf-8")
    updated = original
    for old, new in replacements.items():
        updated = updated.replace(old, new)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(str(path))

print(f"updated {len(changed)} files")
for path in changed:
    print(path)
