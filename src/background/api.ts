import { API_BASE_URL, APP_BASE_URL, StoredSession } from './types';

export async function loginWithExtensionFlow(): Promise<StoredSession> {
  const redirectUrl = chrome.identity.getRedirectURL();
  const authUrl = `${APP_BASE_URL}/auth/extension?redirect_uri=${encodeURIComponent(redirectUrl)}`;

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Auth flow cancelled'));
          return;
        }
        resolve(callbackUrl);
      }
    );
  });

  const url = new URL(responseUrl);
  const code = url.searchParams.get('code');
  if (!code) {
    throw new Error('No auth code received');
  }

  const tokenResponse = await fetch(`${API_BASE_URL}/auth/extension/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json().catch(() => ({ error: 'Token exchange failed' }));
    throw new Error(err.error || 'Token exchange failed');
  }

  const data = await tokenResponse.json();
  const session: StoredSession = {
    token: data.token,
    user: data.user,
    plan: data.plan,
  };

  await chrome.storage.local.set({ session });
  return session;
}

export async function handleLogout(): Promise<void> {
  await chrome.storage.local.remove('session');
}

export async function getStoredSession(): Promise<StoredSession | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['session'], (result) => {
      resolve(result.session || null);
    });
  });
}

export async function apiCall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;

  const session = await getStoredSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  try {
    const options: RequestInit = { method, headers };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (_) {
        errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorDetails.error || errorDetails.message || `HTTP ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }
    throw error;
  }
}
