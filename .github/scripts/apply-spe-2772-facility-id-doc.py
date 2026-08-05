from pathlib import Path

path = Path('docs/department-workshop-queue-audit.md')
text = path.read_text()
old = 'canonical `research_lab` facility'
new = 'authored `facility:biohazard-response-lab` facility'
if text.count(old) != 1:
    raise SystemExit(f'Expected one stale facility id, found {text.count(old)}')
path.write_text(text.replace(old, new))
