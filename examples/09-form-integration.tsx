/**
 * Form integration — controlled field inside a submit form.
 *
 * VectorAutocomplete calls `onChange` with the selected string (or null when
 * cleared). Store the value in local state and include it in your form
 * submission as you would any other controlled input.
 *
 * Shown here with plain React state and with React Hook Form.
 */

import { useState } from 'react'
import VectorAutocomplete from 'vector-autocomplete'

// ─── Plain React state ─────────────────────────────────────────────────────

const JOB_TITLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full-stack Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Product Manager',
  'UX Designer',
  'Engineering Manager',
  'Principal Engineer',
  'Staff Engineer',
]

export function PlainFormExample() {
  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobTitle) return
    setSubmitted(true)
    console.log('Submitted job title:', jobTitle)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '2rem auto' }}>
      <VectorAutocomplete
        options={JOB_TITLES}
        label="Job title"
        topK={5}
        onChange={setJobTitle}
      />
      <button
        type="submit"
        disabled={!jobTitle}
        style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}
      >
        Submit
      </button>
      {submitted && <p>Submitted: {jobTitle}</p>}
    </form>
  )
}

// ─── React Hook Form ───────────────────────────────────────────────────────
// npm install react-hook-form

import { useForm, Controller } from 'react-hook-form'

type FormValues = {
  jobTitle: string
  yearsOfExperience: number
}

export function ReactHookFormExample() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>()

  function onSubmit(data: FormValues) {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 400, margin: '2rem auto' }}>
      <Controller
        name="jobTitle"
        control={control}
        rules={{ required: 'Please select a job title' }}
        render={({ field }) => (
          <VectorAutocomplete
            options={JOB_TITLES}
            label="Job title *"
            topK={5}
            onChange={(value) => field.onChange(value ?? '')}
          />
        )}
      />
      {errors.jobTitle && (
        <p style={{ color: 'red', marginTop: 4 }}>{errors.jobTitle.message}</p>
      )}
      <button type="submit" style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}>
        Submit
      </button>
    </form>
  )
}
