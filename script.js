
const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const statusMessage = document.getElementById("statusMessage");

let temperatureChart = null;

// Menghubungkan elemen HTML dengan JavaScript
const el = {
  cityName: document.getElementById("cityName"),
  localTime: document.getElementById("localTime"),
  weatherIcon: document.getElementById("weatherIcon"),
  currentTemp: document.getElementById("currentTemp"),
  conditionText: document.getElementById("conditionText"),
  feelsLike: document.getElementById("feelsLike"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  maxTemp: document.getElementById("maxTemp"),
  hourlyForecast: document.getElementById("hourlyForecast")
};

// Menentukan ikon, kondisi, dan tema berdasarkan kode cuaca
function getWeatherDetails(code) {
  if (code === 0) {
    return {
      text: "Cerah",
      icon: "☀️",
      theme: "sunny"
    };
  }

  if ([1, 2].includes(code)) {
    return {
      text: "Cerah berawan",
      icon: "🌤️",
      theme: "sunny"
    };
  }

  if (code === 3) {
    return {
      text: "Berawan",
      icon: "☁️",
      theme: "cloudy"
    };
  }

  if ([45, 48].includes(code)) {
    return {
      text: "Berkabut",
      icon: "🌫️",
      theme: "foggy"
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      text: "Gerimis",
      icon: "🌦️",
      theme: "rainy"
    };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      text: "Hujan",
      icon: "🌧️",
      theme: "rainy"
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      text: "Salju",
      icon: "🌨️",
      theme: "snowy"
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      text: "Badai petir",
      icon: "⛈️",
      theme: "stormy"
    };
  }

  return {
    text: "Kondisi berubah-ubah",
    icon: "🌥️",
    theme: "cloudy"
  };
}

// Mengubah latar belakang sesuai kondisi cuaca
function changeWeatherTheme(theme) {
  document.body.classList.remove(
    "weather-default",
    "weather-sunny",
    "weather-cloudy",
    "weather-rainy",
    "weather-stormy",
    "weather-snowy",
    "weather-foggy"
  );

  document.body.classList.add(`weather-${theme}`);
}

// Mengambil data JSON dari API
async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Gagal mengambil data dari server.");
  }

  return response.json();
}

// Mencari koordinat berdasarkan nama kota
async function searchCity(city) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    new URLSearchParams({
      name: city,
      count: 10,
      language: "id",
      format: "json"
    });

  const data = await getJSON(url);

  if (!data.results || data.results.length === 0) {
    throw new Error(
      `Kota "${city}" tidak ditemukan. Coba nama kota lain.`
    );
  }

  // Mengutamakan kota di Indonesia jika tersedia
  return (
    data.results.find(
      place => place.country_code === "ID"
    ) || data.results[0]
  );
}

// Mengambil data cuaca berdasarkan koordinat kota
async function getWeather(city) {
  const place = await searchCity(city);

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current:
      "temperature_2m,relative_humidity_2m," +
      "apparent_temperature,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    daily: "temperature_2m_max",
    forecast_days: 2,
    timezone: "auto"
  });

  const weather = await getJSON(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  displayWeather(place, weather);
}

// Menampilkan data cuaca ke halaman
function displayWeather(place, weather) {
  const current = weather.current;
  const details = getWeatherDetails(current.weather_code);

  // Ubah tema otomatis
  changeWeatherTheme(details.theme);

  // Informasi kota
  el.cityName.textContent =
    `${place.name}, ${place.admin1 || place.country || ""}`
      .replace(/,\s*$/, "");

  // Waktu lokal kota
  el.localTime.textContent = new Date(
    current.time
  ).toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: weather.timezone
  });

  // Informasi cuaca saat ini
  el.weatherIcon.textContent = details.icon;
  el.currentTemp.textContent =
    Math.round(current.temperature_2m);

  el.conditionText.textContent = details.text;

  el.feelsLike.textContent =
    `${Math.round(current.apparent_temperature)}°C`;

  el.humidity.textContent =
    `${current.relative_humidity_2m}%`;

  el.wind.textContent =
    `${Math.round(current.wind_speed_10m)} km/j`;

  el.maxTemp.textContent =
    `${Math.round(weather.daily.temperature_2m_max[0])}°C`;

  // Mencari jam terdekat dengan waktu sekarang
  const currentIndex = weather.hourly.time.findIndex(
    time => time >= current.time
  );

  const start = Math.max(0, currentIndex);

  const times = weather.hourly.time.slice(start, start + 8);
  const temps = weather.hourly.temperature_2m.slice(start, start + 8);
  const codes = weather.hourly.weather_code.slice(start, start + 8);

  // Perbarui grafik dan prakiraan
  displayChart(times, temps);
  displayHourly(times.slice(0, 6), temps.slice(0, 6), codes.slice(0, 6));
}

// Membuat grafik suhu menggunakan Chart.js
function displayChart(times, temps) {
  const canvas = document.getElementById("temperatureChart");
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, "rgba(182, 240, 223, 0.35)");
  gradient.addColorStop(1, "rgba(182, 240, 223, 0)");

  // Hapus grafik lama agar tidak bertumpuk
  if (temperatureChart) {
    temperatureChart.destroy();
  }

  temperatureChart = new Chart(ctx, {
    type: "line",

    data: {
      labels: times.map(time =>
        new Date(time).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC"
        })
      ),

      datasets: [{
        label: "Suhu udara",
        data: temps.map(temp =>
          Math.round(temp * 10) / 10
        ),
        borderColor: "#b6f0df",
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#b6f0df"
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            label: context =>
              `Suhu: ${context.parsed.y}°C`
          }
        }
      },

      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "rgba(255,255,255,0.7)",
            maxTicksLimit: 6
          }
        },

        y: {
          grid: {
            color: "rgba(255,255,255,0.12)"
          },
          ticks: {
            color: "rgba(255,255,255,0.7)",
            callback: value => `${value}°C`
          }
        }
      }
    }
  });
}

// Menampilkan perkiraan cuaca beberapa jam ke depan
function displayHourly(times, temps, codes) {
  el.hourlyForecast.innerHTML = "";

  times.forEach((time, index) => {
    const details = getWeatherDetails(codes[index]);

    const item = document.createElement("div");
    item.className = "hourly-item";

    const hour = new Date(time).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC"
    });

    const hourText = document.createElement("span");
    hourText.textContent = hour;

    const icon = document.createElement("span");
    icon.className = "hour-icon";
    icon.textContent = details.icon;
    icon.setAttribute("aria-label", details.text);

    const temperature = document.createElement("strong");
    temperature.textContent = `${Math.round(temps[index])}°C`;

    item.append(hourText, icon, temperature);
    el.hourlyForecast.appendChild(item);
  });
}

// Proses pencarian kota
async function loadCityWeather(city) {
  const name = city.trim();

  if (!name) {
    statusMessage.textContent =
      "Silakan masukkan nama kota terlebih dahulu.";
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Memuat...";

  statusMessage.textContent =
    `Sedang mencari cuaca untuk ${name}...`;

  try {
    await getWeather(name);

    statusMessage.textContent =
      `Data cuaca berhasil diperbarui untuk ${el.cityName.textContent}.`;
  } catch (error) {
    statusMessage.textContent =
      error.message ||
      "Terjadi kesalahan. Periksa koneksi internet.";
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Cari Cuaca ↗";
  }
}

// Jalankan pencarian saat formulir dikirim
form.addEventListener("submit", event => {
  event.preventDefault();
  loadCityWeather(cityInput.value);
});

// Tombol pilihan kota populer
document.querySelectorAll("[data-city]").forEach(button => {
  button.addEventListener("click", () => {
    cityInput.value = button.dataset.city;
    loadCityWeather(button.dataset.city);
  });
});

// Tampilkan cuaca Malang saat halaman pertama dibuka
cityInput.value = "Malang";
loadCityWeather("Malang");
