import type { PoolClient } from 'pg';
import { query, withTransaction } from './db';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
}

export interface ModuleSummary {
  id: string;
  title: string;
  description: string;
  content: string;
  orderIndex: number;
  completed: boolean;
  completedAt: string | null;
}

interface QuizSummaryRow {
  id: string;
  title: string;
  description: string;
  moduleTitle: string | null;
  attemptCount: string | number | null;
  bestScore: string | number | null;
  passed: boolean | null;
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string;
  moduleTitle: string | null;
  attemptCount: number;
  bestScore: number;
  passed: boolean;
}

interface QuizQuestionRow {
  id: string;
  prompt: string;
  options: unknown;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface QuizDetails {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface QuizSubmissionAnswer {
  questionId: string;
  selectedOption: string;
}

export interface QuizSubmissionResult {
  attemptId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}

export interface OpinionQuestionOption {
  label: string;
  value: number;
}

export interface OpinionQuestion {
  id: string;
  prompt: string;
  options: OpinionQuestionOption[];
}

export interface ChatMatch {
  id: string;
  createdAt: string;
  status: string;
  partner: {
    id: string;
    username: string;
  } | null;
  orientationGap: number | null;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: string;
  author?: {
    id: string;
    username: string;
  };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch (error) {
      // Attempt to coerce Postgres array string format: {"a","b"}
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return trimmed
          .slice(1, -1)
          .split(',')
          .map((item) => item.replace(/^[\"']|[\"']$/g, ''))
          .filter((item) => item.length > 0);
      }
    }
  }

  return [];
}

function parseOpinionOptions(value: unknown): OpinionQuestionOption[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'object') {
          const option = item as { label?: unknown; value?: unknown };
          if (typeof option.label === 'string' && typeof option.value === 'number') {
            return { label: option.label, value: option.value };
          }
        }
        return null;
      })
      .filter((item): item is OpinionQuestionOption => item !== null);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseOpinionOptions(parsed);
      }
    } catch (error) {
      // Ignore parsing errors and return empty array
    }
  }

  return [];
}

export async function createUser(input: CreateUserInput): Promise<Omit<UserRecord, 'passwordHash'>> {
  const result = await query<UserRecord>(
    `INSERT INTO users (email, username, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, username, password_hash AS "passwordHash", created_at AS "createdAt"`,
    [input.email.toLowerCase(), input.username.trim(), input.passwordHash]
  );
  const { passwordHash, ...rest } = result.rows[0];
  return rest;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  if (!email) return null;
  const result = await query<UserRecord>(
    `SELECT id, email, username, password_hash AS "passwordHash", created_at AS "createdAt"
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  if (!username) return null;
  const result = await query<UserRecord>(
    `SELECT id, email, username, password_hash AS "passwordHash", created_at AS "createdAt"
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function getUserById(id: string): Promise<Omit<UserRecord, 'passwordHash'> | null> {
  const result = await query<UserRecord>(
    `SELECT id, email, username, password_hash AS "passwordHash", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id]
  );
  if (!result.rows[0]) {
    return null;
  }
  const { passwordHash, ...rest } = result.rows[0];
  return { ...rest };
}

export async function listLearningModulesForUser(userId: string): Promise<ModuleSummary[]> {
  const result = await query<ModuleSummary>(
    `SELECT
        m.id,
        m.title,
        m.description,
        m.content,
        m.order_index AS "orderIndex",
        mc.completed_at IS NOT NULL AS completed,
        mc.completed_at AS "completedAt"
      FROM learning_modules m
      LEFT JOIN module_completions mc
        ON mc.module_id = m.id AND mc.user_id = $1
      ORDER BY m.order_index ASC NULLS LAST, m.title ASC`,
    [userId]
  );

  return result.rows;
}

export async function markModuleAsCompleted(userId: string, moduleId: string): Promise<string | null> {
  const result = await query(
    `INSERT INTO module_completions (user_id, module_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, module_id)
     DO UPDATE SET completed_at = COALESCE(module_completions.completed_at, NOW())
     RETURNING completed_at`,
    [userId, moduleId]
  );
  return result.rows[0]?.completed_at ?? null;
}

export async function listQuizzesForUser(userId: string): Promise<QuizSummary[]> {
  const result = await query<QuizSummaryRow>(
    `SELECT
        q.id,
        q.title,
        q.description,
        m.title AS "moduleTitle",
        COUNT(qa.*) FILTER (WHERE qa.user_id = $1) AS "attemptCount",
        COALESCE(MAX(CASE WHEN qa.user_id = $1 THEN qa.score ELSE 0 END), 0) AS "bestScore",
        BOOL_OR(CASE WHEN qa.user_id = $1 AND qa.score >= 80 THEN TRUE ELSE FALSE END) AS passed
      FROM quizzes q
      LEFT JOIN learning_modules m ON m.id = q.module_id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
      GROUP BY q.id, q.title, q.description, m.title
      ORDER BY q.title ASC`,
    [userId]
  );

  return result.rows.map((row) => ({
    ...row,
    attemptCount: Number(row.attemptCount ?? 0),
    bestScore: Number(row.bestScore ?? 0),
    passed: Boolean(row.passed)
  }));
}

export async function getQuizById(quizId: string): Promise<QuizDetails | null> {
  const quizResult = await query<{
    id: string;
    title: string;
    description: string;
  }>(
    `SELECT id, title, description
     FROM quizzes WHERE id = $1`,
    [quizId]
  );

  if (!quizResult.rows[0]) {
    return null;
  }

  const questionsResult = await query<QuizQuestionRow>(
    `SELECT id, prompt, options
     FROM quiz_questions
     WHERE quiz_id = $1
     ORDER BY position`,
    [quizId]
  );

  return {
    ...quizResult.rows[0],
    questions: questionsResult.rows.map((row) => ({
      ...row,
      options: parseStringArray(row.options)
    }))
  };
}

async function getQuizAnswerKey(client: PoolClient, quizId: string) {
  const { rows } = await client.query<{
    id: string;
    correct_option: string;
  }>(`SELECT id, correct_option FROM quiz_questions WHERE quiz_id = $1`, [quizId]);
  return rows;
}

export async function recordQuizSubmission(
  userId: string,
  quizId: string,
  answers: QuizSubmissionAnswer[]
): Promise<QuizSubmissionResult> {
  return withTransaction(async (client) => {
    const answerKey = await getQuizAnswerKey(client, quizId);
    if (answerKey.length === 0) {
      throw new Error('Quiz is not configured.');
    }

    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption]));
    let correctCount = 0;

    for (const item of answerKey) {
      const selection = answerMap.get(item.id) ?? '';
      if (selection === item.correct_option) {
        correctCount += 1;
      }
    }

    const totalQuestions = answerKey.length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    const attemptResult = await client.query<{
      id: string;
      created_at: string;
    }>(
      `INSERT INTO quiz_attempts (user_id, quiz_id, score)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [userId, quizId, score]
    );

    const attemptId = attemptResult.rows[0].id;

    for (const item of answerKey) {
      const selection = answerMap.get(item.id) ?? '';
      const isCorrect = selection === item.correct_option;
      await client.query(
        `INSERT INTO quiz_answers (attempt_id, question_id, selected_option, is_correct)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (attempt_id, question_id) DO NOTHING`,
        [attemptId, item.id, selection, isCorrect]
      );
    }

    return {
      attemptId,
      score,
      correctCount,
      totalQuestions
    };
  });
}

export async function getOpinionQuestions(): Promise<OpinionQuestion[]> {
  const { rows } = await query<OpinionQuestion>(
    `SELECT id, prompt, options
     FROM opinion_questions
     ORDER BY position`
  );

  return rows.map((row) => ({
    ...row,
    options: parseOpinionOptions(row.options)
  }));
}

export async function saveOpinionResponses(
  userId: string,
  responses: { questionId: string; value: number }[]
): Promise<number> {
  return withTransaction(async (client) => {
    for (const response of responses) {
      await client.query(
        `INSERT INTO opinion_responses (user_id, question_id, selected_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, question_id)
         DO UPDATE SET selected_value = EXCLUDED.selected_value, submitted_at = NOW()`,
        [userId, response.questionId, response.value]
      );
    }

    const orientationResult = await client.query<{
      orientation_score: number;
    }>(
      `SELECT AVG(selected_value)::numeric AS orientation_score
         FROM opinion_responses
        WHERE user_id = $1`,
      [userId]
    );

    const orientationScore = Number(orientationResult.rows[0]?.orientation_score ?? 0);

    await client.query(
      `INSERT INTO chat_preferences (user_id, orientation_score)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET orientation_score = EXCLUDED.orientation_score, updated_at = NOW()`,
      [userId, orientationScore]
    );

    return orientationScore;
  });
}

export async function getOrientationScore(userId: string): Promise<number | null> {
  const { rows } = await query<{ orientation_score: number | null }>(
    `SELECT orientation_score FROM chat_preferences WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.orientation_score != null ? Number(rows[0].orientation_score) : null;
}

export async function getActiveMatch(userId: string): Promise<ChatMatch | null> {
  const { rows } = await query<{
    id: string;
    createdAt: string;
    status: string;
    partner_id: string | null;
    partnerOrientation: number | null;
    selfOrientation: number | null;
  }>(
    `SELECT
        cm.id,
        cm.created_at AS "createdAt",
        cm.status,
        CASE WHEN cm.user_one_id = $1 THEN cm.user_two_id ELSE cm.user_one_id END AS partner_id,
        cp.orientation_score AS "partnerOrientation",
        selfPref.orientation_score AS "selfOrientation"
      FROM chat_matches cm
      LEFT JOIN chat_preferences cp ON cp.user_id = CASE WHEN cm.user_one_id = $1 THEN cm.user_two_id ELSE cm.user_one_id END
      LEFT JOIN chat_preferences selfPref ON selfPref.user_id = $1
      WHERE cm.status = 'active' AND (cm.user_one_id = $1 OR cm.user_two_id = $1)
      ORDER BY cm.created_at DESC
      LIMIT 1`,
    [userId]
  );

  const match = rows[0];
  if (!match) {
    return null;
  }

  const partnerId = match.partner_id;
  if (!partnerId) {
    return { ...match, partner: null, orientationGap: null };
  }

  const partnerResult = await query<{
    id: string;
    username: string;
  }>(`SELECT id, username FROM users WHERE id = $1`, [partnerId]);

  const partner = partnerResult.rows[0] ?? null;
  const orientationGap =
    match.partnerOrientation != null && match.selfOrientation != null
      ? Math.abs(Number(match.partnerOrientation) - Number(match.selfOrientation))
      : null;

  return {
    id: match.id,
    createdAt: match.createdAt,
    status: match.status,
    partner,
    orientationGap
  };
}

export async function attemptMatchWithPeer(userId: string, orientationScore: number): Promise<string | null> {
  return withTransaction(async (client) => {
    const activeMatch = await client.query<{ id: string }>(
      `SELECT id FROM chat_matches WHERE status = 'active' AND (user_one_id = $1 OR user_two_id = $1) LIMIT 1`,
      [userId]
    );

    if (activeMatch.rows[0]) {
      return activeMatch.rows[0].id;
    }

    const candidateResult = await client.query<{
      user_id: string;
      orientation_score: number;
    }>(
      `SELECT cp.user_id, cp.orientation_score
         FROM chat_preferences cp
         LEFT JOIN chat_matches cm ON cm.status = 'active' AND (cm.user_one_id = cp.user_id OR cm.user_two_id = cp.user_id)
        WHERE cp.user_id <> $1 AND cm.id IS NULL
        ORDER BY ABS(cp.orientation_score - $2) ASC
        LIMIT 1`,
      [userId, orientationScore]
    );

    const candidate = candidateResult.rows[0];
    if (!candidate) {
      return null;
    }

    const gap = Math.abs(Number(candidate.orientation_score ?? 0) - orientationScore);
    if (gap < 0.5) {
      // Encourage pairing with slightly different views.
      return null;
    }

    const insertResult = await client.query<{
      id: string;
    }>(
      `INSERT INTO chat_matches (user_one_id, user_two_id, status)
       VALUES ($1, $2, 'active')
       RETURNING id`,
      [userId, candidate.user_id]
    );

    return insertResult.rows[0].id;
  });
}

export async function listMessages(matchId: string, limit = 50): Promise<ChatMessage[]> {
  const { rows } = await query<(ChatMessage & { authorUsername: string | null })>(
    `SELECT
        cm.id,
        cm.match_id AS "matchId",
        cm.sender_id AS "senderId",
        cm.content,
        cm.sent_at AS "sentAt",
        u.username AS "authorUsername"
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_id
      WHERE cm.match_id = $1
      ORDER BY cm.sent_at ASC
      LIMIT $2`,
    [matchId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    matchId: row.matchId,
    senderId: row.senderId,
    content: row.content,
    sentAt: row.sentAt,
    author: row.authorUsername
      ? {
          id: row.senderId,
          username: row.authorUsername
        }
      : undefined
  }));
}

export async function addMessage(matchId: string, senderId: string, content: string): Promise<ChatMessage> {
  const { rows } = await query<ChatMessage>(
    `INSERT INTO chat_messages (match_id, sender_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, match_id AS "matchId", sender_id AS "senderId", content, sent_at AS "sentAt"`,
    [matchId, senderId, content]
  );
  const message = rows[0];

  const authorResult = await query<{ username: string }>(
    `SELECT username FROM users WHERE id = $1`,
    [senderId]
  );

  const author = authorResult.rows[0];

  return {
    ...message,
    author: author
      ? {
          id: senderId,
          username: author.username
        }
      : undefined
  };
}

export async function userIsInMatch(matchId: string, userId: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(
        SELECT 1 FROM chat_matches
        WHERE id = $1 AND status = 'active' AND (user_one_id = $2 OR user_two_id = $2)
      ) AS exists`,
    [matchId, userId]
  );

  return Boolean(rows[0]?.exists);
}
