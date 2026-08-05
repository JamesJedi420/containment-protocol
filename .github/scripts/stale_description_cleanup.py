from pathlib import Path
import re

ROOTS = [Path("planning"), Path("docs")]

sentence_replacements = {
    "SPE-2772 remains Backlog and mapping-seam blocked.": (
        "SPE-2772 shipped the bounded live-facility safety integration through PR #3462; "
        "broader staff, equipment, clearance, and authorization projection remains separate."
    ),
    "SPE-2772 remains Backlog and blocked on its explicit live safety mapping seam.": (
        "SPE-2772 shipped the bounded live-facility safety integration through PR #3462; "
        "broader staff, equipment, clearance, and authorization projection remains separate."
    ),
    "SPE-2772 remains blocked on its live safety mapping seam.": (
        "SPE-2772 shipped the bounded live-facility safety integration through PR #3462; "
        "broader staff, equipment, clearance, and authorization projection remains separate."
    ),
    "#3419 remains Backlog and mapping-seam blocked.": (
        "#3419 shipped the bounded live-facility safety integration through PR #3462; "
        "broader operational projection remains separately owned."
    ),
    "JamesJedi420/containment-protocol#3419 remains Backlog and mapping-seam blocked.": (
        "JamesJedi420/containment-protocol#3419 shipped the bounded live-facility safety integration through PR #3462; "
        "broader operational projection remains separately owned."
    ),
    "JamesJedi420/containment-protocol#3419 remains blocked on its live safety mapping seam.": (
        "JamesJedi420/containment-protocol#3419 shipped the bounded live-facility safety integration through PR #3462; "
        "broader operational projection remains separately owned."
    ),
    "Explicit mapping seam remains blocked": (
        "Shipped through SPE-2772 / PR #3462; broader operational projection remains separate"
    ),
    "Mapping seam remains blocked": (
        "Shipped through SPE-2772 / PR #3462; broader operational projection remains separate"
    ),
}

parent_patterns = [
    re.compile(r"Parent SPE-1028 remains \*\*In Progress\*\*\.?"),
    re.compile(r"Parent SPE-1028 remains In Progress\.?"),
    re.compile(
        r"Parent (\[SPE-1028\]\(https://linear\.app/spectranoir/issue/SPE-1028(?:/[^)]*)?\)) "
        r"remains \*\*In Progress\*\*\.?"
    ),
]

changed = []
for root in ROOTS:
    if not root.exists():
        continue
    for path in root.rglob("*.md"):
        original = path.read_text(encoding="utf-8")
        updated = original
        for old, new in sentence_replacements.items():
            updated = updated.replace(old, new)
        updated = parent_patterns[0].sub("Parent SPE-1028 remains open for broader scope.", updated)
        updated = parent_patterns[1].sub("Parent SPE-1028 remains open for broader scope.", updated)
        updated = parent_patterns[2].sub(r"Parent \1 remains open for broader scope.", updated)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed.append(str(path))

print(f"updated {len(changed)} files")
for path in changed:
    print(path)
