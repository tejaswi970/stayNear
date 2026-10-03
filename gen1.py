import os

def w(path, content):
    d = os.path.dirname(path)
    if d: os.makedirs(d, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\\n') as f:
        f.write(content)
    print('wrote:', path)
