@echo off
rem REQ-102: doble clic para publicar PWA3. No despliega por su cuenta: llama a "npm run publicar:produccion",
rem que comprueba exclusiones de secretos, git y pruebas antes de desplegar y pide escribir PUBLICAR.
title PWA3 - Publicar en PRODUCCION
cd /d "%~dp0"
call npm run publicar:produccion
echo.
pause
