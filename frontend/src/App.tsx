import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Snackbar, Alert } from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import CompanyTable from "./components/CompanyTable";
import BulkActionBar from "./components/BulkActionBar";
import ConfirmationDialog from "./components/ConfirmationDialog";
import ProgressModal from "./components/ProgressModal";
import { 
  getCollectionsMetadata, 
  bulkAddCompanies, 
  bulkRemoveCompanies,
  getAllCompanyIdsInCollection,
} from "./utils/jam-api";
import useApi from "./utils/useApi";
import useWebSocket from "./hooks/useWebSocket";
import { SelectionProvider, useSelection } from "./contexts/SelectionContext";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
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
  } | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  const { selectAll, clearSelection, getSelectedIds } = useSelection();
  
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

  const handleBulkAdd = useCallback((targetCollectionId: string, companyIds: number[]) => {
    const targetCollection = collectionResponse?.find(c => c.id === targetCollectionId);
    const estimatedTime = companyIds.length > 100 
      ? `${Math.ceil(companyIds.length * 0.1)} seconds`
      : 'A few seconds';

    setConfirmDialog({
      open: true,
      title: 'Add Companies to Collection',
      message: `Add ${companyIds.length.toLocaleString()} companies to "${targetCollection?.collection_name}"?`,
      itemCount: companyIds.length,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        setIsProcessing(true);
        try {
          // Set the operation first to establish WebSocket connection
          const operationTitle = `Adding ${companyIds.length.toLocaleString()} companies to ${targetCollection?.collection_name}`;
          
          // Start the bulk operation
          const response = await bulkAddCompanies(targetCollectionId, companyIds);
          
          // Set the operation state which will trigger WebSocket connection
          setCurrentOperation({
            id: response.operation_id,
            title: operationTitle
          });
        } catch (error) {
          console.error('Error adding companies:', error);
          setNotification({
            open: true,
            message: 'Failed to start bulk add operation',
            severity: 'error'
          });
          setIsProcessing(false);
        }
      }
    });
  }, [collectionResponse, clearSelection]);

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
          // Set the operation first to establish WebSocket connection
          const operationTitle = `Removing ${companyIds.length.toLocaleString()} companies from ${currentCollection?.collection_name}`;
          
          // Start the bulk operation
          const response = await bulkRemoveCompanies(selectedCollectionId, companyIds);
          
          // Set the operation state which will trigger WebSocket connection
          setCurrentOperation({
            id: response.operation_id,
            title: operationTitle
          });
        } catch (error) {
          console.error('Error removing companies:', error);
          setNotification({
            open: true,
            message: 'Failed to start bulk remove operation',
            severity: 'error'
          });
          setIsProcessing(false);
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
    <>
      <div className="mx-8">
        <div className="font-bold text-xl border-b p-2 mb-4 text-left">
          Harmonic Jam
        </div>
        <div className="flex">
          <div className="w-1/5">
            <p className=" font-bold border-b mb-2 pb-2 text-left">
              Collections
            </p>
            <div className="flex flex-col gap-2 text-left">
              {collectionResponse?.map((collection) => {
                return (
                  <div
                    key={collection.id}
                    className={`py-1 pl-4 hover:cursor-pointer hover:bg-orange-300 ${
                      selectedCollectionId === collection.id &&
                      "bg-orange-500 font-bold"
                    }`}
                    onClick={() => {
                      setSelectedCollectionId(collection.id);
                    }}
                  >
                    {collection.collection_name}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-4/5 ml-4">
            {selectedCollectionId && collectionResponse && (
              <>
                <BulkActionBar
                  collections={collectionResponse}
                  currentCollectionId={selectedCollectionId}
                  onBulkAdd={handleBulkAdd}
                  onBulkRemove={handleBulkRemove}
                  onSelectAll={handleSelectAll}
                  isLoading={isProcessing}
                />
                <CompanyTable selectedCollectionId={selectedCollectionId} />
              </>
            )}
          </div>
        </div>
      </div>
      
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
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SelectionProvider>
        <AppContent />
      </SelectionProvider>
    </ThemeProvider>
  );
}

export default App;
