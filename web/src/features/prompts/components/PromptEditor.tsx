import { useState } from "react";

export function PromptEditor({
  initialContent,
  onSave,
  isSaving,
}: {
  initialContent: string;
  onSave: (content: string) => void;
  isSaving: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  return (
    <div>
      <textarea
        className="border px-2 py-1 rounded w-full h-64 font-mono text-sm"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex gap-2 mt-2">
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={isSaving || content === initialContent}
          onClick={() => onSave(content)}
        >
          Save New Version
        </button>
      </div>
    </div>
  );
}
