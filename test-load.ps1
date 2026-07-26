$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImNhNzFlZDAxLTM5YjYtNDFjNC04ZmE4LTY3YTA4ZGM2MjM3ZiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2plY3ZiY2RpeXR4Z3R2cWliZGJ5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1YWYyMWIzMC02NjJjLTQ4ZDItYjljZi00NzZmNjE3Njk3ZjMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg1MDk5NjYwLCJpYXQiOjE3ODUwOTYwNjAsImVtYWlsIjoidGVzdHVzZXIxQGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3ODUwOTYwNjB9XSwic2Vzc2lvbl9pZCI6ImY1YzkxM2E0LTRkMGYtNGVmNS1iMjY3LTViZWVhYTI4MzIyYyIsImlzX2Fub255bW91cyI6ZmFsc2V9.z_An5ee0a3a4kI9AZPGMNMe1mUKNFcBRVwxCm_2mRkl1WAoBoM-poEe9C8WWU1a6aelrBWrBQ3BvuUzQlqnA5g"
$body = @{ action = "load" } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://jecvbcdiytxgtvqibdby.supabase.co/functions/v1/applications-handler" -Method POST -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" } -Body $body
    $response | ConvertTo-Json -Depth 5
} catch {
    $errorResponse = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
    Write-Output "ERROR BODY:"
    Write-Output $reader.ReadToEnd()
}
