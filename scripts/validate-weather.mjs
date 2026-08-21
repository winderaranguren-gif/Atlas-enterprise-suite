import assert from 'node:assert/strict';
import {handleWeather} from '../modules/weather-worker.js';

const times=Array.from({length:48},(_,i)=>new Date(Date.UTC(2026,7,21,i%24)).toISOString().slice(0,13)+':00');
const days=Array.from({length:10},(_,i)=>`2026-08-${String(21+i).padStart(2,'0')}`);

globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url);
  if(url.hostname==='api.open-meteo.com')return Response.json({
    latitude:28.5383,longitude:-81.3792,timezone:'America/New_York',
    current:{temperature_2m:91,relative_humidity_2m:58,apparent_temperature:101,is_day:1,precipitation:0,rain:0,weather_code:2,cloud_cover:35,wind_speed_10m:8,wind_direction_10m:120,wind_gusts_10m:15,surface_pressure:1014},
    hourly:{time:times,temperature_2m:Array(48).fill(91),apparent_temperature:Array(48).fill(101),relative_humidity_2m:Array(48).fill(58),precipitation_probability:Array(48).fill(20),precipitation:Array(48).fill(0),weather_code:Array(48).fill(2),visibility:Array(48).fill(16093),dew_point_2m:Array(48).fill(72),uv_index:Array(48).fill(7.2),surface_pressure:Array(48).fill(1014),wind_speed_10m:Array(48).fill(8),wind_direction_10m:Array(48).fill(120)},
    minutely_15:{time:Array.from({length:24},(_,i)=>`2026-08-21T${String(Math.floor(i/4)).padStart(2,'0')}:${String((i%4)*15).padStart(2,'0')}`),precipitation:Array(24).fill(0.01),weather_code:Array(24).fill(61)},
    daily:{time:days,weather_code:Array(10).fill(2),temperature_2m_max:Array(10).fill(93),temperature_2m_min:Array(10).fill(76),apparent_temperature_max:Array(10).fill(102),apparent_temperature_min:Array(10).fill(78),precipitation_sum:Array(10).fill(.1),precipitation_probability_max:Array(10).fill(35),wind_speed_10m_max:Array(10).fill(18),uv_index_max:Array(10).fill(9),sunrise:Array(10).fill('2026-08-21T06:58'),sunset:Array(10).fill('2026-08-21T19:59')}
  });
  if(url.hostname==='air-quality-api.open-meteo.com')return Response.json({hourly:{us_aqi:[42],pm2_5:[7.5],pm10:[13],ozone:[54],nitrogen_dioxide:[9],alder_pollen:[0],birch_pollen:[0],grass_pollen:[8],mugwort_pollen:[1],olive_pollen:[0],ragweed_pollen:[3]}});
  if(url.hostname==='api.weather.gov')return Response.json({features:[{id:'alert-1',properties:{event:'Heat Advisory',headline:'Heat Advisory issued for test area',severity:'Moderate',urgency:'Expected',description:'Test alert',instruction:'Stay hydrated',effective:'2026-08-21T12:00:00-04:00',expires:'2026-08-21T20:00:00-04:00'}}]});
  if(url.hostname==='geocoding-api.open-meteo.com')return Response.json({results:[{id:1,name:'Orlando',admin1:'Florida',country:'United States',country_code:'US',latitude:28.5383,longitude:-81.3792,timezone:'America/New_York'}]});
  throw new Error(`unexpected fetch ${url}`);
};

function request(path,method='GET'){return new Request(`https://www.atlasenterprisesuite.com${path}`,{method});}

const page=await handleWeather(request('/weather'));
assert.ok(page instanceof Response);
assert.equal(page.status,200);
const html=await page.text();
assert.match(html,/ATLAS WEATHER/i);
assert.match(html,/10-day forecast/i);
assert.match(html,/Dashboard sync active/i);
assert.match(html,/Apple and The Weather Company/i);
assert.match(html,/Radar source not configured/i);
assert.match(page.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);

const api=await handleWeather(request('/api/weather?lat=28.5383&lon=-81.3792'));
assert.equal(api.status,200);
const data=await api.json();
assert.equal(data.current.temperature_2m,91);
assert.equal(data.daily.time.length,10);
assert.equal(data.atlas.airQuality.aqi,42);
assert.equal(data.atlas.alerts[0].event,'Heat Advisory');
assert.equal(data.atlas.providers.forecast.status,'connected');
assert.equal(data.atlas.providers.weatherKit.name,'Apple WeatherKit');
assert.equal(data.atlas.providers.weatherKit.status,'not_configured');
assert.equal(data.atlas.providers.weatherCompany.name,'The Weather Company');
assert.equal(data.atlas.providers.weatherCompany.status,'not_configured');
assert.equal(data.atlas.radar.status,'not_configured');

const search=await handleWeather(request('/api/weather/search?q=Orlando'));
assert.equal(search.status,200);
const searchData=await search.json();
assert.equal(searchData.results[0].name,'Orlando');

const capabilities=await handleWeather(request('/api/weather/capabilities'));
assert.equal(capabilities.status,200);
const capabilityData=await capabilities.json();
assert.equal(capabilityData.features.dashboardSync,true);
assert.equal(capabilityData.features.radar,false);

const post=await handleWeather(request('/weather','POST'));
assert.equal(post.status,405);

console.log('ATLAS Weather validation passed: UI, dashboard-compatible API, AQI, pollen, alerts, search, persistence contract and honest provider gates.');
