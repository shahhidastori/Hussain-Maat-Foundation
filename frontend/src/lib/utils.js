import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPKR(amount) {
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

export function getInitials(firstName, lastName) {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

export function getCategoryLabel(category) {
  const labels = {
    school_fee: 'School Fee',
    health_expenses: 'Health Expenses',
    emergency: 'Emergency',
    wedding_support: 'Wedding Support',
    funeral_expenses: 'Funeral Expenses',
    housing_assistance: 'Housing Assistance',
    business_loan: 'Business Loan',
    food_assistance: 'Food Assistance',
    utility_bills: 'Utility Bills',
    medical_surgery: 'Medical Surgery',
    education_scholarship: 'Education Scholarship',
    other: 'Other'
  };
  return labels[category] || category;
}

export function getCategoryIcon(category) {
  const icons = {
    school_fee: 'GraduationCap',
    health_expenses: 'Heart',
    emergency: 'AlertTriangle',
    wedding_support: 'Gift',
    funeral_expenses: 'Flower2',
    housing_assistance: 'Home',
    business_loan: 'Briefcase',
    food_assistance: 'UtensilsCrossed',
    utility_bills: 'Zap',
    medical_surgery: 'Stethoscope',
    education_scholarship: 'BookOpen',
    other: 'MoreHorizontal'
  };
  return icons[category] || 'Circle';
}
