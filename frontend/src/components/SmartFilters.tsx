import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Slider,
  Typography,
  IconButton,
  Tooltip,
  SelectChangeEvent,
  Button,
} from '@mui/material';
import { Clear, FilterList } from '@mui/icons-material';
import { getIndustries, getCompanyStages } from '../utils/jam-api';

export interface FilterState {
  industries: string[];
  stages: string[];
  employeeRange: [number, number];
  fundingRange: [number, number];
  foundedYearRange: [number, number];
}

interface SmartFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: () => void;
}

const SmartFilters: React.FC<SmartFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
}) => {
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load available filter options
    const loadFilterOptions = async () => {
      try {
        const [industries, stages] = await Promise.all([
          getIndustries(),
          getCompanyStages(),
        ]);
        setAvailableIndustries(industries);
        setAvailableStages(stages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading filter options:', error);
        setIsLoading(false);
      }
    };
    loadFilterOptions();
  }, []);

  const handleIndustryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      industries: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleStageChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      stages: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleEmployeeRangeChange = (event: Event, newValue: number | number[]) => {
    onFiltersChange({
      ...filters,
      employeeRange: newValue as [number, number],
    });
  };

  const handleFundingRangeChange = (event: Event, newValue: number | number[]) => {
    onFiltersChange({
      ...filters,
      fundingRange: newValue as [number, number],
    });
  };

  const handleFoundedYearRangeChange = (event: Event, newValue: number | number[]) => {
    onFiltersChange({
      ...filters,
      foundedYearRange: newValue as [number, number],
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      industries: [],
      stages: [],
      employeeRange: [0, 10000],
      fundingRange: [0, 100000000],
      foundedYearRange: [1900, new Date().getFullYear()],
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.industries.length > 0 ||
      filters.stages.length > 0 ||
      filters.employeeRange[0] > 0 ||
      filters.employeeRange[1] < 10000 ||
      filters.fundingRange[0] > 0 ||
      filters.fundingRange[1] < 100000000 ||
      filters.foundedYearRange[0] > 1900 ||
      filters.foundedYearRange[1] < new Date().getFullYear()
    );
  };

  const formatEmployeeValue = (value: number) => {
    if (value >= 10000) return '10K+';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatFundingValue = (value: number) => {
    if (value >= 100000000) return '$100M+';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: '1px solid #e8eaed',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FilterList sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 0 }}>
          Filters
        </Typography>
        {hasActiveFilters() && (
          <>
            <Chip
              label="Active"
              size="small"
              color="primary"
              sx={{ height: 24 }}
            />
            <Tooltip title="Clear all filters">
              <IconButton size="small" onClick={clearFilters}>
                <Clear fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          onClick={onApplyFilters}
          disabled={!hasActiveFilters()}
          sx={{ textTransform: 'none' }}
        >
          Apply Filters
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        {/* Industry Multi-Select */}
        <FormControl size="small" disabled={isLoading}>
          <InputLabel>Industries</InputLabel>
          <Select
            multiple
            value={filters.industries}
            onChange={handleIndustryChange}
            input={<OutlinedInput label="Industries" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.slice(0, 2).map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
                {selected.length > 2 && (
                  <Chip label={`+${selected.length - 2}`} size="small" />
                )}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  width: 250,
                },
              },
            }}
          >
            {availableIndustries.map((industry) => (
              <MenuItem key={industry} value={industry}>
                {industry}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Stage Multi-Select */}
        <FormControl size="small" disabled={isLoading}>
          <InputLabel>Stages</InputLabel>
          <Select
            multiple
            value={filters.stages}
            onChange={handleStageChange}
            input={<OutlinedInput label="Stages" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.slice(0, 2).map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
                {selected.length > 2 && (
                  <Chip label={`+${selected.length - 2}`} size="small" />
                )}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  width: 250,
                },
              },
            }}
          >
            {availableStages.map((stage) => (
              <MenuItem key={stage} value={stage}>
                {stage}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Employee Range Slider */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Employees: {formatEmployeeValue(filters.employeeRange[0])} - {formatEmployeeValue(filters.employeeRange[1])}
          </Typography>
          <Slider
            value={filters.employeeRange}
            onChange={handleEmployeeRangeChange}
            valueLabelDisplay="auto"
            valueLabelFormat={formatEmployeeValue}
            min={0}
            max={10000}
            step={100}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Funding Range Slider */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Funding: {formatFundingValue(filters.fundingRange[0])} - {formatFundingValue(filters.fundingRange[1])}
          </Typography>
          <Slider
            value={filters.fundingRange}
            onChange={handleFundingRangeChange}
            valueLabelDisplay="auto"
            valueLabelFormat={formatFundingValue}
            min={0}
            max={100000000}
            step={1000000}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Founded Year Range Slider */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Founded: {filters.foundedYearRange[0]} - {filters.foundedYearRange[1]}
          </Typography>
          <Slider
            value={filters.foundedYearRange}
            onChange={handleFoundedYearRangeChange}
            valueLabelDisplay="auto"
            min={1900}
            max={new Date().getFullYear()}
            step={1}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default SmartFilters;