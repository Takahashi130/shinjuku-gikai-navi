"use client";

import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SlideSourceRef } from "../../shared/types";

/** 出典のパネルに出す内容（押した項目ごと） */
export type SourceSheetTarget = {
  /** 例：区が説明している効果 */
  heading: string;
  text: string;
  sources: SlideSourceRef[];
  evidence: string[];
};

interface ExplainerSourceSheetProps {
  target: SourceSheetTarget | null;
  onClose: () => void;
}

/**
 * 項目の根拠（資料からの抜き出し）と出典を、下から出るパネルで見せる。
 * リンクは区の HTML ページにし、PDF へは直接リンクしない（区のお願いに沿う）。
 */
export function ExplainerSourceSheet({
  target,
  onClose,
}: ExplainerSourceSheetProps) {
  return (
    <Sheet
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] max-w-2xl overflow-y-auto rounded-t-2xl"
      >
        {target && (
          <>
            <SheetHeader className="pr-10">
              <SheetTitle>出典と根拠</SheetTitle>
              <SheetDescription className="line-clamp-3">
                {target.heading}：{target.text}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-8">
              {target.evidence.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold">資料の記載（抜き出し）</h3>
                  <ul className="space-y-2">
                    {target.evidence.map((quote) => (
                      <li key={quote}>
                        <blockquote className="border-l-4 border-primary bg-muted py-2 pr-2 pl-3 text-sm leading-relaxed">
                          「{quote}」
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="space-y-2">
                <h3 className="text-sm font-bold">資料</h3>
                <ul className="space-y-2">
                  {target.sources.map((source) => (
                    <li key={source.id} className="rounded-lg border p-3">
                      <p className="text-sm font-bold">{source.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.kindLabel}
                        {source.pagesLabel && `・${source.pagesLabel}`}
                      </p>
                      <a
                        href={source.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline"
                      >
                        新宿区のページを開く
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">
                          （新しいタブで開きます）
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  PDF
                  の資料は、リンク先の新宿区のページから開けます。抜き出しは、資料の文字をそのまま短く引用したものです。
                </p>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
