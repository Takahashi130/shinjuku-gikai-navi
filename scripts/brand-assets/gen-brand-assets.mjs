// ブランドの画像（ロゴ・アプリアイコン・OGP・仮サムネイル）を配色に合わせて作り直す。
//
// 使い方（リポジトリのルートで）:
//   pnpm brand:assets                 # いまの配色（案C）で作り直す
//   pnpm brand:assets --palette a     # 案A・案Bに切り替えるとき
//   pnpm brand:assets --palette c --font-dir ~/Library/Fonts
//
// 作り直すもの（web/public の下）:
//   img/logo.svg, img/ogp-logo.png, ogp.jpg, icons/pwa/*.png,
//   img/thumbnails/*.png, manifest.json の theme_color / background_color
//
// 配色の値は web/src/app/globals.css の :root（案C）と [data-palette="a"|"b"]、
// web/src/config/brand-colors.ts と同じにしておくこと。配色を切り替えるときは
// この3か所（と site.ts の THEME_COLOR を決める brand-colors.ts）をそろえる。
//
// 必要なもの:
// - @resvg/resvg-js（ルートの devDependencies）
// - アイコンは web の lucide-react（アプリと同じ版）から取る
// - OGP の文字に Noto Sans JP（NotoSansJP-Bold.otf / NotoSansJP-Regular.otf）。
//   置き場所は --font-dir か環境変数 BRAND_FONT_DIR（既定は ~/Library/Fonts）。
//   https://fonts.google.com/noto/specimen/Noto+Sans+JP から入手できる
// - ogp.jpg の書き出しに sharp（next の依存として入っている）。無ければ macOS の sips

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Resvg } from "@resvg/resvg-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = join(ROOT, "web");

/**
 * 配色。globals.css の --brand-* と同じ値にする。
 * mark はロゴの記号にする lucide のアイコン（デザイン案ごとの意味づけ）。
 */
const PALETTES = {
  // 案C「声とチェック」：区民の声が議会に届く
  c: {
    header: "#111827",
    headerSub: "#1f2937",
    accent: "#10c690",
    onAccent: "#062b1f",
    onHeaderMuted: "#cbd5e1",
    pageBg: "#eaf6f1",
    // アプリアイコン（ファビコン）は緑の地に白い円、濃い緑の線
    icon: { bg: "#059669", circle: "#ffffff", stroke: "#047857" },
    mark: "message-square-check",
  },
  // 案A「投票箱」：ネイビー × オレンジ
  a: {
    header: "#14213d",
    headerSub: "#1f3157",
    accent: "#fca311",
    onAccent: "#14213d",
    onHeaderMuted: "#c8d0e0",
    pageBg: "#eaeded",
    mark: "vote",
  },
  // 案B「手をあげる」：ネイビー × イエロー
  b: {
    header: "#0b2545",
    headerSub: "#13315c",
    accent: "#f4d35e",
    onAccent: "#0b2545",
    onHeaderMuted: "#c3cfe0",
    pageBg: "#eaeded",
    mark: "hand",
  },
};

/**
 * 仮サムネイル（1200x800）。[slug, アイコン, 背景の淡色2色, アイコンの色]。
 * テーマごとに色を変える。配色の案には依存しない。
 * 桜色（ピンク）は使わない（ユーザーが外した配色）。
 */
const THUMBNAILS = [
  ["budget", "piggy-bank", "#eef8f7", "#c9ede8", "#0f766e"],
  ["childcare", "baby", "#fff6ef", "#fddcc4", "#c2410c"],
  ["education", "graduation-cap", "#fffaeb", "#fbe7b0", "#a16207"],
  ["welfare", "heart-pulse", "#eff8fd", "#c4e4f5", "#0369a1"],
  ["safety", "shield-check", "#f1f5fd", "#c9d9f6", "#1d4ed8"],
  ["environment", "trees", "#f0f9f2", "#c8e9d2", "#15803d"],
  ["town", "building-2", "#f4f6f8", "#d5dce4", "#475569"],
  ["construction", "hard-hat", "#fef8ee", "#f6dcb5", "#b45309"],
  ["ordinance", "scale", "#f3f2fd", "#d3d0f5", "#4338ca"],
  ["opinion", "megaphone", "#f8f1fd", "#e3cdf4", "#7e22ce"],
];

/**
 * web の lucide-react にまだ無いアイコン。lucide（ISC License,
 * https://lucide.dev）1.50 の message-square-check のパスを写している。
 * lucide-react を上げてこのアイコンが入ったら、そちらが優先される。
 */
const EXTRA_ICONS = {
  "message-square-check": [
    [
      "path",
      {
        d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.7.7 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
      },
    ],
    ["path", { d: "m9 11 2 2 4-4" }],
  ],
};

const PWA_ICONS = [
  ["icon_android_192", 192],
  ["icon_android_512", 512],
  ["icon_dev_192_v3", 192],
  ["icon_staging_192", 192],
  ["icon_ios", 180],
  ["icon_staging_ios", 180],
];

// ---- 引数 ----
const { values: args } = parseArgs({
  options: {
    palette: { type: "string", default: "c" },
    "font-dir": { type: "string" },
    out: { type: "string", default: join(WEB, "public") },
  },
});
const C = PALETTES[args.palette];
if (!C) {
  throw new Error(
    `--palette は ${Object.keys(PALETTES).join(" / ")} のどれか（受け取った値: ${args.palette}）`
  );
}
const OUT = resolve(args.out);
const fontDir = (
  args["font-dir"] ??
  process.env.BRAND_FONT_DIR ??
  join(homedir(), "Library/Fonts")
).replace(/^~(?=\/)/, homedir());

// ---- サービス名・キャッチコピーは site.ts から読む（二重管理しない） ----
const siteSource = readFileSync(join(WEB, "src/config/site.ts"), "utf8");
const siteValue = (key) => {
  const matched = siteSource.match(new RegExp(`\\b${key}:\\s*"([^"]+)"`));
  if (!matched) throw new Error(`site.ts から ${key} を読めない`);
  return matched[1];
};
const SITE = {
  name: siteValue("NAME"),
  catchphrase: siteValue("CATCHPHRASE"),
  tagline: siteValue("TAGLINE"),
};

// ---- アイコン（web の lucide-react から取る） ----
const webRequire = createRequire(join(WEB, "package.json"));
const lucideIconsDir = join(
  dirname(webRequire.resolve("lucide-react")),
  "../esm/icons"
);

async function iconNode(name) {
  const file = join(lucideIconsDir, `${name}.js`);
  if (existsSync(file)) {
    const mod = await import(pathToFileURL(file).href);
    return mod.__iconNode;
  }
  if (EXTRA_ICONS[name]) return EXTRA_ICONS[name];
  throw new Error(`lucide のアイコン「${name}」が見つからない`);
}

const escapeAttr = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

async function iconPaths(name) {
  const node = await iconNode(name);
  return node
    .map(([tag, attrs]) => {
      const attrText = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
        .join(" ");
      return `<${tag} ${attrText} />`;
    })
    .join("\n    ");
}

// ---- 描画 ----
const fontFiles = ["NotoSansJP-Bold.otf", "NotoSansJP-Regular.otf"].map(
  (file) => join(fontDir, file)
);
const missingFonts = fontFiles.filter((file) => !existsSync(file));
if (missingFonts.length > 0) {
  throw new Error(
    `OGP の文字に使うフォントが無い: ${missingFonts.join(", ")}\n` +
      "--font-dir か BRAND_FONT_DIR で NotoSansJP-*.otf の置き場所を指定する"
  );
}
const render = (svg, width) =>
  new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "Noto Sans JP",
    },
  })
    .render()
    .asPng();

/** PNG を JPEG にする。sharp（next の依存）を使い、無ければ macOS の sips。 */
async function writeJpeg(png, outPath, quality) {
  try {
    const nextRequire = createRequire(webRequire.resolve("next/package.json"));
    const sharp = nextRequire("sharp");
    await sharp(png).jpeg({ quality, mozjpeg: true }).toFile(outPath);
    return;
  } catch (error) {
    if (process.platform !== "darwin") throw error;
  }
  const tmp = `${outPath}.tmp.png`;
  writeFileSync(tmp, png);
  try {
    execFileSync("sips", [
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      String(quality),
      tmp,
      "--out",
      outPath,
    ]);
  } finally {
    unlinkSync(tmp);
  }
}

// ---- ロゴ（48x48）。アクセントの円に、濃色の線でアイコンを描く ----
// アイコンの外形の中心を (24,24) に合わせて 1.3 倍する。message-square-check は
// 外形が y:3〜21.8 で中心が少し下にあるので、その分だけ上げる。
const MARK_OFFSET_Y = { "message-square-check": -0.52 };
const markPaths = await iconPaths(C.mark);
const markInner = `<circle cx="24" cy="24" r="24" fill="${C.accent}"/>
  <g transform="translate(8.4 ${(8.4 + (MARK_OFFSET_Y[C.mark] ?? 0)).toFixed(2)}) scale(1.3)" fill="none" stroke="${C.onAccent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${markPaths}
  </g>`;
writeFileSync(
  join(OUT, "img/logo.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" role="img" aria-label="${SITE.name}">
  <!-- 記号は lucide「${C.mark}」（ISC License, https://lucide.dev） -->
  ${markInner}
</svg>
`
);

// ---- アプリアイコン：濃色の地にロゴ。マスカブルの安全領域（半径40%）に収める ----
// 配色に icon があれば、その色の地・円・線にする
const iconInner = C.icon
  ? markInner
      .replace(`fill="${C.accent}"`, `fill="${C.icon.circle}"`)
      .replace(`stroke="${C.onAccent}"`, `stroke="${C.icon.stroke}"`)
  : markInner;
for (const [name, size] of PWA_ICONS) {
  const r = size * 0.34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${C.icon?.bg ?? C.header}"/>
  <g transform="translate(${size / 2 - r} ${size / 2 - r}) scale(${r / 24})">${iconInner}</g>
</svg>`;
  writeFileSync(join(OUT, `icons/pwa/${name}.png`), render(svg, size));
}

// ---- レポートの OG 画像（/api/og/report）に重ねるロゴ（透過、378x320 の枠に中央寄せ） ----
writeFileSync(
  join(OUT, "img/ogp-logo.png"),
  render(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 378 320">
  <g transform="translate(39 10) scale(${300 / 48})">${markInner}</g>
</svg>`,
    378
  )
);

// ---- サイトの OGP 画像 1200x630 ----
const ogp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.header}"/>
  <rect y="540" width="1200" height="90" fill="${C.headerSub}"/>
  <rect y="540" width="1200" height="6" fill="${C.accent}"/>
  <g transform="translate(96 150) scale(${232 / 48})">${markInner}</g>
  <text x="380" y="262" font-family="Noto Sans JP" font-size="92" font-weight="700" fill="#ffffff">${SITE.name}</text>
  <text x="384" y="344" font-family="Noto Sans JP" font-size="46" font-weight="700" fill="${C.accent}">${SITE.catchphrase}</text>
  <text x="386" y="412" font-family="Noto Sans JP" font-size="28" font-weight="400" fill="${C.onHeaderMuted}">新宿区議会の議案と、会派ごとの賛否をわかりやすく</text>
  <text x="96" y="597" font-family="Noto Sans JP" font-size="26" font-weight="400" fill="${C.onHeaderMuted}">議案を知る　→　自分の考えをもつ　→　議会の議決と見比べる</text>
</svg>`;
await writeJpeg(render(ogp, 1200), join(OUT, "ogp.jpg"), 88);

// ---- 仮サムネイル 1200x800（lucide アイコン＋淡い背景） ----
for (const [slug, icon, c1, c2, color] of THUMBNAILS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <circle cx="150" cy="110" r="190" fill="#ffffff" opacity="0.45"/>
  <circle cx="1090" cy="720" r="250" fill="#ffffff" opacity="0.4"/>
  <circle cx="1020" cy="150" r="56" fill="${color}" opacity="0.1"/>
  <circle cx="220" cy="670" r="36" fill="${color}" opacity="0.12"/>
  <circle cx="600" cy="400" r="250" fill="#ffffff"/>
  <g transform="translate(444 244) scale(13)" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${await iconPaths(icon)}</g>
</svg>`;
  writeFileSync(join(OUT, `img/thumbnails/${slug}.png`), render(svg, 1200));
}

// ---- manifest.json のテーマカラー ----
const manifestPath = join(OUT, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.theme_color = C.icon?.bg ?? C.header;
manifest.background_color = C.pageBg;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`案${args.palette.toUpperCase()} の画像を ${OUT} に書き出しました。`);
console.log(
  "web/src/app/globals.css の --brand-* と web/src/config/brand-colors.ts も同じ配色にそろえてください。"
);
