import { Routes, Route, Navigate } from 'react-router-dom';

import AppBootstrap        from '@/app/AppBootstrap';
import LoginPage           from '@/features/auth/LoginPage';
import RegisterPage        from '@/features/auth/RegisterPage';
import ForgotPasswordPage  from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage   from '@/features/auth/ResetPasswordPage';
import VerifyEmailPage     from '@/features/auth/VerifyEmailPage';
import AuthCallbackPage    from '@/features/auth/AuthCallbackPage';

import ProtectedRoute   from '@/components/layouts/ProtectedRoute';
import AdminRoute       from '@/components/layouts/AdminRoute';
import DashboardLayout  from '@/components/layouts/DashboardLayout';
import AdminLayout      from '@/components/layouts/AdminLayout';

import DashboardHomePage from '@/features/dashboard/DashboardHomePage';

import WalletOverviewPage     from '@/features/wallet/WalletOverviewPage';
import WalletFundingPage      from '@/features/wallet/WalletFundingPage';
import WalletCallbackPage     from '@/features/wallet/WalletCallbackPage';
import WalletTransactionsPage from '@/features/wallet/WalletTransactionsPage';

import AirtimePurchasePage from '@/features/airtime/AirtimePurchasePage';
import DataPurchasePage    from '@/features/data/DataPurchasePage';
import BillsPage           from '@/features/bills/BillsPage';
import OrdersPage          from '@/features/orders/OrdersPage';

import SmsDashboardPage   from '@/features/sms/SmsDashboardPage';
import SmsBuyCreditsPage  from '@/features/sms/SmsBuyCreditsPage';
import CampaignsListPage  from '@/features/sms/CampaignsListPage';
import NewCampaignPage    from '@/features/sms/NewCampaignPage';
import CampaignDetailPage from '@/features/sms/CampaignDetailPage';
import SenderIdsPage      from '@/features/sms/SenderIdsPage';
import PhonebooksPage      from '@/features/sms/PhonebooksPage';
import PhonebookDetailPage from '@/features/sms/PhonebookDetailPage';

import EsimCountriesPage   from '@/features/esim/EsimCountriesPage';
import EsimPackagesPage    from '@/features/esim/EsimPackagesPage';
import EsimOrdersPage      from '@/features/esim/EsimOrdersPage';
import EsimOrderDetailPage from '@/features/esim/EsimOrderDetailPage';

import DeveloperOverviewPage from '@/features/developer/DeveloperOverviewPage';
import ApiKeysPage           from '@/features/developer/ApiKeysPage';
import ApiKeyUsagePage       from '@/features/developer/ApiKeyUsagePage';
import ApiDocsPage           from '@/features/developer/ApiDocsPage';

import ProfilePage from '@/features/profile/ProfilePage';
import LandingPage from '@/features/landing/LandingPage';

import AdminDashboardPage    from '@/features/admin/AdminDashboardPage';
import AdminUsersPage        from '@/features/admin/AdminUsersPage';
import AdminUserDetailPage   from '@/features/admin/AdminUserDetailPage';
import AdminPricingPage      from '@/features/admin/AdminPricingPage';
import AdminProvidersPage    from '@/features/admin/AdminProvidersPage';
import AdminSenderIdsPage    from '@/features/admin/AdminSenderIdsPage';
import AdminEsimDisputesPage from '@/features/admin/AdminEsimDisputesPage';
import AdminRoleUpgradesPage from '@/features/admin/AdminRoleUpgradesPage';
import AdminSupportPage      from '@/features/admin/AdminSupportPage';
import AdminAuditLogsPage    from '@/features/admin/AdminAuditLogsPage';
import AdminBlogPage         from '@/features/admin/AdminBlogPage';
import AdminBlogEditorPage   from '@/features/admin/AdminBlogEditorPage';

import BlogListPage from '@/features/blog/BlogListPage';
import BlogPostPage from '@/features/blog/BlogPostPage';
import ComingSoonPage from '@/components/common/ComingSoonPage';

export default function App() {
  return (
    <AppBootstrap>
    <Routes>
      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/callback"     element={<AuthCallbackPage />} />

	  <Route path="/blog"              element={<BlogListPage />} />
      <Route path="/blog/:slug"        element={<BlogPostPage />} />
      {/* ── Customer dashboard ───────────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomePage />} />

        <Route path="wallet"              element={<WalletOverviewPage />} />
        <Route path="wallet/fund"         element={<WalletFundingPage />} />
        <Route path="wallet/callback"     element={<WalletCallbackPage />} />
        <Route path="wallet/transactions" element={<WalletTransactionsPage />} />

        <Route path="airtime" element={<AirtimePurchasePage />} />
        <Route path="data"    element={<DataPurchasePage />} />
        <Route path="bills"   element={<BillsPage />} />
        <Route path="orders"  element={<OrdersPage />} />

        <Route path="sms"               element={<SmsDashboardPage />} />
        <Route path="sms/buy-credits"   element={<SmsBuyCreditsPage />} />
        <Route path="sms/campaigns"     element={<CampaignsListPage />} />
        <Route path="sms/campaigns/new" element={<NewCampaignPage />} />
        <Route path="sms/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="sms/sender-ids"    element={<SenderIdsPage />} />
		<Route path="sms/phonebooks"           element={<PhonebooksPage />} />
        <Route path="sms/phonebooks/:id"       element={<PhonebookDetailPage />} />

        <Route path="esim"                       element={<EsimCountriesPage />} />
        <Route path="esim/packages/:countryCode" element={<EsimPackagesPage />} />
        <Route path="esim/orders"                element={<EsimOrdersPage />} />
        <Route path="esim/orders/:id"            element={<EsimOrderDetailPage />} />

        <Route path="api"                element={<DeveloperOverviewPage />} />
        <Route path="api/keys"           element={<ApiKeysPage />} />
        <Route path="api/keys/:id/usage" element={<ApiKeyUsagePage />} />
        <Route path="api/docs"           element={<ApiDocsPage />} />

        <Route path="referrals"     element={<ComingSoonPage title="Referrals" />} />
        <Route path="notifications" element={<ComingSoonPage title="Notifications" />} />
        <Route path="profile"       element={<ProfilePage />} />
      </Route>

      {/* ── Admin dashboard ──────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />

        <Route path="users"    element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />

        <Route path="pricing"       element={<AdminPricingPage />} />
        <Route path="providers"     element={<AdminProvidersPage />} />
        <Route path="sender-ids"    element={<AdminSenderIdsPage />} />
        <Route path="esim-disputes" element={<AdminEsimDisputesPage />} />
        <Route path="role-upgrades" element={<AdminRoleUpgradesPage />} />
        <Route path="support"       element={<AdminSupportPage />} />
        <Route path="audit-logs"    element={<AdminAuditLogsPage />} />\
		<Route path="blog"          element={<AdminBlogPage />} />
        <Route path="blog/new"      element={<AdminBlogEditorPage />} />
        <Route path="blog/:id/edit" element={<AdminBlogEditorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
   </AppBootstrap>
  );
}
