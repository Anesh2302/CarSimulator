import urllib.request
url = "https://kenney.nl/assets/car-kit"
r = urllib.request.urlopen(url, timeout=15)
html = r.read().decode('utf-8', 'ignore')
# print lines with 'download' or 'zip' or 'href'
for line in html.splitlines():
    low = line.lower()
    if 'download' in low or '.zip' in low or 'href' in low:
        print(line.strip()[:300])