-- 本会議の質問と、会派の政務活動費（区のデータ）
--
-- 取り込み処理（packages/shinjuku-importer の questions / expenses）が区の公開ページから書き込む。
-- - plenary_questions: 定例会ごとの「代表質問・一般質問（質問者・質問内容一覧）」ページ。
--   1人の議員の1回の質問を1行とし、質問の題名と答弁者を topics に持つ。
--   今の議員名簿に無い議員（元議員）の質問も残し、member_id は null にする。
--   委員会での質問は含めない（会議録システムは自動取得が禁止されているため）。
-- - faction_activity_expenses: 「政務活動費収支一覧」の会派ごとの収支。
--   区は会派に交付しているため、議員個人の金額は公表されていない。
--   出典は区の HTML ページ（PDF には直接リンクしない）。

create table plenary_questions (
  id uuid primary key default gen_random_uuid(),
  diet_session_id uuid references diet_sessions(id) on delete set null,
  -- 会期の slug（r8-teirei-3 など。diet_sessions.slug と同じ作り方）
  session_slug text not null,
  -- 会期名（令和8年第3回定例会）
  session_title text not null,
  question_type text not null check (question_type in ('representative', 'general')),
  asked_on date not null,
  -- 今の議員名簿にある議員なら member_id が入る
  member_id uuid references members(id) on delete set null,
  -- ページの表記（質問した時点の名前）
  speaker_name text not null,
  -- ページの表記（質問した時点の会派）
  faction_name text,
  faction_id uuid references factions(id) on delete set null,
  -- one_by_one: 一問一答方式 / bulk: 一括方式 / null: ページに記載なし
  answer_style text check (answer_style in ('one_by_one', 'bulk')),
  -- [{ "number": 1, "title": "…について", "responders": ["区長", "教育委員会"] }]
  topics jsonb not null default '[]'::jsonb check (jsonb_typeof(topics) = 'array'),
  topic_count smallint not null default 0 check (topic_count >= 0),
  -- ページ内の順番
  sort_order smallint not null,
  -- 区の「質問者・質問内容一覧」ページ
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_slug, sort_order)
);

create table faction_activity_expenses (
  id uuid primary key default gen_random_uuid(),
  -- 年度の開始年（令和7年度なら 2025）
  fiscal_year smallint not null,
  -- 収支一覧の対象期間（改選の年度は2つに分かれる：令和5年4月分 / 令和5年5月〜令和6年3月分）
  period_label text not null,
  period_start date not null,
  period_end date not null,
  faction_id uuid references factions(id) on delete set null,
  -- 収支一覧の会派名（その年度の名前）
  faction_name text not null,
  -- 収支一覧の人数。年度の途中で人数が変わった会派は notes を参照
  member_count smallint check (member_count >= 0),
  -- 収入（区が交付した額。月額15万円 × 会派の人数）
  income bigint not null check (income >= 0),
  research_expense bigint not null check (research_expense >= 0),
  training_expense bigint not null check (training_expense >= 0),
  publicity_expense bigint not null check (publicity_expense >= 0),
  hearing_expense bigint not null check (hearing_expense >= 0),
  petition_expense bigint not null check (petition_expense >= 0),
  meeting_expense bigint not null check (meeting_expense >= 0),
  materials_expense bigint not null check (materials_expense >= 0),
  personnel_expense bigint not null check (personnel_expense >= 0),
  office_expense bigint not null check (office_expense >= 0),
  total_expense bigint not null check (total_expense >= 0),
  -- 収支一覧の注記のうち、この会派に関するもの
  notes text[] not null default '{}',
  sort_order smallint not null,
  -- 資料名（令和7年度 政務活動費収支一覧）と、掲載している区の HTML ページ
  source_title text not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_start, faction_name),
  check (period_start <= period_end),
  check (
    total_expense = research_expense + training_expense + publicity_expense + hearing_expense
      + petition_expense + meeting_expense + materials_expense + personnel_expense + office_expense
  )
);

-- RLS有効化（ポリシーなし = デフォルト全拒否、アクセスはAdmin Client経由のみ）
alter table plenary_questions enable row level security;
alter table faction_activity_expenses enable row level security;

create index idx_plenary_questions_member_asked_on on plenary_questions (member_id, asked_on desc);
create index idx_plenary_questions_diet_session_id on plenary_questions (diet_session_id);
create index idx_faction_activity_expenses_faction_year on faction_activity_expenses (faction_id, fiscal_year);

create trigger update_plenary_questions_updated_at
  before update on plenary_questions
  for each row execute function update_updated_at_column();
create trigger update_faction_activity_expenses_updated_at
  before update on faction_activity_expenses
  for each row execute function update_updated_at_column();

comment on table plenary_questions is
  '本会議の代表質問・一般質問。区の「質問者・質問内容一覧」ページから取り込む。委員会の質問は含まない';
comment on column plenary_questions.topics is
  '質問の題名と答弁者の一覧。[{ number, title, responders }]';
comment on table faction_activity_expenses is
  '会派ごとの政務活動費の収支（区の政務活動費収支一覧）。議員個人の金額は公表されていない';
comment on column faction_activity_expenses.member_count is
  '収支一覧の人数。1人あたりの金額は total_expense / member_count の目安でしかない（年度途中の増減は notes）';
