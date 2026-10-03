import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Admin.css";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const { showToast } = useToast();

  const fetchUsers = (role, currentPage) => {
    setLoading(true);
    api.get("/admin/users?role=" + (role || "") + "&page=" + currentPage)
      .then(r => {
        setUsers(r.data.data || []);
        setPagination(r.data.pagination || { page: currentPage, total: 0, totalPages: 0 });
      })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(roleFilter, page); }, [roleFilter, page]);

  const handleFilter = r => { setRoleFilter(r); setPage(1); };

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">Users & Owners</h1>
        <p className="page-subtitle">{pagination.total} records</p>
      </div>
      <div className="filter-bar">
        {[["","All"],["tenant","Tenants"],["owner","Owners"]].map(([val, label]) => (
          <button key={val} className={"btn btn-sm " + (roleFilter === val ? "btn-primary" : "btn-secondary")} onClick={() => handleFilter(val)}>
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><h3>No users found</h3></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={"badge " + (u.role === "owner" ? "badge-warning" : "badge-success")}>{u.role}</span></td>
                  <td style={{fontSize:"12px",color:"var(--gray-400)"}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default AdminUsers;
