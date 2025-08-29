from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import asyncio
import time
from datetime import datetime
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError

from backend.db.database import (
    SessionLocal,
    CompanyCollectionAssociation,
    CompanyCollection,
    Company,
    get_db
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
    
    # Small delay to allow WebSocket connection to establish
    await asyncio.sleep(0.2)
    
    operation['status'] = 'in_progress'
    
    # Calculate dynamic delay per item to ensure max 60 seconds overhead
    # Examples:
    # - 25 items: 60/25 = 2.4s total, 2.4s/25 = 96ms per item (capped at 50ms) = 50ms × 25 = 1.25s total
    # - 100 items: 60/100 = 600ms per item (capped at 50ms) = 50ms × 100 = 5s total
    # - 1,000 items: 60/1000 = 60ms per item (capped at 50ms) = 50ms × 1000 = 50s total
    # - 10,000 items: 60/10000 = 6ms per item = 6ms × 10000 = 60s total
    # - 100,000 items: 60/100000 = 0.6ms per item (min 2ms) = 2ms × 100000 = 200s (breaks 60s rule but ensures smoothness)
    total_items = len(company_ids)
    max_additional_time = 60.0  # Maximum 60 seconds of additional delay
    delay_per_item = min(max_additional_time / total_items, 0.05)  # Cap at 50ms
    delay_per_item = max(delay_per_item, 0.002)  # Minimum 2ms for smooth rendering
    
    # Send initial progress update after WebSocket has connected
    await broadcast_progress(operation_id, {
        'operation_id': operation_id,
        'status': 'in_progress',
        'total': operation['total'],
        'processed': 0,
        'percentage': 0
    })
    
    try:
        with SessionLocal() as session:
            # Verify collection exists
            collection = session.query(CompanyCollection).filter(CompanyCollection.id == collection_id).first()
            if not collection:
                operation['status'] = 'failed'
                operation['errors'].append(f"Collection {collection_id} not found")
                return
            
            # Process in batches
            for i in range(0, len(company_ids), batch_size):
                batch = company_ids[i:i+batch_size]
                
                # Verify companies exist
                valid_company_ids = session.query(Company.id).filter(Company.id.in_(batch)).all()
                valid_company_ids = [row[0] for row in valid_company_ids]
                
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
                        session.commit()
                        operation['processed'] += 1
                    except IntegrityError:
                        # Duplicate - skip
                        session.rollback()
                        operation['processed'] += 1
                        continue
                    except Exception as e:
                        session.rollback()
                        operation['errors'].append(f"Error adding company {company_id}: {str(e)}")
                    
                    # Broadcast progress update after each company
                    await broadcast_progress(operation_id, {
                        'operation_id': operation_id,
                        'status': operation['status'],
                        'total': operation['total'],
                        'processed': operation['processed'],
                        'percentage': (operation['processed'] / operation['total']) * 100 if operation['total'] > 0 else 0
                    })
                    
                    # Dynamic delay based on total items for smooth UI updates
                    await asyncio.sleep(delay_per_item)
            
            operation['status'] = 'completed'
            operation['completed_at'] = datetime.utcnow()
            
            # Send final progress update
            await broadcast_progress(operation_id, {
                'operation_id': operation_id,
                'status': 'completed',
                'total': operation['total'],
                'processed': operation['processed'],
                'percentage': 100
            })
            
    except Exception as e:
        operation['status'] = 'failed'
        operation['errors'].append(str(e))
        operation['completed_at'] = datetime.utcnow()

async def process_bulk_remove(operation_id: str, collection_id: UUID, company_ids: List[int], batch_size: int = 100):
    """Process bulk remove operation in batches"""
    operation = ongoing_operations[operation_id]
    
    # Small delay to allow WebSocket connection to establish
    await asyncio.sleep(0.2)
    
    operation['status'] = 'in_progress'
    
    # Calculate dynamic delay per item to ensure max 60 seconds overhead
    # Examples:
    # - 25 items: 60/25 = 2.4s total, 2.4s/25 = 96ms per item (capped at 50ms) = 50ms × 25 = 1.25s total
    # - 100 items: 60/100 = 600ms per item (capped at 50ms) = 50ms × 100 = 5s total
    # - 1,000 items: 60/1000 = 60ms per item (capped at 50ms) = 50ms × 1000 = 50s total
    # - 10,000 items: 60/10000 = 6ms per item = 6ms × 10000 = 60s total
    # - 100,000 items: 60/100000 = 0.6ms per item (min 2ms) = 2ms × 100000 = 200s (breaks 60s rule but ensures smoothness)
    total_items = len(company_ids)
    max_additional_time = 60.0  # Maximum 60 seconds of additional delay
    delay_per_item = min(max_additional_time / total_items, 0.05)  # Cap at 50ms
    delay_per_item = max(delay_per_item, 0.002)  # Minimum 2ms for smooth rendering
    
    # Send initial progress update after WebSocket has connected
    await broadcast_progress(operation_id, {
        'operation_id': operation_id,
        'status': 'in_progress',
        'total': operation['total'],
        'processed': 0,
        'percentage': 0
    })
    
    try:
        with SessionLocal() as session:
            # Process individually for smooth progress updates
            for company_id in company_ids:
                # Delete association
                deleted = session.query(CompanyCollectionAssociation).filter(
                    and_(
                        CompanyCollectionAssociation.collection_id == collection_id,
                        CompanyCollectionAssociation.company_id == company_id
                    )
                ).delete(synchronize_session=False)
                
                if deleted > 0:
                    session.commit()
                    operation['processed'] += 1
                    
                    # Broadcast progress update after each company
                    await broadcast_progress(operation_id, {
                        'operation_id': operation_id,
                        'status': operation['status'],
                        'total': operation['total'],
                        'processed': operation['processed'],
                        'percentage': (operation['processed'] / operation['total']) * 100 if operation['total'] > 0 else 0
                    })
                    
                    # Dynamic delay based on total items for smooth UI updates
                    await asyncio.sleep(delay_per_item)
            
            operation['status'] = 'completed'
            operation['completed_at'] = datetime.utcnow()
            
            # Send final progress update
            await broadcast_progress(operation_id, {
                'operation_id': operation_id,
                'status': 'completed',
                'total': operation['total'],
                'processed': operation['processed'],
                'percentage': 100
            })
            
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
def get_all_company_ids(collection_id: UUID) -> List[int]:
    """Get all company IDs in a collection (for select all functionality)"""
    with SessionLocal() as session:
        # Verify collection exists
        collection = session.query(CompanyCollection).filter(CompanyCollection.id == collection_id).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        # Get all company IDs
        result = session.query(CompanyCollectionAssociation.company_id)\
            .filter(CompanyCollectionAssociation.collection_id == collection_id)\
            .order_by(CompanyCollectionAssociation.company_id)\
            .all()
        
        return [row[0] for row in result]

@router.get("/operations/{operation_id}/status")
async def get_operation_status(operation_id: str) -> BulkOperationStatus:
    """Get the status of a bulk operation"""
    if operation_id not in ongoing_operations:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    operation = ongoing_operations[operation_id]
    return BulkOperationStatus(**operation)