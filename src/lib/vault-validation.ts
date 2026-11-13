export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);

export const ALLOWED_EXTENSIONS = new Set([
  "pdf", "jpg", "jpeg", "png", "gif", "webp",
  "doc", "docx", "xls", "xlsx", "txt", "csv",
]);

export const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export type ValidationError =
  | { code: "MISSING_FILE" }
  | { code: "MIME_NOT_ALLOWED"; mimeType: string }
  | { code: "EXTENSION_NOT_ALLOWED"; extension: string }
  | { code: "FILE_TOO_LARGE"; size: number; maxBytes: number }
  | { code: "MIME_EXTENSION_MISMATCH"; mimeType: string; extension: string };

export function validateUploadedFile(file: {
  name: string;
  type: string;
  size: number;
}): ValidationError | null {
  if (!file) return { code: "MISSING_FILE" };

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_MIME.has(file.type)) {
    return { code: "MIME_NOT_ALLOWED", mimeType: file.type };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { code: "EXTENSION_NOT_ALLOWED", extension };
  }

  if (file.size > MAX_BYTES) {
    return { code: "FILE_TOO_LARGE", size: file.size, maxBytes: MAX_BYTES };
  }

  return null;
}

export function validationErrorMessage(err: ValidationError): string {
  switch (err.code) {
    case "MISSING_FILE": return "No file provided";
    case "MIME_NOT_ALLOWED": return `File type not permitted: ${err.mimeType}`;
    case "EXTENSION_NOT_ALLOWED": return `File extension not permitted: .${err.extension}`;
    case "FILE_TOO_LARGE": return `File exceeds ${Math.round(err.maxBytes / (1024 * 1024))} MB limit`;
    case "MIME_EXTENSION_MISMATCH": return `File type does not match extension`;
  }
}
