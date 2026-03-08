// src/pages/user/Withdraw.jsx
// Real withdrawal flow: Firestore request → Admin approves → Cloud Function → PayPal API
import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, runTransaction,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";

const MIN_WITHDRAWAL = parseFloat(process.env.REACT_APP_MIN_WITHDRAWAL ?? "1");

export default function Withdraw({ onToast }) {
  const { currentUser, userProfile } = useAuth();
  const [form, setForm]       = useState({ amount: "", method: "PayPal", account: "" });
  const [withdrawals, setW]   = useState([]);
  const [submitting, setSub]  = useState(false);

  // Live withdrawal history
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "withdrawals"),
      where("userId", "==", currentUser.uid),
      orderBy("date", "desc")
    );
    return onSnapshot(q, (snap) => setW(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [currentUser]);

  const balance = userProfile?.balance ?? 0;

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount < MIN_WITHDRAWAL)
      return onToast(`Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}`, "error");
    if (amount > balance)
      return onToast("Insufficient balance", "error");
    if (!form.account.trim())
      return onToast("Please enter your account details", "error");

    setSub(true);
    try {
      // Atomic transaction: deduct balance + create withdrawal request
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await tx.get(userRef);
        const current = userSnap.data().balance;
        if (amount > current) throw new Error("Insufficient balance");

        tx.update(userRef, { balance: parseFloat((current - amount).toFixed(2)) });

        const wRef = doc(collection(db, "withdrawals"));
        tx.set(wRef, {
          userId:   currentUser.uid,
          userName: userProfile.name,
          amount,
          method:   form.method,
          account:  form.account,
          status:   "pending",       // Admin will approve → Cloud Fn sends PayPal
          date:     serverTimestamp(),
          processed: false,
        });
      });

      setForm({ amount: "", method: "PayPal", account: "" });
      onToast(`Withdrawal of $${amount.toFixed(2)} submitted! Admin will process within 24h.`);
    } catch (err) {
      onToast(err.message || "Submission failed", "error");
    } finally {
      setSub(false);
    }
  };

  const statusColor = { pending: "var(--gold)", approved: "var(--sky)", paid: "var(--emerald)", rejected: "var(--crimson)" };

  return (
    <div>
      <h1 style={s.heading}>Withdraw Funds</h1>
      <p style={s.sub}>Minimum ${MIN_WITHDRAWAL.toFixed(2)} • Payments processed within 24 hours</p>

      <div style={s.grid}>
        {/* Left col */}
        <div>
          <div style={s.balCard}>
            <p style={s.balLabel}>Available Balance</p>
            <p style={s.balValue}>${balance.toFixed(2)}</p>
            {balance < MIN_WITHDRAWAL && (
              <p style={s.balNote}>
                Watch {Math.ceil((MIN_WITHDRAWAL - balance) / 0.05)} more ads to unlock withdrawal
              </p>
            )}
          </div>

          <div style={s.card}>
            <p style={s.cardTitle}>New Withdrawal Request</p>

            {/* Amount */}
            <label style={s.label}>Amount (USD)</label>
            <div style={s.inputWrap}>
              <span style={s.inputIcon}>$</span>
              <input
                type="number" min={MIN_WITHDRAWAL} step="0.01" max={balance}
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={`${MIN_WITHDRAWAL.toFixed(2)}`}
                style={s.input}
              />
            </div>

            {/* Method */}
            <label style={s.label}>Payment Method</label>
            <div style={s.methods}>
              {["PayPal","Bank Transfer","Crypto (USDT)"].map(m => (
                <button key={m} onClick={() => setForm(f => ({ ...f, method: m, account: "" }))}
                  style={{ ...s.methodBtn, borderColor: form.method === m ? "var(--gold)" : "var(--border)", color: form.method === m ? "var(--gold)" : "var(--muted)", background: form.method === m ? "rgba(245,200,66,.08)" : "transparent" }}>
                  {m}
                </button>
              ))}
            </div>

            {/* Account */}
            <label style={s.label}>
              {form.method === "PayPal" ? "PayPal Email" : form.method === "Crypto (USDT)" ? "USDT Wallet Address (TRC-20)" : "Bank Account Number"}
            </label>
            <input
              value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}
              placeholder={form.method === "PayPal" ? "you@paypal.com" : form.method === "Crypto (USDT)" ? "T..." : "Account number"}
              style={{ ...s.input, paddingLeft: 14, width: "100%" }}
            />

            <button
              onClick={handleSubmit}
              disabled={submitting || balance < MIN_WITHDRAWAL}
              style={{ ...s.submitBtn, opacity: (submitting || balance < MIN_WITHDRAWAL) ? .45 : 1 }}
            >
              {submitting ? "Submitting..." : "Request Withdrawal ↑"}
            </button>
          </div>
        </div>

        {/* Right col */}
        <div style={s.card}>
          <p style={s.cardTitle}>Withdrawal History</p>
          {withdrawals.length === 0
            ? <p style={s.empty}>No withdrawals yet.</p>
            : withdrawals.map(w => (
              <div key={w.id} style={s.wRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:16 }}>
                      ${w.amount?.toFixed(2)}
                    </span>
                    <span style={{ ...s.badge, background: `${statusColor[w.status]}20`, color: statusColor[w.status], border: `1px solid ${statusColor[w.status]}40` }}>
                      {w.status?.toUpperCase()}
                    </span>
                    {w.paypalBatchId && <span style={{ fontSize:11, color:"var(--muted)" }}>ID: {w.paypalBatchId.slice(0,12)}</span>}
                  </div>
                  <p style={{ fontSize:12, color:"var(--muted)" }}>{w.method} • {w.account} • {w.date?.toDate?.()?.toLocaleDateString() ?? "—"}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  heading:   { fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:6 },
  sub:       { color:"var(--muted)", fontSize:14, marginBottom:28 },
  grid:      { display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 },
  balCard:   { background:"linear-gradient(135deg,#1c1a0e,#241f0a)", border:"1px solid rgba(245,200,66,.2)", borderRadius:14, padding:24, marginBottom:16 },
  balLabel:  { fontSize:12, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 },
  balValue:  { fontFamily:"'Syne',sans-serif", fontSize:40, fontWeight:800, color:"var(--gold)" },
  balNote:   { fontSize:12, color:"var(--muted)", marginTop:8 },
  card:      { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:24 },
  cardTitle: { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, marginBottom:20 },
  label:     { display:"block", fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:6, marginTop:14 },
  inputWrap: { position:"relative" },
  inputIcon: { position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" },
  input:     { width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 14px 12px 34px", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"inherit" },
  methods:   { display:"flex", gap:8, flexWrap:"wrap", marginBottom:4 },
  methodBtn: { padding:"8px 14px", borderRadius:8, border:"1px solid", cursor:"pointer", fontSize:13, fontFamily:"inherit", transition:"all .2s" },
  submitBtn: { width:"100%", marginTop:20, background:"var(--gold)", color:"#0a0a0f", border:"none", borderRadius:10, padding:"13px 0", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, cursor:"pointer" },
  empty:     { color:"var(--muted)", textAlign:"center", padding:32, fontSize:14 },
  wRow:      { padding:"14px 0", borderBottom:"1px solid var(--border)" },
  badge:     { fontSize:11, fontWeight:600, borderRadius:6, padding:"2px 10px" },
};
