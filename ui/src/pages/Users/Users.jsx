import { useEffect, useMemo, useState } from "react";
import api from "../../services/Services.jsx";
import "./Users.css";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  roleName: "",
};

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [userResponse, roleResponse] = await Promise.all([
        api.get("/Users"),
        api.get("/Users/roles"),
      ]);

      setUsers(userResponse.data);
      setRoles(roleResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load users. Please check your login and API."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    roles: new Set(users.map((u) => u.role)).size,
  }), [users]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      `${user.name} ${user.email} ${user.id}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && user.isActive) ||
      (statusFilter === "Inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      roleName: roles[0]?.name || "",
    });
    setError("");
    setMessage("");
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roleName: user.role,
    });
    setError("");
    setMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingUser) {
        await api.put(`/Users/${editingUser.id}`, {
          name: form.name,
          email: form.email,
          roleName: form.roleName,
        });
      } else {
        await api.post("/Users", form);
      }

      closeModal();
      setMessage(
        editingUser
          ? "User updated successfully."
          : "User created successfully."
      );
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    const action = user.isActive ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.patch(`/Users/${user.id}/status`, {
        isActive: !user.isActive,
      });

      setMessage(`User ${action}d successfully.`);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        `Unable to ${action} user.`
      );
    }
  };

  return (
    <main className="users-page">
      <header className="users-header">
        <div>
          <p className="users-eyebrow">HOTEL ADMINISTRATION</p>
          <h1>Users Management</h1>
          <p>Manage staff accounts, roles and account access.</p>
        </div>

        <button className="users-add-btn" onClick={openAdd}>
          + Add User
        </button>
      </header>

      {error && <div className="users-alert error">{error}</div>}
      {message && <div className="users-alert success">{message}</div>}

      <section className="users-stats">
        <article className="users-stat">
          <span>♙</span>
          <div><p>Total Users</p><h2>{counts.total}</h2></div>
        </article>

        <article className="users-stat">
          <span>✓</span>
          <div><p>Active Users</p><h2>{counts.active}</h2></div>
        </article>

        <article className="users-stat">
          <span>◷</span>
          <div><p>Inactive Users</p><h2>{counts.inactive}</h2></div>
        </article>

        <article className="users-stat">
          <span>♧</span>
          <div><p>Assigned Roles</p><h2>{counts.roles}</h2></div>
        </article>
      </section>

      <section className="users-panel">
        <div className="users-panel-heading">
          <div>
            <h2>Staff Accounts</h2>
            <p>View and manage registered hotel staff.</p>
          </div>
          <button className="users-refresh" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>

        <div className="users-filters">
          <input
            type="search"
            placeholder="Search name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="5">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="users-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="users-staff">
                        <span className="users-avatar">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong>{user.name}</strong>
                          <small>Staff ID: {user.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>{user.email}</td>
                    <td>
                      <span className="users-role">{user.role}</span>
                    </td>
                    <td>
                      <span className={`users-status ${user.isActive ? "active" : "inactive"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="users-actions">
                        <button onClick={() => openEdit(user)}>Edit</button>
                        <button
                          className={user.isActive ? "deactivate" : "activate"}
                          onClick={() => toggleStatus(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="users-footer">
          Showing {filteredUsers.length} of {users.length} users
        </footer>
      </section>

      {showModal && (
        <div className="users-modal-overlay" onClick={closeModal}>
          <section
            className="users-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-modal-header">
              <div>
                <h2>{editingUser ? "Edit User" : "Add New User"}</h2>
                <p>Enter the staff account details below.</p>
              </div>
              <button type="button" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Full Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter full name"
              />

              <label>Email Address</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Enter email"
              />

              {!editingUser && (
                <>
                  <label>Password</label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                  />
                </>
              )}

              <label>Role</label>
              <select
                required
                value={form.roleName}
                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>

              <div className="users-modal-actions">
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Users;