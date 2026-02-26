"use client";

import { useState, useEffect } from "react";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useTestNotification,
} from "@/hooks/useSettings";
import type { NotificationSettings } from "@/lib/types";

const inputClasses =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const labelClasses = "block text-sm font-medium text-slate-700 mb-1.5";

const defaultSettings: NotificationSettings = {
  enabled: false,
  line_enabled: false,
  line_token: "",
  email_enabled: false,
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  email_from: "",
  email_to: "",
  notify_on_complete: true,
  notify_on_failure: true,
};

export default function SettingsPage() {
  const { data: serverSettings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const testNotif = useTestNotification();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showLineGuide, setShowLineGuide] = useState(false);

  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings);
    }
  }, [serverSettings]);

  const handleSave = () => {
    setSaved(false);
    updateSettings.mutate(settings, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  };

  const handleTest = () => {
    testNotif.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-500">Loading settings...</span>
      </div>
    );
  }

  const update = (partial: Partial<NotificationSettings>) =>
    setSettings((prev) => ({ ...prev, ...partial }));

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Configure notifications for job completion and failure alerts.
        </p>
      </div>

      {/* Master toggle */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-indigo-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
          </div>
          <div>
            <span className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
              Enable Notifications
            </span>
            <p className="text-sm text-slate-500">
              Receive alerts when jobs complete or fail
            </p>
          </div>
        </label>
      </div>

      <div className={settings.enabled ? "" : "opacity-50 pointer-events-none"}>
        {/* LINE Notify */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">LINE Notify</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.line_enabled}
                  onChange={(e) => update({ line_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
              </div>
            </label>
          </div>
          <div className={settings.line_enabled ? "" : "opacity-50 pointer-events-none"}>
            <label className={labelClasses}>LINE Notify Token</label>
            <input
              type="password"
              className={inputClasses}
              value={settings.line_token}
              onChange={(e) => update({ line_token: e.target.value })}
              placeholder="Enter your LINE Notify token"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setShowLineGuide(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                How to get a LINE Notify token?
              </button>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Email (SMTP)</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={(e) => update({ email_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
              </div>
            </label>
          </div>
          <div className={settings.email_enabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>SMTP Host</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={settings.smtp_host}
                  onChange={(e) => update({ smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className={labelClasses}>SMTP Port</label>
                <input
                  type="number"
                  className={inputClasses}
                  value={settings.smtp_port}
                  onChange={(e) => update({ smtp_port: Number(e.target.value) || 587 })}
                  placeholder="587"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Username</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={settings.smtp_username}
                  onChange={(e) => update({ smtp_username: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className={labelClasses}>Password</label>
                <input
                  type="password"
                  className={inputClasses}
                  value={settings.smtp_password}
                  onChange={(e) => update({ smtp_password: e.target.value })}
                  placeholder="App password"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>From Address</label>
                <input
                  type="email"
                  className={inputClasses}
                  value={settings.email_from}
                  onChange={(e) => update({ email_from: e.target.value })}
                  placeholder="noreply@example.com"
                />
              </div>
              <div>
                <label className={labelClasses}>To Address</label>
                <input
                  type="email"
                  className={inputClasses}
                  value={settings.email_to}
                  onChange={(e) => update({ email_to: e.target.value })}
                  placeholder="alerts@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trigger preferences */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Trigger Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notify_on_complete}
                onChange={(e) => update({ notify_on_complete: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Notify on job completion</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notify_on_failure}
                onChange={(e) => update({ notify_on_failure: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Notify on job failure</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={handleTest}
          disabled={!settings.enabled || testNotif.isPending}
          className="px-6 py-2.5 bg-white text-slate-700 rounded-lg font-medium border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {testNotif.isPending ? "Sending..." : "Send Test"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Settings saved!</span>
        )}
      </div>

      {/* Test result */}
      {testNotif.isSuccess && (
        <div
          className={`p-4 rounded-lg border ${
            testNotif.data.success
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p className={`text-sm font-medium ${testNotif.data.success ? "text-emerald-700" : "text-red-700"}`}>
            {testNotif.data.success ? "Test sent successfully!" : testNotif.data.error || "Test failed"}
          </p>
          {testNotif.data.results?.map((r, i) => (
            <p key={i} className="text-xs text-slate-600 mt-1">{r}</p>
          ))}
        </div>
      )}

      {testNotif.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">Error: {(testNotif.error as Error).message}</p>
        </div>
      )}

      {updateSettings.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            Save failed: {(updateSettings.error as Error).message}
          </p>
        </div>
      )}

      {/* LINE Notify Guide Modal */}
      {showLineGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLineGuide(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                How to Get a LINE Notify Token
              </h3>
              <button
                onClick={() => setShowLineGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Go to LINE Notify website</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Open{" "}
                    <a
                      href="https://notify-bot.line.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      notify-bot.line.me
                    </a>{" "}
                    and log in with your LINE account.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Go to My Page</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Click your name in the top-right corner, then select{" "}
                    <span className="font-medium text-slate-800">&quot;My page&quot;</span>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Generate a token</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Scroll down to{" "}
                    <span className="font-medium text-slate-800">&quot;Generate access token (For developers)&quot;</span>{" "}
                    and click{" "}
                    <span className="font-medium text-slate-800">&quot;Generate token&quot;</span>.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Set token name and target</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Enter a token name (e.g.{" "}
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">JAY-RAG Alerts</code>
                    ) and select a chat room to receive notifications:
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    <li className="text-sm text-slate-600 flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">&#8226;</span>
                      <span><span className="font-medium text-slate-800">&quot;1-on-1 chat with LINE Notify&quot;</span> &mdash; sends to your personal chat (recommended)</span>
                    </li>
                    <li className="text-sm text-slate-600 flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">&#8226;</span>
                      <span>Or select a <span className="font-medium text-slate-800">group chat</span> to notify your team</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Copy the token</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Click <span className="font-medium text-slate-800">&quot;Generate token&quot;</span>.
                    The token will be shown <span className="font-medium text-red-600">only once</span> &mdash; copy it immediately and paste it into the field above.
                  </p>
                </div>
              </div>

              {/* Important note */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-amber-800">Important</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    The token is displayed only once after generation. If you lose it, you&apos;ll need to revoke the old token and generate a new one.
                  </p>
                </div>
              </div>

              {/* Group chat note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-blue-800">Sending to a group?</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    If you selected a group chat, you must also invite the{" "}
                    <span className="font-medium">&quot;LINE Notify&quot;</span> bot into that group for messages to be delivered.
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowLineGuide(false)}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
