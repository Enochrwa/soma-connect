import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
  {
    eyebrow: "Flash sale",
    title: "Up to 35% off electronics",
    sub: "Limited stock from Kigali Tech Hub. Ends in hours.",
    cta: "Shop flash deals",
    to: "/catalog?flash=1",
    bg: "from-forest to-forest-600",
  },
  {
    eyebrow: "Featured seller",
    title: "Musanze Coffee Co.",
    sub: "Single-origin Bourbon, straight from the hills.",
    cta: "Visit store",
    to: "/catalog?category=Food",
    bg: "from-[#2c3e2c] to-[#0a2e1f]",
  },
  {
    eyebrow: "New arrivals",
    title: "Imigongo by Imigongo Fashion",
    sub: "Hand-tailored kitenge dresses in Nyamirambo.",
    cta: "Shop fashion",
    to: "/catalog?category=Fashion",
    bg: "from-[#3a2515] to-[#0a2e1f]",
  },
];

export default function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[i];
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-6">
      <div
        className={`rounded-3xl overflow-hidden bg-gradient-to-br ${s.bg} text-ivory shadow-soft`}
      >
        <div className="px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <span className="pill bg-saffron text-slate">{s.eyebrow}</span>
              <h1 className="font-display text-4xl md:text-5xl font-semibold mt-3 leading-tight">
                {s.title}
              </h1>
              <p className="mt-3 text-ivory/80 max-w-md">{s.sub}</p>
              <Link to={s.to} className="btn-primary mt-6">
                {s.cta}
              </Link>
            </motion.div>
          </AnimatePresence>
          <div className="hidden md:flex items-center justify-end">
            <div className="w-72 h-72 rounded-3xl bg-white/10 grid place-items-center font-display text-7xl text-saffron">
              SOMA
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-10 bg-saffron" : "w-4 bg-white/30"}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
