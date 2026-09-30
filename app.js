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

pinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pinInput.value.length !== 4) return;

  if (isValidEntry(pinInput.value)) {
    pinDialog.close();
    successDialog.showModal();
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
