// Private manual snapshot presentation. The canonical summary owns all qualification.
import { summarizeEngineeringActivity } from './engineering-summary.mjs'
import { pathToFileURL } from 'node:url'

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  )
const known = (value) => (value === null ? 'unknown' : escape(value))
const link = (url, text = url) =>
  url === null ? 'unknown' : `<a href="${escape(url)}" rel="noreferrer">${escape(text)}</a>`
const item = (label, value) => `<dt>${escape(label)}</dt><dd>${value}</dd>`
const records = (rows, rejected = false) =>
  (rows ?? [])
    .map(
      (row) =>
        `<li>${rejected ? '<strong>Rejected supplied observation</strong> · ' : ''}${link(row.sourceRef, row.id)} · ${escape(row.kind)} · ${escape(row.state)}<br><small>Observed/event time: ${escape(row.at)} · Revision: ${escape(row.revision)}</small></li>`
    )
    .join('')

export function renderEngineeringSummaryHtml(input) {
  const summary = summarizeEngineeringActivity(input)
  const panels = Object.entries(summary.sources)
    .map(([name, source]) => {
      const coverage = source.coverage
      return `<section aria-labelledby="source-${name}"><header><h2 id="source-${name}">${escape(name)}</h2><span class="badge">${escape(source.status)}</span></header>
<p class="authority">Authority: ${escape(source.authority)}</p><dl>
${item('Qualified count', known(source.count))}${item('Observed count (not a total)', known(source.observedCount))}
${item('Observed at', known(source.checkedAt))}${item('Freshness threshold at evaluation', `${summary.policy.maxAgeSeconds[name]} seconds`)}
${item('Coverage', coverage ? escape(`Complete: ${coverage.complete}; pagination: ${coverage.paginationComplete}; workstreams: ${coverage.workstreams.join(', ') || 'none qualified'}`) : 'unavailable')}
${item('Coverage window', coverage ? escape(`${coverage.window.start} to ${coverage.window.end}`) : 'unknown')}
${item('Reasons', escape(source.reasons.join(', ') || 'none'))}${item('Current error', source.currentError ? escape(source.currentError.code) : 'none reported')}
${item('Source', link(source.sourceRef))}${item('Revision', known(source.revision))}
${item('Last successful refresh', source.lastSuccess ? `${escape(source.lastSuccess.checkedAt)} · ${link(source.lastSuccess.sourceRef)} · ${escape(source.lastSuccess.revision)}` : 'unknown')}
</dl>${source.observations?.length || source.rejectedObservations?.length ? `<ul>${records(source.observations)}${records(source.rejectedObservations, true)}</ul>` : '<p>No displayed observations. This is not a zero-activity claim.</p>'}
${source.approvedWork ? `<p>Canonical runnable IDs (supplied priority order): ${escape(source.approvedWork.runnableIds.join(', ') || '(none)')}</p>` : ''}</section>`
    })
    .join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer"><title>Engineering activity · Manual snapshot</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;color:#e7edf3;background:#101317}*{box-sizing:border-box}body{margin:0;padding:clamp(16px,4vw,48px)}main{max-width:1280px;margin:auto}h1{font-size:clamp(26px,4vw,42px);margin:10px 0}h2{font-size:22px;margin:0;text-transform:capitalize}.eyebrow{font-weight:700;letter-spacing:.12em;color:#a9bac9}.notice{border-left:5px solid #bd721a;background:#302719;padding:18px;line-height:1.6}.meta{line-height:1.8;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:18px;margin-top:24px}section{background:#191e25;border:1px solid #3d4652;border-radius:12px;padding:22px;min-width:0}header{display:flex;justify-content:space-between;align-items:center;gap:12px}.badge{background:#293b4b;color:#b9e3ff;padding:5px 10px;border-radius:20px;font-weight:700}.authority,small{color:#aebccc}dl{margin:20px 0}dt{font-size:12px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;color:#aebccc;margin-top:14px}dd{margin:4px 0;overflow-wrap:anywhere;line-height:1.5}a{color:#8ed7ff;text-decoration:underline;overflow-wrap:anywhere}ul{padding-left:20px}li{margin:12px 0;overflow-wrap:anywhere;line-height:1.5}footer{margin-top:24px;color:#aebccc}@media print{body{padding:0}.grid{display:block}section{break-inside:avoid;margin:16px 0}}
</style></head><body><main>
<p class="eyebrow">CP // OPS · OPERATIONS CONSOLE</p><h1>Manual snapshot, not live monitoring</h1>
<div class="notice"><strong>Private informational view · ${escape(summary.status)}</strong><br>Linear and GitHub remain authoritative. No live refresh, project-wide completeness, work selection or execution is implied. Health is evaluated only at the timestamp below, not when this file is opened. Obtain a new snapshot before acting.</div>
<p class="meta">Repository: <strong>${escape(summary.repository)}</strong><br>Workstream: <strong>${escape(summary.workstream)}</strong><br>Reporting window: ${escape(summary.window.start)} ≤ mergedAt &lt; ${escape(summary.window.end)}<br>Evaluated at: <strong>${escape(summary.evaluatedAt)}</strong></p>
<div class="grid">${panels}</div><footer>Keep this minimized report private. Unknown is not zero. No credentials or raw provider bodies belong in this file.</footer>
</main></body></html>\n`
}

async function main() {
  const chunks = []
  let size = 0
  for await (const chunk of process.stdin) {
    size += chunk.length
    if (size > 5_000_000) throw new Error('input bound')
    chunks.push(chunk)
  }
  process.stdout.write(
    renderEngineeringSummaryHtml(JSON.parse(Buffer.concat(chunks).toString('utf8')))
  )
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write('Snapshot view failed: invalid or oversized input.\n')
    process.exitCode = 1
  })
}
