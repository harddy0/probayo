/**
 * Asset Types
 *
 * Defines the structure for asset data, responses, and API payloads.
 */

export type AssetAssignedUser = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
};

export type Asset = {
  id: string;
  assignedToUserId: string | null;
  assetTag: string | null;
  deviceType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchasedAt: string | null;
  notes: string | null;
  createdAt?: string;
  assignedToUser?: AssetAssignedUser | null;
  tickets?: unknown[];
};

export type CreateAssetRequest = {
  assignedToUserId?: string | null;
  assetTag?: string | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchasedAt?: string | null;
  notes?: string | null;
};

export type UpdateAssetRequest = {
  assignedToUserId?: string | null;
  assetTag?: string | null;
  deviceType?: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchasedAt?: string | null;
  notes?: string | null;
};

export type AssetResponse = Asset;

export type AssetsListResponse = Asset[];