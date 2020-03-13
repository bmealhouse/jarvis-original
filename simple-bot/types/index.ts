import {Simple} from './simple'

export {Config} from './config'
export {Simple} from './simple'

export interface TransactionUpdate {
  applyCategory?: Simple.Category
  applyGoal?: string
  applyMemo?: string
  transaction: Simple.Transaction
}
