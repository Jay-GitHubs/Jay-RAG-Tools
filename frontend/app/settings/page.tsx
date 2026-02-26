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
            <p className="text-xs text-slate-500 mt-1.5">
              Get a token at{" "}
              <a
                href="https://notify-bot.line.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                notify-bot.line.me
              </a>
            </p>
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
    </div>
  );
}
