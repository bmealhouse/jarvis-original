import * as chalk from 'chalk'
import * as dayjs from 'dayjs'
import {TransactionUpdate} from '../../types'
import {goalSettingsById} from '../config/simple-goals'

const config = {
  skip: 40,
  take: 10,
}

export default (transactionUpdates: TransactionUpdate[]): void => {
  for (const {transaction, ...updates} of transactionUpdates) {
    if (config.skip > 0) {
      config.skip -= 1
      continue
    }

    if (config.take > 0) {
      config.take -= 1
    } else {
      return
    }

    const {
      bookkeeping_type: bookkeepingType,
      description,
      memo = '',
      categories: [category],
      geo = {},
      times: {when_recorded_local: recordedLocalTime},
      amounts: {amount},
      associated_goal_info: {
        name: associatedGoalName = '',
        is_actually_associated: isActuallyAssociated,
      } = {},
    } = transaction

    const formattedDate = chalk.gray(
      dayjs(recordedLocalTime).format('MM/DD/YYYY @ hh:mma'),
    )

    const formattedAmount = `${chalk.dim('(')}${
      bookkeepingType === 'debit'
        ? chalk.redBright(`-$${amount / 100 / 100}`)
        : chalk.greenBright(`+$${amount / 100 / 100}`)
    }${chalk.dim(')')}`

    console.log(
      `\n${formattedDate} ${description.toUpperCase()} ${formattedAmount}`,
    )

    if (Object.keys(geo).length > 0) {
      console.log(chalk.gray(JSON.stringify(geo)))
    }

    if (updates.applyCategory) {
      console.log(
        chalk.yellowBright(
          `   Update category: ${category.name} >>> ${updates.applyCategory}`,
        ),
      )
    } else {
      console.log(chalk.dim(`   Category: ${category.name}`))
    }

    if (updates.applyGoal) {
      if (associatedGoalName && isActuallyAssociated) {
        console.log(
          chalk.yellowBright(
            `   Update goal: ${associatedGoalName} >>> ${
              goalSettingsById[updates.applyGoal].displayText
            }`,
          ),
        )
      } else {
        console.log(
          chalk.greenBright(
            `   Apply goal: ${goalSettingsById[updates.applyGoal].displayText}`,
          ),
        )
      }
    } else if (associatedGoalName) {
      console.log(chalk.dim(`   Goal: ${associatedGoalName}`))
    }

    if (updates.applyMemo !== undefined) {
      if (updates.applyMemo.length > 0) {
        console.log(chalk.greenBright(`   Apply memo: ${updates.applyMemo}`))
      } else {
        console.log(chalk.redBright(`   Remove memo: ${memo}`))
      }
    } else if (memo) {
      console.log(chalk.dim(`   Memo: ${memo}`))
    }
  }

  console.log('')
}
