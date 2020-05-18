const puppeteer = require('puppeteer')
const looksSame = require('looks-same')
const pageData = require('./pagedata.js');

const domain = 'https://github.com'

(async () => {
    const browser = await puppeteer.launch({
        // headless: true, // headeless実行の場合true
        // slowMo: 10　// 実行速度を遅らせる
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 800 })

    // 新サイトのスクショ取得
    await (async () => {
        for(let i = 0; i < pageData.length; i++) {
            await page.goto(domain+pageData[i].path)
            await page.screenshot({path: 'new/'+pageData[i].title+'.png', fullPage: true})
        }
    })()

    // 旧サイトのスクショ取得、比較
    await (async() => {
        await page.goto(domain)
        for(let i = 0; i < pageData.length; i++) {
            await page.goto(domain+pageData[i].path)
            await page.screenshot({path: 'old/'+pageData[i].title+'.png', fullPage: true})

            await looksSame.createDiff({
                reference: 'new/'+pageData[i].title+'.png',
                current: 'old/'+pageData[i].title+'.png',
                diff: 'diff/'+pageData[i].title+'.png',
                highlightColor: '#ff00ff', // color to highlight the differences
                strict: false, // strict comparsion
                tolerance: 2.5,
                antialiasingTolerance: 0,
                ignoreAntialiasing: true, // ignore antialising by default
                ignoreCaret: true // ignore caret by default
            }, function(error) {
                // equal will be true, if images looks the same
            })
        }
    })()

    // ブラウザを閉じる
    await browser.close()
})()