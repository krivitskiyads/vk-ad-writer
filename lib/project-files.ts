export const MAX_PROJECT_FILE_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
]);

export function getFileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export type FileValidationError =
  | "type"
  | "size"
  | null;

export function validateProjectFile(file: File): FileValidationError {
  if (file.size > MAX_PROJECT_FILE_BYTES) return "size";
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return "type";
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const ACCEPT_FILE_ATTR =
  ".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,image/jpeg,image/png";
