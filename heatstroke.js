import config from './config'
import Api from './api'

var log = function () {
	return console.log(...arguments);
}

const api = new Api(config);

var fs = require('fs');
var ini = require('ini');

const https = require('https');

var config2 = ini.parse(fs.readFileSync("./config/config.ini", 'utf-8'));

const city = config2.General.city;
const state = config2.General.state;
const key = config2.General.key;
const maxTemp = config2.Safety.maxtemp;
const hours = config2.Safety.hours;

const url = "https://api.openweathermap.org/data/2.5/weather?q=" + city + "," + state + "&units=imperial&" + "appid=" + key;
const workerurl = "/main/api/v2/mining/rig2/status2";

function trigger(data){
    var temp = data.main.temp;
    var currentdate = new Date();
    var datetime = currentdate.getDay() + "/" + currentdate.getMonth() 
    + "/" + currentdate.getFullYear() + " " 
    + currentdate.getHours() + ":" 
    + currentdate.getMinutes() + ":" + currentdate.getSeconds();

    // get server time - required
    var x = 'START';
    if(temp > maxTemp){
        x = 'STOP';
    }
    api.getTime()
    .then(() => {
        var body = {rigId: '0-JcoWnDfMeVqTKlUA3rRolQ', action:x};
        return api.post('/main/api/v2/mining/rigs/status2', {body});
    })
    .then(res => {
        log(datetime+ " - " + temp, res);
    })

    .catch(err => {
        if(err && err.response) log(err.response.request.method,err.response.request.uri.href);
        log('ERROR', err.error || err);
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
            var ret = JSON.parse(data);
            trigger(ret);
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

callback();
setInterval(callback, 1000*60*60*hours);
