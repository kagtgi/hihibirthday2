# Image Audit Script
Write-Host "=== Image Audit Report ===" -ForegroundColor Cyan
Write-Host ""

$totalImages = 0
$heicCount = 0
$validCount = 0

Get-ChildItem "description\*.json" | Sort-Object { [int]($_.BaseName) } | ForEach-Object {
    $json = Get-Content $_.FullName -Raw | ConvertFrom-Json
    
    if ($json.image) {
        foreach ($img in $json.image) {
            $totalImages++
            $imgPath = "image\$img"
            
            if (Test-Path $imgPath) {
                if ($img -match "\.HEIC$") {
                    $heicCount++
                    Write-Host "  Chapter $($json.id): $img (HEIC - needs conversion)" -ForegroundColor Yellow
                } else {
                    $validCount++
                }
            } else {
                Write-Host "  Chapter $($json.id): $img (MISSING)" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total images: $totalImages"
Write-Host "  Valid (web-compatible): $validCount" -ForegroundColor Green
Write-Host "  HEIC (need conversion): $heicCount" -ForegroundColor Yellow
Write-Host ""

if ($heicCount -gt 0) {
    Write-Host "See HEIC_CONVERSION.md for conversion guide" -ForegroundColor Cyan
}
