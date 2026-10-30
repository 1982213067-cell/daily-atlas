@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo  日常集 · 生活工作台（手机版 · HTTPS 隧道）
echo ==========================================
echo.
echo [1/2] 正在启动服务端（端口 3000）...
start "生活工作台-服务端" cmd /k "node_modules\.bin\tsx.cmd server.ts"

timeout /t 3 /nobreak >nul

echo [2/2] 正在启动 HTTPS 隧道...
echo.
echo   ============================================================
echo    稍等几秒，下面日志里会出现一行 https://xxxx.trycloudflare.com
echo    那个就是手机访问地址，复制到手机浏览器打开即可。
echo   ============================================================
echo.
echo   手机首次打开后：浏览器菜单 -^> "添加到主屏幕"，
echo   之后就能像 App 一样点图标直接打开，且支持离线缓存。
echo.
echo   注意：隧道地址每次重启都会变化，变地址后需要重新添加一次。
echo         隧道窗口不要关闭；关掉全部窗口 = 停止服务。
echo.
cloudflared.exe tunnel --no-autoupdate --url http://localhost:3000

pause
