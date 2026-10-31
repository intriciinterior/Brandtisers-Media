/**
 * Smart Schedule Status Calculator
 * Evaluates whether a task is:
 * - AHEAD_OF_SCHEDULE: Progressing noticeably faster than the expected timeline
 * - BEHIND_SCHEDULE / AT_RISK: Progressing slower than expected or deadline approaching
 * - ON_TRACK: Moving in line with the planned schedule
 * - null: Insufficient data to determine reliably
 */

export function getTaskScheduleStatus(task) {
  if (!task) return null;

  // If backend already calculated it, prefer that
  if (task.schedule_status) {
    return task.schedule_status;
  }

  // Completed tasks are finished, so not actively ahead/behind
  if (task.status === 'COMPLETED') {
    return null;
  }

  const nowTs = Date.now();
  const isOverdue = task.is_overdue || (task.deadline && new Date(task.deadline).getTime() < nowTs);

  if (isOverdue) {
    return 'BEHIND_SCHEDULE';
  }

  // Only active tasks (IN_PROGRESS or ACCEPTED) can be evaluated
  if (task.status !== 'IN_PROGRESS' && task.status !== 'ACCEPTED') {
    return null;
  }

  const progress = Number(task.progress) || 0;
  const startTs = task.start_time
    ? new Date(task.start_time).getTime()
    : (task.created_at ? new Date(task.created_at).getTime() : null);
  const deadlineTs = task.deadline ? new Date(task.deadline).getTime() : null;
  const etaTs = task.expected_completion ? new Date(task.expected_completion).getTime() : null;

  // Case 1: Start and deadline are available and valid
  if (startTs && deadlineTs && deadlineTs > startTs) {
    const totalDuration = deadlineTs - startTs;
    const elapsed = nowTs - startTs;

    if (elapsed > 0) {
      const expectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      const progressDelta = progress - expectedProgress;

      // Ahead of schedule: progress significantly higher (+15% with >= 30% progress)
      // OR ETA earlier than deadline with solid progress
      if (progressDelta >= 15 && progress >= 30) {
        return 'AHEAD_OF_SCHEDULE';
      }
      if (etaTs && etaTs <= deadlineTs - (30 * 60 * 1000) && progressDelta >= 10 && progress >= 35) {
        return 'AHEAD_OF_SCHEDULE';
      }
      if (task.is_eta_missed || (progressDelta <= -20 && elapsed / totalDuration > 0.35)) {
        return 'BEHIND_SCHEDULE';
      }
      return 'ON_TRACK';
    }
  }

  // Case 2: ETA and deadline available
  if (etaTs && deadlineTs && !isOverdue) {
    if (etaTs <= deadlineTs - (45 * 60 * 1000) && progress >= 50) {
      return 'AHEAD_OF_SCHEDULE';
    }
    if (task.is_eta_missed || etaTs > deadlineTs) {
      return 'BEHIND_SCHEDULE';
    }
  }

  return null;
}
