import React, { useState, useEffect, useCallback } from "react";
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

  // Room inventory can change while a tenant or owner is viewing search results.
  useEffect(() => {
    let active = true;
    const refreshInventory = () => {
      api.get("/pgs" + window.location.search)
        .then(response => {
          if (!active) return;
          setPgs(response.data.data || []);
          setPagination(response.data.pagination || {});
        }).catch(() => {});
    };
    const onVisibility = () => { if (document.visibilityState === "visible") refreshInventory(); };
    const timer = window.setInterval(refreshInventory, 15000);
    window.addEventListener("focus", refreshInventory);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshInventory);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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
