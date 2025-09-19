'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMatch, ChatMessage, OpinionQuestion } from '@/lib/storage';

interface ChatSectionProps {
  questions: OpinionQuestion[];
  match: ChatMatch | null;
  orientationScore: number | null;
  messages: ChatMessage[];
  currentUserId: string;
  currentUsername: string;
}

function buildDefaultResponses(questions: OpinionQuestion[]) {
  return questions.reduce<Record<string, number>>((accumulator, question) => {
    if (question.options.length === 0) {
      return accumulator;
    }

    const neutral = question.options.find((option) => option.value === 0);
    const fallback = neutral ?? question.options[Math.floor(question.options.length / 2)] ?? question.options[0];
    accumulator[question.id] = fallback.value;
    return accumulator;
  }, {});
}

export default function ChatSection({
  questions,
  match: initialMatch,
  orientationScore: initialOrientation,
  messages: initialMessages,
  currentUserId,
  currentUsername
}: ChatSectionProps) {
  const router = useRouter();
  const [match, setMatch] = useState<ChatMatch | null>(initialMatch);
  const [orientationScore, setOrientationScore] = useState<number | null>(initialOrientation);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [messageText, setMessageText] = useState('');
  const [submittingPreferences, setSubmittingPreferences] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [refreshingMatch, setRefreshingMatch] = useState(false);

  const defaultResponses = useMemo(() => buildDefaultResponses(questions), [questions]);
  const [responses, setResponses] = useState<Record<string, number>>(defaultResponses);

  const submitPreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPreferenceError(null);
    setSubmittingPreferences(true);

    try {
      const payload = {
        responses: questions.map((question) => ({
          questionId: question.id,
          value: responses[question.id] ?? question.options[0]?.value ?? 0
        }))
      };

      const response = await fetch('/api/chat/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Unable to save your responses.');
      }

      const data = (await response.json()) as { orientationScore: number; match: ChatMatch | null };
      setOrientationScore(data.orientationScore);
      setMatch(data.match);

      if (data.match) {
        const messagesResponse = await fetch(`/api/chat/messages/${data.match.id}`);
        if (messagesResponse.ok) {
          const messagesPayload = (await messagesResponse.json()) as { messages: ChatMessage[] };
          setMessages(messagesPayload.messages);
        }
      }

      router.refresh();
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : 'Unable to save your responses.');
    } finally {
      setSubmittingPreferences(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessageError(null);

    if (!match) {
      setMessageError('Complete the perspective quiz to be paired with a partner.');
      return;
    }

    if (!messageText.trim()) {
      setMessageError('Write a message before sending.');
      return;
    }

    setSendingMessage(true);

    try {
      const response = await fetch(`/api/chat/messages/${match.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText.trim() })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Unable to send your message.');
      }

      const data = (await response.json()) as { message: ChatMessage };
      setMessages((current) => [...current, data.message]);
      setMessageText('');
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Unable to send your message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const refreshMatch = async () => {
    setRefreshingMatch(true);
    try {
      const response = await fetch('/api/chat/match');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Unable to refresh your match.');
      }

      const data = (await response.json()) as { match: ChatMatch | null; orientationScore: number | null };
      setMatch(data.match);
      setOrientationScore(data.orientationScore ?? null);

      if (data.match) {
        const messagesResponse = await fetch(`/api/chat/messages/${data.match.id}`);
        if (messagesResponse.ok) {
          const messagesPayload = (await messagesResponse.json()) as { messages: ChatMessage[] };
          setMessages(messagesPayload.messages);
        }
      }
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : 'Unable to refresh match details.');
    } finally {
      setRefreshingMatch(false);
      router.refresh();
    }
  };

  return (
    <div className="card">
      <h2>Perspective exchange</h2>
      <p style={{ marginBottom: '1.25rem' }}>
        Share your stance on a few real-world topics. We will match you with someone nearby on the spectrum so you can practice
        constructive dialogue.
      </p>

      {orientationScore != null ? (
        <div style={{
          background: 'rgba(37, 99, 235, 0.08)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem'
        }}>
          Your perspective score: <strong>{orientationScore.toFixed(2)}</strong>
        </div>
      ) : null}

      {preferenceError ? (
        <div style={{
          background: 'rgba(248, 113, 113, 0.12)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          color: '#b91c1c',
          marginBottom: '1rem'
        }}>
          {preferenceError}
        </div>
      ) : null}

      {match ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem' }}>You are paired with {match.partner?.username ?? 'a new member'}</h3>
              <p style={{ color: '#475569' }}>
                {match.orientationGap != null
                  ? `Your viewpoints differ by ${match.orientationGap.toFixed(2)} points.`
                  : 'We are still gathering enough data to calculate your distance.'}
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={refreshMatch}
              disabled={refreshingMatch}
            >
              {refreshingMatch ? 'Refreshing…' : 'Refresh match'}
            </button>
          </div>

          <div style={{
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginTop: '1rem',
            maxHeight: '280px',
            overflowY: 'auto',
            background: 'rgba(15, 23, 42, 0.02)'
          }}>
            {messages.length === 0 ? (
              <p style={{ color: '#64748b' }}>No messages yet. Break the ice and say hello!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: message.senderId === currentUserId ? 'flex-end' : 'flex-start',
                      background: message.senderId === currentUserId ? 'rgba(37, 99, 235, 0.15)' : 'white',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.6rem 0.8rem',
                      maxWidth: '70%'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      {message.senderId === currentUserId ? currentUsername : message.author?.username ?? 'Partner'}
                    </div>
                    <div style={{ color: '#1f2937' }}>{message.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} style={{ marginTop: '1rem' }}>
            <textarea
              rows={3}
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Share a question, reflection, or story to spark the conversation."
            />
            {messageError ? <div style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>{messageError}</div> : null}
            <button type="submit" className="primary-button" disabled={sendingMessage}>
              {sendingMessage ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={submitPreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((question) => (
            <div key={question.id} style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '0.75rem', padding: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{question.prompt}</p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {question.options.map((option) => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`opinion-${question.id}`}
                      value={option.value}
                      checked={responses[question.id] === option.value}
                      onChange={() => setResponses((current) => ({ ...current, [question.id]: option.value }))}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button type="submit" className="primary-button" disabled={submittingPreferences}>
            {submittingPreferences ? 'Saving…' : 'Save preferences & find a match'}
          </button>
        </form>
      )}
    </div>
  );
}
