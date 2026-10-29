
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

const publishOpening = async () => {
  const mqtt = await loadMqtt();
  await new Promise((resolve, reject) => {
    const client = mqtt.connect("wss://l6356d11.ala.eu-central-1.emqxsl.com:8084/mqtt", {
      username: "ubuntu",
      password: "duskoi",
      clientId: "parking_" + crypto.randomUUID(),
      clean: true,
      connectTimeout: 12000,
      reconnectPeriod: 0
    });
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.end(true);
      error ? reject(error) : resolve();
    };
    const timer = setTimeout(() => finish(new Error("MQTT timeout")), 15000);
    client.on("error", finish);
    client.on("close", () => { if (!settled) finish(new Error("MQTT disconnected")); });
    client.once("connect", () => {
      client.publish("prueba/hola", "abrir", { qos: 1, retain: false }, finish);
    });
  });
};

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
  confirmButton.disabled = length !== 4;
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

closeButton.addEventListener("click", () => pinDialog.close());

pinDialog.addEventListener("click", (event) => {
  if (event.target === pinDialog) pinDialog.close();
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
  if (pinInput.value.length !== 4) return;

  if (isValidEntry(pinInput.value)) {
    confirmButton.disabled = true;
    pinInput.disabled = true;
    try {
      await publishOpening();
      pinDialog.close();
      successDialog.showModal();
    } catch (error) {
      errorMessage.textContent = "No se pudo enviar la apertura. Comprueba la conexión e inténtalo de nuevo.";
    } finally {
      pinInput.disabled = false;
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

refreshSlots();
