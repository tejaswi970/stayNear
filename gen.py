import os

def w(path, content):
    d = os.path.dirname(path)
    if d: os.makedirs(d, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print('  wrote:', path)

# Navbar CSS
w('frontend/src/components/Navbar.css', """.navbar{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid var(--gray-200);box-shadow:var(--shadow-sm)}.navbar-inner{max-width:1200px;margin:0 auto;padding:0 16px;display:flex;align-items:center;justify-content:space-between;height:60px;gap:16px}.navbar-brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:20px;color:var(--primary);flex-shrink:0}.navbar-toggle{display:none;background:none;border:none;font-size:22px;color:var(--gray-700);padding:4px}.navbar-links{display:flex;align-items:center;gap:4px;flex:1;justify-content:flex-end}.nav-link{padding:6px 12px;border-radius:6px;font-size:14px;font-weight:500;color:var(--gray-600);transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:4px}.nav-link:hover,.nav-link.active{color:var(--primary);background:var(--primary-light)}.nav-badge{background:var(--primary);color:#fff;border-radius:100px;padding:1px 7px;font-size:11px;font-weight:600}.nav-user{display:flex;align-items:center;gap:10px;margin-left:8px}.nav-username{font-size:14px;font-weight:500;color:var(--gray-700)}.nav-auth{display:flex;align-items:center;gap:8px;margin-left:8px}@media(max-width:768px){.navbar-toggle{display:block}.navbar-links{display:none;position:absolute;top:60px;left:0;right:0;background:#fff;border-bottom:1px solid var(--gray-200);flex-direction:column;align-items:stretch;padding:12px 16px;gap:4px;box-shadow:var(--shadow-md)}.navbar-links.open{display:flex}.nav-link{padding:10px 12px}.nav-user,.nav-auth{margin-left:0;margin-top:8px;padding-top:8px;border-top:1px solid var(--gray-100)}}""")

print('Navbar CSS done')
