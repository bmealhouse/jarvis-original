import * as chalk from 'chalk';
import {Simple} from '../../types';
import bootstrapProgram from '../bootstrap-program';
import outputDryRun from './output-dry-run';
import processTransactions from './process-transactions';
import updateTransaction from './update-transaction';

bootstrapProgram(async ({browser, page}) => {
	if (!browser || !page) {
		console.log('Processing transactions…');
		outputDryRun(processTransactions());
		return;
	}

	let transactions: Simple.Transaction[] = [];
	page.on('requestfinished', async request => {
		const url = request.url();
		if (url.includes('/transactions-gather')) {
			const response = request.response();
			if (response?.ok()) {
				transactions = (await response.json()) as Simple.Transaction[];
			}
		}
	});

	console.log('Filtering activity by all time…');
	await page.click('.filter-expand');
	await page.select('.time-span-options > select', 'all');
	await page.waitForSelector('main.-loading', {hidden: true});
	await page.waitFor(1000); // Additionl wait time

	const stopAtPage = 1;

	let currentPage = 1;
	let hasNextPage;
	console.log('Processing transactions…');

	/* eslint-disable no-await-in-loop */

	while (transactions.length === 0 || hasNextPage === undefined) {
		await page.waitFor(100);
		hasNextPage = await page.$$eval(
			'.transactions-paging .icon-right-arrow',
			pagingArrows => pagingArrows.length > 0
		);
	}

	const transactionUpdates = processTransactions(transactions);
	for (const update of transactionUpdates) {
		await updateTransaction(page, update);
	}

	transactions = [];

	while (hasNextPage && currentPage < stopAtPage) {
		console.log(
			`\n${chalk.bgMagenta.black(` Navigating to page ${currentPage + 1}… `)}`
		);

		try {
			await Promise.all([
				page.waitForNavigation({waitUntil: 'networkidle0'}),
				page.click('.transactions-paging li:last-of-type')
			]);
		} catch (error) {
			console.log(chalk.redBright(` error: ${String(error.message)}`));
		}

		currentPage += 1;
		hasNextPage = undefined;

		await page.waitForSelector('main.-loading', {hidden: true});
		await page.waitFor(1000); // Additionl wait time

		try {
			await page.waitForSelector('.transactions-paging .paging-arrow', {
				visible: true
			});
		} catch (error) {
			console.log(chalk.redBright(` error: ${String(error.message)}`));
		}

		while (transactions.length === 0 || hasNextPage === undefined) {
			await page.waitFor(100);
			hasNextPage = await page.$$eval(
				'.transactions-paging .icon-right-arrow',
				pagingArrows => pagingArrows.length > 0
			);
		}

		const transactionUpdates = processTransactions(transactions);
		for (const update of transactionUpdates) {
			await updateTransaction(page, update);
		}

		transactions = [];
	}

	/* eslint-enable no-await-in-loop */

	console.log('\nDone.');
});
