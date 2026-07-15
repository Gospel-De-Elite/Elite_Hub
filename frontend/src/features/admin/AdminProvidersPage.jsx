import { useState }                         from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient                             from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge }   from '@/components/ui/badge';
import { Button }  from '@/components/ui/button';
import { Alert }   from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  RefreshCw, LayoutList, ChevronRight, X,
  CheckCircle, AlertTriangle, XCircle, Clock,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v) =>
  `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

function margin(sellingPrice, providerCost) {
  const s = Number(sellingPrice);
  const c = Number(providerCost);
  if (!c) return null;
  return (((s - c) / c) * 100).toFixed(1);
}

function MarginBadge({ pct }) {
  if (pct === null) return null;
  const n = Number(pct);
  if (n >= 10)  return <span className="text-xs text-green-600 dark:text-green-400">+{pct}%</span>;
  if (n >= 5)   return <span className="text-xs text-yellow-600 dark:text-yellow-400">+{pct}%</span>;
  return <span className="text-xs text-destructive">+{pct}%</span>;
}

function SyncStatusBadge({ status }) {
  if (!status) return <Badge variant="default">Never synced</Badge>;
  if (status === 'RUNNING')   return <Badge variant="default"><Clock className="mr-1 h-3 w-3" />Running</Badge>;
  if (status === 'COMPLETED') return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
  return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
}

// ─── Services Drawer Content ──────────────────────────────────────────────────

function ProviderServicesDrawer({ provider, onClose }) {
  const qc = useQueryClient();
  const [activeSyncId, setActiveSyncId] = useState(null);
  const [pollInterval,  setPollInterval] = useState(null);
  const [syncMsg,       setSyncMsg]      = useState('');

  // Fetch the services + last sync summary for this provider
  const { data, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['provider-services', provider.id],
    queryFn:  async () => {
      const { data } = await apiClient.get(`/admin/providers/${provider.id}/services`);
      return data.data;
    },
  });

  // Sync history
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['provider-sync-history', provider.id],
    queryFn:  async () => {
      const { data } = await apiClient.get(`/admin/providers/${provider.id}/sync-catalog/history`);
      return data.data;
    },
  });

  // Poll sync status when a sync is running
  const { data: activeSyncData } = useQuery({
    queryKey:        ['sync-status', activeSyncId],
    enabled:         !!activeSyncId,
    refetchInterval: pollInterval,
    queryFn:         async () => {
      const { data } = await apiClient.get(
        `/admin/providers/${provider.id}/sync-catalog/${activeSyncId}`
      );
      return data.data;
    },
    onSuccess: (sync) => {
      if (sync.status !== 'RUNNING') {
        // Sync finished — stop polling, refresh related data
        setPollInterval(null);
        setActiveSyncId(null);
        refetchServices();
        refetchHistory();
        qc.invalidateQueries({ queryKey: ['admin-providers'] });
        setSyncMsg(
          sync.status === 'COMPLETED'
            ? `✓ Sync complete — ${sync.summary?.priceChanges?.length ?? 0} price changes found.`
            : `✗ Sync failed: ${sync.error || 'Unknown error'}`
        );
      }
    },
  });

  // Trigger a new sync
  const syncMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/providers/${provider.id}/sync-catalog`),
    onSuccess:  (res) => {
      const sync = res.data.data;
      setActiveSyncId(sync.id);
      setPollInterval(3000); // poll every 3s
      setSyncMsg('Sync started — checking for updates…');
    },
    onError: (e) => setSyncMsg(`✗ ${e.response?.data?.message || 'Failed to start sync.'}`),
  });

  const lastSync   = data?.lastSync;
  const products   = data?.products || [];
  const isSyncing  = syncMutation.isPending || !!activeSyncId;

  // Group products by category for the services table
  const byCategory = products.reduce((acc, p) => {
    const cat = p.category?.name || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Extract price changes from last completed sync
  const priceChanges  = lastSync?.summary?.priceChanges  || [];
  const newProducts   = lastSync?.summary?.newProducts   || [];
  const discontinued  = lastSync?.summary?.discontinued  || [];

  return (
    <div className="flex flex-col h-full">
      {/* Drawer header */}
      <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SheetTitle className="text-lg font-semibold">{provider.name}</SheetTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {provider.providerType} · Priority {provider.priority}
            </p>
          </div>
          <SheetClose className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </SheetClose>
        </div>

        {/* Sync bar */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last sync:</span>
            <SyncStatusBadge status={lastSync?.status} />
            {lastSync?.finishedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(lastSync.finishedAt).toLocaleString()}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5"
            disabled={isSyncing}
            onClick={() => { setSyncMsg(''); syncMutation.mutate(); }}
          >
            {isSyncing
              ? <Spinner className="h-3.5 w-3.5" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            {isSyncing ? 'Syncing…' : 'Sync Catalog'}
          </Button>
        </div>

        {syncMsg && (
          <p className={`mt-2 text-xs ${syncMsg.startsWith('✗') ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
            {syncMsg}
          </p>
        )}
      </SheetHeader>

      {/* Drawer body */}
      <div className="flex-1 overflow-y-auto">
        {servicesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="catalog">
            <TabsList className="w-full rounded-none border-b border-border px-6">
              <TabsTrigger value="catalog"  className="flex-1">Catalog</TabsTrigger>
              <TabsTrigger value="changes"  className="flex-1">
                Changes
                {(priceChanges.length + newProducts.length + discontinued.length) > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                    {priceChanges.length + newProducts.length + discontinued.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history"  className="flex-1">History</TabsTrigger>
            </TabsList>

            {/* ── Catalog tab ──────────────────────────────── */}
            <TabsContent value="catalog" className="p-0">
              {products.length === 0 ? (
                <p className="px-6 py-8 text-sm text-muted-foreground">
                  No VTU products found in catalog.
                </p>
              ) : (
                Object.entries(byCategory).map(([cat, prods]) => (
                  <div key={cat}>
                    <div className="sticky top-0 bg-secondary/80 backdrop-blur-sm px-6 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {cat} ({prods.length})
                      </span>
                    </div>

                    {/* Mobile cards */}
                    <div className="divide-y divide-border md:hidden">
                      {prods.map((p) => {
                        const customerRule = p.pricingRules.find(r => r.role?.name === 'CUSTOMER');
                        const pct = customerRule
                          ? margin(customerRule.sellingPrice, p.providerCost)
                          : null;
                        return (
                          <div key={p.id} className="px-6 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-primary">{fmt(p.providerCost)}</p>
                                <p className="text-xs text-muted-foreground">cost</p>
                              </div>
                            </div>
                            {p.pricingRules.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {p.pricingRules.map(r => (
                                  <span key={r.id} className="text-xs text-muted-foreground">
                                    {r.role?.name}: <span className="font-medium text-foreground">{fmt(r.sellingPrice)}</span>
                                  </span>
                                ))}
                                {pct && <MarginBadge pct={pct} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Provider Cost</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Reseller</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead>Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prods.map((p) => {
                            const rules     = p.pricingRules;
                            const customer  = rules.find(r => r.role?.name === 'CUSTOMER');
                            const reseller  = rules.find(r => r.role?.name === 'RESELLER');
                            const agent     = rules.find(r => r.role?.name === 'AGENT');
                            const pct       = customer ? margin(customer.sellingPrice, p.providerCost) : null;
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{p.code}</TableCell>
                                <TableCell className="text-primary font-semibold">{fmt(p.providerCost)}</TableCell>
                                <TableCell>{customer ? fmt(customer.sellingPrice) : '—'}</TableCell>
                                <TableCell>{reseller ? fmt(reseller.sellingPrice) : '—'}</TableCell>
                                <TableCell>{agent    ? fmt(agent.sellingPrice)    : '—'}</TableCell>
                                <TableCell><MarginBadge pct={pct} /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Changes tab ──────────────────────────────── */}
            <TabsContent value="changes" className="px-6 py-4 space-y-6">
              {!lastSync || lastSync.status !== 'COMPLETED' ? (
                <p className="text-sm text-muted-foreground">
                  Run a catalog sync first to see what has changed.
                </p>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Price Changes', count: priceChanges.length,  icon: <TrendingUp  className="h-4 w-4 text-yellow-500" /> },
                      { label: 'New Products',  count: newProducts.length,   icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
                      { label: 'Discontinued',  count: discontinued.length,  icon: <XCircle     className="h-4 w-4 text-destructive" /> },
                    ].map(({ label, count, icon }) => (
                      <Card key={label}>
                        <CardContent className="flex flex-col items-center gap-1.5 p-3 text-center">
                          {icon}
                          <p className="text-xl font-bold text-foreground">{count}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Price changes */}
                  {priceChanges.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-yellow-500" /> Price Changes
                      </h3>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Our Cost</TableHead>
                              <TableHead>New Cost</TableHead>
                              <TableHead>Δ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {priceChanges.map((pc) => (
                              <TableRow key={pc.code}>
                                <TableCell>
                                  <p className="text-sm font-medium text-foreground">{pc.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{pc.code}</p>
                                </TableCell>
                                <TableCell>{fmt(pc.ourProviderCost)}</TableCell>
                                <TableCell>{fmt(pc.newProviderCost)}</TableCell>
                                <TableCell>
                                  <span className={pc.delta > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                                    {pc.delta > 0 ? '+' : ''}{fmt(pc.delta)}
                                    {pc.deltaPercent && (
                                      <span className="ml-1 text-xs">({pc.deltaPercent})</span>
                                    )}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Update prices via Admin → Pricing. Changes here are informational only.
                      </p>
                    </div>
                  )}

                  {/* New products */}
                  {newProducts.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500" /> New Products Available
                      </h3>
                      <div className="space-y-1.5">
                        {newProducts.map((np) => (
                          <div key={np.code} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{np.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{np.code}</p>
                            </div>
                            <span className="text-sm font-semibold text-primary">{fmt(np.providerCost)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Add these via Admin → Pricing to make them available to customers.
                      </p>
                    </div>
                  )}

                  {/* Discontinued */}
                  {discontinued.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-destructive" /> Potentially Discontinued
                      </h3>
                      <div className="space-y-1.5">
                        {discontinued.map((d) => (
                          <div key={d.code} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 opacity-60">
                            <div>
                              <p className="text-sm font-medium text-foreground line-through">{d.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{d.code}</p>
                            </div>
                            <Badge variant={d.active ? 'destructive' : 'default'}>
                              {d.active ? 'Still Active' : 'Already Inactive'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Deactivate these via Admin → Pricing to hide them from customers.
                      </p>
                    </div>
                  )}

                  {priceChanges.length === 0 && newProducts.length === 0 && discontinued.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <p className="text-sm font-medium text-foreground">Catalog is in sync</p>
                      <p className="text-xs text-muted-foreground">No price changes, new products, or discontinued items found.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── History tab ──────────────────────────────── */}
            <TabsContent value="history" className="px-6 py-4">
              {!history?.length ? (
                <p className="text-sm text-muted-foreground">No sync history yet.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <SyncStatusBadge status={h.status} />
                          {h.summary && (
                            <span className="text-xs text-muted-foreground">
                              {h.summary.priceChanges?.length ?? 0} changes ·{' '}
                              {h.summary.newProducts?.length ?? 0} new ·{' '}
                              {h.summary.discontinued?.length ?? 0} discontinued
                            </span>
                          )}
                          {h.error && (
                            <span className="text-xs text-destructive">{h.error}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(h.startedAt).toLocaleString()}
                          {h.finishedAt && (
                            <> · {Math.round((new Date(h.finishedAt) - new Date(h.startedAt)) / 1000)}s</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProvidersPage() {
  const qc = useQueryClient();
  const [resetting,        setResetting]       = useState(null);
  const [msg,              setMsg]             = useState({ type: '', text: '' });
  const [selectedProvider, setSelectedProvider] = useState(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn:  async () => {
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
      qc.invalidateQueries({ queryKey: ['admin-providers'] });
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
        <p className="text-sm text-muted-foreground">
          Circuit breaker state and catalog sync for all VTU, SMS, and eSIM providers.
        </p>
      </div>

      {msg.text && (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>{msg.text}</Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
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
                  const h         = p.providerHealth;
                  const isHealthy = h?.isHealthy !== false;
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedProvider(p)}>
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
                        {h?.cooldownUntil ? new Date(h.cooldownUntil).toLocaleTimeString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isHealthy && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={resetting === p.id}
                              onClick={() => resetHealth(p.id)}
                            >
                              {resetting === p.id ? <Spinner className="h-3.5 w-3.5" /> : 'Reset'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => setSelectedProvider(p)}
                          >
                            <LayoutList className="h-3.5 w-3.5" /> Services
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {providers?.map((p) => {
              const h         = p.providerHealth;
              const isHealthy = h?.isHealthy !== false;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 active:bg-secondary"
                  onClick={() => setSelectedProvider(p)}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant={isHealthy ? 'success' : 'destructive'} className="text-xs">
                        {isHealthy ? 'Healthy' : 'Circuit Open'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {p.providerType} · Priority {p.priority}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Services + Sync drawer */}
      <Sheet open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-2xl flex flex-col">
          {selectedProvider && (
            <ProviderServicesDrawer
              provider={selectedProvider}
              onClose={() => setSelectedProvider(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
