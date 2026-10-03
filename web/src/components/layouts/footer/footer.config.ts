import { HEADER_TABS } from "@/components/header/header-nav";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
  /** まだ無い機能の説明ページ。「準備中」と添える。 */
  comingSoon?: boolean;
};

/**
 * フッターのリンク。ヘッダーと同じタブ（まだ無い機能は説明ページ）と、
 * サイトの情報のページを1列に並べる。
 */
export const footerSiteLinks: FooterLink[] = [
  ...HEADER_TABS.map(({ label, href, comingSoon }) =>
    comingSoon ? { label, href, comingSoon } : { label, href }
  ),
  { label: "議案をさがす", href: routes.billsList() },
  { label: "利用規約", href: routes.terms() },
  { label: "プライバシーポリシー", href: routes.privacy() },
  { label: "開発者向け", href: routes.developers() },
];

/** 外部のサイト。新しいタブで開く。 */
export const footerExternalLinks: FooterLink[] = [
  {
    label: "新宿区議会（公式）",
    href: EXTERNAL_LINKS.SHINJUKU_GIKAI,
    external: true,
  },
  {
    label: "このアプリのソースコード",
    href: EXTERNAL_LINKS.GITHUB_REPO,
    external: true,
  },
];
