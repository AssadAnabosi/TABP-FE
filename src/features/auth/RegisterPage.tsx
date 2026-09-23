import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { isApiError } from '@/api/errors'
import { safeReturnTo } from '@/auth/returnTo'
import { register } from '@/auth/session'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { applyServerErrors, fieldA11y } from '@/lib/forms'

// Mirrors the backend RegisterCommand validator (kickoff §12).
const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100),
  email: z.email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'At least 8 characters.')
    .regex(/[A-Z]/, 'Include an uppercase letter.')
    .regex(/[a-z]/, 'Include a lowercase letter.')
    .regex(/\d/, 'Include a digit.'),
})
type Values = z.infer<typeof schema>
const FIELDS = ['firstName', 'lastName', 'email', 'password'] as const

export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: Values) {
    setFormError(null)
    try {
      await register(values)
      navigate(safeReturnTo(params.get('returnTo')), { replace: true })
    } catch (error) {
      if (isApiError(error) && error.status === 429)
        setFormError('Too many attempts. Please wait a minute and try again.')
      else setFormError(applyServerErrors(error, form.setError, FIELDS))
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Book stays and keep track of your trips.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="firstName" label="First name" error={errors.firstName?.message}>
                <Input
                  autoComplete="given-name"
                  {...fieldA11y('firstName', errors.firstName?.message)}
                  {...form.register('firstName')}
                />
              </FormField>
              <FormField id="lastName" label="Last name" error={errors.lastName?.message}>
                <Input
                  autoComplete="family-name"
                  {...fieldA11y('lastName', errors.lastName?.message)}
                  {...form.register('lastName')}
                />
              </FormField>
            </div>
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                type="email"
                autoComplete="email"
                {...fieldA11y('email', errors.email?.message)}
                {...form.register('email')}
              />
            </FormField>
            <FormField
              id="password"
              label="Password"
              error={errors.password?.message}
              hint="At least 8 characters with an uppercase letter, a lowercase letter and a digit."
            >
              <Input
                type="password"
                autoComplete="new-password"
                {...fieldA11y('password', errors.password?.message)}
                {...form.register('password')}
              />
            </FormField>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to={`/login${params.toString() ? `?${params}` : ''}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
