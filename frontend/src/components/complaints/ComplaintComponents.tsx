import type { Complaint, ComplaintStatus, ComplaintPriority } from '../../types';
import { CATEGORY_LABELS } from '../../types';

// ── Status Badge ────────────────────────────────────────────────────────────

interface StatusBadgeProps { status: ComplaintStatus; }
export function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<ComplaintStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
  };
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}

// ── Priority Badge ──────────────────────────────────────────────────────────

interface PriorityBadgeProps { priority: ComplaintPriority; }
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const icons: Record<ComplaintPriority, string> = { LOW: '↓', MEDIUM: '→', HIGH: '↑' };
  return (
    <span className={`badge badge-${priority.toLowerCase()}`}>
      {icons[priority]} {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

// ── Overdue Badge ───────────────────────────────────────────────────────────

export function OverdueBadge() {
  return <span className="badge badge-overdue">⚠ Overdue</span>;
}

// ── Complaint Timeline ──────────────────────────────────────────────────────

interface TimelineProps { complaint: Complaint; }
export function ComplaintTimeline({ complaint }: TimelineProps) {
  return (
    <div className="timeline">
      {complaint.history.map((h) => (
        <div key={h.id} className="timeline-item">
          <div className={`timeline-dot ${h.new_status.toLowerCase()}`} />
          <div className="timeline-content">
            <div className="timeline-header">
              <div className="timeline-status-change">
                {h.old_status ? (
                  <>
                    <span className={`badge badge-${h.old_status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                      {h.old_status.replace('_', ' ')}
                    </span>
                    <span className="timeline-arrow">→</span>
                  </>
                ) : null}
                <span className={`badge badge-${h.new_status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                  {h.new_status.replace('_', ' ')}
                </span>
              </div>
              <span className="timeline-time">
                {new Date(h.created_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <div className="timeline-actor">By {h.actor.name} ({h.actor.role.toLowerCase()})</div>
            {h.note && <div className="timeline-note">"{h.note}"</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Simple Bar Chart ────────────────────────────────────────────────────────

interface BarChartProps {
  data: Record<string, number>;
  maxItems?: number;
}

export function BarChart({ data, maxItems = 10 }: BarChartProps) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxItems);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return <div className="empty-state" style={{ padding: '24px' }}><div className="empty-state-desc">No data yet</div></div>;
  }

  return (
    <div className="bar-chart">
      {entries.map(([key, val]) => (
        <div key={key} className="bar-row">
          <div className="bar-label" title={key.replace('_', ' ')}>
            {(CATEGORY_LABELS as any)[key] ?? key.replace('_', ' ')}
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(val / max) * 100}%` }} />
          </div>
          <div className="bar-value">{val}</div>
        </div>
      ))}
    </div>
  );
}
