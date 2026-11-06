import urllib.request
try:
    r = urllib.request.urlopen('https://kenney.nl', timeout=10)
    print('OK', r.status)
except Exception as e:
    print('FAIL', str(e)[:200])