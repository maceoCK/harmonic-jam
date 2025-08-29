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
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Select companies to perform bulk actions
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SelectAllIcon />}
          onClick={onSelectAll}
          disabled={isLoading || totalInCollection === 0}
        >
          Select All ({totalInCollection.toLocaleString()})
        </Button>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'primary.dark',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={
            isAllSelected
              ? `All ${selectedCount.toLocaleString()} companies selected`
              : `${selectedCount.toLocaleString()} selected`
          }
          color="primary"
          variant={isAllSelected ? "filled" : "outlined"}
        />
        
        {!isAllSelected && totalInCollection > selectedCount && (
          <Button
            size="small"
            variant="text"
            onClick={onSelectAll}
            disabled={isLoading}
          >
            Select all {totalInCollection.toLocaleString()}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isLoading && <CircularProgress size={20} />}
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          disabled={isLoading || targetCollections.length === 0}
        >
          Add to...
        </Button>
        
        <Menu
          anchorEl={addMenuAnchor}
          open={Boolean(addMenuAnchor)}
          onClose={handleAddClose}
        >
          <MenuItem disabled>
            <Typography variant="caption">Add to collection:</Typography>
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
            color="error"
            startIcon={<RemoveIcon />}
            onClick={handleRemoveFromCollection}
            disabled={isLoading}
          >
            Remove from {currentCollection.collection_name}
          </Button>
        )}

        <IconButton
          onClick={clearSelection}
          disabled={isLoading}
          size="small"
          color="inherit"
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default BulkActionBar;