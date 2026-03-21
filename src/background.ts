import { PageContext } from './background/types';
import { loginWithExtensionFlow, handleLogout, getStoredSession, apiCall } from './background/api';
import { activeSessions, createBroadcastResponse, handlePopupDetection, handleTabNavigation, requestPageContext } from './background/sessions';
import { processAIResponse, logActionResult, endSession } from './background/automation';
import { AIResponse, AutomationSession } from './background/types';

chrome.runtime.onInstalled.addListener(() => {
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      await handleMessage(message, sender, sendResponse);
    } catch (error) {
      sendResponse({
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })();

  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    handleTabNavigation(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSessions.has(tabId)) {
    const session = activeSessions.get(tabId)!;
    endSession(session.id, 'CANCELLED');
    activeSessions.delete(tabId);
  }
  chrome.storage.local.remove(`kontextly-state-${tabId}`);
});

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  if (details.sourceTabId && activeSessions.has(details.sourceTabId)) {
    handlePopupDetection(details.sourceTabId, details.url);
  }
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
  try {
    switch (message.type) {
      case 'LOGIN':
        try {
          const session = await loginWithExtensionFlow();
          sendResponse({ success: true, session });
        } catch (error) {
          sendResponse({ error: error instanceof Error ? error.message : 'Login failed' });
        }
        break;

      case 'LOGOUT':
        await handleLogout();
        sendResponse({ success: true });
        break;

      case 'SEND_CHAT_MESSAGE':
        await handleChatMessage(message.data, sender.tab?.id, sendResponse);
        break;

      case 'STOP_AUTOMATION':
        handleStopAutomation(sender.tab?.id, sendResponse);
        break;

      case 'GET_PAGE_CONTEXT':
        await requestPageContext(sender.tab?.id, message.scopeSelector, sendResponse);
        break;

      case 'EXECUTE_ACTION':
        sendResponse({ success: true });
        break;

      case 'REPORT_ACTION_RESULT':
        try {
          await logActionResult(message.sessionId, message.action, message.result.success);
        } catch (_) {}
        sendResponse({ success: true });
        break;

      case 'GET_SESSION_STATUS':
        const hasSession = sender.tab?.id ? activeSessions.has(sender.tab.id) : false;
        sendResponse({
          hasActiveSession: hasSession,
          session: sender.tab?.id ? activeSessions.get(sender.tab.id) : null
        });
        break;

      case 'GET_TAB_ID':
        sendResponse({ tabId: sender.tab?.id });
        break;

      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }
  } catch (error) {
    sendResponse({
      error: 'Background script error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function handleStopAutomation(tabId: number | undefined, sendResponse: (response: any) => void) {
  if (!tabId) {
    sendResponse({ error: 'No tab ID' });
    return;
  }

  const session = activeSessions.get(tabId);
  if (session) {
    session.stopped = true;
    session.status = 'CANCELLED';
    endSession(session.id, 'CANCELLED');
    activeSessions.delete(tabId);
  }

  sendResponse({ success: true, message: 'Automation stopped.' });
}

async function handleChatMessage(data: { message: string; pageContext: PageContext }, tabId: number | undefined, sendResponse: (response: any) => void) {
  if (!tabId) {
    sendResponse({ error: 'No tab ID available' });
    return;
  }

  const broadcastResponse = createBroadcastResponse(sendResponse, tabId);

  try {
    const session = await getStoredSession();
    if (!session) {
      broadcastResponse({ error: 'User not authenticated. Please sign in to the extension popup.' });
      return;
    }

    let automationSession = activeSessions.get(tabId);

    const requestData = {
      sessionId: automationSession?.id,
      message: data.message,
      pageContext: data.pageContext,
      tabId: tabId.toString()
    };

    const response = await apiCall('/automation/chat', 'POST', requestData);

    if (response.error) {
      broadcastResponse({ error: response.error, message: response.message });
      return;
    }

    if (response.limitReached) {
      broadcastResponse({
        type: 'message',
        content: response.response?.message || response.message,
        limitReached: true,
        sessionId: automationSession?.id
      });
      return;
    }

    if (!automationSession) {
      automationSession = {
        id: response.sessionId,
        tabId: tabId,
        currentUrl: data.pageContext.url,
        status: 'ACTIVE',
        recursionDepth: 0,
        consecutiveFailures: 0,
        totalLoopCount: 0,
        stopped: false,
        lastCompletedActions: [],
        allCompletedActions: []
      };
      activeSessions.set(tabId, automationSession);
    } else {
      automationSession.stopped = false;
      automationSession.consecutiveFailures = 0;
      automationSession.totalLoopCount = 0;
      automationSession.lastCompletedActions = [];
      automationSession.allCompletedActions = [];
    }

    const aiResponse: AIResponse = response.response;
    await processAIResponse(aiResponse, automationSession, broadcastResponse);

  } catch (error) {
    broadcastResponse({
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
