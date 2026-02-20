"use client";

import { useState } from "react";
import { useDeploy } from "@/hooks/useJobs";
import type {
  DeployRequest,
  DeployResponse,
  ImageTarget,
  ImageTargetType,
  MarkdownTarget,
  MarkdownTargetType,
} from "@/lib/types";

interface DeployModalProps {
  jobId: string;
  onClose: () => void;
  initialImageBaseUrl?: string;
}

type DeployState = "form" | "deploying" | "done";

export default function DeployModal({
  jobId,
  onClose,
  initialImageBaseUrl = "",
}: DeployModalProps) {
  const deploy = useDeploy();

  const [state, setState] = useState<DeployState>("form");
  const [result, setResult] = useState<DeployResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shared
  const [imageBaseUrl, setImageBaseUrl] = useState(initialImageBaseUrl);

  // Image target
  const [imageTargetType, setImageTargetType] = useState<ImageTargetType | "">(
    ""
  );
  const [imgLocalPath, setImgLocalPath] = useState("");
  const [imgS3Bucket, setImgS3Bucket] = useState("");
  const [imgS3Prefix, setImgS3Prefix] = useState("");
  const [imgS3Region, setImgS3Region] = useState("");
  const [imgScpHost, setImgScpHost] = useState("");
  const [imgScpPort, setImgScpPort] = useState("");
  const [imgScpUser, setImgScpUser] = useState("");
  const [imgScpKeyPath, setImgScpKeyPath] = useState("");
  const [imgScpRemotePath, setImgScpRemotePath] = useState("");

  // Markdown target
  const [mdTargetType, setMdTargetType] = useState<MarkdownTargetType | "">("");
  const [mdLocalPath, setMdLocalPath] = useState("");
  const [mdFlowiseUrl, setMdFlowiseUrl] = useState("http://localhost:3001");
  const [mdFlowiseApiKey, setMdFlowiseApiKey] = useState("");
  const [mdFlowiseStoreId, setMdFlowiseStoreId] = useState("");

  function buildImageTarget(): ImageTarget | undefined {
    if (!imageTargetType) return undefined;
    switch (imageTargetType) {
      case "local_folder":
        return { type: "local_folder", path: imgLocalPath };
      case "s3":
        return {
          type: "s3",
          bucket: imgS3Bucket,
          prefix: imgS3Prefix,
          ...(imgS3Region ? { region: imgS3Region } : {}),
        };
      case "scp":
        return {
          type: "scp",
          host: imgScpHost,
          ...(imgScpPort ? { port: parseInt(imgScpPort) } : {}),
          username: imgScpUser,
          ...(imgScpKeyPath ? { private_key_path: imgScpKeyPath } : {}),
          remote_path: imgScpRemotePath,
        };
    }
  }

  function buildMarkdownTarget(): MarkdownTarget | undefined {
    if (!mdTargetType) return undefined;
    switch (mdTargetType) {
      case "local_folder":
        return { type: "local_folder", path: mdLocalPath };
      case "flowise":
        return {
          type: "flowise",
          base_url: mdFlowiseUrl,
          api_key: mdFlowiseApiKey,
          store_id: mdFlowiseStoreId,
        };
    }
  }

  function canSubmit(): boolean {
    if (!imageBaseUrl.trim()) return false;
    if (!imageTargetType && !mdTargetType) return false;
    // Validate required fields per target
    if (imageTargetType === "local_folder" && !imgLocalPath.trim()) return false;
    if (imageTargetType === "s3" && (!imgS3Bucket.trim() || !imgS3Prefix.trim()))
      return false;
    if (
      imageTargetType === "scp" &&
      (!imgScpHost.trim() || !imgScpUser.trim() || !imgScpRemotePath.trim())
    )
      return false;
    if (mdTargetType === "local_folder" && !mdLocalPath.trim()) return false;
    if (
      mdTargetType === "flowise" &&
      (!mdFlowiseUrl.trim() ||
        !mdFlowiseApiKey.trim() ||
        !mdFlowiseStoreId.trim())
    )
      return false;
    return true;
  }

  async function handleDeploy() {
    setState("deploying");
    setError(null);

    const request: DeployRequest = {
      image_base_url: imageBaseUrl,
      image_target: buildImageTarget(),
      markdown_target: buildMarkdownTarget(),
    };

    try {
      const res = await deploy.mutateAsync({ jobId, request });
      setResult(res);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
      setState("form");
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-slate-600 mb-1";
  const selectClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Deploy to RAG Platform
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {state === "done" && result ? (
          <DeployResult result={result} onClose={onClose} />
        ) : (
          <>
            {/* Image Base URL */}
            <div className="mb-5">
              <label className={labelClass}>Image Base URL *</label>
              <input
                type="text"
                value={imageBaseUrl}
                onChange={(e) => setImageBaseUrl(e.target.value)}
                placeholder="e.g. http://192.168.0.10:8444/rag-images"
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1">
                Public URL where images will be accessible
              </p>
            </div>

            {/* Image Deployment */}
            <fieldset className="mb-5 border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">
                Image Deployment
              </legend>
              <div className="mb-3">
                <label className={labelClass}>Target</label>
                <select
                  value={imageTargetType}
                  onChange={(e) =>
                    setImageTargetType(
                      e.target.value as ImageTargetType | ""
                    )
                  }
                  className={selectClass}
                >
                  <option value="">Skip image deployment</option>
                  <option value="local_folder">Local Folder</option>
                  <option value="s3">AWS S3</option>
                  <option value="scp">SCP / SFTP</option>
                </select>
              </div>

              {imageTargetType === "local_folder" && (
                <div>
                  <label className={labelClass}>Destination Path *</label>
                  <input
                    type="text"
                    value={imgLocalPath}
                    onChange={(e) => setImgLocalPath(e.target.value)}
                    placeholder="/var/www/images/manual"
                    className={inputClass}
                  />
                </div>
              )}

              {imageTargetType === "s3" && (
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Bucket *</label>
                    <input
                      type="text"
                      value={imgS3Bucket}
                      onChange={(e) => setImgS3Bucket(e.target.value)}
                      placeholder="my-rag-images"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Prefix *</label>
                    <input
                      type="text"
                      value={imgS3Prefix}
                      onChange={(e) => setImgS3Prefix(e.target.value)}
                      placeholder="images/manual"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Region</label>
                    <input
                      type="text"
                      value={imgS3Region}
                      onChange={(e) => setImgS3Region(e.target.value)}
                      placeholder="ap-southeast-1 (uses default if empty)"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {imageTargetType === "scp" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className={labelClass}>Host *</label>
                      <input
                        type="text"
                        value={imgScpHost}
                        onChange={(e) => setImgScpHost(e.target.value)}
                        placeholder="192.168.0.10"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Port</label>
                      <input
                        type="text"
                        value={imgScpPort}
                        onChange={(e) => setImgScpPort(e.target.value)}
                        placeholder="22"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Username *</label>
                    <input
                      type="text"
                      value={imgScpUser}
                      onChange={(e) => setImgScpUser(e.target.value)}
                      placeholder="deploy"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Private Key Path</label>
                    <input
                      type="text"
                      value={imgScpKeyPath}
                      onChange={(e) => setImgScpKeyPath(e.target.value)}
                      placeholder="~/.ssh/id_rsa (uses default if empty)"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Remote Path *</label>
                    <input
                      type="text"
                      value={imgScpRemotePath}
                      onChange={(e) => setImgScpRemotePath(e.target.value)}
                      placeholder="/var/www/images/manual"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </fieldset>

            {/* Markdown Deployment */}
            <fieldset className="mb-5 border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">
                Markdown Deployment
              </legend>
              <div className="mb-3">
                <label className={labelClass}>Target</label>
                <select
                  value={mdTargetType}
                  onChange={(e) =>
                    setMdTargetType(
                      e.target.value as MarkdownTargetType | ""
                    )
                  }
                  className={selectClass}
                >
                  <option value="">Skip markdown deployment</option>
                  <option value="local_folder">Local Folder</option>
                  <option value="flowise">Flowise Document Store</option>
                </select>
              </div>

              {mdTargetType === "local_folder" && (
                <div>
                  <label className={labelClass}>Destination Path *</label>
                  <input
                    type="text"
                    value={mdLocalPath}
                    onChange={(e) => setMdLocalPath(e.target.value)}
                    placeholder="/var/www/markdown"
                    className={inputClass}
                  />
                </div>
              )}

              {mdTargetType === "flowise" && (
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Flowise Base URL *</label>
                    <input
                      type="text"
                      value={mdFlowiseUrl}
                      onChange={(e) => setMdFlowiseUrl(e.target.value)}
                      placeholder="http://localhost:3001"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>API Key *</label>
                    <input
                      type="password"
                      value={mdFlowiseApiKey}
                      onChange={(e) => setMdFlowiseApiKey(e.target.value)}
                      placeholder="Flowise API key"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Document Store ID *</label>
                    <input
                      type="text"
                      value={mdFlowiseStoreId}
                      onChange={(e) => setMdFlowiseStoreId(e.target.value)}
                      placeholder="abc-123-def-456"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </fieldset>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                disabled={!canSubmit() || state === "deploying"}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {state === "deploying" && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {state === "deploying" ? "Deploying..." : "Deploy Now"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeployResult({
  result,
  onClose,
}: {
  result: DeployResponse;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg ${
          result.success
            ? "bg-green-50 border border-green-200"
            : "bg-amber-50 border border-amber-200"
        }`}
      >
        {result.success ? (
          <svg
            className="w-5 h-5 text-green-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-amber-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        )}
        <span
          className={`text-sm font-medium ${
            result.success ? "text-green-700" : "text-amber-700"
          }`}
        >
          {result.success
            ? "Deployment completed successfully"
            : "Deployment completed with errors"}
        </span>
      </div>

      {result.image_result && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Images ({result.image_result.target_type})
          </p>
          <p className="text-sm text-slate-700">
            {result.image_result.detail}
          </p>
        </div>
      )}

      {result.markdown_result && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Markdown ({result.markdown_result.target_type})
          </p>
          <p className="text-sm text-slate-700">
            {result.markdown_result.detail}
          </p>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-medium text-red-600 mb-1">Errors</p>
          <ul className="text-sm text-red-700 space-y-1">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
