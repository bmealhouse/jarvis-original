import {Simple} from './simple'

export namespace Config {
  export interface GoalSettingsById {
    [goalId: string]: {
      displayText: string
      filterText: string
    }
  }

  // Default export for src/config/simple-rules.ts
  export interface TransactionRules {
    [transactionDesciptionTextToMatch: string]: TransactionRule[]
  }

  // recordedAfter and recordedBetween date formats allowed:
  //   03/01/2019 === March 1st, 2019
  //   03/01 === March 1st, {{year of transaction}}
  export interface TransactionRule {
    amountEquals?: number
    amountGreaterThan?: number
    amountLessThan?: number
    recordedAfter?: string
    recordedBetween?: [string, string]
    applyCategory?: Simple.Category
    applyGoal?: string
    applyMemo?: string
  }
}
