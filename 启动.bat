@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo  日常集 · 生活工作台
echo ==========================================
echo.
echo 正在启动服务端（端口 3000）...
start "生活工作台-服务端" cmd /k "node_modules\.bin\tsx.cmd server.ts"

timeout /t 3 /nobreak >nul

echo.
echo 启动完成，访问地址：
echo   电脑：        http://localhost:3000
echo   手机同 WiFi： http://192.168.10.105:3000
echo.
echo 提示：服务端在那个"生活工作台-服务端"窗口里运行，
echo       关掉那个窗口＝停止服务。
echo.
pause
