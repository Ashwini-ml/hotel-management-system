import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  CalendarDays,
  BedDouble,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import api from "../../services/Services.jsx";
import "./Maintenance.css";

const PAGE_SIZE = 5;

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getValue = (obj, camel, pascal) =>
  obj?.[camel] ?? obj?.[pascal];

const getDateOnly = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
};

export default function Maintenance() {
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    roomId: "",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // LOAD ROOMS AND MAINTENANCE RECORDS
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [roomResponse, maintenanceResponse] =
        await Promise.all([
          api.get("/Rooms"),
          api.get("/Maintenance")
        ]);

      setRooms(
        Array.isArray(roomResponse.data)
          ? roomResponse.data
          : []
      );

      setBlocks(
        Array.isArray(maintenanceResponse.data)
          ? maintenanceResponse.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load maintenance information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // GET ROOM NUMBER
  const getRoomNumber = (block) => {
    const room = getValue(block, "room", "Room");

    return (
      getValue(room, "roomNumber", "RoomNumber") ||
      `Room ID ${getValue(block, "roomId", "RoomId")}`
    );
  };

  // MANUAL COMPLETION TAKES PRIORITY OVER DATES
  const getStatus = (block) => {
    const isCompleted = getValue(
      block,
      "isCompleted",
      "IsCompleted"
    );

    if (isCompleted === true) {
      return "Completed";
    }

    const start = getDateOnly(
      getValue(block, "startDate", "StartDate")
    );

    if (!start) return "Unknown";

    if (today < start) return "Upcoming";

    return "Active";
  };

  // STATISTICS
  const stats = useMemo(() => {
    const counts = {
      total: blocks.length,
      active: 0,
      upcoming: 0,
      completed: 0
    };

    blocks.forEach((block) => {
      const status = getStatus(block);

      if (status === "Active") counts.active++;
      if (status === "Upcoming") counts.upcoming++;
      if (status === "Completed") counts.completed++;
    });

    return counts;
  }, [blocks]);

  // SEARCH AND CATEGORY FILTER
  const filteredBlocks = useMemo(() => {
    const term = search.toLowerCase().trim();

    return blocks.filter((block) => {
      const roomNumber =
        getRoomNumber(block).toLowerCase();

      const reason = (
        getValue(block, "reason", "Reason") || ""
      ).toLowerCase();

      const matchesSearch =
        roomNumber.includes(term) ||
        reason.includes(term);

      const status = getStatus(block);

      const matchesTab =
        activeTab === "All" ||
        status === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [blocks, search, activeTab]);

  // PAGINATION
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBlocks.length / PAGE_SIZE)
  );

  const paginatedBlocks = filteredBlocks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // FORM INPUT
  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value
    }));
  };

  // CREATE MAINTENANCE SCHEDULE
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.roomId ||
      !form.startDate ||
      !form.endDate
    ) {
      setError(
        "Please select a room and both maintenance dates."
      );
      return;
    }

    if (
      new Date(form.endDate) <=
      new Date(form.startDate)
    ) {
      setError("End date must be after start date.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/Maintenance", {
        roomId: Number(form.roomId),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim() || null
      });

      setSuccess(
        "Maintenance schedule created successfully."
      );

      setForm({
        roomId: "",
        startDate: "",
        endDate: "",
        reason: ""
      });

      setShowForm(false);
      setActiveTab("All");
      setSearch("");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to create maintenance schedule."
      );
    } finally {
      setSaving(false);
    }
  };

  // MARK MAINTENANCE AS COMPLETED
  const handleComplete = async (id) => {
    const confirmed = window.confirm(
      "Have you finished the maintenance and cleaning? Mark this schedule as completed?"
    );

    if (!confirmed) return;

    try {
      setCompletingId(id);
      setError("");
      setSuccess("");

      const response = await api.put(
        `/Maintenance/${id}/complete`
      );

      setSuccess(
        response.data?.message ||
        "Maintenance marked as completed successfully."
      );

      await loadData();

      setActiveTab("All");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to complete maintenance."
      );
    } finally {
      setCompletingId(null);
    }
  };

  // CATEGORY TABS
  const tabs = [
    { label: "All", count: stats.total },
    { label: "Upcoming", count: stats.upcoming },
    { label: "Active", count: stats.active },
    { label: "Completed", count: stats.completed }
  ];

  return (
    <main className="maintenance-page">

      {/* PAGE HEADER */}
      <div className="maintenance-heading">
        <div>
          <span className="maintenance-eyebrow">
            HOTEL OPERATIONS
          </span>

          <h1>Maintenance Management</h1>

          <p>
            Schedule and monitor room maintenance activities.
          </p>
        </div>

        <button
          className="maintenance-add-btn"
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm(true);
          }}
        >
          <Plus size={17} />
          Schedule Maintenance
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="maintenance-alert error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div className="maintenance-alert success">
          <CheckCircle size={17} />
          {success}
        </div>
      )}

      {/* STATISTICS */}
      <section className="maintenance-stats">

        <div className="maintenance-stat-card">
          <span className="maintenance-stat-icon">
            <Wrench size={20} />
          </span>

          <div>
            <span>Total Schedules</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="maintenance-stat-card">
          <span className="maintenance-stat-icon active">
            <Clock size={20} />
          </span>

          <div>
            <span>Active</span>
            <strong>{stats.active}</strong>
          </div>
        </div>

        <div className="maintenance-stat-card">
          <span className="maintenance-stat-icon upcoming">
            <CalendarDays size={20} />
          </span>

          <div>
            <span>Upcoming</span>
            <strong>{stats.upcoming}</strong>
          </div>
        </div>

        <div className="maintenance-stat-card">
          <span className="maintenance-stat-icon completed">
            <CheckCircle size={20} />
          </span>

          <div>
            <span>Completed</span>
            <strong>{stats.completed}</strong>
          </div>
        </div>

      </section>

      {/* MAINTENANCE HISTORY */}
      <section className="maintenance-table-card">

        <div className="maintenance-table-heading">
          <div>
            <h2>Maintenance History</h2>
            <p>
              All scheduled room maintenance activities
            </p>
          </div>

          <div className="maintenance-tools">

            <div className="maintenance-search">
              <Search size={16} />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room or reason..."
              />
            </div>

            <button
              className="maintenance-refresh"
              onClick={loadData}
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>

          </div>
        </div>

        {/* FILTER TABS */}
        <div className="maintenance-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              className={
                activeTab === tab.label
                  ? "maintenance-tab active"
                  : "maintenance-tab"
              }
              onClick={() => setActiveTab(tab.label)}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="maintenance-empty">
            Loading maintenance records...
          </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="maintenance-empty">
            <Wrench size={30} />

            <strong>
              No {activeTab === "All"
                ? ""
                : activeTab.toLowerCase() + " "}
              maintenance records found
            </strong>

            <span>
              Try another category or schedule new maintenance.
            </span>
          </div>
        ) : (
          <>
            <div className="maintenance-table-scroll">
              <table className="maintenance-table">

                <thead>
                  <tr>
                    <th>ROOM</th>
                    <th>REASON</th>
                    <th>START DATE</th>
                    <th>END DATE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedBlocks.map((block) => {
                    const id = getValue(block, "id", "Id");

                    const reason = getValue(
                      block,
                      "reason",
                      "Reason"
                    );

                    const status = getStatus(block);

                    return (
                      <tr key={id}>

                        <td>
                          <span className="maintenance-room">
                            <BedDouble size={16} />
                            {getRoomNumber(block)}
                          </span>
                        </td>

                        <td>
                          {reason || "General maintenance"}
                        </td>

                        <td>
                          {formatDate(
                            getValue(
                              block,
                              "startDate",
                              "StartDate"
                            )
                          )}
                        </td>

                        <td>
                          {formatDate(
                            getValue(
                              block,
                              "endDate",
                              "EndDate"
                            )
                          )}
                        </td>

                        <td>
                          <span
                            className={`maintenance-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* COMPLETION ACTION */}
                        <td>
                          {status !== "Completed" ? (
                            <button
                              className="maintenance-complete-btn"
                              onClick={() => handleComplete(id)}
                              disabled={completingId === id}
                            >
                              <CheckCircle size={15} />

                              {completingId === id
                                ? "Updating..."
                                : "Mark Completed"}
                            </button>
                          ) : (
                            <span className="maintenance-done-label">
                              <CheckCircle size={15} />
                              Completed
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>

            {/* PAGINATION */}
            <div className="maintenance-pagination">

              <span>
                Showing{" "}
                {(currentPage - 1) * PAGE_SIZE + 1}
                {" - "}
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredBlocks.length
                )}
                {" of "}
                {filteredBlocks.length} records
              </span>

              <div>
                <button
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => page - 1)
                  }
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <span className="maintenance-page-number">
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => page + 1)
                  }
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>

            </div>
          </>
        )}

      </section>

      {/* SCHEDULE MAINTENANCE MODAL */}
      {showForm && (
        <div
          className="maintenance-modal-overlay"
          onClick={() =>
            !saving && setShowForm(false)
          }
        >
          <section
            className="maintenance-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="maintenance-modal-header">
              <div>
                <span>ROOM OPERATIONS</span>
                <h2>Schedule Maintenance</h2>
              </div>

              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <label>
                Select Room *

                <select
                  name="roomId"
                  value={form.roomId}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Choose an active room
                  </option>

                  {rooms
                    .filter((room) =>
                      getValue(
                        room,
                        "isActive",
                        "IsActive"
                      )
                    )
                    .map((room) => (
                      <option
                        key={getValue(room, "id", "Id")}
                        value={getValue(room, "id", "Id")}
                      >
                        Room{" "}
                        {getValue(
                          room,
                          "roomNumber",
                          "RoomNumber"
                        )}
                        {" — "}
                        {getValue(
                          room,
                          "status",
                          "Status"
                        )}
                      </option>
                    ))}
                </select>
              </label>

              <div className="maintenance-date-grid">

                <label>
                  Start Date *

                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  End Date *

                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    min={form.startDate || undefined}
                    required
                  />
                </label>

              </div>

              <label>
                Maintenance Reason

                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Example: AC repair, plumbing, painting..."
                  maxLength={500}
                  rows={4}
                />
              </label>

              <div className="maintenance-modal-actions">

                <button
                  type="button"
                  className="maintenance-cancel-btn"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="maintenance-submit-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Schedule"}
                </button>

              </div>

            </form>
          </section>
        </div>
      )}

    </main>
  );
}