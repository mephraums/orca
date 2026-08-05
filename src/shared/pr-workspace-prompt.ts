// Why: launching a workspace from a PR/MR used to prefill the bare review URL,
// which every user then had to edit into an actual instruction. The prefill is
// now a template so each project can state how it wants reviews kicked off.

export const DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE = '/review {{pr_number}}'

const PR_NUMBER_TOKEN_PATTERN = /\{\{pr_number\}\}/g
const ARTIFACT_URL_TOKEN_PATTERN = /\{\{artifact_url\}\}/g
const PR_TITLE_TOKEN_PATTERN = /\{\{pr_title\}\}/g
const PR_NUMBER_TOKEN = '{{pr_number}}'

export type PrWorkspacePromptTokenInfo = {
  token: string
  description: string
  example: string
}

export const PR_WORKSPACE_PROMPT_TOKENS: PrWorkspacePromptTokenInfo[] = [
  {
    token: '{{pr_number}}',
    description: 'The pull request or merge request number.',
    example: '7835'
  },
  {
    token: '{{artifact_url}}',
    description: 'The full review URL.',
    example: 'https://github.com/acme/orca/pull/7835'
  },
  {
    token: '{{pr_title}}',
    description: 'The review title. Empty when the title has not loaded yet.',
    example: 'Show setup-needed hosts in workspace run picker'
  }
]

/** Work-item kinds that take the review prompt. `mr` keeps GitLab on the same path. */
function isReviewWorkItemType(type: string | null | undefined): boolean {
  return type === 'pr' || type === 'mr'
}

/**
 * Pick the effective template. A blank repo override inherits the global value,
 * matching the issue-command convention where clearing a field means "inherit".
 * A blank global template opts out entirely and restores the bare-URL prefill.
 */
export function resolvePrWorkspacePromptTemplate(args: {
  globalTemplate?: string | null
  repoTemplate?: string | null
}): string {
  const repoTemplate = args.repoTemplate?.trim()
  if (repoTemplate) {
    return repoTemplate
  }
  // Why: an absent global key is a profile that predates this setting, so it
  // gets the default; an explicitly emptied one is a deliberate opt-out.
  if (args.globalTemplate === undefined || args.globalTemplate === null) {
    return DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE
  }
  return args.globalTemplate.trim()
}

export function renderPrWorkspacePromptTemplate(
  template: string,
  vars: {
    prNumber: number | null
    artifactUrl: string
    prTitle?: string | null
  }
): string {
  return template
    .replace(PR_NUMBER_TOKEN_PATTERN, vars.prNumber === null ? '' : String(vars.prNumber))
    .replace(ARTIFACT_URL_TOKEN_PATTERN, vars.artifactUrl)
    .replace(PR_TITLE_TOKEN_PATTERN, vars.prTitle?.trim() ?? '')
    .trim()
}

/**
 * Build the prefilled review prompt, or `null` when the caller should keep its
 * existing behavior (non-review item, opted-out template, or a template whose
 * required number is missing).
 */
export function buildPrWorkspacePrompt(args: {
  template: string
  type?: string | null
  number?: number | null
  url: string
  title?: string | null
}): string | null {
  const template = args.template.trim()
  if (!template || !isReviewWorkItemType(args.type)) {
    return null
  }
  const prNumber = typeof args.number === 'number' && args.number > 0 ? args.number : null
  // Why: rendering `/review ` with an empty number is worse than the URL we replaced.
  if (prNumber === null && template.includes(PR_NUMBER_TOKEN)) {
    return null
  }
  const url = args.url.trim()
  if (!url) {
    return null
  }
  return (
    renderPrWorkspacePromptTemplate(template, {
      prNumber,
      artifactUrl: url,
      prTitle: args.title
    }) || null
  )
}
