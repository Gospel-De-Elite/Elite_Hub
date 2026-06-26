import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { clearAuth } from "@/features/auth/authSlice";
import { clearProfile } from "@/features/user/userSlice";
import { clearWallet } from "@/features/wallet/walletSlice";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from "@/lib/statusVariant";

// Role-based UI rendering: a CUSTOMER can request RESELLER or AGENT; a
// RESELLER can only go one step further to AGENT; AGENT/ADMIN/SUPER_ADMIN
// see no upgrade card at all, since there's nothing left to request.
const UPGRADE_OPTIONS = {
  CUSTOMER: ["RESELLER", "AGENT"],
  RESELLER: ["AGENT"],
};

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const profile = useSelector((state) => state.user.profile);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [selectedRole, setSelectedRole] = useState("");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const { data: upgradeRequests, isLoading: upgradesLoading } = useQuery({
    queryKey: ["role-upgrades", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get("/role-upgrades/me");
      return data.data;
    },
  });

  const pendingUpgrade = upgradeRequests?.find((r) => r.status === "PENDING");
  const availableUpgrades = UPGRADE_OPTIONS[profile?.role] || [];

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setIsChangingPassword(true);

    try {
      await apiClient.post("/auth/change-password", { currentPassword, newPassword });
      setPasswordSuccess("Password changed. Other devices have been logged out.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Could not change password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleUpgradeSubmit(e) {
    e.preventDefault();
    setUpgradeError("");

    if (!selectedRole) {
      setUpgradeError("Please choose a role to request.");
      return;
    }

    setIsSubmittingUpgrade(true);
    try {
      await apiClient.post("/role-upgrades", { requestedRole: selectedRole, reason: upgradeReason });
      queryClient.invalidateQueries({ queryKey: ["role-upgrades", "me"] });
      setSelectedRole("");
      setUpgradeReason("");
    } catch (err) {
      setUpgradeError(err.response?.data?.message || "Could not submit this request.");
    } finally {
      setIsSubmittingUpgrade(false);
    }
  }

  async function handleLogoutAll() {
    setIsLoggingOutAll(true);
    try {
      await apiClient.post("/auth/logout-all");
    } catch {
      // Even if the call fails, clear local state — the access token's
      // short remaining lifetime isn't worth retrying around.
    } finally {
      dispatch(clearAuth());
      dispatch(clearProfile());
      dispatch(clearWallet());
      navigate("/login");
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account details and security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <Row label="Name" value={`${profile.firstName} ${profile.lastName}`} />
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.phone} />
          <Row label="Referral Code" value={profile.referralCode} />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="default">{profile.role.replaceAll("_", " ")}</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={getStatusVariant(profile.status)}>{profile.status}</Badge>
          </div>
        </CardContent>
      </Card>

      {availableUpgrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Account Upgrade</CardTitle>
          </CardHeader>
          <CardContent>
            {upgradesLoading ? (
              <Spinner className="h-6 w-6 text-primary" />
            ) : pendingUpgrade ? (
              <Alert>
                Your request to become a{" "}
                <span className="font-medium">{pendingUpgrade.requestedRole?.name}</span> is pending admin review.
              </Alert>
            ) : (
              <form onSubmit={handleUpgradeSubmit} className="space-y-4">
                {upgradeError && <Alert variant="destructive">{upgradeError}</Alert>}
                <div className="space-y-2">
                  <Label>Request upgrade to</Label>
                  <div className="flex gap-2">
                    {availableUpgrades.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          selectedRole === role
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-foreground hover:border-primary/40"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgradeReason">Why would you like this upgrade? (optional)</Label>
                  <Input
                    id="upgradeReason"
                    value={upgradeReason}
                    onChange={(e) => setUpgradeReason(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSubmittingUpgrade || !selectedRole}>
                  {isSubmittingUpgrade && <Spinner className="mr-2 h-4 w-4" />}
                  Submit Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && <Alert variant="destructive">{passwordError}</Alert>}
            {passwordSuccess && <Alert>{passwordSuccess}</Alert>}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword && <Spinner className="mr-2 h-4 w-4" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            This signs you out of every device, including this one, the next time your session refreshes.
          </p>
          <Button variant="destructive" onClick={handleLogoutAll} disabled={isLoggingOutAll}>
            {isLoggingOutAll && <Spinner className="mr-2 h-4 w-4" />}
            Log Out of All Devices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
