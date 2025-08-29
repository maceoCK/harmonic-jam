import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
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
  ToggleButton,
  Fade,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BlockIcon from '@mui/icons-material/Block';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ViewListIcon from '@mui/icons-material/ViewList';
import { getCollectionsById, getAllCompanyIdsInCollection, ICompany } from '../utils/jam-api';
import { useSelection } from '../contexts/SelectionContext';

interface EnhancedCompanyTableProps {
  selectedCollectionId: string;
  selectionMode: boolean;
  onSelectionModeChange: (mode: boolean) => void;
}

const EnhancedCompanyTable: React.FC<EnhancedCompanyTableProps> = ({
  selectedCollectionId,
  selectionMode,
  onSelectionModeChange,
}) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const {
    selectedCompanyIds,
    isAllSelected,
    setTotalInCollection,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useSelection();

  // Determine which collection we're viewing
  const isLikedCollection = useMemo(() => {
    return selectedCollectionId === 'c6856b00-2986-41c7-ba57-3cbdb2d44fc2'; // Liked Companies List ID
  }, [selectedCollectionId]);

  const isIgnoreCollection = useMemo(() => {
    return selectedCollectionId === '42c24a84-2cb1-4585-a3cf-1e42a4b3803c'; // Companies to Ignore List ID
  }, [selectedCollectionId]);

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
    onSelectionModeChange(false); // Exit selection mode when switching collections
  }, [selectedCollectionId, clearSelection, onSelectionModeChange]);

  const handleSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    const currentPageIds = response.map(company => company.id);
    currentPageIds.forEach(id => {
      if (selectedCompanyIds.has(id) && !newSelection.includes(id)) {
        toggleSelection(id);
      }
    });
    
    newSelection.forEach(id => {
      if (!selectedCompanyIds.has(Number(id))) {
        toggleSelection(Number(id));
      }
    });
  }, [response, selectedCompanyIds, toggleSelection]);

  // Column definitions with enhanced visual design
  const columns: GridColDef[] = [
    {
      field: 'status',
      headerName: '',
      width: 50,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        // Don't show status icons in their respective collections (redundant)
        if (isLikedCollection || isIgnoreCollection) {
          return null;
        }

        if (params.row.liked) {
          return (
            <Tooltip title="Liked company">
              <FavoriteIcon sx={{ color: '#ea4335', fontSize: 20 }} />
            </Tooltip>
          );
        }
        
        // TODO: Add ignored status when backend supports it
        // if (params.row.ignored) {
        //   return (
        //     <Tooltip title="Ignored company">
        //       <BlockIcon sx={{ color: '#5f6368', fontSize: 20 }} />
        //     </Tooltip>
        //   );
        // }

        return null;
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
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        if (selectionMode) return null;
        
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

  // Get the selected IDs for the current page
  const currentPageSelectedIds = Array.from(selectedCompanyIds).filter(id =>
    response.some(company => company.id === id)
  );

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Selection Mode Toggle */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButton
          value="select"
          selected={selectionMode}
          onChange={() => {
            onSelectionModeChange(!selectionMode);
            if (selectionMode) {
              clearSelection();
            }
          }}
          size="small"
          sx={{
            textTransform: 'none',
            px: 2,
            borderColor: '#dadce0',
            '&.Mui-selected': {
              bgcolor: '#e8f0fe',
              borderColor: '#1a73e8',
              color: '#1a73e8',
              '&:hover': {
                bgcolor: '#e8f0fe',
              },
            },
          }}
        >
          {selectionMode ? <CheckBoxIcon sx={{ mr: 1 }} fontSize="small" /> : <CheckBoxOutlineBlankIcon sx={{ mr: 1 }} fontSize="small" />}
          {selectionMode ? 'Exit Selection' : 'Select Items'}
        </ToggleButton>

        {selectionMode && selectedCompanyIds.size > 0 && (
          <Chip
            label={`${selectedCompanyIds.size} selected`}
            size="small"
            sx={{
              bgcolor: '#1a73e8',
              color: 'white',
              fontWeight: 500,
            }}
          />
        )}
      </Box>

      {/* Data Table */}
      <Box sx={{ flex: 1, width: '100%' }}>
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
          checkboxSelection={selectionMode}
          disableRowSelectionOnClick
          keepNonExistentRowsSelected
          rowSelectionModel={currentPageSelectedIds}
          onRowSelectionModelChange={handleSelectionChange}
          paginationMode="server"
          onPaginationModelChange={(newMeta) => {
            setPageSize(newMeta.pageSize);
            setOffset(newMeta.page * newMeta.pageSize);
          }}
          onRowClick={(params) => {
            if (selectionMode) {
              // Toggle selection on row click in selection mode
              if (selectedCompanyIds.has(params.row.id)) {
                toggleSelection(params.row.id);
              } else {
                toggleSelection(params.row.id);
              }
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
            '& .MuiDataGrid-row': {
              cursor: selectionMode ? 'pointer' : 'default',
              '&:hover': {
                bgcolor: 'rgba(26, 115, 232, 0.04)',
              },
              '&.Mui-selected': {
                bgcolor: 'rgba(26, 115, 232, 0.08)',
                '&:hover': {
                  bgcolor: 'rgba(26, 115, 232, 0.12)',
                },
              },
            },
            '& .MuiDataGrid-cell': {
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