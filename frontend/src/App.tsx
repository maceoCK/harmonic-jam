import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Snackbar, Alert, Box, Paper, Typography, List, ListItem, ListItemButton, ListItemText, Chip } from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import EnhancedCompanyTable from "./components/EnhancedCompanyTable";
import BulkActionBar from "./components/BulkActionBar";
import ConfirmationDialog from "./components/ConfirmationDialog";
import ConflictResolutionDialog, { ConflictInfo } from "./components/ConflictResolutionDialog";
import ClearStatusesDialog from "./components/ClearStatusesDialog";
import ProgressModal from "./components/ProgressModal";
import CompanyDetailDrawer from "./components/CompanyDetailDrawer";
import SmartFilters, { FilterState } from "./components/SmartFilters";
import { 
  getCollectionsMetadata, 
  bulkAddCompanies, 
  bulkRemoveCompanies,
  getAllCompanyIdsInCollection,
  checkConflicts,
  checkStatuses,
  ICompany,
  getCompanyById,
} from "./utils/jam-api";
import useApi from "./utils/useApi";
import useWebSocket from "./hooks/useWebSocket";
import { SelectionProvider, useSelection } from "./contexts/SelectionContext";

// Professional light theme inspired by Google Docs
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8', // Google blue
      light: '#4285f4',
      dark: '#1967d2',
    },
    secondary: {
      main: '#5f6368', // Google grey
      light: '#80868b',
      dark: '#3c4043',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    divider: '#e8eaed',
    success: {
      main: '#188038',
    },
    error: {
      main: '#d33b27',
    },
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 400,
      letterSpacing: 0,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 400,
      letterSpacing: 0,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 4,
          padding: '6px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
          },
        },
        outlined: {
          borderColor: '#dadce0',
          '&:hover': {
            backgroundColor: 'rgba(26, 115, 232, 0.04)',
            borderColor: '#dadce0',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
        },
        elevation0: {
          boxShadow: 'none',
          border: '1px solid #e8eaed',
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: '#e8eaed',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #e8eaed',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e8eaed',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #e8eaed',
          },
        },
      },
    },
  },
});

function AppContent() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const { data: collectionResponse } = useApi(() => getCollectionsMetadata());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    itemCount: number;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', itemCount: 0, onConfirm: () => {} });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<{
    id: string;
    title: string;
    total?: number;
    processed?: number;
  } | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  // New state for rich company data features
  const [selectedCompany, setSelectedCompany] = useState<ICompany | null>(null);
  const [companyDetailOpen, setCompanyDetailOpen] = useState(false);
  
  // Global filter and sort state
  const [globalFilters, setGlobalFilters] = useState<FilterState>({
    industries: [],
    stages: [],
    employeeRange: [0, 10000],
    fundingRange: [0, 100000000],
    foundedYearRange: [1900, new Date().getFullYear()],
  });
  const [sortModel, setSortModel] = useState<{ field: string; sort: 'asc' | 'desc' } | null>(null);
  
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflictInfo: ConflictInfo | null;
    targetCollectionId: string;
    targetCollectionName: string;
    companyIds: number[];
  }>({
    open: false,
    conflictInfo: null,
    targetCollectionId: '',
    targetCollectionName: '',
    companyIds: [],
  });
  
  const [clearStatusesDialog, setClearStatusesDialog] = useState<{
    open: boolean;
    totalSelected: number;
    likedCount: number;
    ignoredCount: number;
    noStatusCount: number;
    likedIds: number[];
    ignoredIds: number[];
  }>({
    open: false,
    totalSelected: 0,
    likedCount: 0,
    ignoredCount: 0,
    noStatusCount: 0,
    likedIds: [],
    ignoredIds: [],
  });
  
  const { selectAll, clearSelection, getSelectedIds, selectedCompanyIds } = useSelection();
  
  const handleCompanySelect = useCallback(async (company: ICompany) => {
    try {
      // Fetch full company details if needed
      const fullCompany = await getCompanyById(company.id);
      setSelectedCompany(fullCompany);
      setCompanyDetailOpen(true);
    } catch (error) {
      console.error('Error fetching company details:', error);
      // Fallback to using the partial data
      setSelectedCompany(company);
      setCompanyDetailOpen(true);
    }
  }, []);
  
  
  const handleClearStatuses = useCallback(async (companyIds: number[]) => {
    const likedCollection = collectionResponse?.find(c => c.collection_name === 'Liked Companies List');
    const ignoreCollection = collectionResponse?.find(c => c.collection_name === 'Companies to Ignore List');
    
    if (!likedCollection || !ignoreCollection) {
      console.error('Could not find liked or ignore collections');
      return;
    }
    
    // First check which companies actually have statuses
    setIsProcessing(true);
    try {
      const statusCheck = await checkStatuses({ company_ids: companyIds });
      setIsProcessing(false);
      
      // Store the status check data for the dialog
      setClearStatusesDialog({
        open: true,
        totalSelected: companyIds.length,
        likedCount: statusCheck.liked_count,
        ignoredCount: statusCheck.ignored_count,
        noStatusCount: statusCheck.no_status_count,
        likedIds: statusCheck.liked_ids,
        ignoredIds: statusCheck.ignored_ids,
      });
    } catch (error) {
      console.error('Error checking statuses:', error);
      setNotification({
        open: true,
        message: 'Failed to check company statuses',
        severity: 'error',
      });
      setIsProcessing(false);
    }
  }, [collectionResponse]);
  
  const handleClearStatusesConfirm = useCallback(async () => {
    setClearStatusesDialog(prev => ({ ...prev, open: false }));
    
    const likedCollection = collectionResponse?.find(c => c.collection_name === 'Liked Companies List');
    const ignoreCollection = collectionResponse?.find(c => c.collection_name === 'Companies to Ignore List');
    
    if (!likedCollection || !ignoreCollection) {
      console.error('Could not find liked or ignore collections');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Remove from both liked and ignore collections
      const promises = [];
      
      // Only remove from liked list if there are liked companies
      if (clearStatusesDialog.likedCount > 0) {
        promises.push(bulkRemoveCompanies(likedCollection.id, clearStatusesDialog.likedIds).catch(err => {
          console.log('Error removing from liked list:', err);
        }));
      }
      
      // Only remove from ignore list if there are ignored companies  
      if (clearStatusesDialog.ignoredCount > 0) {
        promises.push(bulkRemoveCompanies(ignoreCollection.id, clearStatusesDialog.ignoredIds).catch(err => {
          console.log('Error removing from ignore list:', err);
        }));
      }
      
      await Promise.all(promises);
      
      const totalCleared = clearStatusesDialog.likedCount + clearStatusesDialog.ignoredCount;
      setNotification({
        open: true,
        message: `Cleared statuses for ${totalCleared} companies`,
        severity: 'success',
      });
      
      // Refresh the table
      window.location.reload();
    } catch (error) {
      console.error('Error clearing statuses:', error);
      setNotification({
        open: true,
        message: 'Failed to clear statuses',
        severity: 'error',
      });
    } finally {
      setIsProcessing(false);
      clearSelection();
    }
  }, [collectionResponse, clearStatusesDialog, clearSelection]);
  
  // WebSocket connection for progress updates
  const wsUrl = currentOperation 
    ? `ws://localhost:8000/ws/operations/${currentOperation.id}`
    : null;
  const { lastMessage } = useWebSocket(wsUrl);

  useEffect(() => {
    setSelectedCollectionId(collectionResponse?.[0]?.id);
  }, [collectionResponse]);

  useEffect(() => {
    if (selectedCollectionId) {
      window.history.pushState({}, "", `?collection=${selectedCollectionId}`);
    }
  }, [selectedCollectionId]);

  const handleSelectAll = useCallback(async () => {
    if (!selectedCollectionId) return;
    setIsProcessing(true);
    try {
      const allIds = await getAllCompanyIdsInCollection(selectedCollectionId);
      selectAll(allIds);
    } catch (error) {
      console.error('Error selecting all:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCollectionId, selectAll]);

  const handleBulkAdd = useCallback(async (targetCollectionId: string, companyIds: number[]) => {
    const targetCollection = collectionResponse?.find(c => c.id === targetCollectionId);
    
    // First, check for conflicts
    setIsProcessing(true);
    try {
      const conflictCheck = await checkConflicts({
        company_ids: companyIds,
        target_collection_id: targetCollectionId,
      });

      // If there are conflicts or duplicates, show the conflict resolution dialog
      if (conflictCheck.conflicts.length > 0 || conflictCheck.duplicates.length > 0) {
        setConflictDialog({
          open: true,
          conflictInfo: conflictCheck,
          targetCollectionId,
          targetCollectionName: targetCollection?.collection_name || '',
          companyIds,
        });
        setIsProcessing(false);
        return;
      }

      // No conflicts, proceed with the operation
      await proceedWithBulkAdd(targetCollectionId, companyIds, targetCollection?.collection_name || '');
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setNotification({
        open: true,
        message: 'Failed to check for conflicts',
        severity: 'error',
      });
      setIsProcessing(false);
    }
  }, [collectionResponse]);

  const proceedWithBulkAdd = async (targetCollectionId: string, companyIds: number[], collectionName: string) => {
    setIsProcessing(true);
    try {
      const operationTitle = `Adding ${companyIds.length.toLocaleString()} companies to ${collectionName}`;
      
      // Generate predictable operation ID that matches backend format
      const timestamp = Math.floor(Date.now() / 1000);
      const predictedOperationId = `add_${targetCollectionId}_${timestamp}`;
      
      // Set the operation state FIRST to establish WebSocket connection
      setCurrentOperation({
        id: predictedOperationId,
        title: operationTitle,
        total: companyIds.length,
        processed: 0
      });
      
      // Wait for WebSocket to connect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Start the bulk operation
      const response = await bulkAddCompanies(targetCollectionId, companyIds);
      
      // Update with actual operation ID if different
      if (response.operation_id !== predictedOperationId) {
        setCurrentOperation(prev => prev ? {
          ...prev,
          id: response.operation_id
        } : null);
      }
    } catch (error) {
      console.error('Error adding companies:', error);
      setNotification({
        open: true,
        message: 'Failed to start bulk add operation',
        severity: 'error'
      });
      setIsProcessing(false);
      setCurrentOperation(null);
    }
  };

  const handleBulkRemove = useCallback((companyIds: number[]) => {
    if (!selectedCollectionId) return;
    const currentCollection = collectionResponse?.find(c => c.id === selectedCollectionId);
    const estimatedTime = companyIds.length > 100 
      ? `${Math.ceil(companyIds.length * 0.1)} seconds`
      : 'A few seconds';

    setConfirmDialog({
      open: true,
      title: 'Remove Companies from Collection',
      message: `Remove ${companyIds.length.toLocaleString()} companies from "${currentCollection?.collection_name}"?`,
      itemCount: companyIds.length,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        setIsProcessing(true);
        try {
          const operationTitle = `Removing ${companyIds.length.toLocaleString()} companies from ${currentCollection?.collection_name}`;
          
          // Generate predictable operation ID that matches backend format
          const timestamp = Math.floor(Date.now() / 1000);
          const predictedOperationId = `remove_${selectedCollectionId}_${timestamp}`;
          
          // Set the operation state FIRST to establish WebSocket connection
          setCurrentOperation({
            id: predictedOperationId,
            title: operationTitle,
            total: companyIds.length,
            processed: 0
          });
          
          // Wait for WebSocket to connect
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Start the bulk operation
          const response = await bulkRemoveCompanies(selectedCollectionId, companyIds);
          
          // Update with actual operation ID if different
          if (response.operation_id !== predictedOperationId) {
            setCurrentOperation(prev => prev ? {
              ...prev,
              id: response.operation_id
            } : null);
          }
        } catch (error) {
          console.error('Error removing companies:', error);
          setNotification({
            open: true,
            message: 'Failed to start bulk remove operation',
            severity: 'error'
          });
          setIsProcessing(false);
          setCurrentOperation(null);
        }
      }
    });
  }, [selectedCollectionId, collectionResponse, clearSelection]);

  const handleOperationComplete = useCallback(() => {
    setCurrentOperation(null);
    setIsProcessing(false);
    clearSelection();
    setNotification({
      open: true,
      message: 'Operation completed successfully!',
      severity: 'success'
    });
    // Trigger a refresh of the table data
    window.location.reload(); // Simple refresh for now
  }, [clearSelection]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f8f9fa', margin: 0, padding: 0 }}>
      {/* Sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: 260,
          borderRight: '1px solid #e8eaed',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
        }}
      >
        {/* Logo/Title */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e8eaed' }}>
          <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
            Harmonic Jam
          </Typography>
        </Box>
        
        {/* Collections */}
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Typography
            variant="overline"
            sx={{ px: 1, color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}
          >
            Collections
          </Typography>
          <List sx={{ mt: 1 }}>
            {collectionResponse?.map((collection) => (
              <ListItem key={collection.id} disablePadding>
                <ListItemButton
                  selected={selectedCollectionId === collection.id}
                  onClick={() => setSelectedCollectionId(collection.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(26, 115, 232, 0.08)',
                      '&:hover': {
                        bgcolor: 'rgba(26, 115, 232, 0.12)',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <ListItemText 
                    primary={collection.collection_name}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: selectedCollectionId === collection.id ? 500 : 400,
                    }}
                  />
                  <Chip
                    label={collection.collection_count || 0}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      bgcolor: selectedCollectionId === collection.id ? 'primary.main' : '#e8eaed',
                      color: selectedCollectionId === collection.id ? 'white' : 'text.secondary',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
        {/* Smart Filters */}
        <SmartFilters
          filters={globalFilters}
          onFiltersChange={setGlobalFilters}
          onApplyFilters={() => {
            // Trigger refresh with filters
            window.location.reload(); // TODO: Implement proper filter application
          }}
        />
        
        {selectedCollectionId && collectionResponse && (
          <>
            {/* Action Bar - Only show container when items selected */}
            {selectedCompanyIds.size > 0 && (
              <Box sx={{ p: 2, borderBottom: '1px solid #e8eaed' }}>
                <BulkActionBar
                  collections={collectionResponse}
                  currentCollectionId={selectedCollectionId}
                  onBulkAdd={handleBulkAdd}
                  onBulkRemove={handleBulkRemove}
                  onSelectAll={handleSelectAll}
                  onClearStatuses={handleClearStatuses}
                  isLoading={isProcessing}
                />
              </Box>
            )}
            
            {/* Table */}
            <Box sx={{ flex: 1, p: 2, overflow: 'hidden' }}>
              <EnhancedCompanyTable 
                selectedCollectionId={selectedCollectionId}
                collections={collectionResponse}
                filters={globalFilters}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                onCompanySelect={handleCompanySelect}
              />
            </Box>
          </>
        )}
      </Box>
      
      <ClearStatusesDialog
        open={clearStatusesDialog.open}
        onClose={() => setClearStatusesDialog(prev => ({ ...prev, open: false }))}
        onConfirm={handleClearStatusesConfirm}
        totalSelected={clearStatusesDialog.totalSelected}
        likedCount={clearStatusesDialog.likedCount}
        ignoredCount={clearStatusesDialog.ignoredCount}
        noStatusCount={clearStatusesDialog.noStatusCount}
      />
      
      <ConflictResolutionDialog
        open={conflictDialog.open}
        onClose={() => setConflictDialog(prev => ({ ...prev, open: false }))}
        conflictInfo={conflictDialog.conflictInfo}
        targetCollectionName={conflictDialog.targetCollectionName}
        onResolve={async (action) => {
          if (action === 'cancel') {
            setConflictDialog(prev => ({ ...prev, open: false }));
            return;
          }

          const { conflictInfo, targetCollectionId, companyIds } = conflictDialog;
          if (!conflictInfo) return;

          let idsToAdd: number[] = [];
          if (action === 'move') {
            // Add all non-duplicate companies (safe + conflicts)
            idsToAdd = [...conflictInfo.safe_to_add, ...conflictInfo.conflicts.map(c => c.company_id)];
          } else if (action === 'skip') {
            // Only add safe companies
            idsToAdd = conflictInfo.safe_to_add;
          }

          setConflictDialog(prev => ({ ...prev, open: false }));
          
          if (idsToAdd.length > 0) {
            await proceedWithBulkAdd(targetCollectionId, idsToAdd, conflictDialog.targetCollectionName);
          } else {
            setNotification({
              open: true,
              message: 'No companies to add after resolving conflicts',
              severity: 'info',
            });
          }
        }}
      />
      
      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemCount={confirmDialog.itemCount}
        estimatedTime={confirmDialog.itemCount > 100 
          ? `${Math.ceil(confirmDialog.itemCount * 0.1)} seconds`
          : 'A few seconds'}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
      
      <ProgressModal
        open={currentOperation !== null}
        operationId={currentOperation?.id || null}
        title={currentOperation?.title || ''}
        onClose={() => setCurrentOperation(null)}
        onComplete={handleOperationComplete}
        webSocketMessage={lastMessage}
        initialTotal={currentOperation?.total}
        initialProcessed={currentOperation?.processed}
      />
      
      <CompanyDetailDrawer
        company={selectedCompany}
        open={companyDetailOpen}
        onClose={() => {
          setCompanyDetailOpen(false);
          setSelectedCompany(null);
        }}
      />
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <SelectionProvider>
        <AppContent />
      </SelectionProvider>
    </ThemeProvider>
  );
}

export default App;
