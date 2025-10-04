import { Request } from 'express';

// Extend Express Request with user data
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// DTOs (Data Transfer Objects)
export interface RegisterDTO {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateItemDTO {
  name: string;
  description?: string;
  location: string;
  categories?: string[];
}

export interface UpdateItemDTO {
  name?: string;
  description?: string;
  location?: string;
  categories?: string[];
}

export interface CreateCategoryDTO {
  name: string;
}

export interface UpdatePhotoDTO {
  annotations?: any;
  displayOrder?: number;
}

export interface ItemSearchQuery {
  search?: string;
  category?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}
