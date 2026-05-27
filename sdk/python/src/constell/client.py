from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
from ._batch_queue import BatchQueue
from .prompt_client import get_prompt
from .types import Trace, Observation, Usage, Prompt


class ConstellClient:
    def __init__(
        self,
        base_url: str,
        public_key: str,
        secret_key: str,
        flush_interval: float = 5.0,
    ):
        self._base_url = base_url
        self._public_key = public_key
        self._secret_key = secret_key
        self._queue = BatchQueue(
            base_url=base_url,
            public_key=public_key,
            secret_key=secret_key,
            flush_interval=flush_interval,
        )

    def trace(self, trace: Trace) -> None:
        event = {
            "id": f"evt-{trace.id}",
            "type": "trace-create",
            "timestamp": (trace.timestamp or datetime.now(timezone.utc)).isoformat(),
            "body": {
                "id": trace.id,
                "name": trace.name,
                "userId": trace.user_id,
                "sessionId": trace.session_id,
                "metadata": trace.metadata,
                "release": trace.release,
                "version": trace.version,
                "tags": trace.tags,
                "public": trace.public,
            },
        }
        self._queue.enqueue(event)

    def observation(self, observation: Observation) -> None:
        body: dict[str, Any] = {
            "id": observation.id,
            "traceId": observation.trace_id,
            "type": observation.type,
            "name": observation.name,
            "startTime": observation.start_time.isoformat() if observation.start_time else None,
            "endTime": observation.end_time.isoformat() if observation.end_time else None,
            "model": observation.model,
            "input": observation.input,
            "output": observation.output,
            "modelParameters": observation.model_parameters,
            "metadata": observation.metadata,
            "parentObservationId": observation.parent_observation_id,
            "level": observation.level,
            "statusMessage": observation.status_message,
            "environment": observation.environment,
            "release": observation.release,
            "version": observation.version,
            "sessionId": observation.session_id,
            "userId": observation.user_id,
        }
        if observation.usage:
            body["usage"] = {
                "input": observation.usage.input,
                "output": observation.usage.output,
                "total": observation.usage.total,
                "unit": observation.usage.unit,
            }
        event = {
            "id": f"evt-{observation.id}",
            "type": "observation-create",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "body": body,
        }
        self._queue.enqueue(event)

    def generation(
        self,
        *,
        trace_id: str,
        name: str | None = None,
        model: str | None = None,
        input: Any = None,
        output: Any = None,
        usage: Usage | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        obs = Observation(
            trace_id=trace_id,
            type="GENERATION",
            name=name,
            model=model,
            input=input,
            output=output,
            usage=usage,
            start_time=start_time,
            end_time=end_time,
            **kwargs,
        )
        self.observation(obs)

    def get_prompt(self, name: str, label: str = "latest") -> Prompt:
        return get_prompt(self._base_url, self._public_key, self._secret_key, name, label)

    def flush(self) -> None:
        self._queue.flush_and_stop()
