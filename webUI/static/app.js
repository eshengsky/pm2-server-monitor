/*
 * @Author: Sky.Sun 
 * @Date: 2018-08-22 14:53:48 
 * @Last Modified by: Sky.Sun
 * @Last Modified time: 2018-12-03 14:34:07
 */

const app = new Vue({
    el: '.container',
    data: {
        /**
         * 服务器传送数据的间隔时间
         */
        interval: 1000,

        /**
         * 服务器信息列表
         */
        servers: servers,

        currentProject: Object.keys(servers)[0],

        socketQueue: [],

        year: new Date().getFullYear()
    },
    mounted() {
        // 根据url参数确定要展示的服务器
        const url = new URL(window.location.href);
        const server = url.searchParams.get('server');
        if (server) {
            this.currentProject = server;
        }

        // 首次加载ws
        this.resetSocket();
    },
    computed: {
        /**
         * 获取服务器的ip和端口
         */
        getIps: function () {
            return this.servers[this.currentProject];
        }
    },
    methods: {
        /**
         * 获取项目信息
         */
        getProjects: function () {
            return Object.keys(this.servers);
        },

        getPathValue: function(object, path, defaultVal = '') {
            let ret = defaultVal;
            if (object === null || typeof object !== 'object' || typeof path !== 'string') {
                return ret;
            }
            path = path.split(/[\.\[\]]/).filter(n => n != '');
            let index = -1;
            const len = path.length;
            let key;
            let result = true;
            while (++index < len) {
                key = path[index];
                if (!Object.prototype.hasOwnProperty.call(object, key) || object[key] == null) {
                    result = false;
                    break;
                }
                object = object[key];
            }
            if (result) {
                ret = object;
            }
            return ret;
        },

        /**
         * 重置WebSocket连接
         */
        resetSocket: function () {
            // 切换后，先关闭之前所有的websocket连接
            if (this.socketQueue.length > 0) {
                this.socketQueue.forEach(socket => {
                    socket.close();
                });
                this.socketQueue = [];
            }
            const ips = this.servers[this.currentProject];
            ips.forEach(item => {
                const socket = io(`ws://${item.ip}:${item.port + 3000}?interval=${this.interval}`, {
                    transports: ['websocket']
                });
                this.socketQueue.push(socket);
                const statsEl = document.getElementById(`ip${item.ip}:${item.port}`);
                socket.on('stats', data => {
                    // stats-panel-title
                    statsEl.querySelector('.hostname').textContent = this.getPathValue(data, 'totalData.hostname', 'host');
                    statsEl.querySelector('.cpus').textContent = this.getPathValue(data, 'totalData.cpus', '0');
                    statsEl.querySelector('.cpuUsage').textContent = this.getPathValue(data, 'totalData.cpuUsage', '0%');
                    const cpuUsageCls = this.getPathValue(data, 'totalData.cpuUsageCls');
                    if (cpuUsageCls) {
                        statsEl.querySelector('.cpuUsage').classList.add(cpuUsageCls);
                    } else {
                        statsEl.querySelector('.cpuUsage').classList.remove('red');
                    }
                    statsEl.querySelector('.memUsage').textContent = this.getPathValue(data, 'totalData.memUsage', '0%');
                    statsEl.querySelector('.freemem').textContent = this.getPathValue(data, 'totalData.freemem', '0B');
                    statsEl.querySelector('.totalmem').textContent = this.getPathValue(data, 'totalData.totalmem', '0B');
                    statsEl.querySelector('.nodev').textContent = this.getPathValue(data, 'totalData.node_version', '0');
                    // statsEl.querySelector('.pm2v').textContent = this.getPathValue(data, 'totalData.pm_version', '0');
                    statsEl.querySelector('.godid').textContent = this.getPathValue(data, 'totalData.godid', '');

                    // stats-panel-row
                    statsEl.querySelector('.projectName').textContent = this.getPathValue(data, 'totalData.name', 'app');
                    statsEl.querySelector('.instances').textContent = this.getPathValue(data, 'totalData.instances', 'x0');
                    statsEl.querySelector('.cpu').textContent = this.getPathValue(data, 'totalData.cpu', '0%');
                    const cpuCls = this.getPathValue(data, 'totalData.cpuCls');
                    if (cpuCls) {
                        statsEl.querySelector('.cpu').classList.add(cpuCls);
                    } else {
                        statsEl.querySelector('.cpu').classList.remove('red');
                    }
                    
                    statsEl.querySelector('.memory').textContent = this.getPathValue(data, 'totalData.memory', '0B');
                    statsEl.querySelector('.restart').textContent = this.getPathValue(data, 'totalData.restart', '0');
                    statsEl.querySelector('.runtime').textContent = this.getPathValue(data, 'totalData.totalUptime', '0s');

                    // stats-panel-list
                    let html = '';
                    if (data.processData && data.processData.length > 0) {
                        data.processData.forEach(item => {
                            const cpuCls = this.getPathValue(item, 'cpuCls');
                            html += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.pmid}</td>
                            <td>${item.mode}</td>
                            <td>${item.pid}</td>
                            <td class="${item.status}">${item.status}</td>
                            <td>${item.restart}</td>
                            <td>${item.uptime}</td>
                            <td class="${cpuCls}">${item.cpu}</td>
                            <td>${item.memory}</td>
                            <td>${item.user}</td>
                        </tr>
                        `;
                        });
                    }
                    statsEl.querySelector('.stats-panel-list tbody').innerHTML = html;
                });
            });
        }
    },
    watch: {
        currentProject: function () {
            const url = new URL(location.href);
            url.searchParams.set('server', this.currentProject);
            window.history.replaceState(null, '', url.href);
            this.$nextTick(() => {
                this.resetSocket();
            })
        }
    }
});
