"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit, Loader, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AssetCrudPage({ title, subtitle }: { title: string; subtitle: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({ asset: null, loading: false });
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

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) => {
      const searchableValues = [
        asset.assetTag,
        asset.deviceType,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.assignedToUser?.email,
        asset.assignedToUserId,
        asset.notes,
      ];

      return searchableValues.some((value) => value?.toLowerCase().includes(query));
    });
  }, [assets, searchQuery]);

  const assetMetrics = useMemo(() => {
    const totalAssets = assets.length;
    const assignedAssets = assets.filter((asset) => Boolean(asset.assignedToUserId || asset.assignedToUser?.email)).length;
    const recentlyPurchased = assets.filter((asset) => {
      if (!asset.purchasedAt) {
        return false;
      }

      return new Date(asset.purchasedAt).getFullYear() >= new Date().getFullYear();
    }).length;

    return [
      { label: "Total assets", value: totalAssets.toString(), description: "Records in inventory" },
      { label: "Assigned", value: assignedAssets.toString(), description: "Linked to users" },
      { label: "Purchased this year", value: recentlyPurchased.toString(), description: "Recent procurement" },
    ];
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
    if (!formState.deviceType.trim()) {
      setError("Device type is required");
      return;
    }

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
        setAssets((current) => current.map((asset) => (asset.id === editingAssetId ? updated : asset)));
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
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setSelectedAssetId((current) => (current === asset.id ? null : current));
      setDetailState((current) => (current.asset?.id === asset.id ? { asset: null, loading: false } : current));
      if (selectedAssetId === asset.id) {
        closeAssetDetails();
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to delete asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-8 pb-24 pt-2 sm:pt-4">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03),transparent)] px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.38em] text-zinc-500">Asset management</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">{subtitle}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
              <Button type="button" onClick={loadAssets} className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700">
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-white/10 px-6 py-6 sm:grid-cols-2 xl:grid-cols-3 sm:px-8">
          {assetMetrics.map((metric) => (
            <div key={metric.label} className="rounded-3xl border border-white/10 bg-zinc-950/35 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">{metric.label}</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-3xl font-semibold text-white">{metric.value}</p>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Card className="border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <CardHeader className="border-b border-white/10 bg-white/[0.03] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl text-white">Asset inventory</CardTitle>
              <CardDescription className="max-w-2xl text-zinc-400">
                Browse records, inspect ownership, and manage lifecycle data without losing context.
              </CardDescription>
            </div>
            <div className="w-full lg:max-w-md">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/45 px-4 py-3">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tag, type, brand, serial, user..."
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="m-6 flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 py-16 text-sm text-zinc-400 sm:m-8">
              <Loader className="h-5 w-5 animate-spin" />
              Loading assets...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="m-6 rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center sm:m-8">
              <p className="text-base font-medium text-white">No assets match your search</p>
              <p className="mt-2 text-sm text-zinc-400">
                Try a different keyword or clear the search to see the full inventory.
              </p>
              <div className="mt-6 flex justify-center">
                <Button type="button" onClick={() => setSearchQuery("")} className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700">
                  Clear search
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-950/95 text-[11px] uppercase tracking-[0.28em] text-zinc-500 backdrop-blur">
                    <tr>
                      <th className="border-b border-white/10 px-6 py-4 font-medium">Asset</th>
                      <th className="border-b border-white/10 px-4 py-4 font-medium">Type</th>
                      <th className="border-b border-white/10 px-4 py-4 font-medium">Brand</th>
                      <th className="border-b border-white/10 px-4 py-4 font-medium">Model</th>
                      <th className="border-b border-white/10 px-4 py-4 font-medium">Serial</th>
                      <th className="border-b border-white/10 px-4 py-4 font-medium">Assigned To</th>
                      <th className="border-b border-white/10 px-4 py-4 font-medium">Purchased</th>
                      <th className="border-b border-white/10 px-6 py-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => {
                      const isSelected = asset.id === selectedAssetId;
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => openAssetDetails(asset)}
                          className={cn(
                            "group cursor-pointer transition",
                            isSelected ? "bg-white/10" : "hover:bg-white/[0.04]",
                          )}
                        >
                          <td className="border-b border-white/5 px-6 py-5 align-top">
                            <div className="space-y-1.5">
                              <p className="font-medium text-white">{asset.assetTag || "Untitled asset"}</p>
                              <p className="text-xs text-zinc-500">{asset.serialNumber || "No serial number"}</p>
                            </div>
                          </td>
                          <td className="border-b border-white/5 px-4 py-5 align-top text-zinc-300">
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200">
                              {asset.deviceType}
                            </span>
                          </td>
                          <td className="border-b border-white/5 px-4 py-5 align-top text-zinc-400">{asset.brand || "-"}</td>
                          <td className="border-b border-white/5 px-4 py-5 align-top text-zinc-400">{asset.model || "-"}</td>
                          <td className="border-b border-white/5 px-4 py-5 align-top text-zinc-400">{asset.serialNumber || "-"}</td>
                          <td className="border-b border-white/5 px-4 py-5 align-top text-zinc-400">
                            {asset.assignedToUser?.email || asset.assignedToUserId || "-"}
                          </td>
                          <td className="border-b border-white/5 px-4 py-5 align-top text-zinc-400">
                            {asset.purchasedAt ? asset.purchasedAt.slice(0, 10) : "-"}
                          </td>
                          <td className="border-b border-white/5 px-6 py-5 align-top">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                className="h-9 bg-zinc-800 px-3 text-zinc-50 hover:bg-zinc-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEdit(asset);
                                }}
                                disabled={isSubmitting}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                className="h-9 bg-red-500/15 px-3 text-red-100 hover:bg-red-500/25"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDelete(asset);
                                }}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isDetailOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur" onClick={closeAssetDetails}>
          <div
            className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02),transparent)] px-8 py-6">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Asset Information</p>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Asset Details</h2>
                </div>
                <button
                  type="button"
                  onClick={closeAssetDetails}
                  className="rounded-full border border-white/20 bg-white/5 p-2.5 text-zinc-400 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
              {detailState.loading ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-12 text-sm text-zinc-400">
                  <Loader className="h-5 w-5 animate-spin" />
                  Fetching asset details...
                </div>
              ) : detailState.asset ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Asset Tag</p>
                        <p className="mt-2 text-3xl font-bold text-white">{detailState.asset.assetTag || "Untitled asset"}</p>
                      </div>
                      <div className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200">
                        {detailState.asset.deviceType}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Device type" value={detailState.asset.deviceType} />
                    <DetailRow label="Brand" value={detailState.asset.brand || "-"} />
                    <DetailRow label="Model" value={detailState.asset.model || "-"} />
                    <DetailRow label="Serial number" value={detailState.asset.serialNumber || "-"} />
                    <DetailRow label="Assigned to" value={detailState.asset.assignedToUser?.email || detailState.asset.assignedToUserId || "-"} />
                    <DetailRow label="Purchased at" value={detailState.asset.purchasedAt ? detailState.asset.purchasedAt.slice(0, 10) : "-"} />
                    <DetailRow label="Created at" value={detailState.asset.createdAt ? detailState.asset.createdAt.slice(0, 10) : "-"} />
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Notes</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{detailState.asset.notes || "No notes provided."}</p>
                  </div>
                  {detailState.asset.tickets && (
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Tickets</p>
                      <p className="mt-3 text-sm text-zinc-300">{detailState.asset.tickets.length} linked ticket(s)</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-zinc-400">
                  No asset details available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(mode === "create" || mode === "edit") && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-2xl shadow-black/60">
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02),transparent)] px-8 py-6">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Asset Editor</p>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {mode === "edit" ? "Edit asset" : "Create asset"}
                  </h2>
                  <p className="max-w-xl text-sm leading-6 text-zinc-400">
                    {mode === "edit" ? "Update the asset information below." : "Add a new asset to your inventory."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-white/20 bg-white/5 p-2.5 text-zinc-400 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Device type" required>
                  <Input
                    value={formState.deviceType}
                    onChange={(event) => setFormState((current) => ({ ...current, deviceType: event.target.value }))}
                    placeholder="Laptop"
                  />
                </Field>
                <Field label="Asset tag">
                  <Input
                    value={formState.assetTag}
                    onChange={(event) => setFormState((current) => ({ ...current, assetTag: event.target.value }))}
                    placeholder="IT-2026-0001"
                  />
                </Field>
                <Field label="Assigned to user ID">
                  <Input
                    value={formState.assignedToUserId}
                    onChange={(event) => setFormState((current) => ({ ...current, assignedToUserId: event.target.value }))}
                    placeholder="UUID"
                  />
                </Field>
                <Field label="Purchased at">
                  <Input
                    type="date"
                    value={formState.purchasedAt}
                    onChange={(event) => setFormState((current) => ({ ...current, purchasedAt: event.target.value }))}
                  />
                </Field>
                <Field label="Brand">
                  <Input
                    value={formState.brand}
                    onChange={(event) => setFormState((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="Dell"
                  />
                </Field>
                <Field label="Model">
                  <Input
                    value={formState.model}
                    onChange={(event) => setFormState((current) => ({ ...current, model: event.target.value }))}
                    placeholder="Latitude 5440"
                  />
                </Field>
                <Field label="Serial number">
                  <Input
                    value={formState.serialNumber}
                    onChange={(event) => setFormState((current) => ({ ...current, serialNumber: event.target.value }))}
                    placeholder="SN123456789"
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <textarea
                    value={formState.notes}
                    onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Asset remarks, location, or assignment notes"
                    rows={5}
                    className="flex min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(39,39,42,0.4),rgba(9,9,11,0.8))] px-8 py-5 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" className="h-10 bg-zinc-800 text-zinc-50 hover:bg-zinc-700" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="h-10">
                  {isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {mode === "edit" ? "Update Asset" : "Create Asset"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <Label className="text-sm font-medium text-zinc-200">
        {label}
        {required ? <span className="ml-1 text-red-400">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-right text-sm text-white">{value}</span>
    </div>
  );
}