import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useCompare } from "../contexts/CompareContext";
import "./MainLayout.css";

function CompareBar() {
  const { compareList, removeFromCompare } = useCompare();
  const navigate = useNavigate();
  if (compareList.length === 0) return null;
  return (
    <div className="compare-floating-bar">
      <div className="compare-bar-inner">
        <span className="compare-bar-label">Comparing {compareList.length}/3</span>
        <div className="compare-bar-pgs">
          {compareList.map(pg => (
            <div key={pg.id} className="compare-bar-pg">
              <span>{pg.name}</span>
              <button onClick={() => removeFromCompare(pg.id)} title="Remove">x</button>
            </div>
          ))}
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => navigate("/compare")}>Compare Now</button>
      </div>
    </div>
  );
}

function MainLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content"><Outlet /></main>
      <CompareBar />
      <Footer />
    </div>
  );
}

export default MainLayout;