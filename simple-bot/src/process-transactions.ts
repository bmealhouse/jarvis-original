import Rules from './config/simple-rules'
import simpleTransactions from './config/simple-transactions'
import {Simple, TransactionUpdate} from '../types'

export default (
  transactions: Simple.Transaction[] = simpleTransactions,
): TransactionUpdate[] => {
  const transactionUpdates: TransactionUpdate[] = []

  for (const transaction of transactions) {
    const {
      amounts: {amount},
      categories: [category],
      description,
      goal_id: goalId,
      raw_description: rawDescription,
      memo = '',
      times: {when_recorded_local: recordedLocalTime},
    } = transaction

    // check if transaction should be skipped
    if (memo.includes('#skip') || memo.includes('#todo')) {
      continue
    }

    // find rules based on transaction description text
    const [, rules] =
      Object.entries(Rules).find(
        ([text]) =>
          description.toUpperCase().includes(text) ||
          rawDescription.toUpperCase().includes(text),
      ) ?? []

    // when no rules are found, ensure the todo memo has been appended
    if (!rules) {
      transactionUpdates.push({applyMemo: '#todo', transaction})
      continue
    }

    // find rule based on where condition (if applicable)
    const rule = rules.find(rule => {
      if (rule.amountEquals) {
        return amount === rule.amountEquals
      }

      if (rule.amountGreaterThan) {
        return amount > rule.amountGreaterThan
      }

      if (rule.amountLessThan) {
        return amount < rule.amountLessThan
      }

      if (rule.recordedAfter) {
        const recordedDate = new Date(recordedLocalTime)
        const recordedYear = recordedDate.getFullYear()

        let afterDate = new Date(rule.recordedAfter)
        if (rule.recordedAfter.split('/').length === 2) {
          afterDate = new Date(`${rule.recordedAfter}/${recordedYear}`)
        }

        return recordedDate > afterDate
      }

      if (rule.recordedBetween) {
        const recordedDate = new Date(recordedLocalTime)
        const recordedYear = recordedDate.getFullYear()

        const [start, end] = rule.recordedBetween

        let startDate = new Date(start)
        if (start.split('/').length === 2) {
          startDate = new Date(`${start}/${recordedYear}`)
        }

        let endDate = new Date(end)
        if (end.split('/').length === 2) {
          endDate = new Date(`${end}/${recordedYear}`)
        }

        return recordedDate > startDate && recordedDate < endDate
      }

      return true
    })

    // when no rule is found, ensure the todo memo has been appended
    if (!rule) {
      transactionUpdates.push({applyMemo: '#todo', transaction})
      continue
    }

    const transactionUpdate: TransactionUpdate = {
      transaction,
    }

    // does the category name match the rule's category
    if (rule.applyCategory !== category.name) {
      transactionUpdate.applyCategory = rule.applyCategory
    }

    // does the goal ID match the rule's goal (optional)
    if (rule.applyGoal && rule.applyGoal !== goalId) {
      transactionUpdate.applyGoal = rule.applyGoal
    }

    // TODO: if transaction has memo and rule doesn't, remove memo

    // does the memo include rule's memo text (optional)
    if (rule.applyMemo && memo !== rule.applyMemo) {
      transactionUpdate.applyMemo = rule.applyMemo
    }

    // only apply updates to transactions that have changes
    if (Object.keys(transactionUpdate).length > 1) {
      transactionUpdates.push(transactionUpdate)
    }
  }

  return transactionUpdates
}
