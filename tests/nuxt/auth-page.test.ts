// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import AuthPage from '../../app/pages/auth.vue'

const mocks = vi.hoisted(() => ({ send: vi.fn(), signIn: vi.fn(), toast: vi.fn(), navigate: vi.fn(), request: vi.fn(async () => null) }))
mockNuxtImport('useToast', () => () => ({ add: mocks.toast }))
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useRequestFetch', () => () => mocks.request)
vi.mock('../../app/utils/auth-client', () => ({ authClient: { emailOtp: { sendVerificationOtp: mocks.send }, signIn: { emailOtp: mocks.signIn } } }))
let wrapper: VueWrapper
beforeEach(() => {
  mocks.send.mockReset().mockResolvedValue({ error: null })
  mocks.signIn.mockReset().mockResolvedValue({ error: null })
  mocks.toast.mockClear()
  mocks.navigate.mockClear()
})
afterEach(() => wrapper?.unmount())
async function mount() {
  wrapper = await mountSuspended(AuthPage, { route: '/auth' })
  await wrapper.get('input[type="email"]').setValue('owner@example.test')
}
async function submit() {
  wrapper.findComponent({ name: 'UForm' }).vm.$emit('submit')
  await flushPromises()
}
async function code(value = ['1', '2', '3', '4', '5', '6']) {
  wrapper.findComponent({ name: 'UPinInput' }).vm.$emit('update:modelValue', value)
  await flushPromises()
}
describe('existing OTP login UI', () => {
  it('sends an OTP, verifies it, and reloads the authenticated profile route', async () => {
    await mount()
    await submit()
    expect(mocks.send).toHaveBeenCalledWith({ email: 'owner@example.test', type: 'sign-in' })
    await code()
    await submit()
    expect(mocks.signIn).toHaveBeenCalledWith({ email: 'owner@example.test', otp: '123456' })
    expect(mocks.navigate).toHaveBeenCalledWith('/', { external: true })
  })
  it('retains the email and allows retry after network failure', async () => {
    await mount()
    mocks.send.mockRejectedValueOnce(new Error('Offline'))
    await submit()
    expect(wrapper.get('input[type="email"]').element).toHaveProperty('value', 'owner@example.test')
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Connection problem' }))
    await submit()
    expect(wrapper.text()).toContain('six-digit code')
  })
  it('does not navigate on a rejected code and permits retry', async () => {
    await mount()
    await submit()
    await code()
    mocks.signIn.mockResolvedValueOnce({ error: { message: 'Invalid code' } })
    await submit()
    expect(mocks.navigate).not.toHaveBeenCalledWith('/', { external: true })
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Invalid code', color: 'error' }))
    await submit()
    expect(mocks.navigate).toHaveBeenCalledWith('/', { external: true })
  })
  it('rejects incomplete codes before contacting authentication', async () => {
    await mount()
    await submit()
    await code(['1', '2'])
    await submit()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
  it('prevents duplicate sends while a request is pending', async () => {
    await mount()
    let resolve!: (value: { error: null }) => void
    mocks.send.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    await submit()
    await submit()
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(wrapper.get('input[type="email"]').attributes()).toHaveProperty('disabled')
    resolve({ error: null })
    await flushPromises()
  })
})


it('keeps the email step on delivery failure and allows a successful retry', async () => {
  await mount()
  mocks.send.mockResolvedValueOnce({ error: { code: 'OTP_DELIVERY_UNAVAILABLE', message: 'Unable to send sign-in email. Please try again.' } })
  await submit()
  expect(wrapper.find('input[type="email"]').exists()).toBe(true)
  expect(wrapper.findComponent({ name: 'UPinInput' }).exists()).toBe(false)
  expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unable to send code', description: 'Unable to send sign-in email. Please try again.', color: 'error' }))
  expect(mocks.navigate).not.toHaveBeenCalled()
  await submit()
  expect(wrapper.findComponent({ name: 'UPinInput' }).exists()).toBe(true)
})
