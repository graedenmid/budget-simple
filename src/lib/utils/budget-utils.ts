import {
  DollarSign,
  PiggyBank,
  CreditCard,
  Heart,
  Coffee,
  Package,
} from "lucide-react";
import type { BudgetCategory } from "@/types/database";

/**
 * Get the appropriate icon for a budget category
 */
export function getCategoryIcon(category: BudgetCategory) {
  switch (category) {
    case "Bills":
      return Package;
    case "Savings":
      return PiggyBank;
    case "Debt":
      return CreditCard;
    case "Giving":
      return Heart;
    case "Discretionary":
      return Coffee;
    case "Other":
    default:
      return DollarSign;
  }
}

/**
 * Get the appropriate color for a budget category
 */
export function getCategoryColor(category: BudgetCategory): string {
  switch (category) {
    case "Bills":
      return "blue";
    case "Savings":
      return "green";
    case "Debt":
      return "red";
    case "Giving":
      return "purple";
    case "Discretionary":
      return "orange";
    case "Other":
    default:
      return "gray";
  }
}

/**
 * Get category display information (icon and color together)
 */
export function getCategoryInfo(category: BudgetCategory) {
  return {
    icon: getCategoryIcon(category),
    color: getCategoryColor(category),
  };
}

/**
 * Get all available budget categories with their display info
 */
export function getAllCategories() {
  const categories: BudgetCategory[] = [
    "Bills",
    "Savings",
    "Debt",
    "Giving",
    "Discretionary",
    "Other",
  ];

  return categories.map((category) => ({
    value: category,
    label: category,
    ...getCategoryInfo(category),
  }));
}
