const STORAGE_KEY = "courtside-reservations";
const OPENING_HOUR = 7;
const CLOSING_HOUR = 21;

const dateInput = document.querySelector("#booking-date");
const slotsContainer = document.querySelector("#time-slots");
const dateLabel = document.querySelector("#date-label");
const bookingForm = document.querySelector("#booking-form");
const selectedSummary = document.querySelector("#selected-summary");
const summaryDate = document.querySelector("#summary-date");
const summaryTime = document.querySelector("#summary-time");
const bookingMessage = document.querySelector("#booking-message");
const myBookingsList = document.querySelector("#my-bookings-list");
const bookingCount = document.querySelector("#booking-count");

let selectedTime = null;
let reservations = loadReservations();

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromString(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("de-DE", options).format(dateFromString(value));
}

function loadReservations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.some((item) =>
      typeof item.id !== "string" ||
      typeof item.date !== "string" ||
      typeof item.time !== "string" ||
      typeof item.name !== "string" ||
      typeof item.email !== "string"
    )) {
      throw new Error("Die gespeicherten Reservierungen haben ein ungültiges Format.");
    }
    return parsed;
  } catch (error) {
    bookingMessage.textContent = "Reservierungen konnten nicht geladen werden. Bitte prüfe die Browser-Speichereinstellungen.";
    bookingMessage.classList.add("error");
    return [];
  }
}

function saveReservations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    return true;
  } catch (error) {
    bookingMessage.textContent = "Deine Reservierung konnte nicht gespeichert werden. Bitte prüfe die Browser-Speichereinstellungen und versuche es erneut.";
    bookingMessage.classList.add("error");
    return false;
  }
}

function renderSlots() {
  const selectedDate = dateInput.value;
  if (!selectedDate) {
    dateInput.value = localDateString(new Date());
    return renderSlots();
  }
  const now = new Date();
  const dayReservations = reservations.filter((reservation) => reservation.date === selectedDate);
  dateLabel.textContent = `Termine am ${formatDate(selectedDate)}`;
  slotsContainer.replaceChildren();

  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour += 1) {
    const time = `${String(hour).padStart(2, "0")}:00`;
    const reservation = dayReservations.find((item) => item.time === time);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-slot";
    button.textContent = time;

    if (reservation) {
      button.classList.add("booked");
      button.disabled = true;
      button.setAttribute("aria-label", `${time} Uhr, bereits vergeben`);
      button.title = "Dieser Termin ist bereits vergeben";
    } else if (selectedDate === localDateString(now) && hour <= now.getHours()) {
      button.classList.add("past");
      button.disabled = true;
      button.setAttribute("aria-label", `${time} Uhr, nicht mehr verfügbar`);
      button.title = "Dieser Termin liegt in der Vergangenheit";
    } else {
      button.setAttribute("aria-label", `${time} Uhr, frei`);
      if (selectedTime === time) button.classList.add("selected");
      button.addEventListener("click", () => selectTime(time));
    }

    slotsContainer.append(button);
  }
}

function selectTime(time) {
  selectedTime = time;
  bookingMessage.textContent = "";
  bookingMessage.classList.remove("error");
  selectedSummary.hidden = false;
  bookingForm.hidden = false;
  summaryDate.textContent = formatDate(dateInput.value);
  summaryTime.textContent = `${time}–${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:00 · Platz 1`;
  document.querySelector(".reservation-intro").textContent = "Noch deine Kontaktdaten ergänzen und fertig.";
  renderSlots();
}

function renderBookings() {
  myBookingsList.replaceChildren();
  const upcoming = reservations
    .filter((reservation) => reservation.date >= localDateString(new Date()))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  bookingCount.textContent = `${upcoming.length} ${upcoming.length === 1 ? "Buchung" : "Buchungen"}`;

  if (upcoming.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-bookings";
    empty.textContent = "Noch keine Reservierungen – dein nächstes Match wartet schon.";
    myBookingsList.append(empty);
    return;
  }

  for (const reservation of upcoming) {
    const item = document.createElement("article");
    item.className = "booking-item";
    const main = document.createElement("div");
    main.className = "booking-item-main";
    const icon = document.createElement("span");
    icon.className = "booking-calendar-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = String(dateFromString(reservation.date).getDate()).padStart(2, "0");
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${formatDate(reservation.date)} · ${reservation.time} Uhr`;
    const court = document.createElement("small");
    court.textContent = `Platz 1 · ${reservation.name}`;
    details.append(name, court);
    main.append(icon, details);

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel-button";
    cancel.textContent = "Stornieren";
    cancel.setAttribute("aria-label", `Reservierung am ${formatDate(reservation.date)} um ${reservation.time} Uhr stornieren`);
    cancel.addEventListener("click", () => cancelReservation(reservation.id));
    item.append(main, cancel);
    myBookingsList.append(item);
  }
}

function cancelReservation(id) {
  const previous = reservations;
  reservations = reservations.filter((reservation) => reservation.id !== id);
  if (!saveReservations()) {
    reservations = previous;
    return;
  }
  renderSlots();
  renderBookings();
  bookingMessage.textContent = "Die Reservierung wurde storniert.";
  bookingMessage.classList.remove("error");
}

dateInput.addEventListener("change", () => {
  if (!dateInput.value) dateInput.value = localDateString(new Date());
  selectedTime = null;
  bookingForm.hidden = true;
  selectedSummary.hidden = true;
  bookingMessage.textContent = "";
  bookingMessage.classList.remove("error");
  document.querySelector(".reservation-intro").textContent = "Wähle links eine freie Zeit aus, um fortzufahren.";
  renderSlots();
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedTime) return;

  const formData = new FormData(bookingForm);
  const reservation = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: dateInput.value,
    time: selectedTime,
    name: formData.get("name").trim(),
    email: formData.get("email").trim(),
  };

  if (reservations.some((item) => item.date === reservation.date && item.time === reservation.time)) {
    bookingMessage.textContent = "Dieser Termin ist inzwischen vergeben. Bitte wähle eine andere Zeit.";
    bookingMessage.classList.add("error");
    renderSlots();
    return;
  }

  reservations.push(reservation);
  if (!saveReservations()) {
    reservations.pop();
    return;
  }

  bookingMessage.textContent = `Geschafft, ${reservation.name}! Dein Platz ist für ${formatDate(reservation.date)} um ${reservation.time} Uhr reserviert.`;
  bookingMessage.classList.remove("error");
  bookingForm.reset();
  selectedTime = null;
  bookingForm.hidden = true;
  selectedSummary.hidden = true;
  document.querySelector(".reservation-intro").textContent = "Wähle links eine freie Zeit aus, um fortzufahren.";
  renderSlots();
  renderBookings();
});

const today = localDateString(new Date());
dateInput.min = today;
dateInput.value = today;
renderSlots();
renderBookings();
