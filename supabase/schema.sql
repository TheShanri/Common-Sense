-- Enable extensions required for UUID support
create extension if not exists "pgcrypto";

-- Users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Password reset tokens for account recovery
create table if not exists public.password_reset_tokens (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists password_reset_tokens_user_idx on public.password_reset_tokens (user_id);

-- Learning modules
create table if not exists public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  content text not null,
  order_index integer default 0,
  created_at timestamptz not null default now()
);

-- Track module completions
create table if not exists public.module_completions (
  user_id uuid references public.users(id) on delete cascade,
  module_id uuid references public.learning_modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

-- Quizzes
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.learning_modules(id) on delete set null,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- Quiz questions and answer key
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  options text[] not null,
  correct_option text not null,
  position integer not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  attempt_id uuid references public.quiz_attempts(id) on delete cascade,
  question_id uuid references public.quiz_questions(id) on delete cascade,
  selected_option text not null,
  is_correct boolean not null,
  primary key (attempt_id, question_id)
);

-- Opinion questions used for matching
create table if not exists public.opinion_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  options jsonb not null,
  position integer not null default 0
);

create table if not exists public.opinion_responses (
  user_id uuid references public.users(id) on delete cascade,
  question_id uuid references public.opinion_questions(id) on delete cascade,
  selected_value integer not null,
  submitted_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.chat_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  orientation_score numeric not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.users(id) on delete cascade,
  user_two_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists chat_matches_user_idx on public.chat_matches (user_one_id, user_two_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.chat_matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now()
);

-- Direct message threads between any two members
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now()
);

create index if not exists direct_messages_participants_idx on public.direct_messages (sender_id, receiver_id, sent_at);

-- Seed default learning content (idempotent)
insert into public.learning_modules (id, title, description, content, order_index)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Understanding Civic Dialogue',
    'Learn the foundations of productive, good-faith dialogue across differences.',
    'Module overview:\n\n1. Active listening techniques\n2. Recognizing shared values\n3. Naming and validating emotions\n4. De-escalation tactics when conversations get heated',
    1
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Media Literacy Essentials',
    'Develop a framework for evaluating the reliability of different information sources.',
    'Module overview:\n\n1. Identifying bias and perspective\n2. Confirming authorship and evidence\n3. Fact-checking fast-moving stories\n4. Building a personal information diet',
    2
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Policy Trade-offs 101',
    'Explore how values and trade-offs shape public policy debates.',
    'Module overview:\n\n1. Mapping stakeholder priorities\n2. Understanding cost-benefit thinking\n3. Unintended consequences and externalities\n4. Communicating trade-offs with empathy',
    3
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  content = excluded.content,
  order_index = excluded.order_index;

-- Seed quizzes and questions
insert into public.quizzes (id, module_id, title, description)
values
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'Civic Dialogue Mastery Check',
    'Confirm that you can apply active listening and de-escalation strategies.'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'Media Literacy Mastery Check',
    'Validate your approach to vetting information sources.'
  )
on conflict (id) do update set
  module_id = excluded.module_id,
  title = excluded.title,
  description = excluded.description;

insert into public.quiz_questions (id, quiz_id, prompt, options, correct_option, position)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '44444444-4444-4444-4444-444444444444',
    'During a tense conversation, what should you do first?',
    array['Assert your perspective loudly', 'Pause, breathe, and summarise what you heard', 'Change the topic immediately', 'End the conversation'],
    'Pause, breathe, and summarise what you heard',
    1
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '44444444-4444-4444-4444-444444444444',
    'Which response best validates someone''s emotion without agreeing with their point?',
    array['“Calm down and be rational.”', '“I can see why this is important to you.”', '“You are overreacting.”', '“Let''s talk about something else.”'],
    '“I can see why this is important to you.”',
    2
  ),
  (
    '77777777-7777-7777-7777-777777777771',
    '55555555-5555-5555-5555-555555555555',
    'What is the most reliable indicator that an article is credible?',
    array['It has a catchy headline', 'It aligns with your views', 'It cites verifiable evidence and sources', 'It was shared many times on social media'],
    'It cites verifiable evidence and sources',
    1
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    '55555555-5555-5555-5555-555555555555',
    'Which strategy helps you avoid misinformation when news is breaking?',
    array['Share immediately before it disappears', 'Wait for follow-up reporting from trusted outlets', 'Assume the first version is correct', 'Only read headlines'],
    'Wait for follow-up reporting from trusted outlets',
    2
  )
on conflict (id) do update set
  quiz_id = excluded.quiz_id,
  prompt = excluded.prompt,
  options = excluded.options,
  correct_option = excluded.correct_option,
  position = excluded.position;

-- Seed opinion questions
insert into public.opinion_questions (id, prompt, options, position)
values
  (
    '88888888-8888-8888-8888-888888888881',
    'How open should communities be to new immigrants?',
    jsonb_build_array(
      jsonb_build_object('label', 'Very open – newcomers strengthen us', 'value', 5),
      jsonb_build_object('label', 'Moderately open with guardrails', 'value', 1),
      jsonb_build_object('label', 'Cautious – prioritise current residents', 'value', -2),
      jsonb_build_object('label', 'Restrictive – strict limits are needed', 'value', -5)
    ),
    1
  ),
  (
    '88888888-8888-8888-8888-888888888882',
    'When balancing economic growth and environmental protection, where do you land?',
    jsonb_build_array(
      jsonb_build_object('label', 'Prioritise the environment even if growth slows', 'value', 5),
      jsonb_build_object('label', 'Find a balanced compromise', 'value', 0),
      jsonb_build_object('label', 'Prioritise growth with targeted protections', 'value', -3)
    ),
    2
  ),
  (
    '88888888-8888-8888-8888-888888888883',
    'Government should guarantee a baseline income for everyone.',
    jsonb_build_array(
      jsonb_build_object('label', 'Strongly agree', 'value', 4),
      jsonb_build_object('label', 'Somewhat agree', 'value', 2),
      jsonb_build_object('label', 'Neutral / unsure', 'value', 0),
      jsonb_build_object('label', 'Somewhat disagree', 'value', -2),
      jsonb_build_object('label', 'Strongly disagree', 'value', -4)
    ),
    3
  )
on conflict (id) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  position = excluded.position;
