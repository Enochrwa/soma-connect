import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { OfflineBanner } from "./OfflineBanner";
export default function Layout({ children }) {
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx(OfflineBanner, {}), _jsx(Navbar, {}), _jsx("main", { className: "flex-1 pb-20 md:pb-0", children: children }), _jsx(Footer, {}), _jsx(MobileBottomNav, {})] }));
}
