import React from "react";
import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <div style={{minHeight:"60vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px",padding:"32px"}}>
      <div style={{fontSize:"64px"}}>🔒</div>
      <h1 style={{fontSize:"24px",fontWeight:700,color:"var(--gray-900)"}}>Access Denied</h1>
      <p style={{color:"var(--gray-500)",textAlign:"center",maxWidth:"400px"}}>You don't have permission to view this page. Please login with the correct account type.</p>
      <div style={{display:"flex",gap:"12px"}}>
        <Link to="/" className="btn btn-secondary">Go Home</Link>
        <Link to="/login" className="btn btn-primary">Login</Link>
      </div>
    </div>
  );
}

export default Unauthorized;