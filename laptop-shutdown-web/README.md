# ⚡ PowerPulse — One-Click Laptop Shutdown Website

A web application designed to safely and instantly **shut down, restart, sleep, or lock your Windows laptop with a single click**, either from your laptop browser or remotely from your mobile phone via local Wi-Fi.

---

## 🚀 Instant Launch

1. **Double-click `Start_Shutdown_Website.bat`** in this folder.
2. It automatically launches the lightweight Python backend and opens **`http://localhost:7890`** in your default web browser.
3. *(Optional)* Run **`Create_Desktop_Shortcut.bat`** to place a **"Shutdown Laptop"** icon directly onto your Windows Desktop!

---

## 🌟 Key Features

- **⚡ 1-Click Instant Shutdown:**
  - One-click trigger executes `shutdown /s /f /t 0` directly on Windows kernel.
- **⏳ Safety Countdown Windows:**
  - Choose between **Instant (0s)**, **5s Safety Timer**, or **10s Buffer**.
  - Animated high-tech radial countdown with an immediate **"CANCEL / ABORT NOW"** button.
- **🛑 Emergency Abort:**
  - Cancel any active shutdown instantly by pressing **`Esc`** or tapping the abort button (`shutdown /a`).
- **📱 Remote Phone Control (Bed / Across the Room):**
  - Includes an embedded live QR Code. Scan the code with your iPhone or Android camera to open the interface and turn off your laptop from bed without getting up!
- **🔄 Complete Power Hub:**
  - **Restart Laptop** (`shutdown /r /f /t 0`)
  - **Sleep / Suspend** (Low-power standby via Windows Forms API)
  - **Lock Screen** (Secure workstation `Win+L`)
- **⏲️ Sleep Timer (Night / Media Mode):**
  - Preset shutdown timers: 15m, 30m, 45m, 1 hour, 2 hours, or custom minutes.
  - Ideal for falling asleep while watching movies or listening to music.
- **💻 Real-Time Hardware HUD:**
  - Live battery percentage bar and charging state.
  - Laptop hostname, OS version, LAN IP address, and server port.
- **🛡️ Demo Mode (Safe Testing):**
  - Toggle **"Demo Mode"** in the top navigation bar to test UI animations, sounds, and countdowns safely without actually powering down during testing.
- **🎵 Built-in Web Audio Sound FX:**
  - Synthesized sci-fi power-down sound, countdown ticks, and abort chimes using the native Web Audio API (zero audio file loading issues).
- **📦 Zero External Dependencies:**
  - Runs on standard Python 3 (which you already have installed). No `pip install` or `npm install` needed!

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Trigger Master Shutdown |
| <kbd>Esc</kbd> | Emergency Abort Shutdown |

---

## 📁 File Structure

```
laptop-shutdown-web/
├── server.py                   # Python 3 HTTP Server & Windows Power API handler
├── Start_Shutdown_Website.bat  # Double-click launcher
├── Create_Desktop_Shortcut.bat # Desktop shortcut generator
├── README.md                   # Instructions & documentation
└── public/
    ├── index.html              # Cyber-Glassmorphic UI layout
    ├── style.css               # Modern CSS with dark mode & glow effects
    ├── app.js                  # Frontend controller & Web Audio engine
    └── qrcode.min.js           # Standalone QR code generator
```
