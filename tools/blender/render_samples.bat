@echo off
rem Easy Reader: six key stills of every style for one idea, at preview size.
rem Change BLENDER if Blender is installed somewhere else. Change IDEA to try another idea (1 to 100).
set BLENDER=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe
set IDEA=12
cd /d "%~dp0"
if not exist "%BLENDER%" (
  echo Could not find Blender at "%BLENDER%".
  echo Open this file in Notepad and fix the BLENDER line.
  pause
  exit /b 1
)
for %%s in (paper clay glass desk kinetic lantern) do (
  echo.
  echo ===== %%s =====
  "%BLENDER%" -b -P make_video.py -- --style %%s --idea %IDEA% --still key --quality preview
)
echo.
echo Done. The pictures are in the renders folder.
explorer renders
pause
