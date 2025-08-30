import React from 'react';
import { Box, Grid, Paper, Container } from '@mui/material';
import {
  HeadcountChart,
  FundingTimeline,
  RevenueGrowthChart,
  IndustryDistributionChart,
  ValuationChart,
} from './index';

// Sample data for demonstration
const sampleHeadcountData = [
  { date: '2020-01-01', count: 10 },
  { date: '2020-07-01', count: 25 },
  { date: '2021-01-01', count: 45 },
  { date: '2021-07-01', count: 78 },
  { date: '2022-01-01', count: 120 },
  { date: '2022-07-01', count: 185 },
  { date: '2023-01-01', count: 250 },
  { date: '2023-07-01', count: 320 },
  { date: '2024-01-01', count: 410 },
];

const sampleFundingData = [
  { date: '2020-03-01', round: 'Seed', amount: 2500000 },
  { date: '2021-05-01', round: 'Series A', amount: 12000000 },
  { date: '2022-08-01', round: 'Series B', amount: 35000000 },
  { date: '2023-11-01', round: 'Series C', amount: 85000000 },
];

const sampleRevenueData = [
  { year: 2020, revenue: 500000 },
  { year: 2021, revenue: 2400000 },
  { year: 2022, revenue: 8500000 },
  { year: 2023, revenue: 24000000 },
  { year: 2024, revenue: 52000000 },
];

const sampleIndustryData = [
  { name: 'Technology', value: 2540, percentage: 35.2 },
  { name: 'Healthcare', value: 1820, percentage: 25.2 },
  { name: 'Finance', value: 1200, percentage: 16.6 },
  { name: 'E-commerce', value: 890, percentage: 12.3 },
  { name: 'Education', value: 450, percentage: 6.2 },
  { name: 'Manufacturing', value: 320, percentage: 4.4 },
];

const sampleValuationData = [
  { date: '2020-03-01', valuation: 12000000, isFundingEvent: true, eventNote: 'Seed Round' },
  { date: '2020-12-01', valuation: 12000000 },
  { date: '2021-05-01', valuation: 45000000, isFundingEvent: true, eventNote: 'Series A' },
  { date: '2021-12-01', valuation: 45000000 },
  { date: '2022-08-01', valuation: 120000000, isFundingEvent: true, eventNote: 'Series B' },
  { date: '2023-01-01', valuation: 120000000 },
  { date: '2023-11-01', valuation: 280000000, isFundingEvent: true, eventNote: 'Series C' },
  { date: '2024-06-01', valuation: 280000000 },
];

const ChartsDemo: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Headcount Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 400 }}>
            <HeadcountChart
              headcountHistory={sampleHeadcountData}
              title="Employee Growth"
              height={320}
            />
          </Paper>
        </Grid>

        {/* Funding Timeline */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 400 }}>
            <FundingTimeline
              fundingHistory={sampleFundingData}
              title="Funding History"
              height={320}
            />
          </Paper>
        </Grid>

        {/* Revenue Growth Chart */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <RevenueGrowthChart
              revenueHistory={sampleRevenueData}
              title="Revenue Growth & YoY Performance"
              height={400}
            />
          </Paper>
        </Grid>

        {/* Industry Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 500 }}>
            <IndustryDistributionChart
              industryData={sampleIndustryData}
              title="Portfolio by Industry"
              height={420}
            />
          </Paper>
        </Grid>

        {/* Valuation Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 500 }}>
            <ValuationChart
              valuationHistory={sampleValuationData}
              title="Company Valuation Timeline"
              height={420}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ChartsDemo;