import { AutomationSession, ActionPayload, config } from './types';
import { apiCall } from './api';
import { activeSessions, sendStatusUpdate, getPageContextFromTab } from './sessions';
import { processAIResponse, continueAfterAction, logActionResult } from './automation';

function stripTrailingPunctuation(s: string): string {
  return s.replace(/[.\s]+$/, '');
}

function sendFinalResponse(session: AutomationSession, sendResponse: (response: any) => void) {
  const actions = session.allCompletedActions;
  const steps = actions.filter(a => a.success).map(a => stripTrailingPunctuation(a.description.toLowerCase()));
  let summary: string;
  if (steps.length === 0) {
    summary = 'Task completed.';
  } else if (steps.length === 1) {
    summary = `Done — ${steps[0]}.`;
  } else {
    summary = `All done! ${steps.slice(0, -1).join(', ')}, then ${steps[steps.length - 1]}.`;
  }
  sendResponse({
    type: 'message',
    content: summary,
    completedActions: actions,
    sessionId: session.id
  });
}

export function executeOnTab(tabId: number, action: ActionPayload): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXECUTE_ACTION', action }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ success: false, error: chrome.runtime.lastError?.message || 'No response from page' });
        return;
      }
      resolve(response);
    });
  });
}

export function waitForTabReady(tabId: number, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.status === 'complete') {
        setTimeout(resolve, 500);
        return;
      }
      const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          setTimeout(resolve, 500);
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, timeoutMs);
    });
  });
}

export function navigateTab(tabId: number, url: string): Promise<void> {
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('chrome://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  return new Promise((resolve) => {
    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.update(tabId, { url: normalizedUrl });
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }, 15000);
  });
}

export async function executeSingleAction(session: AutomationSession, action: ActionPayload, taskComplete: boolean, sendResponse: (response: any) => void) {
  sendStatusUpdate(session.tabId, `${action.description}...`);

  if (action.kind === 'navigate') {
    if (action.openInCurrentTab === false) {
      chrome.tabs.create({ url: action.value });
      sendResponse({ type: 'message', content: `Opened ${action.value} in a new tab.`, sessionId: session.id });
      return;
    }
    await navigateTab(session.tabId, action.value || action.selector);
    await logActionResult(session.id, action, true);
    session.lastCompletedActions = [action];
    session.currentUrl = action.value || action.selector;
    if (taskComplete) {
      sendFinalResponse(session, sendResponse);
      return;
    }
    await continueAfterAction(session, action, true, sendResponse);
    return;
  }

  const urlBefore = session.currentUrl;
  const response = await executeOnTab(session.tabId, action);

  if (!response.success) {
    const tab = await chrome.tabs.get(session.tabId);
    if (tab.url && tab.url !== urlBefore) {
      await logActionResult(session.id, action, true);
      session.lastCompletedActions = [action];
      session.currentUrl = tab.url;
      await waitForTabReady(session.tabId);
      if (taskComplete) {
        sendFinalResponse(session, sendResponse);
        return;
      }
      await continueAfterAction(session, action, true, sendResponse);
      return;
    }
  }

  if (response.success && response.linkHref && !response.pageChanged) {
    await logActionResult(session.id, action, true);
    session.lastCompletedActions = [action];
    await navigateTab(session.tabId, response.linkHref);
    session.currentUrl = response.linkHref;
    await new Promise(resolve => setTimeout(resolve, 500));
    if (taskComplete) {
      sendFinalResponse(session, sendResponse);
      return;
    }
    await continueAfterAction(session, action, true, sendResponse);
    return;
  }

  await logActionResult(session.id, action, response.success);

  if (session.stopped) {
    sendResponse({ type: 'message', content: 'Automation stopped.', sessionId: session.id });
    return;
  }

  if (!response.success) {
    await retryFailedAction(session, action, response.error, sendResponse);
    return;
  }

  session.consecutiveFailures = 0;
  session.lastCompletedActions = [action];

  if (taskComplete) {
    sendResponse({ type: 'message', content: `Done: ${action.description}`, sessionId: session.id });
    return;
  }

  await continueAfterAction(session, action, response.pageChanged, sendResponse);
}

export async function executeActionBatch(session: AutomationSession, actions: ActionPayload[], taskComplete: boolean, sendResponse: (response: any) => void) {
  const completedDescriptions: string[] = [];
  let batchPageChanged = false;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (session.stopped) {
      sendResponse({ type: 'message', content: 'Automation stopped.', sessionId: session.id });
      return;
    }

    sendStatusUpdate(session.tabId, `Step ${i + 1}/${actions.length}: ${action.description}...`);

    if (action.kind === 'navigate') {
      if (action.openInCurrentTab === false) {
        chrome.tabs.create({ url: action.value });
      } else {
        await navigateTab(session.tabId, action.value || action.selector);
        session.currentUrl = action.value || action.selector;
        batchPageChanged = true;
      }
      await logActionResult(session.id, action, true);
      completedDescriptions.push(action.description);
      await new Promise(resolve => setTimeout(resolve, config.contextWaitTime));
      continue;
    }

    const urlBefore = session.currentUrl;
    const response = await executeOnTab(session.tabId, action);

    if (!response.success) {
      const tab = await chrome.tabs.get(session.tabId);
      if (tab.url && tab.url !== urlBefore) {
        await logActionResult(session.id, action, true);
        completedDescriptions.push(action.description);
        session.currentUrl = tab.url;
        batchPageChanged = true;
        await waitForTabReady(session.tabId);
        continue;
      }

      await logActionResult(session.id, action, false);
      const summary = completedDescriptions.length > 0
        ? `Completed ${completedDescriptions.length} step(s), then failed on: ${action.description}`
        : `Failed: ${action.description}`;

      await retryFailedAction(session, action, response.error, sendResponse, summary, actions.slice(i + 1), taskComplete);
      return;
    }

    if (response.linkHref && !response.pageChanged) {
      await logActionResult(session.id, action, true);
      completedDescriptions.push(action.description);
      await navigateTab(session.tabId, response.linkHref);
      session.currentUrl = response.linkHref;
      batchPageChanged = true;
      await new Promise(resolve => setTimeout(resolve, config.contextWaitTime));
      continue;
    }

    await logActionResult(session.id, action, true);
    completedDescriptions.push(action.description);

    if (response.pageChanged) {
      batchPageChanged = true;
      await new Promise(resolve => setTimeout(resolve, config.contextWaitTime));
    }
  }

  session.lastCompletedActions = [...actions];

  if (taskComplete) {
    sendFinalResponse(session, sendResponse);
    return;
  }

  const lastAction = actions[actions.length - 1];
  await continueAfterAction(session, lastAction, batchPageChanged, sendResponse);
}

export async function retryFailedAction(session: AutomationSession, action: ActionPayload, error: string, sendResponse: (response: any) => void, contextPrefix?: string, remainingActions?: ActionPayload[], taskComplete?: boolean) {
  session.consecutiveFailures++;

  if (session.consecutiveFailures >= 3) {
    sendResponse({ type: 'message', content: `I wasn't able to ${action.description.toLowerCase()} after a few attempts. Try rephrasing or doing that step manually.`, sessionId: session.id });
    return;
  }

  sendStatusUpdate(session.tabId, 'Retrying with fresh page context...');
  try {
    const freshContext = await getPageContextFromTab(session.tabId);
    const remainingNote = remainingActions && remainingActions.length > 0
      ? ` Remaining steps after this: ${remainingActions.map(a => a.description).join(', ')}.`
      : '';
    const completedList = session.allCompletedActions.filter(a => a.success).map(a => `  - ${a.kind}: ${a.description}`).join('\n');
    const retryData = {
      sessionId: session.id,
      message: `[Action failed] ${action.description} failed: ${error}. Try a DIFFERENT approach or selector.\n\nACTIONS ALREADY DONE (DO NOT repeat):\n${completedList}${remainingNote}`,
      pageContext: freshContext,
      isInternalLoop: true
    };

    const aiRetry = await apiCall('/automation/chat', 'POST', retryData);
    if (aiRetry.error || aiRetry.limitReached) {
      sendResponse({ type: 'message', content: aiRetry.limitReached ? aiRetry.response?.message : `I couldn't complete that step. Try a different approach.`, limitReached: aiRetry.limitReached, sessionId: session.id });
      return;
    }
    await processAIResponse(aiRetry.response, session, sendResponse);
  } catch (_) {
    sendResponse({ type: 'message', content: contextPrefix || `Failed to ${action.description.toLowerCase()}: ${error}`, sessionId: session.id });
  }
}
