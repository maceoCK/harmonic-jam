import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useEffect, useState, useCallback } from "react";
import CompanyTable from "./components/CompanyTable";
import BulkActionBar from "./components/BulkActionBar";
import ConfirmationDialog from "./components/ConfirmationDialog";
import { 
  getCollectionsMetadata, 
  bulkAddCompanies, 
  bulkRemoveCompanies,
  getAllCompanyIdsInCollection,
} from "./utils/jam-api";
import useApi from "./utils/useApi";
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
  
  const { selectAll, clearSelection, getSelectedIds } = useSelection();

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
          await bulkAddCompanies(targetCollectionId, companyIds);
          clearSelection();
          // TODO: Add success notification
        } catch (error) {
          console.error('Error adding companies:', error);
          // TODO: Add error notification
        } finally {
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
          await bulkRemoveCompanies(selectedCollectionId, companyIds);
          clearSelection();
          // TODO: Add success notification
        } catch (error) {
          console.error('Error removing companies:', error);
          // TODO: Add error notification
        } finally {
          setIsProcessing(false);
        }
      }
    });
  }, [selectedCollectionId, collectionResponse, clearSelection]);

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
