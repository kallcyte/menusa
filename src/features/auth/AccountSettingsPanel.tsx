import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components";
import { Input } from "../../components/ui/input";
import {
  deleteAccount,
  updateAccountEmail,
  updateAccountName,
  updateAccountPassword,
} from "../../api";

export function AccountSettingsPanel({
  user,
  onDeleted,
}: {
  user?: { name: string; email: string };
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user?.name, user?.email]);
  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await action();
      setMessage(success);
      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const nextName = name.trim();
  const nextEmail = email.trim();
  const nameChanged = nextName !== (user?.name ?? "");
  const emailChanged = nextEmail !== (user?.email ?? "");
  const profileChanged = Boolean(user && (nameChanged || emailChanged));
  const saveProfile = () => {
    if (emailChanged && !window.confirm(`Change your sign-in email to ${nextEmail}? You will need this address to log in next time.`)) return;
    return run(async () => {
      if (nameChanged) await updateAccountName(nextName);
      if (emailChanged) await updateAccountEmail(nextEmail);
    }, "Account details saved.");
  };
  const changePassword = () =>
    run(
      () => updateAccountPassword(currentPassword, newPassword),
      "Password updated.",
    );
  const removeAccount = async () => {
    if (
      !window.confirm(
        "Delete your account and all restaurant menus? This cannot be undone.",
      )
    )
      return;
    if (await run(() => deleteAccount(deletePassword), "Account deleted."))
      onDeleted();
  };
  return (
    <div className="settings-panel account-settings-panel">
      <div className="account-settings-intro">
        <div>
          <p className="section-kicker">Personal access</p>
          <h1>Account settings</h1>
          <p className="intro-copy">Your identity and sign-in details, in one place.</p>
        </div>
        <div className="account-profile-mark">{user?.name?.slice(0, 2).toUpperCase() ?? "AM"}</div>
      </div>
      {message && <div className="settings-feedback success">{message}</div>}
      {error && <div className="settings-feedback error">{error}</div>}
      <div className="settings-card account-profile-card">
        <p className="section-kicker">Account settings</p>
        <h2>Your account</h2>
        <p className="muted">Manage the details used to sign in to Digimenu.</p>
        <div className="account-fields">
          <label>
            Account name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Email address
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <Button
            variant="outline"
            disabled={saving || !nextName || !nextEmail || !profileChanged}
            onClick={saveProfile}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
      <div className="settings-card account-password-card">
        <p className="section-kicker">Security</p>
        <h3>Change password</h3>
        <p className="muted">Choose a new password to keep your account secure.</p>
        <div className="account-fields">
          <label>
            Current password
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label>
            New password
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
        </div>
        <div className="card-action-row">
          <Button
            variant="outline"
            disabled={saving || !currentPassword || !newPassword}
            onClick={changePassword}
          >
            Update password
          </Button>
        </div>
      </div>
      <div className="settings-card danger-card">
        <p className="section-kicker">Danger zone</p>
        <h3>Delete account</h3>
        <p className="muted">
          This permanently removes your account and all restaurant menus.
        </p>
        <label>
          Confirm with password
          <Input
            type="password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
          />
        </label>
        <div className="card-action-row">
          <Button
            variant="danger"
            disabled={saving || !deletePassword}
            onClick={removeAccount}
          >
            Delete account
          </Button>
        </div>
      </div>
    </div>
  );
}
