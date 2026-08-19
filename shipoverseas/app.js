import { countryCodes, countryLanguage, languageLabelFallback } from "./country-language.js?v=20260819-country-selector";
import { firebaseClient } from "./firebase-client.js?v=20260819-country-selector";

const ADMIN_EMAIL = "Hardewusi@gmail.com";
const TOKEN_KEY = "shipoverseas.token";
const THEME_KEY = "shipoverseas.theme";
const COUNTRY_KEY = "shipoverseas.country";
const DEFAULT_COUNTRY = "US";
const DEFAULT_LANGUAGE = "en";
const countryNameFormatter = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const languageNameFormatter = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "language" }) : null;
let googleTranslateReady = false;
let translationRefreshTimer = 0;

const portGeo = {
  Shanghai: { lat: 31.2304, lon: 121.4737 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  Rotterdam: { lat: 51.9244, lon: 4.4777 },
  "Los Angeles": { lat: 33.7405, lon: -118.2775 },
  Miami: { lat: 25.7781, lon: -80.1794 },
  Houston: { lat: 29.7604, lon: -95.3698 },
  Jacksonville: { lat: 30.3322, lon: -81.6557 },
  Baltimore: { lat: 39.2904, lon: -76.6122 },
  Hamburg: { lat: 53.5511, lon: 9.9937 },
  Bremerhaven: { lat: 53.5396, lon: 8.5809 },
  "New York": { lat: 40.7128, lon: -74.006 },
  Savannah: { lat: 32.0809, lon: -81.0912 },
  Busan: { lat: 35.1796, lon: 129.0756 },
  Valencia: { lat: 39.4699, lon: -0.3763 },
  "Port Klang": { lat: 3.0319, lon: 101.3928 }
};

const featurePages = {
  "container-tracking": {
    eyebrow: "Container Shipping",
    title: "Container Shipping Visibility",
    summary: "Track cargo milestones from booking through delivery using a tracking number, bill of lading, or container ID.",
    highlights: ["Loaded, departed, arrived, discharged, gate-in and gate-out milestones", "Container, vessel, route, ETA, and location fields", "Customer-facing status pages without exposing private operations tools"],
    workflow: ["Receive tracking or bill of lading", "Match shipment record", "Render route, milestone, risk, and ETA data", "Notify customer when the status changes"]
  },
  "eta-etd-alerts": {
    eyebrow: "Shipment Updates",
    title: "ETA and Status Updates",
    summary: "Keep customers and operations teams ahead of sailing changes, port delays, and arrival updates.",
    highlights: ["ETA/ETD change detection", "Delay severity notes", "Email and portal notifications", "Live map context for revised route progress"],
    workflow: ["Compare latest schedule against planned shipment", "Flag delay or early movement", "Update shipment timeline", "Send a customer notification"]
  },
  "detention-demurrage": {
    eyebrow: "Exception Monitoring",
    title: "Delay and Release Risk Monitoring",
    summary: "Surface fee risks when containers remain too long at terminal, destination yard, or outside free-day windows.",
    highlights: ["Detention watch notes", "Demurrage risk labels", "Destination terminal status", "Priority reminders before fees grow"],
    workflow: ["Track arrival and release milestones", "Compare dwell time to free days", "Mark risk level", "Notify customer and operations"]
  },
  "rolled-container": {
    eyebrow: "Route Changes",
    title: "Route and Sailing Changes",
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
    eyebrow: "Customer Support",
    title: "Customer Support and Notifications",
    summary: "Record customer messages and shipment notification history in one account-based workspace.",
    highlights: ["Customer support chat", "Shipment notification history", "Password reset emails", "Provider-ready path for SMTP, Resend, or SendGrid"],
    workflow: ["Create status event", "Record customer message", "Store notification history", "Reply through support desk"]
  }
};

const toolPages = {
  "logistics-explorer": {
    eyebrow: "Planning Tool",
    title: "Logistics Explorer",
    summary: "A planning workspace for comparing ocean routes, carrier options, port touchpoints, and shipment notes before a package is created.",
    highlights: ["Route comparison", "Carrier and port planning", "Customer-facing shipment notes"],
    workflow: ["Choose origin and destination", "Review route and timing options", "Attach notes to the customer shipment plan"]
  },
  "container-tracking": {
    eyebrow: "Visibility Tool",
    title: "Container Tracking",
    summary: "Search tracking IDs, bill of lading references, and container records linked to a customer account.",
    highlights: ["Tracking ID lookup", "Bill of lading lookup", "Container milestone timeline"],
    workflow: ["Enter the reference", "Match the shipment record", "Show status, ETA, route, and support history"]
  },
  "air-tracking": {
    eyebrow: "Multimodal Tool",
    title: "Air Tracking",
    summary: "A ready page for future air cargo references when a customer shipment includes air freight movement.",
    highlights: ["Air waybill-ready layout", "Airport origin and destination fields", "Future multimodal support"],
    workflow: ["Capture air shipment reference", "Attach route notes", "Keep customer updates in the portal"]
  },
  "ship-schedules": {
    eyebrow: "Schedule Tool",
    title: "Ship Schedules",
    summary: "Plan vessel departures, arrival windows, and schedule changes for ocean freight shipments.",
    highlights: ["ETA and ETD planning", "Sailing window notes", "Delay watch labels"],
    workflow: ["Select route", "Review sailing window", "Create or update customer shipment"]
  },
  "logistics-map": {
    eyebrow: "Map Tool",
    title: "Logistics Map",
    summary: "A route map workspace for showing shipment movement, current location, and port-to-port context.",
    highlights: ["Live route frame", "Origin and destination markers", "Progress overlay"],
    workflow: ["Load shipment", "Render route", "Update current location and risk note"]
  },
  "distance-time": {
    eyebrow: "Estimator",
    title: "Distance and Time",
    summary: "Estimate transit windows and milestone timing for common sea freight lanes.",
    highlights: ["Transit window planning", "Milestone sequencing", "Customer ETA context"],
    workflow: ["Choose route", "Estimate transit days", "Use timing in shipment updates"]
  },
  "load-calculator": {
    eyebrow: "Cargo Tool",
    title: "Load Calculator",
    summary: "Plan shipment volume, weight, container loading notes, and capacity requirements.",
    highlights: ["Package dimensions", "Weight and volume notes", "Container load planning"],
    workflow: ["Enter cargo details", "Review capacity notes", "Send package details to operations"]
  },
  "freight-index": {
    eyebrow: "Market Tool",
    title: "Freight Index",
    summary: "Track internal freight lane pressure, cost notes, and market movement for planning conversations.",
    highlights: ["Lane pressure notes", "Market condition labels", "Operations-ready cost context"],
    workflow: ["Review lane", "Record market note", "Use notes for customer communication"]
  },
  "route-planner": {
    eyebrow: "Route Tool",
    title: "Route Planner",
    summary: "Build an origin-to-destination movement plan before operations creates the shipment record.",
    highlights: ["Origin and destination planning", "Port transfer notes", "Shipment handoff checklist"],
    workflow: ["Create route plan", "Confirm cargo details", "Open Ops to create the package"]
  },
  "co2-calculator": {
    eyebrow: "Sustainability Tool",
    title: "CO2 Calculator",
    summary: "Estimate emissions context for sea, air, and inland freight movement.",
    highlights: ["Mode comparison", "Emission estimate notes", "Customer sustainability context"],
    workflow: ["Select transport mode", "Estimate shipment impact", "Attach note to customer update"]
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
  dataWarning: "",
  selectedSupportConversationId: "",
  activePage: "",
  selectedShipment: null,
  country: "",
  language: DEFAULT_LANGUAGE,
  usingFirebase: false
};

const elements = {
  backButton: document.querySelector("#backButton"),
  themeToggle: document.querySelector("#themeToggle"),
  countrySelect: document.querySelector("#countrySelect"),
  countryLanguageLabel: document.querySelector("#countryLanguageLabel"),
  portalGrid: document.querySelector("#portal"),
  authPanel: document.querySelector(".auth-panel"),
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
  profileResetPasswordButton: document.querySelector("#profileResetPasswordButton"),
  profileSecurityMessage: document.querySelector("#profileSecurityMessage"),
  preferenceForm: document.querySelector("#preferenceForm"),
  profileAccessLevel: document.querySelector("#profileAccessLevel"),
  profileDetailEmail: document.querySelector("#profileDetailEmail"),
  profileCreatedAt: document.querySelector("#profileCreatedAt"),
  profileScope: document.querySelector("#profileScope"),
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
  liveMapFrame: document.querySelector("#liveMapFrame"),
  liveShipMarker: document.querySelector("#liveShipMarker"),
  liveMapStatus: document.querySelector("#liveMapStatus"),
  lastUpdated: document.querySelector("#lastUpdated"),
  timeline: document.querySelector("#timeline"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  resetForm: document.querySelector("#resetForm"),
  requestResetButton: document.querySelector("#requestResetButton"),
  fillAdminEmailButton: document.querySelector("#fillAdminEmailButton"),
  resetAdminPasswordButton: document.querySelector("#resetAdminPasswordButton"),
  authMessage: document.querySelector("#authMessage"),
  resetMessage: document.querySelector("#resetMessage"),
  localResetOnly: document.querySelectorAll("[data-local-reset-only]"),
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
  toolDetail: document.querySelector("#toolDetail"),
  fleetFilter: document.querySelector("#fleetFilter"),
  fleetRows: document.querySelector("#fleetRows"),
  toast: document.querySelector("#toast")
};

function useFirebase() {
  return state.usingFirebase && firebaseClient.isEnabled();
}

function canUseLocalApi() {
  return ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
}

function requireAvailableBackend() {
  if (useFirebase() || canUseLocalApi()) return;
  throw new Error("Firebase is not connected on this live domain. Add shipoversea.site and www.shipoversea.site in Firebase Authentication authorized domains, then refresh.");
}

function configureFirebaseUi() {
  const firebaseMode = useFirebase();
  elements.localResetOnly.forEach((item) => item.classList.toggle("hidden", firebaseMode));
  elements.requestResetButton.textContent = firebaseMode ? "Send Reset Email" : "Send Reset Code";
  if (elements.resetForm?.elements?.code) {
    elements.resetForm.elements.code.required = !firebaseMode;
  }
  if (elements.resetForm?.elements?.password) {
    elements.resetForm.elements.password.required = !firebaseMode;
  }
}

function normalizeCountryCode(countryCode) {
  const normalized = String(countryCode || "").trim().toUpperCase();
  return countryCodes.includes(normalized) ? normalized : DEFAULT_COUNTRY;
}

function detectCountryCode() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
  const match = locale.match(/[-_]([A-Z]{2})\b/i);
  return normalizeCountryCode(match?.[1] || DEFAULT_COUNTRY);
}

function languageForCountry(countryCode) {
  return countryLanguage[normalizeCountryCode(countryCode)] || DEFAULT_LANGUAGE;
}

function countryName(countryCode) {
  try {
    return countryNameFormatter?.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

function languageName(languageCode) {
  const fallback = languageLabelFallback[languageCode];
  if (fallback) return fallback;
  const displayCode = { iw: "he", jw: "jv", "zh-CN": "zh-Hans", "zh-TW": "zh-Hant" }[languageCode] || languageCode;
  try {
    return languageNameFormatter?.of(displayCode) || languageCode;
  } catch {
    return languageCode;
  }
}

function writeTranslateCookie(languageCode) {
  const value = `/en/${languageCode || DEFAULT_LANGUAGE}`;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `googtrans=${value};path=/;max-age=${maxAge};SameSite=Lax`;
  const baseDomain = window.location.hostname.replace(/^www\./, "");
  if (baseDomain.includes(".")) {
    document.cookie = `googtrans=${value};domain=.${baseDomain};path=/;max-age=${maxAge};SameSite=Lax`;
  }
}

function applyGoogleTranslation(languageCode = state.language, retryCount = 0) {
  if (!languageCode) return;
  document.documentElement.lang = languageCode === "iw" ? "he" : languageCode;
  writeTranslateCookie(languageCode);
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) {
    if (retryCount < 24) {
      window.setTimeout(() => applyGoogleTranslation(languageCode, retryCount + 1), 350);
    }
    return;
  }
  const nextValue = languageCode === DEFAULT_LANGUAGE ? "" : languageCode;
  if (combo.value !== nextValue) {
    combo.value = nextValue;
  }
  combo.dispatchEvent(new Event("change", { bubbles: true }));
}

function scheduleTranslationRefresh() {
  if (!googleTranslateReady || !state.language || state.language === DEFAULT_LANGUAGE) return;
  window.clearTimeout(translationRefreshTimer);
  translationRefreshTimer = window.setTimeout(() => applyGoogleTranslation(state.language), 400);
}

function setCountry(countryCode, { persist = false, translate = false } = {}) {
  const nextCountry = normalizeCountryCode(countryCode);
  const nextLanguage = languageForCountry(nextCountry);
  state.country = nextCountry;
  state.language = nextLanguage;
  document.documentElement.dataset.country = nextCountry;
  document.documentElement.lang = nextLanguage === "iw" ? "he" : nextLanguage;
  if (elements.countrySelect && elements.countrySelect.value !== nextCountry) {
    elements.countrySelect.value = nextCountry;
  }
  if (elements.countryLanguageLabel) {
    elements.countryLanguageLabel.textContent = languageName(nextLanguage);
  }
  if (persist) {
    localStorage.setItem(COUNTRY_KEY, nextCountry);
  }
  if (translate) {
    applyGoogleTranslation(nextLanguage);
  }
}

function populateCountrySelector() {
  if (!elements.countrySelect) return;
  const countries = countryCodes
    .map((code) => ({
      code,
      name: countryName(code),
      language: languageForCountry(code)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  elements.countrySelect.innerHTML = countries
    .map((item) => `<option value="${item.code}">${item.name} - ${languageName(item.language)}</option>`)
    .join("");
}

function loadGoogleTranslate() {
  if (window.google?.translate?.TranslateElement) {
    googleTranslateReady = true;
    applyGoogleTranslation(state.language);
    return;
  }
  if (window.shipoverseasTranslateLoading) return;
  window.shipoverseasTranslateLoading = true;
  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement(
      {
        pageLanguage: DEFAULT_LANGUAGE,
        autoDisplay: false
      },
      "googleTranslateElement"
    );
    googleTranslateReady = true;
    applyGoogleTranslation(state.language);
  };
  const script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  script.onerror = () => {
    window.shipoverseasTranslateLoading = false;
    toast("Translation service is not available right now.");
  };
  document.head.append(script);
}

function initCountrySelector() {
  populateCountrySelector();
  setCountry(localStorage.getItem(COUNTRY_KEY) || detectCountryCode());
  loadGoogleTranslate();
}

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

function setAuthMessage(message) {
  if (elements.authMessage) {
    elements.authMessage.textContent = message || "";
  }
}

function setFormBusy(form, busy, busyLabel = "Working...") {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  if (!button.dataset.readyLabel) {
    button.dataset.readyLabel = button.textContent.trim();
  }
  Array.from(form.elements || []).forEach((control) => {
    control.disabled = busy;
  });
  button.classList.toggle("is-loading", busy);
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? busyLabel : button.dataset.readyLabel;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function shipmentProgress(shipment) {
  const explicit = numberOrNull(shipment?.progress);
  return explicit === null ? getProgress(shipment?.status) : clamp(explicit, 0, 100);
}

function formatNumber(value, suffix = "") {
  const number = numberOrNull(value);
  if (number === null) return "-";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number)}${suffix}`;
}

function formatDimensions(shipment) {
  const length = numberOrNull(shipment?.cargoLengthIn);
  const width = numberOrNull(shipment?.cargoWidthIn);
  const height = numberOrNull(shipment?.cargoHeightIn);
  if (length === null && width === null && height === null) return "-";
  return `L: ${formatNumber(length, '"')} W: ${formatNumber(width, '"')} H: ${formatNumber(height, '"')}`;
}

function formatCoordinates(shipment) {
  const lat = numberOrNull(shipment?.currentLatitude);
  const lon = numberOrNull(shipment?.currentLongitude);
  if (lat === null || lon === null) return "-";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function currentLocationName(shipment) {
  return shipment?.currentLocationName || shipment?.locationName || shipment?.origin || shipment?.status || "Location updating";
}

function knownGeoForLocation(locationName) {
  const text = String(locationName || "").trim().toLowerCase();
  if (!text) return null;
  const entries = Object.entries(portGeo);
  const exact = entries.find(([name]) => name.toLowerCase() === text);
  if (exact) return exact[1];
  const partial = entries.find(([name]) => text.includes(name.toLowerCase()) || name.toLowerCase().includes(text));
  return partial?.[1] || null;
}

function currentGeoForShipment(shipment) {
  const lat = numberOrNull(shipment?.currentLatitude);
  const lon = numberOrNull(shipment?.currentLongitude);
  if (lat !== null && lon !== null) {
    return { lat, lon, source: "coordinates" };
  }
  const known = knownGeoForLocation(currentLocationName(shipment));
  return known ? { ...known, source: "known-location" } : null;
}

function multilineHtml(value) {
  return escapeHtml(value || "").replace(/\n/g, "<br>");
}

function makeMapEmbedUrl(shipment) {
  const current = currentGeoForShipment(shipment);
  if (!current) return "";
  const zoomRange = current.source === "coordinates" ? 0.045 : 0.12;
  const minLon = clamp(current.lon - zoomRange, -179, 179);
  const maxLon = clamp(current.lon + zoomRange, -179, 179);
  const minLat = clamp(current.lat - zoomRange, -80, 84);
  const maxLat = clamp(current.lat + zoomRange, -80, 84);
  const bbox = [minLon, minLat, maxLon, maxLat].map((value) => value.toFixed(4)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
}

async function loadBootstrap() {
  if (useFirebase()) {
    try {
      const data = await firebaseClient.getBootstrap();
      state.statusSteps = data.statusSteps || [];
      state.shipments = data.shipments || [];
      state.dataWarning = data.dataWarning || "";
      if (!state.selectedShipment) {
        state.selectedShipment = state.shipments[0] || null;
      }
      return;
    } catch (error) {
      console.warn("Firebase bootstrap failed, using local API fallback.", error);
    }
  }
  const data = await apiFetch("/api/bootstrap");
  state.statusSteps = data.statusSteps || [];
  state.shipments = data.shipments || [];
  if (!state.selectedShipment) {
    state.selectedShipment = state.shipments[0] || null;
  }
}

async function loadMe() {
  if (useFirebase()) {
    try {
      state.user = await firebaseClient.getCurrentUser();
      state.token = state.user ? "firebase" : "";
      return;
    } catch (error) {
      console.warn("Firebase profile load failed.", error);
      state.user = null;
      state.token = "";
      return;
    }
  }
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
    state.dataWarning = "";
    state.selectedSupportConversationId = "";
    return;
  }
  if (useFirebase()) {
    const data = await firebaseClient.loadPrivateData();
    state.myShipments = data.myShipments;
    state.emails = data.emails;
    state.supportConversations = data.supportConversations;
    state.auditLogs = data.auditLogs;
    state.dataWarning = data.dataWarning || "";
    if (isAdmin()) {
      state.shipments = data.shipments;
    }
    if (!state.selectedSupportConversationId && state.supportConversations.length) {
      state.selectedSupportConversationId = state.supportConversations[0].id;
    }
    if (state.selectedSupportConversationId && state.supportConversations.some((item) => item.id === state.selectedSupportConversationId)) {
      await loadSupportThread(state.selectedSupportConversationId);
    } else {
      state.supportMessages = [];
    }
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
  state.dataWarning = "";
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
  if (useFirebase()) {
    const data = await firebaseClient.loadSupportThread(conversationId);
    state.selectedSupportConversationId = data.conversation.id;
    state.supportMessages = data.messages;
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
  if (!elements.metricActive || !elements.metricDelayed || !elements.metricCustomers || !elements.metricEmails) return;
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
  if (!shipment) {
    elements.detailTrackingId.textContent = "No shipment selected";
    elements.detailStatus.textContent = "-";
    elements.detailRoute.textContent = "Enter a tracking number or log in to view assigned shipments.";
    elements.detailEta.textContent = "-";
    elements.detailProgressText.textContent = "0%";
    elements.detailProgressBar.style.width = "0%";
    elements.detailList.innerHTML = `<div><dt>Status</dt><dd>No shipment loaded</dd></div>`;
    return;
  }
  const progress = shipmentProgress(shipment);
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
    ["Current Location", currentLocationName(shipment), "detail-current"],
    ["Coordinates", formatCoordinates(shipment)],
    ["Location Updated", formatDateTime(shipment.currentLocationUpdatedAt || shipment.lastUpdated)],
    ["Bill of Lading", shipment.billOfLading],
    ["Container", shipment.container],
    ["Receiver", shipment.receiverName],
    ["Vessel", shipment.vessel],
    ["Cargo", shipment.cargo],
    ["Cargo Type", shipment.cargoType],
    ["Condition", shipment.cargoCondition],
    ["Quantity", shipment.cargoQuantity],
    ["Dimensions", formatDimensions(shipment)],
    ["Volume", formatNumber(shipment.cargoVolumeCuFt, " cu. ft.")],
    ["Weight", formatNumber(shipment.cargoWeightLbs, " lbs")],
    ["Reference / VIN", shipment.cargoReference],
    ["Manager", shipment.manager || "Ops desk"]
  ];
  if (state.user && (isAdmin() || shipment.receiverEmail === state.user.email?.toLowerCase())) {
    rows.splice(6, 0, ["Receiver Email", shipment.receiverEmail]);
  }
  if (shipment.cargoManifest) {
    rows.push(["Cargo Manifest", shipment.cargoManifest, "detail-wide detail-manifest"]);
  }
  if (shipment.cargoNotes) {
    rows.push(["Cargo Notes", shipment.cargoNotes, "detail-wide detail-manifest"]);
  }
  elements.detailList.innerHTML = rows
    .map(([label, value, className]) => `<div class="${escapeHtml(className || "")}"><dt>${escapeHtml(label)}</dt><dd>${className?.includes("detail-manifest") ? multilineHtml(value || "-") : escapeHtml(value || "-")}</dd></div>`)
    .join("");
}

function renderMap() {
  const shipment = state.selectedShipment;
  if (!shipment) {
    elements.mapRouteTitle.textContent = "Current package location";
    elements.riskChip.textContent = "Waiting";
    elements.riskChip.className = "risk-chip";
    elements.liveMapFrame.removeAttribute("src");
    elements.liveShipMarker?.classList.add("hidden");
    elements.liveMapStatus.textContent = "Log in or search a tracking number to view the live location pin";
    return;
  }
  const mapUrl = makeMapEmbedUrl(shipment);
  if (mapUrl && elements.liveMapFrame.src !== mapUrl) {
    elements.liveMapFrame.src = mapUrl;
    elements.liveShipMarker?.classList.remove("hidden");
  } else if (!mapUrl) {
    elements.liveMapFrame.removeAttribute("src");
    elements.liveShipMarker?.classList.add("hidden");
  }
  const coordinates = formatCoordinates(shipment);
  const updatedAt = formatDateTime(shipment.currentLocationUpdatedAt || shipment.lastUpdated);
  elements.mapRouteTitle.textContent = currentLocationName(shipment);
  elements.liveMapStatus.textContent =
    coordinates === "-"
      ? `Current location: ${currentLocationName(shipment)}. Add latitude and longitude in Ops for an exact map pin. Updated ${updatedAt}`
      : `Pinned at ${coordinates}. Updated ${updatedAt}`;
}

function renderTimeline() {
  const shipment = state.selectedShipment;
  if (!shipment) {
    elements.lastUpdated.textContent = "-";
    elements.timeline.innerHTML = `<li class="current"><strong>No shipment selected</strong><span>Search or log in to load details</span></li>`;
    return;
  }
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
      const progress = shipmentProgress(shipment);
      const active = shipment.trackingId === state.selectedShipment?.trackingId ? "active" : "";
      return `
        <tr class="${active}" data-tracking="${escapeHtml(shipment.trackingId)}">
          <td data-label="Tracking"><strong>${escapeHtml(shipment.trackingId)}</strong><br><small>${escapeHtml(shipment.billOfLading)}</small></td>
          <td data-label="Receiver">${escapeHtml(shipment.receiverName || "Customer shipment")}${isAdmin() && shipment.receiverEmail ? `<br><small>${escapeHtml(shipment.receiverEmail)}</small>` : ""}</td>
          <td data-label="Route">${escapeHtml(shipment.origin)} to ${escapeHtml(shipment.destination)}<br><small>${escapeHtml(currentLocationName(shipment))}</small></td>
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
  elements.authPanel?.classList.toggle("hidden", loggedIn);
  elements.portalGrid?.classList.toggle("signed-in", loggedIn);
  elements.portalEmpty.classList.toggle("hidden", loggedIn);
  elements.customerContent.classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;

  const shipments = isAdmin() ? state.shipments : state.myShipments;
  elements.customerShipments.innerHTML =
    state.dataWarning
      ? `<div class="empty-state warning-state">${escapeHtml(state.dataWarning)}</div>`
      : shipments.length === 0
      ? `<div class="empty-state">No shipments are assigned to ${escapeHtml(state.user.email)} yet.</div>`
      : shipments
          .map(
            (shipment) => `
              <div class="customer-card" data-tracking="${escapeHtml(shipment.trackingId)}">
                <strong>${escapeHtml(shipment.trackingId)}</strong>
                <span>${escapeHtml(shipment.cargo || "Cargo shipment")}</span>
                <p>${escapeHtml(shipment.origin)} to ${escapeHtml(shipment.destination)}</p>
                <p>${escapeHtml(shipment.status)} - ${escapeHtml(currentLocationName(shipment))}</p>
                <p>ETA ${formatDate(shipment.eta)} - ${formatNumber(shipment.cargoWeightLbs, " lbs")}</p>
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
  if (state.dataWarning) {
    elements.adminLock.textContent = "Signed in - Firestore data offline";
    elements.adminLock.className = "admin-lock";
  }

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
  elements.profileEmailStatus.textContent = state.emails.length ? `${state.emails.length} records` : "Ready";
  elements.profileLatestShipment.textContent = latestShipment ? latestShipment.trackingId : "No shipments yet";
  elements.profileLatestEta.textContent = latestShipment ? formatDate(latestShipment.eta) : "-";
  elements.profileSupportCount.textContent = state.supportConversations.length;
  elements.profileNameInput.value = state.user.name || "";
  if (elements.profileSecurityMessage && !elements.profileSecurityMessage.textContent) {
    elements.profileSecurityMessage.textContent = "";
  }
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

function renderToolDetail() {
  const toolId = window.location.hash.replace("#tool-", "");
  const page = toolPages[toolId];
  elements.toolDetail.classList.toggle("hidden", !page);
  if (!page) return;

  const opensTracking = toolId === "container-tracking" || toolId === "logistics-map";
  elements.toolDetail.innerHTML = `
    <div class="feature-hero tool-hero">
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
        <h3>Workflow</h3>
        <ol>${page.workflow.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article>
        <h3>Connected Workspace</h3>
        <p>This tool connects into ShipOversea tracking, customer records, support chat, and admin package updates.</p>
        <div class="button-row">
          <a class="primary-link" href="${opensTracking ? "#tracking" : "#portal"}">${opensTracking ? "Open Tracking" : "Open Portal"}</a>
          <a class="secondary-link" href="#tools">All Tools</a>
        </div>
      </article>
    </div>
  `;
}

function getActivePage() {
  const hash = window.location.hash || "#home";
  if (hash.startsWith("#feature-")) return "feature";
  if (hash.startsWith("#tool-")) return "tool";
  if (hash.startsWith("#tracking-") || hash === "#tracking") return "tracking";
  if (hash === "#features") return "features";
  if (hash === "#tools") return "tools";
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

  const isDetailPage = activePage === "feature" || activePage === "tool";
  document.body.classList.toggle("feature-mode", isDetailPage);
  elements.pageSections.forEach((section) => {
    section.classList.toggle("route-hidden", isDetailPage || section.dataset.page !== activePage);
  });
  const navPage = activePage === "feature" ? "features" : activePage === "tool" ? "tools" : activePage;
  elements.navLinks.forEach((link) => {
    const linkPage = getPageFromLink(link.getAttribute("href"));
    link.classList.toggle("active", linkPage === navPage);
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
  if (href === "#tools") return "tools";
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
  elements.updateForm.elements.receiverName.value = shipment.receiverName || "";
  elements.updateForm.elements.receiverEmail.value = shipment.receiverEmail || "";
  elements.updateForm.elements.eta.value = shipment.eta || "";
  elements.updateForm.elements.currentLocationName.value = currentLocationName(shipment);
  elements.updateForm.elements.currentLatitude.value = shipment.currentLatitude || "";
  elements.updateForm.elements.currentLongitude.value = shipment.currentLongitude || "";
  elements.updateForm.elements.progress.value = shipmentProgress(shipment);
  elements.updateForm.elements.risk.value = shipment.risk || "";
}

function syncSelectedShipment() {
  if (state.selectedShipment) {
    const fresh =
      state.shipments.find((shipment) => shipment.trackingId === state.selectedShipment.trackingId) ||
      state.myShipments.find((shipment) => shipment.trackingId === state.selectedShipment.trackingId);
    if (fresh) {
      state.selectedShipment = fresh;
      return;
    }
  }
  state.selectedShipment = visibleShipments()[0] || state.shipments[0] || null;
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
  renderToolDetail();
  renderNavigationState();
  scheduleTranslationRefresh();
}

function selectShipment(shipment) {
  state.selectedShipment = shipment;
  elements.trackingMessage.textContent = "";
  navigateToHash("#tracking");
  renderAll();
}

async function refreshAll() {
  await loadMe();
  await loadBootstrap();
  await loadPrivateData();
  syncSelectedShipment();
  renderAll();
}

async function handleTrackingSubmit(event) {
  event.preventDefault();
  const trackingId = elements.heroTrackingInput.value.trim().toUpperCase();
  if (!trackingId) return;
  try {
    requireAvailableBackend();
    if (useFirebase() && !state.user) {
      throw new Error("Log in or create a customer account to track live shipments.");
    }
    if (useFirebase()) {
      const shipment = await firebaseClient.findShipment(trackingId);
      state.selectedShipment = shipment;
      const existing = state.shipments.find((item) => item.trackingId === shipment.trackingId);
      if (!existing) state.shipments.unshift(shipment);
      elements.trackingMessage.textContent = "";
      navigateToHash("#tracking");
      renderAll();
      toast(`Opened tracking for ${shipment.trackingId}`);
      return;
    }
    const data = await apiFetch(`/api/track/${encodeURIComponent(trackingId)}`);
    state.selectedShipment = data.shipment;
    const existing = state.shipments.find((shipment) => shipment.trackingId === data.shipment.trackingId);
    if (!existing) state.shipments.unshift(data.shipment);
    elements.trackingMessage.textContent = "";
    navigateToHash("#tracking");
    renderAll();
    toast(`Opened tracking for ${data.shipment.trackingId}`);
  } catch (error) {
    elements.trackingMessage.textContent = error.message;
  }
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  setAuthMessage(useFirebase() ? "Checking your Firebase account..." : "Checking your account...");
  setFormBusy(form, true, "Signing in...");
  try {
    requireAvailableBackend();
    if (useFirebase()) {
      state.user = await firebaseClient.login(email, data.get("password"));
      state.token = "firebase";
      localStorage.removeItem(TOKEN_KEY);
      renderAll();
      setFormBusy(form, false);
      setAuthMessage("Signed in. Loading your shipments, support messages, and email updates...");
      toast(`Signed in as ${state.user.email}`);
      try {
        await Promise.all([loadBootstrap(), loadPrivateData()]);
        syncSelectedShipment();
      } catch (dataError) {
        state.dataWarning = dataError.message;
      }
      renderAll();
      const loginWarning = state.user.profileWarning || state.dataWarning;
      setAuthMessage(loginWarning ? `Logged in as ${state.user.email}. ${loginWarning}` : "Your account is ready.");
      toast(loginWarning ? "Logged in. Account data needs attention." : "Account ready.");
      return;
    }
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
    syncSelectedShipment();
    renderAll();
    setAuthMessage("Your account is ready.");
    toast(`Logged in as ${state.user.email}`);
  } catch (error) {
    setAuthMessage(error.message);
    if (useFirebase() && /password|credential|authorized|sign-in/i.test(error.message)) {
      elements.resetForm.elements.email.value = email;
      elements.resetMessage.textContent = "Use Reset Password to send a Firebase reset email, then log in with the new password.";
      switchAuthTab("reset");
    }
    toast(error.message);
  } finally {
    setFormBusy(form, false);
  }
}

async function register(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  setAuthMessage("Creating your secure portal account...");
  setFormBusy(form, true, "Creating...");
  try {
    requireAvailableBackend();
    if (useFirebase()) {
      state.user = await firebaseClient.register({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password")
      });
      state.token = "firebase";
      localStorage.removeItem(TOKEN_KEY);
      renderAll();
      setFormBusy(form, false);
      setAuthMessage("Account created. Loading your customer portal...");
      try {
        await Promise.all([loadBootstrap(), loadPrivateData()]);
        syncSelectedShipment();
      } catch (dataError) {
        state.dataWarning = dataError.message;
      }
      renderAll();
      const registerWarning = state.user.profileWarning || state.dataWarning;
      setAuthMessage(registerWarning ? `Account created. ${registerWarning}` : "Account created. Your portal is ready.");
      toast(registerWarning ? "Account created. Firestore data needs attention." : "Firebase account created.");
      return;
    }
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
    syncSelectedShipment();
    renderAll();
    setAuthMessage("Account created. Your portal is ready.");
    toast("Account created.");
  } catch (error) {
    setAuthMessage(error.message);
    toast(error.message);
  } finally {
    setFormBusy(form, false);
  }
}

async function requestPasswordReset() {
  const email = elements.resetForm.elements.email.value.trim();
  setAuthMessage("");
  elements.resetMessage.textContent = "";
  if (!email) {
    toast("Enter your account email first.");
    return;
  }
  try {
    requireAvailableBackend();
    if (useFirebase()) {
      const response = await firebaseClient.requestPasswordReset(email);
      elements.resetMessage.textContent = response.message;
      setAuthMessage("Password reset email sent. Check inbox and spam, then return here to log in.");
      toast("Reset email sent.");
      return;
    }
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
    elements.resetMessage.textContent = error.message;
    toast(error.message);
  }
}

async function sendProfilePasswordReset(event) {
  const button = event.currentTarget;
  const email = state.user?.email || "";
  if (!email) {
    toast("Log in first to reset your password from profile settings.");
    return;
  }
  if (elements.profileSecurityMessage) {
    elements.profileSecurityMessage.textContent = "";
  }
  button.disabled = true;
  button.textContent = "Sending reset...";
  try {
    requireAvailableBackend();
    if (useFirebase()) {
      const response = await firebaseClient.requestPasswordReset(email);
      elements.profileSecurityMessage.textContent = response.message;
      toast("Password reset email sent.");
      return;
    }
    const response = await apiFetch("/api/password-reset/request", {
      method: "POST",
      body: { email }
    });
    elements.profileSecurityMessage.textContent = response.localCode
      ? `Local reset code: ${response.localCode}`
      : response.message;
    toast("Password reset instructions sent.");
  } catch (error) {
    elements.profileSecurityMessage.textContent = error.message;
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Send Password Reset Email";
  }
}

async function confirmPasswordReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  setFormBusy(form, true, useFirebase() ? "Sending..." : "Updating...");
  if (useFirebase()) {
    try {
      await requestPasswordReset();
    } finally {
      setFormBusy(form, false);
    }
    return;
  }
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
  } finally {
    setFormBusy(form, false);
  }
}

async function saveProfileSettings(event) {
  event.preventDefault();
  const name = elements.profileNameInput.value.trim();
  try {
    if (useFirebase()) {
      state.user = await firebaseClient.updateProfileDetails({ name });
      await loadPrivateData();
      renderAll();
      toast("Firebase account details saved.");
      return;
    }
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
    if (useFirebase()) {
      state.user = await firebaseClient.updatePreferences(preferences);
      await loadPrivateData();
      renderAll();
      toast("Firebase notification preferences saved.");
      return;
    }
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
    if (useFirebase()) {
      await firebaseClient.changePassword({ currentPassword, newPassword });
      form.reset();
      await loadPrivateData();
      renderAll();
      toast("Firebase password changed.");
      return;
    }
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
    if (useFirebase()) {
      const response = await firebaseClient.createBackup();
      elements.backupStatus.textContent = `Firestore backup point recorded: ${response.fileName}`;
      await loadPrivateData();
      renderAll();
      toast("Firebase backup record created.");
      return;
    }
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
    const exportPayload = useFirebase() ? await firebaseClient.exportData() : (await apiFetch("/api/admin/export")).export;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
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
    toast(useFirebase() ? "Firebase export prepared." : "Export prepared.");
  } catch (error) {
    toast(error.message);
  }
}

async function logout() {
  if (useFirebase()) {
    try {
      await firebaseClient.logout();
    } catch {
    }
  } else {
    try {
      await apiFetch("/api/logout", { method: "POST" });
    } catch {
    }
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
    if (useFirebase()) {
      const response = await firebaseClient.createShipment(formObject(form));
      form.reset();
      state.selectedShipment = response.shipment;
      await refreshAll();
      toast(`Created ${response.shipment.trackingId} in Firebase.`);
      return;
    }
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
    receiverName: data.receiverName,
    receiverEmail: data.receiverEmail,
    status: data.status,
    eta: data.eta,
    currentLocationName: data.currentLocationName,
    locationName: data.currentLocationName,
    currentLatitude: data.currentLatitude,
    currentLongitude: data.currentLongitude,
    progress: data.progress,
    risk: data.risk
  };
  try {
    if (useFirebase()) {
      const response = await firebaseClient.updateShipment(trackingId, body);
      state.selectedShipment = response.shipment;
      await refreshAll();
      toast(`Updated ${trackingId} in Firebase.`);
      return;
    }
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
    if (useFirebase()) {
      const response = await firebaseClient.advanceShipment(trackingId);
      state.selectedShipment = response.shipment;
      await refreshAll();
      toast(`${trackingId} advanced in Firebase.`);
      return;
    }
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
    if (useFirebase()) {
      await firebaseClient.notifyShipment(trackingId);
      await refreshAll();
      toast(`Firebase email update recorded for ${trackingId}.`);
      return;
    }
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
    if (useFirebase()) {
      const response = state.selectedSupportConversationId
        ? await firebaseClient.sendSupportReply(state.selectedSupportConversationId, message)
        : await firebaseClient.createOrSendCustomerMessage({
            subject: "Customer service request",
            message
          });
      form.reset();
      state.selectedSupportConversationId = response.conversation.id;
      state.supportMessages = response.messages;
      await loadPrivateData();
      renderAll();
      toast("Message sent through Firebase support.");
      return;
    }
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
    if (useFirebase()) {
      const response = await firebaseClient.sendSupportReply(state.selectedSupportConversationId, message);
      form.reset();
      state.supportMessages = response.messages;
      await loadPrivateData();
      renderAll();
      toast("Firebase reply sent.");
      return;
    }
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

function fillAdminLogin() {
  switchAuthTab("login");
  elements.loginForm.elements.email.value = ADMIN_EMAIL;
  elements.loginForm.elements.password.value = "";
  setAuthMessage("Admin email ready. Enter the Firebase password for this account.");
  elements.loginForm.elements.password.focus();
}

function fillAdminReset() {
  switchAuthTab("reset");
  elements.resetForm.elements.email.value = ADMIN_EMAIL;
  elements.resetMessage.textContent = "Send the reset email, set a new Firebase password, then return to Login.";
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  navigateToHash("#home");
}

function handleHashChange() {
  if (window.location.hash === "#quote") {
    window.history.replaceState({}, "", "#home");
  }
  renderFeatureDetail();
  renderToolDetail();
  renderNavigationState();
}

function navigateToHash(hash) {
  const nextHash = hash || "#home";
  if (nextHash === "#quote") {
    window.history.pushState({}, "", "#home");
    elements.profileMenu?.classList.add("hidden");
    renderFeatureDetail();
    renderToolDetail();
    renderNavigationState();
    resetPageScroll();
    return;
  }
  if (window.location.hash !== nextHash) {
    window.history.pushState({}, "", nextHash);
  }
  elements.profileMenu?.classList.add("hidden");
  renderFeatureDetail();
  renderToolDetail();
  renderNavigationState();
  resetPageScroll();
}

function bindEvents() {
  elements.heroTrackingForm.addEventListener("submit", handleTrackingSubmit);
  elements.loginForm.addEventListener("submit", login);
  elements.registerForm.addEventListener("submit", register);
  elements.resetForm.addEventListener("submit", confirmPasswordReset);
  elements.requestResetButton.addEventListener("click", requestPasswordReset);
  elements.fillAdminEmailButton?.addEventListener("click", fillAdminLogin);
  elements.resetAdminPasswordButton?.addEventListener("click", fillAdminReset);
  elements.profileSettingsForm.addEventListener("submit", saveProfileSettings);
  elements.passwordSettingsForm.addEventListener("submit", changeAccountPassword);
  elements.profileResetPasswordButton?.addEventListener("click", sendProfilePasswordReset);
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
  elements.countrySelect?.addEventListener("change", (event) => {
    setCountry(event.target.value, { persist: true, translate: true });
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
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("popstate", handleHashChange);
}

async function boot() {
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark");
  }
  if (window.location.hash === "#quote") {
    window.history.replaceState({}, "", "#home");
  }
  initCountrySelector();
  state.usingFirebase = await firebaseClient.init();
  configureFirebaseUi();
  bindEvents();
  await refreshAll();
  resetPageScroll();
}

boot().catch((error) => {
  toast(error.message || "Unable to start ShipOverseas.");
});
