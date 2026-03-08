// src/pages/user/WatchEarn.jsx
// ─── Real Rewarded Ad Integration ─────────────────────────────────────────────
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { showRewardedAd, loadAppLovinSDK } from "../../lib/adNetwork";

const creditAdReward = httpsCallable(functions, "creditAdReward");

export default function WatchEarn({ onToast }) {
  const { currentUser, userProfile } = useAuth();
  const [ads, setAds]               = useState([]);
  const [watching, setWatching]     = useState(null);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [sdkReady, setSdkReady]     = useState(false);
  const [loading, setLoading]       = useState(false);

  // Load AppLovin SDK on mount
  useEffect(() => {
    loadAppLovinSDK()
      .then(() => setSdkReady(true))
      .catch(() => onToast("Ad network unavailable. Try again later.", "error"));
  }, []);

  // Live-load active ads from Firestore
  useEffect(() => {
    const q = query(collection(db, "ads"), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Load today's watched ad IDs from Firestore earnings collection
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const q = query(
      collection(db, "earnings"),
      where("userId",   "==", currentUser.uid),
      where("dateStr",  "==", today)
    );
    return onSnapshot(q, (snap) => {
      setWatchedIds(new Set(snap.docs.map((d) => d.data().adId)));
    });
  }, [currentUser]);

  const handleWatch = async (ad) => {
    if (!sdkReady)  return onToast("Ad SDK loading, please wait...", "error");
    if (loading)    return;
    setLoading(true);
    setWatching(ad.id);
    try {
      // 1. Show real rewarded video ad via AppLovin MAX
      const { token } = await showRewardedAd(ad.id);

      // 2. Send verification token to Cloud Function (secure, server-side credit)
      const result = await creditAdReward({ adId: ad.id, verifyToken: token });

      if (result.data.success) {
        onToast(`🎉 You earned $${ad.userEarn.toFixed(2)}! Balance updated.`, "success");
      }
    } catch (err) {
      if (err.message === "Ad skipped") {
        onToast("You need to watch the full ad to earn.", "error");
      } else {
        onToast(err.message || "Something went wrong.", "error");
      }
    } finally {
      setWatching(null);
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={styles.heading}>Watch & Earn</h1>
      <p style={styles.sub}>Complete each ad to earn real money — credited instantly to your balance.</p>

      {!sdkReady && (
        <div style={styles.notice}>⏳ Loading ad network...</div>
      )}

      <div style={styles.grid}>
        {ads.map((ad) => {
          const watched = watchedIds.has(ad.id);
          const active  = watching === ad.id;
          return (
            <div key={ad.id} style={{ ...styles.card, borderColor: watched ? "var(--border)" : `${ad.color}40` }}>
              <div style={styles.cardHeader}>
                <div style={{ ...styles.logo, background: `${ad.color}20`, border: `1px solid ${ad.color}30` }}>
                  {ad.logo}
                </div>
                <div>
                  <p style={styles.brand}>{ad.brand}</p>
                  <span style={{ ...styles.badge, background: `${ad.color}20`, color: ad.color }}>
                    {ad.category}
                  </span>
                </div>
                {watched && <span style={styles.watchedBadge}>✓ Done</span>}
              </div>
              <p style={styles.adTitle}>{ad.title}</p>
              <p style={styles.adDesc}>{ad.description}</p>
              <div style={styles.cardFooter}>
                <div>
                  <p style={styles.earnLabel}>You earn</p>
                  <p style={styles.earnValue}>${ad.userEarn.toFixed(2)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={styles.earnLabel}>{ad.duration}s ad</p>
                  {watched ? (
                    <span style={styles.comeTomorrow}>Come back tomorrow</span>
                  ) : (
                    <button
                      onClick={() => handleWatch(ad)}
                      disabled={!sdkReady || loading}
                      style={{ ...styles.watchBtn, background: active ? "var(--border)" : "var(--gold)" }}
                    >
                      {active ? "Loading ad..." : "▶ Watch"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {ads.length === 0 && sdkReady && (
          <p style={styles.empty}>No ads available right now. Check back soon!</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  heading: { fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 },
  sub:  { color: "var(--muted)", fontSize: 14, marginBottom: 28 },
  notice: { background: "rgba(245,200,66,.08)", border: "1px solid rgba(245,200,66,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "var(--gold)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 },
  card: { background: "var(--card)", border: "1px solid", borderRadius: 14, padding: 24, transition: "border-color .2s" },
  cardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  logo: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  brand: { fontWeight: 600, fontSize: 15 },
  badge: { fontSize: 11, fontWeight: 600, borderRadius: 5, padding: "2px 8px", letterSpacing: ".04em" },
  watchedBadge: { marginLeft: "auto", background: "rgba(46,204,138,.1)", color: "var(--emerald)", border: "1px solid rgba(46,204,138,.3)", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  adTitle: { fontWeight: 600, fontSize: 14, marginBottom: 6 },
  adDesc: { fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  earnLabel: { fontSize: 11, color: "var(--muted)", marginBottom: 2 },
  earnValue: { fontFamily: "'DM Mono',sans-serif", fontSize: 22, fontWeight: 700, color: "var(--gold)" },
  comeTomorrow: { fontSize: 12, color: "var(--muted)" },
  watchBtn: { border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#0a0a0f", transition: "all .2s" },
  empty: { color: "var(--muted)", textAlign: "center", padding: 48, gridColumn: "1/-1" },
};
