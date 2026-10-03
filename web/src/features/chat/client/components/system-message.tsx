import type { UIMessage } from "@ai-sdk/react";
import type { ComponentProps } from "react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";

type RehypePlugins = ComponentProps<typeof Response>["rehypePlugins"];

interface SystemMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  rehypePlugins?: RehypePlugins;
}

export function SystemMessage({
  message,
  isStreaming,
  rehypePlugins,
}: SystemMessageProps) {
  return (
    <Message from="assistant" className="justify-start py-0">
      <MessageContent
        variant="flat"
        className="text-sm font-medium leading-[1.8] text-mirai-text"
      >
        {message.parts.map((part, i: number) => {
          if (part.type === "text") {
            return (
              <Response
                key={`${message.id}-${i}`}
                className="break-words"
                rehypePlugins={rehypePlugins}
              >
                {part.text}
              </Response>
            );
          }
          if (part.type === "reasoning") {
            return (
              <Reasoning
                key={`${message.id}-${i}`}
                className="w-full"
                isStreaming={isStreaming && i === message.parts.length - 1}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}
