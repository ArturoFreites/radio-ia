/** Lezama, Partido de Lezama, Buenos Aires, Argentina */
const LEZAMA_LAT = -35.87458;
const LEZAMA_LON = -57.8973;

type OpenMeteoForecast = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
};

export type ClimaDatos = {
  temperatura: number;
  maxima: number;
  minima: number;
  codigo: number;
};

function parseForecast(weatherData: OpenMeteoForecast): ClimaDatos | null {
  const temperatura = weatherData.current?.temperature_2m;
  const codigo = weatherData.current?.weather_code;
  const maxima = weatherData.daily?.temperature_2m_max?.[0];
  const minima = weatherData.daily?.temperature_2m_min?.[0];

  if (
    typeof temperatura !== "number" ||
    typeof codigo !== "number" ||
    typeof maxima !== "number" ||
    typeof minima !== "number"
  ) {
    return null;
  }

  return { temperatura, maxima, minima, codigo };
}

export async function fetchClima(): Promise<string> {
  try {
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LEZAMA_LAT}&longitude=${LEZAMA_LON}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America/Argentina/Buenos_Aires`,
      { next: { revalidate: 600 } },
    );

    if (!weatherResponse.ok) {
      return "Sin datos de clima.";
    }

    const weatherData = (await weatherResponse.json()) as OpenMeteoForecast;
    const datos = parseForecast(weatherData);
    if (!datos) {
      return "Sin datos de clima.";
    }

    return JSON.stringify(datos);
  } catch (error) {
    console.error("[fetchClima] Error al obtener clima de Lezama:", error);
    return "Sin datos de clima.";
  }
}
