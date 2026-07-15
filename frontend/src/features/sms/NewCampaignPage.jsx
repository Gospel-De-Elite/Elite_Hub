import { useState, useRef } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, CheckCircle2, BookUser, X } from "lucide-react";

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

function parseRecipients(raw) {
  return raw.split(/[\n,]/).map((r) => r.trim()).filter(Boolean);
}

// ── CSV upload tab ────────────────────────────────────────────────────────────

function CsvUploadTab({ parsedResult, setParsedResult }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post("/sms/campaigns/parse-csv", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setParsedResult(data.data);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Could not parse CSV. Check the file and try again.");
      setParsedResult(null);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  if (parsedResult) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">
              {parsedResult.validCount} valid number{parsedResult.validCount !== 1 ? "s" : ""} found
            </p>
            {parsedResult.invalidCount > 0 && (
              <p className="text-muted-foreground">
                {parsedResult.invalidCount} invalid rows skipped
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Preview: {parsedResult.preview.join(", ")}
              {parsedResult.validCount > 5 ? ` + ${parsedResult.validCount - 5} more` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setParsedResult(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {uploadError && <Alert variant="destructive">{uploadError}</Alert>}
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary p-10 transition-colors hover:border-primary/50"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <Spinner className="h-8 w-8 text-primary" />
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground">
              One phone number per row · Column labelled "phone", "mobile", or "number" auto-detected
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

// ── Phonebook tab ─────────────────────────────────────────────────────────────

function PhonebookTab({ selectedPhonebook, setSelectedPhonebook }) {
  const { data: phonebooks, isLoading } = useQuery({
    queryKey: ["phonebooks"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/phonebooks");
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!phonebooks?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <BookUser className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No phonebooks yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create one from{" "}
          <a href="/dashboard/sms/phonebooks" className="text-primary hover:underline">
            SMS → Phonebooks
          </a>
          , then come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {phonebooks.map((pb) => (
        <button
          key={pb.id}
          type="button"
          onClick={() => setSelectedPhonebook(selectedPhonebook?.id === pb.id ? null : pb)}
          className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
            selectedPhonebook?.id === pb.id
              ? "border-primary bg-primary/10"
              : "border-border bg-secondary hover:border-primary/40"
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{pb.name}</p>
            {pb.description && (
              <p className="text-xs text-muted-foreground">{pb.description}</p>
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {pb.contactCount} contact{pb.contactCount !== 1 ? "s" : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-tab state
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [parsedResult, setParsedResult] = useState(null);    // from CSV upload
  const [selectedPhonebook, setSelectedPhonebook] = useState(null);

  const { data: wallet } = useQuery({
    queryKey: ["sms-wallet"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/wallet");
      return data.data;
    },
  });

  const typedRecipients = parseRecipients(recipientsRaw);
  const invalidTyped = typedRecipients.filter((r) => !NG_PHONE_REGEX.test(r));
  const segments = Math.max(1, Math.ceil((message.length || 1) / 160));

  // Resolved credit count regardless of which tab is active
  const creditCount =
    parsedResult?.validCount ??
    selectedPhonebook?.contactCount ??
    typedRecipients.length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!campaignName.trim()) { setError("Please give this campaign a name."); return; }
    if (!message.trim()) { setError("Message body is required."); return; }

    // Build the payload based on which recipient source is active
    const recipientPayload = {};
    if (parsedResult) {
      if (!parsedResult.parsedKey) {
        setError("The CSV upload has expired — please re-upload the file.");
        return;
      }
      recipientPayload.parsedKey = parsedResult.parsedKey;
    } else if (selectedPhonebook) {
      recipientPayload.phonebookId = selectedPhonebook.id;
    } else {
      if (typedRecipients.length === 0) { setError("Add at least one recipient."); return; }
      if (invalidTyped.length > 0) {
        setError(`${invalidTyped.length} number(s) look invalid. Check and try again.`);
        return;
      }
      recipientPayload.recipients = typedRecipients;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/sms/campaigns", {
        campaignName,
        message,
        ...recipientPayload,
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
          You have{" "}
          <span className="font-semibold text-foreground">{wallet?.credits ?? 0}</span> SMS credits
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
                {message.length}/480 characters · ~{segments} SMS segment{segments > 1 ? "s" : ""} per
                recipient
              </p>
            </div>

            {/* ── Recipient source tabs ── */}
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Tabs
                defaultValue="type"
                onValueChange={() => {
                  // Reset all recipient sources when switching tabs
                  setRecipientsRaw("");
                  setParsedResult(null);
                  setSelectedPhonebook(null);
                }}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="type">Type numbers</TabsTrigger>
                  <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                  <TabsTrigger value="phonebook">Phonebook</TabsTrigger>
                </TabsList>

                <TabsContent value="type" className="mt-3">
                  <Textarea
                    rows={5}
                    placeholder={"08012345678\n08087654321\n..."}
                    value={recipientsRaw}
                    onChange={(e) => setRecipientsRaw(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    One number per line or comma-separated · {typedRecipients.length} detected
                    {invalidTyped.length > 0 && (
                      <span className="text-destructive"> · {invalidTyped.length} invalid</span>
                    )}
                  </p>
                </TabsContent>

                <TabsContent value="csv" className="mt-3">
                  <CsvUploadTab parsedResult={parsedResult} setParsedResult={setParsedResult} />
                </TabsContent>

                <TabsContent value="phonebook" className="mt-3">
                  <PhonebookTab
                    selectedPhonebook={selectedPhonebook}
                    setSelectedPhonebook={setSelectedPhonebook}
                  />
                </TabsContent>
              </Tabs>
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
                <span className="font-semibold text-foreground">{creditCount}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || creditCount === 0}>
              {isSubmitting && <Spinner className="mr-2" />}
              {scheduledAt ? "Schedule Campaign" : "Send Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
