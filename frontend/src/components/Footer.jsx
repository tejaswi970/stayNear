import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer style={{background:"var(--gray-900)",color:"var(--gray-400)",padding:"32px 16px",marginTop:"auto"}}>
      <div className="container" style={{display:"flex",flexWrap:"wrap",gap:"24px",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:"18px",marginBottom:"4px"}}>🏠 StayNear</div>
          <div style={{fontSize:"13px"}}>Smart PG &amp; Room Finder</div>
        </div>
        <div style={{display:"flex",gap:"20px",fontSize:"14px"}}>
          <Link to="/pgs" style={{color:"var(--gray-400)"}}>Search PGs</Link>
          <Link to="/compare" style={{color:"var(--gray-400)"}}>Compare</Link>
          <Link to="/register" style={{color:"var(--gray-400)"}}>Register</Link>
        </div>
          <div style={{fontSize:"13px"}}>&copy; {new Date().getFullYear()} StayNear.</div>
      </div>
    </footer>
  );
}

export default Footer;
