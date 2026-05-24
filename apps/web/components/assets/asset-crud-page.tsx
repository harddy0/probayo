"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Edit,
  Loader,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UserSelect from "@/components/ui/user-select";
import { isApiError } from "@/lib/api/client";
import {
  createAsset,
  deleteAsset,
  fetchAllAssets,
  fetchAssetById,
  updateAsset,
} from "@/lib/api/assets";
import type { Asset } from "@/lib/types/assets";
import { cn } from "@/lib/utils";

type AssetFormState = {
  assignedToUserId: string;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchasedAt: string;
  notes: string;
};

type DetailState = {
  asset: Asset | null;
  loading: boolean;
};

const emptyFormState: AssetFormState = {
  assignedToUserId: "",
  assetTag: "",
  deviceType: "",
  brand: "",
  model: "",
  serialNumber: "",
  purchasedAt: "",
  notes: "",
};

const toFormState = (asset: Asset): AssetFormState => ({
  assignedToUserId: asset.assignedToUserId ?? "",
  assetTag: asset.assetTag ?? "",
  deviceType: asset.deviceType ?? "",
  brand: asset.brand ?? "",
  model: asset.model ?? "",
  serialNumber: asset.serialNumber ?? "",
  purchasedAt: asset.purchasedAt ? asset.purchasedAt.slice(0, 10) : "",
  notes: asset.notes ?? "",
});

const toNullable = (value: string) => (value.trim() ? value.trim() : null);

export function AssetCrudPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({
    asset: null,
    loading: false,
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AssetFormState>(emptyFormState);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllAssets();
      setAssets(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => {
      const searchable = [
        asset.assetTag,
        asset.deviceType,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.assignedToUser?.email,
        asset.assignedToUserId,
        asset.notes,
      ];
      return searchable.some((v) => v?.toLowerCase().includes(query));
    });
  }, [assets, searchQuery]);

  const assetStats = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((a) => Boolean(a.assignedToUserId || a.assignedToUser?.email)).length;
    const recent = assets.filter((a) => a.purchasedAt && new Date(a.purchasedAt).getFullYear() >= new Date().getFullYear()).length;
    return { total, assigned, recent };
  }, [assets]);

  const openAssetDetails = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    setIsDetailOpen(true);
    setError(null);
    setDetailState({ asset, loading: true });
    void (async () => {
      try {
        const fullAsset = await fetchAssetById(asset.id);
        setDetailState({ asset: fullAsset, loading: false });
      } catch (err) {
        setDetailState({ asset: null, loading: false });
        setError(isApiError(err) ? err.message : "Failed to load asset details");
      }
    })();
  };

  const closeAssetDetails = () => {
    setIsDetailOpen(false);
    setSelectedAssetId(null);
    setDetailState({ asset: null, loading: false });
  };

  const openCreate = () => {
    setMode("create");
    setEditingAssetId(null);
    setFormState(emptyFormState);
    setError(null);
  };

  const openEdit = (asset: Asset) => {
    setMode("edit");
    setEditingAssetId(asset.id);
    setFormState(toFormState(asset));
    setError(null);
  };

  const closeModal = () => {
    setMode(null);
    setEditingAssetId(null);
    setFormState(emptyFormState);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formState.deviceType.trim()) { setError("Device type is required"); return; }
    setIsSubmitting(true);
    setError(null);
    const payload = {
      assignedToUserId: toNullable(formState.assignedToUserId),
      assetTag: toNullable(formState.assetTag),
      deviceType: formState.deviceType.trim(),
      brand: toNullable(formState.brand),
      model: toNullable(formState.model),
      serialNumber: toNullable(formState.serialNumber),
      purchasedAt: toNullable(formState.purchasedAt),
      notes: toNullable(formState.notes),
    };
    try {
      if (mode === "edit" && editingAssetId) {
        const updated = await updateAsset(editingAssetId, payload);
        setAssets((current) => current.map((a) => (a.id === editingAssetId ? updated : a)));
        setSelectedAssetId(updated.id);
        setDetailState({ asset: updated, loading: false });
        setIsDetailOpen(true);
      } else {
        const created = await createAsset(payload);
        setAssets((current) => [created, ...current]);
        setSelectedAssetId(created.id);
        setDetailState({ asset: created, loading: false });
        setIsDetailOpen(true);
      }
      closeModal();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to save asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (asset: Asset) => {
    const confirmed = window.confirm(`Delete asset ${asset.assetTag || asset.id}?`);
    if (!confirmed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setSelectedAssetId((current) => (current === asset.id ? null : current));
      setDetailState((current) => current.asset?.id === asset.id ? { asset: null, loading: false } : current);
      if (selectedAssetId === asset.id) closeAssetDetails();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to delete asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Ultra-compact header row ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={assetStats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Assigned" value={assetStats.assigned} className="text-sky-400" />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="This year" value={assetStats.recent} className="text-emerald-400" />
          </div>
          <button
            onClick={loadAssets}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New asset
          </button>
        </div>
      </div>

      {/* ── Compact search bar ── */}
      <div className="relative flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tag, type, brand, serial, user…"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="shrink-0 rounded-md p-0.5 text-zinc-500 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Table (fills remaining height, scrolls if needed) ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-2xl text-zinc-600">🔧</span>
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No assets found"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery ? "Try a different keyword." : "Add your first asset to the inventory."}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery("")} className="mt-2 h-8 rounded-lg bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700">
                Clear search
              </button>
            ) : (
              <button onClick={openCreate} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-100">
                <Plus className="h-3.5 w-3.5" />
                New Asset
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-950/95 text-[10px] uppercase tracking-[0.25em] text-zinc-500 backdrop-blur">
                <tr>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">Asset</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Type</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Brand</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Model</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Serial</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Assigned To</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Purchased</th>
                  <th className="border-b border-white/10 px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => openAssetDetails(asset)}
                    className={cn(
                      "group cursor-pointer transition hover:bg-white/[0.04]",
                      asset.id === selectedAssetId && "bg-white/10",
                    )}
                  >
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <p className="truncate font-medium text-white">
                        {asset.assetTag || "Untitled asset"}
                      </p>
                      <p className="truncate text-[11px] text-zinc-600">{asset.serialNumber || "No serial"}</p>
                    </td>
                    <td className="border-b border-white/5 px-3 py-2.5">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-200">
                        {asset.deviceType}
                      </span>
                    </td>
                    <td className="border-b border-white/5 px-3 py-2.5 text-zinc-400">{asset.brand || "—"}</td>
                    <td className="border-b border-white/5 px-3 py-2.5 text-zinc-400">{asset.model || "—"}</td>
                    <td className="border-b border-white/5 px-3 py-2.5 text-zinc-400">{asset.serialNumber || "—"}</td>
                    <td className="max-w-[160px] truncate border-b border-white/5 px-3 py-2.5 text-zinc-400">
                      {asset.assignedToUser?.email || asset.assignedToUserId || "—"}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2.5 text-zinc-400">
                      {asset.purchasedAt ? asset.purchasedAt.slice(0, 10) : "—"}
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <div className="flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(asset); }}
                          disabled={isSubmitting}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          <Edit className="mr-1 inline h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDelete(asset); }}
                          disabled={isSubmitting}
                          className="rounded-lg border border-red-500/20 px-2.5 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="mr-1 inline h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Asset Details Modal ── */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeAssetDetails}>
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Asset Information</p>
                <h2 className="mt-0.5 text-base font-semibold text-white">Asset details</h2>
              </div>
              <button onClick={closeAssetDetails} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {detailState.loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
                  <Loader className="h-4 w-4 animate-spin" />
                  Fetching details…
                </div>
              ) : detailState.asset ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Asset Tag</p>
                        <p className="mt-1 text-lg font-bold text-white">{detailState.asset.assetTag || "Untitled asset"}</p>
                      </div>
                      <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200">{detailState.asset.deviceType}</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailRow label="Brand" value={detailState.asset.brand || "—"} />
                    <DetailRow label="Model" value={detailState.asset.model || "—"} />
                    <DetailRow label="Serial number" value={detailState.asset.serialNumber || "—"} />
                    <DetailRow label="Assigned to" value={detailState.asset.assignedToUser?.email || detailState.asset.assignedToUserId || "—"} />
                    <DetailRow label="Purchased at" value={detailState.asset.purchasedAt ? detailState.asset.purchasedAt.slice(0, 10) : "—"} />
                    <DetailRow label="Created at" value={detailState.asset.createdAt ? detailState.asset.createdAt.slice(0, 10) : "—"} />
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{detailState.asset.notes || "No notes provided."}</p>
                  </div>
                  {detailState.asset.tickets && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Tickets</p>
                      <p className="mt-2 text-sm text-zinc-300">{detailState.asset.tickets.length} linked ticket(s)</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-zinc-500">No asset details available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {(mode === "create" || mode === "edit") && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">{mode === "edit" ? "Edit asset" : "Create asset"}</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {mode === "edit" ? "Update asset information." : "Add a new asset to inventory."}
                </p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Device type" required>
                  <Input value={formState.deviceType} onChange={(e) => setFormState((p) => ({ ...p, deviceType: e.target.value }))} placeholder="Laptop" className="h-9 rounded-lg text-sm" />
                </Field>
                <Field label="Asset tag">
                  <Input value={formState.assetTag} onChange={(e) => setFormState((p) => ({ ...p, assetTag: e.target.value }))} placeholder="IT-2026-0001" className="h-9 rounded-lg text-sm" />
                </Field>
                <Field label="Brand">
                  <Input value={formState.brand} onChange={(e) => setFormState((p) => ({ ...p, brand: e.target.value }))} placeholder="Dell" className="h-9 rounded-lg text-sm" />
                </Field>
                <Field label="Model">
                  <Input value={formState.model} onChange={(e) => setFormState((p) => ({ ...p, model: e.target.value }))} placeholder="Latitude 5440" className="h-9 rounded-lg text-sm" />
                </Field>
                <Field label="Serial number">
                  <Input value={formState.serialNumber} onChange={(e) => setFormState((p) => ({ ...p, serialNumber: e.target.value }))} placeholder="SN123456789" className="h-9 rounded-lg text-sm" />
                </Field>
                <Field label="Assigned to user">
                  <UserSelect value={formState.assignedToUserId} onChange={(id) => setFormState((p) => ({ ...p, assignedToUserId: id }))} placeholder="Search users…" />
                </Field>
                <Field label="Purchased at">
                  <Input type="date" value={formState.purchasedAt} onChange={(e) => setFormState((p) => ({ ...p, purchasedAt: e.target.value }))} className="h-9 rounded-lg text-sm" />
                </Field>
                <Field label="Notes" className="md:col-span-2">
                  <textarea
                    value={formState.notes}
                    onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Asset remarks, location, or assignment notes"
                    rows={4}
                    className="flex min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30"
                  />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
              <button onClick={closeModal} className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10">Cancel</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50">
                {isSubmitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {mode === "edit" ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-zinc-400">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-right text-xs text-white">{value}</span>
    </div>
  );
}

function StatPill({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums text-white", className)}>{value}</span>
    </div>
  );
}
