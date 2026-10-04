# 新宿区議会ナビ：Windows の開発環境をまとめて準備するスクリプト
#
# 使い方（PowerShell を「管理者ではない普通の状態」で開いて実行）:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup-windows.ps1 -EnvSource "E:\直民アプリ"
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

# pnpm の置き場所。管理者権限なしで書き込める、ユーザーごとのフォルダ（Node.js のインストーラーが PATH に入れる場所）
$ShimDir = Join-Path $env:APPDATA "npm"

# PATH を読み直す。インストールした直後のソフトは、今開いている PowerShell からは見えないことがあるため
function Update-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  if (($env:Path -split ";") -notcontains $ShimDir) { $env:Path = "$env:Path;$ShimDir" }
}

function Install-IfMissing($command, $wingetId) {
  if (Get-Command $command -ErrorAction SilentlyContinue) {
    Write-Host "$command はインストール済み"
  } else {
    Write-Host "$wingetId をインストールします"
    winget install --id $wingetId --exact --silent --accept-package-agreements --accept-source-agreements
  }
}

Step "1. 必要なソフトのインストール（Git・Node.js・GitHub CLI）"
# 前に入れたソフトを「入っていない」と見誤らないよう、最初にも PATH を読み直す
Update-Path
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget がありません。Microsoft Store で「アプリ インストーラー」を更新してから、もう一度実行してください"
}
Install-IfMissing "git" "Git.Git"
Install-IfMissing "node" "OpenJS.NodeJS.LTS"
Install-IfMissing "gh" "GitHub.cli"

# インストール直後でも使えるよう、PATH を読み直す
Update-Path

Step "2. Git の設定（改行は LF のまま扱う）"
git config --global core.autocrlf false
git config --global core.longpaths true

Step "3. pnpm の準備（管理者権限なし）"
# 何も付けない corepack enable は Node.js のフォルダ（Program Files）に書き込むので管理者権限が要る。
# ユーザーのフォルダに入れれば要らない。
New-Item -ItemType Directory -Force -Path $ShimDir | Out-Null
corepack enable --install-directory $ShimDir
corepack prepare "pnpm@$PnpmVersion" --activate
# 次に開く PowerShell でも pnpm が見つかるよう、ユーザーの PATH に無ければ足す
$UserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if (-not $UserPath) { $UserPath = "" }
if (($UserPath -split ";") -notcontains $ShimDir) {
  [System.Environment]::SetEnvironmentVariable("Path", ($UserPath.TrimEnd(";") + ";" + $ShimDir).TrimStart(";"), "User")
}
Update-Path
# pnpm は pnpm.cmd で呼ぶ。pnpm（pnpm.ps1）は PowerShell の実行ポリシーで止められることがあるため
pnpm.cmd --version

Step "4. GitHub へのログイン"
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "ブラウザが開くので、GitHub にログインして許可してください"
  gh auth login --web --git-protocol https
}
# git の push・pull でも、このログインを使う
gh auth setup-git

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
pnpm.cmd install --frozen-lockfile

Step "8. 動作確認（型チェック）"
pnpm.cmd --filter web typecheck

Write-Host "`n準備ができました。開発用サーバーは次のコマンドで起動できます:" -ForegroundColor Green
Write-Host "  cd $Target"
Write-Host "  pnpm.cmd exec dotenv -e .env -- pnpm --filter web dev"
Write-Host "ブラウザで http://localhost:3000 を開いてください"
Write-Host "PowerShell では pnpm ではなく pnpm.cmd と打ってください（pnpm だと実行ポリシーで止められることがあります）"
