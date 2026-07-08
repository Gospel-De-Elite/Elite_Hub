import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

export default function AdminEsimDisputesPage() {
  const queryClient               = useQueryClient();
  const [resolving, setResolving] = useState(null); // orderId being acted on
  const [notes, setNotes]         = useState({});   // { [orderId]: string }
  const [msg, setMsg]             = useState({ type: '', text: '' });

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-esim-disputes'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/esim/disputes');
      return data.data;
    },
  });

  async function resolve(orderId, resolution) {
    setResolving(orderId);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/esim/disputes/${orderId}/resolve`, {
        resolution,
        adminNotes: notes[orderId] || '',
      });
      setMsg({
        type: 'ok',
        text: `Dispute ${resolution === 'REFUND' ? 'upheld — wallet refunded' : 'rejected'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-esim-disputes'] });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setResolving(null);
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
        <h1 className="font-display text-2xl font-semibold text-foreground">eSIM Disputes</h1>
        <p className="text-muted-foreground">
          REFUND reverses the settled debit. REJECT closes the dispute and returns the order to
          QR_DELIVERED status.
        </p>
      </div>

      {msg.text && (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>{msg.text}</Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {disputes?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Admin Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.user?.email ?? d.userId}
                    </TableCell>
                    <TableCell className="font-medium">{d.esimProduct?.packageName}</TableCell>
                    <TableCell className="text-muted-foreground">{d.esimProduct?.country}</TableCell>
                    <TableCell>
                      ₦{Number(d.esimProduct?.sellingPrice || 0).toLocaleString('en-NG')}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                      {d.disputeReason}
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Notes (optional)"
                        className="h-8 w-40 text-xs"
                        value={notes[d.id] ?? ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={resolving === d.id}
                          onClick={() => resolve(d.id, 'REFUND')}
                        >
                          {resolving === d.id ? <Spinner className="h-3.5 w-3.5" /> : 'Refund'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={resolving === d.id}
                          onClick={() => resolve(d.id, 'REJECT')}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-16 text-center text-muted-foreground">No open disputes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
