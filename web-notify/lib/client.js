/**
 * Browser notification plugin, browser half (notification-v2.md Part B.2.1).
 * Fires a Web Notification when an approval, plan review, or generic question
 * arrives while the web-GUI tab is hidden, so the pure web-browser deployment
 * gets the same unfocused cue the Electron host gets from notify-send.
 * Seam: the client runtime streams approval/requested + question/requested
 * mux frames into SessionSummary.pendingInteraction, so this plugin observes
 * that list store. Hand-rolled to match the tsdown client-bundle protocol.
 */
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-client-web-notify",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");
    var h = React.createElement;
    var STORAGE_KEY = "@deepseek-ai/dsh-client-web-notify:enabled";
    var STYLE_ID = "@deepseek-ai/dsh-client-web-notify/notify.css";
    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') === null) {
      var styleTag = document.createElement("style");
      styleTag.dataset.plugin = "@deepseek-ai/dsh-client-web-notify";
      styleTag.dataset.pluginCss = STYLE_ID;
      styleTag.textContent = [
        ".dwn-row { display: flex; flex-direction: column; gap: 8px; }",
        ".dwn-title { font-size: 14px; line-height: 20px; color: var(--dsw-alias-label-primary); }",
        ".dwn-desc { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }",
        ".dwn-control { display: flex; align-items: center; gap: 10px; }",
        ".dwn-toggle { position: relative; display: inline-flex; width: 36px; height: 20px; padding: 0; border: none; border-radius: 10px; background: var(--dsw-alias-border-l2); cursor: pointer; transition: background 0.15s ease; }",
        ".dwn-toggle[aria-checked=\"true\"] { background: var(--dsw-alias-brand-primary); }",
        ".dwn-toggle:disabled { cursor: default; opacity: 0.6; }",
        ".dwn-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 8px; background: #fff; transition: transform 0.15s ease; }",
        ".dwn-toggle[aria-checked=\"true\"] .dwn-knob { transform: translateX(16px); }",
        ".dwn-status { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }",
        ".dwn-status.dwn-blocked { color: var(--dsw-alias-state-warn-primary); }",
      ].join("\n");
      document.head.appendChild(styleTag);
    }
    function supported() { return typeof window !== "undefined" && "Notification" in window; }
    function readEnabled() { try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { return false; } }
    function writeEnabled(value) { try { if (value) localStorage.setItem(STORAGE_KEY, "1"); else localStorage.removeItem(STORAGE_KEY); } catch (e) {} }
    function currentPermission() { if (!supported()) return "denied"; return Notification.permission; }
    function titleFor(status) {
      switch (status) {
        case "approval": return "Approval required";
        case "plan-review": return "Plan review";
        default: return "Question";
      }
    }
    function bodyFor(status) {
      switch (status) {
        case "approval": return "An action needs your approval.";
        case "plan-review": return "A plan is waiting for your review.";
        default: return "A question is waiting for your answer.";
      }
    }
    function maybeNotify(enabled, status) {
      if (!enabled) return;
      if (!supported() || Notification.permission !== "granted") return;
      if (document.visibilityState !== "hidden") return;
      try {
        var notification = new Notification(titleFor(status), { body: bodyFor(status) });
        notification.onclick = function () { window.focus(); notification.close(); };
      } catch (e) {}
    }
    function apply(ctx) {
      var enabled = readEnabled();
      function NotifyRow() {
        var state = React.useState(enabled);
        var on = state[0], setOn = state[1];
        var permState = React.useState(currentPermission());
        var perm = permState[0], setPerm = permState[1];
        var toggle = function () {
          var next = !enabled;
          if (next && currentPermission() === "default") {
            Notification.requestPermission().then(function (result) {
              setPerm(result);
              if (result === "granted") { enabled = true; writeEnabled(true); setOn(true); }
            });
            return;
          }
          enabled = next; writeEnabled(next); setOn(next);
        };
        var statusLabel = perm === "granted" ? (on ? "On" : "Off") : (perm === "denied" ? "Blocked by browser" : "Off");
        return h("div", { className: "dwn-row" },
          h("div", { className: "dwn-title" }, "Browser notifications"),
          h("div", { className: "dwn-desc" }, "Show a notification when a task needs attention while this tab is hidden."),
          h("div", { className: "dwn-control" },
            h("button", {
              type: "button",
              className: "dwn-toggle",
              role: "switch",
              "aria-checked": on,
              disabled: perm === "denied",
              onClick: toggle,
            }, h("span", { className: "dwn-knob" })),
            h("span", { className: "dwn-status" + (perm === "denied" ? " dwn-blocked" : "") }, statusLabel)
          )
        );
      }
      ctx.slots.inject("settings.general.item", function () {
        return ctx.slots.register({ name: "settings.general.item", id: "web-notify", order: 20 }, NotifyRow);
      });
      var previous = null; // null = not yet seeded from the first snapshot
      ctx.effect(function () {
        return ctx.sessions.list.subscribe(function () {
          var snapshot = ctx.sessions.list.getSnapshot();
          var next = new Map();
          for (var id of Object.keys(snapshot.byId)) {
            var pending = snapshot.byId[id].pendingInteraction;
            if (pending !== undefined) next.set(id, pending);
          }
          if (previous === null) {
            previous = next; // seed: pre-existing pending interactions never re-fire
            return;
          }
          for (var entry of next) {
            if (previous.get(entry[0]) === entry[1]) continue;
            maybeNotify(enabled, entry[1]);
          }
          previous = next;
        });
      }, "web-notify: session list subscription");
    }
    exports.apply = apply;
    exports.inject = ["sessions", "slots"];
    return module.exports;
  },
});
