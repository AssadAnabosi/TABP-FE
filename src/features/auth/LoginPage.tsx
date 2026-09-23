import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { isApiError } from '@/api/errors'
import { safeReturnTo } from '@/auth/returnTo'
import { login } from '@/auth/session'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { applyServerErrors, fieldA11y } from '@/lib/forms'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})
type Values = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { label: 'Customer', email: 'customer@tabp.dev' },
  { label: 'Admin', email: 'admin@tabp.dev' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: Values) {
    setFormError(null)
    try {
      await login(values)
      navigate(returnTo, { replace: true })
    } catch (error) {
      if (isApiError(error) && error.status === 429)
        setFormError('Too many attempts. Please wait a minute and try again.')
      else if (isApiError(error) && error.status === 401)
        setFormError(error.detail ?? 'Invalid email or password.')
      else setFormError(applyServerErrors(error, form.setError, ['email', 'password']))
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Log in</CardTitle>
          <CardDescription>Welcome back. Log in to book and see your trips.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <FormField id="email" label="Username (email)" error={errors.email?.message}>
              <Input
                type="email"
                autoComplete="username"
                autoFocus
                {...fieldA11y('email', errors.email?.message)}
                {...form.register('email')}
              />
            </FormField>
            <FormField id="password" label="Password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  {...fieldA11y('password', errors.password?.message)}
                  {...form.register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </FormField>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link
              to={`/register${params.toString() ? `?${params}` : ''}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-6 grid gap-2 border-t pt-4">
              <p className="text-xs text-muted-foreground">Dev only: fill a seeded demo account</p>
              <div className="flex gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      form.setValue('email', account.email)
                      form.setValue('password', 'Password123!')
                    }}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
