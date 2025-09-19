import QuizList from '@/components/quiz-list';
import { requireUser } from '@/lib/session';
import { listQuizzesForUser } from '@/lib/storage';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export default async function QuizzesPage() {
  const user = await requireUser();
  const quizzes = await listQuizzesForUser(user.id);
  const passedCount = quizzes.filter((quiz) => quiz.passed).length;
  const attempts = quizzes.reduce((total, quiz) => total + quiz.attemptCount, 0);
  const averageBestScore = quizzes.length
    ? Math.round(quizzes.reduce((total, quiz) => total + quiz.bestScore, 0) / quizzes.length)
    : 0;

  return (
    <section className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="card">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Validate your mastery</h1>
        <p style={{ color: '#475569', marginBottom: '1rem' }}>
          Quizzes help you measure how ready you are to enter higher-stakes dialogue. Retake them anytime to track how your
          understanding evolves.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.95rem', color: '#334155' }}>
          <span>
            Quizzes passed: <strong>{passedCount}</strong> of {quizzes.length}
          </span>
          <span>
            Total attempts: <strong>{attempts}</strong>
          </span>
          <span>
            Average best score: <strong>{averageBestScore}%</strong>
          </span>
        </div>
      </div>

      <QuizList quizzes={quizzes} />
    </section>
  );
}
