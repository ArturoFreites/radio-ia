export async function fetchClima(ciudad: string): Promise<string> {
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es`,
    );
    const geoData = (await geoResponse.json()) as {
      results?: Array<{ latitude: number; longitude: number }>;
    };
    const lat = geoData.results?.[0]?.latitude;
    const lon = geoData.results?.[0]?.longitude;
    if (!lat || !lon) {
      return "Sin datos de clima.";
    }
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America/Argentina/Buenos_Aires`,
    );
    const weatherData = (await weatherResponse.json()) as {
      current: { temperature_2m: number; weather_code: number };
      daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
    };

    return JSON.stringify({
      temperatura: weatherData.current.temperature_2m,
      maxima: weatherData.daily.temperature_2m_max[0],
      minima: weatherData.daily.temperature_2m_min[0],
      codigo: weatherData.current.weather_code,
    });
  } catch {
    return "Sin datos de clima.";
  }
}
