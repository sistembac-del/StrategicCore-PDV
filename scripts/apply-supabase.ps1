param(
  [string]$ProjectRef
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw "Defina SUPABASE_ACCESS_TOKEN no ambiente antes de executar este script."
}

if (-not $ProjectRef) {
  $envPath = Join-Path $PSScriptRoot "..\.env.local"
  if (-not (Test-Path $envPath)) {
    throw "Informe -ProjectRef ou crie .env.local com VITE_SUPABASE_URL."
  }

  $supabaseUrl = Get-Content $envPath |
    Where-Object { $_ -match "^VITE_SUPABASE_URL=" } |
    Select-Object -First 1

  if (-not $supabaseUrl) {
    throw "VITE_SUPABASE_URL não encontrada em .env.local."
  }

  $urlValue = $supabaseUrl -replace "^VITE_SUPABASE_URL=", ""
  $ProjectRef = ([uri]$urlValue).Host.Split(".")[0]
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

& ".\node_modules\.bin\supabase.cmd" link --project-ref $ProjectRef
& ".\node_modules\.bin\supabase.cmd" db push
