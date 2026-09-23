import { CreditCard } from 'lucide-react'
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'

import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fieldA11y } from '@/lib/forms'

import { formatCardNumber, formatExpiry, TEST_CARD, type CardInput } from './payment'

interface PaymentFieldsProps {
  register: UseFormRegister<CardInput>
  setValue: UseFormSetValue<CardInput>
  errors: FieldErrors<CardInput>
}

/** Card inputs. Clearly labelled as a demo: no real charge, and card data never leaves the browser. */
export function PaymentFields({ register, setValue, errors }: PaymentFieldsProps) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Demo payment: no real charge is made and your card details never leave this browser.{' '}
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto p-0 text-xs"
            onClick={() => {
              for (const [key, value] of Object.entries(TEST_CARD))
                setValue(key as keyof CardInput, value, { shouldValidate: true })
            }}
          >
            Use a test card
          </Button>
        </span>
      </div>
      <FormField id="cardNumber" label="Card number" error={errors.cardNumber?.message}>
        <Input
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          {...fieldA11y('cardNumber', errors.cardNumber?.message)}
          {...register('cardNumber', {
            onChange: (e) => setValue('cardNumber', formatCardNumber(e.target.value)),
          })}
        />
      </FormField>
      <FormField id="nameOnCard" label="Name on card" error={errors.nameOnCard?.message}>
        <Input
          autoComplete="cc-name"
          {...fieldA11y('nameOnCard', errors.nameOnCard?.message)}
          {...register('nameOnCard')}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="expiry" label="Expiry (MM/YY)" error={errors.expiry?.message}>
          <Input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            {...fieldA11y('expiry', errors.expiry?.message)}
            {...register('expiry', { onChange: (e) => setValue('expiry', formatExpiry(e.target.value)) })}
          />
        </FormField>
        <FormField id="cvc" label="CVC" error={errors.cvc?.message}>
          <Input
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            {...fieldA11y('cvc', errors.cvc?.message)}
            {...register('cvc')}
          />
        </FormField>
      </div>
    </div>
  )
}
