import React from "react";
import { Link, useNavigate } from "react-router-dom";
import VerificationBadge from "./VerificationBadge";

function PGCard({ pg, onFavorite, isFavorited, onCompare, isCompared, canCompare, isAuthenticated }) {
  const navigate = useNavigate();
  const amenities = pg.amenities || {};

  const availBadge = {
    available: { cls: "badge-success", label: "Available" },
    few_rooms: { cls: "badge-warning", label: "Few Rooms" },
    full: { cls: "badge-danger", label: "Full" },
  }[pg.availability] || { cls: "badge-gray", label: pg.availability };

  const handleFav = e => {
    e.preventDefault();
    if (!isAuthenticated) { navigate("/login"); return; }
    if (onFavorite) onFavorite(pg);
  };

  const handleCompare = e => {
    e.preventDefault();
    if (onCompare) onCompare(pg);
  };

  return (
    <div className="pg-card">
      <Link to={"/pgs/" + pg.id} className="pg-card-img-wrap">
        <img
          src={pg.images?.[0] || pg.room_cover_image || (pg.room_counts?.total ? "/room-placeholder.svg" : "/pg-placeholder.svg")}
          alt={pg.images?.[0] || pg.room_cover_image ? pg.name : `${pg.name} (sample room illustration)`}
          className="pg-card-img"
          loading="lazy"
          onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/pg-placeholder.svg"; }}
        />
        <VerificationBadge className="pg-verified-badge" status={pg.verification_status || (pg.verified ? "verified" : "pending")} compact />
      </Link>
      <div className="pg-card-body">
        <div className="pg-card-top">
          <h3 className="pg-card-name">
            <Link to={"/pgs/" + pg.id}>{pg.name}</Link>
          </h3>
          <span className={"badge " + availBadge.cls}>{`${pg.room_counts?.available ?? 0} ${(pg.room_counts?.available ?? 0) === 1 ? "room" : "rooms"} available`}</span>
        </div>
        <p className="pg-card-location">📍 {pg.location}</p>
        <div className="pg-card-meta">
          <span className="pg-card-rent">₹{Number(pg.rent).toLocaleString("en-IN")}/mo</span>
          <span className="pg-card-room">{pg.room_type}</span>
        </div>
        <div className="pg-card-amenities">
          {amenities.wifi && <span className="amenity-tag">WiFi</span>}
          {amenities.food && <span className="amenity-tag">Food</span>}
          {amenities.ac && <span className="amenity-tag">AC</span>}
          {amenities.parking && <span className="amenity-tag">Parking</span>}
          {amenities.attached_bathroom && <span className="amenity-tag">Bath</span>}
          {amenities.furnished && <span className="amenity-tag">Furnished</span>}
        </div>
        <div className="pg-card-updated">Updated {new Date(pg.updated_at || pg.created_at).toLocaleDateString("en-IN")}</div>
        <div className="pg-card-actions">
          <Link to={"/pgs/" + pg.id} className="btn btn-primary btn-sm">View Details</Link>
          <button
            className={"btn btn-sm " + (isFavorited ? "btn-danger" : "btn-outline")}
            onClick={handleFav}
            title={isFavorited ? "Remove favorite" : "Add to favorites"}
          >
            {isFavorited ? "Saved" : "Save"}
          </button>
          <button
            className={"btn btn-sm " + (isCompared ? "btn-secondary" : "btn-outline")}
            onClick={handleCompare}
            disabled={!isCompared && !canCompare}
            title={!isCompared && !canCompare ? "Max 3 PGs in compare" : ""}
          >
            {isCompared ? "Comparing" : "Compare"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PGCard;
