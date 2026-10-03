import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Admin.css";

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(r => setStats(r.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { icon:"👤", label:"Tenants", value: stats.totalUsers, color:"#6366f1", to:"/admin/users?role=tenant" },
    { icon:"🏠", label:"Owners", value: stats.totalOwners, color:"#f59e0b", to:"/admin/users?role=owner" },
    { icon:"📋", label:"Total PGs", value: stats.totalPGs, color:"#3b82f6", to:"/admin/listings" },
    { icon:"✅", label:"Verified PGs", value: stats.verifiedPGs, color:"#10b981", to:"/admin/listings?verified=true" },
    { icon:"⏳", label:"Unverified", value: stats.unverifiedPGs, color:"#f59e0b", to:"/admin/listings?verified=false" },
    { icon:"🚩", label:"Open Reports", value: stats.openReports, color:"#ef4444", to:"/admin/reports?status=open" },
  ] : [];

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview</p>
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="admin-stats-grid">
          {cards.map(c => (
            <Link key={c.label} to={c.to} className="admin-stat-card" style={{borderTop:"3px solid " + c.color}}>
              <div className="stat-icon" style={{background: c.color + "20", color: c.color}}>{c.icon}</div>
              <div className="stat-val">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </Link>
          ))}
        </div>
      )}
      <div className="admin-quick-links">
        <h2 style={{fontSize:"18px",fontWeight:600,marginBottom:"16px"}}>Quick Actions</h2>
        <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
          <Link to="/admin/listings" className="btn btn-outline">Manage Listings</Link>
          <Link to="/admin/reports" className="btn btn-outline">Review Reports</Link>
          <Link to="/admin/users" className="btn btn-outline">View Users</Link>
          <Link to="/admin/room-requests" className="btn btn-outline">View Room Requests</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
