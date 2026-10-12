@echo off
title Smart Life Manager - Dev Server
cd /d "%~dp0"
echo ==============================================================
echo   Smart Life Manager - Development Server
echo   Local: http://localhost:3000
echo ==============================================================
npm.cmd run dev
pause
