$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$flyerlyNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$flyerlyBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (Test-Path -LiteralPath $flyerlyBundledNode) { $flyerlyNode = $flyerlyBundledNode }
if (-not $flyerlyNode) { throw 'Install Node.js 24 LTS, then run this launcher again.' }
$flyerlyVersion = & $flyerlyNode -p 'Number(process.versions.node.split(".")[0])'
if ([int]$flyerlyVersion -lt 22) { throw 'Node.js 22.13 or newer is required. Install Node.js 24 LTS.' }
$env:Path = (Split-Path -Parent $flyerlyNode) + ';' + $env:Path
if (-not (Test-Path -LiteralPath 'node_modules')) {
    $flyerlyNpm = Join-Path $env:ProgramFiles 'nodejs\node_modules\npm\bin\npm-cli.js'
    if (Test-Path -LiteralPath $flyerlyNpm) { & $flyerlyNode $flyerlyNpm ci }
    else { & npm.cmd ci }
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
& $flyerlyNode scripts/setup-local.mjs
if ($LASTEXITCODE -ne 0) { throw 'Local database setup failed.' }
Write-Host 'Open http://localhost:5173 and click Sign in with ChatGPT to use the local demo account.'
Write-Host 'Keep this terminal open. Press Ctrl+C to stop the local app.'
& $flyerlyNode scripts/run-framework.mjs dev
