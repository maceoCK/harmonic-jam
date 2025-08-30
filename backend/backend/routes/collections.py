import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import database
from backend.routes.companies import (
    CompanyBatchOutput,
    fetch_companies_with_liked,
)

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)


class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str
    collection_count: int = 0


class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass


@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    # Get counts for each collection
    collection_counts = {}
    for collection in collections:
        count = db.query(database.CompanyCollectionAssociation).filter(
            database.CompanyCollectionAssociation.collection_id == collection.id
        ).count()
        collection_counts[collection.id] = count

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
            collection_count=collection_counts.get(collection.id, 0),
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    # Filter parameters
    industries: list[str] = Query(default=None),
    company_stages: list[str] = Query(default=None),
    employee_min: int = Query(default=None),
    employee_max: int = Query(default=None),
    employee_count_equals: int = Query(default=None),
    employee_count_gt: int = Query(default=None),
    employee_count_gte: int = Query(default=None),
    employee_count_lt: int = Query(default=None),
    employee_count_lte: int = Query(default=None),
    funding_min: int = Query(default=None),
    funding_max: int = Query(default=None),
    total_funding_equals: int = Query(default=None),
    total_funding_gt: int = Query(default=None),
    total_funding_gte: int = Query(default=None),
    total_funding_lt: int = Query(default=None),
    total_funding_lte: int = Query(default=None),
    founded_year_min: int = Query(default=None),
    founded_year_max: int = Query(default=None),
    founded_year_equals: int = Query(default=None),
    founded_year_gt: int = Query(default=None),
    founded_year_gte: int = Query(default=None),
    founded_year_lt: int = Query(default=None),
    founded_year_lte: int = Query(default=None),
    # Sort parameters
    sort_by: str = Query(default=None),
    sort_order: str = Query(default="asc"),
    db: Session = Depends(database.get_db),
):
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )
    
    # Apply filters
    if industries:
        query = query.filter(database.Company.industry.in_(industries))
    if company_stages:
        query = query.filter(database.Company.company_stage.in_(company_stages))
    
    # Employee count filters
    if employee_min is not None:
        query = query.filter(database.Company.employee_count >= employee_min)
    if employee_max is not None:
        query = query.filter(database.Company.employee_count <= employee_max)
    if employee_count_equals is not None:
        query = query.filter(database.Company.employee_count == employee_count_equals)
    if employee_count_gt is not None:
        query = query.filter(database.Company.employee_count > employee_count_gt)
    if employee_count_gte is not None:
        query = query.filter(database.Company.employee_count >= employee_count_gte)
    if employee_count_lt is not None:
        query = query.filter(database.Company.employee_count < employee_count_lt)
    if employee_count_lte is not None:
        query = query.filter(database.Company.employee_count <= employee_count_lte)
    
    # Total funding filters
    if funding_min is not None:
        query = query.filter(database.Company.total_funding >= funding_min)
    if funding_max is not None:
        query = query.filter(database.Company.total_funding <= funding_max)
    if total_funding_equals is not None:
        query = query.filter(database.Company.total_funding == total_funding_equals)
    if total_funding_gt is not None:
        query = query.filter(database.Company.total_funding > total_funding_gt)
    if total_funding_gte is not None:
        query = query.filter(database.Company.total_funding >= total_funding_gte)
    if total_funding_lt is not None:
        query = query.filter(database.Company.total_funding < total_funding_lt)
    if total_funding_lte is not None:
        query = query.filter(database.Company.total_funding <= total_funding_lte)
    
    # Founded year filters
    if founded_year_min is not None:
        query = query.filter(database.Company.founded_year >= founded_year_min)
    if founded_year_max is not None:
        query = query.filter(database.Company.founded_year <= founded_year_max)
    if founded_year_equals is not None:
        query = query.filter(database.Company.founded_year == founded_year_equals)
    if founded_year_gt is not None:
        query = query.filter(database.Company.founded_year > founded_year_gt)
    if founded_year_gte is not None:
        query = query.filter(database.Company.founded_year >= founded_year_gte)
    if founded_year_lt is not None:
        query = query.filter(database.Company.founded_year < founded_year_lt)
    if founded_year_lte is not None:
        query = query.filter(database.Company.founded_year <= founded_year_lte)
    
    # Get total count before applying sorting (ORDER BY not allowed with COUNT)
    total_count = query.with_entities(func.count()).scalar()
    
    # Apply sorting after count
    if sort_by:
        sort_column = getattr(database.Company, sort_by, None)
        if sort_column:
            if sort_order == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

    results = query.offset(offset).limit(limit).all()
    companies = fetch_companies_with_liked(db, [company.id for _, company in results])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )
