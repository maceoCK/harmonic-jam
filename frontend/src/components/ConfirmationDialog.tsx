import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  itemCount: number;
  estimatedTime?: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  itemCount,
  estimatedTime,
  warningMessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {itemCount > 1000 && <WarningIcon color="warning" />}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Number of items: <strong>{itemCount.toLocaleString()}</strong>
          </Typography>
          
          {estimatedTime && (
            <Typography variant="body2" color="text.secondary">
              Estimated time: <strong>{estimatedTime}</strong>
            </Typography>
          )}
        </Box>

        {warningMessage && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {warningMessage}
          </Alert>
        )}

        {itemCount > 1000 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            This is a large operation. The UI will show progress updates as items are processed.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;