import os
_toolhub_original_mkdir = os.mkdir

def _toolhub_mkdir(path, mode=0o777, *args, **kwargs):
    return _toolhub_original_mkdir(path, 0o777, *args, **kwargs)

os.mkdir = _toolhub_mkdir
