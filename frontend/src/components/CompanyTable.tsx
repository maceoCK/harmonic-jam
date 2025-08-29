import { DataGrid, GridRowSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState, useCallback } from "react";
import { getCollectionsById, getAllCompanyIdsInCollection, ICompany } from "../utils/jam-api";
import { useSelection } from "../contexts/SelectionContext";

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  
  const {
    selectedCompanyIds,
    isAllSelected,
    setTotalInCollection,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useSelection();

  useEffect(() => {
    setLoading(true);
    getCollectionsById(props.selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
        setTotalInCollection(newResponse.total);
        setLoading(false);
      }
    );
  }, [props.selectedCollectionId, offset, pageSize, setTotalInCollection]);

  useEffect(() => {
    setOffset(0);
    clearSelection(); // Clear selection when switching collections
  }, [props.selectedCollectionId, clearSelection]);

  const handleSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    // Clear current page selections first
    const currentPageIds = response.map(company => company.id);
    currentPageIds.forEach(id => {
      if (selectedCompanyIds.has(id) && !newSelection.includes(id)) {
        toggleSelection(id);
      }
    });
    
    // Add new selections
    newSelection.forEach(id => {
      if (!selectedCompanyIds.has(Number(id))) {
        toggleSelection(Number(id));
      }
    });
  }, [response, selectedCompanyIds, toggleSelection]);

  const handleSelectAll = useCallback(async () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      setLoading(true);
      try {
        const allIds = await getAllCompanyIdsInCollection(props.selectedCollectionId);
        selectAll(allIds);
      } catch (error) {
        console.error('Error selecting all companies:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [isAllSelected, clearSelection, selectAll, props.selectedCollectionId]);

  // Get the selected IDs for the current page
  const currentPageSelectedIds = Array.from(selectedCompanyIds).filter(id => 
    response.some(company => company.id === id)
  );

  return (
    <div style={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={response}
        rowHeight={30}
        columns={[
          { field: "liked", headerName: "Liked", width: 90 },
          { field: "id", headerName: "ID", width: 90 },
          { field: "company_name", headerName: "Company Name", width: 200 },
        ]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        rowCount={total}
        pagination
        loading={loading}
        checkboxSelection
        disableRowSelectionOnClick
        keepNonExistentRowsSelected
        rowSelectionModel={currentPageSelectedIds}
        onRowSelectionModelChange={handleSelectionChange}
        paginationMode="server"
        onPaginationModelChange={(newMeta) => {
          setPageSize(newMeta.pageSize);
          setOffset(newMeta.page * newMeta.pageSize);
        }}
        isRowSelectable={() => true}
      />
    </div>
  );
};

export default CompanyTable;
