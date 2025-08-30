import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Legend,
  LegendProps,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Skeleton, Paper } from '@mui/material';
import { getChartColors, formatLargeNumber } from './chartUtils';

export interface IndustryDataPoint {
  name: string;
  value: number;
  percentage: number;
}

export interface IndustryDistributionChartProps {
  industryData: IndustryDataPoint[];
  loading?: boolean;
  height?: number;
  title?: string;
  showLegend?: boolean;
}

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percentage is above threshold
  if (percent < 0.05) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ 
  active, 
  payload 
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as IndustryDataPoint;
  
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" fontWeight="bold" color="text.primary">
        {data.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Count: {formatLargeNumber(data.value)}
      </Typography>
      <Typography variant="body2" color="primary.main" fontWeight="bold">
        {data.percentage.toFixed(1)}% of total
      </Typography>
    </Paper>
  );
};

const CustomLegend: React.FC<LegendProps> = ({ payload }) => {
  if (!payload) return null;

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" color="text.primary" gutterBottom>
        Industry Distribution
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 1,
        maxHeight: 200,
        overflowY: 'auto'
      }}>
        {payload.map((entry, index) => {
          const data = entry.payload as IndustryDataPoint;
          return (
            <Box 
              key={`legend-${index}`}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                p: 0.5,
                borderRadius: 0.5,
                '&:hover': {
                  backgroundColor: 'grey.50',
                }
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  borderRadius: 0.5,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.primary"
                  noWrap
                  title={data.name}
                >
                  {data.name}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  display="block"
                >
                  {formatLargeNumber(data.value)} ({data.percentage.toFixed(1)}%)
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const IndustryDistributionChart: React.FC<IndustryDistributionChartProps> = ({
  industryData,
  loading = false,
  height = 400,
  title = 'Industry Distribution',
  showLegend = true,
}) => {
  const theme = useTheme();
  const colors = getChartColors();

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

  if (!industryData || industryData.length === 0) {
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
            No industry data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Sort data by value in descending order for better visualization
  const sortedData = [...industryData].sort((a, b) => b.value - a.value);

  // Calculate total for verification
  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total: {formatLargeNumber(total)} companies
          </Typography>
        </Box>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={sortedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={Math.min(height * 0.35, 120)}
            fill={theme.palette.primary.main}
            dataKey="value"
            animationBegin={0}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
                stroke={theme.palette.background.paper}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend 
              content={<CustomLegend />} 
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="primary.main">
            {sortedData.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Industries
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="primary.main">
            {sortedData[0]?.name || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Largest Sector
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="primary.main">
            {sortedData[0]?.percentage.toFixed(1) || 0}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Market Share
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default IndustryDistributionChart;