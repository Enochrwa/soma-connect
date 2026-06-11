import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { OfflineBanner } from "./components/layout/OfflineBanner";
import { Navbar } from "./components/layout/Navbar";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import { PageSkeleton } from "./components/ui/PageSkeleton";
// ── Lazy pages ─────────────────────────────────────────────────────────────
const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const SellerPage = lazy(() => import("./pages/SellerPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const LoyaltyPage = lazy(() => import("./pages/LoyaltyPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
// ── Auth guard ─────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
    const token = useSelector((s) => s.auth.accessToken);
    return token ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
function RequireRole({ role, children }) {
    const user = useSelector((s) => s.auth.user);
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (user.role !== role)
        return _jsx(Navigate, { to: "/", replace: true });
    return _jsx(_Fragment, { children: children });
}
export default function App() {
    return (_jsxs(_Fragment, { children: [_jsx(OfflineBanner, {}), _jsx(Navbar, {}), _jsx("main", { className: "flex-1", children: _jsx(Suspense, { fallback: _jsx(PageSkeleton, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/search", element: _jsx(SearchPage, {}) }), _jsx(Route, { path: "/products/:id", element: _jsx(ProductPage, {}) }), _jsx(Route, { path: "/sellers/:slug", element: _jsx(SellerPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/cart", element: _jsx(CartPage, {}) }), _jsx(Route, { path: "/checkout", element: _jsx(RequireAuth, { children: _jsx(CheckoutPage, {}) }) }), _jsx(Route, { path: "/orders", element: _jsx(RequireAuth, { children: _jsx(OrdersPage, {}) }) }), _jsx(Route, { path: "/orders/:id", element: _jsx(RequireAuth, { children: _jsx(OrderPage, {}) }) }), _jsx(Route, { path: "/wishlist", element: _jsx(RequireAuth, { children: _jsx(WishlistPage, {}) }) }), _jsx(Route, { path: "/account", element: _jsx(RequireAuth, { children: _jsx(AccountPage, {}) }) }), _jsx(Route, { path: "/rewards", element: _jsx(RequireAuth, { children: _jsx(LoyaltyPage, {}) }) }), _jsx(Route, { path: "/seller/*", element: _jsx(RequireAuth, { children: _jsx(SellerDashboard, {}) }) }), _jsx(Route, { path: "/admin/*", element: _jsx(RequireRole, { role: "admin", children: _jsx(AdminLayout, {}) }) }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) }) }), _jsx(MobileBottomNav, {})] }));
}
