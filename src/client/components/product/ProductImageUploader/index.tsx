import { useRef, useState, useCallback } from 'react'
import { FiUploadCloud, FiX, FiImage, FiAlertCircle } from 'react-icons/fi'
import api from '../../../services/api.js'

interface FileEntry {
  id: string
  preview: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

const uid = () => Math.random().toString(36).slice(2)

export default function ProductImageUploader({ value, onChange, maxImages = 8 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)

  const uploadFiles = useCallback(
    async (files: File[], currentUrls: string[], currentEntries: FileEntry[]) => {
      const remaining =
        maxImages - currentUrls.length - currentEntries.filter((e) => e.status !== 'error').length
      const toUpload = files.slice(0, remaining)
      if (toUpload.length === 0) return

      const newEntries: FileEntry[] = toUpload.map((f) => ({
        id: uid(),
        preview: URL.createObjectURL(f),
        status: 'uploading',
      }))
      setEntries((prev) => [...prev, ...newEntries])

      const addedUrls: string[] = []
      await Promise.all(
        newEntries.map(async (entry, i) => {
          try {
            const form = new FormData()
            form.append('images', toUpload[i])
            const res = await api.post<{ data: { urls: string[] } }>(
              '/products/upload-images',
              form,
              {
                headers: { 'Content-Type': 'multipart/form-data' },
              },
            )
            const url = res.data.data.urls[0]
            addedUrls.push(url)
            setEntries((prev) =>
              prev.map((e) => (e.id === entry.id ? { ...e, status: 'done', url } : e)),
            )
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Upload failed'
            setEntries((prev) =>
              prev.map((e) => (e.id === entry.id ? { ...e, status: 'error', error: msg } : e)),
            )
          }
        }),
      )
      if (addedUrls.length > 0) onChange([...currentUrls, ...addedUrls])
    },
    [maxImages, onChange],
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) uploadFiles(files, value, entries)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) uploadFiles(files, value, entries)
  }

  const removeExisting = (url: string) => onChange(value.filter((u) => u !== url))

  const removeEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (entry?.preview) URL.revokeObjectURL(entry.preview)
    if (entry?.url) onChange(value.filter((u) => u !== entry.url))
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const totalCount = value.length + entries.filter((e) => e.status !== 'error').length
  const canAdd = totalCount < maxImages

  return (
    <div className="piu">
      {/* Existing confirmed URLs */}
      {value.length > 0 && (
        <div className="piu__grid">
          {value.map((url, i) => (
            <div key={url} className="piu__thumb">
              <img src={url} alt={`Product image ${i + 1}`} className="piu__img" />
              {i === 0 && <span className="piu__badge">Main</span>}
              <button
                type="button"
                className="piu__remove"
                onClick={() => removeExisting(url)}
                aria-label="Remove"
              >
                <FiX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* In-progress uploads */}
      {entries.length > 0 && (
        <div className="piu__grid" style={{ marginTop: value.length ? '.75rem' : 0 }}>
          {entries.map((entry) => (
            <div key={entry.id} className={`piu__thumb piu__thumb--${entry.status}`}>
              <img src={entry.preview} alt="" className="piu__img" />
              {entry.status === 'uploading' && (
                <div className="piu__overlay">
                  <div className="piu__spinner" />
                </div>
              )}
              {entry.status === 'error' && (
                <div className="piu__overlay piu__overlay--error">
                  <FiAlertCircle size={18} />
                  <span>{entry.error}</span>
                </div>
              )}
              {(entry.status === 'done' || entry.status === 'error') && (
                <button
                  type="button"
                  className="piu__remove"
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Remove"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — only show when under the limit */}
      {canAdd && (
        <div
          className={`piu__zone${dragging ? ' piu__zone--drag' : ''}`}
          style={{ marginTop: value.length || entries.length ? '.75rem' : 0 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <FiUploadCloud size={28} />
          <p className="piu__zone-text">
            <strong>Click to upload</strong> or drag &amp; drop
          </p>
          <p className="piu__zone-hint">
            JPEG, PNG, WebP · max 5 MB each · up to {maxImages} images
          </p>
          {totalCount > 0 && (
            <p className="piu__zone-hint">
              {maxImages - totalCount} slot{maxImages - totalCount !== 1 ? 's' : ''} remaining
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>
      )}

      {!canAdd &&
        value.length === 0 &&
        entries.filter((e) => e.status !== 'error').length === 0 && (
          <p style={{ fontSize: '.75rem', color: '#9ca3af' }}>
            <FiImage size={13} style={{ verticalAlign: 'middle' }} /> No images yet
          </p>
        )}
    </div>
  )
}
