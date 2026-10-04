# Windows で開発できるようにする手順

Mac と Windows のどちらでも開発できるようにするための手順です。

## 考え方

- **プロジェクトの受け渡しは GitHub で行います。** Mac でも Windows でも、それぞれのパソコンの中に GitHub からコピーして使います。
  - 作業が終わったら GitHub に保存（push）します。
  - 別のパソコンで始めるときは、GitHub から最新を取り込み（pull）ます。
- **SSD は、設定ファイルの受け渡しにだけ使います。** パスワードや鍵が入ったファイルは GitHub に載せられないためです。
  - プロジェクト本体は SSD に置きません。SSD の形式（exFAT）ではアプリの部品が正しく保存できず、Mac と Windows では部品の中身も違うためです。
- **データベースはネット上（Supabase）にあります。** Windows でも Docker なしで、そのまま使えます。

## 1. Mac 側：設定ファイルを SSD に入れる

Mac のプロジェクトフォルダで次のコマンドを実行すると、設定ファイル3つ（`.env`・`.env.supabase-dev`・`.env.supabase-prod`。役割は [README の「設定ファイル」](../../README.md#設定ファイル)）が SSD の `chokumin-env` フォルダにコピーされます。値は画面に出ません。`<SSDの名前>` は書き換えてください。

```sh
pnpm env:export -- --to /Volumes/<SSDの名前>/chokumin-env
```

- 同じ中身のファイルはそのまま。中身が違うときは上書きしてよいか聞かれます（`--overwrite` で聞かずに上書き）。
- SSD がつながっていない（親フォルダが無い）ときは止まります。

> ⚠️ これらはパスワードや鍵です。SSD をなくしたり、人に貸したりしないでください。Windows にコピーし終わったら、SSD からは消しておくと安心です。

## 2. Windows 側：必要なものを入れる

### 2-1. Claude のアプリを入れる（最初に）

https://claude.ai/download から Windows 版の Claude をダウンロードして、インストールします。

Claude の「Code」画面で話しかければ、ここから先の作業は Claude が Windows 上で直接進められます。手順書のとおりに自分で進めることもできます。

### 2-2. 自動インストールを実行する

1. SSD を Windows につなぎます。エクスプローラーで、SSD のドライブ名を確かめます（例：`E:`）。
2. スタートメニューで「PowerShell」を開きます。管理者としてではなく、普通に開きます。
3. 次の3行を順番に実行します。1行目は、このスクリプトをダウンロードするコマンドです。

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/Takahashi130/shinjuku-gikai-navi/develop/scripts/setup-windows.ps1 -OutFile setup-windows.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-windows.ps1 -EnvSource "E:\chokumin-env"
```

`E:` の部分は、確かめた SSD のドライブ名に合わせて書き換えてください。

スクリプトは次のことを自動で行います。途中で GitHub のログイン画面が開くので、ログインして「許可」してください。

1. Git・Node.js・GitHub CLI をインストールする
2. Git を設定する（改行の扱い、長いファイル名への対応）
3. pnpm を準備する（管理者権限なしで使えるよう、ユーザーのフォルダに入れる）
4. GitHub にログインする（git の push・pull にも同じログインを使う）
5. プロジェクトを `C:\dev\shinjuku-gikai-navi` にコピーする
6. SSD から設定ファイルをコピーする
7. アプリの部品をインストールする
8. 型チェックで動作を確認する

> **PowerShell では `pnpm` ではなく `pnpm.cmd` と打ってください。** `pnpm` だと「スクリプトの実行が無効」と止められることがあります（PowerShell の実行ポリシーのため。設定は変えなくてよい）。Claude の Code 画面から動かすときは `pnpm` のままで動きます。

### 2-3. 開発用の画面を開く

`cd C:\dev\shinjuku-gikai-navi` で移動し、あとは [README の「最短の実行手順」](../../README.md#最短の実行手順) と同じです（開発サーバーは http://localhost:3000）。PowerShell では `pnpm` を `pnpm.cmd` に置き換えます。

```powershell
pnpm.cmd exec dotenv -e .env -- pnpm --filter web dev
```

## 3. 公開やデータの取り込みをする場合（必要なときだけ）

次のサービスには、パソコンごとにログインが必要です。

| 作業 | ログインのコマンド |
|---|---|
| Vercel への公開 | `npx vercel login` |
| Supabase の操作（データベースの変更、型の作り直し） | `npx supabase login` |

## 4. 毎日の使い方

| するとき | コマンド |
|---|---|
| 作業を始めるとき（最新を取り込む） | `git pull` |
| 部品が増えたとき（pull の後にエラーが出たら） | `pnpm.cmd install` |
| 作業を保存するとき | `git add -A` → `git commit -m "やったこと"` → `git push` |

Mac と Windows で同じ日に作業するときは、片方で push してから、もう片方で pull してください。push したら、どのコミットまで送ったかをもう一方に伝えます。2台での決まりは [HANDOFF の「Mac と Windows」](../HANDOFF.md#mac-と-windows) にまとめています。

## 5. うまくいかないとき

[troubleshooting.md](troubleshooting.md) の「Windows」を見てください。
