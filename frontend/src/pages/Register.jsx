import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import api from "../services/api";
import "./Auth.css";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", role: "tenant" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = e => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError(""); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role });
      login(res.data.data.user, res.data.data.token);
      showToast("Account created!", "success");
      navigate(form.role === "owner" ? "/owner" : "/pgs");
    } catch (err) { setError(err.message || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">&#127968;</div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join StayNear to find your perfect PG</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" /></div>
          <div className="form-group"><label className="form-label">Phone (optional)</label><input className="form-input" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Your contact number" /></div>
          <div className="form-group"><label className="form-label">I am a</label><select className="form-select" name="role" value={form.role} onChange={handleChange}><option value="tenant">Tenant (looking for PG)</option><option value="owner">PG Owner (listing PGs)</option></select></div>
          <div className="form-group"><label className="form-label">Password</label><div className="input-with-toggle"><input className="form-input" type={showPwd ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" /><button type="button" className="pwd-toggle" onClick={() => setShowPwd(s => !s)}>{showPwd ? "Hide" : "Show"}</button></div></div>
          <div className="form-group"><label className="form-label">Confirm Password</label><input className="form-input" type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="Repeat password" /></div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
        </form>
        <div className="auth-footer">Already have an account? <Link to="/login">Login here</Link></div>
      </div>
    </div>
  );
}

export default Register;
