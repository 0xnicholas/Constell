import { useState } from "react";

export function VersionLabels({
  versions,
  onSetLabel,
}: {
  versions: { version: number; labels: { label: string }[] }[];
  onSetLabel: (version: number, label: string) => void;
}) {
  const [labelInput, setLabelInput] = useState<Record<number, string>>({});
  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Versions</h3>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1">Version</th>
            <th className="py-1">Labels</th>
            <th className="py-1">Add Label</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.version} className="border-b">
              <td className="py-1">v{v.version}</td>
              <td className="py-1">
                <div className="flex gap-1 flex-wrap">
                  {v.labels.map((l) => (
                    <span key={l.label} className="bg-gray-200 text-xs px-2 py-0.5 rounded">
                      {l.label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-1">
                <div className="flex gap-1">
                  <input
                    className="border px-1 py-0.5 rounded w-24 text-sm"
                    placeholder="label"
                    value={labelInput[v.version] ?? ""}
                    onChange={(e) =>
                      setLabelInput((prev) => ({
                        ...prev,
                        [v.version]: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="bg-gray-700 text-white px-2 py-0.5 rounded text-xs"
                    onClick={() => {
                      const label = labelInput[v.version]?.trim();
                      if (label) {
                        onSetLabel(v.version, label);
                        setLabelInput((prev) => ({
                          ...prev,
                          [v.version]: "",
                        }));
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
