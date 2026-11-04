import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { env } from './env'
import { emailOTP } from 'better-auth/plugins/email-otp'
import nodemailer from 'nodemailer'
import { and, eq, sql } from 'drizzle-orm'
import { verification } from '../db/schema'

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: 587,
  secure: false,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
})

// Keep one reference when Better Auth copies/merges endpoint contexts.
class OtpDelivery {
  failed = false
  verificationId?: string
  verificationIdentifier?: string
}
type DeliveryContext = { epicsOtpDelivery?: OtpDelivery }

export const auth = betterAuth({
  databaseHooks: {
    verification: {
      create: {
        before: async (record, ctx) => {
          const delivery = (ctx?.context as DeliveryContext | undefined)?.epicsOtpDelivery
          if (delivery) {
            delivery.verificationId = crypto.randomUUID()
            delivery.verificationIdentifier = record.identifier
            return { data: { ...record, id: delivery.verificationId } }
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/email-otp/send-verification-otp' || ctx.body?.type !== 'sign-in') return
      // A fresh object in Better Auth's per-endpoint context, never shared
      // between requests. Also works with direct auth.api calls.
      const context = ctx.context as DeliveryContext
      context.epicsOtpDelivery = new OtpDelivery()
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Sign-in permits new accounts and sends mail for both new and existing
      // addresses. Keep the other OTP endpoints' enumeration-safe semantics.
      if (ctx.path === '/email-otp/send-verification-otp' && ctx.body?.type === 'sign-in' &&
          (ctx.context as DeliveryContext).epicsOtpDelivery?.failed) {
        throw new APIError('SERVICE_UNAVAILABLE', {
          code: 'OTP_DELIVERY_UNAVAILABLE',
          message: 'Unable to send sign-in email. Please try again.',
        })
      }
    }),
  },
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  plugins: [
    emailOTP({
      disableSignUp: false,
      async sendVerificationOTP({ email, otp }, ctx) {
        const delivery = (ctx?.context as DeliveryContext | undefined)?.epicsOtpDelivery
        try {
          const result = await transporter.sendMail({
            from: env.EMAIL_FROM,
            to: email,
            subject: 'Your EPICS Alumni Tracker sign-in code',
            html: `Your OTP is: ${otp}`,
          })
          if (!result.accepted.length) throw new Error('Recipient not accepted')
          if (delivery?.verificationId && delivery.verificationIdentifier) {
            // Better Auth's default rotate strategy can leave multiple rows.
            // SQLite timestamps have second precision, so ordering by createdAt
            // alone may select an older code on an immediate resend. Retire
            // only older rows after SMTP acceptance; never delete a newer
            // concurrent request's code. This is one atomic SQLite statement.
            db.delete(verification).where(and(
              eq(verification.identifier, delivery.verificationIdentifier),
              sql`rowid < (SELECT rowid FROM ${verification} WHERE ${verification.id} = ${delivery.verificationId})`,
            )).run()
          }
        } catch {
          // 1.6.23 swallows rejected delivery promises. Report the failure
          // through the supported after hook instead. Do not use background
          // delivery: the endpoint must await SMTP before it can report status.
          if (delivery) {
            delivery.failed = true
            // Remove only this request's undelivered code. Deleting by email
            // would invalidate another simultaneous, successful request.
            if (delivery.verificationId) db.delete(verification).where(eq(verification.id, delivery.verificationId)).run()
          }
          else throw new Error('Unable to send sign-in email')
        }
      },
    }),
  ],
})
