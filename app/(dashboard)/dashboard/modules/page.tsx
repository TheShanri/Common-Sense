import ModuleWorkshop from '@/components/module-workshop';
import { requireUser } from '@/lib/session';
import { listLearningModulesForUser } from '@/lib/storage';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export default async function ModulesPage() {
  const user = await requireUser();
  const modules = await listLearningModulesForUser(user.id);
  const completedCount = modules.filter((module) => module.completed).length;
  const totalCount = modules.length;

  return (
    <section className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="card">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Deepen your understanding</h1>
        <p style={{ color: '#475569', marginBottom: '1rem' }}>
          Each module combines curated guidance with hands-on practice so you can move beyond theory and build durable civic
          skills.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.95rem', color: '#334155' }}>
          <span>
            Modules completed: <strong>{completedCount}</strong> of {totalCount}
          </span>
          <span>
            In progress: <strong>{totalCount - completedCount}</strong>
          </span>
        </div>
      </div>

      <ModuleWorkshop modules={modules} />
    </section>
  );
}
