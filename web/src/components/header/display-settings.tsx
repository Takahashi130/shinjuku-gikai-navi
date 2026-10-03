"use client";

import { Settings2 } from "lucide-react";
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
 * 狭い画面では歯車のアイコンだけにする。
 */
export function DisplaySettings({
  difficultyLevel,
  showDifficulty,
}: DisplaySettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={
            showDifficulty
              ? "表示設定（ふりがな・説明の詳しさ）"
              : "表示設定（ふりがな）"
          }
          className="size-11 gap-1.5 rounded-full border-line-soft p-0 text-[13px] shadow-none md:w-auto md:px-3.5"
        >
          <Settings2 className="size-[18px]" aria-hidden />
          <span className="hidden md:inline">表示設定</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4 rounded-2xl">
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
