'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizDetails, QuizSubmissionResult, QuizSummary } from '@/lib/storage';

interface QuizListProps {
  quizzes: QuizSummary[];
}

interface QuizResultMap {
  [quizId: string]: QuizSubmissionResult;
}

interface QuizDetailsMap {
  [quizId: string]: QuizDetails;
}

export default function QuizList({ quizzes }: QuizListProps) {
  const router = useRouter();
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<QuizDetailsMap>({});
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [results, setResults] = useState<QuizResultMap>({});
  const [loadingQuiz, setLoadingQuiz] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openQuiz = async (quizId: string) => {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null);
      return;
    }

    setErrorMessage(null);
    setLoadingQuiz(quizId);

    try {
      if (!quizDetails[quizId]) {
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? 'Unable to load quiz questions.');
        }

        const data = (await response.json()) as { quiz: QuizDetails };
        setQuizDetails((current) => ({ ...current, [quizId]: data.quiz }));
        setAnswers((current) => ({ ...current, [quizId]: {} }));
      }

      setExpandedQuiz(quizId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load quiz questions.');
    } finally {
      setLoadingQuiz(null);
    }
  };

  const updateAnswer = (quizId: string, questionId: string, selectedOption: string) => {
    setAnswers((current) => ({
      ...current,
      [quizId]: {
        ...(current[quizId] ?? {}),
        [questionId]: selectedOption
      }
    }));
  };

  const submitQuiz = async (event: FormEvent<HTMLFormElement>, quizId: string) => {
    event.preventDefault();
    setErrorMessage(null);
    setLoadingQuiz(quizId);

    try {
      const response = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(answers[quizId] ?? {}).map(([questionId, selectedOption]) => ({
            questionId,
            selectedOption
          }))
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to submit quiz answers.');
      }

      const data = (await response.json()) as { result: QuizSubmissionResult };
      setResults((current) => ({ ...current, [quizId]: data.result }));
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit quiz answers.');
    } finally {
      setLoadingQuiz(null);
    }
  };

  return (
    <div className="card">
      <h2>Knowledge checks</h2>
      <p style={{ marginBottom: '1.25rem' }}>
        Complete quizzes to validate your understanding and unlock deeper discussions.
      </p>

      {errorMessage ? (
        <div style={{
          background: 'rgba(248, 113, 113, 0.12)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          color: '#b91c1c',
          marginBottom: '1rem'
        }}>
          {errorMessage}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {quizzes.map((quiz) => {
          const result = results[quiz.id];
          const quizInfo = quizDetails[quiz.id];
          const answerMap = answers[quiz.id] ?? {};

          return (
            <div key={quiz.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.18)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{quiz.title}</h3>
                  <p style={{ color: '#475569', marginBottom: '0.45rem' }}>{quiz.description}</p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: '#64748b', fontSize: '0.9rem' }}>
                    {quiz.moduleTitle ? <span>Module: {quiz.moduleTitle}</span> : null}
                    <span>Attempts: {quiz.attemptCount}</span>
                    <span>Best score: {quiz.bestScore}%</span>
                    {quiz.passed ? <span style={{ color: '#15803d', fontWeight: 600 }}>Passed</span> : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openQuiz(quiz.id)}
                  disabled={loadingQuiz === quiz.id}
                >
                  {expandedQuiz === quiz.id ? 'Hide quiz' : loadingQuiz === quiz.id ? 'Loading…' : 'Take quiz'}
                </button>
              </div>

              {expandedQuiz === quiz.id && quizInfo ? (
                <form onSubmit={(event) => submitQuiz(event, quiz.id)} style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {quizInfo.questions.map((question, index) => (
                      <div key={question.id} style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '0.75rem', padding: '1rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                          {index + 1}. {question.prompt}
                        </p>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {question.options.map((option) => (
                            <label
                              key={option}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                color: '#334155'
                              }}
                            >
                              <input
                                type="radio"
                                name={`${quiz.id}-${question.id}`}
                                value={option}
                                checked={answerMap[question.id] === option}
                                onChange={() => updateAnswer(quiz.id, question.id, option)}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                    style={{ marginTop: '1.25rem' }}
                    disabled={loadingQuiz === quiz.id}
                  >
                    {loadingQuiz === quiz.id ? 'Submitting…' : 'Submit answers'}
                  </button>

                  {result ? (
                    <div style={{ marginTop: '1rem', background: 'rgba(37, 99, 235, 0.08)', padding: '0.75rem 1rem', borderRadius: '0.75rem' }}>
                      <strong>Your latest score:</strong> {result.score}% ({result.correctCount} of {result.totalQuestions} correct)
                    </div>
                  ) : null}
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
