"use client";

import Script from "next/script";
import { sendFuriganaStateEvent } from "@/lib/analytics/preference-state-events";
import { useOnPageView } from "@/lib/analytics/use-on-page-view";
import { rubyfulClient } from "./index";
import { RUBYFUL_SELECTOR } from "./selector";
import "./styles.css";

declare global {
  interface Window {
    RubyfulV2?: {
      init: (config: {
        selector: string;
        defaultDisplay: boolean;
        observeChanges?: boolean;
        styles?: object;
      }) => void;
    };
  }
}

export function RubyfulInitializer() {
  // レイアウトに常時マウントされるこのコンポーネントで、
  // 現在のふりがな表示設定をページ表示のたびにGAへ送る
  // (RubyToggleはPopoverContent内にありポップオーバーを
  //  開くまでマウントされないため、送信元には適さない)
  useOnPageView(() => {
    sendFuriganaStateEvent(rubyfulClient.getIsEnabledFromStorage());
  });

  return (
    <Script
      src="https://rubyful-v2.s3.ap-northeast-1.amazonaws.com/v2/rubyful.js?t=20250507022654"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== "undefined" && window.RubyfulV2) {
          const isEnabled = rubyfulClient.getIsEnabledFromStorage();
          if (!isEnabled) return;
          // Rubyful V2を初期化
          //
          // 【注意】このセレクタに一致した要素は、Rubyful に innerHTML を
          // 丸ごと差し替えられる。React が持っていた子ノードはその時点で
          // DOM から外れるため、下記のタグの直下にマウント後に出し入れされる
          // 子要素（`{cond && <span/>}` や `{cond && "…"}`）を置いてはいけない。
          // 置くと React が消えたノードに removeChild を試みて
          // NotFoundError になり、ページごとエラーバウンダリに落ちる。
          //
          // 実際に ClampedQuote がこれを踏み、ふりがな表示ONのとき
          // 引用を持つ議案詳細ページが表示されなくなっていた。
          // 動的に変わるテキストは、条件付きの子要素ではなく
          // ひとつの文字列にまとめて描くか、要素の key を変えて作り直すこと
          // （作り直した要素は Rubyful が改めて処理する）。
          // テストでは simulate-rubyful.ts で同じ差し替えをまねて確かめる。
          window.RubyfulV2.init({
            selector: RUBYFUL_SELECTOR,
            defaultDisplay: true,
            observeChanges: true,
            styles: {
              toggleButtonClass: "ruby-button",
            },
          });
        }
      }}
    />
  );
}
