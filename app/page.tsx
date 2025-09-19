import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <section className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div className="card" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="tag" style={{ margin: '0 auto 1rem' }}>Built with Supabase & Vercel-ready</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Common Sense Exchange</h1>
          <p style={{ fontSize: '1.05rem', maxWidth: '660px', margin: '0 auto 1.5rem', color: '#475569' }}>
            A learning experience that helps people explore complex topics, validate their understanding, and have thoughtful
            conversations with peers who see the world a little differently.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="primary-button">
              Create an account
            </Link>
            <Link href="/login" className="secondary-button">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="section-grid">
          <div className="card">
            <h2>Guided learning modules</h2>
            <p>
              Offer curated lessons that walk members through foundational concepts. Track who has completed what and surface
              next steps automatically.
            </p>
          </div>
          <div className="card">
            <h2>Competency-based quizzes</h2>
            <p>
              Quizzes are tied to each module to confirm comprehension. Successful submissions unlock access to community
              discussions.
            </p>
          </div>
          <div className="card">
            <h2>Perspective-building chat</h2>
            <p>
              Members complete a short opinion assessment to be paired with someone nearby on the ideological spectrum, keeping
              conversation productive yet challenging.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
