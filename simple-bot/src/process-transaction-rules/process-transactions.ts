import * as dayjs from 'dayjs';
import {Simple, TransactionUpdate} from '../../types';
import simpleRules from '../config/simple-rules';
import simpleTransactions from '../config/simple-transactions';
import {ignoredGoals} from '../config/simple-goals';

export default (
	transactions: Simple.Transaction[] = simpleTransactions
): TransactionUpdate[] => {
	const transactionUpdates: TransactionUpdate[] = [];

	for (const transaction of transactions) {
		const {
			amounts: {amount},
			associated_goal_info: {
				reference: associatedGoalReference,
				is_actually_associated: isActuallyAssociated
			} = {},
			categories: [category],
			geo: {city} = {},
			description,
			raw_description: rawDescription,
			memo = '',
			times: {when_recorded: whenTransactionRecorded}
		} = transaction;

		// Check if transaction should be skipped
		if (memo.includes('#skip')) {
			continue;
		}

		// Find rules based on transaction description text
		const [, transactionRules] =
			Object.entries(simpleRules).find(
				([text]) =>
					description.toUpperCase().includes(text) ||
					rawDescription.toUpperCase().includes(text)
			) ?? [];

		// When no rules are found, ensure the todo memo has been appended
		if (!transactionRules) {
			transactionUpdates.push({applyMemo: '#todo', transaction});
			continue;
		}

		// Find rule based on where condition (if applicable)
		const rule = transactionRules.find(rule => {
			let result = true;

			if (rule.amountEquals) {
				result = amount === rule.amountEquals;
			}

			if (result && rule.amountGreaterThan) {
				result = amount > rule.amountGreaterThan;
			}

			if (result && rule.amountLessThan) {
				result = amount < rule.amountLessThan;
			}

			if (result && rule.cityEquals && city) {
				result = rule.cityEquals.includes(city);
			}

			if (result && rule.recordedAfter) {
				const transactionRecordedDate = dayjs(whenTransactionRecorded);

				let date = dayjs(rule.recordedAfter);
				if (rule.recordedAfter.split('/').length === 2) {
					date = dayjs(
						`${rule.recordedAfter}/${transactionRecordedDate.year()}`
					);
				}

				const [hour, minute] = rule.recordedAfter.split(':');
				if (hour && minute) {
					date = dayjs(whenTransactionRecorded)
						.hour(Number(hour))
						.minute(Number(minute))
						.second(0);
				}

				result = transactionRecordedDate.isAfter(date);
			}

			if (result && rule.recordedBefore) {
				const transactionRecordedDate = dayjs(whenTransactionRecorded);

				let date = dayjs(rule.recordedBefore);
				if (rule.recordedBefore.split('/').length === 2) {
					date = dayjs(
						`${rule.recordedBefore}/${transactionRecordedDate.year()}`
					);
				}

				const [hour, minute] = rule.recordedBefore.split(':');
				if (hour && minute) {
					date = dayjs(whenTransactionRecorded)
						.hour(Number(hour))
						.minute(Number(minute))
						.second(0);
				}

				result = transactionRecordedDate.isBefore(date);
			}

			return result;
		});

		// When no rule is found, ensure the todo memo has been appended
		if (!rule) {
			transactionUpdates.push({applyMemo: '#todo missing rule', transaction});
			continue;
		}

		const transactionUpdate: TransactionUpdate = {
			transaction
		};

		// Does the category name match the rule's category
		if (rule.applyCategory !== category.name) {
			transactionUpdate.applyCategory = rule.applyCategory;
		}

		// Does the goal ID match the rule's goal (optional)
		if (
			rule.applyGoal &&
			!(associatedGoalReference && ignoredGoals[associatedGoalReference])
		) {
			if (!isActuallyAssociated || rule.applyGoal !== associatedGoalReference) {
				transactionUpdate.applyGoal = rule.applyGoal;
			}
		} else if (
			isActuallyAssociated &&
			associatedGoalReference &&
			!ignoredGoals[associatedGoalReference]
		) {
			transactionUpdate.applyGoal = 'SAFE_TO_SPEND';
		}

		// Does the memo text match the rule's memo (optional)
		if (rule.applyMemo) {
			if (memo !== rule.applyMemo) {
				transactionUpdate.applyMemo = rule.applyMemo;
			}
		} else if (memo) {
			transactionUpdate.applyMemo = '';
		}

		// Only apply updates to transactions that have changes
		if (Object.keys(transactionUpdate).length > 1) {
			transactionUpdates.push(transactionUpdate);
		}
	}

	return transactionUpdates;
};
