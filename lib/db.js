import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
export const sql = neon(process.env.DATABASE_URL);
let schemaPromise;
export function ensureSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS academy_registrations (
      id UUID PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      location TEXT NOT NULL,
      courses JSONB NOT NULL,
      tuition_total INTEGER NOT NULL,
      amount_paid INTEGER NOT NULL DEFAULT 0,
      payment_plan TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      registration_status TEXT NOT NULL DEFAULT 'pending_payment',
      experience TEXT,
      laptop_access TEXT,
      goals TEXT,
      referral_source TEXT,
      other_course TEXT,
      cohort_start_date DATE,
      balance_due_date DATE,
      admin_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS academy_payments (
      id UUID PRIMARY KEY,
      registration_id UUID NOT NULL REFERENCES academy_registrations(id) ON DELETE CASCADE,
      reference TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      payment_kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS academy_certificates (
      id UUID PRIMARY KEY,
      certificate_code TEXT NOT NULL UNIQUE,
      registration_id UUID NOT NULL REFERENCES academy_registrations(id),
      student_name TEXT NOT NULL,
      course_name TEXT NOT NULL,
      completion_date DATE NOT NULL,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      issued_by TEXT NOT NULL DEFAULT 'Jumi Tech Academy'
    )`;
    await sql`CREATE INDEX IF NOT EXISTS academy_reg_email_idx ON academy_registrations (LOWER(email))`;
    await sql`CREATE INDEX IF NOT EXISTS academy_reg_created_idx ON academy_registrations (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS academy_payments_reg_idx ON academy_payments (registration_id)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS academy_certificates_registration_course_unique ON academy_certificates (registration_id, course_name)`;
  })();
  return schemaPromise;
}
export const COURSES = {
  'Frontend Development': { fee: 30000, schedule: 'Monday, Wednesday & Friday · 5–7 PM WAT', duration: '3 months' },
  'Backend Development': { fee: 30000, schedule: 'Monday, Wednesday & Friday · 8–10 PM WAT', duration: '3 months' },
  'Python Programming': { fee: 30000, schedule: 'Tuesday, Thursday & Saturday · 5–7 PM WAT', duration: '3 months' },
  'Ethical Hacking': { fee: 40000, schedule: 'Tuesday, Thursday & Saturday · 8–10 PM WAT', duration: '3 months' }
};
export function naira(koboOrNaira) { return `₦${Number(koboOrNaira).toLocaleString('en-NG')}`; }
export function json(res, status, data) { res.status(status).setHeader('Content-Type','application/json; charset=utf-8').send(JSON.stringify(data)); }
export function method(req, res, allowed) {
  if (!allowed.includes(req.method)) { res.setHeader('Allow', allowed.join(', ')); json(res,405,{message:'Method not allowed.'}); return false; }
  return true;
}
export function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}
