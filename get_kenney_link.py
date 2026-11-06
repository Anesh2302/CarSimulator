import urllib.request, json
_id = "6173736574732f6361722d6b6974"
url = "https://kenney.nl/download-link/" + _id
try:
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
    r = urllib.request.urlopen(req, timeout=15)
    data = r.read().decode('utf-8', 'ignore')
    print("STATUS", r.status)
    print("DATA", data[:500])
except Exception as e:
    print("ERR", str(e)[:300])