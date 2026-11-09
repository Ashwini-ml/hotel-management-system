function Settings() {
  return (
    <div>
      <h1>Settings</h1>

      <label>Hotel Name</label>
      <input defaultValue="Grand Horizon Hotel" />

      <br /><br />

      <label>Currency</label>
      <select defaultValue="INR">
        <option value="INR">INR - ₹</option>
      </select>

      <br /><br />

      <button>Save Settings</button>
    </div>
  );
}

export default Settings;