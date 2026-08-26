import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * Builds a single-file upload handler that writes into `UPLOAD_DIR/<subdirectory>/<:id>`.
 * `subdirectory` keeps each owning resource's files apart on disk ("customers", "tickets").
 */
const createSingleFileUpload = (subdirectory: string): RequestHandler => {
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const ownerId = String(req.params.id);
      const dir = path.join(env.UPLOAD_DIR, subdirectory, ownerId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      // path.basename strips any directory component from a hostile original filename
      // (e.g. "../../etc/passwd") before it becomes part of a path on disk.
      const safeName = path.basename(file.originalname);
      cb(null, `${randomUUID()}-${safeName}`);
    }
  });

  const singleFileUpload = multer({
    storage,
    limits: { fileSize: env.MAX_ATTACHMENT_SIZE_BYTES }
  }).single('file');

  /** Wraps multer's callback-style error into the project's AppError convention, so a
   * too-large or malformed upload returns the same `{ success, message, data }` envelope
   * as every other failure instead of falling through to a bare 500. */
  return (req: Request, res: Response, next: NextFunction) => {
    singleFileUpload(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the maximum allowed size' : err.message;
        next(new AppError(400, message));
        return;
      }
      if (err) {
        next(err);
        return;
      }
      if (!req.file) {
        next(new AppError(400, 'No file was uploaded'));
        return;
      }
      next();
    });
  };
};

export const uploadCustomerAttachment = createSingleFileUpload('customers');
export const uploadTicketAttachment = createSingleFileUpload('tickets');
