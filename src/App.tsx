import { useState, useEffect } from 'react';
import type { Task, CalendarEvent, PrioritizationWeights, AuditLog, UserSettings, TaskCategory } from './types';
import { calculateTaskScore, DEFAULT_WEIGHTS } from './utils/prioritizer';
import Dashboard from './components/Dashboard';
import Capture from './components/Capture';
import Planner from './components/Planner';
import CalendarView from './components/CalendarView';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

// Default user settings
const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: '',
  openaiApiKey: '',
  autonomyLevel: 'suggestions',
  controlGroup: false,
  dailyStart: '09:00',
  dailyEnd: '17:00'
};

// Seed initial task data
const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'File Q2 Quarterly Tax Returns',
    category: 'finance',
    description: 'Calculate write-offs, gather 1099s, and submit the tax form to IRS portal.',
    deadline: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(), // 28 hours from now
    importance: 9,
    consequence: 9,
    effort: 7,
    status: 'pending',
    priorityScore: 0,
    explanation: '',
    steps: [
      { id: 'step-1-1', description: 'Gather receipts and W2/1099 documents', duration: 30, completed: false },
      { id: 'step-1-2', description: 'Fill IRS Schedule C online worksheet', duration: 45, completed: false },
      { id: 'step-1-3', description: 'Review with accountant or tax software audit checklist', duration: 20, completed: false },
      { id: 'step-1-4', description: 'Authorize electronic payment and submit', duration: 10, completed: false }
    ],
    habitPenalty: 8, // User struggles with tax tasks
    personalizationOffset: 2,
    focusBlocksScheduled: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    title: 'Prepare Slide Deck for Client Pitch',
    category: 'work',
    description: 'Draft the growth metrics and proposal pages for the Acme Corp account presentation.',
    deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 3 days from now
    importance: 8,
    consequence: 7,
    effort: 5,
    status: 'in-progress',
    priorityScore: 0,
    explanation: '',
    steps: [
      { id: 'step-2-1', description: 'Compile case studies and product slides', duration: 30, completed: true },
      { id: 'step-2-2', description: 'Write presentation script outline', duration: 20, completed: false },
      { id: 'step-2-3', description: 'Polish animations and design layout', duration: 20, completed: false }
    ],
    habitPenalty: 3,
    personalizationOffset: 0,
    focusBlocksScheduled: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    title: 'Book annual health assessment',
    category: 'health',
    description: 'Call general clinic to book physical checkup and request blood panel referral.',
    deadline: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString(), // 5 days from now
    importance: 6,
    consequence: 5,
    effort: 2,
    status: 'pending',
    priorityScore: 0,
    explanation: '',
    steps: [
      { id: 'step-3-1', description: 'Find insurance network doctor options', duration: 10, completed: false },
      { id: 'step-3-2', description: 'Call reception desk and schedule slot', duration: 10, completed: false }
    ],
    habitPenalty: 6,
    personalizationOffset: 1,
    focusBlocksScheduled: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-4',
    title: 'De-clutter home office desk',
    category: 'personal',
    description: 'Sort papers, organize cables, and dust surfaces.',
    deadline: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(), // 7 days from now
    importance: 3,
    consequence: 2,
    effort: 4,
    status: 'pending',
    priorityScore: 0,
    explanation: '',
    steps: [],
    habitPenalty: 1,
    personalizationOffset: 0,
    focusBlocksScheduled: false,
    createdAt: new Date().toISOString()
  }
];

// Seed initial calendar events (today & tomorrow)
const createSeedCalendarEvents = (): CalendarEvent[] => {
  const now = new Date();
  
  // Set times for today/tomorrow
  const today = (hours: number, minutes: number = 0) => {
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };
  
  const tomorrow = (hours: number, minutes: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'cal-1',
      title: 'Daily Standup Sync',
      startTime: today(10, 0),
      endTime: today(10, 30),
      type: 'external',
      attendees: ['Sarah', 'David', 'Alex']
    },
    {
      id: 'cal-2',
      title: 'Project Architecture Review',
      startTime: today(14, 0),
      endTime: today(15, 30),
      type: 'external',
      attendees: ['Sarah', 'Lead Architect']
    },
    {
      id: 'cal-3',
      title: 'Weekly Budget Allocation (Conflicts with Tax Deadline)',
      startTime: tomorrow(11, 0),
      endTime: tomorrow(12, 30),
      type: 'external',
      attendees: ['Finance VP', 'Operations Lead'],
      location: 'Conference Room Alpha'
    }
  ];
};

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    action: 'Synced Google Calendar',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), // 3h ago
    status: 'success',
    details: 'Imported 3 upcoming external calendar events.'
  },
  {
    id: 'log-2',
    action: 'Analyzed Inbox (mock_inbox_1)',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2h ago
    status: 'success',
    details: 'Scanned 1 email from IRS regarding Q2 deadline. Auto-extracted task details.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [weights, setWeights] = useState<PrioritizationWeights>(DEFAULT_WEIGHTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load from localStorage or seed database on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('aura_tasks');
    const savedEvents = localStorage.getItem('aura_events');
    const savedWeights = localStorage.getItem('aura_weights');
    const savedLogs = localStorage.getItem('aura_logs');
    const savedSettings = localStorage.getItem('aura_settings');

    const loadedWeights = savedWeights ? JSON.parse(savedWeights) : DEFAULT_WEIGHTS;
    setWeights(loadedWeights);

    const loadedSettings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
    setSettings(loadedSettings);

    const initialEventsList = savedEvents ? JSON.parse(savedEvents) : createSeedCalendarEvents();
    setCalendarEvents(initialEventsList);

    const initialLogsList = savedLogs ? JSON.parse(savedLogs) : INITIAL_AUDIT_LOGS;
    setAuditLogs(initialLogsList);

    // Load tasks, recalculating priority scores dynamically based on the current time and weights!
    const rawTasks: Task[] = savedTasks ? JSON.parse(savedTasks) : INITIAL_TASKS;
    const scoredTasks = rawTasks.map(t => {
      const { score, explanation } = calculateTaskScore(t, loadedWeights);
      return { ...t, priorityScore: score, explanation };
    });
    setTasks(scoredTasks);
  }, []);

  // Save changes to localStorage and recalculate scores when tasks, weights, or calendarEvents change
  const saveState = (newTasks: Task[], newEvents: CalendarEvent[], newLogs: AuditLog[], newSettings: UserSettings, newWeights: PrioritizationWeights) => {
    localStorage.setItem('aura_tasks', JSON.stringify(newTasks));
    localStorage.setItem('aura_events', JSON.stringify(newEvents));
    localStorage.setItem('aura_logs', JSON.stringify(newLogs));
    localStorage.setItem('aura_settings', JSON.stringify(newSettings));
    localStorage.setItem('aura_weights', JSON.stringify(newWeights));
  };

  const handleUpdateWeights = (newWeights: PrioritizationWeights) => {
    setWeights(newWeights);
    const updatedTasks = tasks.map(t => {
      const { score, explanation } = calculateTaskScore(t, newWeights);
      return { ...t, priorityScore: score, explanation };
    });
    setTasks(updatedTasks);
    saveState(updatedTasks, calendarEvents, auditLogs, settings, newWeights);
    
    // Add audit log
    addAuditLog('Adjusted Priority Weights', 'success', `Recalculated scores for ${tasks.length} tasks.`);
  };

  const addAuditLog = (action: string, status: 'success' | 'undone' | 'failed', details?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      timestamp: new Date().toISOString(),
      status,
      details
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveState(tasks, calendarEvents, updatedLogs, settings, weights);
  };

  const handleUndoAuditLog = (logId: string) => {
    const updatedLogs = auditLogs.map(log => {
      if (log.id === logId) {
        // Reverse whatever was scheduled if related
        if (log.action.includes('Scheduled Focus block') && log.details) {
          const blockTitle = log.details.match(/"([^"]+)"/)?.[1];
          if (blockTitle) {
            setCalendarEvents(prev => {
              const filtered = prev.filter(e => e.title !== blockTitle);
              localStorage.setItem('aura_events', JSON.stringify(filtered));
              return filtered;
            });
          }
        }
        return { ...log, status: 'undone' as const };
      }
      return log;
    });
    setAuditLogs(updatedLogs);
    addAuditLog(`Undid action: ${auditLogs.find(l => l.id === logId)?.action}`, 'success');
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveState(tasks, calendarEvents, auditLogs, newSettings, weights);
    addAuditLog('Updated Settings Configuration', 'success');
  };

  const handleAddTask = (newTaskData: {
    title: string;
    category: TaskCategory;
    deadline: string;
    importance: number;
    consequence: number;
    effort: number;
    habitPenalty: number;
    personalizationOffset: number;
    description: string;
    steps: any[];
  }) => {
    const id = `task-${Date.now()}`;
    const newTaskObj: Omit<Task, 'priorityScore' | 'explanation'> = {
      ...newTaskData,
      id,
      status: 'pending',
      focusBlocksScheduled: false,
      createdAt: new Date().toISOString()
    };
    const { score, explanation } = calculateTaskScore(newTaskObj, weights);
    const completedTask: Task = { ...newTaskObj, priorityScore: score, explanation };
    
    const updatedTasks = [completedTask, ...tasks];
    setTasks(updatedTasks);
    saveState(updatedTasks, calendarEvents, auditLogs, settings, weights);
    addAuditLog(`Captured task: "${completedTask.title}"`, 'success', `Score: ${score}/100. Category: ${completedTask.category}.`);
  };

  const handleDeleteTask = (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    saveState(updatedTasks, calendarEvents, auditLogs, settings, weights);
    if (deletedTask) {
      addAuditLog(`Deleted task: "${deletedTask.title}"`, 'success');
    }
  };

  const handleToggleTaskComplete = (taskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        const updatedTask = { ...t, status: nextStatus as any };
        const { score, explanation } = calculateTaskScore(updatedTask, weights);
        return { ...updatedTask, priorityScore: score, explanation };
      }
      return t;
    });
    setTasks(updatedTasks);
    saveState(updatedTasks, calendarEvents, auditLogs, settings, weights);

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const isCompleting = task.status !== 'completed';
      addAuditLog(
        isCompleting ? `Completed task: "${task.title}"` : `Marked task as pending: "${task.title}"`,
        'success'
      );
    }
  };

  const handleUpdateTaskSteps = (taskId: string, steps: any[]) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, steps };
      }
      return t;
    });
    setTasks(updatedTasks);
    saveState(updatedTasks, calendarEvents, auditLogs, settings, weights);
  };

  const handleToggleStepComplete = (taskId: string, stepId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSteps = t.steps.map(s => {
          if (s.id === stepId) {
            return { ...s, completed: !s.completed };
          }
          return s;
        });
        // Check if all steps are completed
        const allCompleted = updatedSteps.length > 0 && updatedSteps.every(s => s.completed);
        const nextStatus = allCompleted ? 'completed' : 'in-progress';
        const updatedTask = { ...t, steps: updatedSteps, status: nextStatus as any };
        const { score, explanation } = calculateTaskScore(updatedTask, weights);
        return { ...updatedTask, priorityScore: score, explanation };
      }
      return t;
    });
    setTasks(updatedTasks);
    saveState(updatedTasks, calendarEvents, auditLogs, settings, weights);
  };

  const handleScheduleFocusBlock = (taskId: string, date: string, startTime: string, durationMin: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    const newEvent: CalendarEvent = {
      id: `cal-${Date.now()}`,
      title: `Focus: ${task.title}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type: 'task-block',
      relatedTaskId: taskId
    };

    const updatedEvents = [...calendarEvents, newEvent];
    setCalendarEvents(updatedEvents);

    // Update task focusBlocksScheduled state
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, focusBlocksScheduled: true };
      }
      return t;
    });
    setTasks(updatedTasks);

    saveState(updatedTasks, updatedEvents, auditLogs, settings, weights);
    addAuditLog(
      `Scheduled Focus block for "${task.title}"`,
      'success',
      `Locked 1 slot on ${date} from ${startTime} to ${end.toTimeString().slice(0, 5)}.`
    );
  };

  const handleMoveEvent = (eventId: string, newStart: string, newEnd: string) => {
    const updatedEvents = calendarEvents.map(e => {
      if (e.id === eventId) {
        return { ...e, startTime: newStart, endTime: newEnd };
      }
      return e;
    });
    setCalendarEvents(updatedEvents);
    saveState(tasks, updatedEvents, auditLogs, settings, weights);
    
    const targetEvent = calendarEvents.find(e => e.id === eventId);
    addAuditLog(
      `Rescheduled Event: "${targetEvent?.title}"`,
      'success',
      `Moved to ${new Date(newStart).toLocaleString()}`
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="brand-name">AURA AI</span>
        </div>

        <ul className="nav-links">
          <li className="nav-item">
            <button className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-button ${activeTab === 'capture' ? 'active' : ''}`} onClick={() => setActiveTab('capture')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Smart Capture
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-button ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Micro-Steps
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-button ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Smart Calendar
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Analytics & A/B
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings & Logs
            </button>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: settings.controlGroup ? 'var(--text-muted)' : 'var(--accent-emerald)' }}></span>
            Mode: {settings.controlGroup ? 'Control (Standard)' : 'Treatment (Aura AI)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Aura Proactive MVP v1.0
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-title">
            <h1 style={{ textTransform: 'capitalize' }}>{activeTab === 'calendar' ? 'Smart Calendar Schedule' : activeTab === 'analytics' ? 'Performance Insights' : `${activeTab} view`}</h1>
          </div>
          <div className="header-meta">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        <div className="view-wrapper">
          {activeTab === 'dashboard' && (
            <Dashboard 
              tasks={tasks}
              weights={weights}
              onUpdateWeights={handleUpdateWeights}
              onToggleComplete={handleToggleTaskComplete}
              onDelete={handleDeleteTask}
              onSelectPlanner={() => setActiveTab('planner')}
              onSelectCalendar={() => setActiveTab('calendar')}
            />
          )}

          {activeTab === 'capture' && (
            <Capture 
              onAddTask={handleAddTask}
              settings={settings}
            />
          )}

          {activeTab === 'planner' && (
            <Planner 
              tasks={tasks}
              onToggleStep={handleToggleStepComplete}
              onUpdateSteps={handleUpdateTaskSteps}
              onScheduleFocusBlock={handleScheduleFocusBlock}
              onToggleTaskComplete={handleToggleTaskComplete}
              settings={settings}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView 
              tasks={tasks}
              events={calendarEvents}
              onMoveEvent={handleMoveEvent}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics 
              tasks={tasks}
            />
          )}

          {activeTab === 'settings' && (
            <Settings 
              settings={settings}
              onSaveSettings={handleSaveSettings}
              auditLogs={auditLogs}
              onUndoLog={handleUndoAuditLog}
            />
          )}
        </div>
      </main>
    </div>
  );
}
