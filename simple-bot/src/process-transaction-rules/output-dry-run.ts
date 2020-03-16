import * as chalk from 'chalk'
import {TransactionUpdate} from '../../types'
import Goals from '../config/simple-goals'

let skip = 0

export default (transactionUpdates: TransactionUpdate[]): void => {
  for (const {transaction, ...updates} of transactionUpdates) {
    if (skip > 0) {
      skip -= 1
      continue
    }

    const {
      amounts: {amount},
      associated_goal_info: {name: associatedGoalName = ''} = {},
      categories: [category],
      description,
      memo = '',
      times: {when_recorded_local: recordedLocalTime},
    } = transaction

    const formattedAmount = chalk.greenBright(`$${amount / 100 / 100}`)
    console.log(
      `\n${recordedLocalTime} ${description.toUpperCase()} (${formattedAmount})`,
    )

    if (updates.applyCategory) {
      console.log(
        `   Update category: ${category.name} >>> ${updates.applyCategory}`,
      )
    } else {
      console.log(`   Category: ${category.name}`)
    }

    if (updates.applyGoal) {
      if (associatedGoalName) {
        console.log(
          `   Update goal: ${associatedGoalName} >>> ${
            Goals.LookupById[updates.applyGoal]
          } (ensure this is working)`,
        )
      } else {
        console.log(`   Apply goal: ${Goals.LookupById[updates.applyGoal]}`)
      }
    } else if (associatedGoalName) {
      console.log(`   Goal: ${associatedGoalName}`)
    }

    if (updates.applyMemo !== undefined) {
      if (updates.applyMemo.length > 0) {
        console.log(`   Apply memo: ${updates.applyMemo}`)
      } else {
        console.log(`   Remove memo: ${memo}`)
      }
    } else if (memo) {
      console.log(`   Memo: ${memo}`)
    }
  }
}
