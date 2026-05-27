import pytest
from constell.prompt_client import get_prompt


def test_get_prompt_raises_on_404():
    with pytest.raises(Exception):
        get_prompt("http://localhost:9999", "pk", "sk", "missing")
