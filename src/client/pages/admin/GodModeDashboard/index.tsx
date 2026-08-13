import React, { useEffect, useState } from 'react'
import { Box, Typography, Tabs, Tab, Button, CircularProgress } from '@mui/material'
import {
  Sensors as BrainIcon,
  Public as CivilizationIcon,
  AutoAwesome as EvolutionIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useGodModeStore } from '../../../store/useGodModeStore.js'
import GlobalEconomicBrain from './GlobalEconomicBrain/index.js'
import SystemCivilizationView from './SystemCivilizationView/index.js'
import MarketEvolutionMonitor from './MarketEvolutionMonitor/index.js'
import '../../../styles/godmode.css'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`godmode-tabpanel-${index}`}
      aria-labelledby={`godmode-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

export const GodModeDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)

  const {
    globalEconomicState,
    economyHistory,
    systemDecisions,
    ruleVersions,
    loading,
    fetchEconomyState,
    fetchSystemHealth,
    fetchRuleVersions,
    triggerObserve,
    triggerSimulate,
    triggerDecide,
    triggerExecute,
    triggerEvolve,
  } = useGodModeStore()

  const refreshAll = () => {
    fetchEconomyState()
    fetchSystemHealth()
    fetchRuleVersions()
  }

  useEffect(() => {
    refreshAll()
  }, [])

  return (
    <Box className="godmode-container" sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" className="gradient-text-ai" sx={{ fontWeight: 'bold' }}>
            God-Mode Commerce System
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={refreshAll}
          disabled={loading}
          sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          Refresh State
        </Button>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Tabs
          value={tabValue}
          onChange={(_e, v) => setTabValue(v)}
          textColor="inherit"
          indicatorColor="secondary"
          sx={{
            '& .MuiTab-root': {
              color: 'grey.400',
              '&.Mui-selected': { color: '#818cf8', fontWeight: 'bold' },
            },
          }}
        >
          <Tab
            id="godmode-tab-0"
            aria-controls="godmode-tabpanel-0"
            icon={<BrainIcon />}
            iconPosition="start"
            label="Global Economic Brain"
          />
          <Tab
            id="godmode-tab-1"
            aria-controls="godmode-tabpanel-1"
            icon={<CivilizationIcon />}
            iconPosition="start"
            label="System Civilization View"
          />
          <Tab
            id="godmode-tab-2"
            aria-controls="godmode-tabpanel-2"
            icon={<EvolutionIcon />}
            iconPosition="start"
            label="Market Evolution Monitor"
          />
        </Tabs>
      </Box>

      {/* Tab 0: Economic Brain */}
      <TabPanel value={tabValue} index={0}>
        <GlobalEconomicBrain economicState={globalEconomicState} />
      </TabPanel>

      {/* Tab 1: Civilization View */}
      <TabPanel value={tabValue} index={1}>
        <SystemCivilizationView
          decisions={systemDecisions}
          history={economyHistory}
          onObserve={triggerObserve}
          onSimulate={triggerSimulate}
          onDecide={triggerDecide}
          onExecute={triggerExecute}
          onEvolve={triggerEvolve}
          loading={loading}
        />
      </TabPanel>

      {/* Tab 2: Market Evolution */}
      <TabPanel value={tabValue} index={2}>
        <MarketEvolutionMonitor rules={ruleVersions} />
      </TabPanel>
    </Box>
  )
}

export default GodModeDashboard
