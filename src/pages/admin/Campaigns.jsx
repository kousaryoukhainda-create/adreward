// src/pages/admin/Campaigns.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function AdminCampaigns({ onToast }) {
  const [ads, setAds]           = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    brand:"", title:"", description:"", logo:"🎯", duration:30,
    userEarn:0.08, appEarn:0.05, category:"Technology", budget:500, color:"#6366f1",
    placementId:"", active:true,
  });

  useEffect(() => {
    return onSnapshot(collection(db, "ads"), (snap) =>
      setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const handleSave = async () => {
    if (!form.brand || !form.title) return onToast("Brand and title required", "error");
    setSaving(true);
    try {
      await addDoc(collection(db, "ads"), { ...form, totalViews: 0, createdAt: serverTimestamp() });
      setShowForm(false);
      setForm({ brand:"", title:"", description:"", logo:"🎯", duration:30, userEarn:0.08, appEarn:0.05, category:"Technology", budget:500, color:"#6366f1", placementId:"", active:true });
      onToast("Campaign created!");
    } catch (err) { onToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (ad) => {
    await updateDoc(doc(db, "ads", ad.id), { active: !ad.active });
    onToast(`Campaign ${!ad.active ? "activated" : "paused"}`);
  };

  const revenue = (ad) => ad.totalViews * ad.appEarn;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <h1 style={s.heading}>Ad Campaigns</h1>
          <p style={s.sub}>Manage advertiser campaigns. Revenue split is set per campaign.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={s.addBtn}>+ New Campaign</button>
      </div>

      {showForm && (
        <div style={s.formCard}>
          <p style={s.formTitle}>Create Campaign</p>
          <div style={s.formGrid}>
            <Field label="Brand Name *"   value={form.brand}       onChange={v => setForm(f => ({...f, brand:v}))}       placeholder="e.g. Nike" />
            <Field label="Ad Title *"     value={form.title}       onChange={v => setForm(f => ({...f, title:v}))}       placeholder="Campaign tagline" />
            <Field label="Description"    value={form.description} onChange={v => setForm(f => ({...f, description:v}))} placeholder="What does the ad promote?" />
            <Field label="Logo Emoji"     value={form.logo}        onChange={v => setForm(f => ({...f, logo:v}))}        placeholder="🎯" />
            <Field label="Duration (sec)" value={form.duration}    onChange={v => setForm(f => ({...f, duration:+v}))}   type="number" />
            <Field label="User Earn ($)"  value={form.userEarn}    onChange={v => setForm(f => ({...f, userEarn:+v}))}   type="number" />
            <Field label="App Earn ($)"   value={form.appEarn}     onChange={v => setForm(f => ({...f, appEarn:+v}))}    type="number" />
            <Field label="Budget ($)"     value={form.budget}      onChange={v => setForm(f => ({...f, budget:+v}))}     type="number" />
            <Field label="AppLovin Placement ID" value={form.placementId} onChange={v => setForm(f => ({...f, placementId:v}))} placeholder="From AppLovin dashboard" />
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={handleSave} disabled={saving} style={s.saveBtn}>{saving ? "Saving…" : "Create Campaign"}</button>
            <button onClick={() => setShowForm(false)} style={s.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      <div style={s.list}>
        {ads.map((ad, i) => (
          <div key={ad.id} style={s.adRow}>
            <div style={{ ...s.adLogo, background:`${ad.color}20`, border:`1px solid ${ad.color}30` }}>{ad.logo}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontWeight:600 }}>{ad.brand}</span>
                <span style={{ ...s.chip, background:`${ad.color}20`, color:ad.color }}>{ad.category}</span>
                <span style={{ ...s.chip, background: ad.active ? "rgba(46,204,138,.1)" : "rgba(107,107,133,.1)", color: ad.active ? "var(--emerald)" : "var(--muted)" }}>
                  {ad.active ? "LIVE" : "PAUSED"}
                </span>
              </div>
              <p style={s.adTitle}>{ad.title}</p>
            </div>
            <div style={s.adStats}>
              <Stat label="Views"     value={ad.totalViews?.toLocaleString() ?? 0} />
              <Stat label="User/view" value={`$${ad.userEarn?.toFixed(2)}`}       color="var(--gold)" />
              <Stat label="App/view"  value={`$${ad.appEarn?.toFixed(2)}`}        color="var(--crimson)" />
              <Stat label="Revenue"   value={`$${revenue(ad).toFixed(2)}`}        color="var(--emerald)" />
            </div>
            <div style={s.toggle} onClick={() => toggleActive(ad)}>
              <div style={{ ...s.toggleBall, left: ad.active ? 22 : 2, background: ad.active ? "#0a0a0f" : "var(--muted)" }} />
            </div>
          </div>
        ))}
        {ads.length === 0 && <p style={s.empty}>No campaigns yet. Create one above.</p>}
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, type="text", placeholder }) => (
  <div>
    <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:5 }}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
      style={{ width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", color:"var(--text)", fontSize:13, outline:"none", fontFamily:"inherit" }} />
  </div>
);

const Stat = ({ label, value, color="var(--text)" }) => (
  <div style={{ textAlign:"right" }}>
    <p style={{ fontSize:10, color:"var(--muted)", marginBottom:2 }}>{label}</p>
    <p style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, color, fontSize:13 }}>{value}</p>
  </div>
);

const s = {
  heading:   { fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:6 },
  sub:       { color:"var(--muted)", fontSize:14 },
  addBtn:    { background:"var(--gold)", color:"#0a0a0f", border:"none", borderRadius:10, padding:"11px 22px", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer" },
  formCard:  { background:"var(--card)", border:"1px solid rgba(245,200,66,.2)", borderRadius:14, padding:24, marginBottom:24 },
  formTitle: { fontFamily:"'Syne',sans-serif", fontWeight:700, marginBottom:16 },
  formGrid:  { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 },
  saveBtn:   { background:"var(--gold)", color:"#0a0a0f", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit" },
  cancelBtn: { background:"transparent", color:"var(--muted)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontSize:14, fontFamily:"inherit" },
  list:      { display:"flex", flexDirection:"column", gap:10 },
  adRow:     { background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, display:"flex", alignItems:"center", gap:16 },
  adLogo:    { width:48, height:48, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 },
  adTitle:   { fontSize:13, color:"var(--muted)" },
  chip:      { fontSize:10, fontWeight:600, borderRadius:5, padding:"2px 8px", letterSpacing:".04em" },
  adStats:   { display:"flex", gap:24, flexShrink:0 },
  toggle:    { width:44, height:24, borderRadius:12, background:"var(--border)", position:"relative", cursor:"pointer", flexShrink:0 },
  toggleBall:{ position:"absolute", top:3, width:18, height:18, borderRadius:"50%", background:"var(--muted)", transition:"left .2s" },
  empty:     { color:"var(--muted)", textAlign:"center", padding:48, fontSize:14 },
};
