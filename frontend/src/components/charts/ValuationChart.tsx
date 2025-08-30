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
  ReferenceDot,
  ReferenceArea,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Skeleton, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { formatDate, formatCurrency, formatCurrencyYAxisTick, calculatePercentageChange } from './chartUtils';

export interface ValuationDataPoint {
  date: string;
  valuation: number;
  isFundingEvent?: boolean;
  eventNote?: string;
}

export interface ValuationChartProps {
  valuationHistory: ValuationDataPoint[];
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

  const data = payload[0].payload as ValuationDataPoint;
  
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        boxShadow: 2,
        maxWidth: 250,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {formatDate(data.date, 'medium')}
      </Typography>
      <Typography variant="body2" fontWeight="bold" color="primary.main">
        {formatCurrency(data.valuation)}
      </Typography>
      {data.isFundingEvent && (
        <Box sx={{ mt: 0.5 }}>
          <Chip
            label="Funding Event"
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          {data.eventNote && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {data.eventNote}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  
  if (!payload.isFundingEvent) {
    return null;
  }
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="#4caf50"
      stroke="#ffffff"
      strokeWidth={2}
      style={{ 
        filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))',
        cursor: 'pointer'
      }}
    />
  );
};

const ValuationChart: React.FC<ValuationChartProps> = ({
  valuationHistory,
  loading = false,
  height = 350,
  title = 'Valuation Timeline',
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

  if (!valuationHistory || valuationHistory.length === 0) {
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
            No valuation data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Sort data by date to ensure proper timeline progression
  const sortedData = [...valuationHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate metrics
  const currentValuation = sortedData[sortedData.length - 1]?.valuation || 0;
  const initialValuation = sortedData[0]?.valuation || 0;
  const totalGrowth = calculatePercentageChange(currentValuation, initialValuation);
  const fundingEvents = sortedData.filter(d => d.isFundingEvent);

  // Find peak valuation
  const peakValuation = Math.max(...sortedData.map(d => d.valuation));
  const peakPoint = sortedData.find(d => d.valuation === peakValuation);

  return (
    <Box>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              icon={totalGrowth >= 0 ? <TrendingUp /> : <TrendingDown />}
              label={`${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(1)}%`}
              size="small"
              color={totalGrowth >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
            <Chip
              label={`${fundingEvents.length} Funding Events`}
              size="small"
              color="info"
              variant="outlined"
            />
          </Box>
        </Box>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={sortedData}
          margin={{
            top: 20,
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
            tickFormatter={formatCurrencyYAxisTick}
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tick={{ fill: theme.palette.text.secondary }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Highlight peak valuation area if different from current */}
          {peakPoint && peakValuation > currentValuation && (
            <ReferenceArea
              y1={currentValuation}
              y2={peakValuation}
              fill={theme.palette.error.light}
              fillOpacity={0.1}
              stroke="none"
            />
          )}
          
          {/* Step line for valuation changes */}
          <Line
            type="stepAfter"
            dataKey="valuation"
            stroke={theme.palette.primary.main}
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 6,
              stroke: theme.palette.primary.main,
              strokeWidth: 2,
              fill: theme.palette.background.paper,
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
          
          {/* Custom dots for funding events */}
          <Line
            type="stepAfter"
            dataKey="valuation"
            stroke="transparent"
            strokeWidth={0}
            dot={<CustomDot />}
            activeDot={false}
          />
          
          {/* Reference dots for funding events */}
          {fundingEvents.map((event, index) => {
            const eventIndex = sortedData.findIndex(d => d.date === event.date);
            return (
              <ReferenceDot
                key={`funding-${index}`}
                x={event.date}
                y={event.valuation}
                r={6}
                fill={theme.palette.success.main}
                stroke={theme.palette.background.paper}
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <Box>
          <Typography variant="h6" color="primary.main">
            {formatCurrency(currentValuation)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Current Valuation
          </Typography>
        </Box>
        <Box>
          <Typography variant="h6" color="success.main">
            {formatCurrency(peakValuation)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Peak Valuation
          </Typography>
        </Box>
        <Box>
          <Typography 
            variant="h6" 
            color={totalGrowth >= 0 ? 'success.main' : 'error.main'}
          >
            {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Growth
          </Typography>
        </Box>
        <Box>
          <Typography variant="h6" color="info.main">
            {fundingEvents.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Funding Rounds
          </Typography>
        </Box>
      </Box>
      
      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
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
            Valuation Timeline
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              backgroundColor: theme.palette.success.main,
              borderRadius: '50%',
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Funding Events
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ValuationChart;