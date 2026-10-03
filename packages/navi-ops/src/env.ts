/**
 * 書き込み先の Supabase を決める。秘密の値は表示しない。
 *
 * - dev（既定）：ルートの .env（SUPABASE_URL / SUPABASE_SECRET_KEY）。
 *   .env.supabase-dev があれば、その project ref を指していることを確かめる。
 *   本番の project ref を指していたら止める。
 * - prod：.env.supabase-prod（SUPABASE_URL か SUPABASE_PROJECT_REF、SUPABASE_SECRET_KEY）。
 *   書き込む前に毎回確認する（cli.ts）。
 */

export type TargetEnv = "dev" | "prod";

export type SupabaseTarget = {
  env: TargetEnv;
  url: string;
  secretKey: string;
  /** 表示用（URL のホスト名だけ） */
  label: string;
  /** 書き込み後に画面のキャッシュを消すための設定（あれば） */
  webUrl: string | null;
  revalidateSecret: string | null;
};

/** KEY=VALUE 形式の .env を読む（# のコメント行と空行は無視、値の両端の引用符は外す） */
export function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line
      .slice(0, eq)
      .replace(/^export\s+/, "")
      .trim();
    let value = line.slice(eq + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(不正な URL)";
  }
}

const isLocal = (url: string) =>
  /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url);

export function resolveSupabaseTarget(
  env: TargetEnv,
  files: {
    dotenv: Record<string, string>;
    dev: Record<string, string> | null;
    prod: Record<string, string> | null;
  }
): SupabaseTarget {
  const prodRef = files.prod?.SUPABASE_PROJECT_REF ?? null;
  if (env === "dev") {
    const url = files.dotenv.SUPABASE_URL;
    const secretKey = files.dotenv.SUPABASE_SECRET_KEY;
    if (!url || !secretKey)
      throw new Error(
        ".env に SUPABASE_URL と SUPABASE_SECRET_KEY がありません"
      );
    if (prodRef && url.includes(prodRef)) {
      throw new Error(
        ".env が本番の Supabase を指しています。開発用に直してから実行してください"
      );
    }
    const devRef = files.dev?.SUPABASE_PROJECT_REF ?? null;
    if (devRef && !url.includes(devRef) && !isLocal(url)) {
      throw new Error(
        ".env が開発用の Supabase（.env.supabase-dev）を指していません"
      );
    }
    return {
      env,
      url,
      secretKey,
      label: hostOf(url),
      webUrl: files.dotenv.NEXT_PUBLIC_WEB_URL || null,
      revalidateSecret: files.dotenv.REVALIDATE_SECRET || null,
    };
  }

  if (!files.prod) throw new Error(".env.supabase-prod がありません");
  const url =
    files.prod.SUPABASE_URL ||
    (prodRef ? `https://${prodRef}.supabase.co` : "");
  const secretKey = files.prod.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      ".env.supabase-prod に SUPABASE_URL（または SUPABASE_PROJECT_REF）と SUPABASE_SECRET_KEY がありません"
    );
  }
  return {
    env,
    url,
    secretKey,
    label: hostOf(url),
    webUrl: files.prod.NEXT_PUBLIC_WEB_URL || null,
    revalidateSecret: files.prod.REVALIDATE_SECRET || null,
  };
}
