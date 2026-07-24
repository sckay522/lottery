const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/cwl_api': {
        target: 'https://www.cwl.gov.cn',
        changeOrigin: true,
        pathRewrite: { '^/cwl_api': '' }
      }
    }
  }
})
