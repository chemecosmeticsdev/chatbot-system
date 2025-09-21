// Thai Cultural Adaptations and Formatting Utilities

export interface ThaiCulturalSettings {
  calendar: {
    buddhist: boolean;
    gregorian: boolean;
    defaultCalendar: 'buddhist' | 'gregorian';
  };
  numbers: {
    format: string;
    currency: string;
    currencySymbol: string;
    currencyPosition: 'before' | 'after';
  };
  date: {
    format: string;
    longFormat: string;
    timeFormat: string;
    firstDayOfWeek: number; // 0 = Sunday
  };
  formality: {
    level: 'formal' | 'polite' | 'casual';
    honorifics: boolean;
    royalLanguage: boolean;
  };
  address: {
    format: string[];
    postalCodeFormat: string;
  };
  colors: {
    auspicious: string[];
    royalColors: string[];
    culturalMeanings: Record<string, string>;
  };
}

export const thaiCulturalDefaults: ThaiCulturalSettings = {
  calendar: {
    buddhist: true,
    gregorian: true,
    defaultCalendar: 'buddhist'
  },
  numbers: {
    format: 'th-TH',
    currency: 'THB',
    currencySymbol: '฿',
    currencyPosition: 'before'
  },
  date: {
    format: 'dd/MM/yyyy',
    longFormat: 'วันdddd ที่ dd MMMM yyyy',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 0 // Sunday
  },
  formality: {
    level: 'polite',
    honorifics: true,
    royalLanguage: false
  },
  address: {
    format: ['number', 'street', 'subdistrict', 'district', 'province', 'postalCode'],
    postalCodeFormat: '\\d{5}'
  },
  colors: {
    auspicious: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    royalColors: ['#FFD700', '#8B0000', '#000080', '#FFFFFF'],
    culturalMeanings: {
      gold: 'prosperity_wisdom',
      red: 'good_fortune_celebration',
      blue: 'royalty_stability',
      green: 'growth_harmony',
      purple: 'nobility_spirituality',
      white: 'purity_peace',
      black: 'elegance_power'
    }
  }
};

// Thai Date Formatting
export class ThaiDateFormatter {
  private static buddhist_era_offset = 543;

  static formatDate(date: Date, format: 'short' | 'long' | 'buddhist' = 'short'): string {
    const options: Intl.DateTimeFormatOptions = {};

    switch (format) {
      case 'short':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        return new Intl.DateTimeFormat('th-TH', options).format(date);

      case 'long':
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        return new Intl.DateTimeFormat('th-TH', options).format(date);

      case 'buddhist':
        const buddhistYear = date.getFullYear() + this.buddhist_era_offset;
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        const formatted = new Intl.DateTimeFormat('th-TH', options).format(date);
        return formatted.replace(date.getFullYear().toString(), buddhistYear.toString());

      default:
        return new Intl.DateTimeFormat('th-TH').format(date);
    }
  }

  static formatTime(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  }

  static formatDateTime(date: Date, useBuddhist = true): string {
    const dateStr = useBuddhist ?
      this.formatDate(date, 'buddhist') :
      this.formatDate(date, 'long');
    const timeStr = this.formatTime(date);
    return `${dateStr} เวลา ${timeStr} น.`;
  }
}

// Thai Number Formatting
export class ThaiNumberFormatter {
  static formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat('th-TH', options).format(value);
  }

  static formatCurrency(value: number, currency = 'THB'): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol'
    }).format(value);
  }

  static formatPercent(value: number, decimals = 1): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  }

  static formatFileSize(bytes: number): string {
    const units = ['ไบต์', 'กิโลไบต์', 'เมกะไบต์', 'กิกะไบต์', 'เทราไบต์'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${this.formatNumber(size, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  }
}

// Thai Text Utilities
export class ThaiTextUtils {
  // Thai politeness particles
  static readonly politeParticles = {
    male: 'ครับ',
    female: 'ค่ะ',
    general: 'ค่ะ/ครับ'
  };

  // Thai honorific prefixes
  static readonly honorifics = {
    mr: 'นาย',
    mrs: 'นาง',
    miss: 'นางสาว',
    dr: 'ดร.',
    prof: 'ศาสตราจารย์',
    ajarn: 'อาจารย์'
  };

  static addPoliteness(text: string, gender?: 'male' | 'female'): string {
    if (text.includes('ครับ') || text.includes('ค่ะ')) {
      return text; // Already has politeness particle
    }

    const particle = gender ? this.politeParticles[gender] : this.politeParticles.general;

    // Add particle at the end of sentences
    return text.replace(/([.!?]|$)/g, ` ${particle}$1`).trim();
  }

  static formatThaiName(firstName: string, lastName: string, honorific?: string): string {
    const prefix = honorific ? this.honorifics[honorific as keyof typeof this.honorifics] || honorific : '';
    return `${prefix}${firstName} ${lastName}`.trim();
  }

  static isThaiText(text: string): boolean {
    // Check if text contains Thai characters (Unicode range)
    return /[\u0E00-\u0E7F]/.test(text);
  }

  static formatThaiAddress(addressParts: {
    number?: string;
    street?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
  }): string {
    const parts = [];

    if (addressParts.number) parts.push(`เลขที่ ${addressParts.number}`);
    if (addressParts.street) parts.push(addressParts.street);
    if (addressParts.subdistrict) parts.push(`ตำบล${addressParts.subdistrict}`);
    if (addressParts.district) parts.push(`อำเภอ${addressParts.district}`);
    if (addressParts.province) parts.push(`จังหวัด${addressParts.province}`);
    if (addressParts.postalCode) parts.push(addressParts.postalCode);

    return parts.join(' ');
  }
}

// Thai Cultural Color Meanings
export class ThaiColorSystem {
  private static readonly colorMeanings = {
    '#FFD700': { name: 'ทอง', meaning: 'ความมั่งคั่ง ปัญญา', auspicious: true },
    '#FF0000': { name: 'แดง', meaning: 'โชคดี การเฉลิมฉลอง', auspicious: true },
    '#0000FF': { name: 'น้ำเงิน', meaning: 'ราชสี ความมั่นคง', royal: true },
    '#008000': { name: 'เขียว', meaning: 'การเติบโต ความสามัคคี', auspicious: true },
    '#800080': { name: 'ม่วง', meaning: 'ความสูงส่ง จิตวิญญาณ', royal: true },
    '#FFFFFF': { name: 'ขาว', meaning: 'ความบริสุทธิ์ สันติภาพ', auspicious: true },
    '#000000': { name: 'ดำ', meaning: 'ความสง่างาม อำนาจ', neutral: true }
  };

  static getColorMeaning(color: string): { name: string; meaning: string; significance?: string } | null {
    const colorInfo = this.colorMeanings[color.toUpperCase() as keyof typeof this.colorMeanings];
    if (!colorInfo) return null;

    let significance = '';
    if ('auspicious' in colorInfo) significance = 'มงคล';
    if ('royal' in colorInfo) significance = 'ราชสี';
    if ('neutral' in colorInfo) significance = 'กลาง';

    return {
      name: colorInfo.name,
      meaning: colorInfo.meaning,
      significance
    };
  }

  static getAuspiciousColors(): string[] {
    return Object.entries(this.colorMeanings)
      .filter(([_, info]) => 'auspicious' in info)
      .map(([color]) => color);
  }

  static getRoyalColors(): string[] {
    return Object.entries(this.colorMeanings)
      .filter(([_, info]) => 'royal' in info)
      .map(([color]) => color);
  }
}

// Thai Buddhist Calendar
export class ThaiBuddhistCalendar {
  private static readonly buddhist_era_offset = 543;

  static getCurrentBuddhistYear(): number {
    return new Date().getFullYear() + this.buddhist_era_offset;
  }

  static convertToBuddhistYear(gregorianYear: number): number {
    return gregorianYear + this.buddhist_era_offset;
  }

  static convertToGregorianYear(buddhistYear: number): number {
    return buddhistYear - this.buddhist_era_offset;
  }

  static formatBuddhistDate(date: Date): string {
    const buddhistYear = this.convertToBuddhistYear(date.getFullYear());
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date).replace(date.getFullYear().toString(), buddhistYear.toString());
  }
}

// Cultural Validation
export class ThaiCulturalValidator {
  static validateThaiPhoneNumber(phone: string): boolean {
    // Thai phone number patterns
    const patterns = [
      /^0[1-9]\d{8}$/, // Mobile: 0x-xxxx-xxxx
      /^02\d{7}$/, // Bangkok landline: 02-xxx-xxxx
      /^0[3-7]\d{8}$/, // Provincial landlines
      /^1\d{3}$/ // Short numbers
    ];

    return patterns.some(pattern => pattern.test(phone.replace(/[-\s]/g, '')));
  }

  static validateThaiPostalCode(postalCode: string): boolean {
    return /^\d{5}$/.test(postalCode);
  }

  static validateThaiIDCard(idCard: string): boolean {
    // Thai ID card validation (13 digits with checksum)
    if (!/^\d{13}$/.test(idCard)) return false;

    const digits = idCard.split('').map(Number);
    const checksum = digits[12];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (13 - i);
    }

    const calculatedChecksum = (11 - (sum % 11)) % 10;
    return checksum === calculatedChecksum;
  }
}

export default {
  ThaiDateFormatter,
  ThaiNumberFormatter,
  ThaiTextUtils,
  ThaiColorSystem,
  ThaiBuddhistCalendar,
  ThaiCulturalValidator,
  thaiCulturalDefaults
};