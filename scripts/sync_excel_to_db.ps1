# ==============================================================================
# FinnEst Excel-to-Database Sync Utility
# Reads master Excel file (Axis Bank + Gaon Home tabs) and syncs rows to Postgres DB
# Automatically releases COM locks and terminates background Excel instances.
# ==============================================================================

param (
    [Parameter(Mandatory=$false)]
    [string]$ExcelPath
)

$psqlPath  = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
# Database password, user email and bank account come from environment variables (never commit them):
#   setx PGPASSWORD <db password>   setx FINNEST_SYNC_EMAIL <login email>   setx FINNEST_SYNC_ACCOUNT <account number>
foreach ($v in 'PGPASSWORD','FINNEST_SYNC_EMAIL','FINNEST_SYNC_ACCOUNT') {
    if (-not [Environment]::GetEnvironmentVariable($v)) { Write-Host "Set the $v environment variable first." -ForegroundColor Red; exit 1 }
}
$syncEmail   = $env:FINNEST_SYNC_EMAIL -replace "'", "''"
$syncAccount = $env:FINNEST_SYNC_ACCOUNT -replace "'", "''"
$pgArgs    = @('-h','localhost','-p','5435','-U','finnest','-d','finnest_db')

Write-Host "========================================================" -ForegroundColor DarkCyan
Write-Host "  FinnEst - Excel Data Importer and Synchronizer" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor DarkCyan

if (-not $ExcelPath) {
    $desktop = [Environment]::GetFolderPath("Desktop")
    $latestFile = Get-ChildItem -Path $desktop -Filter "FinnEst_Master_Finance_*.xlsx" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestFile) {
        $ExcelPath = $latestFile.FullName
    } else {
        Write-Host "No FinnEst Master Excel file found on Desktop." -ForegroundColor Red
        Write-Host "Usage: .\sync_excel_to_db.ps1 -ExcelPath 'C:\Path\To\Your_File.xlsx'" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Target Excel File: $ExcelPath" -ForegroundColor Yellow

# Get tenant and user IDs for the sync user
$userInfo = & $psqlPath @pgArgs -t -A -F '|' -c "SELECT id, tenant_id FROM users WHERE email = '$syncEmail' LIMIT 1"
if (-not $userInfo) {
    Write-Host "User $env:FINNEST_SYNC_EMAIL not found in SIT database!" -ForegroundColor Red
    exit 1
}
$userId   = ($userInfo -split '\|')[0]
$tenantId = ($userInfo -split '\|')[1]

# Get Axis Bank account ID
$axisAccountId = & $psqlPath @pgArgs -t -A -c "SELECT id FROM bank_accounts WHERE account_number = '$syncAccount' LIMIT 1"

# Get Gaon Home project ID
$gaonProjectId = & $psqlPath @pgArgs -t -A -c "SELECT id FROM projects WHERE tenant_id = '$tenantId' AND LOWER(name) LIKE '%gaon%' LIMIT 1"

Write-Host "User ID: $userId" -ForegroundColor DarkGray
Write-Host "Axis Bank Account ID: $axisAccountId" -ForegroundColor DarkGray
Write-Host "Gaon Home Project ID: $gaonProjectId" -ForegroundColor DarkGray
Write-Host ""

function ConvertTo-SqlDate([string]$str) {
    if (-not $str) { return (Get-Date -Format 'yyyy-MM-dd') }
    $clean = $str.Trim()
    if ($clean -match '^\d{2}-\d{2}-\d{4}') {
        $p = $clean.Split('-')
        return "$($p[2])-$($p[1])-$($p[0])"
    }
    if ($clean -match '^\d{4}-\d{2}-\d{2}') {
        return $clean.Substring(0,10)
    }
    try {
        return ([datetime]::Parse($clean)).ToString('yyyy-MM-dd')
    } catch {
        return (Get-Date -Format 'yyyy-MM-dd')
    }
}

$xl = $null
$wb = $null

try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $wb = $xl.Workbooks.Open($ExcelPath, 0, $true)

    # --- 1. SYNC AXIS BANK SHEET ---
    Write-Host "Processing Sheet 1: Axis Bank Statement..." -ForegroundColor Cyan
    $ws1 = $wb.Sheets.Item("Axis Bank Statement")

    $axisInserted = 0
    $axisSkipped  = 0

    for ($r1 = 6; $r1 -le 300; $r1++) {
        $rawCell = $ws1.Cells.Item($r1, 1).Value2
        if ($null -eq $rawCell -or [string]::IsNullOrWhiteSpace([string]$rawCell)) { break }
        $rawDate = [string]$rawCell

        $desc   = [string]$ws1.Cells.Item($r1, 2).Value2
        $cat    = [string]$ws1.Cells.Item($r1, 3).Value2
        $type   = [string]$ws1.Cells.Item($r1, 4).Value2
        $amtVal = [string]$ws1.Cells.Item($r1, 5).Value2
        $amt    = [decimal]($amtVal -replace '[^0-9.]','')

        $cleanType = if ($type) { $type.Trim().ToUpper() } else { 'DEBIT' }
        if ($cleanType -notmatch '^(DEBIT|CREDIT)$') { $cleanType = 'DEBIT' }
        if (-not $cat) { $cat = 'Others' }

        $sqlDate  = ConvertTo-SqlDate $rawDate
        $safeDesc = $desc -replace "'", "''"
        $safeCat  = $cat  -replace "'", "''"

        # Check if transaction already exists
        $checkSql = "SELECT id FROM expenses WHERE tenant_id='$tenantId' AND linked_bank_account_id='$axisAccountId' AND expense_date='$sqlDate' AND amount=$amt AND description='$safeDesc' LIMIT 1;"
        $existingId = & $psqlPath @pgArgs -t -A -c $checkSql

        if (-not $existingId) {
            $insertSql = "INSERT INTO expenses (id, created_at, updated_at, tenant_id, user_id, amount, category, description, expense_date, type, made_against, linked_bank_account_id) VALUES (gen_random_uuid(), NOW(), NOW(), '$tenantId', '$userId', $amt, '$safeCat', '$safeDesc', '$sqlDate', '$cleanType', 'BANK_STATEMENT', '$axisAccountId');"
            & $psqlPath @pgArgs -c $insertSql | Out-Null
            $axisInserted++
        } else {
            $axisSkipped++
        }
    }

    Write-Host "   Axis Bank: $axisInserted new row(s) inserted, $axisSkipped existing row(s) up-to-date." -ForegroundColor Green

    # --- 2. SYNC GAON HOME PROJECT SHEET ---
    Write-Host "Processing Sheet 2: Gaon Home Project..." -ForegroundColor Cyan
    $ws2 = $wb.Sheets.Item("Gaon Home Project")

    # Sync Project Budget if updated in cell B6
    $budgetVal = [string]$ws2.Cells.Item(6, 2).Value2
    if ($budgetVal) {
        $newBudget = [decimal]($budgetVal -replace '[^0-9.]','')
        & $psqlPath @pgArgs -c "UPDATE projects SET budget = $newBudget, updated_at = NOW() WHERE id = '$gaonProjectId';" | Out-Null
    }

    # Sync Status if updated in cell B4
    $statusVal = [string]$ws2.Cells.Item(4, 2).Value2
    $statusVal = if ($statusVal) { $statusVal.Trim().ToUpper() -replace ' ', '_' } else { '' }
    if ($statusVal -match '^(IN_PROGRESS|COMPLETED)$') {
        & $psqlPath @pgArgs -c "UPDATE projects SET status = '$statusVal', updated_at = NOW() WHERE id = '$gaonProjectId';" | Out-Null
    }

    $gaonInserted = 0
    $gaonSkipped  = 0

    for ($r2 = 17; $r2 -le 300; $r2++) {
        $rawCell = $ws2.Cells.Item($r2, 1).Value2
        if ($null -eq $rawCell -or [string]::IsNullOrWhiteSpace([string]$rawCell)) { break }
        $rawDate = [string]$rawCell

        $desc   = [string]$ws2.Cells.Item($r2, 2).Value2
        $cat    = [string]$ws2.Cells.Item($r2, 3).Value2
        $amtVal = [string]$ws2.Cells.Item($r2, 4).Value2
        $type   = [string]$ws2.Cells.Item($r2, 5).Value2
        $amt    = [decimal]($amtVal -replace '[^0-9.]','')

        $cleanType = if ($type) { $type.Trim().ToUpper() } else { 'DEBIT' }
        if ($cleanType -notmatch '^(DEBIT|CREDIT)$') { $cleanType = 'DEBIT' }
        if (-not $cat)  { $cat  = 'Utilities' }

        $sqlDate  = ConvertTo-SqlDate $rawDate
        $safeDesc = $desc -replace "'", "''"
        $safeCat  = $cat  -replace "'", "''"

        # Check if project expense already exists
        $checkSql = "SELECT id FROM project_expenses WHERE tenant_id='$tenantId' AND project_id='$gaonProjectId' AND date='$sqlDate' AND amount=$amt AND description='$safeDesc' LIMIT 1;"
        $existingId = & $psqlPath @pgArgs -t -A -c $checkSql

        if (-not $existingId) {
            $insertSql = "INSERT INTO project_expenses (id, created_at, updated_at, tenant_id, user_id, project_id, amount, category, description, date) VALUES (gen_random_uuid(), NOW(), NOW(), '$tenantId', '$userId', '$gaonProjectId', $amt, '$safeCat', '$safeDesc', '$sqlDate');"
            & $psqlPath @pgArgs -c $insertSql | Out-Null
            $gaonInserted++
        } else {
            $gaonSkipped++
        }
    }

    Write-Host "   Gaon Home: $gaonInserted new row(s) inserted, $gaonSkipped existing row(s) up-to-date." -ForegroundColor Green

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor DarkGreen
    Write-Host "  SUCCESS! Excel Data Synced cleanly with Database." -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor DarkGreen
    Write-Host ""

} catch {
    Write-Host "Error syncing Excel to Database: $_" -ForegroundColor Red
} finally {
    if ($wb) { $wb.Close($false); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }
    if ($xl) { $xl.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    # Terminate any orphaned background Excel processes
    Get-Process -Name "EXCEL" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -eq 0 } | Stop-Process -Force -ErrorAction SilentlyContinue
}
