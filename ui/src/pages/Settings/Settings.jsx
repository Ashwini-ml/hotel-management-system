import { useEffect, useState } from "react";
import "./Settings.css";
import api from "../../api";

const defaultSettings = {
  hotelName: "Grand Horizon Hotel",
  email: "admin@grandhorizon.example",
  phone: "",
  address: "",
  checkIn: "14:00",
  checkOut: "11:00",
  bookingStatus: "Confirmed",
  maxGuests: "4",
  currency: "INR",
  gst: "18",
  invoicePrefix: "GH",
  bookingAlerts: true,
  paymentAlerts: true,
  checkoutAlerts: true,
};

const loadSettings = () => {
  try {
    const saved = localStorage.getItem("hotelSettings");
    return saved
      ? { ...defaultSettings, ...JSON.parse(saved) }
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

function Settings() {
  const [settings, setSettings] = useState(loadSettings);
  const [savedSettings, setSavedSettings] = useState(loadSettings);
  const [activeTab, setActiveTab] = useState("hotel");
  const [message, setMessage] = useState("");
  const [logoName, setLogoName] = useState("");

 useEffect(() => {
  let cancelled = false;

  const loadSettings = async () => {
    try {
      const response = await api.get("/Settings");
      const data = response.data;

      if (cancelled) return;

      const loaded = {
        hotelName: data.hotelName ?? "Grand Horizon Hotel",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        checkIn: data.checkIn ?? "14:00",
        checkOut: data.checkOut ?? "11:00",
        bookingStatus: data.bookingStatus ?? "Confirmed",
        maxGuests: String(data.maxGuests ?? 4),
        currency: data.currency ?? "INR",
        gst: String(data.gst ?? 18),
        invoicePrefix: data.invoicePrefix ?? "GH",
        bookingAlerts: data.bookingAlerts ?? true,
        paymentAlerts: data.paymentAlerts ?? true,
        checkoutAlerts: data.checkoutAlerts ?? true,
      };

      setSettings(loaded);
      setSavedSettings(loaded);
    } catch (error) {
      if (!cancelled) {
        setMessage("Could not load settings. Check the backend API.");
        console.error("Settings load error:", error);
      }
    }
  };

  loadSettings();

  return () => {
    cancelled = true;
  };
}, []);

  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const update = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async (event) => {
  event.preventDefault();

  try {
    const payload = {
      ...settings,
      maxGuests: Number(settings.maxGuests),
      gst: Number(settings.gst),
    };

    const response = await api.put("/Settings", payload);
    const data = response.data;

    const saved = {
      ...settings,
      hotelName: data.hotelName,
      email: data.email ?? "",
      phone: data.phone ?? "",
      address: data.address ?? "",
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      bookingStatus: data.bookingStatus,
      maxGuests: String(data.maxGuests),
      currency: data.currency,
      gst: String(data.gst),
      invoicePrefix: data.invoicePrefix ?? "",
      bookingAlerts: data.bookingAlerts,
      paymentAlerts: data.paymentAlerts,
      checkoutAlerts: data.checkoutAlerts,
    };

    setSettings(saved);
    setSavedSettings(saved);
    setMessage("Settings saved successfully to the database.");
  } catch (error) {
    console.error("Settings save error:", error.response?.data ?? error);
    setMessage(
      error.response?.data?.title ??
      "Could not save settings. Check the backend and validation errors."
    );
  }
};

  const resetSettings = () => {
    setSettings({ ...savedSettings });
    setMessage("Unsaved changes have been reset.");
  };

  const restoreDefaults = () => {
    setSettings({ ...defaultSettings });
    setMessage("Default values restored. Click Save Changes to keep them.");
  };

  const tabs = [
    { id: "hotel", icon: "▦", label: "Hotel Profile" },
    { id: "booking", icon: "▣", label: "Booking" },
    { id: "billing", icon: "₹", label: "Billing & Tax" },
    { id: "notifications", icon: "♧", label: "Notifications" },
  ];

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div className="settings-title-icon">⚙</div>
        <div>
          <p className="settings-eyebrow">ADMINISTRATION</p>
          <h1>Settings</h1>
          <p className="settings-subtitle">
            Personalize your hotel and manage operational preferences.
          </p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "settings-tab active" : "settings-tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <form onSubmit={saveSettings}>
        {activeTab === "hotel" && (
          <section className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon">▦</div>
              <div>
                <h2>Hotel Information</h2>
                <p>Manage your hotel's identity and contact details.</p>
              </div>
            </div>

            <div className="settings-form-grid">
              <label className="settings-field">
                Hotel Name *
                <input
                  required
                  value={settings.hotelName}
                  onChange={(e) => update("hotelName", e.target.value)}
                  placeholder="Enter hotel name"
                />
              </label>

              <label className="settings-field">
                Contact Email
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="hotel@example.com"
                />
              </label>

              <label className="settings-field">
                Phone Number
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Enter contact number"
                />
              </label>

              <label className="settings-field">
                Hotel Address
                <textarea
                  rows="3"
                  value={settings.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Enter complete hotel address"
                />
              </label>
            </div>

           
          </section>
        )}

        {activeTab === "booking" && (
          <section className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon">▣</div>
              <div>
                <h2>Booking Preferences</h2>
                <p>Set the default rules for guest reservations.</p>
              </div>
            </div>

            <div className="settings-form-grid">
              <label className="settings-field">
                Check-in Time
                <input
                  type="time"
                  value={settings.checkIn}
                  onChange={(e) => update("checkIn", e.target.value)}
                />
              </label>

              <label className="settings-field">
                Check-out Time
                <input
                  type="time"
                  value={settings.checkOut}
                  onChange={(e) => update("checkOut", e.target.value)}
                />
              </label>

              <label className="settings-field">
                Default Booking Status
                <select
                  value={settings.bookingStatus}
                  onChange={(e) => update("bookingStatus", e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </label>

              <label className="settings-field">
                Maximum Guests Per Room
                <select
                  value={settings.maxGuests}
                  onChange={(e) => update("maxGuests", e.target.value)}
                >
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="3">3 guests</option>
                  <option value="4">4 guests</option>
                  <option value="5">5 guests</option>
                  <option value="6">6 guests</option>
                </select>
              </label>
            </div>

            {settings.checkOut <= settings.checkIn && (
              <p className="settings-inline-warning">
                Check-out should normally be later than check-in.
              </p>
            )}
          </section>
        )}

        {activeTab === "billing" && (
          <section className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon">₹</div>
              <div>
                <h2>Billing & Tax</h2>
                <p>Configure the display preferences for invoices.</p>
              </div>
            </div>

            <div className="settings-form-grid">
              <label className="settings-field">
                Currency
                <select
                  value={settings.currency}
                  onChange={(e) => update("currency", e.target.value)}
                >
                  <option value="INR">INR - ₹ Indian Rupee</option>
                  <option value="USD">USD - $ US Dollar</option>
                  <option value="EUR">EUR - € Euro</option>
                  <option value="GBP">GBP - £ British Pound</option>
                </select>
              </label>

              <label className="settings-field">
                GST Percentage
                <select
                  value={settings.gst}
                  onChange={(e) => update("gst", e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </label>

              <label className="settings-field">
                Invoice Prefix
                <input
                  maxLength="8"
                  value={settings.invoicePrefix}
                  onChange={(e) => update("invoicePrefix", e.target.value)}
                  placeholder="e.g. GH"
                />
              </label>
            </div>

            <div className="settings-info-note">
              <span>ⓘ</span>
              <p>
                These are display preferences only. Existing invoice
                calculations will not change unless connected to your billing
                logic.
              </p>
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon">♧</div>
              <div>
                <h2>Notification Preferences</h2>
                <p>Choose which alerts you want enabled in your preferences.</p>
              </div>
            </div>

            {[
              {
                key: "bookingAlerts",
                title: "Booking Confirmations",
                description: "Preferences for new reservation alerts.",
              },
              {
                key: "paymentAlerts",
                title: "Payment Alerts",
                description: "Preferences for payment-related alerts.",
              },
              {
                key: "checkoutAlerts",
                title: "Checkout Reminders",
                description: "Preferences for upcoming departures.",
              },
            ].map((item) => (
              <label className="settings-toggle-row" key={item.key}>
                <span className="settings-toggle-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => update(item.key, e.target.checked)}
                />
                <span className="settings-toggle-ui" />
              </label>
            ))}
          </section>
        )}

        <div className="settings-actions">
          <div className="settings-action-buttons">
            <button type="submit" className="settings-save-button">
              ✓ Save Changes
            </button>

            <button
              type="button"
              className="settings-reset-button"
              onClick={resetSettings}
              disabled={!isDirty}
            >
              ↺ Undo Changes
            </button>

            <button
              type="button"
              className="settings-default-button"
              onClick={restoreDefaults}
            >
              Restore Defaults
            </button>
          </div>

          <span className={isDirty ? "settings-dirty" : "settings-saved"}>
            <span />
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>

        {message && (
          <div className="settings-toast" role="status">
            ✓ {message}
          </div>
        )}
      </form>

      <footer className="settings-version">
        <span>The Grand Retreat · Hotel Management System</span>
        <span>Settings · Frontend Demo</span>
      </footer>
    </main>
  );
}

export default Settings;