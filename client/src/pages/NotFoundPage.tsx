import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <div>
        <div className="font-display text-[120px] font-bold text-forest/10 leading-none">404</div>
        <h2 className="font-display text-2xl font-bold text-forest -mt-4">Page not found</h2>
        <p className="text-slate/50 mt-2 mb-8">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
