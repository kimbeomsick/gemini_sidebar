"use strict";
// --- Supabase ---
const SUPABASE_URL = 'https://mfufuiztjecndzhdyrgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdWZ1aXp0amVjbmR6aGR5cmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTY3NTIsImV4cCI6MjA4NzQ5Mjc1Mn0.8bjYy_hQeLjdm5cqAGUyN5WWzkvC01IwAxw_A-lV9MY';
async function supabaseFetch(method, path, body) {
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
    if (method === 'POST') {
        headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
    }
    if (method === 'DELETE') {
        headers['Prefer'] = 'return=minimal';
    }
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
            method, headers, body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok)
            throw new Error(`Supabase ${res.status}: ${res.statusText}`);
        if (method === 'GET')
            return await res.json();
        return null;
    }
    catch (e) {
        console.error('[GS] Supabase sync error:', e);
        return null;
    }
}
async function syncToCloud(data) {
    const email = getAccountEmail();
    if (email === 'default')
        return;
    const pageUrl = getSessionId();
    const now = new Date().toISOString();
    // 1. 메모 upsert → sessions 테이블
    await supabaseFetch('POST', 'sessions?on_conflict=user_email,page_url', {
        user_email: email,
        page_url: pageUrl,
        memo: data.memo,
        updated_at: now
    });
    // 2. 질문 upsert → questions 테이블 (각각)
    for (const q of data.questions) {
        await supabaseFetch('POST', 'questions?on_conflict=id', {
            id: q.id,
            user_email: email,
            page_url: pageUrl,
            text: q.text,
            bookmarked: q.bookmarked ?? false,
            created_at: q.createdAt,
            updated_at: now
        });
    }
    // 3. 로컬에서 삭제된 질문 → 클라우드에서도 삭제
    const cloudRows = await supabaseFetch('GET', `questions?user_email=eq.${encodeURIComponent(email)}&page_url=eq.${encodeURIComponent(pageUrl)}&select=id`);
    if (cloudRows) {
        const localIds = new Set(data.questions.map(q => q.id));
        for (const row of cloudRows) {
            if (!localIds.has(row.id)) {
                await supabaseFetch('DELETE', `questions?id=eq.${encodeURIComponent(row.id)}`);
            }
        }
    }
}
async function syncFromCloud() {
    const email = getAccountEmail();
    if (email === 'default')
        return null;
    const pageUrl = getSessionId();
    // 메모 가져오기
    const sessions = await supabaseFetch('GET', `sessions?user_email=eq.${encodeURIComponent(email)}&page_url=eq.${encodeURIComponent(pageUrl)}&select=memo`);
    // 질문 가져오기
    const questions = await supabaseFetch('GET', `questions?user_email=eq.${encodeURIComponent(email)}&page_url=eq.${encodeURIComponent(pageUrl)}&select=id,text,bookmarked,created_at&order=created_at.asc`);
    if (!sessions && !questions)
        return null;
    const memo = sessions?.[0]?.memo ?? '';
    const qs = (questions ?? []).map((r) => ({
        id: r.id,
        text: r.text,
        createdAt: r.created_at,
        bookmarked: r.bookmarked
    }));
    if (qs.length === 0 && !memo)
        return null;
    return { questions: qs, memo };
}
// --- Storage ---
function getAccountEmail() {
    const selectors = [
        'a[aria-label*="Google 계정"]',
        'a[aria-label*="Google Account"]',
        '[data-email]',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el)
            continue;
        const label = el.getAttribute('aria-label') ?? '';
        const match = label.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (match)
            return match[0];
        const dataEmail = el.getAttribute('data-email');
        if (dataEmail)
            return dataEmail;
    }
    return 'default';
}
function getSessionId() {
    const match = window.location.pathname.match(/\/(?:app|chat)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : 'home';
}
function buildStorageKey() {
    return `${getAccountEmail()}_session_${getSessionId()}`;
}
async function loadSession() {
    const key = buildStorageKey();
    const result = await chrome.storage.local.get(key);
    const local = result[key] ?? { questions: [], memo: '' };
    // 백그라운드에서 클라우드 데이터 확인 (로컬이 비어있으면 클라우드에서 복원)
    syncFromCloud().then(cloud => {
        if (!cloud)
            return;
        const localEmpty = local.questions.length === 0 && !local.memo;
        const cloudHasMore = cloud.questions.length > local.questions.length;
        if (localEmpty || cloudHasMore) {
            state = cloud;
            chrome.storage.local.set({ [key]: cloud });
            renderCards();
            renderBookmarks();
            renderMemo();
        }
    }).catch(() => { });
    return local;
}
async function saveSession(data) {
    const key = buildStorageKey();
    await chrome.storage.local.set({ [key]: data });
    syncToCloud(data).catch(() => { });
}
function onUrlChange(callback) {
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = function (...args) {
        origPush(...args);
        callback();
    };
    history.replaceState = function (...args) {
        origReplace(...args);
        callback();
    };
    window.addEventListener('popstate', callback);
}
// --- State ---
let state = { questions: [], memo: '' };
let activeTab = 'questions';
let memoMode = 'write';
let sidebarVisible = true;
let sidebarWidth = 320;
let memoSaveTimer = null;
let editingId = null;
let currentTheme = 'dark';
const THEMES = [
    { id: 'dark', name: '다크', color: '#1e1e1e' },
    { id: 'light', name: '라이트', color: '#ffffff' },
    { id: 'midnight', name: '미드나잇', color: '#0d1117' },
    { id: 'mocha', name: '모카', color: '#1e1a16' },
];
// --- DOM References ---
let sidebar;
let pageStyle;
let cardList;
let bookmarkCardList;
let inputArea;
let memoEditor;
let memoPreview;
let questionsPane;
let bookmarksPane;
let memoPane;
let tabQuestions;
let tabBookmarks;
let tabMemo;
let memoToggleBtn;
let emptyState;
let bookmarkEmptyState;
// --- Helpers ---
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function formatTime(iso) {
    const d = new Date(iso);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// --- Sanitize ---
function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
        for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('on') || attr.value.startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    return doc.body.innerHTML;
}
// --- Theme ---
async function loadTheme() {
    const result = await chrome.storage.local.get('gs_theme');
    return result['gs_theme'] ?? 'dark';
}
async function saveTheme(theme) {
    await chrome.storage.local.set({ gs_theme: theme });
}
function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'dark') {
        sidebar.removeAttribute('data-theme');
    }
    else {
        sidebar.setAttribute('data-theme', theme);
    }
}
// --- Page Layout ---
function updatePageLayout(width, visible) {
    if (!pageStyle) {
        pageStyle = document.createElement('style');
        pageStyle.id = 'gs-page-layout';
        document.head.appendChild(pageStyle);
    }
    if (visible) {
        pageStyle.textContent = `
      html {
        width: calc(100vw - ${width}px) !important;
        overflow-x: hidden !important;
      }
    `;
    }
    else {
        pageStyle.textContent = '';
    }
}
// --- Gemini Chat Integration ---
function findGeminiInput() {
    const selectors = [
        '.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][aria-label]',
        'rich-textarea div[contenteditable="true"]',
        '.text-input-field [contenteditable="true"]',
        'div[contenteditable="true"]',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.closest('#gemini-sidebar') === null)
            return el;
    }
    return null;
}
function applyToGemini(text) {
    const input = findGeminiInput();
    if (!input)
        return;
    input.focus();
    input.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = text;
    input.appendChild(p);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
// --- Edit Area Helper ---
function createEditCard(q, card, onDone) {
    const lineCount = q.text.split('\n').length;
    const rows = Math.max(4, lineCount + 1);
    const editArea = document.createElement('textarea');
    editArea.className = 'gs-card-edit-area';
    editArea.value = q.text;
    editArea.rows = rows;
    editArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit(q.id, editArea.value);
            onDone();
        }
        if (e.key === 'Escape') {
            editingId = null;
            onDone();
        }
    });
    const editActions = document.createElement('div');
    editActions.className = 'gs-card-edit-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'gs-card-btn gs-card-btn-save';
    saveBtn.textContent = '저장';
    saveBtn.addEventListener('click', () => { saveEdit(q.id, editArea.value); onDone(); });
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'gs-card-btn gs-card-btn-cancel';
    cancelBtn.textContent = '취소';
    cancelBtn.addEventListener('click', () => { editingId = null; onDone(); });
    editActions.append(saveBtn, cancelBtn);
    card.append(editArea, editActions);
    setTimeout(() => {
        editArea.focus();
        editArea.style.height = 'auto';
        editArea.style.height = Math.max(editArea.scrollHeight, 80) + 'px';
    }, 0);
}
// --- Rendering ---
function renderCards() {
    cardList.innerHTML = '';
    const active = state.questions.filter((q) => !q.bookmarked);
    if (active.length === 0) {
        cardList.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyState.textContent = '저장된 질문이 없습니다';
        return;
    }
    cardList.style.display = 'flex';
    emptyState.style.display = 'none';
    active.forEach((q) => {
        const card = document.createElement('div');
        card.className = 'gs-card';
        if (editingId === q.id) {
            createEditCard(q, card, () => renderCards());
        }
        else {
            const text = document.createElement('div');
            text.className = 'gs-card-text';
            text.textContent = q.text;
            const footer = document.createElement('div');
            footer.className = 'gs-card-footer';
            const time = document.createElement('span');
            time.className = 'gs-card-time';
            time.textContent = formatTime(q.createdAt);
            const actions = document.createElement('div');
            actions.className = 'gs-card-actions';
            // Bookmark button
            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = 'gs-card-btn gs-card-btn-bookmark';
            bookmarkBtn.innerHTML = '\u2606'; // ☆
            bookmarkBtn.title = '보관하기';
            bookmarkBtn.addEventListener('click', () => toggleBookmark(q.id));
            const applyBtn = document.createElement('button');
            applyBtn.className = 'gs-card-btn gs-card-btn-apply';
            applyBtn.textContent = '적용';
            applyBtn.title = 'Gemini 채팅에 적용';
            applyBtn.addEventListener('click', () => applyToGemini(q.text));
            const editBtn = document.createElement('button');
            editBtn.className = 'gs-card-btn gs-card-btn-edit';
            editBtn.innerHTML = '\u270F'; // ✏
            editBtn.title = '수정';
            editBtn.addEventListener('click', () => { editingId = q.id; renderCards(); });
            const del = document.createElement('button');
            del.className = 'gs-card-btn gs-card-btn-delete';
            del.textContent = '\u2715';
            del.title = '삭제';
            del.addEventListener('click', () => deleteQuestion(q.id));
            actions.append(applyBtn, bookmarkBtn, editBtn, del);
            footer.append(time, actions);
            card.append(text, footer);
        }
        cardList.appendChild(card);
    });
    cardList.scrollTop = cardList.scrollHeight;
}
function renderBookmarks() {
    bookmarkCardList.innerHTML = '';
    const bookmarked = state.questions.filter((q) => q.bookmarked);
    const countEl = document.getElementById('gs-bookmark-count');
    if (countEl)
        countEl.textContent = `${bookmarked.length}개 보관`;
    if (bookmarked.length === 0) {
        bookmarkCardList.style.display = 'none';
        bookmarkEmptyState.style.display = 'flex';
        bookmarkEmptyState.textContent = '보관된 질문이 없습니다';
        return;
    }
    bookmarkCardList.style.display = 'flex';
    bookmarkEmptyState.style.display = 'none';
    bookmarked.forEach((q) => {
        const card = document.createElement('div');
        card.className = 'gs-card gs-card-bookmarked';
        if (editingId === q.id) {
            createEditCard(q, card, () => renderBookmarks());
        }
        else {
            const text = document.createElement('div');
            text.className = 'gs-card-text';
            text.textContent = q.text;
            const footer = document.createElement('div');
            footer.className = 'gs-card-footer';
            const time = document.createElement('span');
            time.className = 'gs-card-time';
            time.textContent = formatTime(q.createdAt);
            const actions = document.createElement('div');
            actions.className = 'gs-card-actions';
            // Unbookmark button
            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = 'gs-card-btn gs-card-btn-bookmark gs-card-btn-bookmark-active';
            bookmarkBtn.innerHTML = '\u2605'; // ★
            bookmarkBtn.title = '보관 해제';
            bookmarkBtn.addEventListener('click', () => toggleBookmark(q.id));
            const applyBtn = document.createElement('button');
            applyBtn.className = 'gs-card-btn gs-card-btn-apply';
            applyBtn.textContent = '적용';
            applyBtn.title = 'Gemini 채팅에 적용';
            applyBtn.addEventListener('click', () => applyToGemini(q.text));
            const editBtn = document.createElement('button');
            editBtn.className = 'gs-card-btn gs-card-btn-edit';
            editBtn.innerHTML = '\u270F'; // ✏
            editBtn.title = '수정';
            editBtn.addEventListener('click', () => { editingId = q.id; renderBookmarks(); });
            const del = document.createElement('button');
            del.className = 'gs-card-btn gs-card-btn-delete';
            del.textContent = '삭제';
            del.title = '삭제';
            del.addEventListener('click', () => confirmDeleteBookmark(q.id));
            actions.append(applyBtn, bookmarkBtn, editBtn, del);
            footer.append(time, actions);
            card.append(text, footer);
        }
        bookmarkCardList.appendChild(card);
    });
}
function renderMemo() {
    if (memoMode === 'write') {
        memoEditor.style.display = 'block';
        memoPreview.style.display = 'none';
        memoEditor.value = state.memo;
        const cb = memoToggleBtn.querySelector('.gs-toggle-checkbox');
        if (cb)
            cb.checked = false;
    }
    else {
        memoEditor.style.display = 'none';
        memoPreview.style.display = 'block';
        memoPreview.innerHTML = state.memo
            ? sanitizeHtml(marked.parse(state.memo))
            : '<p class="gs-empty-memo">메모를 작성해보세요</p>';
        const cb = memoToggleBtn.querySelector('.gs-toggle-checkbox');
        if (cb)
            cb.checked = true;
    }
}
// --- Actions ---
async function addQuestion(text) {
    state.questions.push({ id: uid(), text: text.trim(), createdAt: new Date().toISOString() });
    renderCards();
    await saveSession(state);
}
async function deleteQuestion(id) {
    state.questions = state.questions.filter((q) => q.id !== id);
    renderCards();
    await saveSession(state);
}
async function toggleBookmark(id) {
    const q = state.questions.find((item) => item.id === id);
    if (q)
        q.bookmarked = !q.bookmarked;
    renderCards();
    renderBookmarks();
    await saveSession(state);
}
function confirmDeleteBookmark(id) {
    const input = window.prompt('보관된 질문을 삭제하려면 "완전삭제"를 입력하세요:');
    if (input === '완전삭제') {
        state.questions = state.questions.filter((q) => q.id !== id);
        renderBookmarks();
        saveSession(state);
    }
}
function confirmBulkDeleteBookmarks() {
    const bookmarked = state.questions.filter((q) => q.bookmarked);
    if (bookmarked.length === 0)
        return;
    const input = window.prompt(`보관된 질문 ${bookmarked.length}개를 모두 삭제하려면 "완전삭제"를 입력하세요:`);
    if (input === '완전삭제') {
        state.questions = state.questions.filter((q) => !q.bookmarked);
        renderBookmarks();
        saveSession(state);
    }
}
async function saveEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed)
        return;
    const q = state.questions.find((item) => item.id === id);
    if (q)
        q.text = trimmed;
    editingId = null;
    await saveSession(state);
}
function debounceSaveMemo() {
    if (memoSaveTimer)
        clearTimeout(memoSaveTimer);
    memoSaveTimer = setTimeout(async () => {
        state.memo = memoEditor.value;
        await saveSession(state);
    }, 500);
}
async function switchSession() {
    state = await loadSession();
    editingId = null;
    renderCards();
    renderBookmarks();
    renderMemo();
}
function switchTab(tab) {
    if (activeTab === 'memo' && tab !== 'memo') {
        if (memoSaveTimer) {
            clearTimeout(memoSaveTimer);
            memoSaveTimer = null;
        }
        state.memo = memoEditor.value;
        saveSession(state);
    }
    activeTab = tab;
    tabQuestions.classList.toggle('gs-tab-active', tab === 'questions');
    tabBookmarks.classList.toggle('gs-tab-active', tab === 'bookmarks');
    tabMemo.classList.toggle('gs-tab-active', tab === 'memo');
    questionsPane.style.display = tab === 'questions' ? 'flex' : 'none';
    bookmarksPane.style.display = tab === 'bookmarks' ? 'flex' : 'none';
    memoPane.style.display = tab === 'memo' ? 'flex' : 'none';
}
function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
    sidebar.style.transform = sidebarVisible ? 'translateX(0)' : 'translateX(100%)';
    updatePageLayout(sidebarWidth, sidebarVisible);
}
// --- Resize ---
function initResize(handle) {
    let startX = 0;
    let startWidth = 0;
    function onMouseMove(e) {
        const delta = startX - e.clientX;
        const newWidth = Math.max(250, Math.min(600, startWidth + delta));
        sidebarWidth = newWidth;
        sidebar.style.width = newWidth + 'px';
        updatePageLayout(newWidth, true);
    }
    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        startWidth = sidebarWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
// --- Build Sidebar DOM ---
function createSidebar() {
    const el = document.createElement('div');
    el.id = 'gemini-sidebar';
    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'gs-resize-handle';
    el.appendChild(resizeHandle);
    initResize(resizeHandle);
    // Header with tabs
    const header = document.createElement('div');
    header.className = 'gs-header';
    tabQuestions = document.createElement('button');
    tabQuestions.className = 'gs-tab gs-tab-active';
    tabQuestions.textContent = '질문';
    tabQuestions.addEventListener('click', () => switchTab('questions'));
    tabBookmarks = document.createElement('button');
    tabBookmarks.className = 'gs-tab';
    tabBookmarks.textContent = '보관';
    tabBookmarks.addEventListener('click', () => switchTab('bookmarks'));
    tabMemo = document.createElement('button');
    tabMemo.className = 'gs-tab';
    tabMemo.textContent = '메모';
    tabMemo.addEventListener('click', () => switchTab('memo'));
    // Theme picker
    const themeBtn = document.createElement('button');
    themeBtn.className = 'gs-theme-btn';
    themeBtn.innerHTML = '\u2699';
    themeBtn.title = '테마 변경';
    const themeDropdown = document.createElement('div');
    themeDropdown.className = 'gs-theme-dropdown';
    THEMES.forEach((t) => {
        const opt = document.createElement('button');
        opt.className = 'gs-theme-option' + (t.id === currentTheme ? ' gs-theme-current' : '');
        opt.dataset.theme = t.id;
        opt.innerHTML = `<span class="gs-theme-dot" style="background:${t.color}"></span>${t.name}`;
        opt.addEventListener('click', () => {
            applyTheme(t.id);
            saveTheme(t.id);
            themeDropdown.querySelectorAll('.gs-theme-option').forEach((optEl) => {
                optEl.classList.toggle('gs-theme-current', optEl.dataset.theme === t.id);
            });
            themeDropdown.classList.remove('gs-show');
        });
        themeDropdown.appendChild(opt);
    });
    themeBtn.appendChild(themeDropdown);
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('gs-show');
    });
    document.addEventListener('click', () => {
        themeDropdown.classList.remove('gs-show');
    });
    header.append(tabQuestions, tabBookmarks, tabMemo, themeBtn);
    // Questions pane
    questionsPane = document.createElement('div');
    questionsPane.className = 'gs-pane gs-questions-pane';
    emptyState = document.createElement('div');
    emptyState.className = 'gs-empty';
    emptyState.textContent = '저장된 질문이 없습니다';
    cardList = document.createElement('div');
    cardList.className = 'gs-card-list';
    const inputWrap = document.createElement('div');
    inputWrap.className = 'gs-input-wrap';
    inputArea = document.createElement('textarea');
    inputArea.className = 'gs-input';
    inputArea.placeholder = '질문을 입력하세요... (Enter: 저장, Shift+Enter: 줄바꿈)';
    inputArea.rows = 2;
    inputArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const val = inputArea.value.trim();
            if (val) {
                addQuestion(val);
                inputArea.value = '';
                inputArea.style.height = 'auto';
            }
        }
    });
    inputArea.addEventListener('input', () => {
        inputArea.style.height = 'auto';
        inputArea.style.height = Math.min(inputArea.scrollHeight, 120) + 'px';
    });
    inputWrap.appendChild(inputArea);
    questionsPane.append(cardList, emptyState, inputWrap);
    // Bookmarks pane
    bookmarksPane = document.createElement('div');
    bookmarksPane.className = 'gs-pane gs-bookmarks-pane';
    bookmarksPane.style.display = 'none';
    const bookmarkHeader = document.createElement('div');
    bookmarkHeader.className = 'gs-bookmark-header';
    const bookmarkCount = document.createElement('span');
    bookmarkCount.className = 'gs-bookmark-count';
    bookmarkCount.id = 'gs-bookmark-count';
    const bulkDeleteBtn = document.createElement('button');
    bulkDeleteBtn.className = 'gs-bulk-delete-btn';
    bulkDeleteBtn.textContent = '일괄 삭제';
    bulkDeleteBtn.addEventListener('click', confirmBulkDeleteBookmarks);
    bookmarkHeader.append(bookmarkCount, bulkDeleteBtn);
    bookmarkEmptyState = document.createElement('div');
    bookmarkEmptyState.className = 'gs-empty';
    bookmarkEmptyState.textContent = '보관된 질문이 없습니다';
    bookmarkCardList = document.createElement('div');
    bookmarkCardList.className = 'gs-card-list';
    bookmarksPane.append(bookmarkHeader, bookmarkCardList, bookmarkEmptyState);
    // Memo pane
    memoPane = document.createElement('div');
    memoPane.className = 'gs-pane gs-memo-pane';
    memoPane.style.display = 'none';
    const memoHeader = document.createElement('div');
    memoHeader.className = 'gs-memo-header';
    memoToggleBtn = document.createElement('label');
    memoToggleBtn.className = 'gs-memo-toggle';
    const toggleCheckbox = document.createElement('input');
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.className = 'gs-toggle-checkbox';
    const toggleTrack = document.createElement('span');
    toggleTrack.className = 'gs-toggle-track';
    const toggleLabelWrite = document.createElement('span');
    toggleLabelWrite.className = 'gs-toggle-label gs-toggle-label-write';
    toggleLabelWrite.textContent = '쓰기';
    const toggleLabelRead = document.createElement('span');
    toggleLabelRead.className = 'gs-toggle-label gs-toggle-label-read';
    toggleLabelRead.textContent = '읽기';
    memoToggleBtn.append(toggleLabelWrite, toggleCheckbox, toggleTrack, toggleLabelRead);
    toggleCheckbox.addEventListener('change', () => {
        if (memoMode === 'write') {
            state.memo = memoEditor.value;
        }
        memoMode = toggleCheckbox.checked ? 'read' : 'write';
        renderMemo();
    });
    memoHeader.appendChild(memoToggleBtn);
    memoEditor = document.createElement('textarea');
    memoEditor.className = 'gs-memo-editor';
    memoEditor.placeholder = '마크다운으로 메모를 작성하세요...\n\n# 제목\n## 소제목\n- 리스트\n**굵게** *기울임* `코드`';
    memoEditor.addEventListener('input', debounceSaveMemo);
    memoPreview = document.createElement('div');
    memoPreview.className = 'gs-memo-preview';
    memoPreview.style.display = 'none';
    memoPane.append(memoHeader, memoEditor, memoPreview);
    el.append(header, questionsPane, bookmarksPane, memoPane);
    return el;
}
// --- Init ---
async function init() {
    sidebar = createSidebar();
    document.body.appendChild(sidebar);
    updatePageLayout(sidebarWidth, true);
    const savedTheme = await loadTheme();
    applyTheme(savedTheme);
    state = await loadSession();
    renderCards();
    renderBookmarks();
    renderMemo();
    onUrlChange(() => switchSession());
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'toggle-sidebar')
            toggleSidebar();
    });
}
init();
