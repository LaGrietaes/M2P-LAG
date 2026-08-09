import shutil
import tempfile
from pathlib import Path

import pytest

from config import settings


@pytest.fixture
def tmp_data_dir(monkeypatch):
    """Point settings.DATA_DIR at an isolated temp directory for the test."""
    tmp = Path(tempfile.mkdtemp(prefix="m2p_test_"))
    monkeypatch.setattr(settings, "DATA_DIR", str(tmp))
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)
