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
    funding_min: int = Query(default=None),
    funding_max: int = Query(default=None),
    founded_year_min: int = Query(default=None),
    founded_year_max: int = Query(default=None),
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
    if employee_min is not None:
        query = query.filter(database.Company.employee_count >= employee_min)
    if employee_max is not None:
        query = query.filter(database.Company.employee_count <= employee_max)
    if funding_min is not None:
        query = query.filter(database.Company.total_funding >= funding_min)
    if funding_max is not None:
        query = query.filter(database.Company.total_funding <= funding_max)
    if founded_year_min is not None:
        query = query.filter(database.Company.founded_year >= founded_year_min)
    if founded_year_max is not None:
        query = query.filter(database.Company.founded_year <= founded_year_max)
    
    # Apply sorting
    if sort_by:
        sort_column = getattr(database.Company, sort_by, None)
        if sort_column:
            if sort_order == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

    total_count = query.with_entities(func.count()).scalar()

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
