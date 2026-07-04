import { useState, useEffect } from 'react';
import type { Task, MicroStep, UserSettings } from '../types';
import { generateMicroSteps } from '../utils/ai';

interface PlannerProps {
  tasks: Task[];
  onToggleStep: (taskId: string, stepId: string) => void;
  onUpdateSteps: (taskId: string, steps: MicroStep[]) => void;
  onScheduleFocusBlock: (taskId: string, date: string, startTime: string, durationMin: number) => void;
  onToggleTaskComplete: (taskId: string) => void;
  settings: UserSettings;
}

export default function Planner({
  tasks,
  onToggleStep,
  onUpdateSteps,
  onScheduleFocusBlock,
  onToggleTaskComplete,
  settings
}: PlannerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingDuration, setEditingDuration] = useState(15);

  // New step inputs
  const [newStepText, setNewStepText] = useState('');
  const [newStepDuration, setNewStepDuration] = useState(15);

  // Scheduling inputs
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState(30);

  // Pomodoro Autoplay Mode states
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [autoplayStepIndex, setAutoplayStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Find selected task
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || activeTasks[0];

  // Set default selected task id
  useEffect(() => {
    if (selectedTask && !selectedTaskId) {
      setSelectedTaskId(selectedTask.id);
    }
  }, [selectedTask, selectedTaskId]);

  // Handle countdown logic in Autoplay Mode
  useEffect(() => {
    let interval: any = null;
    if (isAutoplay && isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isAutoplay && isTimerRunning) {
      // Step complete!
      setIsTimerRunning(false);
      handleStepTimeout();
    }
    return () => clearInterval(interval);
  }, [isAutoplay, isTimerRunning, timeLeft]);

  // When selected task steps change, or active step shifts in autoplay
  const startAutoplayMode = () => {
    if (!selectedTask || selectedTask.steps.length === 0) return;
    
    // Find first incomplete step
    const firstIncompleteIdx = selectedTask.steps.findIndex(s => !s.completed);
    const startIdx = firstIncompleteIdx === -1 ? 0 : firstIncompleteIdx;
    
    setAutoplayStepIndex(startIdx);
    setTimeLeft(selectedTask.steps[startIdx].duration * 60);
    setIsAutoplay(true);
    setIsTimerRunning(true);
  };

  const handleStepTimeout = () => {
    if (!selectedTask) return;
    const currentStep = selectedTask.steps[autoplayStepIndex];
    if (currentStep) {
      // Auto toggle complete
      onToggleStep(selectedTask.id, currentStep.id);
    }

    // Try to go to next incomplete step
    const nextIdx = autoplayStepIndex + 1;
    if (nextIdx < selectedTask.steps.length) {
      setAutoplayStepIndex(nextIdx);
      setTimeLeft(selectedTask.steps[nextIdx].duration * 60);
      setIsTimerRunning(true);
    } else {
      // End of session!
      setIsAutoplay(false);
      alert('Congratulations! You completed all the micro-steps for this focus session.');
    }
  };

  const handleGenerateSteps = async () => {
    if (!selectedTask) return;
    setIsGenerating(true);
    try {
      const keys = {
        geminiKey: settings.geminiApiKey || undefined,
        openaiKey: settings.openaiApiKey || undefined
      };
      const rawSteps = await generateMicroSteps(selectedTask.title, selectedTask.category, keys);
      const formattedSteps: MicroStep[] = rawSteps.map((s, idx) => ({
        id: `step-${selectedTask.id}-${Date.now()}-${idx}`,
        description: s.description,
        duration: s.duration,
        completed: false
      }));
      onUpdateSteps(selectedTask.id, formattedSteps);
    } catch (e) {
      console.error(e);
      alert('Failed to generate steps.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddStep = () => {
    if (!selectedTask || !newStepText.trim()) return;
    const newStep: MicroStep = {
      id: `step-man-${Date.now()}`,
      description: newStepText.trim(),
      duration: newStepDuration,
      completed: false
    };
    onUpdateSteps(selectedTask.id, [...selectedTask.steps, newStep]);
    setNewStepText('');
    setNewStepDuration(15);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selectedTask) return;
    const updated = selectedTask.steps.filter(s => s.id !== stepId);
    onUpdateSteps(selectedTask.id, updated);
  };

  const startEditStep = (step: MicroStep) => {
    setEditingStepId(step.id);
    setEditingText(step.description);
    setEditingDuration(step.duration);
  };

  const saveEditStep = () => {
    if (!selectedTask || !editingStepId) return;
    const updated = selectedTask.steps.map(s => {
      if (s.id === editingStepId) {
        return { ...s, description: editingText, duration: editingDuration };
      }
      return s;
    });
    onUpdateSteps(selectedTask.id, updated);
    setEditingStepId(null);
  };

  const handleQuickScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !scheduleDate || !scheduleTime) return;
    onScheduleFocusBlock(selectedTask.id, scheduleDate, scheduleTime, scheduleDuration);
    // Reset values
    setScheduleDate('');
    setScheduleTime('');
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Autoplay Full Screen/Overlay Overlay when active */}
      {isAutoplay && selectedTask && (
        <div className="glass-card pomodoro-container animated-fade-in" style={{ border: '2px solid var(--accent-violet-border)', padding: '48px', position: 'relative' }}>
          
          <button 
            className="btn btn-secondary btn-small" 
            style={{ position: 'absolute', right: '24px', top: '24px' }}
            onClick={() => setIsAutoplay(false)}
          >
            ✕ Exit Focus Mode
          </button>

          <span className="timer-sublabel">Focus Session Active</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '8px 0', textAlign: 'center' }}>
            Task: {selectedTask.title}
          </h2>

          <div className="timer-display">
            {formatTime(timeLeft)}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '500px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Micro-Step:</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {selectedTask.steps[autoplayStepIndex]?.description || 'No step active'}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
            <button
              className={`btn ${isTimerRunning ? 'btn-secondary' : 'btn-primary pulsing-glow'}`}
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? '⏸ Pause Timer' : '▶ Resume Timer'}
            </button>
            
            <button
              className="btn btn-accent"
              onClick={() => {
                onToggleStep(selectedTask.id, selectedTask.steps[autoplayStepIndex].id);
                // Advance
                if (autoplayStepIndex + 1 < selectedTask.steps.length) {
                  const nextIdx = autoplayStepIndex + 1;
                  setAutoplayStepIndex(nextIdx);
                  setTimeLeft(selectedTask.steps[nextIdx].duration * 60);
                } else {
                  setIsAutoplay(false);
                  alert('Focus session complete!');
                }
              }}
            >
              ✓ Complete & Next
            </button>
          </div>

          {/* Checklist progress tracker */}
          <div style={{ width: '100%', maxWidth: '500px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Checklist Progress</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedTask.steps.map((s, idx) => (
                <div 
                  key={s.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    fontSize: '0.9rem',
                    opacity: s.completed ? 0.4 : 1,
                    color: idx === autoplayStepIndex ? 'var(--accent-violet)' : 'var(--text-primary)',
                    fontWeight: idx === autoplayStepIndex ? 700 : 400
                  }}
                >
                  <span style={{ fontSize: '0.8rem', background: idx === autoplayStepIndex ? 'var(--accent-violet-glow)' : 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, textDecoration: s.completed ? 'line-through' : 'none' }}>{s.description}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.duration}m</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Main planner grid */}
      {!isAutoplay && (
        <div className="grid-dashboard">
          
          {/* Left panel: Task selector & Steps checklists */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="input-group" style={{ maxWidth: '280px' }}>
                <label className="input-label">Select Task to Plan</label>
                <select
                  className="form-select"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  {activeTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                  {activeTasks.length === 0 && <option value="">No pending tasks</option>}
                </select>
              </div>

              {selectedTask && (
                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => onToggleTaskComplete(selectedTask.id)}
                  >
                    ✓ Complete Task
                  </button>
                  <button 
                    className="btn btn-primary btn-small" 
                    disabled={selectedTask.steps.length === 0}
                    onClick={startAutoplayMode}
                  >
                    🚀 Start Focus Session
                  </button>
                </div>
              )}
            </div>

            {selectedTask ? (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    Sequence of Micro-steps
                  </h3>
                  {selectedTask.steps.length === 0 && (
                    <button
                      className="btn btn-accent btn-small"
                      onClick={handleGenerateSteps}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating steps...' : '🤖 Generate Steps with AI'}
                    </button>
                  )}
                </div>

                {selectedTask.steps.length === 0 ? (
                  <div style={{ border: '1px dashed var(--border-light)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No steps created yet. Click "Generate Steps with AI" above to let Aura decompose this task, or add steps manually below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {selectedTask.steps.map((step) => (
                      <div 
                        key={step.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '12px', 
                          background: 'rgba(255,255,255,0.01)', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: '8px'
                        }}
                      >
                        {editingStepId === step.id ? (
                          <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                            <input 
                              type="text" className="form-input" style={{ flex: 1, padding: '6px 12px' }}
                              value={editingText} onChange={(e) => setEditingText(e.target.value)} 
                            />
                            <input 
                              type="number" className="form-input" style={{ width: '80px', padding: '6px 12px' }}
                              value={editingDuration} onChange={(e) => setEditingDuration(parseInt(e.target.value) || 15)} 
                            />
                            <button className="btn btn-primary btn-small" onClick={saveEditStep}>Save</button>
                            <button className="btn btn-secondary btn-small" onClick={() => setEditingStepId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              <button 
                                className={`task-checkbox-btn ${step.completed ? 'completed' : ''}`}
                                onClick={() => onToggleStep(selectedTask.id, step.id)}
                              >
                                {step.completed && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                              </button>
                              <span style={{ fontSize: '0.92rem', color: step.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: step.completed ? 'line-through' : 'none' }}>
                                {step.description}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>
                                {step.duration} mins
                              </span>
                              <button className="btn btn-secondary btn-small" onClick={() => startEditStep(step)} style={{ padding: '4px 8px' }}>Edit</button>
                              <button className="btn btn-danger btn-small" onClick={() => handleDeleteStep(step.id)} style={{ padding: '4px 8px' }}>✕</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Step Manually */}
                <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <input
                    type="text" className="form-input" style={{ flex: 1 }}
                    placeholder="Add step manually..."
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                  />
                  <input
                    type="number" className="form-input" style={{ width: '100px' }}
                    placeholder="Mins" min="1"
                    value={newStepDuration}
                    onChange={(e) => setNewStepDuration(parseInt(e.target.value) || 15)}
                  />
                  <button className="btn btn-secondary" onClick={handleAddStep}>
                    + Add Step
                  </button>
                </div>

              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px' }}>Create tasks in the Smart Capture view to begin planning.</p>
            )}

          </div>

          {/* Right panel: Calendar Focus Scheduling tool */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignSelf: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>Schedule Focus Block</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Allocate time in your schedule to execute this task's micro-steps.
              </p>
            </div>

            {selectedTask ? (
              <form onSubmit={handleQuickScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input
                    type="date" className="form-input" required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Start Time</label>
                  <input
                    type="time" className="form-input" required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Focus Block Duration</label>
                  <select
                    className="form-select"
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(parseInt(e.target.value))}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes (Recommended)</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="90">90 Minutes</option>
                    <option value="120">120 Minutes</option>
                  </select>
                </div>

                <button 
                  type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}
                  disabled={selectedTask.focusBlocksScheduled}
                >
                  {selectedTask.focusBlocksScheduled ? '✓ Block Scheduled' : '🗓️ Place in Calendar'}
                </button>

                {selectedTask.focusBlocksScheduled && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', textAlign: 'center' }}>
                    Focus block is already booked. View it in the Smart Calendar tab.
                  </p>
                )}
              </form>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No task selected.</p>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
