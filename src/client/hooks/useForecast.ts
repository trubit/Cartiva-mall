import { useQuery, useMutation } from '@tanstack/react-query'
import { forecastApi } from '../services/forecastService.js'

export const useSalesForecast = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['forecast', 'sales', params],
    queryFn: () => forecastApi.getSales(params).then((r) => r.data.data),
    staleTime: 300000,
    retry: false,
  })

export const useInventoryForecast = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['forecast', 'inventory', params],
    queryFn: () => forecastApi.getInventory(params).then((r) => r.data.data),
    staleTime: 300000,
    retry: false,
  })

export const useRevenueForecast = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['forecast', 'finance', params],
    queryFn: () => forecastApi.getFinance(params).then((r) => r.data.data),
    staleTime: 300000,
    retry: false,
  })

export const useDecisionRecommendations = () =>
  useQuery({
    queryKey: ['forecast', 'recommendations'],
    queryFn: () => forecastApi.getRecommendations().then((r) => r.data.data),
    staleTime: 300000,
    retry: false,
  })

export const useRunScenario = () =>
  useMutation({
    mutationFn: (data: unknown) => forecastApi.runScenario(data).then((r) => r.data.data),
  })

export const useForecastHistory = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['forecast', 'history', params],
    queryFn: () => forecastApi.getHistory(params).then((r) => r.data),
    retry: false,
  })
