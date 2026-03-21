import { AIResponse, AutomationSession, config } from './types';
import { apiCall } from './api';
import { activeSessions, isDuplicateAction, sendStatusUpdate, getPageContextFromTab } from './sessions';
import { executeSingleAction, executeActionBatch } from './actions';

export async function processAIResponse(aiResponse: AIResponse, session: AutomationSession, sendResponse: (response: any) => void) {
  try {
    if (session.stopped) {
      sendResponse({ type: 'message', content: 'Automation stopped.', sessionId: session.id });
      return;
    }

    if (!aiResponse || !aiResponse.type) {
      sendResponse({ type: 'message', content: 'I received an invalid response. Please try again.', sessionId: session.id });
      return;
    }

    const taskComplete = aiResponse.taskComplete === true;

    switch (aiResponse.type) {
      case 'message':
        sendResponse({ type: 'message', content: aiResponse.message || 'I processed your request.', sessionId: session.id });
        break;

      case 'context_request':
        session.recursionDepth++;
        if (session.recursionDepth > config.maxRecursionDepth) {
          sendResponse({ type: 'message', content: "I couldn't locate what I was looking for after several attempts. Could you describe it differently or point me to where it is?", sessionId: session.id });
          return;
        }
        if (!aiResponse.contextRequest) {
          try {
            const freshCtx = await getPageContextFromTab(session.tabId);
            const retryData = {
              sessionId: session.id,
              message: `[Retry] The page is loaded. Look at the INTERACTIVE ELEMENTS for links and buttons you can click. If this is a search results page, click the most relevant result link. Take an action — do NOT request more context.`,
              pageContext: freshCtx,
              isInternalLoop: true
            };
            const retryResponse = await apiCall('/automation/chat', 'POST', retryData);
            if (!retryResponse.error && !retryResponse.limitReached) {
              await processAIResponse(retryResponse.response, session, sendResponse);
              return;
            }
          } catch {}
          sendResponse({ type: 'message', content: 'I need more information to help you. Please try rephrasing your request.', sessionId: session.id });
          return;
        }
        await requestAdditionalContext(session, aiResponse.contextRequest, sendResponse);
        break;

      case 'action':
        if (!aiResponse.action) {
          sendResponse({ type: 'message', content: 'I received an invalid action. Please try again.', sessionId: session.id });
          return;
        }
        if (isDuplicateAction(aiResponse.action, session.allCompletedActions)) {
          sendResponse({ type: 'message', content: `Done: ${session.allCompletedActions[session.allCompletedActions.length - 1]?.description || aiResponse.action.description}`, sessionId: session.id });
          return;
        }
        session.recursionDepth = 0;
        await executeSingleAction(session, aiResponse.action, taskComplete, sendResponse);
        break;

      case 'actions':
        if (!aiResponse.actions || aiResponse.actions.length === 0) {
          sendResponse({ type: 'message', content: 'I received an empty action list. Please try again.', sessionId: session.id });
          return;
        }
        {
          const nonDuplicateActions = aiResponse.actions.filter(a => !isDuplicateAction(a, session.allCompletedActions));
          if (nonDuplicateActions.length === 0) {
            sendResponse({ type: 'message', content: `Done: ${session.lastCompletedActions[session.lastCompletedActions.length - 1]?.description || 'Task completed.'}`, sessionId: session.id });
            return;
          }
          session.recursionDepth = 0;
          await executeActionBatch(session, nonDuplicateActions, taskComplete, sendResponse);
        }
        break;

      default:
        sendResponse({ type: 'message', content: 'I received an unexpected response. Please try again.', sessionId: session.id });
        break;
    }
  } catch (error) {
    sendResponse({ type: 'message', content: 'I encountered an error processing your request. Please try again.', sessionId: session.id });
  }
}

export async function requestAdditionalContext(session: AutomationSession, contextRequest: any, sendResponse: (response: any) => void) {
  sendStatusUpdate(session.tabId, `Looking for ${contextRequest.description}...`);

  chrome.tabs.sendMessage(session.tabId, {
    type: 'GET_SCOPED_CONTEXT',
    scopeSelector: contextRequest.scopeSelector,
    includeImages: contextRequest.includeImages || false
  }, async (response) => {
    if (chrome.runtime.lastError || !response || response.error) {
      sendResponse({
        type: 'message',
        content: `I couldn't get more context from the page. ${response?.error || 'Try rephrasing your request.'}`,
        sessionId: session.id
      });
      return;
    }

    if (session.stopped) {
      sendResponse({ type: 'message', content: 'Automation stopped.', sessionId: session.id });
      return;
    }

    try {
      const requestData = {
        sessionId: session.id,
        message: `[Context gathered] Looking for: ${contextRequest.description}`,
        pageContext: response.pageContext,
        isInternalLoop: true
      };

      const aiResponse = await apiCall('/automation/chat', 'POST', requestData);

      if (aiResponse.error) {
        sendResponse({ type: 'message', content: aiResponse.message || aiResponse.error, sessionId: session.id });
        return;
      }

      if (aiResponse.limitReached) {
        sendResponse({ type: 'message', content: aiResponse.response?.message, limitReached: true, sessionId: session.id });
        return;
      }

      await processAIResponse(aiResponse.response, session, sendResponse);
    } catch (error) {
      sendResponse({
        type: 'message',
        content: 'I encountered an error while analyzing the page. Please try again.',
        sessionId: session.id
      });
    }
  });
}

export async function continueAfterAction(session: AutomationSession, lastAction: any, pageChanged: boolean, sendResponse: (response: any) => void) {
  session.totalLoopCount++;

  if (session.totalLoopCount > 20) {
    sendResponse({ type: 'message', content: 'Reached maximum number of steps. Please start a new request for remaining tasks.', sessionId: session.id });
    return;
  }

  if (session.consecutiveFailures >= 3) {
    sendResponse({ type: 'message', content: `I wasn't able to ${lastAction.description?.toLowerCase() || 'complete that step'} after a few attempts. Try rephrasing or doing that step manually.`, sessionId: session.id });
    return;
  }

  if (pageChanged) {
    await new Promise(resolve => setTimeout(resolve, config.contextWaitTime));
  }

  sendStatusUpdate(session.tabId, 'Analyzing result...');

  try {
    const newContext = await getPageContextFromTab(session.tabId);
    session.currentUrl = newContext.url;

    const completedList = session.lastCompletedActions.map(a => `  - ${a.kind}: ${a.description}`).join('\n');
    const continuationData = {
      sessionId: session.id,
      message: `[Action completed] ${lastAction.description} succeeded.${pageChanged ? ` Page navigated to: ${newContext.url}` : ''}\n\nACTIONS ALREADY DONE (DO NOT repeat any of these):\n${completedList}\n\nIMPORTANT: If the user's original task has been fulfilled, you MUST respond with type: "message" and a summary of what was accomplished. Do NOT propose further actions unless the task is clearly incomplete.`,
      pageContext: newContext,
      isInternalLoop: true
    };

    const aiContinue = await apiCall('/automation/chat', 'POST', continuationData);
    if (aiContinue.error || aiContinue.limitReached) {
      sendResponse({ type: 'message', content: aiContinue.limitReached ? aiContinue.response?.message : `Action completed: ${lastAction.description}`, limitReached: aiContinue.limitReached, sessionId: session.id });
      return;
    }

    await processAIResponse(aiContinue.response, session, sendResponse);
  } catch (error) {
    sendResponse({ type: 'message', content: `Done: ${lastAction.description}`, sessionId: session.id });
  }
}

export async function logActionResult(sessionId: string, action: any, success: boolean) {
  const sessions = activeSessions.values();
  for (const s of sessions) {
    if (s.id === sessionId) {
      s.allCompletedActions.push({ kind: action.kind, description: action.description, success });
      try {
        chrome.tabs.sendMessage(s.tabId, {
          type: 'ACTION_LOG',
          action: { kind: action.kind, description: action.description, success }
        }, () => { if (chrome.runtime.lastError) { } });
      } catch {}
      break;
    }
  }

  try {
    await apiCall('/automation/log-action', 'POST', {
      sessionId,
      action,
      success
    });
  } catch (error) {
  }
}

export async function endSession(sessionId: string, status: 'COMPLETED' | 'FAILED' | 'CANCELLED') {
  try {
    await apiCall('/automation/end-session', 'POST', { sessionId, status });
  } catch (_) {
  }
}
