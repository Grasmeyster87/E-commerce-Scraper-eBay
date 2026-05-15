#!/bin/bash
# $(dirname "$0") — це шлях до поточної папки, де лежить цей .sh файл
"/c/Program Files/Google/Chrome/Application/chrome.exe" --remote-debugging-port=9222 --user-data-dir="$(dirname "$0")/../browser_profile" --no-first-run --no-default-browser-check --disable-sync --start-maximized --disable-gpu &