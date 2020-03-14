import {Simple} from './simple'

export namespace Config {
  // Default export for src/config/simple-goals.ts
  export interface Goals {
    Goal: Goal
    LookupById: GoalLookupById
  }

  // Example: { iCloudStorage: '4d5c9a88-799e-345c-9d1d-28bab2cdd1cw' }
  export interface Goal {
    [goalName: string]: string
  }

  // Example: { '4d5c9a88-799e-345c-9d1d-28bab2cdd1cw': '☁️ iCloud storage' }
  export interface GoalLookupById {
    [goalId: string]: string
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
