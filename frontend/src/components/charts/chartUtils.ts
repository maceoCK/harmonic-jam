/**
 * Shared utility functions for chart components
 */

/**
 * Format currency values for display
 * @param value - The numeric value to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: value >= 1000000 ? 'compact' : 'standard',
    compactDisplay: 'short',
  }).format(value);
};

/**
 * Format large numbers with K, M, B suffixes
 * @param value - The numeric value to format
 * @returns Formatted number string
 */
export const formatLargeNumber = (value: number): string => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
};

/**
 * Get consistent color palette for charts
 * @returns Array of color strings
 */
export const getChartColors = (): string[] => [
  '#1976d2', // Primary blue
  '#42a5f5', // Light blue
  '#64b5f6', // Lighter blue
  '#90caf9', // Very light blue
  '#bbdefb', // Pale blue
  '#e3f2fd', // Very pale blue
  '#ff6b35', // Orange
  '#f7931e', // Yellow-orange
  '#ffb74d', // Light orange
  '#ffcc02', // Yellow
  '#8bc34a', // Green
  '#4caf50', // Dark green
  '#81c784', // Light green
  '#a5d6a7', // Very light green
  '#e57373', // Light red
  '#f06292', // Pink
  '#ba68c8', // Purple
  '#9575cd', // Light purple
];

/**
 * Format date for consistent display across charts
 * @param date - Date string or Date object
 * @param format - Format type ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date, format: 'short' | 'medium' | 'long' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat('en-US', options[format]).format(dateObj);
};

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change as a number
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

/**
 * Generate gradient definition for area charts
 * @param id - Unique identifier for the gradient
 * @param color - Base color for the gradient
 * @returns JSX gradient definition
 */
export const generateGradient = (id: string, color: string) => ({
  id,
  color,
  stops: [
    { offset: '5%', stopColor: color, stopOpacity: 0.8 },
    { offset: '95%', stopColor: color, stopOpacity: 0.1 }
  ]
});

/**
 * Custom tick formatter for Y-axis
 * @param value - The tick value
 * @returns Formatted tick string
 */
export const formatYAxisTick = (value: number): string => {
  return formatLargeNumber(value);
};

/**
 * Custom tick formatter for currency Y-axis
 * @param value - The tick value
 * @returns Formatted currency tick string
 */
export const formatCurrencyYAxisTick = (value: number): string => {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(0)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(0)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};