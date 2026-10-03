import { describe, expect, it } from "vitest";
import { parseDotenv, resolveSupabaseTarget } from "./env";

describe("parseDotenv", () => {
  it("KEY=VALUE を読み、コメント・空行・引用符を扱う", () => {
    expect(
      parseDotenv("# c\n\nA=1\nexport B=\"two=2\"\nC='x'\nbroken\n")
    ).toEqual({ A: "1", B: "two=2", C: "x" });
  });
});

describe("resolveSupabaseTarget", () => {
  const dev = { SUPABASE_PROJECT_REF: "devref" };
  const prod = {
    SUPABASE_PROJECT_REF: "prodref",
    SUPABASE_SECRET_KEY: "prod-secret",
  };

  it("dev は .env の接続先を使い、開発用の ref を確かめる", () => {
    const t = resolveSupabaseTarget("dev", {
      dotenv: {
        SUPABASE_URL: "https://devref.supabase.co",
        SUPABASE_SECRET_KEY: "s",
      },
      dev,
      prod,
    });
    expect(t).toMatchObject({
      env: "dev",
      url: "https://devref.supabase.co",
      label: "devref.supabase.co",
    });
  });

  it("dev で .env が本番を指していたら止める", () => {
    expect(() =>
      resolveSupabaseTarget("dev", {
        dotenv: {
          SUPABASE_URL: "https://prodref.supabase.co",
          SUPABASE_SECRET_KEY: "s",
        },
        dev,
        prod,
      })
    ).toThrow("本番");
  });

  it("dev で .env が開発用でもローカルでもなければ止める", () => {
    expect(() =>
      resolveSupabaseTarget("dev", {
        dotenv: {
          SUPABASE_URL: "https://other.supabase.co",
          SUPABASE_SECRET_KEY: "s",
        },
        dev,
        prod: null,
      })
    ).toThrow("開発用");
    expect(
      resolveSupabaseTarget("dev", {
        dotenv: {
          SUPABASE_URL: "http://127.0.0.1:54421",
          SUPABASE_SECRET_KEY: "s",
        },
        dev,
        prod: null,
      }).label
    ).toBe("127.0.0.1:54421");
  });

  it("prod は .env.supabase-prod の ref から URL を作る", () => {
    const t = resolveSupabaseTarget("prod", { dotenv: {}, dev, prod });
    expect(t).toMatchObject({
      env: "prod",
      url: "https://prodref.supabase.co",
      secretKey: "prod-secret",
    });
  });

  it("prod の設定が無ければ止める", () => {
    expect(() =>
      resolveSupabaseTarget("prod", { dotenv: {}, dev, prod: null })
    ).toThrow(".env.supabase-prod");
  });
});
