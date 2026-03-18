/**
 * CipherForge — generator.js
 *
 * PasswordEngine: A fully self-contained, OOP password generation engine.
 *
 * Responsibilities:
 *   - Assemble character pools from enabled sets
 *   - Generate cryptographically random passwords using
 *     the Web Crypto API (window.crypto.getRandomValues)
 *   - Calculate Shannon entropy in bits
 *   - Classify strength from entropy value
 *   - Produce colour-typed character metadata for UI rendering
 *   - Support: exclude ambiguous chars, no-repeat mode, quantity
 *
 * Security Note:
 *   This engine uses window.crypto.getRandomValues — a
 *   cryptographically secure pseudo-random number generator (CSPRNG).
 *   It does NOT use Math.random(), which is not suitable for
 *   security-sensitive applications.
 *
 * Dependencies: None. Vanilla JS (ES6+). No external libraries.
 */

"use strict";

class PasswordEngine {

  /* ============================================================
     CHARACTER SETS
  ============================================================ */

  static SETS = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers:   "0123456789",
    symbols:   "!@#$%^&*()_+-=[]{}|;:,.<>?",
  };

  /**
   * Characters excluded in "ambiguous" mode.
   * These are visually confusable across fonts:
   * 0 O o l 1 I i
   */
  static AMBIGUOUS = new Set(["0", "O", "o", "l", "1", "I", "i"]);

  /* ============================================================
     CONSTRUCTOR
  ============================================================ */

  /**
   * @param {Object} options
   * @param {boolean} options.uppercase         Include uppercase letters
   * @param {boolean} options.lowercase         Include lowercase letters
   * @param {boolean} options.numbers           Include numeric digits
   * @param {boolean} options.symbols           Include special symbols
   * @param {number}  options.length            Desired password length (6–64)
   * @param {boolean} options.excludeAmbiguous  Remove visually ambiguous chars
   * @param {boolean} options.noRepeats         Each character used at most once
   */
  constructor(options = {}) {
    this._cfg = Object.assign({
      uppercase:        true,
      lowercase:        true,
      numbers:          true,
      symbols:          false,
      length:           16,
      excludeAmbiguous: false,
      noRepeats:        false,
    }, options);
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */

  /**
   * Update configuration options.
   * @param {Object} newOptions  Partial options to merge
   */
  configure(newOptions) {
    Object.assign(this._cfg, newOptions);
  }

  /**
   * Generate a single password based on current configuration.
   *
   * @returns {{
   *   password: string,
   *   chars: Array<{char: string, type: string}>,
   *   entropy: number,
   *   poolSize: number,
   *   strength: {level: string, score: number, color: string}
   * }}
   * @throws {Error} If no character sets are enabled
   * @throws {Error} If no-repeat mode is requested but pool is smaller than length
   */
  generate() {
    const pool    = this._buildPool();
    const poolArr = Array.from(pool);   /* Spread to array for indexed access */
    const length  = Math.max(6, Math.min(64, this._cfg.length));

    if (poolArr.length === 0) {
      throw new Error("At least one character set must be enabled.");
    }

    if (this._cfg.noRepeats && poolArr.length < length) {
      throw new Error(
        "No-repeat mode requires a pool size (" + poolArr.length + ") " +
        "at least as large as the password length (" + length + "). " +
        "Enable more character sets or reduce the length."
      );
    }

    /* Generate raw character list */
    const usedIndices = new Set();
    const chars       = [];

    for (let i = 0; i < length; i++) {
      let idx;

      do {
        idx = this._secureRandom(poolArr.length);
      } while (this._cfg.noRepeats && usedIndices.has(idx));

      if (this._cfg.noRepeats) usedIndices.add(idx);

      const char = poolArr[idx];
      chars.push({
        char: char,
        type: this._classifyChar(char),
      });
    }

    const password  = chars.map(function (c) { return c.char; }).join("");
    const entropy   = this._calcEntropy(poolArr.length, length);
    const strength  = this._classifyStrength(entropy);
    const poolSize  = poolArr.length;

    return { password, chars, entropy, poolSize, strength };
  }

  /**
   * Generate multiple passwords.
   * @param {number} count  Number of passwords (1–10)
   * @returns {Array}  Array of generate() results
   */
  generateMultiple(count) {
    count = Math.max(1, Math.min(10, count));
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.generate());
    }
    return results;
  }

  /**
   * Return the current pool size (number of unique characters available).
   * @returns {number}
   */
  getPoolSize() {
    return Array.from(this._buildPool()).length;
  }

  /**
   * Return the current configuration (read-only copy).
   * @returns {Object}
   */
  getConfig() {
    return Object.assign({}, this._cfg);
  }

  /* ============================================================
     PRIVATE — POOL BUILDER
  ============================================================ */

  /**
   * Build the character pool string from enabled sets.
   * Applies ambiguous-character exclusion if configured.
   * @returns {string}  The complete character pool
   */
  _buildPool() {
    let pool = "";

    if (this._cfg.uppercase) pool += PasswordEngine.SETS.uppercase;
    if (this._cfg.lowercase) pool += PasswordEngine.SETS.lowercase;
    if (this._cfg.numbers)   pool += PasswordEngine.SETS.numbers;
    if (this._cfg.symbols)   pool += PasswordEngine.SETS.symbols;

    if (this._cfg.excludeAmbiguous) {
      pool = pool.split("").filter(function (c) {
        return !PasswordEngine.AMBIGUOUS.has(c);
      }).join("");
    }

    /* Remove duplicate characters (in case sets overlap — they don't by
       default, but this future-proofs custom set additions) */
    return Array.from(new Set(pool.split(""))).join("");
  }

  /* ============================================================
     PRIVATE — CRYPTOGRAPHICALLY SECURE RANDOM
  ============================================================ */

  /**
   * Return a cryptographically secure random integer in [0, max).
   * Uses rejection sampling to avoid modulo bias.
   *
   * @param {number} max  Upper bound (exclusive)
   * @returns {number}
   */
  _secureRandom(max) {
    if (max <= 0) throw new Error("max must be positive");

    /*
     * To avoid modulo bias, we use rejection sampling:
     * Find the largest multiple of `max` that fits in a Uint32 range,
     * and reject values above it.
     */
    const limit      = Math.floor(0x100000000 / max) * max;
    const buffer     = new Uint32Array(1);
    let   value;

    do {
      window.crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);

    return value % max;
  }

  /* ============================================================
     PRIVATE — ENTROPY CALCULATION
  ============================================================ */

  /**
   * Calculate Shannon entropy (bits) for a random password.
   *
   * Formula: H = L × log₂(N)
   *   where L = password length, N = pool size
   *
   * @param {number} poolSize  Number of unique characters in pool
   * @param {number} length    Password length
   * @returns {number}  Entropy in bits (rounded to 1 decimal place)
   */
  _calcEntropy(poolSize, length) {
    if (poolSize <= 0) return 0;
    const entropy = length * Math.log2(poolSize);
    return Math.round(entropy * 10) / 10;
  }

  /* ============================================================
     PRIVATE — STRENGTH CLASSIFICATION
  ============================================================ */

  /**
   * Map entropy (bits) to a human-readable strength level.
   *
   * Thresholds based on NIST SP 800-63B guidelines and
   * industry-standard password cracking benchmarks.
   *
   * @param {number} entropy  Bits of entropy
   * @returns {{ level: string, score: number, color: string }}
   */
  _classifyStrength(entropy) {
    if (entropy < 28) {
      return { level: "Very Weak", score: 10, color: "var(--clr-crit)" };
    } else if (entropy < 36) {
      return { level: "Weak",      score: 28, color: "var(--clr-warn)" };
    } else if (entropy < 60) {
      return { level: "Fair",      score: 52, color: "var(--clr-fair)" };
    } else if (entropy < 96) {
      return { level: "Strong",    score: 75, color: "var(--clr-good)" };
    } else {
      return { level: "Very Strong", score: 100, color: "var(--clr-great)" };
    }
  }

  /* ============================================================
     PRIVATE — CHARACTER TYPE CLASSIFIER
  ============================================================ */

  /**
   * Map a character to its CSS class type for colour-coded rendering.
   * @param {string} char  Single character
   * @returns {string}  "type-upper" | "type-lower" | "type-number" | "type-symbol"
   */
  _classifyChar(char) {
    if (/[A-Z]/.test(char)) return "type-upper";
    if (/[a-z]/.test(char)) return "type-lower";
    if (/[0-9]/.test(char)) return "type-number";
    return "type-symbol";
  }

}

/* Export for module environments */
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = PasswordEngine;
}
