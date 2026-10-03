import { BRAND_COLORS } from "./brand-colors";

/**
 * サービス名などのサイト共通設定
 * 名前を変えるときはここを変更する
 */
export const SITE = {
  NAME: "新宿区議会ナビ",
  TAGLINE: "新宿区議会の議論をわかりやすく",
  /** キャッチコピー。ヘッダーのサービス名の下などに出す */
  CATCHPHRASE: "直接民主主義をあなたの手に",
  DESCRIPTION:
    "新宿区議会でどんな議案が審議され、どの会派が賛成・反対したのかをわかりやすく伝えるアプリ",
  /**
   * ブラウザのテーマカラー（アドレスバー等）。ヘッダー上段の色（globals.css の
   * --brand-header）と同じ値。配色を差し替えたら brand-colors.ts を合わせる。
   */
  THEME_COLOR: BRAND_COLORS.header,
  /**
   * 元にしたソフトウェアのライセンス（AGPL-3.0）の追加条件で表示が求められている文言
   * https://github.com/team-mirai/mirai-gikai/blob/develop/FORK_GUIDELINES.md
   */
  DISCLAIMER: "これは政党チームみらいが運営しているものではありません",
  COPYRIGHT: "© 2026 新宿区議会ナビ",
} as const;
