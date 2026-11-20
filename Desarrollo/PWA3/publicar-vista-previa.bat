@echo off
rem REQ-102: doble clic para publicar PWA3. No despliega por su cuenta: llama a "npm run publicar:vista-previa",
rem que comprueba exclusiones de secretos, git y pruebas antes de desplegar.
title PWA3 - Publicar vista previa
cd /d "%~dp0"
call npm run publicar:vista-previa
echo.
pause
