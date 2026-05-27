from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Literal
from datetime import datetime
import uuid


@dataclass
class Usage:
    input: int | None = None
    output: int | None = None
    total: int | None = None
    unit: Literal["TOKENS", "CHARACTERS", "MILLISECONDS"] = "TOKENS"


@dataclass
class Observation:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = ""
    type: Literal["SPAN", "GENERATION", "EVENT"] = "SPAN"
    name: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    model: str | None = None
    input: Any = None
    output: Any = None
    usage: Usage | None = None
    model_parameters: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    parent_observation_id: str | None = None
    level: Literal["DEBUG", "DEFAULT", "WARNING", "ERROR"] = "DEFAULT"
    status_message: str | None = None
    environment: str | None = None
    release: str | None = None
    version: str | None = None
    session_id: str | None = None
    user_id: str | None = None


@dataclass
class Trace:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str | None = None
    user_id: str | None = None
    session_id: str | None = None
    metadata: dict[str, Any] | None = None
    release: str | None = None
    version: str | None = None
    tags: list[str] = field(default_factory=list)
    public: bool = False
    timestamp: datetime | None = None


@dataclass
class Prompt:
    content: str
    config: dict[str, Any] | None
    version: int
