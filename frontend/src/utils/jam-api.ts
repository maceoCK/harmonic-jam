import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
    ignored?: boolean;
    industry?: string;
    description?: string;
}

export interface ICollection {
    id: string;
    collection_name: string;
    companies: ICompany[];
    total: number;
    collection_count?: number;
}

export interface ICompanyBatchResponse {
    companies: ICompany[];
}

export interface IBulkOperationResponse {
    operation_id: string;
    status: string;
    message: string;
    total: number;
    processed: number;
}

export interface IBulkOperationStatus {
    operation_id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    total: number;
    processed: number;
    errors: string[];
    started_at: string;
    completed_at?: string;
}

const BASE_URL = 'http://localhost:8000';

export async function getCompanies(offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/companies`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsById(id: string, offset?: number, limit?: number): Promise<ICollection> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${id}`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections`);
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function bulkAddCompanies(collectionId: string, companyIds: number[]): Promise<IBulkOperationResponse> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/${collectionId}/companies/bulk-add`, {
            company_ids: companyIds,
        });
        return response.data;
    } catch (error) {
        console.error('Error adding companies to collection:', error);
        throw error;
    }
}

export async function bulkRemoveCompanies(collectionId: string, companyIds: number[]): Promise<IBulkOperationResponse> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/${collectionId}/companies/bulk-remove`, {
            company_ids: companyIds,
        });
        return response.data;
    } catch (error) {
        console.error('Error removing companies from collection:', error);
        throw error;
    }
}

export async function getAllCompanyIdsInCollection(collectionId: string): Promise<number[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${collectionId}/companies/ids`);
        return response.data;
    } catch (error) {
        console.error('Error fetching company IDs:', error);
        throw error;
    }
}

export async function getOperationStatus(operationId: string): Promise<IBulkOperationStatus> {
    try {
        const response = await axios.get(`${BASE_URL}/operations/${operationId}/status`);
        return response.data;
    } catch (error) {
        console.error('Error fetching operation status:', error);
        throw error;
    }
}

export interface IConflictCheckRequest {
    company_ids: number[];
    target_collection_id: string;
}

export interface IConflictCheckResponse {
    conflicts: Array<{
        company_id: number;
        conflict_type: string;
        message: string;
    }>;
    duplicates: number[];
    safe_to_add: number[];
    total_checked: number;
}

export async function checkConflicts(request: IConflictCheckRequest): Promise<IConflictCheckResponse> {
    try {
        const response = await axios.post(`${BASE_URL}/companies/check-conflicts`, request);
        return response.data;
    } catch (error) {
        console.error('Error checking conflicts:', error);
        throw error;
    }
}

export interface IStatusCheckRequest {
    company_ids: number[];
}

export interface IStatusCheckResponse {
    liked_count: number;
    ignored_count: number;
    no_status_count: number;
    liked_ids: number[];
    ignored_ids: number[];
}

export async function checkStatuses(request: IStatusCheckRequest): Promise<IStatusCheckResponse> {
    try {
        const response = await axios.post(`${BASE_URL}/companies/check-statuses`, request);
        return response.data;
    } catch (error) {
        console.error('Error checking statuses:', error);
        throw error;
    }
}