import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import VerificationBadge from "../components/VerificationBadge";
import "./PGDetail.css";

const REASONS = [
  { value: "wrong_rent", label: "Wrong rent" },
  { value: "wrong_location", label: "Wrong location" },
  { value: "fake_listing", label: "Fake listing" },
  { value: "occupied_pg", label: "Occupied PG" },
  { value: "incorrect_facilities", label: "Incorrect facilities" },
  { value: "suspicious_listing", label: "Suspicious listing" },
  { value: "other", label: "Other" },
];

function TrueCostCalc({ pg }) {
  const [extraFood, setExtraFood] = useState("");
  const food = pg.food_cost ? Number(pg.food_cost) : Number(extraFood) || 0;
  const elec = Number(pg.electricity) || 0;
  const maint = Number(pg.maintenance) || 0;
  const rent = Number(pg.rent) || 0;
  const total = rent + elec + food + maint;

  return (
    <div className="true-cost-card">
      <h3>True Cost Calculator</h3>
      <p className="cost-note">Estimated monthly cost breakdown</p>
      <div className="cost-rows">
        <div className="cost-row"><span>Rent</span><span>₹{rent.toLocaleString("en-IN")}</span></div>
        <div className="cost-row"><span>Electricity (est.)</span><span>{elec ? "₹" + elec.toLocaleString("en-IN") : "—"}</span></div>
        <div className="cost-row">
          <span>Food</span>
          {pg.food_cost
            ? <span>₹{Number(pg.food_cost).toLocaleString("en-IN")}</span>
            : <input type="number" className="form-input cost-input" placeholder="Enter food cost" value={extraFood} onChange={e => setExtraFood(e.target.value)} />
          }
        </div>
        <div className="cost-row"><span>Maintenance</span><span>{maint ? "₹" + maint.toLocaleString("en-IN") : "—"}</span></div>
        <div className="cost-row cost-total"><span>Estimated Monthly Cost</span><span>₹{total.toLocaleString("en-IN")}</span></div>
      </div>
      <p className="cost-disclaimer">* Estimates only. Actual costs may vary.</p>
    </div>
  );
}

function ReportModal({ pgId, onClose }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ reason: "wrong_rent", description: "" });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/reports", { pg_id: pgId, ...form });
      showToast("Report submitted. Thank you.", "success");
      onClose();
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Report Listing</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <select className="form-select" value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Additional details..." rows={3} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>{loading ? "Submitting..." : "Submit Report"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PGDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isTenant } = useAuth();
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();
  const [pg, setPg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [requestForm, setRequestForm] = useState({ move_in_date: "", people_count: 1, room_count: 1, message: "", phone: "" });
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let active = true;
    let loaded = false;
    const loadListing = () => api.get("/pgs/" + id)
      .then(r => { loaded = true; if (active) setPg(r.data.data); })
      .catch(e => { if (active && !loaded) setError(e.message || "PG not found."); })
      .finally(() => { if (active) setLoading(false); });
    setLoading(true);
    loadListing();
    const timer = window.setInterval(loadListing, 15000);
    const onFocus = () => loadListing();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [id]);


  useEffect(() => {
    if (isAuthenticated && isTenant) {
      api.get("/favorites").then(r => {
        const ids = (r.data.data || []).map(f => f.pg_id);
        setIsFav(ids.includes(id));
      }).catch(() => {});
    }
  }, [id, isAuthenticated, isTenant]);

  const handleFav = async () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      if (isFav) {
        await api.delete("/favorites/" + id);
        setIsFav(false);
        showToast("Removed from favorites.", "info");
      } else {
        await api.post("/favorites", { pg_id: id });
        setIsFav(true);
        showToast("Saved to favorites!", "success");
      }
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleCompare = () => {
    if (isInCompare(id)) { removeFromCompare(id); showToast("Removed from compare.", "info"); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg); showToast(pg.name + " added to compare.", "success");
  };

  const submitRoomRequest = async e => {
    e.preventDefault();
    setRequesting(true);
    try {
      await api.post("/room-requests", { room_id: selectedRoom, ...requestForm, contact_phone: requestForm.phone || user?.phone });
      showToast("Room request sent to the owner.", "success");
      navigate("/requests");
    } catch (err) { showToast(err.message, "error"); }
    finally { setRequesting(false); }
  };

  if (loading) return <div className="loading-center" style={{minHeight:"60vh"}}><div className="spinner" /></div>;
  if (error) return <div className="container" style={{padding:"40px 16px"}}><div className="error-msg">{error}</div><Link to="/pgs" className="btn btn-outline" style={{marginTop:"16px"}}>Back to search</Link></div>;
  if (!pg) return null;

  const amenities = pg.amenities || {};
  const roomCoverImages = pg.rooms?.flatMap(room => room.images || []) || [];
  const hasActualPhotos = !!(pg.images?.length || roomCoverImages.length);
  const images = pg.images?.length ? pg.images : roomCoverImages.length ? roomCoverImages : [pg.rooms?.length ? "/room-placeholder.svg" : "/pg-placeholder.svg"];
  const selectableRooms = (pg.rooms || []).filter((room, index, all) => room.status === "available" && all.findIndex(item => item.status === "available" && item.room_type === room.room_type && Number(item.monthly_rent_inr) === Number(room.monthly_rent_inr)) === index);
  const selectedRoomDetails = pg.rooms?.find(room => room.id === selectedRoom);
  const matchingRoomCount = selectedRoomDetails ? pg.rooms.filter(room => room.status === "available" && room.room_type === selectedRoomDetails.room_type && Number(room.monthly_rent_inr) === Number(selectedRoomDetails.monthly_rent_inr)).length : 1;

  const availBadge = { available: "badge-success", few_rooms: "badge-warning", full: "badge-danger" }[pg.availability] || "badge-gray";
  const availLabel = pg.room_counts ? `${pg.room_counts.available} ${pg.room_counts.available === 1 ? "room" : "rooms"} available` : ({ available: "Available", few_rooms: "Few Rooms Left", full: "Full" }[pg.availability] || pg.availability);

  return (
    <div className="pgdetail-page container">
      <div className="pgdetail-breadcrumb">
        <Link to="/pgs">Search PGs</Link> / <span>{pg.name}</span>
      </div>

      <div className="pgdetail-layout">
        {/* Left: images + info */}
        <div className="pgdetail-main">
          <div className="pgdetail-gallery">
            <img src={images[imgIndex]} alt={hasActualPhotos ? pg.name : `${pg.name} (sample illustration)`} className="gallery-main-img" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = pg.rooms?.length ? "/room-placeholder.svg" : "/pg-placeholder.svg"; }} />
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className={"gallery-thumb " + (i === imgIndex ? "active" : "")} onClick={() => setImgIndex(i)} />
                ))}
              </div>
            )}
          </div>

          <div className="pgdetail-info-card">
            <div className="pgdetail-header">
              <div>
                <h1 className="pgdetail-name">{pg.name}</h1>
                <p className="pgdetail-location">📍 {pg.location}</p>
                <p className="pgdetail-address">🏠 {pg.address}</p>
              </div>
              <div className="pgdetail-badges">
                <span className={"badge " + availBadge}>{availLabel}</span>
                <VerificationBadge status={pg.verification_status || (pg.verified ? "verified" : "pending")} />
              </div>
            </div>

            <div className="pgdetail-pricing">
              <div className="pricing-item"><span className="pricing-label">Monthly Rent</span><span className="pricing-val">₹{Number(pg.rent).toLocaleString("en-IN")}</span></div>
              {pg.deposit && <div className="pricing-item"><span className="pricing-label">Deposit</span><span className="pricing-val">₹{Number(pg.deposit).toLocaleString("en-IN")}</span></div>}
              {pg.maintenance && <div className="pricing-item"><span className="pricing-label">Maintenance</span><span className="pricing-val">₹{Number(pg.maintenance).toLocaleString("en-IN")}/mo</span></div>}
              {pg.electricity && <div className="pricing-item"><span className="pricing-label">Electricity (est.)</span><span className="pricing-val">₹{Number(pg.electricity).toLocaleString("en-IN")}/mo</span></div>}
              {pg.food_cost && <div className="pricing-item"><span className="pricing-label">Food</span><span className="pricing-val">₹{Number(pg.food_cost).toLocaleString("en-IN")}/mo</span></div>}
              <div className="pricing-item"><span className="pricing-label">Room Type</span><span className="pricing-val">{pg.room_type}</span></div>
            </div>

            {pg.description && <p className="pgdetail-desc">{pg.description}</p>}

            {pg.rooms_setup_required ? <div className="error-msg">Room inventory is not configured yet. Apply `database/room_booking.sql` in Supabase, then reload the page.</div> : pg.rooms?.length > 0 ? <section className="pgdetail-amenities">
              <h3>Room Availability</h3>
              <p>{pg.room_counts?.available ?? 0} {(pg.room_counts?.available ?? 0) === 1 ? "room" : "rooms"} available · {pg.room_counts?.booked ?? 0} booked</p>
              <div className="amenities-grid">{pg.rooms.map(room => <div className="amenity-item" key={room.id} style={{display:"block"}}>Room {room.room_number} · {room.room_type} · ₹{Number(room.monthly_rent_inr).toLocaleString("en-IN")}/mo · {room.status}<div style={{display:"flex",gap:8,overflowX:"auto",marginTop:8}}>{room.images?.length ? room.images.map((url, photoIndex) => <img key={`${room.id}-${photoIndex}`} src={url} alt={`Room ${room.room_number}`} loading="lazy" style={{width:150,height:100,objectFit:"cover",borderRadius:6}} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/room-placeholder.svg"; }} />) : <img src="/room-placeholder.svg" alt="Sample room image; the owner has not uploaded room photos" style={{width:150,height:100,objectFit:"cover",borderRadius:6}} />}</div></div>)}</div>
            </section> : <section className="pgdetail-amenities"><h3>Room Availability</h3><p>No rooms have been added to this listing yet.</p></section>}

            {(!isAuthenticated || isTenant) && <section className="pgdetail-amenities">
              <h3>Request a Room</h3>
              <p>Track the request in My Requests. The room is booked when the owner confirms it; chat and payment details then appear there.</p>
              {!isAuthenticated ? <button className="btn btn-primary" onClick={() => navigate("/login")}>Log in to request</button> : <form onSubmit={submitRoomRequest}>
                <div className="pg-form-grid">
                  <div className="form-group"><label className="form-label">Available Room Type</label><select className="form-select" required value={selectedRoom} onChange={e => { setSelectedRoom(e.target.value); setRequestForm(f => ({...f, room_count: 1})); }}><option value="">Select a room type</option>{selectableRooms.map(room => <option key={room.id} value={room.id}>{room.room_type} · {pg.rooms.filter(item => item.status === "available" && item.room_type === room.room_type && Number(item.monthly_rent_inr) === Number(room.monthly_rent_inr)).length} available · ₹{Number(room.monthly_rent_inr).toLocaleString("en-IN")}/mo each</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Expected Move-in</label><input className="form-input" type="date" required min={new Date().toISOString().slice(0, 10)} value={requestForm.move_in_date} onChange={e => setRequestForm(f => ({...f, move_in_date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Rooms requested</label><input className="form-input" type="number" min="1" max={matchingRoomCount} value={requestForm.room_count} onChange={e => setRequestForm(f => ({...f, room_count:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">People</label><input className="form-input" type="number" min="1" value={requestForm.people_count} onChange={e => setRequestForm(f => ({...f, people_count:e.target.value}))} /></div>
                  {!user?.phone && <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" required value={requestForm.phone} onChange={e => setRequestForm(f => ({...f, phone:e.target.value}))} /></div>}
                  <div className="form-group pg-form-full"><label className="form-label">Message (optional)</label><textarea className="form-textarea" value={requestForm.message} onChange={e => setRequestForm(f => ({...f, message:e.target.value}))} /></div>
                </div>
                {selectedRoom && (() => { const room = selectedRoomDetails; return <p>Request summary: {pg.name}, {requestForm.room_count} {room?.room_type} room(s) at ₹{(Number(room?.monthly_rent_inr || 0) * Number(requestForm.room_count || 1)).toLocaleString("en-IN")}/month · {matchingRoomCount} matching rooms currently available · Move-in {requestForm.move_in_date || "choose a date"} · {user?.name} ({user?.email}, {user?.phone || requestForm.phone || "phone needed"})</p>; })()}
                <button className="btn btn-primary" disabled={requesting || !pg.rooms?.some(r => r.status === "available")}>{requesting ? "Sending..." : "Send Request"}</button>
              </form>}
            </section>}

            <div className="pgdetail-amenities">
              <h3>Amenities</h3>
              <div className="amenities-grid">
                {[["wifi","WiFi"],["food","Food Included"],["ac","Air Conditioning"],["parking","Parking"],["laundry","Laundry"],["attached_bathroom","Attached Bathroom"],["furnished","Furnished"]].map(([k,label]) => (
                  <div key={k} className={"amenity-item " + (amenities[k] ? "available" : "unavailable")}>
                    <span>{amenities[k] ? "✓" : "✕"}</span> {label}
                  </div>
                ))}
              </div>
            </div>

            <p className="pgdetail-updated">Last updated: {new Date(pg.updated_at || pg.created_at).toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        {/* Right: actions + calculator */}
        <div className="pgdetail-sidebar">
          <div className="action-card">
            <button className={"btn btn-lg " + (isFav ? "btn-danger" : "btn-primary")} style={{width:"100%"}} onClick={handleFav}>
              {isFav ? "♥ Saved to Favorites" : "♡ Save to Favorites"}
            </button>
            <button className={"btn btn-lg " + (isInCompare(id) ? "btn-secondary" : "btn-outline")} style={{width:"100%"}} onClick={handleCompare}>
              {isInCompare(id) ? "✓ In Compare" : "+ Add to Compare"}
            </button>
            <button className="btn btn-sm btn-secondary" style={{width:"100%"}} onClick={() => { if (!isAuthenticated) { navigate("/login"); return; } setShowReport(true); }}>
              🚩 Report Listing
            </button>
          </div>

          <TrueCostCalc pg={pg} />
        </div>
      </div>

      {showReport && <ReportModal pgId={id} onClose={() => setShowReport(false)} />}
    </div>
  );
}

export default PGDetail;
