import React from "react";
import { useNavigate } from "react-router-dom";
import PGForm from "./PGForm";
import "./Owner.css";

function AddPG() {
  const navigate = useNavigate();
  return (
    <div className="owner-page container">
      <div className="page-header">
        <h1 className="page-title">Add New PG</h1>
        <p className="page-subtitle">New listings start as unverified. Admin will review them.</p>
      </div>
      <PGForm onSuccess={data => navigate("/owner/pgs/" + data.id + "/edit")} />
    </div>
  );
}

export default AddPG;
