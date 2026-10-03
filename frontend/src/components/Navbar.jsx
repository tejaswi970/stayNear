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
