/**
 * 每个服务（如node_pro, ssr）都会有独立的一个god进程，用来做监控
 * 由传递进来的参数：pmExecPath，和pm2 api返回的数据做匹配，来判断究竟是哪个服务
 */

const socketIo = require('socket.io');
const pm2 = require('pm2');
const os = require('os');
const ps = require('ps-node');
const http = require('http');
const osUtil = require('os-utils');
const hostname = os.hostname();
const cpus = os.cpus()
    .length;
const totalmemNum = os.totalmem();
const totalmem = memoryString(os.totalmem());
const nodev = process.version;
const godid = process.pid;

/**
 * 额外增加的端口号
 */
const portAppend = 3000;

/**
 * CPU阈值（系统）
 */
const cpuThreshold = 90;

// 将端口加一些值，作为http和ws的端口号
const port = parseInt(process.argv[3]) + portAppend;
const projectName = process.argv[5];
const pmExecPath = process.argv[6];

const httpServer = http.createServer((req, res) => {
    if (req.url.startsWith('/killMonitor')) {
        ps.kill(process.pid);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Monitor process pid: ${godid}`);
});
httpServer.listen(port, () => {
    console.log(`listening on port ${port}`);
});
const io = socketIo(httpServer);

function memoryString(byteLen) {
    // 得到MB
    let mem = byteLen / 1024 / 1024;
    if (mem.toFixed() >= 1000) {
        // 转为GB
        mem = (mem / 1024)
            .toFixed(2);
        return `${mem}GB`;
    }
    mem = mem.toFixed(2);
    return `${mem}MB`;
}

function timeString(time, style = 1) {
    const date = new Date(time);
    const month = (date.getMonth() + 1)
        .toString()
        .length > 1 ? (date.getMonth() + 1) : `0${date.getMonth() + 1}`;
    const day = date.getDate()
        .toString()
        .length > 1 ? date.getDate() : `0${date.getDate()}`;
    const hour = date.getHours()
        .toString()
        .length > 1 ? date.getHours() : `0${date.getHours()}`;
    const minute = date.getMinutes()
        .toString()
        .length > 1 ? date.getMinutes() : `0${date.getMinutes()}`;
    const second = date.getSeconds()
        .toString()
        .length > 1 ? date.getSeconds() : `0${date.getSeconds()}`;
    let milliseconds = date.getMilliseconds().toString();
    if (milliseconds.length === 2) {
        milliseconds = `0${milliseconds}`;
    } else if (milliseconds.length === 1) {
        milliseconds = `00${milliseconds}`;
    }

    if (style === 1) {
        return `${month}/${day} ${hour}:${minute}:${second}`;
    }

    if (style === 2) {
        return `${month}-${day} ${hour}:${minute}:${second}.${milliseconds}`;
    }
}

function totalUptimeString(time) {
    const diff = Date.now() - time;
    const seconds = Math.round(diff / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.round(diff / 1000 / 60);
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.round(diff / 1000 / 60 / 60);
    if (hours < 24) {
        return `${hours}h`;
    }
    const days = Math.round(diff / 1000 / 60 / 60 / 24);
    return `${days}d`;
}

function pm2List() {
    return new Promise(resolve => {
        pm2.list((err, data) => {
            if (err) {
                return resolve([]);
            }
            resolve(data);
        });
    });
}

function getCpuUsage() {
    return new Promise(resolve => {
        osUtil.cpuUsage(val => {
            resolve(Math.round(val * 100));
        });
    });
}

// 接收到新的连接
io.on('connection', socket => {
    console.log('websocket server connect!');
    const timer = setInterval(() => {
        Promise.all([
            pm2List(),
            getCpuUsage()
        ]).then(val => {
            const data = val[0];
            const totalData = {
                hostname,
                cpus,
                cpuUsage: `${val[1]}%`,
                cpuUsageCls: val[1] >= cpuThreshold ? 'red' : '',
                totalmem,
                freemem: memoryString(os.freemem()),
                memUsage: `${Math.round((totalmemNum - os.freemem()) / totalmemNum * 100)}%`,
                node_version: nodev,
                godid,
                memory: 0,
                cpu: 0,
                restart: 0,
            };
            if (data && data.length > 0) {
                const processData = [];
                let totalUptime;
                let instances = 0;
                data.forEach(t => {
                    // pm2启动脚本一致，说明是集群模式启动的同一系列进程
                    if (t.pm2_env.pm_exec_path === pmExecPath) {
                        const memory = t.monit ? Number(t.monit.memory) : 0;
                        totalData.memory += memory;
                        instances++;
                        const cpu = t.monit ? Math.min(parseInt(t.monit.cpu), 100) : 0;
                        totalData.cpu = totalData.cpu + cpu;
                        totalData.name = t.name;
                        totalData.pm_version = `v${t.pm2_env._pm2_version || 0}`;
                        totalData.restart += t.pm2_env.restart_time;

                        // 启动模式
                        let mode = t.pm2_env.exec_mode;
                        if (mode.indexOf('_mode') > 0) {
                            mode = mode.substring(0, mode.indexOf('_mode'));
                        }

                        let processUptime = '-';
                        if (t.pm2_env.status === 'online') {
                            processUptime = timeString(t.pm2_env.pm_uptime);

                            // 取最小的uptime
                            if (!totalUptime) {
                                totalUptime = t.pm2_env.pm_uptime;
                            } else if (totalUptime > t.pm2_env.pm_uptime) {
                                totalUptime = t.pm2_env.pm_uptime;
                            }
                        }
                        console.log(t)
                        processData.push({
                            name: t.name,
                            mode,
                            pmid: t.pm_id,
                            pid: t.pid,
                            memory: memoryString(memory),
                            cpu: `${cpu}%`,
                            cpuCls: cpu >= cpuThreshold ? 'red' : '',
                            uptime: processUptime,
                            restart: t.pm2_env.restart_time,
                            status: t.pm2_env.status,
                            user: t.pm2_env.username
                        });
                    }
                });
                totalData.instances = `x${instances}`;
                totalData.totalUptime = totalUptime ? totalUptimeString(totalUptime) : '0';
                totalData.cpu = `${Math.round(totalData.cpu / instances)}%`;
                totalData.cpuCls = Math.round(totalData.cpu / instances) >= cpuThreshold ? 'red' : '';
                totalData.memory = memoryString(totalData.memory / instances);
                socket.emit('stats', { totalData, processData });
            } else {
                socket.emit('stats', { totalData });
            }
        });
    }, socket.handshake.query.interval || 1000);

    // 断开后，清除计时器
    socket.on('disconnect', () => {
        console.log('disconnect!');
        clearInterval(timer);
    });
});
