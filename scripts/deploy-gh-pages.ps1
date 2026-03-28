$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

Push-Location $repoRoot

try {
  $remoteUrl = (git remote get-url origin).Trim()

  if (-not $remoteUrl) {
    throw 'Remote origin não configurado para este repositório.'
  }

  if ($remoteUrl -notmatch '[:/]([^/]+)/([^/]+?)(?:\.git)?$') {
    throw "Não foi possível interpretar o remote origin: $remoteUrl"
  }

  $owner = $Matches[1]
  $repoName = $Matches[2]
  $basePath = if ($repoName -eq "$owner.github.io") { '/' } else { "/$repoName/" }
  $pagesUrl = if ($repoName -eq "$owner.github.io") {
    "https://$owner.github.io/"
  } else {
    "https://$owner.github.io/$repoName/"
  }

  if (-not (Test-Path '.env.local')) {
    throw 'Arquivo .env.local não encontrado. Configure as variáveis do Supabase antes do deploy.'
  }

  $env:VITE_BASE_PATH = $basePath

  npm run build

  Copy-Item 'dist/index.html' 'dist/404.html' -Force
  New-Item -ItemType File 'dist/.nojekyll' -Force | Out-Null

  $hasGhPagesBranch = [bool](git ls-remote --heads origin gh-pages)
  $tempWorktree = Join-Path $env:TEMP "$repoName-gh-pages"

  if (Test-Path $tempWorktree) {
    Remove-Item $tempWorktree -Recurse -Force
  }

  if ($hasGhPagesBranch) {
    git worktree add $tempWorktree gh-pages
  } else {
    git worktree add -b gh-pages $tempWorktree
  }

  try {
    Get-ChildItem $tempWorktree -Force |
      Where-Object { $_.Name -ne '.git' } |
      Remove-Item -Recurse -Force

    Copy-Item (Join-Path $repoRoot 'dist\*') $tempWorktree -Recurse -Force

    Push-Location $tempWorktree

    try {
      git add --all
      git diff --cached --quiet

      if ($LASTEXITCODE -eq 0) {
        Write-Host 'Nenhuma alteração detectada para publicar no GitHub Pages.'
      } else {
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        git commit -m "deploy: github pages $timestamp"
      }

      git push origin gh-pages --force
      Write-Host "GitHub Pages atualizado em: $pagesUrl"
    }
    finally {
      Pop-Location
    }
  }
  finally {
    git worktree remove $tempWorktree --force

    if (Test-Path $tempWorktree) {
      Remove-Item $tempWorktree -Recurse -Force
    }
  }
}
finally {
  Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
  Pop-Location
}
