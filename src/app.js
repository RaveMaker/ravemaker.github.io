import { DEFAULT_FILTERS, filterRepositories, renderRepository, formatNumber } from './repositories.js';

const snapshot = JSON.parse(document.getElementById('repository-data').textContent);
const form = document.getElementById('filters');
const list = document.getElementById('repo-list');
const empty = document.getElementById('empty-state');
const count = document.getElementById('result-count');
const pagination = document.getElementById('pagination');
const summary = document.getElementById('page-summary');
const previous = document.getElementById('previous-page');
const next = document.getElementById('next-page');
const tabs = document.getElementById('account-tabs');
const tabButtons = [...tabs.querySelectorAll('[role="tab"]')];
const accountPanel = document.getElementById('account-panel');
const defaultAccount = form.elements.namedItem('account').defaultValue;
const size = 10;
const params = ['query', 'account', 'language', 'sort'];
let page = 1;

function readUrl() {
  const search = new URLSearchParams(location.search);
  for (const name of params) {
    const control = form.elements.namedItem(name);
    control.value = search.get(name) || (name === 'account' ? defaultAccount : DEFAULT_FILTERS[name]);
    if (name === 'account') control.value = tabButtons.find(button => button.dataset.account.toLowerCase() === control.value.toLowerCase())?.dataset.account || defaultAccount;
    if (control.tagName === 'SELECT' && control.selectedIndex === -1) control.value = DEFAULT_FILTERS[name];
  }
  page = Math.max(1, Number.parseInt(search.get('page'), 10) || 1);
}
function render({ writeUrl = true } = {}) {
  const filters = Object.fromEntries(new FormData(form));
  for (const button of tabButtons) {
    const selected = button.dataset.account === filters.account;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected) accountPanel.setAttribute('aria-labelledby', button.id);
  }
  const matches = filterRepositories(snapshot.repositories, filters);
  const pages = Math.max(1, Math.ceil(matches.length / size));
  page = Math.min(page, pages);
  const start = (page - 1) * size;
  list.innerHTML = matches.slice(start, start + size).map(renderRepository).join('');
  const accountTotal = snapshot.repositories.filter(repo => repo.owner.toLowerCase() === filters.account.toLowerCase()).length;
  count.textContent = `${formatNumber(matches.length)} of ${formatNumber(accountTotal)} ${filters.account} repositories`;
  empty.hidden = matches.length !== 0;
  pagination.hidden = matches.length <= size;
  summary.textContent = `${formatNumber(start + 1)}–${formatNumber(Math.min(start + size, matches.length))} of ${formatNumber(matches.length)} · Page ${page} of ${pages}`;
  previous.disabled = page <= 1;
  next.disabled = page >= pages;
  if (writeUrl) {
    const url = new URL(location.href);
    for (const name of params) { const value = filters[name]; const defaultValue = name === 'account' ? defaultAccount : DEFAULT_FILTERS[name]; if (value !== defaultValue) url.searchParams.set(name, value); else url.searchParams.delete(name); }
    if (page > 1) url.searchParams.set('page', page); else url.searchParams.delete('page');
    history.replaceState(null, '', url);
  }
}
form.hidden = false;
tabs.hidden = false;
function selectAccount(button) {
  form.elements.namedItem('account').value = button.dataset.account;
  page = 1;
  render();
}
tabButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectAccount(button));
  button.addEventListener('keydown', event => {
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % tabButtons.length;
    else if (event.key === 'ArrowLeft') target = (index - 1 + tabButtons.length) % tabButtons.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabButtons.length - 1;
    else return;
    event.preventDefault();
    tabButtons[target].focus();
    selectAccount(tabButtons[target]);
  });
});
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', () => { page = 1; render(); });
function clearFilters() {
  for (const [name, value] of Object.entries(DEFAULT_FILTERS)) form.elements.namedItem(name).value = value;
  page = 1;
  render();
}
document.getElementById('clear-filters').addEventListener('click', clearFilters);
document.getElementById('empty-reset').addEventListener('click', () => { clearFilters(); form.elements.namedItem('query').focus(); });
function changePage(delta, button) {
  page += delta;
  render();
  if (button.disabled) (button === next ? previous : next).focus();
  document.getElementById('repositories').scrollIntoView({ block: 'start' });
}
previous.addEventListener('click', () => changePage(-1, previous));
next.addEventListener('click', () => changePage(1, next));
window.addEventListener('popstate', () => { readUrl(); render({ writeUrl: false }); });
readUrl(); render({ writeUrl: false });

const themeButton = document.querySelector('.theme-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: light)');
let manualTheme = false;
try { manualTheme = ['dark', 'light'].includes(localStorage.getItem('rm-theme')); } catch {}
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme !== 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0c111b' : '#f7f8fa';
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeButton.querySelector('.theme-icon').textContent = dark ? '☼' : '☾';
}
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  manualTheme = true;
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('rm-theme', document.documentElement.dataset.theme); } catch {}
  updateThemeButton();
});
systemTheme.addEventListener('change', event => {
  if (manualTheme) return;
  document.documentElement.dataset.theme = event.matches ? 'light' : 'dark';
  updateThemeButton();
});
updateThemeButton();

