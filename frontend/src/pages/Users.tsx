import { useState, useEffect } from "react";
import { Users as UsersIcon, Key, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { usersApi, apiErrorMessage } from "../api/client";
import type { User, Role } from "../types";

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset Password Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "MEMBER" as Role,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      const res = await usersApi.getAll();
      setUsers(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setResetError(null);
    setResetSuccess(false);
    setIsResetting(true);

    try {
      const userId = (selectedUser as any)._id || selectedUser.id;
      await usersApi.resetPassword(userId, newPassword);
      setResetSuccess(true);
      setTimeout(() => {
        setSelectedUser(null);
        setNewPassword("");
        setResetSuccess(false);
      }, 2000);
    } catch (err) {
      setResetError(apiErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  }

  function openResetModal(user: User) {
    setSelectedUser(user);
    setNewPassword("");
    setResetError(null);
    setResetSuccess(false);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);
    setIsAdding(true);

    try {
      const res = await usersApi.create(newUser);
      setUsers([res.data, ...users]);
      setAddSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewUser({ username: "", password: "", displayName: "", role: "MEMBER" as Role });
        setAddSuccess(false);
      }, 2000);
    } catch (err) {
      setAddError(apiErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-status-rejected/20 bg-status-rejectedSoft p-4 text-status-rejected">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">User Management</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas text-xs font-semibold uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3">Display Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => (
                <tr key={(user as any)._id || user.id} className="transition-colors hover:bg-canvas">
                  <td className="px-4 py-3 font-medium text-ink-900">{user.displayName}</td>
                  <td className="px-4 py-3 text-ink-500">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-sm bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openResetModal(user)}
                      className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:bg-line hover:text-ink-900"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md animate-scale-up p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-ink-900">Reset Password</h3>
              <p className="text-sm text-ink-500">
                Change password for <span className="font-medium text-ink-900">{selectedUser.displayName}</span> ({selectedUser.username})
              </p>
            </div>

            {resetSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-status-approved">
                <CheckCircle2 className="mb-2 h-10 w-10" />
                <p className="font-medium">Password updated successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="field-label" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="text"
                    className="field-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoFocus
                    required
                    minLength={4}
                  />
                </div>

                {resetError && (
                  <div className="mb-4 flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-sm text-status-rejected animate-fade-up">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedUser(null)}
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isResetting || newPassword.length < 4}>
                    {isResetting ? "Saving..." : "Save Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md animate-scale-up p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold text-ink-900">Add New User</h3>
            </div>

            {addSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-status-approved">
                <CheckCircle2 className="mb-2 h-10 w-10" />
                <p className="font-medium">User created successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleAddUser}>
                <div className="mb-4">
                  <label className="field-label" htmlFor="displayName">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    className="field-input"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="field-label" htmlFor="newUsername">
                    Username
                  </label>
                  <input
                    id="newUsername"
                    type="text"
                    className="field-input"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="field-label" htmlFor="userPassword">
                    Password
                  </label>
                  <input
                    id="userPassword"
                    type="password"
                    className="field-input"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={4}
                  />
                </div>

                <div className="mb-5">
                  <label className="field-label" htmlFor="userRole">
                    Role
                  </label>
                  <select
                    id="userRole"
                    className="field-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
                    required
                  >
                    <option value="MEMBER">Member</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {addError && (
                  <div className="mb-4 flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-sm text-status-rejected animate-fade-up">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>{addError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isAdding}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isAdding}>
                    {isAdding ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
