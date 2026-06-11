import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../utils/cn";
export function Skeleton({ className }) {
    return _jsx("div", { className: cn("skeleton rounded-md", className) });
}
