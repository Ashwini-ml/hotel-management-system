import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/Services.jsx";
import "./Dashboard.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const number = (value) =>
  (Number(value) || 0).toLocaleString("en-IN");

const dateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dateOnly = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const roomStatuses = [
  { key: "available", label: "Available", color: "#347f78" },
  { key: "occupied", label: "Occupied", color: "#17343b" },
  { key: "reserved", label: "Reserved", color: "#c5a36a" },
  { key: "cleaning", label: "Cleaning", color: "#70a7c4" },
  { key: "maintenance", label: "Maintenance", color: "#8a80b7" },
  { key: "outOfOrder", label: "Out of order", color: "#c8796c" },
];

const periods = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

function StatusBadge({ status }) {
  const value = String(status || "Unknown");

  return (
    <span
      className={`dashboard-status-badge status-${value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`}
    >
      {value}
    </span>
  );
}

function EmptyState({ children }) {
  return <p className="dashboard-empty">{children}</p>;
}

function KpiCard({ label, value, icon, note, color }) {
  return (
    <article className="dashboard-card" style={{ "--kpi-color": color }}>
      <div className="dashboard-card-top">
        <p className="dashboard-card-title">{label}</p>
        <div className="dashboard-icon">
          <span aria-hidden="true">{icon}</span>
        </div>
      </div>
      <h2>{value}</h2>
      <p className="dashboard-card-note">
        <span className="dashboard-note-dot" />
        {note}
      </p>
    </article>
  );
}
const getDashboardUser = () => {
  try {
    const rawUser =
      localStorage.getItem("hotelUser") ||
      sessionStorage.getItem("hotelUser");

    return rawUser ? JSON.parse(rawUser) : {};
  } catch {
    return {};
  }
};

function Dashboard() {
  console.log("dashboard started")
  const dashboardUser = getDashboardUser();

const dashboardUserName =
  dashboardUser.name ||
  dashboardUser.Name ||
  "Hotel User";

const dashboardUserRole =
  dashboardUser.role ||
  dashboardUser.Role ||
  dashboardUser.roleName ||
  "User";

const dashboardInitials = dashboardUserName
  .split(" ")
  .filter(Boolean)
  .map((word) => word[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStats = useCallback(async (selectedPeriod = period) => {
    setLoading(true);

    try {
      const response = await api.get("/Dashboard/summary", {
        
        params: { period: selectedPeriod },
      });
      console.log("DASHBOARD DATA:", response.data);

      if (!response.data || typeof response.data !== "object") {
        throw new Error("The dashboard API returned invalid data.");
      }

      setStats(response.data);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard API error:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          (err.response?.status
            ? `Dashboard API returned HTTP ${err.response.status}.`
            : "Cannot connect to the dashboard API.")
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadStats(period);

    const timer = window.setInterval(() => {
      loadStats(period);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [loadStats, period]);

  const totalRooms = Number(stats?.totalRooms) || 0;
  const occupiedRooms = Number(stats?.occupiedRooms) || 0;
  const occupancyRate =
    stats?.occupancyRate != null
      ? Number(stats.occupancyRate) || 0
      : totalRooms
        ? (occupiedRooms / totalRooms) * 100
        : 0;

  const roomStatus = stats?.roomStatus || {
    available: stats?.availableRooms || 0,
    occupied: stats?.occupiedRooms || 0,
    reserved: stats?.reservedRooms || 0,
    cleaning: stats?.cleaningRooms || 0,
    maintenance: stats?.maintenanceRooms || 0,
    outOfOrder: stats?.outOfOrderRooms || 0,
  };

  const chartTotal = roomStatuses.reduce(
    (sum, item) => sum + (Number(roomStatus[item.key]) || 0),
    0
  );

  let cumulative = 0;
  const donutSegments = roomStatuses.map((item) => {
    const count = Number(roomStatus[item.key]) || 0;
    const start = cumulative;
    cumulative += chartTotal > 0 ? (count / chartTotal) * 100 : 0;

    return {
      ...item,
      count,
      start,
      end: cumulative,
    };
  });

  const donutGradient =
    chartTotal > 0
      ? `conic-gradient(${donutSegments
          .map(
            (item) =>
              `${item.color} ${item.start}% ${item.end}%`
          )
          .join(", ")})`
      : "#e6eae4";

  const revenue = stats?.revenueOverview || [];
  const maxRevenue = Math.max(
    1,
    ...revenue.map((item) => Number(item.collectedRevenue) || 0)
  );

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const goToBookingManagement = () => {
    navigate("/bookings");
  };

  

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">✦</div>
          <div>
            <h2>
              The Grand <span>Retreat</span>
            </h2>
            <p>HOTEL MANAGEMENT</p>
          </div>
        </div>

        <div className="dashboard-admin">
  <div className="dashboard-avatar">
    {dashboardInitials}
  </div>

  <div>
    <strong>{dashboardUserName}</strong>
    <span>{dashboardUserRole}</span>
  </div>
</div>
        
      </header>

      <section className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">YOUR PROPERTY AT A GLANCE</p>
          <h1>
            Hotel <span>Dashboard</span>
          </h1>
          <p className="dashboard-subtitle">
            Monitor room inventory, guest activity and hotel revenue.
          </p>
          <p className="dashboard-date">◷ {dateLabel}</p>
        </div>

        <div className="dashboard-heading-actions">
          <button
  type="button"
  className="dashboard-button dashboard-new-booking"
  onClick={goToBookingManagement}
>
  + New Booking
</button>

          <button
            type="button"
            className="dashboard-button"
            onClick={() => loadStats(period)}
            disabled={loading}
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
          >
            {loading ? "↻" : "⟳"}
          </button>
        </div>
      </section>

      {error && (
        <div className="dashboard-warning" role="alert">
          <span>
            {error}
            {stats ? " Showing the last successfully loaded data." : ""}
          </span>
          <button
            type="button"
            onClick={() => loadStats(period)}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      )}

      {!stats && loading && (
        <section className="dashboard-message">
          <div className="dashboard-spinner" />
          <h2>Preparing your dashboard</h2>
          <p>Loading hotel statistics...</p>
        </section>
      )}

      {!stats && !loading && error && (
        <section className="dashboard-message dashboard-error">
          <h2>Dashboard data unavailable</h2>
          <p>Check that the backend is running and the summary endpoint builds.</p>
          <button
            type="button"
            className="dashboard-button"
            onClick={() => loadStats(period)}
          >
            Try Again
          </button>
        </section>
      )}

      {stats && (
        <>
          <section className="dashboard-section">
            <div className="dashboard-section-title">
              <h2>Room Inventory</h2>
              <span>Live room status</span>
            </div>

            <div className="dashboard-grid">
              <KpiCard
                label="Total Rooms"
                value={number(stats.totalRooms)}
                icon="▦"
                note="Active room inventory"
                color="#347f78"
              />
              <KpiCard
                label="Available"
                value={number(stats.availableRooms)}
                icon="✧"
                note="Ready for guests"
                color="#347f78"
              />
              <KpiCard
                label="Occupied"
                value={number(stats.occupiedRooms)}
                icon="▣"
                note="Currently occupied"
                color="#17343b"
              />
              <KpiCard
                label="Cleaning"
                value={number(stats.cleaningRooms)}
                icon="✦"
                note="Being prepared"
                color="#70a7c4"
              />
              <KpiCard
                label="Maintenance"
                value={number(stats.maintenanceRooms)}
                icon="⚙"
                note="Under maintenance"
                color="#8a80b7"
              />
              <KpiCard
              label="Active Bookings"
              value={number(stats.activeBookings)}
              icon="▤"
              note="Confirmed + Checked-in"
              color="#c5a36a"
              />
            </div>
          </section>


          <section className="dashboard-section">
            <div className="dashboard-section-title">
              <h2>Today's Operations</h2>
              <span>Daily performance snapshot</span>
            </div>

            <div className="dashboard-activity-grid">
              <KpiCard
                label="Today's Check-ins"
                value={number(stats.arrivals)}
                icon="↘"
                note="Expected arrivals"
                color="#347f78"
              />
              <KpiCard
                label="Today's Check-outs"
                value={number(stats.departures)}
                icon="↗"
                note="Expected departures"
                color="#c5a36a"
              />
              <KpiCard
                label="Today's Revenue"
                value={money(stats.revenueToday)}
                icon="₹"
                note="Recorded payments received"
                color="#347f78"
              />
              <KpiCard
                label="Upcoming Bookings"
                value={number(stats.upcomingBookings)}
                icon="▤"
                note="Future confirmed stays"
                color="#8a80b7"
              />
              <KpiCard
                label="Occupancy Rate"
                value={`${occupancyRate.toFixed(1)}%`}
                icon="◉"
                note="Occupied / active rooms"
                color="#17343b"
              />
            </div>
          </section>

         <section className="dashboard-panels">
  {/* Room Status */}
  <article className="dashboard-panel">
    <div className="dashboard-panel-heading">
      <div>
        <h2>Room Status</h2>
        <p>Distribution across all active rooms</p>
      </div>

      <span className="dashboard-live">
        <span /> LIVE
      </span>
    </div>

    <div className="dashboard-occupancy">
      <div
        className="dashboard-donut"
        style={{
          background: donutGradient,
          "--occupancy-angle": `${occupancyRate * 3.6}deg`,
        }}
        role="img"
        aria-label={`Room status distribution across ${chartTotal} rooms`}
      >
        <div className="dashboard-donut-center">
          <strong>{number(chartTotal)}</strong>
          <span>Total Rooms</span>
        </div>
      </div>

      <div className="dashboard-legend">
        {donutSegments.map((item) => (
          <div key={item.key}>
            <span
              className="legend-dot"
              style={{ background: item.color }}
            />
            <span>{item.label}</span>
            <strong>{number(item.count)}</strong>
          </div>
        ))}
      </div>
    </div>
  </article>

  {/* Revenue Overview */}
  <article className="dashboard-panel">
    <div className="dashboard-panel-heading">
      <div>
        <h2>Revenue Overview</h2>
        <p>Actual recorded payments by day</p>
      </div>

      <select
        className="dashboard-period-select"
        value={period}
        onChange={(event) => setPeriod(event.target.value)}
        aria-label="Revenue period"
      >
        {periods.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>

    <div className="dashboard-revenue-chart">
      {revenue.length === 0 ? (
        <EmptyState>
          No payment data is available for this period.
        </EmptyState>
      ) : (
        <>
          <div className="revenue-chart-summary">
            <div>
              <span>Total revenue shown</span>
              <strong>
                {money(
                  revenue.reduce(
                    (total, item) =>
                      total +
                      (Number(item.collectedRevenue) || 0),
                    0
                  )
                )}
              </strong>
            </div>

            <span className="revenue-chart-badge">
              ● Recorded payments
            </span>
          </div>

          <div className="revenue-bars">
            {revenue.map((item) => {
              const amount =
                Number(item.collectedRevenue) || 0;

              const height =
                maxRevenue > 0
                  ? (amount / maxRevenue) * 100
                  : 0;

              return (
                <div
                  className="revenue-bar-item"
                  key={item.date}
                  title={`${dateOnly(item.date)}: ${money(amount)}`}
                >
                  <div className="revenue-bar-value">
                    {amount > 0 ? money(amount) : "—"}
                  </div>

                  <div className="revenue-bar-area">
                    <div
                      className="revenue-bar-fill"
                      style={{
                        height: `${Math.max(
                          amount > 0 ? 5 : 0,
                          height
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="revenue-bar-date">
                    {dateOnly(item.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>

    
  </article>
</section>

          <section className="dashboard-panels">
            <article className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Today's Arrivals</h2>
                  <p>Guests expected to check in</p>
                </div>
                <button
                  type="button"
                  className="dashboard-text-button"
                  onClick={goToBookingManagement}
                >
                  View All →
                </button>
              </div>

              {!stats.todayArrivals?.length ? (
                <EmptyState>No arrivals scheduled for today.</EmptyState>
              ) : (
                <div className="dashboard-list">
                  {stats.todayArrivals.map((item) => (
                    <div className="dashboard-list-row" key={item.id}>
                      <div className="dashboard-list-avatar">
                        {(item.guest || "G").charAt(0).toUpperCase()}
                      </div>
                      <div className="dashboard-list-main">
                        <strong>{item.guest}</strong>
                        <span>
                          Room {item.roomNumber || "—"} · {item.roomType}
                        </span>
                      </div>
                      <div className="dashboard-list-end">
                        <strong>{dateTime(item.time)}</strong>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Today's Departures</h2>
                  <p>Guests expected to check out</p>
                </div>
                <button
                  type="button"
                  className="dashboard-text-button"
                  onClick={() => navigate("/checkout")}
                >
                  View All →
                </button>
              </div>

              {!stats.todayDepartures?.length ? (
                <EmptyState>No departures scheduled for today.</EmptyState>
              ) : (
                <div className="dashboard-list">
                  {stats.todayDepartures.map((item) => (
                    <div className="dashboard-list-row" key={item.id}>
                      <div className="dashboard-list-avatar">
                        {(item.guest || "G").charAt(0).toUpperCase()}
                      </div>
                      <div className="dashboard-list-main">
                        <strong>{item.guest}</strong>
                        <span>
                          Room {item.roomNumber || "—"} · {item.roomType}
                        </span>
                      </div>
                      <div className="dashboard-list-end">
                        <strong>{dateTime(item.time)}</strong>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="dashboard-panel dashboard-recent-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>Recent Bookings</h2>
                <p>Your five latest reservations</p>
              </div>
              <button
                type="button"
                className="dashboard-text-button"
                onClick={goToBookingManagement}
              >
                View All →
              </button>
            </div>

            {!stats.recentBookings?.length ? (
              <EmptyState>No bookings found.</EmptyState>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBookings.map((item) => (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td>{item.guest}</td>
                        <td>
                          {item.roomNumber || "—"}
                          <span className="dashboard-table-subtitle">
                            {item.roomType}
                          </span>
                        </td>
                        <td>{dateOnly(item.checkInDate)}</td>
                        <td>{dateOnly(item.checkOutDate)}</td>
                        <td>{money(item.totalAmount)}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <footer className="dashboard-footer">
        <span>✦ The Grand Retreat</span>
        <span>
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN")}`
            : "Waiting for data"}
        </span>
      </footer>
    </main>
  );
}
export default Dashboard;
