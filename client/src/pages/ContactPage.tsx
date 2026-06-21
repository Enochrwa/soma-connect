import { useState, useId } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ChevronDown,
  Send,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ShoppingBag,
  Store,
  Wrench,
  Handshake,
  Newspaper,
  HelpCircle,
} from "lucide-react";
import { useSubmitContactMutation } from "../app/api";

// ── Types ──────────────────────────────────────────────────────────────────
type Category =
  | "general"
  | "order_support"
  | "seller_support"
  | "technical"
  | "partnership"
  | "press";

interface FormState {
  name: string;
  email: string;
  subject: string;
  category: Category | "";
  message: string;
  orderId: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  category?: string;
  message?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES: {
  value: Category;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "general",
    label: "General Enquiry",
    icon: MessageSquare,
    description: "Questions about SOMA Market",
  },
  {
    value: "order_support",
    label: "Order Support",
    icon: ShoppingBag,
    description: "Track, modify or cancel an order",
  },
  {
    value: "seller_support",
    label: "Seller Support",
    icon: Store,
    description: "Listings, payouts, shop settings",
  },
  {
    value: "technical",
    label: "Technical Issue",
    icon: Wrench,
    description: "Bugs, errors or account access",
  },
  {
    value: "partnership",
    label: "Partnership",
    icon: Handshake,
    description: "Business collaborations & integrations",
  },
  {
    value: "press",
    label: "Press & Media",
    icon: Newspaper,
    description: "Media enquiries and press kits",
  },
];

const SLA_MAP: Record<Category, string> = {
  general: "2 business days",
  order_support: "24 hours",
  seller_support: "24 hours",
  technical: "1 business day",
  partnership: "3 business days",
  press: "3 business days",
};

const FAQS = [
  {
    q: "How do I track my order?",
    a: "Go to My Orders and click on any order to see real-time tracking. You can also visit /orders/:id/track for live updates.",
  },
  {
    q: "How long do refunds take?",
    a: "Refunds are processed within 3–5 business days after we confirm the return. MoMo refunds typically appear within 24 hours once processed.",
  },
  {
    q: "How do I become a seller on SOMA?",
    a: "Visit our Become a Seller page to submit your application. Our team reviews applications within 2 business days.",
  },
  {
    q: "Is my payment information secure?",
    a: "Yes. SOMA Market never stores your card details. All payments go through encrypted channels and are processed by certified payment providers.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Orders can be modified or cancelled within 1 hour of placement. After that, please contact our order support team immediately.",
  },
  {
    q: "What languages do you support?",
    a: "Our support team responds in English, Kinyarwanda, and French. Choose the language you're most comfortable with when writing to us.",
  },
];

// ── Validation ─────────────────────────────────────────────────────────────
function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2)
    errors.name = "Please enter your full name.";
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Please enter a valid email address.";
  if (!form.subject.trim() || form.subject.trim().length < 3)
    errors.subject = "Please enter a subject (at least 3 characters).";
  if (!form.category) errors.category = "Please select a category.";
  if (!form.message.trim() || form.message.trim().length < 20)
    errors.message = "Please describe your issue in at least 20 characters.";
  return errors;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ContactInfoCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl shadow-card group hover:shadow-card-hover transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0 group-hover:bg-forest/20 transition-colors">
        <Icon size={18} className="text-forest" />
      </div>
      <div>
        <p className="text-xs text-slate/50 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate">{value}</p>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-forest/10 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-forest hover:text-forest-light transition-colors"
      >
        <span>{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-saffron transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={id}
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-48 pb-4" : "max-h-0"}`}
      >
        <p className="text-sm text-slate/70 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function FieldWrapper({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate mb-1.5">
        {label}
        {required && <span className="text-vermillion ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-vermillion flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-forest/20 bg-ivory text-slate text-sm placeholder:text-slate/40 focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition";
const inputErrCls =
  "w-full px-4 py-3 rounded-xl border border-vermillion bg-vermillion-light text-slate text-sm placeholder:text-slate/40 focus:outline-none focus:ring-2 focus:ring-vermillion/30 focus:border-vermillion transition";

// ── Main page ──────────────────────────────────────────────────────────────
export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
    orderId: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const [submitContact, { isLoading, isSuccess, data: successData, error: submitError }] =
    useSubmitContactMutation();

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (touched[field]) {
        setErrors((err) => ({ ...err, ...validate({ ...form, [field]: e.target.value }) }));
      }
    };

  const blur = (field: keyof FormState) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((err) => ({ ...err, ...validate(form) }));
  };

  const handleCategorySelect = (cat: Category) => {
    const next = { ...form, category: cat };
    setForm(next);
    if (touched.category) setErrors((err) => ({ ...err, ...validate(next) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, category: true, message: true });
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    await submitContact({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      category: form.category as Category,
      message: form.message.trim(),
      ...(form.orderId.trim() ? { orderId: form.orderId.trim() } : {}),
    });
  };

  const serverErrorMsg =
    submitError &&
    ("data" in submitError
      ? ((submitError.data as { error?: string })?.error ?? "Something went wrong.")
      : "Network error. Please try again.");

  return (
    <div className="min-h-screen bg-ivory">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="bg-forest text-ivory">
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-saffron/20 text-saffron text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <HelpCircle size={13} />
              Support Centre
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-4 leading-tight">
              How can we <span className="text-saffron">help you</span>?
            </h1>
            <p className="text-ivory/60 text-base leading-relaxed">
              Our team is based in Kigali and ready to help. Fill in the form below — we read every
              message and respond promptly.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* ── Left sidebar ─────────────────────────────────────────── */}
          <aside className="lg:col-span-1 space-y-8">
            {/* Contact info */}
            <div>
              <h2 className="font-display text-lg font-bold text-forest mb-4">Get in touch</h2>
              <div className="space-y-3">
                <ContactInfoCard
                  icon={Mail}
                  label="Email"
                  value="support@soma.rw"
                  href="mailto:support@soma.rw"
                />
                <ContactInfoCard
                  icon={Phone}
                  label="Phone"
                  value="+250 792 696 038"
                  href="tel:+250792696038"
                />
                <ContactInfoCard icon={MapPin} label="Office" value="Kigali, Rwanda" />
                <ContactInfoCard
                  icon={Clock}
                  label="Support hours"
                  value="Mon–Fri, 8 am – 6 pm (Kigali)"
                />
              </div>
            </div>

            {/* Response times */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-forest text-sm mb-3 flex items-center gap-2">
                <Clock size={15} className="text-saffron" />
                Expected response times
              </h3>
              <ul className="space-y-2">
                {CATEGORIES.map((c) => (
                  <li key={c.value} className="flex items-center justify-between text-xs">
                    <span className="text-slate/70">{c.label}</span>
                    <span className="font-semibold text-forest bg-forest-50 px-2 py-0.5 rounded-full">
                      {SLA_MAP[c.value]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div className="bg-saffron/10 rounded-2xl p-5 border border-saffron/20">
              <h3 className="font-semibold text-forest text-sm mb-3">Quick actions</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/orders"
                    className="text-forest hover:text-saffron-dark transition font-medium flex items-center gap-1.5"
                  >
                    <ShoppingBag size={13} /> Track my orders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/seller/apply"
                    className="text-forest hover:text-saffron-dark transition font-medium flex items-center gap-1.5"
                  >
                    <Store size={13} /> Become a seller
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-forest hover:text-saffron-dark transition font-medium flex items-center gap-1.5"
                  >
                    <HelpCircle size={13} /> Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-forest hover:text-saffron-dark transition font-medium flex items-center gap-1.5"
                  >
                    <HelpCircle size={13} /> Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">
            {/* ── Contact form ─────────────────────────────────────── */}
            <section className="bg-white rounded-3xl shadow-card p-6 md:p-8">
              <h2 className="font-display text-2xl font-bold text-forest mb-1">
                Send us a message
              </h2>
              <p className="text-sm text-slate/50 mb-7">All fields marked with * are required.</p>

              {/* Success state */}
              {isSuccess && (
                <div className="flex flex-col items-center text-center py-10 animate-slide-up">
                  <div className="w-16 h-16 rounded-full bg-forest-50 flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-forest" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-forest mb-2">Message sent!</h3>
                  <p className="text-slate/60 text-sm max-w-sm mb-1">
                    {successData?.message ??
                      "We've received your message and will be in touch soon."}
                  </p>
                  <p className="text-xs text-slate/40 mb-6">
                    Check your inbox — we sent a confirmation to <strong>{form.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        name: "",
                        email: "",
                        subject: "",
                        category: "",
                        message: "",
                        orderId: "",
                      });
                      setErrors({});
                      setTouched({});
                    }}
                    className="text-sm font-semibold text-forest border border-forest/20 px-5 py-2 rounded-xl hover:bg-forest/5 transition"
                  >
                    Send another message
                  </button>
                </div>
              )}

              {!isSuccess && (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Name + Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldWrapper
                      label="Full name"
                      error={touched.name ? errors.name : undefined}
                      required
                    >
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder="Amina Uwimana"
                        value={form.name}
                        onChange={set("name")}
                        onBlur={blur("name")}
                        className={touched.name && errors.name ? inputErrCls : inputCls}
                      />
                    </FieldWrapper>
                    <FieldWrapper
                      label="Email address"
                      error={touched.email ? errors.email : undefined}
                      required
                    >
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="amina@example.com"
                        value={form.email}
                        onChange={set("email")}
                        onBlur={blur("email")}
                        className={touched.email && errors.email ? inputErrCls : inputCls}
                      />
                    </FieldWrapper>
                  </div>

                  {/* Category */}
                  <FieldWrapper
                    label="Category"
                    error={touched.category ? errors.category : undefined}
                    required
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const selected = form.category === cat.value;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => handleCategorySelect(cat.value)}
                            className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                              selected
                                ? "border-forest bg-forest text-ivory shadow-card"
                                : "border-forest/10 bg-ivory hover:border-forest/30 hover:bg-forest-50"
                            }`}
                          >
                            <Icon size={16} className={selected ? "text-saffron" : "text-forest"} />
                            <span
                              className={`text-xs font-semibold leading-tight ${
                                selected ? "text-ivory" : "text-forest"
                              }`}
                            >
                              {cat.label}
                            </span>
                            <span
                              className={`text-[10px] leading-tight ${
                                selected ? "text-ivory/60" : "text-slate/40"
                              }`}
                            >
                              {cat.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </FieldWrapper>

                  {/* Subject */}
                  <FieldWrapper
                    label="Subject"
                    error={touched.subject ? errors.subject : undefined}
                    required
                  >
                    <input
                      type="text"
                      placeholder="e.g. My order hasn't arrived after 5 days"
                      value={form.subject}
                      onChange={set("subject")}
                      onBlur={blur("subject")}
                      className={touched.subject && errors.subject ? inputErrCls : inputCls}
                    />
                  </FieldWrapper>

                  {/* Order ID — shown only for relevant categories */}
                  {(form.category === "order_support" || form.category === "seller_support") && (
                    <FieldWrapper label="Order ID (optional)">
                      <input
                        type="text"
                        placeholder="e.g. ORD-20240612-3F9A"
                        value={form.orderId}
                        onChange={set("orderId")}
                        className={inputCls}
                      />
                    </FieldWrapper>
                  )}

                  {/* Message */}
                  <FieldWrapper
                    label="Message"
                    error={touched.message ? errors.message : undefined}
                    required
                  >
                    <textarea
                      rows={6}
                      placeholder="Please describe your question or issue in as much detail as possible…"
                      value={form.message}
                      onChange={set("message")}
                      onBlur={blur("message")}
                      className={`resize-none ${touched.message && errors.message ? inputErrCls : inputCls}`}
                    />
                    <p className="mt-1 text-xs text-slate/40 text-right">
                      {form.message.length}/3000
                    </p>
                  </FieldWrapper>

                  {/* Server error */}
                  {serverErrorMsg && (
                    <div className="flex items-start gap-3 p-4 bg-vermillion-light border border-vermillion/20 rounded-xl text-sm text-vermillion animate-fade-in">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{serverErrorMsg}</span>
                    </div>
                  )}

                  {/* SLA hint */}
                  {form.category && (
                    <p className="text-xs text-slate/50 flex items-center gap-1.5 animate-fade-in">
                      <Clock size={12} />
                      We typically respond to{" "}
                      <strong className="text-forest">
                        {CATEGORIES.find((c) => c.value === form.category)?.label}
                      </strong>{" "}
                      enquiries within{" "}
                      <strong className="text-forest">{SLA_MAP[form.category as Category]}</strong>.
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-forest text-ivory font-semibold py-3.5 px-6 rounded-xl hover:bg-forest-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-card hover:shadow-card-hover"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-ivory/30 border-t-ivory rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send message
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate/40">
                    By submitting this form you agree to our{" "}
                    <Link to="/privacy" className="underline hover:text-forest transition">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              )}
            </section>

            {/* ── FAQ ──────────────────────────────────────────────── */}
            <section className="bg-white rounded-3xl shadow-card p-6 md:p-8">
              <h2 className="font-display text-2xl font-bold text-forest mb-1">
                Frequently asked questions
              </h2>
              <p className="text-sm text-slate/50 mb-6">
                Quick answers to the most common questions.
              </p>
              <div className="divide-y divide-forest/10">
                {FAQS.map((faq) => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
              <p className="mt-6 text-sm text-slate/50 text-center">
                Still need help?{" "}
                <a
                  href="mailto:support@soma.rw"
                  className="text-forest font-semibold hover:underline"
                >
                  Email us directly
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
