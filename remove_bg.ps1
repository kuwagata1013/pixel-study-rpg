param(
    [string]$InputPath,
    [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

try {
    $img = [System.Drawing.Image]::FromFile($InputPath)
    $bmp = New-Object System.Drawing.Bitmap($img)
    $img.Dispose()

    # Define the color to make transparent (White or near white)
    $makeTransparent = $true
    
    # Fast approach: MakeTransparent. If pure white.
    # But since it's AI generated, it might have near-white artifacts.
    # Let's iterate over pixels for near white.
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240) {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            }
        }
    }

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Success"
} catch {
    Write-Host "Error: $_"
}
