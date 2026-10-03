"use client";

import { ArrowUp, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { SITE } from "@/config/site";
import { isInterviewPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import {
  type FooterLink,
  footerExternalLinks,
  footerSiteLinks,
} from "./footer.config";

/**
 * サイト共通のフッター（濃色の帯）。
 *
 * 上からロゴの枠とリンク → 外部サイト → 免責文言と著作権表示。
 * 免責文言（SITE.DISCLAIMER）と元のソフトウェアのライセンス表示は、元の
 * ソフトウェア（AGPL-3.0）の追加条件で求められているので必ず残す。
 */
export function Footer() {
  const pathname = usePathname();

  if (isInterviewPage(pathname)) {
    return null;
  }

  return (
    <footer
      data-surface="dark"
      className="bg-brand-header text-brand-on-header"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 pb-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
          <Link
            href={routes.home()}
            aria-label={`${SITE.NAME} トップページ`}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-white px-4 py-2 text-mirai-text shadow-sm"
          >
            <Image src="/img/logo.svg" alt="" width={28} height={28} />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-extrabold">{SITE.NAME}</span>
              <span className="text-[11px] text-mirai-text-muted">
                {SITE.CATCHPHRASE}
              </span>
            </span>
          </Link>

          <nav aria-label="フッター" className="max-w-2xl">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 md:justify-end">
              {footerSiteLinks.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 md:justify-end">
          {footerExternalLinks.map((link) => (
            <li key={link.href}>
              <FooterLinkItem link={link} />
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-1.5 border-brand-header-hover border-t pt-6 text-center text-xs leading-relaxed text-brand-on-header-muted">
          <p>
            掲載している議案の情報は、新宿区議会が公開している資料をもとに整理したものです。新宿区・新宿区議会の公式サービスではありません。
          </p>
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
          {/* ヘッダーに id="top" を付けている */}
          <a
            href="#top"
            className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-bold text-brand-on-header hover:underline"
          >
            <ArrowUp className="size-3.5" aria-hidden />
            ページの先頭へ
          </a>
        </div>
      </div>
    </footer>
  );
}

/**
 * フッターのリンク1つ。折り返して並ぶので、押し間違えないよう1行の高さを
 * 44px 取る（広い画面では少し詰める）。
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
      {link.comingSoon && <ComingSoonTag tone="dark" />}
      {link.external && (
        <>
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only">（新しいタブで開きます）</span>
        </>
      )}
    </Link>
  );
}
