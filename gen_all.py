import os, base64

def w(path, b64content):
    d = os.path.dirname(path)
    if d: os.makedirs(d, exist_ok=True)
    with open(path, 'wb') as f:
        f.write(base64.b64decode(b64content))
    print('  wrote:', path)

