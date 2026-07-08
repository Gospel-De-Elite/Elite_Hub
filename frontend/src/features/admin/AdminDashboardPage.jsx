import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Users, Wallet, TrendingUp, AlertCircle, Users2, MessageSquare } from 'lucide-react';

const fmt = (v) =>
  `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/analytics/overview');
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const totalUsers = data
    ? Object.values(data.usersByRole).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Overview</h1>
        <p className="text-muted-foreground">Platform-wide snapshot.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers.toLocaleString()}
          sub={`${data?.usersByRole?.CUSTOMER ?? 0} customers · ${data?.usersByRole?.RESELLER ?? 0} resellers · ${data?.usersByRole?.AGENT ?? 0} agents`}
        />
        <StatCard
          icon={Wallet}
          label="Total Wallet Balance"
          value={fmt(data?.wallets?.totalBalance)}
          sub={`${fmt(data?.wallets?.totalLocked)} locked`}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Profit (all-time)"
          value={fmt(data?.revenue?.totalProfit)}
          sub={`${fmt(data?.revenue?.totalTransacted)} transacted`}
        />
        <StatCard
          icon={AlertCircle}
          label="Orders Today"
          value={data?.orders?.today ?? 0}
          sub={`${data?.orders?.last7Days ?? 0} this week · ${data?.orders?.failedLast7Days ?? 0} failed`}
        />
        <StatCard
          icon={Users2}
          label="Referrals Rewarded"
          value={data?.referrals?.totalRewarded ?? 0}
          sub={`${fmt(data?.referrals?.totalPaidOut)} paid out`}
        />
        <StatCard
          icon={MessageSquare}
          label="SMS Sent"
          value={(data?.sms?.totalMessagesSent ?? 0).toLocaleString()}
          sub={`${data?.sms?.totalCampaigns ?? 0} campaigns`}
        />
      </div>

      {data?.usersByRole && (
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {Object.entries(data.usersByRole).map(([role, count]) => (
              <div key={role} className="flex justify-between py-2">
                <span className="text-sm text-foreground">{role.replace('_', ' ')}</span>
                <span className="text-sm font-medium text-muted-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
