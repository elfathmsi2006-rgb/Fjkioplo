import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CalendarDays, Download, ImagePlus, Mic, Plus, Square, Trash2, Wrench, X, Volume2 } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import type { MaintenanceLog, MaintenanceStatus, MaintenanceType } from '../data/types'
import { localizedMachineName, downloadText, formatDate } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { MaintenanceSuiteTools } from '../components/maintenance/MaintenanceSuiteTools'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'
const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024
const AUDIO_LIMIT_BYTES = 20 * 1024 * 1024
const MAX_IMAGES = 8

type LogForm = {
  machineId: string; type: MaintenanceType; date: string; durationHours: number; technician: string
  cost: number; notes: string; status: MaintenanceStatus; outageStart?: string; outageEnd?: string; failureCause?: string
}
type SelectedImage = { file: File; preview: string; key: string }
type ApiTask = { id: number | string; title: string; status?: string; machine_id?: number | string | null; machineId?: number | string | null; machine_name?: string | null; machine_code?: string | null; maintenance_type?: string; technician_id?: number | string | null }
type ApiLog = { id: string; machineId: string; taskId?: string; type: MaintenanceType; date: string; durationHours: number; technician: string; cost: number; notes: string; status: MaintenanceStatus; outageStart?: string; outageEnd?: string; failureCause?: string; attachments?: NonNullable<MaintenanceLog['attachments']> }
type ApiResult<T> = { success: boolean; message?: string; data?: T; reused?: boolean }
type MaintenanceSuiteSummary = { tasks?: { total?: number; open_count?: number; overdue_count?: number; preventive_count?: number; corrective_count?: number }; plans?: { total?: number; due_count?: number }; parts?: { low_stock_count?: number }; breakdowns?: { open_breakdowns?: number } }
type ApiExportSchedule = { id: number; frequency: string; exportTime: string; timezone: string; enabled: boolean; lastRunAt: string | null; lastStatus: string; retentionDays: number; createdBy: number | null }
type ApiExportExecution = { id: number; scheduleId: number | null; status: string; filename: string; fileSize: number | null; recordCount: number | null; errorMessage: string | null; triggeredBy: string; startedAt: string; finishedAt: string | null; frequency?: string; exportTime?: string; timezone?: string; enabled?: boolean }
const emptyForm = (machineId: string): LogForm => ({ machineId, type: 'corrective', date: new Date().toISOString().slice(0, 10), durationHours: 1, technician: '', cost: 0, notes: '', status: 'completed', outageStart: '', outageEnd: '', failureCause: '' })
const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

function ProtectedAttachment({ attachment, language }: { attachment: NonNullable<MaintenanceLog['attachments']>[number]; language: 'ar' | 'fr' | 'en' }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    let objectUrl = ''
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(`${API_BASE_URL}${attachment.url}`, { credentials: 'include', signal: controller.signal })
        if (!response.ok) throw new Error('Attachment unavailable')
        objectUrl = URL.createObjectURL(await response.blob())
        if (!controller.signal.aborted) setUrl(objectUrl)
      } catch (cause) {
        if (cause instanceof Error && cause.name === 'AbortError') return
        setError(true)
      }
    }
    void load()
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attachment.url])
  if (error) return <small className="muted">{language === 'ar' ? 'تعذر تحميل المرفق' : language === 'fr' ? 'Pièce jointe indisponible' : 'Attachment unavailable'}</small>
  if (!url) return <small className="muted">{language === 'ar' ? 'جارٍ تحميل المرفق…' : language === 'fr' ? 'Chargement…' : 'Loading attachment…'}</small>
  return attachment.type === 'audio'
    ? <div className="saved-attachment"><Volume2 size={15} /><span>{attachment.name}</span><audio controls preload="none" src={url} /></div>
    : <a href={url} target="_blank" rel="noreferrer" className="maintenance-image-link"><img src={url} alt={attachment.name} /><span>{attachment.name}</span></a>
}

export default function MaintenancePage() {
  const { machines, maintenanceLogs, setMaintenanceLogs, language, role, addActivity, showToast } = useApp()
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [filter, setFilter] = useState('all')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [form, setForm] = useState<LogForm>(emptyForm(machines[0]?.id ?? ''))
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [loadError, setLoadError] = useState('')
  const [taskLoadError, setTaskLoadError] = useState('')
  const [suiteSummary, setSuiteSummary] = useState<MaintenanceSuiteSummary | null>(null)
  const [suiteSummaryError, setSuiteSummaryError] = useState('')
  const [runningScheduler, setRunningScheduler] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draftLogId, setDraftLogId] = useState<string | null>(null)
  const [draftKey, setDraftKey] = useState('')
  const [uploaded, setUploaded] = useState<Record<string, string>>({})
  const selectedImagesRef = useRef<SelectedImage[]>([])
  selectedImagesRef.current = selectedImages
  const audioUrlRef = useRef('')
  audioUrlRef.current = audioUrl
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const cancelRecordingRef = useRef(false)
  const canEdit = role === 'admin' || role === 'production_chief' || role === 'maintenance_worker' || role === 'workshop_head'
  const isTechnician = role === 'maintenance_worker'
  const canManageExport = role === 'admin' || role === 'production_chief' || role === 'workshop_head'
  const visible = useMemo(() => maintenanceLogs.filter(log => filter === 'all' || log.status === filter).sort((a, b) => (b.outageStart || b.date).localeCompare(a.outageStart || a.date)), [maintenanceLogs, filter])
  const totalCost = maintenanceLogs.reduce((sum, log) => sum + log.cost, 0)
  const totalDowntime = maintenanceLogs.filter(log => log.type === 'corrective').reduce((sum, log) => sum + log.durationHours, 0)
  const tx = (en: string, fr: string, ar: string) => language === 'ar' ? ar : language === 'fr' ? fr : en
  const authHeaders = useCallback((): Record<string, string> => ({}), [])
  const [exportSchedules, setExportSchedules] = useState<ApiExportSchedule[]>([])
  const [exportExecutions, setExportExecutions] = useState<ApiExportExecution[]>([])
  const [exportScheduleDraft, setExportScheduleDraft] = useState({ frequency: 'daily', exportTime: '02:00', timezone: 'Africa/Algiers', retentionDays: 30, enabled: true })
  const [editingExportScheduleId, setEditingExportScheduleId] = useState<string | null>(null)
  const [savingExportSchedule, setSavingExportSchedule] = useState(false)
  const [runningExportId, setRunningExportId] = useState<string | null>(null)
  const [exportHistoryError, setExportHistoryError] = useState('')
  const loadExportSchedules = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/maintenance/export/schedules`, { credentials: 'include', headers: authHeaders() })
    const result = await response.json() as ApiResult<ApiExportSchedule[]>
    if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message || 'Could not load scheduled exports.')
    setExportSchedules(result.data)
  }, [authHeaders])
  const loadExportExecutions = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/maintenance/export/executions`, { credentials: 'include', headers: authHeaders() })
    const result = await response.json() as ApiResult<ApiExportExecution[]>
    if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message || 'Could not load the maintenance export history.')
    setExportExecutions(result.data)
  }, [authHeaders])
  useEffect(() => {
    if (!canManageExport) return
    void Promise.all([loadExportSchedules(), loadExportExecutions()]).catch(error => setExportHistoryError(error instanceof Error ? error.message : 'Could not load the maintenance export history.'))
  }, [canManageExport, loadExportSchedules, loadExportExecutions])

  const loadSuiteSummary = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/maintenance-suite/summary`, { headers: authHeaders(), credentials: 'include' })
    const result = await response.json() as ApiResult<MaintenanceSuiteSummary>
    if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Could not load maintenance summary.')
    setSuiteSummary(result.data); setSuiteSummaryError('')
  }, [authHeaders])

  useEffect(() => { void loadSuiteSummary().catch(error => setSuiteSummaryError(error instanceof Error ? error.message : 'Could not load maintenance summary.')) }, [loadSuiteSummary])

  const runPreventiveScheduler = async () => {
    setRunningScheduler(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/maintenance-suite/preventive-plans/run-due`, { method: 'POST', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: '{}' })
      const result = await response.json() as ApiResult<{ created?: number; scanned?: number; skipped?: number; errors?: number }>
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not run preventive scheduler.')
      showToast(tx('Preventive scheduler completed', 'Planification préventive terminée', 'اكتملت جدولة الصيانة الوقائية'))
      await Promise.all([loadSuiteSummary(), loadLogs()])
    } catch (error) { showToast(error instanceof Error ? error.message : 'Scheduler failed') } finally { setRunningScheduler(false) }
  }

  const loadLogs = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/maintenance-logs`, { headers: authHeaders(), credentials: 'include' })
    const result = await response.json() as ApiResult<ApiLog[]>
    if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message || 'Could not load maintenance history.')
    setMaintenanceLogs(result.data.map(log => ({ ...log, attachments: log.attachments || [] })))
    setLoadError('')
  }, [authHeaders, setMaintenanceLogs])

  useEffect(() => {
    let active = true
    void loadLogs().catch(error => { if (active) { setMaintenanceLogs([]); setLoadError(error instanceof Error ? error.message : 'Could not load maintenance history.') } })
    const controller = new AbortController()
    async function loadTasks() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, { headers: authHeaders(), credentials: 'include', signal: controller.signal })
        const result = await response.json() as ApiResult<ApiTask[]>
        if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message || 'Could not load work orders.')
        if (active) setTasks(result.data.filter(task => !['COMPLETED', 'CANCELLED'].includes(String(task.status || '').toUpperCase())))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (active) setTaskLoadError(error instanceof Error ? error.message : 'Could not load work orders.')
      }
    }
    void loadTasks()
    return () => { active = false; controller.abort() }
  }, [authHeaders, loadLogs, setMaintenanceLogs])

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach(track => track.stop())
    selectedImagesRef.current.forEach(item => URL.revokeObjectURL(item.preview))
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])

  function resetForm() {
    selectedImages.forEach(item => URL.revokeObjectURL(item.preview))
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setForm(emptyForm(machines[0]?.id ?? ''))
    setSelectedImages([])
    setAudioFile(null)
    setAudioUrl('')
    setSelectedTaskId('')
    setDraftLogId(null)
    setDraftKey(crypto.randomUUID())
    setUploaded({})
  }
  function openNew() { resetForm(); setModalOpen(true) }

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || [])
    event.target.value = ''
    if (!incoming.length) return
    setSelectedImages(current => {
      const next = [...current]
      for (const file of incoming) {
        if (!file.type.startsWith('image/') || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { showToast(tx('Use JPEG, PNG, WebP, or GIF images.', 'Utilisez des images JPEG, PNG, WebP ou GIF.', 'استخدم صور JPEG أو PNG أو WebP أو GIF.')); continue }
        if (file.size > IMAGE_LIMIT_BYTES) { showToast(tx('Each image must be 10 MB or smaller.', 'Chaque image doit faire 10 Mo maximum.', 'يجب ألا يتجاوز حجم كل صورة 10 ميغابايت.')); continue }
        if (next.length >= MAX_IMAGES) { showToast(tx(`Maximum ${MAX_IMAGES} images per log.`, `Maximum ${MAX_IMAGES} images par rapport.`, `الحد الأقصى ${MAX_IMAGES} صور لكل سجل.`)); break }
        if (next.some(item => item.key === fileKey(file))) continue
        next.push({ file, preview: URL.createObjectURL(file), key: fileKey(file) })
      }
      return next
    })
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast(tx('Audio recording is not supported by this browser.', 'L’enregistrement audio n’est pas pris en charge par ce navigateur.', 'تسجيل الصوت غير مدعوم في هذا المتصفح.'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      cancelRecordingRef.current = false
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setIsRecording(false)
        if (cancelRecordingRef.current) return
        const type = recorder.mimeType || 'audio/webm'
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size > AUDIO_LIMIT_BYTES) { showToast(tx('The recording is larger than 20 MB.', 'L’enregistrement dépasse 20 Mo.', 'حجم التسجيل يتجاوز 20 ميغابايت.')); return }
        const file = new File([blob], `maintenance-voice-${Date.now()}.${extension}`, { type })
        setAudioFile(file)
        setAudioUrl(URL.createObjectURL(file))
      }
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      showToast(error instanceof Error && error.name === 'NotAllowedError' ? tx('Microphone permission was denied.', 'Autorisation du microphone refusée.', 'تم رفض إذن الميكروفون.') : tx('Could not start audio recording.', 'Impossible de démarrer l’enregistrement audio.', 'تعذر بدء تسجيل الصوت.'))
    }
  }
  function stopRecording(cancel = false) {
    cancelRecordingRef.current = cancel
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    if (cancel) { setAudioFile(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl('') }
  }

  async function removeImage(item: SelectedImage) {
    const attachmentId = uploaded[item.key]
    if (draftLogId && attachmentId) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/maintenance-logs/${draftLogId}/attachments/${attachmentId}`, { method: 'DELETE', headers: authHeaders(), credentials: 'include' })
        const result = await response.json() as ApiResult<unknown>
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not remove uploaded image.')
        setUploaded(current => { const next = { ...current }; delete next[item.key]; return next })
      } catch (error) { showToast(error instanceof Error ? error.message : 'Could not remove uploaded image.'); return }
    }
    URL.revokeObjectURL(item.preview)
    setSelectedImages(current => current.filter(image => image.key !== item.key))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.machineId) { showToast(tx('Choose a machine.', 'Choisissez une machine.', 'اختر آلة.')); return }
    if (!form.notes.trim()) { showToast(tx('Describe the work performed.', 'Décrivez le travail effectué.', 'صف العمل المنجز.')); return }
    if (isTechnician && !selectedTaskId) { showToast(tx('Select the assigned work order before submitting.', 'Sélectionnez l’ordre de travail attribué.', 'اختر أمر العمل المسند إليك قبل الإرسال.')); return }
    let durationHours = Math.max(0, Number(form.durationHours))
    if (form.outageStart && form.outageEnd) {
      const start = new Date(form.outageStart).getTime()
      const end = new Date(form.outageEnd).getTime()
      if (end < start) { showToast(tx('Downtime end must be after its start.', 'La fin de panne doit être après le début.', 'يجب أن تكون نهاية العطل بعد بدايته.')); return }
      durationHours = Math.round(((end - start) / 3600000) * 100) / 100
    }
    setSaving(true)
    try {
      let logId = draftLogId
      if (!logId) {
        const createResponse = await fetch(`${API_BASE_URL}/api/maintenance-logs`, {
          method: 'POST', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ machineId: form.machineId, taskId: selectedTaskId || null, maintenanceType: form.type.toUpperCase(), maintenanceDate: form.date, durationHours, cost: Math.max(0, Number(form.cost)), problemDescription: form.failureCause || '', workPerformed: form.notes, diagnosis: '', idempotencyKey: draftKey || crypto.randomUUID(), startedAt: form.outageStart || undefined, downtimeStart: form.outageStart || undefined, downtimeEnd: form.outageEnd || undefined }),
        })
        const createResult = await createResponse.json() as ApiResult<{ id: string; submissionStatus: string }>
        if (!createResponse.ok || !createResult.success || !createResult.data?.id) throw new Error(createResult.message || 'Could not create maintenance draft.')
        logId = String(createResult.data.id)
        setDraftLogId(logId)
      }
      for (const item of selectedImages) {
        if (uploaded[item.key]) continue
        const response = await fetch(`${API_BASE_URL}/api/maintenance-logs/${logId}/attachments?kind=image`, { method: 'POST', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': item.file.type, 'X-File-Name': encodeURIComponent(item.file.name) }, body: item.file })
        const result = await response.json() as ApiResult<{ id: string }>
        if (!response.ok || !result.success || !result.data?.id) throw new Error(result.message || `Image upload failed: ${item.file.name}`)
        setUploaded(current => ({ ...current, [item.key]: result.data!.id }))
      }
      if (audioFile && !uploaded[fileKey(audioFile)]) {
        const response = await fetch(`${API_BASE_URL}/api/maintenance-logs/${logId}/attachments?kind=audio`, { method: 'POST', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': audioFile.type, 'X-File-Name': encodeURIComponent(audioFile.name) }, body: audioFile })
        const result = await response.json() as ApiResult<{ id: string }>
        if (!response.ok || !result.success || !result.data?.id) throw new Error(result.message || 'Audio upload failed.')
        setUploaded(current => ({ ...current, [fileKey(audioFile)]: result.data!.id }))
      }
      const submitResponse = await fetch(`${API_BASE_URL}/api/maintenance-logs/${logId}/submit`, { method: 'POST', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const submitResult = await submitResponse.json() as ApiResult<{ id: string; submissionStatus: string }>
      if (!submitResponse.ok || !submitResult.success) throw new Error(submitResult.message || 'Could not submit the maintenance log.')
      await loadLogs()
      addActivity(t('addLog'), machines.find(machine => machine.id === form.machineId)?.code ?? '')
      showToast(tx('Maintenance record saved to the server.', 'Rapport de maintenance enregistré sur le serveur.', 'تم حفظ سجل الصيانة على الخادم.'))
      setModalOpen(false)
      resetForm()
    } catch (error) {
      showToast(error instanceof Error ? error.message : tx('Could not save the maintenance record. The draft is kept for retry.', 'Impossible d’enregistrer le rapport. Le brouillon est conservé pour réessayer.', 'تعذر حفظ سجل الصيانة. تم الاحتفاظ بالمسودة لإعادة المحاولة.'))
    } finally { setSaving(false) }
  }

  const exportLogs = () => {
    const rows = [[t('machine'), t('date'), t('downtimeStart'), t('downtimeEnd'), t('failureCause'), t('maintenance'), t('duration'), t('technicianField'), t('cost'), t('status'), t('notes'), t('attachImage')], ...visible.map(log => [machines.find(machine => machine.id === log.machineId)?.code ?? '', log.date, log.outageStart ?? '', log.outageEnd ?? '', log.failureCause ?? '', log.type, log.durationHours, log.technician, log.cost, log.status, log.notes, log.attachments?.map(item => item.name).join('; ') || log.noteImageName || ''])]
    downloadText('spa-el-fath-maintenance.csv', '\ufeff' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n'), 'text/csv;charset=utf-8')
  }

  const [exporting, setExporting] = useState(false)
  const exportExcel = async () => {
    setExporting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/maintenance/export`, { credentials: 'include' })
      const blob = await response.blob()
      if (!response.ok || !response.headers.get('content-type')?.includes('spreadsheet')) throw new Error('Could not export the maintenance workbook.')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `spa-el-fath-maintenance-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
      addActivity(t('exportCsv'), t('maintenance'))
      showToast(tx('Maintenance workbook exported.', 'Classeur de maintenance exporté.', 'تم تصدير سجل الصيانة.'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : tx('Could not export the maintenance workbook.', 'Impossible d’exporter le classeur.', 'تعذر تصدير سجل الصيانة.'))
    } finally { setExporting(false) }
  }

  const saveExportSchedule = async () => {
    setSavingExportSchedule(true)
    try {
      const patch = { frequency: exportScheduleDraft.frequency, exportTime: exportScheduleDraft.exportTime, timezone: exportScheduleDraft.timezone, enabled: exportScheduleDraft.enabled, retentionDays: Number(exportScheduleDraft.retentionDays) }
      const response = await fetch(`${API_BASE_URL}/api/maintenance/export/schedules${editingExportScheduleId ? `/${editingExportScheduleId}` : ''}`, { method: editingExportScheduleId ? 'PATCH' : 'POST', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const result = await response.json() as ApiResult<{ schedule: ApiExportSchedule }>
      const schedule = result.data?.schedule
      if (!response.ok || !result.success || !schedule) throw new Error(result.message || 'Could not save the scheduled export.')
      setExportSchedules(current => editingExportScheduleId ? current.map(item => (String(item.id) === editingExportScheduleId ? schedule : item)) : [schedule, ...current.filter(item => String(item.id) !== String(schedule.id))])
      setEditingExportScheduleId(null)
      showToast(tx('Scheduled maintenance export saved.', 'Export de maintenance planifié enregistré.', 'تم حفظ تصدير الصيانة المجدول.'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : tx('Could not save the scheduled export.', 'Impossible d’enregistrer l’export planifié.', 'تعذر حفظ تصدير الصيانة المجدول.'))
    } finally { setSavingExportSchedule(false) }
  }

  const toggleExportSchedule = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/maintenance/export/schedules/${id}`, { method: 'PATCH', credentials: 'include', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
      const result = await response.json() as ApiResult<{ schedule: ApiExportSchedule }>
      const schedule = result.data?.schedule
      if (!response.ok || !result.success || !schedule) throw new Error(result.message || 'Could not update the scheduled export.')
      setExportSchedules(current => current.map(item => (String(item.id) === id ? schedule : item)))
      showToast(tx('Scheduled maintenance export updated.', 'Export de maintenance planifié mis à jour.', 'تم تحديث تصدير الصيانة المجدول.'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : tx('Could not update the scheduled export.', 'Impossible de mettre à jour l’export planifié.', 'تعذر تحديث تصدير الصيانة المجدول.'))
    }
  }

  const runExportScheduleNow = async (id: string) => {
    setRunningExportId(id)
    try {
      const response = await fetch(`${API_BASE_URL}/api/maintenance/export/schedules/${id}/run`, { method: 'POST', credentials: 'include', headers: authHeaders() })
      const result = await response.json() as ApiResult<{ execution: ApiExportExecution }>
      if (!response.ok || !result.success || !result.data?.execution) throw new Error(result.message || 'Scheduled maintenance export failed.')
      await Promise.all([loadExportSchedules(), loadExportExecutions()])
      showToast(tx('Scheduled maintenance export started.', 'Export de maintenance planifié lancé.', 'تم بدء تصدير الصيانة المجدول.'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : tx('Scheduled maintenance export failed.', 'L’export de maintenance planifié a échoué.', 'فشل تصدير الصيانة المجدول.'))
    } finally { setRunningExportId(null) }
  }

  const downloadExportExecutionFile = async (execution: ApiExportExecution) => {
    const response = await fetch(`${API_BASE_URL}/api/maintenance/export/executions/${execution.id}/download`, { credentials: 'include', headers: authHeaders() })
    if (!response.ok) throw new Error('Could not download the scheduled export file.')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = execution.filename || `spa-el-fath-maintenance-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const calendarStart = new Date(`${month}-01T12:00:00`)
  const firstDay = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), 1).getDay()
  const daysInMonth = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + 1, 0).getDate()
  const calendarDays = [...Array.from({ length: firstDay }, () => 0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  const monthLabel = new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { month: 'long', year: 'numeric' }).format(calendarStart)

  return <section className="page-section">
    <PageHeader
      eyebrow={t('maintenance')}
      title={t('maintenanceTitle')}
      description={t('maintenanceDesc')}
      action={
        <>
          <button className="button button-secondary" onClick={exportLogs}>
            <Download size={16} />{t('exportCsv')}
          </button>
          {canManageExport && (
            <button className="button button-secondary" onClick={() => void exportExcel()} disabled={exporting}>
              <Download size={16} />{exporting ? tx('Exporting…', 'Exportation…', 'جارٍ التصدير…') : t('exportExcel')}
            </button>
          )}
          {canEdit && (
            <button className="button button-primary" onClick={openNew}>
              <Plus size={16} />{t('addLog')}
            </button>
          )}
        </>
      }
    />
    <section className="panel maintenance-suite-summary" aria-label={tx('Maintenance system summary','Résumé de maintenance','ملخص نظام الصيانة')}>
      <div className="panel-heading"><div><h2>{tx('Maintenance operations overview','Vue d’ensemble de la maintenance','نظرة عامة على الصيانة')}</h2><p>{tx('Live values from the authenticated maintenance API; database migration is required for the new summary module.','Valeurs de l’API de maintenance authentifiée; migration requise pour le nouveau résumé.','بيانات مباشرة من واجهة الصيانة؛ يتطلب الملخص الجديد تطبيق ترحيل قاعدة البيانات.')}</p></div>
      {(role === 'admin' || role === 'production_chief' || role === 'workshop_head') && <button type="button" className="button button-secondary" disabled={runningScheduler} onClick={() => void runPreventiveScheduler()}>{runningScheduler ? tx('Running…','En cours…','جارٍ التنفيذ…') : tx('Generate due PM work orders','Générer les OT préventifs dus','إنشاء أوامر الوقاية المستحقة')}</button>}</div>
      {suiteSummaryError ? <div className="form-errors" role="status">{suiteSummaryError}</div> : <div className="metrics-grid compact-metrics">
        <MetricCard icon={<Wrench size={18} />} label={tx('Open work orders','OT ouverts','أوامر العمل المفتوحة')} value={Number(suiteSummary?.tasks?.open_count || 0)} />
        <MetricCard icon={<CalendarDays size={18} />} label={tx('Overdue work orders','OT en retard','أوامر العمل المتأخرة')} value={Number(suiteSummary?.tasks?.overdue_count || 0)} />
        <MetricCard icon={<Plus size={18} />} label={tx('Preventive plans due','Plans préventifs dus','خطط الوقاية المستحقة')} value={Number(suiteSummary?.plans?.due_count || 0)} />
        <MetricCard icon={<Square size={18} />} label={tx('Low-stock parts','Pièces en stock faible','قطع منخفضة المخزون')} value={Number(suiteSummary?.parts?.low_stock_count || 0)} />
      </div>}
    </section>
    {canManageExport && (
      <section className="panel" aria-label={t('exportSchedules')}>
        <div className="panel-heading"><div><h2>{t('exportSchedules')}</h2><p>{t('exportSchedule')}</p></div></div>
        <div className="form-grid">
          <label className="field-label">{t('frequency')}<select value={exportScheduleDraft.frequency} onChange={event => setExportScheduleDraft({ ...exportScheduleDraft, frequency: event.target.value })}><option value="daily">{t('daily')}</option><option value="weekly">{t('weekly')}</option><option value="monthly">{t('monthly')}</option></select></label>
          <label className="field-label">{t('exportTime')}<input type="time" value={exportScheduleDraft.exportTime} onChange={event => setExportScheduleDraft({ ...exportScheduleDraft, exportTime: event.target.value })} /></label>
          <label className="field-label">{t('timezone')}<input type="text" value={exportScheduleDraft.timezone} onChange={event => setExportScheduleDraft({ ...exportScheduleDraft, timezone: event.target.value })} /></label>
          <label className="field-label">{t('retentionDays')}<input type="number" min={1} max={365} value={exportScheduleDraft.retentionDays} onChange={event => setExportScheduleDraft({ ...exportScheduleDraft, retentionDays: Number(event.target.value) })} /></label>
          <label className="field-label">{t('status')}<input type="checkbox" checked={exportScheduleDraft.enabled} onChange={event => setExportScheduleDraft({ ...exportScheduleDraft, enabled: event.target.checked })} /></label>
          <div className="field-label form-full"><button type="button" className="button button-secondary" onClick={() => void saveExportSchedule()} disabled={savingExportSchedule}>{savingExportSchedule ? tx('Saving…', 'Enregistrement…', 'جارٍ الحفظ…') : t('saveExport')}</button></div>
        </div>
        <div className="table-tools">
          {exportSchedules.map(schedule => (
            <div className="export-schedule-row" key={schedule.id}>
              <span>{schedule.frequency} · {schedule.exportTime} · {schedule.timezone}</span>
              <span>{schedule.enabled ? t('status') : t('cancel')}</span>
              <button type="button" className="button button-secondary" disabled={runningExportId === String(schedule.id)} onClick={() => void runExportScheduleNow(String(schedule.id))}>{runningExportId === String(schedule.id) ? tx('Running…', 'En cours…', 'قيد التنفيذ…') : t('runNow')}</button>
              <button type="button" className="button button-secondary" onClick={() => void toggleExportSchedule(String(schedule.id), !schedule.enabled)}>{schedule.enabled ? t('cancel') : t('saveExport')}</button>
            </div>
          ))}
        </div>
        <div className="table-tools">
          {exportExecutions.length ? exportExecutions.map(execution => (
            <div className="export-schedule-row" key={execution.id}>
              <span>{execution.filename}</span>
              <span>{execution.status}</span>
              <span>{execution.recordCount ?? 0}</span>
              <button type="button" className="button button-secondary" onClick={() => void downloadExportExecutionFile(execution)}>{tx('Download', 'Télécharger', 'تحميل')}</button>
            </div>
          )) : <p className="muted">{t('exportHistory')}</p>}
        </div>
        {exportHistoryError ? <div className="form-errors" role="status">{exportHistoryError}</div> : null}
      </section>
    )}
    <MaintenanceSuiteTools />
    {loadError && <div className="panel form-errors" role="alert"><p>{loadError}</p><button type="button" className="button button-secondary" onClick={() => void loadLogs().catch(error => setLoadError(error instanceof Error ? error.message : 'Could not load maintenance history.'))}>{tx('Retry', 'Réessayer', 'إعادة المحاولة')}</button></div>}
    <div className="metrics-grid compact-metrics"><MetricCard icon={<Wrench size={18} />} label={t('maintenance')} value={maintenanceLogs.length} /><MetricCard icon={<CalendarDays size={18} />} label={t('scheduled')} value={maintenanceLogs.filter(log => log.status === 'scheduled').length} tone="amber" /><MetricCard icon={<CalendarDays size={18} />} label={t('totalDowntime')} value={`${totalDowntime.toFixed(1)} ${t('hour')}`} tone="red" /><MetricCard icon={<Download size={18} />} label={t('maintenanceCost')} value={`${totalCost.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-DZ')} DZD`} tone="green" /></div>
    <div className="panel machine-panel"><div className="panel-heading machine-toolbar"><div><h2>{t('maintenanceTitle')}</h2><p>{visible.length} {t('all')}</p></div><div className="table-tools"><select aria-label={t('status')} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{t('allStatuses')}</option><option value="scheduled">{t('scheduled')}</option><option value="in-progress">{t('inProgress')}</option><option value="completed">{t('completed')}</option></select><div className="view-switch"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label={t('listView')}>☷</button><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')} aria-label={t('calendarView')}><CalendarDays size={15} /></button></div></div></div>
      {view === 'list' ? visible.length ? <div className="maintenance-list">{visible.map(log => <div className="maintenance-row" key={log.id}><span className={`maintenance-symbol ${log.type === 'corrective' ? 'danger' : ''}`}><Wrench size={16} /></span><div className="maintenance-row-main"><strong>{(() => { const target = machines.find(machine => machine.id === log.machineId); return target ? localizedMachineName(target, language) : '—' })()}</strong><small>{log.type === 'preventive' ? t('preventive') : t('corrective')} · {log.technician || '—'}{log.taskId ? ` · ${tx('Task', 'Tâche', 'مهمة')} #${log.taskId}` : ''}</small>{log.failureCause && <small><b>{t('failureCause')}:</b> {log.failureCause}</small>}{log.notes && <small>{log.notes}</small>}{log.attachments?.map(attachment => <ProtectedAttachment key={attachment.id} attachment={attachment} language={language} />)}</div><div className="maintenance-row-meta"><strong>{formatDate(log.outageStart || log.date, language)}</strong>{log.outageEnd && <small>{t('downtimeEnd')}: {formatDate(log.outageEnd.slice(0, 10), language)}</small>}<small>{log.durationHours} {t('hour')} · {log.cost.toLocaleString()} DZD</small></div><span className={`status-pill status-${log.status}`}>{log.status === 'completed' ? t('completed') : log.status === 'in-progress' ? t('inProgress') : t('scheduled')}</span></div>)}</div> : <EmptyState title={loadError ? tx('Maintenance history is unavailable until the migration is applied.', 'Historique indisponible avant la migration.', 'سجل الصيانة غير متاح قبل تطبيق الترحيل.') : t('noMaintenance')} /> : <div className="calendar-wrap"><div className="calendar-toolbar"><button className="icon-button" onClick={() => { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() - 1); setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`) }} aria-label={t('previousMonth')}>‹</button><h3>{monthLabel}</h3><button className="icon-button" onClick={() => { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() + 1); setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`) }} aria-label={t('nextMonth')}>›</button><input type="month" value={month} onChange={event => setMonth(event.target.value)} aria-label={t('date')} /></div><div className="calendar-grid">{[...(language === 'ar' ? ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'] : language === 'fr' ? ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])].map(day => <strong key={day}>{day}</strong>)}{calendarDays.map((day, index) => { const dayLogs = day ? visible.filter(log => (log.outageStart || log.date).slice(0, 10) === `${month}-${String(day).padStart(2, '0')}`) : []; return <div key={`${day}-${index}`} className={`calendar-day ${day ? '' : 'calendar-blank'}`}>{day > 0 && <span>{day}</span>}{dayLogs.map(log => <small key={log.id} title={log.notes}>{machines.find(machine => machine.id === log.machineId)?.code ?? '—'}</small>)}</div> })}</div></div>}
    </div>
    {modalOpen && <Modal title={t('addLog')} onClose={() => { if (saving) return; setModalOpen(false) }} wide><form className="form-grid" onSubmit={event => void save(event)}>
      <label className="field-label">{t('machine')}<select required value={form.machineId} onChange={event => setForm({ ...form, machineId: event.target.value })}><option value="">{t('chooseWorkshop')}</option>{machines.map(machine => <option key={machine.id} value={machine.id}>{machine.code} · {language === 'fr' ? machine.nameFr : language === 'en' ? machine.nameEn : machine.name}</option>)}</select></label>
      <label className="field-label">{t('maintenance')}<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as MaintenanceType })}><option value="preventive">{t('preventive')}</option><option value="corrective">{t('corrective')}</option></select></label>
      {tasks.length > 0 && <label className="field-label">{tx('Related work order', 'Ordre de travail associé', 'أمر العمل المرتبط')}{isTechnician && <span aria-hidden="true"> *</span>}<select required={isTechnician} value={selectedTaskId} onChange={event => { const value = event.target.value; setSelectedTaskId(value); const task = tasks.find(item => String(item.id) === value); const taskMachine = task?.machine_id ?? task?.machineId; if (taskMachine != null) setForm(current => ({ ...current, machineId: String(taskMachine) })) }}><option value="">{tx('No linked task', 'Aucune tâche liée', 'بدون أمر عمل مرتبط')}</option>{tasks.map(task => <option key={task.id} value={task.id}>#{task.id} · {task.title} {task.machine_code || task.machine_name ? `(${task.machine_code || task.machine_name})` : ''}</option>)}</select></label>}
      {taskLoadError && <small className="muted form-full">{tx('Work orders could not be loaded:', 'Impossible de charger les ordres :', 'تعذر تحميل أوامر العمل:')} {taskLoadError}</small>}
      <label className="field-label">{t('date')}<input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
      <label className="field-label">{t('duration')}<input type="number" min="0" step="0.25" value={form.durationHours} onChange={event => setForm({ ...form, durationHours: Number(event.target.value) })} /></label>
      <label className="field-label">{t('downtimeStart')}<input type="datetime-local" value={form.outageStart ?? ''} onChange={event => setForm({ ...form, outageStart: event.target.value })} /></label>
      <label className="field-label">{t('downtimeEnd')}<input type="datetime-local" value={form.outageEnd ?? ''} onChange={event => setForm({ ...form, outageEnd: event.target.value })} /></label>
      <label className="field-label">{t('failureCause')}<input value={form.failureCause ?? ''} onChange={event => setForm({ ...form, failureCause: event.target.value })} placeholder={language === 'ar' ? 'مثال: عطل كهربائي، تآكل، تسرب' : language === 'fr' ? 'Ex. : panne électrique, usure, fuite' : 'e.g. electrical, wear, leak'} /></label>
      <label className="field-label">{t('cost')}<input type="number" min="0" step="0.01" value={form.cost} onChange={event => setForm({ ...form, cost: Number(event.target.value) })} /></label>
      <label className="field-label form-full">{tx('Work performed', 'Travail effectué', 'العمل المنجز')}<textarea required rows={4} maxLength={20000} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
      <div className="field-label form-full"><span>{tx('Photographs (up to 8)', 'Photographies (jusqu’à 8)', 'الصور (حتى 8 صور)')}</span><label className="button button-secondary upload-note-image"><ImagePlus size={16} />{tx('Add photos', 'Ajouter des photos', 'إضافة صور')}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple capture="environment" onChange={handleImages} hidden disabled={saving} /></label><div className="selected-attachments">{selectedImages.map(item => <div className="selected-attachment" key={item.key}><img src={item.preview} alt={item.file.name} /><span>{item.file.name}</span><button type="button" className="icon-button" onClick={() => void removeImage(item)} aria-label={tx('Remove image', 'Retirer l’image', 'حذف الصورة')} disabled={saving}><X size={15} /></button>{uploaded[item.key] && <small>{tx('Uploaded', 'Téléversée', 'تم الرفع')}</small>}</div>)}</div><small className="muted">{tx('JPEG, PNG, WebP, or GIF; maximum 10 MB each.', 'JPEG, PNG, WebP ou GIF ; 10 Mo maximum chacun.', 'JPEG أو PNG أو WebP أو GIF؛ الحد الأقصى 10 ميغابايت لكل صورة.')}</small></div>
      <div className="field-label form-full"><span>{tx('Optional voice recording', 'Enregistrement vocal facultatif', 'تسجيل صوتي اختياري')}</span><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => void startRecording()} disabled={saving || isRecording || Boolean(audioFile)}><Mic size={16} />{tx('Start recording', 'Démarrer', 'بدء التسجيل')}</button>{isRecording && <button type="button" className="button button-danger" onClick={() => stopRecording(false)}><Square size={15} />{tx('Stop', 'Arrêter', 'إيقاف')}</button>}{isRecording && <button type="button" className="button button-secondary" onClick={() => stopRecording(true)}>{tx('Cancel recording', 'Annuler l’enregistrement', 'إلغاء التسجيل')}</button>}</div>{audioFile && <div className="audio-preview"><audio controls src={audioUrl} /><span>{audioFile.name}</span><button type="button" className="icon-button" aria-label={tx('Remove recording', 'Supprimer l’enregistrement', 'حذف التسجيل')} onClick={() => { setAudioFile(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl('') }} disabled={saving}><Trash2 size={15} /></button>{uploaded[fileKey(audioFile)] && <small>{tx('Uploaded', 'Téléversé', 'تم الرفع')}</small>}</div>}<small className="muted">{tx('Microphone permission is required. Audio is saved only after the maintenance log is submitted.', 'L’accès au microphone est requis. L’audio est enregistré avec le rapport.', 'يتطلب الأمر إذن الميكروفون. يُحفظ الصوت عند إرسال سجل الصيانة.')}</small></div>
      {draftLogId && <p className="form-full muted" role="status">{tx('Draft saved on server. If an upload fails, retry this form; uploaded files will not be uploaded again.', 'Brouillon enregistré sur le serveur. En cas d’échec, réessayez ; les fichiers déjà envoyés ne seront pas renvoyés.', 'تم حفظ المسودة على الخادم. إذا فشل الرفع، أعد المحاولة؛ لن تُرفع الملفات الناجحة مرة أخرى.')}</p>}
      <div className="form-actions form-full"><button type="button" className="button button-secondary" onClick={() => { if (saving) return; setModalOpen(false) }} disabled={saving}>{t('cancel')}</button><button type="submit" className="button button-primary" disabled={saving || isRecording}>{saving ? tx('Saving and uploading…', 'Enregistrement et envoi…', 'جارٍ الحفظ والرفع…') : t('save')}</button></div>
    </form></Modal>}
  </section>
}
