import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Written: {path}")

# ─── STAYBOT ──────────────────────────────────────────────────────────────────
w("frontend/src/pages/StayBot.jsx", """import React, { useState, useRef, useEffect } from "react";
import api from "../services/api";
import PGCard from "../components/PGCard";
import { useCompare } from "../contexts/CompareContext";
import { useToast } from "../contexts/ToastContext";
import "./StayBot.css";

function StayBot() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi! I'm StayBot. Tell me what kind of PG you're looking for — location, budget, room type, amenities. I'll search the real database for you." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const { addToCompare, removeFromCompare, isInCompare, canAdd } = useCompare();
  const { showToast } = useToast();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { message: msg, conversationHistory: history });
      const { message: botMsg, pgs } = res.data.data;
      setMessages(prev => [...prev, { role: "bot", content: botMsg, pgs: pgs || [] }]);
      setHistory(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: botMsg }].slice(-8));
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", content: "Sorry, I ran into an issue. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const handleCompare = pg => {
    if (isInCompare(pg.id)) { removeFromCompare(pg.id); return; }
    if (!canAdd) { showToast("Max 3 PGs in compare. Remove one first.", "error"); return; }
    addToCompare(pg);
    showToast(pg.name + " added to compare.", "success");
  };

  const suggestions = [
    "Single room under 7000 with WiFi and food",
    "2-sharing PG in Koramangala with AC",
    "PG under 5000 with food included",
    "Furnished single room with attached bathroom",
  ];

  return (
    <div className="staybot-page">
      <div className="staybot-header">
        <h1>🤖 StayBot</h1>
        <p>Ask me about PGs in plain language. I search the real database for you.</p>
      </div>

      <div className="staybot-chat">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={"chat-message " + (msg.role === "user" ? "user-message" : "bot-message")}>
              {msg.role === "bot" && <div className="bot-avatar">🤖</div>}
              <div className="message-bubble">
                <p style={{whiteSpace:"pre-wrap"}}>{msg.content}</p>
                {msg.pgs && msg.pgs.length > 0 && (
                  <div className="bot-pg-cards">
                    {msg.pgs.map(pg => (
                      <PGCard key={pg.id} pg={pg} isAuthenticated={true}
                        onCompare={handleCompare} isCompared={isInCompare(pg.id)} canCompare={canAdd} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message bot-message">
              <div className="bot-avatar">🤖</div>
              <div className="message-bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="chat-suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-list">
              {suggestions.map(s => (
                <button key={s} className="suggestion-btn" onClick={() => { setInput(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about PGs... (e.g. single room under 7000 with food)"
            rows={2}
            disabled={loading}
          />
          <button className="btn btn-primary chat-send-btn" onClick={send} disabled={loading || !input.trim()}>
            {loading ? "..." : "Send"}
          </button>
        </div>
        <p className="chat-note">StayBot only shows real PGs from the database. Results may vary based on available listings.</p>
      </div>
    </div>
  );
}

export default StayBot;
""")

w("frontend/src/pages/StayBot.css", """.staybot-page{max-width:800px;margin:0 auto;padding:20px 16px 40px}.staybot-header{text-align:center;margin-bottom:20px}.staybot-header h1{font-size:24px;font-weight:700;color:var(--gray-900)}.staybot-header p{font-size:14px;color:var(--gray-500);margin-top:4px}.staybot-chat{background:#fff;border:1px solid var(--gray-200);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}.chat-messages{min-height:400px;max-height:60vh;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}.chat-message{display:flex;gap:10px;align-items:flex-start}.bot-message{flex-direction:row}.user-message{flex-direction:row-reverse}.bot-avatar{width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}.message-bubble{max-width:85%;background:var(--gray-100);padding:12px 16px;border-radius:12px;font-size:14px;color:var(--gray-800);line-height:1.5}.user-message .message-bubble{background:var(--primary);color:#fff}.bot-pg-cards{display:flex;flex-direction:column;gap:12px;margin-top:12px;max-width:500px}.typing{display:flex;gap:6px;align-items:center;padding:14px 16px}.typing span{width:8px;height:8px;background:var(--gray-400);border-radius:50%;animation:bounce .8s infinite}.typing span:nth-child(2){animation-delay:.1s}.typing span:nth-child(3){animation-delay:.2s}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}.chat-suggestions{padding:0 20px 16px}.suggestions-label{font-size:13px;color:var(--gray-500);margin-bottom:8px}.suggestions-list{display:flex;flex-wrap:wrap;gap:8px}.suggestion-btn{background:var(--gray-100);border:1px solid var(--gray-200);border-radius:100px;padding:6px 14px;font-size:13px;cursor:pointer;color:var(--gray-700);transition:all .15s}.suggestion-btn:hover{background:var(--primary-light);color:var(--primary);border-color:var(--primary)}.chat-input-area{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--gray-200);background:var(--gray-50)}.chat-input{flex:1;border:1.5px solid var(--gray-300);border-radius:8px;padding:10px 14px;font-size:14px;resize:none;font-family:inherit}.chat-input:focus{outline:none;border-color:var(--primary)}.chat-send-btn{align-self:flex-end;padding:10px 20px}.chat-note{font-size:11px;color:var(--gray-400);text-align:center;padding:8px 16px 12px}
""")

# ─── OWNER DASHBOARD ─────────────────────────────────────────────────────────
w("frontend/src/pages/owner/OwnerDashboard.jsx", """import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import "./Owner.css";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card" style={{borderTop: "3px solid " + color}}>
      <div className="stat-icon" style={{background: color + "20", color}}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function OwnerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pgs/owner/my-listings")
      .then(r => setListings(r.data.data || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const total = listings.length;
  const verified = listings.filter(l => l.verified).length;
  const available = listings.filter(l => l.availability === "available").length;
  const full = listings.filter(l => l.availability === "full").length;

  return (
    <div className="owner-page container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Owner Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
        <Link to="/owner/pgs/new" className="btn btn-primary">+ Add New PG</Link>
      </div>

      <div className="stats-grid">
        <StatCard icon="🏠" label="Total Listings" value={total} color="#6366f1" />
        <StatCard icon="✅" label="Verified" value={verified} color="#10b981" />
        <StatCard icon="⏳" label="Unverified" value={total - verified} color="#f59e0b" />
        <StatCard icon="🏃" label="Available" value={available} color="#3b82f6" />
        <StatCard icon="🚫" label="Full" value={full} color="#ef4444" />
      </div>

      <div className="section-header" style={{marginTop:"32px"}}>
        <h2 style={{fontSize:"18px",fontWeight:600}}>My Listings</h2>
        <Link to="/owner/pgs" className="btn btn-outline btn-sm">Manage all</Link>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3>No listings yet</h3>
          <p>Add your first PG to get started.</p>
          <Link to="/owner/pgs/new" className="btn btn-primary" style={{marginTop:"16px"}}>Add PG</Link>
        </div>
      ) : (
        <div className="owner-listings-table">
          <table>
            <thead><tr><th>Name</th><th>Location</th><th>Rent</th><th>Status</th><th>Verified</th><th>Actions</th></tr></thead>
            <tbody>
              {listings.slice(0, 5).map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.location}</td>
                  <td>₹{Number(l.rent).toLocaleString("en-IN")}/mo</td>
                  <td><span className={"badge " + ({available:"badge-success",few_rooms:"badge-warning",full:"badge-danger"}[l.availability]||"badge-gray")}>{l.availability}</span></td>
                  <td>{l.verified ? <span className="badge badge-success">Verified</span> : <span className="badge badge-gray">Pending</span>}</td>
                  <td>
                    <Link to={"/owner/pgs/" + l.id + "/edit"} className="btn btn-sm btn-outline">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;
""")

w("frontend/src/pages/owner/Owner.css", """.owner-page{padding:20px 16px 48px}.stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:4px}.stat-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--shadow)}.stat-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px}.stat-val{font-size:28px;font-weight:700;color:var(--gray-900)}.stat-label{font-size:13px;color:var(--gray-500)}.owner-listings-table{overflow-x:auto;margin-top:12px}.owner-listings-table table{width:100%;border-collapse:collapse}.owner-listings-table th,.owner-listings-table td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--gray-200);font-size:14px}.owner-listings-table th{background:var(--gray-50);font-weight:600;color:var(--gray-600);font-size:13px}.pg-form{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:24px;max-width:800px}.pg-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pg-form-full{grid-column:1/-1}.amenities-form-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.form-section{margin-bottom:24px}.form-section-title{font-size:16px;font-weight:600;color:var(--gray-800);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--gray-200)}.img-preview{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.img-preview-item{position:relative;width:80px;height:60px}.img-preview-item img{width:100%;height:100%;object-fit:cover;border-radius:6px}.img-remove{position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}@media(max-width:768px){.stats-grid{grid-template-columns:repeat(2,1fr)}.pg-form-grid{grid-template-columns:1fr}.amenities-form-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.stats-grid{grid-template-columns:1fr}}
""")

# ─── OWNER LISTINGS ───────────────────────────────────────────────────────────
w("frontend/src/pages/owner/OwnerListings.jsx", """import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Owner.css";

function OwnerListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    api.get("/pgs/owner/my-listings")
      .then(r => setListings(r.data.data || []))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async id => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.delete("/pgs/" + id);
      setListings(prev => prev.filter(l => l.id !== id));
      showToast("Listing deleted.", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="owner-page container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Listings</h1>
          <p className="page-subtitle">{listings.length} listing{listings.length !== 1 ? "s" : ""}</p>
        </div>
        <Link to="/owner/pgs/new" className="btn btn-primary">+ Add PG</Link>
      </div>

      {listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3>No listings yet</h3>
          <p>Add your first PG listing to get started.</p>
          <Link to="/owner/pgs/new" className="btn btn-primary" style={{marginTop:"16px"}}>Add PG</Link>
        </div>
      ) : (
        <div className="owner-listings-table">
          <table>
            <thead>
              <tr><th>Name</th><th>Location</th><th>Rent</th><th>Room Type</th><th>Status</th><th>Verified</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.location}</td>
                  <td>₹{Number(l.rent).toLocaleString("en-IN")}/mo</td>
                  <td>{l.room_type}</td>
                  <td>
                    <span className={"badge " + ({available:"badge-success",few_rooms:"badge-warning",full:"badge-danger"}[l.availability]||"badge-gray")}>
                      {l.availability}
                    </span>
                  </td>
                  <td>{l.verified ? <span className="badge badge-success">Verified</span> : <span className="badge badge-gray">Pending</span>}</td>
                  <td style={{fontSize:"12px",color:"var(--gray-400)"}}>{new Date(l.updated_at||l.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div style={{display:"flex",gap:"6px"}}>
                      <Link to={"/pgs/" + l.id} className="btn btn-sm btn-secondary">View</Link>
                      <Link to={"/owner/pgs/" + l.id + "/edit"} className="btn btn-sm btn-outline">Edit</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(l.id)} disabled={deleting === l.id}>
                        {deleting === l.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OwnerListings;
""")

# ─── PG FORM COMPONENT (shared between Add/Edit) ──────────────────────────────
w("frontend/src/pages/owner/PGForm.jsx", """import React, { useState } from "react";
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
  room_type: "single", availability: "available",
  amenities: { wifi: false, food: false, parking: false, laundry: false, ac: false, attached_bathroom: false, furnished: false },
  images: [],
};

function PGForm({ initial, pgId, onSuccess }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...initial, amenities: { ...DEFAULTS.amenities, ...(initial?.amenities || {}) } });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAmenity = k => setForm(f => ({ ...f, amenities: { ...f.amenities, [k]: !f.amenities[k] } }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "PG name is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.rent || isNaN(form.rent) || Number(form.rent) <= 0) e.rent = "Valid rent is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageUpload = async e => {
    const files = Array.from(e.target.files);
    if (!pgId) { showToast("Save the PG first, then upload images.", "info"); return; }
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach(f => fd.append("images", f));
    try {
      const res = await api.post("/pgs/" + pgId + "/images", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, images: res.data.data.images }));
      showToast("Images uploaded!", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), description: form.description.trim(),
        location: form.location.trim(), address: form.address.trim(),
        rent: form.rent, deposit: form.deposit || null,
        maintenance: form.maintenance || null, electricity: form.electricity || null,
        food_cost: form.food_cost || null,
        room_type: form.room_type, availability: form.availability,
        amenities: form.amenities, images: form.images,
      };
      const res = pgId
        ? await api.put("/pgs/" + pgId, payload)
        : await api.post("/pgs", payload);
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
            <input className={"form-input" + (errors.name ? " error" : "")} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Sunrise PG" />
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
          <div className="form-group">
            <label className="form-label">Availability</label>
            <select className="form-select" value={form.availability} onChange={e => set("availability", e.target.value)}>
              <option value="available">Available</option>
              <option value="few_rooms">Few Rooms Left</option>
              <option value="full">Full</option>
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

      {pgId && (
        <div className="form-section">
          <div className="form-section-title">Images</div>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} />
          {uploading && <p style={{fontSize:"13px",color:"var(--gray-500)",marginTop:"8px"}}>Uploading...</p>}
          {form.images?.length > 0 && (
            <div className="img-preview">
              {form.images.map((url, i) => <div key={i} className="img-preview-item"><img src={url} alt="PG" /></div>)}
            </div>
          )}
          {!pgId && <p style={{fontSize:"12px",color:"var(--gray-400)",marginTop:"8px"}}>Save the listing first to upload images.</p>}
        </div>
      )}

      <div style={{display:"flex",gap:"10px",marginTop:"8px"}}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? "Saving..." : (pgId ? "Update Listing" : "Create Listing")}
        </button>
        <a href="/owner/pgs" className="btn btn-secondary btn-lg">Cancel</a>
      </div>
    </form>
  );
}

export default PGForm;
""")

# ─── ADD PG ───────────────────────────────────────────────────────────────────
w("frontend/src/pages/owner/AddPG.jsx", """import React from "react";
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
""")

# ─── EDIT PG ──────────────────────────────────────────────────────────────────
w("frontend/src/pages/owner/EditPG.jsx", """import React, { useState, useEffect } from "react";
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
""")

# ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
w("frontend/src/pages/admin/AdminDashboard.jsx", """import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Admin.css";

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(r => setStats(r.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { icon:"👤", label:"Tenants", value: stats.totalUsers, color:"#6366f1", to:"/admin/users?role=tenant" },
    { icon:"🏠", label:"Owners", value: stats.totalOwners, color:"#f59e0b", to:"/admin/users?role=owner" },
    { icon:"📋", label:"Total PGs", value: stats.totalPGs, color:"#3b82f6", to:"/admin/listings" },
    { icon:"✅", label:"Verified PGs", value: stats.verifiedPGs, color:"#10b981", to:"/admin/listings?verified=true" },
    { icon:"⏳", label:"Unverified", value: stats.unverifiedPGs, color:"#f59e0b", to:"/admin/listings?verified=false" },
    { icon:"🚩", label:"Open Reports", value: stats.openReports, color:"#ef4444", to:"/admin/reports?status=open" },
  ] : [];

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview</p>
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="admin-stats-grid">
          {cards.map(c => (
            <Link key={c.label} to={c.to} className="admin-stat-card" style={{borderTop:"3px solid " + c.color}}>
              <div className="stat-icon" style={{background: c.color + "20", color: c.color}}>{c.icon}</div>
              <div className="stat-val">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </Link>
          ))}
        </div>
      )}
      <div className="admin-quick-links">
        <h2 style={{fontSize:"18px",fontWeight:600,marginBottom:"16px"}}>Quick Actions</h2>
        <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
          <Link to="/admin/listings" className="btn btn-outline">Manage Listings</Link>
          <Link to="/admin/reports" className="btn btn-outline">Review Reports</Link>
          <Link to="/admin/users" className="btn btn-outline">View Users</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
""")

w("frontend/src/pages/admin/Admin.css", """.admin-page{padding:20px 16px 48px}.admin-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}.admin-stat-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--shadow);text-decoration:none;transition:box-shadow .15s}.admin-stat-card:hover{box-shadow:var(--shadow-md)}.stat-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px}.stat-val{font-size:28px;font-weight:700;color:var(--gray-900)}.stat-label{font-size:13px;color:var(--gray-500)}.admin-table-wrap{overflow-x:auto}.admin-table{width:100%;border-collapse:collapse}.admin-table th,.admin-table td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--gray-200);font-size:14px}.admin-table th{background:var(--gray-50);font-weight:600;color:var(--gray-600);font-size:13px}.admin-quick-links{margin-top:8px}.filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center}.report-card{background:#fff;border:1px solid var(--gray-200);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px}.report-meta{font-size:12px;color:var(--gray-400)}.report-reason{font-size:13px;font-weight:500;background:var(--gray-100);padding:4px 10px;border-radius:100px;width:fit-content}.reports-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:900px){.admin-stats-grid{grid-template-columns:repeat(2,1fr)}.reports-grid{grid-template-columns:1fr}}@media(max-width:600px){.admin-stats-grid{grid-template-columns:1fr}}
""")

# ─── ADMIN LISTINGS ───────────────────────────────────────────────────────────
w("frontend/src/pages/admin/AdminListings.jsx", """import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Admin.css";

function AdminListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  const fetchListings = (p) => {
    setLoading(true);
    api.get("/admin/listings?page=" + (p||1) + "&limit=20")
      .then(r => { setListings(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(1); }, []);

  const handleVerify = async id => {
    try {
      await api.patch("/admin/listings/" + id + "/verify");
      setListings(prev => prev.map(l => l.id === id ? { ...l, verified: true } : l));
      showToast("Listing verified.", "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Remove this listing permanently?")) return;
    try {
      await api.delete("/admin/listings/" + id);
      setListings(prev => prev.filter(l => l.id !== id));
      showToast("Listing removed.", "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">All Listings</h1>
        <p className="page-subtitle">{pagination.total || 0} total listings</p>
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Owner</th><th>Location</th><th>Rent</th><th>Status</th><th>Verified</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td><Link to={"/pgs/" + l.id} style={{color:"var(--primary)",fontWeight:500}}>{l.name}</Link></td>
                  <td style={{fontSize:"12px"}}>{l.owner?.name || "—"}</td>
                  <td>{l.location}</td>
                  <td>₹{Number(l.rent).toLocaleString("en-IN")}</td>
                  <td><span className={"badge " + ({available:"badge-success",few_rooms:"badge-warning",full:"badge-danger"}[l.availability]||"badge-gray")}>{l.availability}</span></td>
                  <td>{l.verified ? <span className="badge badge-success">Verified</span> : <span className="badge badge-gray">Unverified</span>}</td>
                  <td>
                    <div style={{display:"flex",gap:"6px"}}>
                      {!l.verified && <button className="btn btn-sm btn-primary" onClick={() => handleVerify(l.id)}>Verify</button>}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(l.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => { setPage(p => p-1); fetchListings(page-1); }}>Prev</button>
            <span style={{padding:"8px 14px",fontSize:"14px"}}>{page} / {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => { setPage(p => p+1); fetchListings(page+1); }}>Next</button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export default AdminListings;
""")

# ─── ADMIN REPORTS ────────────────────────────────────────────────────────────
w("frontend/src/pages/admin/AdminReports.jsx", """import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Admin.css";

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const { showToast } = useToast();

  const fetchReports = (status) => {
    setLoading(true);
    api.get("/admin/reports?status=" + (status || ""))
      .then(r => setReports(r.data.data || []))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports("open"); }, []);

  const handleFilter = s => { setStatusFilter(s); fetchReports(s); };

  const handleResolve = async id => {
    try {
      await api.patch("/admin/reports/" + id + "/resolve");
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "resolved" } : r));
      showToast("Report resolved.", "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">{reports.length} {statusFilter} report{reports.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="filter-bar">
        {["open","resolved",""].map(s => (
          <button key={s||"all"} className={"btn btn-sm " + (statusFilter === s ? "btn-primary" : "btn-secondary")} onClick={() => handleFilter(s)}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : reports.length === 0 ? (
        <div className="empty-state"><h3>No reports found</h3></div>
      ) : (
        <div className="reports-grid">
          {reports.map(r => (
            <div key={r.id} className="report-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <span className="report-reason">{r.reason?.replace(/_/g," ")}</span>
                <span className={"badge " + (r.status === "open" ? "badge-danger" : "badge-success")}>{r.status}</span>
              </div>
              <div>
                <p style={{fontSize:"14px",fontWeight:500}}>{r.pg?.name || "Unknown PG"}</p>
                <p style={{fontSize:"12px",color:"var(--gray-500)"}}>{r.pg?.location}</p>
              </div>
              {r.description && <p style={{fontSize:"13px",color:"var(--gray-600)"}}>{r.description}</p>}
              <div className="report-meta">
                Reported by: {r.user?.name || "Unknown"} · {new Date(r.created_at).toLocaleDateString("en-IN")}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <Link to={"/pgs/" + r.pg_id} className="btn btn-sm btn-outline">View PG</Link>
                {r.status === "open" && <button className="btn btn-sm btn-primary" onClick={() => handleResolve(r.id)}>Resolve</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminReports;
""")

# ─── ADMIN USERS ──────────────────────────────────────────────────────────────
w("frontend/src/pages/admin/AdminUsers.jsx", """import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Admin.css";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const { showToast } = useToast();

  const fetchUsers = role => {
    setLoading(true);
    api.get("/admin/users?role=" + (role || ""))
      .then(r => setUsers(r.data.data || []))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(""); }, []);

  const handleFilter = r => { setRoleFilter(r); fetchUsers(r); };

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1 className="page-title">Users & Owners</h1>
        <p className="page-subtitle">{users.length} records</p>
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
    </div>
  );
}

export default AdminUsers;
""")

print("All owner/admin/staybot pages written!")
