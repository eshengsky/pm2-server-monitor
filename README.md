# pm2-server-monitor

The monitor for pm2 servers, with nice web UI.

## Preview
![image](https://raw.githubusercontent.com/eshengsky/pm2-server-monitor/master/preview.png)

## Usage

Install the monitor module with npm, in your project:

```bash
> npm i --save pm2-server-monitor
```

Use the module in top of your project code:

```js
const monitor = require('pm2-server-monitor');
monitor({
    // your server name, as a flag
    name: 'local',

    // your server listening port
    port: 3001
});
```
*Your can view the `./example` folder for reference.*

Start your server with PM2, don't forget the `--no-treekill` argument:

```bash
> pm2 start bin/www -i max --no-treekill
```

Add the servers info in `./webUI/config.js` file:

```js
const servers = {
    'local': [{
        ip: '127.0.0.1',
        port: 3001,
        show: false
    }]
}
```

Open `./webUI/index.html` to see the monitor UI.

**Note:** you can put the `./webUI` folder anywhere, it has zero dependencies.

Enjoy it :)

## License
The MIT License (MIT)

Copyright (c) 2018 Sky

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.