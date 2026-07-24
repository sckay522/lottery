const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// API 代理
app.use('/cwl_api', createProxyMiddleware({
  target: 'https://www.cwl.gov.cn',
  changeOrigin: true,
  pathRewrite: { '^/cwl_api': '' }
}))

// 静态文件（打包后的 dist 目录）
app.use(express.static(path.join(__dirname, 'dist')))

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
