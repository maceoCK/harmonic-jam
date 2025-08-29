from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict
import uuid

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
        results.append(
            CompanyOutput(
                id=company.id,
                company_name=company.company_name,
                liked=company.id in liked_companies,
                ignored=company.id in ignored_companies,
            )
        )

    return results


@router.get("", response_model=CompanyBatchOutput)
def get_companies(
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    results = db.query(database.Company).offset(offset).limit(limit).all()

    count = db.query(database.Company).count()
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
