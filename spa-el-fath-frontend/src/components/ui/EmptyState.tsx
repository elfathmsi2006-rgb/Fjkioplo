import { ClipboardList } from 'lucide-react'
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="empty-state"><div className="empty-illustration"><ClipboardList size={28} /></div><strong>{title}</strong>{description && <p>{description}</p>}</div>
}
