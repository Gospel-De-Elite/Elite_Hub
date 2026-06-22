import { Link } from "react-router-dom";
import { useWalletQuery } from "./useWalletQuery";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowDownToLine, ArrowUpRight, Lock } from "lucide-react";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WalletOverviewPage() {
  const { data: wallet, isLoading } = useWalletQuery();

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
        <h1 className="font-display text-2xl font-semibold text-foreground">Wallet</h1>
        <p className="text-muted-foreground">Manage your balance and view your transaction history.</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/15 to-card">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Spendable balance</p>
          <p className="mt-1 font-display text-3xl font-semibold text-foreground">
            {formatNaira(wallet?.spendableBalance)}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/dashboard/wallet/fund">
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Fund Wallet
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/dashboard/wallet/transactions">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                View Transactions
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{formatNaira(wallet?.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4" />
              Locked (in processing orders)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">
              {formatNaira(wallet?.lockedBalance)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
