import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Owner.css";
import VerificationBadge from "../../components/VerificationBadge";

function OwnerListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    api.get("/pgs/owner/my-listings")
      .then(r => setListings(r.data.data || []))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async id => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.delete("/pgs/" + id);
      setListings(prev => prev.filter(l => l.id !== id));
      showToast("Listing deleted.", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="owner-page container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Listings</h1>
          <p className="page-subtitle">{listings.length} listing{listings.length !== 1 ? "s" : ""}</p>
        </div>
        <Link to="/owner/pgs/new" className="btn btn-primary">+ Add PG</Link>
      </div>

      {listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3>No listings yet</h3>
          <p>Add your first PG listing to get started.</p>
          <Link to="/owner/pgs/new" className="btn btn-primary" style={{marginTop:"16px"}}>Add PG</Link>
        </div>
      ) : (
        <div className="owner-listings-table">
          <table>
            <thead>
              <tr><th>Name</th><th>Location</th><th>Rent</th><th>Room Type</th><th>Rooms</th><th>Status</th><th>Verified</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.location}</td>
                  <td>₹{Number(l.rent).toLocaleString("en-IN")}/mo</td>
                  <td>{l.room_type}</td>
                  <td>{`${l.room_counts?.available ?? 0} ${(l.room_counts?.available ?? 0) === 1 ? "room" : "rooms"} available`}</td>
                  <td>
                    <span className={"badge " + ({available:"badge-success",few_rooms:"badge-warning",full:"badge-danger"}[l.availability]||"badge-gray")}>
                      {l.availability}
                    </span>
                  </td>
                  <td><VerificationBadge status={l.verification_status || (l.verified ? "verified" : "pending")} /></td>
                  <td style={{fontSize:"12px",color:"var(--gray-400)"}}>{new Date(l.updated_at||l.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div style={{display:"flex",gap:"6px"}}>
                      <Link to={"/pgs/" + l.id} className="btn btn-sm btn-secondary">View</Link>
                      <Link to={"/owner/pgs/" + l.id + "/edit"} className="btn btn-sm btn-outline">Edit</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(l.id)} disabled={deleting === l.id}>
                        {deleting === l.id ? "..." : "Delete"}
                      </button>
                    </div>
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

export default OwnerListings;
