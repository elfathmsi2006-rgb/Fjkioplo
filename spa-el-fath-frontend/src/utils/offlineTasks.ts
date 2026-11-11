const DB_NAME = 'spa-el-fath-offline'
const TASK_STORE = 'tasks'
const UPDATE_STORE = 'updates'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TASK_STORE)) db.createObjectStore(TASK_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(UPDATE_STORE)) db.createObjectStore(UPDATE_STORE, { keyPath: 'id', autoIncrement: true })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheTasks(tasks: Record<string, unknown>[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(TASK_STORE, 'readwrite')
  const store = tx.objectStore(TASK_STORE)
  store.clear()
  tasks.forEach(task => store.put(task))
  await new Promise((resolve, reject) => { tx.oncomplete = () => resolve(undefined); tx.onerror = () => reject(tx.error) })
  db.close()
}

export async function loadCachedTasks(): Promise<Record<string, unknown>[]> {
  const db = await openDb()
  const tx = db.transaction(TASK_STORE, 'readonly')
  const store = tx.objectStore(TASK_STORE)
  const request = store.getAll()
  const result = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as Record<string, unknown>[])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}

export type PendingTaskUpdate = { id?: number; taskId: string | number; method: 'PUT' | 'POST' | 'DELETE'; path: string; payload?: Record<string, unknown> }

export async function queueTaskUpdate(update: Omit<PendingTaskUpdate, 'id'>): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(UPDATE_STORE, 'readwrite')
  tx.objectStore(UPDATE_STORE).add(update)
  await new Promise((resolve, reject) => { tx.oncomplete = () => resolve(undefined); tx.onerror = () => reject(tx.error) })
  db.close()
}

export async function getPendingTaskUpdates(): Promise<PendingTaskUpdate[]> {
  const db = await openDb()
  const tx = db.transaction(UPDATE_STORE, 'readonly')
  const request = tx.objectStore(UPDATE_STORE).getAll()
  const result = await new Promise<PendingTaskUpdate[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as PendingTaskUpdate[])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}

export async function clearPendingTaskUpdates(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(UPDATE_STORE, 'readwrite')
  tx.objectStore(UPDATE_STORE).clear()
  await new Promise((resolve, reject) => { tx.oncomplete = () => resolve(undefined); tx.onerror = () => reject(tx.error) })
  db.close()
}

export async function syncPendingTaskUpdates(apiBase: string): Promise<number> {
  const updates = await getPendingTaskUpdates()
  if (!updates.length) return 0
  let synced = 0
  for (const update of updates) {
    try {
      const response = await fetch(`${apiBase}${update.path}`, {
        method: update.method,
        credentials: 'include',
        headers: update.payload ? { 'Content-Type': 'application/json' } : undefined,
        body: update.payload ? JSON.stringify(update.payload) : undefined,
      })
      if (response.ok) synced += 1
    } catch {
      break
    }
  }
  if (synced === updates.length) await clearPendingTaskUpdates()
  return synced
}