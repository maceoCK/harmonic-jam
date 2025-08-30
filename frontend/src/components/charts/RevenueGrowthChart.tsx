import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Line,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Skeleton, Chip } from '@mui/material';
import { formatCurrency, formatCurrencyYAxisTick, calculatePercentageChange } from './chartUtils';

export interface RevenueDataPoint {
  year: number;
  revenue: number;
}

export interface RevenueGrowthChartProps {
  revenueHistory: RevenueDataPoint[];
  loading?: boolean;
  height?: number;
  title?: string;
}

interface ProcessedRevenueData extends RevenueDataPoint {
  growthRate?: number;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const revenueData = payload.find(p => p.dataKey === 'revenue');
  const growthData = payload.find(p => p.dataKey === 'growthRate');
  
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        boxShadow: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Year {label}
      </Typography>
      <Typography variant="body2" fontWeight="bold" color="primary.main">
        Revenue: {formatCurrency(revenueData?.value as number ?? 0)}
      </Typography>
      {growthData && growthData.value !== undefined && (
        <Typography 
          variant="body2" 
          fontWeight="bold" 
          color={growthData.value >= 0 ? 'success.main' : 'error.main'}
        >
          Growth: {(growthData.value as number).toFixed(1)}% YoY
        </Typography>
      )}
    </Box>
  );
};

const RevenueGrowthChart: React.FC<RevenueGrowthChartProps> = ({
  revenueHistory,
  loading = false,
  height = 350,
  title = 'Revenue Growth Over Time',
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={height}
          sx={{ borderRadius: 1 }}
        />
      </Box>
    );
  }

  if (!revenueHistory || revenueHistory.length === 0) {
    return (
      <Box>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <Box
          sx={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No revenue data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Sort data by year and calculate growth rates
  const sortedData = [...revenueHistory].sort((a, b) => a.year - b.year);
  
  const processedData: ProcessedRevenueData[] = sortedData.map((current, index) => {
    if (index === 0) {
      return { ...current, growthRate: undefined };
    }
    
    const previous = sortedData[index - 1];
    const growthRate = calculatePercentageChange(current.revenue, previous.revenue);
    
    return { ...current, growthRate };
  });

  // Calculate overall growth metrics
  const totalGrowth = processedData.length > 1 
    ? calculatePercentageChange(
        processedData[processedData.length - 1].revenue,
        processedData[0].revenue
      )
    : 0;

  const averageGrowthRate = processedData
    .filter(d => d.growthRate !== undefined)
    .reduce((sum, d) => sum + (d.growthRate ?? 0), 0) / 
    (processedData.filter(d => d.growthRate !== undefined).length || 1);

  return (
    <Box>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`Total Growth: ${totalGrowth.toFixed(1)}%`}
              size="small"
              color={totalGrowth >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
            <Chip
              label={`Avg YoY: ${averageGrowthRate.toFixed(1)}%`}
              size="small"
              color={averageGrowthRate >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
        </Box>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
              <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.palette.divider}
            strokeOpacity={0.5}
          />
          
          <XAxis
            dataKey="year"
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          
          <YAxis
            yAxisId="revenue"
            orientation="left"
            tickFormatter={formatCurrencyYAxisTick}
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          
          <YAxis
            yAxisId="growth"
            orientation="right"
            tickFormatter={(value) => `${value}%`}
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine 
            yAxisId="growth" 
            y={0} 
            stroke={theme.palette.text.disabled} 
            strokeDasharray="2 2"
          />
          
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke={theme.palette.primary.main}
            strokeWidth={3}
            fill="url(#revenueGradient)"
            fillOpacity={1}
            dot={{
              fill: theme.palette.primary.main,
              strokeWidth: 2,
              stroke: theme.palette.background.paper,
              r: 5,
            }}
            activeDot={{
              r: 7,
              stroke: theme.palette.primary.main,
              strokeWidth: 2,
              fill: theme.palette.background.paper,
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
          
          <Line
            yAxisId="growth"
            type="monotone"
            dataKey="growthRate"
            stroke={theme.palette.secondary.main}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{
              fill: theme.palette.secondary.main,
              strokeWidth: 2,
              stroke: theme.palette.background.paper,
              r: 4,
            }}
            connectNulls={false}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 3,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Revenue
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 2,
              backgroundColor: theme.palette.secondary.main,
              borderRadius: 0.5,
              border: `1px dashed ${theme.palette.secondary.main}`,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            YoY Growth %
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RevenueGrowthChart;