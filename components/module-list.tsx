'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ModuleSummary } from '@/lib/storage';

interface ModuleListProps {
  modules: ModuleSummary[];
}

export default function ModuleList({ modules: initialModules }: ModuleListProps) {
  const [modules, setModules] = useState(initialModules);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const markComplete = async (moduleId: string) => {
    setLoadingId(moduleId);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/modules/${moduleId}/complete`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to update module progress.');
      }

      setModules((current) =>
        current.map((module) =>
          module.id === moduleId
            ? {
                ...module,
                completed: true,
                completedAt: new Date().toISOString()
              }
            : module
        )
      );

      setStatusMessage('Great job! This module is now marked as complete.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to complete the module.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ marginBottom: 0 }}>Learning modules</h2>
        <Link href="/dashboard/modules" className="secondary-button" style={{ padding: '0.4rem 1rem' }}>
          Explore modules
        </Link>
      </div>
      <p style={{ marginBottom: '1.25rem' }}>
        Work through guided lessons and mark them complete once you feel confident in the material.
      </p>

      {statusMessage ? (
        <div style={{
          background: 'rgba(37, 99, 235, 0.08)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          color: '#1d4ed8',
          marginBottom: '1rem'
        }}>
          {statusMessage}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {modules.map((module) => (
          <div key={module.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.18)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{module.title}</h3>
                <p style={{ color: '#475569', marginBottom: '0.6rem' }}>{module.description}</p>
                {module.completed ? (
                  <span className="tag">Completed</span>
                ) : (
                  <span className="tag" style={{ background: 'rgba(15, 118, 110, 0.18)', color: '#0f766e' }}>
                    In progress
                  </span>
                )}
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() => markComplete(module.id)}
                disabled={module.completed || loadingId === module.id}
              >
                {module.completed ? 'Completed' : loadingId === module.id ? 'Saving…' : 'Mark complete'}
              </button>
            </div>

            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', color: '#1d4ed8', fontWeight: 600 }}>Preview content</summary>
              <p style={{ marginTop: '0.75rem', color: '#334155', whiteSpace: 'pre-line' }}>{module.content}</p>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
