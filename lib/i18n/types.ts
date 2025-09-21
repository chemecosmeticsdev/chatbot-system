// TypeScript definitions for i18n
export interface TranslationResources {
  common: CommonTranslations;
  dashboard: DashboardTranslations;
  chatbot: ChatbotTranslations;
  product: ProductTranslations;
  document: DocumentTranslations;
  auth: AuthTranslations;
  form: FormTranslations;
  error: ErrorTranslations;
  success: SuccessTranslations;
  navigation: NavigationTranslations;
  admin: AdminTranslations;
  analytics: AnalyticsTranslations;
  settings: SettingsTranslations;
}

// Common translations interface
export interface CommonTranslations {
  actions: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    update: string;
    submit: string;
    back: string;
    next: string;
    previous: string;
    continue: string;
    confirm: string;
    close: string;
    open: string;
    expand: string;
    collapse: string;
    refresh: string;
    reload: string;
    retry: string;
    download: string;
    upload: string;
    export: string;
    import: string;
    search: string;
    filter: string;
    sort: string;
    clear: string;
    reset: string;
    apply: string;
    select: string;
    deselect: string;
    selectAll: string;
    deselectAll: string;
  };
  status: {
    loading: string;
    saving: string;
    saved: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    pending: string;
    completed: string;
    failed: string;
    active: string;
    inactive: string;
    enabled: string;
    disabled: string;
    online: string;
    offline: string;
    connected: string;
    disconnected: string;
  };
  time: {
    now: string;
    today: string;
    yesterday: string;
    tomorrow: string;
    thisWeek: string;
    lastWeek: string;
    nextWeek: string;
    thisMonth: string;
    lastMonth: string;
    nextMonth: string;
    thisYear: string;
    lastYear: string;
    nextYear: string;
    ago: string;
    remaining: string;
    seconds: string;
    minutes: string;
    hours: string;
    days: string;
    weeks: string;
    months: string;
    years: string;
  };
  units: {
    bytes: string;
    kb: string;
    mb: string;
    gb: string;
    tb: string;
    percentage: string;
    currency: string;
    items: string;
    users: string;
    messages: string;
    conversations: string;
    documents: string;
    pages: string;
  };
}

// Dashboard translations interface
export interface DashboardTranslations {
  title: string;
  subtitle: string;
  overview: {
    title: string;
    totalChatbots: string;
    activeConversations: string;
    messagesProcessed: string;
    documentsUploaded: string;
    successRate: string;
    averageResponseTime: string;
    costThisMonth: string;
    userSatisfaction: string;
  };
  metrics: {
    performance: string;
    usage: string;
    costs: string;
    quality: string;
    engagement: string;
    growth: string;
  };
  quickActions: {
    title: string;
    createChatbot: string;
    uploadDocument: string;
    viewAnalytics: string;
    manageUsers: string;
    systemSettings: string;
    viewLogs: string;
  };
}

// Chatbot translations interface
export interface ChatbotTranslations {
  title: string;
  list: {
    title: string;
    empty: string;
    loading: string;
    error: string;
  };
  create: {
    title: string;
    subtitle: string;
    form: {
      name: string;
      nameHint: string;
      description: string;
      descriptionHint: string;
      model: string;
      modelHint: string;
      language: string;
      languageHint: string;
      purpose: string;
      purposeHint: string;
      visibility: string;
      visibilityHint: string;
    };
    models: {
      claude3Haiku: string;
      claude3Sonnet: string;
      claude3Opus: string;
      gpt4: string;
      gpt35Turbo: string;
    };
    purposes: {
      customerSupport: string;
      salesAssistant: string;
      technicalSupport: string;
      productInfo: string;
      general: string;
      training: string;
    };
  };
  configure: {
    title: string;
    systemPrompt: string;
    systemPromptHint: string;
    temperature: string;
    temperatureHint: string;
    maxTokens: string;
    maxTokensHint: string;
    knowledgeBase: string;
    knowledgeBaseHint: string;
    integrations: string;
    integrationsHint: string;
  };
  deploy: {
    title: string;
    status: string;
    url: string;
    embedCode: string;
    apiKey: string;
    webhookUrl: string;
    testChat: string;
  };
  analytics: {
    title: string;
    conversations: string;
    messages: string;
    satisfaction: string;
    responseTime: string;
    accuracy: string;
    costs: string;
  };
}

// Product translations interface
export interface ProductTranslations {
  title: string;
  category: string;
  categories: {
    all: string;
    electronics: string;
    software: string;
    hardware: string;
    services: string;
    accessories: string;
    consumables: string;
  };
  properties: {
    name: string;
    description: string;
    price: string;
    category: string;
    brand: string;
    model: string;
    specifications: string;
    availability: string;
    warranty: string;
    support: string;
  };
  actions: {
    view: string;
    edit: string;
    delete: string;
    duplicate: string;
    export: string;
    assignToBot: string;
  };
}

// Document translations interface
export interface DocumentTranslations {
  title: string;
  upload: {
    title: string;
    subtitle: string;
    dragDrop: string;
    browse: string;
    supportedFormats: string;
    maxSize: string;
    processing: string;
    success: string;
    error: string;
  };
  process: {
    title: string;
    ocr: string;
    chunking: string;
    embedding: string;
    indexing: string;
    completed: string;
    failed: string;
  };
  manage: {
    title: string;
    search: string;
    filter: string;
    sort: string;
    view: string;
    edit: string;
    delete: string;
    reprocess: string;
  };
  types: {
    pdf: string;
    doc: string;
    txt: string;
    image: string;
    spreadsheet: string;
    presentation: string;
  };
}

// Auth translations interface
export interface AuthTranslations {
  signIn: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    rememberMe: string;
    forgotPassword: string;
    submit: string;
    signUp: string;
    socialLogin: string;
  };
  signUp: {
    title: string;
    subtitle: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeTerms: string;
    submit: string;
    signIn: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    email: string;
    submit: string;
    backToSignIn: string;
  };
  resetPassword: {
    title: string;
    subtitle: string;
    password: string;
    confirmPassword: string;
    submit: string;
  };
  profile: {
    title: string;
    personalInfo: string;
    preferences: string;
    security: string;
    notifications: string;
    language: string;
    timezone: string;
    theme: string;
  };
}

// Form translations interface
export interface FormTranslations {
  validation: {
    required: string;
    email: string;
    password: string;
    confirmPassword: string;
    minLength: string;
    maxLength: string;
    number: string;
    url: string;
    date: string;
    fileSize: string;
    fileType: string;
  };
  placeholders: {
    search: string;
    email: string;
    password: string;
    name: string;
    description: string;
    url: string;
    phone: string;
    address: string;
  };
  help: {
    password: string;
    email: string;
    phone: string;
    required: string;
    optional: string;
  };
}

// Error translations interface
export interface ErrorTranslations {
  general: {
    title: string;
    subtitle: string;
    retry: string;
    contact: string;
  };
  api: {
    network: string;
    server: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
    timeout: string;
    rateLimited: string;
  };
  form: {
    validation: string;
    submission: string;
    upload: string;
    processing: string;
  };
  auth: {
    login: string;
    logout: string;
    session: string;
    permissions: string;
  };
  database: {
    connection: string;
    query: string;
    transaction: string;
    migration: string;
  };
  file: {
    upload: string;
    processing: string;
    size: string;
    type: string;
    corrupt: string;
  };
}

// Success translations interface
export interface SuccessTranslations {
  general: {
    saved: string;
    created: string;
    updated: string;
    deleted: string;
    completed: string;
    sent: string;
    uploaded: string;
    processed: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    logout: string;
    passwordReset: string;
    emailVerified: string;
  };
  chatbot: {
    created: string;
    updated: string;
    deployed: string;
    trained: string;
    deleted: string;
  };
  document: {
    uploaded: string;
    processed: string;
    indexed: string;
    deleted: string;
  };
  product: {
    created: string;
    updated: string;
    deleted: string;
    assigned: string;
  };
}

// Navigation translations interface
export interface NavigationTranslations {
  main: {
    dashboard: string;
    chatbots: string;
    products: string;
    documents: string;
    analytics: string;
    settings: string;
    admin: string;
  };
  sub: {
    overview: string;
    create: string;
    manage: string;
    deploy: string;
    train: string;
    test: string;
    monitor: string;
    reports: string;
    users: string;
    permissions: string;
    integrations: string;
    billing: string;
    logs: string;
  };
  breadcrumb: {
    home: string;
    dashboard: string;
    chatbots: string;
    products: string;
    documents: string;
    settings: string;
  };
}

// Admin translations interface
export interface AdminTranslations {
  title: string;
  users: {
    title: string;
    list: string;
    create: string;
    edit: string;
    delete: string;
    permissions: string;
    status: string;
  };
  system: {
    title: string;
    health: string;
    logs: string;
    monitoring: string;
    backup: string;
    maintenance: string;
  };
  settings: {
    general: string;
    security: string;
    integrations: string;
    notifications: string;
    billing: string;
    advanced: string;
  };
}

// Analytics translations interface
export interface AnalyticsTranslations {
  title: string;
  overview: {
    title: string;
    period: string;
    users: string;
    sessions: string;
    messages: string;
    satisfaction: string;
  };
  performance: {
    title: string;
    responseTime: string;
    accuracy: string;
    uptime: string;
    errors: string;
  };
  usage: {
    title: string;
    popular: string;
    trends: string;
    patterns: string;
    geography: string;
  };
  costs: {
    title: string;
    breakdown: string;
    trends: string;
    optimization: string;
    budget: string;
  };
}

// Settings translations interface
export interface SettingsTranslations {
  title: string;
  general: {
    title: string;
    language: string;
    timezone: string;
    currency: string;
    theme: string;
    notifications: string;
  };
  account: {
    title: string;
    profile: string;
    security: string;
    billing: string;
    subscription: string;
  };
  system: {
    title: string;
    performance: string;
    backup: string;
    maintenance: string;
    monitoring: string;
  };
  integrations: {
    title: string;
    available: string;
    active: string;
    configure: string;
    disconnect: string;
  };
}

// Extend i18next module for type safety
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: TranslationResources;
  }
}