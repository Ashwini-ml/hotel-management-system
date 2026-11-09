import { useState } from "react";
import { Eye, EyeOff, Hotel } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/Services.jsx";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password
      });

      const { token, name, role } = response.data;
      const storage = remember ? localStorage : sessionStorage;

      localStorage.removeItem("hotelToken");
      sessionStorage.removeItem("hotelToken");

      storage.setItem("hotelToken", token);
      storage.setItem("hotelUser", JSON.stringify({ name, role }));

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Invalid email or password."
          : "Unable to log in. Check that the API is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="hero-brand">
          <Hotel size={32} />
          <span>The Grand Retreat</span>
        </div>
        <div className="hero-copy">
          <p>WELCOME TO YOUR SANCTUARY</p>
          <h1>Every stay tells a story.</h1>
          <span>Manage your hotel with comfort and confidence.</span>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <Hotel size={36} />
          <h1>Welcome Back</h1>
          <p>Sign in to your hotel management account</p>

          <label htmlFor="email">Username or Email</label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter username or email"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="eye-button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            Remember me
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <button
            className="text-button"
            type="button"
            onClick={() =>
              setError("Please contact your administrator to reset your password.")
            }
          >
            Forgot Password?
          </button>
        </form>
      </section>
    </div>
  );
}