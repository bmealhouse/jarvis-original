import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import {Simple} from '../../types';
import bootstrapProgram from '../bootstrap-program';

bootstrapProgram(async ({browser, page}) => {
	if (!browser || !page) return;

	const transactions: Simple.Transaction[] = [];

	console.log('Recoding transactions…');
	page.on('requestfinished', async request => {
		const url = request.url();
		if (url.includes('/transactions-gather')) {
			const response = request.response();
			if (response?.ok()) {
				const moreTransactions = (await response.json()) as Simple.Transaction[];
				transactions.push(...moreTransactions);
				console.log(
					`Total transactions recorded: ${chalk.greenBright(
						transactions.length
					)}`
				);
			}
		}
	});

	console.log('Filtering activity by all time…');
	await page.click('.filter-expand');
	await page.select('.time-span-options > select', 'all');
	await page.waitForSelector('main:not(.-loading)');

	let numberOfPagingArrows;
	console.log('Visiting all pages to collect transactions…');

	do {
		// eslint-disable-next-line no-await-in-loop
		await Promise.all([
			page.waitForNavigation({waitUntil: 'networkidle0'}),
			page.click('.transactions-paging li:last-of-type')
		]);

		// eslint-disable-next-line no-await-in-loop
		await page.waitFor(500);

		// eslint-disable-next-line no-await-in-loop
		await page.waitForSelector('.transactions-paging .paging-arrow', {
			visible: true
		});

		// eslint-disable-next-line no-await-in-loop
		numberOfPagingArrows = await page.$$eval(
			'.transactions-paging .paging-arrow',
			pagingArrows => pagingArrows.length
		);
	} while (numberOfPagingArrows !== 1);

	// eslint-disable-next-line unicorn/string-content
	const data = `/* eslint-disable unicorn/string-content */
import {Simple} from '../../types';

// prettier-ignore
const transactions: Simple.Transaction[] =
	${JSON.stringify(transactions)};

export default transactions;
`;

	const filename = path.join(__dirname, '../config/simple-transactions.ts');
	await fs.promises.writeFile(filename, data, 'utf8');

	await browser.close();
});
