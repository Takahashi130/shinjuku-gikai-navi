"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { RubyToggle } from "@/lib/rubyful";

interface DisplaySettingsProps {
  difficultyLevel: DifficultyLevelEnum;
  /** 説明の詳しさは議案の解説があるページでだけ意味を持つので、そこでだけ出す。 */
  showDifficulty: boolean;
}

/**
 * ヘッダー右上の「表示設定」。ふりがなと説明の詳しさを切り替える。
 * （Amazon の言語切り替えの位置づけ）
 */
export function DisplaySettings({
  difficultyLevel,
  showDifficulty,
}: DisplaySettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label={
            showDifficulty
              ? "表示設定（ふりがな・説明の詳しさ）"
              : "表示設定（ふりがな）"
          }
          className="h-auto min-h-10 gap-1 rounded-sm border border-transparent px-2 py-1 text-brand-on-header shadow-none hover:border-brand-on-header hover:bg-transparent hover:text-brand-on-header"
        >
          <Settings2 className="size-5 md:hidden" aria-hidden />
          <span className="hidden flex-col items-start leading-tight md:flex">
            <span className="text-[11px] font-medium text-brand-on-header-muted">
              {showDifficulty ? "ふりがな・説明" : "ふりがな"}
            </span>
            <span className="flex items-center gap-0.5 text-sm font-bold">
              表示設定
              <ChevronDown className="size-3.5" aria-hidden />
            </span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <p className="text-sm font-bold text-mirai-text">表示設定</p>
        <RubyToggle />
        {showDifficulty && (
          <DifficultySelector
            currentLevel={difficultyLevel}
            className="justify-between"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
