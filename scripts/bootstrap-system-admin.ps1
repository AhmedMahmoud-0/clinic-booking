$ErrorActionPreference = "Stop"

Write-Host "MERUNO - One-time local System Admin bootstrap" -ForegroundColor Cyan
Write-Host "This creates one Employee, one Better Auth identity, and one SYSTEM_ADMIN assignment in the local database." -ForegroundColor Yellow

$env:MERUNO_BOOTSTRAP_ADMIN_EMAIL = (Read-Host "Administrator work email").Trim()
$env:MERUNO_BOOTSTRAP_ADMIN_FIRST_NAME = (Read-Host "First name").Trim()
$env:MERUNO_BOOTSTRAP_ADMIN_LAST_NAME = (Read-Host "Last name").Trim()
$env:MERUNO_BOOTSTRAP_ADMIN_EMPLOYEE_NUMBER = (Read-Host "Employee number (example: MER-ADMIN-001)").Trim()
$confirmation = Read-Host "Type YES to confirm this is your own email and this is the local one-time bootstrap"
if ($confirmation -cne "YES") { throw "Bootstrap cancelled. Email ownership confirmation is required." }
$securePassword = Read-Host "Initial password (12-128 characters)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:MERUNO_BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    node .\scripts\bootstrap-system-admin.mjs
    if ($LASTEXITCODE -ne 0) {
        throw "System Admin bootstrap failed. Review the message above."
    }
}
finally {
    Remove-Item Env:MERUNO_BOOTSTRAP_ADMIN_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:MERUNO_BOOTSTRAP_ADMIN_FIRST_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:MERUNO_BOOTSTRAP_ADMIN_LAST_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:MERUNO_BOOTSTRAP_ADMIN_EMPLOYEE_NUMBER -ErrorAction SilentlyContinue
    Remove-Item Env:MERUNO_BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $securePassword.Dispose()
}
