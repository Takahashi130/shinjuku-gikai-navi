/**
 * 外部リンク定数
 */
export const EXTERNAL_LINKS = {
  /** 問題報告フォーム。未設定（空文字）の間は「問題を報告する」ボタンを表示しない */
  REPORT: "",
  /** 元にしたソフトウェア（AGPL-3.0）のソースコード */
  ORIGINAL_REPO: "https://github.com/team-mirai/mirai-gikai",
  /** このアプリのソースコード */
  GITHUB_REPO: "https://github.com/Takahashi130/shinjuku-gikai-navi",
  /** 新宿区議会の公式ページ */
  SHINJUKU_GIKAI: "https://www.city.shinjuku.lg.jp/kusei/index08.html",
  /** 区議会のインターネット中継について（新宿区。中継・録画への入口） */
  SHINJUKU_GIKAI_STREAM:
    "https://www.city.shinjuku.lg.jp/kusei/file08_00023.html",
} as const;
