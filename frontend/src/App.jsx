import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import ProtectedRoute from "@/components/layouts/ProtectedRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardHomePage from "@/features/dashboard/DashboardHomePage";
import WalletOverviewPage from "@/features/wallet/WalletOverviewPage";
import WalletFundingPage from "@/features/wallet/WalletFundingPage";
import WalletCallbackPage from "@/features/wallet/WalletCallbackPage";
import WalletTransactionsPage from "@/features/wallet/WalletTransactionsPage";
import AirtimePurchasePage from "@/features/airtime/AirtimePurchasePage";
import DataPurchasePage from "@/features/data/DataPurchasePage";
import BillsPage from "@/features/bills/BillsPage";
import OrdersPage from "@/features/orders/OrdersPage";
import ComingSoonPage from "@/components/common/ComingSoonPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomePage />} />

        <Route path="wallet" element={<WalletOverviewPage />} />
        <Route path="wallet/fund" element={<WalletFundingPage />} />
        <Route path="wallet/callback" element={<WalletCallbackPage />} />
        <Route path="wallet/transactions" element={<WalletTransactionsPage />} />

        <Route path="airtime" element={<AirtimePurchasePage />} />
        <Route path="data" element={<DataPurchasePage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="orders" element={<OrdersPage />} />

        <Route path="sms" element={<ComingSoonPage title="SMS" />} />
        <Route path="sms/campaigns" element={<ComingSoonPage title="SMS Campaigns" />} />
        <Route path="sms/sender-ids" element={<ComingSoonPage title="Sender IDs" />} />
        <Route path="esim" element={<ComingSoonPage title="eSIM Marketplace" />} />
        <Route path="esim/orders" element={<ComingSoonPage title="eSIM Orders" />} />
        <Route path="api" element={<ComingSoonPage title="Developer API" />} />
        <Route path="api/keys" element={<ComingSoonPage title="API Keys" />} />
        <Route path="api/docs" element={<ComingSoonPage title="API Docs" />} />
        <Route path="referrals" element={<ComingSoonPage title="Referrals" />} />
        <Route path="notifications" element={<ComingSoonPage title="Notifications" />} />
        <Route path="profile" element={<ComingSoonPage title="Profile" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
