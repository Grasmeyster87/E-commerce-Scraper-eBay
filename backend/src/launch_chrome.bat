@echo off
:: %~dp0 — це динамічний шлях до поточної папки скрипту (backend/src/)
:: ..\browser_profile піднімає шлях на рівень вище в папку backend/browser_profile
::start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%~dp0..\browser_profile" --no-first-run --disable-gpu

:: %~dp0 — динамічний шлях до поточної папки скрипту (backend/src/)
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%~dp0..\browser_profile" --no-first-run --no-default-browser-check --disable-sync --start-maximized --disable-gpu