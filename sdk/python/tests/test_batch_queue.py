import pytest
from unittest.mock import patch, MagicMock
from constell._batch_queue import BatchQueue


@pytest.fixture
def queue():
    return BatchQueue(
        base_url="http://localhost:3000",
        public_key="pk_test",
        secret_key="sk_test",
        flush_interval=60.0,
    )


def test_enqueue_and_flush(queue):
    queue.enqueue({"type": "trace-create", "body": {"id": "t1"}})
    with patch("httpx.Client") as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client
        queue._flush()
        mock_client.post.assert_called_once()
        args, kwargs = mock_client.post.call_args
        assert kwargs["json"]["batch"][0]["body"]["id"] == "t1"
