import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PGCard from "../components/PGCard";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./Favorites.css";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/favorites")
      .then(r => setFavorites(r.data.data || []))
      .catch(e => setError(e.message || "Failed to load favorites."))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async pg => {
    try {
      await api.delete("/favorites/" + pg.id);
      setFavorites(f => f.filter(fav => fav.pg_id !== pg.id));
      showToast("Removed from favorites.", "info");
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleCompare = pg => {
    if (isInCompare(pg.id)) { removeFromCompare(pg.id); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg);
    showToast(pg.name + " added to compare.", "success");
  };

  if (loading) return <div className="loading-center" style={{minHeight:"60vh"}}><div className="spinner" /></div>;

  return (
    <div className="favorites-page container">
      <div className="page-header">
        <h1 className="page-title">Saved PGs</h1>
        <p className="page-subtitle">{favorites.length} saved PG{favorites.length !== 1 ? "s" : ""}</p>
      </div>
      {error && <div className="error-msg">{error}</div>}
      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤍</div>
          <h3>No saved PGs yet</h3>
          <p>Start exploring PGs and save the ones you like.</p>
          <button className="btn btn-primary" style={{marginTop:"16px"}} onClick={() => navigate("/pgs")}>Browse PGs</button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map(fav => fav.pg && (
            <PGCard key={fav.id} pg={fav.pg} isAuthenticated={true} isFavorited={true}
              onFavorite={() => handleRemove(fav.pg)}
              onCompare={() => handleCompare(fav.pg)} isCompared={isInCompare(fav.pg.id)} canCompare={canAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
