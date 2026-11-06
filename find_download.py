import urllib.request, re
url = "https://kenney.nl/assets/car-kit"
try:
    r = urllib.request.urlopen(url, timeout=15)
    html = r.read().decode('utf-8', 'ignore')
    # find zip links
    links = re.findall(r'href="([^"]+\.zip)"', html)
    print("ZIP LINKS:")
    for l in links[:20]:
        print(l)
    # find any download link
    dl = re.findall(r'href="([^"]*download[^"]*)"', html, re.I)
    print("DOWNLOAD LINKS:")
    for l in dl[:20]:
        print(l)
except Exception as e:
    print("ERR", str(e)[:300])