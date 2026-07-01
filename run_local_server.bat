@echo off
rem SPDX-License-Identifier: Apache-2.0
cd /d "%~dp0"
where py >nul 2>&1 && (py -3 scripts\run_local_server.py & goto :after)
where python >nul 2>&1 && (python scripts\run_local_server.py & goto :after)
echo [ERROR] Python 3.10+ is not installed or not on PATH.
echo Install Python from https://www.python.org/ and enable Add Python to PATH.
:after
if errorlevel 1 pause
