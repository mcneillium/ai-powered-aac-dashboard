$ErrorActionPreference = "Stop"

$ProjectId = "commai-b98fe"

Write-Host "==> Using Firebase project: $ProjectId"
firebase use $ProjectId
if ($LASTEXITCODE -ne 0) {
    throw "firebase use failed"
}

Write-Host "==> firebase.json"
Get-Content .\firebase.json

Write-Host "==> Installing root dependencies"
if (Test-Path .\package-lock.json) {
    npm ci
} else {
    npm install
}
if ($LASTEXITCODE -ne 0) {
    throw "Root dependency install failed"
}

if (Test-Path .\functions) {
    Write-Host "==> Installing functions dependencies"
    Push-Location .\functions
    if (Test-Path .\package-lock.json) {
        npm ci
    } else {
        npm install
    }
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "Functions dependency install failed"
    }
    Pop-Location
}

Write-Host "==> Running tests"
$env:CI = "true"
npm test -- --runInBand --watchAll=false --testPathIgnorePatterns=src/App.test.js
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Tests failed. Deployment stopped."
    exit 1
}

Write-Host "==> Deploying Realtime Database rules"
firebase deploy --only database
if ($LASTEXITCODE -ne 0) {
    throw "Database rules deploy failed"
}

Write-Host "==> Deploying Functions"
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    throw "Functions deploy failed"
}

Write-Host "==> Done"