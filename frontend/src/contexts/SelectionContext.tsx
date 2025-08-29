import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface SelectionContextType {
    selectedCompanyIds: Set<number>;
    isAllSelected: boolean;
    totalInCollection: number;
    setTotalInCollection: (total: number) => void;
    toggleSelection: (companyId: number) => void;
    toggleAllSelection: (allCompanyIds: number[]) => void;
    selectAll: (companyIds: number[]) => void;
    clearSelection: () => void;
    isSelected: (companyId: number) => boolean;
    getSelectedCount: () => number;
    getSelectedIds: () => number[];
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
};

interface SelectionProviderProps {
    children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [totalInCollection, setTotalInCollection] = useState(0);

    const toggleSelection = useCallback((companyId: number) => {
        setSelectedCompanyIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(companyId)) {
                newSet.delete(companyId);
            } else {
                newSet.add(companyId);
            }
            // If we deselect an item, we're no longer selecting all
            if (newSet.size < totalInCollection) {
                setIsAllSelected(false);
            }
            return newSet;
        });
    }, [totalInCollection]);

    const toggleAllSelection = useCallback((allCompanyIds: number[]) => {
        if (isAllSelected || selectedCompanyIds.size === allCompanyIds.length) {
            clearSelection();
        } else {
            selectAll(allCompanyIds);
        }
    }, [isAllSelected, selectedCompanyIds.size]);

    const selectAll = useCallback((companyIds: number[]) => {
        setSelectedCompanyIds(new Set(companyIds));
        setIsAllSelected(true);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedCompanyIds(new Set());
        setIsAllSelected(false);
    }, []);

    const isSelected = useCallback((companyId: number) => {
        return selectedCompanyIds.has(companyId);
    }, [selectedCompanyIds]);

    const getSelectedCount = useCallback(() => {
        return selectedCompanyIds.size;
    }, [selectedCompanyIds]);

    const getSelectedIds = useCallback(() => {
        return Array.from(selectedCompanyIds);
    }, [selectedCompanyIds]);

    const value: SelectionContextType = {
        selectedCompanyIds,
        isAllSelected,
        totalInCollection,
        setTotalInCollection,
        toggleSelection,
        toggleAllSelection,
        selectAll,
        clearSelection,
        isSelected,
        getSelectedCount,
        getSelectedIds,
    };

    return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};