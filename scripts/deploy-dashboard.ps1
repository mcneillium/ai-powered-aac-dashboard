#Requires -Version 5.1
<#
.SYNOPSIS
    CommAI Dashboard deployment script (PowerShell).
.DESCRIPTION
    Runs tests, builds the React app, then deploys hosting, database rules,
    and Cloud Functions to Firebase. Stops on any failure.
    Designed for Windows PowerShell.
.EXAMPLE
    .\scripts\deploy-dashboard.ps1
    .\scripts\deploy-dashboard.ps1 -SkipTests
    .\scripts\deploy-dashboard.ps1 -DryRun
#>

param(
    [switch]$SkipTests,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$FunctionsDir = Join-Path $RepoRoot "functions"
$Project = "commai-b98fe"

# ── Helpers ──────────────────────────────────────────────────────────────────

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$Name' not found. Install it before running this script." -ForegroundColor Red
        exit 1
    }
}

function Assert-FileExists {
    param([string]$Path, [string]$Description)
    if (-not (Test-Path $Path)) {
        Write-Host "ERROR: $Description not found at $Path" -ForegroundColor Red
        exit 1
    }
}

# ── Preflight ────────────────────────────────────────────────────────────────

Write-Step "Preflight checks"

Assert-Command "node"
Assert-Command "npm"
Assert-Command "firebase"

# Node version check — functions require Node 22
$NodeVersion = (node -v) -replace '^v', ''
$NodeMajor = [int]($NodeVersion.Split('.')[0])
if ($NodeMajor -lt 22) {
    Write-Host "ERROR: Node 22+ required (found v$NodeVersion). See .nvmrc" -ForegroundColor Red
    Write-Host "  Install Node 22: nvm install 22 && nvm use 22" -ForegroundColor Yellow
    exit 1
}
if ($NodeMajor -gt 22) {
    Write-Host "WARNING: Node v$NodeVersion detected. Functions target Node 22." -ForegroundColor Yellow
    Write-Host "  Firebase may reject deploy. Consider: nvm use 22" -ForegroundColor Yellow
}
Write-Host "Node: v$NodeVersion (OK)"

# Verify key files exist
Assert-FileExists (Join-Path $RepoRoot "database.rules.json") "Database rules"
Assert-FileExists (Join-Path $RepoRoot "firebase.json") "Firebase config"
Assert-FileExists (Join-Path $RepoRoot ".firebaserc") "Firebase project config"
Assert-FileExists (Join-Path $FunctionsDir "index.js") "Cloud Functions entry"
Assert-FileExists (Join-Path $FunctionsDir "package.json") "Cloud Functions package.json"

# Verify firebase.json has database, hosting, and functions config
$FirebaseConfig = Get-Content (Join-Path $RepoRoot "firebase.json") -Raw | ConvertFrom-Json
if (-not $FirebaseConfig.database) {
    Write-Host "ERROR: firebase.json missing 'database' config" -ForegroundColor Red
    exit 1
}
if (-not $FirebaseConfig.hosting) {
    Write-Host "ERROR: firebase.json missing 'hosting' config" -ForegroundColor Red
    exit 1
}
if (-not $FirebaseConfig.functions) {
    Write-Host "ERROR: firebase.json missing 'functions' config" -ForegroundColor Red
    exit 1
}
Write-Host "firebase.json: database + hosting + functions config present"

# Verify Firebase CLI is authenticated and on correct project
Write-Step "Verifying Firebase project"
firebase use $Project
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not select project $Project. Run 'firebase login' first." -ForegroundColor Red
    exit 1
}

# ── Tests ────────────────────────────────────────────────────────────────────

if (-not $SkipTests) {
    Write-Step "Running tests (non-interactive)"

    Push-Location $RepoRoot
    try {
        # CI=true prevents Jest watch mode
        $env:CI = "true"
        # --passWithNoTests: safety net so zero-match edge cases don't block deploy
        # --roots: explicitly include __tests__/ alongside src/ (craco config does
        #   this too, but some CRA/craco versions on Windows don't apply it reliably)
        npx craco test --watchAll=false --passWithNoTests --verbose --roots src --roots __tests__
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Tests failed. Fix before deploying." -ForegroundColor Red
            exit 1
        }
        Write-Host "All tests passed." -ForegroundColor Green
    }
    finally {
        Pop-Location
        Remove-Item Env:\CI -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Skipping tests (--SkipTests flag)" -ForegroundColor Yellow
}

# ── Build ────────────────────────────────────────────────────────────────────

Write-Step "Building React app for production"

Push-Location $RepoRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Production build failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete (output in build/)." -ForegroundColor Green
}
finally {
    Pop-Location
}

# ── Functions dependencies ───────────────────────────────────────────────────

Write-Step "Installing Cloud Functions dependencies"

Push-Location $FunctionsDir
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed in functions/" -ForegroundColor Red
        exit 1
    }

    Write-Step "Linting Cloud Functions"
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Lint failed in functions/" -ForegroundColor Red
        exit 1
    }
}
finally {
    Pop-Location
}

# ── Deploy ───────────────────────────────────────────────────────────────────

if ($DryRun) {
    Write-Step "DRY RUN — would deploy:"
    Write-Host "  firebase deploy --only hosting --project $Project"
    Write-Host "  firebase deploy --only database --project $Project"
    Write-Host "  firebase deploy --only functions --project $Project"
    Write-Host "Exiting without deploying." -ForegroundColor Yellow
    exit 0
}

Write-Step "Deploying hosting (React app)"
firebase deploy --only hosting --project $Project
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Hosting deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host "Hosting deployed." -ForegroundColor Green

Write-Step "Deploying database rules"
firebase deploy --only database --project $Project
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database rules deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host "Database rules deployed." -ForegroundColor Green

Write-Step "Deploying Cloud Functions"
firebase deploy --only functions --project $Project
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Functions deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host "Cloud Functions deployed." -ForegroundColor Green

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Step "Deploy complete"
Write-Host ""
Write-Host "  Project:   $Project" -ForegroundColor Green
Write-Host "  Dashboard: https://$Project.web.app" -ForegroundColor Green
Write-Host "  Rules:     database.rules.json deployed" -ForegroundColor Green
Write-Host "  Function:  setUserPassword (europe-west1)" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open https://$Project.web.app and verify login works"
Write-Host "  2. Run smoke tests (see docs/release/dashboard-ops-runbook.md Phase 5)"
Write-Host ""
