import React, { useEffect } from 'react'
import { Box, Typography, Paper, Card, CardContent, Chip, Divider } from '@mui/material'
import { useDeveloperStore } from '../../../store/useDeveloperStore.js'

export const ApiDocsViewer: React.FC = () => {
  const { openApiSpec, fetchOpenApiSpec } = useDeveloperStore()

  useEffect(() => {
    fetchOpenApiSpec()
  }, [])

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Interactive OpenAPI 3.0 Specification
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Auto-generated OpenAPI contract representing the Cartiva Gateway endpoints.
        </Typography>
      </Box>

      {openApiSpec ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
            {openApiSpec.info?.title} (v{openApiSpec.info?.version})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {openApiSpec.info?.description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            API Paths & Endpoints
          </Typography>

          {Object.entries(openApiSpec.paths || {}).map(([path, methods]: [string, any]) => (
            <Box key={path} sx={{ mb: 3 }}>
              {Object.entries(methods).map(([method, details]: [string, any]) => (
                <Card variant="outlined" key={method} sx={{ mb: 1, borderRadius: 1.5 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={method.toUpperCase()}
                        color={method === 'get' ? 'success' : 'primary'}
                        size="small"
                      />
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                      >
                        /api/v1{path}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        — {details.summary}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ))}
        </Paper>
      ) : (
        <Typography color="text.secondary">Loading OpenAPI specification...</Typography>
      )}
    </Box>
  )
}

export default ApiDocsViewer
