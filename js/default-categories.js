// /js/default-categories.js
// Optimized category set for Spendrill
// Compatible with production-ready db.js
// Both categories AND subcategories support emoji/image

export const DEFAULT_CATEGORIES = [
  {
    id: "food_dining",
    name: "Food & Dining",
    emoji: "🍽️",
    image: "",
    subcategories: [
      { id: "restaurants_cafes", name: "Restaurants & Cafes", emoji: "🍴", image: "" },
      { id: "food_delivery", name: "Food Delivery", emoji: "🥡", image: "" },
      { id: "groceries", name: "Groceries", emoji: "🛒", image: "" },
      { id: "vegetables_fruits", name: "Vegetables & Fruits", emoji: "🥕", image: "" },
      { id: "tiffin_service", name: "Tiffin Service", emoji: "🍳", image: "" },
      { id: "street_food", name: "Street Food", emoji: "🥘", image: "" },
      { id: "tea_coffee_snacks", name: "Tea/Coffee/Snacks", emoji: "☕", image: "" },
      { id: "sweets_bakery", name: "Sweets & Bakery", emoji: "🍰", image: "" },
      { id: "beverages", name: "Beverages", emoji: "🧃", image: "" },
      { id: "alcohol_drinks", name: "Alcohol & Drinks", emoji: "🍺", image: "" }
    ]
  },

  {
    id: "shopping",
    name: "Shopping",
    emoji: "🛍️",
    image: "",
    subcategories: [
      { id: "clothing", name: "Clothing", emoji: "👕", image: "" },
      { id: "footwear", name: "Footwear", emoji: "👞", image: "" },
      { id: "ethnic_wear", name: "Ethnic Wear", emoji: "👗", image: "" },
      { id: "electronics_gadgets", name: "Electronics & Gadgets", emoji: "📱", image: "" },
      { id: "cosmetics_beauty", name: "Cosmetics & Beauty", emoji: "💄", image: "" },
      { id: "personal_hygiene", name: "Personal Hygiene", emoji: "🧴", image: "" },
      { id: "gifts", name: "Gifts", emoji: "🎁", image: "" },
      { id: "books", name: "Books", emoji: "📚", image: "" },
      { id: "online_shopping", name: "Online Shopping", emoji: "🛒", image: "" },
      { id: "toys_games", name: "Toys & Games", emoji: "🧸", image: "" }
    ]
  },

  {
    id: "transportation",
    name: "Transportation",
    emoji: "🚗",
    image: "",
    subcategories: [
      { id: "petrol_diesel", name: "Petrol/Diesel", emoji: "⛽", image: "" },
      { id: "ev_charging", name: "EV Charging", emoji: "🔌", image: "" },
      { id: "cab", name: "Cab (Ola/Uber/Rapido)", emoji: "🚕", image: "" },
      { id: "auto_rickshaw", name: "Auto Rickshaw", emoji: "🛺", image: "" },
      { id: "bus_metro", name: "Bus/Metro", emoji: "🚌", image: "" },
      { id: "train", name: "Train", emoji: "🚂", image: "" },
      { id: "flight", name: "Flight", emoji: "✈️", image: "" },
      { id: "parking", name: "Parking", emoji: "🅿️", image: "" },
      { id: "vehicle_servicing", name: "Vehicle Servicing", emoji: "🔧", image: "" },
      { id: "vehicle_insurance", name: "Vehicle Insurance", emoji: "🛞", image: "" },
      { id: "fastag_toll", name: "FASTag/Toll", emoji: "💳", image: "" }
    ]
  },

  {
    id: "bills_utilities",
    name: "Bills & Utilities",
    emoji: "💡",
    image: "",
    subcategories: [
      { id: "electricity_bill", name: "Electricity Bill", emoji: "⚡", image: "" },
      { id: "water_bill", name: "Water Bill", emoji: "💧", image: "" },
      { id: "gas_lpg", name: "Gas/LPG", emoji: "🔥", image: "" },
      { id: "mobile_recharge", name: "Mobile Recharge", emoji: "📱", image: "" },
      { id: "internet_broadband", name: "Internet/Broadband", emoji: "🌐", image: "" },
      { id: "dth_cable_tv", name: "DTH/Cable TV", emoji: "📺", image: "" },
      { id: "society_maintenance", name: "Society Maintenance", emoji: "🏢", image: "" },
      { id: "house_rent", name: "House Rent", emoji: "🏠", image: "" },
      { id: "credit_card_payment", name: "Credit Card Payment", emoji: "💳", image: "" },
      { id: "loan_emi", name: "Loan EMI", emoji: "🏦", image: "" }
    ]
  },

  {
    id: "health_medical",
    name: "Health & Medical",
    emoji: "💊",
    image: "",
    subcategories: [
      { id: "doctor_consultation", name: "Doctor Consultation", emoji: "👨‍⚕️", image: "" },
      { id: "medicines", name: "Medicines", emoji: "💊", image: "" },
      { id: "lab_tests", name: "Lab Tests", emoji: "🧪", image: "" },
      { id: "dental_care", name: "Dental Care", emoji: "🦷", image: "" },
      { id: "eye_care", name: "Eye Care", emoji: "👓", image: "" },
      { id: "hospital_bills", name: "Hospital Bills", emoji: "🏥", image: "" },
      { id: "emergency", name: "Medical Emergency", emoji: "🚑", image: "" },
      { id: "vaccination", name: "Vaccination", emoji: "💉", image: "" },
      { id: "health_insurance", name: "Health Insurance", emoji: "🏥", image: "" },
      { id: "gym_fitness", name: "Gym/Fitness", emoji: "💪", image: "" },
      { id: "physiotherapy", name: "Physiotherapy", emoji: "🧘", image: "" },
      { id: "supplements_protein", name: "Supplements/Protein", emoji: "🧴", image: "" }
    ]
  },

  {
    id: "entertainment",
    name: "Entertainment",
    emoji: "🎬",
    image: "",
    subcategories: [
      { id: "movies", name: "Movies", emoji: "🎥", image: "" },
      { id: "events_concerts", name: "Events/Concerts", emoji: "🎪", image: "" },
      { id: "ott_subscriptions", name: "OTT Subscriptions", emoji: "📺", image: "" },
      { id: "gaming", name: "Gaming", emoji: "🎮", image: "" },
      { id: "sports_activities", name: "Sports Activities", emoji: "🏏", image: "" },
      { id: "hobbies_crafts", name: "Hobbies & Crafts", emoji: "🎨", image: "" },
      { id: "digital_subscriptions", name: "Digital Subscriptions", emoji: "📖", image: "" },
      { id: "music_streaming", name: "Music Streaming", emoji: "🎵", image: "" },
      { id: "entertainment_passes", name: "Entertainment Passes", emoji: "🎰", image: "" }
    ]
  },

  {
    id: "education",
    name: "Education",
    emoji: "🎓",
    image: "",
    subcategories: [
      { id: "school_college_fees", name: "School/College Fees", emoji: "🏫", image: "" },
      { id: "exam_fees", name: "Exam Fees", emoji: "📝", image: "" },
      { id: "books_materials", name: "Books & Study Materials", emoji: "📚", image: "" },
      { id: "stationery", name: "Stationery", emoji: "✏️", image: "" },
      { id: "tuition_coaching", name: "Tuition/Coaching", emoji: "👨‍🏫", image: "" },
      { id: "online_courses", name: "Online Courses", emoji: "💻", image: "" },
      { id: "workshops", name: "Workshops", emoji: "🎓", image: "" },
      { id: "school_supplies", name: "School Supplies", emoji: "🎒", image: "" }
    ]
  },

  {
    id: "family_personal",
    name: "Family & Personal",
    emoji: "👨‍👩‍👦",
    image: "",
    subcategories: [
      { id: "salon_barber", name: "Salon/Barber", emoji: "✂️", image: "" },
      { id: "spa_beauty", name: "Spa/Beauty", emoji: "💆", image: "" },
      { id: "baby_care", name: "Baby Care", emoji: "👶", image: "" },
      { id: "kids_clothing", name: "Kids Clothing", emoji: "👧", image: "" },
      { id: "baby_food", name: "Baby Food", emoji: "🍼", image: "" },
      { id: "kids_activities", name: "Kids Activities", emoji: "🎈", image: "" },
      { id: "pet_food", name: "Pet Food", emoji: "🐕", image: "" },
      { id: "pet_grooming", name: "Pet Grooming", emoji: "🐾", image: "" },
      { id: "jewelry", name: "Jewelry", emoji: "💍", image: "" },
      { id: "accessories", name: "Accessories", emoji: "👔", image: "" }
    ]
  },

  {
    id: "personal_lifestyle_men",
    name: "Personal Lifestyle (Men)",
    emoji: "💼",
    image: "",
    subcategories: [
      { id: "beard_grooming", name: "Beard Grooming", emoji: "✂️", image: "" },
      { id: "mens_salon", name: "Men's Salon", emoji: "💈", image: "" },
      { id: "mens_fashion_accessories", name: "Men's Fashion (Belts/Wallets)", emoji: "🤵", image: "" },
      { id: "sports_gear", name: "Sports Gear", emoji: "👟", image: "" },
      { id: "sunglasses", name: "Sunglasses", emoji: "🕶️", image: "" },
      { id: "perfume_deodorant", name: "Perfume/Deodorant", emoji: "🧴", image: "" },
      { id: "shaving_essentials", name: "Shaving Essentials", emoji: "🧼", image: "" },
      { id: "supplements", name: "Supplements (Protein/Creatine)", emoji: "🩺", image: "" }
    ]
  },

  {
    id: "digital_tech",
    name: "Digital & Tech",
    emoji: "📱",
    image: "",
    subcategories: [
      { id: "cloud_storage", name: "Cloud Storage", emoji: "☁️", image: "" },
      { id: "ai_tools", name: "AI Tools/ChatGPT", emoji: "🤖", image: "" },
      { id: "antivirus_pc_tools", name: "Antivirus/PC Tools", emoji: "🛡️", image: "" },
      { id: "domain_hosting", name: "Domain/Hosting", emoji: "🌐", image: "" },
      { id: "appstore_purchases", name: "App Store/Play Store Purchases", emoji: "💳", image: "" }
    ]
  },

  {
    id: "vehicle_lifestyle",
    name: "Vehicle Lifestyle",
    emoji: "🚘",
    image: "",
    subcategories: [
      { id: "helmet_riding_gear", name: "Helmet/Riding Gear", emoji: "🪖", image: "" },
      { id: "car_bike_accessories", name: "Car/Bike Accessories", emoji: "🚗", image: "" },
      { id: "car_wash_detailing", name: "Car Wash/Detailing", emoji: "🧽", image: "" },
      { id: "tyre_puncture_repair", name: "Tyre/Puncture Repair", emoji: "🛞", image: "" },
      { id: "highway_toll_food", name: "Highway/Toll Food", emoji: "🛣️", image: "" },
      { id: "road_trip_snacks", name: "Road Trip Snacks", emoji: "🍽️", image: "" }
    ]
  },

  {
    id: "family_responsibilities_india",
    name: "Family Responsibilities",
    emoji: "👨‍👩‍👧",
    image: "",
    subcategories: [
      { id: "parents_medicines", name: "Parents' Medicines", emoji: "💊", image: "" },
      { id: "parents_medical_bills", name: "Parents' Medical Bills", emoji: "🏥", image: "" },
      { id: "home_repairs_parents", name: "Home Repairs for Parents", emoji: "🛠️", image: "" },
      { id: "household_shopping_parents", name: "Household Shopping for Parents", emoji: "🛍️", image: "" },
      { id: "monthly_support_money", name: "Monthly Support Money", emoji: "💰", image: "" }
    ]
  },

  {
    id: "cash_small_expenses",
    name: "Cash & Small Expenses",
    emoji: "💸",
    image: "",
    subcategories: [
      { id: "cash_tips", name: "Cash Tips", emoji: "💵", image: "" },
      { id: "cash_rickshaw", name: "Cash Rickshaw", emoji: "🚖", image: "" },
      { id: "water_bottle", name: "Water Bottle", emoji: "💧", image: "" },
      { id: "chai_small_snacks", name: "Chai/Small Snacks", emoji: "☕", image: "" },
      { id: "cash_functions_shagun", name: "Cash at Functions (Shagun)", emoji: "🎁", image: "" }
    ]
  },

  {
    id: "insurance",
    name: "Insurance",
    emoji: "🛡️",
    image: "",
    subcategories: [
      { id: "home_insurance", name: "Home Insurance", emoji: "🏠", image: "" },
      { id: "gadget_insurance", name: "Gadget Insurance", emoji: "📱", image: "" },
      { id: "travel_insurance", name: "Travel Insurance", emoji: "✈️", image: "" },
      { id: "family_insurance", name: "Family Insurance", emoji: "👨‍👩‍👧", image: "" },
      { id: "term_insurance", name: "Term Insurance", emoji: "🛡️", image: "" }
    ]
  },

  {
    id: "work_career",
    name: "Work & Career",
    emoji: "💼",
    image: "",
    subcategories: [
      { id: "office_supplies", name: "Office Supplies", emoji: "🧾", image: "" },
      { id: "printing", name: "Printing", emoji: "🖨️", image: "" },
      { id: "business_travel", name: "Business Travel", emoji: "🚗", image: "" },
      { id: "client_meetings", name: "Client Meetings", emoji: "☕", image: "" },
      { id: "work_calls", name: "Work Calls", emoji: "📞", image: "" },
      { id: "software_apps", name: "Software/Apps", emoji: "🔧", image: "" },
      { id: "professional_clothing", name: "Professional Clothing", emoji: "👔", image: "" },
      { id: "professional_services", name: "Professional Services", emoji: "📊", image: "" },
      { id: "coworking_space", name: "Co-working Space", emoji: "🏢", image: "" },
      { id: "linkedin_premium", name: "LinkedIn Premium", emoji: "💼", image: "" },
      { id: "skill_exams", name: "Skill Exams (AWS/Workday)", emoji: "🧠", image: "" }
    ]
  },

  {
    id: "events_occasions",
    name: "Events & Occasions",
    emoji: "🎉",
    image: "",
    subcategories: [
      { id: "birthday_parties", name: "Birthday Parties", emoji: "🎂", image: "" },
      { id: "wedding", name: "Wedding", emoji: "💒", image: "" },
      { id: "anniversary", name: "Anniversary", emoji: "💝", image: "" },
      { id: "festival_shopping", name: "Festival Shopping", emoji: "🪔", image: "" },
      { id: "gift_shopping", name: "Gift Shopping", emoji: "🎁", image: "" },
      { id: "party_supplies", name: "Party Supplies", emoji: "🥳", image: "" },
      { id: "photography_videography", name: "Photography/Videography", emoji: "📸", image: "" },
      { id: "catering", name: "Catering", emoji: "🍰", image: "" }
    ]
  },

  {
    id: "travel_vacation",
    name: "Travel & Vacation",
    emoji: "✈️",
    image: "",
    subcategories: [
      { id: "hotel", name: "Hotel", emoji: "🏨", image: "" },
      { id: "travel_booking", name: "Travel Booking", emoji: "🎫", image: "" },
      { id: "travel_food", name: "Travel Food", emoji: "🍽️", image: "" },
      { id: "local_transport", name: "Local Transport", emoji: "🚖", image: "" },
      { id: "travel_gear", name: "Travel Gear", emoji: "🎒", image: "" },
      { id: "activities_sightseeing", name: "Activities/Sightseeing", emoji: "📷", image: "" },
      { id: "visa_passport", name: "Visa/Passport", emoji: "🛂", image: "" },
      { id: "weekend_trip", name: "Weekend Trip", emoji: "🏞️", image: "" },
      { id: "hill_station_trip", name: "Hill Station Trip", emoji: "🏔️", image: "" },
      { id: "goa_trip", name: "Goa Trip", emoji: "🏝️", image: "" }
    ]
  },

  {
    id: "lending_borrowing",
    name: "Lending & Borrowing",
    emoji: "💸",
    image: "",
    subcategories: [
      { id: "money_lent", name: "Money Lent", emoji: "🤝", image: "" },
      { id: "money_borrowed", name: "Money Borrowed", emoji: "💰", image: "" },
      { id: "personal_loan_repayment", name: "Personal Loan Repayment", emoji: "🔄", image: "" }
    ]
  },

  {
    id: "miscellaneous",
    name: "Miscellaneous",
    emoji: "📦",
    image: "",
    subcategories: [
      { id: "bank_charges", name: "Bank Charges", emoji: "🏦", image: "" },
      { id: "atm_withdrawal_fee", name: "ATM Withdrawal Fee", emoji: "💵", image: "" },
      { id: "courier_post", name: "Courier/Post", emoji: "📬", image: "" },
      { id: "locksmith_key", name: "Locksmith/Key", emoji: "🔑", image: "" },
      { id: "repairs_phone_laptop", name: "Repairs (Phone/Laptop)", emoji: "⚙️", image: "" },
      { id: "misc_services", name: "Misc Services", emoji: "🧾", image: "" },
      { id: "other_expenses", name: "Other Expenses", emoji: "❓", image: "" }
    ]
  },

  {
    id: "emergency",
    name: "Emergency",
    emoji: "🚨",
    image: "",
    subcategories: [
      { id: "urgent_repairs", name: "Urgent Repairs", emoji: "🔧", image: "" },
      { id: "fines_penalties", name: "Fines/Penalties", emoji: "⚠️", image: "" },
      { id: "sos_urgent_needs", name: "SOS/Urgent Needs", emoji: "🆘", image: "" }
    ]
  }
];

// Helper: Get category by ID
export function getCategoryById(id) {
  return DEFAULT_CATEGORIES.find(cat => cat.id === id);
}

// Helper: Get all category names for quick access
export function getAllCategoryNames() {
  return DEFAULT_CATEGORIES.map(cat => ({
    id: cat.id,
    name: cat.name,
    emoji: cat.emoji
  }));
}

// Helper: Get subcategories for a category
export function getSubcategories(categoryId) {
  const category = getCategoryById(categoryId);
  return category ? category.subcategories : [];
}

// Helper: Find subcategory by ID across all categories
export function findSubcategory(categoryId, subcategoryId) {
  const category = getCategoryById(categoryId);
  if (!category) return null;
  return category.subcategories.find(sub => sub.id === subcategoryId);
}

// Helper: Search categories by name
export function searchCategories(query) {
  const lowercaseQuery = query.toLowerCase();
  return DEFAULT_CATEGORIES.filter(cat =>
    cat.name.toLowerCase().includes(lowercaseQuery)
  );
}

// Helper: Search subcategories across all categories
export function searchSubcategories(query) {
  const lowercaseQuery = query.toLowerCase();
  const results = [];
  
  DEFAULT_CATEGORIES.forEach(cat => {
    const matchingSubs = cat.subcategories.filter(sub =>
      sub.name.toLowerCase().includes(lowercaseQuery)
    );
    
    matchingSubs.forEach(sub => {
      results.push({
        ...sub,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.emoji
      });
    });
  });
  
  return results;
}

// Total counts for validation
export const CATEGORY_STATS = {
  totalCategories: DEFAULT_CATEGORIES.length,
  totalSubcategories: DEFAULT_CATEGORIES.reduce(
    (sum, cat) => sum + (cat.subcategories?.length || 0),
    0
  )
};

console.log(`📦 Loaded ${CATEGORY_STATS.totalCategories} categories with ${CATEGORY_STATS.totalSubcategories} subcategories`);