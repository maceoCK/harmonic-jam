import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowParams,
  GridExpandMoreIcon,
} from '@mui/x-data-grid';
import {
  Box,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Button,
  Fade,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Card,
  CardContent,
  Grid,
  Link,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoIcon from '@mui/icons-material/Info';
import LaunchIcon from '@mui/icons-material/Launch';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { 
  getCollectionsById, 
  getAllCompanyIdsInCollection, 
  ICompany,
  ICollection,
  bulkAddCompanies,
  bulkRemoveCompanies,
  getIndustries,
  getCompanyStages,
} from '../utils/jam-api';
import { useSelection } from '../contexts/SelectionContext';
import ColumnFilterMenu, { ColumnFilter, ColumnSort } from './ColumnFilterMenu';

interface EnhancedCompanyTableProps {
  selectedCollectionId: string;
  collections: ICollection[];
  filters?: any;
  sortModel?: { field: string; sort: 'asc' | 'desc' } | null;
  onSortModelChange?: (model: { field: string; sort: 'asc' | 'desc' } | null) => void;
  onCompanySelect?: (company: ICompany) => void;
}

const EnhancedCompanyTable: React.FC<EnhancedCompanyTableProps> = ({
  selectedCollectionId,
  collections,
  filters,
  sortModel,
  onSortModelChange,
  onCompanySelect,
}) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>({
    industry: true,
    founded_year: true,
    employee_count: true,
    total_funding: true,
    company_stage: true,
    location: true,
    website: false,
    revenue: false,
    valuation: false,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Filter and sort state
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [columnSort, setColumnSort] = useState<ColumnSort | null>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeFilterField, setActiveFilterField] = useState<string>('');
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availableStages, setAvailableStages] = useState<string[]>([]);

  const {
    selectedCompanyIds,
    isAllSelected,
    setTotalInCollection,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useSelection();

  // Determine which collection we're viewing
  const currentCollection = useMemo(() => {
    return collections?.find(c => c.id === selectedCollectionId);
  }, [collections, selectedCollectionId]);
  
  const isLikedCollection = useMemo(() => {
    return currentCollection?.collection_name === 'Liked Companies List';
  }, [currentCollection]);

  const isIgnoreCollection = useMemo(() => {
    return currentCollection?.collection_name === 'Companies to Ignore List';
  }, [currentCollection]);

  const isMyList = useMemo(() => {
    return currentCollection?.collection_name === 'My List';
  }, [currentCollection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      // Delete: Remove selected items (if in a collection)
      else if (e.key === 'Delete' && selectedCompanyIds.size > 0) {
        e.preventDefault();
        // Trigger remove action through parent
        if (window.confirm(`Remove ${selectedCompanyIds.size} selected items?`)) {
          // Call the bulk remove through the parent component
          const ids = Array.from(selectedCompanyIds);
          bulkRemoveCompanies(selectedCollectionId, ids).then(() => {
            window.location.reload();
          });
        }
      }
      // Escape: Clear selection
      else if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompanyIds, selectedCollectionId, clearSelection]);

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [industries, stages] = await Promise.all([
          getIndustries(),
          getCompanyStages(),
        ]);
        setAvailableIndustries(industries);
        setAvailableStages(stages);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    loadFilterOptions();
    
    // Load saved filters from localStorage
    const savedFilters = localStorage.getItem('companyTableFilters');
    const savedSort = localStorage.getItem('companyTableSort');
    
    if (savedFilters) {
      setColumnFilters(JSON.parse(savedFilters));
    }
    if (savedSort) {
      setColumnSort(JSON.parse(savedSort));
    }
  }, []);
  
  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('companyTableFilters', JSON.stringify(columnFilters));
  }, [columnFilters]);
  
  useEffect(() => {
    if (columnSort) {
      localStorage.setItem('companyTableSort', JSON.stringify(columnSort));
    } else {
      localStorage.removeItem('companyTableSort');
    }
  }, [columnSort]);
  
  useEffect(() => {
    setLoading(true);
    
    // Build query params from filters
    const params: any = { offset, limit: pageSize };
    
    // Add filter parameters
    Object.values(columnFilters).forEach(filter => {
      if (filter.operator === 'contains' && filter.value) {
        // For text search, we'll need to handle this differently
        // For now, skip text filters
      } else if (filter.operator === 'between' && filter.value) {
        const [min, max] = filter.value;
        if (filter.field === 'employee_count') {
          params.employee_min = min;
          params.employee_max = max;
        } else if (filter.field === 'total_funding') {
          params.funding_min = min;
          params.funding_max = max;
        } else if (filter.field === 'founded_year') {
          params.founded_year_min = min;
          params.founded_year_max = max;
        }
      } else if (filter.operator === 'in' && filter.value?.length > 0) {
        if (filter.field === 'industry') {
          params.industries = filter.value;
        } else if (filter.field === 'company_stage') {
          params.company_stages = filter.value;
        }
      }
    });
    
    // Add sort parameters
    if (columnSort) {
      params.sort_by = columnSort.field;
      params.sort_order = columnSort.sort;
    }
    
    // Make API call with filters
    getCollectionsById(selectedCollectionId, offset, pageSize, params).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
        setTotalInCollection(newResponse.total);
        setLoading(false);
      }
    );
  }, [selectedCollectionId, offset, pageSize, setTotalInCollection, columnFilters, columnSort]);

  useEffect(() => {
    setOffset(0);
    clearSelection();
  }, [selectedCollectionId, clearSelection]);

  // Custom row styling for selection
  const getRowClassName = (params: GridRowParams) => {
    return selectedCompanyIds.has(params.row.id) ? 'row-selected' : '';
  };

  const handleStatusToggle = async (companyId: number, currentStatus: 'liked' | 'ignored' | 'none') => {
    console.log(`Toggle status for company ${companyId} from ${currentStatus}`);
    
    // Get collection IDs dynamically from collections prop
    const likedCollection = collections?.find(c => c.collection_name === 'Liked Companies List');
    const ignoreCollection = collections?.find(c => c.collection_name === 'Companies to Ignore List');
    const likedCollectionId = likedCollection?.id;
    const ignoreCollectionId = ignoreCollection?.id;
    
    if (!likedCollectionId || !ignoreCollectionId) {
      console.error('Could not find liked or ignore collection IDs');
      return;
    }
    
    // Optimistically update UI first for immediate feedback
    const updatedCompanies = response.map(company => {
      if (company.id === companyId) {
        if (currentStatus === 'none') {
          // Cycle to liked
          return { ...company, liked: true, ignored: false };
        } else if (currentStatus === 'liked') {
          // Cycle to ignored
          return { ...company, liked: false, ignored: true };
        } else {
          // Cycle back to none
          return { ...company, liked: false, ignored: false };
        }
      }
      return company;
    });
    setResponse(updatedCompanies);
    
    try {
      if (currentStatus === 'none') {
        // Add to liked
        await bulkAddCompanies(likedCollectionId, [companyId]);
      } else if (currentStatus === 'liked') {
        // Remove from liked, add to ignored
        await bulkRemoveCompanies(likedCollectionId, [companyId]);
        await bulkAddCompanies(ignoreCollectionId, [companyId]);
      } else if (currentStatus === 'ignored') {
        // Remove from ignored (back to none)
        await bulkRemoveCompanies(ignoreCollectionId, [companyId]);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      // Revert on error
      setLoading(true);
      const newResponse = await getCollectionsById(selectedCollectionId, offset, pageSize);
      setResponse(newResponse.companies);
      setTotal(newResponse.total);
      setTotalInCollection(newResponse.total);
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'seed': return 'warning';
      case 'series a': return 'info';
      case 'series b': return 'primary';
      case 'series c': return 'secondary';
      case 'public': return 'success';
      default: return 'default';
    }
  };

  const handleRowExpand = (rowId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };
  
  // Handle column filter menu
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, field: string) => {
    event.stopPropagation();
    setFilterMenuAnchor(event.currentTarget);
    setActiveFilterField(field);
  };
  
  const handleFilterChange = (filter: ColumnFilter | null) => {
    if (filter) {
      setColumnFilters(prev => ({ ...prev, [filter.field]: filter }));
    } else {
      setColumnFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[activeFilterField];
        return newFilters;
      });
    }
  };
  
  const handleSortChange = (sort: ColumnSort | null) => {
    if (sort && onSortModelChange) {
      onSortModelChange(sort);
    }
    setColumnSort(sort);
  };
  
  // Custom column header with filter icon
  const renderColumnHeader = (field: string, label: string, fieldType: 'string' | 'number' | 'select' | 'year' = 'string') => {
    const hasFilter = columnFilters[field];
    const hasSort = columnSort?.field === field;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {label}
        </Typography>
        {hasSort && (
          <IconButton size="small" sx={{ ml: 0.5 }}>
            {columnSort?.sort === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={(e) => handleFilterClick(e, field)}
          sx={{ 
            ml: 0.5,
            color: hasFilter ? 'primary.main' : 'text.secondary',
          }}
        >
          <FilterListIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  // Column definitions with enhanced visual design
  const columns: GridColDef[] = [
    {
      field: 'expand',
      headerName: '',
      width: 40,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleRowExpand(params.row.id);
          }}
          sx={{
            transform: expandedRows.has(params.row.id) ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <GridExpandMoreIcon fontSize="small" />
        </IconButton>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 80,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        const isLiked = params.row.liked;
        const isIgnored = params.row.ignored || false;

        let currentStatus: 'liked' | 'ignored' | 'none' = 'none';
        if (isLiked) currentStatus = 'liked';
        else if (isIgnored) currentStatus = 'ignored';

        return (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusToggle(params.row.id, currentStatus);
            }}
            sx={{
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {isLiked ? (
              <Tooltip title="Liked - Click to ignore">
                <FavoriteIcon sx={{ color: '#ea4335', fontSize: 20 }} />
              </Tooltip>
            ) : isIgnored ? (
              <Tooltip title="Ignored - Click to clear">
                <VisibilityOffIcon sx={{ color: '#5f6368', fontSize: 20 }} />
              </Tooltip>
            ) : (
              <Tooltip title="Click to like">
                <FavoriteBorderIcon sx={{ color: '#9aa0a6', fontSize: 20 }} />
              </Tooltip>
            )}
          </IconButton>
        );
      },
    },
    {
      field: 'company_name',
      headerName: 'Company Name',
      width: 250,
      minWidth: 200,
      renderHeader: () => renderColumnHeader('company_name', 'Company Name', 'string'),
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%',
          py: 0.5,
        }}>
          <Typography
            sx={{
              fontSize: '0.9rem',
              fontWeight: params.row.liked ? 500 : 400,
              color: 'text.primary',
            }}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'industry',
      headerName: 'Industry',
      width: 150,
      renderHeader: () => renderColumnHeader('industry', 'Industry', 'select'),
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            sx={{ maxWidth: '100%' }}
          />
        ) : null
      ),
    },
    {
      field: 'founded_year',
      headerName: 'Founded',
      width: 100,
      renderHeader: () => renderColumnHeader('founded_year', 'Founded', 'year'),
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{params.value || 'N/A'}</Typography>
      ),
    },
    {
      field: 'employee_count',
      headerName: 'Employees',
      width: 120,
      renderHeader: () => renderColumnHeader('employee_count', 'Employees', 'number'),
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PeopleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2">{formatNumber(params.value)}</Typography>
        </Box>
      ),
    },
    {
      field: 'total_funding',
      headerName: 'Funding',
      width: 120,
      renderHeader: () => renderColumnHeader('total_funding', 'Funding', 'number'),
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AttachMoneyIcon fontSize="small" sx={{ color: 'success.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {formatCurrency(params.value)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'company_stage',
      headerName: 'Stage',
      width: 120,
      renderHeader: () => renderColumnHeader('company_stage', 'Stage', 'select'),
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            color={getStageColor(params.value) as any}
            variant="filled"
          />
        ) : null
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOnIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2">{params.value}</Typography>
          </Box>
        ) : null
      ),
    },
    {
      field: 'website',
      headerName: 'Website',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Link 
            href={params.value} 
            target="_blank" 
            rel="noopener"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <LaunchIcon fontSize="small" />
            <Typography variant="body2">Visit</Typography>
          </Link>
        ) : null
      ),
    },
    {
      field: 'revenue',
      headerName: 'Revenue',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'valuation',
      headerName: 'Valuation',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Details',
      width: 100,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              if (onCompanySelect) {
                onCompanySelect(params.row);
              }
            }}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
            }}
          >
            View
          </Button>
        );
      },
    },
  ];

  const renderExpandedRow = (company: ICompany) => (
    <Collapse in={expandedRows.has(company.id)} unmountOnExit>
      <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <InfoIcon fontSize="small" />
                  Quick Details
                </Typography>
                {company.description && (
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                    {company.description.length > 150 
                      ? `${company.description.substring(0, 150)}...` 
                      : company.description
                    }
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {company.technologies && (
                    <Chip label={company.technologies} size="small" variant="outlined" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoneyIcon fontSize="small" />
                  Financial Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Revenue</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(company.revenue)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Valuation</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(company.valuation)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Round</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {company.last_funding_round || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Amount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(company.last_funding_amount)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Collapse>
  );

  const handleColumnVisibilityChange = (field: string) => {
    setColumnVisibilityModel(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Not using DataGrid selection due to multi-select limitation in free version

  const handleSelectAll = useCallback(async () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      setLoading(true);
      try {
        const allIds = await getAllCompanyIdsInCollection(selectedCollectionId);
        selectAll(allIds);
      } catch (error) {
        console.error('Error selecting all:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [isAllSelected, clearSelection, selectAll, selectedCollectionId]);

  return (
    <Box sx={{ height: 'calc(100vh - 250px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
      </Menu>
      {/* Selection controls */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {selectedCompanyIds.size > 0 && (
            <Chip
              label={`${selectedCompanyIds.size} selected`}
              size="small"
              onDelete={clearSelection}
              sx={{
                bgcolor: '#1a73e8',
                color: 'white',
                fontWeight: 500,
                '& .MuiChip-deleteIcon': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: 'white',
                  },
                },
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => setAnchorEl(null)} // Placeholder for column visibility menu
            sx={{
              textTransform: 'none',
              color: '#1a73e8',
              fontSize: '0.875rem',
            }}
          >
            Columns
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={handleSelectAll}
            disabled={loading || total === 0}
            sx={{
              textTransform: 'none',
              color: '#1a73e8',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'rgba(26, 115, 232, 0.08)',
              },
            }}
          >
            {isAllSelected ? 'Deselect All' : `Select All (${total.toLocaleString()})`}
          </Button>
        </Box>
      </Box>

      {/* Data Table */}
      <Box sx={{ flex: 1, width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={response}
          columns={columns}
          rowHeight={48}
          columnHeaderHeight={48}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          autoHeight={false}
          sortingMode="server"
          sortModel={sortModel ? [sortModel] : []}
          onSortModelChange={(model) => {
            if (onSortModelChange) {
              onSortModelChange(model.length > 0 ? model[0] as any : null);
            }
          }}
          sx={{ 
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
            },
            '& .MuiDataGrid-columnHeaders': {
              minWidth: '100%',
            },
            '& .MuiDataGrid-row': {
              minWidth: '100%',
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          rowCount={total}
          pagination
          loading={loading}
          checkboxSelection={false}
          disableRowSelectionOnClick={true}
          paginationMode="server"
          getRowClassName={getRowClassName}
          onPaginationModelChange={(newMeta) => {
            setPageSize(newMeta.pageSize);
            setOffset(newMeta.page * newMeta.pageSize);
          }}
          onRowClick={(params, event) => {
            // Don't toggle selection if clicking on the status button
            const target = event.target as HTMLElement;
            if (!target.closest('button')) {
              const clickedId = params.row.id;
              
              if (event.shiftKey && lastSelectedId !== null) {
                // Shift-click: select range
                const currentPageIds = response.map(c => c.id);
                const startIdx = currentPageIds.indexOf(lastSelectedId);
                const endIdx = currentPageIds.indexOf(clickedId);
                
                if (startIdx !== -1 && endIdx !== -1) {
                  const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                  for (let i = minIdx; i <= maxIdx; i++) {
                    const id = currentPageIds[i];
                    if (!selectedCompanyIds.has(id)) {
                      toggleSelection(id);
                    }
                  }
                }
              } else if (event.ctrlKey || event.metaKey) {
                // Ctrl/Cmd-click: toggle single selection
                toggleSelection(clickedId);
              } else {
                // Regular click: clear others and select this one
                clearSelection();
                toggleSelection(clickedId);
              }
              
              setLastSelectedId(clickedId);
            }
          }}
          slotProps={{
            row: {
              onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
                const rowId = Number((event.currentTarget as HTMLElement).dataset.id);
                setHoveredRow(rowId);
              },
              onMouseLeave: () => {
                setHoveredRow(null);
              },
            },
          }}
          sx={{
            border: 'none',
            userSelect: 'none', // Prevent text selection
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              userSelect: 'none', // Prevent text selection in rows
              '&:hover': {
                bgcolor: 'rgba(26, 115, 232, 0.04)',
              },
              '&.row-selected': {
                bgcolor: 'rgba(26, 115, 232, 0.08) !important',
                '&:hover': {
                  bgcolor: 'rgba(26, 115, 232, 0.12) !important',
                },
              },
            },
            '& .MuiDataGrid-cell': {
              userSelect: 'none', // Prevent text selection in cells
              borderBottom: '1px solid #f0f0f0',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#fafafa',
              borderBottom: '2px solid #e0e0e0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#5f6368',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '2px solid #e0e0e0',
            },
            '& .MuiDataGrid-columnSeparator': {
              display: 'none',
            },
            '& .MuiDataGrid-checkboxInput': {
              color: '#1a73e8',
              '&.Mui-checked': {
                color: '#1a73e8',
              },
            },
            // Zebra striping for better readability
            '& .MuiDataGrid-row:nth-of-type(even)': {
              bgcolor: '#fafafa',
            },
          }}
          components={{
            Row: ({ children, ...props }) => {
              const company = response.find(c => c.id === props.row.id);
              return (
                <div>
                  <div {...props}>
                    {children}
                  </div>
                  {company && renderExpandedRow(company)}
                </div>
              );
            },
          }}
        />
      </Box>
      
      {/* Column Filter Menu */}
      <ColumnFilterMenu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        field={activeFilterField}
        fieldType={
          activeFilterField === 'company_name' ? 'string' :
          activeFilterField === 'industry' ? 'select' :
          activeFilterField === 'company_stage' ? 'select' :
          activeFilterField === 'founded_year' ? 'year' :
          activeFilterField === 'employee_count' ? 'number' :
          activeFilterField === 'total_funding' ? 'number' :
          activeFilterField === 'revenue' ? 'number' :
          activeFilterField === 'valuation' ? 'number' :
          'string'
        }
        currentFilter={columnFilters[activeFilterField]}
        currentSort={columnSort?.field === activeFilterField ? columnSort : undefined}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        availableOptions={
          activeFilterField === 'industry' ? availableIndustries :
          activeFilterField === 'company_stage' ? availableStages :
          []
        }
      />
    </Box>
  );
};

export default EnhancedCompanyTable;