import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function AdminAuditLogsPage() {
  const [page, setPage]           = useState(1);
  const [action, setAction]       = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, action, entityType, from, to],
    queryFn: async () => {
      const params = { page, limit: 50 };
      if (action)     params.action     = action.trim();
      if (entityType) params.entityType = entityType.trim();
      if (from)       params.from       = from;
      if (to)         params.to         = to;
      const { data } = await apiClient.get('/admin/audit-logs', { params });
      return data.data;
    },
  });

  function reset() {
    setPage(1);
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">
          Immutable trail of every sensitive action since Phase 2.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1 sm:w-auto">
          <p className="text-xs text-muted-foreground">Action</p>
          <Input
            placeholder="e.g. WALLET_FINANCIAL_OVERRIDE"
            className="h-9 w-full text-sm sm:w-52"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full space-y-1 sm:w-auto">
          <p className="text-xs text-muted-foreground">Entity Type</p>
          <Input
            placeholder="e.g. User"
            className="h-9 w-full text-sm sm:w-32"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">From</p>
          <Input
            type="date"
            className="h-9 text-sm"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">To</p>
          <Input
            type="date"
            className="h-9 text-sm"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>
          Clear
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : data?.logs?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-foreground">
                      {log.action}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.entityType}
                      {log.entityId && (
                        <span className="ml-1 font-mono text-xs opacity-60">
                          {log.entityId.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.actor
                        ? `${log.actor.firstName} ${log.actor.lastName}`
                        : log.actorId?.slice(0, 8) ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-16 text-center text-muted-foreground">No logs found.</p>
          )}
        </CardContent>
      </Card>

      {data?.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
