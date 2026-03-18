/**
 * CipherForge — main.js
 *
 * Application controller. Responsible for:
 *   1. Instantiating PasswordEngine
 *   2. Reading UI state and passing config to engine
 *   3. Rendering password output with colour-coded chars
 *   4. Updating strength meter and entropy display
 *   5. Clipboard copy (with fallback)
 *   6. Batch generation and rendering
 *   7. Password history management (capped at 8 entries)
 *   8. Quantity controls
 *   9. Slider fill gradient update
 *  10. Pool size composition display
 *  11. Error handling (no charset selected, no-repeat conflict)
 *
 * Dependencies: generator.js (PasswordEngine must be loaded first)
 */

"use strict";

(function () {

  /* ============================================================
     CONSTANTS
  ============================================================ */

  const MAX_HISTORY = 8;

  /* ============================================================
     STATE
  ============================================================ */

  let history = [];   /* Array of password strings */

  /* ============================================================
     ENGINE
  ============================================================ */

  let engine;

  function initEngine() {
    if (typeof PasswordEngine === "undefined") {
      console.error("[main.js] PasswordEngine not found. Ensure generator.js is loaded.");
      return false;
    }
    engine = new PasswordEngine(readConfig());
    return true;
  }

  /* ============================================================
     DOM REFERENCES
  ============================================================ */

  const $ = (id) => document.getElementById(id);

  const els = {
    display:          $("passwordDisplay"),
    generateBtn:      $("generateBtn"),
    refreshBtn:       $("refreshBtn"),
    copyBtn:          $("copyBtn"),
    copyToast:        $("copyToast"),
    lengthSlider:     $("lengthSlider"),
    lengthOutput:     $("lengthOutput"),
    strengthFill:     $("strengthFill"),
    strengthBar:      $("strengthBar"),
    strengthName:     $("strengthName"),
    entropyValue:     $("entropyValue"),
    inclUppercase:    $("inclUppercase"),
    inclLowercase:    $("inclLowercase"),
    inclNumbers:      $("inclNumbers"),
    inclSymbols:      $("inclSymbols"),
    excludeAmbiguous: $("excludeAmbiguous"),
    noRepeats:        $("noRepeats"),
    quantityInput:    $("quantityInput"),
    qtyMinus:         $("qtyMinus"),
    qtyPlus:          $("qtyPlus"),
    batchSection:     $("batchSection"),
    batchList:        $("batchList"),
    historyList:      $("historyList"),
    historyEmpty:     $("historyEmpty"),
    clearHistoryBtn:  $("clearHistoryBtn"),
    compValue:        $("compValue"),
  };

  /* ============================================================
     READ CONFIG FROM UI
  ============================================================ */

  function readConfig() {
    return {
      uppercase:        els.inclUppercase    ? els.inclUppercase.checked    : true,
      lowercase:        els.inclLowercase    ? els.inclLowercase.checked    : true,
      numbers:          els.inclNumbers      ? els.inclNumbers.checked      : true,
      symbols:          els.inclSymbols      ? els.inclSymbols.checked      : false,
      length:           els.lengthSlider     ? parseInt(els.lengthSlider.value, 10) : 16,
      excludeAmbiguous: els.excludeAmbiguous ? els.excludeAmbiguous.checked : false,
      noRepeats:        els.noRepeats        ? els.noRepeats.checked        : false,
    };
  }

  /* ============================================================
     GENERATE & RENDER
  ============================================================ */

  function handleGenerate() {
    if (!engine) return;

    try {
      engine.configure(readConfig());

      const qty     = getQuantity();
      const results = engine.generateMultiple(qty);

      /* Render primary password (always the first result) */
      renderPassword(results[0]);
      addToHistory(results[0].password);

      /* Render batch output if qty > 1 */
      renderBatch(results);

      /* Update pool size display */
      updateComposition();

    } catch (err) {
      renderError(err.message);
    }
  }

  /* ---- Render a single result to the main display ---- */

  function renderPassword(result) {
    if (!els.display) return;

    /* Clear and trigger scan animation */
    els.display.innerHTML = "";
    els.display.classList.remove("scanning");
    void els.display.offsetWidth;
    els.display.classList.add("scanning");

    /* Build colour-coded character spans */
    const fragment = document.createDocumentFragment();

    result.chars.forEach(function (item, i) {
      const span = document.createElement("span");
      span.className = "pw-char " + item.type;
      span.textContent = item.char;
      span.style.animationDelay = (i * 18) + "ms";
      span.style.animation = "charReveal 0.25s " + (i * 0.018) + "s var(--ease) both";
      fragment.appendChild(span);
    });

    els.display.appendChild(fragment);

    /* Update strength */
    renderStrength(result.strength, result.entropy);
  }

  /* ---- Render strength meter ---- */

  function renderStrength(strength, entropy) {
    if (els.strengthFill) {
      els.strengthFill.style.width = strength.score + "%";
      els.strengthFill.style.background = strength.color;
      els.strengthFill.style.boxShadow  = "0 0 12px " + strength.color;
    }

    if (els.strengthBar) {
      els.strengthBar.setAttribute("aria-valuenow", strength.score);
    }

    if (els.strengthName) {
      els.strengthName.textContent = strength.level;
      els.strengthName.style.color = strength.color;
    }

    if (els.entropyValue) {
      els.entropyValue.textContent   = entropy + " bits";
      els.entropyValue.style.color   = strength.color;
    }
  }

  /* ---- Render batch passwords ---- */

  function renderBatch(results) {
    if (!els.batchSection || !els.batchList) return;

    if (results.length <= 1) {
      els.batchSection.hidden = true;
      return;
    }

    els.batchList.innerHTML = "";
    els.batchSection.hidden = false;

    results.forEach(function (result, i) {
      const li  = document.createElement("li");
      li.className = "batch-item";

      const pw    = document.createElement("span");
      pw.className = "batch-pw";
      pw.textContent = result.password;

      const btn   = document.createElement("button");
      btn.className = "batch-copy-btn";
      btn.textContent = "copy";
      btn.setAttribute("aria-label", "Copy password " + (i + 1));

      btn.addEventListener("click", function () {
        copyToClipboard(result.password, btn);
      });

      li.appendChild(pw);
      li.appendChild(btn);
      li.style.animationDelay = (i * 40) + "ms";
      els.batchList.appendChild(li);
    });
  }

  /* ---- Show error state ---- */

  function renderError(message) {
    if (!els.display) return;
    els.display.innerHTML = "";
    const span = document.createElement("span");
    span.className = "pw-placeholder";
    span.textContent = "⚠ " + message;
    span.style.color = "var(--clr-crit)";
    els.display.appendChild(span);

    if (els.strengthName) {
      els.strengthName.textContent = "Error";
      els.strengthName.style.color = "var(--clr-crit)";
    }
    if (els.strengthFill) {
      els.strengthFill.style.width     = "0";
      els.strengthFill.style.background = "var(--clr-crit)";
    }
    if (els.entropyValue) {
      els.entropyValue.textContent = "— bits";
    }
  }

  /* ============================================================
     CLIPBOARD
  ============================================================ */

  function getCurrentPassword() {
    if (!els.display) return "";
    const spans = els.display.querySelectorAll(".pw-char");
    if (!spans.length) return "";
    return Array.from(spans).map(function (s) { return s.textContent; }).join("");
  }

  function copyToClipboard(text, triggerEl) {
    if (!text) return;

    const useModern = navigator.clipboard && window.isSecureContext;

    if (useModern) {
      navigator.clipboard.writeText(text).then(function () {
        showCopyConfirmation(triggerEl);
      }).catch(function () {
        fallbackCopy(text, triggerEl);
      });
    } else {
      fallbackCopy(text, triggerEl);
    }
  }

  function fallbackCopy(text, triggerEl) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand("copy");
      showCopyConfirmation(triggerEl);
    } catch (e) {
      console.warn("[CipherForge] Copy failed:", e);
    }

    document.body.removeChild(textarea);
  }

  function showCopyConfirmation(triggerEl) {
    /* Icon swap on the main copy button */
    if (triggerEl === els.copyBtn || !triggerEl) {
      const copyIcon  = els.copyBtn ? els.copyBtn.querySelector(".copy-icon")  : null;
      const checkIcon = els.copyBtn ? els.copyBtn.querySelector(".check-icon") : null;

      if (copyIcon)  copyIcon.style.display  = "none";
      if (checkIcon) checkIcon.style.display = "";

      setTimeout(function () {
        if (copyIcon)  copyIcon.style.display  = "";
        if (checkIcon) checkIcon.style.display = "none";
      }, 2000);
    }

    /* Batch item button text swap */
    if (triggerEl && triggerEl.classList.contains("batch-copy-btn")) {
      const orig = triggerEl.textContent;
      triggerEl.textContent = "✓";
      triggerEl.style.color = "var(--clr-green)";
      setTimeout(function () {
        triggerEl.textContent = orig;
        triggerEl.style.color = "";
      }, 1800);
    }

    /* History item button text swap */
    if (triggerEl && triggerEl.classList.contains("history-copy-btn")) {
      const orig = triggerEl.textContent;
      triggerEl.textContent = "✓ copied";
      triggerEl.style.color = "var(--clr-green)";
      setTimeout(function () {
        triggerEl.textContent = orig;
        triggerEl.style.color = "";
      }, 1800);
    }

    /* Toast popup */
    showToast();
  }

  let toastTimer = null;

  function showToast() {
    if (!els.copyToast) return;
    clearTimeout(toastTimer);

    els.copyToast.classList.remove("hiding");
    els.copyToast.classList.add("visible");

    toastTimer = setTimeout(function () {
      els.copyToast.classList.remove("visible");
      els.copyToast.classList.add("hiding");
      setTimeout(function () {
        els.copyToast.classList.remove("hiding");
      }, 300);
    }, 1800);
  }

  /* ============================================================
     HISTORY
  ============================================================ */

  function addToHistory(password) {
    /* Avoid consecutive duplicates */
    if (history.length > 0 && history[0] === password) return;

    history.unshift(password);

    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }

    renderHistory();
  }

  function renderHistory() {
    if (!els.historyList) return;

    /* Clear existing items but not the empty-state placeholder */
    const items = els.historyList.querySelectorAll(".history-item");
    items.forEach(function (el) { el.remove(); });

    if (history.length === 0) {
      if (els.historyEmpty) els.historyEmpty.style.display = "";
      return;
    }

    if (els.historyEmpty) els.historyEmpty.style.display = "none";

    history.forEach(function (pw, i) {
      const li = document.createElement("li");
      li.className = "history-item";
      li.style.animationDelay = (i * 30) + "ms";

      const span = document.createElement("span");
      span.className = "history-pw";
      span.textContent = pw;
      span.title       = pw;

      const btn = document.createElement("button");
      btn.className   = "history-copy-btn";
      btn.textContent = "copy";
      btn.setAttribute("aria-label", "Copy historical password");

      btn.addEventListener("click", function () {
        copyToClipboard(pw, btn);
      });

      li.appendChild(span);
      li.appendChild(btn);
      els.historyList.appendChild(li);
    });
  }

  function clearHistory() {
    history = [];
    renderHistory();
  }

  /* ============================================================
     QUANTITY
  ============================================================ */

  function getQuantity() {
    if (!els.quantityInput) return 1;
    const val = parseInt(els.quantityInput.value, 10);
    return isNaN(val) ? 1 : Math.max(1, Math.min(10, val));
  }

  function setQuantity(val) {
    val = Math.max(1, Math.min(10, val));
    if (els.quantityInput) els.quantityInput.value = val;
  }

  /* ============================================================
     SLIDER FILL GRADIENT
  ============================================================ */

  function updateSliderFill() {
    if (!els.lengthSlider) return;
    const min   = parseFloat(els.lengthSlider.min);
    const max   = parseFloat(els.lengthSlider.max);
    const val   = parseFloat(els.lengthSlider.value);
    const pct   = ((val - min) / (max - min)) * 100;
    els.lengthSlider.style.setProperty("--slider-fill", pct.toFixed(1) + "%");

    if (els.lengthOutput) {
      els.lengthOutput.textContent = val;
    }

    /* Update ARIA */
    els.lengthSlider.setAttribute("aria-valuenow", val);
    els.lengthSlider.setAttribute("aria-label", "Password length: " + val + " characters");
  }

  /* ============================================================
     POOL COMPOSITION
  ============================================================ */

  function updateComposition() {
    if (!engine || !els.compValue) return;
    engine.configure(readConfig());
    const size = engine.getPoolSize();
    els.compValue.textContent = size + " character" + (size !== 1 ? "s" : "");
  }

  /* ============================================================
     EVENT BINDING
  ============================================================ */

  function bindEvents() {

    /* Generate */
    if (els.generateBtn) {
      els.generateBtn.addEventListener("click", handleGenerate);
    }

    /* Refresh (regenerate same settings) */
    if (els.refreshBtn) {
      els.refreshBtn.addEventListener("click", handleGenerate);
    }

    /* Copy main password */
    if (els.copyBtn) {
      els.copyBtn.addEventListener("click", function () {
        copyToClipboard(getCurrentPassword(), els.copyBtn);
      });
    }

    /* Length slider */
    if (els.lengthSlider) {
      els.lengthSlider.addEventListener("input", function () {
        updateSliderFill();
        updateComposition();
        /* Live regeneration on length change */
        if (getCurrentPassword()) handleGenerate();
      });
    }

    /* Charset checkboxes */
    [
      els.inclUppercase,
      els.inclLowercase,
      els.inclNumbers,
      els.inclSymbols,
    ].forEach(function (checkbox) {
      if (checkbox) {
        checkbox.addEventListener("change", function () {
          updateComposition();
          if (getCurrentPassword()) handleGenerate();
        });
      }
    });

    /* Advanced option toggles */
    [els.excludeAmbiguous, els.noRepeats].forEach(function (toggle) {
      if (toggle) {
        toggle.addEventListener("change", function () {
          toggle.setAttribute("aria-checked", String(toggle.checked));
          updateComposition();
          if (getCurrentPassword()) handleGenerate();
        });
      }
    });

    /* Quantity — minus / plus buttons */
    if (els.qtyMinus) {
      els.qtyMinus.addEventListener("click", function () {
        setQuantity(getQuantity() - 1);
      });
    }

    if (els.qtyPlus) {
      els.qtyPlus.addEventListener("click", function () {
        setQuantity(getQuantity() + 1);
      });
    }

    if (els.quantityInput) {
      els.quantityInput.addEventListener("change", function () {
        setQuantity(parseInt(els.quantityInput.value, 10));
      });
    }

    /* Clear history */
    if (els.clearHistoryBtn) {
      els.clearHistoryBtn.addEventListener("click", clearHistory);
    }

    /* Keyboard shortcut: Enter on main button area */
    document.addEventListener("keydown", function (e) {
      /* Ctrl/Cmd + G → generate */
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        handleGenerate();
      }
      /* Ctrl/Cmd + C → copy (only when not in a text input) */
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        document.activeElement &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        const pw = getCurrentPassword();
        if (pw) {
          copyToClipboard(pw, els.copyBtn);
        }
      }
    });
  }

  /* ============================================================
     INITIALISATION
  ============================================================ */

  function init() {
    if (!initEngine()) return;
    bindEvents();
    updateSliderFill();
    updateComposition();
    /* Auto-generate on load for immediate value */
    handleGenerate();
    console.info("[CipherForge] Application initialised successfully.");
  }

  /* ============================================================
     BOOT
  ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
