import urllib.request, os
urls = [
    "https://kenney.nl/assets/car-kit",
]
for u in urls:
    try:
        r = urllib.request.urlopen(u, timeout=15)
        data = r.read(500)
        print(u, '->', r.status, len(data))
    except Exception as e:
        print(u, '->', str(e)[:200])