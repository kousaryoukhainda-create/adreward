# AdReward — Real Earnings Platform
> Watch rewarded video ads → earn real money via PayPal/Bank/Crypto

## Architecture
```
Frontend (React)  ──→  Firebase Auth + Firestore (live data)
                  ──→  AppLovin MAX SDK (real rewarded ads)
                  ──→  Firebase Cloud Functions (secure backend)
                              │
                              ├──→ Credits user balance (server-side, tamper-proof)
                              └──→ PayPal Payouts API (real money transfers)
```

---

## STEP 1 — Firebase Setup (10 min)

1. Go to https://console.firebase.google.com → Create project → "adreward"
2. Enable **Authentication** → Sign-in method → Email/Password ✓
3. Enable **Firestore Database** → Production mode → Choose region
4. Enable **Hosting**
5. Go to Project Settings → Web App → Register app → Copy config
6. Create `.env` file from `.env.example` → paste your config values

**Create your first admin user:**
```
1. Run the app and register normally with admin@yourdomain.com
2. In Firebase Console → Authentication → copy the UID
3. Open Firestore → users/{uid} → set a field: role: "admin"
4. Deploy Cloud Functions → call setAdminRole to set custom claim
```

---

## STEP 2 — AppLovin MAX (Real Ads)

1. Sign up at https://dash.applovin.com
2. Add your app → Get **SDK Key**
3. Create Ad Unit → **Rewarded Video** type → Get **Placement ID**
4. Add to `.env`:
```
REACT_APP_APPLOVIN_SDK_KEY=your_sdk_key
REACT_APP_APPLOVIN_REWARDED_AD_UNIT_WEB=your_placement_id
```

**For Android APK**, also get the Android placement ID and add:
```
REACT_APP_APPLOVIN_REWARDED_AD_UNIT_ANDROID=your_android_placement_id
```

---

## STEP 3 — PayPal Payouts API

1. Go to https://developer.paypal.com → My Apps → Create App
2. Enable **Payouts** feature (may require business verification)
3. Copy Client ID and Secret
4. Store them as Firebase secrets (NEVER in code):
```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID
firebase functions:secrets:set PAYPAL_CLIENT_SECRET
firebase functions:secrets:set PAYPAL_MODE   # "sandbox" for testing, "live" for production
firebase functions:secrets:set APPLOVIN_REPORT_KEY
```

---

## STEP 4 — Install & Run

```bash
# Install frontend deps
npm install

# Install Cloud Function deps
cd functions && npm install && cd ..

# Copy env file
cp .env.example .env
# → Fill in your actual values

# Run locally
npm start
```

---

## STEP 5 — Deploy

### Deploy Web App (free hosting on Firebase)
```bash
npm run build
firebase deploy --only hosting
# → Live at https://your-project.web.app
```

### Deploy Cloud Functions (backend)
```bash
firebase deploy --only functions
```

### Deploy Firestore Rules (security)
```bash
firebase deploy --only firestore:rules
```

### Deploy Android APK (via Capacitor)
```bash
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor-community/applovin-max
npx cap init
npx cap add android
npx cap copy android
npx cap open android
# → Build APK in Android Studio: Build → Generate Signed APK
```

---

## Revenue Model

```
Advertiser pays ad network (AppLovin MAX)
    ↓
AppLovin pays you per completed view (CPM varies: $5–$50 per 1000 views)
    ↓
Your app keeps 40% → users get 60% (configurable per campaign)
    ↓
Users withdraw via PayPal / Bank / Crypto (PayPal Payouts API)
```

**Realistic earnings (AppLovin MAX rewarded video):**
- CPM (cost per 1000 views): $5–$50 depending on country/category
- Per view: ~$0.005–$0.05
- User gets 60%: ~$0.003–$0.03 per view
- App keeps 40%: ~$0.002–$0.02 per view

---

## Firestore Database Structure

```
users/{uid}
  name, email, balance, totalEarned, adsWatched, status, joinDate

ads/{adId}
  title, brand, logo, duration, userEarn, appEarn, category,
  color, active, totalViews, budget, placementId, description

earnings/{docId}
  userId, adId, adTitle, amount, date, dateStr, status

withdrawals/{docId}
  userId, userName, amount, method, account,
  status (pending→approved→paid), processed, paypalBatchId, date

revenue/totals
  totalAppRevenue, totalUserPayouts, totalViews

usedTokens/{token}
  uid, adId, claimedAt   ← prevents double-claiming rewards
```

---

## Security Model

- ✅ **Balances updated server-side only** (Cloud Functions + Admin SDK)
- ✅ **Token-based reward verification** (each ad view gets a one-time token)
- ✅ **Firestore rules** block direct balance manipulation from clients
- ✅ **PayPal API called server-side** (secrets never reach the browser)
- ✅ **Admin claims** set via Firebase Auth custom claims (not editable by users)

---

## Legal Requirements (before going live)

- [ ] Privacy Policy page (required by app stores + ad networks)
- [ ] Terms of Service page
- [ ] KYC for users withdrawing >$600/year (US IRS requirement)
- [ ] GDPR compliance if targeting EU users
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Business bank account to receive ad network payouts
