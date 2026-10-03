"use client";

import { ExternalLink, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { SITE } from "@/config/site";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillTag } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";
import { RubyToggle } from "@/lib/rubyful";
import {
  BILL_FINDER_LINKS,
  buildThemeLinks,
  type HeaderNavLink,
} from "./header-nav";

interface AllMenuProps {
  themes: BillTag[];
  sessionLinks: HeaderNavLink[];
  difficultyLevel: DifficultyLevelEnum;
  showDifficulty: boolean;
}

/** まだ無い機能。リンクにせず「準備中」と添えて並べる。 */
const UPCOMING_FEATURES = [
  "区民投票（1台につき1票）",
  "あなたの投票履歴",
  "議員ごとのページ",
] as const;

const SITE_LINKS: readonly HeaderNavLink[] = [
  { label: "利用規約", href: routes.terms() },
  { label: "プライバシーポリシー", href: routes.privacy() },
  { label: "開発者向け", href: routes.developers() },
];

/**
 * ヘッダー下段の「≡ すべて」。左から開くメニューに、議案の探し方・テーマ・
 * 会期・表示設定・サイトの情報をまとめる（Amazon の「すべて」メニューの位置づけ）。
 */
export function AllMenu({
  themes,
  sessionLinks,
  difficultyLevel,
  showDifficulty,
}: AllMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ヘッダーはページをまたいで残るので、移動したらメニューを閉じる。
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname の変化だけを契機にする
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* 「すべて」だけでは何か分かりにくいので、読み上げでは見える語に続けて補う */}
        <Button
          variant="ghost"
          aria-label="すべて（メニューを開く）"
          className="h-9 shrink-0 gap-1 rounded-sm border border-transparent px-2 text-sm font-bold text-brand-on-header shadow-none hover:border-brand-on-header hover:bg-transparent hover:text-brand-on-header"
        >
          <Menu className="size-5" aria-hidden />
          すべて
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[86%] gap-0 overflow-y-auto bg-white p-0 sm:max-w-sm"
        closeClassName="top-2 right-2 flex size-11 items-center justify-center rounded-md text-brand-on-header opacity-90 data-[state=open]:bg-transparent [&>svg]:size-5"
      >
        <SheetHeader
          data-surface="dark"
          className="gap-1 bg-brand-header px-5 py-4 pr-14 text-brand-on-header"
        >
          <SheetTitle className="flex items-center gap-2 text-lg font-extrabold text-brand-on-header">
            <Image src="/img/logo.svg" alt="" width={28} height={28} />
            {SITE.NAME}
          </SheetTitle>
          <SheetDescription className="text-xs font-bold text-brand-accent">
            {SITE.CATCHPHRASE}
          </SheetDescription>
        </SheetHeader>

        <MenuSection title="議案をさがす">
          <MenuLinks links={BILL_FINDER_LINKS} onNavigate={close} />
        </MenuSection>

        {themes.length > 0 && (
          <MenuSection title="テーマ別">
            <MenuLinks links={buildThemeLinks(themes)} onNavigate={close} />
          </MenuSection>
        )}

        {sessionLinks.length > 0 && (
          <MenuSection title="会期別">
            <MenuLinks links={sessionLinks} onNavigate={close} />
          </MenuSection>
        )}

        <MenuSection title="準備中の機能">
          <ul>
            {UPCOMING_FEATURES.map((label) => (
              <li
                key={label}
                className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm text-mirai-text-muted"
              >
                {label}
                <ComingSoonTag />
              </li>
            ))}
          </ul>
        </MenuSection>

        <MenuSection title="表示設定">
          <div className="flex flex-col gap-3 px-5 py-2">
            <RubyToggle />
            {showDifficulty && (
              <DifficultySelector
                currentLevel={difficultyLevel}
                className="justify-between"
              />
            )}
          </div>
        </MenuSection>

        <MenuSection title="このサイトについて">
          <MenuLinks links={SITE_LINKS} onNavigate={close} />
          <Link
            href={EXTERNAL_LINKS.SHINJUKU_GIKAI}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1 px-5 py-2.5 text-sm text-mirai-text hover:bg-mirai-surface"
          >
            新宿区議会（公式）
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">（新しいタブで開きます）</span>
          </Link>
        </MenuSection>
      </SheetContent>
    </Sheet>
  );
}

/** メニューの1区切り。見出しはメニューの名前（SheetTitle の h2）の下なので h3。 */
function MenuSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-mirai-border border-b py-2 last:border-b-0">
      <h3 className="px-5 pt-2 pb-1 text-base font-bold text-mirai-text">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MenuLinks({
  links,
  onNavigate,
}: {
  links: readonly HeaderNavLink[];
  onNavigate: () => void;
}) {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            onClick={onNavigate}
            className="flex min-h-11 items-center px-5 py-2.5 text-sm text-mirai-text hover:bg-mirai-surface"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
