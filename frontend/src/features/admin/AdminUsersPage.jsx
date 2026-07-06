import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getStatusVariant } from '@/lib/statusVariant';
import { Search } from 'lucide-react';

const ROLES    = ['', 'CUSTOMER', 'RESELLER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'];
const STATUSES = ['', 'ACTIVE', 'SUSPENDED', 'BANNED'];

const fmt = (v) =>
  `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export default function AdminUsersPage() {
  const [page, setPage]         = useState(1);
  const [inputVal, setInputVal] = useState('');
  const [search, setSearch]     = useState('');
  const [role, setRole]         = useState('');
  const [status, setStatus]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, role, status],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (role)   params.role   = role;
      if (status) params.status = status;
      const { data } = await apiClient.get('/admin/users', { params });
      return data.data;
    },
  });

  function handleSearch(e) {
    e.preventDefault();
    setSearch(inputVal.trim());
    setPage(1);
  }

  function handleRole(e)   { setRole(e.target.value);   setPage(1); }
  function handleStatus(e) { setStatus(e.target.value); setPage(1); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-muted-foreground">Search, filter, and manage platform accounts.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Email, phone, or name…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-60"
          />
          <Button type="submit" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <select
          value={role}
          onChange={handleRole}
          className="h-9 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r || 'All Roles'}</option>)}
        </select>

        <select
          value={status}
          onChange={handleStatus}
          className="h-9 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : data?.users?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="default">{u.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(u.status)}>{u.status}</Badge>
                    </TableCell>
                    <TableCell>{fmt(u.walletBalance)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-16 text-center text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} &middot; {data.pagination.total} users
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
