import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
    ignored?: boolean;
    industry?: string;
    description?: string;
    website?: string;
    founded_year?: number;
    location?: string;
    total_funding?: number;
    last_funding_round?: string;
    last_funding_amount?: number;
    valuation?: number;
    revenue?: number;
    employee_count?: number;
    growth_rate?: number;
    company_stage?: string;
    technologies?: string;
    headcount_history?: Array<{date: string; count: number}>;
    funding_history?: Array<{date: string; amount: number; round: string}>;
    revenue_history?: Array<{date: string; amount: number}>;
    linkedin_url?: string;
    twitter_url?: string;
    crunchbase_url?: string;
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

export async function getCollectionsById(id: string, offset?: number, limit?: number, filters?: any): Promise<ICollection> {
    try {
        const params: any = {
            offset,
            limit,
        };
        
        // Add filter parameters if provided
        if (filters) {
            Object.assign(params, filters);
        }
        
        const response = await axios.get(`${BASE_URL}/collections/${id}`, {
            params,
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

// Filter interfaces
export interface ICompanyFilters {
    industries?: string[];
    funding_min?: number;
    funding_max?: number;
    employee_count_min?: number;
    employee_count_max?: number;
    founded_year_min?: number;
    founded_year_max?: number;
    company_stages?: string[];
}

// Analytics interfaces
export interface IIndustryAnalytics {
    industry: string;
    count: number;
    avg_funding: number;
    avg_employee_count: number;
    avg_valuation: number;
}

export interface IFundingAnalytics {
    total_funding: number;
    avg_funding_per_company: number;
    funding_by_stage: Array<{
        stage: string;
        total_funding: number;
        company_count: number;
    }>;
    funding_by_year: Array<{
        year: number;
        total_funding: number;
        company_count: number;
    }>;
}

export interface IMetrics {
    total_companies: number;
    total_funding: number;
    avg_employee_count: number;
    top_industries: string[];
    companies_by_stage: Record<string, number>;
}

// New API functions for analytics
export async function getCompaniesWithFilters(
    offset?: number, 
    limit?: number, 
    filters?: ICompanyFilters
): Promise<ICompanyBatchResponse> {
    try {
        const params: any = { offset, limit };
        if (filters) {
            Object.assign(params, filters);
        }
        const response = await axios.get(`${BASE_URL}/companies`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching filtered companies:', error);
        throw error;
    }
}

export async function getCompanyById(id: number): Promise<ICompany> {
    try {
        const response = await axios.get(`${BASE_URL}/companies/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching company details:', error);
        throw error;
    }
}

export async function getIndustryAnalytics(): Promise<IIndustryAnalytics[]> {
    try {
        const response = await axios.get(`${BASE_URL}/analytics/industries`);
        return response.data;
    } catch (error) {
        console.error('Error fetching industry analytics:', error);
        throw error;
    }
}

export async function getFundingAnalytics(): Promise<IFundingAnalytics> {
    try {
        const response = await axios.get(`${BASE_URL}/analytics/funding`);
        return response.data;
    } catch (error) {
        console.error('Error fetching funding analytics:', error);
        throw error;
    }
}

export async function getMetrics(): Promise<IMetrics> {
    try {
        const response = await axios.get(`${BASE_URL}/analytics/metrics`);
        return response.data;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        throw error;
    }
}

export async function getIndustries(): Promise<string[]> {
    try {
        const response = await axios.get(`${BASE_URL}/industries`);
        return response.data;
    } catch (error) {
        console.error('Error fetching industries:', error);
        throw error;
    }
}

export async function getCompanyStages(): Promise<string[]> {
    try {
        const response = await axios.get(`${BASE_URL}/company-stages`);
        return response.data;
    } catch (error) {
        console.error('Error fetching company stages:', error);
        throw error;
    }
}

export async function searchCompanyIds(query: string, collectionId?: string): Promise<number[]> {
    try {
        const params: any = { q: query };
        if (collectionId) {
            params.collection_id = collectionId;
        }
        const response = await axios.get(`${BASE_URL}/search/ids`, { params });
        return response.data.company_ids;
    } catch (error) {
        console.error('Error fetching search IDs:', error);
        throw error;
    }
}