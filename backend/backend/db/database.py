# app/database.py
import os
import uuid
from datetime import datetime
from typing import Union

from sqlalchemy import (
    Column,
    DateTime,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
    BigInteger,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async engine and session for bulk operations
ASYNC_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://') if SQLALCHEMY_DATABASE_URL else None
async_engine = create_async_engine(ASYNC_DATABASE_URL) if ASYNC_DATABASE_URL else None
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False) if async_engine else None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# SQLAlchemy models
Base = declarative_base()

class Settings(Base):
    __tablename__ = "harmonic_settings"

    setting_name = Column(String, primary_key=True)

class Company(Base):
    __tablename__ = "companies"

    created_at: Union[datetime, Column[datetime]] = Column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)
    
    # Basic Information
    industry = Column(String, index=True, nullable=True)  # e.g., "SaaS", "FinTech", "Healthcare"
    sub_industry = Column(String, nullable=True)  # More specific industry classification
    founded_year = Column(Integer, nullable=True)
    founded_month = Column(Integer, nullable=True)
    headquarters_city = Column(String, nullable=True)
    headquarters_state = Column(String, nullable=True)
    headquarters_country = Column(String, nullable=True)
    website = Column(String, nullable=True)
    description = Column(Text, nullable=True)  # Using Text type for longer descriptions
    
    # Financial Data (amounts in cents to avoid float precision issues)
    total_funding = Column(BigInteger, nullable=True)  # Total funding in cents
    last_funding_round = Column(String, nullable=True)  # Seed, Series A-E, IPO
    last_funding_date = Column(Date, nullable=True)
    last_funding_amount = Column(BigInteger, nullable=True)  # Last funding amount in cents
    valuation = Column(BigInteger, nullable=True)  # Company valuation in cents
    estimated_revenue = Column(BigInteger, nullable=True)  # Annual revenue in cents
    revenue_growth_rate = Column(Float, nullable=True)  # Percentage YoY
    
    # Team/Size
    employee_count = Column(Integer, nullable=True)  # Current employee count
    employee_growth_rate = Column(Float, nullable=True)  # Employee growth percentage YoY
    founder_names = Column(String, nullable=True)  # Comma-separated founder names
    
    # Business Metrics
    company_stage = Column(String, nullable=True)  # Pre-seed, Seed, Growth, Mature, Public
    business_model = Column(String, nullable=True)  # B2B, B2C, B2B2C, Marketplace
    target_market = Column(String, nullable=True)
    technologies = Column(Text, nullable=True)  # Comma-separated tech stack
    
    # Social/External
    linkedin_url = Column(String, nullable=True)
    twitter_handle = Column(String, nullable=True)  # Twitter handle without URL
    crunchbase_url = Column(String, nullable=True)
    
    # Time-Series Data (as JSON/JSONB columns for PostgreSQL)
    headcount_history = Column(JSON, nullable=True)  # [{"date": "2023-01-01", "count": 100}, ...]
    funding_history = Column(JSON, nullable=True)    # [{"date": "2023-01-01", "amount": 1000000, "round": "Series A"}, ...]
    revenue_history = Column(JSON, nullable=True)    # [{"date": "2023-01-01", "revenue": 500000}, ...]
    valuation_history = Column(JSON, nullable=True)  # [{"date": "2023-01-01", "valuation": 10000000}, ...]
    growth_metrics = Column(JSON, nullable=True)     # [{"date": "2023-01-01", "metric": "users", "value": 10000}, ...]

class CompanyCollection(Base):
    __tablename__ = "company_collections"

    created_at: Union[datetime, Column[datetime]] = Column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    id: Column[uuid.UUID] = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_name = Column(String, index=True)

class CompanyCollectionAssociation(Base):
    __tablename__ = "company_collection_associations"

    __table_args__ = (
        UniqueConstraint('company_id', 'collection_id', name='uq_company_collection'),
    )
    
    created_at: Union[datetime, Column[datetime]] = Column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    collection_id = Column(UUID(as_uuid=True), ForeignKey("company_collections.id"))

