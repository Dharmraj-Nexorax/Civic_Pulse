import urllib.request
import zipfile
import os
import sys

URL = "https://get.enterprisedb.com/postgresql/postgresql-15.10-1-windows-x64-binaries.zip"
TARGET_DIR = r"C:\Users\harsh\tools"
ZIP_PATH = os.path.join(TARGET_DIR, "pgsql.zip")
EXTRACT_DIR = TARGET_DIR

os.makedirs(TARGET_DIR, exist_ok=True)

if not os.path.exists(ZIP_PATH):
    print(f"Downloading PostgreSQL binaries from {URL} to {ZIP_PATH}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(URL, headers=headers)
    with urllib.request.urlopen(req) as response, open(ZIP_PATH, 'wb') as out_file:
        total_size = int(response.headers.get('Content-Length', 0))
        downloaded = 0
        chunk_size = 1024 * 1024  # 1MB
        last_percent = -1
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                percent = int(downloaded * 100 / total_size)
                if percent % 10 == 0 and percent != last_percent:
                    print(f"Download progress: {percent}% ({downloaded // (1024*1024)}MB / {total_size // (1024*1024)}MB)")
                    last_percent = percent
    print("Download complete.")
else:
    print("ZIP already exists, skipping download.")

print("Extracting ZIP...")
with zipfile.ZipFile(ZIP_PATH, 'r') as z:
    z.extractall(EXTRACT_DIR)
print(f"Extraction complete to {EXTRACT_DIR}\\pgsql")

# Clean up zip to save space
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)
    print("Cleaned up zip archive.")
