import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { isApiError } from '@/api/errors'
import { usersApi } from '@/api/users'
import { roleLabel } from '@/auth/roles'
import { updateSessionUser, useSession } from '@/auth/session'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { applyServerErrors, fieldA11y } from '@/lib/forms'

// Mirrors the backend UpdateProfile / ChangePassword validators (kickoff §12).
const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100),
})
type ProfileValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/\d/, 'Include a digit.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Must be different from your current password.',
  })
  .refine((v) => v.confirmPassword === v.newPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  })
type PasswordValues = z.infer<typeof passwordSchema>

function ProfileCard() {
  const user = useSession((s) => s.user)!
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName },
  })
  const errors = form.formState.errors

  const save = useMutation({
    mutationFn: (values: ProfileValues) => usersApi.updateProfile(values),
    meta: { skipGlobalErrorToast: true },
    onSuccess: (profile) => {
      updateSessionUser({ firstName: profile.firstName, lastName: profile.lastName })
      form.reset({ firstName: profile.firstName, lastName: profile.lastName })
      toast.success('Profile updated.')
    },
    onError: (error) => setFormError(applyServerErrors(error, form.setError, ['firstName', 'lastName'])),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {user.email} <Badge variant="secondary">{roleLabel(user.role)}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null)
            save.mutate(values)
          })}
        >
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="profile-first" label="First name" error={errors.firstName?.message}>
              <Input
                autoComplete="given-name"
                {...fieldA11y('profile-first', errors.firstName?.message)}
                {...form.register('firstName')}
              />
            </FormField>
            <FormField id="profile-last" label="Last name" error={errors.lastName?.message}>
              <Input
                autoComplete="family-name"
                {...fieldA11y('profile-last', errors.lastName?.message)}
                {...form.register('lastName')}
              />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Your email is your sign-in and can't be changed here.
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
              {save.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordCard() {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const errors = form.formState.errors

  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) =>
      usersApi.changePassword({ currentPassword, newPassword }),
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      form.reset()
      toast.success('Password changed.')
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 401) {
        form.setError('currentPassword', { type: 'server', message: 'Your current password is incorrect.' })
        return setFormError(null)
      }
      setFormError(applyServerErrors(error, form.setError, ['currentPassword', 'newPassword']))
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Use at least 8 characters with an uppercase letter, a lowercase letter and a digit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null)
            change.mutate(values)
          })}
        >
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <FormField id="pw-current" label="Current password" error={errors.currentPassword?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldA11y('pw-current', errors.currentPassword?.message)}
              {...form.register('currentPassword')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="pw-new" label="New password" error={errors.newPassword?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                {...fieldA11y('pw-new', errors.newPassword?.message)}
                {...form.register('newPassword')}
              />
            </FormField>
            <FormField id="pw-confirm" label="Confirm new password" error={errors.confirmPassword?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                {...fieldA11y('pw-confirm', errors.confirmPassword?.message)}
                {...form.register('confirmPassword')}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Account</h1>
      <ProfileCard />
      <PasswordCard />
    </div>
  )
}
