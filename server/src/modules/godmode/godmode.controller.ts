import { Request, Response } from 'express'
import {
  observeSystemState,
  simulateFutureOutcomes,
  makeDecisions,
  executeDecisions,
  getGodModeStatus,
  runCivilizationCycle,
} from './godmode.service.js'
import {
  EconomicStateModel,
  GodModeDecisionModel,
  MarketRuleModel,
  CivilizationCycleModel,
} from './godmode.model.js'

export const observe = async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await observeSystemState()
    res.json({ success: true, data: snapshot })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const simulate = async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestState = await EconomicStateModel.findOne().sort({ timestamp: -1 })
    if (!latestState) {
      res
        .status(400)
        .json({ success: false, message: 'No economic state available. Run observe first.' })
      return
    }
    const scenarios = simulateFutureOutcomes(latestState)
    res.json({ success: true, data: { currentState: latestState, scenarios } })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const decide = async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestState = await EconomicStateModel.findOne().sort({ timestamp: -1 })
    if (!latestState) {
      res.status(400).json({ success: false, message: 'No economic state available.' })
      return
    }
    const scenarios = simulateFutureOutcomes(latestState)
    const decisions = makeDecisions(latestState, scenarios)
    res.json({ success: true, data: { currentState: latestState, scenarios, decisions } })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const execute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cycleId = `manual_${Date.now()}` } = req.body
    const latestState = await EconomicStateModel.findOne().sort({ timestamp: -1 })
    if (!latestState) {
      res.status(400).json({ success: false, message: 'No economic state available.' })
      return
    }
    const scenarios = simulateFutureOutcomes(latestState)
    const decisions = makeDecisions(latestState, scenarios)
    const result = await executeDecisions(decisions, cycleId)
    res.json({
      success: true,
      data: {
        cycleId,
        executedDecisions: result.executedDecisions,
        rulesModified: result.rulesModified,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const evolve = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Run full civilization loop synchronously for manual trigger
    await runCivilizationCycle()
    const latestCycle = await CivilizationCycleModel.findOne().sort({ startedAt: -1 })
    res.json({
      success: true,
      message: 'Civilization cycle executed successfully',
      data: latestCycle,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getGodModeStatus()
    res.json({ success: true, data: status })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getEconomyState = async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestState = await EconomicStateModel.findOne().sort({ timestamp: -1 })
    const history = await EconomicStateModel.find().sort({ timestamp: -1 }).limit(20)
    res.json({ success: true, data: { current: latestState, history } })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getSystemHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const lastCycle = await CivilizationCycleModel.findOne().sort({ startedAt: -1 })
    const recentDecisions = await GodModeDecisionModel.find().sort({ timestamp: -1 }).limit(10)
    res.json({ success: true, data: { lastCycle, recentDecisions } })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getRuleVersions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rules = await MarketRuleModel.find().sort({ updatedAt: -1 })
    res.json({ success: true, data: rules })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}
