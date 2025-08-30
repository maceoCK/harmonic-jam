import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  Box,
  TextField,
  Button,
  Divider,
  Typography,
  FormControl,
  Select,
  Chip,
  OutlinedInput,
  Slider,
  IconButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  FilterList,
  Clear,
  Check,
} from '@mui/icons-material';

export interface ColumnFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in';
  value: any;
}

export interface ColumnSort {
  field: string;
  sort: 'asc' | 'desc';
}

interface ColumnFilterMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  field: string;
  fieldType: 'string' | 'number' | 'select' | 'year';
  currentFilter?: ColumnFilter;
  currentSort?: ColumnSort;
  onFilterChange: (filter: ColumnFilter | null) => void;
  onSortChange: (sort: ColumnSort | null) => void;
  availableOptions?: string[]; // For select fields
}

const ColumnFilterMenu: React.FC<ColumnFilterMenuProps> = ({
  anchorEl,
  open,
  onClose,
  field,
  fieldType,
  currentFilter,
  currentSort,
  onFilterChange,
  onSortChange,
  availableOptions = [],
}) => {
  const [filterValue, setFilterValue] = useState<any>(currentFilter?.value || '');
  const [rangeValue, setRangeValue] = useState<[number, number]>([0, 100000]);
  const [selectedOperator, setSelectedOperator] = useState<string>(currentFilter?.operator || (fieldType === 'string' ? 'contains' : 'equals'));

  const handleSort = (direction: 'asc' | 'desc') => {
    onSortChange({ field, sort: direction });
    onClose();
  };

  const handleClearSort = () => {
    onSortChange(null);
  };

  const handleApplyFilter = () => {
    if (fieldType === 'string' && filterValue) {
      onFilterChange({
        field,
        operator: 'contains',
        value: filterValue,
      });
    } else if (fieldType === 'number') {
      if (selectedOperator === 'between' && rangeValue) {
        onFilterChange({
          field,
          operator: 'between',
          value: rangeValue,
        });
      } else if (selectedOperator !== 'between' && filterValue) {
        onFilterChange({
          field,
          operator: selectedOperator as any,
          value: Number(filterValue),
        });
      }
    } else if (fieldType === 'select' && filterValue.length > 0) {
      onFilterChange({
        field,
        operator: 'in',
        value: filterValue,
      });
    } else if (fieldType === 'year') {
      if (selectedOperator === 'between' && rangeValue) {
        onFilterChange({
          field,
          operator: 'between',
          value: rangeValue,
        });
      } else if (selectedOperator !== 'between' && filterValue) {
        onFilterChange({
          field,
          operator: selectedOperator as any,
          value: Number(filterValue),
        });
      }
    }
    onClose();
  };

  const handleClearFilter = () => {
    onFilterChange(null);
    setFilterValue('');
    setRangeValue([0, 100000]);
    onClose();
  };

  const getFieldLabel = () => {
    return field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: { minWidth: 280 }
      }}
    >
      {/* Sort Options */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Sort
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={currentSort?.sort === 'asc' ? 'contained' : 'outlined'}
            startIcon={<ArrowUpward fontSize="small" />}
            onClick={() => handleSort('asc')}
            sx={{ flex: 1 }}
          >
            Asc
          </Button>
          <Button
            size="small"
            variant={currentSort?.sort === 'desc' ? 'contained' : 'outlined'}
            startIcon={<ArrowDownward fontSize="small" />}
            onClick={() => handleSort('desc')}
            sx={{ flex: 1 }}
          >
            Desc
          </Button>
          {currentSort && (
            <IconButton size="small" onClick={handleClearSort}>
              <Clear fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Filter Options */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Filter {getFieldLabel()}
        </Typography>

        {fieldType === 'string' && (
          <TextField
            size="small"
            fullWidth
            placeholder="Contains..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleApplyFilter();
              }
            }}
          />
        )}

        {fieldType === 'number' && (
          <Box>
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <Select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
              >
                <MenuItem value="equals">Equals</MenuItem>
                <MenuItem value="gt">Greater than</MenuItem>
                <MenuItem value="gte">Greater than or equal</MenuItem>
                <MenuItem value="lt">Less than</MenuItem>
                <MenuItem value="lte">Less than or equal</MenuItem>
                <MenuItem value="between">Between</MenuItem>
              </Select>
            </FormControl>
            {selectedOperator === 'between' ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Min"
                  value={rangeValue[0]}
                  onChange={(e) => setRangeValue([Number(e.target.value), rangeValue[1]])}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2">-</Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Max"
                  value={rangeValue[1]}
                  onChange={(e) => setRangeValue([rangeValue[0], Number(e.target.value)])}
                  sx={{ flex: 1 }}
                />
              </Box>
            ) : (
              <TextField
                size="small"
                type="number"
                fullWidth
                placeholder="Value"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilter();
                  }
                }}
              />
            )}
          </Box>
        )}

        {fieldType === 'year' && (
          <Box>
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <Select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
              >
                <MenuItem value="equals">Equals</MenuItem>
                <MenuItem value="gt">After</MenuItem>
                <MenuItem value="gte">After or in</MenuItem>
                <MenuItem value="lt">Before</MenuItem>
                <MenuItem value="lte">Before or in</MenuItem>
                <MenuItem value="between">Between</MenuItem>
              </Select>
            </FormControl>
            {selectedOperator === 'between' ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Start year"
                  value={rangeValue[0]}
                  onChange={(e) => setRangeValue([Number(e.target.value), rangeValue[1]])}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2">-</Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="End year"
                  value={rangeValue[1]}
                  onChange={(e) => setRangeValue([rangeValue[0], Number(e.target.value)])}
                  sx={{ flex: 1 }}
                />
              </Box>
            ) : (
              <TextField
                size="small"
                type="number"
                fullWidth
                placeholder="Year"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilter();
                  }
                }}
              />
            )}
          </Box>
        )}

        {fieldType === 'select' && (
          <FormControl size="small" fullWidth>
            <Select
              multiple
              value={filterValue || []}
              onChange={(e) => setFilterValue(e.target.value)}
              input={<OutlinedInput />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {availableOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  <ListItemIcon>
                    {(filterValue || []).includes(option) && <Check />}
                  </ListItemIcon>
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            size="small"
            variant="contained"
            fullWidth
            onClick={handleApplyFilter}
            disabled={!filterValue && (!rangeValue || rangeValue[0] === rangeValue[1])}
          >
            Apply Filter
          </Button>
          {currentFilter && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearFilter}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>
    </Menu>
  );
};

export default ColumnFilterMenu;