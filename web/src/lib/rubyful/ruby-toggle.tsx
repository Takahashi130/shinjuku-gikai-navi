"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { useRubyToggle } from "./use-ruby-toggle";

interface RubyToggleProps {
  className?: string;
}

export function RubyToggle({ className }: RubyToggleProps) {
  const { rubyEnabled, handleRubyToggle } = useRubyToggle();
  const labelId = useId();

  // 見えている「ふりがなを表示」をそのままスイッチの名前にする。音声操作で
  // 見えている語を言えば押せるようにする（WCAG 2.5.3）。
  return (
    <div className={`flex items-center justify-between space-x-4 ${className}`}>
      <div className="space-y-0.5">
        <div id={labelId} className="text-sm font-bold">
          ふりがなを表示
        </div>
      </div>
      <Switch
        checked={rubyEnabled}
        onCheckedChange={handleRubyToggle}
        aria-labelledby={labelId}
      />
    </div>
  );
}
