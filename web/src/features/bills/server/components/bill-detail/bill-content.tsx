import { parseMarkdown } from "@/lib/markdown";

interface BillContentProps {
  /** 解説の Markdown。構造化して別に出した節（議決結果など）は取り除いて渡す。 */
  markdown: string | null | undefined;
}

/**
 * 議案の解説の本文。白いページの上に、見出しと罫線で節を区切って出す。
 */
export async function BillContent({ markdown }: BillContentProps) {
  if (!markdown) {
    return null;
  }

  const content = await parseMarkdown(markdown);

  return (
    <div
      className="
            markdown-content max-w-none text-[15px] text-mirai-text
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-mirai-border
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
            [&_h4]:text-base [&_h4]:font-bold [&_h4]:mt-6 [&_h4]:mb-2
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:mb-2
            [&_a]:text-brand-link [&_a]:!underline [&_a]:!underline-offset-[3px]
            [&_a:hover]:text-brand-link-hover
            [&_blockquote]:border-l-4 [&_blockquote]:border-mirai-border
            [&_blockquote]:pl-4
            [&_pre]:bg-mirai-surface [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto
            [&_code]:bg-mirai-surface [&_code]:px-1 [&_code]:rounded
            [&_section]:mb-8
            [&_section]:break-all
            [&_section>*:last-child]:mb-0
            [&_iframe.youtube-embed]:w-full [&_iframe.youtube-embed]:aspect-video [&_iframe.youtube-embed]:mb-4
            [&_iframe.youtube-embed]:rounded-lg
          "
    >
      {content}
    </div>
  );
}
