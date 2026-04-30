/**
 * Assets API Module
 *
 * Handles asset-related API operations:
 * - Create, read, update, delete assets
 * - Fetch asset lists with assigned user info
 * - Get individual asset details with tickets
 */

import { request } from "./client";
import type {
  AssetResponse,
  AssetsListResponse,
  CreateAssetRequest,
  UpdateAssetRequest,
} from "../types/assets";

export const fetchAllAssets = async (): Promise<AssetsListResponse> => {
  return request<AssetsListResponse>("/assets");
};

export const fetchAssetById = async (id: string): Promise<AssetResponse> => {
  return request<AssetResponse>(`/assets/${id}`);
};

export const createAsset = async (data: CreateAssetRequest): Promise<AssetResponse> => {
  return request<AssetResponse>("/assets", {
    method: "POST",
    body: data,
  });
};

export const updateAsset = async (id: string, data: UpdateAssetRequest): Promise<AssetResponse> => {
  return request<AssetResponse>(`/assets/${id}`, {
    method: "PATCH",
    body: data,
  });
};

export const deleteAsset = async (id: string): Promise<void> => {
  await request<void>(`/assets/${id}`, {
    method: "DELETE",
  });
};