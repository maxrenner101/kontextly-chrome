import { AutomationSession, ActionPayload, PageContext } from './types';
import { apiCall } from './api';

export const activeSessions = new Map<number, AutomationSession>();

export function isDuplicateAction(action: ActionPayload, recentActions: Array<{ kind: string; description: string; selector?: string; value?: string }>): boolean {
  return recentActions.some(prev =>
    prev.kind === action.kind && (
      ('selector' in prev && prev.selector === action.selector) ||
      prev.description.toLowerCase() === action.description.toLowerCase() ||
      (prev.kind === 'navigate' && 'value' in prev && prev.value === action.value)
    )
  );
}

function safeSendToTab(tabId: number, message: any, callback?: (response: any) => void) {
  try {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
      }
      callback?.(response);
    });
  } catch {}
}

export function createBroadcastResponse(originalSendResponse: (response: any) => void, tabId: number): (response: any) => void {
  let sent = false;
  return (data: any) => {
    if (sent) return;
    sent = true;
    try { originalSendResponse(data); } catch {}
    const deliver = (attempt: number) => {
      chrome.tabs.sendMessage(tabId, { type: 'CHAT_RESPONSE', data }, () => {
        if (chrome.runtime.lastError && attempt < 5) {
          setTimeout(() => deliver(attempt + 1), 800);
        }
      });
    };
    deliver(0);
  };
}

export function sendStatusUpdate(tabId: number, status: string) {
  const session = activeSessions.get(tabId);
  const actions = session?.allCompletedActions || [];
  safeSendToTab(tabId, { type: 'STATUS_UPDATE', status, completedActions: actions });
}

export function getPageContextFromTab(tabId: number, maxRetries = 5): Promise<PageContext> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryGet = () => {
      chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' }, (response) => {
        if (chrome.runtime.lastError || !response?.pageContext) {
          attempts++;
          if (attempts < maxRetries) {
            setTimeout(tryGet, 1000);
            return;
          }
          reject(new Error(chrome.runtime.lastError?.message || 'Failed to get page context'));
          return;
        }
        resolve(response.pageContext);
      });
    };
    tryGet();
  });
}

export async function handlePopupDetection(sourceTabId: number, popupUrl: string) {
  sendStatusUpdate(sourceTabId, 'popup_detected');

  const session = activeSessions.get(sourceTabId);
  if (session) {
    try {
      await apiCall('/automation/chat', 'POST', {
        sessionId: session.id,
        message: `[System] A popup window opened (${popupUrl}). Automation paused until user confirms.`,
        pageContext: { url: popupUrl, title: '', dom: '' }
      });
    } catch (_) {}
  }
}

export async function handleTabNavigation(tabId: number, url: string) {
  const session = activeSessions.get(tabId);
  if (session && session.currentUrl !== url) {
    session.currentUrl = url;
    safeSendToTab(tabId, { type: 'URL_CHANGED', url });
  }
}

export async function requestPageContext(tabId: number | undefined, scopeSelector: string | undefined, sendResponse: (response: any) => void) {
  if (!tabId) {
    sendResponse({ error: 'No tab ID' });
    return;
  }

  chrome.tabs.sendMessage(tabId, {
    type: 'GET_PAGE_CONTEXT',
    scopeSelector: scopeSelector
  }, (response) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse(response);
  });
}
