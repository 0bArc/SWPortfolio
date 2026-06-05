@echo off
setlocal enabledelayedexpansion

:: ANSI colors (Windows 10+)
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "B=%ESC%[34m"
set "G=%ESC%[32m"
set "Y=%ESC%[33m"
set "R=%ESC%[31m"
set "N=%ESC%[0m"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=help"

:: Load .env.local
if exist .env.local (
    for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
        set "_ln=%%A"
        if not "!_ln:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
    )
)
set "APP=%APP_NAME%"
if "%APP%"=="" set "APP=swportfolio"

if /i "%CMD%"=="auto"    goto :cmd_auto
if /i "%CMD%"=="dev"     goto :cmd_dev
if /i "%CMD%"=="db"      goto :cmd_db
if /i "%CMD%"=="build"   goto :cmd_build
if /i "%CMD%"=="install" goto :cmd_install
if /i "%CMD%"=="deploy"  goto :cmd_deploy
if /i "%CMD%"=="restart" goto :cmd_restart
if /i "%CMD%"=="stop"    goto :cmd_stop
if /i "%CMD%"=="logs"    goto :cmd_logs
if /i "%CMD%"=="status"  goto :cmd_status
goto :cmd_help

:: ─────────────────────────────────────────────────────────────────────────────

:cmd_auto
echo %B%[run]%N% Full automated start...

where node >nul 2>&1 || ( echo %R%[ERR]%N% Node.js not found — install from https://nodejs.org & exit /b 1 )
echo %G%[OK]%N%  Node found

where pm2 >nul 2>&1 || ( echo %Y%[WARN]%N% PM2 not found — installing... & npm install -g pm2 )
echo %G%[OK]%N%  PM2 found

echo %B%[run]%N% Killing PM2...
pm2 kill

if not exist .env.local ( echo %R%[ERR]%N% .env.local missing — create it first & exit /b 1 )

call :check_stamp "package-lock.json" ".install-stamp" _app_dep
if "!_app_dep!"=="1" (
    echo %B%[run]%N% Installing app deps...
    npm ci || ( echo %R%[ERR]%N% npm ci failed & exit /b 1 )
    call :write_stamp "package-lock.json" ".install-stamp"
) else ( echo %G%[OK]%N%  App deps up to date )

echo %B%[run]%N% Building app...
npm run build || ( echo %R%[ERR]%N% Build failed & exit /b 1 )
type nul > .build-stamp

if exist aus (
    call :check_stamp "aus\package-lock.json" "aus\.install-stamp" _aus_dep
    if "!_aus_dep!"=="1" (
        echo %B%[run]%N% Installing AUS deps...
        npm --prefix aus ci || ( echo %R%[ERR]%N% AUS npm ci failed & exit /b 1 )
        call :write_stamp "aus\package-lock.json" "aus\.install-stamp"
    ) else ( echo %G%[OK]%N%  AUS deps up to date )

    echo %B%[run]%N% Building AUS...
    npm --prefix aus run build || ( echo %R%[ERR]%N% AUS build failed & exit /b 1 )
    type nul > aus\.build-stamp
)

echo %B%[run]%N% Starting sys-proxy...
pm2 start aus\dist\server.js --name sys-proxy

echo %B%[run]%N% Starting %APP%...
pm2 start npm --name "%APP%" -- start

pm2 save
echo %G%[OK]%N%  All done
pm2 status
goto :eof

:: ─────────────────────────────────────────────────────────────────────────────

:cmd_db
where docker >nul 2>&1 || ( echo %R%[ERR]%N% Docker not found — install Docker Desktop & exit /b 1 )
docker info >nul 2>&1
if errorlevel 1 (
    echo %Y%[WARN]%N% Docker not running — starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo %B%[run]%N% Waiting for Docker engine...
)
:db_wait_engine
docker info >nul 2>&1
if errorlevel 1 ( timeout /t 3 /nobreak >nul & goto :db_wait_engine )
echo %G%[OK]%N%  Docker engine ready
echo %B%[run]%N% Starting Postgres...
docker start blog-db >nul 2>&1
if errorlevel 1 (
    echo %B%[run]%N% Container not found — creating blog-db...
    docker run -d --name blog-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=blog -p 5432:5432 postgres:16
)
echo %B%[run]%N% Waiting for Postgres to be ready...
:db_wait_pg
timeout /t 1 /nobreak >nul
docker exec blog-db pg_isready -U postgres -q >nul 2>&1
if errorlevel 1 goto :db_wait_pg
echo %G%[OK]%N%  Postgres ready
echo %B%[run]%N% Applying schema...
docker exec -i blog-db psql -U postgres -d blog < src\lib\db\schema.sql
echo %G%[OK]%N%  DB ready
goto :eof

:cmd_dev
if not exist .env.local ( echo %R%[ERR]%N% .env.local missing & exit /b 1 )
echo %B%[run]%N% Starting dev server...
npm run dev
goto :eof

:cmd_build
echo %B%[run]%N% Building app...
npm run build
echo %G%[OK]%N%  App built
echo %B%[run]%N% Building AUS...
npm --prefix aus run build
echo %G%[OK]%N%  AUS built
goto :eof

:cmd_install
echo %B%[run]%N% Installing app deps...
npm ci
echo %B%[run]%N% Building app...
npm run build
echo %B%[run]%N% Installing AUS deps...
npm --prefix aus ci
echo %B%[run]%N% Building AUS...
npm --prefix aus run build
echo %G%[OK]%N%  Install complete
goto :eof

:cmd_deploy
echo %B%[run]%N% Pulling latest...
git pull

call :check_stamp "package-lock.json" ".install-stamp" _app_dep
if "!_app_dep!"=="1" (
    echo %B%[run]%N% Installing app deps...
    npm ci & call :write_stamp "package-lock.json" ".install-stamp"
    echo %G%[OK]%N%  App deps installed
) else ( echo %G%[OK]%N%  App deps up to date )

call :check_newer "src public next.config.ts package.json" ".build-stamp" ".next" _app_build
if "!_app_build!"=="1" (
    echo %B%[run]%N% Building app...
    npm run build & type nul > .build-stamp
    echo %G%[OK]%N%  App built
) else ( echo %G%[OK]%N%  App build up to date )

if exist aus (
    call :check_stamp "aus\package-lock.json" "aus\.install-stamp" _aus_dep
    if "!_aus_dep!"=="1" (
        echo %B%[run]%N% Installing AUS deps...
        npm --prefix aus ci & call :write_stamp "aus\package-lock.json" "aus\.install-stamp"
        echo %G%[OK]%N%  AUS deps installed
    ) else ( echo %G%[OK]%N%  AUS deps up to date )

    call :check_newer "aus\src" "aus\.build-stamp" "aus\dist" _aus_build
    if "!_aus_build!"=="1" (
        echo %B%[run]%N% Building AUS...
        npm --prefix aus run build & type nul > aus\.build-stamp
        echo %G%[OK]%N%  AUS built
    ) else ( echo %G%[OK]%N%  AUS build up to date )
)

call :do_restart
goto :eof

:cmd_restart
call :do_restart
goto :eof

:do_restart
echo %B%[run]%N% Restarting processes...
pm2 restart sys-proxy --update-env 2>nul || echo %Y%[WARN]%N% sys-proxy not in PM2 — skipping
pm2 restart "%APP%" --update-env 2>nul || (
    echo %Y%[WARN]%N% %APP% not running — starting...
    pm2 start npm --name "%APP%" -- start
    pm2 save
)
echo %G%[OK]%N%  Restarted
pm2 status
goto :eof

:cmd_stop
pm2 stop "%APP%" 2>nul
pm2 stop sys-proxy 2>nul
echo %Y%[WARN]%N% Stopped
goto :eof

:cmd_logs
set "LINES=%~2"
if "%LINES%"=="" set "LINES=50"
pm2 logs "%APP%" --lines %LINES%
goto :eof

:cmd_status
pm2 status
goto :eof

:cmd_help
echo.
echo   %B%kristiansen.icu ^— run.bat%N%
echo.
echo   auto          Install everything + start all PM2 processes
echo   dev           Start local dev server
echo   db            Start Postgres Docker container + apply schema
echo   build         Build app + AUS
echo   install       npm ci + build (app + AUS, full clean)
echo   deploy        git pull + smart deps/build + restart both PM2 processes
echo   restart       Restart PM2 processes (app + sys-proxy)
echo   stop          Stop PM2 processes
echo   logs [n]      PM2 logs (default: last 50 lines)
echo   status        PM2 process status
echo.
goto :eof

:: ─────────────────────────────────────────────────────────────────────────────
:: :check_stamp <lockfile> <stampfile> <outvar>
::   Sets outvar=0 if hash matches stamp, outvar=1 if mismatch/missing
:check_stamp
set "%~3=1"
if not exist "%~2" goto :eof
for /f "usebackq" %%H in (`powershell -NoProfile -Command "(Get-FileHash '%~1' -Algorithm MD5).Hash"`) do set "_h=%%H"
set /p "_s=" < "%~2"
if /i "!_h!"=="!_s!" set "%~3=0"
goto :eof

:: :write_stamp <lockfile> <stampfile>
:write_stamp
powershell -NoProfile -Command "(Get-FileHash '%~1' -Algorithm MD5).Hash | Set-Content '%~2'"
goto :eof

:: :check_newer <paths> <stampfile> <required_dir> <outvar>
::   Sets outvar=1 if stamp/dir missing or any file in paths newer than stamp
:check_newer
set "%~4=1"
if not exist "%~3" goto :eof
if not exist "%~2" goto :eof
powershell -NoProfile -Command ^
  "if (Get-ChildItem %~1 -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Item '%~2').LastWriteTime } | Select-Object -First 1) { exit 1 } else { exit 0 }"
if errorlevel 1 goto :eof
set "%~4=0"
goto :eof
