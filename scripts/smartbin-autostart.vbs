' SmartBin autostart: launches the local stack (MariaDB 3307, API 3000,
' Vite 5173) hidden at Windows login. Copy this file into the user's
' Startup folder:
'   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
CreateObject("WScript.Shell").Run """C:\xampp\htdocs\smartbin\start-smartbin.bat""", 0, False
