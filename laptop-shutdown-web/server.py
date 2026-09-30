#!/usr/bin/env python3

"""
PowerPulse — 1-Click Laptop Shutdown & Remote Power Controller Server

Windows server with optional Cloudflare Tunnel support.
"""

import atexit
import http.server
import json
import os
import platform
import re
import secrets
import shutil
import socket
import socketserver
import subprocess
import sys
import threading
import time
from urllib.parse import parse_qs, urlparse


# ============================================================
# Paths
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
PID_PATH = os.path.join(BASE_DIR, "server.pid")
LOG_PATH = os.path.join(BASE_DIR, "service.log")
PUBLIC_URL_FILE = os.path.join(BASE_DIR, "public_url.txt")
PUBLIC_URL_AUTH_FILE = os.path.join(BASE_DIR, "public_url_full.txt")


# ============================================================
# Configuration
# ============================================================

DEFAULT_CONFIG = {
    "port": 7890,
    "pin": "7890",
    "secret_key": None,
    "enable_tunnel": True,
    "allow_unauthenticated_localhost": False
}


def log(message):
    """Write message to console and log file."""
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    line = f"{timestamp} {message}\n"

    sys.stdout.write(line)
    sys.stdout.flush()

    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


def load_or_create_config():
    """Load config.json or create default configuration."""
    config = dict(DEFAULT_CONFIG)

    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                user_config = json.load(f)
                config.update(user_config)
        except Exception as e:
            log(
                f"[!] Warning: Failed to read {CONFIG_PATH}: "
                f"{e}. Using defaults."
            )

    if not config.get("secret_key"):
        config["secret_key"] = secrets.token_hex(16)

        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2)

            log(f"[*] Generated secure secret key in {CONFIG_PATH}")

        except Exception as e:
            log(f"[!] Warning: Could not save secret key: {e}")

    return config


CONFIG = load_or_create_config()
PORT = int(CONFIG.get("port", 7890))


# ============================================================
# State
# ============================================================

system_state = {
    "scheduled_shutdown": None,
    "scheduled_duration": 0,
    "last_action": None,
    "last_action_time": None,
    "public_url": None,
    "tunnel_active": False,
    "tunnel_error": None
}


battery_cache = {
    "data": {
        "percent": 100,
        "charging": False,
        "status_text": "Unknown"
    },
    "timestamp": 0
}


auth_failures = {}


# ============================================================
# PID
# ============================================================

def write_pid_file():
    try:
        with open(PID_PATH, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
    except Exception as e:
        log(f"[!] Could not write PID file: {e}")


def remove_pid_file():
    try:
        if os.path.exists(PID_PATH):
            os.remove(PID_PATH)
    except Exception:
        pass


# ============================================================
# Network
# ============================================================

def get_lan_ip():
    """Detect active LAN IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]

    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = "127.0.0.1"

    finally:
        s.close()

    return ip


# ============================================================
# Battery
# ============================================================

def get_battery_info():
    """Get battery information with 10-second cache."""

    now = time.time()

    if now - battery_cache["timestamp"] < 10:
        return battery_cache["data"]

    percent = None
    charging = False
    status_text = "Unknown"

    if platform.system() == "Windows":
        try:
            cmd = (
                'powershell -NoProfile -Command '
                '"Get-CimInstance Win32_Battery | '
                'Select-Object -First 1 EstimatedChargeRemaining, BatteryStatus '
                '| ConvertTo-Json"'
            )

            proc = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=3
            )

            if proc.returncode == 0 and proc.stdout.strip():
                data = json.loads(proc.stdout)

                percent = data.get(
                    "EstimatedChargeRemaining",
                    100
                )

                status_code = data.get(
                    "BatteryStatus",
                    1
                )

                charging = status_code in (2, 6, 7, 8, 9)

                if charging:
                    status_text = "Charging"
                elif status_code == 3:
                    status_text = "Fully Charged"
                else:
                    status_text = "On Battery"

        except Exception:
            pass

    if percent is None:
        percent = 100
        status_text = "AC Power / Desktop"

    battery_cache["data"] = {
        "percent": percent,
        "charging": charging,
        "status_text": status_text
    }

    battery_cache["timestamp"] = now

    return battery_cache["data"]


# ============================================================
# Power Actions
# ============================================================

def execute_power_action(action, delay=0, simulate=False):

    if simulate:
        return {
            "success": True,
            "message": (
                f"[SIMULATION] '{action}' triggered with "
                f"{delay}s delay. No actual power action performed."
            )
        }

    if platform.system() != "Windows":
        return {
            "success": False,
            "message": (
                f"Unsupported OS: {platform.system()}. "
                "Only Windows is supported."
            )
        }

    try:
        delay = max(0, int(delay))

        # Shutdown
        if action == "shutdown":

            if delay > 0:
                cmd = f"shutdown /s /f /t {delay}"

                system_state["scheduled_shutdown"] = (
                    time.time() + delay
                )

                system_state["scheduled_duration"] = delay

                msg = (
                    f"Laptop will shut down in {delay} seconds. "
                    "You can abort it anytime."
                )

            else:
                cmd = "shutdown /s /f /t 0"

                system_state["scheduled_shutdown"] = None
                system_state["scheduled_duration"] = 0

                msg = "Shutdown initiated immediately."

            subprocess.run(
                cmd,
                shell=True,
                check=True
            )

            system_state["last_action"] = "shutdown"
            system_state["last_action_time"] = time.time()

            return {
                "success": True,
                "message": msg
            }

        # Restart
        elif action == "restart":

            if delay > 0:
                cmd = f"shutdown /r /f /t {delay}"

                system_state["scheduled_shutdown"] = (
                    time.time() + delay
                )

                system_state["scheduled_duration"] = delay

                msg = (
                    f"Laptop will restart in {delay} seconds."
                )

            else:
                cmd = "shutdown /r /f /t 0"

                system_state["scheduled_shutdown"] = None
                system_state["scheduled_duration"] = 0

                msg = "Restart initiated."

            subprocess.run(
                cmd,
                shell=True,
                check=True
            )

            system_state["last_action"] = "restart"
            system_state["last_action_time"] = time.time()

            return {
                "success": True,
                "message": msg
            }

        # Sleep
        elif action == "sleep":

            system_state["scheduled_shutdown"] = None
            system_state["scheduled_duration"] = 0

            cmd = (
                'powershell -NoProfile -Command '
                '"Add-Type -AssemblyName System.Windows.Forms; '
                '[System.Windows.Forms.Application]::'
                'SetSuspendState('
                '[System.Windows.Forms.PowerState]::Suspend, '
                '$false, '
                '$false)"'
            )

            subprocess.Popen(
                cmd,
                shell=True
            )

            system_state["last_action"] = "sleep"
            system_state["last_action_time"] = time.time()

            return {
                "success": True,
                "message": "Entering Sleep mode..."
            }

        # Lock
        elif action == "lock":

            cmd = "rundll32.exe user32.dll,LockWorkStation"

            subprocess.run(
                cmd,
                shell=True,
                check=True
            )

            system_state["last_action"] = "lock"
            system_state["last_action_time"] = time.time()

            return {
                "success": True,
                "message": "Workstation locked successfully."
            }

        # Abort
        elif action == "abort":

            cmd = "shutdown /a"

            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True
            )

            system_state["scheduled_shutdown"] = None
            system_state["scheduled_duration"] = 0
            system_state["last_action"] = "abort"
            system_state["last_action_time"] = time.time()

            if result.returncode == 0:
                return {
                    "success": True,
                    "message": (
                        "Scheduled shutdown successfully aborted!"
                    )
                }

            return {
                "success": True,
                "message": "No active shutdown was in progress."
            }

        else:
            return {
                "success": False,
                "message": f"Unknown action: {action}"
            }

    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "message": f"Command error: {e}"
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Execution error: {e}"
        }


# ============================================================
# Cloudflare Tunnel
# ============================================================

class CloudflareTunnelManager:

    def __init__(self, local_port):
        self.local_port = local_port
        self.process = None
        self.stop_requested = False
        self.thread = None
        self.cloudflared_bin = self._find_binary()

    def _find_binary(self):

        candidates = [
            os.path.join(
                BASE_DIR,
                "bin",
                "cloudflared.exe"
            ),
            r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
            r"C:\Program Files\cloudflared\cloudflared.exe",
            shutil.which("cloudflared")
        ]

        for path in candidates:
            if path and os.path.exists(path):
                return path

        return None

    def start(self):

        if not self.cloudflared_bin:
            log(
                "[!] cloudflared executable not found. "
                "Public tunnel disabled."
            )

            system_state["tunnel_error"] = (
                "cloudflared binary not found"
            )

            return

        self.stop_requested = False

        self.thread = threading.Thread(
            target=self._run_tunnel_loop,
            daemon=True
        )

        self.thread.start()

    def _run_tunnel_loop(self):

        while not self.stop_requested:

            log(
                f"[*] Starting Cloudflare Tunnel "
                f"on port {self.local_port}..."
            )

            cmd = [
                self.cloudflared_bin,
                "tunnel",
                "--url",
                f"http://127.0.0.1:{self.local_port}"
            ]

            try:

                creationflags = (
                    0x08000000
                    if platform.system() == "Windows"
                    else 0
                )

                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    bufsize=1,
                    creationflags=creationflags
                )

                for line in self.process.stdout:

                    if self.stop_requested:
                        break

                    line_clean = line.strip()

                    if line_clean:
                        log(f"[CF] {line_clean}")

                    if "trycloudflare.com" not in line_clean:
                        continue

                    match = re.search(
                        r"https://[a-zA-Z0-9-]+\.trycloudflare\.com",
                        line_clean
                    )

                    if not match:
                        continue

                    public_url = match.group(0).rstrip("/")

                    system_state["public_url"] = public_url
                    system_state["tunnel_active"] = True
                    system_state["tunnel_error"] = None

                    auth_url = (
                        f"{public_url}/"
                        f"?key={CONFIG['secret_key']}"
                    )

                    try:
                        with open(
                            PUBLIC_URL_FILE,
                            "w",
                            encoding="utf-8"
                        ) as f:
                            f.write(public_url)

                        with open(
                            PUBLIC_URL_AUTH_FILE,
                            "w",
                            encoding="utf-8"
                        ) as f:
                            f.write(auth_url)

                    except Exception as e:
                        log(
                            f"[!] Warning writing tunnel files: {e}"
                        )

                    log("=" * 64)
                    log("[*] PUBLIC INTERNET ACCESS ACTIVE")
                    log(f"[*] Public URL: {public_url}")
                    log(f"[*] Authenticated URL: {auth_url}")
                    log(f"[*] Security PIN: {CONFIG['pin']}")
                    log("=" * 64)

                self.process.wait()

            except Exception as e:

                log(
                    f"[!] Tunnel process error: {e}"
                )

                system_state["tunnel_error"] = str(e)

            finally:

                system_state["tunnel_active"] = False

                self.process = None

            if not self.stop_requested:

                log(
                    "[!] Cloudflare Tunnel disconnected. "
                    "Reconnecting in 5 seconds..."
                )

                time.sleep(5)

    def stop(self):

        self.stop_requested = True

        process = self.process

        if process:

            try:
                process.terminate()
                process.wait(timeout=3)

            except Exception:

                try:
                    process.kill()
                except Exception:
                    pass

        self.process = None
        system_state["tunnel_active"] = False


# ============================================================
# HTTP Server
# ============================================================

class PowerRequestHandler(
    http.server.SimpleHTTPRequestHandler
):

    def __init__(self, *args, **kwargs):

        super().__init__(
            *args,
            directory=PUBLIC_DIR,
            **kwargs
        )

    def log_message(self, format_string, *args):

        log(
            f"[{self.client_address[0]}] "
            f"{format_string % args}"
        )

    def send_cors_headers(self):

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-Access-Key, X-PIN"
        )

    def do_OPTIONS(self):

        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    # --------------------------------------------------------
    # Rate Limiting
    # --------------------------------------------------------

    def check_rate_limit(self, client_ip):

        record = auth_failures.get(client_ip)

        if record:

            if time.time() < record.get(
                "locked_until",
                0
            ):

                remaining = int(
                    record["locked_until"] - time.time()
                )

                return (
                    False,
                    f"Too many failed PIN attempts. "
                    f"Locked out for {remaining} seconds."
                )

            elif record.get("count", 0) >= 5:

                auth_failures[client_ip] = {
                    "count": 0,
                    "locked_until": 0
                }

        return True, ""

    def record_auth_failure(self, client_ip):

        now = time.time()

        record = auth_failures.get(
            client_ip,
            {
                "count": 0,
                "locked_until": 0
            }
        )

        record["count"] += 1

        if record["count"] >= 5:

            record["locked_until"] = now + 300

            log(
                f"[SECURITY] Client {client_ip} "
                "locked out for 5 minutes."
            )

        auth_failures[client_ip] = record

    def reset_auth_failures(self, client_ip):

        if client_ip in auth_failures:
            del auth_failures[client_ip]

    # --------------------------------------------------------
    # Authentication
    # --------------------------------------------------------

    def is_request_authenticated(
        self,
        payload=None,
        query_params=None
    ):

        key_header = self.headers.get(
            "X-Access-Key"
        )

        if (
            key_header
            and key_header == CONFIG["secret_key"]
        ):
            return True

        pin_header = self.headers.get("X-PIN")

        if (
            pin_header
            and pin_header == CONFIG["pin"]
        ):
            return True

        if query_params and "key" in query_params:

            if (
                query_params["key"]
                and query_params["key"][0]
                == CONFIG["secret_key"]
            ):
                return True

        if payload:

            key_body = payload.get("key")

            if (
                key_body
                and key_body == CONFIG["secret_key"]
            ):
                return True

            pin_body = payload.get("pin")

            if (
                pin_body
                and str(pin_body)
                == str(CONFIG["pin"])
            ):
                return True

        return False

    # --------------------------------------------------------
    # GET
    # --------------------------------------------------------

    def do_GET(self):

        parsed = urlparse(self.path)

        query_params = parse_qs(
            parsed.query
        )

        if parsed.path == "/api/status":

            lan_ip = get_lan_ip()
            hostname = socket.gethostname()
            battery = get_battery_info()

            remaining_sec = 0
            is_active = False

            if system_state["scheduled_shutdown"] is not None:

                remaining = (
                    system_state["scheduled_shutdown"]
                    - time.time()
                )

                if remaining > 0:

                    remaining_sec = int(remaining)
                    is_active = True

                else:

                    system_state["scheduled_shutdown"] = None
                    system_state["scheduled_duration"] = 0

            is_auth = self.is_request_authenticated(
                query_params=query_params
            )

            public_url = system_state["public_url"]

            auth_url = (
                f"{public_url}/"
                f"?key={CONFIG['secret_key']}"
                if public_url
                else None
            )

            response_data = {

                "status": "online",

                "hostname": hostname,

                "os": (
                    f"{platform.system()} "
                    f"{platform.release()}"
                ),

                "lan_ip": lan_ip,

                "port": PORT,

                "local_url": (
                    f"http://localhost:{PORT}"
                ),

                "network_url": (
                    f"http://{lan_ip}:{PORT}"
                ),

                "public_url": public_url,

                "authenticated_url": auth_url,

                "tunnel_active": (
                    system_state["tunnel_active"]
                ),

                "tunnel_error": (
                    system_state["tunnel_error"]
                ),

                "battery": battery,

                "is_authenticated": is_auth,

                "scheduled": {

                    "active": is_active,

                    "remaining_seconds": remaining_sec,

                    "total_seconds": (
                        system_state[
                            "scheduled_duration"
                        ]
                    ),

                    "last_action": (
                        system_state["last_action"]
                    )
                }
            }

            body = json.dumps(
                response_data
            ).encode("utf-8")

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "application/json; charset=utf-8"
            )

            self.send_header(
                "Cache-Control",
                "no-cache, no-store, must-revalidate"
            )

            self.send_cors_headers()

            self.send_header(
                "Content-Length",
                str(len(body))
            )

            self.end_headers()

            self.wfile.write(body)

            return

        return super().do_GET()

    # --------------------------------------------------------
    # POST
    # --------------------------------------------------------

    def do_POST(self):

        parsed = urlparse(self.path)
        client_ip = self.client_address[0]

        try:

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    0
                )
            )

        except ValueError:

            content_length = 0

        body_bytes = self.rfile.read(
            content_length
        )

        try:

            payload = (
                json.loads(
                    body_bytes.decode("utf-8")
                )
                if body_bytes
                else {}
            )

        except Exception:

            payload = {}

        # Authentication endpoint

        if parsed.path == "/api/verify-auth":

            can_attempt, rate_msg = (
                self.check_rate_limit(client_ip)
            )

            if not can_attempt:

                self._send_json(
                    429,
                    {
                        "valid": False,
                        "message": rate_msg
                    }
                )

                return

            pin = str(
                payload.get(
                    "pin",
                    ""
                )
            ).strip()

            key = str(
                payload.get(
                    "key",
                    ""
                )
            ).strip()

            valid = (
                (pin and pin == str(CONFIG["pin"]))
                or
                (key and key == CONFIG["secret_key"])
            )

            if valid:

                self.reset_auth_failures(
                    client_ip
                )

                response = {
                    "valid": True,
                    "token": CONFIG["secret_key"],
                    "message": "PIN verified successfully!"
                }

                log(
                    f"[AUTH] Client {client_ip} "
                    "successfully authenticated."
                )

                self._send_json(
                    200,
                    response
                )

            else:

                self.record_auth_failure(
                    client_ip
                )

                log(
                    f"[AUTH] Client {client_ip} "
                    "provided invalid PIN or key."
                )

                self._send_json(
                    401,
                    {
                        "valid": False,
                        "message": (
                            "Incorrect PIN. "
                            "Please try again."
                        )
                    }
                )

            return

        # Power action endpoint

        if parsed.path == "/api/action":

            can_attempt, rate_msg = (
                self.check_rate_limit(client_ip)
            )

            if not can_attempt:

                self._send_json(
                    429,
                    {
                        "success": False,
                        "message": rate_msg
                    }
                )

                return

            if not self.is_request_authenticated(
                payload=payload
            ):

                log(
                    f"[UNAUTHORIZED] Power action "
                    f"rejected from {client_ip}."
                )

                self._send_json(
                    401,
                    {
                        "success": False,
                        "unauthorized": True,
                        "message": (
                            "Unauthorized. "
                            "Please enter your PIN."
                        )
                    }
                )

                return

            action = str(
                payload.get(
                    "action",
                    ""
                )
            )

            try:

                delay = int(
                    payload.get(
                        "delay",
                        0
                    )
                )

            except (ValueError, TypeError):

                delay = 0

            simulate = (
                payload.get(
                    "simulate",
                    False
                ) is True
            )

            log(
                f"[ACTION] Triggering '{action}' "
                f"(delay={delay}s, "
                f"sim={simulate}) "
                f"from {client_ip}"
            )

            result = execute_power_action(
                action,
                delay,
                simulate
            )

            status_code = (
                200
                if result.get("success")
                else 400
            )

            self._send_json(
                status_code,
                result
            )

            return

        self.send_response(404)
        self.end_headers()

    # --------------------------------------------------------
    # JSON response
    # --------------------------------------------------------

    def _send_json(
        self,
        status_code,
        data
    ):

        response = json.dumps(
            data
        ).encode("utf-8")

        self.send_response(
            status_code
        )

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_cors_headers()

        self.send_header(
            "Content-Length",
            str(len(response))
        )

        self.end_headers()

        self.wfile.write(response)


# ============================================================
# Threaded Server
# ============================================================

class ThreadedTCPServer(
    socketserver.ThreadingMixIn,
    socketserver.TCPServer
):

    allow_reuse_address = True
    daemon_threads = True


# ============================================================
# Cleanup
# ============================================================

tunnel_mgr = None
cleanup_done = False


def cleanup():

    global cleanup_done

    if cleanup_done:
        return

    cleanup_done = True

    log(
        "[*] Shutting down PowerPulse controller..."
    )

    if tunnel_mgr:
        tunnel_mgr.stop()

    remove_pid_file()


atexit.register(cleanup)


# ============================================================
# Main
# ============================================================

def main():

    global tunnel_mgr

    if hasattr(sys.stdout, "reconfigure"):

        try:
            sys.stdout.reconfigure(
                encoding="utf-8"
            )
        except Exception:
            pass

    os.makedirs(
        PUBLIC_DIR,
        exist_ok=True
    )

    write_pid_file()

    lan_ip = get_lan_ip()

    server_address = (
        "0.0.0.0",
        PORT
    )

    log("=" * 64)

    log(
        "[*] POWERPULSE - "
        "ONE-CLICK LAPTOP CONTROLLER"
    )

    log("=" * 64)

    log(
        f"[*] Process ID (PID): {os.getpid()}"
    )

    log(
        f"[*] Local Access: "
        f"http://localhost:{PORT}"
    )

    log(
        f"[*] Phone / Wi-Fi: "
        f"http://{lan_ip}:{PORT}"
    )

    log(
        f"[*] Security PIN: "
        f"{CONFIG['pin']}"
    )

    log(
        f"[*] Serving files: "
        f"{PUBLIC_DIR}"
    )

    log("=" * 64)

    # Cloudflare Tunnel

    if CONFIG.get(
        "enable_tunnel",
        True
    ):

        tunnel_mgr = (
            CloudflareTunnelManager(
                PORT
            )
        )

        tunnel_mgr.start()

    log(
        "[*] Ready to receive power commands."
    )

    try:

        with ThreadedTCPServer(
            server_address,
            PowerRequestHandler
        ) as httpd:

            httpd.serve_forever()

    except KeyboardInterrupt:

        log(
            "\n[*] Interrupted by user. Exiting..."
        )

    except Exception as e:

        log(
            f"[!] Server exception: {e}"
        )

    finally:

        cleanup()


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":
    main()