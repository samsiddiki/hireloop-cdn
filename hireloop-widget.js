(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const WIDGET_CONFIG = {
    apiBase: document.currentScript?.getAttribute('data-api') || 'https://localhost:5260',
    widgetToken: document.currentScript?.getAttribute('data-token') || '',
    position: document.currentScript?.getAttribute('data-position') || 'bottom-right',
  };

  // ─── STATE ─────────────────────────────────────────────────────────────────
  const state = {
    step: 'idle',
    email: '',
    sessionId: null,
    jobId: null,
    applicationId: null,
    job: null,
    questions: [],
    answers: {},
    currentQuestion: 0,
    isOpen: false,
  };

  // ─── STYLES ────────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

    :root {
      --hl-ink: #0e0e0e;
      --hl-ink-2: #3a3a3a;
      --hl-ink-3: #7a7a7a;
      --hl-paper: #fafaf8;
      --hl-paper-2: #f2f1ed;
      --hl-paper-3: #e8e6e0;
      --hl-accent: #1a472a;
      --hl-accent-light: #2d6a44;
      --hl-accent-pale: #e8f0eb;
      --hl-danger: #c0392b;
      --hl-danger-pale: #fdf0ef;
      --hl-gold: #c9a84c;
      --hl-shadow: 0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08);
      --hl-radius: 16px;
      --hl-radius-sm: 10px;
    }

    #hl-launcher {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 999998;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-family: 'DM Sans', sans-serif;
    }

    /* Tooltip wrapper for the button area */
    .hl-tooltip-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    /* Badge text above the button */
    .hl-verified-badge {
      background: linear-gradient(135deg, var(--hl-accent) 0%, var(--hl-accent-light) 100%);
      color: white;
      font-size: 11px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 20px;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      animation: hlFadeInUp 0.3s ease-out;
    }

    .hl-verified-badge::before {
      content: '✓';
      font-size: 12px;
      font-weight: bold;
    }

    @keyframes hlFadeInUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Enhanced tooltip with more info */
    #hl-enhanced-tooltip {
      background: var(--hl-ink);
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 400;
      padding: 10px 16px;
      border-radius: 12px;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
      letter-spacing: 0.01em;
      line-height: 1.4;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      max-width: 220px;
      white-space: normal;
      text-align: center;
    }

    #hl-enhanced-tooltip::after {
      content: '';
      position: absolute;
      right: 24px;
      bottom: -5px;
      width: 10px;
      height: 10px;
      background: var(--hl-ink);
      transform: rotate(45deg);
      border-radius: 2px;
    }

    .hl-tooltip-wrapper:hover #hl-enhanced-tooltip {
      opacity: 1;
      transform: translateY(0);
    }

    #hl-bubble {
      background: var(--hl-accent);
      color: white;
      border: none;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(26,71,42,0.38), 0 2px 8px rgba(0,0,0,0.12);
      transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }

    #hl-bubble::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), transparent 60%);
      border-radius: 50%;
    }

    #hl-bubble:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 12px 40px rgba(26,71,42,0.45), 0 4px 12px rgba(0,0,0,0.15);
    }

    /* Notification indicator on button */
    #hl-bubble::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 10px;
      background: var(--hl-gold);
      border-radius: 50%;
      border: 2px solid var(--hl-accent);
      opacity: 0;
      transition: opacity 0.2s;
    }

    #hl-bubble.has-notification::after {
      opacity: 1;
    }

    #hl-bubble svg { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1); }
    #hl-bubble.open svg.chat-icon { transform: scale(0) rotate(90deg); }
    #hl-bubble.open svg.close-icon { transform: scale(1) rotate(0deg); }
    #hl-bubble svg.close-icon { position: absolute; transform: scale(0) rotate(-90deg); }

    /* Panel shadow enhancement */
    #hl-panel {
      position: fixed;
      bottom: 104px;
      right: 28px;
      width: 380px;
      max-height: 600px;
      background: var(--hl-paper);
      border-radius: var(--hl-radius);
      box-shadow: var(--hl-shadow);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      transform: scale(0.88) translateY(12px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.32s cubic-bezier(.34,1.28,.64,1), opacity 0.22s ease;
      border: 1px solid var(--hl-paper-3);
    }

    #hl-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* Rest of the CSS remains the same */
    .hl-header {
      background: var(--hl-accent);
      padding: 20px 22px 18px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .hl-header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 140px; height: 140px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
    }

    .hl-header::after {
      content: '';
      position: absolute;
      bottom: -20px; left: -20px;
      width: 90px; height: 90px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
    }

    .hl-header-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .hl-logo-mark {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
      flex-shrink: 0;
    }

    .hl-brand {
      font-family: 'DM Serif Display', serif;
      font-size: 15px;
      color: rgba(255,255,255,0.95);
      letter-spacing: 0.02em;
    }

    .hl-powered {
      font-size: 10px;
      color: rgba(255,255,255,0.45);
      margin-left: auto;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .hl-job-title {
      font-family: 'DM Serif Display', serif;
      font-size: 19px;
      color: white;
      line-height: 1.25;
      margin-bottom: 4px;
      position: relative;
    }

    .hl-company {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      font-weight: 400;
      letter-spacing: 0.02em;
    }

    .hl-progress {
      height: 2px;
      background: rgba(255,255,255,0.15);
      position: relative;
      flex-shrink: 0;
    }

    .hl-progress-fill {
      height: 100%;
      background: var(--hl-gold);
      transition: width 0.5s cubic-bezier(.4,0,.2,1);
    }

    .hl-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    }

    .hl-body::-webkit-scrollbar { width: 4px; }
    .hl-body::-webkit-scrollbar-track { background: transparent; }
    .hl-body::-webkit-scrollbar-thumb { background: var(--hl-paper-3); border-radius: 4px; }

    .hl-msg {
      display: flex;
      gap: 10px;
      animation: hlSlideIn 0.3s cubic-bezier(.34,1.28,.64,1) both;
    }

    @keyframes hlSlideIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .hl-msg-avatar {
      width: 28px; height: 28px;
      background: var(--hl-accent-pale);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .hl-msg-bubble {
      background: var(--hl-paper-2);
      border-radius: 4px 14px 14px 14px;
      padding: 12px 14px;
      max-width: calc(100% - 42px);
      font-size: 13.5px;
      line-height: 1.55;
      color: var(--hl-ink-2);
      border: 1px solid var(--hl-paper-3);
    }

    .hl-msg.user {
      flex-direction: row-reverse;
    }

    .hl-msg.user .hl-msg-bubble {
      background: var(--hl-accent);
      color: white;
      border-radius: 14px 4px 14px 14px;
      border-color: transparent;
      font-size: 13.5px;
    }

    .hl-typing {
      display: flex; gap: 4px; align-items: center;
      padding: 4px 2px;
    }

    .hl-typing span {
      width: 6px; height: 6px;
      background: var(--hl-ink-3);
      border-radius: 50%;
      animation: hlBounce 1.2s infinite;
    }

    .hl-typing span:nth-child(2) { animation-delay: 0.18s; }
    .hl-typing span:nth-child(3) { animation-delay: 0.36s; }

    @keyframes hlBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    .hl-footer {
      padding: 14px 16px;
      border-top: 1px solid var(--hl-paper-3);
      background: var(--hl-paper);
      flex-shrink: 0;
    }

    .hl-input-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .hl-input {
      flex: 1;
      background: var(--hl-paper-2);
      border: 1.5px solid var(--hl-paper-3);
      border-radius: var(--hl-radius-sm);
      padding: 10px 14px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13.5px;
      color: var(--hl-ink);
      outline: none;
      transition: border-color 0.18s;
      resize: none;
      line-height: 1.45;
      max-height: 100px;
    }

    .hl-input::placeholder { color: var(--hl-ink-3); }
    .hl-input:focus { border-color: var(--hl-accent); background: white; }

    .hl-send-btn {
      width: 38px; height: 38px;
      background: var(--hl-accent);
      border: none;
      border-radius: var(--hl-radius-sm);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.18s, transform 0.15s;
    }

    .hl-send-btn:hover { background: var(--hl-accent-light); transform: scale(1.05); }
    .hl-send-btn:disabled { background: var(--hl-paper-3); cursor: not-allowed; transform: none; }

    .hl-otp-row {
      display: flex; gap: 8px; justify-content: center;
      margin: 4px 0;
    }

    .hl-otp-box {
      width: 42px; height: 50px;
      text-align: center;
      font-family: 'DM Serif Display', serif;
      font-size: 22px;
      background: var(--hl-paper-2);
      border: 1.5px solid var(--hl-paper-3);
      border-radius: var(--hl-radius-sm);
      color: var(--hl-ink);
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s;
      caret-color: var(--hl-accent);
    }

    .hl-otp-box:focus {
      border-color: var(--hl-accent);
      box-shadow: 0 0 0 3px var(--hl-accent-pale);
    }

    .hl-otp-box.filled { border-color: var(--hl-accent); }

    .hl-upload-zone {
      border: 2px dashed var(--hl-paper-3);
      border-radius: var(--hl-radius-sm);
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.18s, background 0.18s;
      position: relative;
    }

    .hl-upload-zone:hover, .hl-upload-zone.drag {
      border-color: var(--hl-accent);
      background: var(--hl-accent-pale);
    }

    .hl-upload-zone input[type=file] {
      position: absolute; inset: 0; opacity: 0; cursor: pointer;
    }

    .hl-upload-icon {
      width: 40px; height: 40px;
      background: var(--hl-accent-pale);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 10px;
    }

    .hl-upload-label {
      font-size: 13px;
      color: var(--hl-ink-2);
      line-height: 1.5;
    }

    .hl-upload-label strong { color: var(--hl-accent); }
    .hl-upload-hint { font-size: 11px; color: var(--hl-ink-3); margin-top: 4px; }

    .hl-file-selected {
      display: flex; align-items: center; gap: 10px;
      background: var(--hl-accent-pale);
      border-radius: var(--hl-radius-sm);
      padding: 10px 14px;
      font-size: 13px;
      color: var(--hl-accent);
      font-weight: 500;
    }

    .hl-btn {
      width: 100%;
      padding: 12px;
      background: var(--hl-accent);
      color: white;
      border: none;
      border-radius: var(--hl-radius-sm);
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.02em;
      transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }

    .hl-btn:hover {
      background: var(--hl-accent-light);
      box-shadow: 0 4px 16px rgba(26,71,42,0.28);
      transform: translateY(-1px);
    }

    .hl-btn:disabled {
      background: var(--hl-paper-3);
      color: var(--hl-ink-3);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .hl-btn.secondary {
      background: transparent;
      color: var(--hl-accent);
      border: 1.5px solid var(--hl-accent);
      margin-top: 8px;
      font-size: 13px;
      padding: 10px;
    }

    .hl-btn.secondary:hover { background: var(--hl-accent-pale); box-shadow: none; }

    .hl-status-screen {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 12px; padding: 8px 0 4px;
    }

    .hl-status-icon {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 4px;
    }

    .hl-status-icon.success { background: var(--hl-accent-pale); }
    .hl-status-icon.error   { background: var(--hl-danger-pale); }

    .hl-status-title {
      font-family: 'DM Serif Display', serif;
      font-size: 20px;
      color: var(--hl-ink);
      line-height: 1.2;
    }

    .hl-status-sub {
      font-size: 13px;
      color: var(--hl-ink-3);
      line-height: 1.6;
      max-width: 260px;
    }

    .hl-screening {
      display: flex; flex-direction: column; align-items: center;
      gap: 16px; padding: 16px 0;
    }

    .hl-scan-ring {
      width: 64px; height: 64px;
      border-radius: 50%;
      border: 3px solid var(--hl-accent-pale);
      border-top-color: var(--hl-accent);
      animation: hlSpin 0.9s linear infinite;
      position: relative;
    }

    .hl-scan-ring::after {
      content: '';
      position: absolute;
      inset: 8px;
      border-radius: 50%;
      border: 2px solid var(--hl-accent-pale);
      border-top-color: var(--hl-gold);
      animation: hlSpin 1.4s linear infinite reverse;
    }

    @keyframes hlSpin { to { transform: rotate(360deg); } }

    .hl-scan-steps {
      display: flex; flex-direction: column; gap: 6px; width: 100%;
    }

    .hl-scan-step {
      display: flex; align-items: center; gap: 10px;
      font-size: 12.5px; color: var(--hl-ink-3);
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--hl-paper-2);
      transition: all 0.3s;
    }

    .hl-scan-step.active {
      color: var(--hl-accent);
      background: var(--hl-accent-pale);
      font-weight: 500;
    }

    .hl-scan-step.done {
      color: var(--hl-ink-3);
    }

    .hl-step-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--hl-paper-3); flex-shrink: 0;
      transition: background 0.3s;
    }

    .hl-scan-step.active .hl-step-dot { background: var(--hl-accent); }
    .hl-scan-step.done .hl-step-dot { background: var(--hl-gold); }

    .hl-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }

    .hl-tag {
      font-size: 11.5px; padding: 3px 10px;
      border-radius: 20px; font-weight: 500;
    }

    .hl-tag.matched { background: var(--hl-accent-pale); color: var(--hl-accent); }
    .hl-tag.missing { background: var(--hl-danger-pale); color: var(--hl-danger); }

    .hl-link {
      color: var(--hl-accent); text-decoration: none;
      font-size: 12.5px; font-weight: 500;
      cursor: pointer; border: none; background: none;
      padding: 0; font-family: 'DM Sans', sans-serif;
    }

    .hl-link:hover { text-decoration: underline; }

    .hl-divider {
      text-align: center; font-size: 11px;
      color: var(--hl-ink-3); letter-spacing: 0.06em;
      text-transform: uppercase; position: relative;
    }

    .hl-divider::before, .hl-divider::after {
      content: ''; position: absolute;
      top: 50%; width: calc(50% - 40px);
      height: 1px; background: var(--hl-paper-3);
    }

    .hl-divider::before { left: 0; }
    .hl-divider::after  { right: 0; }

    .hl-notice {
      font-size: 12px; padding: 10px 12px;
      border-radius: 8px; line-height: 1.5;
    }

    .hl-notice.error { background: var(--hl-danger-pale); color: var(--hl-danger); }
    .hl-notice.info  { background: var(--hl-accent-pale); color: var(--hl-accent); }

    @media (max-width: 440px) {
      #hl-panel { right: 12px; left: 12px; width: auto; bottom: 96px; }
      #hl-launcher { right: 16px; }
      .hl-verified-badge { font-size: 9px; padding: 4px 10px; white-space: normal; text-align: center; max-width: 140px; }
    }
  `;

  // ─── SVG ICONS ─────────────────────────────────────────────────────────────
  const ICONS = {
    chat: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    bot: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a472a" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 2v4M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="9" cy="16" r="1" fill="#1a472a"/><circle cx="15" cy="16" r="1" fill="#1a472a"/></svg>`,
    send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a472a" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a472a" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    check: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a472a" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    x: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    logo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  };

  // ─── API ───────────────────────────────────────────────────────────────────
  const api = {
    async get(path) {
      const res = await fetch(`${WIDGET_CONFIG.apiBase}${path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async post(path, body) {
      const res = await fetch(`${WIDGET_CONFIG.apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async postForm(path, formData) {
      const res = await fetch(`${WIDGET_CONFIG.apiBase}${path}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  };

  // ─── RENDER ENGINE ─────────────────────────────────────────────────────────
  let panel, bodyEl, progressFill, headerTitle, headerCompany;
  let selectedFile = null;

  function setProgress(pct) {
    if (progressFill) progressFill.style.width = pct + '%';
  }

  function addBotMsg(content, delay = 0) {
    return new Promise(resolve => {
      setTimeout(() => {
        const wrap = document.createElement('div');
        wrap.className = 'hl-msg bot';
        wrap.innerHTML = `
          <div class="hl-msg-avatar">${ICONS.bot}</div>
          <div class="hl-msg-bubble">${content}</div>`;
        bodyEl.appendChild(wrap);
        bodyEl.scrollTop = bodyEl.scrollHeight;
        resolve();
      }, delay);
    });
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'hl-msg bot typing-wrap';
    wrap.innerHTML = `
      <div class="hl-msg-avatar">${ICONS.bot}</div>
      <div class="hl-msg-bubble"><div class="hl-typing"><span></span><span></span><span></span></div></div>`;
    bodyEl.appendChild(wrap);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return wrap;
  }

  function removeTyping() {
    const t = bodyEl.querySelector('.typing-wrap');
    if (t) t.remove();
  }

  function addUserMsg(text) {
    const wrap = document.createElement('div');
    wrap.className = 'hl-msg user';
    wrap.innerHTML = `<div class="hl-msg-bubble">${escapeHtml(text)}</div>`;
    bodyEl.appendChild(wrap);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function clearFooter() {
    const footer = panel.querySelector('.hl-footer');
    footer.innerHTML = '';
    return footer;
  }

  async function initWidget() {
    try {
      const data = await api.get(`/api/Jobs/widget/${WIDGET_CONFIG.widgetToken}`);
      state.job = data.data || data;
      state.jobId = state.job.jobId;
      if (headerTitle) headerTitle.textContent = state.job.title || 'Open Position';
      if (headerCompany) headerCompany.textContent = state.job.companyName || '';
    } catch (err) {
      console.error('Failed to load job:', err);
      state.job = { title: 'Open Position', companyName: '' };
      if (headerTitle) headerTitle.textContent = 'Position Unavailable';
    }
    stepEmail();
  }

  // ─── Email step ──
  function stepEmail() {
    state.step = 'email';
    setProgress(15);
    bodyEl.innerHTML = '';

    addBotMsg(`👋 Welcome! I'm the HireLoop screening assistant for <strong>${escapeHtml(state.job?.title || 'this position')}</strong>.`);

    setTimeout(() => {
      addBotMsg("To get started, please enter your email address. I'll send you a quick verification code.");
      setTimeout(() => renderEmailInput(), 400);
    }, 600);
  }

  function renderEmailInput() {
    const footer = clearFooter();
    footer.innerHTML = `
      <div class="hl-input-row">
        <input class="hl-input" id="hl-email-input" type="email" placeholder="your@email.com" autocomplete="email"/>
        <button class="hl-send-btn" id="hl-email-send">${ICONS.send}</button>
      </div>`;

    const input = footer.querySelector('#hl-email-input');
    const btn = footer.querySelector('#hl-email-send');

    input.focus();

    const submit = async () => {
      const email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.style.borderColor = 'var(--hl-danger)';
        setTimeout(() => input.style.borderColor = '', 1500);
        return;
      }

      addUserMsg(email);
      state.email = email;
      btn.disabled = true;
      input.disabled = true;

      const typing = showTyping();
      try {
        const res = await api.post('/api/Otp/send', { jobId: state.jobId, email });
        state.sessionId = res.sessionId || res.data?.sessionId;
        removeTyping();
        await addBotMsg(`✉️ A 6-digit code has been sent to <strong>${escapeHtml(email)}</strong>. Please check your inbox.`);
        stepOtp();
      } catch (err) {
        removeTyping();
        const msg = err.message.toLowerCase();
        if (msg.includes('already')) {
          await addBotMsg(`⚠️ It looks like you've already applied for this position with this email. Each email can only apply once.`);
          stepDone(false, true);
        } else {
          await addBotMsg(`Something went wrong sending the code. Please try again.`);
          btn.disabled = false;
          input.disabled = false;
        }
      }
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  // ─── OTP step ──
  function stepOtp() {
    state.step = 'otp';
    setProgress(30);

    setTimeout(() => {
      const footer = clearFooter();
      footer.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="hl-otp-row">
            ${[0,1,2,3,4,5].map(i => `<input class="hl-otp-box" maxlength="1" inputmode="numeric" data-idx="${i}" />`).join('')}
          </div>
          <button class="hl-btn" id="hl-otp-verify" disabled>Verify Code</button>
          <div style="text-align:center;">
            <button class="hl-link" id="hl-otp-resend">Resend code</button>
          </div>
        </div>`;

      const boxes = footer.querySelectorAll('.hl-otp-box');
      const verifyBtn = footer.querySelector('#hl-otp-verify');

      boxes[0].focus();

      const getCode = () => Array.from(boxes).map(b => b.value).join('');
      const checkFull = () => {
        const full = getCode().length === 6;
        verifyBtn.disabled = !full;
      };

      boxes.forEach((box, i) => {
        box.addEventListener('input', e => {
          const val = e.target.value.replace(/\D/g, '');
          box.value = val.slice(-1);
          box.classList.toggle('filled', !!box.value);
          if (val && i < 5) boxes[i + 1].focus();
          checkFull();
        });
        box.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
        });
        box.addEventListener('paste', e => {
          e.preventDefault();
          const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
          pasted.split('').forEach((ch, j) => {
            if (boxes[j]) { boxes[j].value = ch; boxes[j].classList.add('filled'); }
          });
          if (pasted.length === 6) { boxes[5].focus(); checkFull(); }
        });
      });

      verifyBtn.addEventListener('click', async () => {
        const code = getCode();
        verifyBtn.disabled = true;
        boxes.forEach(b => b.disabled = true);

        const typing = showTyping();
        try {
          await api.post('/api/Otp/verify', { sessionId: state.sessionId, otp: code });
          removeTyping();
          await addBotMsg('✅ Email verified! Now please upload your resume so I can review your application.');
          stepResume();
        } catch {
          removeTyping();
          await addBotMsg('❌ That code doesn\'t look right. Please check and try again.');
          boxes.forEach(b => { b.value = ''; b.disabled = false; b.classList.remove('filled'); });
          boxes[0].focus();
          verifyBtn.disabled = true;
        }
      });

      footer.querySelector('#hl-otp-resend').addEventListener('click', async () => {
        try {
          const res = await api.post('/api/Otp/send', { jobId: state.jobId, email: state.email });
          state.sessionId = res.sessionId || res.data?.sessionId;
          await addBotMsg('📨 New code sent! Please check your inbox.');
        } catch {
          await addBotMsg('Could not resend the code. Please try again shortly.');
        }
      });
    }, 300);
  }

  // ─── Resume step ──
  function stepResume() {
    state.step = 'resume';
    setProgress(50);
    selectedFile = null;

    const footer = clearFooter();
    footer.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="hl-upload-zone" id="hl-drop-zone">
          <input type="file" id="hl-file-input" accept=".pdf,.docx" />
          <div class="hl-upload-icon">${ICONS.upload}</div>
          <div class="hl-upload-label"><strong>Click to upload</strong> or drag & drop</div>
          <div class="hl-upload-hint">PDF or DOCX · Max 5MB · Must be text-based</div>
        </div>
        <div id="hl-file-preview" style="display:none;"></div>
        <button class="hl-btn" id="hl-resume-submit" disabled>Analyse My Resume</button>
      </div>`;

    const zone = footer.querySelector('#hl-drop-zone');
    const fileInput = footer.querySelector('#hl-file-input');
    const preview = footer.querySelector('#hl-file-preview');
    const submitBtn = footer.querySelector('#hl-resume-submit');

    const onFile = (file) => {
      if (!file) return;
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
          && !file.name.match(/\.(pdf|docx)$/i)) {
        addBotMsg('⚠️ Please upload a PDF or DOCX file only.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        addBotMsg('⚠️ File is too large. Please upload a file under 5MB.');
        return;
      }
      selectedFile = file;
      zone.style.display = 'none';
      preview.style.display = 'flex';
      preview.className = 'hl-file-selected';
      preview.innerHTML = `${ICONS.file} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(file.name)}</span> <button class="hl-link" id="hl-change-file">Change</button>`;
      preview.querySelector('#hl-change-file').addEventListener('click', () => {
        selectedFile = null;
        zone.style.display = '';
        preview.style.display = 'none';
        submitBtn.disabled = true;
        fileInput.value = '';
      });
      submitBtn.disabled = false;
    };

    fileInput.addEventListener('change', e => onFile(e.target.files[0]));
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag');
      onFile(e.dataTransfer.files[0]);
    });

    submitBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      submitBtn.disabled = true;

      addUserMsg(`📄 ${selectedFile.name}`);
      await addBotMsg('Got it! Running your resume through our AI screening engine...');
      stepScreening(selectedFile);
    });
  }

  // ─── Screening step ──
  async function stepScreening(file) {
    state.step = 'screening';
    setProgress(70);

    const footer = clearFooter();
    const steps = [
      'Parsing your resume...',
      'Extracting skills & experience...',
      'Matching against job requirements...',
      'Evaluating your profile...',
    ];

    footer.innerHTML = `
      <div class="hl-screening">
        <div class="hl-scan-ring"></div>
        <div class="hl-scan-steps">${steps.map((s, i) =>
          `<div class="hl-scan-step ${i === 0 ? 'active' : ''}" id="hl-scan-${i}">
            <div class="hl-step-dot"></div>${s}
          </div>`).join('')}
        </div>
      </div>`;

    let stepIdx = 0;
    const interval = setInterval(() => {
      const current = footer.querySelector(`#hl-scan-${stepIdx}`);
      if (current) current.classList.replace('active', 'done');
      stepIdx++;
      const next = footer.querySelector(`#hl-scan-${stepIdx}`);
      if (next) next.classList.add('active');
      if (stepIdx >= steps.length) clearInterval(interval);
    }, 1800);

    try {
      const formData = new FormData();
      formData.append('Resume', file);
      formData.append('SessionId', state.sessionId);
      formData.append('JobId', state.jobId);

      const res = await api.postForm('/api/Widget/submit-resume', formData);
      clearInterval(interval);

      if (res.passed) {
        state.applicationId = res.applicationId;
        state.questions = res.questions || [];
        setProgress(85);
        clearFooter();

        await addBotMsg(`🎉 Great news! Your profile matches the requirements for <strong>${escapeHtml(state.job?.title)}</strong>.`);

        if (state.questions && state.questions.length > 0) {
          setTimeout(() => stepQuestions(), 500);
        } else {
          setTimeout(() => stepDone(true), 500);
        }
      } else {
        clearInterval(interval);
        const reason = res.reason || 'Your profile does not meet the minimum requirements for this role.';

        clearFooter();
        await addBotMsg(`Unfortunately, your application could not proceed at this time.`);
        setTimeout(async () => {
          await addBotMsg(`<strong>Reason:</strong> ${reason}`);
          setTimeout(() => stepDone(false), 400);
        }, 500);
      }
    } catch (err) {
      clearInterval(interval);
      clearFooter();
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already')) {
        await addBotMsg('⚠️ It looks like you\'ve already submitted an application for this position.');
        stepDone(false, true);
      } else {
        await addBotMsg('Something went wrong during screening. Please try again.');
        setTimeout(() => stepResume(), 500);
      }
    }
  }

  // ─── Follow-up questions step ──
  function stepQuestions() {
    state.step = 'questions';
    state.currentQuestion = 0;
    state.answers = {};
    askNextQuestion();
  }

  async function askNextQuestion() {
    if (!state.questions || !state.questions[state.currentQuestion]) {
      await submitFollowUp();
      return;
    }

    const q = state.questions[state.currentQuestion];
    const progress = 85 + Math.round((state.currentQuestion / state.questions.length) * 10);
    setProgress(progress);

    const footer = clearFooter();
    await addBotMsg(`<strong>Question ${state.currentQuestion + 1} of ${state.questions.length}:</strong><br/>${escapeHtml(q.questionText)}`);

    footer.innerHTML = `
      <div class="hl-input-row">
        <textarea class="hl-input" id="hl-q-input" placeholder="Your answer..." rows="2"></textarea>
        <button class="hl-send-btn" id="hl-q-send">${ICONS.send}</button>
      </div>`;

    const input = footer.querySelector('#hl-q-input');
    const btn = footer.querySelector('#hl-q-send');
    input.focus();

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    const submit = () => {
      const ans = input.value.trim();
      if (!ans) return;
      addUserMsg(ans);
      state.answers[q.questionId || q.id] = ans;
      btn.disabled = true;
      input.disabled = true;
      state.currentQuestion++;
      setTimeout(() => askNextQuestion(), 400);
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });
  }

  async function submitFollowUp() {
    setProgress(95);
    const typing = showTyping();
    try {
      await api.post('/api/Applications/save-followup', {
        applicationId: state.applicationId,
        answers: state.answers,
      });
      removeTyping();
      stepDone(true);
    } catch {
      removeTyping();
      await addBotMsg('Something went wrong saving your answers. Please try again.');
    }
  }

  // ─── Done / Rejected step ──
  function stepDone(success, duplicate = false) {
    state.step = success ? 'done' : 'rejected';
    setProgress(100);

    const footer = clearFooter();

    if (success) {
      footer.innerHTML = `
        <div class="hl-status-screen">
          <div class="hl-status-icon success">${ICONS.check}</div>
          <div class="hl-status-title">Application Submitted!</div>
          <div class="hl-status-sub">Thank you for applying. The hiring team will review your profile and be in touch.</div>
        </div>`;
    } else if (duplicate) {
      footer.innerHTML = `
        <div class="hl-status-screen">
          <div class="hl-status-icon error" style="background:#fff3e0;">${`<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e67e22" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`}</div>
          <div class="hl-status-title">Already Applied</div>
          <div class="hl-status-sub">This email has already been used to apply for this position. Each candidate may apply once.</div>
        </div>`;
    } else {
      footer.innerHTML = `
        <div class="hl-status-screen">
          <div class="hl-status-icon error">${ICONS.x}</div>
          <div class="hl-status-title">Not Shortlisted</div>
          <div class="hl-status-sub">We appreciate your interest. Your profile didn't meet the minimum requirements for this role at this time.</div>
        </div>`;
    }
  }

  // ─── BUILD DOM ───────────────────────────────────────────────────────────
  function buildWidget() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const launcher = document.createElement('div');
    launcher.id = 'hl-launcher';
    
    // Create wrapper for tooltip and badge
    const tooltipWrapper = document.createElement('div');
    tooltipWrapper.className = 'hl-tooltip-wrapper';
    
    // Add the "Get HireLoop verified" badge/text
    const verifiedBadge = document.createElement('div');
    verifiedBadge.className = 'hl-verified-badge';
    verifiedBadge.textContent = 'Get HireLoop verified for this job';
    tooltipWrapper.appendChild(verifiedBadge);
    
    // Add the enhanced tooltip
    const enhancedTooltip = document.createElement('div');
    enhancedTooltip.id = 'hl-enhanced-tooltip';
    enhancedTooltip.textContent = '✓ First get verified through HireLoop AI screening, then apply via careers page';
    tooltipWrapper.appendChild(enhancedTooltip);
    
    // Add the bubble button
    const bubble = document.createElement('button');
    bubble.id = 'hl-bubble';
    bubble.setAttribute('aria-label', 'Open job application');
    bubble.innerHTML = `
      <svg class="chat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg class="close-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    `;
    tooltipWrapper.appendChild(bubble);
    
    launcher.appendChild(tooltipWrapper);

    // Panel
    panel = document.createElement('div');
    panel.id = 'hl-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Job Application');
    panel.innerHTML = `
      <div class="hl-header">
        <div class="hl-header-top">
          <div class="hl-logo-mark">${ICONS.logo}</div>
          <span class="hl-brand">HireLoop</span>
          <span class="hl-powered">AI Screening</span>
        </div>
        <div class="hl-job-title" id="hl-job-title">Loading position...</div>
        <div class="hl-company" id="hl-job-company"></div>
      </div>
      <div class="hl-progress"><div class="hl-progress-fill" style="width:0%"></div></div>
      <div class="hl-body" id="hl-body"></div>
      <div class="hl-footer"></div>`;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    // Cache refs
    bodyEl = panel.querySelector('#hl-body');
    progressFill = panel.querySelector('.hl-progress-fill');
    headerTitle = panel.querySelector('#hl-job-title');
    headerCompany = panel.querySelector('#hl-job-company');

    // Toggle functionality
    bubble.addEventListener('click', () => {
      state.isOpen = !state.isOpen;
      panel.classList.toggle('open', state.isOpen);
      bubble.classList.toggle('open', state.isOpen);
      launcher.classList.toggle('open', state.isOpen);

      if (state.isOpen && state.step === 'idle') {
        if (!WIDGET_CONFIG.widgetToken) {
          headerTitle.textContent = 'Configuration Error';
          addBotMsg('⚠️ Widget token is missing. Please contact the site administrator.');
        } else {
          initWidget();
        }
      }
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (state.isOpen && !panel.contains(e.target) && !bubble.contains(e.target)) {
        state.isOpen = false;
        panel.classList.remove('open');
        bubble.classList.remove('open');
        launcher.classList.remove('open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();