import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE,
  buildPrWorkspacePrompt,
  renderPrWorkspacePromptTemplate,
  resolvePrWorkspacePromptTemplate
} from './pr-workspace-prompt'

const PR_URL = 'https://github.com/acme/orca/pull/7835'

describe('resolvePrWorkspacePromptTemplate', () => {
  it('uses the built-in default when nothing is configured', () => {
    expect(resolvePrWorkspacePromptTemplate({})).toBe(DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE)
  })

  it('prefers the repo override over the global template', () => {
    expect(
      resolvePrWorkspacePromptTemplate({
        globalTemplate: '/review {{pr_number}}',
        repoTemplate: '/auto-review {{pr_number}}'
      })
    ).toBe('/auto-review {{pr_number}}')
  })

  it('treats a blank repo override as inherit', () => {
    expect(
      resolvePrWorkspacePromptTemplate({
        globalTemplate: '/review {{pr_number}}',
        repoTemplate: '  '
      })
    ).toBe('/review {{pr_number}}')
  })

  it('treats an explicitly blank global template as opt-out', () => {
    expect(resolvePrWorkspacePromptTemplate({ globalTemplate: '' })).toBe('')
  })
})

describe('renderPrWorkspacePromptTemplate', () => {
  it('substitutes every token', () => {
    expect(
      renderPrWorkspacePromptTemplate('{{pr_number}} | {{artifact_url}} | {{pr_title}}', {
        prNumber: 7835,
        artifactUrl: PR_URL,
        prTitle: 'Add run picker'
      })
    ).toBe(`7835 | ${PR_URL} | Add run picker`)
  })

  it('renders a missing title as empty', () => {
    expect(
      renderPrWorkspacePromptTemplate('/review {{pr_number}} {{pr_title}}', {
        prNumber: 7835,
        artifactUrl: PR_URL
      })
    ).toBe('/review 7835')
  })
})

describe('buildPrWorkspacePrompt', () => {
  it('builds the default review prompt for a pull request', () => {
    expect(
      buildPrWorkspacePrompt({
        template: DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE,
        type: 'pr',
        number: 7835,
        url: PR_URL
      })
    ).toBe('/review 7835')
  })

  it('applies to GitLab merge requests too', () => {
    expect(
      buildPrWorkspacePrompt({
        template: DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE,
        type: 'mr',
        number: 42,
        url: 'https://gitlab.com/acme/orca/-/merge_requests/42'
      })
    ).toBe('/review 42')
  })

  it('returns null for issues so they keep the URL prefill', () => {
    expect(
      buildPrWorkspacePrompt({
        template: DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE,
        type: 'issue',
        number: 42,
        url: 'https://github.com/acme/orca/issues/42'
      })
    ).toBeNull()
  })

  it('returns null when the template is opted out', () => {
    expect(
      buildPrWorkspacePrompt({
        template: '',
        type: 'pr',
        number: 7835,
        url: PR_URL
      })
    ).toBeNull()
  })

  it('returns null when the number is missing but the template needs it', () => {
    expect(
      buildPrWorkspacePrompt({
        template: DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE,
        type: 'pr',
        number: null,
        url: PR_URL
      })
    ).toBeNull()
  })

  it('still renders a number-free template when the number is missing', () => {
    expect(
      buildPrWorkspacePrompt({
        template: '/review {{artifact_url}}',
        type: 'pr',
        number: null,
        url: PR_URL
      })
    ).toBe(`/review ${PR_URL}`)
  })
})
