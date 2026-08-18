const FIREBASE_VERSION = "11.7.1";
const ADMIN_EMAIL = "Hardewusi@gmail.com";
const ADMIN_EMAIL_LOWER = ADMIN_EMAIL.toLowerCase();

const firebaseConfig = {
  apiKey: "AIzaSyCSLpdprm00sM95NZQ6sY62kYUYGbkzr4s",
  authDomain: "shipoverseas-ca460.firebaseapp.com",
  projectId: "shipoverseas-ca460",
  storageBucket: "shipoverseas-ca460.firebasestorage.app",
  messagingSenderId: "592318644011",
  appId: "1:592318644011:web:d3b51bbd97ccfe773e0f6e",
  measurementId: "G-1CBRT77S1T"
};

const statusSteps = [
  { name: "Booking Confirmed", progress: 8 },
  { name: "Loaded at Origin", progress: 24 },
  { name: "Departed Port", progress: 38 },
  { name: "At Sea", progress: 58 },
  { name: "Customs Review", progress: 76 },
  { name: "Arrived at Port", progress: 90 },
  { name: "Delivered", progress: 100 }
];

const defaultPreferences = {
  packageCreated: true,
  statusUpdates: true,
  supportReplies: true,
  riskAlerts: true,
  weeklySummary: false
};

let app;
let auth;
let db;
let authReady;
let initialized = false;
let enabled = false;
let initError = null;
let authMod = {};
let firestoreMod = {};

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isAdminEmail(email) {
  return String(email || "").toLowerCase() === ADMIN_EMAIL_LOWER;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getProgress(status) {
  return statusSteps.find((step) => step.name === status)?.progress || 0;
}

function normalizePreferences(preferences = {}) {
  const normalized = { ...defaultPreferences };
  Object.keys(defaultPreferences).forEach((key) => {
    if (preferences[key] !== undefined) normalized[key] = Boolean(preferences[key]);
  });
  return normalized;
}

function toIso(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  return String(value);
}

function normalizeDateFields(item) {
  return {
    ...item,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    lastUpdated: toIso(item.lastUpdated)
  };
}

function normalizeShipment(input = {}) {
  const status = String(input.status || "Booking Confirmed").trim();
  const trackingId = String(input.trackingId || "").trim().toUpperCase();
  return {
    trackingId,
    container: String(input.container || "").trim().toUpperCase(),
    billOfLading: String(input.billOfLading || "").trim().toUpperCase(),
    receiverName: String(input.receiverName || "").trim(),
    receiverEmail: normalizeEmail(input.receiverEmail),
    vessel: String(input.vessel || "").trim(),
    cargo: String(input.cargo || "").trim(),
    origin: String(input.origin || "").trim(),
    destination: String(input.destination || "").trim(),
    status,
    eta: String(input.eta || "").trim(),
    locationName: String(input.locationName || "").trim(),
    manager: String(input.manager || "Ops desk").trim(),
    risk: String(input.risk || "On track").trim(),
    progress: getProgress(status),
    createdAt: toIso(input.createdAt) || nowIso(),
    lastUpdated: toIso(input.lastUpdated) || nowIso()
  };
}

function validateShipment(shipment) {
  const required = [
    "trackingId",
    "container",
    "billOfLading",
    "receiverName",
    "receiverEmail",
    "vessel",
    "cargo",
    "origin",
    "destination",
    "eta"
  ];
  const missing = required.filter((field) => !shipment[field]);
  if (missing.length) return `Missing required fields: ${missing.join(", ")}.`;
  if (!/^[A-Z]{4}[0-9]{7}$/.test(shipment.trackingId)) return "Tracking ID must look like SOVX1234567.";
  return "";
}

function normalizeSnapshot(snapshot) {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...normalizeDateFields(docSnap.data()) }));
}

function sortNewest(items) {
  return items.slice().sort((a, b) => new Date(b.lastUpdated || b.updatedAt || b.createdAt || 0) - new Date(a.lastUpdated || a.updatedAt || a.createdAt || 0));
}

function normalizeFirebaseError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) return new Error("Firebase permission denied. Check your Firestore rules and admin email.");
  if (code.includes("invalid-credential") || code.includes("user-not-found") || code.includes("wrong-password")) {
    return new Error("Invalid email or password. Use Reset Password to set a new Firebase password for this account.");
  }
  if (code.includes("operation-not-allowed")) return new Error("Firebase Email/Password sign-in is not enabled yet.");
  if (code.includes("unauthorized-domain")) {
    return new Error("This domain is not authorized in Firebase Auth. Add shipoversea.site and www.shipoversea.site in Authentication settings.");
  }
  if (code.includes("email-already-in-use")) return new Error("An account already exists for that email.");
  if (code.includes("weak-password")) return new Error("Password should be at least 6 characters.");
  if (code.includes("network-request-failed")) return new Error("Firebase network failed. Check your internet connection.");
  return new Error(error?.message || "Firebase request failed.");
}

async function loadSdk() {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
  ]);
  authMod = authModule;
  firestoreMod = firestoreModule;
  app = appModule.initializeApp(firebaseConfig);
  auth = authModule.getAuth(app);
  await authModule.setPersistence(auth, authModule.browserLocalPersistence);
  db = firestoreModule.getFirestore(app);
  authReady = new Promise((resolve) => {
    authModule.onAuthStateChanged(
      auth,
      () => resolve(auth.currentUser || null),
      () => resolve(null)
    );
  });
}

async function init() {
  if (initialized) return enabled;
  initialized = true;
  try {
    await loadSdk();
    enabled = true;
  } catch (error) {
    initError = error;
    enabled = false;
    console.warn("Firebase is unavailable, using local ShipOverseas API fallback.", error);
  }
  return enabled;
}

function isEnabled() {
  return enabled;
}

function getInitError() {
  return initError;
}

async function requireReady() {
  if (!enabled) throw new Error("Firebase is not connected.");
  await authReady;
}

function requireAuthUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Login required.");
  return user;
}

function requireAdminUser() {
  const user = requireAuthUser();
  if (!isAdminEmail(user.email)) throw new Error("Only Hardewusi@gmail.com can create or update packages.");
  return user;
}

async function ensureUserProfile(authUser, displayName = "") {
  const email = normalizeEmail(authUser.email);
  const userRef = firestoreMod.doc(db, "users", authUser.uid);
  const snapshot = await firestoreMod.getDoc(userRef);
  const existing = snapshot.exists() ? snapshot.data() : {};
  const profile = {
    id: authUser.uid,
    name: displayName || existing.name || authUser.displayName || email.split("@")[0] || "ShipOverseas User",
    email: authUser.email || email,
    emailLower: email,
    role: isAdminEmail(email) ? "admin" : "customer",
    preferences: normalizePreferences(existing.preferences),
    createdAt: toIso(existing.createdAt) || nowIso(),
    updatedAt: nowIso()
  };
  await firestoreMod.setDoc(userRef, profile, { merge: true });
  return profile;
}

async function getCurrentUser() {
  await requireReady();
  const user = auth.currentUser;
  if (!user) return null;
  return ensureUserProfile(user);
}

async function login(email, password) {
  await requireReady();
  try {
    const result = await authMod.signInWithEmailAndPassword(auth, normalizeEmail(email), String(password || ""));
    return ensureUserProfile(result.user);
  } catch (error) {
    throw normalizeFirebaseError(error);
  }
}

async function register({ name, email, password }) {
  await requireReady();
  const emailLower = normalizeEmail(email);
  if (isAdminEmail(emailLower)) throw new Error("The admin account is managed in Firebase. Use the existing admin login.");
  try {
    const result = await authMod.createUserWithEmailAndPassword(auth, emailLower, String(password || ""));
    await authMod.updateProfile(result.user, { displayName: String(name || "").trim() });
    return ensureUserProfile(result.user, String(name || "").trim());
  } catch (error) {
    throw normalizeFirebaseError(error);
  }
}

async function requestPasswordReset(email) {
  await requireReady();
  try {
    await authMod.sendPasswordResetEmail(auth, normalizeEmail(email), {
      url: `${window.location.origin}/#portal`,
      handleCodeInApp: false
    });
    return { message: "Firebase sent a password reset email. Open that email to choose a new password." };
  } catch (error) {
    throw normalizeFirebaseError(error);
  }
}

async function updateProfileDetails({ name }) {
  await requireReady();
  const user = requireAuthUser();
  const nextName = String(name || "").trim() || "ShipOverseas User";
  try {
    await authMod.updateProfile(user, { displayName: nextName });
    await firestoreMod.setDoc(
      firestoreMod.doc(db, "users", user.uid),
      { name: nextName, updatedAt: nowIso() },
      { merge: true }
    );
    return ensureUserProfile(user, nextName);
  } catch (error) {
    throw normalizeFirebaseError(error);
  }
}

async function updatePreferences(preferences) {
  await requireReady();
  const user = requireAuthUser();
  try {
    await firestoreMod.setDoc(
      firestoreMod.doc(db, "users", user.uid),
      { preferences: normalizePreferences(preferences), updatedAt: nowIso() },
      { merge: true }
    );
    return ensureUserProfile(user);
  } catch (error) {
    throw normalizeFirebaseError(error);
  }
}

async function changePassword({ currentPassword, newPassword }) {
  await requireReady();
  const user = requireAuthUser();
  try {
    const credential = authMod.EmailAuthProvider.credential(user.email, String(currentPassword || ""));
    await authMod.reauthenticateWithCredential(user, credential);
    await authMod.updatePassword(user, String(newPassword || ""));
  } catch (error) {
    throw normalizeFirebaseError(error);
  }
}

async function logout() {
  await requireReady();
  await authMod.signOut(auth);
}

async function addAuditLog(action, details = {}) {
  const user = requireAdminUser();
  const payload = {
    action,
    actorEmail: user.email,
    actorRole: "admin",
    details,
    createdAt: nowIso()
  };
  const ref = await firestoreMod.addDoc(firestoreMod.collection(db, "auditLogs"), payload);
  return { id: ref.id, ...payload };
}

async function listShipments() {
  await requireReady();
  if (!auth.currentUser) throw new Error("Login required.");
  let snapshot;
  if (isAdminEmail(auth.currentUser.email)) {
    snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, "shipments"));
  } else {
    const shipmentQuery = firestoreMod.query(
      firestoreMod.collection(db, "shipments"),
      firestoreMod.where("receiverEmail", "==", normalizeEmail(auth.currentUser.email))
    );
    snapshot = await firestoreMod.getDocs(shipmentQuery);
  }
  return sortNewest(normalizeSnapshot(snapshot).map(normalizeShipment));
}

async function findShipment(lookup) {
  await requireReady();
  const user = requireAuthUser();
  const normalizedLookup = String(lookup || "").trim().toUpperCase();
  const shipments = await listShipments();
  const found = shipments.find((shipment) => shipment.trackingId === normalizedLookup || shipment.billOfLading === normalizedLookup);
  if (!found) {
    throw new Error(isAdminEmail(user.email) ? "Shipment not found." : "Shipment not found for this account.");
  }
  return found;
}

async function createEmailUpdate(shipment, reason, preferenceKey = "statusUpdates") {
  const payload = {
    to: normalizeEmail(shipment.receiverEmail),
    subject: `ShipOverseas update for ${shipment.trackingId}`,
    body: `Hello ${shipment.receiverName || "customer"}, your shipment ${shipment.trackingId} is now ${shipment.status}. ETA: ${shipment.eta}. ${reason}`,
    status: "firebase-recorded",
    provider: "firestore",
    preferenceKey,
    trackingId: shipment.trackingId,
    createdAt: nowIso()
  };
  const ref = await firestoreMod.addDoc(firestoreMod.collection(db, "emailUpdates"), payload);
  return { id: ref.id, ...payload };
}

async function createShipment(input) {
  await requireReady();
  requireAdminUser();
  const shipment = normalizeShipment(input);
  const validation = validateShipment(shipment);
  if (validation) throw new Error(validation);
  const ref = firestoreMod.doc(db, "shipments", shipment.trackingId);
  const existing = await firestoreMod.getDoc(ref);
  if (existing.exists()) throw new Error("A shipment with that tracking ID already exists.");
  await firestoreMod.setDoc(ref, shipment);
  const email = await createEmailUpdate(shipment, "We will continue to send updates as the shipment moves.", "packageCreated");
  await addAuditLog("shipment.created", { trackingId: shipment.trackingId, receiverEmail: shipment.receiverEmail });
  return { shipment, email };
}

async function updateShipment(trackingId, changes = {}) {
  await requireReady();
  requireAdminUser();
  const shipment = await findShipment(trackingId);
  const allowed = ["status", "eta", "locationName", "risk", "receiverEmail", "receiverName", "vessel", "cargo", "origin", "destination"];
  const next = { ...shipment };
  allowed.forEach((key) => {
    if (changes[key] !== undefined) next[key] = key === "receiverEmail" ? normalizeEmail(changes[key]) : String(changes[key]).trim();
  });
  next.progress = getProgress(next.status);
  next.lastUpdated = nowIso();
  await firestoreMod.updateDoc(firestoreMod.doc(db, "shipments", shipment.trackingId), next);
  const preferenceKey = String(next.risk || "").toLowerCase().includes("watch") ? "riskAlerts" : "statusUpdates";
  const email = await createEmailUpdate(next, "This update was recorded by ShipOverseas operations.", preferenceKey);
  await addAuditLog("shipment.updated", { trackingId: next.trackingId, changedFields: Object.keys(changes) });
  return { shipment: next, email };
}

async function advanceShipment(trackingId) {
  await requireReady();
  requireAdminUser();
  const shipment = await findShipment(trackingId);
  const index = Math.max(0, statusSteps.findIndex((step) => step.name === shipment.status));
  const nextStatus = statusSteps[Math.min(index + 1, statusSteps.length - 1)].name;
  return updateShipment(trackingId, { status: nextStatus, locationName: shipment.locationName, risk: shipment.risk, eta: shipment.eta });
}

async function notifyShipment(trackingId) {
  await requireReady();
  requireAdminUser();
  const shipment = await findShipment(trackingId);
  const email = await createEmailUpdate(shipment, "Manual customer notification requested.", "statusUpdates");
  await addAuditLog("shipment.notified", { trackingId: shipment.trackingId, status: email.status });
  return { email };
}

async function listEmailUpdates() {
  await requireReady();
  const user = requireAuthUser();
  let snapshot;
  if (isAdminEmail(user.email)) {
    snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, "emailUpdates"));
  } else {
    const emailQuery = firestoreMod.query(
      firestoreMod.collection(db, "emailUpdates"),
      firestoreMod.where("to", "==", normalizeEmail(user.email))
    );
    snapshot = await firestoreMod.getDocs(emailQuery);
  }
  return sortNewest(normalizeSnapshot(snapshot));
}

function normalizeConversation(docSnap) {
  const data = normalizeDateFields(docSnap.data());
  const messages = (data.messages || [])
    .map(normalizeDateFields)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const lastMessage = messages[messages.length - 1] || null;
  return {
    id: docSnap.id,
    subject: data.subject || "Customer service request",
    status: data.status || "new",
    customerUid: data.customerUid,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    lastMessage: lastMessage ? lastMessage.body : "",
    lastMessageAt: lastMessage ? lastMessage.createdAt : data.updatedAt,
    messageCount: messages.length,
    messages,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

async function listSupportConversations() {
  await requireReady();
  const user = requireAuthUser();
  let snapshot;
  if (isAdminEmail(user.email)) {
    snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, "supportChats"));
  } else {
    const chatQuery = firestoreMod.query(
      firestoreMod.collection(db, "supportChats"),
      firestoreMod.where("customerUid", "==", user.uid)
    );
    snapshot = await firestoreMod.getDocs(chatQuery);
  }
  return sortNewest(snapshot.docs.map(normalizeConversation));
}

async function loadSupportThread(conversationId) {
  await requireReady();
  requireAuthUser();
  const snapshot = await firestoreMod.getDoc(firestoreMod.doc(db, "supportChats", conversationId));
  if (!snapshot.exists()) throw new Error("Conversation not found.");
  const conversation = normalizeConversation(snapshot);
  return { conversation, messages: conversation.messages };
}

function makeSupportMessage(user, body) {
  const isOps = isAdminEmail(user.email);
  return {
    id: randomId(),
    authorRole: isOps ? "operations" : "customer",
    authorName: user.displayName || user.email,
    authorEmail: user.email,
    body: String(body || "").trim(),
    createdAt: nowIso()
  };
}

async function createOrSendCustomerMessage({ subject, message }) {
  await requireReady();
  const user = requireAuthUser();
  if (isAdminEmail(user.email)) throw new Error("Open a customer conversation before replying.");
  const conversations = await listSupportConversations();
  const existing = conversations.find((conversation) => conversation.status !== "closed");
  const msg = makeSupportMessage(user, message);
  if (existing) {
    const nextMessages = [...existing.messages, msg];
    await firestoreMod.updateDoc(firestoreMod.doc(db, "supportChats", existing.id), {
      messages: nextMessages,
      status: "waiting_operations",
      lastMessage: msg.body,
      updatedAt: nowIso()
    });
    const refreshed = await loadSupportThread(existing.id);
    return { ...refreshed, message: msg };
  }
  const ref = firestoreMod.doc(firestoreMod.collection(db, "supportChats"));
  const payload = {
    customerUid: user.uid,
    customerName: user.displayName || user.email,
    customerEmail: normalizeEmail(user.email),
    subject: String(subject || "Customer service request").trim() || "Customer service request",
    status: "waiting_operations",
    messages: [msg],
    lastMessage: msg.body,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await firestoreMod.setDoc(ref, payload);
  const conversation = normalizeConversation({ id: ref.id, data: () => payload });
  return { conversation, messages: conversation.messages, message: msg };
}

async function sendSupportReply(conversationId, message) {
  await requireReady();
  const user = requireAuthUser();
  const { conversation } = await loadSupportThread(conversationId);
  const msg = makeSupportMessage(user, message);
  const isOps = isAdminEmail(user.email);
  await firestoreMod.updateDoc(firestoreMod.doc(db, "supportChats", conversationId), {
    messages: [...conversation.messages, msg],
    status: isOps ? "waiting_customer" : "waiting_operations",
    lastMessage: msg.body,
    updatedAt: nowIso()
  });
  if (isOps) {
    await firestoreMod.addDoc(firestoreMod.collection(db, "emailUpdates"), {
      to: normalizeEmail(conversation.customerEmail),
      subject: "ShipOverseas support replied",
      body: `${user.displayName || "ShipOverseas Support"} replied to your support request: ${msg.body}`,
      status: "firebase-recorded",
      provider: "firestore",
      preferenceKey: "supportReplies",
      trackingId: "",
      createdAt: nowIso()
    });
    await addAuditLog("support.admin_reply", { conversationId, customerEmail: conversation.customerEmail });
  }
  const refreshed = await loadSupportThread(conversationId);
  return { ...refreshed, message: msg };
}

async function listAuditLogs() {
  await requireReady();
  requireAdminUser();
  const snapshot = await firestoreMod.getDocs(firestoreMod.collection(db, "auditLogs"));
  return sortNewest(normalizeSnapshot(snapshot)).slice(0, 100);
}

async function createBackup() {
  await requireReady();
  requireAdminUser();
  const fileName = `firebase-live-backup-${new Date().toISOString().slice(0, 10)}.json`;
  await addAuditLog("backup.created", { fileName, provider: "firebase" });
  return { fileName, createdAt: nowIso(), provider: "firebase" };
}

async function exportData() {
  await requireReady();
  requireAdminUser();
  const [usersSnap, shipments, emails, conversations, auditLogs] = await Promise.all([
    firestoreMod.getDocs(firestoreMod.collection(db, "users")),
    listShipments(),
    listEmailUpdates(),
    listSupportConversations(),
    listAuditLogs()
  ]);
  await addAuditLog("backup.exported", { format: "json", provider: "firebase" });
  return {
    exportedAt: nowIso(),
    provider: "firebase",
    users: normalizeSnapshot(usersSnap),
    shipments,
    emails,
    supportConversations: conversations,
    auditLogs
  };
}

async function loadPrivateData() {
  await requireReady();
  const user = requireAuthUser();
  const [shipments, emails, conversations] = await Promise.all([listShipments(), listEmailUpdates(), listSupportConversations()]);
  const auditLogs = isAdminEmail(user.email) ? await listAuditLogs() : [];
  return {
    shipments,
    myShipments: shipments,
    emails,
    supportConversations: conversations,
    auditLogs
  };
}

async function getBootstrap() {
  await requireReady();
  const shipments = auth.currentUser ? await listShipments() : [];
  return { statusSteps, shipments };
}

export const firebaseClient = {
  init,
  isEnabled,
  getInitError,
  getBootstrap,
  getCurrentUser,
  loadPrivateData,
  loadSupportThread,
  login,
  register,
  requestPasswordReset,
  updateProfileDetails,
  updatePreferences,
  changePassword,
  logout,
  findShipment,
  createShipment,
  updateShipment,
  advanceShipment,
  notifyShipment,
  createOrSendCustomerMessage,
  sendSupportReply,
  createBackup,
  exportData
};
