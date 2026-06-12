@echo off
setlocal enabledelayedexpansion

for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "B=%ESC%[34m"
set "G=%ESC%[32m"
set "Y=%ESC%[33m"
set "R=%ESC%[31m"
set "N=%ESC%[0m"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=help"

if exist .env.local (
    for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
        set "_ln=%%A"
        if not "!_ln:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
    )
)
set "APP=%APP_NAME%"
if "%APP%"=="" set "APP=swportfolio"

if /i "%CMD%"=="local"   goto :cmd_local
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

:: ── local dev (Docker Desktop + Next.js) ────────────────────────────────────

:cmd_local
if not exist .env.local (
    if exist .env.example (
        echo %Y%[WARN]%N% .env.local missing — copying .env.example...
        copy /Y .env.example .env.local >nul
    ) else (
        echo %R%[ERR]%N% .env.local missing — copy .env.example to .env.local & exit /b 1
    )
)
call :cmd_db
if errorlevel 1 exit /b 1
if not exist .env.local ( echo %R%[ERR]%N% .env.local missing — copy .env.example to .env.local & exit /b 1 )
echo %B%[run]%N% Dev server...
call npm run dev
exit /b %errorlevel%

:cmd_dev
if not exist .env.local ( echo %R%[ERR]%N% .env.local missing — copy .env.example to .env.local & exit /b 1 )
echo %B%[run]%N% Dev server...
call npm run dev
exit /b %errorlevel%

:cmd_db
call :parse_db_url
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
echo %G%[OK]%N%  Docker ready

docker start blog-db >nul 2>&1
if errorlevel 1 (
    echo %B%[run]%N% Creating blog-db user !DB_USER! db !DB_NAME!...
    docker run -d --name blog-db ^
        -e POSTGRES_USER=!DB_USER! ^
        -e POSTGRES_PASSWORD=!DB_PASS! ^
        -e POSTGRES_DB=!DB_NAME! ^
        -p 5432:5432 ^
        postgres:16
)
:db_wait_pg
ping -n 2 127.0.0.1 >nul
docker exec blog-db pg_isready -U !DB_USER! -q >nul 2>&1
if errorlevel 1 goto :db_wait_pg
echo %G%[OK]%N%  Postgres ready
docker exec blog-db psql -U !DB_USER! -d postgres -c "ALTER USER \"!DB_USER!\" WITH PASSWORD '!DB_PASS!';" >nul 2>&1
docker exec -i blog-db psql -U !DB_USER! -d !DB_NAME! < src\database\sql\migrate.sql >nul
echo %G%[OK]%N%  Migrations applied
goto :eof

:: ── server / PM2 ─────────────────────────────────────────────────────────────

:cmd_auto
echo %B%[run]%N% Automated start...
where node >nul 2>&1 || ( echo %R%[ERR]%N% Node.js not found & exit /b 1 )
where pm2 >nul 2>&1 || ( echo %Y%[WARN]%N% Installing PM2... & npm install -g pm2 )
if not exist .env.local ( echo %R%[ERR]%N% .env.local missing & exit /b 1 )

pm2 kill
call :check_stamp "package-lock.json" ".install-stamp" _dep
if "!_dep!"=="1" ( npm ci & call :write_stamp "package-lock.json" ".install-stamp" )
npm run build || exit /b 1
type nul > .build-stamp

if exist aus (
    call :check_stamp "aus\package-lock.json" "aus\.install-stamp" _aus
    if "!_aus!"=="1" ( npm --prefix aus ci & call :write_stamp "aus\package-lock.json" "aus\.install-stamp" )
    npm --prefix aus run build
    if exist aus\dist\server.js pm2 start aus\dist\server.js --name sys-proxy
)

pm2 start npm --name "%APP%" -- start
pm2 save
pm2 status
goto :eof

:cmd_build
npm run build
if exist aus npm --prefix aus run build
goto :eof

:cmd_install
npm ci && npm run build
if exist aus ( npm --prefix aus ci && npm --prefix aus run build )
goto :eof

:cmd_deploy
git pull
call :check_stamp "package-lock.json" ".install-stamp" _dep
if "!_dep!"=="1" ( npm ci & call :write_stamp "package-lock.json" ".install-stamp" )
call :check_newer "src public next.config.ts package.json" ".build-stamp" ".next" _build
if "!_build!"=="1" ( npm run build & type nul > .build-stamp )
if exist aus (
    call :check_stamp "aus\package-lock.json" "aus\.install-stamp" _aus
    if "!_aus!"=="1" ( npm --prefix aus ci & call :write_stamp "aus\package-lock.json" "aus\.install-stamp" )
    call :check_newer "aus\src" "aus\.build-stamp" "aus\dist" _ab
    if "!_ab!"=="1" ( npm --prefix aus run build & type nul > aus\.build-stamp )
)
call :do_restart
goto :eof

:cmd_restart
call :do_restart
goto :eof

:do_restart
pm2 restart sys-proxy --update-env 2>nul
pm2 restart "%APP%" --update-env 2>nul || ( pm2 start npm --name "%APP%" -- start & pm2 save )
pm2 status
goto :eof

:cmd_stop
pm2 stop "%APP%" 2>nul
pm2 stop sys-proxy 2>nul
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
echo   %B%kristiansen.icu — run.bat%N%
echo.
echo   local         Docker Postgres + dev server (localhost)
echo   dev           Dev server only
echo   db            Docker Postgres + schema (uses DATABASE_URL)
echo   auto          PM2 production start
echo   build         Build app
echo   install       npm ci + build
echo   deploy        git pull + smart build + PM2 restart
echo   restart       PM2 restart
echo   stop          PM2 stop
echo   logs [n]      PM2 logs
echo   status        PM2 status
echo.
goto :eof

:: ── helpers ──────────────────────────────────────────────────────────────────

:parse_db_url
set "DB_USER=postgres"
set "DB_PASS=password"
set "DB_NAME=blog"
if defined DATABASE_URL (
    for /f "usebackq tokens=1,2,3 delims=|" %%A in (`powershell -NoProfile -Command "$u=$env:DATABASE_URL; if ($u -match 'postgresql://([^:]+):([^@]+)@[^/]+/([^?]+)') { Write-Output ($matches[1]+'|'+$matches[2]+'|'+$matches[3]) }"`) do (
        set "DB_USER=%%A"
        set "DB_PASS=%%B"
        set "DB_NAME=%%C"
    )
)
goto :eof

:check_stamp
set "%~3=1"
if not exist "%~2" goto :eof
for /f "usebackq" %%H in (`powershell -NoProfile -Command "(Get-FileHash '%~1' -Algorithm MD5).Hash"`) do set "_h=%%H"
set /p "_s=" < "%~2"
if /i "!_h!"=="!_s!" set "%~3=0"
goto :eof

:write_stamp
powershell -NoProfile -Command "(Get-FileHash '%~1' -Algorithm MD5).Hash | Set-Content '%~2'"
goto :eof

:check_newer
set "%~4=1"
if not exist "%~3" goto :eof
if not exist "%~2" goto :eof
powershell -NoProfile -Command "if (Get-ChildItem %~1 -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Item '%~2').LastWriteTime } | Select-Object -First 1) { exit 1 } else { exit 0 }"
if errorlevel 1 goto :eof
set "%~4=0"
goto :eof
