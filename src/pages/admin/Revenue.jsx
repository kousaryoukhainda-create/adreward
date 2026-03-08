// src/pages/admin/Revenue.jsx
import { useState, useEffect } from "react";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function AdminRevenue() {
  const [totals, setTotals] = useState({});
  const [ads, setAds]       = useState([]);
  const [users, setUsers]   = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, "revenue", "totals"), (snap) => {
      if (snap.exists()) setTotals(snap.data());
    });
    const u2 = onSnapshot(collection(db, "ads"), (snap) =>
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u3 = onSnapshot(collection(db, "users"), (snap) =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); u3(); };
  }, []);

  const appRevenue  = totals.totalAppRevenue  ?? 0;
  const userPayouts = totals.totalUserPayouts ?? 0;
  const totalViews  = totals.totalViews       ?? 0;
  const grossRevenue = appRevenue + userPayouts;

  const stats = [
    { label:"Gross Ad Revenue",    value:`$${grossRevenue.toFixed(2)}`,  icon:"📊", color:"var(--gold)" },
    { label:"Platform Revenue",    value:`$${appRevenue.toFixed(2)}`,    icon:"🏦", color:"var(--crimson)" },
    { label:"Total User Payouts",  value:`$${userPayouts.toFixed(2)}`,   icon:"💸", color:"var(--emerald)" },
    { label:"Total Ad Views",      value: totalViews.toLocaleString(),   icon:"👁",  color:"var(--sky)" },
  ];

  const topAds = [...ads].sort((a,b) => (b.totalViews * b.appEarn) - (a.totalViews * a.appEarn));
  const maxRevenue = topAds[0] ? topAds[0].totalViews * topAds[0].appEarn : 1;

  return (
    <div>
      <h1 style={s.heading}>Revenue Analytics</h1>
      <p style={s.sub}>Live data from Firestore — updates in real time.</p>

      <div style={s.statsRow}>
        {stats.map((stat, i) => (
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

      {/* Revenue model */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <div style={s.card}>
          <p style={s.cardTitle}>Revenue Split</p>
          <div style={{ margin:"20px 0" }}>
            <div style={{ height:16, borderRadius:8, overflow:"hidden", display:"flex" }}>
              <div style={{ width:`${grossRevenue > 0 ? (userPayouts/grossRevenue)*100 : 60}%`, background:"var(--gold)", transition:"width 1s" }} />
              <div style={{ flex:1, background:"var(--crimson)" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--gold)" }} />
                <span style={{ fontSize:13, color:"var(--muted)" }}>User Rewards ({grossRevenue > 0 ? Math.round((userPayouts/grossRevenue)*100) : 60}%)</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--crimson)" }} />
                <span style={{ fontSize:13, color:"var(--muted)" }}>Platform ({grossRevenue > 0 ? Math.round((appRevenue/grossRevenue)*100) : 40}%)</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ background:"rgba(245,200,66,.06)", borderRadius:10, padding:14 }}>
              <p style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Avg per view (user)</p>
              <p style={{ fontFamily:"'DM Mono',monospace", color:"var(--gold)", fontWeight:700, fontSize:18 }}>
                ${ads.length > 0 ? (ads.reduce((s,a) => s+a.userEarn,0)/ads.length).toFixed(3) : "0.000"}
              </p>
            </div>
            <div style={{ background:"rgba(255,77,106,.06)", borderRadius:10, padding:14 }}>
              <p style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Avg per view (app)</p>
              <p style={{ fontFamily:"'DM Mono',monospace", color:"var(--crimson)", fontWeight:700, fontSize:18 }}>
                ${ads.length > 0 ? (ads.reduce((s,a) => s+a.appEarn,0)/ads.length).toFixed(3) : "0.000"}
              </p>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <p style={s.cardTitle}>Platform Summary</p>
          {[
            { label:"Total Users",         value: users.length },
            { label:"Active Campaigns",    value: ads.filter(a=>a.active).length },
            { label:"Total Ad Views",      value: totalViews.toLocaleString() },
            { label:"Avg Earnings / User", value:`$${users.length > 0 ? (userPayouts / users.length).toFixed(2) : "0.00"}` },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontSize:14, color:"var(--muted)" }}>{row.label}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign breakdown */}
      <div style={s.card}>
        <p style={s.cardTitle}>Campaign Performance</p>
        {topAds.map(ad => {
          const rev = ad.totalViews * ad.appEarn;
          const pct = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0;
          const budgetPct = Math.min((ad.totalViews * (ad.userEarn + ad.appEarn) / (ad.budget || 1)) * 100, 100);
          return (
            <div key={ad.id} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:18 }}>{ad.logo}</span>
                  <span style={{ fontWeight:600, fontSize:14 }}>{ad.brand}</span>
                  <span style={{ ...s.chip, background:ad.active?"rgba(46,204,138,.1)":"rgba(107,107,133,.1)", color:ad.active?"var(--emerald)":"var(--muted)" }}>
                    {ad.active ? "LIVE" : "PAUSED"}
                  </span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", color:"var(--gold)", fontWeight:600 }}>${rev.toFixed(2)}</span>
                  <span style={{ color:"var(--muted)", fontSize:12, marginLeft:6 }}>platform revenue</span>
                </div>
              </div>
              <div style={{ height:6, borderRadius:3, background:"var(--border)", overflow:"hidden", marginBottom:4 }}>
                <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${ad.color},${ad.color}88)`, transition:"width 1s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--muted)" }}>
                <span>{ad.totalViews?.toLocaleString()} views • Budget ${ad.budget}</span>
                <span style={{ color: budgetPct > 80 ? "var(--crimson)" : "var(--muted)" }}>
                  Budget used: {budgetPct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
        {ads.length === 0 && <p style={s.empty}>No campaigns yet.</p>}
      </div>
    </div>
  );
}

const s = {
  heading:   { fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:6 },
  sub:       { color:"var(--muted)", fontSize:14, marginBottom:28 },
  statsRow:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 },
  statCard:  { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:20 },
  statLabel: { fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 },
  statValue: { fontSize:24, fontWeight:800, fontFamily:"'Syne',sans-serif" },
  card:      { background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:24 },
  cardTitle: { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, marginBottom:16 },
  chip:      { fontSize:10, fontWeight:600, borderRadius:5, padding:"2px 8px" },
  empty:     { color:"var(--muted)", textAlign:"center", padding:32 },
};
