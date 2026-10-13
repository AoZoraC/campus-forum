# ============================================================
#  本地 PostgreSQL 一键安装脚本（Windows）
#
#  为什么会有这个脚本？
#  云端数据库（Neon / Supabase）注册时可能卡在人机验证上，
#  所以这里给一条完全不需要注册、不需要联网验证的路：
#  用官方免安装包，在本机跑一个真正的 PostgreSQL。
#
#  它做的事：
#    1. 解压官方免安装包到 .localdb/
#    2. 初始化一个数据目录（相当于「新建一个空的数据库集群」）
#    3. 启动数据库服务
#    4. 建一个叫 campus_forum 的库
#    5. 打印出可以直接粘进 .env 的连接地址
#
#  用法（在项目根目录）：
#    powershell -ExecutionPolicy Bypass -File scripts/setup-local-postgres.ps1
#
#  日常开关（装好之后）：
#    启动： .\.localdb\pgsql\bin\pg_ctl.exe -D .\.localdb\data start
#    停止： .\.localdb\pgsql\bin\pg_ctl.exe -D .\.localdb\data stop
# ============================================================

$ErrorActionPreference = "Stop"

$root     = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$localdb  = Join-Path $root ".localdb"
$zip      = Get-ChildItem (Join-Path $root ".tmp-downloads") -Filter "postgresql-*-windows-x64-binaries.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
$pgDir    = Join-Path $localdb "pgsql"
$dataDir  = Join-Path $localdb "data"
$logFile  = Join-Path $localdb "postgres.log"
$port     = 5433           # 故意用 5433 而不是默认的 5432，避免和你以后可能装的别的数据库打架
$dbName   = "campus_forum"
$password = "campus_forum_dev"   # 只在本机跑，这个密码不需要保密；但别拿去当生产环境密码

Write-Host ""
Write-Host "校园汇 · 本地 PostgreSQL 安装" -ForegroundColor Cyan
Write-Host ("=" * 56)

# ── 1. 检查安装包 ────────────────────────────────────────────
if (-not $zip) {
    Write-Host "找不到安装包。" -ForegroundColor Red
    Write-Host "请先把 postgresql-17.7-1-windows-x64-binaries.zip 放进 .tmp-downloads/ 目录。"
    Write-Host "下载地址：https://get.enterprisedb.com/postgresql/postgresql-17.7-1-windows-x64-binaries.zip"
    exit 1
}
Write-Host ("[1/5] 找到安装包：" + $zip.Name + "（" + [math]::Round($zip.Length/1MB) + " MB）")

# ── 2. 解压 ─────────────────────────────────────────────────
if (Test-Path $pgDir) {
    Write-Host "[2/5] 已经解压过，跳过"
} else {
    Write-Host "[2/5] 正在解压（300 多 MB，需要一两分钟）…"
    New-Item -ItemType Directory -Path $localdb -Force | Out-Null
    Expand-Archive -Path $zip.FullName -DestinationPath $localdb -Force
    Write-Host "      解压完成"
}

$initdb = Join-Path $pgDir "bin\initdb.exe"
$pgctl  = Join-Path $pgDir "bin\pg_ctl.exe"
$psql   = Join-Path $pgDir "bin\psql.exe"

if (-not (Test-Path $initdb)) {
    Write-Host "解压后的目录结构不对，找不到 initdb.exe" -ForegroundColor Red
    exit 1
}

# ── 3. 初始化数据目录 ───────────────────────────────────────
if (Test-Path (Join-Path $dataDir "PG_VERSION")) {
    Write-Host "[3/5] 数据目录已初始化，跳过"
} else {
    Write-Host "[3/5] 正在初始化数据库（相当于新建一个空仓库）…"
    $pwFile = Join-Path $localdb "pw.txt"
    Set-Content -Path $pwFile -Value $password -NoNewline -Encoding ascii
    & $initdb -D $dataDir -U postgres --pwfile=$pwFile -E UTF8 --locale=C | Out-Null
    Remove-Item $pwFile -Force
    Write-Host "      初始化完成"
}

# ── 4. 启动服务 ─────────────────────────────────────────────
Write-Host "[4/5] 正在启动数据库服务…"
$status = & $pgctl -D $dataDir status 2>&1
if ($status -match "server is running") {
    Write-Host "      服务已在运行"
} else {
    & $pgctl -D $dataDir -l $logFile -o "-p $port" start | Out-Null
    Start-Sleep -Seconds 3
    Write-Host "      已启动（端口 $port）"
}

# ── 5. 建库 ─────────────────────────────────────────────────
Write-Host "[5/5] 正在创建数据库 $dbName …"
$env:PGPASSWORD = $password
$exists = & $psql -h 127.0.0.1 -p $port -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'"
if ($exists -ne "1") {
    & $psql -h 127.0.0.1 -p $port -U postgres -c "CREATE DATABASE $dbName ENCODING 'UTF8'" | Out-Null
    Write-Host "      已创建"
} else {
    Write-Host "      已存在"
}

# ── 打印结果 ────────────────────────────────────────────────
$conn = "postgresql://postgres:$password@127.0.0.1:$port/$dbName"
Write-Host ""
Write-Host ("=" * 56)
Write-Host "本地数据库已就绪 ✅" -ForegroundColor Green
Write-Host ""
Write-Host "请把下面两行粘进项目根目录的 .env（两个地址填一样的就行，"
Write-Host "因为本地数据库不需要区分连接池和直连）："
Write-Host ""
Write-Host ("DATABASE_URL=`"$conn`"") -ForegroundColor Yellow
Write-Host ("DIRECT_URL=`"$conn`"")   -ForegroundColor Yellow
Write-Host ""
Write-Host "然后照常运行："
Write-Host "    node scripts/check-env.mjs"
Write-Host "    npx prisma migrate dev --name init"
Write-Host "    npx prisma db seed"
Write-Host ""
Write-Host "日常停止数据库："
Write-Host ("    `"$pgctl`" -D `"$dataDir`" stop")
Write-Host ""
