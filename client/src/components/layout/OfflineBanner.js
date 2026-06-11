import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useOffline } from "../../hooks/useOffline";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
export function OfflineBanner() {
    const isOffline = useOffline();
    const { t } = useTranslation();
    return (_jsx(AnimatePresence, { children: isOffline && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "bg-slate-800 text-white text-sm overflow-hidden", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-2 flex items-center gap-2", children: [_jsx(WifiOff, { size: 14 }), _jsx("span", { children: t("common.offline") })] }) })) }));
}
