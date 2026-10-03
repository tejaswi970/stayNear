import React from "react";
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
  { key: null, label: "Verified", fmt: (v, pg) => (pg?.verification_status || (pg?.verified ? "verified" : "pending")) === "verified" ? "✓ Verified" : "Not verified" },
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
                      <img src={pg.images?.[0] || "/pg-placeholder.svg"} alt={pg.name} className="compare-img" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/pg-placeholder.svg"; }} />
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
