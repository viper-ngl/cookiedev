@echo off
cd /d "%~dp0"
git add -A
git commit -m "Update Parkside site"
git push
echo.
echo Done! parksidestores.cc updating now...
pause
