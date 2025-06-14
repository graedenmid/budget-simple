// Expense Categories for Budget Simple
// Based on PRD requirements and common personal finance categories

export const EXPENSE_CATEGORIES = {
  // Housing & Utilities
  HOUSING: "Housing",
  UTILITIES: "Utilities",
  RENT_MORTGAGE: "Rent/Mortgage",
  INSURANCE_HOME: "Home Insurance",
  MAINTENANCE: "Home Maintenance",

  // Transportation
  TRANSPORTATION: "Transportation",
  FUEL: "Fuel",
  CAR_PAYMENT: "Car Payment",
  CAR_INSURANCE: "Car Insurance",
  CAR_MAINTENANCE: "Car Maintenance",
  PUBLIC_TRANSPORT: "Public Transport",
  PARKING: "Parking",

  // Food & Dining
  GROCERIES: "Groceries",
  DINING_OUT: "Dining Out",
  COFFEE: "Coffee",
  TAKEOUT: "Takeout",

  // Healthcare
  HEALTHCARE: "Healthcare",
  MEDICAL: "Medical",
  PHARMACY: "Pharmacy",
  DENTAL: "Dental",
  VISION: "Vision",
  INSURANCE_HEALTH: "Health Insurance",

  // Personal Care
  PERSONAL_CARE: "Personal Care",
  HAIRCARE: "Hair Care",
  CLOTHING: "Clothing",
  SHOPPING: "Shopping",
  FITNESS: "Fitness",

  // Entertainment & Recreation
  ENTERTAINMENT: "Entertainment",
  MOVIES: "Movies",
  STREAMING: "Streaming Services",
  GAMES: "Games",
  HOBBIES: "Hobbies",
  TRAVEL: "Travel",
  VACATION: "Vacation",

  // Technology
  TECHNOLOGY: "Technology",
  PHONE: "Phone",
  INTERNET: "Internet",
  SOFTWARE: "Software",
  ELECTRONICS: "Electronics",

  // Financial
  BANKING: "Banking",
  FEES: "Fees",
  INTEREST: "Interest",
  TAXES: "Taxes",
  INVESTMENTS: "Investments",

  // Debt & Credit
  DEBT_PAYMENT: "Debt Payment",
  CREDIT_CARD: "Credit Card",
  STUDENT_LOAN: "Student Loan",
  PERSONAL_LOAN: "Personal Loan",

  // Giving & Charity
  CHARITY: "Charity",
  DONATIONS: "Donations",
  GIFTS: "Gifts",
  RELIGIOUS: "Religious",

  // Business & Work
  BUSINESS: "Business",
  OFFICE_SUPPLIES: "Office Supplies",
  PROFESSIONAL: "Professional",
  EDUCATION: "Education",

  // Children & Family
  CHILDCARE: "Childcare",
  CHILDREN: "Children",
  PET_CARE: "Pet Care",
  FAMILY: "Family",

  // Miscellaneous
  MISCELLANEOUS: "Miscellaneous",
  OTHER: "Other",
  CASH: "Cash",
  UNCATEGORIZED: "Uncategorized",
} as const;

// Array of all categories for easy iteration
export const EXPENSE_CATEGORY_LIST = Object.values(EXPENSE_CATEGORIES);

// Common categories grouped by type
export const EXPENSE_CATEGORY_GROUPS = {
  ESSENTIAL: [
    EXPENSE_CATEGORIES.HOUSING,
    EXPENSE_CATEGORIES.UTILITIES,
    EXPENSE_CATEGORIES.RENT_MORTGAGE,
    EXPENSE_CATEGORIES.GROCERIES,
    EXPENSE_CATEGORIES.TRANSPORTATION,
    EXPENSE_CATEGORIES.HEALTHCARE,
    EXPENSE_CATEGORIES.INSURANCE_HEALTH,
    EXPENSE_CATEGORIES.INSURANCE_HOME,
    EXPENSE_CATEGORIES.CAR_INSURANCE,
  ],
  DISCRETIONARY: [
    EXPENSE_CATEGORIES.DINING_OUT,
    EXPENSE_CATEGORIES.ENTERTAINMENT,
    EXPENSE_CATEGORIES.SHOPPING,
    EXPENSE_CATEGORIES.HOBBIES,
    EXPENSE_CATEGORIES.TRAVEL,
    EXPENSE_CATEGORIES.COFFEE,
    EXPENSE_CATEGORIES.STREAMING,
  ],
  DEBT_AND_SAVINGS: [
    EXPENSE_CATEGORIES.DEBT_PAYMENT,
    EXPENSE_CATEGORIES.CREDIT_CARD,
    EXPENSE_CATEGORIES.STUDENT_LOAN,
    EXPENSE_CATEGORIES.PERSONAL_LOAN,
    EXPENSE_CATEGORIES.INVESTMENTS,
  ],
  GIVING: [
    EXPENSE_CATEGORIES.CHARITY,
    EXPENSE_CATEGORIES.DONATIONS,
    EXPENSE_CATEGORIES.GIFTS,
    EXPENSE_CATEGORIES.RELIGIOUS,
  ],
} as const;

// Default categories for quick selection
export const DEFAULT_EXPENSE_CATEGORIES = [
  EXPENSE_CATEGORIES.GROCERIES,
  EXPENSE_CATEGORIES.DINING_OUT,
  EXPENSE_CATEGORIES.FUEL,
  EXPENSE_CATEGORIES.ENTERTAINMENT,
  EXPENSE_CATEGORIES.SHOPPING,
  EXPENSE_CATEGORIES.HEALTHCARE,
  EXPENSE_CATEGORIES.UTILITIES,
  EXPENSE_CATEGORIES.MISCELLANEOUS,
] as const;

// Category icons mapping (for UI components)
export const EXPENSE_CATEGORY_ICONS = {
  [EXPENSE_CATEGORIES.GROCERIES]: "🛒",
  [EXPENSE_CATEGORIES.DINING_OUT]: "🍽️",
  [EXPENSE_CATEGORIES.FUEL]: "⛽",
  [EXPENSE_CATEGORIES.ENTERTAINMENT]: "🎬",
  [EXPENSE_CATEGORIES.SHOPPING]: "🛍️",
  [EXPENSE_CATEGORIES.HEALTHCARE]: "🏥",
  [EXPENSE_CATEGORIES.UTILITIES]: "⚡",
  [EXPENSE_CATEGORIES.RENT_MORTGAGE]: "🏠",
  [EXPENSE_CATEGORIES.TRANSPORTATION]: "🚗",
  [EXPENSE_CATEGORIES.COFFEE]: "☕",
  [EXPENSE_CATEGORIES.TRAVEL]: "✈️",
  [EXPENSE_CATEGORIES.GIFTS]: "🎁",
  [EXPENSE_CATEGORIES.CHARITY]: "❤️",
  [EXPENSE_CATEGORIES.TECHNOLOGY]: "💻",
  [EXPENSE_CATEGORIES.FITNESS]: "💪",
  [EXPENSE_CATEGORIES.CHILDCARE]: "👶",
  [EXPENSE_CATEGORIES.PET_CARE]: "🐕",
  [EXPENSE_CATEGORIES.MISCELLANEOUS]: "📝",
  [EXPENSE_CATEGORIES.OTHER]: "❓",
} as const;

// Category colors for UI (Tailwind CSS classes)
export const EXPENSE_CATEGORY_COLORS = {
  [EXPENSE_CATEGORIES.GROCERIES]: "bg-green-100 text-green-800",
  [EXPENSE_CATEGORIES.DINING_OUT]: "bg-orange-100 text-orange-800",
  [EXPENSE_CATEGORIES.FUEL]: "bg-blue-100 text-blue-800",
  [EXPENSE_CATEGORIES.ENTERTAINMENT]: "bg-purple-100 text-purple-800",
  [EXPENSE_CATEGORIES.SHOPPING]: "bg-pink-100 text-pink-800",
  [EXPENSE_CATEGORIES.HEALTHCARE]: "bg-red-100 text-red-800",
  [EXPENSE_CATEGORIES.UTILITIES]: "bg-yellow-100 text-yellow-800",
  [EXPENSE_CATEGORIES.RENT_MORTGAGE]: "bg-indigo-100 text-indigo-800",
  [EXPENSE_CATEGORIES.TRANSPORTATION]: "bg-cyan-100 text-cyan-800",
  [EXPENSE_CATEGORIES.COFFEE]: "bg-amber-100 text-amber-800",
  [EXPENSE_CATEGORIES.TRAVEL]: "bg-sky-100 text-sky-800",
  [EXPENSE_CATEGORIES.GIFTS]: "bg-rose-100 text-rose-800",
  [EXPENSE_CATEGORIES.CHARITY]: "bg-emerald-100 text-emerald-800",
  [EXPENSE_CATEGORIES.TECHNOLOGY]: "bg-slate-100 text-slate-800",
  [EXPENSE_CATEGORIES.FITNESS]: "bg-lime-100 text-lime-800",
  [EXPENSE_CATEGORIES.CHILDCARE]: "bg-teal-100 text-teal-800",
  [EXPENSE_CATEGORIES.PET_CARE]: "bg-violet-100 text-violet-800",
  [EXPENSE_CATEGORIES.MISCELLANEOUS]: "bg-gray-100 text-gray-800",
  [EXPENSE_CATEGORIES.OTHER]: "bg-neutral-100 text-neutral-800",
} as const;

// Utility functions
export function getCategoryIcon(category: string): string {
  return (
    EXPENSE_CATEGORY_ICONS[category as keyof typeof EXPENSE_CATEGORY_ICONS] ||
    "📝"
  );
}

export function getCategoryColor(category: string): string {
  return (
    EXPENSE_CATEGORY_COLORS[category as keyof typeof EXPENSE_CATEGORY_COLORS] ||
    "bg-gray-100 text-gray-800"
  );
}

export function isValidCategory(category: string): boolean {
  return (EXPENSE_CATEGORY_LIST as readonly string[]).includes(category);
}

export function getCategoryGroup(category: string): string | null {
  for (const [groupName, categories] of Object.entries(
    EXPENSE_CATEGORY_GROUPS
  )) {
    if ((categories as readonly string[]).includes(category)) {
      return groupName;
    }
  }
  return null;
}
