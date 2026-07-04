import { useState, type FormEvent } from 'react';
import type { UserSettings, AuditLog } from '../types';

interface SettingsProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  auditLogs: AuditLog[];
  onUndoLog: (logId: string) => void;
}

export default function Settings({
  settings,
  onSaveSettings,
  auditLogs,
  onUndoLog
}: SettingsProps) {
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey);
  const [autonomy, setAutonomy] = useState(settings.autonomyLevel);
  const [controlGroup, setControlGroup] = useState(settings.controlGroup);
  const startHour = settings.dailyStart;
  const endHour = settings.dailyEnd;

  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      geminiApiKey: geminiKey,
      openaiApiKey: openaiKey,
      autonomyLevel: autonomy,
      controlGroup,
      dailyStart: startHour,
      dailyEnd: endHour
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="grid-dashboard">
        
        {/* Left Side: Settings Forms */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>System Configuration</h2>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* API Gateways */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>AI Model Credentials</h3>
              
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="input-label">Gemini API Key</label>
                  <button 
                    type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-violet)', fontSize: '0.8rem', cursor: 'pointer' }}
                    onClick={() => setShowGemini(!showGemini)}
                  >
                    {showGemini ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showGemini ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter Gemini API Key..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="input-label">OpenAI API Key</label>
                  <button 
                    type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-violet)', fontSize: '0.8rem', cursor: 'pointer' }}
                    onClick={() => setShowOpenai(!showOpenai)}
                  >
                    {showOpenai ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showOpenai ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter OpenAI API Key..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                * Keys are saved locally in localStorage. Leave blank to run Aura's default high-fidelity heuristic parser.
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

            {/* Autonomy Level Policies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Autonomy & Actions Level</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="radio" name="autonomy" style={{ marginTop: '4px' }}
                    checked={autonomy === 'suggestions'}
                    onChange={() => setAutonomy('suggestions')}
                  />
                  <div>
                    <strong>Suggestions Only (Manual)</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Aura alerts you of conflicts and proposes slot revisions, but takes no action without click confirmation.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="radio" name="autonomy" style={{ marginTop: '4px' }}
                    checked={autonomy === 'assisted'}
                    onChange={() => setAutonomy('assisted')}
                  />
                  <div>
                    <strong>Assisted (One-Tap Approval)</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Aura drafts notification messages and finds slots automatically, showing alerts requiring a single-tap confirmation.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="radio" name="autonomy" style={{ marginTop: '4px' }}
                    checked={autonomy === 'autonomous'}
                    onChange={() => setAutonomy('autonomous')}
                  />
                  <div>
                    <strong>Autonomous (Pre-Approved Actions)</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Aura reschedules conflicting meetings and logs invites immediately, showing a review banner with full Undo logs.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

            {/* Study Cohort (A/B testing toggle) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cohort Testing Configuration</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={controlGroup}
                  onChange={(e) => setControlGroup(e.target.checked)}
                />
                <div>
                  <strong>Enroll in Control Group</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Forces default calendar reminders and shuts down priority re-ranking for user cohort comparison.
                  </div>
                </div>
              </label>
            </div>

            {saveSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                ✓ Settings saved successfully! Recalculated active states.
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Save Configuration
            </button>

          </form>
        </div>

        {/* Right Side: Immutable Audit logs trail */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Immutable Operations Audit Log</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Chronological ledger of autonomous actions taken. Revocable at any point.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '450px', paddingRight: '4px' }}>
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                style={{ 
                  padding: '12px', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '8px',
                  opacity: log.status === 'undone' ? 0.5 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{log.action}</strong>
                  <span className={`badge ${log.status === 'success' ? 'badge-health' : log.status === 'undone' ? 'badge-admin' : 'badge-urgent'}`} style={{ fontSize: '0.6rem' }}>
                    {log.status}
                  </span>
                </div>
                {log.details && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {log.details}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()} - {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                  {log.status === 'success' && (log.action.includes('Focus block') || log.action.includes('Rescheduled')) && (
                    <button 
                      className="btn btn-secondary btn-small"
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      onClick={() => onUndoLog(log.id)}
                    >
                      ↺ Undo action
                    </button>
                  )}
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No operations logged.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
