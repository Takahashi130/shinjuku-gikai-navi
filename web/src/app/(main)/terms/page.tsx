import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: `利用規約 | ${SITE.NAME}`,
  description: `${SITE.NAME}の利用規約`,
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="利用規約"
      enLabel="Terms of Service"
      description={`${SITE.NAME}（以下「本サービス」といいます）の利用条件を定めるものです。`}
      className="py-8 md:py-12"
    >
      <Container className="space-y-8">
        <LegalParagraph className="text-sm text-mirai-text-muted">
          最終更新日：2026年10月3日
        </LegalParagraph>

        <LegalParagraph>
          本サービスは個人（以下「運営者」といいます）が運営する非公式のサービスです。新宿区および新宿区議会の公式サービスではありません。また、
          {SITE.DISCLAIMER}
          。本サービスを利用した時点で、本規約に同意したものとみなします。
        </LegalParagraph>

        <section className="space-y-4">
          <LegalSectionTitle>第1条（本サービスの内容）</LegalSectionTitle>
          <LegalParagraph>
            本サービスは、新宿区議会が公開している資料（会期ごとの議案一覧、議案の概要と審議結果など）をもとに、議案の内容、議決結果、会派ごとの賛否を整理して掲載するものです。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第2条（掲載情報について）</LegalSectionTitle>
          <LegalList
            items={[
              "運営者は掲載情報の正確性に努めますが、その正確性・完全性・最新性を保証しません。公開資料の自動読み取りによる誤りや、元の資料の誤りが含まれることがあります。",
              "正確な情報は、新宿区議会の公式資料でご確認ください。",
              "掲載情報を利用したことによって生じた損害について、運営者は責任を負いません。ただし、運営者の故意または重大な過失による場合はこの限りではありません。",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第3条（禁止事項）</LegalSectionTitle>
          <LegalParagraph>
            利用者は、本サービスの利用にあたり、次の行為をしてはなりません。
          </LegalParagraph>
          <LegalList
            items={[
              "法令または公序良俗に反する行為",
              "過度なアクセス、不正アクセス、脆弱性を突く行為など、本サービスの運営を妨げる行為",
              "掲載情報を改変し、新宿区・新宿区議会または本サービスの公式な情報であるかのように示す行為",
              "その他、運営者が不適切と判断する行為",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>
            第4条（ソースコードとライセンス）
          </LegalSectionTitle>
          <LegalParagraph>
            本サービスのソースコードは、AGPL-3.0 ライセンスで
            <Link
              href={EXTERNAL_LINKS.GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              公開しています
            </Link>
            。本サービスは、AGPL-3.0 で公開されている
            <Link
              href={EXTERNAL_LINKS.ORIGINAL_REPO}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              オープンソースのソフトウェア
            </Link>
            をもとに作成しています。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第5条（サービスの変更・停止）</LegalSectionTitle>
          <LegalParagraph>
            運営者は、事前の通知なく本サービスの内容を変更し、または提供を停止することがあります。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第6条（規約の変更）</LegalSectionTitle>
          <LegalParagraph>
            運営者は必要に応じて本規約を変更します。変更後の規約は、本ページに掲載した時点から適用します。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第7条（準拠法・管轄）</LegalSectionTitle>
          <LegalParagraph>
            本規約は日本法に準拠し、本サービスに関して紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>お問い合わせ</LegalSectionTitle>
          <LegalParagraph>お問い合わせ窓口は現在準備中です。</LegalParagraph>
        </section>
      </Container>
    </LegalPageLayout>
  );
}
