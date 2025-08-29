import React, { useState, useCallback } from 'react';
import {
  Paper,
  Button,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Chip,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { useSelection } from '../contexts/SelectionContext';
import { ICollection } from '../utils/jam-api';

interface BulkActionBarProps {
  collections: ICollection[];
  currentCollectionId: string;
  onBulkAdd: (targetCollectionId: string, companyIds: number[]) => void;
  onBulkRemove: (companyIds: number[]) => void;
  onSelectAll: () => void;
  isLoading?: boolean;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  collections,
  currentCollectionId,
  onBulkAdd,
  onBulkRemove,
  onSelectAll,
  isLoading = false,
}) => {
  const {
    selectedCompanyIds,
    isAllSelected,
    totalInCollection,
    clearSelection,
    getSelectedCount,
    getSelectedIds,
  } = useSelection();

  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const selectedCount = getSelectedCount();

  const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleAddClose = () => {
    setAddMenuAnchor(null);
  };

  const handleAddToCollection = useCallback((targetCollectionId: string) => {
    const ids = getSelectedIds();
    onBulkAdd(targetCollectionId, ids);
    handleAddClose();
  }, [getSelectedIds, onBulkAdd]);

  const handleRemoveFromCollection = useCallback(() => {
    const ids = getSelectedIds();
    onBulkRemove(ids);
  }, [getSelectedIds, onBulkRemove]);

  // Get available target collections (exclude current)
  const targetCollections = collections.filter(c => c.id !== currentCollectionId);
  const currentCollection = collections.find(c => c.id === currentCollectionId);

  if (selectedCount === 0) {
    return null; // Don't show anything when no items selected
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        px: 1,
        bgcolor: '#e8f0fe',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={
            isAllSelected
              ? `All ${selectedCount.toLocaleString()} companies selected`
              : `${selectedCount.toLocaleString()} selected`
          }
          sx={{
            bgcolor: '#1a73e8',
            color: 'white',
            fontWeight: 500,
            fontSize: '0.8125rem',
          }}
        />
        
        {!isAllSelected && totalInCollection > selectedCount && (
          <Button
            size="small"
            variant="text"
            onClick={onSelectAll}
            disabled={isLoading}
            sx={{
              textTransform: 'none',
              color: '#1a73e8',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'rgba(26, 115, 232, 0.08)',
              },
            }}
          >
            Select all {totalInCollection.toLocaleString()}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isLoading && <CircularProgress size={20} sx={{ color: '#1a73e8' }} />}
        
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          disabled={isLoading || targetCollections.length === 0}
          sx={{
            textTransform: 'none',
            bgcolor: '#1a73e8',
            '&:hover': {
              bgcolor: '#1967d2',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
            },
          }}
        >
          Add to collection
        </Button>
        
        <Menu
          anchorEl={addMenuAnchor}
          open={Boolean(addMenuAnchor)}
          onClose={handleAddClose}
          PaperProps={{
            elevation: 1,
            sx: {
              mt: 1,
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                color: '#202124',
                '&:hover': {
                  bgcolor: '#f1f3f4',
                },
              },
            },
          }}
        >
          <MenuItem disabled sx={{ fontSize: '0.75rem', color: '#5f6368' }}>
            Add to collection:
          </MenuItem>
          <Divider />
          {targetCollections.map((collection) => (
            <MenuItem
              key={collection.id}
              onClick={() => handleAddToCollection(collection.id)}
            >
              {collection.collection_name}
            </MenuItem>
          ))}
        </Menu>

        {currentCollection && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RemoveIcon />}
            onClick={handleRemoveFromCollection}
            disabled={isLoading}
            sx={{
              textTransform: 'none',
              borderColor: '#dadce0',
              color: '#5f6368',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                borderColor: '#dadce0',
              },
            }}
          >
            Remove from collection
          </Button>
        )}

        <IconButton
          onClick={clearSelection}
          disabled={isLoading}
          size="small"
          sx={{ color: '#5f6368' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default BulkActionBar;