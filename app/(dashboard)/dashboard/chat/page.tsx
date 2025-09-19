import DirectMessages from '@/components/direct-messages';
import { requireUser } from '@/lib/session';
import { getOrientationScore, listCommunityMembers, listDirectMessagesBetween } from '@/lib/storage';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const user = await requireUser();
  const [members, orientationScore] = await Promise.all([
    listCommunityMembers(user.id),
    getOrientationScore(user.id)
  ]);

  const initialPartnerId = members[0]?.id ?? null;
  const initialMessages = initialPartnerId
    ? await listDirectMessagesBetween(user.id, initialPartnerId)
    : [];

  return (
    <section className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="card">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Connect with peers</h1>
        <p style={{ color: '#475569', marginBottom: '1rem' }}>
          Compare notes after a dialogue, swap reading recommendations, or plan a collaborative project. Direct messages are a
          great place to build momentum between matches.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.95rem', color: '#334155' }}>
          <span>
            Perspective score:{' '}
            <strong>{orientationScore != null ? orientationScore.toFixed(2) : 'Take the perspective quiz to generate yours'}</strong>
          </span>
          <span>
            Community members available: <strong>{members.length}</strong>
          </span>
        </div>
      </div>

      <DirectMessages
        currentUserId={user.id}
        members={members}
        initialConversation={initialPartnerId ? { partnerId: initialPartnerId, messages: initialMessages } : undefined}
      />
    </section>
  );
}
