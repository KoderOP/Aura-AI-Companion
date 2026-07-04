import { useState, useEffect } from 'react';
import type { UserSettings, TaskCategory } from '../types';
import { extractTaskFromText } from '../utils/ai';

interface CaptureProps {
  onAddTask: (task: {
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
  }) => void;
  settings: UserSettings;
}

// Mock multi-channel feed
const MOCK_INBOX_FEED = [
  {
    id: 'mock-1',
    channel: 'email',
    sender: 'VP of Finance <finance@company.com>',
    subject: 'Action Needed: Submit Q2 vendor invoices for audit by tomorrow night',
    body: 'Hi, please make sure you upload the vendor invoices to the portal. We need these by tomorrow night 11pm or we face late filing penalties.'
  },
  {
    id: 'mock-2',
    channel: 'slack',
    sender: 'Sarah (PM)',
    subject: '#client-pitch-team',
    body: 'Hey! Don\'t forget to create a draft slide deck for the client pitch. Needs to be ready in 3 days. Importance is quite high.'
  },
  {
    id: 'mock-3',
    channel: 'email',
    sender: 'HealthLink <appointments@healthlink.org>',
    subject: 'Confirm appointment booking',
    body: 'Your doctor appointment is pending. Please call the clinic within 5 days to confirm the date and pay the booking copay.'
  }
];

export default function Capture({ onAddTask, settings }: CaptureProps) {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Edit / Confirmation State
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  // Initialize Web Speech API for voice STT
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceToggle = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleParseText = async (textToParse: string, customDesc: string = '') => {
    if (!textToParse.trim()) return;
    setIsParsing(true);
    try {
      const keys = {
        geminiKey: settings.geminiApiKey || undefined,
        openaiKey: settings.openaiApiKey || undefined
      };
      
      const parsedDetails = await extractTaskFromText(textToParse, keys);
      setParsedPreview({
        ...parsedDetails,
        description: customDesc || textToParse,
        personalizationOffset: 0
      });
    } catch (e) {
      console.error(e);
      alert('Error parsing input text.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmTask = () => {
    if (!parsedPreview) return;
    onAddTask({
      title: parsedPreview.title,
      category: parsedPreview.category,
      deadline: parsedPreview.deadline,
      importance: parsedPreview.importance,
      consequence: parsedPreview.consequence,
      effort: parsedPreview.effort,
      habitPenalty: parsedPreview.habitPenalty,
      personalizationOffset: parsedPreview.personalizationOffset,
      description: parsedPreview.description,
      steps: [] // Steps will be generated in the planner mode
    });
    setParsedPreview(null);
    setInputText('');
  };

  const handlePreviewChange = (key: string, val: any) => {
    setParsedPreview((prev: any) => ({
      ...prev,
      [key]: val
    }));
  };

  return (
    <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="grid-2">
        {/* Left Side: Capture Box & Voice */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Smart Natural Language Capture</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Type or speak to capture a task. Aura's NLP parses deadlines, categories, and priority weights instantly.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <textarea
              className="form-input"
              style={{ minHeight: '120px', resize: 'vertical', paddingRight: '50px' }}
              placeholder="e.g. Draft slide deck for marketing campaign by Friday 5pm. Importance 8, consequence 7."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isParsing || isListening}
            />

            {/* STT Button */}
            <button
              className={`btn ${isListening ? 'btn-danger pulsing-glow' : 'btn-secondary'}`}
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '12px',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                padding: 0
              }}
              onClick={handleVoiceToggle}
              title="Voice Ingest (STT)"
              type="button"
            >
              {isListening ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
              )}
            </button>
          </div>

          {isListening && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="listening-visualizer">
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-violet)', fontWeight: 600 }}>LISTENING IN REAL TIME...</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setInputText('')}
              disabled={isParsing || isListening}
            >
              Clear
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleParseText(inputText)}
              disabled={isParsing || isListening || !inputText.trim()}
            >
              {isParsing ? (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'bounce 0.6s infinite alternate' }}><circle cx="12" cy="12" r="10"/></svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Parse & Refine
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Multi-channel Simulation */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Multi-Channel Inbox Ingest</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Simulate ingestion of notification logs from connected Gmail / Slack widgets.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_INBOX_FEED.map((msg) => (
              <div key={msg.id} className="simulator-item animated-fade-in" style={{ borderLeftColor: msg.channel === 'slack' ? '#e01e5a' : 'var(--accent-violet)' }}>
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge" style={{ padding: '2px 6px', fontSize: '0.65rem', background: msg.channel === 'slack' ? 'rgba(224,30,90,0.15)' : 'var(--accent-violet-glow)', color: msg.channel === 'slack' ? '#fca5a5' : '#c084fc' }}>
                      {msg.channel === 'slack' ? 'Slack' : 'Gmail'}
                    </span>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{msg.sender}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {msg.subject}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {msg.body}
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => handleParseText(msg.subject + '. ' + msg.body, msg.body)}
                  disabled={isParsing}
                >
                  ⚡ Ingest
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Extracted Details Confirmation Preview Card */}
      {parsedPreview && (
        <div className="glass-card animated-fade-in" style={{ border: '2px solid var(--accent-violet-border)', boxShadow: 'var(--shadow-glow)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Review AI Extracted Task Properties
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            <div className="input-group">
              <label className="input-label">Task Name</label>
              <input
                type="text" className="form-input"
                value={parsedPreview.title}
                onChange={(e) => handlePreviewChange('title', e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                className="form-select"
                value={parsedPreview.category}
                onChange={(e) => handlePreviewChange('category', e.target.value)}
              >
                <option value="work">Work</option>
                <option value="finance">Finance</option>
                <option value="health">Health</option>
                <option value="personal">Personal</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Deadline Date & Time</label>
              <input
                type="datetime-local" className="form-input"
                value={new Date(parsedPreview.deadline).toISOString().slice(0, 16)}
                onChange={(e) => handlePreviewChange('deadline', new Date(e.target.value).toISOString())}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Importance (1-10)</label>
              <input
                type="number" min="1" max="10" className="form-input"
                value={parsedPreview.importance}
                onChange={(e) => handlePreviewChange('importance', parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Consequence Rating (1-10)</label>
              <input
                type="number" min="1" max="10" className="form-input"
                value={parsedPreview.consequence}
                onChange={(e) => handlePreviewChange('consequence', parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Effort Required (1-10)</label>
              <input
                type="number" min="1" max="10" className="form-input"
                value={parsedPreview.effort}
                onChange={(e) => handlePreviewChange('effort', parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Habit Penalty (1-10)</label>
              <input
                type="number" min="1" max="10" className="form-input"
                value={parsedPreview.habitPenalty}
                onChange={(e) => handlePreviewChange('habitPenalty', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Personalization Offset (+/-)</label>
              <input
                type="number" className="form-input"
                value={parsedPreview.personalizationOffset}
                onChange={(e) => handlePreviewChange('personalizationOffset', parseInt(e.target.value) || 0)}
              />
            </div>

          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">Task Context Description</label>
            <textarea
              className="form-input"
              style={{ minHeight: '60px' }}
              value={parsedPreview.description}
              onChange={(e) => handlePreviewChange('description', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setParsedPreview(null)}>Discard</button>
            <button className="btn btn-primary" onClick={handleConfirmTask}>
              Create Task & Queue Planning
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
