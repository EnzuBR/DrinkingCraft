param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs
)

$ErrorActionPreference = 'Stop'
$TestDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js (>= 18) is required to run the DrinkingCraft test suite."
  exit 1
}

Push-Location $TestDir
try {
  if (-not (Test-Path (Join-Path $TestDir 'node_modules'))) {
    Write-Host "[run-tests] Installing test dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }

  node run-tests.mjs @ForwardArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
