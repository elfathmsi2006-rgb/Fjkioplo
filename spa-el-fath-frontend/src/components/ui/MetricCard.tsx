import type { ReactNode } from 'react'
export function MetricCard({ icon, label, value, note, tone = 'blue' }: { icon: ReactNode; label: string; value: string | number; note?: string; tone?: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-content"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div><i className={`metric-accent ${tone}`} /></article>
}
