/** getUser() が返すエラーのうち、判断に使う部分（Supabase Auth の AuthError） */
export type AuthUserLookupError = {
  name?: string;
  status?: number;
} | null;

/**
 * getUser() で本人が見つからなかったときに、新しい匿名 ID でサインインしてよいか。
 *
 * 新しくサインインすると、ブラウザに保存してある前の匿名 ID（Cookie）を
 * 上書きする。前の ID で入れた票はそのブラウザから取り消せなくなり、同じ議案に
 * もう1票入れられてしまう。そのため、サインインするのは「ログイン状態が無い」
 * か「保存してあるログイン状態が使えない」とサーバーが答えたときだけにする。
 *
 * - エラーなし・AuthSessionMissingError：ログイン状態が無い → サインインする
 * - 4xx の AuthApiError（無効なトークン・消えたユーザーなど）→ サインインする
 * - 通信の失敗・5xx（AuthRetryableFetchError・500 番台）・形の分からないエラー
 *   → サインインしない（前の ID を残す。時間をおいてやり直してもらう）
 */
export function shouldStartAnonymousSession(
  error: AuthUserLookupError
): boolean {
  if (error === null) return true;
  if (error.name === "AuthSessionMissingError") return true;
  if (error.name === "AuthApiError") {
    return (
      typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500
    );
  }
  return false;
}
