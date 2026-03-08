// src/lib/adNetwork.js
// ─── AppLovin MAX + IronSource Real Integration ───────────────────────────────
// Handles rewarded video ads on Web (JS SDK) and Android (via Capacitor plugin)

const SDK_KEY      = process.env.REACT_APP_APPLOVIN_SDK_KEY;
const WEB_UNIT_ID  = process.env.REACT_APP_APPLOVIN_REWARDED_AD_UNIT_WEB;
const IS_ANDROID   = /android/i.test(navigator.userAgent);

let applovinReady = false;

// ─── Load AppLovin MAX JS SDK ─────────────────────────────────────────────────
export function loadAppLovinSDK() {
  return new Promise((resolve, reject) => {
    if (window.applovin) { applovinReady = true; resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://ads.applovin.com/maxjs/sdk.js";
    script.async = true;
    script.onload = () => {
      window.applovin.init({ sdkKey: SDK_KEY }, () => {
        applovinReady = true;
        resolve();
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Request & Show Rewarded Ad ───────────────────────────────────────────────
// Returns a Promise that resolves with { earned: true, adId } on completion
// or rejects on skip/error.
export function showRewardedAd(adCampaignId) {
  return new Promise((resolve, reject) => {
    if (IS_ANDROID && window.Capacitor) {
      // ── Android native path via Capacitor plugin ──────────────────────────
      // Requires: npm install @capacitor-community/applovin-max
      // Then: npx cap sync android
      window.Capacitor.Plugins.AppLovinMax.showRewardedAd(
        { adUnitId: process.env.REACT_APP_APPLOVIN_REWARDED_AD_UNIT_ANDROID },
        (result) => {
          if (result.type === "reward_received") resolve({ earned: true, adId: adCampaignId, token: result.rewardToken });
          else reject(new Error("Ad skipped or failed"));
        }
      );
    } else {
      // ── Web JS SDK path ───────────────────────────────────────────────────
      if (!applovinReady) { reject(new Error("AppLovin SDK not ready")); return; }
      const ad = window.applovin.createRewardedAd({ adUnitId: WEB_UNIT_ID });
      ad.on("adLoaded",   () => ad.show());
      ad.on("adRewarded", (reward) => resolve({ earned: true, adId: adCampaignId, reward, token: generateVerifyToken(adCampaignId) }));
      ad.on("adSkipped",  () => reject(new Error("Ad skipped")));
      ad.on("adFailed",   (err) => reject(err));
      ad.load();
    }
  });
}

// Server-side verification token (passed to Cloud Function)
function generateVerifyToken(adId) {
  return btoa(`${adId}:${Date.now()}:${Math.random()}`);
}

// ─── IronSource / Unity LevelPlay (Alternative) ───────────────────────────────
export function loadIronSourceSDK() {
  return new Promise((resolve, reject) => {
    if (window.IronSource) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://js.ironsrc.com/sdk/js/ironsource.js";
    script.async = true;
    script.onload = () => {
      window.IronSource.init({
        appKey: process.env.REACT_APP_IRONSOURCE_APP_KEY,
        onReady: resolve,
        onError: reject,
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
