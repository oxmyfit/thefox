const THEFOX_TRANSLATIONS = {
  en: {
    about: "About", menu: "Menu", events: "Events", reserve: "Reserve", delivery: "Delivery", contact: "Contact", book: "Book",
    lounge: "Bar & Social Lounge", heroCopy: "Cozy brunches, polished cocktails, and late-night energy on Shetitorja Indrit Cara, Kavaje.",
    reserveTable: "Reserve a Table", orderDelivery: "Order Delivery", exploreMenu: "Explore Menu",
    modernDining: "Modern Social Dining", introTitle: "Where easy mornings turn into bright nights.",
    introCopy: "The Fox pairs familiar comfort with a sharp lounge mood: brunch plates, coffee, wine, spirits, and cocktails built for relaxed afternoons and full tables after dark.",
    viewSelection: "View the current selection", brunch: "Brunch", cocktails: "Cocktails", coffee: "Coffee", reservations: "Reservations",
    selection: "A Selection from The Fox", groupDining: "Group Dining", privateTitle: "Private tables, birthdays, and social nights.",
    name: "Name", phone: "Phone", email: "Email", date: "Date", guests: "Guests", submitInquiry: "Submit Inquiry",
    reservationsTitle: "Reservations", bookToday: "Book Your Table Today", fullName: "Full Name", phoneNumber: "Phone Number", time: "Time", findTable: "Find a Table",
    openingHours: "Opening Hours", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
    fastDelivery: "Fast delivery", freshDoor: "Fresh from The Fox to your door.", deliveryCopy: "Browse the same menu from the restaurant, add your favourites, and place a quick delivery request.",
    minutes: "15–30 min", location: "Kavajë delivery", cash: "Cash on delivery", orderNow: "Order now", searchDishes: "Search dishes", yourOrder: "Your order", cart: "Cart",
    cartEmpty: "Your cart is empty. Add a few favourites to get started.", subtotal: "Subtotal", deliveryFee: "Delivery", total: "Total", address: "Delivery address", kitchenNotes: "Notes for the kitchen",
    placeOrder: "Place delivery order", all: "All", featured: "Featured", each: "each", item: "item", items: "items"
  },
  sq: {
    about: "Rreth nesh", menu: "Menu", events: "Evente", reserve: "Rezervo", delivery: "Dërgesë", contact: "Kontakti", book: "Rezervo",
    lounge: "Bar & Lounge", heroCopy: "Mëngjese të relaksuara, koktej të pasur dhe atmosferë nate të plotë energji në Shetitorja Indrit Cara, Kavajë.",
    reserveTable: "Rezervo një Tavolinë", orderDelivery: "Porosit me Dërgesë", exploreMenu: "Shiko Menunë",
    modernDining: "Ushqim modern dhe relaks", introTitle: "Mëngjeset e lehta kthehen në mbrëmje të ndritshme.",
    introCopy: "The Fox kombinon komoditetin me një atmosferë lounge moderne: pjata mëngjesi, kafe, verë, pije dhe koktej për pasditje të relaksuara dhe netë të gjalla.",
    viewSelection: "Shiko përzgjedhjen aktuale", brunch: "Mëngjes", cocktails: "Koktej", coffee: "Kafe", reservations: "Rezervime",
    selection: "Një Përzgjedhje nga The Fox", groupDining: "Grup e darkë", privateTitle: "Tavolina private, ditëlindje dhe netë sociale.",
    name: "Emri", phone: "Telefoni", email: "Email", date: "Data", guests: "Mysafirë", submitInquiry: "Dërgo kërkesën",
    reservationsTitle: "Rezervime", bookToday: "Rezervo Tavolinën Sot", fullName: "Emri i plotë", phoneNumber: "Numri i telefonit", time: "Ora", findTable: "Gjej një Tavolinë",
    openingHours: "Orari i punës", monday: "E hënë", tuesday: "E martë", wednesday: "E mërkurë", thursday: "E enjte", friday: "E premte", saturday: "E shtunë", sunday: "E diel",
    fastDelivery: "Dërgesë e shpejtë", freshDoor: "Nga The Fox deri në derën tënde.", deliveryCopy: "Shiko të njëjtën menu me restorantin, shto të preferuarat dhe bëj kërkesën për dërgesë.",
    minutes: "15–30 min", location: "Dërgesë në Kavajë", cash: "Pagesë në dorëzim", orderNow: "Porosit tani", searchDishes: "Kërko ushqime", yourOrder: "Porosia jote", cart: "Shporta",
    cartEmpty: "Shporta është bosh. Shto disa të preferuara për të filluar.", subtotal: "Nëntotal", deliveryFee: "Dërgesa", total: "Totali", address: "Adresa e dërgesës", kitchenNotes: "Shënime për kuzhinën",
    placeOrder: "Bëj porosinë", all: "Të gjitha", featured: "Të veçanta", each: "çdo një", item: "artikull", items: "artikuj"
  }
};

function applyTheFoxLanguage(language) {
  const lang = THEFOX_TRANSLATIONS[language] ? language : "en";
  document.documentElement.lang = lang;
  localStorage.setItem("thefox.language", lang);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (THEFOX_TRANSLATIONS[lang][key]) element.textContent = THEFOX_TRANSLATIONS[lang][key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (THEFOX_TRANSLATIONS[lang][key]) element.placeholder = THEFOX_TRANSLATIONS[lang][key];
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });
}

window.applyTheFoxLanguage = applyTheFoxLanguage;

document.addEventListener("DOMContentLoaded", () => {
  applyTheFoxLanguage(localStorage.getItem("thefox.language") || "en");

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => applyTheFoxLanguage(button.dataset.lang));
  });
});
