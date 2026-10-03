"use client";

import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { SITE } from "@/config/site";
import { isInterviewPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { type FooterLink, footerColumns } from "./footer.config";

/**
 * サイト共通のフッター（Amazon 風の濃色の帯）。
 *
 * 上から「ページの先頭へ」の帯 → リンク群 → ロゴ → 免責文言と著作権表示。
 * 免責文言（SITE.DISCLAIMER）と元のソフトウェアのライセンス表示は、元の
 * ソフトウェア（AGPL-3.0）の追加条件で求められているので必ず残す。
 */
export function Footer() {
  const pathname = usePathname();

  if (isInterviewPage(pathname)) {
    return null;
  }

  return (
    <footer data-surface="dark" className="text-brand-on-header">
      {/* ヘッダーに id="top" を付けている */}
      <a
        href="#top"
        className="block bg-brand-header-sub py-3.5 text-center text-[13px] font-bold text-brand-on-header hover:bg-brand-header-hover"
      >
        ページの先頭へ
      </a>

      <div className="bg-brand-header">
        <nav
          aria-label="フッター"
          className="mx-auto grid max-w-[1000px] grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-3"
        >
          {footerColumns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-brand-on-header">
                {column.title}
              </h2>
              <ul className="flex flex-col">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-brand-header-hover border-t">
          <div className="mx-auto flex max-w-[1000px] items-center justify-center px-6 py-6">
            <Link
              href={routes.home()}
              aria-label={`${SITE.NAME} トップページ`}
              className="flex items-center gap-2 rounded-sm border border-transparent px-2 py-1 hover:border-brand-on-header"
            >
              <Image src="/img/logo.svg" alt="" width={32} height={32} />
              <span className="flex flex-col leading-tight">
                <span className="text-base font-extrabold text-brand-on-header">
                  {SITE.NAME}
                </span>
                <span className="text-[11px] font-bold text-brand-accent sm:text-xs">
                  {SITE.CATCHPHRASE}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-brand-header-deep">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-1.5 px-6 py-6 pb-10 text-center text-xs text-brand-on-header-muted">
          <p>{SITE.DISCLAIMER}</p>
          <p>
            このアプリは
            <Link
              href={EXTERNAL_LINKS.ORIGINAL_REPO}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brand-on-header"
            >
              オープンソースのソフトウェア（AGPL-3.0）
              <span className="sr-only">（新しいタブで開きます）</span>
            </Link>
            をもとに作成しています
          </p>
          <p>{SITE.COPYRIGHT}</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * フッターのリンク1つ。縦に並ぶので、押し間違えないよう1行の高さを 44px 取る
 * （広い画面では少し詰める）。
 */
function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <Link
      href={link.href as Route}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noreferrer" : undefined}
      className="inline-flex min-h-11 items-center gap-1 text-sm text-brand-on-header-muted hover:text-brand-on-header hover:underline sm:min-h-9"
    >
      {link.label}
      {link.external && (
        <>
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only">（新しいタブで開きます）</span>
        </>
      )}
    </Link>
  );
}
