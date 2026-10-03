import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import api from "../services/api";
import "./Auth.css";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please enter email and password."); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email: form.email, password: form.password });
      const { user, token } = res.data.data;
      login(user, token);
      showToast("Welcome back " + user.name.split(" ")[0], "success");
      if (from) { navigate(from, { replace: true }); return; }
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "owner") navigate("/owner");
      else navigate("/pgs");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Login</div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your StayNear account</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-toggle">
              <input className="form-input" type={showPwd ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Your password" />
              <button type="button" className="pwd-toggle" onClick={() => setShowPwd(s => !s)}>{showPwd ? "Hide" : "Show"}</button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="auth-footer">No account? <Link to="/register">Register here</Link></p>
      </div>
    </div>
  );
}

export default Login;
