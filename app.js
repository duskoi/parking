
let mqttLibrary;
const loadMqtt = () => {
  if (window.mqtt) return Promise.resolve(window.mqtt);
  if (!mqttLibrary) {
    mqttLibrary = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/mqtt@5.10.4/dist/mqtt.min.js";
      script.onload = () => window.mqtt ? resolve(window.mqtt) : reject(new Error("MQTT unavailable"));
      script.onerror = () => { script.remove(); reject(new Error("MQTT load failed")); };
      document.head.appendChild(script);
    }).catch(error => { mqttLibrary = null; throw error; });
  }
  return mqttLibrary;
};

const TOPIC_ORDEN = "prueba/hola";
const TOPIC_CONFIRMACION = "prueba/hola/confirmacion";
const CONFIRMACION_MS = 8000;

let client;
let subscribed = false;
let pending = null;

const mqttReady = () => client?.connected && subscribed;

const renderControls = () => {
  openButton.disabled = !mqttReady() || pending !== null;
  openButton.title = mqttReady() ? "" : "Esperando conexión con EMQX";
  refreshSlots();
};

const startMqtt = async () => {
  try {
    const mqtt = await loadMqtt();
    client = mqtt.connect("wss://l6356d11.ala.eu-central-1.emqxsl.com:8084/mqtt", {
      username: "ubuntu",
      password: "duskoi",
      clientId: "parking_" + crypto.randomUUID(),
      clean: true,
      connectTimeout: 12000,
      reconnectPeriod: 3000,
      queueQoSZero: false,
      resubscribe: false
    });

    client.on("connect", () => {
      subscribed = false;
      renderControls();
      client.subscribe(TOPIC_CONFIRMACION, { qos: 0 }, (error, topics) => {
        if (!client.connected) return;
        subscribed = !error && topics?.length === 1 && topics[0].qos === 0;
        renderControls();
      });
    });

    client.on("message", (topic, data, packet) => {
      if (topic === TOPIC_CONFIRMACION && !packet.retain && pending?.id === data.toString()) {
        pending.finish();
      }
    });

    client.on("close", () => {
      subscribed = false;
      renderControls();
    });
    client.on("error", renderControls);
  } catch {
    renderControls();
    setTimeout(startMqtt, 10000);
  }
};

const publishOrder = (command) => new Promise((resolve, reject) => {
  if (!mqttReady()) {
    reject(new Error("La web no está conectada a EMQX."));
    return;
  }
  const id = crypto.randomUUID().replaceAll("-", "");
  const timestamp = Math.floor(Date.now() / 1000);
  const finish = (error) => {
    if (pending?.id !== id) return;
    clearTimeout(timer);
    pending = null;
    renderControls();
    if (error) reject(error);
    else resolve();
  };
  const timer = setTimeout(() => finish(new Error(
    "La ESP32 no confirmó la orden. Comprueba el resultado antes de reintentar."
  )), CONFIRMACION_MS);
  pending = { id, finish };
  renderControls();
  client.publish(TOPIC_ORDEN, command + ":" + id + ":" + timestamp, { qos: 0, retain: false }, (error) => {
    if (error) finish(new Error("No se pudo enviar la orden."));
  });
});

const pinDialog = document.querySelector("#pin-dialog");
const successDialog = document.querySelector("#success-dialog");
const openButton = document.querySelector("#open-dialog");
const closeButton = document.querySelector("#close-dialog");
const doneButton = document.querySelector("#done-button");
const pinForm = document.querySelector("#pin-form");
const pinInput = document.querySelector("#pin-input");
const pinField = document.querySelector("#pin-field");
const confirmButton = document.querySelector("#confirm-pin");
const errorMessage = document.querySelector("#pin-error");
const slots = [...document.querySelectorAll(".pin-slots i")];
const successMessage = document.querySelector("#success-message");

const clearEntry = () => {
  pinInput.value = "";
  errorMessage.textContent = "";
  pinField.classList.remove("invalid");
  confirmButton.disabled = true;
  slots.forEach((slot) => slot.classList.remove("filled", "active"));
};

const refreshSlots = () => {
  const length = pinInput.value.length;
  slots.forEach((slot, index) => {
    slot.classList.toggle("filled", index < length);
    slot.classList.toggle("active", index === length && length < slots.length);
  });
  confirmButton.disabled = length !== 4 || !mqttReady() || pending !== null;
};

const isValidEntry = (value) => {
  const digits = [...value].map(Number);
  return (
    digits.length === 4 &&
    digits.every((digit) => digit === digits[0]) &&
    digits.reduce((total, digit, index) => total + digit * (index + 2), 0) === 14
  );
};

openButton.addEventListener("click", () => {
  clearEntry();
  pinDialog.showModal();
  requestAnimationFrame(() => pinInput.focus());
});

closeButton.addEventListener("click", () => {
  if (!pending) pinDialog.close();
});

pinDialog.addEventListener("cancel", (event) => {
  if (pending) event.preventDefault();
});

pinDialog.addEventListener("click", (event) => {
  if (event.target === pinDialog && !pending) pinDialog.close();
});

pinDialog.addEventListener("close", clearEntry);

pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
  errorMessage.textContent = "";
  pinField.classList.remove("invalid");
  refreshSlots();
});

pinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (pinInput.value.length !== 4 || pending || !mqttReady()) return;

  const command = pinInput.value === "2222" ? "gpio2" : isValidEntry(pinInput.value) ? "abrir" : null;
  if (command) {
    confirmButton.disabled = true;
    pinInput.disabled = true;
    closeButton.disabled = true;
    confirmButton.textContent = "Esperando confirmación…";
    try {
      await publishOrder(command);
      const gpio = command === "gpio2" ? 2 : 23;
      successMessage.textContent = "La ESP32 completó el pulso de un segundo en GPIO " + gpio + ".";
      pinDialog.close();
      successDialog.showModal();
    } catch (error) {
      errorMessage.textContent = error.message;
    } finally {
      pinInput.disabled = false;
      closeButton.disabled = false;
      confirmButton.textContent = "Confirmar orden";
      refreshSlots();
    }
    return;
  }

  errorMessage.textContent = "Ese PIN no es correcto. Inténtalo de nuevo.";
  pinField.classList.add("invalid");
  pinInput.select();
  pinInput.focus();
});

doneButton.addEventListener("click", () => successDialog.close());

successDialog.addEventListener("click", (event) => {
  if (event.target === successDialog) successDialog.close();
});

renderControls();
startMqtt();
