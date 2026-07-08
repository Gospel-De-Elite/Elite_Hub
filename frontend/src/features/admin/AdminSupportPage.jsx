import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminSupportPage() {
  const queryClient             = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [msg, setMsg]           = useState({ type: '', text: '' });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['admin-support-escalated'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/support/escalated');
      return data.data;
    },
  });

  async function markResolved(id) {
    setResolving(id);
    setMsg({ type: '', text: '' });
    try {
      await apiClient.patch(`/admin/support/${id}/resolve`);
      setMsg({ type: 'ok', text: 'Conversation marked resolved.' });
      queryClient.invalidateQueries({ queryKey: ['admin-support-escalated'] });
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
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Support Escalations
        </h1>
        <p className="text-muted-foreground">
          Conversations the AI could not resolve and handed off to a human agent.
        </p>
      </div>

      {msg.text && (
        <Alert variant={msg.type === 'error' ? 'destructive' : 'default'}>{msg.text}</Alert>
      )}

      {conversations?.length ? (
        <div className="space-y-3">
          {conversations.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {c.user?.firstName} {c.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.user?.email}</p>
                    </div>
                    <Badge variant="warning">ESCALATED</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.updatedAt).toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    >
                      {expanded === c.id
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      disabled={resolving === c.id}
                      onClick={() => markResolved(c.id)}
                    >
                      {resolving === c.id
                        ? <Spinner className="h-3.5 w-3.5" />
                        : 'Resolve'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expanded === c.id && (
                <CardContent className="border-t border-border pt-4">
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {c.messages?.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            m.senderType === 'USER'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          <p className="mb-1 text-xs opacity-60">
                            {m.senderType === 'USER' ? 'User' : 'AI'}
                          </p>
                          {m.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No escalated conversations.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
