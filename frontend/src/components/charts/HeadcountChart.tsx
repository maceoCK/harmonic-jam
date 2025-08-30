import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Skeleton } from '@mui/material';
import { formatDate, formatLargeNumber } from './chartUtils';

export interface HeadcountDataPoint {
  date: string;
  count: number;
}

export interface HeadcountChartProps {
  headcountHistory: HeadcountDataPoint[];
  loading?: boolean;
  height?: number;
  title?: string;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0];
  
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
        {formatDate(label as string, 'medium')}
      </Typography>
      <Typography variant="body2" fontWeight="bold" color="primary.main">
        {formatLargeNumber(data.value as number)} employees
      </Typography>
    </Box>
  );
};

const HeadcountChart: React.FC<HeadcountChartProps> = ({
  headcountHistory,
  loading = false,
  height = 300,
  title = 'Employee Growth Over Time',
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

  if (!headcountHistory || headcountHistory.length === 0) {
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
            No headcount data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Sort data by date to ensure proper line progression
  const sortedData = [...headcountHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Box>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={sortedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.palette.divider}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDate(value, 'short')}
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          <YAxis
            tickFormatter={formatLargeNumber}
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke={theme.palette.primary.main}
            strokeWidth={3}
            dot={{
              fill: theme.palette.primary.main,
              strokeWidth: 2,
              stroke: theme.palette.background.paper,
              r: 4,
            }}
            activeDot={{
              r: 6,
              stroke: theme.palette.primary.main,
              strokeWidth: 2,
              fill: theme.palette.background.paper,
            }}
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default HeadcountChart;