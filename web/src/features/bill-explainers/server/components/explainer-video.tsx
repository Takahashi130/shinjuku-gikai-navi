import "server-only";

import { Clapperboard } from "lucide-react";
import { LabelPill } from "@/components/ui/label-pill";
import { EXPLAINER_VIDEOS } from "../../shared/utils/explainer-videos";

/**
 * 事前解説の動画。動画がある議案だけに出す（無ければ何も出さない）。
 * 動画の上に、何がわかる動画なのかを3行ほどで書く。
 */
export function ExplainerVideo({ billId }: { billId: string }) {
  const video = EXPLAINER_VIDEOS[billId];
  if (!video) return null;

  return (
    <section
      aria-labelledby="explainer-video-title"
      className="flex flex-col gap-3 rounded-2xl border border-brand-accent-light bg-brand-accent-tint/50 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="explainer-video-title"
          className="flex items-center gap-2 text-lg font-extrabold text-mirai-text"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-band text-white">
            <Clapperboard className="size-4" aria-hidden />
          </span>
          事前解説の動画
        </h2>
        <LabelPill tone="outline">{video.length}</LabelPill>
      </div>
      <ul className="flex flex-col gap-1 text-sm leading-relaxed text-mirai-text-secondary">
        {video.description.map((line) => (
          <li key={line} className="flex gap-2">
            <span
              aria-hidden
              className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-band"
            />
            {line}
          </li>
        ))}
      </ul>
      {/* biome-ignore lint/a11y/useMediaCaption: 字幕は動画の中に焼き込んでいる */}
      <video
        controls
        preload="metadata"
        poster={video.poster}
        className="aspect-video w-full rounded-2xl bg-brand-header shadow-md"
      >
        <source src={video.src} type="video/mp4" />
      </video>
      <p className="text-xs text-mirai-text-muted">
        ※ 字幕は動画の中に表示しています。音声は合成音声です。
      </p>
    </section>
  );
}
