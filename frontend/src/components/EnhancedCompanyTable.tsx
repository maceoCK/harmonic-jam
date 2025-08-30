import React, { useEffect, useState, useCallback } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowParams,
} from '@mui/x-data-grid';
import {
  Box,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
  Link,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LaunchIcon from '@mui/icons-material/Launch';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { 
  getCollectionsById, 
  getAllCompanyIdsInCollection, 
  ICompany,
  ICollection,
  bulkAddCompanies,
  bulkRemoveCompanies,
  searchCompanyIds,
} from '../utils/jam-api';
import { searchCompanies } from '../utils/search-api';
import { useSelection } from '../contexts/SelectionContext';

interface EnhancedCompanyTableProps {
  selectedCollectionId: string;
  collections: ICollection[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  sortModel?: { field: string; sort: 'asc' | 'desc' } | null;
  onSortModelChange?: (model: { field: string; sort: 'asc' | 'desc' } | null) => void;
  onCompanySelect?: (company: ICompany) => void;
}

const EnhancedCompanyTable: React.FC<EnhancedCompanyTableProps> = ({
  selectedCollectionId,
  collections,
  searchQuery,
  setSearchQuery,
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
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(null);
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
  
  // Sort state
  const [columnSort, setColumnSort] = useState<any | null>(null);

  const {
    selectedCompanyIds,
    isAllSelected,
    setTotalInCollection,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useSelection();


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

  // Sync sortModel prop with local state
  useEffect(() => {
    if (sortModel) {
      setColumnSort(sortModel);
    }
  }, [sortModel]);
  
  // Save filters to localStorage when they change
  
  useEffect(() => {
    if (columnSort) {
      localStorage.setItem('companyTableSort', JSON.stringify(columnSort));
    } else {
      localStorage.removeItem('companyTableSort');
    }
  }, [columnSort]);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        if (searchQuery && searchQuery.trim()) {
          // Use search API when there's a query
          const searchResults = await searchCompanies(
            searchQuery,
            offset,
            pageSize,
            selectedCollectionId
          );
          setResponse(searchResults.companies);
          setTotal(searchResults.total);
          setTotalInCollection(searchResults.total);
        } else {
          // Use regular collection API when no search
          const params: any = { offset, limit: pageSize };
          
          // Add sort parameters
          if (columnSort) {
            params.sort_by = columnSort.field;
            params.sort_order = columnSort.sort;
          }
          
          const newResponse = await getCollectionsById(selectedCollectionId, offset, pageSize, params);
          setResponse(newResponse.companies);
          setTotal(newResponse.total);
          setTotalInCollection(newResponse.total);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedCollectionId, offset, pageSize, setTotalInCollection, columnSort, searchQuery]);

  useEffect(() => {
    setOffset(0);
    clearSelection();
  }, [selectedCollectionId, clearSelection]);

  // Reset pagination when search query changes
  useEffect(() => {
    setOffset(0);
  }, [searchQuery]);

  // Custom row styling for selection
  const getRowClassName = (params: GridRowParams) => {
    return selectedCompanyIds.has(params.row.id) ? 'row-selected' : '';
  };

  const handleStatusToggle = async (companyId: number, currentStatus: 'liked' | 'ignored' | 'none') => {
    
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

  

  // Column definitions with enhanced visual design
  const columns: GridColDef[] = [
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
      sortable: true,
      headerClassName: 'sticky-column-header',
      cellClassName: 'sticky-column-cell',
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
      sortable: true,
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
      sortable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{params.value || 'N/A'}</Typography>
      ),
    },
    {
      field: 'employee_count',
      headerName: 'Employees',
      width: 120,
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
        let allIds: number[];
        
        if (searchQuery) {
          // When searching, get filtered IDs from search endpoint
          allIds = await searchCompanyIds(searchQuery, selectedCollectionId);
        } else {
          // When not searching, get all IDs from collection
          allIds = await getAllCompanyIdsInCollection(selectedCollectionId);
        }
        
        selectAll(allIds);
      } catch (error) {
        console.error('Error selecting all:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [isAllSelected, clearSelection, selectAll, selectedCollectionId, searchQuery]);

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
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
      {/* Selection controls - Fixed at top */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
          {searchQuery && (
            <Chip
              label={`Filtered: "${searchQuery}"`}
              size="small"
              onDelete={() => setSearchQuery && setSearchQuery('')}
              sx={{
                bgcolor: '#e3f2fd',
                color: '#1976d2',
                fontWeight: 500,
                maxWidth: 300,
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
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

      {/* Data Table - Scrollable container */}
      <Box sx={{ 
        flex: 1, 
        minWidth: 0, // This is important to allow the container to shrink
        overflow: 'auto', // Changed from 'hidden' to 'auto' to enable scrolling
        display: 'flex',
        flexDirection: 'column',
      }}>
        <DataGrid
          rows={response}
          columns={columns}
          rowHeight={48}
          columnHeaderHeight={48}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          sortingMode="server"
          disableColumnMenu={false}
          sortModel={sortModel ? [sortModel] : []}
          onSortModelChange={(model) => {
            const newSort = model.length > 0 ? model[0] as any : null;
            // Update local state to trigger data fetch
            setColumnSort(newSort);
            // Also update parent state for persistence
            if (onSortModelChange) {
              onSortModelChange(newSort);
            }
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
          slotProps={{}}
          sx={{
            height: '100%',
            border: 'none',
            userSelect: 'none',
            // Sticky columns for status and company name
            '& .MuiDataGrid-cell[data-field="status"]': {
              position: 'sticky !important',
              left: '0 !important',
              zIndex: 100,
              backgroundColor: '#ffffff !important',
              borderRight: '1px solid #e0e0e0',
              willChange: 'transform',
              transform: 'translateZ(0)',
              isolation: 'isolate',
            },
            '& .MuiDataGrid-columnHeader[data-field="status"]': {
              position: 'sticky !important',
              left: '0 !important',
              zIndex: 101,
              backgroundColor: '#fafafa !important',
              borderRight: '1px solid #e0e0e0',
              willChange: 'transform',
              transform: 'translateZ(0)',
            },
            '& .MuiDataGrid-cell[data-field="company_name"]': {
              position: 'sticky !important',
              left: '80px !important', // Width of status column
              zIndex: 99,
              backgroundColor: '#ffffff !important',
              borderRight: '1px solid #e0e0e0',
              willChange: 'transform',
              transform: 'translateZ(0)',
              isolation: 'isolate',
            },
            '& .MuiDataGrid-columnHeader[data-field="company_name"]': {
              position: 'sticky !important',
              left: '80px !important', // Width of status column
              zIndex: 100,
              backgroundColor: '#fafafa !important',
              borderRight: '1px solid #e0e0e0',
              willChange: 'transform',
              transform: 'translateZ(0)',
            },
            // Alternate row colors for sticky columns (only when not selected)
            '& .MuiDataGrid-row:nth-of-type(even):not(.row-selected) .MuiDataGrid-cell[data-field="status"]': {
              backgroundColor: '#fafafa !important',
            },
            '& .MuiDataGrid-row:nth-of-type(even):not(.row-selected) .MuiDataGrid-cell[data-field="company_name"]': {
              backgroundColor: '#fafafa !important',
            },
            // Hover states for sticky columns (when not selected)
            '& .MuiDataGrid-row:not(.row-selected):hover .MuiDataGrid-cell[data-field="status"]': {
              backgroundColor: 'rgb(216, 230, 248) !important',
            },
            '& .MuiDataGrid-row:not(.row-selected):hover .MuiDataGrid-cell[data-field="company_name"]': {
              backgroundColor: 'rgb(216, 230, 248) !important',
            },
            // Selected row states for sticky columns - all have same blue
            '& .row-selected .MuiDataGrid-cell[data-field="status"]': {
              backgroundColor: 'rgba(26, 115, 232, 0.08) !important',
            },
            '& .row-selected .MuiDataGrid-cell[data-field="company_name"]': {
              backgroundColor: 'rgba(26, 115, 232, 0.08) !important',
            },
            '& .row-selected:hover .MuiDataGrid-cell[data-field="status"]': {
              backgroundColor: 'rgba(26, 115, 232, 0.12) !important',
            },
            '& .row-selected:hover .MuiDataGrid-cell[data-field="company_name"]': {
              backgroundColor: 'rgba(26, 115, 232, 0.12) !important',
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              userSelect: 'none',
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
              userSelect: 'none',
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
            '& .MuiDataGrid-row:nth-of-type(even)': {
              bgcolor: '#fafafa',
            },
          }}
        />
      </Box>
      
      {/* Column Visibility Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: { maxHeight: 400, width: 250 }
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Show/Hide Columns
        </Typography>
        <Divider />
        {[
          { field: 'industry', label: 'Industry' },
          { field: 'founded_year', label: 'Founded' },
          { field: 'employee_count', label: 'Employees' },
          { field: 'total_funding', label: 'Funding' },
          { field: 'company_stage', label: 'Stage' },
          { field: 'location', label: 'Location' },
          { field: 'revenue', label: 'Revenue' },
          { field: 'valuation', label: 'Valuation' },
        ].map(col => (
          <MenuItem
            key={col.field}
            onClick={() => handleColumnVisibilityChange(col.field)}
          >
            <Checkbox
              checked={columnVisibilityModel[col.field] !== false}
              size="small"
            />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default EnhancedCompanyTable;