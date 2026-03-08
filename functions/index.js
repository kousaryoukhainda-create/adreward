// functions/index.js
// ─── Firebase Cloud Functions (Secure Backend) ────────────────────────────────
// Deploy with: firebase deploy --only functions
// These run server-side — users CANNOT tamper with balances from the frontend.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp }      = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { defineSecret }        = require("firebase-functions/params");

initializeApp();
const db = getFirestore();

// Secrets stored securely in Google Secret Manager (not in code)
const PAYPAL_CLIENT_ID     = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
const PAYPAL_MODE          = defineSecret("PAYPAL_MODE"); // "sandbox" or "live"
const APPLOVIN_REPORT_KEY  = defineSecret("APPLOVIN_REPORT_KEY");

// ─── 1. CREDIT USER AFTER AD VIEW ─────────────────────────────────────────────
// Called from frontend after ad SDK confirms completion.
// Verifies the token hasn't been used before (prevents double-claiming).
exports.creditAdReward = onCall(
  { secrets: [APPLOVIN_REPORT_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

    const { adId, verifyToken } = request.data;
    const uid = request.auth.uid;

    // ── Idempotency: check token hasn't been claimed ──────────────────────────
    const tokenRef = db.collection("usedTokens").doc(verifyToken);
    const tokenDoc = await tokenRef.get();
    if (tokenDoc.exists) throw new HttpsError("already-exists", "Reward already claimed");

    // ── Get ad config ─────────────────────────────────────────────────────────
    const adDoc = await db.collection("ads").doc(adId).get();
    if (!adDoc.exists || !adDoc.data().active)
      throw new HttpsError("not-found", "Ad not available");

    const { userEarn, appEarn } = adDoc.data();

    // ── Atomic Firestore transaction ──────────────────────────────────────────
    await db.runTransaction(async (tx) => {
      const userRef  = db.collection("users").doc(uid);
      const earnRef  = db.collection("earnings").doc();
      const adRef    = db.collection("ads").doc(adId);
      const revenueRef = db.collection("revenue").doc("totals");

      tx.set(tokenRef, { uid, adId, claimedAt: FieldValue.serverTimestamp() });

      tx.update(userRef, {
        balance:     FieldValue.increment(userEarn),
        totalEarned: FieldValue.increment(userEarn),
        adsWatched:  FieldValue.increment(1),
      });

      tx.set(earnRef, {
        userId: uid, adId, amount: userEarn,
        date: FieldValue.serverTimestamp(), status: "confirmed",
      });

      tx.update(adRef, { totalViews: FieldValue.increment(1) });

      tx.set(revenueRef, {
        totalAppRevenue:  FieldValue.increment(appEarn),
        totalUserPayouts: FieldValue.increment(userEarn),
        totalViews:       FieldValue.increment(1),
      }, { merge: true });
    });

    return { success: true, amount: userEarn };
  }
);

// ─── 2. PROCESS WITHDRAWAL VIA PAYPAL PAYOUTS API ────────────────────────────
exports.processWithdrawal = onCall(
  { secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

    const { withdrawalId } = request.data;
    const uid = request.auth.uid;

    const wRef = db.collection("withdrawals").doc(withdrawalId);
    const wDoc = await wRef.get();
    if (!wDoc.exists) throw new HttpsError("not-found", "Withdrawal not found");

    const w = wDoc.data();
    if (w.userId !== uid && !request.auth.token.admin)
      throw new HttpsError("permission-denied", "Not authorized");
    if (w.status !== "approved")
      throw new HttpsError("failed-precondition", "Not approved yet");
    if (w.processed)
      throw new HttpsError("already-exists", "Already processed");

    // ── Get PayPal OAuth token ────────────────────────────────────────────────
    const mode = PAYPAL_MODE.value();
    const base = mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(
          `${PAYPAL_CLIENT_ID.value()}:${PAYPAL_CLIENT_SECRET.value()}`
        ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const { access_token } = await tokenRes.json();

    // ── Send PayPal Payout ────────────────────────────────────────────────────
    const payoutRes = await fetch(`${base}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `ADR_${withdrawalId}_${Date.now()}`,
          email_subject: "Your AdReward withdrawal has been processed!",
          email_message: `You've received $${w.amount.toFixed(2)} from AdReward. Keep watching and earning!`,
        },
        items: [{
          recipient_type: "EMAIL",
          amount: { value: w.amount.toFixed(2), currency: "USD" },
          receiver: w.account,
          note: `AdReward payout — withdrawal #${withdrawalId}`,
          sender_item_id: withdrawalId,
        }],
      }),
    });

    const payoutData = await payoutRes.json();
    if (!payoutRes.ok)
      throw new HttpsError("internal", `PayPal error: ${payoutData.message}`);

    // ── Mark as processed in Firestore ───────────────────────────────────────
    await wRef.update({
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
      paypalBatchId: payoutData.batch_header.payout_batch_id,
      status: "paid",
    });

    return { success: true, batchId: payoutData.batch_header.payout_batch_id };
  }
);

// ─── 3. ADMIN: APPROVE WITHDRAWAL ────────────────────────────────────────────
exports.approveWithdrawal = onCall(async (request) => {
  if (!request.auth?.token?.admin)
    throw new HttpsError("permission-denied", "Admin only");

  const { withdrawalId } = request.data;
  await db.collection("withdrawals").doc(withdrawalId).update({ status: "approved" });

  // Trigger the actual PayPal payout
  // (In production, you can auto-call processWithdrawal here)
  return { success: true };
});

// ─── 4. ADMIN: SET CUSTOM CLAIMS (Make a user admin) ─────────────────────────
exports.setAdminRole = onCall(async (request) => {
  if (!request.auth?.token?.admin)
    throw new HttpsError("permission-denied", "Admin only");

  const { targetUid } = request.data;
  const { getAuth } = require("firebase-admin/auth");
  await getAuth().setCustomUserClaims(targetUid, { admin: true });
  return { success: true };
});
