import { FileText } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BillThumbnailProps {
  src: string | null | undefined;
  /** next/image の sizes。表示幅に合わせて小さい画像を取らせる。 */
  sizes: string;
  /** 外枠の大きさ・角丸など。中身は枠いっぱいに広げる。 */
  className?: string;
  priority?: boolean;
}

/**
 * 議案のサムネイル。画像が無い議案は、同じ大きさの淡い枠に書類のアイコンを出す。
 * 枠ごと消すと、一覧や棚の中でカードの高さが揃わなくなる。
 *
 * 画像は飾りなので alt は空にする（タイトルは隣に文字で出している）。
 */
export function BillThumbnail({
  src,
  sizes,
  className,
  priority,
}: BillThumbnailProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-mirai-surface",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <FileText
            className="size-1/3 max-h-12 max-w-12 text-mirai-text-placeholder"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
