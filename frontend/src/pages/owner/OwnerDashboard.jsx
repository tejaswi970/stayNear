import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import "./Owner.css";
import VerificationBadge from "../../components/VerificationBadge";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card" style={{borderTop: "3px solid " + color}}>
      <div className="stat-icon" style={{background: color + "20", color}}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function OwnerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pgs/owner/my-listings")
      .then(r => setListings(r.data.data || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const total = listings.length;
  const verified = listings.filter(l => (l.verification_status || (l.verified ? "verified" : "pending")) === "verified").length;
  const available = listings.filter(l => l.availability === "available").length;
  const full = listings.filter(l => l.availability === "full").length;

  return (
    <div className="owner-page container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Owner Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
        <Link to="/owner/pgs/new" className="btn btn-primary">+ Add New PG</Link>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <Link to="/owner/requests" className="btn btn-outline">Room Requests</Link>
      </div>

      <div className="stats-grid">
        <StatCard icon="🏠" label="Total Listings" value={total} color="#6366f1" />
        <StatCard icon="✅" label="Verified" value={verified} color="#10b981" />
        <StatCard icon="⏳" label="Unverified" value={total - verified} color="#f59e0b" />
        <StatCard icon="🏃" label="Available" value={available} color="#3b82f6" />
        <StatCard icon="🚫" label="Full" value={full} color="#ef4444" />
      </div>

      <div className="section-header" style={{marginTop:"32px"}}>
        <h2 style={{fontSize:"18px",fontWeight:600}}>My Listings</h2>
        <Link to="/owner/pgs" className="btn btn-outline btn-sm">Manage all</Link>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3>No listings yet</h3>
          <p>Add your first PG to get started.</p>
          <Link to="/owner/pgs/new" className="btn btn-primary" style={{marginTop:"16px"}}>Add PG</Link>
        </div>
      ) : (
        <div className="owner-listings-table">
          <table>
            <thead><tr><th>Name</th><th>Location</th><th>Rent</th><th>Rooms</th><th>Status</th><th>Verified</th><th>Actions</th></tr></thead>
            <tbody>
              {listings.slice(0, 5).map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.location}</td>
                  <td>₹{Number(l.rent).toLocaleString("en-IN")}/mo</td>
                  <td>{`${l.room_counts?.available ?? 0} ${(l.room_counts?.available ?? 0) === 1 ? "room" : "rooms"} available`}</td>
                  <td><span className={"badge " + ({available:"badge-success",few_rooms:"badge-warning",full:"badge-danger"}[l.availability]||"badge-gray")}>{l.availability}</span></td>
                  <td><VerificationBadge status={l.verification_status || (l.verified ? "verified" : "pending")} /></td>
                  <td>
                    <Link to={"/owner/pgs/" + l.id + "/edit"} className="btn btn-sm btn-outline">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;
