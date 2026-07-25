const https = require('https')
const fs = require('fs')
const path = require('path')

const API_URL = 'https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq&issueCount=&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30000&week=&systemType=PC'

https.get(API_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    const outDir = path.join(__dirname, '..', 'public')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'lottery-data.json'), data)
    console.log('✓ 数据已保存到 public/lottery-data.json')
  })
}).on('error', err => {
  console.error('✗ 抓取失败:', err.message)
  process.exit(1)
})
