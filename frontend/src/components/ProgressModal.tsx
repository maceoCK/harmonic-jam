import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { IBulkOperationStatus } from '../utils/jam-api';

interface ProgressModalProps {
  open: boolean;
  operationId: string | null;
  title: string;
  onClose: () => void;
  onComplete?: () => void;
  webSocketMessage?: any;
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  open,
  operationId,
  title,
  onClose,
  onComplete,
  webSocketMessage,
}) => {
  const [status, setStatus] = useState<IBulkOperationStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (webSocketMessage && webSocketMessage.operation_id === operationId) {
      const percentage = webSocketMessage.percentage || 0;
      setProgress(percentage);
      setProcessedCount(webSocketMessage.processed || 0);
      setTotalCount(webSocketMessage.total || 0);
      
      // Calculate estimated time remaining
      if (webSocketMessage.processed > 0 && webSocketMessage.total > 0) {
        const remaining = webSocketMessage.total - webSocketMessage.processed;
        const timePerItem = 0.1; // 100ms per item (from throttle)
        const secondsRemaining = Math.ceil(remaining * timePerItem);
        
        if (secondsRemaining > 60) {
          const minutes = Math.floor(secondsRemaining / 60);
          const seconds = secondsRemaining % 60;
          setEstimatedTimeRemaining(`${minutes}m ${seconds}s remaining`);
        } else {
          setEstimatedTimeRemaining(`${secondsRemaining}s remaining`);
        }
      }

      // Check if operation is complete
      if (webSocketMessage.status === 'completed') {
        setStatus({
          operation_id: webSocketMessage.operation_id,
          status: 'completed',
          total: webSocketMessage.total,
          processed: webSocketMessage.processed,
          errors: [],
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
        
        if (onComplete) {
          setTimeout(onComplete, 1000); // Give user time to see completion
        }
      }
    }
  }, [webSocketMessage, operationId, onComplete]);

  const getStatusIcon = () => {
    if (!status) return <HourglassEmptyIcon />;
    
    switch (status.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <HourglassEmptyIcon color="primary" />;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'primary';
    
    switch (status.status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'primary';
    }
  };

  const canClose = !status || status.status === 'completed' || status.status === 'failed';

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!canClose}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getStatusIcon()}
        {title}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={progress}
            color={getStatusColor()}
            sx={{ height: 8, borderRadius: 1, mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2">
              {processedCount} of {totalCount} processed
            </Typography>
            {estimatedTimeRemaining && progress < 100 && (
              <Chip
                label={estimatedTimeRemaining}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {status?.status === 'completed' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Operation completed successfully!
            </Alert>
          )}

          {status?.status === 'failed' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Operation failed. Please try again.
            </Alert>
          )}

          {status?.errors && status.errors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Errors encountered:
              </Typography>
              {status.errors.slice(0, 5).map((error, index) => (
                <Typography key={index} variant="caption" display="block">
                  • {error}
                </Typography>
              ))}
              {status.errors.length > 5 && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  ...and {status.errors.length - 5} more
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        {canClose && (
          <Button onClick={onClose} variant="contained">
            {status?.status === 'completed' ? 'Done' : 'Close'}
          </Button>
        )}
        {!canClose && (
          <Typography variant="caption" color="text.secondary">
            Please wait for the operation to complete...
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProgressModal;