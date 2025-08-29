import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ClearIcon from '@mui/icons-material/Clear';

interface ClearStatusesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalSelected: number;
  likedCount: number;
  ignoredCount: number;
  noStatusCount: number;
}

const ClearStatusesDialog: React.FC<ClearStatusesDialogProps> = ({
  open,
  onClose,
  onConfirm,
  totalSelected,
  likedCount,
  ignoredCount,
  noStatusCount,
}) => {
  const totalAffected = likedCount + ignoredCount;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#202124' }}>
          Review Before Clearing Statuses
        </Typography>
        <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
          Clearing statuses for {totalSelected.toLocaleString()} companies
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Summary Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          {totalAffected > 0 && (
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a73e8' }}>
                {totalAffected.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                will be cleared
              </Typography>
            </Box>
          )}
          {noStatusCount > 0 && (
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#5f6368' }}>
                {noStatusCount.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                no changes
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Breakdown by status */}
        {likedCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FavoriteIcon sx={{ color: '#ea4335', fontSize: 20 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {likedCount.toLocaleString()} companies in Liked List
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#5f6368', ml: 3.5 }}>
              Will be removed from Liked List
            </Typography>
          </Box>
        )}

        {ignoredCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <VisibilityOffIcon sx={{ color: '#5f6368', fontSize: 20 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {ignoredCount.toLocaleString()} companies in Ignore List
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#5f6368', ml: 3.5 }}>
              Will be removed from Ignore List
            </Typography>
          </Box>
        )}

        {/* Info alert */}
        {totalAffected > 0 ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            {totalAffected.toLocaleString()} companies will have their liked/ignored statuses cleared.
            {noStatusCount > 0 && ` ${noStatusCount.toLocaleString()} companies have no status and won't be affected.`}
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 3 }}>
            No companies in your selection have liked or ignored statuses. Nothing to clear.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={totalAffected === 0}
          startIcon={<ClearIcon />}
          sx={{
            bgcolor: '#1a73e8',
            '&:hover': {
              bgcolor: '#1967d2',
            },
          }}
        >
          Clear {totalAffected > 0 ? totalAffected.toLocaleString() : ''} Statuses
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClearStatusesDialog;