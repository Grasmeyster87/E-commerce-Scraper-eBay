@echo off
:: Запуск Google Chrome у режимі віддаленої відладки (Remote Debugging)
:: Профіль браузера створюється локально у папці: %~dp0browser_profile
echo ======================================================================
echo Launching Chrome in Debugging Mode (Port 9222)...
echo User Profile Directory: "%~dp0browser_profile"
echo ======================================================================

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%~dp0browser_profile" --no-first-run --no-default-browser-check --disable-sync --start-maximized --disable-gpu
