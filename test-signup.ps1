$body = @{
    action     = "signup"
    first_name = "Test"
    last_name  = "User"
    phone      = "0821234567"
    email      = "testuser1@example.com"
    password   = "TestPassword123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://jecvbcdiytxgtvqibdby.supabase.co/functions/v1/auth-handler" -Method POST -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $env:SUPABASE_ANON_KEY" } -Body $body
    Write-Output $response
} catch {
    $errorResponse = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Output "ERROR BODY:"
    Write-Output $errorBody
}
