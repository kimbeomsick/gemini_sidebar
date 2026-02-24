"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSession = loadSession;
exports.saveSession = saveSession;
exports.onUrlChange = onUrlChange;
function getAccountEmail() {
    // Try multiple selectors to find the logged-in Google account email
    const selectors = [
        'a[aria-label*="Google 계정"]',
        'a[aria-label*="Google Account"]',
        'a[href*="accounts.google.com"] img[aria-label]',
        '[data-email]',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el)
            continue;
        // Try aria-label (e.g. "Google 계정: user@gmail.com")
        const label = el.getAttribute('aria-label') ?? '';
        const emailMatch = label.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch)
            return emailMatch[0];
        // Try data-email attribute
        const dataEmail = el.getAttribute('data-email');
        if (dataEmail)
            return dataEmail;
    }
    return 'default';
}
function getSessionId() {
    const path = window.location.pathname;
    // Gemini URL pattern: /app/{sessionId} or /chat/{sessionId}
    const match = path.match(/\/(?:app|chat)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : 'home';
}
function buildStorageKey() {
    const email = getAccountEmail();
    const session = getSessionId();
    return `${email}_session_${session}`;
}
const DEFAULT_DATA = { questions: [], memo: '' };
async function loadSession() {
    const key = buildStorageKey();
    const result = await chrome.storage.local.get(key);
    return result[key] ?? { ...DEFAULT_DATA, questions: [] };
}
async function saveSession(data) {
    const key = buildStorageKey();
    await chrome.storage.local.set({ [key]: data });
}
function onUrlChange(callback) {
    // Override pushState/replaceState to detect SPA navigation
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    history.pushState = function (...args) {
        originalPush(...args);
        callback();
    };
    history.replaceState = function (...args) {
        originalReplace(...args);
        callback();
    };
    window.addEventListener('popstate', callback);
}
