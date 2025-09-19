import ModuleList from '@/components/module-list';
import QuizList from '@/components/quiz-list';
import ChatSection from '@/components/chat-section';
import { requireUser } from '@/lib/session';
import {
  getActiveMatch,
  getOpinionQuestions,
  getOrientationScore,
  listLearningModulesForUser,
  listMessages,
  listQuizzesForUser
} from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();

  const [modules, quizzes, questions, match, orientationScore] = await Promise.all([
    listLearningModulesForUser(user.id),
    listQuizzesForUser(user.id),
    getOpinionQuestions(),
    getActiveMatch(user.id),
    getOrientationScore(user.id)
  ]);

  const messages = match ? await listMessages(match.id) : [];

  return (
    <section className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Welcome back, {user.username}</h1>
        <p style={{ color: '#475569', maxWidth: '640px' }}>
          Continue learning, validate your understanding, and practice civil discourse with someone who sees the world a little
          differently.
        </p>
      </div>

      <div className="section-grid">
        <ModuleList modules={modules} />
        <QuizList quizzes={quizzes} />
        <ChatSection
          questions={questions}
          match={match}
          orientationScore={orientationScore}
          messages={messages}
          currentUserId={user.id}
          currentUsername={user.username}
        />
      </div>
    </section>
  );
}
