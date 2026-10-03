import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import VerificationBadge from "../../components/VerificationBadge";
import "./Admin.css";

function AdminListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const fetchListings = (p, filters = searchParams) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p || 1), limit: "20" });
    if (filters.has("verified")) params.set("verified", filters.get("verified"));
    api.get("/admin/listings?" + params.toString())
      .then(r => { setListings(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [searchParams]);
  useEffect(() => { fetchListings(page, searchParams); }, [page, searchParams]);

  const handleVerification = async (id, status) => {
    try {
      await api.patch("/admin/listings/" + id + "/verification", { status });
      await fetchListings(page);
      showToast(`Listing ${status}.`, "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Remove this listing permanently?")) return;
    try {
      await api.delete("/admin/listings/" + id);
      setListings(prev => prev.filter(l => l.id !== id));
      showToast("Listing removed.", "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">All Listings</h1>
        <p className="page-subtitle">{pagination.total || 0} total listings</p>
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Owner</th><th>Location</th><th>Rent</th><th>Status</th><th>Verified</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td><Link to={"/pgs/" + l.id} style={{color:"var(--primary)",fontWeight:500}}>{l.name}</Link></td>
                  <td style={{fontSize:"12px"}}>{l.owner?.name || "—"}</td>
                  <td>{l.location}</td>
                  <td>₹{Number(l.rent).toLocaleString("en-IN")}</td>
                  <td><span className={"badge " + ({available:"badge-success",few_rooms:"badge-warning",full:"badge-danger"}[l.availability]||"badge-gray")}>{l.availability}</span></td>
                  <td><VerificationBadge status={l.verification_status || (l.verified ? "verified" : "pending")} /></td>
                  <td>
                    <div style={{display:"flex",gap:"6px"}}>
                      {l.verification_status !== "verified" && <button className="btn btn-sm btn-primary" onClick={() => handleVerification(l.id, "verified")}>Approve</button>}
                      {l.verification_status !== "rejected" && <button className="btn btn-sm btn-outline" onClick={() => handleVerification(l.id, "rejected")}>Reject</button>}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(l.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)}>Prev</button>
            <span style={{padding:"8px 14px",fontSize:"14px"}}>{page} / {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p+1)}>Next</button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export default AdminListings;
