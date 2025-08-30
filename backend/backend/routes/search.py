from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.db import database
from backend.services.search import search_service

router = APIRouter(
    prefix="/search",
    tags=["search"],
)

class SearchResponse(BaseModel):
    companies: List[Dict[str, Any]]
    total: int
    aggregations: Dict[str, Any]

class SuggestResponse(BaseModel):
    suggestions: List[str]

class SearchIdsResponse(BaseModel):
    company_ids: List[int]
    total: int

@router.get("", response_model=SearchResponse)
def search_companies(
    q: str = Query(..., description="Search query"),
    offset: int = Query(0, description="Number of items to skip"),
    limit: int = Query(25, description="Number of items to fetch"),
    collection_id: Optional[str] = Query(None, description="Filter by collection"),
    db: Session = Depends(database.get_db)
):
    """
    Search companies using natural language queries.
    
    Examples:
    - "fintech companies in San Francisco"
    - "series B startups with 50-200 employees"
    - "companies founded after 2020 with >10M funding"
    """
    try:
        results = search_service.search(q, offset, limit, collection_id)
        return SearchResponse(
            companies=results['companies'],
            total=results['total'],
            aggregations=results['aggregations']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ids", response_model=SearchIdsResponse)
def search_company_ids(
    q: str = Query(..., description="Search query"),
    collection_id: Optional[str] = Query(None, description="Filter by collection"),
    db: Session = Depends(database.get_db)
):
    """
    Get all company IDs matching the search query.
    Used for Select All functionality with filtered results.
    """
    try:
        # Get all matching companies (no pagination)
        results = search_service.search(q, offset=0, limit=10000, collection_id=collection_id)
        company_ids = [company['id'] for company in results['companies']]
        return SearchIdsResponse(
            company_ids=company_ids,
            total=results['total']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggest", response_model=SuggestResponse)
def get_suggestions(
    q: str = Query(..., description="Partial search query"),
    size: int = Query(5, description="Number of suggestions")
):
    """Get autocomplete suggestions for company names"""
    try:
        suggestions = search_service.suggest(q, size)
        return SuggestResponse(suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reindex")
def reindex_companies(
    db: Session = Depends(database.get_db)
):
    """Reindex all companies in Elasticsearch"""
    try:
        search_service.create_index()
        search_service.index_companies(db)
        return {"message": "Reindexing completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))