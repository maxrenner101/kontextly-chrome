export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;

export const config = {
  maxRecursionDepth: 8,
  sessionTimeout: 30 * 60 * 1000,
  actionTimeout: 10 * 1000,
  contextWaitTime: 2000,
} as const;

export interface StoredSession {
  token: string;
  user: { name: string; email: string; id: string; image?: string };
  plan: string;
}

export interface CompletedAction {
  kind: string;
  description: string;
  success: boolean;
}

export interface AutomationSession {
  id: string;
  tabId: number;
  currentUrl: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  recursionDepth: number;
  stopped: boolean;
  consecutiveFailures: number;
  totalLoopCount: number;
  lastCompletedActions: ActionPayload[];
  allCompletedActions: CompletedAction[];
}

export interface ActionPayload {
  kind: string;
  selector: string;
  value?: string;
  description: string;
  openInCurrentTab?: boolean;
}

export interface AIResponse {
  type: 'action' | 'actions' | 'context_request' | 'message';
  action?: ActionPayload;
  actions?: ActionPayload[];
  taskComplete?: boolean;
  contextRequest?: {
    description: string;
    scopeSelector?: string;
    includeImages?: boolean;
  };
  message?: string;
}

export interface PageContext {
  url: string;
  title: string;
  dom: string;
}
