const TOKEN = import.meta.env.VITE_IDENTITY_TOKEN;

const identityUrl = `${import.meta.env.VITE_API_URL}/api`;

const client_id = import.meta.env.VITE_IDENTITY_CLIENT_ID;

async function getGeolocation(timeoutMs = 20000) {
  if (!navigator.geolocation) return null;

  const getCurrentPosition = () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (
            typeof position?.coords?.latitude === "number" &&
            typeof position?.coords?.longitude === "number"
          ) {
            return resolve({
              latitude: position.coords.latitude.toFixed(2),
              longitude: position.coords.longitude.toFixed(2),
            });
          } else {
            return resolve(null);
          }
        },
        () => {
          return resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: timeoutMs,
          maximumAge: 60000,
        }
      );
    });
  };

  try {
    return await Promise.race([
      getCurrentPosition(),
      new Promise((resolve) => {
        return setTimeout(() => {
          return resolve(null);
        }, timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}

async function getDeviceFingerprint() {
  const deviceInfo = {
    user_agent: navigator.userAgent,
    language: navigator.language,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    color_depth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hardware_concurrency: navigator.hardwareConcurrency || null,
    device_memory: navigator.deviceMemory || null,
    touch_support: "ontouchstart" in window || null,
    cookie_enabled: navigator.cookieEnabled,
    session_storage: typeof window.sessionStorage !== "undefined",
    local_storage: typeof window.localStorage !== "undefined",
    screen_orientation: (screen.orientation || {}).type || "unknown",
    languages: navigator.languages || [navigator.language],
  };

  try {
    const location = await getGeolocation();
    deviceInfo.geolocation = location;
  } catch {
    deviceInfo.geolocation = null;
  }

  return {
    device: deviceInfo,
    base64: btoa(stableStringify(deviceInfo)),
  };
}

function sortObjectKeys(obj) {
  return Object.keys(obj).sort();
}

function stableStringify(obj) {
  return JSON.stringify(obj, sortObjectKeys(obj));
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const output = document.getElementById("output");

  output.className =
    "bg-yellow-100 text-yellow-800 border border-yellow-300 p-4 rounded text-sm whitespace-pre-wrap overflow-x-auto";
  output.textContent = "Enviando login...";

  const form = e.target;
  const username = form.username.value;
  const password = form.password.value;
  const otp = form.otp.value;
  const trust_device = form.trust_device.checked;

  try {
    const { device, base64 } = await getDeviceFingerprint();

    console.log(device);
    console.log(base64);

    const res = await fetch(`${identityUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        username,
        password,
        client_id,
        one_time_password: otp,
        trust_device,
        device: base64,
      }),
    });

    const data = await res.json();

    output.className =
      "bg-green-100 text-green-800 border border-green-300 p-4 rounded text-sm whitespace-pre-wrap overflow-x-auto";
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    console.error(err);

    output.className =
      "bg-red-100 text-red-800 border border-red-300 p-4 rounded text-sm whitespace-pre-wrap overflow-x-auto";
    output.textContent = "Erro ao realizar login.";
  }
});
