# HEIC Image Conversion Guide

## Why Convert HEIC Images?

HEIC (High Efficiency Image Container) is Apple's modern image format that provides better compression than JPEG. However, **most web browsers don't support HEIC** natively:

- ✅ **Safari** (macOS/iOS) - Full support
- ❌ **Chrome** - No support
- ❌ **Firefox** - No support  
- ❌ **Edge** - No support

**For maximum compatibility, convert HEIC images to JPG or PNG before using them in the web app.**

---

## Affected Images in This Project

The following 13 images need conversion:

| File | Referenced In | Conversion Priority |
|------|--------------|-------------------|
| `5.HEIC` | Chapter 2 | High |
| `7.HEIC` | Chapter 4 | High |
| `13.HEIC` | Chapter 8 | High |
| `18.HEIC` | Chapter 9 | High |
| `23.HEIC` | Chapter 12 | High |
| `28.HEIC` | Chapter 16 | High |
| `30.HEIC` | Chapter 18 | High |
| `37.HEIC` | Chapter 22 | High |
| `39.HEIC` | Chapter 24 | High |
| `41.HEIC` | Chapter 25 | High |
| `42.HEIC` | Chapter 25 | High |
| `43.HEIC` | Chapter 25 | High |
| `51.HEIC` | Chapter 30 | High |

---

## Conversion Methods

### Method 1: Online Converter (Easiest)

1. Visit [FreeConvert HEIC to JPG](https://www.freeconvert.com/heic-to-jpg)
2. Upload your HEIC files (supports batch conversion)
3. Click "Convert to JPG"
4. Download converted files
5. Replace original HEIC files in the `image/` folder

**OR** use [CloudConvert](https://cloudconvert.com/heic-to-jpg)

---

### Method 2: Windows (Built-in)

Windows 10/11 can convert HEIC with the free HEIF Image Extension:

1. Install [HEIF Image Extensions](https://apps.microsoft.com/detail/9pmmsr1cgpwg) from Microsoft Store
2. Open HEIC file in **Photos** app
3. Click "..." → **Save as** → Choose JPG
4. Repeat for all 13 files

---

### Method 3: macOS (Built-in)

macOS can convert HEIC natively:

1. Open HEIC file in **Preview**
2. File → **Export**
3. Format: **JPEG**
4. Quality: **Best** (recommended)
5. Save with same filename (replace `.HEIC` with `.jpg`)

**Batch conversion:**
```bash
# Using macOS sips command (built-in)
cd image/
for file in *.HEIC; do
  sips -s format jpeg -s formatOptions 100 "$file" --out "${file%.HEIC}.jpg"
done
```

---

### Method 4: Command Line (ImageMagick)

Install [ImageMagick](https://imagemagick.org/):

**Windows (PowerShell):**
```powershell
cd image
Get-ChildItem *.HEIC | ForEach-Object {
  magick "$($_.Name)" "$($_.BaseName).jpg"
}
```

**Linux/macOS:**
```bash
cd image/
for file in *.HEIC; do
  convert "$file" -quality 95 "${file%.HEIC}.jpg"
done
```

---

## After Conversion

### 1. Update JSON References

Update the corresponding JSON files in `description/` folder to reference `.jpg` instead of `.HEIC`:

**Example - Before:**
```json
{
  "image": ["39.HEIC"]
}
```

**After:**
```json
{
  "image": ["39.jpg"]
}
```

**Files to update:**
- `description/2.json` - Change `5.HEIC` → `5.jpg`
- `description/4.json` - Change `7.HEIC` → `7.jpg`
- `description/8.json` - Change `13.HEIC` → `13.jpg`
- `description/9.json` - Change `18.HEIC` → `18.jpg`
- `description/12.json` - Change `23.HEIC` → `23.jpg`
- `description/16.json` - Change `28.HEIC` → `28.jpg`
- `description/18.json` - Change `30.HEIC` → `30.jpg`
- `description/22.json` - Change `37.HEIC` → `37.jpg`
- `description/24.json` - Change `39.HEIC` → `39.jpg`
- `description/25.json` - Change `41.HEIC`, `42.HEIC`, `43.HEIC` → `.jpg`
- `description/30.json` - Change `51.HEIC` → `51.jpg`

---

### 2. Delete Old HEIC Files (Optional)

```bash
cd image/
rm *.HEIC
```

---

### 3. Test in Browser

1. Start the development server:
   ```bash
   npm start
   ```

2. Open in Chrome/Firefox to verify all images load correctly

3. Check browser console - you should see no HEIC warnings

---

## Quick Conversion Script

### Windows PowerShell (with ImageMagick)

Save as `convert-heic.ps1`:

```powershell
# Navigate to image folder
Set-Location "image"

# Convert all HEIC to JPG
Get-ChildItem *.HEIC | ForEach-Object {
    $inputFile = $_.Name
    $outputFile = $_.BaseName + ".jpg"
    
    Write-Host "Converting $inputFile to $outputFile..."
    magick $inputFile -quality 95 $outputFile
}

Write-Host "Conversion complete!"
Write-Host "Remember to update JSON files in description/ folder!"
```

Run: `.\convert-heic.ps1`

---

## Verification Checklist

- [ ] All 13 HEIC files converted to JPG
- [ ] All 11 JSON files updated with new filenames
- [ ] Old HEIC files deleted from `image/` folder
- [ ] Tested in Chrome/Firefox
- [ ] No console warnings about HEIC
- [ ] All images display correctly in all 31 chapters

---

## Image Quality Recommendations

When converting HEIC to JPG:

- **Quality**: 90-95 (balances file size and visual quality)
- **Resolution**: Keep original (don't resize)
- **Format**: JPG for photos, PNG for graphics with transparency

---

## Need Help?

If you encounter issues:

1. Check that converted files are named exactly the same (except extension)
2. Verify JSON files reference the correct filenames (case-sensitive on Linux)
3. Clear browser cache and reload
4. Check browser console (F12) for specific error messages

The app will automatically detect HEIC files and show a warning in the console to help you identify which images need conversion.
