import { useState } from 'react';
import type { Task, PrioritizationWeights } from '../types';

interface DashboardProps {
  tasks: Task[];
  weights: PrioritizationWeights;
  onUpdateWeights: (weights: PrioritizationWeights) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectPlanner: () => void;
  onSelectCalendar: () => void;
}

export default function Dashboard({
  tasks,
  weights,
  onUpdateWeights,
  onToggleComplete,
  onDelete,
  onSelectPlanner,
  onSelectCalendar
}: DashboardProps) {
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [tempWeights, setTempWeights] = useState<PrioritizationWeights>({ ...weights });

  // Get active tasks sorted by priorityScore descending
  const activeTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const highImpact3 = activeTasks.slice(0, 3);
  const otherTasks = activeTasks.slice(3);
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // SVG progress ring math
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  const handleWeightChange = (key: keyof PrioritizationWeights, val: number) => {
    setTempWeights(prev => ({
      ...prev,
      [key]: parseFloat(val.toFixed(1))
    }));
  };

  const handleApplyWeights = () => {
    onUpdateWeights(tempWeights);
    setShowWeightsModal(false);
  };

  const handleResetWeights = () => {
    const defaultVals = { timePressure: 2.5, importance: 2.0, effortInverse: 1.5, consequence: 2.5, habitPenalty: 1.5 };
    setTempWeights(defaultVals);
    onUpdateWeights(defaultVals);
    setShowWeightsModal(false);
  };

  const getCategoryBadge = (cat: string) => {
    return <span className={`badge badge-${cat}`}>{cat}</span>;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'badge-urgent';
    if (score >= 60) return 'badge-high';
    if (score >= 40) return 'badge-medium';
    return 'badge-low';
  };

  return (
    <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upper metrics and configuration */}
      <div className="grid-dashboard">
        
        {/* Banner with Progress & Quick Ingest recommendation */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '32px', position: 'relative', overflow: 'hidden' }}>
          <div className="progress-ring-container">
            <svg width="150" height="150">
              <circle
                stroke="rgba(255,255,255,0.05)"
                fill="transparent"
                strokeWidth="10"
                r={radius}
                cx="75"
                cy="75"
              />
              <circle
                stroke="var(--accent-violet)"
                fill="transparent"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="progress-ring-circle"
                r={radius}
                cx="75"
                cy="75"
              />
            </svg>
            <div className="progress-ring-text">
              <span>{completionPercentage}%</span>
              <span className="progress-ring-subtext">Done</span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', fontWeight: 700 }}>Welcome back to Aura</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', maxWidth: '450px' }}>
              Your proactive companion is monitoring upcoming deadlines. Adjust the scoring sliders to realign priorities.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary btn-small" onClick={() => setShowWeightsModal(true)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Tune Priority Model
              </button>
            </div>
          </div>
        </div>

        {/* Priorities Model Weight Panel Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Priority Utility Weights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ color: 'var(--text-secondary)' }}>⏰ Time Pressure</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-violet)', fontSize: '1.1rem' }}>{weights.timePressure}x</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ color: 'var(--text-secondary)' }}>⭐ Importance</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-violet)', fontSize: '1.1rem' }}>{weights.importance}x</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ color: 'var(--text-secondary)' }}>⚡ Inverse Effort</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-violet)', fontSize: '1.1rem' }}>{weights.effortInverse}x</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ color: 'var(--text-secondary)' }}>🚨 Consequence</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-violet)', fontSize: '1.1rem' }}>{weights.consequence}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's High Impact 3 */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-rose)', boxShadow: '0 0 10px rgba(244,63,94,0.5)' }}></span>
          Today's High-Impact 3
        </h2>
        
        {highImpact3.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No high impact tasks pending. Time to take a breather or ingest new tasks!
          </div>
        ) : (
          <div className="grid-3">
            {highImpact3.map((task) => (
              <div key={task.id} className="glass-card interactive animated-fade-in" style={{ borderTop: '4px solid var(--accent-violet)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    {getCategoryBadge(task.category)}
                    <span className={`badge ${getScoreBadgeColor(task.priorityScore)}`}>Score: {task.priorityScore}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{task.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {task.description || 'No description provided.'}
                  </p>
                  
                  {/* Explanation Block */}
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent-violet)', marginBottom: '16px' }}>
                    <strong>Why this now?</strong> {task.explanation}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <span>📅 Due: {new Date(task.deadline).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({new Date(task.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})</span>
                    <span>⏳ {task.steps.length} Steps</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-small" style={{ flex: 1 }} onClick={onSelectPlanner}>
                      ⚡ Do Now
                    </button>
                    <button className="btn btn-secondary btn-small" style={{ flex: 1 }} onClick={onSelectCalendar}>
                      🗓️ Schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Task list */}
      <div className="grid-2">
        {/* Remaining Scored Tasks */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Remaining Scored Tasks ({otherTasks.length})</h3>
          {otherTasks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No other pending tasks.</p>
          ) : (
            <ul className="task-list">
              {otherTasks.map(task => (
                <li key={task.id} className="task-item animated-fade-in">
                  <div className="task-info">
                    <button className="task-checkbox-btn" onClick={() => onToggleComplete(task.id)}></button>
                    <div className="task-details">
                      <span className="task-title">{task.title}</span>
                      <div className="task-meta-row">
                        {getCategoryBadge(task.category)}
                        <span>Score: <span className="task-score-badge">{task.priorityScore}</span></span>
                        <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-small" onClick={() => onDelete(task.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recently Completed Tasks */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Completed Tasks ({completedTasks.length})</h3>
          {completedTasks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No completed tasks yet. Finish a task in the Focus session to check it off!</p>
          ) : (
            <ul className="task-list">
              {completedTasks.map(task => (
                <li key={task.id} className="task-item animated-fade-in" style={{ opacity: 0.6 }}>
                  <div className="task-info">
                    <button className="task-checkbox-btn completed" onClick={() => onToggleComplete(task.id)}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <div className="task-details">
                      <span className="task-title completed">{task.title}</span>
                      <div className="task-meta-row">
                        {getCategoryBadge(task.category)}
                        <span>Completed</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-small" onClick={() => onDelete(task.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Model Weights Tuning Modal */}
      {showWeightsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Tune Prioritization Algorithm</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Modify the weight coefficients ($w_1$ to $w_5$) of the utility scoring model to adjust priority ranking behavior.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
              <div className="slider-container">
                <div className="slider-header">
                  <span className="weight-name">⏰ Time Pressure ($w_1$)</span>
                  <span className="weight-val">{tempWeights.timePressure}</span>
                </div>
                <input
                  type="range" min="0" max="5" step="0.1"
                  className="form-slider"
                  value={tempWeights.timePressure}
                  onChange={(e) => handleWeightChange('timePressure', parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span className="weight-name">⭐ Task Importance ($w_2$)</span>
                  <span className="weight-val">{tempWeights.importance}</span>
                </div>
                <input
                  type="range" min="0" max="5" step="0.1"
                  className="form-slider"
                  value={tempWeights.importance}
                  onChange={(e) => handleWeightChange('importance', parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span className="weight-name">⚡ Inverse Effort ($w_3$)</span>
                  <span className="weight-val">{tempWeights.effortInverse}</span>
                </div>
                <input
                  type="range" min="0" max="5" step="0.1"
                  className="form-slider"
                  value={tempWeights.effortInverse}
                  onChange={(e) => handleWeightChange('effortInverse', parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span className="weight-name">🚨 Consequence ($w_4$)</span>
                  <span className="weight-val">{tempWeights.consequence}</span>
                </div>
                <input
                  type="range" min="0" max="5" step="0.1"
                  className="form-slider"
                  value={tempWeights.consequence}
                  onChange={(e) => handleWeightChange('consequence', parseFloat(e.target.value))}
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span className="weight-name">🔁 Habit Penalty ($w_5$)</span>
                  <span className="weight-val">{tempWeights.habitPenalty}</span>
                </div>
                <input
                  type="range" min="0" max="5" step="0.1"
                  className="form-slider"
                  value={tempWeights.habitPenalty}
                  onChange={(e) => handleWeightChange('habitPenalty', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handleResetWeights}>Reset Defaults</button>
              <button className="btn btn-primary" onClick={handleApplyWeights}>Apply & Re-rank</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
