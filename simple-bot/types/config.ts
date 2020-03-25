import {Simple} from './simple';

export namespace Config {
	export interface GoalSettingsById {
		[goalId: string]: {
			displayText: string;
			filterText: string;
		};
	}

	export interface IgnoredGoals {
		[goalId: string]: string;
	}

	// Default export for src/config/simple-rules.ts
	export interface TransactionRules {
		[transactionDesciptionTextToMatch: string]: TransactionRule[];
	}

	// "recordedAfter" and "recordedBefore" date formats allowed:
	//   03/01/2019 === March 1st, 2019
	//   03/01 === March 1st, {{year of transaction}}
	export interface TransactionRule {
		amountEquals?: number;
		amountGreaterThan?: number;
		amountLessThan?: number;
		cityEquals?: string;
		recordedAfter?: string;
		recordedBefore?: string;
		applyCategory?: Simple.Category;
		applyGoal?: string;
		applyMemo?: string;
	}
}
