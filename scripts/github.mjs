export async function fetchRepositories(accounts, { fetchImpl = fetch, token, now = new Date() } = {}) {
  let requests = 0;
  const repositories = [];
  for (const account of accounts) {
    const startCount = repositories.length;
    let url = `https://api.github.com/users/${encodeURIComponent(account)}/repos?per_page=100&type=owner&sort=pushed&direction=desc`;
    while (url) {
      const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'RaveMaker-profile-build', 'X-GitHub-Api-Version': '2022-11-28' };
      if (token) headers.Authorization = `Bearer ${token}`;
      requests++;
      const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${account}. Snapshot was not changed.`);
      const list = await response.json();
      if (!Array.isArray(list)) throw new Error(`Invalid repository response for ${account}.`);
      for (const repo of list) {
        if (repo.private || repo.owner?.login.toLowerCase() !== account.toLowerCase()) continue;
        repositories.push({
          id: repo.id, owner: repo.owner.login, name: repo.name, fullName: repo.full_name,
          url: repo.html_url, description: repo.description || '', language: repo.language,
          stars: repo.stargazers_count, forks: repo.forks_count,
          fork: repo.fork, archived: repo.archived, disabled: repo.disabled,
          topics: repo.topics || [], pushedAt: repo.pushed_at, updatedAt: repo.updated_at,
          createdAt: repo.created_at
        });
      }
      url = response.headers.get('link')?.match(/<([^>]+)>; rel="next"/)?.[1] || null;
      if (url && new URL(url).origin !== 'https://api.github.com') throw new Error('Unexpected GitHub pagination URL.');
    }
    if (repositories.length === startCount) throw new Error(`No public owned repositories returned for ${account}. Snapshot was not changed.`);
  }
  const unique = [...new Map(repositories.map(repo => [repo.id, repo])).values()];
  unique.sort((a, b) => (b.pushedAt || '').localeCompare(a.pushedAt || '') || a.fullName.localeCompare(b.fullName));
  return { schemaVersion: 1, generatedAt: now.toISOString(), accounts, requestCount: requests, repositories: unique };
}
