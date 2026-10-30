import React, { useState, useEffect } from 'react';
import {
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
  Umbrella,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  LocateFixed,
  Loader2,
} from 'lucide-react';
import { WeatherInfo } from '../types/workbench';

interface WeatherViewProps {
  weather: WeatherInfo;
  onUpdateWeather: (weather: Partial<WeatherInfo>) => Promise<void>;
}

// Preset city data so user can quickly switch between cities
const CITY_PRESETS: Record<string, Partial<WeatherInfo>> = {
  北京: {
    city: '北京',
    condition: '多云转阵风',
    temp: 14,
    tempMin: 8,
    tempMax: 18,
    feelsLike: 12,
    windDirection: '西北风',
    windScale: 5,
    windWarning: true,
    rainProbability: 15,
    rainWarning: false,
    uvIndex: 4,
    uvWarning: false,
    tempDropWarning: true,
    summaryTip: '换季冷空气入境，伴随 5 级阵风，外出务必添穿防风外套',
    outfitAdvice: '建议：重磅白T + 针织羊毛开衫 + 防风夹克 + 炭灰垂坠西裤',
    umbrellaAdvice: '无需雨伞，但建议包内备好防风丝巾与保温水杯',
  },
  上海: {
    city: '上海',
    condition: '阴有小雨',
    temp: 18,
    tempMin: 15,
    tempMax: 20,
    feelsLike: 17,
    windDirection: '东南风',
    windScale: 3,
    windWarning: false,
    rainProbability: 80,
    rainWarning: true,
    uvIndex: 2,
    uvWarning: false,
    tempDropWarning: false,
    summaryTip: '全天细雨连绵，空气湿润，出门务必随身备好晴雨伞',
    outfitAdvice: '建议：微防水短款防风夹克 + 深色西裤 (防泥点) + 防滑皮鞋',
    umbrellaAdvice: '务必带伞！放在随身包外侧，进出室内顺手收拢防淋湿',
  },
  广州: {
    city: '广州',
    condition: '晴间多云',
    temp: 28,
    tempMin: 22,
    tempMax: 30,
    feelsLike: 31,
    windDirection: '微风',
    windScale: 2,
    windWarning: false,
    rainProbability: 20,
    rainWarning: false,
    uvIndex: 8,
    uvWarning: true,
    tempDropWarning: false,
    summaryTip: '日照强烈紫外线高，中午出门注意防晒补水与防中暑',
    outfitAdvice: '建议：高支纯棉轻薄T恤 + 亚麻混纺直筒裤 + 墨镜 + 遮阳帽',
    umbrellaAdvice: '建议携带轻量黑胶遮阳伞，既防烈日也可防午后突发阵雨',
  },
  深圳: {
    city: '深圳',
    condition: '晴朗',
    temp: 27,
    tempMin: 21,
    tempMax: 29,
    feelsLike: 29,
    windDirection: '东风',
    windScale: 2,
    windWarning: false,
    rainProbability: 10,
    rainWarning: false,
    uvIndex: 8,
    uvWarning: true,
    tempDropWarning: false,
    summaryTip: '晴好微热，紫外线较强，适宜晾晒与户外，外出注意防晒',
    outfitAdvice: '建议：透气短袖/亨利衫 + 燕麦色轻便长裤 + 德训鞋',
    umbrellaAdvice: '携带遮阳晴雨伞',
  },
  杭州: {
    city: '杭州',
    condition: '阴天微风',
    temp: 19,
    tempMin: 14,
    tempMax: 21,
    feelsLike: 18,
    windDirection: '东北风',
    windScale: 3,
    windWarning: false,
    rainProbability: 35,
    rainWarning: false,
    uvIndex: 3,
    uvWarning: false,
    tempDropWarning: false,
    summaryTip: '气温宜人但体感微凉，早晚温差较大，建议两件套叠穿',
    outfitAdvice: '建议：纯白打底 + 燕麦羊毛开衫 + 垂感微锥裤',
    umbrellaAdvice: '建议随身备一把轻量折叠伞备用',
  },
  成都: {
    city: '成都',
    condition: '阴微雨',
    temp: 16,
    tempMin: 12,
    tempMax: 18,
    feelsLike: 15,
    windDirection: '北风',
    windScale: 2,
    windWarning: false,
    rainProbability: 60,
    rainWarning: true,
    uvIndex: 2,
    uvWarning: false,
    tempDropWarning: true,
    summaryTip: '秋意渐浓细雨降温，穿暖和再出门，避免受凉腰酸',
    outfitAdvice: '建议：保暖针织打底 + 呢料翻领夹克 + 加厚西裤',
    umbrellaAdvice: '出门务必随身携带雨伞',
  },
};

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  onUpdateWeather,
}) => {
  const [selectedCity, setSelectedCity] = useState(weather.city || '上海');
  const [locating, setLocating] = useState<boolean>(false);
  const [locateError, setLocateError] = useState<string>('');

  // 根据 Open-Meteo 天气码映射中文天气描述
  const weatherCodeToText = (code: number): string => {
    if (code === 0) return '晴朗';
    if (code === 1) return '大致晴朗';
    if (code === 2) return '局部多云';
    if (code === 3) return '阴天';
    if (code === 45 || code === 48) return '有雾';
    if (code >= 51 && code <= 57) return '毛毛雨';
    if (code >= 61 && code <= 67) return '小雨';
    if (code >= 71 && code <= 77) return '降雪';
    if (code >= 80 && code <= 82) return '阵雨';
    if (code >= 85 && code <= 86) return '阵雪';
    if (code >= 95) return '雷阵雨';
    return '多云';
  };

  const windDirToText = (deg: number): string => {
    const dirs = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
    return dirs[Math.round(deg / 45) % 8];
  };

  // 根据气温生成穿衣建议
  const buildOutfitAdvice = (temp: number, feelsLike: number, wind: number, rain: boolean): string => {
    const t = feelsLike < temp ? feelsLike : temp;
    if (t <= 5) return '建议：加厚羽绒服/棉服 + 保暖毛衣 + 加绒长裤 + 保暖鞋，戴好围巾手套，注意防寒保暖';
    if (t <= 10) return '建议：羽绒服/厚呢大衣 + 毛衣或抓绒 + 长裤 + 保暖内搭，早晚务必加一件外套';
    if (t <= 15) return '建议：风衣/夹克 + 针织衫 + 长裤，早晚温差大，随身备一件防风外套';
    if (t <= 20) return '建议：薄外套/针织开衫 + 长袖T恤 + 长裤，叠穿方便随温度增减';
    if (t <= 26) return '建议：长袖/薄针织 + 长裤或长裙，体感舒适，可备一件薄外套';
    return '建议：短袖/轻薄透气 + 短裤或裙装，注意防晒，多补水';
  };

  const getWindLevel = (speedKmh: number): number => {
    if (speedKmh < 1) return 0;
    if (speedKmh < 6) return 1;
    if (speedKmh < 12) return 2;
    if (speedKmh < 20) return 3;
    if (speedKmh < 29) return 4;
    if (speedKmh < 39) return 5;
    if (speedKmh < 50) return 6;
    if (speedKmh < 62) return 7;
    return 8;
  };

  // 定位并拉取实时天气
  const handleLocate = () => {
    if (!navigator.geolocation) {
      void handleIpLocate();
      return;
    }
    setLocating(true);
    setLocateError('');

    // 硬性兜底：8 秒内 GPS 无结果（iframe/预览环境常见），自动降级 IP 定位
    let settled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setLocateError('精确定位无响应，已改用网络定位');
        void handleIpLocate();
      }
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        try {
          const { latitude, longitude } = pos.coords;
          // 1. 反向地理编码拿城市名（走本地代理，避免浏览器直连被拦）
          let cityName = '当前位置';
          try {
            const geoRes = await fetch(
              `/api/database/weather/reverse?latitude=${latitude}&longitude=${longitude}`,
              { signal: AbortSignal.timeout(6000) }
            );
            if (geoRes.ok) {
              const geoJson = await geoRes.json();
              const geo = geoJson?.data || {};
              cityName = geo.city || geo.locality || geo.principalSubdivision || cityName;
            }
          } catch {
            // 忽略，城市名兜底
          }

          // 2. Open-Meteo 实时 + 昨日天气（用于判断换季降温）—— 走本地代理，规避浏览器直连国外域名失败
          const weatherRes = await fetch(
            `/api/database/weather/forecast?latitude=${latitude}&longitude=${longitude}`,
            { signal: AbortSignal.timeout(12000) }
          );
          if (!weatherRes.ok) throw new Error('天气接口请求失败');
          const wJson = await weatherRes.json();
          if (!wJson.success || !wJson.data) throw new Error('天气接口请求失败');
          const w = wJson.data;

          const cur = w.current;
          const daily = w.daily;
          const temp = Math.round(cur.temperature_2m);
          const feelsLike = Math.round(cur.apparent_temperature);
          const tempMin = Math.round(daily.temperature_2m_min[1] ?? daily.temperature_2m_min[0]);
          const tempMax = Math.round(daily.temperature_2m_max[1] ?? daily.temperature_2m_max[0]);
          const yesterdayMax = daily.temperature_2m_max[0] ?? tempMax;
          const tempDrop = yesterdayMax - tempMax >= 4; // 与前一日最高温相比下降4℃以上视为换季降温
          const windSpeed = cur.wind_speed_10m ?? 0;
          const windScale = getWindLevel(windSpeed);
          const windDir = windDirToText(cur.wind_direction_10m ?? 0);
          const rainProb = Math.round(cur.precipitation_probability ?? daily.precipitation_probability_max?.[1] ?? 0);
          const uv = Math.round(daily.uv_index_max?.[1] ?? daily.uv_index_max?.[0] ?? 3);
          const condition = weatherCodeToText(cur.weather_code);
          const raining = cur.weather_code >= 51 || rainProb >= 40;

          const summaryTip = tempDrop
            ? `⚠️ 换季降温：较昨日最高温下降约 ${Math.round(yesterdayMax - tempMax)}℃，体感 ${feelsLike}℃，出门务必添衣保暖。`
            : `${condition}，体感 ${feelsLike}℃，今日${tempMin}~${tempMax}℃，${rainProb >= 40 ? '有降水可能，' : ''}注意根据体感增减衣物。`;

          await onUpdateWeather({
            city: cityName,
            condition,
            temp,
            tempMin,
            tempMax,
            feelsLike,
            windDirection: windDir,
            windScale,
            windWarning: windScale >= 4 || tempDrop,
            rainProbability: rainProb,
            rainWarning: raining,
            uvIndex: uv,
            uvWarning: uv >= 6,
            tempDropWarning: tempDrop,
            summaryTip,
            outfitAdvice: buildOutfitAdvice(temp, feelsLike, windScale, raining),
            umbrellaAdvice: raining ? '降水概率较高，出门务必随身携带折叠晴雨伞。' : '今日降水概率低，晴雨伞可备用。',
            updatedAt: Date.now(),
          });
          setSelectedCity(cityName);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setLocateError(msg.includes('denied') || msg.includes('PERMISSION') ? '定位权限被拒绝，请允许定位或手动切换城市' : `定位失败：${msg}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        setLocating(false);
        if (err.code === 1) {
          // 权限被拒绝：自动降级走 IP 定位（免授权）
          setLocateError('浏览器未授权精确定位，已改用网络定位（精确到城市）');
          void handleIpLocate();
        } else if (err.code === 2) {
          setLocateError('定位暂时不可用，已改用网络定位');
          void handleIpLocate();
        } else {
          setLocateError('定位超时，已改用网络定位');
          void handleIpLocate();
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  // 首次进入自动定位：本次浏览器会话只自动定位一次，避免反复更新数据导致页面闪动
  useEffect(() => {
    if (sessionStorage.getItem('weather_auto_located')) return;
    sessionStorage.setItem('weather_auto_located', '1');
    // 仅当当前没有有效天气数据时才自动定位
    if (typeof weather.temp === 'number' && weather.city) return;
    void handleIpLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCityChange = async (city: string) => {
    setSelectedCity(city);
    const preset = CITY_PRESETS[city];
    if (preset) {
      await onUpdateWeather({ ...preset, updatedAt: Date.now() });
    }
  };

  // 通过 IP 定位（免授权，兜底方案）：先拿经纬度，再拉天气
  const handleIpLocate = async () => {
    setLocating(true);
    setLocateError('');
    try {
      // 1. 走本地代理反查 IP 定位（免授权、免 key、更稳定）
      const ipRes = await fetch('/api/database/weather/ip', { signal: AbortSignal.timeout(10000) });
      if (!ipRes.ok) throw new Error('IP 定位失败');
      const ipJson = await ipRes.json();
      const ip = ipJson?.data || {};
      if (!ip.latitude || !ip.longitude) throw new Error('无法获取位置');
      const cityName = ip.city || ip.locality || ip.principalSubdivision || '当前位置';
      const latitude = ip.latitude;
      const longitude = ip.longitude;

      // 2. Open-Meteo 实时 + 昨日天气 —— 走本地代理
      const weatherRes = await fetch(
        `/api/database/weather/forecast?latitude=${latitude}&longitude=${longitude}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (!weatherRes.ok) throw new Error('天气接口请求失败');
      const wJson = await weatherRes.json();
      if (!wJson.success || !wJson.data) throw new Error('天气接口请求失败');
      const w = wJson.data;

      const cur = w.current;
      const daily = w.daily;
      const temp = Math.round(cur.temperature_2m);
      const feelsLike = Math.round(cur.apparent_temperature);
      const tempMin = Math.round(daily.temperature_2m_min[1] ?? daily.temperature_2m_min[0]);
      const tempMax = Math.round(daily.temperature_2m_max[1] ?? daily.temperature_2m_max[0]);
      const yesterdayMax = daily.temperature_2m_max[0] ?? tempMax;
      const tempDrop = yesterdayMax - tempMax >= 4;
      const windSpeed = cur.wind_speed_10m ?? 0;
      const windScale = getWindLevel(windSpeed);
      const windDir = windDirToText(cur.wind_direction_10m ?? 0);
      const rainProb = Math.round(cur.precipitation_probability ?? daily.precipitation_probability_max?.[1] ?? 0);
      const uv = Math.round(daily.uv_index_max?.[1] ?? daily.uv_index_max?.[0] ?? 3);
      const condition = weatherCodeToText(cur.weather_code);
      const raining = cur.weather_code >= 51 || rainProb >= 40;

      const summaryTip = tempDrop
        ? `⚠️ 换季降温：较昨日最高温下降约 ${Math.round(yesterdayMax - tempMax)}℃，体感 ${feelsLike}℃，出门务必添衣保暖。`
        : `${condition}，体感 ${feelsLike}℃，今日${tempMin}~${tempMax}℃，${rainProb >= 40 ? '有降水可能，' : ''}注意根据体感增减衣物。`;

      await onUpdateWeather({
        city: cityName,
        condition,
        temp,
        tempMin,
        tempMax,
        feelsLike,
        windDirection: windDir,
        windScale,
        windWarning: windScale >= 4 || tempDrop,
        rainProbability: rainProb,
        rainWarning: raining,
        uvIndex: uv,
        uvWarning: uv >= 6,
        tempDropWarning: tempDrop,
        summaryTip,
        outfitAdvice: buildOutfitAdvice(temp, feelsLike, windScale, raining),
        umbrellaAdvice: raining ? '降水概率较高，出门务必随身携带折叠晴雨伞。' : '今日降水概率低，晴雨伞可备用。',
        updatedAt: Date.now(),
      });
      setSelectedCity(cityName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocateError(`自动定位失败（${msg}），请手动切换城市`);
    } finally {
      setLocating(false);
    }
  };

  // 24h Hourly mock data aligned with current temp
  const hourlyForecast = [
    { time: '08:00', temp: weather.temp - 2, icon: 'cloud', pop: weather.rainProbability },
    { time: '11:00', temp: weather.temp, icon: 'sun', pop: Math.max(0, weather.rainProbability - 10) },
    { time: '14:00', temp: weather.tempMax, icon: 'sun', pop: Math.max(0, weather.rainProbability - 20) },
    { time: '17:00', temp: weather.temp + 1, icon: 'wind', pop: weather.rainProbability },
    { time: '20:00', temp: weather.temp - 1, icon: 'cloud', pop: weather.rainProbability + 10 },
    { time: '23:00', temp: weather.tempMin, icon: 'moon', pop: weather.rainProbability },
  ];

  return (
    <div className="space-y-6">
      {/* 1. THREE CRITICAL COMMUTE ALERTS (三大从容出门突发情况预警) */}
      <div className="space-y-3">
        {/* Cold Wind & Sudden Temp Drop Alert */}
        {(weather.tempDropWarning || weather.windWarning || weather.windScale >= 4) && (
          <div className="p-5 rounded-[var(--radius)] bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-2 border-sky-300 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider bg-sky-200/80 px-2 py-0.5 rounded-md">
                  换季降温 · 大风挂风预警
                </span>
                <h3 className="text-base font-bold text-sky-950 font-serif-sc">
                  今日有 {weather.windDirection} {weather.windScale} 级风，伴随明显降温！
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-sky-900/90 mt-1 leading-relaxed font-medium">
                换季期间气温起伏剧烈，体感温度仅 {weather.feelsLike}℃。出门务必<strong>特别添加防风保暖外套</strong>（如风衣、翻领厚夹克或羊毛开衫），护好前胸与颈部，避免吹风着凉。骑行穿行请避开高大广告牌与高楼风道。
              </p>
            </div>
          </div>
        )}

        {/* Rain & Umbrella Alert */}
        {(weather.rainWarning || weather.rainProbability >= 40 || weather.condition.includes('雨')) && (
          <div className="p-5 rounded-[var(--radius)] bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 border-2 border-teal-300 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Umbrella className="w-6 h-6 animate-bounce duration-1000" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider bg-teal-200/80 px-2 py-0.5 rounded-md">
                  降水防淋 · 随身带伞提醒
                </span>
                <h3 className="text-base font-bold text-teal-950 font-serif-sc">
                  今天降水概率高达 {weather.rainProbability}%，出门务必随身带伞！
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-teal-900/90 mt-1 leading-relaxed font-medium">
                {weather.umbrellaAdvice}。地面湿滑，请穿抓地防滑平底鞋；雨天通勤车辆易拥堵，建议出门时间比平时提前 10~15 分钟，步伐从容不慌乱。
              </p>
            </div>
          </div>
        )}

        {/* Hot Sun & UV Index Alert */}
        {(weather.uvWarning || weather.uvIndex >= 6) && (
          <div className="p-5 rounded-[var(--radius)] bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sun className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded-md">
                  烈日晴晒 · 强紫外线防晒提醒
                </span>
                <h3 className="text-base font-bold text-amber-950 font-serif-sc">
                  紫外线指数高达 {weather.uvIndex} 级，日晒强烈请做好防护！
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 mt-1 leading-relaxed font-medium">
                外出前 15 分钟请涂抹 SPF30+ 防晒霜；请随身携带黑胶遮阳伞或戴墨镜护眼；随身备足温水，每小时小口慢饮，防止烈日下体液流失导致疲倦。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Weather Status Overview & City Switcher */}
      <div className="bg-[#fffdfa] border border-[#ded5c8] p-6 rounded-[var(--radius)] shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ded5c8]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center font-bold">
              <Sun className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-serif-sc text-[#29251f]">
                  出门从容 · 实时天气预告
                </h2>
                <span className="text-xs text-[#746d63] font-mono">
                  数据即时更新
                </span>
              </div>
              <p className="text-xs text-[#746d63]">
                出门在外多一分从容，根据突发降温、起风、下雨、暴晒做好万全准备
              </p>
            </div>
          </div>

          {/* City Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleLocate}
              disabled={locating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60 transition-opacity shadow-2xs mr-1"
              title="根据当前位置自动定位天气"
            >
              {locating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              <span>{locating ? '定位中…' : '定位'}</span>
            </button>
            <button
              onClick={handleIpLocate}
              disabled={locating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#faf7f2] border border-[#ded5c8] text-[#554b42] hover:bg-[#ede6dc] disabled:opacity-60 transition-colors mr-1"
              title="无需授权，通过网络 IP 自动定位所在城市"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>网络定位</span>
            </button>
            <span className="text-xs text-[#746d63] font-medium flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>切换城市：</span>
            </span>
            {Object.keys(CITY_PRESETS).map((c) => (
              <button
                key={c}
                onClick={() => handleCityChange(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCity === c
                    ? 'bg-[var(--accent)] text-white shadow-2xs'
                    : 'bg-[#faf7f2] border border-[#ded5c8] text-[#554b42] hover:bg-[#ede6dc]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {locateError && (
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {locateError}
            </p>
          )}
        </div>

        {/* Hero Weather Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Temp & Condition (lg:col-span-7) */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-gradient-to-br from-[#faf6f0] to-[#f2ede4] border border-[#ded5c8] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#746d63] mb-3">
                <span className="font-bold text-[#29251f] text-sm">
                  {weather.city} · 今日天气概况
                </span>
                <span className="font-mono">体感温度 {weather.feelsLike}℃</span>
              </div>

              <div className="flex items-baseline gap-4 my-2">
                <span className="text-5xl sm:text-6xl font-bold font-serif-sc text-[#29251f] tracking-tight">
                  {weather.temp}°
                </span>
                <div>
                  <span className="text-lg font-bold text-[#29251f] block">
                    {weather.condition}
                  </span>
                  <span className="text-xs text-[#746d63]">
                    全天区间 {weather.tempMin}℃ ~ {weather.tempMax}℃
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#443c34] mt-3 font-medium bg-white/70 p-3 rounded-xl border border-[#ded5c8]/50">
                💡 {weather.summaryTip}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-[#ded5c8]/60 text-center">
              <div className="p-2 rounded-xl bg-white/80 border border-[#ded5c8]/50">
                <span className="text-[10px] text-[#746d63] block">风力等级</span>
                <strong className="text-xs font-bold text-[#29251f] block mt-0.5">
                  {weather.windDirection} {weather.windScale}级
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#ded5c8]/50">
                <span className="text-[10px] text-[#746d63] block">降水概率</span>
                <strong className="text-xs font-bold text-[#29251f] block mt-0.5">
                  {weather.rainProbability}%
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#ded5c8]/50">
                <span className="text-[10px] text-[#746d63] block">紫外线指数</span>
                <strong className="text-xs font-bold text-[#29251f] block mt-0.5">
                  {weather.uvIndex} 级
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#ded5c8]/50">
                <span className="text-[10px] text-[#746d63] block">空气质量</span>
                <strong className="text-xs font-bold text-emerald-700 block mt-0.5">
                  优 (AQI 32)
                </strong>
              </div>
            </div>
          </div>

          {/* Commute Readiness & Bag Checklist (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#fffdfa] border border-[#ded5c8] p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#ded5c8]/60 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold font-serif-sc text-[#29251f]">
                  从容出行 · 随身包袋自检
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#ded5c8] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Umbrella className="w-4 h-4 text-teal-700" />
                    <span className="font-semibold text-[#29251f]">晴雨折叠伞</span>
                  </div>
                  <span className={`text-[11px] font-bold ${weather.rainWarning || weather.uvWarning ? 'text-rose-700' : 'text-[#746d63]'}`}>
                    {weather.rainWarning ? '● 必备携带' : weather.uvWarning ? '● 遮阳必备' : '建议备用'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#ded5c8] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-sky-700" />
                    <span className="font-semibold text-[#29251f]">防风外搭 / 夹克</span>
                  </div>
                  <span className={`text-[11px] font-bold ${weather.tempDropWarning || weather.windWarning ? 'text-sky-800' : 'text-[#746d63]'}`}>
                    {weather.tempDropWarning || weather.windWarning ? '● 务必加衣' : '轻便适温'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#ded5c8] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-700" />
                    <span className="font-semibold text-[#29251f]">保温水杯装温水</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-bold">
                    ● 润燥温养
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#ded5c8] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-[#29251f]">防晒霜 / 润唇膏</span>
                  </div>
                  <span className="text-[11px] text-[#746d63]">
                    {weather.uvIndex >= 5 ? '● 提前涂抹' : '常备'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#8a7f72] pt-3 mt-3 border-t border-[#ded5c8]/50 leading-tight">
              把可能发生的意外提前在包里备好，出门脚步就能自然轻盈。
            </p>
          </div>
        </div>

        {/* 24h Hourly Forecast */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-[#29251f] uppercase tracking-wider mb-3">
            24 小时逐时走势
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {hourlyForecast.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-[#faf7f2] border border-[#ded5c8] text-center space-y-1.5"
              >
                <span className="text-xs font-mono text-[#746d63] block">{h.time}</span>
                <strong className="text-base font-bold text-[#29251f] block font-serif-sc">
                  {h.temp}°
                </strong>
                <span className="text-[11px] text-[#8a7f72] block">
                  降水 {h.pop}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
