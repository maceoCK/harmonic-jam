import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Chip,
  Link,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Launch,
  LinkedIn,
  Twitter,
  Business,
  TrendingUp,
  People,
  AttachMoney,
  CalendarToday,
  LocationOn,
  Language,
} from '@mui/icons-material';
import { ICompany } from '../utils/jam-api';
import { 
  HeadcountChart, 
  FundingTimeline, 
  RevenueGrowthChart,
  ValuationChart 
} from './charts';

interface CompanyDetailDrawerProps {
  company: ICompany | null;
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`company-tabpanel-${index}`}
      aria-labelledby={`company-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const CompanyDetailDrawer: React.FC<CompanyDetailDrawerProps> = ({
  company,
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  const formatPercentage = (rate?: number) => {
    if (!rate) return 'N/A';
    return `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`;
  };

  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'seed':
        return 'warning';
      case 'series a':
        return 'info';
      case 'series b':
        return 'primary';
      case 'series c':
        return 'secondary';
      case 'public':
        return 'success';
      default:
        return 'default';
    }
  };

  if (!company) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 600 }, maxWidth: '100vw' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid #e8eaed',
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.5 }}>
              {company.company_name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {company.industry && (
                <Chip
                  label={company.industry}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {company.company_stage && (
                <Chip
                  label={company.company_stage}
                  size="small"
                  color={getStageColor(company.company_stage) as any}
                  variant="filled"
                />
              )}
              {company.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2">{company.location}</Typography>
                </Box>
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ ml: 1 }}>
            <Close />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: '1px solid #e8eaed' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
            <Tab label="Overview" />
            <Tab label="Financials" />
            <Tab label="Team" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Description */}
              {company.description && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                    About
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {company.description}
                  </Typography>
                </Grid>
              )}

              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      Company Info
                    </Typography>
                    <List dense>
                      {company.founded_year && (
                        <ListItem sx={{ px: 0 }}>
                          <CalendarToday sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText primary="Founded" secondary={company.founded_year} />
                        </ListItem>
                      )}
                      {company.website && (
                        <ListItem sx={{ px: 0 }}>
                          <Language sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText 
                            primary="Website" 
                            secondary={
                              <Link href={company.website} target="_blank" rel="noopener">
                                {company.website}
                                <Launch sx={{ ml: 0.5, fontSize: 14 }} />
                              </Link>
                            } 
                          />
                        </ListItem>
                      )}
                      {company.technologies && (
                        <ListItem sx={{ px: 0 }}>
                          <Business sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText primary="Technologies" secondary={company.technologies} />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Social Links */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      Social Links
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {company.linkedin_url && (
                        <Tooltip title="LinkedIn">
                          <IconButton
                            component={Link}
                            href={company.linkedin_url}
                            target="_blank"
                            sx={{ color: '#0077b5' }}
                          >
                            <LinkedIn />
                          </IconButton>
                        </Tooltip>
                      )}
                      {company.twitter_url && (
                        <Tooltip title="Twitter">
                          <IconButton
                            component={Link}
                            href={company.twitter_url}
                            target="_blank"
                            sx={{ color: '#1da1f2' }}
                          >
                            <Twitter />
                          </IconButton>
                        </Tooltip>
                      )}
                      {company.crunchbase_url && (
                        <Tooltip title="Crunchbase">
                          <Avatar
                            component={Link}
                            href={company.crunchbase_url}
                            target="_blank"
                            sx={{ 
                              width: 40, 
                              height: 40, 
                              bgcolor: '#0288d1',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: '#0277bd' }
                            }}
                          >
                            CB
                          </Avatar>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Financials Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              {/* Key Metrics */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  Financial Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <AttachMoney sx={{ color: 'success.main', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Total Funding
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(company.total_funding)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <TrendingUp sx={{ color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Valuation
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(company.valuation)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <AttachMoney sx={{ color: 'info.main', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Revenue
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(company.revenue)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <TrendingUp sx={{ color: 'secondary.main', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Growth Rate
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatPercentage(company.growth_rate)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* Funding Details */}
              {(company.last_funding_round || company.last_funding_amount) && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        Latest Funding
                      </Typography>
                      <Grid container spacing={2}>
                        {company.last_funding_round && (
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Round Type
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {company.last_funding_round}
                            </Typography>
                          </Grid>
                        )}
                        {company.last_funding_amount && (
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Amount
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {formatCurrency(company.last_funding_amount)}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Team Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <People sx={{ color: 'primary.main', mb: 1, fontSize: 40 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {formatNumber(company.employee_count)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Total Employees
                    </Typography>
                    {company.growth_rate && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 1, 
                          color: company.growth_rate > 0 ? 'success.main' : 'error.main',
                          fontWeight: 500 
                        }}
                      >
                        {formatPercentage(company.growth_rate)} growth
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Placeholder for team details */}
              <Grid item xs={12}>
                <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  Detailed team information and organizational structure will be available soon.
                </Typography>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              {/* Headcount Chart */}
              {company.headcount_history && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Employee Growth
                      </Typography>
                      <HeadcountChart 
                        headcountHistory={JSON.parse(
                          typeof company.headcount_history === 'string' 
                            ? company.headcount_history 
                            : JSON.stringify(company.headcount_history)
                        )}
                        height={250}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {/* Funding Timeline */}
              {company.funding_history && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Funding Rounds
                      </Typography>
                      <FundingTimeline 
                        fundingHistory={JSON.parse(
                          typeof company.funding_history === 'string'
                            ? company.funding_history
                            : JSON.stringify(company.funding_history)
                        )}
                        height={250}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {/* Revenue Growth */}
              {company.revenue_history && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Revenue Trend
                      </Typography>
                      <RevenueGrowthChart 
                        revenueHistory={JSON.parse(
                          typeof company.revenue_history === 'string'
                            ? company.revenue_history
                            : JSON.stringify(company.revenue_history)
                        )}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {/* Valuation Chart */}
              {company.valuation_history && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Valuation Over Time
                      </Typography>
                      <ValuationChart 
                        valuationHistory={JSON.parse(
                          typeof company.valuation_history === 'string'
                            ? company.valuation_history
                            : JSON.stringify(company.valuation_history)
                        )}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              {/* No data fallback */}
              {!company.headcount_history && !company.funding_history && 
               !company.revenue_history && !company.valuation_history && (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      No Analytics Data Available
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Historical data is not available for this company yet.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </TabPanel>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CompanyDetailDrawer;