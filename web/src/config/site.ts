/**
 * サービス名などのサイト共通設定
 * 名前を変えるときはここを変更する
 */
export const SITE = {
  NAME: "新宿区議会ナビ",
  TAGLINE: "新宿区議会の議論をわかりやすく",
  DESCRIPTION:
    "新宿区議会でどんな議案が審議され、どの会派が賛成・反対したのかをわかりやすく伝えるアプリ",
  /** テーマカラー（新宿区の花・ツツジの色） */
  THEME_COLOR: "#c2417b",
  /**
   * 元にしたソフトウェアのライセンス（AGPL-3.0）の追加条件で表示が求められている文言
   * https://github.com/team-mirai/mirai-gikai/blob/develop/FORK_GUIDELINES.md
   */
  DISCLAIMER: "これは政党チームみらいが運営しているものではありません",
  COPYRIGHT: "© 2026 新宿区議会ナビ",
} as const;
