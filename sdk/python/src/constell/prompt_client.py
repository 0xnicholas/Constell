from __future__ import annotations
import base64
import httpx
from .types import Prompt


def get_prompt(
    base_url: str,
    public_key: str,
    secret_key: str,
    name: str,
    label: str = "latest",
) -> Prompt:
    url = f"{base_url}/api/public/prompts/{name}"
    params = {}
    if label:
        params["version"] = label
    auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    resp = httpx.get(
        url, params=params, headers={"Authorization": f"Basic {auth}"}, timeout=10.0
    )
    resp.raise_for_status()
    data = resp.json()
    return Prompt(content=data["content"], config=data.get("config"), version=data["version"])
