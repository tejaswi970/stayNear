import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Admin.css";

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const { showToast } = useToast();

  const fetchReports = (status, currentPage) => {
    setLoading(true);
    api.get("/admin/reports?status=" + (status || "") + "&page=" + currentPage)
      .then(r => {
        setReports(r.data.data || []);
        setPagination(r.data.pagination || { page: currentPage, total: 0, totalPages: 0 });
      })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(statusFilter, page); }, [statusFilter, page]);

  const handleFilter = s => { setStatusFilter(s); setPage(1); };

  const handleResolve = async id => {
    try {
      await api.patch("/admin/reports/" + id + "/resolve");
      await fetchReports(statusFilter, page);
      showToast("Report resolved.", "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">{pagination.total} {statusFilter || "total"} report{pagination.total !== 1 ? "s" : ""}</p>
      </div>
      <div className="filter-bar">
        {["open","resolved",""].map(s => (
          <button key={s||"all"} className={"btn btn-sm " + (statusFilter === s ? "btn-primary" : "btn-secondary")} onClick={() => handleFilter(s)}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : reports.length === 0 ? (
        <div className="empty-state"><h3>No reports found</h3></div>
      ) : (
        <div className="reports-grid">
          {reports.map(r => (
            <div key={r.id} className="report-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <span className="report-reason">{r.reason?.replace(/_/g," ")}</span>
                <span className={"badge " + (r.status === "open" ? "badge-danger" : "badge-success")}>{r.status}</span>
              </div>
              <div>
                <p style={{fontSize:"14px",fontWeight:500}}>{r.pg?.name || "Unknown PG"}</p>
                <p style={{fontSize:"12px",color:"var(--gray-500)"}}>{r.pg?.location}</p>
              </div>
              {r.description && <p style={{fontSize:"13px",color:"var(--gray-600)"}}>{r.description}</p>}
              <div className="report-meta">
                Reported by: {r.user?.name || "Unknown"} · {new Date(r.created_at).toLocaleDateString("en-IN")}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <Link to={"/pgs/" + r.pg_id} className="btn btn-sm btn-outline">View PG</Link>
                {r.status === "open" && <button className="btn btn-sm btn-primary" onClick={() => handleResolve(r.id)}>Resolve</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && pagination.totalPages > 1 && (
        <div className="filter-bar" style={{justifyContent:"center",marginTop:24}}>
          <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
          <span style={{alignSelf:"center",fontSize:13,color:"var(--gray-500)"}}>Page {page} of {pagination.totalPages}</span>
          <button className="btn btn-sm btn-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(current => current + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export default AdminReports;
