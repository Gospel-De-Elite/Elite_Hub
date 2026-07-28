import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import apiClient from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getStatusVariant } from '@/lib/statusVariant';
import { ArrowLeft } from 'lucide-react';

const STATUS_OPTS = ['ACTIVE', 'SUSPENDED', 'BANNED'];
const ALL_ROLES   = ['CUSTOMER', 'RESELLER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'];
const fmt = (v) => `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id }        = useParams();
  const queryClient   = useQueryClient();
  const profile       = useSelector((s) => s.user.profile);
  const isSuperAdmin  = profile?.role === 'SUPER_ADMIN';

  // Status form state
  const [newStatus, setNewStatus]         = useState('');
  const [statusReason, setStatusReason]   = useState('');
  const [statusMsg, setStatusMsg]         = useState({ type: '', text: '' });
  const [savingStatus, setSavingStatus]   = useState(false);

  // Wallet adjustment form state (SUPER_ADMIN only)
  const [adjAmount, setAdjAmount]       = useState('');
  const [adjDir, setAdjDir]             = useState('CREDIT');
  const [adjReason, setAdjReason]       = useState('');
  const [adjMsg, setAdjMsg]             = useState({ type: '', text: '' });
  const [savingAdj, setSavingAdj]       = useState(false);

  // Role assignment form state
  const [newRole, setNewRole]           = useState('');
  const [roleMsg, setRoleMsg]           = useState({ type: '', text: '' });
  const [savingRole, setSavingRole]     = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/users/${id}`);
      return data.data;
    },
  });

  async function handleStatusSave(e) {
    e.preventDefault();
    if (!newStatus) { setStatusMsg({ type: 'error', text: 'Select a status.' }); return; }
    setSavingStatus(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/users/${id}/status`, {
        status: newStatus,
        reason: statusReason,
      });
      setStatusMsg({ type: 'ok', text: `Status updated to ${newStatus}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setStatusReason('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAdjSave(e) {
    e.preventDefault();
    if (!adjAmount || !adjReason.trim()) {
      setAdjMsg({ type: 'error', text: 'Amount and reason are required.' });
      return;
    }
    setSavingAdj(true);
    setAdjMsg({ type: '', text: '' });
    try {
      await apiClient.post(`/admin/users/${id}/wallet-adjustment`, {
        amount:    Number(adjAmount),
        direction: adjDir,
        reason:    adjReason,
      });
      setAdjMsg({ type: 'ok', text: `Wallet ${adjDir.toLowerCase()}ed ${fmt(adjAmount)}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      setAdjAmount('');
      setAdjReason('');
    } catch (err) {
      setAdjMsg({ type: 'error', text: err.response?.data?.message || 'Adjustment failed.' });
    } finally {
      setSavingAdj(false);
    }
  }

  async function handleRoleAssign(e) {
    e.preventDefault();
    if (!newRole) { setRoleMsg({ type: 'error', text: 'Select a role.' }); return; }
    setSavingRole(true);
    setRoleMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/users/${id}/role`, { role: newRole });
      setRoleMsg({ type: 'ok', text: `Role updated to ${newRole.replace('_', ' ')}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewRole('');
    } catch (err) {
      setRoleMsg({ type: 'error', text: err.response?.data?.message || 'Role update failed.' });
    } finally {
      setSavingRole(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) return <p className="text-muted-foreground">User not found.</p>;

  // Which roles can the current actor assign to this specific user?
  const targetRole = user.role; // string e.g. 'ADMIN'
  const adminProtected = ['ADMIN', 'SUPER_ADMIN'];
  // ADMIN cannot touch ADMIN/SUPER_ADMIN users at all
  const canAssignRoles = isSuperAdmin || !adminProtected.includes(targetRole);
  // Roles visible in the selector depend on actor level
  const assignableRoles = ALL_ROLES.filter((r) => {
    if (r === targetRole) return false;          // skip current role (no-op)
    if (isSuperAdmin)    return true;            // SUPER_ADMIN sees all
    return !adminProtected.includes(r);          // ADMIN sees only sub-admin roles
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-foreground">
          {user.firstName} {user.lastName}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left col — account info + recent orders */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
            <CardContent>
              <Row label="Email"              value={user.email} />
              <Row label="Phone"              value={user.phone} />
              <Row label="Referral Code"      value={user.referralCode} />
              <Row label="Was Referred"       value={user.wasReferred ? 'Yes' : 'No'} />
              <Row label="Successful Referrals" value={user.successfulReferralsMade} />
              <div className="flex items-center justify-between border-b border-border py-2">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="default">{user.role.replace('_', ' ')}</Badge>
              </div>
              <div className="flex items-center justify-between border-b border-border py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
              </div>
              <Row label="Joined" value={new Date(user.createdAt).toLocaleString()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {user.recentOrders?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.orderType}</TableCell>
                        <TableCell>{fmt(o.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(o.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-6 py-8 text-sm text-muted-foreground">No orders yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right col — wallet, status change, financial override */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Wallet</CardTitle></CardHeader>
            <CardContent>
              <Row label="Balance"   value={fmt(user.walletBalance)} />
              <Row label="Locked"    value={fmt(user.lockedBalance)} />
              <Row
                label="Spendable"
                value={fmt(Number(user.walletBalance) - Number(user.lockedBalance))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Status</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleStatusSave} className="space-y-3">
                {statusMsg.text && (
                  <Alert variant={statusMsg.type === 'error' ? 'destructive' : 'default'}>
                    {statusMsg.text}
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label>New Status</Label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select…</option>
                    {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status-reason">Reason (optional)</Label>
                  <Input
                    id="status-reason"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={savingStatus}>
                  {savingStatus && <Spinner className="mr-2 h-4 w-4" />}
                  Update Status
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Assign Role card — hidden for ADMIN when target is ADMIN/SUPER_ADMIN */}
          {canAssignRoles && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Assign Role
                  {isSuperAdmin && (
                    <span className="ml-1.5 text-xs font-normal text-primary">SUPER_ADMIN</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRoleAssign} className="space-y-3">
                  {roleMsg.text && (
                    <Alert variant={roleMsg.type === 'error' ? 'destructive' : 'default'}>
                      {roleMsg.text}
                    </Alert>
                  )}
                  <div className="space-y-1.5">
                    <Label>Current Role</Label>
                    <p className="text-sm font-medium text-foreground">
                      {targetRole.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-role">New Role</Label>
                    <select
                      id="new-role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select role…</option>
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="secondary" className="w-full" disabled={savingRole || !newRole}>
                    {savingRole && <Spinner className="mr-2 h-4 w-4" />}
                    Assign Role
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Financial Override{' '}
                  <span className="ml-1.5 text-xs font-normal text-primary">SUPER_ADMIN</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdjSave} className="space-y-3">
                  {adjMsg.text && (
                    <Alert variant={adjMsg.type === 'error' ? 'destructive' : 'default'}>
                      {adjMsg.text}
                    </Alert>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Direction</Label>
                      <select
                        value={adjDir}
                        onChange={(e) => setAdjDir(e.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="adj-amount">Amount (₦)</Label>
                      <Input
                        id="adj-amount"
                        type="number"
                        min="1"
                        value={adjAmount}
                        onChange={(e) => setAdjAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adj-reason">Reason (required)</Label>
                    <Input
                      id="adj-reason"
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="w-full" disabled={savingAdj}>
                    {savingAdj && <Spinner className="mr-2 h-4 w-4" />}
                    Apply Adjustment
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
