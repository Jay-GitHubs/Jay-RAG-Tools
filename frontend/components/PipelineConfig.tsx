"use client";

import { useConfig } from "@/hooks/useJobs";

interface PipelineConfigProps {
  config: {
    provider: string;
    model: string;
    language: string;
    storage: string;
    table_extraction: boolean;
    s3_bucket: string;
    s3_prefix: string;
    storage_path: string;
  };
  onChange: (config: PipelineConfigProps["config"]) => void;
}

export default function PipelineConfig({
  config,
  onChange,
}: PipelineConfigProps) {
  const { data: serverConfig } = useConfig();

  const providers = serverConfig?.providers || [];
  const languages = serverConfig?.languages || [];
  const currentProvider = providers.find((p) => p.name === config.provider);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pipeline Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium mb-1">Provider</label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={config.provider}
            onChange={(e) => {
              const p = providers.find((p) => p.name === e.target.value);
              onChange({
                ...config,
                provider: e.target.value,
                model: p?.default_model || "",
              });
            }}
          >
            {providers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={config.model}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
          >
            {(currentProvider?.models || []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium mb-1">Language</label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={config.language}
            onChange={(e) => onChange({ ...config, language: e.target.value })}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </div>

        {/* Storage */}
        <div>
          <label className="block text-sm font-medium mb-1">Storage</label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={config.storage}
            onChange={(e) => onChange({ ...config, storage: e.target.value })}
          >
            {(serverConfig?.storage_backends || ["local"]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* S3 options */}
      {config.storage === "s3" && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">S3 Bucket</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2"
              value={config.s3_bucket}
              onChange={(e) =>
                onChange({ ...config, s3_bucket: e.target.value })
              }
              placeholder="my-bucket"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">S3 Prefix</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2"
              value={config.s3_prefix}
              onChange={(e) =>
                onChange({ ...config, s3_prefix: e.target.value })
              }
              placeholder="rag-output/"
            />
          </div>
        </div>
      )}

      {/* NFS path */}
      {config.storage === "nfs" && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium mb-1">Mount Path</label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2"
            value={config.storage_path}
            onChange={(e) =>
              onChange({ ...config, storage_path: e.target.value })
            }
            placeholder="/mnt/nfs/output"
          />
        </div>
      )}

      {/* Table extraction toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="table-extraction"
          checked={config.table_extraction}
          onChange={(e) =>
            onChange({ ...config, table_extraction: e.target.checked })
          }
          className="rounded"
        />
        <label htmlFor="table-extraction" className="text-sm font-medium">
          Enable table extraction
        </label>
      </div>
    </div>
  );
}
