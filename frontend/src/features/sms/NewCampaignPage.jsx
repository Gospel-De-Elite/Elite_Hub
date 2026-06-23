import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

function parseRecipients(raw) {
  return raw
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter(Boolean);
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["sms-wallet"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/wallet");
      return data.data;
    },
  });

  const recipients = parseRecipients(recipientsRaw);
  const invalidRecipients = recipients.filter((r) => !NG_PHONE_REGEX.test(r));
  const segments = Math.max(1, Math.ceil((message.length || 1) / 160));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!campaignName.trim()) {
      setError("Please give this campaign a name.");
      return;
    }
    if (!message.trim()) {
      setError("Message body is required.");
      return;
    }
    if (recipients.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    if (invalidRecipients.length > 0) {
      setError(`${invalidRecipients.length} recipient number(s) look invalid. Check and try again.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/sms/campaigns", {
        campaignName,
        message,
        recipients,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
      navigate("/dashboard/sms/campaigns");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">New Campaign</h1>
        <p className="text-muted-foreground">
          You have <span className="font-semibold text-foreground">{wallet?.credits ?? 0}</span> SMS credits
          available.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign name</Label>
              <Input
                id="campaignName"
                placeholder="e.g. November Promo"
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={4}
                maxLength={480}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/480 characters · ~{segments} SMS segment{segments > 1 ? "s" : ""} per recipient
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Textarea
                id="recipients"
                rows={5}
                required
                placeholder={"08012345678\n08087654321\n..."}
                value={recipientsRaw}
                onChange={(e) => setRecipientsRaw(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                One number per line or comma-separated · {recipients.length} recipient
                {recipients.length !== 1 ? "s" : ""} detected
                {invalidRecipients.length > 0 && (
                  <span className="text-destructive"> · {invalidRecipients.length} invalid</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Schedule for later (optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to send immediately.</p>
            </div>

            <div className="rounded-lg bg-secondary p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credits required</span>
                <span className="font-semibold text-foreground">{recipients.length}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || recipients.length === 0}>
              {isSubmitting && <Spinner className="mr-2" />}
              {scheduledAt ? "Schedule Campaign" : "Send Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
