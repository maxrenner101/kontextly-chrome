import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import useSWR from "swr";
import {
  Zap,
  MessageSquare,
  Sparkles,
  Shield,
  Bot,
  LayoutDashboard,
  User,
  LogIn,
  ExternalLink,
  CreditCard,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  Image,
  Loader2,
  ArrowRight,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

interface Session {
  token: string;
  user: { name: string; email: string; id: string; image?: string };
  plan: string;
}

interface AutomationSessionItem {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED";
  currentUrl: string;
  tabId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number; actions: number };
}

interface UsageData {
  plan: string;
  month: string;
  usage: {
    messages: { used: number; limit: number };
    sessions: { used: number; limit: number };
    images: { used: number; limit: number };
  };
}

function Tabs({
  tabs,
  activeTab,
  onTabChange,
  style,
}: {
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: 3,
        background: "oklch(0.14 0.01 285)",
        borderRadius: 8,
        ...style,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "6px 8px",
            border: "none",
            borderRadius: 6,
            background: activeTab === tab.id ? "oklch(0.2 0.01 285)" : "transparent",
            color: activeTab === tab.id ? "oklch(0.98 0 0)" : "oklch(0.65 0 0)",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  COMPLETED: { color: "oklch(0.75 0.18 145)", bg: "oklch(0.75 0.18 145 / 0.15)", icon: <CheckCircle size={10} />, label: "Completed" },
  ACTIVE: { color: "oklch(0.8 0.15 85)", bg: "oklch(0.8 0.15 85 / 0.15)", icon: <Loader2 size={10} />, label: "Active" },
  FAILED: { color: "oklch(0.7 0.2 25)", bg: "oklch(0.7 0.2 25 / 0.15)", icon: <XCircle size={10} />, label: "Failed" },
  CANCELLED: { color: "oklch(0.6 0 0)", bg: "oklch(0.6 0 0 / 0.15)", icon: <AlertCircle size={10} />, label: "Cancelled" },
};

function SessionCard({ item }: { item: AutomationSessionItem }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.CANCELLED;
  return (
    <div style={styles.sessionCard}>
      <div style={styles.sessionCardTop}>
        <div style={styles.sessionDomain}>
          <Globe size={12} style={{ color: "oklch(0.65 0.25 285)", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getDomain(item.currentUrl)}
          </span>
        </div>
        <span style={{ ...styles.statusBadge, background: cfg.bg, color: cfg.color }}>
          {cfg.icon}
          {cfg.label}
        </span>
      </div>
      <div style={styles.sessionCardBottom}>
        <span style={styles.sessionMeta}>
          <Zap size={10} /> {item._count.actions} action{item._count.actions !== 1 ? "s" : ""}
        </span>
        <span style={styles.sessionMeta}>
          <MessageSquare size={10} /> {item._count.messages} msg{item._count.messages !== 1 ? "s" : ""}
        </span>
        <span style={{ ...styles.sessionMeta, marginLeft: "auto" }}>
          {timeAgo(item.createdAt)}
        </span>
      </div>
    </div>
  );
}

function useAuthFetcher(session: Session | null) {
  return (url: string) => {
    if (!session?.token) return Promise.reject('No token');
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
      body: url.includes('/sessions') ? JSON.stringify({ limit: 15 }) : undefined
    }).then(r => r.json());
  };
}

const Popup = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["session"], (result) => {
      setSession(result.session || null);
      setLoading(false);
    });

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.session) {
        setSession(changes.session.newValue || null);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const fetcher = useAuthFetcher(session);

  const { data: userData } = useSWR<{ user: Session['user']; plan: string }>(
    session?.token ? `${API_BASE_URL}/auth/extension/verify` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  const user = userData?.user || session?.user;
  const plan = userData?.plan || session?.plan || 'free';

  const { data: usageData } = useSWR<UsageData>(
    session?.token ? `${API_BASE_URL}/automation/usage` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  const usage = usageData || null;

  const { data: sessionsData, isLoading: sessionsLoading } = useSWR<{ sessions: AutomationSessionItem[] }>(
    session?.token && activeTab === 'sessions' ? `${API_BASE_URL}/automation/sessions` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  const sessions = sessionsData?.sessions || [];

  const handleLogin = () => {
    setLoginLoading(true);
    setLoginError("");
    chrome.runtime.sendMessage({ type: "LOGIN" }, (response) => {
      setLoginLoading(false);
      if (chrome.runtime.lastError) {
        setLoginError("Login failed. Please try again.");
        return;
      }
      if (response?.error) {
        setLoginError(response.error);
        return;
      }
    });
  };
  const handleSignOut = () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
      setSession(null);
    });
  };
  const openUrl = (path: string) => { chrome.tabs.create({ url: `${BASE_URL}${path}` }); };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={{ ...styles.content, justifyContent: "center", alignItems: "center" }}>
          <Loader2 size={24} style={{ color: "oklch(0.65 0.25 285)", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.bgOrbs}><div style={styles.orb1} /><div style={styles.orb2} /></div>
        <div style={styles.gridPattern} />
        <div style={{ ...styles.content, justifyContent: "center", padding: "0 24px" }}>
          {/* Logo mark */}
          <div style={styles.loginLogoWrap}>
            <div style={styles.loginLogo}>
              <Bot size={28} style={{ color: "white" }} />
            </div>
          </div>

          <h1 style={{ ...styles.title, textAlign: "center", fontSize: 22, margin: "0 0 6px" }}>
            <span style={styles.gradientText}>Kontextly</span>
          </h1>
          <p style={{ textAlign: "center", fontSize: 13, color: "oklch(0.55 0 0)", margin: "0 0 28px", lineHeight: 1.5 }}>
            AI-powered browser automation.<br />Sign in to get started.
          </p>

          {loginError && (
            <p style={{ color: "oklch(0.7 0.2 25)", fontSize: 12, textAlign: "center", margin: "0 0 12px", background: "oklch(0.7 0.2 25 / 0.1)", padding: "8px 12px", borderRadius: 8 }}>
              {loginError}
            </p>
          )}

          <button style={{ ...styles.loginBtn, opacity: loginLoading ? 0.7 : 1 }} onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <LogIn size={16} />}
            {loginLoading ? "Signing in..." : "Sign in to your account"}
            {!loginLoading && <ArrowRight size={14} style={{ marginLeft: "auto", opacity: 0.6 }} />}
          </button>

          <div style={styles.loginFooter}>
            <Shield size={10} style={{ color: "oklch(0.65 0.25 285)" }} />
            <span>Secure authentication via your browser</span>
          </div>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgOrbs}><div style={styles.orb1} /><div style={styles.orb2} /></div>
      <div style={styles.gridPattern} />
      <div style={styles.content}>
        <header style={styles.navbar}>
          <div style={styles.navbarTop}>
            <div style={styles.userRow}>
              <img
                src={user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.name || user?.email || 'U')}&backgroundColor=7c3aed,6d28d9&textColor=ffffff`}
                alt=""
                style={styles.avatar}
              />
              <div style={styles.userInfo}>
                <span style={styles.userName}>{firstName}</span>
                <span style={styles.userEmail}>{user?.email}</span>
              </div>
            </div>
            <span style={{
              ...styles.badge,
              background: plan === "pro" ? "oklch(0.65 0.25 285 / 0.2)" : "oklch(0.18 0.01 285)",
              color: plan === "pro" ? "oklch(0.75 0.2 285)" : "oklch(0.65 0 0)",
            }}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </div>
          <Tabs
            tabs={[
              { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={11} /> },
              { id: "sessions", label: "Sessions", icon: <History size={11} /> },
              { id: "account", label: "Account", icon: <User size={11} /> },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            style={{ marginTop: 8 }}
          />
        </header>

        <div className="kontextly-tab-content" style={styles.tabContent}>
          {activeTab === "dashboard" && (
            <div style={styles.dashboardContent}>
              <h2 style={styles.welcomeTitle}>Welcome back, {firstName}</h2>
              <div style={styles.statsGrid}>
                {[
                  {
                    title: "Sessions",
                    value: usage ? `${usage.usage.sessions.used}` : "--",
                    change: usage ? `of ${usage.usage.sessions.limit} this month` : "loading...",
                    Icon: Zap,
                  },
                  {
                    title: "Messages",
                    value: usage ? `${usage.usage.messages.used}` : "--",
                    change: usage ? `of ${usage.usage.messages.limit} this month` : "loading...",
                    Icon: MessageSquare,
                  },
                  {
                    title: "Images",
                    value: usage ? `${usage.usage.images.used}` : "--",
                    change: usage ? `of ${usage.usage.images.limit} this month` : "loading...",
                    Icon: Image,
                  },
                ].map(({ title, value, change, Icon }) => (
                  <div key={title} style={styles.statCard}>
                    <div style={styles.statHeader}>
                      <span style={styles.statTitle}>{title}</span>
                      <Icon size={14} style={{ color: "oklch(0.65 0 0)" }} />
                    </div>
                    <div style={styles.statValue}>{value}</div>
                    <p style={styles.statChange}>{change}</p>
                  </div>
                ))}
              </div>

              <button className="kontextly-action-card" style={styles.actionCard} onClick={() => openUrl("/dashboard")}>
                <div style={styles.actionIcon}><LayoutDashboard size={18} /></div>
                <div style={styles.actionContent}>
                  <span style={styles.actionTitle}>Open Dashboard</span>
                  <span style={styles.actionDesc}>View full dashboard on web</span>
                </div>
                <ExternalLink size={14} style={{ color: "oklch(0.65 0 0)" }} />
              </button>

              {plan === "free" && (
                <div style={styles.upgradeCard}>
                  <div style={styles.upgradeContent}>
                    <div style={styles.upgradeIcon}><Sparkles size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={styles.upgradeTitle}>Upgrade to Pro</h4>
                      <p style={styles.upgradeDesc}>Unlimited automations & priority support</p>
                    </div>
                    <button className="kontextly-upgrade-btn" style={styles.upgradeBtn} onClick={() => openUrl("/dashboard/subscription")}>
                      Upgrade
                    </button>
                  </div>
                </div>
              )}
              <div style={styles.dashboardSpacer} />
              <div style={styles.trustBadges}>
                <Shield size={11} style={{ color: "oklch(0.75 0.2 285)" }} /><span>Secure</span>
                <Zap size={11} style={{ color: "oklch(0.75 0.2 285)" }} /><span>Fast</span>
                <Bot size={11} style={{ color: "oklch(0.75 0.2 285)" }} /><span>AI</span>
              </div>
            </div>
          )}

          {activeTab === "sessions" && (
            <div style={styles.sessionsTab}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h2 style={styles.welcomeTitle}>Recent Sessions</h2>
                <button
                  style={{ background: "none", border: "none", color: "oklch(0.75 0.2 285)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => openUrl("/dashboard/sessions")}
                >
                  View all <ExternalLink size={10} />
                </button>
              </div>
              {sessionsLoading && (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                  <Loader2 size={20} style={{ color: "oklch(0.65 0.25 285)", animation: "spin 1s linear infinite" }} />
                </div>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <div style={styles.emptyState}>
                  <History size={32} style={{ color: "oklch(0.3 0.01 285)", marginBottom: 8 }} />
                  <p style={{ color: "oklch(0.5 0 0)", fontSize: 13, margin: 0 }}>No sessions yet</p>
                  <p style={{ color: "oklch(0.4 0 0)", fontSize: 11, margin: "4px 0 0" }}>
                    Start automating to see your history here.
                  </p>
                </div>
              )}
              {!sessionsLoading && sessions.map((s) => <SessionCard key={s.id} item={s} />)}
            </div>
          )}

          {activeTab === "account" && (
            <div style={styles.accountTab}>
              <div style={styles.profileCard}>
                <img
                  src={user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.name || user?.email || 'U')}&backgroundColor=7c3aed,6d28d9&textColor=ffffff`}
                  alt=""
                  style={styles.profileAvatar}
                />
                <h3 style={styles.profileName}>{user?.name}</h3>
                <p style={styles.profileEmail}>{user?.email}</p>
                <button className="kontextly-account-link" style={styles.accountLinkBtn} onClick={() => openUrl("/dashboard/account")}>
                  <User size={12} /> Edit profile <ExternalLink size={10} />
                </button>
              </div>
              <div style={styles.planCard}>
                <div style={styles.planCardHeader}>
                  <CreditCard size={14} style={{ color: "oklch(0.75 0.2 285)" }} />
                  <span style={styles.planCardTitle}>Subscription</span>
                </div>
                <div style={styles.planCardBody}>
                  <span style={{
                    ...styles.planBadge,
                    background: plan === "pro" ? "oklch(0.65 0.25 285 / 0.25)" : "oklch(0.22 0.01 285)",
                    color: plan === "pro" ? "oklch(0.8 0.18 285)" : "oklch(0.7 0 0)",
                  }}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </span>
                  <button className="kontextly-account-link" style={styles.accountLinkBtn} onClick={() => openUrl("/dashboard/subscription")}>
                    Manage billing <ExternalLink size={10} />
                  </button>
                </div>
              </div>
              <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: "relative", width: "100%", height: "100%", minHeight: 480, background: "oklch(0.07 0.01 285)", color: "oklch(0.98 0 0)", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" },
  bgOrbs: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" },
  orb1: { position: "absolute", top: -80, left: "20%", width: 200, height: 200, borderRadius: "50%", background: "oklch(0.65 0.25 285 / 0.15)", filter: "blur(60px)" },
  orb2: { position: "absolute", top: -40, right: "10%", width: 160, height: 160, borderRadius: "50%", background: "oklch(0.75 0.2 285 / 0.12)", filter: "blur(50px)" },
  gridPattern: { position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(oklch(0.98 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.98 0 0) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" },
  content: { position: "relative", zIndex: 1, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" },
  navbar: { flexShrink: 0, padding: "12px 12px 10px", background: "oklch(0.08 0.01 285 / 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid oklch(0.2 0.01 285)" },
  navbarTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tabContent: { flex: 1, minHeight: 0, overflow: "auto", padding: 12 },
  title: { fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: "0 0 8px", letterSpacing: "-0.02em" },
  gradientText: { background: "linear-gradient(135deg, oklch(0.75 0.2 285), oklch(0.8 0.15 200))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },

  // Login screen
  loginLogoWrap: { display: "flex", justifyContent: "center", marginBottom: 16 },
  loginLogo: { width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, oklch(0.65 0.25 285), oklch(0.55 0.28 285))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px oklch(0.65 0.25 285 / 0.3), 0 0 0 1px oklch(0.65 0.25 285 / 0.15)" },
  loginBtn: { width: "100%", padding: "12px 16px", background: "oklch(0.65 0.25 285)", color: "white", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", boxShadow: "0 4px 20px oklch(0.65 0.25 285 / 0.3), 0 0 0 1px oklch(0.65 0.25 285 / 0.2)", transition: "transform 0.15s, box-shadow 0.15s" },
  loginSecondaryBtn: { width: "100%", padding: "10px 16px", background: "oklch(0.12 0.01 285)", color: "oklch(0.85 0 0)", border: "1px solid oklch(0.22 0.02 285)", borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", transition: "border-color 0.15s, background 0.15s" },
  loginFooter: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 10, color: "oklch(0.45 0 0)", marginTop: 24 },

  userRow: { display: "flex", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" as const },
  userInfo: { display: "flex", flexDirection: "column", gap: 0 },
  userName: { fontSize: 13, fontWeight: 600 },
  userEmail: { fontSize: 10, color: "oklch(0.65 0 0)" },
  badge: { padding: "4px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 500 },
  dashboardContent: { height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 10 },
  welcomeTitle: { fontSize: 15, fontWeight: 700, margin: 0 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  statCard: { background: "oklch(0.12 0.01 285 / 0.8)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.25 0.02 285 / 0.5)", borderRadius: 10, padding: 10 },
  statHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  statTitle: { fontSize: 9, fontWeight: 500, color: "oklch(0.65 0 0)" },
  statValue: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" },
  statChange: { fontSize: 9, color: "oklch(0.65 0 0)", margin: "1px 0 0" },
  actionCard: { display: "flex", alignItems: "center", gap: 10, padding: 10, background: "oklch(0.12 0.01 285 / 0.8)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.25 0.02 285 / 0.5)", borderRadius: 10, cursor: "pointer", color: "inherit", fontFamily: "inherit", textAlign: "left", marginBottom: 8, width: "100%" },
  actionIcon: { width: 34, height: 34, borderRadius: 8, background: "oklch(0.65 0.25 285 / 0.15)", color: "oklch(0.75 0.2 285)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionContent: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  actionTitle: { fontSize: 13, fontWeight: 600 },
  actionDesc: { fontSize: 11, color: "oklch(0.65 0 0)" },
  upgradeCard: { padding: 10, background: "linear-gradient(135deg, oklch(0.65 0.25 285 / 0.15), oklch(0.75 0.2 285 / 0.08))", border: "1px solid oklch(0.65 0.25 285 / 0.2)", borderRadius: 10 },
  upgradeContent: { display: "flex", alignItems: "center", gap: 10 },
  upgradeIcon: { width: 36, height: 36, borderRadius: 10, background: "oklch(0.65 0.25 285)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  upgradeTitle: { fontSize: 13, fontWeight: 600, margin: 0 },
  upgradeDesc: { fontSize: 11, color: "oklch(0.65 0 0)", margin: "1px 0 0" },
  upgradeBtn: { padding: "6px 12px", fontSize: 12, background: "oklch(0.65 0.25 285)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px oklch(0.65 0.25 285 / 0.25)", fontFamily: "inherit" },
  dashboardSpacer: { flex: 1, minHeight: 0 },
  trustBadges: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 10, color: "oklch(0.65 0 0)" },
  sessionsTab: { display: "flex", flexDirection: "column", gap: 0 },
  sessionCard: { background: "oklch(0.12 0.01 285 / 0.8)", border: "1px solid oklch(0.25 0.02 285 / 0.5)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 },
  sessionCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  sessionDomain: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, overflow: "hidden", minWidth: 0 },
  sessionCardBottom: { display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "oklch(0.55 0 0)" },
  sessionMeta: { display: "flex", alignItems: "center", gap: 3 },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 600, flexShrink: 0 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" },
  accountTab: { height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 10 },
  profileCard: { background: "oklch(0.12 0.01 285 / 0.8)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.25 0.02 285 / 0.5)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  profileAvatar: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover" as const, marginBottom: 6, boxShadow: "0 4px 12px oklch(0.65 0.25 285 / 0.2)" },
  profileName: { fontSize: 14, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em" },
  profileEmail: { fontSize: 12, color: "oklch(0.65 0 0)", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" },
  accountLinkBtn: { padding: "8px 12px", background: "oklch(0.18 0.01 285)", color: "oklch(0.9 0 0)", border: "1px solid oklch(0.25 0.02 285)", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", transition: "border-color 0.2s, background 0.2s" },
  planCard: { background: "oklch(0.12 0.01 285 / 0.8)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.25 0.02 285 / 0.5)", borderRadius: 12, overflow: "hidden" },
  planCardHeader: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid oklch(0.22 0.01 285)" },
  planCardTitle: { fontSize: 12, fontWeight: 600 },
  planCardBody: { padding: 10, display: "flex", flexDirection: "column", gap: 10 },
  planBadge: { padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, width: "fit-content" },
  signOutBtn: { padding: "8px 12px", background: "transparent", color: "oklch(0.55 0.22 25)", border: "1px solid oklch(0.55 0.22 25 / 0.5)", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
