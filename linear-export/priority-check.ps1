node export-one-issue.js SPE-887 > /dev/null 2>&1
node export-one-issue.js SPE-888 > /dev/null 2>&1
node export-one-issue.js SPE-890 > /dev/null 2>&1
node export-one-issue.js SPE-898 > /dev/null 2>&1
node export-one-issue.js SPE-912 > /dev/null 2>&1
node export-one-issue.js SPE-913 > /dev/null 2>&1
node export-one-issue.js SPE-919 > /dev/null 2>&1
node export-one-issue.js SPE-933 > /dev/null 2>&1
node export-one-issue.js SPE-932 > /dev/null 2>&1
node export-one-issue.js SPE-400 > /dev/null 2>&1

# Now build the priority plan
@"
- ISSUE: SPE-887
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-888
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-890
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-898
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-912
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-913
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-919
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-933
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-932
  ACTION: priority
  VALUE: medium

- ISSUE: SPE-400
  ACTION: priority
  VALUE: medium
""@  | Out-File -Encoding utf8 prior-priority-compression.md

node plan-and-apply.js prior-priority-compression.md --dry-run
