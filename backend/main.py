# app/main.py

import random
import json
from datetime import datetime, timedelta, date
from typing import List, Dict, Any
import randomname
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware
import numpy as np

from backend.db import database
from backend.routes import collections, companies, bulk_operations, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.Base.metadata.create_all(bind=database.engine)

    db = database.SessionLocal()
    if not db.query(database.Settings).get("seeded"):
        seed_database(db)

        db.add(database.Settings(setting_name="seeded"))
        db.commit()
        db.close()
    yield
    # Clean up...


app = FastAPI(lifespan=lifespan)


# Company data generation helpers
def generate_industry() -> str:
    """Generate industry with realistic distribution."""
    industries = [
        ("SaaS", 30),
        ("FinTech", 20), 
        ("HealthTech", 15),
        ("E-commerce", 10),
        ("EdTech", 10),
        ("AI/ML", 8),
        ("Cybersecurity", 5),
        ("PropTech", 2)
    ]
    
    # Create weighted choice
    choices, weights = zip(*industries)
    return np.random.choice(choices, p=[w/100 for w in weights])


def generate_location() -> str:
    """Generate location with realistic geographic distribution."""
    locations = [
        ("San Francisco, CA", 25),
        ("Palo Alto, CA", 10),
        ("Mountain View, CA", 5),
        ("New York, NY", 20),
        ("Austin, TX", 10),
        ("Boston, MA", 10),
        ("Seattle, WA", 8),
        ("Los Angeles, CA", 5),
        ("Chicago, IL", 3),
        ("Miami, FL", 2),
        ("Denver, CO", 2)
    ]
    
    choices, weights = zip(*locations)
    return np.random.choice(choices, p=[w/100 for w in weights])


def generate_funding_stage(founded_year: int) -> str:
    """Generate funding stage based on company age and realistic distribution."""
    current_year = datetime.now().year
    company_age = current_year - founded_year
    
    # Adjust probabilities based on company age
    if company_age < 2:
        stages = [("Pre-seed", 40), ("Seed", 35), ("Series A", 20), ("Series B", 5)]
    elif company_age < 4:
        stages = [("Pre-seed", 10), ("Seed", 30), ("Series A", 35), ("Series B", 20), ("Series C", 5)]
    elif company_age < 7:
        stages = [("Seed", 5), ("Series A", 20), ("Series B", 30), ("Series C", 25), ("Series D+", 15), ("Public", 5)]
    else:
        stages = [("Series A", 10), ("Series B", 20), ("Series C", 25), ("Series D+", 25), ("Public", 15), ("Bootstrapped", 5)]
    
    choices, weights = zip(*stages)
    return np.random.choice(choices, p=[w/100 for w in weights])


def generate_company_name_with_industry(industry: str) -> str:
    """Generate realistic company name based on industry."""
    base_name = randomname.get_name().replace("-", " ").title()
    
    # Industry-specific suffixes and modifications
    industry_suffixes = {
        "SaaS": ["Solutions", "Software", "Platform", "Technologies", "Systems", "Labs"],
        "FinTech": ["Financial", "Capital", "Payments", "Finance", "Bank", "Pay"],
        "HealthTech": ["Health", "Medical", "Care", "Therapeutics", "Bio", "Pharma"],
        "E-commerce": ["Commerce", "Retail", "Shop", "Marketplace", "Store", "Direct"],
        "EdTech": ["Education", "Learning", "Academy", "School", "Knowledge", "Study"],
        "AI/ML": ["AI", "Intelligence", "Analytics", "Data", "Neural", "Cognitive"],
        "Cybersecurity": ["Security", "Shield", "Guard", "Protect", "Secure", "Cyber"],
        "PropTech": ["Properties", "Real Estate", "Homes", "Buildings", "Space", "Land"]
    }
    
    if industry in industry_suffixes and random.random() < 0.7:  # 70% chance to add suffix
        suffix = random.choice(industry_suffixes[industry])
        return f"{base_name} {suffix}"
    
    return base_name


def generate_description(company_name: str, industry: str) -> str:
    """Generate realistic company description."""
    templates = {
        "SaaS": [
            f"{company_name} provides cloud-based software solutions that help businesses streamline their operations and improve productivity.",
            f"A leading SaaS platform, {company_name} offers innovative tools for enterprise automation and workflow management.",
            f"{company_name} delivers scalable software solutions designed to transform how organizations manage their digital infrastructure."
        ],
        "FinTech": [
            f"{company_name} is revolutionizing financial services with cutting-edge payment processing and digital banking solutions.",
            f"A innovative fintech company, {company_name} provides secure, scalable financial technology for modern businesses.",
            f"{company_name} offers next-generation financial software that simplifies complex monetary transactions and compliance."
        ],
        "HealthTech": [
            f"{company_name} develops innovative healthcare technology solutions that improve patient outcomes and clinical efficiency.",
            f"A healthcare technology leader, {company_name} creates digital health platforms for providers and patients.",
            f"{company_name} is transforming healthcare delivery through advanced medical technology and data analytics."
        ],
        "E-commerce": [
            f"{company_name} provides comprehensive e-commerce solutions that help retailers succeed in the digital marketplace.",
            f"A leading e-commerce platform, {company_name} offers integrated solutions for online selling and customer engagement.",
            f"{company_name} empowers businesses with innovative e-commerce tools and marketplace technologies."
        ],
        "EdTech": [
            f"{company_name} creates innovative educational technology that enhances learning experiences for students and educators.",
            f"An education technology pioneer, {company_name} develops platforms that make learning more engaging and effective.",
            f"{company_name} transforms education through innovative digital learning solutions and educational software."
        ],
        "AI/ML": [
            f"{company_name} develops artificial intelligence solutions that help organizations make smarter, data-driven decisions.",
            f"A machine learning innovator, {company_name} provides AI-powered analytics and automation platforms.",
            f"{company_name} creates cutting-edge AI technologies that solve complex business challenges across industries."
        ],
        "Cybersecurity": [
            f"{company_name} provides advanced cybersecurity solutions that protect organizations from evolving digital threats.",
            f"A cybersecurity leader, {company_name} offers comprehensive security platforms for enterprise protection.",
            f"{company_name} develops innovative security technologies that safeguard critical business infrastructure."
        ],
        "PropTech": [
            f"{company_name} leverages technology to innovate real estate processes and improve property management.",
            f"A proptech innovator, {company_name} provides digital solutions that transform the real estate industry.",
            f"{company_name} creates technology platforms that modernize property transactions and management."
        ]
    }
    
    if industry in templates:
        return random.choice(templates[industry])
    else:
        return f"{company_name} is an innovative technology company focused on delivering exceptional solutions to its customers."


def generate_website(company_name: str) -> str:
    """Generate realistic website URL."""
    # Clean up company name for domain
    domain_name = company_name.lower().replace(" ", "").replace(".", "")
    
    # Remove common suffixes that would be redundant in domain
    suffixes_to_remove = ["solutions", "software", "platform", "technologies", "systems", "labs", 
                         "financial", "capital", "payments", "finance", "health", "medical", "care"]
    
    for suffix in suffixes_to_remove:
        if domain_name.endswith(suffix):
            domain_name = domain_name[:-len(suffix)]
            break
    
    # Ensure domain is reasonable length
    if len(domain_name) > 15:
        domain_name = domain_name[:12]
    
    return f"https://www.{domain_name}.com"


def generate_headcount_history(founded_year: int, current_headcount: int) -> List[Dict[str, Any]]:
    """Generate realistic headcount growth history."""
    current_year = datetime.now().year
    history = []
    
    # Start with small initial team
    initial_headcount = random.randint(2, 8)
    current_count = initial_headcount
    
    # Generate monthly data points
    for year in range(founded_year, current_year + 1):
        for month in range(1, 13):
            if year == current_year and month > datetime.now().month:
                break
                
            # Calculate growth rate based on funding stage and randomness
            base_growth = 0.03 if current_count < 50 else 0.02  # 3% monthly for small, 2% for larger
            growth_variance = random.uniform(-0.01, 0.02)  # Add variance
            growth_rate = max(0, base_growth + growth_variance)
            
            # Apply growth
            new_count = int(current_count * (1 + growth_rate))
            
            # Add some hiring surge events (funding rounds, etc.)
            if random.random() < 0.05:  # 5% chance of hiring surge
                surge_factor = random.uniform(1.2, 1.5)
                new_count = int(new_count * surge_factor)
            
            current_count = new_count
            
            history.append({
                "date": f"{year}-{month:02d}",
                "count": current_count
            })
    
    # Adjust the last entry to match target headcount
    if history and abs(current_count - current_headcount) / current_headcount > 0.2:
        # Scale all entries proportionally if we're way off
        scale_factor = current_headcount / current_count
        for entry in history:
            entry["count"] = max(1, int(entry["count"] * scale_factor))
    
    return history[-36:]  # Return last 3 years of data


def generate_funding_history(founded_year: int, funding_stage: str) -> List[Dict[str, Any]]:
    """Generate realistic funding history with proper chronological order."""
    if funding_stage == "Bootstrapped":
        return []
    
    # Define the stages that should be included based on current stage
    stage_map = {
        "Pre-seed": ["Pre-seed"],
        "Seed": ["Pre-seed", "Seed"],
        "Series A": ["Pre-seed", "Seed", "Series A"],
        "Series B": ["Pre-seed", "Seed", "Series A", "Series B"],
        "Series C": ["Pre-seed", "Seed", "Series A", "Series B", "Series C"],
        "Series D+": ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D"],
        "Public": ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D", "IPO"]
    }
    
    # Realistic funding amounts by stage
    funding_amounts = {
        "Pre-seed": (100000, 1000000),
        "Seed": (1000000, 5000000),
        "Series A": (5000000, 20000000),
        "Series B": (15000000, 50000000),
        "Series C": (30000000, 100000000),
        "Series D": (50000000, 200000000),
        "IPO": (100000000, 500000000)
    }
    
    # Typical time between rounds (in months)
    time_between_rounds = {
        "Pre-seed": 0,  # Starting point
        "Seed": (6, 18),  # 6-18 months after pre-seed
        "Series A": (12, 24),  # 12-24 months after seed
        "Series B": (12, 24),  # 12-24 months after A
        "Series C": (18, 30),  # 18-30 months after B
        "Series D": (18, 36),  # 18-36 months after C
        "IPO": (24, 48)  # 24-48 months after D
    }
    
    stages = stage_map.get(funding_stage, ["Seed"])
    history = []
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    # Start with the founding date
    current_date = datetime(founded_year, random.randint(1, 12), 1)
    
    for stage in stages:
        # Add time between rounds (except for first round)
        if stage != "Pre-seed" and stage in time_between_rounds:
            min_months, max_months = time_between_rounds[stage]
            months_to_add = random.randint(min_months, max_months)
            current_date = current_date + timedelta(days=months_to_add * 30)
        
        # Don't generate future funding rounds
        if current_date.year > current_year or (current_date.year == current_year and current_date.month > current_month):
            break
        
        # Generate funding amount for this round
        min_amount, max_amount = funding_amounts.get(stage, (1000000, 10000000))
        amount = random.randint(min_amount, max_amount)
        
        history.append({
            "date": f"{current_date.year}-{current_date.month:02d}",
            "round": stage,
            "amount": amount
        })
    
    # Sort by date to ensure chronological order
    history.sort(key=lambda x: x["date"])
    
    return history


def generate_revenue_history(founded_year: int, funding_stage: str, industry: str) -> List[Dict[str, Any]]:
    """Generate realistic revenue history."""
    current_year = datetime.now().year
    history = []
    
    # Base revenue multipliers by industry
    industry_multipliers = {
        "SaaS": 1.2,
        "FinTech": 1.5,
        "HealthTech": 1.1,
        "E-commerce": 1.0,
        "EdTech": 0.9,
        "AI/ML": 1.3,
        "Cybersecurity": 1.4,
        "PropTech": 1.1
    }
    
    # Stage-based revenue ranges
    stage_revenue_ranges = {
        "Pre-seed": (0, 500000),
        "Seed": (100000, 2000000),
        "Series A": (500000, 10000000),
        "Series B": (2000000, 50000000),
        "Series C": (10000000, 150000000),
        "Series D+": (50000000, 500000000),
        "Public": (100000000, 2000000000),
        "Bootstrapped": (50000, 5000000)
    }
    
    min_revenue, max_revenue = stage_revenue_ranges.get(funding_stage, (100000, 5000000))
    industry_mult = industry_multipliers.get(industry, 1.0)
    
    # Start with low revenue in early years
    base_revenue = random.randint(int(min_revenue * 0.1), int(min_revenue * 0.3))
    
    for year in range(max(founded_year, current_year - 5), current_year + 1):
        if year <= founded_year:
            revenue = random.randint(0, 50000)
        else:
            # Growth rate varies by stage and industry
            growth_rate = random.uniform(0.5, 2.5)  # 50% to 250% YoY growth
            if funding_stage in ["Series C", "Series D+", "Public"]:
                growth_rate = random.uniform(0.2, 0.8)  # Slower growth for mature companies
            
            revenue = int(base_revenue * growth_rate * industry_mult)
            base_revenue = revenue
        
        # Cap at stage maximum
        revenue = min(revenue, int(max_revenue * industry_mult))
        
        history.append({
            "year": year,
            "revenue": revenue
        })
    
    return history


def generate_valuation_history(funding_history: List[Dict[str, Any]], revenue_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate valuation history based on funding rounds with funding events marked."""
    if not funding_history:
        return []
    
    history = []
    
    # Revenue multiple ranges by stage
    revenue_multiples = {
        "Pre-seed": (10, 50),
        "Seed": (5, 25),
        "Series A": (5, 20),
        "Series B": (4, 15),
        "Series C": (3, 12),
        "Series D": (2, 10),
        "IPO": (5, 25)  # Public companies often get premium
    }
    
    # First, add all funding rounds as valuation events
    for funding_round in funding_history:
        stage = funding_round["round"]
        amount = funding_round["amount"]
        
        # Get corresponding revenue for valuation calculation
        funding_year = int(funding_round["date"].split("-")[0])
        current_revenue = 1000000  # Default fallback
        
        for rev in revenue_history:
            if rev["year"] <= funding_year:
                current_revenue = rev["revenue"]
        
        # Calculate valuation using revenue multiple or funding amount method
        if stage in revenue_multiples and current_revenue > 0:
            min_mult, max_mult = revenue_multiples[stage]
            revenue_multiple = random.uniform(min_mult, max_mult)
            revenue_based_valuation = current_revenue * revenue_multiple
            
            # Valuation should be reasonable multiple of funding amount
            funding_based_valuation = amount * random.uniform(8, 20)
            
            # Use the higher of the two (more realistic for hot startups)
            valuation = max(revenue_based_valuation, funding_based_valuation)
        else:
            # Fallback to funding-based calculation
            valuation = amount * random.uniform(10, 25)
        
        history.append({
            "date": funding_round["date"] + "-01",  # Add day for proper date parsing
            "valuation": int(valuation),
            "isFundingEvent": True,  # Mark as funding event
            "eventNote": f"{stage}: ${amount:,.0f}"  # Add event description
        })
    
    # Add intermediate valuations between funding rounds for smoother chart
    if len(history) > 1:
        additional_points = []
        for i in range(len(history) - 1):
            current_event = history[i]
            next_event = history[i + 1]
            
            # Parse dates
            current_date = datetime.strptime(current_event["date"], "%Y-%m-%d")
            next_date = datetime.strptime(next_event["date"], "%Y-%m-%d")
            
            # Calculate time difference in months
            months_diff = (next_date.year - current_date.year) * 12 + (next_date.month - current_date.month)
            
            # Add quarterly valuation updates between funding rounds
            if months_diff > 6:
                quarters_to_add = min(3, months_diff // 3)
                for q in range(1, quarters_to_add + 1):
                    intermediate_date = current_date + timedelta(days=q * 90)
                    if intermediate_date < next_date:
                        # Linear interpolation of valuation with some randomness
                        progress = q / (quarters_to_add + 1)
                        base_valuation = current_event["valuation"] + (next_event["valuation"] - current_event["valuation"]) * progress
                        # Add 5-10% variance
                        valuation_variance = random.uniform(0.95, 1.10)
                        
                        additional_points.append({
                            "date": intermediate_date.strftime("%Y-%m-%d"),
                            "valuation": int(base_valuation * valuation_variance),
                            "isFundingEvent": False
                        })
        
        history.extend(additional_points)
    
    # Sort by date to ensure chronological order
    history.sort(key=lambda x: x["date"])
    
    return history


def generate_growth_metrics(current_revenue: float, funding_stage: str, industry: str) -> Dict[str, Any]:
    """Generate current growth metrics."""
    metrics = {}
    
    # MRR calculation (primarily for SaaS)
    if industry in ["SaaS", "FinTech", "EdTech"]:
        # Assume 70-90% of revenue is recurring
        recurring_percentage = random.uniform(0.7, 0.9)
        metrics["mrr"] = int(current_revenue * recurring_percentage / 12)
    
    # Customer count estimation
    # Revenue per customer varies by industry and stage
    revenue_per_customer = {
        "SaaS": random.randint(5000, 50000),
        "FinTech": random.randint(10000, 100000),
        "HealthTech": random.randint(15000, 200000),
        "E-commerce": random.randint(50, 500),
        "EdTech": random.randint(1000, 25000),
        "AI/ML": random.randint(25000, 250000),
        "Cybersecurity": random.randint(20000, 150000),
        "PropTech": random.randint(5000, 75000)
    }.get(industry, 10000)
    
    if current_revenue > 0:
        metrics["customers"] = max(1, int(current_revenue / revenue_per_customer))
    else:
        metrics["customers"] = random.randint(1, 50)
    
    # Growth rate (monthly)
    stage_growth_rates = {
        "Pre-seed": (0.05, 0.25),   # 5-25% monthly
        "Seed": (0.03, 0.20),       # 3-20% monthly
        "Series A": (0.02, 0.15),   # 2-15% monthly
        "Series B": (0.01, 0.10),   # 1-10% monthly
        "Series C": (0.005, 0.05),  # 0.5-5% monthly
        "Series D+": (0.002, 0.03), # 0.2-3% monthly
        "Public": (0.001, 0.02),    # 0.1-2% monthly
        "Bootstrapped": (0.01, 0.08) # 1-8% monthly
    }
    
    min_growth, max_growth = stage_growth_rates.get(funding_stage, (0.01, 0.08))
    metrics["growth_rate"] = round(random.uniform(min_growth, max_growth), 3)
    
    return metrics


def seed_database(db: Session):
    print("Starting sophisticated company data seeding...")
    
    # Clear existing data
    db.execute(text("TRUNCATE TABLE company_collections CASCADE;"))
    db.execute(text("TRUNCATE TABLE companies CASCADE;"))
    db.execute(text("TRUNCATE TABLE company_collection_associations CASCADE;"))
    db.execute(
        text("""
    DROP TRIGGER IF EXISTS throttle_updates_trigger ON company_collection_associations;
    """)
    )
    db.commit()
    
    # Set random seed for reproducible results during development
    random.seed(42)
    np.random.seed(42)
    
    print("Generating 10,000 companies with rich data...")
    
    companies = []
    for i in range(10000):
        if i % 1000 == 0:
            print(f"Generated {i}/10000 companies...")
        
        # Generate correlated company data
        industry = generate_industry()
        founded_year = random.randint(2010, 2024)
        funding_stage = generate_funding_stage(founded_year)
        location = generate_location()
        
        # Generate company name based on industry
        company_name = generate_company_name_with_industry(industry)
        
        # Generate headcount based on funding stage and age
        current_year = datetime.now().year
        company_age = current_year - founded_year
        
        # Headcount ranges by funding stage
        headcount_ranges = {
            "Pre-seed": (2, 15),
            "Seed": (5, 35),
            "Series A": (15, 75),
            "Series B": (40, 200),
            "Series C": (100, 500),
            "Series D+": (200, 1500),
            "Public": (500, 10000),
            "Bootstrapped": (1, 50)
        }
        
        min_hc, max_hc = headcount_ranges.get(funding_stage, (5, 50))
        current_headcount = random.randint(min_hc, max_hc)
        
        # Generate time-series data
        funding_history = generate_funding_history(founded_year, funding_stage)
        revenue_history = generate_revenue_history(founded_year, funding_stage, industry)
        headcount_history = generate_headcount_history(founded_year, current_headcount)
        valuation_history = generate_valuation_history(funding_history, revenue_history)
        
        # Current metrics
        current_revenue = revenue_history[-1]["revenue"] if revenue_history else 0
        current_valuation = valuation_history[-1]["valuation"] if valuation_history else None
        growth_metrics = generate_growth_metrics(current_revenue, funding_stage, industry)
        
        # Parse location into components
        location_parts = location.split(", ")
        headquarters_city = location_parts[0] if len(location_parts) > 0 else "Unknown"
        headquarters_state = location_parts[1] if len(location_parts) > 1 else ""
        headquarters_country = "USA"  # All generated locations are US cities
        
        # Get latest funding info
        last_funding = funding_history[-1] if funding_history else None
        
        company = database.Company(
            company_name=company_name,
            industry=industry,
            headquarters_city=headquarters_city,
            headquarters_state=headquarters_state,
            headquarters_country=headquarters_country,
            description=generate_description(company_name, industry),
            website=generate_website(company_name),
            founded_year=founded_year,
            founded_month=random.randint(1, 12),
            company_stage=funding_stage,
            employee_count=current_headcount,
            estimated_revenue=current_revenue,
            valuation=current_valuation,
            total_funding=sum(f["amount"] for f in funding_history) if funding_history else 0,
            last_funding_round=last_funding["round"] if last_funding else None,
            last_funding_amount=last_funding["amount"] if last_funding else None,
            last_funding_date=datetime.strptime(last_funding["date"] + "-01", "%Y-%m-%d").date() if last_funding else None,
            revenue_growth_rate=random.uniform(10, 200) if funding_stage in ["Growth", "Mature"] else random.uniform(50, 500),
            employee_growth_rate=random.uniform(20, 150) if funding_stage in ["Seed", "Series A"] else random.uniform(5, 50),
            founder_names=f"John Doe, Jane Smith" if random.random() > 0.5 else "Alice Johnson",
            sub_industry=f"{industry} Platform" if random.random() > 0.5 else f"{industry} Solutions",
            business_model=random.choice(["B2B", "B2C", "B2B2C", "Marketplace"]),
            target_market=random.choice(["Enterprise", "SMB", "Consumer", "Mid-Market"]),
            technologies=",".join(random.sample(["React", "Python", "Node.js", "AWS", "Docker", "Kubernetes", "PostgreSQL", "Redis", "GraphQL", "TypeScript"], k=random.randint(3, 6))),
            linkedin_url=f"https://linkedin.com/company/{company_name.lower().replace(' ', '-')}",
            twitter_handle=f"@{company_name.lower().replace(' ', '')}",
            crunchbase_url=f"https://crunchbase.com/organization/{company_name.lower().replace(' ', '-')}",
            headcount_history=json.dumps(headcount_history),
            funding_history=json.dumps(funding_history),
            revenue_history=json.dumps(revenue_history),
            valuation_history=json.dumps(valuation_history),
            growth_metrics=json.dumps(growth_metrics)
        )
        
        companies.append(company)
    
    print("Saving companies to database...")
    db.bulk_save_objects(companies)
    db.commit()
    
    print("Creating collections...")
    # Create the default collections
    my_list = database.CompanyCollection(collection_name="My List")
    db.add(my_list)
    db.commit()

    # Add all companies to "My List" initially
    print("Adding companies to My List collection...")
    all_companies = db.query(database.Company).all()
    associations = [
        database.CompanyCollectionAssociation(
            company_id=company.id, collection_id=my_list.id
        )
        for company in all_companies
    ]
    db.bulk_save_objects(associations)
    db.commit()

    # Create "Liked Companies List" with a strategic selection
    liked_companies = database.CompanyCollection(collection_name="Liked Companies List")
    db.add(liked_companies)
    db.commit()

    # Add some high-potential companies (Series A+ SaaS/FinTech companies)
    liked_company_candidates = [
        company for company in all_companies 
        if company.industry in ["SaaS", "FinTech", "AI/ML"] 
        and company.company_stage in ["Series A", "Series B", "Series C"]
    ][:50]  # Take first 50 that match criteria
    
    associations = [
        database.CompanyCollectionAssociation(
            company_id=company.id, collection_id=liked_companies.id
        )
        for company in liked_company_candidates
    ]
    db.bulk_save_objects(associations)
    db.commit()

    # Create "Companies to Ignore List" 
    companies_to_ignore = database.CompanyCollection(
        collection_name="Companies to Ignore List"
    )
    db.add(companies_to_ignore)
    db.commit()

    # Add some struggling companies (Pre-seed older companies or low revenue companies)
    ignored_company_candidates = [
        company for company in all_companies
        if (company.company_stage == "Pre-seed" and datetime.now().year - company.founded_year > 3) 
        or (company.estimated_revenue and company.estimated_revenue < 100000)
    ][:25]  # Take first 25 that match criteria
    
    associations = [
        database.CompanyCollectionAssociation(
            company_id=company.id, collection_id=companies_to_ignore.id
        )
        for company in ignored_company_candidates
    ]
    db.bulk_save_objects(associations)
    db.commit()

    # Restore the throttling trigger for realistic bulk operation simulation
    db.execute(
        text("""
CREATE OR REPLACE FUNCTION throttle_updates()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_sleep(0.1); -- Sleep for 100 milliseconds to simulate a slow update
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
    """)
    )

    db.execute(
        text("""
CREATE TRIGGER throttle_updates_trigger
BEFORE INSERT ON company_collection_associations
FOR EACH ROW
EXECUTE FUNCTION throttle_updates();
    """)
    )
    db.commit()
    
    print("Company seeding completed! Generated 10,000 companies with rich, realistic data.")
    print("Collections created:")
    print(f"- My List: {len(all_companies)} companies") 
    print(f"- Liked Companies List: {len(liked_company_candidates)} companies")
    print(f"- Companies to Ignore List: {len(ignored_company_candidates)} companies")


app.include_router(companies.router)
app.include_router(collections.router)
app.include_router(bulk_operations.router)
app.include_router(websocket.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "ws://localhost:5173",
        "http://localhost:5174",
        "ws://localhost:5174",
        "http://localhost:5175",
        "ws://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
