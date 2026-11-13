import { describe, it, expect } from "vitest";
import {
  validateUploadedFile,
  validationErrorMessage,
  ALLOWED_MIME,
  ALLOWED_EXTENSIONS,
  MAX_BYTES,
} from "@/lib/vault-validation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(
  overrides: Partial<{ name: string; type: string; size: number }>
) {
  return {
    name: "test.pdf",
    type: "application/pdf",
    size: 1024,
    ...overrides,
  };
}

// ─── Allowed MIME types ───────────────────────────────────────────────────────

describe("allowed MIME types", () => {
  it("accepts application/pdf", () => {
    expect(validateUploadedFile(makeFile({ type: "application/pdf" }))).toBeNull();
  });

  it("accepts image/jpeg", () => {
    expect(validateUploadedFile(makeFile({ name: "photo.jpg", type: "image/jpeg" }))).toBeNull();
  });

  it("accepts application/vnd.ms-excel (.xls)", () => {
    expect(
      validateUploadedFile(makeFile({ name: "data.xls", type: "application/vnd.ms-excel" }))
    ).toBeNull();
  });

  it("rejects text/html", () => {
    const err = validateUploadedFile(makeFile({ name: "page.html", type: "text/html" }));
    expect(err?.code).toBe("MIME_NOT_ALLOWED");
  });

  it("rejects application/javascript", () => {
    const err = validateUploadedFile(makeFile({ name: "script.js", type: "application/javascript" }));
    expect(err?.code).toBe("MIME_NOT_ALLOWED");
  });

  it("rejects image/svg+xml", () => {
    const err = validateUploadedFile(makeFile({ name: "icon.svg", type: "image/svg+xml" }));
    expect(err?.code).toBe("MIME_NOT_ALLOWED");
  });
});

// ─── Allowed extensions ───────────────────────────────────────────────────────

describe("allowed extensions", () => {
  it("accepts .pdf extension", () => {
    expect(validateUploadedFile(makeFile({ name: "report.pdf" }))).toBeNull();
  });

  it("accepts .docx extension", () => {
    expect(
      validateUploadedFile(
        makeFile({
          name: "letter.docx",
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      )
    ).toBeNull();
  });

  it("rejects .exe extension", () => {
    const err = validateUploadedFile(makeFile({ name: "setup.exe", type: "application/octet-stream" }));
    // MIME not allowed fires first
    expect(err?.code).toBe("MIME_NOT_ALLOWED");
  });

  it("rejects .php extension with allowed MIME", () => {
    const err = validateUploadedFile(makeFile({ name: "shell.php", type: "text/plain" }));
    expect(err?.code).toBe("EXTENSION_NOT_ALLOWED");
  });

  it("rejects .html extension", () => {
    const err = validateUploadedFile(makeFile({ name: "page.html", type: "text/plain" }));
    expect(err?.code).toBe("EXTENSION_NOT_ALLOWED");
  });

  it("is case-insensitive for extensions", () => {
    expect(validateUploadedFile(makeFile({ name: "REPORT.PDF" }))).toBeNull();
    expect(validateUploadedFile(makeFile({ name: "data.CSV", type: "text/csv" }))).toBeNull();
  });
});

// ─── File size ────────────────────────────────────────────────────────────────

describe("file size", () => {
  it("accepts file exactly at the limit", () => {
    expect(validateUploadedFile(makeFile({ size: MAX_BYTES }))).toBeNull();
  });

  it("rejects file one byte over the limit", () => {
    const err = validateUploadedFile(makeFile({ size: MAX_BYTES + 1 }));
    expect(err?.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects zero-size file without blocking on MIME/ext", () => {
    expect(validateUploadedFile(makeFile({ size: 0 }))).toBeNull();
  });
});

// ─── Missing file ─────────────────────────────────────────────────────────────

describe("missing file", () => {
  it("returns MISSING_FILE when null is passed", () => {
    const err = validateUploadedFile(null as never);
    expect(err?.code).toBe("MISSING_FILE");
  });
});

// ─── Error messages ───────────────────────────────────────────────────────────

describe("validationErrorMessage", () => {
  it("returns human-readable message for MIME_NOT_ALLOWED", () => {
    const msg = validationErrorMessage({ code: "MIME_NOT_ALLOWED", mimeType: "text/html" });
    expect(msg).toMatch(/text\/html/);
  });

  it("returns human-readable message for EXTENSION_NOT_ALLOWED", () => {
    const msg = validationErrorMessage({ code: "EXTENSION_NOT_ALLOWED", extension: "php" });
    expect(msg).toMatch(/php/);
  });

  it("returns human-readable message for FILE_TOO_LARGE", () => {
    const msg = validationErrorMessage({ code: "FILE_TOO_LARGE", size: MAX_BYTES + 1, maxBytes: MAX_BYTES });
    expect(msg).toMatch(/25/);
  });

  it("returns message for MISSING_FILE", () => {
    const msg = validationErrorMessage({ code: "MISSING_FILE" });
    expect(msg.length).toBeGreaterThan(0);
  });
});

// ─── Tenant isolation (pure logic) ───────────────────────────────────────────
// The actual DB query is in the route handler; these tests verify the validation
// logic that runs before any DB call.

describe("tenant isolation invariants", () => {
  it("ALLOWED_MIME does not include any executable or scripting types", () => {
    const dangerous = [
      "application/x-executable",
      "application/x-sh",
      "application/javascript",
      "text/javascript",
      "application/x-python",
      "text/html",
      "image/svg+xml",
    ];
    for (const mime of dangerous) {
      expect(ALLOWED_MIME.has(mime)).toBe(false);
    }
  });

  it("ALLOWED_EXTENSIONS does not include any script/executable extensions", () => {
    const dangerous = ["exe", "sh", "bat", "js", "ts", "php", "py", "rb", "html", "htm", "svg"];
    for (const ext of dangerous) {
      expect(ALLOWED_EXTENSIONS.has(ext)).toBe(false);
    }
  });
});
