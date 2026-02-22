"use client";

import { useConfig } from "@/hooks/useJobs";

interface PipelineConfigProps {
  config: {
    provider: string;
    model: string;
    language: string;
    storage: string;
    table_extraction: boolean;
    text_only: boolean;
    quality: string;
    start_page: string;
    end_page: string;
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

      {/* Text-only mode toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={config.text_only}
              onChange={(e) =>
                onChange({
                  ...config,
                  text_only: e.target.checked,
                  table_extraction: e.target.checked ? false : config.table_extraction,
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
              Text-only mode
            </span>
            <p className="text-xs text-slate-500">
              Extract text only — no images, no Vision LLM, zero API cost
            </p>
          </div>
        </label>

        {config.text_only && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-4 h-4 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-green-700">
              No Vision LLM API calls will be made. Only pdfium text extraction is used.
            </p>
          </div>
        )}
      </div>

      {/* Quality level selector */}
      <div className={`space-y-2${config.text_only ? " opacity-50 pointer-events-none" : ""}`}>
        <label className={labelClasses}>Quality</label>
        <div className="flex gap-2">
          {(serverConfig?.quality_levels || []).map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => onChange({ ...config, quality: q.value })}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                config.quality === q.value
                  ? q.value === "high"
                    ? "bg-amber-50 border-amber-400 text-amber-800"
                    : "bg-indigo-50 border-indigo-400 text-indigo-800"
                  : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        {config.quality === "high" && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-amber-700">
              Every page will be sent to the Vision LLM as a 300 DPI image. Best Thai/OCR accuracy but uses 2-5x more tokens. Free with Ollama.
            </p>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-2 gap-4${config.text_only ? " opacity-50 pointer-events-none" : ""}`}>
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

      {/* Page range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>Start Page</label>
          <input
            type="number"
            min={1}
            className={inputClasses}
            value={config.start_page}
            onChange={(e) =>
              onChange({ ...config, start_page: e.target.value })
            }
            placeholder="First page (default: 1)"
          />
        </div>
        <div>
          <label className={labelClasses}>End Page</label>
          <input
            type="number"
            min={1}
            className={inputClasses}
            value={config.end_page}
            onChange={(e) =>
              onChange({ ...config, end_page: e.target.value })
            }
            placeholder="Last page (default: all)"
          />
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
      <label className={`flex items-center gap-3 cursor-pointer group${config.text_only ? " opacity-50 pointer-events-none" : ""}`}>
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
