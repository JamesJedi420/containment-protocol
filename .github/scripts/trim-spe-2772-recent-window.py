import json
from pathlib import Path

path = Path('planning/backlog-handoff-manifest.json')
manifest = json.loads(path.read_text())
recent = manifest.get('recentlyShipped', [])
if recent[:1] != ['SPE-2772']:
    raise SystemExit(f'Expected SPE-2772 first, got {recent[:1]}')
if len(recent) != 13 or recent[-1] != 'SPE-2776':
    raise SystemExit(f'Expected 13-entry window ending SPE-2776, got {recent}')
manifest['recentlyShipped'] = recent[:12]
path.write_text(json.dumps(manifest, indent=2) + '\n')
