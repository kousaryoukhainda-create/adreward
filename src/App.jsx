// src/App.jsx
import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/user/Dashboard";
import WatchEarn from "./pages/user/WatchEarn";
import Withdraw  from "./pages/user/Withdraw";
import AdminCampaigns from "./pages/admin/Campaigns";
import AdminUsers     from "./pages/admin/Users";
import AdminPayouts   from "./pages/admin/Payouts";
import AdminRevenue   from "./pages/admin/Revenue";

/* ─── GLOBAL STYLES ─────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink: #0a0a0f; --surface: #111118; --card: #16161f; --border: #252535;
      --gold: #f5c842; --emerald: #2ecc8a; --crimson: #ff4d6a; --sky: #38bdf8;
      --text: #e8e8f0; --muted: #6b6b85; --radius: 14px;
    }
    html, body { background: var(--ink); color: var(--text); font-family: 'Instrument Sans', sans-serif; min-height: 100vh; }
    input, button { font-family: inherit; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--surface); } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    @keyframes slide-up { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  `}</style>
);

/* ─── TOAST ──────────────────────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, right:28, zIndex:9999,
      background: toast.type === "error" ? "var(--crimson)" : "var(--emerald)",
      color:"white", borderRadius:12, padding:"14px 20px", fontSize:14, fontWeight:600,
      boxShadow:"0 8px 32px rgba(0,0,0,.4)", animation:"slide-up .3s ease", maxWidth:380,
    }}>{toast.msg}</div>
  );
}

/* ─── AUTH SCREEN ────────────────────────────────────────────────────────────── */
function AuthScreen({ mode, setMode }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.code === "auth/invalid-credential" ? "Invalid email or password" : err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"radial-gradient(ellipse at 20% 50%, #1a1209 0%, var(--ink) 60%)", padding:20 }}>
      <div style={{ width:"100%", maxWidth:420, animation:"slide-up .4s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12, animation:"float 3s ease infinite" }}>▶</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, color:"var(--gold)" }}>AdReward</h1>
          <p style={{ color:"var(--muted)", marginTop:6 }}>Watch ads. Earn real money.</p>
        </div>
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:28 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, marginBottom:20 }}>
            {mode === "login" ? "Sign in" : "Create account"}
          </p>
          {mode === "register" && <Field label="Full Name" value={form.name} onChange={v => setForm(f => ({...f,name:v}))} placeholder="Your name" icon="👤" />}
          <Field label="Email"    value={form.email}    onChange={v => setForm(f => ({...f,email:v}))}    type="email"    placeholder="you@example.com" icon="✉" />
          <Field label="Password" value={form.password} onChange={v => setForm(f => ({...f,password:v}))} type="password" placeholder="••••••••"          icon="🔒" />
          {error && <p style={{ color:"var(--crimson)", fontSize:13, marginBottom:12 }}>⚠ {error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", background:"var(--gold)", color:"#0a0a0f", border:"none", borderRadius:10, padding:"13px 0", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, cursor:loading?"not-allowed":"pointer", opacity:loading?.6:1, marginBottom:12 }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
          <p style={{ textAlign:"center", fontSize:13, color:"var(--muted)" }}>
            {mode === "login" ? "New here? " : "Have an account? "}
            <button onClick={() => setMode(m => m==="login"?"register":"login")}
              style={{ color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder, icon }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:5 }}>{label}</label>
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>{icon}</span>}
        <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
          style={{ width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:`11px 14px 11px ${icon?"40px":"14px"}`, color:"var(--text)", fontSize:14, outline:"none" }} />
      </div>
    </div>
  );
}

/* ─── USER SHELL ─────────────────────────────────────────────────────────────── */
function UserApp() {
  const { userProfile, logout } = useAuth();
  const [tab, setTab]   = useState("dashboard");
  const [toast, setToast] = useState(null);
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(() => setToast(null), 3500); };

  const nav = [
    { id:"dashboard", icon:"◈", label:"Dashboard" },
    { id:"watch",     icon:"▶", label:"Watch & Earn" },
    { id:"withdraw",  icon:"↑", label:"Withdraw" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <aside style={sidebarStyle("#f5c842")}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid var(--border)", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"var(--gold)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>▶</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:"var(--gold)" }}>AdReward</div>
              <div style={{ fontSize:10, color:"var(--muted)" }}>EARN WHILE YOU WATCH</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
              {userProfile?.name?.[0] ?? "U"}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{userProfile?.name?.split(" ")[0] ?? "User"}</div>
              <div style={{ fontSize:11, color:"var(--gold)", fontFamily:"'DM Mono',monospace" }}>${(userProfile?.balance ?? 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"8px 12px" }}>
          {nav.map(n => <NavBtn key={n.id} {...n} active={tab===n.id} color="var(--gold)" onClick={() => setTab(n.id)} />)}
        </nav>
        <div style={{ padding:"0 12px 8px" }}>
          <button onClick={logout} style={logoutBtnStyle}>← Sign Out</button>
        </div>
      </aside>
      <main style={{ flex:1, padding:32, overflowY:"auto", maxWidth:1000 }}>
        {tab === "dashboard" && <Dashboard onNavigate={setTab} />}
        {tab === "watch"     && <WatchEarn onToast={showToast} />}
        {tab === "withdraw"  && <Withdraw  onToast={showToast} />}
      </main>
      <Toast toast={toast} />
    </div>
  );
}

/* ─── ADMIN SHELL ────────────────────────────────────────────────────────────── */
function AdminApp() {
  const { logout } = useAuth();
  const [tab, setTab]     = useState("campaigns");
  const [toast, setToast] = useState(null);
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(() => setToast(null), 3500); };

  const nav = [
    { id:"campaigns", icon:"📢", label:"Campaigns" },
    { id:"users",     icon:"👥", label:"Users" },
    { id:"payouts",   icon:"↑",  label:"Payouts" },
    { id:"revenue",   icon:"◎",  label:"Revenue" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <aside style={sidebarStyle("#ff4d6a")}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid var(--border)", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"var(--crimson)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚙</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:"var(--crimson)" }}>AdReward</div>
              <div style={{ fontSize:10, color:"var(--muted)" }}>ADMIN CONSOLE</div>
            </div>
          </div>
          <span style={{ background:"rgba(255,77,106,.1)", color:"var(--crimson)", border:"1px solid rgba(255,77,106,.3)", borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:600 }}>ADMINISTRATOR</span>
        </div>
        <nav style={{ flex:1, padding:"8px 12px" }}>
          {nav.map(n => <NavBtn key={n.id} {...n} active={tab===n.id} color="var(--crimson)" onClick={() => setTab(n.id)} />)}
        </nav>
        <div style={{ padding:"0 12px 8px" }}>
          <button onClick={logout} style={logoutBtnStyle}>← Sign Out</button>
        </div>
      </aside>
      <main style={{ flex:1, padding:32, overflowY:"auto" }}>
        {tab === "campaigns" && <AdminCampaigns onToast={showToast} />}
        {tab === "users"     && <AdminUsers     onToast={showToast} />}
        {tab === "payouts"   && <AdminPayouts   onToast={showToast} />}
        {tab === "revenue"   && <AdminRevenue />}
      </main>
      <Toast toast={toast} />
    </div>
  );
}

/* ─── NAV BUTTON ─────────────────────────────────────────────────────────────── */
function NavBtn({ icon, label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:10, border:"none", cursor:"pointer",
      background: active ? `${color}18` : "transparent", color: active ? color : "var(--muted)",
      fontFamily:"'Instrument Sans',sans-serif", fontWeight:500, fontSize:14, marginBottom:2,
      transition:"all .15s", textAlign:"left" }}>
      <span style={{ fontSize:16 }}>{icon}</span>{label}
    </button>
  );
}

const sidebarStyle = (accent) => ({
  width:220, background:"var(--surface)", borderRight:"1px solid var(--border)",
  display:"flex", flexDirection:"column", padding:"28px 0", flexShrink:0,
  position:"sticky", top:0, height:"100vh",
});
const logoutBtnStyle = {
  width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)",
  background:"transparent", color:"var(--muted)", cursor:"pointer", fontSize:13, textAlign:"left",
};

/* ─── ROOT ───────────────────────────────────────────────────────────────────── */
function Root() {
  const { currentUser, isAdmin, loading } = useAuth();
  const [authMode, setAuthMode] = useState("login");

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--ink)" }}>
      <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!currentUser) return <AuthScreen mode={authMode} setMode={setAuthMode} />;
  return isAdmin ? <AdminApp /> : <UserApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalStyles />
      <Root />
    </AuthProvider>
  );
}
