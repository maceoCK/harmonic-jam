import os
import logging
from typing import List, Dict, Any, Optional
from elasticsearch import Elasticsearch, helpers
from elasticsearch.exceptions import NotFoundError
from sqlalchemy.orm import Session
from backend.db import database

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        es_url = os.getenv('ELASTICSEARCH_URL', 'http://localhost:9200')
        self.es = Elasticsearch(es_url)
        self.index_name = 'companies'
        
    def create_index(self):
        """Create the companies index with proper mappings"""
        if self.es.indices.exists(index=self.index_name):
            logger.info(f"Index {self.index_name} already exists")
            return
            
        mappings = {
            "mappings": {
                "properties": {
                    "id": {"type": "integer"},
                    "company_name": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"},
                            "suggest": {"type": "completion"}
                        }
                    },
                    "description": {"type": "text"},
                    "industry": {
                        "type": "text",
                        "fields": {"keyword": {"type": "keyword"}}
                    },
                    "sub_industry": {"type": "keyword"},
                    "founded_year": {"type": "integer"},
                    "headquarters_city": {"type": "text"},
                    "headquarters_state": {"type": "text"},
                    "headquarters_country": {"type": "text"},
                    "location": {"type": "text"},  # Combined location field
                    "employee_count": {"type": "integer"},
                    "total_funding": {"type": "long"},
                    "last_funding_round": {"type": "keyword"},
                    "valuation": {"type": "long"},
                    "revenue": {"type": "long"},
                    "company_stage": {"type": "keyword"},
                    "technologies": {"type": "text"},
                    "website": {"type": "keyword"},
                    # Status fields
                    "liked": {"type": "boolean"},
                    "ignored": {"type": "boolean"},
                    # Nested suggest field for autocomplete
                    "suggest": {
                        "type": "completion",
                        "contexts": [
                            {
                                "name": "industry",
                                "type": "category"
                            }
                        ]
                    }
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "company_analyzer": {
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop", "snowball"]
                        }
                    }
                }
            }
        }
        
        self.es.indices.create(index=self.index_name, body=mappings)
        logger.info(f"Created index {self.index_name}")
        
    def index_companies(self, db: Session):
        """Bulk index all companies from database"""
        companies = db.query(database.Company).all()
        
        # Check liked/ignored status for each company
        liked_companies = set(
            db.query(database.CompanyCollectionAssociation.company_id)
            .join(database.CompanyCollection)
            .filter(database.CompanyCollection.collection_name == "Liked Companies List")
            .all()
        )
        liked_ids = {c[0] for c in liked_companies}
        
        ignored_companies = set(
            db.query(database.CompanyCollectionAssociation.company_id)
            .join(database.CompanyCollection)
            .filter(database.CompanyCollection.collection_name == "Companies to Ignore List")
            .all()
        )
        ignored_ids = {c[0] for c in ignored_companies}
        
        actions = []
        for company in companies:
            # Combine location fields
            location_parts = []
            if company.headquarters_city:
                location_parts.append(company.headquarters_city)
            if company.headquarters_state:
                location_parts.append(company.headquarters_state)
            if company.headquarters_country:
                location_parts.append(company.headquarters_country)
            location = ", ".join(location_parts) if location_parts else None
            
            doc = {
                "_index": self.index_name,
                "_id": company.id,
                "_source": {
                    "id": company.id,
                    "company_name": company.company_name,
                    "description": company.description,
                    "industry": company.industry,
                    "sub_industry": company.sub_industry,
                    "founded_year": company.founded_year,
                    "headquarters_city": company.headquarters_city,
                    "headquarters_state": company.headquarters_state,
                    "headquarters_country": company.headquarters_country,
                    "location": location,
                    "employee_count": company.employee_count,
                    "total_funding": company.total_funding,
                    "last_funding_round": company.last_funding_round,
                    "valuation": company.valuation,
                    "revenue": company.estimated_revenue,
                    "company_stage": company.company_stage,
                    "technologies": company.technologies,
                    "website": company.website,
                    "liked": company.id in liked_ids,
                    "ignored": company.id in ignored_ids,
                    # Add suggest field for autocomplete
                    "suggest": {
                        "input": [company.company_name],
                        "contexts": {
                            "industry": [company.industry] if company.industry else []
                        }
                    }
                }
            }
            actions.append(doc)
            
        # Bulk index
        helpers.bulk(self.es, actions)
        logger.info(f"Indexed {len(actions)} companies")
        
    def search(self, query: str, offset: int = 0, limit: int = 25, 
               collection_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Search companies with natural language processing
        """
        # Parse the query to extract filters
        parsed = self._parse_natural_language_query(query)
        
        # Build Elasticsearch query
        es_query = self._build_es_query(parsed['search_text'], parsed['filters'])
        
        # Add collection filter if specified
        if collection_id:
            # This would need to be implemented with a join or pre-filtering
            pass
            
        # Execute search
        response = self.es.search(
            index=self.index_name,
            body={
                "query": es_query,
                "from": offset,
                "size": limit,
                "highlight": {
                    "fields": {
                        "company_name": {},
                        "description": {},
                        "industry": {}
                    }
                },
                "aggs": {
                    "industries": {
                        "terms": {"field": "industry.keyword", "size": 10}
                    },
                    "stages": {
                        "terms": {"field": "company_stage", "size": 10}
                    }
                }
            }
        )
        
        # Format results
        companies = []
        for hit in response['hits']['hits']:
            company = hit['_source']
            if 'highlight' in hit:
                company['_highlight'] = hit['highlight']
            companies.append(company)
            
        return {
            "companies": companies,
            "total": response['hits']['total']['value'],
            "aggregations": response.get('aggregations', {})
        }
        
    def suggest(self, query: str, size: int = 5) -> List[str]:
        """Get autocomplete suggestions"""
        response = self.es.search(
            index=self.index_name,
            body={
                "suggest": {
                    "company-suggest": {
                        "prefix": query,
                        "completion": {
                            "field": "company_name.suggest",
                            "size": size
                        }
                    }
                }
            }
        )
        
        suggestions = []
        for option in response['suggest']['company-suggest'][0]['options']:
            suggestions.append(option['text'])
            
        return suggestions
        
    def _parse_natural_language_query(self, query: str) -> Dict[str, Any]:
        """
        Parse natural language query to extract search text and filters
        Examples:
        - "fintech companies in NYC" -> {search: "fintech", location: "NYC"}
        - "series B with >100 employees" -> {stage: "series B", employees_min: 100}
        """
        import re
        
        filters = {}
        search_text = query.lower()
        
        # Extract location
        location_match = re.search(r'\bin\s+([A-Za-z\s]+?)(?:\s+with|\s+and|\s*$)', query, re.I)
        if location_match:
            filters['location'] = location_match.group(1).strip()
            search_text = search_text.replace(location_match.group(0), '')
            
        # Extract employee count - check for exact match first
        employee_patterns = [
            (r'(\d+)-(\d+)\s*employees?', 'employees_range'),  # Range first
            (r'>(\d+)\s*employees?', 'employees_min'),
            (r'<(\d+)\s*employees?', 'employees_max'),
            (r'(\d+)\+\s*employees?', 'employees_min'),  # Explicit plus sign
            (r'(\d+)\s*employees?', 'employees_exact')  # Exact match last
        ]
        
        for pattern, filter_type in employee_patterns:
            match = re.search(pattern, query, re.I)
            if match:
                if filter_type == 'employees_range':
                    filters['employees_min'] = int(match.group(1))
                    filters['employees_max'] = int(match.group(2))
                elif filter_type == 'employees_exact':
                    # For exact match, set both min and max to same value
                    count = int(match.group(1))
                    filters['employees_min'] = count
                    filters['employees_max'] = count
                elif filter_type == 'employees_min':
                    filters['employees_min'] = int(match.group(1))
                elif filter_type == 'employees_max':
                    filters['employees_max'] = int(match.group(1))
                search_text = re.sub(pattern, '', search_text, flags=re.I)
                break  # Only match the first pattern
                
        # Extract funding stage
        stage_patterns = ['seed', 'series a', 'series b', 'series c', 'series d', 'ipo', 'public']
        for stage in stage_patterns:
            if stage in query.lower():
                filters['stage'] = stage.title()
                search_text = search_text.replace(stage, '')
                
        # Extract funding amount
        funding_match = re.search(r'(>|<)?(\d+)(m|million|b|billion)\s*(?:funding|funded)?', query, re.I)
        if funding_match:
            operator = funding_match.group(1)
            amount = int(funding_match.group(2))
            unit = funding_match.group(3).lower()
            
            multiplier = 1000000 if unit.startswith('m') else 1000000000
            amount_cents = amount * multiplier * 100
            
            if operator == '>':
                filters['funding_min'] = amount_cents
            elif operator == '<':
                filters['funding_max'] = amount_cents
            else:
                filters['funding_min'] = amount_cents // 2
                filters['funding_max'] = amount_cents * 2
                
        # Extract year founded - check for different patterns
        year_patterns = [
            (r'founded (?:between|from) (\d{4})(?: (?:and|to|-) )?(\d{4})', 'year_range'),
            (r'founded (?:after|since) (\d{4})', 'year_after'),
            (r'founded (?:before) (\d{4})', 'year_before'),  
            (r'founded (?:in )(\d{4})', 'year_exact'),
            (r'(\d{4})-(\d{4})', 'year_range'),  # Simple range
            (r'(\d{4})', 'year_exact')  # Just a year
        ]
        
        for pattern, filter_type in year_patterns:
            match = re.search(pattern, query, re.I)
            if match:
                if filter_type == 'year_range':
                    filters['founded_year_min'] = int(match.group(1))
                    filters['founded_year_max'] = int(match.group(2))
                elif filter_type == 'year_after':
                    filters['founded_year_min'] = int(match.group(1))
                elif filter_type == 'year_before':
                    filters['founded_year_max'] = int(match.group(1))
                elif filter_type == 'year_exact':
                    year = int(match.group(1))
                    # Only treat as founding year if it's a reasonable year
                    if 1800 <= year <= 2030:
                        filters['founded_year_min'] = year
                        filters['founded_year_max'] = year
                    else:
                        continue  # Skip unreasonable years
                search_text = re.sub(pattern, '', search_text, flags=re.I)
                break  # Only match the first pattern
            
        # Clean up search text
        search_text = re.sub(r'\s+', ' ', search_text).strip()
        search_text = re.sub(r'\b(with|and|the|in|at)\b', '', search_text).strip()
        
        return {
            'search_text': search_text,
            'filters': filters
        }
        
    def _build_es_query(self, search_text: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Build Elasticsearch query from parsed components"""
        must_clauses = []
        filter_clauses = []
        
        # Add text search if present
        if search_text:
            must_clauses.append({
                "multi_match": {
                    "query": search_text,
                    "fields": [
                        "company_name^3",
                        "description",
                        "industry^2",
                        "technologies"
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })
            
        # Add filters
        if 'location' in filters:
            filter_clauses.append({
                "match": {"location": filters['location']}
            })
            
        if 'employees_min' in filters:
            filter_clauses.append({
                "range": {"employee_count": {"gte": filters['employees_min']}}
            })
            
        if 'employees_max' in filters:
            filter_clauses.append({
                "range": {"employee_count": {"lte": filters['employees_max']}}
            })
            
        if 'stage' in filters:
            filter_clauses.append({
                "term": {"company_stage": filters['stage']}
            })
            
        if 'funding_min' in filters:
            filter_clauses.append({
                "range": {"total_funding": {"gte": filters['funding_min']}}
            })
            
        if 'funding_max' in filters:
            filter_clauses.append({
                "range": {"total_funding": {"lte": filters['funding_max']}}
            })
            
        if 'founded_year_min' in filters:
            filter_clauses.append({
                "range": {"founded_year": {"gte": filters['founded_year_min']}}
            })
            
        if 'founded_year_max' in filters:
            filter_clauses.append({
                "range": {"founded_year": {"lte": filters['founded_year_max']}}
            })
            
        # Build final query
        if must_clauses or filter_clauses:
            query = {
                "bool": {
                    "must": must_clauses if must_clauses else {"match_all": {}},
                    "filter": filter_clauses
                }
            }
        else:
            query = {"match_all": {}}
            
        return query

# Singleton instance
search_service = SearchService()