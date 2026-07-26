$body = @{
    action   = "login"
    email    = "testuser1@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://jecvbcdiytxgtvqibdby.supabase.co/functions/v1/auth-handler" -Method POST -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $env:SUPABASE_ANON_KEY" } -Body $body
    $response | ConvertTo-Json -Depth 5
} catch {
    $errorResponse = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
    Write-Output "ERROR BODY:"
    Write-Output $reader.ReadToEnd()
}
