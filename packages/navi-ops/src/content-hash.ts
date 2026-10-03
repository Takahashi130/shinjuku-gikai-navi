import { createHash } from "node:crypto";
import { stableStringify } from "@mirai-gikai/shared/bill-explainer/stable-json";
import type { ExplainerFile } from "@mirai-gikai/shared/bill-explainer/schema";

/** 解説の中身（body と sources）のハッシュ。公開後に内容が変わったかを見分ける */
export function explainerContentHash(
  file: Pick<ExplainerFile, "body" | "sources">
): string {
  const json = stableStringify({ body: file.body, sources: file.sources });
  return `sha256:${createHash("sha256").update(json).digest("hex")}`;
}
