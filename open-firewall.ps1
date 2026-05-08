# Run this as Administrator to open firewall ports for MIT M&E System
$rules = @(
    @{ Name="MIT MES HTTP 5000";  Port=5000 },
    @{ Name="MIT MES HTTPS 5443"; Port=5443 }
)
foreach ($r in $rules) {
    $existing = netsh advfirewall firewall show rule name=$r.Name 2>$null
    if ($existing -match "No rules match") {
        netsh advfirewall firewall add rule name=$r.Name dir=in action=allow protocol=TCP localport=$r.Port
        Write-Host "Added firewall rule: $($r.Name)" -ForegroundColor Green
    } else {
        Write-Host "Rule already exists: $($r.Name)" -ForegroundColor Yellow
    }
}
Write-Host "`nFirewall rules configured. MIT M&E System is accessible on the network." -ForegroundColor Cyan
