// src/pages/admin/Payouts.jsx
// Admin approves → Cloud Function sends real PayPal payout
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";

const processWithdrawal = httpsCallable(functions, "processWithdrawal");
const approveWithdrawal = httpsCallable(functions, "approveWithdrawal");

export default function AdminPayouts({ onToast }) {
  const [withdrawals, setW] = useState([]);
  const [processing, setPr] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "withdrawals"), orderBy("date", "desc"));
    return onSnapshot(q, (snap) => setW(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleApprove = async (w) => {
    setPr(w.id);
    try {
      await approveWithdrawal({ withdrawalId: w.id });
      onToast(`✓ Approved $${w.amount.toFixed(2)} for ${w.userName}`);
    } catch (err) {
      onToast(err.message, "error");
    } finally { setPr(null); }
  };

  const handlePay = async (w) => {
    if (!window.confirm(`Send $${w.amount.toFixed(2)} via PayPal to ${w.account}?`)) return;
    setPr(w.id);
    try {
      const result = await processWithdrawal({ withdrawalId: w.id });
      onToast(`💸 Paid! PayPal Batch ID: ${result.data.batchId}`);
    } catch (err) {
      onToast(err.message, "error");
    } finally { setPr(null); }
  };

  const handleReject = async (w) => {
    setPr(w.id);
    try {
      // Refund balance
      const { runTransaction, doc: firestoreDoc, getDoc } = await import("firebase/firestore");
      await runTransaction(db, async (tx) => {
        const wRef   = firestoreDoc(db, "withdrawals", w.id);
        const uRef   = firestoreDoc(db, "users", w.userId);
        const uSnap  = await tx.get(uRef);
        const bal    = uSnap.data().balance;
        tx.update(wRef, { status: "rejected" });
        tx.update(uRef, { balance: parseFloat((bal + w.amount).toFixed(2)) });
      });
      onToast(`Rejected & refunded $${w.amount.toFixed(2)} to ${w.userName}`);
    } catch (err) {
      onToast(err.message, "error");
    } finally { setPr(null); }
  };

  const statusColor = { pending:"var(--gold)", approved:"var(--sky)", paid:"var(--emerald)", rejected:"var(--crimson)" };
  const filtered = filter === "all" ? withdrawals : withdrawals.filter(w => w.status === filter);
  const totals = {
    pending:  withdrawals.filter(w => w.status === "pending").length,
    approved: withdrawals.filter(w => w.status === "approved").length,
    paid:     withdrawals.reduce((s, w) => w.status === "paid" ? s + w.amount : s, 0),
  };

  return (
    <div>
      <h1 style={s.heading}>Payout Management</h1>
      <p style={s.sub}>Approve requests and trigger PayPal payouts via the real API.</p>

      <div style={s.statsRow}>
        {[
          { label:"Pending Approval", value: totals.pending,          color:"var(--gold)",    icon:"⏳" },
          { label:"Ready to Pay",     value: totals.approved,         color:"var(--sky)",     icon:"✅" },
          { label:"Total Paid Out",   value:`$${totals.paid.toFixed(2)}`,color:"var(--emerald)",icon:"💸" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <p style={s.statLabel}>{stat.label}</p>
                <p style={{ ...s.statValue, color:stat.color }}>{stat.value}</p>
              </div>
              <span style={{ fontSize:28 }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {["all","pending","approved","paid","rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...s.tab, borderColor: filter === f ? "var(--crimson)" : "var(--border)", color: filter === f ? "var(--crimson)" : "var(--muted)", background: filter === f ? "rgba(255,77,106,.08)" : "transparent" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && totals.pending > 0 && <span style={s.badge}>{totals.pending}</span>}
          </button>
        ))}
      </div>

      <div style={s.card}>
        {filtered.length === 0 ? (
          <p style={s.empty}>No {filter === "all" ? "" : filter} withdrawals.</p>
        ) : filtered.map(w => (
          <div key={w.id} style={s.row}>
            <div style={{ flex: 1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <span style={{ fontWeight:600 }}>{w.userName}</span>
                <span style={{ ...s.statusBadge, background:`${statusColor[w.status]}20`, color:statusColor[w.status], border:`1px solid ${statusColor[w.status]}40` }}>
                  {w.status?.toUpperCase()}
                </span>
                {w.paypalBatchId && <span style={{ fontSize:11, color:"var(--muted)", fontFamily:"'DM Mono',monospace" }}>Batch: {w.paypalBatchId.slice(0,16)}…</span>}
              </div>
              <p style={s.meta}>{w.method} → {w.account} • {w.date?.toDate?.()?.toLocaleDateString() ?? "—"}</p>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:20 }}>${w.amount?.toFixed(2)}</span>

              {w.status === "pending" && (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => handleApprove(w)} disabled={processing === w.id} style={s.approveBtn}>
                    {processing === w.id ? "..." : "✓ Approve"}
                  </button>
                  <button onClick={() => handleReject(w)} disabled={processing === w.id} style={s.rejectBtn}>
                    ✗ Reject
                  </button>
                </div>
              )}

              {w.status === "approved" && !w.processed && (
                <button onClick={() => handlePay(w)} disabled={processing === w.id} style={s.payBtn}>
                  {processing === w.id ? "Sending..." : "💸 Send PayPal"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  heading:     { fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:6 },
  sub:         { color:"var(--muted)", fontSize:14, marginBottom:28 },
  statsRow:    { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 },
  statCard:    { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:24 },
  statLabel:   { fontSize:12, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 },
  statValue:   { fontSize:28, fontWeight:800, fontFamily:"'Syne',sans-serif" },
  tabs:        { display:"flex", gap:8, marginBottom:16 },
  tab:         { padding:"8px 16px", borderRadius:8, border:"1px solid", cursor:"pointer", fontSize:13, fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 },
  badge:       { background:"var(--crimson)", color:"white", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:700 },
  card:        { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:24 },
  empty:       { color:"var(--muted)", textAlign:"center", padding:32, fontSize:14 },
  row:         { display:"flex", alignItems:"center", gap:16, padding:"16px 0", borderBottom:"1px solid var(--border)" },
  meta:        { fontSize:12, color:"var(--muted)" },
  statusBadge: { fontSize:11, fontWeight:600, borderRadius:6, padding:"2px 10px" },
  approveBtn:  { background:"rgba(46,204,138,.12)", color:"var(--emerald)", border:"1px solid rgba(46,204,138,.3)", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 },
  rejectBtn:   { background:"rgba(255,77,106,.12)", color:"var(--crimson)", border:"1px solid rgba(255,77,106,.3)", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 },
  payBtn:      { background:"rgba(56,189,248,.12)", color:"var(--sky)", border:"1px solid rgba(56,189,248,.3)", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:14, fontFamily:"inherit", fontWeight:700 },
};
