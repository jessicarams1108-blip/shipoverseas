const TOKEN_KEY = "shipoverseas.token";
const THEME_KEY = "shipoverseas.theme";

const portCoordinates = {
  Shanghai: { x: 136, y: 152 },
  Singapore: { x: 195, y: 222 },
  Rotterdam: { x: 552, y: 112 },
  "Los Angeles": { x: 120, y: 205 },
  Hamburg: { x: 548, y: 96 },
  "New York": { x: 520, y: 166 },
  Savannah: { x: 496, y: 205 },
  Busan: { x: 158, y: 142 },
  Valencia: { x: 508, y: 154 },
  "Port Klang": { x: 213, y: 225 }
};

const portGeo = {
  Shanghai: { lat: 31.2304, lon: 121.4737 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  Rotterdam: { lat: 51.9244, lon: 4.4777 },
  "Los Angeles": { lat: 33.7405, lon: -118.2775 },
  Hamburg: { lat: 53.5511, lon: 9.9937 },
  "New York": { lat: 40.7128, lon: -74.006 },
  Savannah: { lat: 32.0809, lon: -81.0912 },
  Busan: { lat: 35.1796, lon: 129.0756 },
  Valencia: { lat: 39.4699, lon: -0.3763 },
  "Port Klang": { lat: 3.0319, lon: 101.3928 }
};

const featurePages = {
  "container-tracking": {
    eyebrow: "Container Tracking API",
    title: "Container Tracking API",
    summary: "Track container milestones from booking through delivery using a tracking number, bill of lading, or container ID.",
    highlights: ["Loaded, departed, arrived, discharged, gate-in and gate-out milestones", "Container, vessel, route, ETA, and location fields", "Customer-facing status pages without exposing private operations tools"],
    workflow: ["Receive tracking or bill of lading", "Match shipment record", "Render route, milestone, risk, and ETA data", "Notify customer when the status changes"]
  },
  "eta-etd-alerts": {
    eyebrow: "Schedule Intelligence",
    title: "ETA and ETD Alerts",
    summary: "Keep customers and operations teams ahead of sailing changes, port delays, and arrival updates.",
    highlights: ["ETA/ETD change detection", "Delay severity notes", "Email and portal notifications", "Live map context for revised route progress"],
    workflow: ["Compare latest schedule against planned shipment", "Flag delay or early movement", "Update shipment timeline", "Send a customer notification"]
  },
  "detention-demurrage": {
    eyebrow: "Cost Risk",
    title: "Detention and Demurrage",
    summary: "Surface fee risks when containers remain too long at terminal, destination yard, or outside free-day windows.",
    highlights: ["Detention watch notes", "Demurrage risk labels", "Destination terminal status", "Priority reminders before fees grow"],
    workflow: ["Track arrival and release milestones", "Compare dwell time to free days", "Mark risk level", "Notify customer and operations"]
  },
  "rolled-container": {
    eyebrow: "Exception Handling",
    title: "Rolled Container",
    summary: "Show when cargo misses its planned vessel and moves to a later sailing, with a clear customer-facing explanation.",
    highlights: ["Missed vessel detection", "Replacement sailing details", "Updated ETA", "Customer support chat context"],
    workflow: ["Identify missed load or vessel change", "Attach new sailing detail", "Update ETA and risk note", "Send customer update"]
  },
  "pickup-notice": {
    eyebrow: "Release Workflow",
    title: "Pick-up Notice",
    summary: "Tell customers when cargo is ready for terminal release or destination pickup.",
    highlights: ["Arrival and release states", "Customs review visibility", "Gate-out readiness", "Customer email update history"],
    workflow: ["Confirm arrival or customs release", "Mark ready for pickup", "Send release notice", "Track final delivery milestone"]
  },
  "email-updates": {
    eyebrow: "Notifications",
    title: "Email Updates",
    summary: "Record and later send customer messages for every package create, status update, and support event.",
    highlights: ["Local simulated outbox", "Customer email inbox", "Password reset emails", "Provider-ready path for SMTP, Resend, or SendGrid"],
    workflow: ["Create status event", "Generate customer message", "Store outbox record", "Deliver through email provider when connected"]
  }
};

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  statusSteps: [],
  shipments: [],
  myShipments: [],
  emails: [],
  supportConversations: [],
  supportMessages: [],
  auditLogs: [],
  selectedSupportConversationId: "",
  activePage: "",
  selectedShipment: null
};

const elements = {
  backButton: document.querySelector("#backButton"),
  themeToggle: document.querySelector("#themeToggle"),
  authSummary: document.querySelector("#authSummary"),
  profileMenu: document.querySelector("#profileMenu"),
  profilePage: document.querySelector("#profile"),
  profileTitle: document.querySelector("#profileTitle"),
  profileRole: document.querySelector("#profileRole"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileName: document.querySelector("#profileName"),
  profileEmail: document.querySelector("#profileEmail"),
  profileShipmentCount: document.querySelector("#profileShipmentCount"),
  profileEmailCount: document.querySelector("#profileEmailCount"),
  profileSettingsForm: document.querySelector("#profileSettingsForm"),
  profileNameInput: document.querySelector("#profileNameInput"),
  passwordSettingsForm: document.querySelector("#passwordSettingsForm"),
  preferenceForm: document.querySelector("#preferenceForm"),
  profileAccessLevel: document.querySelector("#profileAccessLevel"),
  profileDetailEmail: document.querySelector("#profileDetailEmail"),
  profileCreatedAt: document.querySelector("#profileCreatedAt"),
  profileScope: document.querySelector("#profileScope"),
  profileAdminRule: document.querySelector("#profileAdminRule"),
  profileEmailStatus: document.querySelector("#profileEmailStatus"),
  profileLatestShipment: document.querySelector("#profileLatestShipment"),
  profileLatestEta: document.querySelector("#profileLatestEta"),
  profileSupportCount: document.querySelector("#profileSupportCount"),
  adminOnlyItems: document.querySelectorAll("[data-admin-only]"),
  pageSections: document.querySelectorAll("[data-page]"),
  navLinks: document.querySelectorAll(".nav-links a"),
  heroTrackingForm: document.querySelector("#heroTrackingForm"),
  heroTrackingInput: document.querySelector("#heroTrackingInput"),
  trackingMessage: document.querySelector("#trackingMessage"),
  quickList: document.querySelector("#quickList"),
  metricActive: document.querySelector("#metricActive"),
  metricDelayed: document.querySelector("#metricDelayed"),
  metricCustomers: document.querySelector("#metricCustomers"),
  metricEmails: document.querySelector("#metricEmails"),
  detailTrackingId: document.querySelector("#detailTrackingId"),
  detailStatus: document.querySelector("#detailStatus"),
  detailRoute: document.querySelector("#detailRoute"),
  detailEta: document.querySelector("#detailEta"),
  detailProgressText: document.querySelector("#detailProgressText"),
  detailProgressBar: document.querySelector("#detailProgressBar"),
  detailList: document.querySelector("#detailList"),
  mapRouteTitle: document.querySelector("#mapRouteTitle"),
  riskChip: document.querySelector("#riskChip"),
  routeLine: document.querySelector("#routeLine"),
  originDot: document.querySelector("#originDot"),
  destinationDot: document.querySelector("#destinationDot"),
  shipDot: document.querySelector("#shipDot"),
  originLabel: document.querySelector("#originLabel"),
  destinationLabel: document.querySelector("#destinationLabel"),
  liveMapFrame: document.querySelector("#liveMapFrame"),
  liveMapStatus: document.querySelector("#liveMapStatus"),
  lastUpdated: document.querySelector("#lastUpdated"),
  timeline: document.querySelector("#timeline"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  resetForm: document.querySelector("#resetForm"),
  requestResetButton: document.querySelector("#requestResetButton"),
  resetMessage: document.querySelector("#resetMessage"),
  portalEmpty: document.querySelector("#portalEmpty"),
  customerContent: document.querySelector("#customerContent"),
  customerShipments: document.querySelector("#customerShipments"),
  customerEmails: document.querySelector("#customerEmails"),
  customerSupportStatus: document.querySelector("#customerSupportStatus"),
  customerChatMessages: document.querySelector("#customerChatMessages"),
  customerChatForm: document.querySelector("#customerChatForm"),
  adminLock: document.querySelector("#adminLock"),
  backendContent: document.querySelector("#backendContent"),
  shipmentForm: document.querySelector("#shipmentForm"),
  statusSelect: document.querySelector("#statusSelect"),
  adminShipmentSelect: document.querySelector("#adminShipmentSelect"),
  updateForm: document.querySelector("#updateForm"),
  updateStatusSelect: document.querySelector("#updateStatusSelect"),
  advancePackage: document.querySelector("#advancePackage"),
  notifyPackage: document.querySelector("#notifyPackage"),
  adminEmails: document.querySelector("#adminEmails"),
  createBackupButton: document.querySelector("#createBackupButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  backupStatus: document.querySelector("#backupStatus"),
  auditLogList: document.querySelector("#auditLogList"),
  supportDeskCount: document.querySelector("#supportDeskCount"),
  supportConversationList: document.querySelector("#supportConversationList"),
  supportConversationTitle: document.querySelector("#supportConversationTitle"),
  adminChatMessages: document.querySelector("#adminChatMessages"),
  adminChatForm: document.querySelector("#adminChatForm"),
  featureDetail: document.querySelector("#featureDetail"),
  fleetFilter: document.querySelector("#fleetFilter"),
  fleetRows: document.querySelector("#fleetRows"),
  toast: document.querySelector("#toast")
};

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function resetPageScroll() {
  window.scrollTo({ top: 0, left: 0 });
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  window.setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 140);
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== "string") {
    headers["content-type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  if (state.token) {
    headers.authorization = `Bearer ${state.token}`;
  }
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function isAdmin() {
  return state.user?.role === "admin";
}

function visibleShipments() {
  if (!state.user) return state.shipments;
  return isAdmin() ? state.shipments : state.myShipments;
}

function getInitials(user) {
  if (!user) return "SO";
  const source = user.name || user.email || "ShipOverseas";
  const parts = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SO";
}

function getProgress(status) {
  return state.statusSteps.find((step) => step.name === status)?.progress || 0;
}

function getRisk(shipment) {
  const note = String(shipment.risk || "").toLowerCase();
  if (note.includes("detention") || note.includes("delay") || note.includes("risk")) {
    return { label: shipment.risk, className: "high" };
  }
  if (note.includes("watch") || note.includes("priority") || note.includes("customs")) {
    return { label: shipment.risk, className: "watch" };
  }
  return { label: shipment.risk || "On track", className: "good" };
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function routePoint(portName, fallback) {
  return portCoordinates[portName] || fallback;
}

function makeRoutePath(origin, destination) {
  const midA = { x: origin.x + (destination.x - origin.x) * 0.32, y: Math.min(origin.y, destination.y) - 70 };
  const midB = { x: origin.x + (destination.x - origin.x) * 0.68, y: Math.max(origin.y, destination.y) + 64 };
  return `M ${origin.x} ${origin.y} C ${midA.x} ${midA.y}, ${midB.x} ${midB.y}, ${destination.x} ${destination.y}`;
}

function cubicPoint(start, controlA, controlB, end, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const mt = 1 - t;
  return {
    x: mt ** 3 * start.x + 3 * mt ** 2 * t * controlA.x + 3 * mt * t ** 2 * controlB.x + t ** 3 * end.x,
    y: mt ** 3 * start.y + 3 * mt ** 2 * t * controlA.y + 3 * mt * t ** 2 * controlB.y + t ** 3 * end.y
  };
}

function currentShipPoint(origin, destination, progress) {
  const midA = { x: origin.x + (destination.x - origin.x) * 0.32, y: Math.min(origin.y, destination.y) - 70 };
  const midB = { x: origin.x + (destination.x - origin.x) * 0.68, y: Math.max(origin.y, destination.y) + 64 };
  return cubicPoint(origin, midA, midB, destination, progress / 100);
}

function routeGeo(portName, fallback) {
  return portGeo[portName] || fallback;
}

function currentGeoPoint(origin, destination, progress) {
  const ratio = Math.max(0, Math.min(1, progress / 100));
  return {
    lat: origin.lat + (destination.lat - origin.lat) * ratio,
    lon: origin.lon + (destination.lon - origin.lon) * ratio
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeMapEmbedUrl(shipment, progress) {
  const origin = routeGeo(shipment.origin, { lat: 20, lon: -20 });
  const destination = routeGeo(shipment.destination, { lat: 34, lon: 20 });
  const current = currentGeoPoint(origin, destination, progress);
  const minLon = clamp(Math.min(origin.lon, destination.lon, current.lon) - 8, -179, 179);
  const maxLon = clamp(Math.max(origin.lon, destination.lon, current.lon) + 8, -179, 179);
  const minLat = clamp(Math.min(origin.lat, destination.lat, current.lat) - 6, -80, 84);
  const maxLat = clamp(Math.max(origin.lat, destination.lat, current.lat) + 6, -80, 84);
  const markerLat = clamp(current.lat, -80, 84).toFixed(4);
  const markerLon = clamp(current.lon, -179, 179).toFixed(4);
  const bbox = [minLon, minLat, maxLon, maxLat].map((value) => value.toFixed(4)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerLat}%2C${markerLon}`;
}

async function loadBootstrap() {
  const data = await apiFetch("/api/bootstrap");
  state.statusSteps = data.statusSteps;
  state.shipments = data.shipments;
  if (!state.selectedShipment) {
    state.selectedShipment = state.shipments[0] || null;
  }
}

async function loadMe() {
  if (!state.token) {
    state.user = null;
    return;
  }
  try {
    const data = await apiFetch("/api/me");
    state.user = data.user;
    if (!state.user) {
      state.token = "";
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    state.user = null;
    state.token = "";
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function loadPrivateData() {
  if (!state.user) {
    state.myShipments = [];
    state.emails = [];
    state.supportConversations = [];
    state.supportMessages = [];
    state.auditLogs = [];
    state.selectedSupportConversationId = "";
    return;
  }
  const [shipmentsData, emailsData, supportData] = await Promise.all([
    apiFetch("/api/shipments"),
    apiFetch("/api/emails"),
    apiFetch("/api/support/conversations")
  ]);
  state.myShipments = shipmentsData.shipments;
  state.emails = emailsData.emails;
  state.supportConversations = supportData.conversations;
  if (isAdmin()) {
    state.shipments = shipmentsData.shipments;
    const auditData = await apiFetch("/api/audit-logs");
    state.auditLogs = auditData.auditLogs;
  } else {
    state.auditLogs = [];
  }
  if (!state.selectedSupportConversationId && state.supportConversations.length) {
    state.selectedSupportConversationId = state.supportConversations[0].id;
  }
  if (state.selectedSupportConversationId && state.supportConversations.some((item) => item.id === state.selectedSupportConversationId)) {
    await loadSupportThread(state.selectedSupportConversationId);
  } else {
    state.supportMessages = [];
  }
}

async function loadSupportThread(conversationId) {
  if (!conversationId) {
    state.supportMessages = [];
    return;
  }
  const data = await apiFetch(`/api/support/conversations/${encodeURIComponent(conversationId)}`);
  state.selectedSupportConversationId = data.conversation.id;
  state.supportMessages = data.messages;
}

function renderStatusOptions() {
  const options = state.statusSteps.map((step) => `<option value="${escapeHtml(step.name)}">${escapeHtml(step.name)}</option>`).join("");
  elements.statusSelect.innerHTML = options;
  elements.updateStatusSelect.innerHTML = options;
}

function renderAuthSummary() {
  if (!state.user) {
    elements.authSummary.innerHTML = `<a class="secondary-link login-link" href="#portal">Login</a>`;
    elements.profileMenu.classList.add("hidden");
    elements.profileMenu.innerHTML = "";
    return;
  }
  const role = isAdmin() ? "Operations" : "Customer";
  const initials = getInitials(state.user);
  elements.authSummary.innerHTML = `
    <button class="profile-button" type="button" id="profileButton" aria-expanded="false" aria-controls="profileMenu">
      <span class="profile-avatar">${escapeHtml(initials)}</span>
      <span class="profile-button-text">
        <strong>Profile</strong>
        <small>${escapeHtml(state.user.email)}</small>
      </span>
    </button>
  `;
  elements.profileMenu.innerHTML = `
    <div class="profile-menu-head">
      <span class="profile-avatar">${escapeHtml(initials)}</span>
      <div>
        <strong>${escapeHtml(state.user.name || "ShipOverseas User")}</strong>
        <small>${escapeHtml(state.user.email)}</small>
      </div>
    </div>
    <dl>
      <div><dt>Role</dt><dd>${escapeHtml(role)}</dd></div>
      <div><dt>Shipments</dt><dd>${visibleShipments().length}</dd></div>
      <div><dt>Email updates</dt><dd>${state.emails.length}</dd></div>
    </dl>
    <div class="profile-menu-actions">
      <a class="secondary-link" href="#profile" id="profilePageLink">Profile Page</a>
      ${isAdmin() ? `<a class="secondary-link" href="#backend">Ops Console</a>` : ""}
      <button type="button" id="logoutButton">Logout</button>
    </div>
  `;
  document.querySelector("#profileButton").addEventListener("click", toggleProfileMenu);
  document.querySelector("#logoutButton").addEventListener("click", logout);
  document.querySelector("#profilePageLink").addEventListener("click", () => elements.profileMenu.classList.add("hidden"));
}

function toggleProfileMenu() {
  const expanded = elements.profileMenu.classList.toggle("hidden");
  document.querySelector("#profileButton")?.setAttribute("aria-expanded", String(!expanded));
}

function renderMetrics() {
  const shipments = visibleShipments();
  const active = shipments.filter((item) => item.status !== "Delivered").length;
  const risks = shipments.filter((item) => getRisk(item).className !== "good").length;
  const customers = new Set(shipments.map((item) => item.receiverEmail || item.receiverName).filter(Boolean)).size;
  elements.metricActive.textContent = active;
  elements.metricDelayed.textContent = risks;
  elements.metricCustomers.textContent = customers;
  elements.metricEmails.textContent = state.emails.length || "0";
}

function renderQuickList() {
  elements.quickList.innerHTML = "";
  visibleShipments().slice(0, 4).forEach((shipment) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = shipment.trackingId;
    button.addEventListener("click", () => selectShipment(shipment));
    elements.quickList.append(button);
  });
}

function renderDetails() {
  const shipment = state.selectedShipment;
  if (!shipment) return;
  const progress = shipment.progress ?? getProgress(shipment.status);
  const risk = getRisk(shipment);
  elements.detailTrackingId.textContent = shipment.trackingId;
  elements.detailStatus.textContent = shipment.status;
  elements.detailRoute.textContent = `${shipment.origin} to ${shipment.destination}`;
  elements.detailEta.textContent = `ETA ${formatDate(shipment.eta)}`;
  elements.detailProgressText.textContent = `${progress}%`;
  elements.detailProgressBar.style.width = `${progress}%`;
  elements.riskChip.textContent = risk.label;
  elements.riskChip.className = `risk-chip ${risk.className}`;
  elements.mapRouteTitle.textContent = `${shipment.origin} to ${shipment.destination}`;
  elements.lastUpdated.textContent = `Updated ${formatDateTime(shipment.lastUpdated)}`;
  elements.heroTrackingInput.value = shipment.trackingId;

  const rows = [
    ["Bill of Lading", shipment.billOfLading],
    ["Container", shipment.container],
    ["Receiver", shipment.receiverName],
    ["Vessel", shipment.vessel],
    ["Cargo", shipment.cargo],
    ["Location", shipment.locationName],
    ["Manager", shipment.manager || "Ops desk"]
  ];
  if (state.user && (isAdmin() || shipment.receiverEmail === state.user.email?.toLowerCase())) {
    rows.splice(3, 0, ["Receiver Email", shipment.receiverEmail]);
  }
  elements.detailList.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd></div>`)
    .join("");
}

function renderMap() {
  const shipment = state.selectedShipment;
  if (!shipment) return;
  const origin = routePoint(shipment.origin, { x: 150, y: 170 });
  const destination = routePoint(shipment.destination, { x: 530, y: 175 });
  const progress = shipment.progress ?? getProgress(shipment.status);
  const ship = currentShipPoint(origin, destination, progress);
  const mapUrl = makeMapEmbedUrl(shipment, progress);
  if (elements.liveMapFrame.src !== mapUrl) {
    elements.liveMapFrame.src = mapUrl;
  }
  elements.liveMapStatus.textContent = `${shipment.locationName || shipment.status} - ${formatDateTime(shipment.lastUpdated)}`;
  elements.routeLine.setAttribute("d", makeRoutePath(origin, destination));
  elements.originDot.setAttribute("cx", origin.x);
  elements.originDot.setAttribute("cy", origin.y);
  elements.destinationDot.setAttribute("cx", destination.x);
  elements.destinationDot.setAttribute("cy", destination.y);
  elements.shipDot.setAttribute("cx", ship.x);
  elements.shipDot.setAttribute("cy", ship.y);
  elements.originLabel.setAttribute("x", origin.x + 12);
  elements.originLabel.setAttribute("y", origin.y - 12);
  elements.destinationLabel.setAttribute("x", destination.x - 104);
  elements.destinationLabel.setAttribute("y", destination.y - 12);
  elements.originLabel.textContent = shipment.origin;
  elements.destinationLabel.textContent = shipment.destination;
}

function renderTimeline() {
  const shipment = state.selectedShipment;
  if (!shipment) return;
  const currentIndex = Math.max(0, state.statusSteps.findIndex((step) => step.name === shipment.status));
  elements.timeline.innerHTML = state.statusSteps
    .slice(0, 6)
    .map((step, index) => {
      const stateName = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
      const note = index < currentIndex ? "Complete" : index === currentIndex ? "Current" : "Pending";
      return `<li class="${stateName}"><strong>${escapeHtml(step.name)}</strong><span>${note}</span></li>`;
    })
    .join("");
}

function renderFleet() {
  const filter = elements.fleetFilter.value.trim().toLowerCase();
  const visible = visibleShipments().filter((shipment) =>
    [shipment.trackingId, shipment.billOfLading, shipment.receiverName, shipment.origin, shipment.destination, shipment.status]
      .join(" ")
      .toLowerCase()
      .includes(filter)
  );
  elements.fleetRows.innerHTML = visible
    .map((shipment) => {
      const progress = shipment.progress ?? getProgress(shipment.status);
      const active = shipment.trackingId === state.selectedShipment?.trackingId ? "active" : "";
      return `
        <tr class="${active}" data-tracking="${escapeHtml(shipment.trackingId)}">
          <td data-label="Tracking"><strong>${escapeHtml(shipment.trackingId)}</strong><br><small>${escapeHtml(shipment.billOfLading)}</small></td>
          <td data-label="Receiver">${escapeHtml(shipment.receiverName || "Customer shipment")}${isAdmin() && shipment.receiverEmail ? `<br><small>${escapeHtml(shipment.receiverEmail)}</small>` : ""}</td>
          <td data-label="Route">${escapeHtml(shipment.origin)} to ${escapeHtml(shipment.destination)}</td>
          <td data-label="Status">${escapeHtml(shipment.status)}</td>
          <td data-label="ETA">${formatDate(shipment.eta)}</td>
          <td data-label="Progress"><div class="mini-progress"><span><i style="width:${progress}%"></i></span><b>${progress}%</b></div></td>
        </tr>`;
    })
    .join("");

  elements.fleetRows.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      const shipment = visibleShipments().find((item) => item.trackingId === row.dataset.tracking);
      if (shipment) selectShipment(shipment);
    });
  });
}

function renderCustomerPortal() {
  const loggedIn = Boolean(state.user);
  elements.portalEmpty.classList.toggle("hidden", loggedIn);
  elements.customerContent.classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;

  const shipments = isAdmin() ? state.shipments : state.myShipments;
  elements.customerShipments.innerHTML =
    shipments.length === 0
      ? `<div class="empty-state">No shipments are assigned to ${escapeHtml(state.user.email)} yet.</div>`
      : shipments
          .map(
            (shipment) => `
              <div class="customer-card" data-tracking="${escapeHtml(shipment.trackingId)}">
                <strong>${escapeHtml(shipment.trackingId)}</strong>
                <p>${escapeHtml(shipment.origin)} to ${escapeHtml(shipment.destination)}</p>
                <p>${escapeHtml(shipment.status)} - ETA ${formatDate(shipment.eta)}</p>
              </div>`
          )
          .join("");

  elements.customerShipments.querySelectorAll(".customer-card").forEach((card) => {
    card.addEventListener("click", () => {
      const shipment = state.shipments.find((item) => item.trackingId === card.dataset.tracking) || state.myShipments.find((item) => item.trackingId === card.dataset.tracking);
      if (shipment) selectShipment(shipment);
    });
  });

  elements.customerEmails.innerHTML = renderEmailList(state.emails);
}

function renderAdminBackend() {
  const unlocked = isAdmin();
  elements.adminOnlyItems.forEach((item) => item.classList.toggle("hidden", !unlocked));
  if (!unlocked) {
    if (window.location.hash === "#backend") {
      navigateToHash(state.user ? "#portal" : "#home");
    }
    return;
  }

  elements.adminLock.textContent = "Verified operations access";
  elements.adminLock.className = "admin-lock unlocked";

  elements.adminShipmentSelect.innerHTML = state.shipments
    .map((shipment) => `<option value="${escapeHtml(shipment.trackingId)}">${escapeHtml(shipment.trackingId)} - ${escapeHtml(shipment.receiverName)}</option>`)
    .join("");

  if (state.selectedShipment) {
    elements.adminShipmentSelect.value = state.selectedShipment.trackingId;
  }
  syncUpdateForm();
  elements.adminEmails.innerHTML = renderEmailList(state.emails);
  elements.auditLogList.innerHTML = renderAuditList(state.auditLogs);
}

function renderProfilePage() {
  const loggedIn = Boolean(state.user);
  elements.profilePage.classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;

  const role = isAdmin() ? "Operations" : "Customer";
  const shipments = visibleShipments();
  const latestShipment = shipments
    .slice()
    .sort((a, b) => new Date(b.lastUpdated || b.createdAt || 0) - new Date(a.lastUpdated || a.createdAt || 0))[0];
  elements.profileTitle.textContent = `${state.user.name || "My"} Profile`;
  elements.profileRole.textContent = role;
  elements.profileAvatar.textContent = getInitials(state.user);
  elements.profileName.textContent = state.user.name || "ShipOverseas User";
  elements.profileEmail.textContent = state.user.email;
  elements.profileShipmentCount.textContent = shipments.length;
  elements.profileEmailCount.textContent = state.emails.length;
  elements.profileAccessLevel.textContent = isAdmin() ? "Operations access" : "Customer access";
  elements.profileDetailEmail.textContent = state.user.email;
  elements.profileCreatedAt.textContent = formatDateTime(state.user.createdAt);
  elements.profileScope.textContent = isAdmin() ? "All customer shipments" : "Shipments linked to this email";
  elements.profileAdminRule.textContent = isAdmin() ? "Can create and update packages" : "Admin tools hidden";
  elements.profileEmailStatus.textContent = state.emails.length ? `${state.emails.length} records` : "Ready";
  elements.profileLatestShipment.textContent = latestShipment ? latestShipment.trackingId : "No shipments yet";
  elements.profileLatestEta.textContent = latestShipment ? formatDate(latestShipment.eta) : "-";
  elements.profileSupportCount.textContent = state.supportConversations.length;
  elements.profileNameInput.value = state.user.name || "";
  const preferences = {
    packageCreated: true,
    statusUpdates: true,
    supportReplies: true,
    riskAlerts: true,
    weeklySummary: false,
    ...(state.user.preferences || {})
  };
  Object.entries(preferences).forEach(([key, enabled]) => {
    const input = elements.preferenceForm.elements[key];
    if (input) input.checked = Boolean(enabled);
  });
}

function renderFeatureDetail() {
  const featureId = window.location.hash.replace("#feature-", "");
  const page = featurePages[featureId];
  elements.featureDetail.classList.toggle("hidden", !page);
  if (!page) return;

  elements.featureDetail.innerHTML = `
    <div class="feature-hero">
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h2>${escapeHtml(page.title)}</h2>
      <p>${escapeHtml(page.summary)}</p>
    </div>
    <div class="feature-page-grid">
      <article>
        <h3>What It Adds</h3>
        <ul>${page.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article>
        <h3>How It Works</h3>
        <ol>${page.workflow.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article>
        <h3>ShipOverseas Fit</h3>
        <p>This page connects back to the live tracking workspace, customer portal, email history, and support chat so the feature feels like part of one professional product.</p>
        <div class="button-row">
          <a class="primary-link" href="#tracking">View Tracking</a>
          <a class="secondary-link" href="#features">All Features</a>
        </div>
      </article>
    </div>
  `;
}

function getActivePage() {
  const hash = window.location.hash || "#home";
  if (hash.startsWith("#feature-")) return "feature";
  if (hash.startsWith("#tracking-") || hash === "#tracking") return "tracking";
  if (hash === "#features") return "features";
  if (hash === "#portal") return "portal";
  if (hash === "#profile") return "profile";
  if (hash === "#backend") return "backend";
  return "home";
}

function renderNavigationState() {
  const hash = window.location.hash || "#home";
  let activePage = getActivePage();

  if (activePage === "backend" && !isAdmin()) {
    navigateToHash(state.user ? "#portal" : "#home");
    return;
  }
  if (activePage === "profile" && !state.user) {
    navigateToHash("#portal");
    return;
  }

  const isFeaturePage = activePage === "feature";
  document.body.classList.toggle("feature-mode", isFeaturePage);
  elements.pageSections.forEach((section) => {
    section.classList.toggle("route-hidden", isFeaturePage || section.dataset.page !== activePage);
  });
  elements.navLinks.forEach((link) => {
    const linkPage = getPageFromLink(link.getAttribute("href"));
    link.classList.toggle("active", linkPage === activePage);
  });

  if (state.activePage !== activePage) {
    resetPageScroll();
    state.activePage = activePage;
  }

  const showBack = activePage !== "home";
  elements.backButton.classList.toggle("visible", showBack);
}

function getPageFromLink(href) {
  if (!href) return "";
  if (href === "#tracking") return "tracking";
  if (href === "#features") return "features";
  if (href === "#portal") return "portal";
  if (href === "#backend") return "backend";
  if (href === "#profile") return "profile";
  return "home";
}

function renderMessages(messages) {
  if (!messages.length) {
    return `<div class="empty-state">No messages yet. Start the conversation and ShipOverseas support will respond here.</div>`;
  }
  return messages
    .map((message) => {
      const mine =
        (message.authorRole === "operations" && isAdmin()) ||
        (message.authorRole === "customer" && !isAdmin() && message.authorEmail?.toLowerCase() === state.user?.email?.toLowerCase());
      return `
        <div class="chat-message ${mine ? "mine" : ""}">
          <strong>${escapeHtml(message.authorRole === "operations" ? "ShipOverseas Support" : message.authorName || "Customer")}</strong>
          <p>${escapeHtml(message.body)}</p>
          <small>${formatDateTime(message.createdAt)}</small>
        </div>
      `;
    })
    .join("");
}

function renderSupport() {
  if (!state.user) return;
  const selected = state.supportConversations.find((item) => item.id === state.selectedSupportConversationId);

  if (!isAdmin()) {
    elements.customerSupportStatus.textContent = selected ? selected.status.replace("_", " ") : "New chat";
    elements.customerChatMessages.innerHTML = renderMessages(state.supportMessages);
  }

  if (!isAdmin()) return;

  elements.supportDeskCount.textContent = `${state.supportConversations.length} open`;
  elements.supportConversationList.innerHTML =
    state.supportConversations.length === 0
      ? `<div class="empty-state">No customer conversations yet.</div>`
      : state.supportConversations
          .map(
            (conversation) => `
              <button class="${conversation.id === state.selectedSupportConversationId ? "active" : ""}" type="button" data-conversation="${escapeHtml(conversation.id)}">
                <strong>${escapeHtml(conversation.customerName || "Customer")}</strong>
                <span>${escapeHtml(conversation.subject)}</span>
                <small>${escapeHtml(conversation.lastMessage || "No messages")}</small>
              </button>
            `
          )
          .join("");
  elements.supportConversationList.querySelectorAll("button[data-conversation]").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadSupportThread(button.dataset.conversation);
      renderSupport();
    });
  });
  elements.supportConversationTitle.textContent = selected
    ? `${selected.customerName || "Customer"} - ${selected.subject}`
    : "Select a conversation";
  elements.adminChatMessages.innerHTML = selected
    ? renderMessages(state.supportMessages)
    : `<div class="empty-state">Choose a customer conversation to read and reply.</div>`;
}

function renderEmailList(emails) {
  if (!emails.length) return `<div class="empty-state">No email updates yet.</div>`;
  return emails
    .slice(0, 10)
    .map(
      (email) => `
        <div class="email-item">
          <strong>${escapeHtml(email.subject)}</strong>
          <p>${escapeHtml(email.body)}</p>
          <small>${escapeHtml(email.status)} - ${formatDateTime(email.createdAt)}</small>
        </div>`
    )
    .join("");
}

function renderAuditList(auditLogs) {
  if (!auditLogs.length) return `<div class="empty-state">No audit activity yet.</div>`;
  return auditLogs
    .slice(0, 12)
    .map((entry) => {
      const detailText = entry.details
        ? Object.entries(entry.details)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
            .join(" | ")
        : "";
      return `<div class="audit-item">
          <strong>${escapeHtml(entry.action)}</strong>
          <small>${escapeHtml(entry.actorEmail)} - ${formatDateTime(entry.createdAt)}</small>
          <small>${escapeHtml(detailText)}</small>
        </div>`;
    })
    .join("");
}

function syncUpdateForm() {
  if (!isAdmin() || !state.selectedShipment) return;
  const shipment = state.selectedShipment;
  elements.adminShipmentSelect.value = shipment.trackingId;
  elements.updateStatusSelect.value = shipment.status;
  elements.updateForm.elements.eta.value = shipment.eta || "";
  elements.updateForm.elements.locationName.value = shipment.locationName || "";
  elements.updateForm.elements.risk.value = shipment.risk || "";
}

function renderAll() {
  renderAuthSummary();
  renderMetrics();
  renderQuickList();
  renderStatusOptions();
  renderDetails();
  renderMap();
  renderTimeline();
  renderFleet();
  renderCustomerPortal();
  renderAdminBackend();
  renderProfilePage();
  renderSupport();
  renderFeatureDetail();
  renderNavigationState();
}

function selectShipment(shipment) {
  state.selectedShipment = shipment;
  elements.trackingMessage.textContent = "";
  navigateToHash("#tracking");
  renderAll();
}

async function refreshAll() {
  await loadBootstrap();
  await loadMe();
  await loadPrivateData();
  if (state.selectedShipment) {
    const fresh =
      state.shipments.find((shipment) => shipment.trackingId === state.selectedShipment.trackingId) ||
      state.myShipments.find((shipment) => shipment.trackingId === state.selectedShipment.trackingId);
    if (fresh) state.selectedShipment = fresh;
  }
  renderAll();
}

async function handleTrackingSubmit(event) {
  event.preventDefault();
  const trackingId = elements.heroTrackingInput.value.trim().toUpperCase();
  if (!trackingId) return;
  try {
    const data = await apiFetch(`/api/track/${encodeURIComponent(trackingId)}`);
    state.selectedShipment = data.shipment;
    const existing = state.shipments.find((shipment) => shipment.trackingId === data.shipment.trackingId);
    if (!existing) state.shipments.unshift(data.shipment);
    elements.trackingMessage.textContent = "";
    renderAll();
    toast(`Loaded ${data.shipment.trackingId}`);
  } catch (error) {
    elements.trackingMessage.textContent = error.message;
  }
}

async function login(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const response = await apiFetch("/api/login", {
      method: "POST",
      body: {
        email: data.get("email"),
        password: data.get("password")
      }
    });
    state.token = response.token;
    state.user = response.user;
    localStorage.setItem(TOKEN_KEY, state.token);
    await loadPrivateData();
    renderAll();
    toast(`Logged in as ${state.user.email}`);
  } catch (error) {
    toast(error.message);
  }
}

async function register(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const response = await apiFetch("/api/register", {
      method: "POST",
      body: {
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password")
      }
    });
    state.token = response.token;
    state.user = response.user;
    localStorage.setItem(TOKEN_KEY, state.token);
    await loadPrivateData();
    renderAll();
    toast("Account created.");
  } catch (error) {
    toast(error.message);
  }
}

async function requestPasswordReset() {
  const email = elements.resetForm.elements.email.value.trim();
  if (!email) {
    toast("Enter your account email first.");
    return;
  }
  try {
    const response = await apiFetch("/api/password-reset/request", {
      method: "POST",
      body: { email }
    });
    if (response.localCode) {
      elements.resetForm.elements.code.value = response.localCode;
      elements.resetMessage.textContent = `Local prototype code: ${response.localCode}`;
    } else {
      elements.resetMessage.textContent = response.message;
    }
    toast("Reset code sent.");
  } catch (error) {
    toast(error.message);
  }
}

async function confirmPasswordReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  try {
    await apiFetch("/api/password-reset/confirm", {
      method: "POST",
      body: {
        email: data.get("email"),
        code: data.get("code"),
        password: data.get("password")
      }
    });
    elements.loginForm.elements.email.value = data.get("email");
    elements.loginForm.elements.password.value = "";
    form.reset();
    elements.resetMessage.textContent = "";
    switchAuthTab("login");
    toast("Password updated. Log in with the new password.");
  } catch (error) {
    elements.resetMessage.textContent = error.message;
  }
}

async function saveProfileSettings(event) {
  event.preventDefault();
  const name = elements.profileNameInput.value.trim();
  try {
    const response = await apiFetch("/api/me", {
      method: "PATCH",
      body: { name }
    });
    state.user = response.user;
    await loadPrivateData();
    renderAll();
    toast("Account details saved.");
  } catch (error) {
    toast(error.message);
  }
}

async function saveNotificationPreferences(event) {
  event.preventDefault();
  const preferences = {};
  ["packageCreated", "statusUpdates", "riskAlerts", "supportReplies", "weeklySummary"].forEach((key) => {
    preferences[key] = Boolean(elements.preferenceForm.elements[key]?.checked);
  });
  try {
    const response = await apiFetch("/api/me", {
      method: "PATCH",
      body: { preferences }
    });
    state.user = response.user;
    await loadPrivateData();
    renderAll();
    toast("Notification preferences saved.");
  } catch (error) {
    toast(error.message);
  }
}

async function changeAccountPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const currentPassword = form.elements.currentPassword.value;
  const newPassword = form.elements.newPassword.value;
  try {
    await apiFetch("/api/change-password", {
      method: "POST",
      body: { currentPassword, newPassword }
    });
    form.reset();
    await loadPrivateData();
    renderAll();
    toast("Password changed.");
  } catch (error) {
    toast(error.message);
  }
}

async function createDataBackup() {
  try {
    const response = await apiFetch("/api/admin/backups", { method: "POST" });
    elements.backupStatus.textContent = `Backup created: ${response.backup.fileName}`;
    await loadPrivateData();
    renderAll();
    toast("Backup created.");
  } catch (error) {
    toast(error.message);
  }
}

async function exportDataJson() {
  try {
    const response = await apiFetch("/api/admin/export");
    const blob = new Blob([JSON.stringify(response.export, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shipoverseas-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    await loadPrivateData();
    renderAll();
    toast("Export prepared.");
  } catch (error) {
    toast(error.message);
  }
}

async function logout() {
  try {
    await apiFetch("/api/logout", { method: "POST" });
  } catch {
  }
  state.token = "";
  state.user = null;
  state.myShipments = [];
  state.emails = [];
  localStorage.removeItem(TOKEN_KEY);
  await refreshAll();
  toast("Logged out.");
}

function formObject(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

async function createShipment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const response = await apiFetch("/api/shipments", {
      method: "POST",
      body: formObject(form)
    });
    form.reset();
    state.selectedShipment = response.shipment;
    await refreshAll();
    toast(`Created ${response.shipment.trackingId} and recorded email update.`);
  } catch (error) {
    toast(error.message);
  }
}

async function updateShipment(event) {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const trackingId = data.trackingId;
  const body = {
    status: data.status,
    eta: data.eta,
    locationName: data.locationName,
    risk: data.risk
  };
  try {
    const response = await apiFetch(`/api/shipments/${encodeURIComponent(trackingId)}`, {
      method: "PATCH",
      body
    });
    state.selectedShipment = response.shipment;
    await refreshAll();
    toast(`Updated ${trackingId} and recorded email update.`);
  } catch (error) {
    toast(error.message);
  }
}

async function advancePackage() {
  const trackingId = elements.adminShipmentSelect.value;
  if (!trackingId) return;
  try {
    const response = await apiFetch(`/api/shipments/${encodeURIComponent(trackingId)}/advance`, { method: "POST" });
    state.selectedShipment = response.shipment;
    await refreshAll();
    toast(`${trackingId} advanced and customer update recorded.`);
  } catch (error) {
    toast(error.message);
  }
}

async function notifyPackage() {
  const trackingId = elements.adminShipmentSelect.value;
  if (!trackingId) return;
  try {
    await apiFetch(`/api/shipments/${encodeURIComponent(trackingId)}/notify`, { method: "POST" });
    await refreshAll();
    toast(`Email update recorded for ${trackingId}.`);
  } catch (error) {
    toast(error.message);
  }
}

async function sendCustomerMessage(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.elements.message.value.trim();
  if (!message) return;
  try {
    const path = state.selectedSupportConversationId
      ? `/api/support/conversations/${encodeURIComponent(state.selectedSupportConversationId)}/messages`
      : "/api/support/conversations";
    const response = await apiFetch(path, {
      method: "POST",
      body: {
        subject: "Customer service request",
        message
      }
    });
    form.reset();
    state.selectedSupportConversationId = response.conversation.id;
    state.supportMessages = response.messages;
    await loadPrivateData();
    renderAll();
    toast("Message sent to support.");
  } catch (error) {
    toast(error.message);
  }
}

async function sendAdminReply(event) {
  event.preventDefault();
  if (!state.selectedSupportConversationId) {
    toast("Select a customer conversation first.");
    return;
  }
  const form = event.currentTarget;
  const message = form.elements.message.value.trim();
  if (!message) return;
  try {
    const response = await apiFetch(`/api/support/conversations/${encodeURIComponent(state.selectedSupportConversationId)}/messages`, {
      method: "POST",
      body: { message }
    });
    form.reset();
    state.supportMessages = response.messages;
    await loadPrivateData();
    renderAll();
    toast("Reply sent.");
  } catch (error) {
    toast(error.message);
  }
}

function switchAuthTab(tabName) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === tabName);
  });
  elements.loginForm.classList.toggle("hidden", tabName !== "login");
  elements.registerForm.classList.toggle("hidden", tabName !== "register");
  elements.resetForm.classList.toggle("hidden", tabName !== "reset");
}

function useDemoLogin(type) {
  const form = elements.loginForm;
  form.elements.email.value = "customer@example.com";
  form.elements.password.value = "demo123";
  switchAuthTab("login");
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  navigateToHash("#home");
}

function handleHashChange() {
  renderFeatureDetail();
  renderNavigationState();
}

function navigateToHash(hash) {
  const nextHash = hash || "#home";
  if (window.location.hash !== nextHash) {
    window.history.pushState({}, "", nextHash);
  }
  elements.profileMenu?.classList.add("hidden");
  renderFeatureDetail();
  renderNavigationState();
  resetPageScroll();
}

function bindEvents() {
  elements.heroTrackingForm.addEventListener("submit", handleTrackingSubmit);
  elements.loginForm.addEventListener("submit", login);
  elements.registerForm.addEventListener("submit", register);
  elements.resetForm.addEventListener("submit", confirmPasswordReset);
  elements.requestResetButton.addEventListener("click", requestPasswordReset);
  elements.profileSettingsForm.addEventListener("submit", saveProfileSettings);
  elements.passwordSettingsForm.addEventListener("submit", changeAccountPassword);
  elements.preferenceForm.addEventListener("submit", saveNotificationPreferences);
  elements.customerChatForm.addEventListener("submit", sendCustomerMessage);
  elements.adminChatForm.addEventListener("submit", sendAdminReply);
  elements.shipmentForm.addEventListener("submit", createShipment);
  elements.updateForm.addEventListener("submit", updateShipment);
  elements.advancePackage.addEventListener("click", advancePackage);
  elements.notifyPackage.addEventListener("click", notifyPackage);
  elements.createBackupButton.addEventListener("click", createDataBackup);
  elements.exportDataButton.addEventListener("click", exportDataJson);
  elements.backButton.addEventListener("click", goBack);
  elements.fleetFilter.addEventListener("input", renderFleet);
  elements.adminShipmentSelect.addEventListener("change", () => {
    const shipment = state.shipments.find((item) => item.trackingId === elements.adminShipmentSelect.value);
    if (shipment) {
      state.selectedShipment = shipment;
      syncUpdateForm();
      renderDetails();
      renderMap();
      renderTimeline();
      renderFleet();
    }
  });
  elements.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    navigateToHash(link.getAttribute("href"));
  });
  document.addEventListener("click", (event) => {
    if (!elements.profileMenu || elements.profileMenu.classList.contains("hidden")) return;
    if (elements.profileMenu.contains(event.target) || elements.authSummary.contains(event.target)) return;
    elements.profileMenu.classList.add("hidden");
    document.querySelector("#profileButton")?.setAttribute("aria-expanded", "false");
  });
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });
  document.querySelectorAll("[data-demo]").forEach((button) => {
    button.addEventListener("click", () => useDemoLogin(button.dataset.demo));
  });
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("popstate", handleHashChange);
}

async function boot() {
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark");
  }
  bindEvents();
  await refreshAll();
  resetPageScroll();
}

boot().catch((error) => {
  toast(error.message || "Unable to start ShipOverseas.");
});
