from services.storage_service import StorageService


def test_storage_service_uses_tmp_data_dir(tmp_data_dir):
    storage = StorageService()
    assert storage.data_dir == tmp_data_dir
    assert storage.clips_dir.exists()
