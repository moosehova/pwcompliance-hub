"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, X } from "lucide-react";

const TAX_DOC_CATEGORIES = [
  "TAX", "RECEIPT", "RETURN", "PAYROLL", "ZRA", "NAPSA", "NHIMA",
  "CERTIFICATE", "CONTRACT", "OTHER",
];

const ALLOWED_TYPES = [
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

const MAX_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaxDocumentUpload({
  taxReturnId,
  businessId,
}: {
  taxReturnId: string;
  businessId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [description, setDescription] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    setSuccess(null);
    if (!f) { setFile(null); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError("File type not supported. Allowed: PDF, images, Word, Excel, CSV, text.");
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError("File is too large. Maximum size is 25 MB.");
      setFile(null);
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setFileError("Please select a file."); return; }
    setError(null);
    setSuccess(null);
    setLoading(true);
    setProgress(0);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("businessId", businessId);
      fd.append("taxReturnId", taxReturnId);
      fd.append("name", name || file.name);
      fd.append("category", category);
      if (description) fd.append("description", description);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            const json = JSON.parse(xhr.responseText ?? "{}");
            reject(new Error(json.error ?? "Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", "/api/vault/upload");
        xhr.send(fd);
      });

      setSuccess(`"${name || file.name}" uploaded successfully`);
      setFile(null);
      setName("");
      setDescription("");
      setCategory("OTHER");
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File picker */}
          {file ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <FileText className="h-7 w-7 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm">Click to select file</p>
              <p className="text-xs text-muted-foreground">PDF, images, Word, Excel · max 25 MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={handleFileChange} className="hidden" />
          {fileError && <p className="text-xs text-red-500">{fileError}</p>}

          {/* Progress bar */}
          {progress !== null && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Uploading…</span><span>{progress}%</span></div>
              <div className="w-full h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="docName" className="text-sm">Document name</Label>
              <Input id="docName" placeholder="e.g. ZRA Acknowledgement" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="docDesc" className="text-sm">Description (optional)</Label>
              <Input id="docDesc" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {success && <p className="text-sm text-green-600">{success}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading || !file} size="sm">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
