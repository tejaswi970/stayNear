import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import PGForm from "./PGForm";
import { useToast } from "../../contexts/ToastContext";
import "./Owner.css";

function EditPG() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [pg, setPg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/pgs/" + id)
      .then(r => setPg(r.data.data))
      .catch(e => setError(e.message || "Listing not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error) return <div className="container" style={{padding:"40px 16px"}}><div style={{color:"var(--danger)"}}>{error}</div></div>;

  return (
    <div className="owner-page container">
      <div className="page-header">
        <h1 className="page-title">Edit Listing</h1>
        <p className="page-subtitle">{pg?.name}</p>
      </div>
      <PGForm initial={pg} pgId={id} onSuccess={() => { showToast("Listing updated!", "success"); navigate("/owner/pgs"); }} />
    </div>
  );
}

export default EditPG;
