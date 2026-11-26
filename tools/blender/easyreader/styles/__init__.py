"""The visual styles. Add a new one by copying a file here and adding it to STYLES."""
import importlib

STYLES = ['paper', 'clay', 'glass', 'desk', 'kinetic', 'lantern']


def get(name):
    name = name.lower().strip()
    if name not in STYLES and name != 'base':
        raise SystemExit(f'Unknown style "{name}". Pick one of: ' + ', '.join(STYLES))
    mod = importlib.import_module(f'{__name__}.{name}')
    importlib.reload(mod)
    return mod.STYLE
