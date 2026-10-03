import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div className="profile-page container">
      <div className="profile-card">
        <div className="profile-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        <h2 className="profile-name">{user?.name}</h2>
        <p className="profile-email">{user?.email}</p>
        <span className={"badge " + (user?.role === "admin" ? "badge-info" : user?.role === "owner" ? "badge-warning" : "badge-success")} style={{fontSize:"13px",marginTop:"8px"}}>
          {user?.role}
        </span>
        <p className="profile-joined">Member since {new Date(user?.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
        <div className="profile-actions">
          {user?.role === "owner" && <button className="btn btn-outline" onClick={() => navigate("/owner")}>Owner Dashboard</button>}
          {user?.role === "tenant" && <button className="btn btn-outline" onClick={() => navigate("/favorites")}>My Favorites</button>}
          {user?.role === "tenant" && <button className="btn btn-outline" onClick={() => navigate("/requests")}>My Requests</button>}
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
