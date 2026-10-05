import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCompare } from "../contexts/CompareContext";
import "./Navbar.css";

function Navbar() {
  const { user, isAuthenticated, isOwner, isAdmin, logout } = useAuth();
  const { compareList } = useCompare();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  React.useEffect(() => {
    if (user?.role !== "tenant") { setRequestCount(0); return undefined; }
    let active = true;
    const snapshotKey = `sn_request_status_${user.id}`;
    const loadRequests = () => {
      const token = localStorage.getItem("sn_token");
      fetch(`${import.meta.env.VITE_API_URL || "/api"}/room-requests/my`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then(response => response.ok ? response.json() : Promise.reject(new Error("Could not load requests")))
        .then(response => {
          if (!active) return;
          const requests = response.data || [];
          setRequestCount(requests.length);
          let previous = {};
          try { previous = JSON.parse(localStorage.getItem(snapshotKey) || "{}"); } catch { previous = {}; }
          requests.forEach(request => {
            const oldStatus = previous[request.id];
            if (!oldStatus || oldStatus === request.status) return;
            const statusText = { confirmed: "confirmed your room booking", owner_rejected: "declined your room request", cancelled: "updated your room booking", expired: "let your room request expire" }[request.status];
            if (statusText) window.dispatchEvent(new CustomEvent("staynear:notification", { detail: { message: `${request.pg?.name || "The owner"} ${statusText}. Open My Requests for details and chat.`, type: request.status === "confirmed" ? "success" : "info" } }));
          });
          localStorage.setItem(snapshotKey, JSON.stringify(Object.fromEntries(requests.map(request => [request.id, request.status]))));
        }).catch(() => {});
    };
    loadRequests();
    const timer = window.setInterval(loadRequests, 15000);
    const onFocus = () => loadRequests();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [user?.id, user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <span className="navbar-logo">🏠</span>
          <span className="navbar-name">StayNear</span>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/pgs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
            Search PGs
          </NavLink>

          <NavLink to="/compare" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
            Compare {compareList.length > 0 && <span className="nav-badge">{compareList.length}</span>}
          </NavLink>

          {isAuthenticated && !isOwner && !isAdmin && (
            <NavLink to="/favorites" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
              Favorites
            </NavLink>
          )}

          {user?.role === "tenant" && (
            <NavLink to="/requests" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
              My Requests {requestCount > 0 && <span className="nav-badge nav-request-count" aria-label={`${requestCount} room requests`}>{requestCount > 99 ? "99+" : requestCount}</span>}
            </NavLink>
          )}

          {isAuthenticated && !isOwner && !isAdmin && (
            <NavLink to="/staybot" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
              🤖 StayBot
            </NavLink>
          )}

          {isOwner && (
            <NavLink to="/owner" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
              Dashboard
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} onClick={closeMenu}>
              Admin
            </NavLink>
          )}

          {isAuthenticated ? (
            <div className="nav-user">
              <span className="nav-username">{user.name.split(" ")[0]}</span>
              <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-sm btn-outline" onClick={closeMenu}>Login</Link>
              <Link to="/register" className="btn btn-sm btn-primary" onClick={closeMenu}>Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
