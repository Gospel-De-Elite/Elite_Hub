import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getStatusVariant } from '@/lib/statusVariant';

const STATUS_FILTER = ['', 'PENDING', 'APPROVED', 'REJECTED'];

export default function AdminRoleUpgradesPage() {
  const queryClient               = useQueryClient();
  const [filter, setFilter]       = useState('PENDING');
  const [actionId, setActionId]   = useState(null);
  const [msg, setMsg]             = useState({ type: '', text: '' });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-role-upgrades', filter],
    queryFn: async () => {
      const params = filter ? { status: filter } : {};
      const { data } = await apiClient.get('/admin/role-upgrades', { params });
      return data.data;
    },
  });

  async function decide(id, action) {
    setActionId(id);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/role-upgrades/${id}`, { action });
      setMsg({ type: 'ok', text: `Request ${action.toLowerCase()}d.` });
      queryClient.invalidateQueries({ queryKey: ['admin-role-upgrades'] });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
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
        <h1 className="font-display text-2xl font-semibold text-foreground">Role Upgrade Requests</h1>
        <p className="text-muted-foreground">
          Approving a request immediately changes the user's role — they are never self-service.
        </p>
      </div>

      {msg.text && (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>{msg.text}</Alert>
      )}

      <div>
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
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.user?.email ?? r.userId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{r.currentRole?.name?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{r.requestedRole?.name?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                      {r.reason || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {r.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={actionId === r.id}
                            onClick={() => decide(r.id, 'APPROVE')}
                          >
                            {actionId === r.id ? <Spinner className="h-3.5 w-3.5" /> : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionId === r.id}
                            onClick={() => decide(r.id, 'REJECT')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
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
