# 新宿区議会ナビ：Windows の開発環境をまとめて準備するスクリプト
#
# 使い方（PowerShell を「管理者ではない普通の状態」で開いて実行）:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup-windows.ps1 -EnvSource "E:\chokumin-env"
#
#   -EnvSource : SSD に入れた設定ファイル（.env など）のフォルダ。省略すると設定ファイルのコピーを飛ばす
#   -Target    : プロジェクトを置く場所（既定 C:\dev\shinjuku-gikai-navi）
#
# 何度実行しても大丈夫なように、入っているものは飛ばす。

param(
  [string]$EnvSource = "",
  [string]$Target = "C:\dev\shinjuku-gikai-navi"
)

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/Takahashi130/shinjuku-gikai-navi.git"
$PnpmVersion = "10.33.0"

function Step($message) { Write-Host "`n== $message" -ForegroundColor Cyan }

function Install-IfMissing($command, $wingetId) {
  if (Get-Command $command -ErrorAction SilentlyContinue) {
    Write-Host "$command はインストール済み"
  } else {
    Write-Host "$wingetId をインストールします"
    winget install --id $wingetId --exact --silent --accept-package-agreements --accept-source-agreements
  }
}

Step "1. 必要なソフトのインストール（Git・Node.js・GitHub CLI）"
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget がありません。Microsoft Store で「アプリ インストーラー」を更新してから、もう一度実行してください"
}
Install-IfMissing "git" "Git.Git"
Install-IfMissing "node" "OpenJS.NodeJS.LTS"
Install-IfMissing "gh" "GitHub.cli"

# インストール直後でも使えるよう、PATH を読み直す
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Step "2. Git の設定（改行は LF のまま扱う）"
git config --global core.autocrlf false
git config --global core.longpaths true

Step "3. pnpm の準備"
corepack enable
corepack prepare "pnpm@$PnpmVersion" --activate
pnpm --version

Step "4. GitHub へのログイン"
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "ブラウザが開くので、GitHub にログインして許可してください"
  gh auth login --web --git-protocol https
}

Step "5. プロジェクトのコピー（GitHub から）"
if (Test-Path (Join-Path $Target ".git")) {
  Write-Host "すでにあります。最新を取り込みます"
  git -C $Target pull --ff-only
} else {
  New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
  git clone $Repo $Target
}
Set-Location $Target
git checkout develop

Step "6. 設定ファイル（.env など）のコピー"
if ($EnvSource -and (Test-Path $EnvSource)) {
  foreach ($name in @(".env", ".env.supabase-dev", ".env.supabase-prod")) {
    $src = Join-Path $EnvSource $name
    if (Test-Path $src) {
      Copy-Item $src (Join-Path $Target $name) -Force
      Write-Host "$name をコピーしました"
    } else {
      Write-Host "$name が見つかりません（$src）" -ForegroundColor Yellow
    }
  }
} else {
  Write-Host "設定ファイルのフォルダが指定されていないので飛ばします（-EnvSource で指定）" -ForegroundColor Yellow
}

Step "7. アプリの部品のインストール"
pnpm install --frozen-lockfile

Step "8. 動作確認（型チェック）"
pnpm --filter web typecheck

Write-Host "`n準備ができました。開発用サーバーは次のコマンドで起動できます:" -ForegroundColor Green
Write-Host "  cd $Target"
Write-Host "  pnpm exec dotenv -e .env -- pnpm --filter web dev"
Write-Host "ブラウザで http://localhost:3000 を開いてください"
