// src/pages/user/Dashboard.jsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function Dashboard({ onNavigate }) {
  const { currentUser, userProfile } = useAuth();
  const [recentEarnings, setRecentEarnings] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "earnings"),
      where("userId", "==", currentUser.uid),
      orderBy("date", "desc"),
      limit(5)
    );
    return onSnapshot(q, (snap) => {
      setRecentEarnings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [currentUser]);

  const balance     = userProfile?.balance     ?? 0;
  const totalEarned = userProfile?.totalEarned ?? 0;
  const adsWatched  = userProfile?.adsWatched  ?? 0;

  return (
    <div>
      <h1 style={s.heading}>Welcome back, {userProfile?.name?.split(" ")[0] ?? "there"} 👋</h1>
      <p style={s.sub}>Your earnings update in real time every time you watch an ad.</p>

      <div style={s.statsRow}>
        {[
          { label: "Available Balance",   value: `$${balance.toFixed(2)}`,     sub: "Ready to withdraw",   icon: "💰", color: "var(--gold)" },
          { label: "Total Earned",        value: `$${totalEarned.toFixed(2)}`, sub: "All-time earnings",   icon: "📈", color: "var(--emerald)" },
          { label: "Ads Watched",         value: adsWatched,                   sub: "Total completions",   icon: "👁",  color: "var(--sky)" },
        ].map((stat) => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={s.statLabel}>{stat.label}</p>
                <p style={{ ...s.statValue, color: stat.color }}>{stat.value}</p>
                <p style={s.statSub}>{stat.sub}</p>
              </div>
              <span style={{ fontSize: 28 }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={s.cta}>
        <div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Ready to earn real money?</p>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>New ads available — each view credits your account instantly.</p>
        </div>
        <button onClick={() => onNavigate("watch")} style={s.ctaBtn}>▶ Watch Ads Now</button>
      </div>

      {/* Minimum withdrawal notice */}
      {balance > 0 && balance < 1 && (
        <div style={s.notice}>
          💡 You need <strong>$1.00</strong> to withdraw. You're {((balance / 1) * 100).toFixed(0)}% there!
          <div style={s.progressBg}><div style={{ ...s.progressFill, width: `${(balance / 1) * 100}%` }} /></div>
        </div>
      )}

      {/* Recent Activity */}
      <div style={s.card}>
        <p style={s.cardTitle}>Recent Earnings</p>
        {recentEarnings.length === 0 ? (
          <p style={s.empty}>No earnings yet — watch your first ad to get started!</p>
        ) : recentEarnings.map((e) => (
          <div key={e.id} style={s.row}>
            <div style={s.rowIcon}>🎬</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{e.adTitle ?? "Ad view"}</p>
              <p style={s.rowDate}>{e.date?.toDate?.()?.toLocaleString() ?? "—"}</p>
            </div>
            <span style={s.rowAmount}>+${e.amount?.toFixed(2)}</span>
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
  statLabel:   { color:"var(--muted)", fontSize:12, fontWeight:500, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 },
  statValue:   { fontSize:28, fontWeight:800, fontFamily:"'Syne',sans-serif" },
  statSub:     { color:"var(--muted)", fontSize:12, marginTop:4 },
  cta:         { background:"linear-gradient(135deg,#1c1a0e,#241f0a)", border:"1px solid rgba(245,200,66,.2)", borderRadius:14, padding:24, display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 },
  ctaBtn:      { background:"var(--gold)", color:"#0a0a0f", border:"none", borderRadius:10, padding:"14px 28px", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, cursor:"pointer" },
  notice:      { background:"rgba(56,189,248,.06)", border:"1px solid rgba(56,189,248,.2)", borderRadius:12, padding:"16px 20px", marginBottom:20, fontSize:14 },
  progressBg:  { height:6, background:"var(--border)", borderRadius:3, marginTop:10, overflow:"hidden" },
  progressFill:{ height:"100%", background:"var(--sky)", borderRadius:3, transition:"width 1s" },
  card:        { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:24 },
  cardTitle:   { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, marginBottom:16 },
  empty:       { color:"var(--muted)", textAlign:"center", padding:32, fontSize:14 },
  row:         { display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid var(--border)" },
  rowIcon:     { width:36, height:36, borderRadius:10, background:"rgba(46,204,138,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 },
  rowDate:     { fontSize:11, color:"var(--muted)", fontFamily:"'DM Mono',monospace", marginTop:2 },
  rowAmount:   { color:"var(--emerald)", fontFamily:"'DM Mono',monospace", fontWeight:600, fontSize:15 },
};
