import { useEffect, useState } from "react";
import {
  ShieldCheck, Plus, Edit, Trash2, RefreshCw,
  Save, X, Lock
} from "lucide-react";
import api from "../../services/Services.jsx";
import "./RoleManagement.css";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const modules = [...new Set(permissions.map(p => p.module))];

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [roleResponse, permissionResponse] = await Promise.all([
        api.get("/RoleManagement"),
        api.get("/Permissions")
      ]);

      setRoles(roleResponse.data);
      setPermissions(permissionResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load roles and permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setRoleName("");
    setSelectedPermissions([]);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEdit(role) {
    setEditingId(role.id);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions || []);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function togglePermission(id) {
    setSelectedPermissions(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  }

  function toggleModule(module) {
    const moduleIds = permissions
      .filter(p => p.module === module)
      .map(p => p.id);

    const allSelected = moduleIds.every(id =>
      selectedPermissions.includes(id)
    );

    setSelectedPermissions(current =>
      allSelected
        ? current.filter(id => !moduleIds.includes(id))
        : [...new Set([...current, ...moduleIds])]
    );
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!roleName.trim()) {
      setError("Please enter a role name.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: roleName.trim(),
        permissionIds: selectedPermissions
      };

      if (editingId) {
        await api.put(`/RoleManagement/${editingId}`, payload);
        setMessage("Role updated successfully.");
      } else {
        await api.post("/RoleManagement", payload);
        setMessage("Role created successfully.");
      }

      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save role."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    if (!window.confirm(`Delete the ${role.name} role?`)) return;

    try {
      setError("");
      await api.delete(`/RoleManagement/${role.id}`);
      setMessage("Role deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to delete this role."
      );
    }
  }

  return (
    <div className="role-page">
      <div className="role-header">
        <div>
          <span className="role-eyebrow">ADMINISTRATION</span>
          <h1>Role Management</h1>
          <p>Manage system roles and control module permissions.</p>
        </div>

        <button className="role-primary-btn" onClick={openCreate}>
          <Plus size={18} />
          Create Role
        </button>
      </div>

      {message && (
        <div className="role-success">{message}</div>
      )}

      {error && (
        <div className="role-error">{error}</div>
      )}

      <div className="role-summary">
        <div className="role-summary-icon">
          <ShieldCheck size={25} />
        </div>
        <div>
          <span>Total Roles</span>
          <strong>{roles.length}</strong>
        </div>
      </div>

      <div className="role-section">
        <div className="role-section-heading">
          <div>
            <h2>System Roles</h2>
            <p>View and manage role permissions.</p>
          </div>

          <button className="role-refresh" onClick={loadData}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="role-empty">Loading roles...</p>
        ) : roles.length === 0 ? (
          <p className="role-empty">No roles found.</p>
        ) : (
          <div className="role-table-wrapper">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Permissions</th>
                  <th>Access Type</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {roles.map(role => (
                  <tr key={role.id}>
                    <td>
                      <div className="role-name-cell">
                        <ShieldCheck size={19} />
                        <strong>{role.name}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="role-count">
                        {(role.permissions || []).length}
                      </span>
                    </td>

                    <td>
                      <span className={`role-badge ${
                        role.name === "Admin" ? "admin" : "standard"
                      }`}>
                        {role.name === "Admin" ? "Full Access" : "Custom Role"}
                      </span>
                    </td>

                    <td>
                      <div className="role-actions">
                        <button
                          title="Edit permissions"
                          onClick={() => openEdit(role)}
                        >
                          <Edit size={17} />
                        </button>

                        <button
                          title="Delete role"
                          className="delete"
                          disabled={role.name === "Admin"}
                          onClick={() => handleDelete(role)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="role-modal-overlay">
          <form className="role-modal" onSubmit={handleSave}>
            <div className="role-modal-header">
              <div>
                <h2>{editingId ? "Edit Role" : "Create New Role"}</h2>
                <p>Configure role access and permissions.</p>
              </div>

              <button
                type="button"
                className="role-close"
                onClick={() => setShowForm(false)}
              >
                <X size={21} />
              </button>
            </div>

            <label className="role-field-label">Role Name</label>
            <input
              className="role-input"
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              placeholder="Enter role name"
              required
            />

            <div className="permission-heading">
              <h3>Module Permissions</h3>
              <span>{selectedPermissions.length} selected</span>
            </div>

            <div className="permission-list">
              {modules.map(module => {
                const modulePermissions = permissions.filter(
                  p => p.module === module
                );

                const allSelected = modulePermissions.every(p =>
                  selectedPermissions.includes(p.id)
                );

                return (
                  <div className="permission-module" key={module}>
                    <div className="permission-module-heading">
                      <strong>{module}</strong>

                      <label>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleModule(module)}
                        />
                        Select all
                      </label>
                    </div>

                    <div className="permission-options">
                      {modulePermissions.map(permission => (
                        <label
                          className="permission-option"
                          key={permission.id}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                          />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <div className="role-error">{error}</div>}

            <div className="role-modal-footer">
              <button
                type="button"
                className="role-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="role-primary-btn"
                disabled={saving}
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save Role"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}