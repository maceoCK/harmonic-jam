import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Typography,
  IconButton,
  Fade,
  Popper,
  ClickAwayListener,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import debounce from 'lodash.debounce';
import { getSuggestions } from '../utils/search-api';

interface SmartSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const EXAMPLE_QUERIES = [
  'fintech companies in San Francisco',
  'series B startups with >100 employees',
  'SaaS founded after 2020',
  'healthcare with >10M funding',
  'AI companies in New York',
];

const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  onSearch,
  placeholder = 'Search companies using natural language...',
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const result = await getSuggestions(searchQuery, 5);
        setSuggestions(result.suggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    setShowSuggestions(true);
    
    if (value.trim()) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
    }
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    
    // Allow empty search to clear filters
    if (!finalQuery.trim()) {
      onSearch('');
      setShowSuggestions(false);
      return;
    }

    // Add to recent searches
    const updated = [finalQuery, ...recentSearches.filter(s => s !== finalQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    // Trigger search
    onSearch(finalQuery);
    setShowSuggestions(false);
  };

  // Handle key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
    onSearch(''); // Clear search results
  };

  // Handle example query click
  const handleExampleClick = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* Main Search Input */}
      <Paper
        elevation={showSuggestions ? 3 : 1}
        sx={{
          p: 1,
          borderRadius: 3,
          transition: 'all 0.2s',
          border: '1px solid',
          borderColor: showSuggestions ? 'primary.main' : 'transparent',
          '&:hover': {
            boxShadow: 2,
          },
        }}
      >
        <TextField
          ref={inputRef}
          fullWidth
          variant="standard"
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              fontSize: '1.1rem',
              py: 1,
              px: 1,
            },
          }}
        />
      </Paper>

      {/* Example Queries */}
      {!query && !showSuggestions && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary', mb: 1 }}>
            Try searching:
          </Typography>
          {EXAMPLE_QUERIES.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              size="small"
              onClick={() => handleExampleClick(example)}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main',
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Suggestions Dropdown */}
      <Popper
        open={showSuggestions && (suggestions.length > 0 || recentSearches.length > 0)}
        anchorEl={searchRef.current}
        placement="bottom-start"
        style={{ width: searchRef.current?.offsetWidth, zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
          <Paper elevation={3} sx={{ mt: 1, maxHeight: 400, overflow: 'auto' }}>
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary' }}
                >
                  <TrendingUpIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Suggestions
                </Typography>
                <List dense>
                  {suggestions.map((suggestion) => (
                    <ListItem
                      key={suggestion}
                      button
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText
                        primary={suggestion}
                        primaryTypographyProps={{
                          sx: {
                            fontWeight: query && suggestion.toLowerCase().includes(query.toLowerCase()) ? 500 : 400,
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Divider */}
            {suggestions.length > 0 && recentSearches.length > 0 && <Divider />}

            {/* Recent Searches */}
            {recentSearches.length > 0 && !query && (
              <>
                <Typography
                  variant="caption"
                  sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary' }}
                >
                  <HistoryIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Recent Searches
                </Typography>
                <List dense>
                  {recentSearches.map((search) => (
                    <ListItem
                      key={search}
                      button
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText primary={search} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>

      <Box ref={searchRef} />
    </Box>
  );
};

export default SmartSearchBar;