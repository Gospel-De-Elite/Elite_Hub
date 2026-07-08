import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { useState } from 'react';

export default function AdminProvidersPage() {
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(null);
  const [msg, setMsg]             = useState({ type: '', text: '' });

  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/providers');
      return data.data;
    },
  });

  async function resetHealth(id) {
    setResetting(id);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.post(`/admin/providers/${id}/reset-health`);
      setMsg({ type: 'ok', text: 'Circuit breaker reset — provider marked healthy.' });
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Reset failed.' });
    } finally {
      setResetting(null);
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
        <h1 className="font-display text-2xl font-semibold text-foreground">Providers</h1>
        <p className="text-muted-foreground">
          Circuit breaker state for all VTU, SMS, and eSIM providers.
        </p>
      </div>

      {msg.text && (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>{msg.text}</Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Failures</TableHead>
                <TableHead>Cooldown Until</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers?.map((p) => {
                const h = p.providerHealth;
                const isHealthy = h?.isHealthy !== false;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.providerType}</TableCell>
                    <TableCell>{p.priority}</TableCell>
                    <TableCell>
                      <Badge variant={isHealthy ? 'success' : 'destructive'}>
                        {isHealthy ? 'Healthy' : 'Circuit Open'}
                      </Badge>
                    </TableCell>
                    <TableCell>{h?.consecutiveFailures ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {h?.cooldownUntil
                        ? new Date(h.cooldownUntil).toLocaleTimeString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {!isHealthy && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={resetting === p.id}
                          onClick={() => resetHealth(p.id)}
                        >
                          {resetting === p.id
                            ? <Spinner className="h-3.5 w-3.5" />
                            : 'Reset'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
