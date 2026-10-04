"use client";

import { createBrowserClient } from "@mirai-gikai/supabase";
import { useEffect, useState } from "react";
import { singleFlight } from "@/lib/utils/single-flight";
import { shouldStartAnonymousSession } from "../../shared/utils/should-start-anonymous-session";

// Create a singleton Supabase client with persistent session
const supabase = createBrowserClient();

/** タブをまたいで匿名サインインを1つずつ行うための Web Locks の名前 */
const ANONYMOUS_SIGN_IN_LOCK = "shinjuku-navi:anonymous-sign-in";

/**
 * ログイン状態があればその ID、無ければ匿名でサインインした ID（失敗したら null）。
 *
 * getUser が通信の失敗やサーバーのエラーで本人を確かめられなかっただけのときは、
 * サインインし直さずに null を返す（shouldStartAnonymousSession）。サインインし
 * 直すと、保存してある前の匿名 ID を上書きし、前の票を取り消せなくなるため。
 */
async function signInAnonymouslyIfNeeded(): Promise<string | null> {
  // Check if user already exists（ほかのタブがサインインした直後なら、その Cookie を読む）
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (user) {
    return user.id;
  }

  if (!shouldStartAnonymousSession(userError)) {
    console.error("Could not verify the current user:", userError);
    return null;
  }

  // No valid session -> sign in anonymously
  const { data, error: signInError } = await supabase.auth.signInAnonymously();

  if (signInError) {
    console.error("Error creating anonymous user:", signInError);
    return null;
  }

  return data.user?.id ?? null;
}

/**
 * 同じ名前のロックを持つ処理を、タブをまたいで1つずつ実行する。
 * Web Locks API が使えないブラウザでは、そのまま実行する。
 */
async function withCrossTabLock<T>(
  name: string,
  run: () => Promise<T>
): Promise<T> {
  const locks =
    typeof navigator !== "undefined" && "locks" in navigator
      ? navigator.locks
      : undefined;
  if (!locks) return run();
  return (await locks.request(name, () => run())) as T;
}

/**
 * 同時の呼び出しを1回にまとめる。
 * - 同じページ内：実行中の Promise を共有する（2つのカードを同時に押しても1回）
 * - タブをまたぐ：ロックの中でログイン状態を確かめ直してからサインインする
 * こうしないと、未ログインの状態で同時に押したときに匿名ユーザーが2つでき、
 * 1つのブラウザから同じ議案に2票入ってしまう。
 */
const ensureAnonymousUserOnce = singleFlight(() =>
  withCrossTabLock(ANONYMOUS_SIGN_IN_LOCK, signInAnonymouslyIfNeeded)
);

/**
 * 匿名ユーザーを用意して、その ID を返す（失敗したら null）。
 *
 * すでにログイン状態があればそれを使い、無ければ匿名でサインインする。
 * 区民投票などでは、ページを開いただけで匿名ユーザーを作らないよう、
 * ボタンを押したときにだけこの関数を呼ぶ。
 */
export async function ensureAnonymousSupabaseUser(): Promise<string | null> {
  try {
    return await ensureAnonymousUserOnce();
  } catch (err) {
    console.error("Error ensuring anonymous user:", err);
    return null;
  }
}

/**
 * Hook to ensure an anonymous Supabase user exists and return the user ID
 * This will automatically create an anonymous user if none exists
 */
export function useAnonymousSupabaseUser() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    ensureAnonymousSupabaseUser().then((id) => {
      if (id) setUserId(id);
    });
  }, []);

  return userId;
}
