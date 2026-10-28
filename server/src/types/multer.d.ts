/**
 * Self-contained ambient type declarations for Multer file uploads in Express.
 * Provides explicit, secure typings for file attributes without external dependency risks.
 */

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        /** Name of the multipart form field */
        fieldname: string
        /** Original name of the file on the user's computer */
        originalname: string
        /** Encoding type of the file */
        encoding: string
        /** Content-Type mime type (e.g. image/jpeg, image/png, application/pdf) */
        mimetype: string
        /** File size in bytes */
        size: number
        /** Destination directory on disk (DiskStorage) */
        destination: string
        /** Saved filename in destination directory (DiskStorage) */
        filename: string
        /** Full absolute path to uploaded file (DiskStorage) */
        path: string
        /** Memory buffer of the uploaded file (MemoryStorage) */
        buffer: Buffer
      }
    }

    interface Request {
      file?: Multer.File
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] }
    }
  }
}

export {}
