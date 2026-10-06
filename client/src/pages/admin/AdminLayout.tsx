import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Activity,
  AlertOctagon,
  BarChart3,
  Bot,
  ClipboardList,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  Settings,
  ShieldAlert,
  Store,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAdminOverviewQuery } from "../../app/api";
import {
  AutomationsTab,
  CouponsTab,
  DisputesTab,
  FraudSignalsTab,
  ModerationQueueTab,
  PayoutsTab,
} from "../AdminDashboardPage";
import ActivityPage from "./ActivityPage";
import EarningsPage from "./EarningsPage";
import OrdersCenter from "./OrdersCenter";
import OverviewPage from "./OverviewPage";
import ProductsPage from "./ProductsPage";
import ReferralsPage from "./ReferralsPage";
import SellersPage from "./SellersPage";
import SettingsPage from "./SettingsPage";
import UsersPage from "./UsersPage";
import { PageHeader, ToastProvider } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Key in the overview "attention" counts that should show as a red badge. */
  badge?: string[];
  end?: boolean;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Operations",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      {
        to: "/admin/orders",
        label: "Orders & payments",
        icon: ClipboardList,
        badge: ["verify", "ready", "refunds"],
      },
      { to: "/admin/payouts", label: "Seller payouts", icon: Wallet, badge: ["pendingPayouts"] },
      { to: "/admin/disputes", label: "Disputes", icon: AlertOctagon, badge: ["openDisputes"] },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { to: "/admin/sellers", label: "Sellers", icon: Store, badge: ["pendingSellers"] },
      { to: "/admin/products", label: "Products", icon: Package, badge: ["lowStock"] },
      { to: "/admin/coupons", label: "Coupons", icon: Tag },
      { to: "/admin/users", label: "Users", icon: Users },
    ],
  },
  {
    group: "Money & growth",
    items: [
      {
        to: "/admin/earnings",
        label: "Earnings & commission",
        icon: BarChart3,
        badge: ["clawbacks"],
      },
      { to: "/admin/referrals", label: "Referrals", icon: Gift },
    ],
  },
  {
    group: "Trust & safety",
    items: [
      { to: "/admin/moderation", label: "Review moderation", icon: MessageSquareWarning },
      { to: "/admin/fraud", label: "Fraud signals", icon: ShieldAlert },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/admin/automations", label: "Automations", icon: Bot },
      { to: "/admin/activity", label: "Activity log", icon: Activity },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavLinkItem({ item, counts }: { item: NavItem; counts: Record<string, number> }) {
  const n = (item.badge ?? []).reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition ${
          isActive ? "bg-forest text-saffron font-semibold" : "text-slate/70 hover:bg-forest/5"
        }`
      }
    >
      <item.icon size={16} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {n > 0 && (
        <span className="text-[11px] font-bold bg-vermillion text-white rounded-full px-1.5 min-w-[1.25rem] text-center">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </NavLink>
  );
}

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <>
    <PageHeader title={title} subtitle={subtitle} />
    {children}
  </>
);

export default function AdminLayout() {
  const { data } = useAdminOverviewQuery(undefined, { pollingInterval: 60_000 });
  const counts = data?.attention ?? {};

  return (
    <ToastProvider>
      <Helmet>
        <title>Admin — OneAfricaShop</title>
      </Helmet>
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:flex lg:gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-20 space-y-5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <div className="flex items-center gap-2 px-1">
              <CreditCard size={18} className="text-saffron" />
              <span className="font-display text-lg text-forest">Admin console</span>
            </div>
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate/40">
                  {g.group}
                </p>
                <div className="space-y-0.5">
                  {g.items.map((it) => (
                    <NavLinkItem key={it.to} item={it} counts={counts} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Navigation (mobile / tablet) */}
        <nav className="lg:hidden flex gap-1 overflow-x-auto pb-3 mb-4 border-b border-forest/10 -mx-4 px-4">
          {NAV.flatMap((g) => g.items).map((it) => (
            <NavLinkItem key={it.to} item={it} counts={counts} />
          ))}
        </nav>

        <main className="flex-1 min-w-0">
          <Routes>
            <Route index element={<OverviewPage />} />
            <Route path="orders" element={<OrdersCenter />} />
            {/* Old link: payments to verify now live in the orders queue */}
            <Route path="payments" element={<Navigate to="/admin/orders?queue=verify" replace />} />
            <Route
              path="payouts"
              element={
                <Section
                  title="Seller payouts"
                  subtitle="Pay sellers their earnings (after commission) and keep the record straight."
                >
                  <PayoutsTab />
                </Section>
              }
            />
            <Route
              path="disputes"
              element={
                <Section
                  title="Disputes"
                  subtitle="Buyer complaints. A refund decision reverses the seller's earnings and the buyer's points."
                >
                  <DisputesTab />
                </Section>
              }
            />
            <Route path="sellers" element={<SellersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route
              path="coupons"
              element={
                <Section title="Coupons">
                  <CouponsTab />
                </Section>
              }
            />
            <Route path="users" element={<UsersPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="referrals" element={<ReferralsPage />} />
            <Route
              path="moderation"
              element={
                <Section title="Review moderation">
                  <ModerationQueueTab />
                </Section>
              }
            />
            <Route
              path="fraud"
              element={
                <Section title="Fraud signals">
                  <FraudSignalsTab />
                </Section>
              }
            />
            <Route
              path="automations"
              element={
                <Section title="Automations" subtitle="Scheduled jobs — run any of them manually.">
                  <AutomationsTab />
                </Section>
              }
            />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
