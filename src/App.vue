<template>
  <div class="app">
    <h1>双色球开奖结果</h1>
    <button class="gen-btn" @click="showModal = true">随机生成 5 注</button>
    <button class="analysis-btn" @click="showAnalysis = true">冷热分析</button>
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

    <!-- 冷热分析弹窗 -->
    <div v-if="showAnalysis" class="overlay" @click.self="showAnalysis = false">
      <div class="modal modal-wide">
        <div class="modal-header">
          <span>冷热分析</span>
          <button class="close-btn" @click="showAnalysis = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analysis-section">
            <h3 class="section-title">红球 (1-33)</h3>
            <div class="analysis-grid">
              <div v-for="s in analysisData.reds" :key="s.number" class="analysis-item">
                <span class="ball red-mini">{{ pad(s.number) }}</span>
                <span class="analysis-info" :class="{ cold: s.interval > 20 }">
                  <span class="interval">{{ s.interval }}期</span>
                  <span class="detail-text">{{ s.lastIssue }} {{ s.lastDate }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="analysis-section">
            <h3 class="section-title">蓝球 (1-16)</h3>
            <div class="analysis-grid">
              <div v-for="s in analysisData.blues" :key="s.number" class="analysis-item">
                <span class="ball blue-mini">{{ pad(s.number) }}</span>
                <span class="analysis-info" :class="{ cold: s.interval > 20 }">
                  <span class="interval">{{ s.interval }}期</span>
                  <span class="detail-text">{{ s.lastIssue }} {{ s.lastDate }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// JSONP 工具函数（带 5 秒超时）
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '__jsonp_' + Date.now()
    const timer = setTimeout(() => {
      delete window[cbName]
      if (script.parentNode) document.body.removeChild(script)
      reject(new Error('JSONP 请求超时'))
    }, 5000)
    window[cbName] = function(data) {
      clearTimeout(timer)
      delete window[cbName]
      document.body.removeChild(script)
      resolve(data)
    }
    const script = document.createElement('script')
    const sep = url.includes('?') ? '&' : '?'
    script.src = url + sep + 'callback=' + cbName
    script.onerror = function() {
      clearTimeout(timer)
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
      generatedNumbers: [],
      showAnalysis: false,
      analysisData: { reds: [], blues: [] }
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

      // 计算所有号码的间隔期数
      const intervals = this.getBallIntervals()
      const maxInterval = this.list.length

      // 第2注：红球用加权算法，蓝球用最久没出现的号码
      rows.push({
        reds: this.weightedPick(6, 33, intervals.reds, maxInterval),
        blue: this.findFarthestBlue(intervals.blues)
      })
      // 第3注：红球和蓝球都用加权算法
      rows.push({
        reds: this.weightedPick(6, 33, intervals.reds, maxInterval),
        blue: this.weightedPick(1, 16, intervals.blues, maxInterval)[0]
      })
      // 第4-5注：完全随机
      for (let i = 3; i < 5; i++) {
        rows.push(this.randomRow())
      }
      this.generatedNumbers = rows
    },
    getBallIntervals() {
      const reds = {}
      const blues = {}
      for (let i = 1; i <= 33; i++) reds[i] = null
      for (let i = 1; i <= 16; i++) blues[i] = null
      for (let idx = 0; idx < this.list.length; idx++) {
        const item = this.list[idx]
        for (const r of (item.red ? item.red.split(',') : [])) {
          const num = parseInt(r, 10)
          if (reds[num] === null) reds[num] = idx + 1
        }
        const bNum = parseInt(item.blue, 10)
        if (blues[bNum] === null) blues[bNum] = idx + 1
      }
      return { reds, blues }
    },
    // 加权随机选取 count 个数字，范围 1..total
    weightedPick(count, total, intervals, maxInterval) {
      const picked = []
      const candidates = Array.from({ length: total }, (_, i) => i + 1)
      for (let round = 0; round < count; round++) {
        let totalWeight = 0
        for (const n of candidates) {
          if (!picked.includes(n)) {
            totalWeight += intervals[n] || maxInterval
          }
        }
        let rand = Math.random() * totalWeight
        for (const n of candidates) {
          if (picked.includes(n)) continue
          rand -= intervals[n] || maxInterval
          if (rand <= 0) {
            picked.push(n)
            break
          }
        }
      }
      picked.sort((a, b) => a - b)
      return picked
    },
    findFarthestBlue(blues) {
      let farthest = 1
      let maxInterval = -1
      for (let i = 1; i <= 16; i++) {
        const iv = blues[i]
        if (iv === null) return i // 从未出现过，优先选
        if (iv > maxInterval) {
          maxInterval = iv
          farthest = i
        }
      }
      return farthest
    },
    randomReds() {
      const pool = Array.from({ length: 33 }, (_, i) => i + 1)
      const reds = []
      for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        reds.push(pool[idx])
        pool.splice(idx, 1)
      }
      reds.sort((a, b) => a - b)
      return reds
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
    },
    analyzeNumbers() {
      // 初始化统计对象
      const reds = {}
      const blues = {}
      for (let i = 1; i <= 33; i++) reds[i] = { number: i, lastIssue: null, lastDate: null, interval: null }
      for (let i = 1; i <= 16; i++) blues[i] = { number: i, lastIssue: null, lastDate: null, interval: null }

      // 扫描 list（最新在前），记录每个号码第一次出现的位置
      for (let idx = 0; idx < this.list.length; idx++) {
        const item = this.list[idx]
        // 红球
        const redArr = item.red ? item.red.split(',') : []
        for (const r of redArr) {
          const num = parseInt(r, 10)
          if (reds[num] && reds[num].lastIssue === null) {
            reds[num].lastIssue = item.code
            reds[num].lastDate = item.date
            reds[num].interval = idx + 1
          }
        }
        // 蓝球
        const bNum = parseInt(item.blue, 10)
        if (blues[bNum] && blues[bNum].lastIssue === null) {
          blues[bNum].lastIssue = item.code
          blues[bNum].lastDate = item.date
          blues[bNum].interval = idx + 1
        }
      }

      // 转换为数组并排序（间隔大的在前）
      this.analysisData = {
        reds: Object.values(reds).sort((a, b) => {
          if (a.interval === null) return -1
          if (b.interval === null) return 1
          return b.interval - a.interval
        }),
        blues: Object.values(blues).sort((a, b) => {
          if (a.interval === null) return -1
          if (b.interval === null) return 1
          return b.interval - a.interval
        })
      }
    }
  },
  watch: {
    showModal(val) {
      if (val) this.generate()
    },
    showAnalysis(val) {
      if (val) this.analyzeNumbers()
    }
  },
  async mounted() {
    try {
      // 方式1：Capacitor 原生插件（APK 环境，绕过 CORS）
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        if (Capacitor.Plugins.ApiProxy) {
          const result = await Capacitor.Plugins.ApiProxy.fetch({ url: API_DIRECT })
          const json = JSON.parse(result.data)
          this.list = json.result || []
          this.loading = false
          return
        }
        // 插件未加载，降级到 JSONP
      }

      // 方式2：本地预抓取数据（GitHub Actions 定时更新，Render / 静态网站）
      try {
        const res = await fetch('lottery-data.json')
        if (res.ok) {
          const json = await res.json()
          this.list = json.result || []
          this.loading = false
          return
        }
      } catch (_) { /* 本地数据未找到 */ }

      // 方式3：代理（开发服务器 / Node.js 服务器）
      try {
        const res = await fetch(API_PROXY)
        if (res.ok) {
          const json = await res.json()
          this.list = json.result || []
          this.loading = false
          return
        }
      } catch (_) { /* 代理不可用 */ }

      // 方式4：公共 CORS 代理（静态网站部署，绕过 CORS）
      const proxies = [
        'https://corsproxy.io/?url=',
        'https://api.allorigins.win/raw?url='
      ]
      for (const baseUrl of proxies) {
        try {
          const res = await fetch(baseUrl + encodeURIComponent(API_DIRECT), { signal: AbortSignal.timeout(8000) })
          if (res.ok) {
            const json = await res.json()
            this.list = json.result || []
            this.loading = false
            return
          }
        } catch (_) { /* 此代理不可用，尝试下一个 */ }
      }

      // 方式5：JSONP（最后兜底）
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

.analysis-btn {
  display: block;
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  background: #1e6bb8;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.analysis-btn:hover { background: #155096; }

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
.modal-wide {
  max-width: 520px;
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

/* 冷热分析 */
.analysis-section {
  margin-bottom: 16px;
}
.analysis-section:last-child { margin-bottom: 0; }
.section-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px;
}
.analysis-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  background: #f9f9f9;
}
.analysis-item .ball.red-mini,
.analysis-item .ball.blue-mini {
  width: 24px;
  height: 24px;
  font-size: 11px;
  flex-shrink: 0;
}
.analysis-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}
.analysis-info .interval {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.analysis-info .detail-text {
  font-size: 10px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.analysis-info.cold .interval {
  color: #d43c33;
}
</style>
