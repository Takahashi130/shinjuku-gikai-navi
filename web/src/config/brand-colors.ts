/**
 * CSS 変数を読めない場所で使うブランド配色（いまの配色：デザイン案C）。
 *
 * レポートの OG 画像（/api/og/report。Satori は CSS 変数を読めない）と、
 * ブラウザのテーマカラー（site.ts の THEME_COLOR）が使う。
 *
 * headerSurface 以外の値は web/src/app/globals.css の :root の --brand-* と
 * 同じにすること。
 * 片方を変えたら、もう片方も変える（brand-colors.test.ts が食い違いを検出する）。
 * 画像の配色は scripts/brand-assets/gen-brand-assets.mjs が持っている。
 */
export const BRAND_COLORS = {
  /**
   * ヘッダーの地の色（白。header-client.tsx の bg-white）。配色を差し替えても
   * 変えない白なので、CSS 変数は持たない。ブラウザのテーマカラーに使う。
   */
  headerSurface: "#ffffff",
  /** お知らせ帯・フッターなど濃色の帯（--brand-header） */
  header: "#1b1f24",
  /** 濃色の帯の上の文字（--brand-on-header） */
  onHeader: "#ffffff",
  /** アクセント。地の色・塗りとして使う（--brand-accent） */
  accent: "#2ec4b6",
  /** アクセント地の上の文字（--brand-on-accent） */
  onAccent: "#1b1f24",
  /** 白地のリンク・強調（--brand-link） */
  link: "#0f766e",
} as const;

/** BRAND_COLORS のキーと、globals.css の CSS 変数の対応（白の headerSurface は除く）。 */
export const BRAND_COLOR_CSS_VARS: Record<
  Exclude<keyof typeof BRAND_COLORS, "headerSurface">,
  string
> = {
  header: "--brand-header",
  onHeader: "--brand-on-header",
  accent: "--brand-accent",
  onAccent: "--brand-on-accent",
  link: "--brand-link",
};
