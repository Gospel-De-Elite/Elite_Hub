import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getStatusVariant } from '@/lib/statusVariant';

const STATUS_FILTER = ['', 'PENDING', 'ADMIN_APPROVED', 'SUBMITTED_TO_CARRIER', 'ACTIVE', 'REJECTED'];

export default function AdminSenderIdsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter]       = useState('PENDING');
  const [actionId, setActionId]   = useState(null);
  const [msg, setMsg]             = useState({ type: '', text: '' });

  // Carrier decision modal state
  const [carrierModal, setCarrierModal] = useState(null); // { id, requestedSenderId }
  const [carrierStatus, setCarrierStatus] = useState('ACTIVE');
  const [carrierReason, setCarrierReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-sender-ids', filter],
    queryFn: async () => {
      const params = filter ? { status: filter } : {};
      const { data } = await apiClient.get('/admin/sender-id-requests', { params });
      return data.data;
    },
  });

  async function review(id, action) {
    setActionId(id);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/sender-id-requests/${id}/review`, { action });
      setMsg({ type: 'ok', text: `Request ${action.toLowerCase()}d.` });
      queryClient.invalidateQueries({ queryKey: ['admin-sender-ids'] });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setActionId(null);
    }
  }

  async function submitCarrierDecision() {
    if (!carrierModal) return;
    setActionId(carrierModal.id);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/sender-id-requests/${carrierModal.id}/carrier-status`, {
        status: carrierStatus,
        ...(carrierStatus === 'REJECTED' && carrierReason
          ? { carrierRejectionReason: carrierReason }
          : {}),
      });
      setMsg({ type: 'ok', text: `Carrier decision recorded: ${carrierStatus}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-sender-ids'] });
      setCarrierModal(null);
      setCarrierReason('');
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to record decision.' });
    } finally {
      setActionId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Sender ID Requests</h1>
        <p className="text-muted-foreground">
          Two-layer approval: admin review → carrier submission → carrier decision.
        </p>
      </div>

      {msg.text && (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>{msg.text}</Alert>
      )}

      {/* Carrier decision modal */}
      {carrierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Record Carrier Decision
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sender ID: <span className="font-medium text-foreground">{carrierModal.requestedSenderId}</span>
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                {['ACTIVE', 'REJECTED'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCarrierStatus(s)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      carrierStatus === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {carrierStatus === 'REJECTED' && (
                <Input
                  placeholder="Carrier rejection reason (optional)"
                  value={carrierReason}
                  onChange={(e) => setCarrierReason(e.target.value)}
                />
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  disabled={actionId === carrierModal.id}
                  onClick={submitCarrierDecision}
                >
                  {actionId === carrierModal.id
                    ? <Spinner className="h-4 w-4" />
                    : 'Confirm'}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setCarrierModal(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_FILTER.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {requests?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.requestedSenderId}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.user?.email ?? r.userId}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(r.status)}>
                        {r.status.replaceAll('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {r.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              disabled={actionId === r.id}
                              onClick={() => review(r.id, 'APPROVE')}
                            >
                              {actionId === r.id ? <Spinner className="h-3.5 w-3.5" /> : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionId === r.id}
                              onClick={() => review(r.id, 'REJECT')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === 'SUBMITTED_TO_CARRIER' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setCarrierModal({
                                id: r.id,
                                requestedSenderId: r.requestedSenderId,
                              })
                            }
                          >
                            Record Decision
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-16 text-center text-muted-foreground">No requests found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
