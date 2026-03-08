// src/pages/admin/Users.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function AdminUsers({ onToast }) {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const toggleStatus = async (u) => {
    const next = u.status === "active" ? "suspended" : "active";
    await updateDoc(doc(db, "users", u.id), { status: next });
    onToast(`User ${next === "active" ? "re-activated" : "suspended"}`);
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance     = users.reduce((s,u) => s + (u.balance ?? 0), 0);
  const totalEarned      = users.reduce((s,u) => s + (u.totalEarned ?? 0), 0);
  const totalAdsWatched  = users.reduce((s,u) => s + (u.adsWatched ?? 0), 0);

  return (
    <div>
      <h1 style={s.heading}>User Management</h1>
      <p style={s.sub}>All registered users — data live from Firestore.</p>

      <div style={s.statsRow}>
        {[
          { label:"Total Users",       value: users.length,                icon:"👥", color:"var(--sky)" },
          { label:"Total Balances",    value:`$${totalBalance.toFixed(2)}`,icon:"💰", color:"var(--gold)" },
          { label:"Total Earned",      value:`$${totalEarned.toFixed(2)}`, icon:"📈", color:"var(--emerald)" },
          { label:"Total Ads Watched", value: totalAdsWatched.toLocaleString(), icon:"🎬", color:"var(--crimson)" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <p style={s.statLabel}>{stat.label}</p>
                <p style={{ ...s.statValue, color:stat.color }}>{stat.value}</p>
              </div>
              <span style={{ fontSize:26 }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom:16, position:"relative" }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
          style={s.searchInput} />
      </div>

      <div style={s.card}>
        <div style={s.tableHeader}>
          <span>User</span>
          <span>Balance</span>
          <span>Total Earned</span>
          <span>Ads Watched</span>
          <span>Joined</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {filtered.length === 0 ? (
          <p style={s.empty}>No users found.</p>
        ) : filtered.map((u, i) => (
          <div key={u.id} style={s.tableRow}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ ...s.avatar, background:`linear-gradient(135deg,${["#6366f1","#ec4899","#10b981","#f59e0b"][i%4]},${["#8b5cf6","#f43f5e","#06b6d4","#ef4444"][i%4]})` }}>
                {u.name?.[0] ?? "?"}
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:600 }}>{u.name}</p>
                <p style={{ fontSize:11, color:"var(--muted)" }}>{u.email}</p>
              </div>
            </div>
            <span style={{ fontFamily:"'DM Mono',monospace", color:"var(--gold)" }}>${(u.balance ?? 0).toFixed(2)}</span>
            <span style={{ fontFamily:"'DM Mono',monospace", color:"var(--emerald)" }}>${(u.totalEarned ?? 0).toFixed(2)}</span>
            <span style={{ fontFamily:"'DM Mono',monospace" }}>{u.adsWatched ?? 0}</span>
            <span style={{ fontSize:12, color:"var(--muted)" }}>{u.joinDate?.toDate?.()?.toLocaleDateString() ?? "—"}</span>
            <span style={{ ...s.statusBadge, background:u.status==="active"?"rgba(46,204,138,.1)":"rgba(255,77,106,.1)", color:u.status==="active"?"var(--emerald)":"var(--crimson)" }}>
              {u.status?.toUpperCase() ?? "ACTIVE"}
            </span>
            <button onClick={() => toggleStatus(u)} style={{ ...s.actionBtn, borderColor:u.status==="active"?"rgba(255,77,106,.3)":"rgba(46,204,138,.3)", color:u.status==="active"?"var(--crimson)":"var(--emerald)" }}>
              {u.status === "active" ? "Suspend" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  heading:     { fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:6 },
  sub:         { color:"var(--muted)", fontSize:14, marginBottom:28 },
  statsRow:    { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 },
  statCard:    { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:20 },
  statLabel:   { fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 },
  statValue:   { fontSize:24, fontWeight:800, fontFamily:"'Syne',sans-serif" },
  searchInput: { width:"100%", background:"var(--card)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 14px 12px 42px", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"inherit" },
  card:        { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" },
  tableHeader: { display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap:16, padding:"12px 24px", background:"var(--surface)", fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" },
  tableRow:    { display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap:16, padding:"14px 24px", borderTop:"1px solid var(--border)", alignItems:"center" },
  avatar:      { width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, flexShrink:0 },
  statusBadge: { fontSize:10, fontWeight:600, borderRadius:5, padding:"3px 8px", width:"fit-content" },
  actionBtn:   { background:"transparent", border:"1px solid", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 },
  empty:       { color:"var(--muted)", textAlign:"center", padding:48, fontSize:14 },
};
