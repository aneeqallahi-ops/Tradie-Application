import { pgTable, serial, integer, varchar, text, boolean, decimal, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradieUsersTable = pgTable("tradie_users", {
  id: serial("id").primaryKey(),
  replitUserId: varchar("replit_user_id", { length: 255 }).unique().notNull(),
  businessName: varchar("business_name", { length: 255 }),
  abn: varchar("abn", { length: 20 }),
  gstRegistered: boolean("gst_registered").default(true),
  state: varchar("state", { length: 10 }).default("VIC"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  logoUrl: text("logo_url"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("85.00"),
  defaultMarkupPercent: decimal("default_markup_percent", { precision: 5, scale: 2 }).default("20.00"),
  profitFirstTaxPercent: decimal("profit_first_tax_percent", { precision: 5, scale: 2 }).default("15.00"),
  profitFirstExpensesPercent: decimal("profit_first_expenses_percent", { precision: 5, scale: 2 }).default("10.00"),
  tradeType: varchar("trade_type", { length: 50 }).default("other"),
  annualTurnoverBand: varchar("annual_turnover_band", { length: 30 }),
  onboardingComplete: boolean("onboarding_complete").default(false),
  vehicleMake: varchar("vehicle_make", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleOdometer: decimal("vehicle_odometer", { precision: 10, scale: 1 }),
  logbookStartDate: date("logbook_start_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTradieUserSchema = createInsertSchema(tradieUsersTable).omit({ id: true, createdAt: true });
export type InsertTradieUser = z.infer<typeof insertTradieUserSchema>;
export type TradieUser = typeof tradieUsersTable.$inferSelect;

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).default("residential"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  abn: varchar("abn", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  clientId: integer("client_id").references(() => clientsTable.id),
  quoteNumber: varchar("quote_number", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  state: varchar("state", { length: 10 }).notNull(),
  status: varchar("status", { length: 30 }).default("draft"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0"),
  depositPercent: decimal("deposit_percent", { precision: 5, scale: 2 }).default("0"),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  depositCompliant: boolean("deposit_compliant").default(true),
  travelKm: decimal("travel_km", { precision: 8, scale: 2 }).default("0"),
  travelCost: decimal("travel_cost", { precision: 10, scale: 2 }).default("0"),
  internalNotes: text("internal_notes"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  validUntil: date("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;

export const quoteLineItemsTable = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotesTable.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("1"),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).default("0"),
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2 }).default("20"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).default("0"),
  isInternal: boolean("is_internal").default(false),
  sortOrder: integer("sort_order").default(0),
});

export const insertQuoteLineItemSchema = createInsertSchema(quoteLineItemsTable).omit({ id: true });
export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;
export type QuoteLineItem = typeof quoteLineItemsTable.$inferSelect;

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  clientId: integer("client_id").references(() => clientsTable.id),
  quoteId: integer("quote_id").references(() => quotesTable.id),
  jobNumber: varchar("job_number", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  state: varchar("state", { length: 10 }),
  status: varchar("status", { length: 30 }).default("active"),
  scheduledDate: date("scheduled_date"),
  completedDate: date("completed_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0"),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  jobId: integer("job_id").references(() => jobsTable.id),
  clientId: integer("client_id").references(() => clientsTable.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  type: varchar("type", { length: 20 }).default("full"),
  status: varchar("status", { length: 20 }).default("unpaid"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0"),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  stripePaymentLink: text("stripe_payment_link"),
  viewedAt: timestamp("viewed_at"),
  sentAt: timestamp("sent_at"),
  reminder1SentAt: timestamp("reminder_1_sent_at"),
  reminder2SentAt: timestamp("reminder_2_sent_at"),
  sopaText: text("sopa_text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  jobId: integer("job_id").references(() => jobsTable.id),
  category: varchar("category", { length: 100 }).notNull(),
  vendor: varchar("vendor", { length: 255 }),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  gstClaimable: decimal("gst_claimable", { precision: 10, scale: 2 }).default("0"),
  isGstClaimable: boolean("is_gst_claimable").default(true),
  receiptUrl: text("receipt_url"),
  expenseDate: date("expense_date").notNull(),
  financialYear: varchar("financial_year", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;

export const vehicleTripsTable = pgTable("vehicle_trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  tripDate: date("trip_date").notNull(),
  startLocation: varchar("start_location", { length: 255 }),
  endLocation: varchar("end_location", { length: 255 }),
  distanceKm: decimal("distance_km", { precision: 8, scale: 2 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).default("job_site"),
  jobId: integer("job_id").references(() => jobsTable.id),
  isBusiness: boolean("is_business").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVehicleTripSchema = createInsertSchema(vehicleTripsTable).omit({ id: true, createdAt: true });
export type InsertVehicleTrip = z.infer<typeof insertVehicleTripSchema>;
export type VehicleTrip = typeof vehicleTripsTable.$inferSelect;

export const subcontractorsTable = pgTable("subcontractors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  abn: varchar("abn", { length: 20 }),
  address: text("address"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  totalPaidThisFy: decimal("total_paid_this_fy", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubcontractorSchema = createInsertSchema(subcontractorsTable).omit({ id: true, createdAt: true });
export type InsertSubcontractor = z.infer<typeof insertSubcontractorSchema>;
export type Subcontractor = typeof subcontractorsTable.$inferSelect;

export const subcontractorPaymentsTable = pgTable("subcontractor_payments", {
  id: serial("id").primaryKey(),
  subcontractorId: integer("subcontractor_id").references(() => subcontractorsTable.id),
  expenseId: integer("expense_id").references(() => expensesTable.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date"),
  financialYear: varchar("financial_year", { length: 10 }),
});

export const insertSubcontractorPaymentSchema = createInsertSchema(subcontractorPaymentsTable).omit({ id: true });
export type InsertSubcontractorPayment = z.infer<typeof insertSubcontractorPaymentSchema>;
export type SubcontractorPayment = typeof subcontractorPaymentsTable.$inferSelect;

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  type: varchar("type", { length: 50 }),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

export const advisoryRequestsTable = pgTable("advisory_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  currentIncome: decimal("current_income", { precision: 12, scale: 2 }),
  helpNeeded: text("help_needed"),
  urgency: varchar("urgency", { length: 30 }).default("normal"),
  status: varchar("status", { length: 30 }).default("pending"),
  sourceModule: varchar("source_module", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdvisoryRequestSchema = createInsertSchema(advisoryRequestsTable).omit({ id: true, createdAt: true });
export type InsertAdvisoryRequest = z.infer<typeof insertAdvisoryRequestSchema>;
export type AdvisoryRequest = typeof advisoryRequestsTable.$inferSelect;

export const taxAuditLogTable = pgTable("tax_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => tradieUsersTable.id),
  calculationType: varchar("calculation_type", { length: 100 }).notNull(),
  inputValues: text("input_values"),
  ruleApplied: varchar("rule_applied", { length: 255 }),
  result: text("result"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const insertTaxAuditLogSchema = createInsertSchema(taxAuditLogTable).omit({ id: true, calculatedAt: true });
export type InsertTaxAuditLog = z.infer<typeof insertTaxAuditLogSchema>;
export type TaxAuditLog = typeof taxAuditLogTable.$inferSelect;
