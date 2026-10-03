import type { Metadata } from "next";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: `プライバシーポリシー | ${SITE.NAME}`,
  description: `${SITE.NAME}のプライバシーポリシー`,
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      className="py-8 md:py-12"
      title="プライバシーポリシー"
      enLabel="Privacy Policy"
      description={`${SITE.NAME}（以下「本サービス」といいます）の運営者（以下「運営者」といいます）は、利用者の情報を次のとおり取り扱います。`}
    >
      <Container className="space-y-8">
        <p className="text-sm text-mirai-text-muted">
          最終更新日：2026年10月3日
        </p>

        <section className="space-y-4">
          <LegalSectionTitle>1. 取得する情報</LegalSectionTitle>
          <LegalParagraph>
            本サービスは会員登録を必要とせず、氏名・メールアドレス・住所などの個人情報を利用者から取得しません。本サービスが取得・保存する情報は次のとおりです。
          </LegalParagraph>
          <LegalList
            items={[
              "アクセスの記録（閲覧したページ、日時、ブラウザの種類、IPアドレスなど）。本サービスを動かしているホスティング事業者のサーバーが自動的に記録します。",
              "表示の設定（説明の詳しさ、ふりがなの表示など）。利用者のブラウザのCookieまたは保存領域に保存し、運営者のサーバーには送信しません。",
              "表示速度の計測データ。個人を特定しない形で集計されます。",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>2. 利用目的</LegalSectionTitle>
          <LegalList
            items={[
              "本サービスの提供・運営",
              "不具合の調査、不正なアクセスへの対応",
              "表示速度や使いやすさの改善",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>3. 第三者への提供と外部サービス</LegalSectionTitle>
          <LegalParagraph>
            法令に基づく場合を除き、取得した情報を第三者に提供しません。なお、本サービスは次の外部サービスを利用しており、アクセスの記録などはそれぞれの事業者の方針に従って処理されます。
          </LegalParagraph>
          <LegalList
            items={[
              "Vercel（本サービスのホスティング、表示速度の計測）",
              "Supabase（議案などのデータの保存）",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>4. Cookie（クッキー）について</LegalSectionTitle>
          <LegalParagraph>
            本サービスは、表示の設定を保存するためにCookieを使用します。ブラウザの設定でCookieを無効にすることもできますが、その場合は表示の設定が保存されないことがあります。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>5. 今後の機能について</LegalSectionTitle>
          <LegalParagraph>
            議案への投票や意見の受付など、利用者の情報を取得する機能を追加する場合は、事前に本ポリシーを改訂し、取得する情報と利用目的をお知らせします。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>6. 改訂</LegalSectionTitle>
          <LegalParagraph>
            本ポリシーは必要に応じて改訂します。改訂後の内容は、本ページに掲載した時点から適用します。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>7. お問い合わせ</LegalSectionTitle>
          <LegalParagraph>お問い合わせ窓口は現在準備中です。</LegalParagraph>
        </section>
      </Container>
    </LegalPageLayout>
  );
}
