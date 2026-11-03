export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const formatNumber = value => new Intl.NumberFormat('en').format(value);
export const formatDate = value => value ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : 'No pushes yet';
export const DEFAULT_FILTERS = Object.freeze({ query: '', language: '', sort: 'pushed' });
export const STAR_ICON = '<svg class="metric-icon star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>';
export const FORK_ICON = '<svg class="metric-icon fork-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6 6v3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V6M12 13v5"/></svg>';
export const countLabel = (count, noun) => ` ${noun}${count === 1 ? '' : 's'}`;
export function safeGitHubUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : 'https://github.com'; } catch { return 'https://github.com'; }
}
export function totals(repos) {
  return { repositories: repos.length, stars: repos.reduce((sum, repo) => sum + repo.stars, 0), forks: repos.reduce((sum, repo) => sum + repo.forks, 0) };
}
export function filterRepositories(repos, { query = DEFAULT_FILTERS.query, account = '', language = DEFAULT_FILTERS.language, sort = DEFAULT_FILTERS.sort } = {}) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return repos.filter(repo => {
    const text = `${repo.fullName} ${repo.description} ${repo.language || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    return words.every(word => text.includes(word)) && (!account || repo.owner.toLowerCase() === account.toLowerCase()) && (!language || (repo.language || 'Unspecified') === language);
  }).sort((a, b) => {
    if (sort === 'stars') return b.stars - a.stars || a.fullName.localeCompare(b.fullName);
    if (sort === 'name') return a.name.localeCompare(b.name) || a.owner.localeCompare(b.owner);
    return (b.pushedAt || '').localeCompare(a.pushedAt || '') || a.fullName.localeCompare(b.fullName);
  });
}
export function renderRepository(repo) {
  const e = escapeHtml;
  const metrics = `<span>${STAR_ICON}${formatNumber(repo.stars)}<span class="sr-only">${countLabel(repo.stars, 'star')}</span></span><span>${FORK_ICON}${formatNumber(repo.forks)}<span class="sr-only">${countLabel(repo.forks, 'fork')}</span></span>`;
  const badges = [repo.archived && '<span class="badge">Archived</span>', repo.fork && '<span class="badge">Fork</span>', repo.disabled && '<span class="badge">Disabled</span>'].filter(Boolean).join('');
  return `<article class="repo-row"><div class="repo-main"><div class="repo-heading"><h3><a href="${e(safeGitHubUrl(repo.url))}"><span class="repo-owner">${e(repo.owner)} / </span>${e(repo.name)}<span class="external" aria-hidden="true">↗</span></a></h3>${badges}</div><p>${e(repo.description || 'No description provided.')}</p>${repo.topics?.length ? `<div class="topics">${repo.topics.slice(0, 4).map(topic => `<span>${e(topic)}</span>`).join('')}</div>` : ''}</div><div class="repo-details"><span class="language"><span class="language-dot" aria-hidden="true"></span>${e(repo.language || 'Unspecified')}</span><div class="repo-numbers">${metrics}</div><span class="push-date">Pushed ${e(formatDate(repo.pushedAt))}</span></div></article>`;
}
