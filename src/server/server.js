const path = require('path')
const express = require('express')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const app = express(),
            DIST_DIR = __dirname,
            HTML_FILE = path.join(DIST_DIR, 'index.html')

app.use(multer().none())

app.use(express.static(DIST_DIR))

// app.get('*', (req, res) => {
//     res.sendFile(HTML_FILE)
// })

const testList = []


app.get('/api/v1/list', (req, res) => {
    res.json(testList)
})


app.post('/api/v1/add', (req, res) => {
    // クライアントからの送信データを取得する
    const data = req.body

    // ユニークIDを生成する
    data.id = uuidv4()

    // TODOリストに項目を追加する
    const item = {
        device: data.device,
        headless: data.headless,
        testUrl: data.testUrl,
        prdUrl: data.prdUrl,
        pageList: data.pageList.split(',').filter(Boolean),
    }

    testList.push(item)

    // コンソールに出力する
    console.log(`Add: ${JSON.stringify(data)}`)

    // テストの実行
    runPuppeteerCheck(item)

    // 追加した項目をクライアントに返す
    res.json(item)
})


const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`App listening to ${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})

function runPuppeteerCheck(item) {
    const puppeteer = require('puppeteer')
    const looksSame = require('looks-same')
    const devices = require('puppeteer/DeviceDescriptors')
    const IS_SP_MODE = item.device == 'sp';
    console.log(item);

    (async () => {
        const browser = await puppeteer.launch({
            headless: item.headless == 'true', // headeless実行の場合true
            // slowMo: 10 // 実行速度を遅らせる
        })

        const page = await browser.newPage()
        if (IS_SP_MODE) {
            await page.setUserAgent('Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30');
            await page.setViewport({ width: 375, height: 667 })

            // const iPhone = devices['iPhone 6']
            // await page.emulate(iPhone); // Set device
        }

        function getImgName(path) {
            let imgName = path
            imgName = imgName.slice(1)
            imgName = imgName.replace(/\//g, '__')
            imgName = imgName.replace(/\.php/g, '')
            imgName = imgName.replace(/\?/g, '--')

            return imgName
        }

        // 新サイトのスクショ取得
        await (async () => {
            const domain = item.testUrl

            for (let i = 0; i < item.pageList.length; i++) {
                const imgName = await getImgName(item.pageList[i])
                // await page.goto(domain + item.pageList[i])
                await Promise.all([
                    page.waitForNavigation(),
                    page.goto(domain + item.pageList[i])
                ]);
                await page.screenshot({path: 'new/'+imgName+'.png', fullPage: true})
            }
        })()

        // 旧サイトのスクショ取得、比較
        await (async () => {
            const domain = item.prdUrl

            for (let i = 0; i < item.pageList.length; i++) {
                await (async () => {
                    const imgName = await getImgName(item.pageList[i])
                    await Promise.all([
                        page.waitForNavigation(),
                        page.goto(domain + item.pageList[i])
                    ]);
                    await Promise.all([
                        page.screenshot({path: 'old/'+imgName+'.png', fullPage: true})
                    ]);
                    await Promise.all([
                        looksSame.createDiff({
                            reference: 'new/'+imgName+'.png',
                            current: 'old/'+imgName+'.png',
                            diff: 'diff/'+imgName+'.png',
                            highlightColor: '#ff00ff', // color to highlight the differences
                            strict: false, // strict comparsion
                            tolerance: 2.5,
                            antialiasingTolerance: 0,
                            ignoreAntialiasing: true, // ignore antialising by default
                            ignoreCaret: true // ignore caret by default
                        }, function (error) {
                            if (error) {
                                console.error('Can not diff ' + imgName+'.png because of ' + error)
                            }
                            // equal will be true, if images looks the same
                        })
                    ])
                })()
            }
        })()

        // ブラウザを閉じる
        await browser.close()
    })()

}