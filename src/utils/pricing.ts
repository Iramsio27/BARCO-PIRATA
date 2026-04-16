import { PACKAGES, DISCOUNT_MIN_PEOPLE, DISCOUNT_RATE } from '@constants/index'
import type { PackageId } from '@constants/index'

export interface PricingResult {
  subtotal: number
  discount: number
  total: number
  pricePerPerson: number
  hasGroupDiscount: boolean
}

export const calculatePrice = (
  packageId: PackageId,
  numberOfPeople: number
): PricingResult => {
  const pkg = PACKAGES[packageId]
  const pricePerPerson = pkg.pricePerPerson
  const subtotal = pricePerPerson * numberOfPeople
  const hasGroupDiscount = numberOfPeople >= DISCOUNT_MIN_PEOPLE
  const discount = hasGroupDiscount ? subtotal * DISCOUNT_RATE : 0
  const total = subtotal - discount

  return { subtotal, discount, total, pricePerPerson, hasGroupDiscount }
}
