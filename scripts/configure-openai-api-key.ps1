# Configura OPENAI_API_KEY local (.env.local) e Vercel Production.
# Uso: na pasta febracis-dre, executar:
#   powershell -ExecutionPolicy Bypass -File ./scripts/configure-openai-api-key.ps1
# Opções:
#   -SkipVercel     só grava .env.local
#   -SkipLocal      só envia para Vercel
#
# Se a chave já foi exposta (chat, print, commit), revogue em platform.openai.com e gere outra.

param(
  [switch]$SkipVercel,
  [switch]$SkipLocal
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$secure = Read-Host 'Cole a OPENAI_API_KEY (não aparece ao digitar)' -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
} finally {
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($plain)) {
  Write-Error 'Chave vazia. Abortado.'
  exit 1
}

$envLocal = Join-Path $root '.env.local'
$lines = @()
if (Test-Path $envLocal) {
  $lines = @(Get-Content -LiteralPath $envLocal -Encoding utf8)
}

$out = New-Object System.Collections.Generic.List[string]
$seenKey = $false
foreach ($line in $lines) {
  if ($line -match '^\s*OPENAI_API_KEY\s*=') {
    if (-not $seenKey) {
      $out.Add("OPENAI_API_KEY=$plain")
      $seenKey = $true
    }
  } else {
    $out.Add($line)
  }
}
if (-not $seenKey) {
  $out.Add("OPENAI_API_KEY=$plain")
}

$hasModel = $out | Where-Object { $_ -match '^\s*OPENAI_MODEL\s*=' }
if (-not $hasModel) {
  $out.Add('OPENAI_MODEL=gpt-5.4-mini')
}

if (-not $SkipLocal) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllLines($envLocal, $out.ToArray(), $utf8NoBom)
  Write-Host "OK: $envLocal atualizado (gitignored)."
}

if (-not $SkipVercel) {
  Write-Host 'A enviar OPENAI_API_KEY para Vercel (Production)...'
  npx vercel@latest env add OPENAI_API_KEY production --value $plain --yes --force
  Write-Host 'OK: variável na Vercel. Faça um redeploy (Deployments → Redeploy) para a função api/dre-agent apanhar a chave.'
}

Write-Host 'Feito. Recomendação: apague a chave do histórico de chat e rotacione se houve exposição.'
