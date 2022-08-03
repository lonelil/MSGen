const puppeteer = require('puppeteer-extra')
const fs = require('fs')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

function jew() {
	try {
		puppeteer.launch({ headless: false, args: ['--incognito'] }).then(async browser => {
			global.monkey = null;
			const context = await browser.createIncognitoBrowserContext();
			const page = await context.newPage();
			await page.goto('https://signup.live.com/');
			const client = await page.target().createCDPSession();
			await client.send('Network.enable');
			await client.on("Network.requestWillBeSent", async message => {
				try {
					global.monkey = message['request']['postData'].split("bda=")[1].split("&")[0].replace("%3D", "=")
					await browser.close()
				} catch (ex) {}
			});

			const canvas = fs.readFileSync('poop.js', 'utf8')
			const enforce = fs.readFileSync('enforce.js', 'utf8')

			const sex = await page.evaluate(async (canvas, enforce) => {
				const scriptPromise = await (new Promise((resolve, reject) => {
					const script = document.createElement('script');
					document.body.appendChild(script);
					script.onload = resolve;
					script.onerror = reject;
					script.async = true;
					script.src = 'https://client-api.arkoselabs.com/cdn/fc/js/99892565cf607a88b18fb8d2cc033605ae5afdfd/standard/funcaptcha_api.js';
				}));
				console.log(scriptPromise)
				ArkoseEnforcement({"public_key": "B7D8911C-5CC8-A9A3-35B0-554ACEE604DA"});
				return {
					"fp-time": new Date().getTime(),
					"webdriver": navigator.webdriver,
					"agent": window.navigator.userAgent
				}
			}, canvas, enforce)
			global.agent = sex.agent
		});
	} catch (ex) {
		jew();
	}
}

jew();

const http = require('http');
global.time = Date.now();
const requestListener = function (req, res) {
	if (Date.now() - global.time > 32000) {
		global.time = Date.now();
		jew();
	}
	res.writeHead(200);
	res.end(JSON.stringify({"agent": global.agent, "bda": global.monkey}));
}

const server = http.createServer(requestListener);
server.listen(8082);