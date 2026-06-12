import { lazy, Suspense, Component, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./app/store";
import { OfflineBanner } from "./components/layout/OfflineBanner";
import { Navbar } from "./components/layout/Navbar";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import { Footer } from "./components/layout/Footer";
import { PageSkeleton } from "./components/ui/PageSkeleton";

// ── Error boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-display text-2xl text-forest mb-2">Something went wrong</h2>
          <p className="text-slate/60 text-sm mb-6 max-w-xs">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2.5 rounded-xl font-semibold"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const GoogleCallbackPage = lazy(() => import("./pages/auth/GoogleCallbackPage"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerApplyPage = lazy(() => import("./pages/seller/SellerApplyPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));

// ── Auth guard ─────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const location = useLocation();
  return token ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}

function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const user = useSelector((s: RootState) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/products/:id" element={<ProductPage />} />
              <Route path="/sellers/:slug" element={<SellerPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />

              {/* Seller apply — public so buyers can apply */}
              <Route
                path="/seller/apply"
                element={
                  <RequireAuth>
                    <SellerApplyPage />
                  </RequireAuth>
                }
              />

              {/* Auth required */}
              <Route
                path="/checkout"
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders"
                element={
                  <RequireAuth>
                    <OrdersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders/:id/track"
                element={
                  <RequireAuth>
                    <OrderTrackingPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <RequireAuth>
                    <OrderPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <RequireAuth>
                    <WishlistPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/account"
                element={
                  <RequireAuth>
                    <AccountPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/rewards"
                element={
                  <RequireAuth>
                    <LoyaltyPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/seller/*"
                element={
                  <RequireAuth>
                    <SellerDashboard />
                  </RequireAuth>
                }
              />

              {/* Admin only */}
              <Route
                path="/admin/*"
                element={
                  <RequireRole role="admin">
                    <AdminLayout />
                  </RequireRole>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
