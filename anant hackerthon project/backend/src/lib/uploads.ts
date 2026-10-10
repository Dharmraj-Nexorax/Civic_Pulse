import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config';
import { validationError, payloadTooLarge } from './errors';

export interface ValidatedFile {
  originalName: string;
  mime: string;
  sizeBytes: number;
  buffer: Buffer;
  extension: string;
}

export function detectMimeFromBytes(buffer: Buffer, declaredMime: string): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: 'RIFF'....'WEBP'
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  // WebM: 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'video/webm';
  }

  // MP4: offset 4 'ftyp'
  const ftyp = buffer.subarray(4, 8).toString('ascii');
  if (ftyp === 'ftyp') {
    return 'video/mp4';
  }

  // Fallback to declared if it is one of the allowed and matches basic header
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
  if (allowed.includes(declaredMime)) {
    return declaredMime;
  }

  return null;
}

export function getExtensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    default:
      return 'bin';
  }
}

export async function validateAndPrepareFile(
  file: File,
  isProof = false
): Promise<ValidatedFile> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const declaredMime = file.type;
  const verifiedMime = detectMimeFromBytes(bytes, declaredMime);

  if (!verifiedMime) {
    throw validationError(
      `Unsupported file type for ${file.name}. Allowed formats: JPEG, PNG, WebP, MP4, WebM.`
    );
  }

  const isVideo = verifiedMime.startsWith('video/');
  const maxBytes = isVideo
    ? config.maxVideoMb * 1024 * 1024
    : config.maxImageMb * 1024 * 1024;

  if (bytes.length > maxBytes) {
    const limitMb = isVideo ? config.maxVideoMb : config.maxImageMb;
    throw payloadTooLarge(`File ${file.name} exceeds maximum size limit of ${limitMb}MB.`);
  }

  return {
    originalName: file.name,
    mime: verifiedMime,
    sizeBytes: bytes.length,
    buffer: bytes,
    extension: getExtensionForMime(verifiedMime),
  };
}

export async function parseAndValidateUploads(
  files: (File | FormDataEntryValue | null | undefined)[],
  isProof = false
): Promise<ValidatedFile[]> {
  const result: ValidatedFile[] = [];
  for (const f of files) {
    if (f && typeof f === 'object' && 'arrayBuffer' in f && typeof (f as File).size === 'number' && (f as File).size > 0) {
      result.push(await validateAndPrepareFile(f as File, isProof));
    }
  }
  return result;
}

export async function saveFileToDisk(
  file: ValidatedFile
): Promise<{ storagePath: string; absolutePath: string }> {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const fileUuid = crypto.randomUUID();
  const filename = `${fileUuid}.${file.extension}`;

  const relativeDir = path.join(year, month);
  const targetDir = path.resolve(config.uploadDir, relativeDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const absolutePath = path.join(targetDir, filename);
  const storagePath = path.join(relativeDir, filename).replace(/\\/g, '/');

  await fs.promises.writeFile(absolutePath, file.buffer);
  return { storagePath, absolutePath };
}

export async function deleteFileFromDisk(storagePath: string): Promise<void> {
  try {
    const absolutePath = path.resolve(config.uploadDir, storagePath);
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  } catch (err) {
    console.error(`Failed to delete file at ${storagePath}:`, err);
  }
}
