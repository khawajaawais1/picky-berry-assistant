import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const apiBaseUrl = __ENV.API_BASE_URL;
const token = __ENV.API_TOKEN;
const species = __ENV.SPECIES_CODE;
const centerLat = Number(__ENV.CENTER_LAT);
const centerLng = Number(__ENV.CENTER_LNG);

if (
  !apiBaseUrl ||
  !token ||
  !species ||
  !Number.isFinite(centerLat) ||
  !Number.isFinite(centerLng) ||
  centerLat < -90 ||
  Math.abs(centerLat) >= 89 ||
  centerLat > 90 ||
  centerLng < -180 ||
  centerLng > 180
) {
  throw new Error('Set API_BASE_URL, API_TOKEN, SPECIES_CODE, CENTER_LAT, and CENTER_LNG before running this test.');
}

export default function () {
  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  const longitudePerKm = 111.32 * Math.cos((centerLat * Math.PI) / 180);
  const longitudeOffset = ((Math.random() - 0.5) * 2) / longitudePerKm;
  const latitudeOffset = ((Math.random() - 0.5) * 2) / 111.32;
  const bbox = [
    centerLng - 10 / longitudePerKm + longitudeOffset,
    centerLat - 10 / 111.32 + latitudeOffset,
    centerLng + 10 / longitudePerKm + longitudeOffset,
    centerLat + 10 / 111.32 + latitudeOffset,
  ].join(',');
  const response = http.get(
    `${normalizedBaseUrl}/api/v1/zones?bbox=${bbox}&species=${encodeURIComponent(species)}&zoom=12`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Encoding': 'gzip',
      },
    },
  );
  check(response, {
    'zones responds successfully': (result) => result.status === 200 || result.status === 304,
  });
  sleep(1);
}
