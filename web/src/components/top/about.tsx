import Image from "next/image";
import { SITE } from "@/config/site";

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="About"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            {SITE.NAME}とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-3">
          <h3 className="text-2xl font-bold leading-[43.2px]">
            新宿区議会での議論を
            <br />
            できる限りわかりやすく
          </h3>
          <p className="text-[15px] leading-[28px] text-black">
            {SITE.NAME}
            は、新宿区議会でどんな議案が審議され、どの会派が賛成・反対したのかをわかりやすく伝えるアプリです。区民が区政を身近に感じ、参加できるようにすることを目指して、継続的にアップデートしていきます。
          </p>
        </div>
      </div>
    </div>
  );
}
