import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Copy,
  Check,
  Gift,
  TrendingUp,
  Clock,
  Share2,
  ChevronRight,
  Star,
} from "lucide-react";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ icon: Icon, label, value, subtext, accent }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
            {subtext && <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>}
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: `${accent}18` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReferralsPage() {
  const profile = useSelector((state) => state.user.profile);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const { data } = await apiClient.get("/referrals");
      return data.data;
    },
  });

  const referralCode = data?.referralCode ?? profile?.referralCode ?? "";
  const referralLink =
    data?.referralLink ??
    (referralCode ? `${window.location.origin}/register?ref=${referralCode}` : "");

  function handleCopyCode() {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "Join Elite Hub",
        text: "Use my referral code and earn rewards when you fund your wallet!",
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-destructive">Failed to load referral data.</p>
      </div>
    );
  }

  const stats = [
    {
      icon: Users,
      label: "Total Referrals",
      value: data?.totalReferrals ?? 0,
      subtext: "People you've invited",
      accent: "#6366f1",
    },
    {
      icon: Star,
      label: "Rewarded",
      value: data?.rewardedReferrals ?? 0,
      subtext: "Qualified & paid out",
      accent: "#10b981",
    },
    {
      icon: Clock,
      label: "Pending",
      value: data?.pendingReferrals ?? 0,
      subtext: "Awaiting first funding",
      accent: "#f59e0b",
    },
    {
      icon: TrendingUp,
      label: "Total Earnings",
      value: formatNaira(data?.totalEarnings),
      subtext: "Credited to your wallet",
      accent: "#8b5cf6",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Refer &amp; Earn
        </h1>
        <p className="mt-1 text-muted-foreground">
          Invite friends and earn{" "}
          <span className="font-medium text-primary">₦100</span> for every
          friend who funds their wallet with ₦2,000 or more.
        </p>
      </div>

      {/* Hero card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-primary/5" />

        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Left */}
            <div className="space-y-4 md:max-w-sm">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">
                  Your Referral Code
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold tracking-widest text-primary">
                  {referralCode || "—"}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Copy code"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 text-primary transition hover:bg-primary/10"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share your unique code or the link below with friends.
              </p>
            </div>

            {/* Right — link + share */}
            <div className="flex flex-col gap-3 md:min-w-[300px]">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {referralLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 text-primary transition hover:text-primary/70"
                  title="Copy link"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Copy className="h-4 w-4" />
                  {linkCopied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {[
              {
                step: "1",
                title: "Share your code or link",
                desc: "Send your unique referral code or link to friends.",
              },
              {
                step: "2",
                title: "Friend signs up",
                desc: "They register using your referral code or link.",
              },
              {
                step: "3",
                title: "Friend funds ₦2,000+",
                desc: "When they fund their wallet for the first time with at least ₦2,000…",
              },
              {
                step: "4",
                title: "You earn ₦100",
                desc: "₦100 is instantly credited to your wallet. No limits!",
              },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Referral list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Your Referrals
            {data?.totalReferrals > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {data.totalReferrals} total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.referrals?.length ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium text-foreground">No referrals yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your code to start earning rewards!
              </p>
              <Button
                onClick={handleShare}
                className="mt-4 gap-2 bg-primary hover:bg-primary/90"
              >
                <Share2 className="h-4 w-4" />
                Share your link
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
                      {ref.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {ref.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {timeAgo(ref.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Status + reward */}
                  <div className="flex items-center gap-3">
                    {ref.rewarded ? (
                      <div className="text-right">
                        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                          Rewarded
                        </Badge>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          +{formatNaira(ref.rewardAmount)}
                        </p>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 text-amber-500"
                      >
                        Pending
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
