from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Optional, Union, Any
import uuid
import json

from backend.db import database

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
)


class CompanyOutput(BaseModel):
    id: int
    company_name: str
    liked: bool
    ignored: bool = False
    
    # Basic company information
    description: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_stage: Optional[str] = None
    founded_year: Optional[int] = None
    location: Optional[str] = None
    
    # Funding and financial data
    total_funding: Optional[int] = None
    last_funding_round: Optional[str] = None
    last_funding_amount: Optional[int] = None
    valuation: Optional[int] = None
    revenue: Optional[int] = None
    
    # Company size and growth
    employee_count: Optional[int] = None
    growth_rate: Optional[float] = None
    
    # Social and web presence
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    crunchbase_url: Optional[str] = None
    
    # Time-series data for charts
    headcount_history: Optional[Any] = None
    funding_history: Optional[Any] = None
    revenue_history: Optional[Any] = None
    valuation_history: Optional[Any] = None
    growth_metrics: Optional[Any] = None
    
    class Config:
        from_attributes = True


class CompanyBatchOutput(BaseModel):
    companies: list[CompanyOutput]
    total: int


def fetch_companies_with_liked(
    db: Session, company_ids: list[int]
) -> list[CompanyOutput]:
    liked_list = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies List")
        .first()
    )
    
    ignored_list = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Companies to Ignore List")
        .first()
    )

    liked_associations = (
        db.query(database.CompanyCollectionAssociation)
        .filter(database.CompanyCollectionAssociation.company_id.in_(company_ids))
        .filter(
            database.CompanyCollectionAssociation.collection_id == liked_list.id,
        )
        .all()
    ) if liked_list else []
    
    ignored_associations = (
        db.query(database.CompanyCollectionAssociation)
        .filter(database.CompanyCollectionAssociation.company_id.in_(company_ids))
        .filter(
            database.CompanyCollectionAssociation.collection_id == ignored_list.id,
        )
        .all()
    ) if ignored_list else []

    liked_companies = {association.company_id for association in liked_associations}
    ignored_companies = {association.company_id for association in ignored_associations}

    companies = (
        db.query(database.Company).filter(database.Company.id.in_(company_ids)).all()
    )

    results = []
    for company in companies:
        # Create location string from components
        location = None
        if company.headquarters_city:
            location = company.headquarters_city
            if company.headquarters_state:
                location += f", {company.headquarters_state}"
        
        results.append(
            CompanyOutput(
                id=company.id,
                company_name=company.company_name,
                liked=company.id in liked_companies,
                ignored=company.id in ignored_companies,
                # Rich company data fields
                description=company.description,
                website=company.website,
                industry=company.industry,
                company_stage=company.company_stage,
                founded_year=company.founded_year,
                location=location,
                total_funding=company.total_funding,
                last_funding_round=company.last_funding_round,
                last_funding_amount=company.last_funding_amount,
                valuation=company.valuation,
                revenue=company.estimated_revenue,  # Map estimated_revenue to revenue for frontend
                employee_count=company.employee_count,
                growth_rate=company.revenue_growth_rate,  # Map to growth_rate for frontend
                linkedin_url=company.linkedin_url,
                twitter_url=company.twitter_handle,  # Map twitter_handle to twitter_url for frontend
                crunchbase_url=company.crunchbase_url,
                # Time-series data for charts
                headcount_history=company.headcount_history,
                funding_history=company.funding_history,
                revenue_history=company.revenue_history,
                valuation_history=company.valuation_history,
                growth_metrics=company.growth_metrics,
            )
        )

    return results


@router.get("", response_model=CompanyBatchOutput)
def get_companies(
    offset: int = Query(0, description="The number of items to skip from the beginning"),
    limit: int = Query(10, description="The number of items to fetch"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    min_funding: Optional[int] = Query(None, description="Minimum total funding in USD"),
    max_funding: Optional[int] = Query(None, description="Maximum total funding in USD"),
    min_employees: Optional[int] = Query(None, description="Minimum employee count"),
    max_employees: Optional[int] = Query(None, description="Maximum employee count"),
    founded_after: Optional[int] = Query(None, description="Founded after year"),
    company_stage: Optional[str] = Query(None, description="Company stage (startup, growth, mature, enterprise)"),
    db: Session = Depends(database.get_db),
):
    # Build query with filters
    query = db.query(database.Company)
    
    # Apply filters
    if industry:
        query = query.filter(database.Company.industry.ilike(f"%{industry}%"))
    if min_funding is not None:
        query = query.filter(database.Company.total_funding >= min_funding)
    if max_funding is not None:
        query = query.filter(database.Company.total_funding <= max_funding)
    if min_employees is not None:
        query = query.filter(database.Company.employee_count >= min_employees)
    if max_employees is not None:
        query = query.filter(database.Company.employee_count <= max_employees)
    if founded_after is not None:
        query = query.filter(database.Company.founded_year >= founded_after)
    if company_stage:
        query = query.filter(database.Company.company_stage.ilike(f"%{company_stage}%"))
    
    # Get total count with filters applied
    count = query.count()
    
    # Apply pagination
    results = query.offset(offset).limit(limit).all()
    
    companies = fetch_companies_with_liked(db, [company.id for company in results])

    return CompanyBatchOutput(
        companies=companies,
        total=count,
    )


class CompanyCollectionStatus(BaseModel):
    company_id: int
    collections: List[Dict[str, str]]  # List of {id, name} for each collection
    is_liked: bool
    is_ignored: bool


class ConflictCheckRequest(BaseModel):
    company_ids: List[int]
    target_collection_id: str


class ConflictCheckResponse(BaseModel):
    conflicts: List[Dict]  # Companies that would cause conflicts
    duplicates: List[int]  # Companies already in target collection
    safe_to_add: List[int]  # Companies that can be added without issues
    total_checked: int


class StatusCheckRequest(BaseModel):
    company_ids: List[int]


class StatusCheckResponse(BaseModel):
    liked_count: int
    ignored_count: int
    no_status_count: int
    liked_ids: List[int]
    ignored_ids: List[int]


# New models for analytics and metrics
class MetricsDataPoint(BaseModel):
    date: str
    value: Union[int, float]
    additional_info: Optional[Dict] = None


class MetricsOutput(BaseModel):
    company_id: int
    company_name: str
    metric_type: str  # headcount, funding, revenue
    data_points: List[MetricsDataPoint]
    total_points: int


class IndustryAnalytics(BaseModel):
    industry: str
    company_count: int
    avg_funding: Optional[float] = None
    avg_employees: Optional[float] = None
    avg_revenue: Optional[float] = None
    total_funding: Optional[int] = None


class FundingTrend(BaseModel):
    period: str  # year or quarter
    total_funding: int
    deal_count: int
    avg_deal_size: float
    companies: List[str]  # company names


class GrowthDistribution(BaseModel):
    growth_range: str  # "0-10%", "10-25%", etc.
    company_count: int
    percentage: float
    avg_growth_rate: float


class AnalyticsOutput(BaseModel):
    industries: Optional[List[IndustryAnalytics]] = None
    funding_trends: Optional[List[FundingTrend]] = None
    growth_distribution: Optional[List[GrowthDistribution]] = None
    total_companies: int
    last_updated: str


@router.post("/check-conflicts", response_model=ConflictCheckResponse)
def check_conflicts(
    request: ConflictCheckRequest,
    db: Session = Depends(database.get_db),
):
    """Check for conflicts before bulk operations"""
    target_collection_id = uuid.UUID(request.target_collection_id)
    
    # Get special collections
    liked_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies List")
        .first()
    )
    
    ignore_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Companies to Ignore List")
        .first()
    )
    
    conflicts = []
    duplicates = []
    safe_to_add = []
    
    for company_id in request.company_ids:
        # Check if already in target collection
        existing = (
            db.query(database.CompanyCollectionAssociation)
            .filter(
                database.CompanyCollectionAssociation.company_id == company_id,
                database.CompanyCollectionAssociation.collection_id == target_collection_id
            )
            .first()
        )
        
        if existing:
            duplicates.append(company_id)
            continue
        
        # Check for conflicts (can't be in both liked and ignored)
        in_liked = False
        in_ignored = False
        
        if liked_collection:
            in_liked = (
                db.query(database.CompanyCollectionAssociation)
                .filter(
                    database.CompanyCollectionAssociation.company_id == company_id,
                    database.CompanyCollectionAssociation.collection_id == liked_collection.id
                )
                .first()
            ) is not None
        
        if ignore_collection:
            in_ignored = (
                db.query(database.CompanyCollectionAssociation)
                .filter(
                    database.CompanyCollectionAssociation.company_id == company_id,
                    database.CompanyCollectionAssociation.collection_id == ignore_collection.id
                )
                .first()
            ) is not None
        
        # Determine if there's a conflict
        has_conflict = False
        conflict_info = {"company_id": company_id}
        
        if target_collection_id == liked_collection.id and in_ignored:
            has_conflict = True
            conflict_info["conflict_type"] = "in_ignored"
            conflict_info["message"] = "Company is in Ignore List"
        elif target_collection_id == ignore_collection.id and in_liked:
            has_conflict = True
            conflict_info["conflict_type"] = "in_liked"
            conflict_info["message"] = "Company is in Liked List"
        
        if has_conflict:
            conflicts.append(conflict_info)
        else:
            safe_to_add.append(company_id)
    
    return ConflictCheckResponse(
        conflicts=conflicts,
        duplicates=duplicates,
        safe_to_add=safe_to_add,
        total_checked=len(request.company_ids)
    )


@router.post("/check-statuses", response_model=StatusCheckResponse)
def check_statuses(
    request: StatusCheckRequest,
    db: Session = Depends(database.get_db),
):
    """Check which companies have liked/ignored statuses"""
    # Get special collections
    liked_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies List")
        .first()
    )
    
    ignore_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Companies to Ignore List")
        .first()
    )
    
    liked_ids = []
    ignored_ids = []
    
    if liked_collection:
        liked_associations = (
            db.query(database.CompanyCollectionAssociation.company_id)
            .filter(
                database.CompanyCollectionAssociation.company_id.in_(request.company_ids),
                database.CompanyCollectionAssociation.collection_id == liked_collection.id
            )
            .all()
        )
        liked_ids = [a.company_id for a in liked_associations]
    
    if ignore_collection:
        ignored_associations = (
            db.query(database.CompanyCollectionAssociation.company_id)
            .filter(
                database.CompanyCollectionAssociation.company_id.in_(request.company_ids),
                database.CompanyCollectionAssociation.collection_id == ignore_collection.id
            )
            .all()
        )
        ignored_ids = [a.company_id for a in ignored_associations]
    
    no_status_count = len(request.company_ids) - len(liked_ids) - len(ignored_ids)
    
    return StatusCheckResponse(
        liked_count=len(liked_ids),
        ignored_count=len(ignored_ids),
        no_status_count=no_status_count,
        liked_ids=liked_ids,
        ignored_ids=ignored_ids
    )


@router.get("/{company_id}/collections", response_model=CompanyCollectionStatus)
def get_company_collections(
    company_id: int,
    db: Session = Depends(database.get_db),
):
    """Get all collections a company belongs to"""
    associations = (
        db.query(database.CompanyCollectionAssociation, database.CompanyCollection)
        .join(database.CompanyCollection)
        .filter(database.CompanyCollectionAssociation.company_id == company_id)
        .all()
    )
    
    collections = [
        {"id": str(collection.id), "name": collection.collection_name}
        for _, collection in associations
    ]
    
    is_liked = any(c["name"] == "Liked Companies List" for c in collections)
    is_ignored = any(c["name"] == "Companies to Ignore List" for c in collections)
    
    return CompanyCollectionStatus(
        company_id=company_id,
        collections=collections,
        is_liked=is_liked,
        is_ignored=is_ignored
    )


# Analytics endpoints
@router.get("/{company_id}/metrics/headcount", response_model=MetricsOutput)
def get_company_headcount_metrics(
    company_id: int,
    db: Session = Depends(database.get_db),
):
    """Get headcount history for a specific company"""
    company = db.query(database.Company).filter(database.Company.id == company_id).first()
    
    if not company:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Company not found")
    
    data_points = []
    if company.headcount_history:
        try:
            # Parse JSON data if stored as text
            history_data = json.loads(company.headcount_history) if isinstance(company.headcount_history, str) else company.headcount_history
            
            for entry in history_data:
                data_points.append(MetricsDataPoint(
                    date=entry.get("date", ""),
                    value=entry.get("count", 0),
                    additional_info={"period": entry.get("period", "monthly")}
                ))
        except (json.JSONDecodeError, TypeError):
            pass
    
    return MetricsOutput(
        company_id=company_id,
        company_name=company.company_name,
        metric_type="headcount",
        data_points=data_points,
        total_points=len(data_points)
    )


@router.get("/{company_id}/metrics/funding", response_model=MetricsOutput)
def get_company_funding_metrics(
    company_id: int,
    db: Session = Depends(database.get_db),
):
    """Get funding history for a specific company"""
    company = db.query(database.Company).filter(database.Company.id == company_id).first()
    
    if not company:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Company not found")
    
    data_points = []
    if company.funding_history:
        try:
            history_data = json.loads(company.funding_history) if isinstance(company.funding_history, str) else company.funding_history
            
            for entry in history_data:
                data_points.append(MetricsDataPoint(
                    date=entry.get("date", ""),
                    value=entry.get("amount", 0),
                    additional_info={
                        "round": entry.get("round", ""),
                        "investors": entry.get("investors", [])
                    }
                ))
        except (json.JSONDecodeError, TypeError):
            pass
    
    return MetricsOutput(
        company_id=company_id,
        company_name=company.company_name,
        metric_type="funding",
        data_points=data_points,
        total_points=len(data_points)
    )


@router.get("/{company_id}/metrics/revenue", response_model=MetricsOutput)
def get_company_revenue_metrics(
    company_id: int,
    db: Session = Depends(database.get_db),
):
    """Get revenue history for a specific company"""
    company = db.query(database.Company).filter(database.Company.id == company_id).first()
    
    if not company:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Company not found")
    
    data_points = []
    if company.revenue_history:
        try:
            history_data = json.loads(company.revenue_history) if isinstance(company.revenue_history, str) else company.revenue_history
            
            for entry in history_data:
                data_points.append(MetricsDataPoint(
                    date=entry.get("date", ""),
                    value=entry.get("revenue", 0),
                    additional_info={
                        "period": entry.get("period", "annual"),
                        "currency": entry.get("currency", "USD")
                    }
                ))
        except (json.JSONDecodeError, TypeError):
            pass
    
    return MetricsOutput(
        company_id=company_id,
        company_name=company.company_name,
        metric_type="revenue",
        data_points=data_points,
        total_points=len(data_points)
    )


@router.get("/analytics/industry")
def get_industry_analytics(
    limit: int = Query(10, description="Number of industries to return"),
    db: Session = Depends(database.get_db),
):
    """Get aggregated data by industry"""
    from datetime import datetime
    
    # Query industry analytics
    industry_stats = (
        db.query(
            database.Company.industry,
            func.count(database.Company.id).label('company_count'),
            func.avg(database.Company.total_funding).label('avg_funding'),
            func.avg(database.Company.employee_count).label('avg_employees'),
            func.avg(database.Company.revenue).label('avg_revenue'),
            func.sum(database.Company.total_funding).label('total_funding')
        )
        .filter(database.Company.industry.isnot(None))
        .group_by(database.Company.industry)
        .order_by(func.count(database.Company.id).desc())
        .limit(limit)
        .all()
    )
    
    industries = []
    for stat in industry_stats:
        industries.append(IndustryAnalytics(
            industry=stat.industry,
            company_count=stat.company_count,
            avg_funding=float(stat.avg_funding) if stat.avg_funding else None,
            avg_employees=float(stat.avg_employees) if stat.avg_employees else None,
            avg_revenue=float(stat.avg_revenue) if stat.avg_revenue else None,
            total_funding=stat.total_funding
        ))
    
    total_companies = db.query(database.Company).count()
    
    return AnalyticsOutput(
        industries=industries,
        total_companies=total_companies,
        last_updated=datetime.now().isoformat()
    )


@router.get("/analytics/funding-trends")
def get_funding_trends(
    period: str = Query("year", description="Aggregation period: year or quarter"),
    limit: int = Query(5, description="Number of periods to return"),
    db: Session = Depends(database.get_db),
):
    """Get funding trends over time"""
    from datetime import datetime
    
    # This is a simplified implementation - in reality, you'd parse the funding_history JSON
    # to extract time-based data
    funding_trends = []
    
    # For now, return sample data structure
    if period == "year":
        # Group by founded year as a proxy for funding trends
        year_stats = (
            db.query(
                database.Company.founded_year,
                func.count(database.Company.id).label('deal_count'),
                func.sum(database.Company.total_funding).label('total_funding'),
                func.avg(database.Company.total_funding).label('avg_funding')
            )
            .filter(database.Company.founded_year.isnot(None))
            .filter(database.Company.total_funding.isnot(None))
            .group_by(database.Company.founded_year)
            .order_by(database.Company.founded_year.desc())
            .limit(limit)
            .all()
        )
        
        for stat in year_stats:
            funding_trends.append(FundingTrend(
                period=str(stat.founded_year),
                total_funding=stat.total_funding or 0,
                deal_count=stat.deal_count,
                avg_deal_size=float(stat.avg_funding) if stat.avg_funding else 0,
                companies=[]  # Would need more complex query to get company names
            ))
    
    total_companies = db.query(database.Company).count()
    
    return AnalyticsOutput(
        funding_trends=funding_trends,
        total_companies=total_companies,
        last_updated=datetime.now().isoformat()
    )


@router.get("/analytics/growth-distribution")
def get_growth_distribution(
    db: Session = Depends(database.get_db),
):
    """Get growth rate distributions"""
    from datetime import datetime
    
    # Query companies with growth rates
    companies_with_growth = (
        db.query(database.Company.growth_rate)
        .filter(database.Company.growth_rate.isnot(None))
        .all()
    )
    
    # Create growth distribution buckets
    growth_buckets = {
        "0-10%": {"min": 0, "max": 10, "count": 0, "rates": []},
        "10-25%": {"min": 10, "max": 25, "count": 0, "rates": []},
        "25-50%": {"min": 25, "max": 50, "count": 0, "rates": []},
        "50-100%": {"min": 50, "max": 100, "count": 0, "rates": []},
        "100%+": {"min": 100, "max": float('inf'), "count": 0, "rates": []}
    }
    
    total_with_growth = len(companies_with_growth)
    
    for company in companies_with_growth:
        rate = company.growth_rate
        for bucket_name, bucket in growth_buckets.items():
            if bucket["min"] <= rate < bucket["max"]:
                bucket["count"] += 1
                bucket["rates"].append(rate)
                break
    
    distributions = []
    for bucket_name, bucket in growth_buckets.items():
        if bucket["count"] > 0:
            avg_rate = sum(bucket["rates"]) / len(bucket["rates"])
            percentage = (bucket["count"] / total_with_growth) * 100 if total_with_growth > 0 else 0
            
            distributions.append(GrowthDistribution(
                growth_range=bucket_name,
                company_count=bucket["count"],
                percentage=round(percentage, 2),
                avg_growth_rate=round(avg_rate, 2)
            ))
    
    total_companies = db.query(database.Company).count()
    
    return AnalyticsOutput(
        growth_distribution=distributions,
        total_companies=total_companies,
        last_updated=datetime.now().isoformat()
    )
