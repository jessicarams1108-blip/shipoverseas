const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const appDir = __dirname;
const workspaceDir = path.resolve(appDir, "..");
const dataDir = process.env.SHIPOVERSEAS_DATA_DIR
  ? path.resolve(process.env.SHIPOVERSEAS_DATA_DIR)
  : path.join(appDir, "data");
const dbPath = path.join(dataDir, "db.json");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ADMIN_EMAIL = "Hardewusi@gmail.com";
const ADMIN_EMAIL_LOWER = ADMIN_EMAIL.toLowerCase();
const EMAIL_FROM = process.env.EMAIL_FROM || "ShipOverseas <updates@shipoverseas.local>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const statusSteps = [
  { name: "Booking Confirmed", progress: 8 },
  { name: "Loaded at Origin", progress: 24 },
  { name: "Departed Port", progress: 38 },
  { name: "At Sea", progress: 58 },
  { name: "Customs Review", progress: 76 },
  { name: "Arrived at Port", progress: 90 },
  { name: "Delivered", progress: 100 }
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const defaultPreferences = {
  packageCreated: true,
  statusUpdates: true,
  supportReplies: true,
  riskAlerts: true,
  weeklySummary: false
};

function legacyHash(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function hashSecret(value) {
  return legacyHash(value);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!String(storedHash).startsWith("pbkdf2$")) {
    return storedHash === legacyHash(password);
  }
  const [, iterationsRaw, salt, hash] = String(storedHash).split("$");
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !hash) return false;
  const derived = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("hex");
  const storedBuffer = Buffer.from(hash, "hex");
  const derivedBuffer = Buffer.from(derived, "hex");
  return storedBuffer.length === derivedBuffer.length && crypto.timingSafeEqual(storedBuffer, derivedBuffer);
}

function normalizePreferences(preferences = {}) {
  const normalized = { ...defaultPreferences };
  for (const key of Object.keys(defaultPreferences)) {
    if (preferences[key] !== undefined) normalized[key] = Boolean(preferences[key]);
  }
  return normalized;
}

function ensureUserDefaults(user) {
  user.preferences = normalizePreferences(user.preferences);
  user.createdAt ||= new Date().toISOString();
  return user;
}

function getTokenFromRequest(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function audit(db, user, action, details = {}) {
  const actor = user ? publicUser(user) : null;
  db.auditLogs ||= [];
  db.auditLogs.unshift({
    id: crypto.randomUUID(),
    action,
    actorEmail: actor?.email || "system",
    actorRole: actor?.role || "system",
    details,
    createdAt: new Date().toISOString()
  });
  db.auditLogs = db.auditLogs.slice(0, 500);
}

async function deliverEmail(message, force = false) {
  if (!force && message.preferenceKey && message.preferenceEnabled === false) {
    return { ...message, status: "muted", provider: "preferences" };
  }
  if (!RESEND_API_KEY) {
    return { ...message, status: "simulated", provider: "local" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.body
      })
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { ...message, status: "failed", provider: "resend", error: errorText || response.statusText };
    }
    return { ...message, status: "sent", provider: "resend" };
  } catch (error) {
    return { ...message, status: "failed", provider: "resend", error: error.message || "Email provider failed." };
  }
}

function createSeedDb() {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: "usr_admin",
        name: "ShipOverseas Admin",
        email: ADMIN_EMAIL,
        emailLower: ADMIN_EMAIL_LOWER,
        role: "admin",
        passwordHash: hashPassword("admin123"),
        preferences: { ...defaultPreferences },
        createdAt: now
      },
      {
        id: "usr_customer",
        name: "Maya Import Desk",
        email: "customer@example.com",
        emailLower: "customer@example.com",
        role: "customer",
        passwordHash: hashPassword("demo123"),
        preferences: { ...defaultPreferences },
        createdAt: now
      }
    ],
    sessions: {},
    shipments: [
      {
        trackingId: "SOVX2409181",
        container: "SOU7284410",
        billOfLading: "BL-SOV-2409181",
        receiverName: "Maya Import Desk",
        receiverEmail: "customer@example.com",
        vessel: "MV Pacific Ledger",
        cargo: "Electronics",
        origin: "Shanghai",
        destination: "Los Angeles",
        status: "At Sea",
        eta: "2026-08-29",
        locationName: "North Pacific Ocean",
        manager: "Nadia Cole",
        risk: "On track",
        lastUpdated: "2026-08-17T12:20:00Z",
        createdAt: now
      },
      {
        trackingId: "SOVX7814402",
        container: "SOU9182456",
        billOfLading: "BL-SOV-7814402",
        receiverName: "Atlantic Home Supply",
        receiverEmail: "customer@example.com",
        vessel: "MV Atlantic Mariner",
        cargo: "Furniture",
        origin: "Rotterdam",
        destination: "New York",
        status: "Customs Review",
        eta: "2026-08-21",
        locationName: "New York Terminal",
        manager: "Owen Harris",
        risk: "Detention watch",
        lastUpdated: "2026-08-17T10:45:00Z",
        createdAt: now
      },
      {
        trackingId: "SOVX9912045",
        container: "SOU3347815",
        billOfLading: "BL-SOV-9912045",
        receiverName: "Northline Pharma",
        receiverEmail: "pharma@example.com",
        vessel: "MV Coral Horizon",
        cargo: "Pharmaceuticals",
        origin: "Singapore",
        destination: "Hamburg",
        status: "Departed Port",
        eta: "2026-09-04",
        locationName: "Malacca Strait",
        manager: "Mara Singh",
        risk: "Cold chain priority",
        lastUpdated: "2026-08-17T08:15:00Z",
        createdAt: now
      }
    ],
    emails: [
      {
        id: crypto.randomUUID(),
        to: "customer@example.com",
        subject: "ShipOverseas update for SOVX2409181",
        body: "Your shipment SOVX2409181 is now At Sea. ETA: 2026-08-29.",
        status: "simulated",
        trackingId: "SOVX2409181",
        createdAt: now
      }
    ],
    passwordResets: [],
    supportConversations: [],
    auditLogs: []
  };
}

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createSeedDb(), null, 2));
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  db.sessions ||= {};
  db.users ||= [];
  db.shipments ||= [];
  db.emails ||= [];
  db.passwordResets ||= [];
  db.supportConversations ||= [];
  db.auditLogs ||= [];
  db.users.forEach(ensureUserDefaults);
  return db;
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
  });
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    preferences: normalizePreferences(user.preferences)
  };
}

function enrichShipment(shipment) {
  return { ...shipment, progress: getProgress(shipment.status) };
}

function publicShipment(shipment) {
  const { receiverEmail, ...safeShipment } = shipment;
  return enrichShipment(safeShipment);
}

function getUserFromRequest(request, db) {
  const token = getTokenFromRequest(request);
  const session = token ? db.sessions[token] : null;
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId) || null;
  return user ? ensureUserDefaults(user) : null;
}

function requireAdmin(request, response, db) {
  const user = getUserFromRequest(request, db);
  if (!user) {
    sendError(response, 401, "Login required.");
    return null;
  }
  if (user.emailLower !== ADMIN_EMAIL_LOWER) {
    sendError(response, 403, "Only a verified operations account can create or update packages.");
    return null;
  }
  return user;
}

function getProgress(status) {
  return statusSteps.find((step) => step.name === status)?.progress || 0;
}

function normalizeShipment(input) {
  const status = String(input.status || "Booking Confirmed");
  const trackingId = String(input.trackingId || "").trim().toUpperCase();
  return {
    trackingId,
    container: String(input.container || "").trim().toUpperCase(),
    billOfLading: String(input.billOfLading || "").trim().toUpperCase(),
    receiverName: String(input.receiverName || "").trim(),
    receiverEmail: String(input.receiverEmail || "").trim().toLowerCase(),
    vessel: String(input.vessel || "").trim(),
    cargo: String(input.cargo || "").trim(),
    origin: String(input.origin || "").trim(),
    destination: String(input.destination || "").trim(),
    status,
    eta: String(input.eta || "").trim(),
    locationName: String(input.locationName || "").trim(),
    manager: String(input.manager || "Ops desk").trim(),
    risk: String(input.risk || "On track").trim(),
    lastUpdated: new Date().toISOString(),
    createdAt: input.createdAt || new Date().toISOString(),
    progress: getProgress(status)
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
  if (!/^[A-Z]{4}[0-9]{7}$/.test(shipment.trackingId)) {
    return "Tracking ID must look like SOVX1234567.";
  }
  return "";
}

async function createEmail(db, shipment, reason, preferenceKey = "statusUpdates") {
  if (!shipment.receiverEmail) return null;
  const receiver = db.users.find((user) => user.emailLower === shipment.receiverEmail);
  const preferenceEnabled = receiver ? normalizePreferences(receiver.preferences)[preferenceKey] !== false : true;
  const message = {
    id: crypto.randomUUID(),
    to: shipment.receiverEmail,
    subject: `ShipOverseas update for ${shipment.trackingId}`,
    body: `Hello ${shipment.receiverName || "customer"}, your shipment ${shipment.trackingId} is now ${shipment.status}. ETA: ${shipment.eta}. ${reason}`,
    status: RESEND_API_KEY ? "queued" : "simulated",
    provider: RESEND_API_KEY ? "resend" : "local",
    preferenceKey,
    preferenceEnabled,
    trackingId: shipment.trackingId,
    createdAt: new Date().toISOString()
  };
  const delivered = await deliverEmail(message);
  db.emails.unshift(delivered);
  return delivered;
}

async function createSystemEmail(db, to, subject, body) {
  const message = {
    id: crypto.randomUUID(),
    to,
    subject,
    body,
    status: RESEND_API_KEY ? "queued" : "simulated",
    provider: RESEND_API_KEY ? "resend" : "local",
    preferenceKey: "security",
    preferenceEnabled: true,
    trackingId: "",
    createdAt: new Date().toISOString()
  };
  const delivered = await deliverEmail(message, true);
  db.emails.unshift(delivered);
  return delivered;
}

async function createSupportEmail(db, to, subject, body) {
  const receiver = db.users.find((user) => user.emailLower === String(to || "").toLowerCase());
  const preferenceEnabled = receiver ? normalizePreferences(receiver.preferences).supportReplies !== false : true;
  const message = {
    id: crypto.randomUUID(),
    to,
    subject,
    body,
    status: RESEND_API_KEY ? "queued" : "simulated",
    provider: RESEND_API_KEY ? "resend" : "local",
    preferenceKey: "supportReplies",
    preferenceEnabled,
    trackingId: "",
    createdAt: new Date().toISOString()
  };
  const delivered = await deliverEmail(message);
  db.emails.unshift(delivered);
  return delivered;
}

function safeExport(db) {
  return {
    exportedAt: new Date().toISOString(),
    users: db.users.map((user) => publicUser(user)),
    shipments: db.shipments.map(enrichShipment),
    emails: db.emails,
    supportConversations: db.supportConversations,
    auditLogs: db.auditLogs || []
  };
}

function createBackup(db) {
  const backupDir = path.join(dataDir, "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `shipoverseas-backup-${stamp}.json`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(safeExport(db), null, 2));
  return { fileName, createdAt: new Date().toISOString() };
}

function publicConversation(conversation, user) {
  const isOps = user.emailLower === ADMIN_EMAIL_LOWER;
  const lastMessage = conversation.messages[conversation.messages.length - 1] || null;
  return {
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    customerName: conversation.customerName,
    customerEmail: isOps ? conversation.customerEmail : undefined,
    lastMessage: lastMessage ? lastMessage.body : "",
    lastMessageAt: lastMessage ? lastMessage.createdAt : conversation.updatedAt,
    messageCount: conversation.messages.length,
    updatedAt: conversation.updatedAt,
    createdAt: conversation.createdAt
  };
}

function canAccessConversation(user, conversation) {
  return user.emailLower === ADMIN_EMAIL_LOWER || conversation.customerEmail === user.emailLower;
}

function addSupportMessage(conversation, user, body) {
  const isOps = user.emailLower === ADMIN_EMAIL_LOWER;
  const now = new Date().toISOString();
  const message = {
    id: crypto.randomUUID(),
    authorRole: isOps ? "operations" : "customer",
    authorName: user.name,
    authorEmail: user.email,
    body: String(body || "").trim(),
    createdAt: now
  };
  conversation.messages.push(message);
  conversation.status = isOps ? "waiting_customer" : "waiting_operations";
  conversation.updatedAt = now;
  return message;
}

function findOrCreateCustomerConversation(db, user, subject) {
  let conversation = db.supportConversations.find((item) => item.customerEmail === user.emailLower && item.status !== "closed");
  if (conversation) return conversation;
  const now = new Date().toISOString();
  conversation = {
    id: crypto.randomUUID(),
    customerId: user.id,
    customerName: user.name,
    customerEmail: user.emailLower,
    subject: String(subject || "Customer service request").trim() || "Customer service request",
    status: "new",
    messages: [],
    createdAt: now,
    updatedAt: now
  };
  db.supportConversations.unshift(conversation);
  return conversation;
}

function resolveRequest(url) {
  const parsed = new URL(url, `http://${host}:${port}`);
  if (parsed.pathname === "/" || parsed.pathname === "/index.html") {
    return path.join(appDir, "index.html");
  }
  if (parsed.pathname === "/assets/hero-cargo.png") {
    return path.join(workspaceDir, "public", "hero-cargo.png");
  }
  const normalized = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  return path.join(appDir, normalized);
}

function isSafePath(filePath) {
  const roots = [appDir, path.join(workspaceDir, "public")];
  return roots.some((root) => {
    const relative = path.relative(root, filePath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

async function handleApi(request, response, parsed) {
  const db = readDb();
  const method = request.method || "GET";
  const parts = parsed.pathname.split("/").filter(Boolean);

  try {
    if (method === "GET" && parsed.pathname === "/api/bootstrap") {
      sendJson(response, 200, {
        statusSteps,
        shipments: db.shipments.map(publicShipment)
      });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/me") {
      sendJson(response, 200, { user: publicUser(getUserFromRequest(request, db)) });
      return;
    }

    if (method === "PATCH" && parsed.pathname === "/api/me") {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      const body = await parseBody(request);
      if (body.name !== undefined) {
        const name = String(body.name || "").trim();
        if (name.length < 2) {
          sendError(response, 400, "Name must be at least 2 characters.");
          return;
        }
        user.name = name;
      }
      if (body.preferences) {
        user.preferences = normalizePreferences({ ...user.preferences, ...body.preferences });
      }
      audit(db, user, "account.updated", { preferencesChanged: Boolean(body.preferences), nameChanged: body.name !== undefined });
      writeDb(db);
      sendJson(response, 200, { user: publicUser(user) });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/change-password") {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      const body = await parseBody(request);
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "").trim();
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        sendError(response, 400, "Current password is incorrect.");
        return;
      }
      if (newPassword.length < 6) {
        sendError(response, 400, "New password must be at least 6 characters.");
        return;
      }
      const currentToken = getTokenFromRequest(request);
      user.passwordHash = hashPassword(newPassword);
      db.sessions = Object.fromEntries(
        Object.entries(db.sessions).filter(([token, session]) => token === currentToken || session.userId !== user.id)
      );
      await createSystemEmail(db, user.emailLower, "ShipOverseas password changed", "Your ShipOverseas password was updated from your account settings.");
      audit(db, user, "account.password_changed", { userEmail: user.emailLower });
      writeDb(db);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/login") {
      const body = await parseBody(request);
      const emailLower = String(body.email || "").trim().toLowerCase();
      const user = db.users.find((item) => item.emailLower === emailLower);
      if (!user || !verifyPassword(body.password || "", user.passwordHash)) {
        sendError(response, 401, "Invalid email or password.");
        return;
      }
      if (!String(user.passwordHash).startsWith("pbkdf2$")) {
        user.passwordHash = hashPassword(body.password || "");
      }
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
      audit(db, user, "auth.login", { userEmail: user.emailLower });
      writeDb(db);
      sendJson(response, 200, { token, user: publicUser(user) });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/register") {
      const body = await parseBody(request);
      const email = String(body.email || "").trim();
      const emailLower = email.toLowerCase();
      if (!email || !String(body.password || "").trim() || !String(body.name || "").trim()) {
        sendError(response, 400, "Name, email, and password are required.");
        return;
      }
      if (emailLower === ADMIN_EMAIL_LOWER && db.users.some((item) => item.emailLower === ADMIN_EMAIL_LOWER)) {
        sendError(response, 409, "This reserved account already exists. Please log in.");
        return;
      }
      if (db.users.some((item) => item.emailLower === emailLower)) {
        sendError(response, 409, "That email is already registered.");
        return;
      }
      const user = {
        id: crypto.randomUUID(),
        name: String(body.name).trim(),
        email,
        emailLower,
        role: emailLower === ADMIN_EMAIL_LOWER ? "admin" : "customer",
        passwordHash: hashPassword(body.password),
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
      audit(db, user, "auth.register", { userEmail: user.emailLower, role: user.role });
      writeDb(db);
      sendJson(response, 201, { token, user: publicUser(user) });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/password-reset/request") {
      const body = await parseBody(request);
      const emailLower = String(body.email || "").trim().toLowerCase();
      const user = db.users.find((item) => item.emailLower === emailLower);
      let localCode = "";
      if (user) {
        localCode = String(crypto.randomInt(100000, 999999));
        db.passwordResets = db.passwordResets.filter((item) => item.emailLower !== emailLower || item.used);
        db.passwordResets.unshift({
          id: crypto.randomUUID(),
          userId: user.id,
          emailLower,
          codeHash: hashSecret(localCode),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          used: false,
          createdAt: new Date().toISOString()
        });
        await createSystemEmail(
          db,
          user.emailLower,
          "ShipOverseas password reset code",
          `Use reset code ${localCode} to set a new ShipOverseas password. This code expires in 15 minutes.`
        );
        audit(db, user, "auth.password_reset_requested", { userEmail: user.emailLower });
        writeDb(db);
      }
      sendJson(response, 200, {
        ok: true,
        message: "If the account exists, a reset code has been sent.",
        localCode
      });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/password-reset/confirm") {
      const body = await parseBody(request);
      const emailLower = String(body.email || "").trim().toLowerCase();
      const codeHash = hashSecret(String(body.code || "").trim());
      const newPassword = String(body.password || "").trim();
      if (!emailLower || !String(body.code || "").trim() || newPassword.length < 4) {
        sendError(response, 400, "Email, reset code, and a password with at least 4 characters are required.");
        return;
      }
      const reset = db.passwordResets.find(
        (item) => item.emailLower === emailLower && item.codeHash === codeHash && !item.used && new Date(item.expiresAt) > new Date()
      );
      if (!reset) {
        sendError(response, 400, "Invalid or expired reset code.");
        return;
      }
      const user = db.users.find((item) => item.id === reset.userId);
      if (!user) {
        sendError(response, 404, "Account not found.");
        return;
      }
      user.passwordHash = hashPassword(newPassword);
      reset.used = true;
      db.sessions = Object.fromEntries(Object.entries(db.sessions).filter(([, session]) => session.userId !== user.id));
      await createSystemEmail(db, user.emailLower, "ShipOverseas password changed", "Your ShipOverseas password was updated.");
      audit(db, user, "auth.password_reset_completed", { userEmail: user.emailLower });
      writeDb(db);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/logout") {
      const header = request.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (token && db.sessions[token]) {
        delete db.sessions[token];
        writeDb(db);
      }
      sendJson(response, 200, { ok: true });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/shipments") {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      const shipments =
        user.emailLower === ADMIN_EMAIL_LOWER
          ? db.shipments
          : db.shipments.filter((shipment) => shipment.receiverEmail === user.emailLower);
      sendJson(response, 200, { shipments: shipments.map(enrichShipment) });
      return;
    }

    if (method === "GET" && parts[0] === "api" && parts[1] === "track" && parts[2]) {
      const trackingId = parts[2].toUpperCase();
      const shipment = db.shipments.find((item) => item.trackingId === trackingId || item.billOfLading === trackingId);
      if (!shipment) {
        sendError(response, 404, "Shipment not found.");
        return;
      }
      sendJson(response, 200, { shipment: publicShipment(shipment) });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/shipments") {
      const admin = requireAdmin(request, response, db);
      if (response.writableEnded) return;
      const shipment = normalizeShipment(await parseBody(request));
      const validation = validateShipment(shipment);
      if (validation) {
        sendError(response, 400, validation);
        return;
      }
      if (db.shipments.some((item) => item.trackingId === shipment.trackingId)) {
        sendError(response, 409, "A shipment with that tracking ID already exists.");
        return;
      }
      db.shipments.unshift(shipment);
      const email = await createEmail(db, shipment, "We will continue to send updates as the shipment moves.", "packageCreated");
      audit(db, admin, "shipment.created", { trackingId: shipment.trackingId, receiverEmail: shipment.receiverEmail });
      writeDb(db);
      sendJson(response, 201, { shipment, email });
      return;
    }

    if (method === "PATCH" && parts[0] === "api" && parts[1] === "shipments" && parts[2]) {
      const admin = requireAdmin(request, response, db);
      if (response.writableEnded) return;
      const trackingId = parts[2].toUpperCase();
      const shipment = db.shipments.find((item) => item.trackingId === trackingId);
      if (!shipment) {
        sendError(response, 404, "Shipment not found.");
        return;
      }
      const body = await parseBody(request);
      const allowed = ["status", "eta", "locationName", "risk", "receiverEmail", "receiverName", "vessel", "cargo", "origin", "destination"];
      for (const key of allowed) {
        if (body[key] !== undefined) {
          shipment[key] = key === "receiverEmail" ? String(body[key]).trim().toLowerCase() : String(body[key]).trim();
        }
      }
      shipment.lastUpdated = new Date().toISOString();
      shipment.progress = getProgress(shipment.status);
      const preferenceKey = String(shipment.risk || "").toLowerCase().includes("watch") ? "riskAlerts" : "statusUpdates";
      const email = await createEmail(db, shipment, "This update was sent by ShipOverseas operations.", preferenceKey);
      audit(db, admin, "shipment.updated", { trackingId: shipment.trackingId, changedFields: Object.keys(body) });
      writeDb(db);
      sendJson(response, 200, { shipment, email });
      return;
    }

    if (method === "POST" && parts[0] === "api" && parts[1] === "shipments" && parts[2] && parts[3] === "advance") {
      const admin = requireAdmin(request, response, db);
      if (response.writableEnded) return;
      const shipment = db.shipments.find((item) => item.trackingId === parts[2].toUpperCase());
      if (!shipment) {
        sendError(response, 404, "Shipment not found.");
        return;
      }
      const index = Math.max(0, statusSteps.findIndex((step) => step.name === shipment.status));
      shipment.status = statusSteps[Math.min(index + 1, statusSteps.length - 1)].name;
      shipment.progress = getProgress(shipment.status);
      shipment.lastUpdated = new Date().toISOString();
      const email = await createEmail(db, shipment, "The shipment was advanced to the next milestone.", "statusUpdates");
      audit(db, admin, "shipment.advanced", { trackingId: shipment.trackingId, status: shipment.status });
      writeDb(db);
      sendJson(response, 200, { shipment, email });
      return;
    }

    if (method === "POST" && parts[0] === "api" && parts[1] === "shipments" && parts[2] && parts[3] === "notify") {
      const admin = requireAdmin(request, response, db);
      if (response.writableEnded) return;
      const shipment = db.shipments.find((item) => item.trackingId === parts[2].toUpperCase());
      if (!shipment) {
        sendError(response, 404, "Shipment not found.");
        return;
      }
      const email = await createEmail(db, shipment, "Manual customer notification requested.", "statusUpdates");
      audit(db, admin, "shipment.notified", { trackingId: shipment.trackingId, status: email?.status });
      writeDb(db);
      sendJson(response, 201, { email });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/emails") {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      const emails =
        user.emailLower === ADMIN_EMAIL_LOWER ? db.emails : db.emails.filter((email) => email.to === user.emailLower);
      sendJson(response, 200, { emails });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/audit-logs") {
      requireAdmin(request, response, db);
      if (response.writableEnded) return;
      sendJson(response, 200, { auditLogs: (db.auditLogs || []).slice(0, 100) });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/admin/export") {
      const admin = requireAdmin(request, response, db);
      if (response.writableEnded) return;
      audit(db, admin, "backup.exported", { format: "json" });
      writeDb(db);
      sendJson(response, 200, { export: safeExport(db) });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/admin/backups") {
      const admin = requireAdmin(request, response, db);
      if (response.writableEnded) return;
      const backup = createBackup(db);
      audit(db, admin, "backup.created", { fileName: backup.fileName });
      writeDb(db);
      sendJson(response, 201, { backup });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/support/conversations") {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      const conversations =
        user.emailLower === ADMIN_EMAIL_LOWER
          ? db.supportConversations
          : db.supportConversations.filter((conversation) => conversation.customerEmail === user.emailLower);
      sendJson(response, 200, {
        conversations: conversations
          .slice()
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .map((conversation) => publicConversation(conversation, user))
      });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/support/conversations") {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      if (user.emailLower === ADMIN_EMAIL_LOWER) {
        sendError(response, 400, "Open a customer conversation before replying.");
        return;
      }
      const body = await parseBody(request);
      const messageBody = String(body.message || "").trim();
      if (!messageBody) {
        sendError(response, 400, "Message is required.");
        return;
      }
      const conversation = findOrCreateCustomerConversation(db, user, body.subject);
      const message = addSupportMessage(conversation, user, messageBody);
      audit(db, user, "support.customer_message", { conversationId: conversation.id });
      writeDb(db);
      sendJson(response, 201, { conversation: publicConversation(conversation, user), message, messages: conversation.messages });
      return;
    }

    if (parts[0] === "api" && parts[1] === "support" && parts[2] === "conversations" && parts[3]) {
      const user = getUserFromRequest(request, db);
      if (!user) {
        sendError(response, 401, "Login required.");
        return;
      }
      const conversation = db.supportConversations.find((item) => item.id === parts[3]);
      if (!conversation) {
        sendError(response, 404, "Conversation not found.");
        return;
      }
      if (!canAccessConversation(user, conversation)) {
        sendError(response, 403, "You cannot access this conversation.");
        return;
      }
      if (method === "GET") {
        sendJson(response, 200, { conversation: publicConversation(conversation, user), messages: conversation.messages });
        return;
      }
      if (method === "POST" && parts[4] === "messages") {
        const body = await parseBody(request);
        const messageBody = String(body.message || "").trim();
        if (!messageBody) {
          sendError(response, 400, "Message is required.");
          return;
        }
        const message = addSupportMessage(conversation, user, messageBody);
        if (user.emailLower === ADMIN_EMAIL_LOWER) {
          await createSupportEmail(
            db,
            conversation.customerEmail,
            "ShipOverseas support replied",
            `${user.name} replied to your support request: ${message.body}`
          );
          audit(db, user, "support.admin_reply", { conversationId: conversation.id, customerEmail: conversation.customerEmail });
        } else {
          audit(db, user, "support.customer_message", { conversationId: conversation.id });
        }
        writeDb(db);
        sendJson(response, 201, { conversation: publicConversation(conversation, user), message, messages: conversation.messages });
        return;
      }
    }

    sendError(response, 404, "API route not found.");
  } catch (error) {
    sendError(response, 500, error.message || "Server error.");
  }
}

function serveStatic(request, response) {
  const filePath = resolveRequest(request.url || "/");
  if (!isSafePath(filePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "content-type": mimeTypes[ext] || "application/octet-stream" });
    response.end(data);
  });
}

ensureDb();

const server = http.createServer((request, response) => {
  const parsed = new URL(request.url || "/", `http://${host}:${port}`);
  if (parsed.pathname.startsWith("/api/")) {
    handleApi(request, response, parsed);
    return;
  }
  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`ShipOverseas is live at http://${host}:${port}`);
  console.log(`Admin login: ${ADMIN_EMAIL} / admin123`);
});
