@echo off
:: %~dp0 provides the dynamic, fully qualified file path to the current script execution directory (backend/src/)
:: Appends the relative path modifier to resolve the sandboxed browser profile storage within the parent architecture.
::start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%~dp0..\browser_profile" --no-first-run --disable-gpu

:: %~dp0 provides the dynamic, fully qualified path to the current script execution directory (backend/src/)
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%~dp0..\browser_profile" --no-first-run --no-default-browser-check --disable-sync --start-maximized --disable-gpu