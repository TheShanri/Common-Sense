'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModuleSummary } from '@/lib/storage';

interface ModuleWorkshopProps {
  modules: ModuleSummary[];
}

interface PreparedModule {
  module: ModuleSummary;
  activities: string[];
}

const PRACTICE_SCENARIOS: Record<string, string> = {
  'Understanding Civic Dialogue':
    'Role-play a tense policy discussion. Draft one clarifying question you would ask to slow things down.',
  'Media Literacy Essentials':
    'Pick a headline you saw this week. List the verification steps you would take before sharing it.',
  'Policy Trade-offs 101':
    'Imagine presenting two competing policy options to neighbours. Outline how you would frame the trade-offs fairly.'
};

function extractActivities(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /^(\d+\.|[-•*])/.test(line))
    .map((line) => line.replace(/^(\d+\.|[-•*])\s*/, ''));
}

function buildInitialChecklist(prepared: PreparedModule[]) {
  return prepared.reduce<Record<string, Record<number, boolean>>>((acc, item) => {
    const defaults: Record<number, boolean> = {};
    item.activities.forEach((_, index) => {
      defaults[index] = item.module.completed;
    });
    acc[item.module.id] = defaults;
    return acc;
  }, {});
}

export default function ModuleWorkshop({ modules }: ModuleWorkshopProps) {
  const [moduleState, setModuleState] = useState(modules);

  useEffect(() => {
    setModuleState(modules);
  }, [modules]);

  const preparedModules = useMemo<PreparedModule[]>(
    () => moduleState.map((entry) => ({ module: entry, activities: extractActivities(entry.content) })),
    [moduleState]
  );

  const [checklists, setChecklists] = useState<Record<string, Record<number, boolean>>>(() =>
    buildInitialChecklist(preparedModules)
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>(() =>
    modules.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.id] = entry.completed ? 90 : 50;
      return acc;
    }, {})
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setChecklists((current) => {
      const updated = buildInitialChecklist(preparedModules);

      for (const prepared of preparedModules) {
        const existing = current[prepared.module.id];
        if (existing) {
          updated[prepared.module.id] = prepared.activities.reduce<Record<number, boolean>>((acc, _activity, index) => {
            acc[index] = existing[index] ?? prepared.module.completed;
            return acc;
          }, {});
        }
      }

      return updated;
    });
  }, [preparedModules]);

  useEffect(() => {
    setConfidence((current) => {
      const next: Record<string, number> = {};
      for (const prepared of preparedModules) {
        next[prepared.module.id] = current[prepared.module.id] ?? (prepared.module.completed ? 90 : 50);
      }
      return next;
    });
  }, [preparedModules]);

  useEffect(() => {
    setNotes((current) => {
      const next: Record<string, string> = {};
      for (const prepared of preparedModules) {
        next[prepared.module.id] = current[prepared.module.id] ?? '';
      }
      return next;
    });
  }, [preparedModules]);

  const toggleActivity = (moduleId: string, index: number) => {
    setChecklists((current) => {
      const moduleChecklist = current[moduleId] ?? {};
      return {
        ...current,
        [moduleId]: {
          ...moduleChecklist,
          [index]: !moduleChecklist[index]
        }
      };
    });
  };

  const markComplete = async (moduleId: string) => {
    setLoadingId(moduleId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/modules/${moduleId}/complete`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update module progress.');
      }

      setModuleState((current) =>
        current.map((entry) =>
          entry.id === moduleId
            ? { ...entry, completed: true, completedAt: new Date().toISOString() }
            : entry
        )
      );

      setChecklists((current) => {
        const next = { ...current };
        const target = { ...(next[moduleId] ?? {}) };
        Object.keys(target).forEach((key) => {
          const numericKey = Number(key);
          if (!Number.isNaN(numericKey)) {
            target[numericKey] = true;
          }
        });
        next[moduleId] = target;
        return next;
      });

      setConfidence((current) => ({ ...current, [moduleId]: 100 }));
      setStatusMessage('Great work! This module is now marked as complete.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update module progress.');
    } finally {
      setLoadingId(null);
    }
  };

  const progressFor = (moduleId: string, activityCount: number) => {
    if (activityCount === 0) {
      return moduleState.find((entry) => entry.id === moduleId)?.completed ? 100 : 0;
    }

    const completedCount = Object.values(checklists[moduleId] ?? {}).filter(Boolean).length;
    return Math.round((completedCount / activityCount) * 100);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2>Interactive learning studio</h2>
          <p style={{ marginBottom: 0 }}>
            Work through each activity, track your confidence, and capture reflections before marking the module complete.
          </p>
        </div>
      </div>

      {statusMessage ? (
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.1)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            color: '#1d4ed8',
            fontWeight: 600,
            marginTop: '1.25rem'
          }}
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          style={{
            background: 'rgba(248, 113, 113, 0.15)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            color: '#b91c1c',
            fontWeight: 600,
            marginTop: '1.25rem'
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        {preparedModules.map(({ module: moduleInfo, activities }) => {
          const progress = progressFor(moduleInfo.id, activities.length);
          const reflection = notes[moduleInfo.id] ?? '';
          const currentConfidence = confidence[moduleInfo.id] ?? 50;
          const practiceScenario = PRACTICE_SCENARIOS[moduleInfo.title] ??
            `Outline one action you can take this week to apply “${moduleInfo.title}”.`;

          return (
            <div
              key={moduleInfo.id}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '1rem',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>{moduleInfo.title}</h3>
                  <p style={{ marginBottom: '0.5rem', color: '#475569' }}>{moduleInfo.description}</p>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    Progress: <strong>{progress}%</strong>
                    {moduleInfo.completed ? (
                      <span className="tag" style={{ marginLeft: '0.75rem' }}>Completed</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => markComplete(moduleInfo.id)}
                  disabled={moduleInfo.completed || loadingId === moduleInfo.id}
                >
                  {moduleInfo.completed ? 'Completed' : loadingId === moduleInfo.id ? 'Saving…' : 'Mark complete'}
                </button>
              </div>

              <div
                style={{
                  background: 'rgba(148, 163, 184, 0.18)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  height: '8px',
                  marginBottom: '1rem'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(Math.max(progress, moduleInfo.completed ? 100 : progress), 100)}%`,
                    background: '#2563eb',
                    height: '100%',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Practice checklist</h4>
                  {activities.length === 0 ? (
                    <p style={{ color: '#64748b' }}>
                      Dive into the lesson material, then jot down a reflection below before marking it complete.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {activities.map((activity, index) => {
                        const checked = Boolean(checklists[moduleInfo.id]?.[index]);
                        return (
                          <label
                            key={`${moduleInfo.id}-${index}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleActivity(moduleInfo.id, index)}
                            />
                            <span style={{ color: '#334155' }}>{activity}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Confidence tracker</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={currentConfidence}
                      onChange={(event) =>
                        setConfidence((current) => ({ ...current, [moduleInfo.id]: Number(event.target.value) }))
                      }
                      style={{ flexGrow: 1 }}
                    />
                    <span style={{ fontWeight: 600 }}>{currentConfidence}%</span>
                  </div>
                  <p style={{ marginTop: '0.35rem', color: '#64748b' }}>
                    Adjust the slider after each activity to capture how confident you feel applying the material.
                  </p>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Scenario lab</h4>
                  <p style={{ color: '#475569', marginBottom: '0.75rem' }}>{practiceScenario}</p>
                  <textarea
                    rows={3}
                    placeholder="Sketch your approach or talking points here."
                    value={reflection}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [moduleInfo.id]: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
