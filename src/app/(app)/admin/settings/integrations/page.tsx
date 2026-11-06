"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Shield,
  Send,
  Calendar,
  FileSpreadsheet,
  Webhook,
  Activity,
  ChevronRight,
  Plus,
} from "lucide-react";

export default function IntegrationsDashboard() {
  const [connections, setConnections] = useState<any[]>([]);
  const [apiClients, setApiClients] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"connections" | "api_keys" | "webhooks" | "import_export">("connections");
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  // New API Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState("users:read,assessments:read,learning_records:read");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // New Webhook Modal State
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("exam.completed,certificate.issued");

  // Import State
  const [importEntityType, setImportEntityType] = useState("USERS");
  const [importContent, setImportContent] = useState(`email,name,role,department\njohn.doe@corp.example,John Doe,STUDENT,Engineering\nsarah.connor@corp.example,Sarah Connor,TEACHER,Operations`);
  const [importResult, setImportResult] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resConn, resApi, resWh] = await Promise.all([
        fetch("/api/integrations/connections").then((r) => r.json()),
        fetch("/api/integrations/api-clients").then((r) => r.json()),
        fetch("/api/integrations/webhooks").then((r) => r.json()),
      ]);

      if (resConn.connections) setConnections(resConn.connections);
      if (resApi.clients) setApiClients(resApi.clients);
      if (resWh.subscriptions) setWebhooks(resWh.subscriptions);
    } catch {
      setErrorNotice("The request could not be completed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestConnection = async (connId: string) => {
    setTestingId(connId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/connections/${connId}/test`, { method: "POST" });
      const data = await res.json();
      if (data.result) {
        setTestResult({
          id: connId,
          ok: data.result.ok,
          msg: data.result.message || (data.result.ok ? "Healthy" : "Failed"),
        });
        loadData();
      }
    } catch (err: any) {
      setTestResult({ id: connId, ok: false, msg: err.message || "Failed" });
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/integrations/api-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          scopes: newKeyScopes.split(",").map((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (data.client) {
        setCreatedSecret(data.client.clientSecret);
        loadData();
      }
    } catch {
      setErrorNotice("The request could not be completed. Check your connection and try again.");
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: webhookName,
          targetUrl: webhookUrl,
          events: webhookEvents.split(",").map((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (data.subscription) {
        setShowWebhookModal(false);
        setWebhookName("");
        loadData();
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      setErrorNotice("The request could not be completed. Check your connection and try again.");
    }
  };

  const handleValidateImport = async () => {
    try {
      const res = await fetch("/api/integrations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "enterprise_users.csv",
          content: importContent,
          entityType: importEntityType,
          format: "CSV",
        }),
      });
      const data = await res.json();
      setImportResult(data.validation);
    } catch {
      setErrorNotice("The request could not be completed. Check your connection and try again.");
    }
  };

  const handleCommitImport = async () => {
    if (!importResult?.batchId) return;
    try {
      const res = await fetch("/api/integrations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          batchId: importResult.batchId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Batch successfully committed to database!");
        setImportResult(null);
      }
    } catch {
      setErrorNotice("The request could not be completed. Check your connection and try again.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="border-b border-gray-200 pb-5 dark:border-gray-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Enterprise Integrations & External Systems
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Centralized integration registry, circuit breaker telemetry, SSRF-guarded webhooks, and REST API access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
          {[
            { id: "connections", label: "Integration Registry", icon: Globe },
            { id: "api_keys", label: "REST API & Scopes", icon: Key },
            { id: "webhooks", label: "Outbound Webhooks", icon: Webhook },
            { id: "import_export", label: "Data Exchange & Sync", icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex min-h-[44px] items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorNotice && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorNotice}</p>}

      {/* Tab 1: Integration Registry */}
      {activeTab === "connections" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn) => {
              const isTesting = testingId === conn.id;
              const hasResult = testResult && testResult.id === conn.id;

              return (
                <div
                  key={conn.id}
                  className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {conn.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          conn.status === "ACTIVE" || conn.status === "CONNECTED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {conn.status}
                      </span>
                    </div>

                    <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{conn.name}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                      Provider: <span className="font-mono">{conn.provider}</span>
                    </p>

                    {conn.endpointUrl && (
                      <p className="mt-1 line-clamp-1 text-xs font-mono text-gray-400 dark:text-gray-500">
                        {conn.endpointUrl}
                      </p>
                    )}

                    {conn.healthMessage && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                        <div className="flex items-center gap-1 font-medium">
                          <Activity className="h-3.5 w-3.5 text-blue-500" />
                          Diagnostic: {conn.healthLatencyMs ? `${conn.healthLatencyMs}ms` : ""}
                        </div>
                        <p className="mt-0.5 line-clamp-2">{conn.healthMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {conn.credentials?.length || 0} encrypted keys
                    </span>
                    <button
                      onClick={() => handleTestConnection(conn.id)}
                      disabled={isTesting}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
                      {isTesting ? "Testing..." : "Test Connection"}
                    </button>
                  </div>

                  {hasResult && (
                    <div
                      className={`mt-2 rounded p-2 text-xs font-medium ${
                        testResult.ok
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {testResult.msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: REST API & API Keys */}
      {activeTab === "api_keys" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">API Client Credentials</h2>
              <p className="text-xs text-gray-500">
                Grant external enterprise systems scoped REST access to /api/v1/* endpoints.
              </p>
            </div>
            <button
              onClick={() => {
                setShowKeyModal(true);
                setCreatedSecret(null);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Generate API Key
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Application Name</th>
                    <th className="px-4 py-3 font-medium">Client ID</th>
                    <th className="px-4 py-3 font-medium">Secret Hint</th>
                    <th className="px-4 py-3 font-medium">Granted Scopes</th>
                    <th className="px-4 py-3 font-medium">Rate Limit</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {apiClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        No active API client credentials found.
                      </td>
                    </tr>
                  ) : (
                    apiClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{client.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{client.clientId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{client.keyHint}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {client.scopes.map((s: string) => (
                              <span
                                key={s}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{client.rateLimitPerMin} req/min</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Webhooks */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Outbound Webhook Subscriptions</h2>
              <p className="text-xs text-gray-500">
                Push asynchronous event payloads signed with HMAC-SHA256 headers with SSRF containment.
              </p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Register Webhook
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {webhooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
                No webhook subscriptions registered.
              </div>
            ) : (
              webhooks.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{sub.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">{sub.targetUrl}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {sub.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sub.events.map((ev: string) => (
                      <span
                        key={ev}
                        className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>

                  {sub.recentDeliveries?.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-500">Recent Deliveries:</p>
                      <div className="mt-2 space-y-1">
                        {sub.recentDeliveries.map((del: any) => (
                          <div
                            key={del.id}
                            className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"
                          >
                            <span>Event: <strong className="font-mono">{del.event}</strong></span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-semibold ${
                                del.status === "DELIVERED"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {del.status} ({del.statusCode || "N/A"})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Data Exchange & Sync */}
      {activeTab === "import_export" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Enterprise User & Roster CSV Import</h3>
            <p className="text-xs text-gray-500">
              Performs dry-run syntax and schema validation before committing changes. Conflict resolution defaults to LMS Wins.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">CSV Content</label>
                <textarea
                  rows={4}
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 font-mono text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleValidateImport}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Run Dry-Run Validation
                </button>
                <a
                  href="/api/integrations/export"
                  download
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Training Records (CSV)
                </a>
                <a
                  href="/api/user/calendar.ics"
                  download
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <Calendar className="h-4 w-4" />
                  Export iCalendar (.ics)
                </a>
              </div>

              {importResult && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Validation Preview: {importResult.validRows} valid rows, {importResult.errorRows} errors
                  </h4>
                  {importResult.validRows > 0 && (
                    <button
                      onClick={handleCommitImport}
                      className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Commit Valid Rows to LMS Database
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Create Enterprise API Client</h3>

            {createdSecret ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Client secret generated! Copy this now. It will NEVER be shown again:
                  </p>
                  <p className="mt-2 break-all font-mono text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    {createdSecret}
                  </p>
                </div>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Application Name</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Workday Payroll Sync"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Granted Scopes</label>
                  <input
                    type="text"
                    required
                    value={newKeyScopes}
                    onChange={(e) => setNewKeyScopes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Webhook */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Subscribe External Webhook</h3>
            <form onSubmit={handleCreateWebhook} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Webhook Name</label>
                <input
                  type="text"
                  required
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="e.g. HR Compliance Notifier"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Target URL (HTTPS)</label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Subscribed Events</label>
                <input
                  type="text"
                  required
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
