import { SITE } from "@/config/site";

/** トップの最後に置く「新宿区議会ナビとは」。 */
export function About() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-mirai-text md:text-xl">
        {SITE.NAME}とは
      </h2>
      <p className="text-sm leading-relaxed text-mirai-text">
        {SITE.NAME}
        は、新宿区議会でどんな議案が審議され、どの会派が賛成・反対したのかをわかりやすく伝えるアプリです。区民が議案を知り、自分の考えを示し、議会の議決と見比べられること（直接民主主義をあなたの手に）を目指して、継続的にアップデートしていきます。
      </p>
    </div>
  );
}
