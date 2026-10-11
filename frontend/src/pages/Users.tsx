import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Key,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Edit3,
  Trash2,
  Search,
  X,
  Shield,
  UserCheck,
} from "lucide-react";
import { usersApi, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { User, Role } from "../types";

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Reset Password Modal State
  const [resettingUser, setResettingUser] = useState<User | null>(null);
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

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    username: "",
    role: "MEMBER" as Role,
    active: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Delete User Dialog State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasAnyModalOpen =
    Boolean(resettingUser) ||
    isAddModalOpen ||
    Boolean(editingUser) ||
    Boolean(userToDelete);

  useEffect(() => {
    if (!hasAnyModalOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setResettingUser(null);
        setIsAddModalOpen(false);
        setEditingUser(null);
        setUserToDelete(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [hasAnyModalOpen]);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .getAll()
      .then((res) => {
        if (!cancelled) setUsers(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  // --- Handlers ---

  function openResetModal(user: User) {
    setResettingUser(user);
    setNewPassword("");
    setResetError(null);
    setResetSuccess(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingUser) return;
    setResetError(null);
    setResetSuccess(false);
    setIsResetting(true);

    try {
      const userId = (resettingUser as User & { _id?: string })._id || resettingUser.id;
      await usersApi.resetPassword(userId, newPassword);
      setResetSuccess(true);
      setTimeout(() => {
        setResettingUser(null);
        setNewPassword("");
        setResetSuccess(false);
      }, 1500);
    } catch (err) {
      setResetError(apiErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
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
      }, 1200);
    } catch (err) {
      setAddError(apiErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditFormData({
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      active: (user as User & { active?: boolean }).active !== false,
    });
    setEditError(null);
    setEditSuccess(false);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditSuccess(false);
    setIsEditing(true);

    const userId = (editingUser as User & { _id?: string })._id || editingUser.id;

    try {
      const res = await usersApi.update(userId, editFormData);
      const updatedUser = res.data;
      setUsers(
        users.map((u) => {
          const uId = (u as User & { _id?: string })._id || u.id;
          return uId === userId ? { ...u, ...updatedUser } : u;
        })
      );
      setEditSuccess(true);
      setTimeout(() => {
        setEditingUser(null);
        setEditSuccess(false);
      }, 1200);
    } catch (err) {
      setEditError(apiErrorMessage(err));
    } finally {
      setIsEditing(false);
    }
  }

  function openDeleteDialog(user: User) {
    setUserToDelete(user);
    setDeleteError(null);
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const userId = (userToDelete as User & { _id?: string })._id || userToDelete.id;

    try {
      await usersApi.delete(userId);
      setUsers(users.filter((u) => ((u as User & { _id?: string })._id || u.id) !== userId));
      setUserToDelete(null);
    } catch (err) {
      setDeleteError(apiErrorMessage(err));
    } finally {
      setIsDeleting(false);
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">User Management</h1>
          <p className="text-xs text-ink-500">
            Manage system access, edit roles and user profiles, or delete accounts
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-3.5">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, username, or role..."
            className="field-input !py-1.5 !pl-9 text-xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas text-xs font-semibold uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredUsers.map((user) => {
                const userId = (user as User & { _id?: string })._id || user.id;
                const isSelf = Boolean(
                  currentUser &&
                    (((currentUser as User & { _id?: string })._id &&
                      (currentUser as User & { _id?: string })._id === userId) ||
                      currentUser.id === userId ||
                      currentUser.username === user.username)
                );
                const isActive = (user as User & { active?: boolean }).active !== false;

                return (
                  <tr key={userId} className="transition-colors hover:bg-canvas">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900 flex items-center gap-1.5">
                            {user.displayName}
                            {isSelf && (
                              <span className="rounded bg-accent-soft px-1.5 py-0.2 text-[9px] font-bold text-accent">
                                You
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">@{user.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold ${
                          user.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : user.role === "TREASURER"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-accent-soft text-accent"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-emerald-50 text-status-approved"
                            : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-status-approved" : "bg-ink-400"
                          }`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-ink-600 hover:bg-surface-hover hover:text-ink-900"
                          title="Edit user details and role"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-accent" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => openResetModal(user)}
                          className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-ink-600 hover:bg-surface-hover hover:text-ink-900"
                          title="Reset user password"
                        >
                          <Key className="h-3.5 w-3.5 text-ink-400" />
                          <span className="hidden sm:inline">Password</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteDialog(user)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 rounded-sm p-1 text-xs font-medium ${
                            isSelf
                              ? "cursor-not-allowed opacity-30 text-ink-400"
                              : "text-ink-400 hover:bg-status-rejectedSoft hover:text-status-rejected"
                          }`}
                          title={isSelf ? "You cannot delete your own account" : "Delete user account"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. EDIT USER MODAL                                        */}
      {/* ========================================================= */}
      {editingUser &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm animate-fade-in"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingUser(null);
            }}
          >
            <div role="dialog" aria-modal="true" className="card w-full max-w-md animate-scale-up p-6 shadow-float">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Edit User Profile</h3>
                    <p className="text-xs text-ink-500">Update display name, username, or role</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="rounded-md p-1 text-ink-400 hover:bg-surface hover:text-ink-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-status-approved">
                  <CheckCircle2 className="mb-2 h-10 w-10" />
                  <p className="font-semibold">User profile updated successfully!</p>
                </div>
              ) : (
                <form onSubmit={handleEditUser} className="space-y-4">
                  <div>
                    <label className="field-label" htmlFor="editDisplayName">
                      Display Name *
                    </label>
                    <input
                      id="editDisplayName"
                      type="text"
                      className="field-input mt-1"
                      value={editFormData.displayName}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, displayName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="editUsername">
                      Username *
                    </label>
                    <input
                      id="editUsername"
                      type="text"
                      className="field-input mt-1"
                      value={editFormData.username}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, username: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="editRole">
                      System Role *
                    </label>
                    <select
                      id="editRole"
                      className="field-input mt-1"
                      value={editFormData.role}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, role: e.target.value as Role })
                      }
                      required
                    >
                      <option value="MEMBER">Member (Standard Access)</option>
                      <option value="TREASURER">Treasurer (Bills & Inflows Oversight)</option>
                      <option value="ADMIN">Admin (Full System Control)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="editActive"
                      type="checkbox"
                      checked={editFormData.active}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, active: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                    />
                    <label htmlFor="editActive" className="text-xs font-semibold text-ink-800">
                      Account is Active
                    </label>
                  </div>

                  {editError && (
                    <div className="flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-xs text-status-rejected animate-fade-up">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      className="btn-secondary !px-4 !py-2 text-xs"
                      onClick={() => setEditingUser(null)}
                      disabled={isEditing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary !px-4 !py-2 text-xs"
                      disabled={isEditing}
                    >
                      {isEditing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* 2. DELETE USER CONFIRMATION MODAL                         */}
      {/* ========================================================= */}
      {userToDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm animate-fade-in"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setUserToDelete(null);
            }}
          >
            <div role="dialog" aria-modal="true" className="card w-full max-w-md animate-scale-up p-6 shadow-float border-status-rejected/30">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-rejectedSoft text-status-rejected">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900">Delete User Account</h3>
                  <p className="text-xs text-ink-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-xs text-ink-700 leading-relaxed">
                Are you sure you want to permanently delete the account for{" "}
                <strong className="text-ink-900">{userToDelete.displayName}</strong> (
                <span className="font-mono">@{userToDelete.username}</span>)? They will lose all access to Asterix Document & Bill Manager.
              </p>

              {deleteError && (
                <div className="mt-3 flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-xs text-status-rejected">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  className="btn-secondary !px-4 !py-2 text-xs"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="rounded-md bg-status-rejected px-4 py-2 text-xs font-bold text-white hover:bg-status-rejected/90 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* 3. RESET PASSWORD MODAL                                   */}
      {/* ========================================================= */}
      {resettingUser &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm animate-fade-in"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setResettingUser(null);
            }}
          >
            <div role="dialog" aria-modal="true" className="card w-full max-w-md animate-scale-up p-6 shadow-float">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Reset Password</h3>
                    <p className="text-xs text-ink-500">
                      For {resettingUser.displayName} (@{resettingUser.username})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setResettingUser(null)}
                  className="rounded-md p-1 text-ink-400 hover:bg-surface hover:text-ink-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {resetSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-status-approved">
                  <CheckCircle2 className="mb-2 h-10 w-10" />
                  <p className="font-semibold">Password updated successfully!</p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="field-label" htmlFor="newPassword">
                      New Password *
                    </label>
                    <input
                      id="newPassword"
                      type="text"
                      className="field-input mt-1"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      required
                      minLength={4}
                    />
                  </div>

                  {resetError && (
                    <div className="flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-xs text-status-rejected animate-fade-up">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      className="btn-secondary !px-4 !py-2 text-xs"
                      onClick={() => setResettingUser(null)}
                      disabled={isResetting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary !px-4 !py-2 text-xs"
                      disabled={isResetting}
                    >
                      {isResetting ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* 4. ADD NEW USER MODAL                                     */}
      {/* ========================================================= */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm animate-fade-in"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddModalOpen(false);
            }}
          >
            <div role="dialog" aria-modal="true" className="card w-full max-w-md animate-scale-up p-6 shadow-float">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">Add New User</h3>
                    <p className="text-xs text-ink-500">Create login credentials for a team member</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-md p-1 text-ink-400 hover:bg-surface hover:text-ink-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {addSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-status-approved">
                  <CheckCircle2 className="mb-2 h-10 w-10" />
                  <p className="font-semibold">User created successfully!</p>
                </div>
              ) : (
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="field-label" htmlFor="displayName">
                      Display Name *
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      className="field-input mt-1"
                      value={newUser.displayName}
                      onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="newUsername">
                      Username *
                    </label>
                    <input
                      id="newUsername"
                      type="text"
                      className="field-input mt-1"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="e.g., jdoe"
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="userPassword">
                      Password *
                    </label>
                    <input
                      id="userPassword"
                      type="password"
                      className="field-input mt-1"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      minLength={4}
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="userRole">
                      Role *
                    </label>
                    <select
                      id="userRole"
                      className="field-input mt-1"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
                      required
                    >
                      <option value="MEMBER">Member (Standard Access)</option>
                      <option value="TREASURER">Treasurer (Bills & Inflows Oversight)</option>
                      <option value="ADMIN">Admin (Full System Control)</option>
                    </select>
                  </div>

                  {addError && (
                    <div className="flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-xs text-status-rejected animate-fade-up">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{addError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      className="btn-secondary !px-4 !py-2 text-xs"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={isAdding}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary !px-4 !py-2 text-xs" disabled={isAdding}>
                      {isAdding ? "Creating..." : "Create User"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
