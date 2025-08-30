import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Slider,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { ICompanyFilters, getIndustries, getCompanyStages } from '../../utils/jam-api';

interface CompanyFiltersProps {
  filters: ICompanyFilters;
  onFiltersChange: (filters: ICompanyFilters) => void;
  onClearFilters: () => void;
}

const CompanyFilters: React.FC<CompanyFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [industries, setIndustries] = useState<string[]>([]);
  const [companyStages, setCompanyStages] = useState<string[]>([]);

  // Funding range state
  const [fundingRange, setFundingRange] = useState<[number, number]>([
    filters.funding_min || 0,
    filters.funding_max || 100000000
  ]);

  useEffect(() => {
    // Load industries and company stages
    const loadData = async () => {
      try {
        const [industriesData, stagesData] = await Promise.all([
          getIndustries(),
          getCompanyStages(),
        ]);
        setIndustries(industriesData);
        setCompanyStages(stagesData);
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    loadData();
  }, []);

  const handleIndustryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selectedIndustries = typeof value === 'string' ? value.split(',') : value;
    onFiltersChange({
      ...filters,
      industries: selectedIndustries,
    });
  };

  const handleStageChange = (stage: string, checked: boolean) => {
    const currentStages = filters.company_stages || [];
    const updatedStages = checked
      ? [...currentStages, stage]
      : currentStages.filter(s => s !== stage);
    
    onFiltersChange({
      ...filters,
      company_stages: updatedStages.length > 0 ? updatedStages : undefined,
    });
  };

  const handleFundingRangeChange = (event: Event, newValue: number | number[]) => {
    const range = newValue as [number, number];
    setFundingRange(range);
  };

  const handleFundingRangeCommitted = (event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const range = newValue as [number, number];
    onFiltersChange({
      ...filters,
      funding_min: range[0] > 0 ? range[0] : undefined,
      funding_max: range[1] < 100000000 ? range[1] : undefined,
    });
  };

  const handleEmployeeCountChange = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value, 10) : undefined;
    onFiltersChange({
      ...filters,
      [`employee_count_${field}`]: numValue,
    });
  };

  const handleFoundedYearChange = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value, 10) : undefined;
    onFiltersChange({
      ...filters,
      [`founded_year_${field}`]: numValue,
    });
  };

  const formatFundingValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const hasActiveFilters = () => {
    return !!(
      filters.industries?.length ||
      filters.company_stages?.length ||
      filters.funding_min ||
      filters.funding_max ||
      filters.employee_count_min ||
      filters.employee_count_max ||
      filters.founded_year_min ||
      filters.founded_year_max
    );
  };

  return (
    <Paper elevation={1} sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <FilterList sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="h6" sx={{ flex: 1, fontSize: '1rem', fontWeight: 500 }}>
          Filters
          {hasActiveFilters() && (
            <Chip
              label="Active"
              size="small"
              color="primary"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Typography>
        {hasActiveFilters() && (
          <Button
            size="small"
            startIcon={<Clear />}
            onClick={(e) => {
              e.stopPropagation();
              onClearFilters();
              setFundingRange([0, 100000000]);
            }}
            sx={{ mr: 1 }}
          >
            Clear
          </Button>
        )}
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            {/* Industry Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Industries</InputLabel>
              <Select
                multiple
                value={filters.industries || []}
                onChange={handleIndustryChange}
                input={<OutlinedInput label="Industries" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {industries.map((industry) => (
                  <MenuItem key={industry} value={industry}>
                    {industry}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Funding Range */}
            <Box>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                Total Funding
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={fundingRange}
                  onChange={handleFundingRangeChange}
                  onChangeCommitted={handleFundingRangeCommitted}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatFundingValue}
                  min={0}
                  max={100000000}
                  step={1000000}
                  marks={[
                    { value: 0, label: '$0' },
                    { value: 25000000, label: '$25M' },
                    { value: 50000000, label: '$50M' },
                    { value: 100000000, label: '$100M+' },
                  ]}
                />
              </Box>
            </Box>

            {/* Employee Count Range */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Min Employees"
                type="number"
                size="small"
                value={filters.employee_count_min || ''}
                onChange={(e) => handleEmployeeCountChange('min', e.target.value)}
                sx={{ flex: 1 }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>to</Typography>
              <TextField
                label="Max Employees"
                type="number"
                size="small"
                value={filters.employee_count_max || ''}
                onChange={(e) => handleEmployeeCountChange('max', e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Founded Year Range */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Founded After"
                type="number"
                size="small"
                value={filters.founded_year_min || ''}
                onChange={(e) => handleFoundedYearChange('min', e.target.value)}
                sx={{ flex: 1 }}
                inputProps={{ min: 1900, max: new Date().getFullYear() }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>to</Typography>
              <TextField
                label="Founded Before"
                type="number"
                size="small"
                value={filters.founded_year_max || ''}
                onChange={(e) => handleFoundedYearChange('max', e.target.value)}
                sx={{ flex: 1 }}
                inputProps={{ min: 1900, max: new Date().getFullYear() }}
              />
            </Box>
          </Box>

          {/* Company Stages */}
          {companyStages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Company Stage
              </Typography>
              <FormGroup row>
                {companyStages.map((stage) => (
                  <FormControlLabel
                    key={stage}
                    control={
                      <Checkbox
                        checked={filters.company_stages?.includes(stage) || false}
                        onChange={(e) => handleStageChange(stage, e.target.checked)}
                        size="small"
                      />
                    }
                    label={stage}
                    sx={{ mr: 3 }}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default CompanyFilters;