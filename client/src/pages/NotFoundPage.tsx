import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-5xl text-forest">404</h1>
      <p className="text-slate/60 mt-2">We couldn't find that page.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">Back home</Link>
    </div>
  );
}