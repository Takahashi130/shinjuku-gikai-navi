/**
 * 新宿区議会「代表質問・一般質問（質問者・質問内容一覧）」ページのパーサー
 * 例: https://www.city.shinjuku.lg.jp/kusei/file08_05_0005420210602_00020.html
 *
 * ページの形:
 *   代表質問 9月16日（水曜日）
 *   ひやま 真一議員（自民・参政クラブ）
 *   【一問一答方式】
 *   1 令和7年度の行財政運営について【区長】
 *   一般質問 9月17日（木曜日）
 *   ...
 * 会期によって「議員」が抜ける、「日」が抜ける、番号の後の空白が無い、括弧が半角、などの揺れがある。
 */
import { cleanFactionName, cleanMemberName } from "./normalize-member-name";
import { mainContentLines } from "./page-content";

export type QuestionType = "representative" | "general";
export type AnswerStyle = "one_by_one" | "bulk";

export type QuestionTopic = {
  number: number;
  title: string;
  /** 答弁を求めた相手（区長・教育委員会など） */
  responders: string[];
};

export type PlenaryQuestion = {
  questionType: QuestionType;
  /** YYYY-MM-DD */
  askedOn: string;
  speakerName: string;
  factionName: string | null;
  answerStyle: AnswerStyle | null;
  topics: QuestionTopic[];
};

const SECTION = /^(代表質問|一般質問)\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/;
const STYLE = /^【\s*(一問一答|一括)(?:方式)?\s*】$/;
const SPEAKER = /^([^\d（()）【】][^（()）【】]*?)\s*(?:議員)?\s*[（(]([^（()）]+)[）)]$/;
const RESPONDERS = /((?:\s*【[^】]+】)+)\s*$/;

/** 質問の行の番号と題名・答弁者を読む。番号は前の題名の次の番号を優先する（「1決算」のように空白が無い場合がある） */
function parseTopicLine(line: string, expected: number): QuestionTopic | null {
  let number: number;
  let rest: string;
  if (line.startsWith(String(expected)) && !/^\d/.test(line.slice(String(expected).length))) {
    number = expected;
    rest = line.slice(String(expected).length);
  } else {
    const m = line.match(/^(\d{1,2})\s+(.+)$/);
    if (!m) return null;
    number = Number(m[1]);
    rest = m[2];
  }
  rest = rest.trim();
  const r = rest.match(RESPONDERS);
  const responders = r ? [...r[1].matchAll(/【([^】]+)】/g)].map((x) => x[1].trim()) : [];
  const title = (r ? rest.slice(0, r.index) : rest).trim();
  if (!title) return null;
  return { number, title, responders };
}

/**
 * @param html 質問者・質問内容一覧のページ
 * @param sessionStartDate 会期の初日（YYYY-MM-DD）。ページには月日しかないため年を補う
 */
export function parseQuestionPage(
  html: string,
  sessionStartDate: string
): { questions: PlenaryQuestion[]; skippedLines: string[] } {
  const [startYear, startMonth] = sessionStartDate.split("-").map(Number);
  const questions: PlenaryQuestion[] = [];
  const skippedLines: string[] = [];
  let section: { type: QuestionType; date: string } | null = null;
  let current: PlenaryQuestion | null = null;

  for (const line of mainContentLines(html)) {
    const s = line.match(SECTION);
    if (s) {
      const month = Number(s[2]);
      // 年をまたぐ会期（11月開会で1月に質問、など）に備える
      const year = month < startMonth ? startYear + 1 : startYear;
      section = {
        type: s[1] === "代表質問" ? "representative" : "general",
        date: `${year}-${String(month).padStart(2, "0")}-${s[3].padStart(2, "0")}`,
      };
      current = null;
      continue;
    }
    if (!section) continue;

    const style = line.match(STYLE);
    if (style && current) {
      current.answerStyle = style[1] === "一括" ? "bulk" : "one_by_one";
      continue;
    }

    if (current) {
      const topic = parseTopicLine(line, current.topics.length + 1);
      if (topic) {
        current.topics.push(topic);
        continue;
      }
    }

    if (/質問時間一覧|PDF/.test(line)) continue;
    const speaker = line.match(SPEAKER);
    if (!speaker) {
      skippedLines.push(line);
      continue;
    }
    current = {
      questionType: section.type,
      askedOn: section.date,
      speakerName: cleanMemberName(speaker[1]),
      factionName: cleanFactionName(speaker[2]),
      answerStyle: null,
      topics: [],
    };
    questions.push(current);
  }
  return { questions, skippedLines };
}

/**
 * 会期ページから「質問者・質問内容一覧」「質問者一覧」「※2月19日、20日質問内容」のページへのリンクを取り出す
 * （PDF は除く）
 */
export function extractQuestionPageLinks(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const text = m[2].replace(/<[^>]+>/g, "");
    if (!/質問者|質問内容/.test(text) || /\.pdf$/i.test(m[1])) continue;
    const url = new URL(m[1], pageUrl).toString();
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}
