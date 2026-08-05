from pathlib import Path

path = Path('src/features/operations/DepartmentWorkshopMirrorPage.tsx')
text = path.read_text()
old_import = "import { getDepartmentWorkshopMirrorView } from './departmentWorkshopMirrorView'\n"
new_import = old_import + "import { DepartmentWorkshopExplanationPanel } from './DepartmentWorkshopExplanationPanel'\n"
if old_import not in text:
    raise SystemExit('import anchor missing')
text = text.replace(old_import, new_import, 1)
anchor = '''      <article
        className="panel panel-support space-y-4"
        role="region"
        aria-label="Completion quality and safety ledger"
      >'''
insertion = '''      <DepartmentWorkshopExplanationPanel explanations={view.explanations} />

''' + anchor
if anchor not in text:
    raise SystemExit('panel anchor missing')
text = text.replace(anchor, insertion, 1)
path.write_text(text)
