import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Owner.css";

const AMENITIES = [
  { key: "wifi", label: "WiFi" },
  { key: "food", label: "Food Included" },
  { key: "parking", label: "Parking" },
  { key: "laundry", label: "Laundry" },
  { key: "ac", label: "AC" },
  { key: "attached_bathroom", label: "Attached Bathroom" },
  { key: "furnished", label: "Furnished" },
];

const DEFAULTS = {
  name: "", description: "", location: "", address: "",
  rent: "", deposit: "", maintenance: "", electricity: "", food_cost: "",
  room_type: "single",
  amenities: { wifi: false, food: false, parking: false, laundry: false, ac: false, attached_bathroom: false, furnished: false },
  images: [], upi_qr_path: null, upi_qr_url: null,
};

function PGForm({ initial, pgId, onSuccess }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...initial, amenities: { ...DEFAULTS.amenities, ...(initial?.amenities || {}) } });
  const [uploading, setUploading] = useState(false);
  const [upiQrUploading, setUpiQrUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [rooms, setRooms] = useState([]);
  const [roomBusy, setRoomBusy] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);
  const [roomPhotoFiles, setRoomPhotoFiles] = useState({});
  const [bulkRoomType, setBulkRoomType] = useState(form.room_type);
  const [bulkRoomCount, setBulkRoomCount] = useState(1);
  const { showToast } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAmenity = k => setForm(f => ({ ...f, amenities: { ...f.amenities, [k]: !f.amenities[k] } }));

  useEffect(() => {
    if (pgId) api.get("/rooms/pg/" + pgId).then(r => setRooms(r.data.data || [])).catch(err => showToast(err.message, "error"));
    if (pgId) api.get("/pgs/" + pgId + "/upi-qr").then(r => setForm(current => ({ ...current, upi_qr_path: r.data.data.path, upi_qr_url: r.data.data.url }))).catch(err => showToast(err.message, "error"));
  }, [pgId]);

  const addRoom = () => setRooms(current => {
    const numbers = new Set(current.map(room => String(room.room_number).trim()));
    let number = 1;
    while (numbers.has(String(number))) number += 1;
    return [...current, { room_number: String(number), room_type: form.room_type, monthly_rent_inr: form.rent || "", deposit_inr: form.deposit || "", status: "available" }];
  });
  const addRoomBatch = () => {
    const count = Math.floor(Number(bulkRoomCount));
    if (!Number.isFinite(count) || count < 1 || count > 500) {
      showToast("Choose a room count between 1 and 500.", "error");
      return;
    }
    const numbers = new Set(rooms.map(room => String(room.room_number).trim()));
    const newRooms = [];
    let number = 1;
    while (newRooms.length < count) {
      while (numbers.has(String(number))) number += 1;
      numbers.add(String(number));
      newRooms.push({ room_number: String(number), room_type: bulkRoomType, monthly_rent_inr: form.rent || "", deposit_inr: form.deposit || "", status: "available" });
      number += 1;
    }
    setRooms(current => [...current, ...newRooms]);
    showToast(`Added ${count} ${bulkRoomType} room(s). Set room-specific prices below if needed.`, "success");
  };
  const updateRoom = (index, key, value) => setRooms(current => current.map((room, i) => i === index ? { ...room, [key]: value } : room));

  const saveRoom = async room => {
    setRoomBusy(room.id);
    try {
      const payload = { pg_id: pgId, room_number: room.room_number, room_type: room.room_type, monthly_rent_inr: room.monthly_rent_inr, deposit_inr: room.deposit_inr };
      if (["available", "maintenance"].includes(room.status)) payload.status = room.status;
      const res = await api.put("/rooms/" + room.id, payload);
      setRooms(current => current.map(item => item.id === room.id ? res.data.data : item));
      showToast("Room updated.", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setRoomBusy(""); }
  };

  const uploadRoomPhotos = async room => {
    const files = roomPhotoFiles[room.id] || [];
    if (!files.length) return;
    setRoomBusy(room.id);
    const data = new FormData();
    files.forEach(file => data.append("images", file));
    try {
      const response = await api.post(`/rooms/${room.id}/images`, data);
      setRooms(current => current.map(item => item.id === room.id ? { ...item, images: response.data.data.images } : item));
      setRoomPhotoFiles(current => ({ ...current, [room.id]: [] }));
      showToast("Room photos uploaded.", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setRoomBusy(""); }
  };

  const removeRoom = async room => {
    if (!room.id) {
      setRooms(current => current.filter(item => item !== room));
      return;
    }
    if (!window.confirm(`Delete room ${room.room_number}?`)) return;
    setRoomBusy(room.id);
    try {
      await api.delete("/rooms/" + room.id, { data: { pg_id: pgId } });
      setRooms(current => current.filter(item => item.id !== room.id));
      showToast("Room deleted.", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setRoomBusy(""); }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "PG name is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.rent || isNaN(form.rent) || Number(form.rent) <= 0) e.rent = "Valid rent is required";
    if (!pgId && rooms.length === 0) e.rooms = "Add at least one room before creating the listing";
    if (rooms.some(room => !String(room.room_number || "").trim() || Number(room.monthly_rent_inr) < 0 || !room.monthly_rent_inr)) e.rooms = "Each room needs a number and monthly rent";
    if (new Set(rooms.map(room => String(room.room_number).trim())).size !== rooms.length) e.rooms = "Room numbers must be unique within this PG";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectImages = e => {
    const files = Array.from(e.target.files);
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      showToast("Choose JPG, PNG, or WEBP photos up to 5 MB each.", "error");
      e.target.value = "";
      return;
    }
    pendingPreviews.forEach(URL.revokeObjectURL);
    setPendingFiles(files);
    setPendingPreviews(files.map(file => URL.createObjectURL(file)));
    e.target.value = "";
  };

  const handleImageUpload = async () => {
    const files = pendingFiles;
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach(f => fd.append("images", f));
    try {
      const endpoint = pgId ? "/pgs/" + pgId + "/images" : "/pgs/images/draft";
      const res = await api.post(endpoint, fd);
      setForm(f => ({ ...f, images: pgId ? res.data.data.images : [...f.images, ...res.data.data.images] }));
      setPendingFiles([]);
      pendingPreviews.forEach(URL.revokeObjectURL);
      setPendingPreviews([]);
      showToast("Images uploaded!", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const handleUPIQRUpload = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      showToast("Choose a JPG, PNG, or WEBP UPI QR image up to 5 MB.", "error");
      return;
    }
    setUpiQrUploading(true);
    const data = new FormData();
    data.append("image", file);
    try {
      const response = await api.post("/pgs/upi-qr/draft", data);
      setForm(current => ({ ...current, upi_qr_path: response.data.data.path, upi_qr_url: response.data.data.url }));
      showToast("UPI QR uploaded. Save the listing to make it available after booking confirmation.", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setUpiQrUploading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let uploadedImages = form.images;
      if (pendingFiles.length) {
        setUploading(true);
        const imageData = new FormData();
        pendingFiles.forEach(file => imageData.append("images", file));
        const imageEndpoint = pgId ? "/pgs/" + pgId + "/images" : "/pgs/images/draft";
        const imageResponse = await api.post(imageEndpoint, imageData);
        uploadedImages = pgId ? imageResponse.data.data.images : [...uploadedImages, ...imageResponse.data.data.images];
        setForm(current => ({ ...current, images: uploadedImages }));
        setPendingFiles([]);
        pendingPreviews.forEach(URL.revokeObjectURL);
        setPendingPreviews([]);
        setUploading(false);
      }
      const payload = {
        name: form.name.trim(), description: form.description.trim(),
        location: form.location.trim(), address: form.address.trim(),
        rent: form.rent, deposit: form.deposit || null,
        maintenance: form.maintenance || null, electricity: form.electricity || null,
        food_cost: form.food_cost || null,
        room_type: form.room_type,
        amenities: form.amenities, images: uploadedImages, upi_qr_path: form.upi_qr_path || null,
        rooms: rooms.filter(room => !room.id).map(({ room_number, room_type, monthly_rent_inr, deposit_inr }) => ({ room_number, room_type, monthly_rent_inr, deposit_inr })),
      };
      const res = pgId
        ? await api.put("/pgs/" + pgId, payload)
        : await api.post("/pgs", payload);
      if (pgId) {
        for (const room of payload.rooms) await api.post("/rooms", { pg_id: pgId, ...room });
      }
      showToast(pgId ? "Listing updated!" : "Listing created!", "success");
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) { showToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <form className="pg-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section">
        <div className="form-section-title">Basic Information</div>
        <div className="pg-form-grid">
          <div className="form-group">
            <label className="form-label">PG Name *</label>
            <input className={"form-input" + (errors.name ? " error" : "")} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Your PG name" />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Location *</label>
            <input className={"form-input" + (errors.location ? " error" : "")} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Koramangala, Bangalore" />
            {errors.location && <div className="form-error">{errors.location}</div>}
          </div>
          <div className="form-group pg-form-full">
            <label className="form-label">Full Address *</label>
            <input className={"form-input" + (errors.address ? " error" : "")} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street, Area, City - PIN" />
            {errors.address && <div className="form-error">{errors.address}</div>}
          </div>
          <div className="form-group pg-form-full">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe your PG..." rows={3} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Pricing</div>
        <div className="pg-form-grid">
          {[["rent","Monthly Rent (₹) *",errors.rent],["deposit","Deposit (₹)",""],["maintenance","Maintenance (₹/mo)",""],["electricity","Electricity (₹/mo est.)",""],["food_cost","Food Cost (₹/mo)",""]].map(([k,label,err]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{label}</label>
              <input className={"form-input" + (err ? " error" : "")} type="number" min="0" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="0" />
              {err && <div className="form-error">{err}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Room Details</div>
        <div className="pg-form-grid">
          <div className="form-group">
            <label className="form-label">Room Type *</label>
            <select className="form-select" value={form.room_type} onChange={e => set("room_type", e.target.value)}>
              <option value="single">Single</option>
              <option value="2-sharing">2 Sharing</option>
              <option value="3-sharing">3 Sharing</option>
              <option value="4-sharing">4 Sharing</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Amenities</div>
        <div className="amenities-form-grid">
          {AMENITIES.map(({ key, label }) => (
            <label key={key} className="checkbox-group">
              <input type="checkbox" checked={!!form.amenities[key]} onChange={() => setAmenity(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Rooms</div>
        <p className="form-help">Add a batch by sharing type and count. Each room stays individually bookable.</p>
        <div className="pg-form-grid" style={{alignItems:"end",marginBottom:16}}>
          <div className="form-group"><label className="form-label">Room Type</label><select className="form-select" value={bulkRoomType} onChange={event => setBulkRoomType(event.target.value)}><option value="single">Single</option><option value="2-sharing">2 Sharing</option><option value="3-sharing">3 Sharing</option><option value="4-sharing">4 Sharing</option></select></div>
          <div className="form-group"><label className="form-label">Number of rooms to add</label><input className="form-input" type="number" min="1" max="500" value={bulkRoomCount} onChange={event => setBulkRoomCount(event.target.value)} /></div>
          <button type="button" className="btn btn-outline" onClick={addRoomBatch}>+ Add {bulkRoomCount || 0} Rooms</button>
        </div>
        {rooms.length > 0 && <div className="form-help" style={{marginBottom:12}}><strong>Inventory by sharing type:</strong> {Object.entries(rooms.reduce((groups, room) => { const group = groups[room.room_type] || { total: 0, available: 0 }; group.total += 1; if (room.status === "available") group.available += 1; groups[room.room_type] = group; return groups; }, {})).map(([type, group]) => `${group.available} of ${group.total} ${type} rooms available`).join(" · ")}</div>}
        <p className="form-help">Each room is managed separately.</p>
        {rooms.map((room, index) => <div className="pg-form-grid" key={room.id || index} style={{marginBottom: 12}}>
          <div className="form-group"><label className="form-label">Room Number</label><input className="form-input" value={room.room_number} onChange={e => updateRoom(index, "room_number", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Room Type</label><select className="form-select" value={room.room_type} onChange={e => updateRoom(index, "room_type", e.target.value)}><option value="single">Single</option><option value="2-sharing">2 Sharing</option><option value="3-sharing">3 Sharing</option><option value="4-sharing">4 Sharing</option></select></div>
          <div className="form-group"><label className="form-label">Monthly Rent (₹)</label><input className="form-input" type="number" min="0" value={room.monthly_rent_inr} onChange={e => updateRoom(index, "monthly_rent_inr", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Deposit (₹)</label><input className="form-input" type="number" min="0" value={room.deposit_inr || ""} onChange={e => updateRoom(index, "deposit_inr", e.target.value)} /></div>
          {room.id && <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={room.status} disabled={!['available','maintenance'].includes(room.status)} onChange={e => updateRoom(index, "status", e.target.value)}><option value="available">Available</option><option value="maintenance">Maintenance</option>{!['available','maintenance'].includes(room.status) && <option value={room.status}>{room.status}</option>}</select><button type="button" className="btn btn-sm btn-outline" onClick={() => saveRoom(rooms[index])} disabled={roomBusy === room.id}>{roomBusy === room.id ? "Saving..." : "Save Room"}</button></div>}
          {room.id && <div className="form-group pg-form-full"><label className="form-label">Optional photos for Room {room.room_number}</label><p className="form-help">Choose photos, then upload them. They appear with this room after upload.</p><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { const files = Array.from(event.target.files || []); if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) { showToast("Choose JPG, PNG, or WEBP photos up to 5 MB each.", "error"); event.target.value = ""; return; } setRoomPhotoFiles(current => ({ ...current, [room.id]: files })); event.target.value = ""; }} />{(roomPhotoFiles[room.id] || []).length > 0 && <button type="button" className="btn btn-sm btn-outline" onClick={() => uploadRoomPhotos(room)} disabled={roomBusy === room.id}>{roomBusy === room.id ? "Uploading..." : `Upload ${(roomPhotoFiles[room.id] || []).length} selected photo(s)`}</button>}{room.images?.length > 0 && <div className="img-preview">{room.images.map((url, photoIndex) => <div className="img-preview-item" key={`${url}-${photoIndex}`}><img src={url} alt={`Room ${room.room_number}`} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/pg-placeholder.svg"; }} /></div>)}</div>}</div>}
          <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRoom(room)} disabled={roomBusy === room.id}>{roomBusy === room.id ? "Saving..." : "Delete Room"}</button>
        </div>)}
        <button type="button" className="btn btn-outline" onClick={addRoom}>+ Add Room</button>
        {errors.rooms && <div className="form-error">{errors.rooms}</div>}
      </div>

      {(
        <div className="form-section">
          <div className="form-section-title">Images</div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectImages} disabled={uploading} />
          {uploading && <p style={{fontSize:"13px",color:"var(--gray-500)",marginTop:"8px"}}>Uploading...</p>}
          {pendingPreviews.length > 0 && <div className="img-preview">{pendingPreviews.map((url, index) => <div className="img-preview-item" key={url}><img src={url} alt="Selected PG" /><button type="button" className="btn btn-sm btn-danger" onClick={() => { URL.revokeObjectURL(url); setPendingPreviews(current => current.filter((_, i) => i !== index)); setPendingFiles(current => current.filter((_, i) => i !== index)); }}>Remove</button></div>)}</div>}
          {pendingFiles.length > 0 && <button type="button" className="btn btn-outline" onClick={handleImageUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload Selected Photos"}</button>}
          {form.images?.length > 0 && (
            <div className="img-preview">
              {form.images.map((url, i) => <div key={i} className="img-preview-item"><img src={url} alt="PG" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/pg-placeholder.svg"; }} /><button type="button" className="btn btn-sm btn-danger" onClick={() => setForm(current => ({...current, images: current.images.filter((_, index) => index !== i)}))}>Remove</button></div>)}
            </div>
          )}
        </div>
      )}

      <div className="form-section">
        <div className="form-section-title">Optional UPI QR</div>
        <p className="form-help">Tenants can view this after you confirm their room request. StayNear does not process payments.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUPIQRUpload} disabled={upiQrUploading} />
        {upiQrUploading && <p className="form-help">Uploading UPI QR...</p>}
        {form.upi_qr_url && <div className="img-preview"><div className="img-preview-item"><img src={form.upi_qr_url} alt="UPI QR code" /><button type="button" className="btn btn-sm btn-danger" onClick={() => setForm(current => ({ ...current, upi_qr_path: null, upi_qr_url: null }))}>Remove UPI QR</button></div></div>}
      </div>

      <div style={{display:"flex",gap:"10px",marginTop:"8px"}}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={saving || uploading || upiQrUploading}>
          {saving ? "Saving..." : uploading || upiQrUploading ? "Uploading..." : (pgId ? "Update Listing" : "Create Listing")}
        </button>
        <a href="/owner/pgs" className="btn btn-secondary btn-lg">Cancel</a>
      </div>
    </form>
  );
}

export default PGForm;
