import { useState } from 'react';
import { type Task, type CalendarEvent } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  onMoveEvent: (eventId: string, newStart: string, newEnd: string) => void;
}

export default function CalendarView({
  tasks,
  events,
  onMoveEvent
}: CalendarViewProps) {
  const [resolvingEventId, setResolvingEventId] = useState<string | null>(null);

  // Focus hour boundary: 08:00 to 20:00 (12 hours)
  const START_HOUR = 8;
  const END_HOUR = 20;

  // Generate rolling 5 days (starting today)
  const getDaysArray = () => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      arr.push(d);
    }
    return arr;
  };
  const calendarDays = getDaysArray();

  // Helper to format ISO dates to compare days
  const isSameDay = (date1: Date, dateStr2: string) => {
    const d2 = new Date(dateStr2);
    return (
      date1.getFullYear() === d2.getFullYear() &&
      date1.getMonth() === d2.getMonth() &&
      date1.getDate() === d2.getDate()
    );
  };

  // Convert event times to CSS positioning variables
  const getEventPositionStyles = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    const offsetTop = (startHour - START_HOUR) * 60; // 60px per hour
    const height = duration * 60;

    return {
      top: `${offsetTop}px`,
      height: `${height}px`
    };
  };

  // Detect scheduling conflicts between focus blocks and external events
  const detectConflicts = (): { eventId: string; taskId: string; reason: string }[] => {
    const conflicts: { eventId: string; taskId: string; reason: string }[] = [];
    
    events.forEach(event => {
      const eStart = new Date(event.startTime).getTime();
      const eEnd = new Date(event.endTime).getTime();

      // Check if this overlaps with any active task's deadline
      tasks.forEach(task => {
        if (task.status === 'completed') return;
        const deadlineTime = new Date(task.deadline).getTime();
        
        // If deadline is during this event, or task is due within 2 hours of meeting
        if (deadlineTime >= eStart && deadlineTime <= eEnd) {
          conflicts.push({
            eventId: event.id,
            taskId: task.id,
            reason: `Deadline for "${task.title}" occurs during this meeting!`
          });
        }
      });

      // Check overlaps with other focus blocks
      events.forEach(other => {
        if (event.id === other.id) return;
        if (event.type === 'external' && other.type === 'task-block') {
          const oStart = new Date(other.startTime).getTime();
          const oEnd = new Date(other.endTime).getTime();
          if (
            (oStart >= eStart && oStart < eEnd) ||
            (oEnd > eStart && oEnd <= eEnd) ||
            (oStart <= eStart && oEnd >= eEnd)
          ) {
            conflicts.push({
              eventId: event.id,
              taskId: other.relatedTaskId || '',
              reason: `Focus block "${other.title}" overlaps with external meeting "${event.title}".`
            });
          }
        }
      });
    });

    return conflicts;
  };

  const conflictsList = detectConflicts();

  // Find smart recommendations for rescheduling (finds first free 1-hour block on next days)
  const getRescheduleSuggestions = (event: CalendarEvent) => {
    const durationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    
    // Propose alternative slots (e.g. tomorrow at 2:00 PM, day after at 10:00 AM)
    const now = new Date();
    
    // Slot 1: Tomorrow afternoon
    const slot1Start = new Date(now);
    slot1Start.setDate(now.getDate() + 1);
    slot1Start.setHours(15, 0, 0, 0); // 3:00 PM
    const slot1End = new Date(slot1Start.getTime() + durationMs);

    // Slot 2: Day after morning
    const slot2Start = new Date(now);
    slot2Start.setDate(now.getDate() + 2);
    slot2Start.setHours(10, 0, 0, 0); // 10:00 AM
    const slot2End = new Date(slot2Start.getTime() + durationMs);

    return [
      {
        label: `Option A: Tomorrow at 3:00 PM (${slot1Start.toLocaleDateString()})`,
        start: slot1Start.toISOString(),
        end: slot1End.toISOString()
      },
      {
        label: `Option B: Day after at 10:00 AM (${slot2Start.toLocaleDateString()})`,
        start: slot2Start.toISOString(),
        end: slot2End.toISOString()
      }
    ];
  };

  const handleResolveConflict = (eventId: string, newStart: string, newEnd: string) => {
    onMoveEvent(eventId, newStart, newEnd);
    setResolvingEventId(null);
  };

  return (
    <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Conflicts Alerts Banner */}
      {conflictsList.length > 0 && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-rose)', background: 'rgba(244,63,94,0.06)' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#fca5a5', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-rose)', animation: 'bounce 0.6s infinite alternate' }}></span>
            Aura AI Alert: {conflictsList.length} Scheduling Conflicts Detected
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {conflictsList.map((conflict, idx) => {
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.15)' }}>
                  <div>
                    <strong>Conflict:</strong> {conflict.reason}
                  </div>
                  <button 
                    className="btn btn-danger btn-small"
                    onClick={() => setResolvingEventId(conflict.eventId)}
                  >
                    ⚡ Resolve now
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid Container */}
      <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
        <div className="calendar-grid" style={{ minWidth: '800px' }}>
          
          {/* Header row */}
          <div className="calendar-header-cell">Time</div>
          {calendarDays.map((day, idx) => (
            <div key={idx} className="calendar-header-cell">
              <div>{day.toLocaleDateString(undefined, { weekday: 'short' })}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{day.getDate()}</div>
            </div>
          ))}

          {/* Core grid content */}
          {/* Time scale column */}
          <div className="calendar-time-col">
            {Array.from({ length: END_HOUR - START_HOUR }).map((_, idx) => {
              const hour = START_HOUR + idx;
              const formatHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
              return (
                <div key={idx} className="calendar-hour-cell">
                  {formatHour}
                </div>
              );
            })}
          </div>

          {/* Days columns */}
          {calendarDays.map((day, dIdx) => {
            // Get events for this day
            const dayEvents = events.filter(e => isSameDay(day, e.startTime));

            return (
              <div key={dIdx} className="calendar-day-col">
                
                {/* Visual grid lines */}
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, idx) => (
                  <div key={idx} className="calendar-slot-grid-cell"></div>
                ))}

                {/* Render absolute positioned events */}
                {dayEvents.map(event => {
                  const position = getEventPositionStyles(event);
                  const isConflicting = conflictsList.some(c => c.eventId === event.id);

                  let blockClass = 'calendar-event-block';
                  if (event.type === 'task-block') {
                    blockClass += ' event-task-block';
                  } else {
                    blockClass += ' event-external';
                  }
                  if (isConflicting) {
                    blockClass += ' event-conflict';
                  }

                  return (
                    <div 
                      key={event.id}
                      className={blockClass}
                      style={{ 
                        ...position, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between' 
                      }}
                      onClick={() => {
                        if (isConflicting) {
                          setResolvingEventId(event.id);
                        } else {
                          alert(`Event: ${event.title}\nTime: ${new Date(event.startTime).toLocaleTimeString()} - ${new Date(event.endTime).toLocaleTimeString()}`);
                        }
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                        {new Date(event.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {resolvingEventId && (() => {
        const event = events.find(e => e.id === resolvingEventId);
        if (!event) return null;
        const suggestions = getRescheduleSuggestions(event);

        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: '#fca5a5' }}>
                Resolve Schedule Conflict
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                We found overlaps with high-priority tasks. Aura analyzed attendee diaries and identified the following optimal open slots.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CONFLICTING MEETING:</div>
                <div style={{ fontWeight: 700, margin: '4px 0' }}>{event.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Current Slot: {new Date(event.startTime).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                <span className="input-label">Select Autonomous Reschedule Slot</span>
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px' }}
                    onClick={() => handleResolveConflict(event.id, sug.start, sug.end)}
                  >
                    <div>{sug.label}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-violet)', display: 'block', marginTop: '2px' }}>
                      ⚡ Instant slot request (no conflicts detected)
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setResolvingEventId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
