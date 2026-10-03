import { BILL_FINDER_LINKS } from "@/components/header/header-nav";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

/** フッターのリンクの列（Amazon のフッターのリンク群の位置づけ）。 */
export const footerColumns: FooterColumn[] = [
  {
    title: "議案をさがす",
    links: BILL_FINDER_LINKS.map(({ label, href }) => ({ label, href })),
  },
  {
    title: "このサイトについて",
    links: [
      { label: "トップページ", href: routes.home() },
      { label: "利用規約", href: routes.terms() },
      { label: "プライバシーポリシー", href: routes.privacy() },
      { label: "開発者向け", href: routes.developers() },
    ],
  },
  {
    title: "関連リンク",
    links: [
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
    ],
  },
];
