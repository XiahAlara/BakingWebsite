$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($IsAdmin) { Write-Output "IS_ADMIN" } else { Write-Output "NOT_ADMIN" }
try {
  $index = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
  $lts = $index | Where-Object { $_.lts -ne $null } | Select-Object -First 1
  $version = $lts.version
  $msiUrl = "https://nodejs.org/dist/$version/node-$version-x64.msi"
  Write-Output "MSI_URL: $msiUrl"
} catch {
  Write-Output "ERR_FETCH_INDEX"
}
