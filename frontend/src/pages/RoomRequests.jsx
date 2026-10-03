import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

const labels = { pending: "Pending", owner_accepted: "Owner accepted (awaiting tenant)", owner_rejected: "Owner rejected", confirmed: "Booked", user_rejected: "Declined", cancelled: "Cancelled", expired: "Expired" };

function RequestChat({ requestId }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => api.get(`/room-requests/${requestId}/messages`)
      .then(res => { if (active) setMessages(res.data.data || []); });
    load().catch(err => showToast(err.message, "error"));
    const timer = window.setInterval(() => load().catch(() => {}), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [requestId]);

  const send = async event => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/room-requests/${requestId}/messages`, { content });
      setMessages(current => [...current, res.data.data]);
      setDraft("");
    } catch (err) { showToast(err.message, "error"); }
    finally { setSending(false); }
  };

  return <section aria-label="Booking conversation" style={{marginTop:16,padding:12,border:"1px solid var(--gray-200)",borderRadius:8}}>
    <div role="log" aria-live="polite" style={{maxHeight:240,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
      {messages.length === 0 ? <p>No messages yet. Start the conversation.</p> : messages.map(message => <div key={message.id} style={{alignSelf:message.sender_id === user?.id ? "flex-end" : "flex-start",maxWidth:"85%",padding:"8px 10px",borderRadius:8,background:message.sender_id === user?.id ? "var(--primary)" : "var(--gray-100)",color:message.sender_id === user?.id ? "white" : "inherit"}}>
        <div>{message.content}</div><small>{new Date(message.created_at).toLocaleString("en-IN")}</small>
      </div>)}
    </div>
    <form onSubmit={send} style={{display:"flex",gap:8}}>
      <input className="form-input" aria-label="Message" maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message" />
      <button className="btn btn-primary" disabled={sending || !draft.trim()}>{sending ? "Sending..." : "Send"}</button>
    </form>
  </section>;
}

function PaymentProofs({ request, owner = false }) {
  const { showToast } = useToast();
  const [proofs, setProofs] = useState([]);
  const [amount, setAmount] = useState(String((request.room?.monthly_rent_inr || 0) * (request.rooms_count || 1)));
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const qrImageRef = React.useRef(null);
  const [scanMessage, setScanMessage] = useState("");
  const [scannedUpi, setScannedUpi] = useState("");

  const scanUPIQR = async () => {
    setScanMessage("");
    setScannedUpi("");
    if (!("BarcodeDetector" in window)) {
      setScanMessage("This browser cannot read QR codes in-page. Open the QR on another device and scan it with your UPI app.");
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const results = await detector.detect(qrImageRef.current);
      const value = results[0]?.rawValue || "";
      if (!value) setScanMessage("No QR code was found. Try opening it in your UPI app or use another device.");
      else if (/^upi:\/\//i.test(value)) setScannedUpi(value);
      else setScanMessage("The QR was read, but it is not a UPI payment QR.");
    } catch {
      setScanMessage("Could not read this QR in-page. Open it on another device and scan it with your UPI app.");
    }
  };

  const refresh = () => api.get(`/room-requests/${request.id}/payment-proofs`)
    .then(response => setProofs(response.data.data || []))
    .catch(error => showToast(error.message, "error"))
    .finally(() => setLoading(false));

  useEffect(() => { refresh(); }, [request.id]);

  const upload = async event => {
    event.preventDefault();
    if (!file || busy) return;
    const form = event.currentTarget;
    const data = new FormData();
    data.append("receipt", file);
    data.append("amount_inr", amount);
    setBusy(true);
    try {
      const response = await api.post(`/room-requests/${request.id}/payment-proofs`, data);
      setProofs(current => [response.data.data, ...current]);
      setFile(null);
      form.reset();
      showToast("Payment receipt uploaded for the owner to review.", "success");
    } catch (error) { showToast(error.message, "error"); }
    finally { setBusy(false); }
  };

  const review = async (proof, status) => {
    setBusy(true);
    try {
      const response = await api.patch(`/room-requests/${request.id}/payment-proofs/${proof.id}`, { status });
      setProofs(current => current.map(item => item.id === proof.id ? response.data.data : item));
      showToast(status === "received" ? "Payment marked as received." : "Receipt marked as rejected.", "success");
    } catch (error) { showToast(error.message, "error"); }
    finally { setBusy(false); }
  };

  return <section style={{marginTop:16,padding:12,border:"1px solid var(--gray-200)",borderRadius:8}}>
    <h4>UPI payment proof (optional)</h4>
    {!owner && request.pg?.upi_qr_url ? <div style={{marginBottom:12}}><p>Read the QR here when supported, or open/save it and scan with any UPI app. StayNear does not process payments.</p><a href={request.pg.upi_qr_url} target="_blank" rel="noreferrer"><img ref={qrImageRef} src={request.pg.upi_qr_url} alt="Owner UPI payment QR code" style={{width:220,maxWidth:"100%",border:"1px solid var(--gray-200)",borderRadius:8}} /></a><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={scanUPIQR}>Read UPI QR</button><a className="btn btn-outline" href={request.pg.upi_qr_url} target="_blank" rel="noreferrer">Open UPI QR</a></div>{scanMessage && <p role="status">{scanMessage}</p>}{scannedUpi && <div role="status"><p>UPI payment QR read successfully.</p><a className="btn btn-primary" href={scannedUpi}>Open in UPI app</a></div>}</div> : !owner ? <p>The owner has not added a UPI QR. Contact the owner directly if needed.</p> : null}
    {loading ? <p>Loading receipts...</p> : proofs.length === 0 ? <p>No payment receipts uploaded.</p> : <div style={{display:"grid",gap:10,marginBottom:12}}>{proofs.map(proof => <article key={proof.id} style={{padding:10,border:"1px solid var(--gray-200)",borderRadius:8}}>
      <p>₹{Number(proof.amount_inr).toLocaleString("en-IN")} · {proof.status} · {new Date(proof.created_at).toLocaleString("en-IN")}</p>
      {proof.receipt_url && <a href={proof.receipt_url} target="_blank" rel="noreferrer">View receipt</a>}
      {owner && proof.status === "pending" && <div className="modal-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={() => review(proof,"received")}>Mark Received</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => review(proof,"rejected")}>Reject Receipt</button></div>}
    </article>)}</div>}
    {!owner && <form onSubmit={upload} style={{display:"grid",gap:8}}>
      <label className="form-label">Amount paid (₹)<input className="form-input" type="number" min="1" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label className="form-label">Receipt image or PDF<input className="form-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      <button className="btn btn-outline" disabled={busy || !file}>{busy ? "Uploading..." : "Upload Payment Receipt"}</button>
    </form>}
  </section>;
}

export default function RoomRequests({ owner = false, admin = false }) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [openChatId, setOpenChatId] = useState(null);
  const endpoint = admin ? "/admin/room-requests" : owner ? "/room-requests/owner" : "/room-requests/my";
  const refresh = () => api.get(endpoint).then(r => setRequests(r.data.data || [])).catch(e => showToast(e.message, "error")).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const act = async (item, action) => {
    setBusy(item.id);
    try {
      await api.patch(`/room-requests/${item.id}/action`, { action });
      showToast(action === "owner_accept" ? `${item.rooms_count || 1} room(s) booked.` : "Request updated.", "success");
      await refresh();
    } catch (err) { showToast(err.message, "error"); }
    finally { setBusy(""); }
  };

  return <main className="container owner-page">
    <div className="page-header"><div><h1 className="page-title">{admin ? "All Room Requests" : owner ? "Room Requests" : "My Requests"}</h1><p className="page-subtitle">{owner ? "Confirm a request to book its room. Tenant contact and chat appear after confirmation." : "The room is booked when its owner confirms your request."}</p></div>{owner && <Link className="btn btn-outline" to="/owner">Dashboard</Link>}</div>
    {loading ? <div className="loading-center"><div className="spinner" /></div> : requests.length === 0 ? <div className="empty-state"><h3>No room requests yet</h3></div> : <div className="grid-2">{requests.map(item => <article className="profile-card" key={item.id} style={{textAlign:"left",maxWidth:"none"}}>
      <h3>{item.pg?.name} · Room {item.room?.room_number}{(item.rooms_count || 1) > 1 ? ` + ${item.rooms_count - 1} more` : ""}</h3>
      <p>{item.rooms_count || 1} {item.room?.room_type} room(s) · ₹{(Number(item.room?.monthly_rent_inr || 0) * (item.rooms_count || 1)).toLocaleString("en-IN")}/month total</p>
      <p>Status: <strong>{labels[item.status] || item.status}</strong></p>
      <p>Move-in: {new Date(item.move_in_date + "T00:00:00").toLocaleDateString("en-IN")}</p>
      <p>Requested: {new Date(item.created_at).toLocaleString("en-IN")}</p>
      {item.status === "confirmed" && !owner && !admin && <div role="status" style={{padding:12,margin:"12px 0",borderRadius:8,background:"#dcfce7",color:"#166534"}}><strong>{item.rooms_count || 1} room(s) booked and confirmed.</strong><p>Your booking at {item.pg?.name} is confirmed for {new Date(item.move_in_date + "T00:00:00").toLocaleDateString("en-IN")}.</p><p>You can now chat with the owner and view their UPI QR code below.</p></div>}
      {admin ? <p>User: {item.user?.name} · Owner: {item.owner?.name} · Status: {labels[item.status] || item.status}</p> : owner ? <><p>Tenant: {item.user?.name}</p><p>{item.message || "No message"}</p>
      {item.status === "confirmed" && <><section><h4>Tenant contact</h4><p>{item.user?.phone || "Phone not provided"} · {item.user?.email}</p><div className="modal-actions">{item.user?.phone && <a className="btn btn-outline" href={`tel:${encodeURIComponent(item.user.phone)}`}>Call tenant</a>}{item.user?.email && <a className="btn btn-outline" href={`mailto:${encodeURIComponent(item.user.email)}`}>Email tenant</a>}</div></section><button className="btn btn-outline" onClick={() => setOpenChatId(openChatId === item.id ? null : item.id)}>{openChatId === item.id ? "Close chat" : "Chat with tenant"}</button>{openChatId === item.id && <RequestChat requestId={item.id} />}<PaymentProofs request={item} owner /></>}
        {item.status === "pending" && <div className="modal-actions"><button className="btn btn-primary" disabled={busy === item.id} onClick={() => act(item,"owner_accept")}>Confirm &amp; Book Room</button><button className="btn btn-danger" disabled={busy === item.id} onClick={() => act(item,"owner_reject")}>Reject</button></div>}
      </> : <><p>Owner: {item.owner?.name}</p>{item.status === "owner_accepted" || item.status === "confirmed" ? <section><h4>Owner Contact Details</h4><p>{item.owner?.phone || "Phone not provided"} · {item.owner?.email}</p></section> : <p>Contact details will be available after the owner accepts your request.</p>}
        {item.status === "owner_accepted" && <div className="modal-actions"><button className="btn btn-primary" disabled={busy === item.id} onClick={() => act(item,"user_confirm")}>Accept &amp; Confirm Room</button><button className="btn btn-secondary" disabled={busy === item.id} onClick={() => act(item,"user_reject")}>Decline</button></div>}
        {item.status === "confirmed" && <><button className="btn btn-outline" onClick={() => setOpenChatId(openChatId === item.id ? null : item.id)}>{openChatId === item.id ? "Close chat" : "Chat with owner"}</button>{openChatId === item.id && <RequestChat requestId={item.id} />}<PaymentProofs request={item} /><button className="btn btn-danger" disabled={busy === item.id} onClick={() => { if (window.confirm("Cancel this booking and release the room?")) act(item,"cancel_booking"); }}>Cancel Booking</button></>}
      </>}
    </article>)}</div>}
  </main>;
}
