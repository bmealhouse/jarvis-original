import * as fs from 'fs';
import * as path from 'path';
import {config} from 'dotenv';
import * as dayjs from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as inquirer from 'inquirer';
import * as puppeteer from 'puppeteer';

config();
dayjs.extend(customParseFormat);

interface ProgramContext {
	browser?: puppeteer.Browser;
	page?: puppeteer.Page;
}

export default async (
	program: (context: ProgramContext) => Promise<void>
): Promise<void> => {
	if (process.env.DRY_RUN) {
		return program({});
	}

	// Check for .lockout file
	const rootDir = path.join(__dirname, '..');
	const files = await fs.promises.readdir(rootDir);
	const lockoutFile = files.find(file => file.includes('.lockout'));
	const lockoutFormat = 'YYYY-MM-DD-hh-mm-A';

	// When a lockout file is found, if it was created more than 24 hours ago,
	// delete it and run normally, otherwise, do a dry run
	if (lockoutFile) {
		const lockoutTimestamp = dayjs(lockoutFile.slice(0, -8), lockoutFormat);
		const twentyFourHoursAgo = dayjs().subtract(24, 'hour');

		if (lockoutTimestamp.isBefore(twentyFourHoursAgo)) {
			console.log('Deleting .lockout file…');
			await fs.promises.unlink(path.join(rootDir, lockoutFile));
		} else {
			return program({});
		}
	}

	const browser = await puppeteer.launch({
		devtools: false,
		headless: false,
		slowMo: 25,
		defaultViewport: {
			width: 1280,
			height: 1000
		}
	});

	const page = await browser.newPage();
	await page.goto('https://signin.simple.com', {
		waitUntil: 'networkidle0'
	});

	console.log('Logging in to simple.com…');
	await page.type('#login_username', process.env.SIMPLE_USERNAME!);
	await page.type('#login_password', process.env.SIMPLE_PASSWORD!);
	await Promise.all([
		page.waitForNavigation({waitUntil: 'networkidle0'}),
		page.click('#signin-btn')
	]);

	try {
		await page.waitForSelector('#login-2fa', {timeout: 2500});
	} catch {
		console.log('  > too many login attempts, creating .lockout file…');
		const filename = `${dayjs().format(lockoutFormat)}.lockout`;
		await fs.promises.writeFile(filename, '', 'utf8');
		await browser.close();
		return;
	}

	// Prompt for verification code
	const {verificationCode} = await inquirer.prompt([
		{name: 'verificationCode', message: 'Verification code:'}
	]);

	console.log('Entering verification code…');
	await page.type('#login-2fa input[name="pin"]', verificationCode);
	await Promise.all([
		page.waitForNavigation({waitUntil: 'networkidle0'}),
		page.click('#login-2fa button[type="submit"]')
	]);

	console.log('Waiting for successful login…');
	await page.waitForSelector('main.-loading', {hidden: true});

	return program({browser, page});
};
