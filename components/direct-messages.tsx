'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityMemberSummary, DirectMessage } from '@/lib/storage';

interface DirectMessagesProps {
  currentUserId: string;
  members: CommunityMemberSummary[];
  initialConversation?: {
    partnerId: string | null;
    messages: DirectMessage[];
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
}

export default function DirectMessages({ currentUserId, members, initialConversation }: DirectMessagesProps) {
  const [activeUserId, setActiveUserId] = useState<string | null>(initialConversation?.partnerId ?? null);
  const [conversations, setConversations] = useState<Record<string, DirectMessage[]>>(() =>
    initialConversation?.partnerId
      ? { [initialConversation.partnerId]: initialConversation.messages }
      : {}
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingPartnerId, setLoadingPartnerId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeUserId && members[0]) {
      setActiveUserId(members[0].id);
    }
  }, [members, activeUserId]);

  const fetchConversation = useCallback(async (userId: string) => {
    setErrorMessage(null);
    setLoadingPartnerId(userId);

    try {
      const response = await fetch(`/api/chat/dm/${userId}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to load that conversation.');
      }

      setConversations((current) => ({ ...current, [userId]: payload.messages ?? [] }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load that conversation.');
    } finally {
      setLoadingPartnerId(null);
    }
  }, []);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    if (conversations[activeUserId]) {
      return;
    }

    void fetchConversation(activeUserId);
  }, [activeUserId, conversations, fetchConversation]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    const container = messageContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [activeUserId, conversations]);

  const activeMessages = useMemo(() => {
    if (!activeUserId) {
      return [];
    }
    return conversations[activeUserId] ?? [];
  }, [activeUserId, conversations]);

  const messageDraft = activeUserId ? drafts[activeUserId] ?? '' : '';

  const selectMember = (userId: string) => {
    setErrorMessage(null);
    setActiveUserId(userId);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeUserId) {
      setErrorMessage('Choose a member to start a conversation.');
      return;
    }

    if (!messageDraft.trim()) {
      setErrorMessage('Write a message before sending.');
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/chat/dm/${activeUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageDraft })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to send your message.');
      }

      const message = payload.message as DirectMessage;
      setConversations((current) => {
        const existing = current[activeUserId] ?? [];
        return { ...current, [activeUserId]: [...existing, message] };
      });
      setDrafts((current) => ({ ...current, [activeUserId]: '' }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <h2>Direct message lounge</h2>
      <p>
        Browse the community, open a side conversation, and keep an ongoing record of what you are learning from one another.
      </p>

      {errorMessage ? (
        <div
          style={{
            background: 'rgba(248, 113, 113, 0.12)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            color: '#b91c1c',
            marginBottom: '1rem'
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      {members.length === 0 ? (
        <p style={{ marginTop: '1rem', color: '#64748b' }}>
          Invite a teammate to join you—once more people arrive you will see them listed here and can start a discussion.
        </p>
      ) : (
        <div className="dm-layout" style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '1rem',
              padding: '1rem',
              background: 'rgba(15, 23, 42, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <h3 style={{ fontSize: '1rem' }}>Community</h3>
            {members.map((member) => {
              const active = member.id === activeUserId;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => selectMember(member.id)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.8rem',
                    background: active ? 'rgba(37, 99, 235, 0.15)' : 'white',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#1d4ed8' : '#1f2937',
                    cursor: loadingPartnerId === member.id ? 'progress' : 'pointer'
                  }}
                  disabled={loadingPartnerId === member.id}
                >
                  <div>{member.username}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Perspective score: {member.orientationScore != null ? member.orientationScore.toFixed(2) : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                    Joined {formatDate(member.joinedAt)}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '1rem',
              padding: '1rem',
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {activeUserId ? (
              <>
                <div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                    Conversation with {members.find((member) => member.id === activeUserId)?.username ?? 'a community member'}
                  </h3>
                  <p style={{ color: '#64748b', marginBottom: 0 }}>
                    Exchange resources, compare perspectives, or debrief how your latest dialogue went.
                  </p>
                </div>

                <div
                  ref={messageContainerRef}
                  style={{
                    flexGrow: 1,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    overflowY: 'auto',
                    background: 'rgba(15, 23, 42, 0.02)'
                  }}
                >
                  {loadingPartnerId === activeUserId && !conversations[activeUserId] ? (
                    <p style={{ color: '#94a3b8' }}>Loading messages…</p>
                  ) : activeMessages.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>No messages yet. Ask a question or share a resource to get things started.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeMessages.map((message) => (
                        <div
                          key={message.id}
                          style={{
                            alignSelf: message.senderId === currentUserId ? 'flex-end' : 'flex-start',
                            background: message.senderId === currentUserId ? 'rgba(37, 99, 235, 0.18)' : 'white',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '0.75rem',
                            padding: '0.6rem 0.85rem',
                            maxWidth: '75%'
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                            {message.senderId === currentUserId
                              ? 'You'
                              : message.author?.username ?? 'Community member'}{' '}
                            · {formatDate(message.sentAt)}
                          </div>
                          <div style={{ color: '#1f2937' }}>{message.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={sendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <textarea
                    rows={3}
                    placeholder="Share a reflection, resource, or invitation to collaborate."
                    value={messageDraft}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [activeUserId]: event.target.value }))
                    }
                  />
                  <button type="submit" className="primary-button" disabled={sending}>
                    {sending ? 'Sending…' : 'Send message'}
                  </button>
                </form>
              </>
            ) : (
              <p style={{ color: '#64748b', marginBottom: 0 }}>
                Select a member from the list to start chatting.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
