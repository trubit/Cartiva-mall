import { useRef, useState } from 'react'
import { FiCamera, FiUpload } from 'react-icons/fi'
import { CgSpinner } from 'react-icons/cg'
import { useUploadAvatar } from '../../../hooks/useProfile.js'
import type { IUser } from '../../../../shared/types/user.types.js'

interface Props {
  user: IUser
}

export default function AvatarUploader({ user }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const uploadMutation = useUploadAvatar()

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  const src = preview ?? user.profileImage

  const handleFile = (file: File) => {
    setError('')
    setSuccess('')
    if (!file.type.startsWith('image/')) {
      setError('Only image files allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Please select an image first.')
      return
    }
    try {
      await uploadMutation.mutateAsync(file)
      setPreview(null)
      setSuccess('Avatar updated successfully.')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    }
  }

  return (
    <div className="avatar-uploader">
      <div className="avatar-uploader-preview" onClick={() => fileRef.current?.click()}>
        {src ? (
          <img src={src} alt="Avatar" className="avatar-uploader-img" />
        ) : (
          <div className="avatar-uploader-fallback">{initials}</div>
        )}
        <div className="avatar-uploader-overlay">
          <FiCamera />
        </div>
      </div>

      <input
        type="file"
        ref={fileRef}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {error && <p className="profile-alert profile-alert--error">{error}</p>}
      {success && <p className="profile-alert profile-alert--success">{success}</p>}

      <button
        className="avatar-upload-btn"
        onClick={handleUpload}
        disabled={uploadMutation.isPending || !preview}
      >
        {uploadMutation.isPending ? (
          <>
            <CgSpinner className="spin" /> Uploading…
          </>
        ) : (
          <>
            <FiUpload /> {preview ? 'Save Avatar' : 'Choose Photo'}
          </>
        )}
      </button>
      <p className="avatar-hint">JPEG, PNG or WebP · Max 5 MB</p>
    </div>
  )
}
