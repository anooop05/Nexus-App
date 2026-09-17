@echo off
echo ==============================================
echo   Starting Nexus Backend and Frontend together
echo ==============================================
npx -y concurrently -n "BACKEND,FRONTEND" -c "cyan,magenta" "npm run dev --prefix nexus-backend" "npm run dev --prefix nexus-frontend"
pause
