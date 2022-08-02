const Outlook = require('./outlook')
const fs = require('fs')

function start(data) {
    try {
        const outlook = new Outlook(data)
        outlook.start()
    } catch (err) {
        start(data)
    }
}

const { Worker, isMainThread } = require('node:worker_threads');

if (isMainThread) {
	for(var i = 0; i < 10; i++) {
		new Worker(__filename);
	}
} else {
	fs.readFile('./proxies.txt', 'utf8', (err, data) => {
		const rawProxies = []
		if (err) {
			console.log("Error reading proxies");
			process.exit()
		} else {
			data.split('\n').forEach(proxy => {
				rawProxies.push(proxy.trim())
			});
		}
		let capKey = ""
		let webhook = "https://discord.com/api/webhooks/1001320310747955301/reog1gjyhMhF5ukBAF7Pl8iLkBe1unmFuxMFmk2hX1XZbewyjxx3yphMWQ5CxLj8H85v"
		let taskCount = 25
		let captchaLimit = 11
		for (let i = 0; i < taskCount; i++) {
			const data = {id: i, key: capKey, webhook: webhook, limit: captchaLimit, proxyList: rawProxies}
			start(data)
		}
	});
}