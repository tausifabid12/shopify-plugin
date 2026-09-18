/**
 * PingGo Checkout — storefront takeover.
 *
 * Intercepts the theme's checkout and "Buy it now" buttons, opens a checkout
 * session on our API, and sends the shopper to our hosted checkout instead of
 * Shopify's.
 *
 * THE RULE THIS FILE LIVES BY: fail open.
 *
 * Every failure path — our API down, the cart unreadable, a slow network, an
 * unexpected theme — must end with the shopper on Shopify's native checkout,
 * never on a broken page. A checkout app that breaks checkout is worse than no
 * checkout app, so the interception is undone and the original action replayed
 * whenever anything at all goes wrong.
 */
(function () {
  "use strict";

  var configEl = document.getElementById("pinggo-checkout-config");
  if (!configEl) return;

  var settings;
  try {
    settings = JSON.parse(configEl.textContent || "{}");
  } catch (e) {
    return;
  }
  if (!settings.shopDomain || !settings.apiBase || !settings.checkoutBase) return;

  var API = settings.apiBase.replace(/\/+$/, "");
  var CHECKOUT = settings.checkoutBase.replace(/\/+$/, "");
  var CACHE_KEY = "pinggo_ck_enabled";
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var REQUEST_TIMEOUT_MS = 8000;

  var busy = false;
  var enabled = false;

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * fetch with a hard timeout. Without one, a hung request leaves the shopper
   * staring at our overlay with the native checkout already suppressed.
   */
  function request(url, options) {
    options = options || {};
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (controller) options.signal = controller.signal;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, REQUEST_TIMEOUT_MS);

    return fetch(url, options)
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) return null;
      return parsed.enabled;
    } catch (e) {
      return null;
    }
  }

  function writeCache(value) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ enabled: value, expiresAt: Date.now() + CACHE_TTL_MS })
      );
    } catch (e) {
      // Private browsing, or storage full. The extra request is harmless.
    }
  }

  // ── Overlay ────────────────────────────────────────────────────────────────

  var overlay;

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
      "justify-content:center;background:rgba(255,255,255,0.88);backdrop-filter:blur(2px)";
    overlay.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;' +
      'font:500 14px/1.4 system-ui,-apple-system,sans-serif;color:#202223">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" ' +
      'style="animation:pinggo-spin 0.7s linear infinite">' +
      '<circle cx="12" cy="12" r="9" stroke="#d0d3d6" stroke-width="3"/>' +
      '<path d="M21 12a9 9 0 0 0-9-9" stroke="#008060" stroke-width="3" stroke-linecap="round"/>' +
      "</svg><span>Taking you to checkout…</span></div>" +
      "<style>@keyframes pinggo-spin{to{transform:rotate(360deg)}}</style>";
    document.body.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  // ── Attribution ────────────────────────────────────────────────────────────

  function attribution() {
    try {
      var params = new URLSearchParams(window.location.search);
      var data = {};
      var map = {
        utm_source: "source",
        utm_medium: "medium",
        utm_campaign: "campaign",
        utm_term: "term",
        utm_content: "content"
      };
      Object.keys(map).forEach(function (key) {
        var value = params.get(key);
        if (value) data[map[key]] = value.slice(0, 200);
      });
      if (document.referrer) data.referrer = document.referrer.slice(0, 500);
      data.landingPage = window.location.href.slice(0, 500);
      return data;
    } catch (e) {
      return undefined;
    }
  }

  // ── Cart reading ───────────────────────────────────────────────────────────

  function cartLines() {
    return request(window.Shopify && window.Shopify.routes
      ? window.Shopify.routes.root + "cart.js"
      : "/cart.js"
    ).then(function (cart) {
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error("empty cart");
      }
      return cart.items.map(function (item) {
        var line = {
          variantGid: "gid://shopify/ProductVariant/" + item.variant_id,
          quantity: item.quantity
        };
        // Line item properties carry personalisation (engraving, gift notes);
        // dropping them would silently lose what the shopper asked for.
        if (item.properties) {
          var props = {};
          var kept = 0;
          Object.keys(item.properties).forEach(function (key) {
            // Underscore-prefixed keys are theme/app internals, not shopper data.
            if (key.charAt(0) === "_" || kept >= 20) return;
            var value = item.properties[key];
            if (value == null) return;
            props[key] = String(value).slice(0, 500);
            kept++;
          });
          if (kept > 0) line.properties = props;
        }
        return line;
      });
    });
  }

  /** Reads a single variant straight off a product form, for "Buy it now". */
  function formLines(form) {
    var idInput = form.querySelector('[name="id"]');
    if (!idInput || !idInput.value) return null;
    var qtyInput = form.querySelector('[name="quantity"]');
    var quantity = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    return [
      {
        variantGid: "gid://shopify/ProductVariant/" + idInput.value,
        quantity: quantity > 0 ? quantity : 1
      }
    ];
  }

  // ── Takeover ───────────────────────────────────────────────────────────────

  /**
   * Opens our checkout, or hands back to the theme.
   *
   * `fallback` replays whatever the shopper originally did. It is called from
   * every failure branch, which is what makes the interception safe to attempt
   * at all.
   */
  function takeover(linesPromise, fallback) {
    if (busy) return;
    busy = true;
    showOverlay();

    linesPromise
      .then(function (lines) {
        return request(API + "/checkout/public/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopDomain: settings.shopDomain,
            lines: lines,
            sourceCartToken: settings.cartToken || undefined,
            attribution: attribution()
          })
        });
      })
      .then(function (body) {
        var token = body && body.data && body.data.token;
        if (!token) throw new Error("no token");
        // replace(), not assign(): Back from our checkout should return to the
        // cart, not bounce through this interception again.
        window.location.replace(CHECKOUT + "/checkout/" + encodeURIComponent(token));
      })
      .catch(function () {
        busy = false;
        hideOverlay();
        // Something went wrong on our side — give the shopper Shopify's
        // checkout rather than nothing.
        fallback();
      });
  }

  // ── Interception ───────────────────────────────────────────────────────────

  var CHECKOUT_SELECTORS = [
    '[name="checkout"]',
    'a[href$="/checkout"]',
    'a[href*="/checkout?"]',
    'button[value="Checkout"]',
    '.cart__checkout',
    '#CartDrawer-Checkout',
    '[data-pinggo-checkout]'
  ].join(",");

  var BUY_NOW_SELECTOR = ".shopify-payment-button__button";

  function closestMatch(element, selector) {
    if (!element || !element.closest) return null;
    try {
      return element.closest(selector);
    } catch (e) {
      return null;
    }
  }

  function onClick(event) {
    if (!enabled || busy) return;
    // Let modified clicks through — a shopper opening checkout in a new tab is
    // making a deliberate choice.
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (event.button !== undefined && event.button !== 0) return;

    var target = event.target;

    var buyNow = settings.takeoverBuyNow ? closestMatch(target, BUY_NOW_SELECTOR) : null;
    if (buyNow) {
      var form = closestMatch(buyNow, "form");
      var lines = form ? formLines(form) : null;
      if (!lines) return; // can't read it — let the theme handle it
      event.preventDefault();
      event.stopPropagation();
      takeover(Promise.resolve(lines), function () {
        // Dynamic checkout buttons re-render; re-clicking is unreliable, so
        // send the shopper to the cart, which always works.
        window.location.href = "/cart";
      });
      return;
    }

    var trigger = closestMatch(target, CHECKOUT_SELECTORS);
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();

    takeover(cartLines(), function () {
      // Replay the original intent natively.
      if (trigger.tagName === "A" && trigger.href) {
        window.location.href = trigger.href;
      } else {
        var form = closestMatch(trigger, "form");
        if (form) {
          form.setAttribute("data-pinggo-bypass", "true");
          form.submit();
        } else {
          window.location.href = "/checkout";
        }
      }
    });
  }

  function onSubmit(event) {
    if (!enabled || busy) return;
    var form = event.target;
    if (!form || form.getAttribute("data-pinggo-bypass") === "true") return;

    // Only the cart form, and only when it was the checkout button that
    // submitted it — "update cart" must still behave normally.
    var action = form.getAttribute("action") || "";
    if (action.indexOf("/cart") === -1) return;

    var submitter = event.submitter;
    if (!submitter || submitter.name !== "checkout") return;

    event.preventDefault();
    takeover(cartLines(), function () {
      form.setAttribute("data-pinggo-bypass", "true");
      form.submit();
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  function attach() {
    // Capture phase, so we run before theme handlers that would otherwise
    // navigate away or open a cart drawer first.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
  }

  function boot() {
    var cached = readCache();
    if (cached === false) return; // known off — don't even attach
    if (cached === true) {
      enabled = true;
      attach();
      return;
    }

    request(API + "/checkout/public/config/" + encodeURIComponent(settings.shopDomain))
      .then(function (body) {
        var data = body && body.data;
        var isOn = Boolean(data && data.enabled);
        writeCache(isOn);
        if (isOn) {
          enabled = true;
          attach();
        }
      })
      .catch(function () {
        // Couldn't reach us — leave the native checkout completely alone.
        writeCache(false);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
