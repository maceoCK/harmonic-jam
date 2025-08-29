import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export interface ConflictInfo {
  conflicts: Array<{
    company_id: number;
    conflict_type: string;
    message: string;
  }>;
  duplicates: number[];
  safe_to_add: number[];
  total_checked: number;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onClose: () => void;
  conflictInfo: ConflictInfo | null;
  targetCollectionName: string;
  onResolve: (action: 'move' | 'skip' | 'cancel') => void;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  onClose,
  conflictInfo,
  targetCollectionName,
  onResolve,
}) => {
  if (!conflictInfo) return null;

  const hasConflicts = conflictInfo.conflicts.length > 0;
  const hasDuplicates = conflictInfo.duplicates.length > 0;
  const hasSafeItems = conflictInfo.safe_to_add.length > 0;

  // Group conflicts by type
  const likedConflicts = conflictInfo.conflicts.filter(c => c.conflict_type === 'in_liked');
  const ignoredConflicts = conflictInfo.conflicts.filter(c => c.conflict_type === 'in_ignored');

  return (
    <Dialog
      open={open}
      onClose={() => onResolve('cancel')}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6">Review Before Adding</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Adding {conflictInfo.total_checked} companies to <strong>{targetCollectionName}</strong>
          </Typography>
        </Box>

        {/* Summary chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          {hasSafeItems && (
            <Chip
              icon={<CheckCircleOutlineIcon />}
              label={`${conflictInfo.safe_to_add.length} ready to add`}
              color="success"
              variant="outlined"
              size="small"
            />
          )}
          {hasDuplicates && (
            <Chip
              icon={<ContentCopyIcon />}
              label={`${conflictInfo.duplicates.length} duplicates`}
              color="warning"
              variant="outlined"
              size="small"
            />
          )}
          {hasConflicts && (
            <Chip
              icon={<SwapHorizIcon />}
              label={`${conflictInfo.conflicts.length} conflicts`}
              color="error"
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        {/* Detailed breakdown */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Duplicates section */}
          {hasDuplicates && (
            <Alert severity="info" sx={{ py: 1 }}>
              <Typography variant="body2">
                <strong>{conflictInfo.duplicates.length} companies</strong> are already in {targetCollectionName} and will be skipped.
              </Typography>
            </Alert>
          )}

          {/* Conflicts section */}
          {likedConflicts.length > 0 && (
            <Alert severity="warning" sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{likedConflicts.length} companies</strong> are in the <strong>Liked List</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Moving to {targetCollectionName} will remove them from Liked List
              </Typography>
            </Alert>
          )}

          {ignoredConflicts.length > 0 && (
            <Alert severity="warning" sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{ignoredConflicts.length} companies</strong> are in the <strong>Ignore List</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Moving to {targetCollectionName} will remove them from Ignore List
              </Typography>
            </Alert>
          )}

          {/* Safe to add section */}
          {hasSafeItems && (
            <Alert severity="success" sx={{ py: 1 }}>
              <Typography variant="body2">
                <strong>{conflictInfo.safe_to_add.length} companies</strong> will be added without any issues.
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={() => onResolve('cancel')}
          variant="outlined"
          sx={{
            borderColor: '#dadce0',
            color: '#5f6368',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              borderColor: '#dadce0',
            },
          }}
        >
          Cancel
        </Button>

        {hasConflicts && (
          <Button
            onClick={() => onResolve('skip')}
            variant="outlined"
            sx={{
              borderColor: '#fbbc04',
              color: '#ea8600',
              '&:hover': {
                bgcolor: 'rgba(251, 188, 4, 0.04)',
                borderColor: '#fbbc04',
              },
            }}
          >
            Skip Conflicts ({conflictInfo.safe_to_add.length} companies)
          </Button>
        )}

        <Button
          onClick={() => onResolve('move')}
          variant="contained"
          sx={{
            bgcolor: '#1a73e8',
            '&:hover': {
              bgcolor: '#1967d2',
            },
          }}
        >
          {hasConflicts 
            ? `Move All (${conflictInfo.safe_to_add.length + conflictInfo.conflicts.length} companies)`
            : `Add ${conflictInfo.safe_to_add.length} Companies`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionDialog;