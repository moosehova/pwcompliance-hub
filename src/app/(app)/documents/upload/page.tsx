"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Upload, FileText, X } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "PACRA", "ZRA", "NAPSA", "NHIMA", "PAYROLL", "TAX",
  "COMPANY_REGISTRATION", "LICENCE", "CERTIFICATE", "RECEIPT", "RETURN", "CONTRACT", "OTHER",
];

const ALLOWED_TYPES = [
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

const MAX_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDocumentPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; legalName: string; tradingName: string | null }[]>([]);
  const [authorities, setAuthorities] = useState<{ id: string; name: string }[]>([]);

  const [fields, setFields] = useState({
    businessId: "",
    authorityId: "",
    name: "",
    description: "",
    category: "OTHER",
    periodLabel: "",
    expiryDate: "",
  });

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then(setBusinesses).catch(() => {});
    fetch("/api/authorities").then((r) => r.json()).then(setAuthorities).catch(() => {});
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
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
    if (!fields.name) setFields((prev) => ({ ...prev, name: f.name.replace(/\.[^.]+$/, "") }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setFileError("Please select a file to upload."); return; }
    if (!fields.businessId) { setError("Please select a business."); return; }
    setError(null);
    setLoading(true);
    setProgress(0);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("businessId", fields.businessId);
      fd.append("name", fields.name || file.name);
      fd.append("category", fields.category);
      if (fields.description) fd.append("description", fields.description);
      if (fields.authorityId) fd.append("authorityId", fields.authorityId);
      if (fields.periodLabel) fd.append("periodLabel", fields.periodLabel);
      if (fields.expiryDate) fd.append("expiryDate", fields.expiryDate);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            const json = JSON.parse(xhr.responseText ?? "{}");
            reject(new Error(json.error ?? "Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", "/api/vault/upload");
        xhr.send(fd);
      });

      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/documents">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload Document</h1>
          <p className="text-muted-foreground">Documents are stored privately and never publicly accessible</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* File picker */}
        <Card>
          <CardHeader><CardTitle className="text-base">File</CardTitle></CardHeader>
          <CardContent>
            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.type}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to select a file</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, images, Word, Excel, CSV · max 25 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={handleFileChange} className="hidden" />
            {fileError && <p className="text-xs text-red-500 mt-2">{fileError}</p>}

            {/* Upload progress */}
            {progress !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Uploading…</span><span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Document Details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business *</Label>
              <Select onValueChange={(v) => setFields((p) => ({ ...p, businessId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.tradingName ?? b.legalName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Authority (optional)</Label>
              <Select onValueChange={(v) => setFields((p) => ({ ...p, authorityId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select authority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {authorities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="name">Document name *</Label>
              <Input id="name" placeholder="PACRA Certificate of Incorporation" value={fields.name} onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue="OTHER" onValueChange={(v) => setFields((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodLabel">Period (optional)</Label>
              <Input id="periodLabel" placeholder="July 2026" value={fields.periodLabel} onChange={(e) => setFields((p) => ({ ...p, periodLabel: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry date (optional)</Label>
              <Input id="expiryDate" type="date" value={fields.expiryDate} onChange={(e) => setFields((p) => ({ ...p, expiryDate: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Additional notes about this document…" value={fields.description} onChange={(e) => setFields((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/documents"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading || !file}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Uploading…" : "Upload Document"}
          </Button>
        </div>
      </form>
    </div>
  );
}
