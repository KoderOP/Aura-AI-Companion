import type { Task, PrioritizationWeights } from '../types';

export const DEFAULT_WEIGHTS: PrioritizationWeights = {
  timePressure: 2.5,
  importance: 2.0,
  effortInverse: 1.5,
  consequence: 2.5,
  habitPenalty: 1.5,
};

// Calculate exponential time pressure (0 to 10 scale)
export function calculateTimePressure(deadlineStr: string): { score: number; hoursRemaining: number } {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return { score: 10, hoursRemaining };
  }

  const daysRemaining = hoursRemaining / 24;
  // Exponential decay: score is 10 at 0 days, drops to ~3.7 at 3 days, ~0.5 at 9 days
  const score = 10 * Math.exp(-daysRemaining / 3);
  return {
    score: Math.round(score * 10) / 10,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10
  };
}

export function calculateTaskScore(
  task: Omit<Task, 'priorityScore' | 'explanation'>,
  weights: PrioritizationWeights = DEFAULT_WEIGHTS
): { score: number; explanation: string } {
  const { score: timePressureScore, hoursRemaining } = calculateTimePressure(task.deadline);
  
  // Effort inverse: lower effort = higher priority (effort scale is 1 to 10)
  // If effort is 1, effortInverse is 10. If effort is 10, effortInverse is 1.
  const effortInverseScore = 11 - task.effort;

  const wSum =
    weights.timePressure +
    weights.importance +
    weights.effortInverse +
    weights.consequence +
    weights.habitPenalty;

  const rawScore =
    weights.timePressure * timePressureScore +
    weights.importance * task.importance +
    weights.effortInverse * effortInverseScore +
    weights.consequence * task.consequence +
    weights.habitPenalty * task.habitPenalty;

  // Normalize score to 0 - 100 range and apply personalization offset
  const normalizedScore = (rawScore / (wSum * 10)) * 100;
  const finalScore = Math.max(0, Math.min(100, Math.round(normalizedScore + task.personalizationOffset)));

  // Generate explanation
  let explanation = '';
  const timeStr = hoursRemaining <= 0
    ? 'is already past due'
    : hoursRemaining < 24
      ? `is due in ${Math.round(hoursRemaining)}h (critical time pressure)`
      : `is due in ${Math.round(hoursRemaining / 24)}d`;

  if (task.status === 'completed') {
    explanation = 'Completed task.';
  } else if (hoursRemaining <= 0) {
    explanation = `Overdue! Requires immediate rescue due to a consequence rating of ${task.consequence}/10.`;
  } else if (timePressureScore > 7 && task.consequence > 7) {
    explanation = `High urgency meets high impact. Due soon (${timeStr}) with critical consequences (${task.consequence}/10) if missed.`;
  } else if (task.habitPenalty > 7) {
    explanation = `Prioritized to reinforce consistency; this task aligns with habits you have historically missed.`;
  } else if (task.importance > 8 && effortInverseScore > 7) {
    explanation = `Quick win! This is a highly important task (${task.importance}/10) that requires very low effort to check off.`;
  } else if (timePressureScore > 6) {
    explanation = `Due soon (${timeStr}). Micro-steps should be completed today to stay ahead of the schedule.`;
  } else if (task.consequence > 8) {
    explanation = `High consequence task (${task.consequence}/10). Recommended to start early to avoid a last-minute rush.`;
  } else {
    explanation = `Balanced priority based on moderate importance and comfortable timeline (${timeStr}).`;
  }

  return {
    score: finalScore,
    explanation,
  };
}
