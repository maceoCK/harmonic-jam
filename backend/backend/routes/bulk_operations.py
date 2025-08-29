from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import asyncio
import time
from datetime import datetime
from sqlalchemy import select, and_, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert

from backend.db.database import (
    AsyncSessionLocal,
    CompanyCollectionAssociation,
    CompanyCollection,
    Company
)
from backend.routes.websocket import broadcast_progress

router = APIRouter()

# Track ongoing operations
ongoing_operations = {}

class BulkAddRequest(BaseModel):
    company_ids: List[int]
    source_collection_id: Optional[UUID] = None

class BulkRemoveRequest(BaseModel):
    company_ids: List[int]

class BulkOperationResponse(BaseModel):
    operation_id: str
    status: str
    message: str
    total: int
    processed: int = 0

class BulkOperationStatus(BaseModel):
    operation_id: str
    status: str  # 'pending', 'in_progress', 'completed', 'failed'
    total: int
    processed: int
    errors: List[str] = []
    started_at: datetime
    completed_at: Optional[datetime] = None

async def process_bulk_add(operation_id: str, collection_id: UUID, company_ids: List[int], batch_size: int = 100):
    """Process bulk add operation in batches to handle throttling"""
    operation = ongoing_operations[operation_id]
    operation['status'] = 'in_progress'
    
    try:
        async with AsyncSessionLocal() as session:
            # Verify collection exists
            collection_result = await session.execute(
                select(CompanyCollection).where(CompanyCollection.id == collection_id)
            )
            collection = collection_result.scalar_one_or_none()
            if not collection:
                operation['status'] = 'failed'
                operation['errors'].append(f"Collection {collection_id} not found")
                return
            
            # Process in batches
            for i in range(0, len(company_ids), batch_size):
                batch = company_ids[i:i+batch_size]
                
                # Verify companies exist
                company_result = await session.execute(
                    select(Company.id).where(Company.id.in_(batch))
                )
                valid_company_ids = [row[0] for row in company_result]
                
                if len(valid_company_ids) != len(batch):
                    invalid_ids = set(batch) - set(valid_company_ids)
                    operation['errors'].append(f"Companies not found: {list(invalid_ids)}")
                
                # Insert associations, ignoring duplicates
                for company_id in valid_company_ids:
                    try:
                        association = CompanyCollectionAssociation(
                            company_id=company_id,
                            collection_id=collection_id
                        )
                        session.add(association)
                        await session.commit()
                        operation['processed'] += 1
                    except IntegrityError:
                        # Duplicate - skip
                        await session.rollback()
                        operation['processed'] += 1
                        continue
                    except Exception as e:
                        await session.rollback()
                        operation['errors'].append(f"Error adding company {company_id}: {str(e)}")
                
                # Broadcast progress update
                await broadcast_progress(operation_id, {
                    'operation_id': operation_id,
                    'status': operation['status'],
                    'total': operation['total'],
                    'processed': operation['processed'],
                    'percentage': (operation['processed'] / operation['total']) * 100
                })
                
                # Update progress
                await asyncio.sleep(0.01)  # Small delay to prevent overwhelming
            
            operation['status'] = 'completed'
            operation['completed_at'] = datetime.utcnow()
            
    except Exception as e:
        operation['status'] = 'failed'
        operation['errors'].append(str(e))
        operation['completed_at'] = datetime.utcnow()

async def process_bulk_remove(operation_id: str, collection_id: UUID, company_ids: List[int], batch_size: int = 100):
    """Process bulk remove operation in batches"""
    operation = ongoing_operations[operation_id]
    operation['status'] = 'in_progress'
    
    try:
        async with AsyncSessionLocal() as session:
            # Process in batches
            for i in range(0, len(company_ids), batch_size):
                batch = company_ids[i:i+batch_size]
                
                # Delete associations
                result = await session.execute(
                    delete(CompanyCollectionAssociation).where(
                        and_(
                            CompanyCollectionAssociation.collection_id == collection_id,
                            CompanyCollectionAssociation.company_id.in_(batch)
                        )
                    )
                )
                await session.commit()
                operation['processed'] += result.rowcount
                
                # Broadcast progress update
                await broadcast_progress(operation_id, {
                    'operation_id': operation_id,
                    'status': operation['status'],
                    'total': operation['total'],
                    'processed': operation['processed'],
                    'percentage': (operation['processed'] / operation['total']) * 100
                })
                
                # Update progress
                await asyncio.sleep(0.01)
            
            operation['status'] = 'completed'
            operation['completed_at'] = datetime.utcnow()
            
    except Exception as e:
        operation['status'] = 'failed'
        operation['errors'].append(str(e))
        operation['completed_at'] = datetime.utcnow()

@router.post("/collections/{collection_id}/companies/bulk-add")
async def bulk_add_companies(
    collection_id: UUID,
    request: BulkAddRequest,
    background_tasks: BackgroundTasks
) -> BulkOperationResponse:
    """Add multiple companies to a collection"""
    
    # Create operation tracking
    operation_id = f"add_{collection_id}_{int(time.time())}"
    ongoing_operations[operation_id] = {
        'operation_id': operation_id,
        'status': 'pending',
        'total': len(request.company_ids),
        'processed': 0,
        'errors': [],
        'started_at': datetime.utcnow(),
        'completed_at': None
    }
    
    # Start background processing
    background_tasks.add_task(
        process_bulk_add,
        operation_id,
        collection_id,
        request.company_ids
    )
    
    return BulkOperationResponse(
        operation_id=operation_id,
        status='pending',
        message=f"Adding {len(request.company_ids)} companies to collection",
        total=len(request.company_ids),
        processed=0
    )

@router.post("/collections/{collection_id}/companies/bulk-remove")
async def bulk_remove_companies(
    collection_id: UUID,
    request: BulkRemoveRequest,
    background_tasks: BackgroundTasks
) -> BulkOperationResponse:
    """Remove multiple companies from a collection"""
    
    # Create operation tracking
    operation_id = f"remove_{collection_id}_{int(time.time())}"
    ongoing_operations[operation_id] = {
        'operation_id': operation_id,
        'status': 'pending',
        'total': len(request.company_ids),
        'processed': 0,
        'errors': [],
        'started_at': datetime.utcnow(),
        'completed_at': None
    }
    
    # Start background processing
    background_tasks.add_task(
        process_bulk_remove,
        operation_id,
        collection_id,
        request.company_ids
    )
    
    return BulkOperationResponse(
        operation_id=operation_id,
        status='pending',
        message=f"Removing {len(request.company_ids)} companies from collection",
        total=len(request.company_ids),
        processed=0
    )

@router.get("/collections/{collection_id}/companies/ids")
async def get_all_company_ids(collection_id: UUID) -> List[int]:
    """Get all company IDs in a collection (for select all functionality)"""
    async with AsyncSessionLocal() as session:
        # Verify collection exists
        collection_result = await session.execute(
            select(CompanyCollection).where(CompanyCollection.id == collection_id)
        )
        collection = collection_result.scalar_one_or_none()
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        # Get all company IDs
        result = await session.execute(
            select(CompanyCollectionAssociation.company_id)
            .where(CompanyCollectionAssociation.collection_id == collection_id)
            .order_by(CompanyCollectionAssociation.company_id)
        )
        
        return [row[0] for row in result]

@router.get("/operations/{operation_id}/status")
async def get_operation_status(operation_id: str) -> BulkOperationStatus:
    """Get the status of a bulk operation"""
    if operation_id not in ongoing_operations:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    operation = ongoing_operations[operation_id]
    return BulkOperationStatus(**operation)