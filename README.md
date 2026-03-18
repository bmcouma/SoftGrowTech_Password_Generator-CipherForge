# 🔐 CipherForge — Password Generator

CipherForge is a professional-grade, browser-based password generator built entirely on vanilla web standards. It uses the Web Crypto API for cryptographically secure randomness — not `Math.random()` — and presents the output through a dark terminal-inspired interface designed to feel like a serious security tool rather than a generic form.

> Forge unbreakable passwords. Instantly. In your browser.

---

## 🔗 Live Preview

Open `index.html` directly in any modern browser. No server, no build tools, no dependencies.

---

## ✨ Features

### Core (as required)
- **Generate random passwords** on button click
- **Options for numbers, symbols, and uppercase letters** via toggleable character set cards
- **Display generated password** on screen with colour-coded character types
- **JavaScript-powered** password logic using the Web Crypto API (CSPRNG)
- **Clean, professional interface** with a dark terminal aesthetic

### Beyond Requirements
- **Cryptographically secure** — uses `window.crypto.getRandomValues` with rejection sampling to eliminate modulo bias. Never uses `Math.random()`
- **Entropy calculation** — Shannon entropy displayed in bits per password
- **Strength meter** — five levels (Very Weak → Very Strong) based on NIST SP 800-63B thresholds
- **Colour-coded output** — uppercase (blue), lowercase (white), numbers (green), symbols (pink)
- **Exclude ambiguous characters** — removes 0, O, l, 1, I for readability
- **No repeated characters** mode — every character appears at most once
- **Batch generation** — generate up to 10 passwords simultaneously
- **Password history panel** — last 8 generated passwords with individual copy buttons
- **Pool size display** — shows exact number of unique characters in the active pool
- **Clipboard copy** — modern Clipboard API with execCommand fallback
- **Copy confirmation** — icon swap + toast notification on successful copy
- **Auto-generate on load** — immediate value on first visit
- **Live regeneration** — new password generated on any setting change
- **Strength guide** — entropy thresholds explained in the sidebar
- **Security tips** — best practice advice displayed alongside the generator
- **Keyboard shortcuts:** `Ctrl+G` generate, `Ctrl+C` copy (when not in a text field)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure, ARIA roles, accessibility |
| **CSS3** | Design system, CSS variables, Grid, Flexbox, animations |
| **Vanilla JavaScript (ES6+)** | OOP password engine, Web Crypto API, clipboard |
| **Google Fonts** | JetBrains Mono (output/code) + Syne (display/UI) |
| **Web Crypto API** | Cryptographically secure random number generation |

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| Base | `#080c10` | Page background |
| Surface | `#0d1117` | Panel backgrounds |
| Green | `#00ffa0` | Primary accent, numbers |
| Blue | `#4d9fff` | Uppercase characters |
| Pink | `#ff7eb6` | Symbol characters |
| Crit | `#ff4757` | Very Weak strength |
| Great | `#00ffa0` | Very Strong strength |

**Typography:** JetBrains Mono (password output, code) · Syne (UI headings)

---

## 📁 Project Structure

```text
CipherForge/
├── index.html              ← Full semantic structure with ARIA
├── css/
│   ├── style.css           ← Complete design system and component styles
│   └── animations.css      ← All keyframes and transition utilities
└── js/
    ├── generator.js        ← PasswordEngine class (OOP, CSPRNG, entropy)
    └── main.js             ← App controller, UI bindings, clipboard, history
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + G` | Generate new password |
| `Ctrl + C` | Copy password (when not in a text input) |

---

## 🔑 Strength Thresholds

| Level | Entropy | Description |
|---|---|---|
| Very Weak | < 28 bits | Trivially crackable |
| Weak | 28 – 35 bits | Vulnerable to brute force |
| Fair | 36 – 59 bits | Moderate protection |
| Strong | 60 – 95 bits | Good for most accounts |
| Very Strong | 96+ bits | Enterprise / high-security |

---

## 🚀 Setup

```bash
# Clone the repository
git clone https://github.com/bmcouma/SoftGrowTech_Password_Generator-CipherForge-.git

# Navigate into the project
cd SoftGrowTech_Password_Generator-CipherForge-

# Open in browser
open index.html
```

Requires an active internet connection to load Google Fonts. All password generation happens entirely client-side. Nothing is sent to any server.

---

## 📄 License

Open source under the MIT License.  
Typography from [Google Fonts](https://fonts.google.com) under the Open Font License.

# SoftGrowTech_Password_Generator-CipherForge
