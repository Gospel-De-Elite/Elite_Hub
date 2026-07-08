import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

const ROLE_COLS = ['CUSTOMER', 'RESELLER', 'AGENT'];

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const [editId, setEditId]     = useState(null);
  const [prices, setPrices]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState({ type: '', text: '' });

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/pricing/products');
      return data.data;
    },
  });

  function startEdit(product) {
    const current = {};
    ROLE_COLS.forEach((role) => {
      const rule = product.pricingRules?.find((r) => r.role?.name === role);
      current[role] = rule ? String(rule.sellingPrice) : '';
    });
    setPrices(current);
    setEditId(product.id);
    setMsg({ type: '', text: '' });
  }

  function cancelEdit() {
    setEditId(null);
    setPrices({});
  }

  async function saveEdit(productId) {
    const payload = {};
    for (const [role, val] of Object.entries(prices)) {
      if (val === '') continue;
      const n = parseFloat(val);
      if (isNaN(n) || n < 0) {
        setMsg({ type: 'error', text: `Invalid price for ${role}.` });
        return;
      }
      payload[role] = n;
    }
    if (!Object.keys(payload).length) {
      setMsg({ type: 'error', text: 'Enter at least one price.' });
      return;
    }
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.put(`/admin/pricing/products/${productId}/pricing`, payload);
      setMsg({ type: 'ok', text: 'Prices updated.' });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditId(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
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
        <h1 className="font-display text-2xl font-semibold text-foreground">Pricing</h1>
        <p className="text-muted-foreground">
          Edit role-based selling prices. Changes invalidate the cache immediately.
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
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cost</TableHead>
                {ROLE_COLS.map((r) => <TableHead key={r}>{r}</TableHead>)}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((p) => {
                const isEditing = editId === p.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category?.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      ₦{Number(p.providerCost).toLocaleString('en-NG')}
                    </TableCell>

                    {ROLE_COLS.map((role) => {
                      const rule = p.pricingRules?.find((r) => r.role?.name === role);
                      return (
                        <TableCell key={role}>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              className="h-8 w-28"
                              value={prices[role] ?? ''}
                              onChange={(e) =>
                                setPrices((prev) => ({ ...prev, [role]: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="text-sm text-foreground">
                              {rule ? `₦${Number(rule.sellingPrice).toLocaleString('en-NG')}` : '—'}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}

                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(p.id)} disabled={saving}>
                            {saving ? <Spinner className="h-3.5 w-3.5" /> : 'Save'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>
                          Edit
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
