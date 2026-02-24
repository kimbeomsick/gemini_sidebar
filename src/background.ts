// Background service worker
chrome.action.onClicked.addListener((tab) => {
  if (tab.id && tab.url?.includes('gemini.google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle-sidebar' });
  }
});
