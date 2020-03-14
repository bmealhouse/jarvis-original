import Goals from './config/simple-goals'
import {TransactionUpdate} from '../types'

let skip = 0

export default (transactionUpdates: TransactionUpdate[]): void => {
  for (const {transaction, ...updates} of transactionUpdates) {
    if (skip > 0) {
      skip -= 1
      continue
    }

    const {
      amounts: {amount},
      associated_goal_info: {name: associatedGoal = ''} = {},
      categories: [category],
      description,
      memo = '',
      times: {when_recorded_local: recordedLocalTime},
    } = transaction

    console.log(
      `\n${recordedLocalTime} ${description} ($${amount / 100 / 100})`,
    )

    if (updates.applyCategory) {
      console.log(
        `   Update category: ${category.name} >>> ${updates.applyCategory}`,
      )
    } else {
      console.log(`   Category: ${category.name}`)
    }

    if (updates.applyGoal) {
      if (associatedGoal) {
        console.log(
          `   Update goal: ${associatedGoal} >>> ${
            Goals.LookupById[updates.applyGoal]
          } (ensure this is working)`,
        )
      } else {
        console.log(`   Apply goal: ${Goals.LookupById[updates.applyGoal]}`)
      }
    } else if (associatedGoal) {
      console.log(`   Goal: ${associatedGoal}`)
    }

    if (updates.applyMemo) {
      console.log(`   Apply memo: ${updates.applyMemo}`)
    } else if (memo) {
      console.log(`   Memo: ${memo} (ensure this is working)`)
    }
  }
}
