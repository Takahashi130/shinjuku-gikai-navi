"use client";

import { SendHorizontal } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useRef } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputError,
  PromptInputHint,
  type PromptInputMessage,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-is-desktop";

interface InterviewChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  placeholder: string;
  isResponding: boolean;
  error?: Error | null;
  showHint?: boolean;
}

export function InterviewChatInput({
  input,
  onInputChange,
  onSubmit,
  placeholder,
  isResponding,
  error,
}: InterviewChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "";
    }
  }, [input]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <>
      <PromptInput
        onSubmit={onSubmit}
        className="flex items-end gap-2.5 py-1 pl-6 pr-4 bg-white rounded-[50px] border-mirai-gradient divide-y-0"
      >
        <PromptInputBody className="flex-1">
          <PromptInputTextarea
            ref={textareaRef}
            onChange={handleInputChange}
            value={input}
            placeholder={placeholder}
            rows={1}
            submitOnEnter={isDesktop}
            className="!min-h-0 min-w-0 wrap-anywhere text-base font-medium md:text-sm leading-[1.5em] tracking-[0.01em] placeholder:text-mirai-text-placeholder placeholder:font-medium placeholder:leading-[1.5em] placeholder:tracking-[0.01em] placeholder:no-underline border-none focus:ring-0 bg-transparent shadow-none !py-2 !px-0"
          />
        </PromptInputBody>
        {/* アクセント地にチャコールの矢印（主要な操作のボタンと同じ見た目） */}
        <Button
          type="submit"
          size="icon"
          aria-label="送信"
          disabled={!input || isResponding}
          className="size-10 shrink-0 rounded-full"
        >
          <SendHorizontal className="size-5" aria-hidden />
        </Button>
      </PromptInput>
      <PromptInputError status={error ? "error" : undefined} error={error} />
      {/* {showHint && <PromptInputHint />} */}
      <PromptInputHint>
        個人情報や機密情報は記入しないでください
      </PromptInputHint>
    </>
  );
}
