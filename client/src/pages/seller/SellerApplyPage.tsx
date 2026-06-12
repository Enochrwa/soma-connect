import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplyAsSellerMutation } from "../../app/api";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { ImageUploader } from "../../components/ui/ImageUploader";
import { Store, FileText, CheckCircle, Loader2, AlertCircle } from "lucide-react";

const SECTORS = [
  "Agriculture & Food",
  "Clothing & Textiles",
  "Electronics & Tech",
  "Health & Beauty",
  "Home & Living",
  "Handicrafts & Art",
  "Education & Books",
  "Sports & Outdoor",
  "Automotive",
  "Other",
];

export default function SellerApplyPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s: RootState) => s.auth.user);
  const [apply, { isLoading, error }] = useApplyAsSellerMutation();

  const [form, setForm] = useState({
    storeName: "",
    description: "",
    accountType: "individual",
    sector: "",
    logo: [] as string[],
    banner: [] as string[],
    nidUrl: [] as string[],
    licenseUrl: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  // If already a seller / pending, redirect
  if (user?.role === "seller") {
    navigate("/seller", { replace: true });
    return null;
  }

  const setText =
    (k: "storeName" | "description" | "accountType" | "sector") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const setImages = (k: "logo" | "banner" | "nidUrl" | "licenseUrl") => (urls: string[]) =>
    setForm((f) => ({ ...f, [k]: urls }));

  const handleSubmit = async () => {
    if (!form.storeName.trim() || !form.sector) return;
    try {
      await apply({
        storeName: form.storeName.trim(),
        description: form.description.trim() || undefined,
        accountType: form.accountType,
        sector: form.sector,
        logo: form.logo[0] || undefined,
        banner: form.banner[0] || undefined,
        nidUrl: form.nidUrl[0] || undefined,
        licenseUrl: form.licenseUrl[0] || undefined,
      }).unwrap();
      setSubmitted(true);
    } catch {
      // error shown via RTK Query `error`
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
        <CheckCircle size={56} className="text-forest mb-4" />
        <h1 className="font-display text-3xl text-forest mb-2">Application submitted!</h1>
        <p className="text-slate/60 max-w-md">
          Your seller application is under review. We'll notify you by email once it's approved.
          This usually takes 1–2 business days.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-8 btn-primary px-8 py-3 rounded-xl font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const errMsg =
    error && "data" in error
      ? ((error.data as { message?: string })?.message ?? "Something went wrong. Please try again.")
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-forest rounded-xl flex items-center justify-center shrink-0">
          <Store size={22} className="text-saffron" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-forest">Become a Seller</h1>
          <p className="text-sm text-slate/60">Join Rwanda's digital marketplace</p>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        {/* Store name */}
        <div>
          <label className="label">Store name *</label>
          <input
            className="input w-full"
            placeholder="e.g. Kigali Crafts"
            value={form.storeName}
            onChange={setText("storeName")}
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Store description</label>
          <textarea
            className="input w-full h-24 resize-none"
            placeholder="Tell buyers what you sell…"
            value={form.description}
            onChange={setText("description")}
          />
        </div>

        {/* Sector */}
        <div>
          <label className="label">Business sector *</label>
          <select className="input w-full" value={form.sector} onChange={setText("sector")}>
            <option value="">Select a sector…</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Account type */}
        <div>
          <label className="label">Account type</label>
          <div className="flex gap-3">
            {["individual", "business"].map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, accountType: t }))}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition capitalize
                  ${
                    form.accountType === t
                      ? "bg-forest text-saffron border-forest"
                      : "border-slate/20 text-slate/60 hover:border-forest/40"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="label">Store logo</label>
          <ImageUploader value={form.logo} onChange={setImages("logo")} maxFiles={1} label="Logo" />
        </div>

        {/* NID / License */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <FileText size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Upload a copy of your National ID (NID) or business license to speed up verification.
            This is optional but recommended.
          </p>
        </div>
        <div>
          <label className="label">National ID (optional)</label>
          <ImageUploader
            value={form.nidUrl}
            onChange={setImages("nidUrl")}
            maxFiles={1}
            label="National ID"
          />
        </div>
        {form.accountType === "business" && (
          <div>
            <label className="label">Business license (optional)</label>
            <ImageUploader
              value={form.licenseUrl}
              onChange={setImages("licenseUrl")}
              maxFiles={1}
              label="Business license"
            />
          </div>
        )}

        {/* Error */}
        {errMsg && (
          <div className="flex items-center gap-2 text-vermillion text-sm bg-vermillion/5 border border-vermillion/20 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            {errMsg}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !form.storeName.trim() || !form.sector}
          className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
    </div>
  );
}
