param(
    [string]$RepoPath = (Get-Location).Path,
    [switch]$NoDesktopLauncher,
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$ProfileName = "Containment Protocol"
$ExpectedRepoPattern = '(?i)github\.com[:/]JamesJedi420/containment-protocol(?:\.git)?$'

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

Write-Step "Validating prerequisites"

$codeCommand = Get-Command code -ErrorAction SilentlyContinue
if (-not $codeCommand) {
    throw "VS Code CLI 'code' was not found on PATH. In VS Code, install/enable the 'code' shell command, then rerun this script."
}
$codeCli = $codeCommand.Source

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCommand) {
    throw "Git was not found on PATH."
}

$resolvedRepo = (Resolve-Path -LiteralPath $RepoPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $resolvedRepo ".git"))) {
    throw "RepoPath is not a Git working tree root: $resolvedRepo"
}

Push-Location $resolvedRepo
try {
    $origin = (& git remote get-url origin 2>$null)
    if (-not $origin) {
        throw "The repository has no 'origin' remote."
    }
    $origin = $origin.Trim()
    if ($origin -notmatch $ExpectedRepoPattern) {
        throw "Expected origin JamesJedi420/containment-protocol, found: $origin"
    }
} finally {
    Pop-Location
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Warning "Node.js is not on PATH. Containment Protocol requires Node.js 22."
} else {
    $nodeVersion = (& node --version).Trim()
    if ($nodeVersion -notmatch '^v22\.') {
        Write-Warning "Containment Protocol expects Node.js 22; current version is $nodeVersion."
    } else {
        Write-Host "Node.js $nodeVersion detected."
    }
}

Write-Step "Creating local Containment Protocol workspace"

$localRoot = Join-Path $env:LOCALAPPDATA "ContainmentProtocol\VSCode"
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
$workspacePath = Join-Path $localRoot "Containment Protocol.code-workspace"

$extensions = @(
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer",
    "eamodio.gitlens",
    "GitHub.vscode-pull-request-github",
    "GitHub.copilot-chat",
    "EditorConfig.EditorConfig"
)

$settings = [ordered]@{
    "editor.defaultFormatter" = "esbenp.prettier-vscode"
    "editor.formatOnSave" = $true
    "editor.quickSuggestions" = [ordered]@{
        "other" = "on"
        "comments" = "off"
        "strings" = "on"
    }
    "[javascript]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "[javascriptreact]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "[typescript]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "[typescriptreact]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "[json]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "[jsonc]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "[markdown]" = [ordered]@{"editor.defaultFormatter" = "esbenp.prettier-vscode"}
    "eslint.validate" = @("javascript", "javascriptreact", "typescript", "typescriptreact")
    "typescript.enablePromptUseWorkspaceTsdk" = $true
    "npm.packageManager" = "npm"
    "git.autofetch" = $true
    "git.pruneOnFetch" = $true
    "git.confirmSync" = $true
    "git.enableSmartCommit" = $false
    "git.confirmForcePush" = $true
    "githubPullRequests.remotes" = @("origin")
    "chat.useAgentsMdFile" = $true
    "search.exclude" = [ordered]@{
        "**/node_modules" = $true
        "**/coverage" = $true
        "**/dist" = $true
    }
    "files.watcherExclude" = [ordered]@{
        "**/node_modules/**" = $true
        "**/coverage/**" = $true
        "**/dist/**" = $true
    }
}

$tasks = @(
    [ordered]@{
        "label" = "CP: Dev server"
        "type" = "npm"
        "script" = "dev"
        "problemMatcher" = @()
        "presentation" = [ordered]@{"reveal" = "always"; "panel" = "dedicated"}
    },
    [ordered]@{
        "label" = "CP: Lint"
        "type" = "npm"
        "script" = "lint"
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Tests"
        "type" = "npm"
        "script" = "test:run"
        "problemMatcher" = @()
        "group" = [ordered]@{"kind" = "test"; "isDefault" = $true}
    },
    [ordered]@{
        "label" = "CP: Format check"
        "type" = "npm"
        "script" = "format:check"
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Verify backlog handoff"
        "type" = "npm"
        "script" = "verify:backlog-handoff"
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Verify audit index"
        "type" = "npm"
        "script" = "verify:audits-index"
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Verify theme contracts"
        "type" = "npm"
        "script" = "verify:theme-contracts"
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Build (type-contract gate)"
        "type" = "npm"
        "script" = "build"
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Validate implementation"
        "dependsOrder" = "sequence"
        "dependsOn" = @("CP: Lint", "CP: Format check", "CP: Tests")
        "problemMatcher" = @()
    },
    [ordered]@{
        "label" = "CP: Validate planning/docs"
        "dependsOrder" = "sequence"
        "dependsOn" = @(
            "CP: Verify backlog handoff",
            "CP: Verify audit index",
            "CP: Verify theme contracts"
        )
        "problemMatcher" = @()
    }
)

$workspace = [ordered]@{
    "folders" = @(
        [ordered]@{
            "name" = "Containment Protocol"
            "path" = $resolvedRepo
        }
    )
    "settings" = $settings
    "extensions" = [ordered]@{
        "recommendations" = $extensions
        "unwantedRecommendations" = @("GitLab.gitlab-workflow")
    }
    "tasks" = [ordered]@{
        "version" = "2.0.0"
        "tasks" = $tasks
    }
}

$workspace | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $workspacePath -Encoding UTF8
Write-Host "Workspace: $workspacePath"

Write-Step "Creating VS Code profile '$ProfileName'"

# Opening a folder with a non-existent profile name creates an empty profile.
& $codeCli $resolvedRepo --profile $ProfileName | Out-Null
Start-Sleep -Milliseconds 750

Write-Step "Installing project-specific extensions into '$ProfileName'"

foreach ($extension in $extensions) {
    Write-Host "  $extension"
    & $codeCli --profile $ProfileName --install-extension $extension --force
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Extension install returned exit code $LASTEXITCODE for $extension."
    }
}

Write-Step "Adding Linear MCP to the profile"

# VS Code's --add-mcp writes to the active user profile. OAuth/trust happens on first server start.
$linearMcp = [ordered]@{
    "name" = "linear"
    "command" = "npx"
    "args" = @("-y", "mcp-remote", "https://mcp.linear.app/mcp")
} | ConvertTo-Json -Compress

& $codeCli --profile $ProfileName --add-mcp $linearMcp
if ($LASTEXITCODE -ne 0) {
    Write-Warning "VS Code could not add Linear MCP automatically. Use 'MCP: Add Server' in the Containment Protocol profile and enter: npx mcp-remote https://mcp.linear.app/mcp"
}

Write-Step "Creating launcher"

$launcherPath = Join-Path $localRoot "Open Containment Protocol VS Code.cmd"
$launcherLines = @(
    "@echo off",
    "code `"$workspacePath`" --profile `"$ProfileName`""
)
$launcherLines | Set-Content -LiteralPath $launcherPath -Encoding ASCII
Write-Host "Launcher: $launcherPath"

if (-not $NoDesktopLauncher) {
    $desktop = [Environment]::GetFolderPath("Desktop")
    if ($desktop) {
        $desktopLauncher = Join-Path $desktop "Containment Protocol VS Code.cmd"
        Copy-Item -LiteralPath $launcherPath -Destination $desktopLauncher -Force
        Write-Host "Desktop launcher: $desktopLauncher"
    }
}

Write-Step "Setup complete"

Write-Host "Profile:       $ProfileName"
Write-Host "Repository:    $resolvedRepo"
Write-Host "Workspace:     $workspacePath"
Write-Host ""
Write-Host "First Linear use: VS Code will ask you to trust/start the Linear MCP server and complete OAuth."
Write-Host "The repo's AGENTS.md and .github/copilot-instructions.md remain the workflow authority."
Write-Host "The normal implementation validation task intentionally excludes 'npm run build' because the repo documents existing baseline type-contract drift."

if (-not $NoLaunch) {
    Write-Step "Opening Containment Protocol"
    & $codeCli $workspacePath --profile $ProfileName
}
