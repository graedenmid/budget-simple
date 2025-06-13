import type { BudgetItem } from "@/types/database";

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  category: "starter" | "advanced" | "specialized" | "custom";
  icon: string;
  items: Omit<BudgetItem, "id" | "user_id" | "created_at" | "updated_at">[];
  estimatedSetupTime: number; // in minutes
  targetAudience: string[];
  benefits: string[];
}

export interface QuickSetupProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  incomeRange: {
    min: number;
    max: number;
  };
  templates: string[]; // template IDs
  recommendedOrder: string[];
  customizations: {
    [templateId: string]: {
      adjustments: string[];
      tips: string[];
    };
  };
}

// Predefined budget item templates
export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "essential-bills",
    name: "Essential Bills",
    description: "Core monthly expenses that everyone needs",
    category: "starter",
    icon: "🏠",
    estimatedSetupTime: 5,
    targetAudience: ["First-time budgeters", "Students", "Young professionals"],
    benefits: [
      "Covers basic living expenses",
      "Easy to understand",
      "Quick setup",
    ],
    items: [
      {
        name: "Rent/Mortgage",
        category: "Bills",
        calc_type: "FIXED",
        value: 1200,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Utilities",
        category: "Bills",
        calc_type: "FIXED",
        value: 150,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Phone",
        category: "Bills",
        calc_type: "FIXED",
        value: 80,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Internet",
        category: "Bills",
        calc_type: "FIXED",
        value: 60,
        cadence: "monthly",
        priority: 4,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Groceries",
        category: "Bills",
        calc_type: "FIXED",
        value: 400,
        cadence: "monthly",
        priority: 5,
        is_active: true,
        depends_on: null,
      },
    ],
  },
  {
    id: "50-30-20-rule",
    name: "50/30/20 Budget Rule",
    description: "Popular budgeting method: 50% needs, 30% wants, 20% savings",
    category: "starter",
    icon: "📊",
    estimatedSetupTime: 8,
    targetAudience: ["Beginners", "Simple budgeters", "Balanced lifestyle"],
    benefits: [
      "Proven budgeting method",
      "Balanced approach",
      "Easy percentages",
    ],
    items: [
      {
        name: "Essential Needs",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 50,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Wants & Discretionary",
        category: "Discretionary",
        calc_type: "NET_PERCENT",
        value: 30,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Savings & Debt Repayment",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 20,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
    ],
  },
  {
    id: "debt-payoff-aggressive",
    name: "Aggressive Debt Payoff",
    description: "Maximize debt repayment while maintaining essentials",
    category: "specialized",
    icon: "💳",
    estimatedSetupTime: 12,
    targetAudience: [
      "High debt individuals",
      "Debt consolidation",
      "Financial recovery",
    ],
    benefits: [
      "Accelerated debt payoff",
      "Minimized interest",
      "Clear priorities",
    ],
    items: [
      {
        name: "Essential Bills",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 40,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Minimum Debt Payments",
        category: "Debt",
        calc_type: "FIXED",
        value: 300,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Emergency Fund",
        category: "Savings",
        calc_type: "FIXED",
        value: 100,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Extra Debt Payment",
        category: "Debt",
        calc_type: "REMAINING_PERCENT",
        value: 80,
        cadence: "monthly",
        priority: 4,
        is_active: true,
        depends_on: [
          "essential-bills",
          "minimum-debt-payments",
          "emergency-fund",
        ],
      },
      {
        name: "Basic Discretionary",
        category: "Discretionary",
        calc_type: "REMAINING_PERCENT",
        value: 20,
        cadence: "monthly",
        priority: 5,
        is_active: true,
        depends_on: [
          "essential-bills",
          "minimum-debt-payments",
          "emergency-fund",
        ],
      },
    ],
  },
  {
    id: "savings-focused",
    name: "Savings-Focused Budget",
    description: "Prioritize building wealth and emergency funds",
    category: "specialized",
    icon: "💰",
    estimatedSetupTime: 10,
    targetAudience: [
      "High earners",
      "Wealth builders",
      "Financial independence",
    ],
    benefits: [
      "Maximized savings rate",
      "Multiple savings goals",
      "Wealth building",
    ],
    items: [
      {
        name: "Essential Expenses",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 35,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Emergency Fund",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 15,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Retirement Savings",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 20,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Investment Fund",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 15,
        cadence: "monthly",
        priority: 4,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Lifestyle & Fun",
        category: "Discretionary",
        calc_type: "REMAINING_PERCENT",
        value: 100,
        cadence: "monthly",
        priority: 5,
        is_active: true,
        depends_on: [
          "essential-expenses",
          "emergency-fund",
          "retirement-savings",
          "investment-fund",
        ],
      },
    ],
  },
  {
    id: "family-budget",
    name: "Family Budget",
    description: "Comprehensive budget for families with children",
    category: "advanced",
    icon: "👨‍👩‍👧‍👦",
    estimatedSetupTime: 15,
    targetAudience: [
      "Families with children",
      "Dual income households",
      "Complex expenses",
    ],
    benefits: [
      "Child-related expenses",
      "Multiple categories",
      "Family priorities",
    ],
    items: [
      {
        name: "Housing & Utilities",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 30,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Groceries & Food",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 15,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Childcare",
        category: "Bills",
        calc_type: "FIXED",
        value: 800,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Transportation",
        category: "Bills",
        calc_type: "FIXED",
        value: 400,
        cadence: "monthly",
        priority: 4,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Children's Education",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 10,
        cadence: "monthly",
        priority: 5,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Emergency Fund",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 10,
        cadence: "monthly",
        priority: 6,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Family Activities",
        category: "Discretionary",
        calc_type: "REMAINING_PERCENT",
        value: 60,
        cadence: "monthly",
        priority: 7,
        is_active: true,
        depends_on: [
          "housing-utilities",
          "groceries-food",
          "childcare",
          "transportation",
          "children-education",
          "emergency-fund",
        ],
      },
      {
        name: "Personal Spending",
        category: "Discretionary",
        calc_type: "REMAINING_PERCENT",
        value: 40,
        cadence: "monthly",
        priority: 8,
        is_active: true,
        depends_on: [
          "housing-utilities",
          "groceries-food",
          "childcare",
          "transportation",
          "children-education",
          "emergency-fund",
        ],
      },
    ],
  },
  {
    id: "student-budget",
    name: "Student Budget",
    description: "Budget designed for college students and recent graduates",
    category: "starter",
    icon: "🎓",
    estimatedSetupTime: 7,
    targetAudience: [
      "College students",
      "Recent graduates",
      "Low income earners",
    ],
    benefits: [
      "Student-focused expenses",
      "Flexible categories",
      "Growth mindset",
    ],
    items: [
      {
        name: "Rent & Utilities",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 40,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Groceries",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 20,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Transportation",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 10,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Student Loan Payment",
        category: "Debt",
        calc_type: "FIXED",
        value: 200,
        cadence: "monthly",
        priority: 4,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Emergency Fund",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 5,
        cadence: "monthly",
        priority: 5,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Entertainment & Social",
        category: "Discretionary",
        calc_type: "REMAINING_PERCENT",
        value: 100,
        cadence: "monthly",
        priority: 6,
        is_active: true,
        depends_on: [
          "rent-utilities",
          "groceries",
          "transportation",
          "student-loan-payment",
          "emergency-fund",
        ],
      },
    ],
  },
  {
    id: "retirement-focused",
    name: "Pre-Retirement Budget",
    description: "Budget for those approaching or in retirement",
    category: "specialized",
    icon: "🏖️",
    estimatedSetupTime: 12,
    targetAudience: ["Pre-retirees", "Retirees", "Fixed income"],
    benefits: [
      "Healthcare focus",
      "Conservative approach",
      "Income preservation",
    ],
    items: [
      {
        name: "Housing & Utilities",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 25,
        cadence: "monthly",
        priority: 1,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Healthcare & Insurance",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 20,
        cadence: "monthly",
        priority: 2,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Food & Groceries",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 15,
        cadence: "monthly",
        priority: 3,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Transportation",
        category: "Bills",
        calc_type: "NET_PERCENT",
        value: 10,
        cadence: "monthly",
        priority: 4,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Emergency Fund",
        category: "Savings",
        calc_type: "NET_PERCENT",
        value: 10,
        cadence: "monthly",
        priority: 5,
        is_active: true,
        depends_on: null,
      },
      {
        name: "Travel & Hobbies",
        category: "Discretionary",
        calc_type: "REMAINING_PERCENT",
        value: 70,
        cadence: "monthly",
        priority: 6,
        is_active: true,
        depends_on: [
          "housing-utilities",
          "healthcare-insurance",
          "food-groceries",
          "transportation",
          "emergency-fund",
        ],
      },
      {
        name: "Gifts & Giving",
        category: "Giving",
        calc_type: "REMAINING_PERCENT",
        value: 30,
        cadence: "monthly",
        priority: 7,
        is_active: true,
        depends_on: [
          "housing-utilities",
          "healthcare-insurance",
          "food-groceries",
          "transportation",
          "emergency-fund",
        ],
      },
    ],
  },
];

// Quick setup profiles
export const QUICK_SETUP_PROFILES: QuickSetupProfile[] = [
  {
    id: "beginner-simple",
    name: "Simple Start",
    description: "Perfect for first-time budgeters who want to start simple",
    icon: "🌱",
    incomeRange: { min: 0, max: 50000 },
    templates: ["essential-bills", "50-30-20-rule"],
    recommendedOrder: ["essential-bills", "50-30-20-rule"],
    customizations: {
      "essential-bills": {
        adjustments: [
          "Adjust amounts based on your actual expenses",
          "Start with estimates and refine over time",
        ],
        tips: [
          "Track your spending for a month to get accurate amounts",
          "Don't worry about being perfect initially",
        ],
      },
      "50-30-20-rule": {
        adjustments: [
          "Use this as a framework, adjust percentages as needed",
          "Start with 50/30/20 and modify based on your situation",
        ],
        tips: [
          "This rule works well for most people",
          "Prioritize the 20% savings even if small amounts",
        ],
      },
    },
  },
  {
    id: "debt-crusher",
    name: "Debt Elimination",
    description:
      "Aggressive debt payoff strategy for those serious about becoming debt-free",
    icon: "⚡",
    incomeRange: { min: 30000, max: 100000 },
    templates: ["essential-bills", "debt-payoff-aggressive"],
    recommendedOrder: ["essential-bills", "debt-payoff-aggressive"],
    customizations: {
      "essential-bills": {
        adjustments: [
          "Minimize these to maximize debt payments",
          "Look for ways to reduce each category",
        ],
        tips: [
          "Consider temporary lifestyle changes",
          "Every dollar saved goes to debt",
        ],
      },
      "debt-payoff-aggressive": {
        adjustments: [
          "Adjust the extra payment percentage based on your comfort level",
          "Start with 60% if 80% feels too aggressive",
        ],
        tips: [
          "List all debts with interest rates",
          "Pay minimums on all, extra on highest rate",
        ],
      },
    },
  },
  {
    id: "wealth-builder",
    name: "Wealth Building",
    description:
      "Maximize savings and investments for long-term wealth building",
    icon: "💎",
    incomeRange: { min: 60000, max: 200000 },
    templates: ["essential-bills", "savings-focused"],
    recommendedOrder: ["essential-bills", "savings-focused"],
    customizations: {
      "essential-bills": {
        adjustments: [
          "Keep these lean to maximize savings potential",
          "Optimize for value, not luxury",
        ],
        tips: ["Automate bill payments", "Review and optimize regularly"],
      },
      "savings-focused": {
        adjustments: [
          "Adjust savings percentages based on your goals",
          "Consider increasing percentages over time",
        ],
        tips: [
          "Automate all savings transfers",
          "Take advantage of employer 401k matching",
        ],
      },
    },
  },
  {
    id: "family-manager",
    name: "Family Financial Manager",
    description: "Comprehensive budget management for families with children",
    icon: "👨‍👩‍👧‍👦",
    incomeRange: { min: 50000, max: 150000 },
    templates: ["family-budget"],
    recommendedOrder: ["family-budget"],
    customizations: {
      "family-budget": {
        adjustments: [
          "Adjust childcare costs based on your situation",
          "Modify education savings based on number of children",
        ],
        tips: [
          "Include both parents in budget discussions",
          "Plan for seasonal expenses like school supplies",
        ],
      },
    },
  },
  {
    id: "student-life",
    name: "Student Life",
    description:
      "Budget designed for students and young professionals starting out",
    icon: "🎓",
    incomeRange: { min: 0, max: 40000 },
    templates: ["student-budget"],
    recommendedOrder: ["student-budget"],
    customizations: {
      "student-budget": {
        adjustments: [
          "Adjust based on whether you live on/off campus",
          "Modify loan payments based on your actual obligations",
        ],
        tips: [
          "Take advantage of student discounts",
          "Build good financial habits early",
        ],
      },
    },
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: BudgetTemplate["category"]
): BudgetTemplate[] {
  return BUDGET_TEMPLATES.filter((template) => template.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): BudgetTemplate | undefined {
  return BUDGET_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get quick setup profile by ID
 */
export function getQuickSetupProfileById(
  id: string
): QuickSetupProfile | undefined {
  return QUICK_SETUP_PROFILES.find((profile) => profile.id === id);
}

/**
 * Get recommended profiles based on income
 */
export function getRecommendedProfiles(
  annualIncome: number
): QuickSetupProfile[] {
  return QUICK_SETUP_PROFILES.filter(
    (profile) =>
      annualIncome >= profile.incomeRange.min &&
      (profile.incomeRange.max === 0 || annualIncome <= profile.incomeRange.max)
  );
}

/**
 * Generate budget items from template
 */
export function generateBudgetItemsFromTemplate(
  template: BudgetTemplate,
  userId: string,
  customizations?: Record<string, unknown>
): Omit<BudgetItem, "id" | "created_at" | "updated_at">[] {
  return template.items.map((item, index) => ({
    ...item,
    user_id: userId,
    priority:
      (customizations?.[
        `${item.name.toLowerCase().replace(/\s+/g, "-")}-priority`
      ] as number) ||
      item.priority ||
      index + 1,
  }));
}
