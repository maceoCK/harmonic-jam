import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Skeleton } from '@mui/material';
import { formatDate, formatCurrency, getChartColors } from './chartUtils';

export interface FundingDataPoint {
  date: string;
  round: string;
  amount: number;
}

export interface FundingTimelineProps {
  fundingHistory: FundingDataPoint[];
  loading?: boolean;
  height?: number;
  title?: string;
}

// Mapping of funding round types to colors
const getRoundColor = (round: string, colors: string[]): string => {
  const roundTypeMap: { [key: string]: number } = {
    'Pre-Seed': 0,
    'Seed': 1,
    'Series A': 2,
    'Series B': 3,
    'Series C': 4,
    'Series D': 5,
    'Series E': 6,
    'Series F': 7,
    'Bridge': 8,
    'Convertible': 9,
    'IPO': 10,
    'Acquisition': 11,
  };

  const index = roundTypeMap[round] ?? Math.abs(round.charCodeAt(0)) % colors.length;
  return colors[index % colors.length];
};

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as FundingDataPoint;
  
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
        {formatDate(data.date, 'medium')}
      </Typography>
      <Typography variant="body2" fontWeight="bold" color="primary.main">
        {data.round}
      </Typography>
      <Typography variant="body2" fontWeight="bold" color="success.main">
        {formatCurrency(data.amount)}
      </Typography>
    </Box>
  );
};

const FundingTimeline: React.FC<FundingTimelineProps> = ({
  fundingHistory,
  loading = false,
  height = 300,
  title = 'Funding Rounds Timeline',
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

  if (!fundingHistory || fundingHistory.length === 0) {
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
            No funding data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Sort data by date to ensure proper chronological order
  const sortedData = [...fundingHistory].sort(
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
        <BarChart
          data={sortedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.palette.divider}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="round"
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value)}
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="amount"
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getRoundColor(entry.round, colors)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend showing round types and colors */}
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {Array.from(new Set(sortedData.map(d => d.round))).map((round) => (
          <Box key={round} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                backgroundColor: getRoundColor(round, colors),
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {round}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default FundingTimeline;