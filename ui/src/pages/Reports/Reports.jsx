
import { useEffect, useMemo, useState } from "react";
import api from "../../services/Services.jsx";
import "./Reports.css";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const tabs = [
  { id: "owner", label: "Owner Reports" },
  { id: "financial", label: "Financial Reports" },
  { id: "tax", label: "Tax Reports" },
  { id: "bookings", label: "Booking Reports" },
  { id: "guests", label: "Guest Reports" },
  { id: "rooms", label: "Room Reports" },
  { id: "housekeeping", label: "Housekeeping Reports" },
  { id: "custom", label: "Custom Reports" },
];

const reportTypes = {
  financial: "payments",
  bookings: "bookings",
  guests: "guests",
  rooms: "rooms",
  housekeeping: "housekeeping",
  
  custom: "bookings",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const fmtDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};


const nextDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

function Reports() {
  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  const startDateString = [
    thirtyDaysAgo.getFullYear(),
    String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0"),
    String(thirtyDaysAgo.getDate()).padStart(2, "0"),
  ].join("-");

  const [activeTab, setActiveTab] = useState("owner");
  const [from, setFrom] = useState(startDateString);
  const [to, setTo] = useState(todayString);
  const [roomTypeId, setRoomTypeId] = useState("");

  const [roomTypes, setRoomTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [roomRevenue, setRoomRevenue] = useState([]);
  const [topGuests, setTopGuests] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [taxRows, setTaxRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    api
      .get("/Reports/room-types")
      .then((res) => {
        setRoomTypes(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Could not load room types:", err);
      });
  }, []);

  async function generateReport() {
    if (!from || !to || to < from) {
      setError("Please select a valid date range.");
      return;
    }

    setLoading(true);
    setError("");

    const params = {
      from: `${from}T00:00:00`,
      to: `${nextDate(to)}T00:00:00`,
    };

    if (roomTypeId) {
      params.roomTypeId = Number(roomTypeId);
    }

    try {
      if (activeTab === "owner") {
        const [summaryRes, trendRes, revenueRes, guestsRes] =
          await Promise.all([
            api.get("/Reports/owner-summary", { params }),
            api.get("/Reports/revenue-trend", { params }),
            api.get("/Reports/room-type-revenue", { params }),
            api.get("/Reports/top-guests", { params }),
          ]);

        setSummary(summaryRes.data);
        setTrend(Array.isArray(trendRes.data) ? trendRes.data : []);
        setRoomRevenue(
          Array.isArray(revenueRes.data) ? revenueRes.data : []
        );
        setTopGuests(
          Array.isArray(guestsRes.data) ? guestsRes.data : []
        );
      } else if (activeTab === "tax") {
        const res = await api.get("/Reports/tax-report", { params });

        setTaxRows(Array.isArray(res.data) ? res.data : []);
        setTableRows([]);
      } else {
        const res = await api.get("/Reports/table", {
          params: {
            ...params,
            type: reportTypes[activeTab] || "bookings",
          },
        });

        setTableRows(Array.isArray(res.data) ? res.data : []);
        setTaxRows([]);
      }

      setGenerated(true);
    } catch (err) {
      console.error("Report generation failed:", err);

      setError(
        err.response?.data?.message ||
          `Could not generate report (${
            err.response?.status || "network error"
          }). Check the API and selected dates.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateReport();
   
  }, [activeTab]);

  const visibleTrend = useMemo(() => trend.slice(-30), [trend]);

  const maxTrend = Math.max(
    1,
    ...visibleTrend.map((item) => Number(item.revenue) || 0)
  );

  const maxRoomRevenue = Math.max(
    1,
    ...roomRevenue.map((item) => Number(item.revenue) || 0)
  );

  const taxTotals = useMemo(
    () =>
      taxRows.reduce(
        (totals, row) => ({
          subtotal:
            totals.subtotal +
            (Number(row.subtotalExcludingGst) || 0),
          gst:
            totals.gst +
            (Number(row.gstAmount) || 0),
          total:
            totals.total +
            (Number(row.totalAmount) || 0),
        }),
        { subtotal: 0, gst: 0, total: 0 }
      ),
    [taxRows]
  );

  function downloadCsv(filename, headers, rows) {
    const escape = (value) => {
      let text = value == null ? "" : String(value);

      if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.map(escape).join(","),
      ...rows.map((row) => row.map(escape).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function getExportData() {
    if (activeTab === "owner" && summary) {
      return {
        headers: ["Metric", "Value"],
        rows: [
          ["Total Revenue", summary.totalRevenue],
          ["Previous Revenue", summary.previousTotalRevenue],
          ["Total Bookings", summary.totalBookings],
          ["Total Guests", summary.totalGuests],
          ["Average Occupancy (%)", summary.averageOccupancy],
          ["Payments Received", summary.totalPaymentsReceived],
          ["Pending Payments (estimate)", summary.pendingPayments],
        ],
      };
    }

    if (activeTab === "tax") {
      return {
        headers: [
          "Booking ID",
          "Guest",
          "Room",
          "Status",
          "Created At",
          "Subtotal Excluding GST",
          "GST Percentage",
          "GST Amount",
          "Total Amount",
        ],
        rows: taxRows.map((row) => [
          row.bookingId,
          row.guest,
          row.room,
          row.status,
          row.createdAt ? fmtDate(row.createdAt) : "",
          row.subtotalExcludingGst,
          row.gstPercentage,
          row.gstAmount,
          row.totalAmount,
        ]),
      };
    }

    const headers = tableRows.length
      ? Object.keys(tableRows[0])
      : ["Message"];

    const rows = tableRows.length
      ? tableRows.map((item) => headers.map((key) => item[key] ?? ""))
      : [["No records available"]];

    return { headers, rows };
  }

  function exportCurrentReport() {
    const { headers, rows } = getExportData();

    downloadCsv(
      `${activeTab}-report-${from}-to-${to}.csv`,
      headers,
      rows
    );
  }

  function exportExcel() {
    const { headers, rows } = getExportData();

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    XLSX.writeFile(
      workbook,
      `${activeTab}-report-${from}-to-${to}.xlsx`
    );
  }

  function exportPdf() {
    const { headers, rows } = getExportData();

    const doc = new jsPDF({
      orientation: headers.length > 6 ? "landscape" : "portrait",
    });

    doc.setFontSize(16);
    doc.text("Hotel Management System", 14, 16);

    doc.setFontSize(11);
    doc.text(
      tabs.find((tab) => tab.id === activeTab)?.label || "Report",
      14,
      24
    );

    doc.setFontSize(9);
    doc.text(`Period: ${from} to ${to}`, 14, 31);

    autoTable(doc, {
      head: [headers.map(String)],
      body: rows.map((row) =>
        row.map((value) => (value == null ? "" : String(value)))
      ),
      startY: 37,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [23, 52, 59],
      },
      alternateRowStyles: {
        fillColor: [246, 246, 241],
      },
    });

    doc.save(`${activeTab}-report-${from}-to-${to}.pdf`);
  }

  function exportBookingsCsv() {
    const params = new URLSearchParams({
      from: `${from}T00:00:00`,
      to: `${nextDate(to)}T00:00:00`,
    });

    if (roomTypeId) {
      params.set("roomTypeId", roomTypeId);
    }

    const baseURL = api.defaults?.baseURL || "/api";
    const url = `${baseURL}/Reports/bookings/csv?${params.toString()}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const statusCounts = summary?.roomStatus || {};

  const statusTotal = Object.values(statusCounts).reduce(
    (total, value) => total + (Number(value) || 0),
    0
  );

  const statusColors = {
    available: "#347f78",
    occupied: "#17343b",
    reserved: "#c5a36a",
    cleaning: "#70a7c4",
    maintenance: "#8a80b7",
    outOfOrder: "#c8796c",
  };

  const statusGradient = (() => {
    if (!statusTotal) return "#e6eae4";

    let offset = 0;

    return `conic-gradient(${Object.entries(statusCounts)
      .map(([key, value]) => {
        const start = offset;
        offset += ((Number(value) || 0) / statusTotal) * 100;

        return `${statusColors[key] || "#999"} ${start}% ${offset}%`;
      })
      .join(", ")})`;
  })();

  const kpis = summary
    ? [
        {
          label: "Total Revenue",
          value: money(summary.totalRevenue),
          change: summary.revenueChangePercent,
        },
        {
          label: "Total Bookings",
          value: summary.totalBookings,
          change: summary.bookingChangePercent,
        },
        {
          label: "Total Guests",
          value: summary.totalGuests,
          change: summary.guestChangePercent,
        },
        {
          label: "Average Occupancy",
          value: `${summary.averageOccupancy ?? 0}%`,
          change: null,
        },
        {
          label: "Payments Received",
          value: money(summary.totalPaymentsReceived),
          change: summary.paymentChangePercent,
        },
        {
          label: "Pending Payments",
          value: money(summary.pendingPayments),
          change: summary.pendingPaymentChangePercent,
        },
      ]
    : [];

  const quickExports = [
    "Daily Summary",
    "Monthly Revenue",
    "GST Sales Report",
    "Guest List",
    "Room Occupancy",
    "Payment Summary",
    "Audit Report",
  ];

  return (
    <main className="reports-page">
      <header className="reports-header">
        <div>
          <p className="reports-eyebrow">HOTEL ANALYTICS</p>
          <h1>
            Reports <span>&amp; Analytics</span>
          </h1>
          <p>
            Review performance, bookings, guest activity and finances.
          </p>
        </div>

        <button
          className="reports-primary-button"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? "Generating..." : "↻ Generate Report"}
        </button>
      </header>

      <section className="reports-filters">
        <label>
          From
          <input
            type="date"
            value={from}
            max={to || todayString}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={to}
            min={from}
            max={todayString}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>

        <label>
          Quick Filter · Room Type
          <select
            value={roomTypeId}
            onChange={(event) => setRoomTypeId(event.target.value)}
          >
            <option value="">All Room Types</option>
            {roomTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <div className="reports-export-buttons">
          <button
            className="reports-secondary-button"
            onClick={exportCurrentReport}
            disabled={!generated || loading}
          >
            ↓ Export CSV
          </button>

          <button
            className="reports-secondary-button"
            onClick={exportExcel}
            disabled={!generated || loading}
          >
            ↓ Export Excel
          </button>

          <button
            className="reports-secondary-button"
            onClick={exportPdf}
            disabled={!generated || loading}
          >
            ↓ Export PDF
          </button>
        </div>
      </section>

      <nav className="reports-tabs" aria-label="Report categories">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="reports-error" role="alert">
          {error}
        </div>
      )}

      {activeTab === "owner" ? (
        <>
          <section className="reports-kpi-grid">
            {kpis.map((item) => {
              const change = Number(item.change) || 0;
              const positive =
                item.label === "Pending Payments"
                  ? change <= 0
                  : change >= 0;

              return (
                <article className="reports-kpi-card" key={item.label}>
                  <p>{item.label}</p>
                  <h2>{item.value}</h2>

                  {item.change !== null ? (
                    <span
                      className={positive ? "change-up" : "change-down"}
                    >
                      {change >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(change).toFixed(1)}%
                      <small> vs previous period</small>
                    </span>
                  ) : (
                    <span className="reports-neutral-change">
                      Current room snapshot
                    </span>
                  )}
                </article>
              );
            })}
          </section>

          <section className="reports-chart-grid">
            <article className="reports-panel reports-wide-panel">
              <div className="reports-panel-heading">
                <div>
                  <h2>Revenue Trend</h2>
                  <p>Daily booking revenue in selected period</p>
                </div>
              </div>

              {loading ? (
                <p className="reports-empty">Loading revenue trend...</p>
              ) : visibleTrend.length === 0 ? (
                <p className="reports-empty">
                  No revenue trend data for this period.
                </p>
              ) : (
                <div className="reports-bar-chart">
                  {visibleTrend.map((item, index) => (
                    <div
                      className="reports-bar-column"
                      key={item.date || index}
                      title={`${fmtDate(item.date)} · ${money(item.revenue)}`}
                    >
                      <div className="reports-bar-track">
                        <div
                          className="reports-bar"
                          style={{
                            height: `${Math.max(
                              Number(item.revenue) > 0 ? 3 : 0,
                              ((Number(item.revenue) || 0) / maxTrend) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span>
                        {item.date
                          ? new Date(item.date).getDate()
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="reports-panel">
              <h2>Room Occupancy</h2>
              <p className="reports-panel-description">
                Current room status
              </p>

              <div className="reports-donut-row">
                <div
                  className="reports-donut"
                  style={{ background: statusGradient }}
                >
                  <div>
                    <strong>{statusTotal}</strong>
                    <span>Rooms</span>
                  </div>
                </div>

                <div className="reports-legend">
                  {Object.entries(statusCounts).map(([key, value]) => (
                    <div key={key}>
                      <i
                        style={{
                          background: statusColors[key] || "#999",
                        }}
                      />
                      <span>
                        {key === "outOfOrder"
                          ? "Out of order"
                          : key}
                      </span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="reports-panel">
              <h2>Revenue by Room Type</h2>
              <p className="reports-panel-description">
                Booked revenue by category
              </p>

              {roomRevenue.length === 0 ? (
                <p className="reports-empty">
                  No room revenue data available.
                </p>
              ) : (
                <div className="reports-horizontal-bars">
                  {roomRevenue.map((item) => (
                    <div
                      className="reports-horizontal-item"
                      key={item.roomType}
                    >
                      <div>
                        <span>{item.roomType}</span>
                        <strong>{money(item.revenue)}</strong>
                      </div>
                      <div className="reports-horizontal-track">
                        <i
                          style={{
                            width: `${
                              (Number(item.revenue) / maxRoomRevenue) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </article>

            <article className="reports-panel">
              <h2>Top 10 Revenue Generating Guests</h2>
              <p className="reports-panel-description">
                Ranked by booking total
              </p>

              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Bookings</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topGuests.map((guest, index) => (
                      <tr key={guest.guestId ?? index}>
                        <td>
                          <span className="reports-rank">
                            {index + 1}
                          </span>
                          {guest.guest}
                        </td>
                        <td>{guest.bookings}</td>
                        <td>{money(guest.revenue)}</td>
                      </tr>
                    ))}

                    {!topGuests.length && (
                      <tr>
                        <td colSpan="3">
                          No guest data for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
            </article>
          </section>

          <section className="reports-panel">
            <div className="reports-panel-heading">
              <div>
                <h2>Quick Export</h2>
                <p>
                  Download the currently selected report as CSV, which opens
                  in Excel.
                </p>
              </div>
            </div>

            <div className="reports-export-grid">
              {quickExports.map((label) => (
                <button
                  key={label}
                  onClick={exportCurrentReport}
                  disabled={!generated || loading}
                >
                  <span>↓</span>
                  <strong>{label}</strong>
                  <small>Export CSV</small>
                </button>
              ))}
            </div>

            
          </section>
        </>
      ) : activeTab === "tax" ? (
        <section className="reports-panel reports-data-panel">
          <div className="reports-panel-heading">
            <div>
              <h2>GST Tax Report</h2>
              <p>
                Booking totals and GST breakdown for the selected period.
              </p>
            </div><div className="reports-panel-actions">
              <button
                className="reports-secondary-button"
                onClick={generateReport}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Tax Report"}
              </button>

              <button
                className="reports-secondary-button"
                onClick={exportCurrentReport}
                disabled={!generated || loading}
              >
                ↓ Export Tax CSV
              </button>
            </div>
          </div>

          <section className="reports-kpi-grid">
            <article className="reports-kpi-card">
              <p>Bookings</p>
              <h2>{taxRows.length}</h2>
              <span className="reports-neutral-change">
                Matching selected dates
              </span>
            </article>

            <article className="reports-kpi-card">
              <p>Taxable Subtotal</p>
              <h2>{money(taxTotals.subtotal)}</h2>
              <span className="reports-neutral-change">
                Excluding GST
              </span>
            </article>

            <article className="reports-kpi-card">
              <p>Total GST</p>
              <h2>{money(taxTotals.gst)}</h2>
              <span className="reports-neutral-change">
                Calculated GST amount
              </span>
            </article>

            <article className="reports-kpi-card">
              <p>Total Amount</p>
              <h2>{money(taxTotals.total)}</h2>
              <span className="reports-neutral-change">
                Including calculated GST
              </span>
            </article>
          </section>{loading ? (
            <p className="reports-empty">
              Generating tax report...
            </p>
          ) : !taxRows.length ? (
            <p className="reports-empty">
              {generated
                ? "No tax records found for this period."
                : "Select a date range and generate the tax report."}
            </p>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Subtotal</th>
                    <th>GST %</th>
                    <th>GST Amount</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRows.map((row, index) => (
                    <tr key={row.bookingId ?? index}>
                      <td>#{row.bookingId ?? "—"}</td>
                      <td>{row.guest || "Unknown"}</td>
                      <td>{row.room || "Unassigned"}</td>
                      <td>{row.status || "—"}</td>
                      <td>{fmtDate(row.createdAt)}</td>
                      <td>{money(row.subtotalExcludingGst)}</td>
                      <td>{Number(row.gstPercentage) || 0}%</td>
                      <td>{money(row.gstAmount)}</td>
                      <td>{money(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="5">Total</th>
                    <th>{money(taxTotals.subtotal)}</th>
                    <th>—</th>
                    <th>{money(taxTotals.gst)}</th>
                    <th>{money(taxTotals.total)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="reports-tax-note">
            GST is estimated from each booking's total using the current hotel
            GST setting. If the booking total does not include GST, or the rate
            has changed since the booking was created, this calculation may not
            reflect the actual historical tax. Verify before filing tax returns.
          </p>
        </section>
      ) : (
  <section className="reports-panel reports-data-panel">
    <div className="reports-panel-heading">
      <div>
        <h2>
          {tabs.find((tab) => tab.id === activeTab)?.label}
        </h2>
        <p>Database records for the selected report period.</p>
      </div>

      <div className="reports-panel-actions">
        {activeTab === "bookings" && (
          <button
            className="reports-secondary-button"
            onClick={exportBookingsCsv}
          >
            ↓ Export CSV
          </button>
        )}
      </div>
    </div>

    {loading ? (
      <p className="reports-empty">Loading report...</p>
    ) : !tableRows.length ? (
      <p className="reports-empty">
        No records found for this report.
      </p>
    ) : (
      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              {Object.keys(tableRows[0]).map((key) => (
                <th key={key}>
                  {key.replace(/([A-Z])/g, " $1")}
                </th>
              ))}
            </tr>
          </thead>

         <tbody>
  {tableRows.map((item, index) => (
    <tr key={item.id ?? item.bookingId ?? item.guestId ?? index}>
      {Object.entries(tableRows[0]).map(([key]) => (
        <td key={key}>
          {item[key] == null
            ? "—"
            : typeof item[key] === "boolean"
            ? item[key]
              ? "Yes"
              : "No"
            : typeof item[key] === "object"
            ? JSON.stringify(item[key])
            : String(item[key])}
        </td>
      ))}
    </tr>
  ))}
</tbody>
</table>
      </div>
    )}
  </section>
)}
</main>
  );
}

export default Reports;
     