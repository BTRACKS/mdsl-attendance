/* ==========================================================================
   E-Attendance AI Assistant
   Isolated component — does not modify the existing dashboard application.
   ========================================================================== */

(function () {
  "use strict";

  // Branded E-Attendance AI avatar. Keep ai-assistant-avatar.png beside this file.
  var AI_AVATAR_SRC = (function () {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
      return new URL("ai-assistant-avatar.png", currentScript.src).href;
    }
    return "ai-assistant-avatar.png";
  })();

  var SUPABASE_URL = "https://wdrgcavxwamwqgxkdscn.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_XlL1WvosmoBvl3vttrT-xw_nVvtMrQo";

  var supabaseAI = null;
  var chatHistory = [];

  /* ------------------------------------------------------------------------
     Inject isolated styles
     ------------------------------------------------------------------------ */

  var style = document.createElement("style");

  style.textContent = `
    #ea-ai-root,
    #ea-ai-root * {
      box-sizing: border-box;
    }

    #ea-ai-root {
      font-family:
        "Inter",
        "Plus Jakarta Sans",
        system-ui,
        -apple-system,
        "Segoe UI",
        sans-serif;
    }

    /* Floating launcher */

    .ea-ai-launcher {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 9990;

      display: inline-flex;
      align-items: center;
      gap: 10px;

      width: 62px;
      height: 62px;
      min-height: 62px;
      padding: 4px;

      border: 1px solid rgba(18, 58, 107, 0.14);
      border-radius: 50%;

      background: #ffffff;
      color: #123a6b;

      font: inherit;
      font-size: 14px;
      font-weight: 700;

      cursor: pointer;

      box-shadow:
        0 14px 34px rgba(18, 58, 107, 0.22),
        0 3px 8px rgba(16, 24, 40, 0.10);

      transition:
        transform 180ms ease,
        box-shadow 180ms ease,
        background 180ms ease;
    }

    .ea-ai-launcher:hover {
      transform: translateY(-2px);
      background: #ffffff;
      box-shadow:
        0 18px 40px rgba(18, 58, 107, 0.27),
        0 4px 10px rgba(16, 24, 40, 0.12);
    }

    .ea-ai-launcher:active {
      transform: translateY(0);
    }

    .ea-ai-launcher-icon {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      overflow: hidden;
      border-radius: 50%;
    }

    .ea-ai-launcher-avatar {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      object-position: center;
    }

    .ea-ai-launcher-text {
      display: none;
    }

    /* Chat window */

    .ea-ai-panel {
      position: fixed;
      right: 24px;
      bottom: 92px;
      z-index: 9991;

      width: min(410px, calc(100vw - 32px));
      height: min(650px, calc(100vh - 125px));

      display: flex;
      flex-direction: column;

      overflow: hidden;

      background: #ffffff;
      border: 1px solid #e6e9f0;
      border-radius: 22px;

      box-shadow:
        0 30px 70px -30px rgba(16, 24, 40, 0.32),
        0 8px 24px rgba(16, 24, 40, 0.10);

      opacity: 0;
      visibility: hidden;
      transform: translateY(12px) scale(0.98);
      transform-origin: bottom right;

      transition:
        opacity 180ms ease,
        visibility 180ms ease,
        transform 180ms ease;
    }

    .ea-ai-panel.is-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* Header */

    .ea-ai-header {
      flex: 0 0 auto;

      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;

      padding: 16px 17px;

      background:
        linear-gradient(
          115deg,
          #ded9f6 0%,
          #efe7f7 28%,
          #fdf0d2 66%,
          #fbd77e 100%
        );

      border-bottom: 1px solid #e6e9f0;
    }

    .ea-ai-header-left {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }

    .ea-ai-logo {
      width: 46px;
      height: 46px;

      display: grid;
      place-items: center;
      flex: 0 0 auto;

      border-radius: 50%;
      background: transparent;
      border: 0;
      overflow: hidden;
    }

    .ea-ai-logo-avatar {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      object-position: center;
    }

    .ea-ai-heading {
      min-width: 0;
    }

    .ea-ai-title {
      margin: 0;

      color: #101828;
      font-size: 15px;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .ea-ai-status {
      display: flex;
      align-items: center;
      gap: 6px;

      margin-top: 4px;

      color: #5b6577;
      font-size: 11px;
      font-weight: 600;
    }

    .ea-ai-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #0f7a4a;
      flex: 0 0 auto;
    }

    .ea-ai-close {
      width: 34px;
      height: 34px;

      display: grid;
      place-items: center;
      flex: 0 0 auto;

      border: 1px solid rgba(18, 58, 107, 0.10);
      border-radius: 10px;

      background: rgba(255, 255, 255, 0.72);
      color: #344054;

      cursor: pointer;

      transition:
        background 180ms ease,
        color 180ms ease;
    }

    .ea-ai-close:hover {
      background: #ffffff;
      color: #123a6b;
    }

    .ea-ai-close svg {
      width: 17px;
      height: 17px;
    }

    /* Messages */

    .ea-ai-messages {
      flex: 1 1 auto;

      min-height: 0;
      height: 0;

      padding: 18px;

      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;

      background: #f7f8fb;
      scroll-behavior: smooth;
      scrollbar-gutter: stable;
    }

    .ea-ai-message {
      display: flex;
      margin-bottom: 14px;
    }

    .ea-ai-message:last-child {
      margin-bottom: 0;
    }

    .ea-ai-message.ai {
      justify-content: flex-start;
    }

    .ea-ai-message.user {
      justify-content: flex-end;
    }

    .ea-ai-bubble {
      max-width: 86%;

      padding: 11px 13px;

      border-radius: 15px;

      font-size: 13.5px;
      line-height: 1.55;

      white-space: normal;
      overflow-wrap: anywhere;
    }

    .ea-ai-bubble .ea-ai-paragraph {
      margin: 0;
    }

    .ea-ai-bubble .ea-ai-paragraph + .ea-ai-paragraph {
      margin-top: 7px;
    }

    .ea-ai-bubble .ea-ai-spacer {
      height: 6px;
    }

    .ea-ai-bubble .ea-ai-heading {
      margin: 2px 0 7px;
      color: #101828;
      font-weight: 800;
      line-height: 1.35;
    }

    .ea-ai-bubble .ea-ai-heading-1 {
      font-size: 16px;
    }

    .ea-ai-bubble .ea-ai-heading-2 {
      font-size: 15px;
    }

    .ea-ai-bubble .ea-ai-heading-3 {
      font-size: 14px;
    }

    .ea-ai-bubble .ea-ai-list {
      margin: 6px 0 8px;
      padding-left: 20px;
    }

    .ea-ai-bubble .ea-ai-list li {
      margin: 3px 0;
      padding-left: 2px;
    }

    .ea-ai-bubble .ea-ai-numbered-item {
      margin: 5px 0;
    }

    .ea-ai-bubble code {
      padding: 1px 5px;
      border-radius: 5px;
      background: #f2f4f7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.92em;
    }

    .ea-ai-bubble .ea-ai-divider {
      width: 100%;
      height: 1px;
      margin: 10px 0;
      background: #e6e9f0;
    }

    .ea-ai-message.ai .ea-ai-bubble {
      background: #ffffff;
      color: #344054;
      border: 1px solid #e6e9f0;
      border-bottom-left-radius: 5px;
    }

    .ea-ai-message.user .ea-ai-bubble {
      background: #123a6b;
      color: #ffffff;
      border-bottom-right-radius: 5px;
    }

    .ea-ai-welcome {
      margin-bottom: 18px;
    }

    .ea-ai-welcome-avatar {
      width: 64px;
      height: 64px;
      display: block;
      object-fit: contain;
      object-position: center;
      margin: 0 auto 10px;
    }

    .ea-ai-welcome-title {
      margin: 0 0 7px;

      color: #101828;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }

    .ea-ai-welcome-copy {
      margin: 0;

      color: #5b6577;
      font-size: 13px;
      line-height: 1.55;
    }

    /* Quick prompts */

    .ea-ai-prompts {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }

    .ea-ai-prompt {
      width: 100%;

      padding: 10px 12px;

      text-align: left;

      border: 1px solid #e6e9f0;
      border-radius: 12px;

      background: #ffffff;
      color: #344054;

      font: inherit;
      font-size: 12.5px;
      font-weight: 600;

      cursor: pointer;

      transition:
        border-color 180ms ease,
        color 180ms ease,
        background 180ms ease;
    }

    .ea-ai-prompt:hover {
      border-color: #123a6b;
      color: #123a6b;
      background: #fbfcfe;
    }

    /* Typing indicator */

    .ea-ai-typing {
      display: inline-flex;
      align-items: center;
      gap: 5px;

      min-height: 18px;
    }

    .ea-ai-typing span {
      width: 6px;
      height: 6px;

      border-radius: 50%;
      background: #8a93a5;

      animation: eaAiTyping 1.1s infinite ease-in-out;
    }

    .ea-ai-typing span:nth-child(2) {
      animation-delay: 0.15s;
    }

    .ea-ai-typing span:nth-child(3) {
      animation-delay: 0.30s;
    }

    @keyframes eaAiTyping {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.45;
      }

      30% {
        transform: translateY(-3px);
        opacity: 1;
      }
    }

    /* Composer */

    .ea-ai-composer {
      flex: 0 0 auto;

      display: flex;
      align-items: flex-end;
      gap: 9px;

      padding: 12px;

      background: #ffffff;
      border-top: 1px solid #e6e9f0;
    }

    .ea-ai-input-wrap {
      flex: 1 1 auto;
      min-width: 0;
    }

    .ea-ai-input {
      width: 100%;
      min-height: 44px;
      max-height: 110px;

      resize: none;

      padding: 11px 12px;

      border: 1px solid #d5dae4;
      border-radius: 13px;

      outline: none;

      background: #ffffff;
      color: #101828;

      font: inherit;
      font-size: 13px;
      line-height: 1.45;

      transition:
        border-color 180ms ease,
        box-shadow 180ms ease;
    }

    .ea-ai-input::placeholder {
      color: #8a93a5;
    }

    .ea-ai-input:focus {
      border-color: #123a6b;
      box-shadow: 0 0 0 4px rgba(18, 58, 107, 0.09);
    }

    .ea-ai-send {
      width: 44px;
      height: 44px;

      display: grid;
      place-items: center;
      flex: 0 0 auto;

      border: 0;
      border-radius: 13px;

      background: #123a6b;
      color: #ffffff;

      cursor: pointer;

      transition:
        background 180ms ease,
        transform 180ms ease;
    }

    .ea-ai-send:hover {
      background: #0d2a4d;
      transform: translateY(-1px);
    }

    .ea-ai-send:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }

    .ea-ai-send svg {
      width: 18px;
      height: 18px;
    }

    .ea-ai-disclaimer {
      flex: 0 0 auto;

      padding: 0 14px 11px;

      background: #ffffff;
      color: #8a93a5;

      font-size: 10px;
      line-height: 1.4;
      text-align: center;
    }

    @media (max-width: 600px) {
      .ea-ai-launcher {
        right: 16px;
        bottom: 16px;
        width: 56px;
        height: 56px;
        min-height: 56px;
        padding: 3px;
      }

      .ea-ai-panel {
        right: 8px;
        bottom: 8px;

        width: calc(100vw - 16px);
        height: calc(100dvh - 16px);
        min-height: 0;
        max-height: calc(100dvh - 16px);

        border-radius: 18px;
        overflow: hidden;
      }

      .ea-ai-header {
        flex-shrink: 0;
      }

      .ea-ai-messages {
        flex: 1 1 0%;
        min-height: 0;
        height: 0;

        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
        touch-action: pan-y;

        padding: 14px;
        scroll-behavior: smooth;
      }

      .ea-ai-composer,
      .ea-ai-disclaimer {
        flex-shrink: 0;
      }

      .ea-ai-launcher-text {
        display: none;
      }

      .ea-ai-launcher {
        width: 54px;
        padding: 0;
        justify-content: center;
      }

      .ea-ai-bubble {
        max-width: 91%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ea-ai-panel,
      .ea-ai-launcher,
      .ea-ai-send {
        transition: none;
      }

      .ea-ai-typing span {
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);

  /* ------------------------------------------------------------------------
     SVG icons
     ------------------------------------------------------------------------ */

  var ICON_SPARK = `
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>
    </svg>
  `;

  var ICON_CLOSE = `
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18"/>
      <line x1="18" y1="6" x2="6" y2="18"/>
    </svg>
  `;

  var ICON_SEND = `
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  `;

  /* ------------------------------------------------------------------------
     Build UI
     ------------------------------------------------------------------------ */

  function createInterface() {
    if (document.getElementById("ea-ai-root")) return;

    var root = document.createElement("div");
    root.id = "ea-ai-root";

    root.innerHTML = `
      <button
        class="ea-ai-launcher"
        id="eaAiLauncher"
        type="button"
        aria-label="Open E-Attendance AI"
        aria-expanded="false"
      >
        <span class="ea-ai-launcher-icon">
          <img
            class="ea-ai-launcher-avatar"
            src="${AI_AVATAR_SRC}"
            alt=""
            aria-hidden="true"
          />
        </span>
      </button>

      <section
        class="ea-ai-panel"
        id="eaAiPanel"
        aria-label="E-Attendance AI Assistant"
        aria-hidden="true"
      >
        <header class="ea-ai-header">
          <div class="ea-ai-header-left">
            <div class="ea-ai-logo">
              <img
                class="ea-ai-logo-avatar"
                src="${AI_AVATAR_SRC}"
                alt=""
                aria-hidden="true"
              />
            </div>

            <div class="ea-ai-heading">
              <h2 class="ea-ai-title">E-Attendance AI</h2>

              <div class="ea-ai-status">
                <span class="ea-ai-status-dot"></span>
                <span>Assistant ready</span>
              </div>
            </div>
          </div>

          <button
            class="ea-ai-close"
            id="eaAiClose"
            type="button"
            aria-label="Close AI Assistant"
          >
            ${ICON_CLOSE}
          </button>
        </header>

        <div
          class="ea-ai-messages"
          id="eaAiMessages"
          role="log"
          aria-live="polite"
          aria-label="AI conversation"
        ></div>

        <div class="ea-ai-composer">
          <div class="ea-ai-input-wrap">
            <textarea
              class="ea-ai-input"
              id="eaAiInput"
              rows="1"
              maxlength="10000"
              placeholder="Ask about E-Attendance..."
              aria-label="Message"
            ></textarea>
          </div>

          <button
            class="ea-ai-send"
            id="eaAiSend"
            type="button"
            aria-label="Send message"
            title="Send message"
          >
            ${ICON_SEND}
          </button>
        </div>

        <div class="ea-ai-disclaimer">
          AI responses may be inaccurate. Verify important attendance information
          against your official records.
        </div>
      </section>
    `;

    document.body.appendChild(root);

    bindEvents();
    renderWelcome();
  }

  /* ------------------------------------------------------------------------
     DOM helpers
     ------------------------------------------------------------------------ */

  function get(id) {
    return document.getElementById(id);
  }

  function scrollMessages() {
    var messages = get("eaAiMessages");
    if (!messages) return;

    requestAnimationFrame(function () {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ------------------------------------------------------------------------
     Welcome screen
     ------------------------------------------------------------------------ */

  function renderWelcome() {
    var messages = get("eaAiMessages");
    if (!messages) return;

    messages.innerHTML = `
      <div class="ea-ai-welcome">
        <img
          class="ea-ai-welcome-avatar"
          src="${AI_AVATAR_SRC}"
          alt=""
          aria-hidden="true"
        />
        <h3 class="ea-ai-welcome-title">How can I help?</h3>

        <p class="ea-ai-welcome-copy">
          Ask me about using E-Attendance, attendance, work schedules,
          leave, HSE attendance, or other information available in the system.
        </p>

        <div class="ea-ai-prompts">
          <button
            class="ea-ai-prompt"
            type="button"
            data-ai-prompt="What can you help me with in E-Attendance?"
          >
            What can you help me with?
          </button>

          <button
            class="ea-ai-prompt"
            type="button"
            data-ai-prompt="How does attendance work in E-Attendance?"
          >
            How does attendance work?
          </button>

          <button
            class="ea-ai-prompt"
            type="button"
            data-ai-prompt="How can I check my attendance history?"
          >
            How can I check my attendance history?
          </button>
        </div>
      </div>
    `;

    var prompts = messages.querySelectorAll("[data-ai-prompt]");

    prompts.forEach(function (button) {
      button.addEventListener("click", function () {
        sendMessage(button.getAttribute("data-ai-prompt"));
      });
    });
  }

  /* ------------------------------------------------------------------------
     Chat messages
     ------------------------------------------------------------------------ */

  function formatAIResponse(text) {
    var source = String(text || "").replace(/\r\n?/g, "\n");
    var lines = source.split("\n");
    var html = [];
    var inList = false;

    function closeList() {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    }

    function inlineMarkdown(value) {
      var safe = escapeHtml(value);

      // Inline code
      safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");

      // Bold + italic
      safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      safe = safe.replace(/__(.+?)__/g, "<strong>$1</strong>");
      safe = safe.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
      safe = safe.replace(/_([^_\n]+)_/g, "<em>$1</em>");

      return safe;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // Horizontal rules such as ---, ***, or ___
      if (/^(?:[-*_])(?:\s*[-*_]){2,}$/.test(trimmed)) {
        closeList();
        html.push('<div class="ea-ai-divider" aria-hidden="true"></div>');
        continue;
      }

      // Headings
      var heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList();
        var level = heading[1].length;
        html.push(
          '<div class="ea-ai-heading ea-ai-heading-' +
            level +
            '">' +
            inlineMarkdown(heading[2]) +
            "</div>"
        );
        continue;
      }

      // Unordered list
      var bullet = trimmed.match(/^[*-]\s+(.+)$/);
      if (bullet) {
        if (!inList) {
          html.push('<ul class="ea-ai-list">');
          inList = true;
        }
        html.push("<li>" + inlineMarkdown(bullet[1]) + "</li>");
        continue;
      }

      // Ordered list
      var numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        closeList();
        // Use a normal ordered list for consecutive numbered content.
        html.push(
          '<div class="ea-ai-numbered-item">' +
            inlineMarkdown(trimmed) +
            "</div>"
        );
        continue;
      }

      closeList();

      // Empty line = spacing between paragraphs.
      if (!trimmed) {
        html.push('<div class="ea-ai-spacer"></div>');
        continue;
      }

      html.push('<div class="ea-ai-paragraph">' + inlineMarkdown(line) + "</div>");
    }

    closeList();

    return html.join("");
  }

  function addMessage(role, text) {
    var messages = get("eaAiMessages");
    if (!messages) return;

    var row = document.createElement("div");
    row.className = "ea-ai-message " + role;

    var bubble = document.createElement("div");
    bubble.className = "ea-ai-bubble";

    // Only AI responses are rendered as Markdown. User messages remain
    // plain text so their input can never become HTML.
    if (role === "ai") {
      bubble.innerHTML = formatAIResponse(text);
    } else {
      bubble.textContent = text;
    }

    row.appendChild(bubble);
    messages.appendChild(row);

    scrollMessages();

    return row;
  }

  function addTypingMessage() {
    var messages = get("eaAiMessages");
    if (!messages) return null;

    var row = document.createElement("div");
    row.className = "ea-ai-message ai";
    row.id = "eaAiTyping";

    var bubble = document.createElement("div");
    bubble.className = "ea-ai-bubble";

    bubble.innerHTML = `
      <span class="ea-ai-typing" aria-label="AI is typing">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;

    row.appendChild(bubble);
    messages.appendChild(row);

    scrollMessages();

    return row;
  }

  function removeTypingMessage() {
    var typing = get("eaAiTyping");
    if (typing) typing.remove();
  }

  /* ------------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------------ */

  function openPanel() {
    var panel = get("eaAiPanel");
    var launcher = get("eaAiLauncher");

    if (!panel || !launcher) return;

    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");

    setTimeout(function () {
      var input = get("eaAiInput");
      if (input) input.focus();
    }, 180);
  }

  function closePanel() {
    var panel = get("eaAiPanel");
    var launcher = get("eaAiLauncher");

    if (!panel || !launcher) return;

    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
  }

  /* ------------------------------------------------------------------------
     Input
     ------------------------------------------------------------------------ */

  function resizeInput() {
    var input = get("eaAiInput");
    if (!input) return;

    input.style.height = "auto";

    var height = Math.min(input.scrollHeight, 110);
    input.style.height = height + "px";
  }

  function setSendingState(isSending) {
    var send = get("eaAiSend");
    var input = get("eaAiInput");

    if (!send || !input) return;

    send.disabled = isSending;
    input.disabled = isSending;

    if (!isSending) {
      input.focus();
    }
  }

  /* ------------------------------------------------------------------------
     Supabase
     ------------------------------------------------------------------------ */

  function initializeSupabase() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error(
        "E-Attendance AI: Supabase JavaScript library was not found."
      );
      return false;
    }

    try {
      supabaseAI = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );

      return true;
    } catch (error) {
      console.error("E-Attendance AI: Supabase initialization failed.", error);
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     Build optional application context
     ------------------------------------------------------------------------ */

  function getApplicationContext() {
    return {
      page: document.body.getAttribute("data-page") || "app",
      route: window.location.hash || "",
      timestamp: new Date().toISOString()
    };
  }

  /* ------------------------------------------------------------------------
     Send to attendance-ai Edge Function
     ------------------------------------------------------------------------ */

  async function sendMessage(message) {
    message = String(message || "").trim();

    if (!message) return;

    if (message.length > 10000) {
      addMessage(
        "ai",
        "That message is too long. Please shorten it and try again."
      );
      return;
    }

    if (!supabaseAI) {
      addMessage(
        "ai",
        "The AI service is not ready yet. Please refresh the page and try again."
      );
      return;
    }

    var input = get("eaAiInput");

    if (input) {
      input.value = "";
      input.style.height = "auto";
    }

    addMessage("user", message);

    chatHistory.push({
      role: "user",
      content: message
    });

    setSendingState(true);

    var typing = addTypingMessage();

    try {
      var result = await supabaseAI.functions.invoke("attendance-ai", {
        body: {
          message: message,
          context: getApplicationContext()
        }
      });

      if (typing) typing.remove();

      if (result.error) {
        console.error("E-Attendance AI function error:", result.error);

        addMessage(
          "ai",
          "I couldn't connect to the AI assistant right now. Please try again."
        );

        return;
      }

      var data = result.data || {};

      if (!data.success || !data.response) {
        console.error("Unexpected AI response:", data);

        addMessage(
          "ai",
          "I received an unexpected response from the AI service. Please try again."
        );

        return;
      }

      addMessage("ai", data.response);

      chatHistory.push({
        role: "assistant",
        content: data.response
      });
    } catch (error) {
      if (typing) typing.remove();

      console.error("E-Attendance AI request failed:", error);

      addMessage(
        "ai",
        "Something went wrong while contacting the AI assistant. Please try again."
      );
    } finally {
      setSendingState(false);
    }
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  function bindEvents() {
    var launcher = get("eaAiLauncher");
    var close = get("eaAiClose");
    var send = get("eaAiSend");
    var input = get("eaAiInput");

    if (launcher) {
      launcher.addEventListener("click", function () {
        var panel = get("eaAiPanel");

        if (panel && panel.classList.contains("is-open")) {
          closePanel();
        } else {
          openPanel();
        }
      });
    }

    if (close) {
      close.addEventListener("click", closePanel);
    }

    if (send) {
      send.addEventListener("click", function () {
        if (input) sendMessage(input.value);
      });
    }

    if (input) {
      input.addEventListener("input", resizeInput);

      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();

          if (!send || !send.disabled) {
            sendMessage(input.value);
          }
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        var panel = get("eaAiPanel");

        if (panel && panel.classList.contains("is-open")) {
          closePanel();
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     Authentication visibility
     ------------------------------------------------------------------------ */

  async function checkAuthentication() {
    if (!supabaseAI) return;

    try {
      var result = await supabaseAI.auth.getSession();

      var session =
        result.data && result.data.session
          ? result.data.session
          : null;

      var root = get("ea-ai-root");

      if (!root) return;

      /*
       * The AI assistant is intended for signed-in E-Attendance users.
       * It disappears on public/login screens.
       */
      root.hidden = !session;
    } catch (error) {
      console.warn(
        "E-Attendance AI authentication check:",
        error
      );
    }
  }

  /* ------------------------------------------------------------------------
     Initialize
     ------------------------------------------------------------------------ */

  async function init() {
    createInterface();

    if (!initializeSupabase()) {
      var root = get("ea-ai-root");
      if (root) root.hidden = true;
      return;
    }

    await checkAuthentication();

    /*
     * Keep the launcher synchronized with Supabase auth events.
     * This does not interfere with the existing application's auth listener.
     */
    supabaseAI.auth.onAuthStateChange(function (event, session) {
      var root = get("ea-ai-root");

      if (!root) return;

      root.hidden = !session;

      if (!session) {
        closePanel();
      }
    });
  }

  /* Start only after the browser has loaded AND the dashboard has finished
     its asynchronous attendance-data load. */
  function startAfterAttendanceLoad() {
    if (window.__EA_AI_INITIALIZED__) return;

    /*
     * Create the assistant immediately after the browser has finished
     * loading the page, but keep it hidden until the dashboard's
     * asynchronous attendance loader has disappeared.
     *
     * IMPORTANT: createInterface() must happen BEFORE we look for the
     * assistant root. The previous implementation looked for the root
     * first, found nothing, and returned — which removed the launcher
     * completely.
     */
    createInterface();

    var root = get("ea-ai-root");
    if (!root) return;

    root.hidden = true;

    var attempts = 0;
    var maxAttempts = 600; // 60 seconds maximum.

    function waitForDashboard() {
      if (window.__EA_AI_INITIALIZED__) return;

      var view = get("view");
      var loader = view && view.querySelector(".page-loader");

      if (loader) {
        attempts++;

        if (attempts < maxAttempts) {
          window.setTimeout(waitForDashboard, 100);
        } else {
          // Fail open: never permanently remove the AI assistant if the
          // attendance loader gets stuck for an unrelated reason.
          window.__EA_AI_INITIALIZED__ = true;
          init();
        }

        return;
      }

      window.__EA_AI_INITIALIZED__ = true;
      init();
    }

    waitForDashboard();
  }

  function startAfterFullPageLoad() {
    startAfterAttendanceLoad();
  }

  if (document.readyState === "complete") {
    startAfterFullPageLoad();
  } else {
    window.addEventListener("load", startAfterFullPageLoad, { once: true });
  }
})();