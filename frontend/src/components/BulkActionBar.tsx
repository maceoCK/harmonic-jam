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
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DeleteIcon from '@mui/icons-material/Delete';
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
  
  // Find collections by name (more reliable than hardcoded IDs)
  const likedList = collections.find(c => c.collection_name === 'Liked Companies List');
  const ignoreList = collections.find(c => c.collection_name === 'Companies to Ignore List');
  const myList = collections.find(c => c.collection_name === 'My List');
  
  // Determine which collection we're in
  const isMyList = currentCollection?.collection_name === 'My List';
  const isLikedList = currentCollection?.collection_name === 'Liked Companies List';
  const isIgnoreList = currentCollection?.collection_name === 'Companies to Ignore List';
  
  const likedListId = likedList?.id || '';
  const ignoreListId = ignoreList?.id || '';

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
        
        {/* My List: Like, Ignore, Delete */}
        {isMyList && (
          <>
            <Button
              variant="contained"
              size="small"
              startIcon={<FavoriteIcon />}
              onClick={() => handleAddToCollection(likedListId)}
              disabled={isLoading || !likedList}
              sx={{
                textTransform: 'none',
                bgcolor: '#ea4335',
                '&:hover': {
                  bgcolor: '#d33b27',
                  boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
                },
              }}
            >
              Like
            </Button>
            
            <Button
              variant="contained"
              size="small"
              startIcon={<VisibilityOffIcon />}
              onClick={() => handleAddToCollection(ignoreListId)}
              disabled={isLoading || !ignoreList}
              sx={{
                textTransform: 'none',
                bgcolor: '#5f6368',
                '&:hover': {
                  bgcolor: '#3c4043',
                  boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
                },
              }}
            >
              Ignore
            </Button>
          </>
        )}
        
        {/* Liked List: Unlike, Ignore, Delete */}
        {isLikedList && (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FavoriteBorderIcon />}
              onClick={handleRemoveFromCollection}
              disabled={isLoading}
              sx={{
                textTransform: 'none',
                borderColor: '#ea4335',
                color: '#ea4335',
                '&:hover': {
                  bgcolor: 'rgba(234, 67, 53, 0.04)',
                  borderColor: '#ea4335',
                },
              }}
            >
              Unlike
            </Button>
            
            <Button
              variant="contained"
              size="small"
              startIcon={<VisibilityOffIcon />}
              onClick={() => handleAddToCollection(ignoreListId)}
              disabled={isLoading || !ignoreList}
              sx={{
                textTransform: 'none',
                bgcolor: '#5f6368',
                '&:hover': {
                  bgcolor: '#3c4043',
                  boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
                },
              }}
            >
              Ignore
            </Button>
          </>
        )}
        
        {/* Ignore List: Unignore, Like, Delete */}
        {isIgnoreList && (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RemoveRedEyeIcon />}
              onClick={handleRemoveFromCollection}
              disabled={isLoading}
              sx={{
                textTransform: 'none',
                borderColor: '#5f6368',
                color: '#5f6368',
                '&:hover': {
                  bgcolor: 'rgba(95, 99, 104, 0.04)',
                  borderColor: '#5f6368',
                },
              }}
            >
              Unignore
            </Button>
            
            <Button
              variant="contained"
              size="small"
              startIcon={<FavoriteIcon />}
              onClick={() => handleAddToCollection(likedListId)}
              disabled={isLoading || !likedList}
              sx={{
                textTransform: 'none',
                bgcolor: '#ea4335',
                '&:hover': {
                  bgcolor: '#d33b27',
                  boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
                },
              }}
            >
              Like
            </Button>
          </>
        )}
        
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

        {/* Delete button - shown for all collections */}
        {currentCollection && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleRemoveFromCollection}
            disabled={isLoading}
            sx={{
              textTransform: 'none',
              borderColor: '#d33b27',
              color: '#d33b27',
              '&:hover': {
                bgcolor: 'rgba(211, 59, 39, 0.04)',
                borderColor: '#d33b27',
              },
            }}
          >
            Delete
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