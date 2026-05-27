import { useState, useMemo } from "react";

export type RangePreset = "7d" | "30d" | "custom";

export function useDateRange() {
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const { from, to } = useMemo(() => {
    const now = new Date();
    const toIso = now.toISOString();
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    const days = preset === "30d" ? 30 : 7;
    const fromIso = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    return { from: fromIso, to: toIso };
  }, [preset, customFrom, customTo]);

  return {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    from,
    to,
  };
}
