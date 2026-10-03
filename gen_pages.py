import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Written: {path}")

# ─── HOME PAGE ───────────────────────────────────────────────────────────────
w("frontend/src/pages/Home.jsx", """import React, { useEffect, useState } from "react";
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
            <input className="hero-input" type="number" placeholder="Max budget (₹)" value={search.maxRent} onChange={e => setSearch(s => ({...s, maxRent: e.target.value}))} />
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
            {[["WiFi", "wifi=true"], ["Food included", "food=true"], ["AC rooms", "ac=true"], ["Under ₹5000", "maxRent=5000"], ["Available now", "availability=available"]].map(([label, q]) => (
              <button key={label} className="quick-filter-btn" onClick={() => navigate("/pgs?" + q)}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            {[["✅", "Verified Listings", "We manually review PGs before verification."],
              ["💰", "True Cost Calculator", "See rent + electricity + food + maintenance together."],
              ["🤖", "StayBot AI", "Ask in plain language. Get real PG results."],
              ["⚖️", "Compare PGs", "Compare up to 3 PGs side by side."]].map(([icon, title, desc]) => (
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
              <h2>Meet StayBot 🤖</h2>
              <p>Just tell StayBot what you need in plain language — location, budget, amenities — and it searches the real database for you.</p>
              <p className="staybot-example">"I need a single room near Koramangala under ₹7000 with WiFi and food"</p>
              {isAuthenticated
                ? <button className="btn btn-primary" onClick={() => navigate("/staybot")}>Open StayBot</button>
                : <button className="btn btn-primary" onClick={() => navigate("/login")}>Login to use StayBot</button>
              }
            </div>
            <div className="staybot-preview">
              <div className="bot-bubble bot-msg">Hi! I'm StayBot. Tell me what kind of PG you're looking for.</div>
              <div className="user-bubble">Single room under 7000 with food near college</div>
              <div className="bot-bubble bot-msg">I found 3 PGs matching your requirements: Sunrise PG — ₹6,500/mo, Sri Comfort PG — ₹7,000/mo...</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
""")

# ─── HOME CSS ─────────────────────────────────────────────────────────────────
w("frontend/src/pages/Home.css", """.hero{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:64px 16px;color:#fff}.hero-content{max-width:900px;margin:0 auto;text-align:center}.hero-title{font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.2;margin-bottom:12px}.hero-accent{color:#fbbf24}.hero-subtitle{font-size:18px;opacity:.9;margin-bottom:32px}.hero-search{display:flex;flex-wrap:wrap;gap:10px;max-width:800px;margin:0 auto 20px;background:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.2)}.hero-input,.hero-select{flex:1;min-width:160px;padding:10px 14px;border:1.5px solid var(--gray-300);border-radius:8px;font-size:14px;color:var(--gray-800)}.hero-input:focus,.hero-select:focus{outline:none;border-color:var(--primary)}.hero-btn{white-space:nowrap;flex-shrink:0}.hero-quick-filters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:4px}.quick-label{font-size:13px;opacity:.8;align-self:center}.quick-filter-btn{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);padding:5px 14px;border-radius:100px;font-size:13px;cursor:pointer;transition:all .15s}.quick-filter-btn:hover{background:rgba(255,255,255,.25)}.trust-section{padding:48px 16px;background:var(--gray-50)}.trust-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}.trust-card{background:#fff;padding:24px;border-radius:12px;border:1px solid var(--gray-200);text-align:center}.trust-icon{font-size:32px;margin-bottom:10px}.trust-card h3{font-size:15px;font-weight:600;margin-bottom:6px;color:var(--gray-800)}.trust-card p{font-size:13px;color:var(--gray-500)}.featured-section{padding:48px 16px}.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}.section-title{font-size:22px;font-weight:700;color:var(--gray-900)}.pg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.staybot-section{padding:48px 16px;background:var(--primary-light)}.staybot-intro{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;max-width:900px;margin:0 auto}.staybot-text h2{font-size:24px;font-weight:700;margin-bottom:12px}.staybot-text p{color:var(--gray-600);margin-bottom:12px;font-size:15px}.staybot-example{font-style:italic;color:var(--primary);background:#fff;padding:10px 14px;border-radius:8px;font-size:14px}.staybot-preview{background:#fff;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)}.bot-bubble{background:var(--gray-100);padding:10px 14px;border-radius:12px;font-size:13px;max-width:85%}.user-bubble{background:var(--primary);color:#fff;padding:10px 14px;border-radius:12px;font-size:13px;align-self:flex-end;max-width:85%}@media(max-width:900px){.trust-grid{grid-template-columns:repeat(2,1fr)}.pg-grid{grid-template-columns:repeat(2,1fr)}.staybot-intro{grid-template-columns:1fr}}@media(max-width:600px){.trust-grid{grid-template-columns:1fr}.pg-grid{grid-template-columns:1fr}.staybot-intro{grid-template-columns:1fr}.hero-search{flex-direction:column}}
""")

# ─── PG SEARCH PAGE ──────────────────────────────────────────────────────────
w("frontend/src/pages/PGSearch.jsx", """import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import PGCard from "../components/PGCard";
import { useAuth } from "../contexts/AuthContext";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./PGSearch.css";

const AMENITY_FILTERS = [
  { key: "wifi", label: "WiFi" },
  { key: "food", label: "Food" },
  { key: "parking", label: "Parking" },
  { key: "laundry", label: "Laundry" },
  { key: "ac", label: "AC" },
  { key: "attachedBathroom", label: "Attached Bath" },
  { key: "furnished", label: "Furnished" },
];

function PGSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    location: searchParams.get("location") || "",
    maxRent: searchParams.get("maxRent") || "",
    roomType: searchParams.get("roomType") || "",
    availability: searchParams.get("availability") || "",
    wifi: searchParams.get("wifi") === "true",
    food: searchParams.get("food") === "true",
    parking: searchParams.get("parking") === "true",
    laundry: searchParams.get("laundry") === "true",
    ac: searchParams.get("ac") === "true",
    attachedBathroom: searchParams.get("attachedBathroom") === "true",
    furnished: searchParams.get("furnished") === "true",
  });

  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [favorites, setFavorites] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/favorites").then(r => setFavorites((r.data.data || []).map(f => f.pg_id))).catch(() => {});
    }
  }, [isAuthenticated]);

  const fetchPGs = useCallback((f, page) => {
    setLoading(true); setError("");
    const p = new URLSearchParams();
    if (f.search) p.set("search", f.search);
    if (f.location) p.set("location", f.location);
    if (f.maxRent) p.set("maxRent", f.maxRent);
    if (f.roomType) p.set("roomType", f.roomType);
    if (f.availability) p.set("availability", f.availability);
    AMENITY_FILTERS.forEach(({ key }) => { if (f[key]) p.set(key, "true"); });
    p.set("page", page || 1);
    setSearchParams(p);
    api.get("/pgs?" + p.toString())
      .then(r => { setPgs(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(e => setError(e.message || "Failed to load PGs."))
      .finally(() => setLoading(false));
  }, [setSearchParams]);

  useEffect(() => { fetchPGs(filters, 1); }, []);

  const handleSearch = e => { e.preventDefault(); fetchPGs(filters, 1); };

  const handleFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleCheckbox = key => setFilters(f => ({ ...f, [key]: !f[key] }));

  const clearFilters = () => {
    const clean = { search: "", location: "", maxRent: "", roomType: "", availability: "", wifi: false, food: false, parking: false, laundry: false, ac: false, attachedBathroom: false, furnished: false };
    setFilters(clean);
    fetchPGs(clean, 1);
  };

  const handleCompare = pg => {
    if (isInCompare(pg.id)) { removeFromCompare(pg.id); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg);
    showToast(pg.name + " added to compare.", "success");
  };

  const handleFavorite = async pg => {
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      if (favorites.includes(pg.id)) {
        await api.delete("/favorites/" + pg.id);
        setFavorites(f => f.filter(id => id !== pg.id));
        showToast("Removed from favorites.", "info");
      } else {
        await api.post("/favorites", { pg_id: pg.id });
        setFavorites(f => [...f, pg.id]);
        showToast("Saved to favorites!", "success");
      }
    } catch (err) { showToast(err.message, "error"); }
  };

  const activeFilterCount = [filters.wifi, filters.food, filters.parking, filters.laundry, filters.ac, filters.attachedBathroom, filters.furnished, filters.roomType, filters.availability, filters.maxRent, filters.location].filter(Boolean).length;

  return (
    <div className="pgsearch-page">
      <div className="pgsearch-topbar">
        <form className="pgsearch-bar" onSubmit={handleSearch}>
          <input className="form-input pgsearch-input" placeholder="Search by name, location..." value={filters.search} onChange={e => handleFilter("search", e.target.value)} />
          <button className="btn btn-primary" type="submit">Search</button>
          <button type="button" className={"btn btn-outline filter-toggle " + (activeFilterCount ? "filter-toggle-active" : "")} onClick={() => setFilterOpen(o => !o)}>
            Filters {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        </form>
      </div>

      <div className="pgsearch-layout">
        {/* Sidebar filters */}
        <aside className={"pgsearch-sidebar " + (filterOpen ? "open" : "")}>
          <div className="sidebar-header">
            <h3>Filters</h3>
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear all</button>
          </div>
          <div className="filter-section">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="e.g. Koramangala" value={filters.location} onChange={e => handleFilter("location", e.target.value)} />
          </div>
          <div className="filter-section">
            <label className="form-label">Max Budget (₹)</label>
            <input className="form-input" type="number" placeholder="e.g. 8000" value={filters.maxRent} onChange={e => handleFilter("maxRent", e.target.value)} />
          </div>
          <div className="filter-section">
            <label className="form-label">Room Type</label>
            <select className="form-select" value={filters.roomType} onChange={e => handleFilter("roomType", e.target.value)}>
              <option value="">Any</option>
              <option value="single">Single</option>
              <option value="2-sharing">2 Sharing</option>
              <option value="3-sharing">3 Sharing</option>
              <option value="4-sharing">4 Sharing</option>
            </select>
          </div>
          <div className="filter-section">
            <label className="form-label">Availability</label>
            <select className="form-select" value={filters.availability} onChange={e => handleFilter("availability", e.target.value)}>
              <option value="">Any</option>
              <option value="available">Available</option>
              <option value="few_rooms">Few Rooms</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div className="filter-section">
            <label className="form-label">Amenities</label>
            <div className="amenity-checks">
              {AMENITY_FILTERS.map(({ key, label }) => (
                <label key={key} className="checkbox-group">
                  <input type="checkbox" checked={!!filters[key]} onChange={() => handleCheckbox(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{width:"100%"}} onClick={() => { fetchPGs(filters, 1); setFilterOpen(false); }}>Apply Filters</button>
        </aside>

        {/* Results */}
        <div className="pgsearch-results">
          <div className="results-header">
            <span className="results-count">{loading ? "Loading..." : pagination.total + " PGs found"}</span>
            {activeFilterCount > 0 && <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear filters</button>}
          </div>
          {error && <div className="error-msg">{error}</div>}
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : pgs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No PGs found</h3>
              <p>Try increasing your budget or removing one filter.</p>
              <button className="btn btn-outline" style={{marginTop:"12px"}} onClick={clearFilters}>Clear all filters</button>
            </div>
          ) : (
            <div className="pg-results-grid">
              {pgs.map(pg => (
                <PGCard key={pg.id} pg={pg} isAuthenticated={isAuthenticated}
                  onFavorite={handleFavorite} isFavorited={favorites.includes(pg.id)}
                  onCompare={handleCompare} isCompared={isInCompare(pg.id)} canCompare={canAdd} />
              ))}
            </div>
          )}
          {!loading && pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={pagination.page <= 1} onClick={() => fetchPGs(filters, pagination.page - 1)}>Prev</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === pagination.page ? "active" : ""} onClick={() => fetchPGs(filters, p)}>{p}</button>
              ))}
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchPGs(filters, pagination.page + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Compare bar */}
      {isInCompare.length > 0 && <div className="compare-bar"><span>{/* Compare bar rendered in layout */}</span></div>}
    </div>
  );
}

export default PGSearch;
""")

w("frontend/src/pages/PGSearch.css", """.pgsearch-page{min-height:80vh}.pgsearch-topbar{background:#fff;border-bottom:1px solid var(--gray-200);padding:12px 16px;position:sticky;top:60px;z-index:50}.pgsearch-bar{display:flex;gap:8px;max-width:1200px;margin:0 auto;align-items:center}.pgsearch-input{flex:1}.filter-toggle{position:relative}.filter-toggle-active{background:var(--primary-light);color:var(--primary);border-color:var(--primary)}.filter-count{background:var(--primary);color:#fff;border-radius:100px;padding:1px 7px;font-size:11px;font-weight:600;margin-left:4px}.pgsearch-layout{display:flex;max-width:1200px;margin:0 auto;padding:16px;gap:20px}.pgsearch-sidebar{width:240px;flex-shrink:0;background:#fff;border:1px solid var(--gray-200);border-radius:var(--border-radius-lg);padding:16px;height:fit-content;position:sticky;top:120px}.sidebar-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.sidebar-header h3{font-size:15px;font-weight:600;color:var(--gray-800)}.filter-section{margin-bottom:16px}.amenity-checks{display:flex;flex-direction:column;gap:8px}.pgsearch-results{flex:1;min-width:0}.results-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;font-size:14px;color:var(--gray-600)}.results-count{font-weight:500}.pg-results-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.error-msg{background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:16px}@media(max-width:1024px){.pg-results-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:768px){.pgsearch-sidebar{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:200;width:100%;border-radius:0;overflow-y:auto}.pgsearch-sidebar.open{display:block}.pg-results-grid{grid-template-columns:1fr}}
""")

# ─── PG DETAIL PAGE ───────────────────────────────────────────────────────────
w("frontend/src/pages/PGDetail.jsx", """import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./PGDetail.css";

const REASONS = [
  { value: "wrong_rent", label: "Wrong rent" },
  { value: "wrong_location", label: "Wrong location" },
  { value: "fake_listing", label: "Fake listing" },
  { value: "occupied_pg", label: "Occupied PG" },
  { value: "incorrect_facilities", label: "Incorrect facilities" },
  { value: "suspicious_listing", label: "Suspicious listing" },
  { value: "other", label: "Other" },
];

function TrueCostCalc({ pg }) {
  const [extraFood, setExtraFood] = useState("");
  const food = pg.food_cost ? Number(pg.food_cost) : Number(extraFood) || 0;
  const elec = Number(pg.electricity) || 0;
  const maint = Number(pg.maintenance) || 0;
  const rent = Number(pg.rent) || 0;
  const total = rent + elec + food + maint;

  return (
    <div className="true-cost-card">
      <h3>True Cost Calculator</h3>
      <p className="cost-note">Estimated monthly cost breakdown</p>
      <div className="cost-rows">
        <div className="cost-row"><span>Rent</span><span>₹{rent.toLocaleString("en-IN")}</span></div>
        <div className="cost-row"><span>Electricity (est.)</span><span>{elec ? "₹" + elec.toLocaleString("en-IN") : "—"}</span></div>
        <div className="cost-row">
          <span>Food</span>
          {pg.food_cost
            ? <span>₹{Number(pg.food_cost).toLocaleString("en-IN")}</span>
            : <input type="number" className="form-input cost-input" placeholder="Enter food cost" value={extraFood} onChange={e => setExtraFood(e.target.value)} />
          }
        </div>
        <div className="cost-row"><span>Maintenance</span><span>{maint ? "₹" + maint.toLocaleString("en-IN") : "—"}</span></div>
        <div className="cost-row cost-total"><span>Estimated Monthly Cost</span><span>₹{total.toLocaleString("en-IN")}</span></div>
      </div>
      <p className="cost-disclaimer">* Estimates only. Actual costs may vary.</p>
    </div>
  );
}

function ReportModal({ pgId, onClose }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ reason: "wrong_rent", description: "" });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/reports", { pg_id: pgId, ...form });
      showToast("Report submitted. Thank you.", "success");
      onClose();
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Report Listing</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <select className="form-select" value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Additional details..." rows={3} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>{loading ? "Submitting..." : "Submit Report"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PGDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isTenant } = useAuth();
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();
  const [pg, setPg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get("/pgs/" + id)
      .then(r => setPg(r.data.data))
      .catch(e => setError(e.message || "PG not found."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (isAuthenticated && isTenant) {
      api.get("/favorites").then(r => {
        const ids = (r.data.data || []).map(f => f.pg_id);
        setIsFav(ids.includes(id));
      }).catch(() => {});
    }
  }, [id, isAuthenticated, isTenant]);

  const handleFav = async () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      if (isFav) {
        await api.delete("/favorites/" + id);
        setIsFav(false);
        showToast("Removed from favorites.", "info");
      } else {
        await api.post("/favorites", { pg_id: id });
        setIsFav(true);
        showToast("Saved to favorites!", "success");
      }
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleCompare = () => {
    if (isInCompare(id)) { removeFromCompare(id); showToast("Removed from compare.", "info"); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg); showToast(pg.name + " added to compare.", "success");
  };

  if (loading) return <div className="loading-center" style={{minHeight:"60vh"}}><div className="spinner" /></div>;
  if (error) return <div className="container" style={{padding:"40px 16px"}}><div className="error-msg">{error}</div><Link to="/pgs" className="btn btn-outline" style={{marginTop:"16px"}}>Back to search</Link></div>;
  if (!pg) return null;

  const amenities = pg.amenities || {};
  const images = pg.images?.length ? pg.images : ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"];

  const availBadge = { available: "badge-success", few_rooms: "badge-warning", full: "badge-danger" }[pg.availability] || "badge-gray";
  const availLabel = { available: "Available", few_rooms: "Few Rooms Left", full: "Full" }[pg.availability] || pg.availability;

  return (
    <div className="pgdetail-page container">
      <div className="pgdetail-breadcrumb">
        <Link to="/pgs">Search PGs</Link> / <span>{pg.name}</span>
      </div>

      <div className="pgdetail-layout">
        {/* Left: images + info */}
        <div className="pgdetail-main">
          <div className="pgdetail-gallery">
            <img src={images[imgIndex]} alt={pg.name} className="gallery-main-img" />
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className={"gallery-thumb " + (i === imgIndex ? "active" : "")} onClick={() => setImgIndex(i)} />
                ))}
              </div>
            )}
          </div>

          <div className="pgdetail-info-card">
            <div className="pgdetail-header">
              <div>
                <h1 className="pgdetail-name">{pg.name}</h1>
                <p className="pgdetail-location">📍 {pg.location}</p>
                <p className="pgdetail-address">🏠 {pg.address}</p>
              </div>
              <div className="pgdetail-badges">
                <span className={"badge " + availBadge}>{availLabel}</span>
                {pg.verified && <span className="badge badge-success">✓ Verified</span>}
              </div>
            </div>

            <div className="pgdetail-pricing">
              <div className="pricing-item"><span className="pricing-label">Monthly Rent</span><span className="pricing-val">₹{Number(pg.rent).toLocaleString("en-IN")}</span></div>
              {pg.deposit && <div className="pricing-item"><span className="pricing-label">Deposit</span><span className="pricing-val">₹{Number(pg.deposit).toLocaleString("en-IN")}</span></div>}
              {pg.maintenance && <div className="pricing-item"><span className="pricing-label">Maintenance</span><span className="pricing-val">₹{Number(pg.maintenance).toLocaleString("en-IN")}/mo</span></div>}
              {pg.electricity && <div className="pricing-item"><span className="pricing-label">Electricity (est.)</span><span className="pricing-val">₹{Number(pg.electricity).toLocaleString("en-IN")}/mo</span></div>}
              {pg.food_cost && <div className="pricing-item"><span className="pricing-label">Food</span><span className="pricing-val">₹{Number(pg.food_cost).toLocaleString("en-IN")}/mo</span></div>}
              <div className="pricing-item"><span className="pricing-label">Room Type</span><span className="pricing-val">{pg.room_type}</span></div>
            </div>

            {pg.description && <p className="pgdetail-desc">{pg.description}</p>}

            <div className="pgdetail-amenities">
              <h3>Amenities</h3>
              <div className="amenities-grid">
                {[["wifi","WiFi"],["food","Food Included"],["ac","Air Conditioning"],["parking","Parking"],["laundry","Laundry"],["attached_bathroom","Attached Bathroom"],["furnished","Furnished"]].map(([k,label]) => (
                  <div key={k} className={"amenity-item " + (amenities[k] ? "available" : "unavailable")}>
                    <span>{amenities[k] ? "✓" : "✕"}</span> {label}
                  </div>
                ))}
              </div>
            </div>

            {pg.owner && (
              <div className="pgdetail-contact">
                <h3>Contact Owner</h3>
                <p>Owner: <strong>{pg.owner.name}</strong></p>
                <p>Email: <strong>{pg.owner.email}</strong></p>
                <p className="contact-note">Contact directly via email to arrange a visit.</p>
              </div>
            )}

            <p className="pgdetail-updated">Last updated: {new Date(pg.updated_at || pg.created_at).toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        {/* Right: actions + calculator */}
        <div className="pgdetail-sidebar">
          <div className="action-card">
            <button className={"btn btn-lg " + (isFav ? "btn-danger" : "btn-primary")} style={{width:"100%"}} onClick={handleFav}>
              {isFav ? "♥ Saved to Favorites" : "♡ Save to Favorites"}
            </button>
            <button className={"btn btn-lg " + (isInCompare(id) ? "btn-secondary" : "btn-outline")} style={{width:"100%"}} onClick={handleCompare}>
              {isInCompare(id) ? "✓ In Compare" : "+ Add to Compare"}
            </button>
            <button className="btn btn-sm btn-secondary" style={{width:"100%"}} onClick={() => { if (!isAuthenticated) { navigate("/login"); return; } setShowReport(true); }}>
              🚩 Report Listing
            </button>
          </div>

          <TrueCostCalc pg={pg} />
        </div>
      </div>

      {showReport && <ReportModal pgId={id} onClose={() => setShowReport(false)} />}
    </div>
  );
}

export default PGDetail;
""")

w("frontend/src/pages/PGDetail.css", """.pgdetail-page{padding:20px 16px 40px}.pgdetail-breadcrumb{font-size:13px;color:var(--gray-500);margin-bottom:16px}.pgdetail-breadcrumb a{color:var(--primary)}.pgdetail-layout{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start}.pgdetail-main{display:flex;flex-direction:column;gap:20px}.gallery-main-img{width:100%;height:360px;object-fit:cover;border-radius:12px;display:block}.gallery-thumbs{display:flex;gap:8px;margin-top:8px;overflow-x:auto}.gallery-thumb{width:80px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid transparent;flex-shrink:0}.gallery-thumb.active{border-color:var(--primary)}.pgdetail-info-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:20px}.pgdetail-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.pgdetail-name{font-size:22px;font-weight:700;color:var(--gray-900)}.pgdetail-location{font-size:14px;color:var(--gray-500);margin-top:4px}.pgdetail-address{font-size:13px;color:var(--gray-400);margin-top:2px}.pgdetail-badges{display:flex;flex-direction:column;gap:6px;align-items:flex-end}.pgdetail-pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:var(--gray-50);padding:16px;border-radius:8px}.pricing-item{display:flex;flex-direction:column;gap:2px}.pricing-label{font-size:12px;color:var(--gray-500)}.pricing-val{font-size:16px;font-weight:600;color:var(--gray-900)}.pgdetail-desc{font-size:14px;color:var(--gray-600);line-height:1.6}.pgdetail-amenities h3{font-size:15px;font-weight:600;margin-bottom:10px}.amenities-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.amenity-item{display:flex;align-items:center;gap:6px;font-size:13px;padding:6px 10px;border-radius:6px}.amenity-item.available{background:#d1fae5;color:#065f46}.amenity-item.unavailable{background:var(--gray-100);color:var(--gray-400)}.pgdetail-contact{background:#eff6ff;padding:16px;border-radius:8px}.pgdetail-contact h3{font-size:15px;font-weight:600;margin-bottom:8px}.pgdetail-contact p{font-size:14px;color:var(--gray-700);margin-bottom:4px}.contact-note{font-size:12px;color:var(--gray-400);margin-top:6px}.pgdetail-updated{font-size:12px;color:var(--gray-400)}.pgdetail-sidebar{display:flex;flex-direction:column;gap:16px;position:sticky;top:80px}.action-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px}.true-cost-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px}.true-cost-card h3{font-size:15px;font-weight:600;margin-bottom:4px}.cost-note{font-size:12px;color:var(--gray-400);margin-bottom:12px}.cost-rows{display:flex;flex-direction:column;gap:8px}.cost-row{display:flex;justify-content:space-between;font-size:14px;color:var(--gray-700);padding:6px 0;border-bottom:1px solid var(--gray-100)}.cost-total{font-weight:700;font-size:16px;color:var(--gray-900);border-bottom:none;border-top:2px solid var(--gray-200);padding-top:10px}.cost-input{max-width:130px;padding:4px 8px;font-size:13px}.cost-disclaimer{font-size:11px;color:var(--gray-400);margin-top:8px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px}.modal{background:#fff;border-radius:12px;width:100%;max-width:440px;padding:24px;box-shadow:var(--shadow-lg)}.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.modal-header h3{font-size:18px;font-weight:600}.modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:var(--gray-500)}.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}.error-msg{background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px}@media(max-width:768px){.pgdetail-layout{grid-template-columns:1fr}.pgdetail-sidebar{position:static}.pgdetail-pricing{grid-template-columns:repeat(2,1fr)}.amenities-grid{grid-template-columns:1fr}}
""")

# ─── COMPARE PAGE ─────────────────────────────────────────────────────────────
w("frontend/src/pages/Compare.jsx", """import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompare } from "../contexts/CompareContext";
import "./Compare.css";

const ROWS = [
  { key: "rent", label: "Monthly Rent", fmt: v => v ? "₹" + Number(v).toLocaleString("en-IN") : "—" },
  { key: "deposit", label: "Deposit", fmt: v => v ? "₹" + Number(v).toLocaleString("en-IN") : "—" },
  { key: "room_type", label: "Room Type", fmt: v => v || "—" },
  { key: null, label: "Food", fmt: (v, pg) => pg?.amenities?.food ? "✓ Included" : "✕ Not included" },
  { key: null, label: "WiFi", fmt: (v, pg) => pg?.amenities?.wifi ? "✓ Available" : "✕ Not available" },
  { key: null, label: "Laundry", fmt: (v, pg) => pg?.amenities?.laundry ? "✓ Available" : "✕ Not available" },
  { key: null, label: "Parking", fmt: (v, pg) => pg?.amenities?.parking ? "✓ Available" : "✕ Not available" },
  { key: null, label: "AC", fmt: (v, pg) => pg?.amenities?.ac ? "✓ Available" : "✕ Not available" },
  { key: null, label: "Attached Bathroom", fmt: (v, pg) => pg?.amenities?.attached_bathroom ? "✓ Available" : "✕ Not available" },
  { key: null, label: "Furnished", fmt: (v, pg) => pg?.amenities?.furnished ? "✓ Yes" : "✕ No" },
  { key: "availability", label: "Availability", fmt: v => ({ available: "Available", few_rooms: "Few Rooms", full: "Full" }[v] || v || "—") },
  { key: "verified", label: "Verified", fmt: v => v ? "✓ Verified" : "Not verified" },
];

function estimatedCost(pg) {
  return (Number(pg.rent) || 0) + (Number(pg.electricity) || 0) + (Number(pg.food_cost) || 0) + (Number(pg.maintenance) || 0);
}

function Compare() {
  const { compareList, removeFromCompare, clearCompare, MAX_COMPARE } = useCompare();
  const navigate = useNavigate();

  if (compareList.length === 0) {
    return (
      <div className="container compare-empty">
        <div className="empty-state">
          <div className="empty-state-icon">⚖️</div>
          <h3>No PGs to compare</h3>
          <p>Add up to {MAX_COMPARE} PGs from search results to compare them side by side.</p>
          <Link to="/pgs" className="btn btn-primary" style={{marginTop:"16px"}}>Browse PGs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="compare-page">
      <div className="compare-topbar container">
        <h1 className="page-title">Compare PGs</h1>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <span style={{fontSize:"13px",color:"var(--gray-500)"}}>{compareList.length}/{MAX_COMPARE} PGs</span>
          <button className="btn btn-sm btn-secondary" onClick={clearCompare}>Clear all</button>
          <button className="btn btn-sm btn-outline" onClick={() => navigate("/pgs")}>Add more</button>
        </div>
      </div>

      <div className="compare-wrapper container">
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-label-col"></th>
                {compareList.map(pg => (
                  <th key={pg.id} className="compare-pg-col">
                    <div className="compare-pg-header">
                      <img src={pg.images?.[0] || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400"} alt={pg.name} className="compare-img" />
                      <div className="compare-pg-name">{pg.name}</div>
                      <div className="compare-pg-loc">📍 {pg.location}</div>
                      <div style={{display:"flex",gap:"6px",justifyContent:"center",flexWrap:"wrap",marginTop:"6px"}}>
                        <Link to={"/pgs/" + pg.id} className="btn btn-sm btn-outline">View</Link>
                        <button className="btn btn-sm btn-secondary" onClick={() => removeFromCompare(pg.id)}>Remove</button>
                      </div>
                    </div>
                  </th>
                ))}
                {compareList.length < MAX_COMPARE && (
                  <th className="compare-pg-col compare-add-col">
                    <button className="add-to-compare-btn" onClick={() => navigate("/pgs")}>
                      <span style={{fontSize:"32px"}}>+</span>
                      <span>Add PG</span>
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.label}>
                  <td className="compare-row-label">{row.label}</td>
                  {compareList.map(pg => (
                    <td key={pg.id} className="compare-row-val">
                      {row.fmt(row.key ? pg[row.key] : null, pg)}
                    </td>
                  ))}
                  {compareList.length < MAX_COMPARE && <td />}
                </tr>
              ))}
              <tr className="cost-row-total">
                <td className="compare-row-label">Est. Monthly Cost</td>
                {compareList.map(pg => (
                  <td key={pg.id} className="compare-row-val compare-total-val">
                    ₹{estimatedCost(pg).toLocaleString("en-IN")}
                  </td>
                ))}
                {compareList.length < MAX_COMPARE && <td />}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="compare-disclaimer">* Estimated monthly cost = Rent + Electricity + Food + Maintenance. Actual costs may vary.</p>
      </div>
    </div>
  );
}

export default Compare;
""")

w("frontend/src/pages/Compare.css", """.compare-empty{padding:40px 16px}.compare-page{padding:20px 0 48px}.compare-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}.compare-wrapper{overflow-x:auto}.compare-table-wrap{min-width:600px}.compare-table{width:100%;border-collapse:collapse}.compare-table th,.compare-table td{padding:14px 16px;text-align:center;border:1px solid var(--gray-200)}.compare-label-col{width:160px;text-align:left;background:var(--gray-50);font-weight:500;font-size:13px;color:var(--gray-700)}.compare-pg-col{min-width:200px;background:#fff}.compare-pg-header{display:flex;flex-direction:column;align-items:center;gap:6px}.compare-img{width:100%;height:120px;object-fit:cover;border-radius:8px}.compare-pg-name{font-size:14px;font-weight:600;color:var(--gray-900)}.compare-pg-loc{font-size:12px;color:var(--gray-500)}.compare-row-label{font-size:13px;font-weight:500;color:var(--gray-700);text-align:left;background:var(--gray-50)}.compare-row-val{font-size:13px;color:var(--gray-700)}.cost-row-total td{background:var(--primary-light)}.compare-total-val{font-size:16px;font-weight:700;color:var(--primary)}.compare-add-col{background:var(--gray-50)}.add-to-compare-btn{background:none;border:2px dashed var(--gray-300);border-radius:12px;width:100%;min-height:100px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:14px;color:var(--gray-400);transition:all .15s}.add-to-compare-btn:hover{border-color:var(--primary);color:var(--primary)}.compare-disclaimer{font-size:12px;color:var(--gray-400);margin-top:12px;text-align:center}
""")

# ─── FAVORITES PAGE ───────────────────────────────────────────────────────────
w("frontend/src/pages/Favorites.jsx", """import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PGCard from "../components/PGCard";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./Favorites.css";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/favorites")
      .then(r => setFavorites(r.data.data || []))
      .catch(e => setError(e.message || "Failed to load favorites."))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async pg => {
    try {
      await api.delete("/favorites/" + pg.id);
      setFavorites(f => f.filter(fav => fav.pg_id !== pg.id));
      showToast("Removed from favorites.", "info");
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleCompare = pg => {
    if (isInCompare(pg.id)) { removeFromCompare(pg.id); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg);
    showToast(pg.name + " added to compare.", "success");
  };

  if (loading) return <div className="loading-center" style={{minHeight:"60vh"}}><div className="spinner" /></div>;

  return (
    <div className="favorites-page container">
      <div className="page-header">
        <h1 className="page-title">Saved PGs</h1>
        <p className="page-subtitle">{favorites.length} saved PG{favorites.length !== 1 ? "s" : ""}</p>
      </div>
      {error && <div className="error-msg">{error}</div>}
      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤍</div>
          <h3>No saved PGs yet</h3>
          <p>Start exploring PGs and save the ones you like.</p>
          <button className="btn btn-primary" style={{marginTop:"16px"}} onClick={() => navigate("/pgs")}>Browse PGs</button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map(fav => fav.pg && (
            <PGCard key={fav.id} pg={fav.pg} isAuthenticated={true} isFavorited={true}
              onFavorite={() => handleRemove(fav.pg)}
              onCompare={() => handleCompare(fav.pg)} isCompared={isInCompare(fav.pg.id)} canCompare={canAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
""")

w("frontend/src/pages/Favorites.css", """.favorites-page{padding:20px 16px 48px}.favorites-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.error-msg{background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:16px}@media(max-width:900px){.favorites-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.favorites-grid{grid-template-columns:1fr}}
""")

# ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
w("frontend/src/pages/Profile.jsx", """import React from "react";
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
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
""")

w("frontend/src/pages/Profile.css", """.profile-page{padding:40px 16px;display:flex;justify-content:center}.profile-card{background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:40px;text-align:center;max-width:400px;width:100%;box-shadow:var(--shadow)}.profile-avatar{width:80px;height:80px;background:var(--primary);color:#fff;border-radius:50%;font-size:32px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}.profile-name{font-size:22px;font-weight:700;color:var(--gray-900)}.profile-email{font-size:14px;color:var(--gray-500);margin-top:4px}.profile-joined{font-size:13px;color:var(--gray-400);margin-top:12px}.profile-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px}
""")

print("All pages written successfully!")
