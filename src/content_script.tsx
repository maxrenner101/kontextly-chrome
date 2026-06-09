import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Send, Loader2, Square, X, ChevronLeft, Maximize2, Sparkles } from "lucide-react";

type UIMode = 'panel' | 'progress-bar';

const STYLES = `
  #kontextly-root {
    all: initial;
    font-family: system-ui, -apple-system, sans-serif;
    position: fixed;
    top: 0;
    right: 0;
    z-index: 2147483647;
    height: 0;
  }
  #kontextly-root *, #kontextly-root *::before, #kontextly-root *::after {
    box-sizing: border-box;
  }

  .kontextly-side-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    max-width: 100vw;
    height: 100vh;
    background: oklch(0.12 0.01 285);
    border-left: 1px solid oklch(0.25 0.02 285 / 0.5);
    box-shadow: -4px 0 24px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2147483647;
  }
  .kontextly-side-panel.open { transform: translateX(0); }
  .kontextly-side-panel.closed { transform: translateX(100%); pointer-events: none; }

  .kontextly-tab-handle {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 72px;
    background: oklch(0.18 0.02 285);
    border: 1px solid oklch(0.3 0.04 285 / 0.6);
    border-right: none;
    border-radius: 10px 0 0 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -2px 0 12px rgba(0,0,0,0.3);
    z-index: 2147483647;
    transition: width 0.2s, background 0.2s;
    padding: 0;
  }
  .kontextly-tab-handle:hover {
    width: 38px;
    background: oklch(0.22 0.04 285);
  }
  .kontextly-tab-handle svg {
    width: 18px;
    height: 18px;
    color: oklch(0.7 0.2 285);
    transition: transform 0.2s;
  }
  .kontextly-tab-handle:hover svg { transform: translateX(-2px); }

  .kontextly-chat-header {
    padding: 14px 16px;
    border-bottom: 1px solid oklch(0.22 0.01 285);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .kontextly-chat-header-logo {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .kontextly-chat-header-title {
    font-size: 16px;
    font-weight: 600;
    color: oklch(0.98 0 0);
  }
  .kontextly-close-btn {
    margin-left: auto;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: oklch(0.6 0 0);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.15s, color 0.15s;
  }
  .kontextly-close-btn:hover {
    background: oklch(0.2 0.01 285);
    color: oklch(0.9 0 0);
  }

  .kontextly-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .kontextly-chat-messages::-webkit-scrollbar { width: 6px; }
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
    flex-shrink: 0;
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
    flex-shrink: 0;
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
    flex-shrink: 0;
  }

  .kontextly-chat-input-area {
    padding: 8px 12px;
    border-top: 1px solid oklch(0.22 0.01 285);
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-shrink: 0;
  }
  .kontextly-chat-input {
    flex: 1 !important;
    min-height: 40px !important;
    padding: 8px 12px !important;
    background: oklch(0.18 0.01 285) !important;
    border: 1px solid oklch(0.22 0.01 285) !important;
    border-radius: 8px !important;
    color: oklch(0.98 0 0) !important;
    font-size: 14px !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    outline: none !important;
    box-sizing: border-box !important;
    display: block !important;
    line-height: 1.8 !important;
    overflow-y: auto !important;
    max-height: 120px !important;
    -webkit-text-fill-color: oklch(0.98 0 0) !important;
    cursor: text !important;
    word-break: break-word !important;
    white-space: pre-wrap !important;
    transition: border-color 0.15s, box-shadow 0.15s !important;
  }
  .kontextly-chat-input:focus {
    border-color: oklch(0.65 0.25 285) !important;
    box-shadow: 0 0 0 2px oklch(0.65 0.25 285 / 0.2) !important;
  }
  .kontextly-chat-input:empty::before,
  .kontextly-chat-input.kontextly-empty::before {
    content: attr(data-placeholder);
    color: oklch(0.5 0 0) !important;
    -webkit-text-fill-color: oklch(0.5 0 0) !important;
    pointer-events: none;
  }
  .kontextly-chat-input .kontextly-input-chip {
    display: inline-flex !important;
    align-items: center;
    gap: 4px;
    padding: 1px 6px 1px 4px;
    margin: 0 2px;
    background: oklch(0.22 0.06 285);
    border: 1px solid oklch(0.3 0.08 285);
    border-radius: 4px;
    font-size: 11px;
    line-height: 1.4;
    color: oklch(0.8 0.1 285);
    white-space: nowrap;
    max-width: 200px;
    vertical-align: middle;
    user-select: all;
    cursor: default;
  }
  .kontextly-chat-input .kontextly-input-chip-icon {
    width: 12px;
    height: 12px;
    color: oklch(0.6 0.2 285);
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
  }
  .kontextly-chat-input .kontextly-input-chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
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
  .kontextly-send-btn:hover { background: oklch(0.7 0.22 285); }
  .kontextly-send-btn svg { width: 18px; height: 18px; }
  .kontextly-send-btn:disabled {
    background: oklch(0.3 0.1 285);
    cursor: not-allowed;
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
  .kontextly-stop-btn:hover { background: oklch(0.5 0.18 25); }
  .kontextly-stop-btn svg { width: 16px; height: 16px; }

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
    flex-shrink: 0;
  }
  .kontextly-action-card {
    align-self: flex-start;
    max-width: 90%;
    padding: 0;
    background: oklch(0.14 0.005 285);
    border-radius: 10px;
    border: 1px solid oklch(0.22 0.01 285);
    overflow: hidden;
    flex-shrink: 0;
  }
  .kontextly-action-step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    font-size: 13px;
    line-height: 1.4;
    color: oklch(0.85 0 0);
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
    flex-shrink: 0;
  }

  /* Context selection feature */
  .kontextly-context-btn {
    position: fixed;
    z-index: 2147483646;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: oklch(0.18 0.04 285);
    border: 1px solid oklch(0.35 0.15 285);
    color: oklch(0.75 0.2 285);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: background 0.15s, transform 0.15s, border-color 0.15s;
    animation: kontextly-fadeIn 0.15s ease-out;
  }
  .kontextly-context-btn:hover {
    background: oklch(0.25 0.08 285);
    border-color: oklch(0.5 0.2 285);
    transform: scale(1.1);
  }
  @keyframes kontextly-fadeIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }

  .kontextly-hover-overlay {
    position: fixed;
    z-index: 2147483645;
    pointer-events: none;
    border-radius: 8px;
  }
  .kontextly-hover-overlay .kontextly-border-edge {
    position: absolute;
    overflow: hidden;
  }
  .kontextly-hover-overlay .kontextly-border-edge-top {
    top: 0; left: 8px; right: 8px; height: 2px;
  }
  .kontextly-hover-overlay .kontextly-border-edge-right {
    top: 8px; right: 0; width: 2px; bottom: 8px;
  }
  .kontextly-hover-overlay .kontextly-border-edge-bottom {
    bottom: 0; left: 8px; right: 8px; height: 2px;
  }
  .kontextly-hover-overlay .kontextly-border-edge-left {
    top: 8px; left: 0; width: 2px; bottom: 8px;
  }
  .kontextly-hover-overlay .kontextly-border-glow-h {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, oklch(0.65 0.25 285 / 0.7), transparent);
  }
  .kontextly-hover-overlay .kontextly-border-glow-v {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: linear-gradient(180deg, transparent, oklch(0.55 0.2 300 / 0.7), transparent);
  }
  .kontextly-hover-overlay .kontextly-border-bg {
    position: absolute;
    inset: 2px;
    border-radius: 4px;
    background: oklch(0.65 0.25 285 / 0.04);
  }


  /* Inline AI fill feature */
  .kontextly-fill-btn {
    position: fixed;
    z-index: 2147483646;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: oklch(0.15 0.04 285);
    border: 1px solid oklch(0.35 0.15 285);
    color: oklch(0.7 0.2 285);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    animation: kontextly-fadeIn 0.15s ease-out;
    opacity: 0.7;
  }
  .kontextly-fill-btn:hover {
    background: oklch(0.22 0.08 285);
    border-color: oklch(0.5 0.2 285);
    opacity: 1;
  }
  .kontextly-fill-prompt {
    position: fixed;
    z-index: 2147483647;
    width: 340px;
    background: oklch(0.13 0.02 285);
    border: 1px solid oklch(0.3 0.1 285);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px oklch(0.2 0.05 285);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: kontextly-fadeIn 0.15s ease-out;
  }
  .kontextly-fill-prompt-label {
    font-size: 11px;
    font-weight: 600;
    color: oklch(0.6 0.15 285);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .kontextly-fill-prompt-input {
    all: unset !important;
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    font-size: 14px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    color: oklch(0.95 0 0) !important;
    background: oklch(0.1 0.01 285) !important;
    border: 1px solid oklch(0.25 0.08 285) !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    outline: none !important;
    line-height: 1.4 !important;
  }
  .kontextly-fill-prompt-input:focus {
    border-color: oklch(0.55 0.2 285) !important;
    box-shadow: 0 0 0 2px oklch(0.55 0.2 285 / 0.2) !important;
  }
  .kontextly-fill-prompt-input::placeholder {
    color: oklch(0.45 0 0) !important;
  }
  .kontextly-fill-prompt-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .kontextly-fill-prompt-hint {
    font-size: 11px;
    color: oklch(0.45 0 0);
  }
  .kontextly-fill-prompt-submit {
    all: unset !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: oklch(0.55 0.2 285) !important;
    color: #fff !important;
    border-radius: 6px !important;
    padding: 6px 14px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: background 0.15s !important;
  }
  .kontextly-fill-prompt-submit:hover {
    background: oklch(0.6 0.22 285) !important;
  }
  .kontextly-fill-prompt-submit:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
  .kontextly-fill-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 13px;
    color: oklch(0.7 0.15 285);
  }
  .kontextly-fill-loading svg {
    animation: kontextly-spin 1s linear infinite;
  }
  @keyframes kontextly-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .kontextly-progress-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: oklch(0.12 0.01 285);
    border-top: 1px solid oklch(0.25 0.02 285 / 0.5);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
    z-index: 2147483647;
    animation: kontextly-slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes kontextly-slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  .kontextly-progress-track {
    width: 120px;
    height: 3px;
    background: oklch(0.22 0.02 285);
    border-radius: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .kontextly-progress-fill {
    height: 100%;
    width: 40%;
    background: oklch(0.65 0.25 285);
    border-radius: 2px;
    animation: kontextly-indeterminate 1.5s ease-in-out infinite;
  }
  @keyframes kontextly-indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
  .kontextly-progress-text {
    flex: 1;
    color: oklch(0.8 0.02 285);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .kontextly-progress-actions {
    color: oklch(0.6 0.15 285);
    font-size: 12px;
    flex-shrink: 0;
    padding: 2px 8px;
    background: oklch(0.18 0.02 285);
    border-radius: 10px;
  }
  .kontextly-progress-expand {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: oklch(0.2 0.02 285);
    border: 1px solid oklch(0.3 0.03 285);
    color: oklch(0.7 0.1 285);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    transition: background 0.15s;
  }
  .kontextly-progress-expand:hover {
    background: oklch(0.25 0.03 285);
    color: oklch(0.9 0.1 285);
  }
  .kontextly-progress-stop {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: oklch(0.35 0.12 25);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    transition: background 0.15s;
  }
  .kontextly-progress-stop:hover { background: oklch(0.45 0.15 25); }

  .kontextly-spinning {
    animation: kontextly-spin 1s linear infinite;
  }
  @keyframes kontextly-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

class DOMExtractor {
  static extractPageContext(scopeSelector?: string): { url: string; title: string; dom: string } {
    return {
      url: window.location.href,
      title: document.title,
      dom: this.extractDOM(scopeSelector)
    };
  }

  static extractDOM(scopeSelector?: string): string {
    const root = scopeSelector ? this.getScopedRoot(scopeSelector) : document.body;
    if (!root) return '';

    const interactiveSection = this.extractInteractiveElements(root);
    const contentSection = this.extractTextContent(root);
    const isScoped = !!scopeSelector;
    const structureBudget = isScoped ? 10000 : 4000;
    const structureDepth = isScoped ? 10 : 6;
    const structureSection = this.extractStructure(root, 0, structureDepth, structureBudget);
    const rawTextSection = this.extractRawVisibleText(root, isScoped ? 6000 : 3000);

    return `=== INTERACTIVE ELEMENTS ===\n${interactiveSection}\n\n=== PAGE TEXT CONTENT ===\n${contentSection}\n\n=== ALL VISIBLE TEXT ===\n${rawTextSection}\n\n=== PAGE STRUCTURE ===\n${structureSection}`;
  }

  private static extractRawVisibleText(root: Element, budget: number): string {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('#kontextly-root') || parent.closest('#kontextly-widget-mount')) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'svg'].includes(tag)) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return NodeFilter.FILTER_REJECT;
        const text = node.textContent?.trim();
        if (!text || text.length < 1) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const chunks: string[] = [];
    let total = 0;
    let node: Node | null;

    while ((node = walker.nextNode()) && total < budget) {
      const text = node.textContent?.trim();
      if (!text) continue;
      chunks.push(text);
      total += text.length + 1;
    }

    return chunks.join(' ') || '(no visible text)';
  }

  private static getScopedRoot(scopeSelector: string): Element | null {
    const elements = document.querySelectorAll(scopeSelector);
    if (elements.length === 0) return document.body;
    if (elements.length === 1) return elements[0];
    const container = document.createElement('div');
    elements.forEach(el => container.appendChild(el.cloneNode(true)));
    return container;
  }

  private static extractInteractiveElements(root: Element): string {
    const controlSelectors = [
      'form', 'input', 'textarea', 'select',
      'button', '[role="button"]',
      '[role="searchbox"]', '[role="textbox"]', '[role="combobox"]',
      '[type="submit"]',
    ];

    const seen = new Set<Element>();
    const lines: string[] = [];

    for (const sel of controlSelectors) {
      let elements: NodeListOf<Element>;
      try { elements = root.querySelectorAll(sel); } catch { continue; }

      for (const el of elements) {
        if (seen.has(el)) continue;
        if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;
        seen.add(el);

        const tagName = el.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'svg', 'path'].includes(tagName)) continue;

        const line = this.formatElementLine(el, tagName);
        if (line) lines.push(line);
      }
    }

    const allLinks = root.querySelectorAll('a[href]');
    const meaningfulLinks: { el: Element; text: string; href: string }[] = [];
    const minorLinks: { el: Element; text: string; href: string }[] = [];

    for (const el of allLinks) {
      if (seen.has(el)) continue;
      if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;

      const href = el.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('javascript:')) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      seen.add(el);

      const text = (el as HTMLElement).innerText?.trim() || '';
      if (!text || text.length < 2) continue;

      const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
      const hasHeading = el.querySelector('h1, h2, h3, h4');
      const isSearchResult = !!el.closest('[data-snc], [data-sokoban-container], .g, .hlcw0c, .MjjYud, [data-header-feature]');
      const isMainContent = !!el.closest('main, [role="main"], #center_col, #rso, #search, article, .content, [role="article"]');

      if (isSearchResult || hasHeading || isExternal || isMainContent || text.length > 20) {
        meaningfulLinks.push({ el, text, href });
      } else {
        minorLinks.push({ el, text, href });
      }
    }

    for (const { el, text, href } of meaningfulLinks.slice(0, 30)) {
      const selector = this.generateSelector(el);
      const displayText = text.length > 80 ? text.substring(0, 80) + '...' : text;
      const displayHref = href.length > 100 ? href.substring(0, 100) + '...' : href;
      lines.push(`<a href="${displayHref}">${displayText}</a>  [selector: ${selector}]`);
    }

    for (const { el, text, href } of minorLinks.slice(0, 10)) {
      const selector = this.generateSelector(el);
      const displayText = text.length > 60 ? text.substring(0, 60) + '...' : text;
      const displayHref = href.length > 80 ? href.substring(0, 80) + '...' : href;
      lines.push(`<a href="${displayHref}">${displayText}</a>  [selector: ${selector}]`);
    }

    try {
      const onclickEls = root.querySelectorAll('[onclick]');
      let onclickCount = 0;
      for (const el of onclickEls) {
        if (onclickCount >= 10) break;
        if (seen.has(el)) continue;
        if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;

        const tagName = el.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'svg', 'path', 'div', 'span'].includes(tagName)) continue;

        seen.add(el);
        const line = this.formatElementLine(el, tagName);
        if (line) { lines.push(line); onclickCount++; }
      }
    } catch {}

    return lines.length > 0 ? lines.join('\n') : '(no interactive elements found)';
  }

  private static formatElementLine(el: Element, tagName: string): string {
    const attrs = this.getElementAttrs(el);
    const text = this.getDirectText(el);
    const selector = this.generateSelector(el);
    const parentCtx = this.getParentContext(el);

    let line = `<${tagName}${attrs}>${text}</${tagName}>`;
    line += `  [selector: ${selector}]`;
    if (parentCtx) line += `  [inside: ${parentCtx}]`;
    return line;
  }

  private static getElementAttrs(el: Element): string {
    const parts: string[] = [];
    const attrNames = ['id', 'class', 'name', 'type', 'placeholder', 'value', 'href',
      'role', 'aria-label', 'title', 'alt', 'for', 'action', 'method', 'data-testid'];

    for (const name of attrNames) {
      const val = el.getAttribute(name);
      if (!val) continue;
      let safe = this.safeStringValue(val);

      if (name === 'class') {
        safe = safe.split(/\s+/).filter(c => c.length > 0 && c.length < 30).slice(0, 3).join(' ');
        if (!safe) continue;
      } else if (name === 'href') {
        safe = safe.length > 150 ? safe.substring(0, 150) + '...' : safe;
      } else {
        safe = safe.length > 50 ? safe.substring(0, 50) + '...' : safe;
      }
      parts.push(`${name}="${safe}"`);
    }

    const tagName = el.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'button' || tagName === 'select' || tagName === 'textarea') {
      if ((el as any).disabled) parts.push('disabled');
      if ((el as HTMLInputElement).readOnly) parts.push('readonly');
    }

    return parts.length > 0 ? ' ' + parts.join(' ') : '';
  }

  private static getDirectText(el: Element): string {
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim())
      .filter(t => t && t.length > 0)
      .join(' ');
    if (directText) return directText.length > 50 ? directText.substring(0, 50) + '...' : directText;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      const inner = (el as HTMLElement).innerText?.trim() || '';
      return inner.length > 50 ? inner.substring(0, 50) + '...' : inner;
    }
    return '';
  }

  private static getParentContext(el: Element): string {
    const parent = el.parentElement;
    if (!parent || parent === document.body) return '';
    const tag = parent.tagName.toLowerCase();
    const id = parent.id ? `#${parent.id}` : '';
    const role = parent.getAttribute('role');
    const label = parent.getAttribute('aria-label');
    let ctx = tag + id;
    if (role) ctx += `[role="${role}"]`;
    if (label) ctx += `[aria-label="${label.substring(0, 30)}"]`;
    return ctx;
  }

  private static extractTextContent(root: Element): string {
    const MAX_CONTENT_CHARS = 8000;
    const lines: string[] = [];
    let charCount = 0;

    const contentSelectors = [
      'h1', 'h2', 'h3', 'h4', '[role="heading"]', 'title',
      'p', 'li', 'td', 'th',
      'span[title]', 'span[aria-label]',
      '[class*="title"]', '[class*="name"]', '[class*="heading"]',
      '[class*="value"]', '[class*="amount"]', '[class*="cost"]', '[class*="price"]',
      '[class*="total"]', '[class*="stat"]', '[class*="metric"]', '[class*="count"]',
      '[class*="balance"]', '[class*="spend"]', '[class*="usage"]', '[class*="limit"]',
      '[class*="cap"]', '[class*="quota"]',
      '[id*="title"]', '[id*="name"]',
      '[data-value]', '[aria-valuenow]', '[aria-valuetext]',
      'figcaption', 'caption', 'label', 'legend',
      'dt', 'dd', 'strong', 'b', 'em',
    ];

    const seen = new Set<Element>();

    for (const sel of contentSelectors) {
      if (charCount >= MAX_CONTENT_CHARS) break;
      let elements: NodeListOf<Element>;
      try { elements = root.querySelectorAll(sel); } catch { continue; }

      for (const el of elements) {
        if (charCount >= MAX_CONTENT_CHARS) break;
        if (seen.has(el)) continue;
        if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        seen.add(el);

        const tagName = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim();
        if (!text || text.length < 2) continue;

        const truncText = text.length > 120 ? text.substring(0, 120) + '...' : text;
        const selector = this.generateSelector(el);
        const line = `<${tagName}> ${truncText}  [selector: ${selector}]`;

        lines.push(line);
        charCount += line.length + 1;
      }
    }

    return lines.length > 0 ? lines.join('\n') : '(no significant text content found)';
  }

  private static extractStructure(el: Element, depth: number, maxDepth: number, budget: number): string {
    if (depth > maxDepth || budget <= 0) return '';

    const tagName = el.tagName?.toLowerCase() || '';
    if (['script', 'style', 'noscript', 'svg', 'path', 'canvas', 'iframe', 'object', 'embed'].includes(tagName)) return '';

    const elId = this.safeStringValue(el.id);
    if (elId === 'kontextly-root' || elId === 'kontextly-widget-mount') return '';

    const indent = '  '.repeat(Math.min(depth, 3));
    const id = el.id ? ` id="${el.id}"` : '';
    const role = el.getAttribute('role') ? ` role="${el.getAttribute('role')}"` : '';
    const ariaLabel = el.getAttribute('aria-label');
    const labelAttr = ariaLabel ? ` aria-label="${ariaLabel.substring(0, 30)}"` : '';
    const text = this.getDirectText(el);

    if (el.children.length === 0) {
      const line = `${indent}<${tagName}${id}${role}${labelAttr}>${text}</${tagName}>`;
      return line.length <= budget ? line : '';
    }

    const opening = `${indent}<${tagName}${id}${role}${labelAttr}>${text ? ` "${text}"` : ''}`;
    const closing = `${indent}</${tagName}>`;
    let remaining = budget - opening.length - closing.length - 2;
    if (remaining <= 0) return '';

    const childParts: string[] = [];
    for (const child of el.children) {
      if (remaining <= 0) break;
      const childStr = this.extractStructure(child as Element, depth + 1, maxDepth, remaining);
      if (childStr) {
        childParts.push(childStr);
        remaining -= childStr.length + 1;
      }
    }

    if (childParts.length === 0 && !text && !id && !role) return '';

    return [opening, ...childParts, closing].join('\n');
  }

  static safeStringValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && value.baseVal !== undefined) return String(value.baseVal || '');
    if (typeof value === 'object') return String(value);
    return String(value);
  }

  static extractImages(scopeSelector?: string): Array<{ src: string; alt?: string; selector: string }> {
    let rootElement: Element | Document = document;
    if (scopeSelector) {
      const scopedElement = document.querySelector(scopeSelector);
      if (scopedElement) rootElement = scopedElement;
    }
    const images = (rootElement as any).querySelectorAll('img') as NodeListOf<HTMLImageElement>;
    return Array.from(images).map((img: HTMLImageElement) => ({
      src: img.src,
      alt: img.alt,
      selector: this.generateSelector(img)
    }));
  }

  static async captureImageAsBase64(imgElement: HTMLImageElement): Promise<string | null> {
    try {
      const src = imgElement.src;
      if (src.startsWith('data:')) return src;
      if (src.startsWith('blob:') || imgElement.crossOrigin !== null) {
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(imgElement, 0, 0);
        return canvas.toDataURL('image/png');
      }
      return src;
    } catch {
      return imgElement.src;
    }
  }

  private static generateSelector(element: Element): string {
    if (element.id) return `#${element.id}`;

    if (element.tagName === 'A') {
      const href = element.getAttribute('href');
      if (href && href.length > 1 && href.length <= 150 && !href.startsWith('javascript:')) {
        const hrefSelector = `a[href="${href.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
        try {
          if (document.querySelector(hrefSelector) === element) return hrefSelector;
        } catch {}
      }
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      const className = this.safeStringValue(current.className);
      if (className) {
        const classes = className.split(' ').filter(c => c && !c.includes(' '));
        if (classes.length > 0) selector += '.' + classes[0];
      }

      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children)
          .filter(el => current && el.tagName === current.tagName);
        if (siblings.length > 1 && current) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}

class ActionExecutor {
  static async executeAction(action: any): Promise<{ success: boolean; error?: string; pageChanged?: boolean; linkHref?: string }> {
    try {
      const element = await this.findElement(action.selector, action.kind, action.value);

      if (!element) {
        const debugInfo = this.getDebugInfo(action.selector, action.kind);
        return { success: false, error: `Element not found: ${action.selector}. ${debugInfo}` };
      }

      await this.waitForElementReady(element);

      switch (action.kind) {
        case 'click': return await this.clickElement(element as HTMLElement);
        case 'fill': return await this.fillElement(element as HTMLInputElement, action.value);
        case 'check':
        case 'uncheck': return await this.toggleCheckbox(element as HTMLInputElement, action.kind === 'check');
        case 'select': return await this.selectOption(element as HTMLSelectElement, action.value);
        case 'hover': return await this.hoverElement(element as HTMLElement);
        case 'scroll': return await this.scrollToElement(element as HTMLElement);
        case 'navigate': return await this.navigateToUrl(action.value, action.openInCurrentTab);
        case 'keypress': return await this.pressKey(element as HTMLElement, action.value);
        case 'focus': return await this.focusElement(element as HTMLElement);
        case 'submit': return await this.submitForm(element as HTMLFormElement);
        default: return { success: false, error: `Unknown action type: ${action.kind}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private static async findElement(selector: string, actionType?: string, value?: string): Promise<Element | null> {
    const strategies = [
      () => document.querySelector(selector),
      () => this.tryCommonSelectors(selector, actionType),
      () => this.findElementByAction(actionType, value),
      () => this.findElementFuzzy(selector, actionType)
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      for (const strategy of strategies) {
        const element = strategy();
        if (element && this.isElementVisible(element) && this.isElementInteractable(element)) return element;
      }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }

    return null;
  }

  private static tryCommonSelectors(selector: string, actionType?: string): Element | null {
    const variations = [selector, selector.replace(/\s+/g, ' ').trim(), selector.toLowerCase()];

    if (actionType === 'fill') {
      variations.push(
        'input[type="search"]', 'input[name*="search"]', 'input[placeholder*="search"]',
        'textarea[name*="search"]', '[role="searchbox"]', '#search', '.search-input',
        '[data-testid*="search"]'
      );
    } else if (actionType === 'click') {
      variations.push(
        'button[type="submit"]', 'input[type="submit"]', '[role="button"]',
        'button:not([disabled])', '.submit-button', '.search-button'
      );
    }

    for (const variant of variations) {
      try {
        const element = document.querySelector(variant);
        if (element) return element;
      } catch {}
    }

    return null;
  }

  private static findElementByAction(actionType?: string, value?: string): Element | null {
    if (actionType === 'fill') {
      const selectors = [
        'input[type="search"]', 'input[name*="search" i]', 'input[id*="search" i]',
        '[role="searchbox"]', 'input[placeholder*="search" i]', 'input[aria-label*="search" i]',
        'input[data-testid*="search" i]', 'input[name*="job" i]', 'input[placeholder*="job" i]',
        'input[name*="what" i]', 'input[placeholder*="what" i]',
        '[contenteditable="true"][role="textbox"]', '[contenteditable="true"][data-testid*="input" i]',
        '[contenteditable="true"][data-testid*="chat" i]', '[contenteditable="true"].ProseMirror',
        '[contenteditable="true"].tiptap',
        'input[type="text"]', 'textarea',
        '[contenteditable="true"]'
      ];

      for (const sel of selectors) {
        const elements = Array.from(document.querySelectorAll(sel));
        const el = elements.find(input =>
          this.isElementVisible(input) && this.isElementInteractable(input) && this.canElementBeFilled(input)
        );
        if (el) return el;
      }
      return null;
    }

    if (actionType === 'click' && value?.toLowerCase().includes('search')) {
      const searchButtons = [
        ...Array.from(document.querySelectorAll('button[type="submit"]')),
        ...Array.from(document.querySelectorAll('input[type="submit"]')),
        ...Array.from(document.querySelectorAll('button:not([disabled])')),
        ...Array.from(document.querySelectorAll('[role="button"]'))
      ].filter(btn => {
        const text = DOMExtractor.safeStringValue(btn.textContent).toLowerCase();
        const ariaLabel = DOMExtractor.safeStringValue(btn.getAttribute('aria-label')).toLowerCase();
        return text.includes('search') || ariaLabel.includes('search') || btn.closest('form') !== null;
      });

      return searchButtons.find(btn => this.isElementVisible(btn) && this.isElementInteractable(btn)) || null;
    }

    return null;
  }

  private static findElementFuzzy(selector: string, actionType?: string): Element | null {
    const parts = selector.split(/[\s>+~]/).filter(Boolean);

    for (const part of parts) {
      if (part.includes('#')) {
        const id = part.replace('#', '');
        const element = document.getElementById(id);
        if (element) return element;
      }
      if (part.includes('.')) {
        const className = part.replace(/\./g, '');
        const elements = document.getElementsByClassName(className);
        if (elements.length > 0) return elements[0];
      }
      if (/^[a-zA-Z]+$/.test(part)) {
        const elements = document.getElementsByTagName(part);
        for (const element of elements) {
          if (this.isElementVisible(element) && this.isElementInteractable(element)) return element;
        }
      }
    }

    return null;
  }

  private static isElementVisible(element: Element): boolean {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 &&
           style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  }

  private static isElementInteractable(element: Element): boolean {
    if (!element) return false;
    const htmlElement = element as HTMLElement;
    if ('disabled' in htmlElement && (htmlElement as any).disabled) return false;
    if (htmlElement.tagName === 'INPUT' && (htmlElement as HTMLInputElement).readOnly) return false;
    if (window.getComputedStyle(element).pointerEvents === 'none') return false;
    return true;
  }

  private static canElementBeFilled(element: Element): boolean {
    if (!element) return false;
    const htmlElement = element as HTMLElement;
    if (htmlElement.contentEditable === 'true' || htmlElement.getAttribute('contenteditable') === 'true') return true;
    if (htmlElement.tagName === 'TEXTAREA') return true;
    if (htmlElement.tagName === 'INPUT') {
      const inputType = (htmlElement as HTMLInputElement).type?.toLowerCase() || 'text';
      return ['text', 'search', 'url', 'tel', 'password', 'email', 'number'].includes(inputType);
    }
    return false;
  }

  private static async waitForElementReady(element: Element): Promise<void> {
    let lastRect = element.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const currentRect = element.getBoundingClientRect();
      if (Math.abs(currentRect.top - lastRect.top) < 1 && Math.abs(currentRect.left - lastRect.left) < 1) break;
      lastRect = currentRect;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private static async clickElement(element: HTMLElement): Promise<{ success: boolean; error?: string; pageChanged?: boolean; linkHref?: string }> {
    try {
      const initialUrl = window.location.href;

      const anchor = element.tagName === 'A'
        ? element as HTMLAnchorElement
        : (element.closest('a') || element.querySelector('a')) as HTMLAnchorElement | null;
      const savedHref = anchor?.href && anchor.href !== '#' && !anchor.href.startsWith('javascript:') ? anchor.href : null;

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!this.isElementInteractable(element)) {
        if (savedHref) return { success: true, pageChanged: false, linkHref: savedHref };
        return { success: false, error: 'Element is not interactable' };
      }

      if (element.tabIndex >= 0 || ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)) {
        element.focus();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      for (const event of [
        new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window, clientX: centerX, clientY: centerY }),
        new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window, clientX: centerX, clientY: centerY }),
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0, clientX: centerX, clientY: centerY }),
        new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0, clientX: centerX, clientY: centerY }),
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0, clientX: centerX, clientY: centerY })
      ]) {
        element.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      try { if (typeof element.click === 'function') element.click(); } catch {}

      if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
        const form = element.closest('form');
        if (form && (element.getAttribute('type') === 'submit' || DOMExtractor.safeStringValue(element.textContent).toLowerCase().includes('search'))) {
          try {
            await new Promise(resolve => setTimeout(resolve, 200));
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            if (typeof form.submit === 'function') form.submit();
          } catch {}
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      const pageChanged = window.location.href !== initialUrl;

      if (!pageChanged && savedHref) return { success: true, pageChanged: false, linkHref: savedHref };

      return { success: true, pageChanged };
    } catch (error) {
      return { success: false, error: `Failed to click: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private static getDebugInfo(selector: string, actionType?: string): string {
    const debugInfo: string[] = [];
    try {
      const allMatches = document.querySelectorAll(selector);
      if (allMatches.length > 0) debugInfo.push(`Found ${allMatches.length} matching elements, but none are interactable`);
      else debugInfo.push('No elements found with this selector');
    } catch { debugInfo.push('Invalid CSS selector'); }

    if (actionType === 'fill') {
      const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea, [role="searchbox"], [contenteditable="true"]');
      if (inputs.length > 0) debugInfo.push(`Found ${inputs.length} input elements that might work instead`);
    } else if (actionType === 'click') {
      const buttons = document.querySelectorAll('button, input[type="submit"], [role="button"]');
      if (buttons.length > 0) debugInfo.push(`Found ${buttons.length} clickable elements that might work instead`);
    }
    return debugInfo.join('. ');
  }

  private static async fillElement(element: HTMLInputElement, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const htmlEl = element as HTMLElement;
      const isContentEditable = htmlEl.contentEditable === 'true' || htmlEl.getAttribute('contenteditable') === 'true';

      if (isContentEditable) {
        return await this.fillContentEditable(htmlEl, value);
      }

      if (!('value' in element)) return { success: false, error: 'Element does not support text input' };

      if (element.tagName === 'INPUT') {
        const inputType = element.type?.toLowerCase() || 'text';
        if (!['text', 'search', 'url', 'tel', 'password', 'email', 'number'].includes(inputType))
          return { success: false, error: `Cannot fill input type "${inputType}"` };
      } else if (element.tagName !== 'TEXTAREA') {
        return { success: false, error: `Cannot fill element type "${element.tagName}"` };
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 300));

      element.focus();
      element.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      try { element.select(); } catch {}
      try { document.execCommand('selectAll'); } catch {}

      element.value = '';
      try { element.setSelectionRange(0, element.value.length); } catch {}

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 50));

      for (let i = 0; i < value.length; i++) {
        element.value = value.substring(0, i + 1);
        element.dispatchEvent(new InputEvent('input', { data: value[i], bubbles: true, cancelable: true, inputType: 'insertText' }));
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      for (const event of [
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
        new Event('blur', { bubbles: true, cancelable: true })
      ]) {
        element.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      if (element.value !== value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return element.value === value || element.value.includes(value)
        ? { success: true }
        : { success: false, error: `Value mismatch. Expected: "${value}", Got: "${element.value}"` };
    } catch (error) {
      return { success: false, error: `Failed to fill: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private static async fillContentEditable(element: HTMLElement, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 300));

      element.focus();
      element.click();
      await new Promise(resolve => setTimeout(resolve, 200));

      document.execCommand('selectAll', false);
      await new Promise(resolve => setTimeout(resolve, 50));
      document.execCommand('delete', false);
      await new Promise(resolve => setTimeout(resolve, 50));

      const inserted = document.execCommand('insertText', false, value);
      await new Promise(resolve => setTimeout(resolve, 100));

      if (inserted && element.textContent?.includes(value)) {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true };
      }

      element.focus();
      await new Promise(resolve => setTimeout(resolve, 100));

      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const keyCode = char.charCodeAt(0);

        if (char === '\n') {
          element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertParagraph' }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        } else {
          element.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, keyCode, which: keyCode, bubbles: true, cancelable: true }));
          element.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, keyCode, which: keyCode, bubbles: true, cancelable: true }));
          element.dispatchEvent(new InputEvent('input', { data: char, bubbles: true, cancelable: true, inputType: 'insertText' }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, keyCode, which: keyCode, bubbles: true, cancelable: true }));
        }

        if (i % 20 === 0) await new Promise(resolve => setTimeout(resolve, 1));
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      const finalText = element.textContent?.trim() || '';
      return finalText.includes(value.substring(0, 20))
        ? { success: true }
        : { success: false, error: 'Could not type into this editor. It may require manual input.' };
    } catch (error) {
      return { success: false, error: `Failed to fill contenteditable: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private static async toggleCheckbox(element: HTMLInputElement, checked: boolean): Promise<{ success: boolean; error?: string }> {
    if (element.type !== 'checkbox' && element.type !== 'radio')
      return { success: false, error: 'Element is not a checkbox or radio button' };
    element.checked = checked;
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    return { success: true };
  }

  private static async selectOption(element: HTMLSelectElement, value: string): Promise<{ success: boolean; error?: string }> {
    if (element.tagName !== 'SELECT') return { success: false, error: 'Element is not a select dropdown' };
    const options = Array.from(element.options);
    const option = options.find(opt => opt.value === value || opt.text === value);
    if (!option) return { success: false, error: `Option not found: ${value}` };
    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    return { success: true };
  }

  private static async hoverElement(element: HTMLElement): Promise<{ success: boolean; error?: string }> {
    for (const eventType of ['mouseenter', 'mouseover']) {
      element.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
    }
    return { success: true };
  }

  private static async scrollToElement(element: HTMLElement): Promise<{ success: boolean; error?: string }> {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return { success: true };
  }

  private static async navigateToUrl(url: string, openInCurrentTab?: boolean): Promise<{ success: boolean; error?: string; pageChanged?: boolean }> {
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('chrome://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    if (openInCurrentTab !== false) {
      window.location.href = normalizedUrl;
      return { success: true, pageChanged: true };
    } else {
      window.open(normalizedUrl, '_blank');
      return { success: true, pageChanged: false };
    }
  }

  private static async pressKey(element: HTMLElement, key: string): Promise<{ success: boolean; error?: string; pageChanged?: boolean }> {
    const initialUrl = window.location.href;
    element.focus();

    const keyMap: Record<string, { code: string; keyCode: number }> = {
      'Enter': { code: 'Enter', keyCode: 13 },
      'Escape': { code: 'Escape', keyCode: 27 },
      'Tab': { code: 'Tab', keyCode: 9 },
      'Backspace': { code: 'Backspace', keyCode: 8 },
      'ArrowDown': { code: 'ArrowDown', keyCode: 40 },
      'ArrowUp': { code: 'ArrowUp', keyCode: 38 },
      ' ': { code: 'Space', keyCode: 32 },
    };

    const mapped = keyMap[key] || { code: `Key${key.toUpperCase()}`, keyCode: key.charCodeAt(0) };

    const eventInit: KeyboardEventInit & { keyCode: number; which: number; charCode: number } = {
      key, code: mapped.code, keyCode: mapped.keyCode,
      which: mapped.keyCode, charCode: key === 'Enter' ? 13 : 0,
      bubbles: true, cancelable: true, composed: true,
    };

    element.dispatchEvent(new KeyboardEvent('keydown', eventInit));
    await new Promise(resolve => setTimeout(resolve, 20));
    element.dispatchEvent(new KeyboardEvent('keypress', eventInit));
    await new Promise(resolve => setTimeout(resolve, 20));

    if (key === 'Enter') {
      const form = element.closest('form');
      if (form) {
        const submitBtn = form.querySelector<HTMLElement>('[type="submit"], button:not([type="button"])');
        if (submitBtn) submitBtn.click();
        else form.requestSubmit ? form.requestSubmit() : form.submit();
      } else if (element.tagName === 'INPUT' || element.getAttribute('role') === 'combobox' || element.getAttribute('role') === 'searchbox') {
        const submitBtn = document.querySelector<HTMLElement>('[type="submit"], button[aria-label*="earch"], button[aria-label*="ubmit"]');
        if (submitBtn) submitBtn.click();
      }
    }

    element.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    await new Promise(resolve => setTimeout(resolve, 1500));

    return { success: true, pageChanged: window.location.href !== initialUrl };
  }

  private static async focusElement(element: HTMLElement): Promise<{ success: boolean; error?: string }> {
    element.focus();
    return { success: true };
  }

  private static async submitForm(element: HTMLFormElement): Promise<{ success: boolean; error?: string; pageChanged?: boolean }> {
    const initialUrl = window.location.href;
    if (element.tagName === 'FORM') element.submit();
    else {
      const form = element.closest('form');
      if (form) form.submit();
      else return { success: false, error: 'No form found to submit' };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, pageChanged: window.location.href !== initialUrl };
  }
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "bot" | "action-group" | "summary";
      text: string;
      limitReached?: boolean;
      actions?: Array<{ kind: string; description: string; success: boolean }>;
    }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [tabId, setTabId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [uiMode, setUIMode] = useState<UIMode>('panel');
  const [actionCount, setActionCount] = useState(0);
  const [contextBtnPos, setContextBtnPos] = useState<{ x: number; y: number } | null>(null);
  const activeSelectionRangeRef = useRef<Range | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const contextMapRef = useRef<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseHandledRef = useRef(false);
  const stateRestoredRef = useRef(false);
  const hoveredElRef = useRef<Element | null>(null);
  const borderAnimRef = useRef<number | null>(null);
  const borderRefsObj = useRef<{ top: HTMLDivElement | null; right: HTMLDivElement | null; bottom: HTMLDivElement | null; left: HTMLDivElement | null }>({ top: null, right: null, bottom: null, left: null });
  const chatInputRef = useRef<HTMLDivElement>(null);

  // Inline AI fill feature
  const [fillBtnPos, setFillBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [fillPromptPos, setFillPromptPos] = useState<{ x: number; y: number } | null>(null);
  const [fillPromptValue, setFillPromptValue] = useState("");
  const [fillLoading, setFillLoading] = useState(false);
  const fillTargetRef = useRef<HTMLElement | null>(null);
  const fillPromptInputRef = useRef<HTMLInputElement>(null);
  const fillPromptValueRef = useRef("");

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Inline AI fill — detect focus on text inputs
  useEffect(() => {
    const isEditable = (el: Element): boolean => {
      const tag = el.tagName;
      if (tag === 'INPUT') {
        const t = (el as HTMLInputElement).type;
        return ['text', 'search', 'email', 'url', 'tel', 'password', ''].includes(t);
      }
      if (tag === 'TEXTAREA') return true;
      if ((el as HTMLElement).contentEditable === 'true') return true;
      return false;
    };

    const isInsideKontextly = (el: Element | null): boolean => {
      while (el) {
        if (el.id === 'kontextly-root' || el.id === 'kontextly-widget-mount') return true;
        el = el.parentElement;
      }
      return false;
    };

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const showBtn = (target: HTMLElement) => {
      if (isInsideKontextly(target)) return;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      fillTargetRef.current = target;
      const rect = target.getBoundingClientRect();

      let btnX = rect.right - 34;
      const btnY = rect.top + 4;
      const btnSize = 28;

      const parent = target.parentElement;
      if (parent) {
        const siblings = parent.querySelectorAll('button, [role="button"], a, svg, img');
        siblings.forEach((sib) => {
          if (sib === target) return;
          const sibRect = sib.getBoundingClientRect();
          if (sibRect.width === 0 || sibRect.height === 0) return;
          if (Math.abs(sibRect.right - rect.right) < 50 && sibRect.top < rect.bottom && sibRect.bottom > rect.top) {
            btnX = Math.min(btnX, sibRect.left - btnSize - 6);
          }
        });
      }

      btnX = Math.max(rect.left + 4, btnX);
      setFillBtnPos({ x: btnX, y: btnY });
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && isEditable(target)) showBtn(target);
    };

    const onFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as Element | null;
      if (related && isInsideKontextly(related)) return;
      if (fillPromptPos) return;
      hideTimer = setTimeout(() => {
        setFillBtnPos(null);
        fillTargetRef.current = null;
        hideTimer = null;
      }, 300);
    };

    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
    };
  }, [fillPromptPos]);

  const handleFillBtnClick = () => {
    if (!fillTargetRef.current) return;
    const rect = fillTargetRef.current.getBoundingClientRect();
    setFillBtnPos(null);

    const promptHeight = 120;
    const promptWidth = 340;
    const margin = 8;

    let x = Math.min(rect.left, window.innerWidth - promptWidth - margin);
    x = Math.max(margin, x);

    let y: number;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove >= promptHeight + margin) {
      y = rect.top - promptHeight - margin;
    } else if (spaceBelow >= promptHeight + margin) {
      y = rect.bottom + margin;
    } else if (spaceBelow > spaceAbove) {
      y = rect.bottom + margin;
    } else {
      y = rect.top - promptHeight - margin;
    }

    y = Math.max(margin, Math.min(y, window.innerHeight - promptHeight - margin));

    setFillPromptPos({ x, y });
    setFillPromptValue("");
    fillPromptValueRef.current = "";
    setTimeout(() => fillPromptInputRef.current?.focus(), 100);
  };

  const handleFillSubmit = async () => {
    const prompt = fillPromptValueRef.current || fillPromptValue;
    if (!prompt.trim() || !fillTargetRef.current || fillLoading) return;
    setFillLoading(true);
    try {
      const existingText = fillTargetRef.current.tagName === 'INPUT' || fillTargetRef.current.tagName === 'TEXTAREA'
        ? (fillTargetRef.current as HTMLInputElement).value
        : fillTargetRef.current.textContent || '';

      const data = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'AI_FILL',
          data: {
            prompt,
            existingText: existingText.substring(0, 500),
            fieldType: fillTargetRef.current!.tagName.toLowerCase(),
            pageTitle: document.title
          }
        }, (response) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(response);
        });
      });

      if (data?.text && fillTargetRef.current) {
        const el = fillTargetRef.current;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value'
          )?.set;
          nativeSetter?.call(el, data.text);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.textContent = data.text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      }

      setFillPromptPos(null);
      setFillPromptValue("");
      fillTargetRef.current?.focus();
    } catch (e) {
      console.error('[Kontextly] Fill error:', e);
    } finally {
      setFillLoading(false);
    }
  };

  const closeFillPrompt = () => {
    setFillPromptPos(null);
    setFillPromptValue("");
    setFillLoading(false);
    fillTargetRef.current?.focus();
  };

  // Text selection detection
  useEffect(() => {
    const isInsideWidget = (el: Element | null): boolean => {
      while (el) {
        if (el.id === 'kontextly-root' || el.id === 'kontextly-widget-mount') return true;
        el = el.parentElement;
      }
      return false;
    };

    const onMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setContextBtnPos(null);
          return;
        }
        const anchorNode = sel.anchorNode;
        if (anchorNode && isInsideWidget(anchorNode instanceof Element ? anchorNode : anchorNode.parentElement)) return;

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        activeSelectionRangeRef.current = range.cloneRange();
        setContextBtnPos({ x: rect.right - 16, y: rect.top - 36 });
      }, 10);
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.kontextly-context-btn')) return;
      activeSelectionRangeRef.current = null;
      setContextBtnPos(null);
      hoveredElRef.current = null;
      setHoverRect(null);
    };

    const onSelectionScroll = () => {
      if (activeSelectionRangeRef.current) {
        const rect = activeSelectionRangeRef.current.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          activeSelectionRangeRef.current = null;
          setContextBtnPos(null);
        } else if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setContextBtnPos(null);
        } else {
          setContextBtnPos({ x: rect.right - 16, y: rect.top - 36 });
        }
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onSelectionScroll, true);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onSelectionScroll, true);
    };
  }, []);

  // Paragraph hover detection
  useEffect(() => {
    const textTags = new Set(['P', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'LI', 'TD', 'TH', 'DD', 'DT', 'FIGCAPTION']);
    const minTextLength = 40;

    const isInsideWidget = (el: Element | null): boolean => {
      while (el) {
        if (el.id === 'kontextly-root' || el.id === 'kontextly-widget-mount') return true;
        el = el.parentElement;
      }
      return false;
    };

    const isTextContainer = (el: Element): boolean => {
      if (textTags.has(el.tagName)) return true;
      if (el.tagName === 'DIV') {
        const text = el.textContent || '';
        const childDivs = el.querySelectorAll('div, section, article');
        return text.length >= minTextLength && childDivs.length === 0;
      }
      return false;
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (isInsideWidget(target)) return;
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        hoveredElRef.current = null;
        setHoverRect(null);
        return;
      }

      let el: Element | null = target;
      while (el) {
        if (isTextContainer(el) && (el.textContent || '').trim().length >= minTextLength) {
          if (hoveredElRef.current === el) return;
          hoveredElRef.current = el;
          const rect = el.getBoundingClientRect();
          setHoverRect(rect);
          return;
        }
        el = el.parentElement;
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as Element | null;
      if (!related || isInsideWidget(related)) return;
      if (hoveredElRef.current && !hoveredElRef.current.contains(related)) {
        hoveredElRef.current = null;
        setHoverRect(null);
      }
    };

    const onScroll = () => {
      if (hoveredElRef.current) {
        const rect = hoveredElRef.current.getBoundingClientRect();
        setHoverRect(rect);
      }
    };

    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  // Animated border animation loop
  useEffect(() => {
    if (!hoverRect) {
      if (borderAnimRef.current) cancelAnimationFrame(borderAnimRef.current);
      return;
    }
    const animate = () => {
      const now = Date.now() / 1000;
      const speed = 0.6;
      const topX = Math.sin(now * speed) * 100;
      const rightY = Math.cos(now * speed) * 100;
      const bottomX = Math.sin(now * speed + Math.PI) * 100;
      const leftY = Math.cos(now * speed + Math.PI) * 100;
      if (borderRefsObj.current.top) borderRefsObj.current.top.style.transform = `translateX(${topX}%)`;
      if (borderRefsObj.current.right) borderRefsObj.current.right.style.transform = `translateY(${rightY}%)`;
      if (borderRefsObj.current.bottom) borderRefsObj.current.bottom.style.transform = `translateX(${bottomX}%)`;
      if (borderRefsObj.current.left) borderRefsObj.current.left.style.transform = `translateY(${leftY}%)`;
      borderAnimRef.current = requestAnimationFrame(animate);
    };
    borderAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (borderAnimRef.current) cancelAnimationFrame(borderAnimRef.current);
    };
  }, [hoverRect]);

  const insertContextChip = useCallback((contextText: string) => {
    const el = chatInputRef.current;
    if (!el) return;
    // Deduplicate
    const existing = el.querySelectorAll('.kontextly-input-chip');
    for (const chip of existing) {
      if ((chip as HTMLElement).dataset.text === contextText) return;
    }
    const words = contextText.split(/\s+/).slice(0, 3).join(' ');
    const lineCount = contextText.split('\n').filter(l => l.trim()).length;
    const label = lineCount > 1 ? `${words}... (${lineCount} lines)` : `${words}...`;
    const chip = document.createElement('span');
    chip.className = 'kontextly-input-chip';
    chip.contentEditable = 'false';
    chip.dataset.text = contextText;
    chip.title = contextText.substring(0, 300);
    chip.innerHTML = `<span class="kontextly-input-chip-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg></span><span class="kontextly-input-chip-label">${label}</span>`;
    // Zero-width space after chip so cursor can land there
    const spacer = document.createTextNode('\u200B');
    // Insert at cursor position
    const selection = el.ownerDocument.getSelection();
    if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(spacer);
      range.insertNode(chip);
      // Move cursor after spacer
      range.setStartAfter(spacer);
      range.setEndAfter(spacer);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      el.appendChild(chip);
      el.appendChild(spacer);
    }
    // Store context text in map
    contextMapRef.current.set(label, contextText);
  }, []);

  const handleContextAdd = useCallback(() => {
    const sel = window.getSelection();
    let text = '';
    if (sel && !sel.isCollapsed) {
      text = sel.toString().trim();
      sel.removeAllRanges();
    } else if (hoveredElRef.current) {
      text = (hoveredElRef.current.textContent || '').trim();
    }
    if (!text) return;
    insertContextChip(text);
    setTimeout(() => chatInputRef.current?.focus(), 0);
    setContextBtnPos(null);
    setHoverRect(null);
    hoveredElRef.current = null;
    setIsOpen(true);
    setUIMode('panel');
  }, [insertContextChip]);

  useEffect(() => {
    chrome.storage.local.get(['session'], (result) => {
      setIsAuthenticated(!!result.session?.token);
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.session) {
        const wasAuth = !!changes.session.oldValue?.token;
        const isAuth = !!changes.session.newValue?.token;
        setIsAuthenticated(isAuth);
        if (wasAuth !== isAuth) {
          setMessages([]);
          setSessionId(null);
          setIsLoading(false);
          setStatusMessage("");
          setUIMode('panel');
          setActionCount(0);
          if (chatInputRef.current) {
            chatInputRef.current.innerHTML = '';
            chatInputRef.current.classList.add('kontextly-empty');
          }
          if (tabId) {
            chrome.storage.local.remove(`kontextly-state-${tabId}`);
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (response) => {
      if (chrome.runtime.lastError || !response?.tabId) return;
      const tid = response.tabId;
      setTabId(tid);

      const stateKey = `kontextly-state-${tid}`;
      chrome.storage.local.get([stateKey], (result) => {
        const saved = result[stateKey];
        if (saved && saved.messages?.length > 0) {
          setMessages(saved.messages);
          if (saved.sessionId) setSessionId(saved.sessionId);
          if (saved.isOpen) setIsOpen(true);
          if (saved.uiMode) setUIMode(saved.uiMode);
          if (saved.actionCount) setActionCount(saved.actionCount);
          if (saved.isLoading) {
            chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' }, (status) => {
              if (chrome.runtime.lastError || !status?.hasActiveSession) {
                setIsLoading(false);
                setStatusMessage("");
                setUIMode('panel');
              } else {
                setIsLoading(true);
                setStatusMessage("Continuing...");
              }
            });
          }
        }
        stateRestoredRef.current = true;
      });
    });
  }, []);

  useEffect(() => {
    if (tabId === null || !stateRestoredRef.current) return;
    const stateKey = `kontextly-state-${tabId}`;
    chrome.storage.local.set({
      [stateKey]: { messages, sessionId, isOpen, isLoading, uiMode, actionCount }
    });
  }, [messages, sessionId, isOpen, isLoading, uiMode, actionCount, tabId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage, isLoading]);

  useEffect(() => {
    let lastUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setStatusMessage("");
      }
    };

    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('hashchange', checkUrlChange);

    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setStatusMessage("");
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('popstate', checkUrlChange);
      window.removeEventListener('hashchange', checkUrlChange);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleMessage = (message: any, sender: any, sendResponse: any) => {
      try {
        switch (message.type) {
          case 'STATUS_UPDATE':
            if (message.status === 'popup_detected') {
              setMessages(m => [...m, {
                role: "bot",
                text: "A popup window opened (likely for authentication). Please complete the process there, then let me know when you're done."
              }]);
              setIsLoading(false);
              setStatusMessage("");
              setUIMode('panel');
            } else {
              if ((window as any).__kontextlyRecoveryTimer) {
                clearTimeout((window as any).__kontextlyRecoveryTimer);
                delete (window as any).__kontextlyRecoveryTimer;
              }
              setIsLoading(true);
              setStatusMessage(message.status);
              setUIMode('progress-bar');
              if (message.completedActions?.length > 0) {
                setActionCount(message.completedActions.length);
                setMessages(m => {
                  const newMessages = [...m];
                  const lastUserIdx = newMessages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);
                  const groupIdx = newMessages.findIndex((msg, i) => i > lastUserIdx && msg.role === 'action-group');
                  const actionGroup = {
                    role: 'action-group' as const,
                    text: '',
                    actions: message.completedActions as Array<{ kind: string; description: string; success: boolean }>
                  };
                  if (groupIdx >= 0) newMessages[groupIdx] = actionGroup;
                  else newMessages.push(actionGroup);
                  return newMessages;
                });
              }
            }
            sendResponse({ success: true });
            break;

          case 'GET_PAGE_CONTEXT':
            try {
              const context = DOMExtractor.extractPageContext(message.scopeSelector);
              sendResponse({ pageContext: context });
            } catch (error) {
              sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
            break;

          case 'GET_SCOPED_CONTEXT':
            try {
              const scopedContext = DOMExtractor.extractPageContext(message.scopeSelector);
              const images = message.includeImages ? DOMExtractor.extractImages(message.scopeSelector) : [];
              sendResponse({ pageContext: { ...scopedContext, images } });
            } catch (error) {
              sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
            break;

          case 'ACTION_LOG': {
            const a = message.action;
            setActionCount(c => c + 1);
            setMessages(m => {
              const last = m[m.length - 1];
              if (last && last.role === 'action-group') {
                const updated = [...m];
                updated[updated.length - 1] = {
                  ...last,
                  actions: [...(last.actions || []), { kind: a.kind, description: a.description, success: a.success }]
                };
                return updated;
              }
              return [...m, {
                role: 'action-group' as const,
                text: '',
                actions: [{ kind: a.kind, description: a.description, success: a.success }]
              }];
            });
            sendResponse({ success: true });
            break;
          }

          case 'EXECUTE_ACTION':
            ActionExecutor.executeAction(message.action)
              .then(result => sendResponse(result))
              .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }));
            return true;

          case 'URL_CHANGED':
            setStatusMessage("");
            sendResponse({ success: true });
            break;

          case 'CHAT_RESPONSE': {
            if (responseHandledRef.current) {
              sendResponse({ success: true });
              break;
            }
            responseHandledRef.current = true;
            const data = message.data;
            setIsLoading(false);
            setStatusMessage("");
            setUIMode('panel');
            setIsOpen(true);
            setActionCount(0);
            if (data?.sessionId) setSessionId(data.sessionId);
            if (data?.error) {
              setMessages(m => [...m, { role: "bot", text: data.message || data.error }]);
            } else if (data?.limitReached) {
              setMessages(m => [...m, { role: "bot", text: data.content || data.message, limitReached: true }]);
            } else if (data?.type === 'message' && data.content) {
              setMessages(m => {
                const newMessages = [...m];
                if (data.completedActions?.length > 0) {
                  const lastUserIdx = newMessages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);
                  const groupIdx = newMessages.findIndex((msg, i) => i > lastUserIdx && msg.role === 'action-group');
                  const actionGroup = {
                    role: 'action-group' as const,
                    text: '',
                    actions: data.completedActions as Array<{ kind: string; description: string; success: boolean }>
                  };
                  if (groupIdx >= 0) newMessages[groupIdx] = actionGroup;
                  else newMessages.push(actionGroup);
                }
                const lastUserMsgIdx = newMessages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);
                const hasActions = newMessages.some((msg, i) => i > lastUserMsgIdx && msg.role === 'action-group');
                newMessages.push({ role: hasActions ? 'summary' as const : 'bot' as const, text: data.content });
                return newMessages;
              });
            }
            sendResponse({ success: true });
            break;
          }

          default:
            sendResponse({ error: 'Unknown message type' });
            break;
        }
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: 'STOP_AUTOMATION' }, () => {
      setIsLoading(false);
      setStatusMessage("");
      setUIMode('panel');
      setIsOpen(true);
      setActionCount(0);
      setMessages(m => [...m, { role: "bot", text: "Automation stopped." }]);
    });
  };

  const getInputContent = (): { display: string; message: string; hasContent: boolean } => {
    const el = chatInputRef.current;
    if (!el) return { display: '', message: '', hasContent: false };
    let display = '';
    let message = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        display += node.textContent || '';
        message += node.textContent || '';
      } else if (node instanceof HTMLElement && node.classList.contains('kontextly-input-chip')) {
        const ctxText = node.dataset.text || '';
        const label = node.querySelector('.kontextly-input-chip-label')?.textContent || '';
        display += label;
        message += `[Referenced context: "${ctxText.substring(0, 500)}"]`;
      }
    }
    return { display: display.trim(), message: message.trim(), hasContent: display.trim().length > 0 || el.querySelector('.kontextly-input-chip') !== null };
  };

  const handleSend = async () => {
    const { display, message: userMessage, hasContent } = getInputContent();
    if (!hasContent || isLoading) return;

    setMessages(m => [...m, { role: "user", text: display || 'Explain this context' }]);
    if (chatInputRef.current) {
      chatInputRef.current.innerHTML = '';
      chatInputRef.current.classList.add('kontextly-empty');
      setInput('');
    }
    contextMapRef.current.clear();
    setIsLoading(true);
    setStatusMessage("Analyzing your request...");
    setActionCount(0);
    responseHandledRef.current = false;

    try {
      const pageContext = DOMExtractor.extractPageContext();

      chrome.runtime.sendMessage({
        type: 'SEND_CHAT_MESSAGE',
        data: { message: userMessage, pageContext }
      }, (response) => {
        if (responseHandledRef.current) return;
        responseHandledRef.current = true;

        setIsLoading(false);
        setStatusMessage("");
        setUIMode('panel');
        setActionCount(0);

        if (chrome.runtime.lastError) {
          setMessages(m => [...m, { role: "bot", text: `Connection error: ${chrome.runtime.lastError?.message || 'Unknown error'}. Please refresh and try again.` }]);
          return;
        }

        if (!response) {
          setMessages(m => [...m, { role: "bot", text: "No response from automation service. Please check your connection." }]);
          return;
        }

        if (response.error) {
          setMessages(m => [...m, { role: "bot", text: response.message || response.error }]);
          return;
        }

        if (response.sessionId) setSessionId(response.sessionId);

        if (response.limitReached) {
          setMessages(m => [...m, { role: "bot", text: response.content || response.message, limitReached: true }]);
          return;
        }

        if (response.type === 'message' && response.content) {
          setMessages(m => {
            const newMessages = [...m];
            if (response.completedActions?.length > 0) {
              const lastUserIdx = newMessages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);
                  const groupIdx = newMessages.findIndex((msg, i) => i > lastUserIdx && msg.role === 'action-group');
              const actionGroup = {
                role: 'action-group' as const,
                text: '',
                actions: response.completedActions as Array<{ kind: string; description: string; success: boolean }>
              };
              if (groupIdx >= 0) newMessages[groupIdx] = actionGroup;
              else newMessages.push(actionGroup);
            }
            const lastUserMsgIdx = newMessages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);
                const hasActions = newMessages.some((msg, i) => i > lastUserMsgIdx && msg.role === 'action-group');
            newMessages.push({ role: hasActions ? 'summary' as const : 'bot' as const, text: response.content });
            return newMessages;
          });
        }
      });
    } catch (error) {
      setIsLoading(false);
      setStatusMessage("");
      setUIMode('panel');
      setActionCount(0);
      setMessages(m => [...m, { role: "bot", text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+Z is handled natively by contenteditable
  };

  if (isFullscreen) return null;

  const showPanel = isOpen && uiMode === 'panel';
  const showProgressBar = uiMode === 'progress-bar' && isLoading;
  const showTabHandle = !showPanel && !showProgressBar;

  return (
    <div id="kontextly-root">
      <style>{STYLES}</style>

      <div className={`kontextly-side-panel ${showPanel ? 'open' : 'closed'}`}>
        <div className="kontextly-chat-header">
          <img src={chrome.runtime.getURL('icon32.png')} className="kontextly-chat-header-logo" alt="" />
          <span className="kontextly-chat-header-title">Kontextly</span>
          <button
            className="kontextly-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
        <div className="kontextly-chat-messages">
          {isAuthenticated === false ? (
            <div className="kontextly-welcome" style={{ textAlign: 'center' }}>
              <img src={chrome.runtime.getURL('icon128.png')} alt="" style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: 12 }} />
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sign in to Kontextly</p>
              <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>Connect your account to start automating web tasks.</p>
              <button
                onClick={() => { setIsOpen(false); chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }); }}
                style={{
                  background: 'oklch(0.55 0.2 285)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="kontextly-welcome">
              <p>Ask me to automate any web task. I can navigate, click, fill forms, and complete complex tasks through conversation.</p>
              <p style={{ marginTop: 12, fontSize: 13 }}>Try: &quot;Search for wireless headphones on Amazon&quot;</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              if (msg.role === 'action-group' && msg.actions) {
                return (
                  <React.Fragment key={i}>
                    {msg.actions.map((a, j) => (
                      <div key={`${i}-${j}`} className="kontextly-action-card">
                        <div className="kontextly-action-step">
                          <div className={`kontextly-action-icon ${a.success ? 'kontextly-action-icon-success' : 'kontextly-action-icon-fail'}`}>
                            {a.success ? '\u2713' : '\u2717'}
                          </div>
                          <span className="kontextly-action-label">{a.kind}</span>
                          <span className="kontextly-action-desc">{a.description}</span>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                );
              }
              if (msg.role === 'summary') {
                return <div key={i} className="kontextly-summary-msg">{msg.text}</div>;
              }
              return (
                <div
                  key={i}
                  className={msg.limitReached ? "kontextly-msg-limit" : msg.role === "user" ? "kontextly-msg-user" : "kontextly-msg-bot"}
                >
                  {msg.text}
                </div>
              );
            })
          )}

          {statusMessage && (
            <div className="kontextly-status-msg">
              <Loader2 size={14} className="kontextly-spinning" />
              {statusMessage}
            </div>
          )}

          {isLoading && !statusMessage && (
            <div className="kontextly-status-msg">
              <Loader2 size={14} className="kontextly-spinning" />
              Processing your request...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        {isAuthenticated !== false && (
          <div className="kontextly-chat-input-area">
            <div
              ref={chatInputRef}
              className="kontextly-chat-input"
              contentEditable={!isLoading}
              role="textbox"
              data-placeholder="Ask Kontextly to do anything..."
              onKeyDown={handleKeyDown}
              onInput={() => {
                const el = chatInputRef.current;
                if (!el) return;
                const text = el.textContent?.replace(/\u200B/g, '').trim() || '';
                const hasChips = el.querySelector('.kontextly-input-chip') !== null;
                if (!text && !hasChips) {
                  el.innerHTML = '';
                  el.classList.add('kontextly-empty');
                } else {
                  el.classList.remove('kontextly-empty');
                }
                setInput(text);
              }}
              suppressContentEditableWarning
            />
            {isLoading ? (
              <button className="kontextly-stop-btn" onClick={handleStop} aria-label="Stop automation" title="Stop automation">
                <Square size={16} />
              </button>
            ) : (
              <button className="kontextly-send-btn" onClick={handleSend} disabled={!getInputContent().hasContent} aria-label="Send">
                <Send size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {showProgressBar && (
        <div className="kontextly-progress-bar">
          <div className="kontextly-progress-track">
            <div className="kontextly-progress-fill" />
          </div>
          <span className="kontextly-progress-text">{statusMessage || 'Performing actions...'}</span>
          {actionCount > 0 && (
            <span className="kontextly-progress-actions">{actionCount} action{actionCount !== 1 ? 's' : ''}</span>
          )}
          <button
            className="kontextly-progress-expand"
            onClick={() => { setUIMode('panel'); setIsOpen(true); }}
            aria-label="Expand chat"
            title="Show full chat"
          >
            <Maximize2 size={14} />
          </button>
          <button
            className="kontextly-progress-stop"
            onClick={handleStop}
            aria-label="Stop automation"
            title="Stop automation"
          >
            <Square size={12} />
          </button>
        </div>
      )}

      {showTabHandle && (
        <button
          className="kontextly-tab-handle"
          onClick={() => { setIsOpen(true); setUIMode('panel'); }}
          aria-label="Open Kontextly"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Context selection button */}
      {contextBtnPos && (
        <button
          className="kontextly-context-btn"
          style={{ left: Math.min(contextBtnPos.x, window.innerWidth - 48), top: Math.max(contextBtnPos.y, 8) }}
          onClick={handleContextAdd}
          title="Add to Kontextly chat"
        >
          <Sparkles size={14} />
        </button>
      )}

      {/* Hover border overlay */}
      {hoverRect && (
        <div
          className="kontextly-hover-overlay"
          style={{ left: hoverRect.left - 8, top: hoverRect.top - 8, width: hoverRect.width + 16, height: hoverRect.height + 16 }}
        >
          <div className="kontextly-border-bg" />
          <div className="kontextly-border-edge kontextly-border-edge-top">
            <div className="kontextly-border-glow-h" ref={el => { borderRefsObj.current.top = el; }} />
          </div>
          <div className="kontextly-border-edge kontextly-border-edge-right">
            <div className="kontextly-border-glow-v" ref={el => { borderRefsObj.current.right = el; }} />
          </div>
          <div className="kontextly-border-edge kontextly-border-edge-bottom">
            <div className="kontextly-border-glow-h" ref={el => { borderRefsObj.current.bottom = el; }} />
          </div>
          <div className="kontextly-border-edge kontextly-border-edge-left">
            <div className="kontextly-border-glow-v" ref={el => { borderRefsObj.current.left = el; }} />
          </div>
          <button
            className="kontextly-context-btn"
            style={{ position: 'absolute', top: -16, right: -16, pointerEvents: 'auto' }}
            onClick={handleContextAdd}
            title="Add to Kontextly chat"
          >
            <Sparkles size={14} />
          </button>
        </div>
      )}

      {/* Inline AI fill button */}
      {fillBtnPos && !fillPromptPos && isAuthenticated !== false && (
        <button
          className="kontextly-fill-btn"
          style={{ left: fillBtnPos.x, top: fillBtnPos.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleFillBtnClick}
          title="AI Fill"
        >
          <Sparkles size={13} />
        </button>
      )}

      {/* Inline AI fill prompt */}
      {fillPromptPos && (
        <div
          className="kontextly-fill-prompt"
          style={{ left: fillPromptPos.x, top: fillPromptPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="kontextly-fill-prompt-row">
            <div className="kontextly-fill-prompt-label">AI Fill</div>
            <button
              onClick={closeFillPrompt}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: 4,
                color: 'oklch(0.5 0 0)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'oklch(0.8 0 0)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'oklch(0.5 0 0)')}
            >
              <X size={14} />
            </button>
          </div>
          {fillLoading ? (
            <div className="kontextly-fill-loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.49-8.49l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
              </svg>
              Generating...
            </div>
          ) : (
            <>
              <input
                ref={fillPromptInputRef}
                className="kontextly-fill-prompt-input"
                type="text"
                placeholder="Describe what to write..."
                value={fillPromptValue}
                onChange={(e) => { fillPromptValueRef.current = e.target.value; setFillPromptValue(e.target.value); }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFillSubmit();
                  }
                  if (e.key === 'Escape') closeFillPrompt();
                }}
              />
              <div className="kontextly-fill-prompt-row">
                <span className="kontextly-fill-prompt-hint">Enter to submit · Esc to cancel</span>
                <button
                  className="kontextly-fill-prompt-submit"
                  onClick={handleFillSubmit}
                  disabled={!fillPromptValue.trim()}
                >
                  Fill
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const contentType = document.contentType || '';
const isHtmlPage = contentType.includes('html') || !contentType;
const isSpecialPage = /^(chrome|chrome-extension|moz-extension|about|data):/.test(window.location.protocol);

if (isHtmlPage && !isSpecialPage && document.body) {
  const root = document.createElement("div");
  root.id = "kontextly-widget-mount";
  document.body.appendChild(root);
  createRoot(root).render(
    <React.StrictMode>
      <ChatWidget />
    </React.StrictMode>
  );
}
