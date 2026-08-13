import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material'
import { AutoAwesome as EvolutionIcon } from '@mui/icons-material'

interface Props {
  rules: any[]
}

export const MarketEvolutionMonitor: React.FC<Props> = ({ rules }) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <EvolutionIcon sx={{ color: '#a855f7' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Self-Evolving Market Rule Engine
            </Typography>
          </Box>
          <Typography variant="body2" color="grey.400">
            Rules dynamically mutated by the AI Economic Consciousness Engine to optimize
            marketplace stability, conversion, and fraud prevention.
          </Typography>
        </CardContent>
      </Card>

      <TableContainer
        component={Paper}
        sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ borderBottom: '1px solid #1e293b' }}>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Rule ID / Name</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Version</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>AI Confidence</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>
                Effectiveness Score
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'grey.500', py: 4 }}>
                  No active market rules registered.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.ruleId} sx={{ borderBottom: '1px solid #1e293b' }}>
                  <TableCell sx={{ color: 'white' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {rule.ruleName}
                    </Typography>
                    <Typography variant="caption" color="grey.500" sx={{ fontFamily: 'monospace' }}>
                      {rule.ruleId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={rule.category} size="small" color="primary" />
                  </TableCell>
                  <TableCell sx={{ color: '#818cf8', fontWeight: 'bold' }}>
                    v{rule.version}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                      size="small"
                      color={rule.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {Math.round((rule.aiConfidenceScore || 0) * 100)}%
                  </TableCell>
                  <TableCell sx={{ width: 180 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={rule.effectivenessScore || 0}
                        sx={{
                          flexGrow: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#334155',
                          '& .MuiLinearProgress-bar': { bgcolor: '#10b981' },
                        }}
                      />
                      <Typography variant="caption" color="grey.300">
                        {rule.effectivenessScore || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default MarketEvolutionMonitor
