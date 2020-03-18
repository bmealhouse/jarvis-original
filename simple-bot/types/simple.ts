export namespace Simple {
  interface Amounts {
    amount: number
    cleared: number
    fees: number
    cashback: number
    tip?: number
    base: number
  }

  type ArrowayType = 'SHARED_ACCOUNT_TRANSFER'

  interface AssociatedGoalInfo {
    is_actually_associated: boolean
    name: string
    reference: string
    association_type: AssociationType
    color: Color
    error_message?: string
  }

  type AssociationType = 'AUTOMATIC' | 'FAILED_AUTOMATIC_NSF' | 'MANUAL'

  interface Attachment {
    original: string
    thumbnail: string
    preview: string
    type: string
    modified: number
  }

  interface Badge {
    value: string
    text: string
    abbr: string
    color: Color | null
  }

  interface Balances {
    total: number
    safe_to_spend: number
    bills: number
    deposits: number
    pending: number
    goals: number
    expenses: number
    available: number
    protected: number
    protected_incoming: number
    overspent: number
  }

  type BookkeepingType = 'credit' | 'debit'

  export enum Category {
    // Business
    // BusinessClothing = 'Business Clothing',
    // BusinessServices = 'Business Services',
    // BusinessSupplies = 'Business Supplies',
    // Meals = 'Meals',
    // Travel = 'Travel',

    // Children
    // Activities = 'Activities',
    // Allowance = 'Allowance',
    // BabySupplies = 'Baby Supplies',
    Childcare = 'Childcare',
    // KidsClothing = 'Kids Clothing',
    // KidsEducation = 'Kids Education',
    // Toys = 'Toys',

    // Culture
    // Art = 'Art',
    // Books = 'Books',
    // Dance = 'Dance',
    Games = 'Games',
    // Movies = 'Movies',
    // Music = 'Music',
    // News = 'News',
    RandomFun = 'Random Fun',
    TV = 'TV',

    // Education
    // BooksAndSupplies = 'Books & Supplies',
    // RoomAndBoard = 'Room & Board',
    // StudentLoans = 'Student Loans',
    // TuitionAndFees = 'Tuition & Fees',

    // Fees
    // AtmFees = 'ATM Fees',
    // InvestmentFees = 'Investment Fees',
    // OtherFees = 'Other Fees',

    // Financial
    // Accounting = 'Accounting',
    // FinancialAdvice = 'Financial Advice',
    LifeInsurance = 'Life Insurance',
    // Loan = 'Loan',
    // LoanPayment = 'Loan Payment',
    MoneyTransfers = 'Money Transfers',
    // OtherFinancial = 'Other Financial',
    TaxPreparation = 'Tax Preparation',
    TaxesFedral = 'Taxes, Fedral',
    // TaxesOther = 'Taxes, Other',
    TaxesState = 'Taxes, State',
    // CreditCardPayment = 'Credit Card Payment',

    // Sports & Fitness
    // Camping = 'Camping',
    // FitnessGear = 'Fitness Gear',
    // Golf = 'Golf',
    // Memberships = 'Memberships',
    // OtherSportsAndFitness = 'Other Sports & Fitness',
    // SportingEvents = 'Sporting Events',
    // SportingGoods = 'Sporting Goods',

    // Food & Drink
    // AlcoholAndBars = 'Alcohol & Bars',
    CoffeeAndTea = 'Coffee & Tea',
    // Dessert = 'Dessert',
    FastFood = 'Fast Food',
    // Groceries = 'Groceries',
    // OtherFoodAndDrink = 'Other Food & Drink',
    Restaurants = 'Restaurants',
    // Snacks = 'Snacks',
    // Tobacco = 'Tobacco',

    // Gifts & Donations
    // Charities = 'Charities',
    Gifts = 'Gifts',

    // Health & Medical
    // CareFacilities = 'Care Facilities',
    // Dentist = 'Dentist',
    Doctor = 'Doctor',
    // Equipment = 'Equipment',
    // Eyes = 'Eyes',
    // HealthInsurance = 'Health Insurance',
    // OtherHealthAndMedical = 'Other Health & Medical',
    Pharmacies = 'Pharmacies',
    // Prescriptions = 'Prescriptions',

    // Home
    // Furnishings = 'Furnishings',
    // HomeInsurance = 'Home Insurance',
    // HomePurchase = 'Home Purchase',
    // HomeServices = 'Home Services',
    HomeSupplies = 'Home Supplies',
    // RepairsAndImprovement = 'Repairs & Improvement',
    LawnAndGarden = 'Lawn & Garden',
    Mortgage = 'Mortgage',
    // Moving = 'Moving',
    // OtherHome = 'Other Home',
    // PropertyTax = 'Property Tax',
    // Rent = 'Rent',
    // RentersInsurance = "Renter's Insurance",
    // Storage = 'Storage',

    // Income
    // Bonus = 'Bonus',
    // Commission = 'Commission',
    Interest = 'Interest',
    // OtherIncome = 'Other Income',
    Paycheck = 'Paycheck',
    Reimbursement = 'Reimbursement',
    // RentalIncome = 'Rental Income',

    // Investment
    // EducationInvestment = 'Education Investment',
    // OtherInvestments = 'Other Investments',
    // Retirement = 'Retirement',
    // StocksAndMutualFunds = 'Stocks & Mutual Funds',

    // Legal
    // LegalFees = 'Legal Fees',
    // LegalServices = 'Legal Services',
    // OtherLegalCosts = 'Other Legal Costs',

    // Office
    // Equipment = 'Equipment',
    PostageAndShipping = 'Postage & Shipping',
    // OfficeSupplies = 'Office Supplies',
    // OtherOffice = 'Other Office',

    // Personal
    // Accessories = 'Accessories',
    // Beauty = 'Beauty',
    // BodyEnhancement = 'Body Enhancement',
    // Clothing = 'Clothing',
    Counseling = 'Counseling',
    Hair = 'Hair',
    Hobbies = 'Hobbies',
    // Jewelry = 'Jewelry',
    // Laundry = 'Laundry',
    // OtherPersonal = 'Other Personal',
    Religion = 'Religion',
    // Shoes = 'Shoes',
    // SpaAndMassage = 'Spa & Massage'

    // Pets
    // PetFood = 'Pet Food',
    PetGrooming = 'Pet Grooming',
    // PetMedicine = 'Pet Medicine',
    PetSupplies = 'Pet Supplies',
    // Veterinarian = 'Veterinarian',

    // Technology
    // DomainsAndHosting = 'Domains & Hosting',
    Hardware = 'Hardware',
    OnlineServices = 'Online Services',
    // Software = 'Software',

    // Transportation
    AutoInsurance = 'Auto Insurance',
    AutoPayment = 'Auto Payment',
    // AutoServices = 'Auto Services',
    // AutoSupplies = 'Auto Supplies',
    // Bicycle = 'Bicycle',
    BoatAndMarine = 'Boats & Marine',
    Gas = 'Gas',
    OtherTransportation = 'Other Transportation',
    ParkingTickets = 'Parking Tickets',
    ParkingAndTolls = 'Parking & Tolls',
    // PublicTransit = 'Public Transit',
    // Shipping = 'Shipping',
    // Taxis = 'Taxis',

    // Travel
    // CarRentals = 'Car Rentals',
    Flights = 'Flights',
    // Hotels = 'Hotels',
    // ToursAndCruises = 'Tours & Cruises',
    // Train = 'Train',
    // TravelBuses = 'Travel Buses',
    // TravelDining = 'Travel Dining',
    // TravelEntertainment = 'Travel Entertainment',

    // Uncategorized
    Cash = 'Cash',
    // OtherShopping = 'Other Shopping',
    // Unknown = 'Unknown',

    // Utilities
    // Cable = 'Cable',
    Electricity = 'Electricity',
    GasAndFuel = 'Gas & Fuel',
    Internet = 'Internet',
    // OtherUtilities = 'Other Utilities',
    Phone = 'Phone',
    Trash = 'Trash',
    // WaterAndSewer = 'Water & Sewer',
  }

  interface CategoryInfo {
    uuid: string
    name: string
    folder: string
    folder_id: number
    emoji: string
  }

  interface Color {
    r: number
    g: number
    b: number
    a: number
  }

  interface Geo {
    street?: string
    city: string
    state?: string
    country?: string
    zip: string
    lat?: number
    lon?: number
    timezone?: string
  }

  type RecordType = 'JOURNALENTRY' | 'HOLD'

  interface Times {
    when_recorded: number
    when_recorded_local: string
    when_received: number
    last_modified: number
    last_txvia: number
  }

  export interface Transaction {
    uuid: string
    user_id: string
    record_type: RecordType
    transaction_type: TransactionType
    bookkeeping_type: BookkeepingType
    is_hold: boolean
    is_active: true
    running_balance: number
    raw_description: string
    description: string
    memo?: string
    categories: CategoryInfo[]
    geo?: Geo
    times: Times
    amounts: Amounts
    goal_id?: string
    correlation_id: string
    arroway_id?: {
      type: ArrowayType
      id: string
    }
    account_id: string
    initiated_by?: string
    partner: string
    attachments: Attachment[]
    badges: Badge[]
    is_engram_eligible: boolean
    associated_goal_info?: AssociatedGoalInfo
    balances?: Balances
    indisputable_reason?: string
  }

  type TransactionType =
    | 'ach'
    | 'argo_debit_reversal'
    | 'atm_withdrawal'
    | 'bill_payment'
    | 'check_deposit'
    | 'check_order_charge'
    | 'check_purchase'
    | 'deposit'
    | 'fee'
    | 'force_paid'
    | 'interest_credit'
    | 'pin_purchase'
    | 'protected_goal_account_transfer'
    | 'refund'
    | 'shared_transfer'
    | 'signature_credit'
    | 'signature_purchase'
    | 'wire_transfer'
}
