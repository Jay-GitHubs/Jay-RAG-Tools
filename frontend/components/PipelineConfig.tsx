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

const selectClasses =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const inputClasses =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const labelClasses = "block text-sm font-medium text-slate-700 mb-1.5";

export default function PipelineConfig({
  config,
  onChange,
}: PipelineConfigProps) {
  const { data: serverConfig } = useConfig();

  const providers = serverConfig?.providers || [];
  const languages = serverConfig?.languages || [];
  const currentProvider = providers.find((p) => p.name === config.provider);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-slate-900">Pipeline Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Provider */}
        <div>
          <label className={labelClasses}>Provider</label>
          <select
            className={selectClasses}
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
                {p.display_name || p.name}
                {p.cost_per_image_usd > 0
                  ? ` (~$${p.cost_per_image_usd}/img)`
                  : " (Free)"}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className={labelClasses}>Model</label>
          <select
            className={selectClasses}
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
          <label className={labelClasses}>Language</label>
          <select
            className={selectClasses}
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
          <label className={labelClasses}>Storage</label>
          <select
            className={selectClasses}
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
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className={labelClasses}>S3 Bucket</label>
            <input
              type="text"
              className={inputClasses}
              value={config.s3_bucket}
              onChange={(e) =>
                onChange({ ...config, s3_bucket: e.target.value })
              }
              placeholder="my-bucket"
            />
          </div>
          <div>
            <label className={labelClasses}>S3 Prefix</label>
            <input
              type="text"
              className={inputClasses}
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
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <label className={labelClasses}>Mount Path</label>
          <input
            type="text"
            className={inputClasses}
            value={config.storage_path}
            onChange={(e) =>
              onChange({ ...config, storage_path: e.target.value })
            }
            placeholder="/mnt/nfs/output"
          />
        </div>
      )}

      {/* Table extraction toggle */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={config.table_extraction}
            onChange={(e) =>
              onChange({ ...config, table_extraction: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-indigo-600 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
        </div>
        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
          Enable table extraction
        </span>
      </label>
    </div>
  );
}
