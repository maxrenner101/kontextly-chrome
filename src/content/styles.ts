export const STYLES = `
  #kontextly-root {
    all: initial;
    font-family: system-ui, -apple-system, sans-serif;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    * { box-sizing: border-box; }
  }
  .kontextly-fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: oklch(0.65 0.25 285);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px oklch(0.65 0.25 285 / 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .kontextly-fab:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 24px oklch(0.65 0.25 285 / 0.5);
  }
  .kontextly-fab svg {
    width: 28px;
    height: 28px;
    color: white;
  }
  .kontextly-chat-box {
    position: absolute;
    bottom: 72px;
    right: 0;
    width: 380px;
    max-width: calc(100vw - 48px);
    height: 500px;
    max-height: calc(100vh - 120px);
    background: oklch(0.12 0.01 285);
    border: 1px solid oklch(0.25 0.02 285 / 0.5);
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    backdrop-filter: blur(12px);
  }
  .kontextly-chat-header {
    padding: 16px;
    border-bottom: 1px solid oklch(0.22 0.01 285);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .kontextly-chat-header-title {
    font-size: 16px;
    font-weight: 600;
    color: oklch(0.98 0 0);
  }
  .kontextly-chat-header-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 9999px;
    background: oklch(0.65 0.25 285 / 0.2);
    color: oklch(0.75 0.2 285);
  }
  .kontextly-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .kontextly-chat-messages::-webkit-scrollbar {
    width: 6px;
  }
  .kontextly-chat-messages::-webkit-scrollbar-thumb {
    background: oklch(0.25 0.01 285);
    border-radius: 3px;
  }
  .kontextly-msg-user {
    align-self: flex-end;
    max-width: 85%;
    padding: 12px 16px;
    background: oklch(0.65 0.25 285);
    color: white;
    border-radius: 16px 16px 4px 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .kontextly-msg-bot {
    align-self: flex-start;
    max-width: 85%;
    padding: 12px 16px;
    background: oklch(0.18 0.01 285);
    color: oklch(0.98 0 0);
    border-radius: 16px 16px 16px 4px;
    font-size: 14px;
    line-height: 1.5;
    border: 1px solid oklch(0.22 0.01 285);
  }
  .kontextly-msg-limit {
    align-self: flex-start;
    max-width: 85%;
    padding: 12px 16px;
    background: oklch(0.2 0.05 30);
    color: oklch(0.85 0.1 30);
    border-radius: 16px 16px 16px 4px;
    font-size: 14px;
    line-height: 1.5;
    border: 1px solid oklch(0.3 0.05 30);
  }
  .kontextly-chat-input-area {
    padding: 12px 16px;
    border-top: 1px solid oklch(0.22 0.01 285);
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }
  .kontextly-chat-input {
    flex: 1;
    padding: 10px 14px;
    background: oklch(0.18 0.01 285);
    border: 1px solid oklch(0.22 0.01 285);
    border-radius: 8px;
    color: oklch(0.98 0 0);
    font-size: 14px;
    outline: none;
  }
  .kontextly-chat-input::placeholder {
    color: oklch(0.5 0 0);
  }
  .kontextly-chat-input:focus {
    border-color: oklch(0.65 0.25 285);
    box-shadow: 0 0 0 2px oklch(0.65 0.25 285 / 0.2);
  }
  .kontextly-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: oklch(0.65 0.25 285);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .kontextly-send-btn:hover {
    background: oklch(0.7 0.22 285);
  }
  .kontextly-send-btn svg {
    width: 18px;
    height: 18px;
  }
  .kontextly-stop-btn {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: oklch(0.45 0.15 25);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .kontextly-stop-btn:hover {
    background: oklch(0.5 0.18 25);
  }
  .kontextly-stop-btn svg {
    width: 16px;
    height: 16px;
  }
  .kontextly-welcome {
    color: oklch(0.65 0 0);
    font-size: 14px;
    text-align: center;
    padding: 24px 16px;
    line-height: 1.6;
  }
  .kontextly-status-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: oklch(0.15 0.01 285);
    color: oklch(0.75 0.2 285);
    border-radius: 12px;
    font-size: 13px;
    align-self: flex-start;
    border: 1px solid oklch(0.25 0.02 285);
  }
  .kontextly-action-card {
    align-self: flex-start;
    width: 100%;
    max-width: 95%;
    padding: 0;
    background: oklch(0.14 0.005 285);
    border-radius: 10px;
    border: 1px solid oklch(0.22 0.01 285);
    overflow: hidden;
  }
  .kontextly-action-step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    font-size: 13px;
    line-height: 1.4;
    color: oklch(0.85 0 0);
    border-bottom: 1px solid oklch(0.2 0.01 285);
  }
  .kontextly-action-step:last-child {
    border-bottom: none;
  }
  .kontextly-action-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }
  .kontextly-action-icon-success {
    background: oklch(0.35 0.12 155);
    color: oklch(0.85 0.15 155);
  }
  .kontextly-action-icon-fail {
    background: oklch(0.3 0.1 25);
    color: oklch(0.85 0.15 25);
  }
  .kontextly-action-icon-pending {
    background: oklch(0.22 0.02 285);
    color: oklch(0.6 0.15 285);
  }
  .kontextly-action-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: oklch(0.55 0 0);
    font-weight: 600;
    margin-right: 4px;
    flex-shrink: 0;
  }
  .kontextly-action-desc {
    flex: 1;
    color: oklch(0.9 0 0);
  }
  .kontextly-summary-msg {
    align-self: flex-start;
    max-width: 90%;
    padding: 12px 16px;
    background: oklch(0.16 0.02 285);
    color: oklch(0.95 0 0);
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    border: 1px solid oklch(0.3 0.06 285);
    border-left: 3px solid oklch(0.65 0.25 285);
  }
  .kontextly-spinning {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .kontextly-send-btn:disabled {
    background: oklch(0.3 0.1 285);
    cursor: not-allowed;
  }
`;
