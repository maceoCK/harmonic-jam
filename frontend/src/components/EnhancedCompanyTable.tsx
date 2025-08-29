import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Fade,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { 
  getCollectionsById, 
  getAllCompanyIdsInCollection, 
  ICompany,
  ICollection,
  bulkAddCompanies,
  bulkRemoveCompanies,
} from '../utils/jam-api';
import { useSelection } from '../contexts/SelectionContext';

interface EnhancedCompanyTableProps {
  selectedCollectionId: string;
  collections: ICollection[];
}

const EnhancedCompanyTable: React.FC<EnhancedCompanyTableProps> = ({
  selectedCollectionId,
  collections,
}) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);

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

  useEffect(() => {
    setLoading(true);
    getCollectionsById(selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
        setTotalInCollection(newResponse.total);
        setLoading(false);
      }
    );
  }, [selectedCollectionId, offset, pageSize, setTotalInCollection]);

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
      flex: 1,
      minWidth: 200,
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
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <Fade in={hoveredRow === params.row.id}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Open action menu
                console.log('Open actions for', params.row.id);
              }}
              sx={{
                opacity: hoveredRow === params.row.id ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Fade>
        );
      },
    },
  ];

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

      {/* Data Table */}
      <Box sx={{ flex: 1, width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={response}
          columns={columns}
          rowHeight={48}
          columnHeaderHeight={48}
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
        />
      </Box>
    </Box>
  );
};

export default EnhancedCompanyTable;