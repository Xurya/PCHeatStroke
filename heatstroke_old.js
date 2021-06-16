var fs = require('fs');
var ini = require('ini');
const https = require('https');
const axios = require('axios');

const CryptoJS = require("crypto-js");

const crypto = require('crypto');
const { sep } = require('path');

var config = ini.parse(fs.readFileSync("./config/config.ini", 'utf-8'));

const city = config.General.city;
const state = config.General.state;
const key = config.General.key;
const maxTemp = config.Safety.maxtemp;
const hours = config.Safety.hours;

const url = "https://api.openweathermap.org/data/2.5/weather?q=" + city + "," + state + "&units=imperial&" + "appid=" + key;
const workerurl = "/main/api/v2/mining/rig2/status2";

function trigger(data){
    var temp = data.main.temp;
    var currentdate = new Date();
    var datetime = currentdate.getDay() + "/" + currentdate.getMonth() 
    + "/" + currentdate.getFullYear() + " " 
    + currentdate.getHours() + ":" 
    + currentdate.getMinutes() + ":" + currentdate.getSeconds();
    console.log(datetime+ " - " + temp);

    https.get("https://api2.nicehash.com/api/v2/time", (resp)=>{
        var data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            var headers = [];
            ret = JSON.parse(data);
            headers['X-Time'] = '' + ret.serverTime;
            headers['X-Nonce'] = crypto.randomBytes(36).toString('hex');
            headers['X-Request-Id'] = headers['X-Nonce'];
            headers['X-User-Agent'] = 'NHNodeClient';
            headers['X-User-Lang'] = 'en';
            headers['X-Organization-Id'] = config.Rig.org;
            headers['Content-Type'] = 'application/json'

            var body = [];
            body['rigId'] = config.Rig.worker; 
            if(temp > maxTemp){
                body['action'] = 'STOP';
            } else {
                body['action']="START";
            }

            body = JSON.stringify(body);

            //generate xauth
            var xauth = config.Rig.key + ":";
            // var separator = Buffer.alloc(1);
            // var p1 = Buffer.from('' + config.Rig.key, 'latin1');
            // var p2 = Buffer.from('' + headers['X-Time'], 'latin1');
            // var p3 = Buffer.from(headers['X-Nonce'], 'latin1');
            // var p5 = Buffer.from(headers['X-Organization-Id'], 'latin1');
            // var p7 = Buffer.from('POST', 'latin1');
            // var p8 = Buffer.from(workerurl, 'latin1');
            // var p10 = Buffer.from(body, 'UTF-8');
            // var arr = [p1, separator, p2, separator, p3, separator, separator, separator, p5, separator, separator, separator, p7, separator, p8, separator, separator, separator, p10];
            // var buf = Buffer.concat(arr);

            // var hash = crypto.createHmac('SHA256', config.Rig.skey).update(buf).digest('hex');

            const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, config.Rig.skey);

            hmac.update(config.Rig.key);
            hmac.update("\0");
            hmac.update(headers['X-Time']);
            hmac.update("\0");
            hmac.update(headers['X-Nonce']);
            hmac.update("\0");
            hmac.update("\0");
            if (config.Rig.org) hmac.update(config.Rig.org);
            hmac.update("\0");
            hmac.update("\0");
            hmac.update('POST');
            hmac.update("\0");
            hmac.update(workerurl);
            hmac.update("\0");
            hmac.update("\0");
            hmac.update(body);
            var hash = hmac.finalize().toString(CryptoJS.enc.Hex)

            xauth = xauth + hash;
            headers['X-Auth'] = xauth;

            console.log(headers);
            
            axios.post('https://api2.nicehash.com' + workerurl, body, {
                headers: headers
            }).then(res => {
                console.log('statusCode: ${res.statusCode}')
                //console.log(res)
              })
              .catch(error => {
                console.error(error.response.data.errors)
              })
            
        });
    })
}

function callback(){
    https.get(url, (resp) => {
        var data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            ret = JSON.parse(data);
            trigger(ret);
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

callback();
setInterval(callback, 1000*60*60*hours);
