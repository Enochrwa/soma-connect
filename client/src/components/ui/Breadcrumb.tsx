import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      className={`flex items-center gap-1.5 text-sm text-slate/50 flex-wrap ${className}`}
    >
      <Link to="/" className="hover:text-forest transition flex items-center gap-1">
        <Home size={13} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={13} className="text-slate/30 shrink-0" />
          {item.to ? (
            <Link to={item.to} className="hover:text-forest transition truncate max-w-[180px]">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate font-medium truncate max-w-[180px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
