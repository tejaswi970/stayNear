import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PGCard from "../components/PGCard";
import { useAuth } from "../contexts/AuthContext";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();
  const [search, setSearch] = useState({ query: "", location: "", maxRent: "", roomType: "" });
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pgs?limit=6&availability=available")
      .then(r => setFeatured(r.data.data || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (search.query) p.set("search", search.query);
    if (search.location) p.set("location", search.location);
    if (search.maxRent) p.set("maxRent", search.maxRent);
    if (search.roomType) p.set("roomType", search.roomType);
    navigate("/pgs?" + p.toString());
  };

  const handleCompare = pg => {
    if (isInCompare(pg.id)) { removeFromCompare(pg.id); return; }
    if (!canAdd) { showToast("You can compare up to 3 PGs. Remove one to add another.", "error"); return; }
    addToCompare(pg);
    showToast(pg.name + " added to compare.", "success");
  };

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Find a PG that fits your<br /><span className="hero-accent">budget, location & lifestyle</span></h1>
          <p className="hero-subtitle">Search verified PGs, compare costs, and move in with confidence.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <input className="hero-input" placeholder="Search by name or area..." value={search.query} onChange={e => setSearch(s => ({...s, query: e.target.value}))} />
            <input className="hero-input" placeholder="Location (e.g. Koramangala)" value={search.location} onChange={e => setSearch(s => ({...s, location: e.target.value}))} />
            <input className="hero-input" type="number" placeholder="Max budget (â‚¹)" value={search.maxRent} onChange={e => setSearch(s => ({...s, maxRent: e.target.value}))} />
            <select className="hero-select" value={search.roomType} onChange={e => setSearch(s => ({...s, roomType: e.target.value}))}>
              <option value="">Any room type</option>
              <option value="single">Single</option>
              <option value="2-sharing">2 Sharing</option>
              <option value="3-sharing">3 Sharing</option>
              <option value="4-sharing">4 Sharing</option>
            </select>
            <button className="btn btn-primary btn-lg hero-btn" type="submit">Search PGs</button>
          </form>
          <div className="hero-quick-filters">
            <span className="quick-label">Quick filters:</span>
            {[["WiFi", "wifi=true"], ["Food included", "food=true"], ["AC rooms", "ac=true"], ["Under â‚¹5000", "maxRent=5000"], ["Available now", "availability=available"]].map(([label, q]) => (
              <button key={label} className="quick-filter-btn" onClick={() => navigate("/pgs?" + q)}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            {[["âœ…", "Verified Listings", "We manually review PGs before verification."],
              ["ðŸ’°", "True Cost Calculator", "See rent + electricity + food + maintenance together."],
              ["ðŸ¤–", "StayBot AI", "Ask in plain language. Get real PG results."],
              ["âš–ï¸", "Compare PGs", "Compare up to 3 PGs side by side."]].map(([icon, title, desc]) => (
              <div key={title} className="trust-card">
                <div className="trust-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured PGs */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Available PGs</h2>
            <button className="btn btn-outline btn-sm" onClick={() => navigate("/pgs")}>View all</button>
          </div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : featured.length === 0 ? (
            <div className="empty-state"><p>No PGs available right now. Check back soon.</p></div>
          ) : (
            <div className="pg-grid">
              {featured.map(pg => (
                <PGCard key={pg.id} pg={pg} isAuthenticated={isAuthenticated}
                  onCompare={handleCompare} isCompared={isInCompare(pg.id)} canCompare={canAdd} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* StayBot intro */}
      <section className="staybot-section">
        <div className="container">
          <div className="staybot-intro">
            <div className="staybot-text">
              <h2>Meet StayBot ðŸ¤–</h2>
              <p>Just tell StayBot what you need in plain language â€” location, budget, amenities â€” and it searches the real database for you.</p>
              <p className="staybot-example">"I need a single room near Koramangala under â‚¹7000 with WiFi and food"</p>
              {isAuthenticated
                ? <button className="btn btn-primary" onClick={() => navigate("/staybot")}>Open StayBot</button>
                : <button className="btn btn-primary" onClick={() => navigate("/login")}>Login to use StayBot</button>
              }
            </div>
            <div className="staybot-preview">
              <div className="bot-bubble bot-msg">Hi! I'm StayBot. Tell me what kind of PG you're looking for.</div>
              <div className="user-bubble">Single room under ₹7,000 with food near my college</div>
              <div className="bot-bubble bot-msg">I will search live StayNear listings for your budget and area. Which college or location should I use?</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
