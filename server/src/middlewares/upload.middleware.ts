import os from 'os'
import path from 'path'
import { open, unlink } from 'fs/promises'
import multer from 'multer'
import type { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware.js'

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// Magic byte signatures for each allowed image format.
// Client-supplied MIME headers are untrusted; we verify actual file bytes on disk.
const MAGIC_BYTES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/jpg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  'image/webp': (b) =>
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50,
}

// Write uploads to OS temp dir instead of RAM.
// This prevents 40 MB × concurrent_uploads from filling the Node.js heap.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = `cartiva-upload-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  },
})

const uploader = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
    }
  },
})

async function checkMagicBytes(req: Request): Promise<void> {
  const files: Express.Multer.File[] = req.file
    ? [req.file]
    : ((req.files as Express.Multer.File[]) ?? [])

  for (const file of files) {
    let fd: Awaited<ReturnType<typeof open>> | null = null
    try {
      fd = await open(file.path, 'r')
      const buf = Buffer.alloc(12)
      await fd.read(buf, 0, 12, 0)
      const check = MAGIC_BYTES[file.mimetype]
      if (!check || !check(buf)) {
        await fd.close()
        fd = null
        // Remove all temp files before rejecting the request
        await Promise.allSettled(files.map((f) => unlink(f.path)))
        throw new AppError('File content does not match the declared image type', 400)
      }
    } finally {
      await fd?.close()
    }
  }
}

const wrapMulter = (
  handler: ReturnType<typeof uploader.single | typeof uploader.array>,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  handler(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Each image must be under 5 MB', 400))
      }
      return next(new AppError(err instanceof Error ? err.message : 'File upload error', 400))
    }
    checkMagicBytes(req)
      .then(() => next())
      .catch(next)
  })
}

export const uploadAvatar = (req: Request, res: Response, next: NextFunction): void =>
  wrapMulter(uploader.single('avatar'), req, res, next)

export const uploadProductImages = (req: Request, res: Response, next: NextFunction): void =>
  wrapMulter(uploader.array('images', 8), req, res, next)
