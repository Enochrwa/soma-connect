/**
 * BulkImportUploader
 * ──────────────────
 * A self-contained wizard that lets a seller upload a CSV file to create
 * hundreds of products in one shot.
 *
 * Steps:
 *   1. Download template  →  fill it out offline (Excel, Google Sheets, etc.)
 *   2. Upload CSV         →  dry-run validation preview
 *   3. Confirm            →  actual import  →  summary report
 *
 * 100% free: no paid services, no extra API keys.  Uses the free tier of
 * whatever image host the seller already uses (Cloudinary free, ImgBB, Imgur…)
 */

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  CheckCircle2,
  Loader2,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useBulkImportProductsMutation, useValidateBulkImportMutation } from "../../app/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface ValidationRow {
  row: number;
  valid: boolean;
  errors: string[];
  preview: { title: string; price: number; category: string } | null;
}

type Step = "idle" | "validating" | "preview" | "importing" | "done";

const TEMPLATE_URL = `${
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api"
}/products/bulk/template`;

// ── Component ────────────────────────────────────────────────────────────────

export function BulkImportUploader({ onDone }: { onDone?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [validationResult, setValidationResult] = useState<{
    total: number;
    validCount: number;
    invalidCount: number;
    rows: ValidationRow[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    summary: { total: number; inserted: number; validationFailed: number; insertFailed: number };
    validationErrors: Array<{ row: number; errors: string[] }>;
    insertErrors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [aiEnhance, setAiEnhance] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [validateBulk] = useValidateBulkImportMutation();
  const [importBulk] = useBulkImportProductsMutation();

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep("idle");
    setValidationResult(null);
    setImportResult(null);
    setGlobalError("");
  }

  async function handleValidate() {
    if (!file) return;
    setGlobalError("");
    setStep("validating");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await validateBulk(fd).unwrap();
      setValidationResult(result);
      setStep("preview");
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: string } })?.data?.error ??
        "Validation failed. Please check the file format.";
      setGlobalError(msg);
      setStep("idle");
    }
  }

  async function handleImport() {
    if (!file) return;
    setGlobalError("");
    setStep("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("aiEnhance", String(aiEnhance));
      const result = await importBulk(fd).unwrap();
      setImportResult(result);
      setStep("done");
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: string } })?.data?.error ?? "Import failed. Please try again.";
      setGlobalError(msg);
      setStep("preview");
    }
  }

  function reset() {
    setFile(null);
    setStep("idle");
    setValidationResult(null);
    setImportResult(null);
    setGlobalError("");
    if (fileRef.current) fileRef.current.value = "";
    onDone?.();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-forest text-lg">Bulk Product Import</h3>
          <p className="text-xs text-slate/50 mt-0.5">
            Upload a CSV to add up to 500 products at once — completely free.
          </p>
        </div>
        {step === "done" && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-forest border border-forest/20 px-3 py-1.5 rounded-lg hover:bg-forest/5"
          >
            <RefreshCw size={12} /> Start over
          </button>
        )}
      </div>

      {/* ── Step 1: Download template ── */}
      <div className="rounded-xl border border-forest/10 bg-forest/2 p-4 flex items-start gap-3">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-forest/10 text-forest flex items-center justify-center flex-shrink-0 text-xs font-bold">
          1
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-forest">Download the CSV template</p>
          <p className="text-xs text-slate/50 mt-0.5 mb-2">
            Fill in your products in Excel, LibreOffice or Google Sheets. Put comma-separated public
            image URLs in the <code className="font-mono">images</code> column (Cloudinary free
            tier, ImgBB, Imgur, etc.).
          </p>
          <a
            href={TEMPLATE_URL}
            download="soma-products-template.csv"
            className="inline-flex items-center gap-1.5 text-xs bg-forest text-saffron px-3 py-1.5 rounded-lg hover:bg-forest/90 transition-colors"
          >
            <Download size={13} /> Download template
          </a>
        </div>
      </div>

      {/* ── Step 2: Upload CSV ── */}
      <div className="rounded-xl border border-forest/10 bg-forest/2 p-4 flex items-start gap-3">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-forest/10 text-forest flex items-center justify-center flex-shrink-0 text-xs font-bold">
          2
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-forest">Upload your filled CSV</p>
          <p className="text-xs text-slate/50 mt-0.5 mb-2">Max 500 rows, 5 MB file size.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-forest/10 file:text-forest hover:file:bg-forest/15 cursor-pointer"
          />
          {file && (
            <p className="text-xs text-slate/50 mt-1 flex items-center gap-1">
              <FileText size={11} /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {globalError && (
        <div className="flex items-start gap-2 text-sm text-vermillion bg-vermillion/5 border border-vermillion/20 rounded-xl p-3">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          {globalError}
        </div>
      )}

      {/* ── Step 3: Validate (dry run) ── */}
      {step === "idle" && file && (
        <button
          onClick={handleValidate}
          className="btn-primary flex items-center gap-2 w-full justify-center"
        >
          <CheckCircle2 size={15} /> Validate CSV (preview)
        </button>
      )}

      {step === "validating" && (
        <div className="flex items-center justify-center gap-2 py-4 text-slate/60 text-sm">
          <Loader2 size={16} className="animate-spin text-forest" />
          Checking your CSV…
        </div>
      )}

      {/* ── Validation preview ── */}
      {step === "preview" && validationResult && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <Pill label="Total rows" value={validationResult.total} color="slate" />
            <Pill label="Valid" value={validationResult.validCount} color="green" />
            <Pill label="Errors" value={validationResult.invalidCount} color="red" />
          </div>

          {/* Error list (collapsible) */}
          {validationResult.invalidCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <button
                onClick={() => setShowErrors((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-medium text-amber-800"
              >
                <span>{validationResult.invalidCount} rows have errors (will be skipped)</span>
                {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showErrors && (
                <ul className="space-y-1 text-xs text-amber-700 max-h-48 overflow-y-auto">
                  {validationResult.rows
                    .filter((r) => !r.valid)
                    .map((r) => (
                      <li key={r.row} className="border-t border-amber-100 pt-1">
                        <span className="font-mono font-bold">Row {r.row}:</span>{" "}
                        {r.errors.join(" · ")}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          {/* Valid preview */}
          {validationResult.validCount > 0 && (
            <div className="rounded-xl border border-forest/10 overflow-hidden">
              <div className="bg-forest/5 px-3 py-2 text-xs font-semibold text-forest">
                Preview — valid rows ({Math.min(validationResult.validCount, 5)} of{" "}
                {validationResult.validCount} shown)
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="text-left px-3 py-1.5 text-slate/50 font-medium">Row</th>
                    <th className="text-left px-3 py-1.5 text-slate/50 font-medium">Title</th>
                    <th className="text-left px-3 py-1.5 text-slate/50 font-medium">Category</th>
                    <th className="text-right px-3 py-1.5 text-slate/50 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.rows
                    .filter((r) => r.valid && r.preview)
                    .slice(0, 5)
                    .map((r) => (
                      <tr key={r.row} className="border-b border-forest/5 last:border-0">
                        <td className="px-3 py-1.5 font-mono text-slate/40">{r.row}</td>
                        <td className="px-3 py-1.5 truncate max-w-[160px]">{r.preview!.title}</td>
                        <td className="px-3 py-1.5 text-slate/60">{r.preview!.category}</td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {r.preview!.price.toLocaleString()} RWF
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {validationResult.validCount > 5 && (
                <p className="text-xs text-slate/40 px-3 py-1.5 text-center">
                  …and {validationResult.validCount - 5} more
                </p>
              )}
            </div>
          )}

          {validationResult.validCount === 0 ? (
            <p className="text-center text-sm text-vermillion py-2">
              No valid rows found. Fix the errors and re-upload.
            </p>
          ) : (
            <>
              {/* AI-enhance toggle */}
              <label className="flex items-start gap-3 bg-gradient-to-r from-forest/5 to-saffron/5 border border-forest/10 rounded-xl p-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={aiEnhance}
                  onChange={(e) => setAiEnhance(e.target.checked)}
                  className="mt-0.5 accent-forest"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-saffron" />
                    <span className="text-sm font-medium text-forest">AI-enhance products</span>
                    <span className="text-xs bg-saffron/20 text-saffron px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate/50 mt-1">
                    Auto-generate missing descriptions and tags using AI. Validates image URLs.
                    Takes a bit longer but saves you hours of writing.
                  </p>
                </div>
              </label>

              <button
                onClick={handleImport}
                className="btn-primary flex items-center gap-2 w-full justify-center"
              >
                {aiEnhance ? <Sparkles size={15} /> : <Upload size={15} />}
                {aiEnhance ? "AI-Import" : "Import"} {validationResult.validCount} product
                {validationResult.validCount !== 1 ? "s" : ""}
                {validationResult.invalidCount > 0 &&
                  ` (skip ${validationResult.invalidCount} with errors)`}
              </button>
            </>
          )}

          <button
            onClick={() => {
              setFile(null);
              setStep("idle");
              setValidationResult(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="btn-ghost w-full text-center text-sm"
          >
            Start over
          </button>
        </div>
      )}

      {step === "importing" && (
        <div className="flex items-center justify-center gap-2 py-6 text-slate/60 text-sm">
          <Loader2 size={18} className="animate-spin text-forest" />
          Importing products… please wait
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Import complete!</p>
              <p className="text-xs text-green-700 mt-0.5">
                {importResult.summary.inserted} product
                {importResult.summary.inserted !== 1 ? "s" : ""} added to your store.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Pill label="Imported" value={importResult.summary.inserted} color="green" />
            <Pill
              label="Skipped"
              value={importResult.summary.validationFailed + importResult.summary.insertFailed}
              color="red"
            />
          </div>

          {(importResult.validationErrors.length > 0 || importResult.insertErrors.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">Rows that were skipped:</p>
              <ul className="space-y-0.5">
                {importResult.validationErrors.map((e) => (
                  <li key={e.row}>
                    <span className="font-mono">Row {e.row}:</span> {e.errors.join(", ")}
                  </li>
                ))}
                {importResult.insertErrors.map((e) => (
                  <li key={e.row}>
                    <span className="font-mono">Row {e.row}:</span> {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pill ─────────────────────────────────────────────────────────────────────

function Pill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "slate";
}) {
  const cls = {
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    slate: "bg-slate/5 border-slate/10 text-slate",
  }[color];
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
