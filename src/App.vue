<template>
  <div class="app">
    <h1>双色球开奖结果</h1>
    <button class="gen-btn" @click="showModal = true">随机生成 5 注</button>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="list">
      <div v-for="item in list" :key="item.code" class="card">
        <div class="card-header">
          <span class="issue">第 {{ item.code }} 期</span>
          <span class="date">{{ item.date }}</span>
        </div>
        <div class="balls">
          <span v-for="n in redBalls(item.red)" :key="'r'+n" class="ball red">{{ n }}</span>
          <span class="ball blue">{{ item.blue }}</span>
        </div>
        <div class="info">
          <span>销售额：{{ formatMoney(item.sales) }}</span>
          <span>奖池：{{ formatMoney(item.poolmoney) }}</span>
        </div>
        <div class="detail">{{ item.content }}</div>
      </div>
    </div>

    <!-- 弹窗 -->
    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <span>随机生成 5 注</span>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-for="(row, i) in generatedNumbers" :key="i" class="gen-row">
            <span class="gen-label">第 {{ i + 1 }} 注</span>
            <span v-for="n in row.reds" :key="'r'+n" class="ball red-mini">{{ pad(n) }}</span>
            <span class="ball blue-mini">{{ pad(row.blue) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="regenerate-btn" @click="generate">重新生成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// JSONP 工具函数
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '__jsonp_' + Date.now()
    window[cbName] = function(data) {
      delete window[cbName]
      document.body.removeChild(script)
      resolve(data)
    }
    const script = document.createElement('script')
    const sep = url.includes('?') ? '&' : '?'
    script.src = url + sep + 'callback=' + cbName
    script.onerror = function() {
      delete window[cbName]
      document.body.removeChild(script)
      reject(new Error('JSONP 请求失败'))
    }
    document.body.appendChild(script)
  })
}

const API_PROXY = '/cwl_api/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq&issueCount=&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30000&week=&systemType=PC'
const API_DIRECT = 'https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq&issueCount=&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30000&week=&systemType=PC'

export default {
  name: 'App',
  data() {
    return {
      list: [],
      loading: true,
      error: '',
      showModal: false,
      generatedNumbers: []
    }
  },
  methods: {
    redBalls(red) {
      return red ? red.split(',') : []
    },
    formatMoney(val) {
      if (!val) return '-'
      const num = parseInt(val, 10)
      return (num / 100000000).toFixed(2) + ' 亿元'
    },
    pad(n) {
      return String(n).padStart(2, '0')
    },
    generate() {
      const rows = [{ reds: [5, 8, 9, 22, 23, 25], blue: 13 }]
      for (let i = 1; i < 5; i++) {
        rows.push(this.randomRow())
      }
      this.generatedNumbers = rows
    },
    randomRow() {
      // 从 1-33 中随机选 6 个不重复的红球
      const pool = Array.from({ length: 33 }, (_, i) => i + 1)
      const reds = []
      for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        reds.push(pool[idx])
        pool.splice(idx, 1)
      }
      reds.sort((a, b) => a - b)
      // 蓝球 1-16
      const blue = Math.floor(Math.random() * 16) + 1
      return { reds, blue }
    }
  },
  watch: {
    showModal(val) {
      if (val) this.generate()
    }
  },
  async mounted() {
    try {
      // 方式1：Capacitor 原生插件（APK 环境，绕过 CORS）
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        const result = await Capacitor.Plugins.ApiProxy.fetch({ url: API_DIRECT })
        const json = JSON.parse(result.data)
        this.list = json.result || []
        this.loading = false
        return
      }

      // 方式2：代理（开发服务器 / Node.js 服务器）
      try {
        const res = await fetch(API_PROXY)
        if (res.ok) {
          const json = await res.json()
          this.list = json.result || []
          this.loading = false
          return
        }
      } catch (_) { /* 代理不可用 */ }

      // 方式3：JSONP（桌面浏览器备用）
      const data = await jsonp(API_DIRECT)
      this.list = data.result || []
    } catch (e) {
      this.error = '数据加载失败：' + e.message
    } finally {
      this.loading = false
    }
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f0f2f5; }
.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
h1 {
  text-align: center;
  font-size: 22px;
  color: #d43c33;
  margin-bottom: 20px;
}
.loading, .error {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}
.error { color: #d43c33; }
.card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.issue { font-weight: 600; font-size: 16px; color: #333; }
.date { font-size: 13px; color: #999; }
.balls {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.ball {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.ball.red { background: #d43c33; }
.ball.blue { background: #1e6bb8; }
.info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}
.detail {
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}

/* 按钮 */
.gen-btn {
  display: block;
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  background: #d43c33;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.gen-btn:hover { background: #b82e26; }

/* 弹窗遮罩 */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 440px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  font-weight: 600;
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  line-height: 1;
}
.close-btn:hover { color: #333; }
.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
}
.gen-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.gen-row:last-child { border-bottom: none; }
.gen-label {
  font-size: 12px;
  color: #999;
  min-width: 48px;
}
.ball.red-mini, .ball.blue-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.ball.red-mini { background: #d43c33; }
.ball.blue-mini { background: #1e6bb8; }
.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #eee;
  text-align: center;
}
.regenerate-btn {
  padding: 8px 24px;
  background: #d43c33;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}
.regenerate-btn:hover { background: #b82e26; }
</style>
