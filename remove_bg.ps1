param(
    [string]$InputPath,
    [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

try {
    $img = [System.Drawing.Image]::FromFile($InputPath)
    $bmp = New-Object System.Drawing.Bitmap($img)
    $img.Dispose()

    # Make pure white (or near-white) pixels transparent using built-in method
    $bmp.MakeTransparent([System.Drawing.Color]::White)

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Success"
} catch {
    Write-Host "Error: $_"
}
