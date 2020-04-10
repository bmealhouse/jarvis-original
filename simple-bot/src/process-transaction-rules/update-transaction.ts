import * as chalk from 'chalk';
import * as dayjs from 'dayjs';
import * as puppeteer from 'puppeteer';
import {TransactionUpdate} from '../../types';
import {goalSettingsById} from '../config/simple-goals';

export default async (
	page: puppeteer.Page,
	{applyCategory, applyGoal, applyMemo, transaction}: TransactionUpdate
): Promise<void> => {
	const {
		uuid,
		bookkeeping_type: bookkeepingType,
		description,
		times: {when_recorded_local: recordedLocalTime},
		amounts: {amount}
	} = transaction;

	const formattedDate = chalk.gray(
		dayjs(recordedLocalTime).format('MM/DD/YYYY @ hh:mma')
	);

	const formattedAmount = `${chalk.dim('(')}${
		bookkeepingType === 'debit'
			? chalk.redBright(`-$${amount / 100 / 100}`)
			: chalk.greenBright(`+$${amount / 100 / 100}`)
	}${chalk.dim(')')}`;

	console.log(
		`\n${formattedDate} ${description.toUpperCase()} ${formattedAmount}`
	);

	await click({
		name: 'transaction',
		selector: `[data-transaction-id="${uuid}"]`,
		waitForNavigation: true
	});

	await page.waitFor(250); // Animation

	console.log('  | waiting for transaction breakdown table to load…');
	await page.waitForSelector('.breakdown-table .-faux', {
		hidden: true,
		timeout: 2500
	});

	if (applyCategory) {
		await click({
			name: 'change category button',
			selector: `.change-option a[href*="${uuid}/category"]`,
			waitForNavigation: true
		});

		await page.waitFor(250); // Animation
		await type({
			name: 'categories filter text box',
			selector: '.sidebar-filtered-list input[type="text"]',
			text: applyCategory
		});

		const filteredCategorySelector =
			'.amounts-list > li:last-of-type > .list > li:last-of-type button';
		// '.amounts-list > li:first-of-type > .list > li:last-of-type button';

		await click({
			name: 'first filtered category',
			selector: filteredCategorySelector,
			waitForNavigation: false
		});

		await click({
			name: 'rembmer edit "no" radio button',
			selector: 'input#remember-edit-no',
			waitForNavigation: false,
			displayError: false
		});

		await click({
			name: 'save button',
			selector: '.field-alert-transition-group button',
			waitForNavigation: true,
			displayError: false
		});

		await page.waitFor(250); // Animation
		await waitForTransactionRefresh();
	}

	if (applyGoal) {
		await click({
			name: 'change goal button',
			selector: `.change-option a[href*="${uuid}/goal"]`,
			waitForNavigation: true
		});

		await page.waitFor(250); // Animation
		await type({
			name: 'goals filter text box',
			selector: '.sidebar-filtered-list input[type="text"]',
			text: goalSettingsById[applyGoal].filterText
		});

		await click({
			name: 'first filtered goal',
			selector: '.amounts-list button',
			waitForNavigation: false
		});

		await page.waitFor(250); // Animation
		await click({
			name: 'insufficient funds message',
			selector: '.offset-content.-small button[type="button"]',
			waitForNavigation: true,
			displayError: false
		});

		await page.waitFor(250); // Animation
		await waitForTransactionRefresh();
	}

	if (applyMemo !== undefined) {
		const element = await click({
			name: 'change memo button',
			selector: '.sidebar-main > div > div:nth-child(7) button',
			waitForNavigation: false,
			displayError: false
		});

		if (!element) {
			await click({
				name: 'change memo button (2nd attempt)',
				selector: '.sidebar-main > div > div:nth-child(6) button',
				waitForNavigation: false
			});
		}

		await type({
			name: 'memo text box',
			selector: '#memo',
			text: applyMemo
		});

		await click({
			name: 'save memo button',
			selector: 'button[type="submit"]',
			waitForNavigation: false
		});

		try {
			console.log('  | waiting for memo to save…');
			await page.waitForSelector('button[type="submit"]', {
				hidden: true,
				timeout: 2500
			});
		} catch {}

		await waitForTransactionRefresh();
	}

	interface BaseOptions {
		name: string;
		selector: string;
		displayError?: boolean;
	}

	interface ClickOptions extends BaseOptions {
		waitForNavigation: boolean;
	}

	interface TypeOptions extends BaseOptions {
		text: string;
	}

	async function click({
		name,
		selector,
		waitForNavigation,
		displayError = true
	}: ClickOptions): Promise<puppeteer.ElementHandle | undefined> {
		try {
			console.log(`  | waiting for ${name}…`);
			const element = await page.waitForSelector(selector, {
				visible: true,
				timeout: 1000
			});

			console.log(`  | clicking ${name}…`);
			if (waitForNavigation) {
				await Promise.all([
					page.waitForNavigation({waitUntil: 'networkidle0'}),
					element.click()
				]);
			} else {
				await element.click();
			}

			return element;
		} catch (error) {
			if (displayError) {
				console.log(
					`  | ${chalk.redBright(`error: ${String(error.message)}`)}`
				);
			}
		}
	}

	async function type({
		name,
		selector,
		text,
		displayError = true
	}: TypeOptions): Promise<puppeteer.ElementHandle | undefined> {
		try {
			console.log(`  | waiting for ${name}…`);
			const element = await page.waitForSelector(selector, {
				visible: true,
				timeout: 1000
			});

			console.log(`  | typing "${text}" in ${name}…`);
			await element.click({clickCount: 3});
			await page.keyboard.press('Backspace');
			await element.type(text);

			return element;
		} catch (error) {
			if (displayError) {
				console.log(
					`  | ${chalk.redBright(`error: ${String(error.message)}`)}`
				);
			}
		}
	}

	async function waitForTransactionRefresh(): Promise<void> {
		try {
			console.log('  | waiting for transaction to refresh…');
			await page.waitForSelector('.transactions-refresh-notice', {
				hidden: true,
				timeout: 2500
			});
		} catch {}
	}
};
