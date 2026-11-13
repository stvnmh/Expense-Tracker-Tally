import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BarChart3, Check, ChevronDown, CloudDownload, Coffee, Edit3, FilePlus2, Home, Moon, Plus, Search, ShoppingBag, Sun, Trash2, X, Zap, Undo2, Utensils, Car, HeartPulse, Tag } from 'lucide-react';

const STORAGE_KEY = 'tally-expense-tracker-v1';
const CATEGORIES = ['Food', 'Housing', 'Transport', 'Utilities', 'Health', 'Leisure', 'Shopping', 'Other'];
const CURRENCIES = [
  { value: 'PHP', label: 'Philippine peso', short: 'PHP · ₱', symbol: '₱' },
  { value: 'USD', label: 'US dollar', short: 'USD · $', symbol: '$' },
  { value: 'EUR', label: 'Euro', short: 'EUR · €', symbol: '€' },
  { value: 'GBP', label: 'British pound', short: 'GBP · £', symbol: '£' },
];
const CATEGORY_COLORS = ['#0d4b49', '#f5a63c', '#25b8a5', '#b4a1ef', '#ec9aae', '#6689d9', '#e47754', '#8b9b9b'];
const CATEGORY_ICONS = { Food: Utensils, Housing: Home, Transport: Car, Utilities: Zap, Health: HeartPulse, Leisure: Coffee, Shopping: ShoppingBag, Other: Tag };
const CATEGORY_OPTIONS = CATEGORIES.map((value, i) => ({ value, label: value, color: CATEGORY_COLORS[i], Icon: CATEGORY_ICONS[value] }));
const FILTER_OPTIONS = [{ value: 'All categories', label: 'All categories', detail: 'Show every category' }, ...CATEGORY_OPTIONS];
const THEME_OPTIONS = [{ value: 'light', label: 'Light', detail: 'Bright dashboard', Icon: Sun }, { value: 'dark', label: 'Dark', detail: 'Low-light dashboard', Icon: Moon }];
const dateNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const emptyData = { name: '', currency: 'PHP', theme: 'light', budget: 0, categoryBudgets: {}, transactions: [] };

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return emptyData;
    return { ...emptyData, ...saved, transactions: Array.isArray(saved.transactions) ? saved.transactions : [], categoryBudgets: saved.categoryBudgets || {} };
  } catch { return emptyData; }
}
function money(value, currency) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(value) || 0); }
  catch { return `${currency} ${(Number(value) || 0).toFixed(2)}`; }
}
function shortDate(day) { return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function monthLabel(date = new Date()) { return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
function escapeCsv(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState('Overview');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [chartView, setChartView] = useState('Both');
  const [expenseDialog, setExpenseDialog] = useState(null);
  const [budgetDialog, setBudgetDialog] = useState(false);
  const [toast, setToast] = useState(null);
  const [undoItems, setUndoItems] = useState([]);
  const [chartPoint, setChartPoint] = useState(null);
  const deleteTimers = useRef(new Map());
  const undoItemsRef = useRef([]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => () => deleteTimers.current.forEach(clearTimeout), []);
  const updateData = patch => setData(old => ({ ...old, ...patch }));
  function showMessage(message) { setToast(current => current?.undo ? current : { message }); }
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthRows = useMemo(() => data.transactions.filter(t => String(t.date).startsWith(thisMonth)), [data.transactions, thisMonth]);
  const spent = monthRows.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const remaining = Math.max(0, Number(data.budget || 0) - spent);
  const daysElapsed = Math.max(1, now.getDate());
  const dailyAverage = spent / daysElapsed;
  const percentUsed = data.budget > 0 ? Math.min(100, spent / data.budget * 100) : 0;
  const visibleRows = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .filter(t => (categoryFilter === 'All categories' || t.category === categoryFilter) && `${t.description} ${t.category}`.toLowerCase().includes(search.toLowerCase()));
  const byCategory = CATEGORIES.map((category, i) => ({ category, color: CATEGORY_COLORS[i], amount: monthRows.filter(t => t.category === category).reduce((sum, t) => sum + Number(t.amount), 0) })).filter(x => x.amount > 0);
  const flowPoints = monthRows.length ? Array.from({ length: now.getDate() }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const amount = monthRows.filter(t => t.date.endsWith(`-${day}`)).reduce((sum, t) => sum + Number(t.amount), 0);
    return { day: i + 1, amount };
  }) : [];
  const chartMax = Math.max(1, ...flowPoints.map(p => p.amount), dailyAverage * 1.5);
  const chartCoords = flowPoints.map((p, i) => ({ ...p, x: flowPoints.length < 2 ? 8 : 8 + i * (384 / (flowPoints.length - 1)), y: 116 - p.amount / chartMax * 92 }));
  const chartPath = chartCoords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const pieParts = byCategory.map((item, i) => {
    const total = byCategory.reduce((sum, x) => sum + x.amount, 0);
    const prior = byCategory.slice(0, i).reduce((sum, x) => sum + x.amount, 0);
    return { ...item, start: prior / total * 360, sweep: item.amount / total * 360, percent: item.amount / total * 100 };
  });

  function downloadBlob(contents, filename, type) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  }
  function exportAll() {
    downloadBlob(JSON.stringify({ app: 'Tally', exportedAt: new Date().toISOString(), ...data }, null, 2), `tally-backup-${dateNow()}.json`, 'application/json');
    showMessage('Your backup was downloaded.');
  }
  function exportCsv() {
    const rows = [['Date', 'Description', 'Category', 'Amount'], ...visibleRows.map(t => [t.date, t.description, t.category, t.amount])];
    downloadBlob(rows.map(row => row.map(escapeCsv).join(',')).join('\r\n'), `tally-expenses-${dateNow()}.csv`, 'text/csv;charset=utf-8');
  }
  function addExpense(form) {
    const transaction = { id: crypto.randomUUID?.() || String(Date.now()), description: form.description.trim(), category: form.category, amount: Number(form.amount), date: form.date, createdAt: Date.now() };
    setData(old => ({ ...old, transactions: [...old.transactions, transaction] }));
    setExpenseDialog(null); showMessage('Expense added.');
  }
  function deleteBatch(items, message, restoreData = null) {
    const token = crypto.randomUUID?.() || String(Date.now());
    if (restoreData) setData(emptyData);
    else setData(old => ({ ...old, transactions: old.transactions.filter(t => !items.some(x => x.id === t.id)) }));
    const undo = { token, items, message, restoreData };
    const nextUndo = [...undoItemsRef.current, undo];
    undoItemsRef.current = nextUndo;
    setUndoItems(nextUndo); setToast({ token, message, undo: true });
    const timer = setTimeout(() => {
      const remaining = undoItemsRef.current.filter(x => x.token !== token);
      undoItemsRef.current = remaining;
      setUndoItems(remaining);
      setToast(current => current?.token === token ? (remaining.length ? { ...remaining.at(-1), undo: true } : null) : current);
      deleteTimers.current.delete(token);
    }, 5000);
    deleteTimers.current.set(token, timer);
  }
  function deleteOne(id) {
    const index = data.transactions.findIndex(t => t.id === id);
    if (index < 0) return;
    deleteBatch([{ ...data.transactions[index], index }], 'Expense deleted.');
  }
  function undoDelete(token = undoItems.at(-1)?.token) {
    const item = undoItems.find(x => x.token === token);
    if (!item) return;
    clearTimeout(deleteTimers.current.get(token)); deleteTimers.current.delete(token);
    if (item.restoreData) setData(item.restoreData);
    else setData(old => {
      const next = [...old.transactions];
      item.items.forEach(record => { if (!next.some(t => t.id === record.id)) { const { index, ...transaction } = record; next.splice(Math.min(index, next.length), 0, transaction); } });
      return { ...old, transactions: next };
    });
    const remaining = undoItemsRef.current.filter(x => x.token !== token);
    undoItemsRef.current = remaining;
    setUndoItems(remaining);
    setToast(remaining.length ? { ...remaining.at(-1), undo: true } : { message: 'Deletion undone.' });
  }
  function clearAll() {
    if (!window.confirm('Clear all Tally data from this browser? You can undo this for 5 seconds.')) return;
    const hasData = data.transactions.length || data.budget || data.name || data.currency !== 'PHP' || data.theme !== 'light' || Object.values(data.categoryBudgets).some(Boolean);
    if (!hasData) { showMessage('There is no saved data to clear.'); return; }
    deleteBatch(data.transactions.map((t, index) => ({ ...t, index })), 'All data cleared.', data);
  }
  function loadSampleData() {
    if (!window.confirm('Add example expenses to your Tally data?')) return;
    const today = dateNow();
    const examples = [
      { description: 'Market groceries', category: 'Food', amount: 1240, date: today },
      { description: 'Train fare', category: 'Transport', amount: 320, date: today },
      { description: 'Electric bill', category: 'Utilities', amount: 1800, date: today },
      { description: 'Monthly rent', category: 'Housing', amount: 9000, date: today },
    ].map((t, i) => ({ ...t, id: `sample-${Date.now()}-${i}`, createdAt: Date.now() + i }));
    setData(old => ({ ...old, transactions: [...old.transactions, ...examples], budget: old.budget || 25000 }));
    showMessage('Example expenses added.');
  }
  function setCursorGlow(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }
  function onChartMove(event) {
    if (!chartCoords.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(400, (event.clientX - rect.left) / rect.width * 400));
    const nearest = chartCoords.reduce((best, p) => Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best, chartCoords[0]);
    setChartPoint(nearest);
  }
  function navigate(next) { setPage(next); setSearch(''); }

  const nav = ['Overview', 'Expenses', 'Budget', 'Settings'];
  return <div className={`tally-app ${data.theme === 'dark' ? 'dark' : ''}`}>
    <header className="top-nav glass-tile">
      <button className="wordmark" onClick={() => navigate('Overview')} aria-label="Tally home">TALLY<span>.</span></button>
      <nav className="nav-links" aria-label="Main navigation">{nav.map(n => <button key={n} className={page === n ? 'active' : ''} onClick={() => navigate(n)}>{n}</button>)}</nav>
      <div className="nav-tools"><SelectMenu className="currency-menu" ariaLabel="Display currency" value={data.currency} options={CURRENCIES} onChange={currency=>updateData({currency})}/><button className="round-button" onClick={() => updateData({ theme: data.theme === 'dark' ? 'light' : 'dark' })} aria-label={`Switch to ${data.theme === 'dark' ? 'light' : 'dark'} theme`}>{data.theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}</button><button className="add-button pill-button" onClick={() => setExpenseDialog({ mode: 'add' })}><Plus size={14}/> Add expense</button></div>
    </header>
    <main className="page-wrap">
      <div className="page-heading"><div className="kicker">{page === 'Overview' ? 'PERSONAL DASHBOARD' : page.toUpperCase()}</div><h1>{page === 'Overview' ? (data.name.trim() ? <>Welcome back <span>{data.name.trim()}</span></> : 'Welcome back') : page === 'Expenses' ? 'Your expenses' : page === 'Budget' ? 'Your budget' : 'Settings'}</h1></div>

      {page === 'Overview' && <>
        <section className="overview-cards" aria-label="Monthly summary">
          <article className="summary-card dark-card hover-card cursor-glow" onPointerMove={setCursorGlow}><div className="summary-kicker">TOTAL SPENT · {monthRows.length} {monthRows.length === 1 ? 'ENTRY' : 'ENTRIES'}</div><div className="summary-amount">{money(spent, data.currency)}</div><div className="summary-foot">in {monthLabel(now)}</div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-orb"/></article>
          <article className="summary-card glass-tile hover-card"><div className="summary-kicker">REMAINING BUDGET</div><div className="summary-amount small">{data.budget ? money(remaining, data.currency) : 'Not set'}</div><div className="summary-foot">{data.budget ? `of ${money(data.budget, data.currency)}` : <button className="inline-link" onClick={() => setBudgetDialog(true)}>Set a monthly budget</button>}</div></article>
          <article className="summary-card glass-tile hover-card"><div className="summary-kicker">DAILY AVERAGE</div><div className="summary-amount small">{money(dailyAverage, data.currency)}</div><div className="summary-foot">across {daysElapsed} {daysElapsed === 1 ? 'day' : 'days'}</div></article>
        </section>
        <section className="chart-controls"><div className="kicker">CHARTS · PICK A VIEW</div><ChartSwitch value={chartView} onChange={setChartView}/></section>
        {chartView !== 'Off' && <section className={`chart-grid ${chartView === 'Line' ? 'one-chart' : chartView === 'Pie' ? 'one-chart pie-only' : ''}`}>
        {(chartView === 'Line' || chartView === 'Both') && <article className="panel glass-tile hover-card chart-panel"><div className="panel-kicker">CASH FLOW</div><h2>Daily spending</h2><div className="chart-wrap" onPointerMove={onChartMove} onPointerLeave={() => setChartPoint(null)}><svg className="line-chart" viewBox="0 0 400 145" role="img" aria-label="Daily spending chart"><defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#26b7a5" stopOpacity=".25"/><stop offset="100%" stopColor="#26b7a5" stopOpacity="0"/></linearGradient></defs><line x1="8" y1="24" x2="392" y2="24" className="chart-gridline"/><line x1="8" y1="70" x2="392" y2="70" className="chart-gridline"/><line x1="8" y1="116" x2="392" y2="116" className="chart-gridline"/>{data.budget > 0 && <line x1="8" x2="392" y1={116 - (dailyAverage / chartMax * 92)} y2={116 - (dailyAverage / chartMax * 92)} className="budget-guide"/>}{chartCoords.length > 1 && <><path d={`${chartPath} L ${chartCoords.at(-1).x} 130 L ${chartCoords[0].x} 130 Z`} className="chart-area"/><path d={chartPath} className="chart-line"/></>}{chartCoords.map(p=><circle key={p.day} cx={p.x} cy={p.y} r="3" className={`chart-dot ${chartPoint?.day === p.day ? 'active' : ''}`} tabIndex="0" role="img" aria-label={`${shortDate(`${thisMonth}-${String(p.day).padStart(2, '0')}`)}: ${money(p.amount, data.currency)}`} onFocus={() => setChartPoint(p)} onBlur={() => setChartPoint(null)}/>)}{chartPoint&&<><line x1={chartPoint.x} x2={chartPoint.x} y1="10" y2="130" className="chart-crosshair"/><foreignObject x={Math.max(0,Math.min(300,chartPoint.x-55))} y={Math.max(0,chartPoint.y-36)} width="110" height="26"><div className="chart-tooltip">{shortDate(`${thisMonth}-${String(chartPoint.day).padStart(2,'0')}`)} · {money(chartPoint.amount,data.currency)}</div></foreignObject></>}</svg><div className="chart-axis"><span>{shortDate(`${thisMonth}-01`)}</span><span>{shortDate(`${thisMonth}-${String(Math.max(1, Math.floor(now.getDate()/2))).padStart(2,'0')}`)}</span><span>{shortDate(dateNow())}</span></div></div><div className="chart-note">{data.budget ? 'Dashed line marks your daily budget pace.' : monthRows.length ? 'Hover, tap, or focus a point to see the daily total.' : 'Add expenses to see your daily spending.'}</div></article>}
          {(chartView === 'Pie' || chartView === 'Both') && <article className="panel glass-tile hover-card chart-panel pie-panel"><div className="panel-kicker">BREAKDOWN</div><h2>By category</h2><div className="pie-content">{pieParts.length ? <PieChart parts={pieParts} currency={data.currency}/> : <div className="empty-pie"><div className="pie-placeholder"><BarChart3 size={24}/></div><span>Category totals appear here after you add expenses.</span></div>}</div></article>}
        </section>}
        <section className="lower-grid">
          <article className="budget-card dark-card hover-card cursor-glow" onPointerMove={setCursorGlow}><div className="panel-kicker">MONTHLY GOAL</div><h2>Your monthly budget</h2><p className="muted-on-dark">{data.budget ? 'Your spending pace this month.' : 'Set a budget to track your monthly goal.'}</p><div className="budget-ring-row"><div className="budget-ring" style={{ '--progress': `${percentUsed}%` }} tabIndex="0" aria-label={`${Math.round(percentUsed)} percent of budget used`}><div className="ring-center"><b>{data.budget ? `${Math.round(percentUsed)}%` : '—'}</b><span>{data.budget ? `${money(remaining,data.currency)} left` : 'No budget'}</span></div></div><div className="budget-numbers"><div><small>SPENT</small><b>{money(spent, data.currency)}</b></div><div><small>BUDGET</small><b>{data.budget ? money(data.budget, data.currency) : 'Not set'}</b></div></div></div><button className="edit-budget pill-button" onClick={() => setBudgetDialog(true)}>{data.budget ? 'Edit budget' : 'Set budget'}</button></article>
          <article className="panel glass-tile activity-panel"><div className="activity-head"><div><div className="panel-kicker">YOUR ACTIVITY</div><h2>Expenses</h2></div><div className="activity-tools"><SelectMenu className="category-filter-menu" ariaLabel="Filter expenses by category" value={categoryFilter} options={FILTER_OPTIONS} onChange={setCategoryFilter}/><button className="small-action" onClick={exportCsv} disabled={!visibleRows.length}><ArrowDownToLine size={12}/> CSV</button></div></div><TransactionTable rows={visibleRows.slice(0, 5)} currency={data.currency} onEdit={t=>setExpenseDialog({ mode: 'edit', transaction: t })} onDelete={t=>deleteOne(t.id)} emptyText="No expenses yet. Add one to get started."/><button className="view-all" onClick={()=>navigate('Expenses')}>View all expenses <ArrowRight size={13}/></button></article>
        </section>
      </>}

      {page === 'Expenses' && <section className="panel glass-tile full-panel"><div className="full-panel-head"><div><div className="panel-kicker">YOUR ACTIVITY</div><h2>Expenses</h2><p>Find, review, or update your recorded expenses.</p></div><button className="add-button pill-button" onClick={()=>setExpenseDialog({mode:'add'})}><Plus size={14}/> Add expense</button></div><div className="expense-filters"><label className="search-input"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses"/></label><SelectMenu className="category-filter-menu" ariaLabel="Filter expenses by category" value={categoryFilter} options={FILTER_OPTIONS} onChange={setCategoryFilter}/><button className="small-action" onClick={exportCsv} disabled={!visibleRows.length}><ArrowDownToLine size={13}/> Export CSV</button></div><TransactionTable rows={visibleRows} currency={data.currency} onEdit={t=>setExpenseDialog({mode:'edit',transaction:t})} onDelete={t=>deleteOne(t.id)} emptyText={search || categoryFilter!=='All categories' ? 'No expenses match those filters.' : 'Your expense list is empty. Add an expense or load sample data from Settings.'}/></section>}

      {page === 'Budget' && <section className="budget-page-grid"><article className="budget-card dark-card hover-card cursor-glow" onPointerMove={setCursorGlow}><div className="panel-kicker">MONTHLY GOAL</div><h2>Your monthly budget</h2><p className="muted-on-dark">{data.budget ? `${monthLabel(now)} spending progress` : 'Set a monthly limit to see your progress here.'}</p><div className="big-budget-ring budget-ring" style={{ '--progress': `${percentUsed}%` }} tabIndex="0"><div className="ring-center"><b>{data.budget ? `${Math.round(percentUsed)}%` : '—'}</b><span>{data.budget ? `${money(remaining,data.currency)} left` : 'No budget yet'}</span></div></div><div className="budget-breakdown"><div><small>SPENT</small><b>{money(spent,data.currency)}</b></div><div><small>MONTHLY BUDGET</small><b>{data.budget ? money(data.budget,data.currency) : 'Not set'}</b></div><div><small>DAILY AVERAGE</small><b>{money(dailyAverage,data.currency)}</b></div></div><button className="edit-budget pill-button" onClick={()=>setBudgetDialog(true)}>{data.budget?'Edit budget':'Set a budget'}</button></article><article className="panel glass-tile full-panel"><div className="panel-kicker">CATEGORY LIMITS</div><h2>Keep an eye on each category</h2><p className="panel-description">Optional limits help you spot where your money is going.</p><div className="category-budgets">{CATEGORIES.map((category,i)=>{const amount=monthRows.filter(t=>t.category===category).reduce((sum,t)=>sum+t.amount,0);const limit=Number(data.categoryBudgets[category]||0);return <div className="category-budget-row" key={category}><i style={{background:CATEGORY_COLORS[i]}}/><span>{category}</span><b>{money(amount,data.currency)}</b><small>{limit ? `of ${money(limit,data.currency)}` : 'No limit'}</small><button aria-label={`Set ${category} limit`} onClick={()=>{const value=window.prompt(`Monthly limit for ${category} (${data.currency}). Enter 0 to remove it.`,String(limit||''));if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0)return;updateData({categoryBudgets:{...data.categoryBudgets,[category]:n}})}}><Edit3 size={14}/></button></div>})}</div></article></section>}

      {page === 'Settings' && <SettingsPage data={data} updateData={updateData} exportAll={exportAll} loadSampleData={loadSampleData} clearAll={clearAll}/>}
      <footer className="page-footer"><span>TALLY · YOUR MONEY, IN VIEW</span><button onClick={exportAll}><CloudDownload size={13}/> Export all data</button></footer>
    </main>
    {expenseDialog && <ExpenseDialog mode={expenseDialog.mode} transaction={expenseDialog.transaction} onClose={()=>setExpenseDialog(null)} onSave={form=>{
      if(expenseDialog.mode==='edit') {const t=expenseDialog.transaction;setData(old=>({...old,transactions:old.transactions.map(row=>row.id===t.id?{...row,...form,amount:Number(form.amount),description:form.description.trim()}:row)}));setExpenseDialog(null);showMessage('Expense updated.');}
      else addExpense(form);
    }}/>}
    {budgetDialog&&<BudgetDialog budget={data.budget} currency={data.currency} onClose={()=>setBudgetDialog(false)} onSave={value=>{updateData({budget:value});setBudgetDialog(false);showMessage('Budget saved.')}}/>}
    {toast&&<div className="toast" role="status"><span>{toast.message}</span>{toast.undo&&<button onClick={()=>undoDelete(toast.token)}><Undo2 size={14}/> Undo</button>}{!toast.undo&&<button className="toast-close" aria-label="Dismiss" onClick={()=>setToast(null)}><X size={14}/></button>}</div>}
  </div>;
}

function ChartSwitch({ value, onChange }) {
  const options=['Line','Pie','Both','Off'];
  return <div className="chart-switch" role="group" aria-label="Choose charts" style={{'--switch-index':options.indexOf(value)}}>{options.map(item=><button key={item} className={value===item?'selected':''} aria-pressed={value===item} onClick={()=>onChange(item)}>{item}</button>)}</div>;
}

function SelectMenu({ value, options, onChange, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const uid = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selected = options[selectedIndex] || options[0];
  const listId = `select-list-${uid}`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  function focusOption(index) {
    const next = (index + options.length) % options.length;
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  }
  function openAt(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
    requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }
  function closeMenu(returnFocus = false) {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function handleTriggerKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (open) focusOption(selectedIndex);
      else openAt(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); closeMenu(true);
    }
  }
  function handleOptionKeyDown(event, index) {
    if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusOption(0); }
    else if (event.key === 'End') { event.preventDefault(); focusOption(options.length - 1); }
    else if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    else if (event.key === 'Tab') closeMenu(false);
  }
  function choose(option) {
    onChange(option.value);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const SelectedIcon = selected?.Icon;
  return <div className={`select-menu ${className} ${open ? 'is-open' : ''}`} ref={rootRef}>
    <button ref={triggerRef} type="button" className="dropdown-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => open ? closeMenu(false) : openAt()} onKeyDown={handleTriggerKeyDown}>
      <span className="dropdown-trigger-content">
        {selected?.symbol && <span className="dropdown-symbol">{selected.symbol}</span>}
        {SelectedIcon && <SelectedIcon size={14} className="dropdown-current-icon"/>}
        {selected?.color && <i className="dropdown-color-dot" style={{ background: selected.color }}/>}
        <span>{selected?.short || selected?.label}</span>
      </span>
      <ChevronDown size={13} className="dropdown-chevron"/>
    </button>
    {open && <div id={listId} className="dropdown-popover" role="listbox" aria-label={ariaLabel} onKeyDown={event=>{if(event.target===event.currentTarget&&event.key==='Escape'){event.preventDefault();closeMenu(true);}}}>
      {options.map((option, index) => {
        const Icon = option.Icon;
        return <button key={option.value} ref={element=>optionRefs.current[index]=element} type="button" role="option" aria-selected={option.value===value} tabIndex={-1} className={`dropdown-option ${option.value===value?'selected':''} ${index===activeIndex?'active':''}`} onFocus={()=>setActiveIndex(index)} onPointerEnter={()=>setActiveIndex(index)} onKeyDown={event=>handleOptionKeyDown(event,index)} onClick={()=>choose(option)}>
          <span className="dropdown-option-mark" style={option.color?{'--option-color':option.color}:undefined}>{Icon ? <Icon size={15}/> : option.color ? <i/> : option.symbol ? <b>{option.symbol}</b> : null}</span>
          <span className="dropdown-option-copy"><span className="dropdown-option-name">{option.label}</span>{(option.detail || (option.value!==option.label && !option.symbol)) && <small>{option.detail || option.value}</small>}</span>
          {option.symbol && <span className="dropdown-option-code">{option.value}</span>}
          {option.value===value && <Check size={14} className="dropdown-check"/>}
        </button>;
      })}
    </div>}
  </div>;
}

function PieChart({ parts, currency }) {
  const [active,setActive]=useState(null);
  const polar=(angle,r=76)=>{const rad=(angle-90)*Math.PI/180;return [90+Math.cos(rad)*r,90+Math.sin(rad)*r]};
  const pathFor=part=>{if(part.sweep>=359.99)return 'M 90 14 A 76 76 0 1 1 89.99 14 Z';const [sx,sy]=polar(part.start);const [ex,ey]=polar(part.start+part.sweep);return `M 90 90 L ${sx} ${sy} A 76 76 0 ${part.sweep>180?1:0} 1 ${ex} ${ey} Z`;};
  return <><svg className="pie-chart" viewBox="0 0 180 180" role="img" aria-label="Spending by category">{parts.map((p,i)=><path key={p.category} d={pathFor(p)} fill={p.color} className={active&&active!==p.category?'dimmed':''} style={{transform:active===p.category?'scale(1.045)':undefined,transformOrigin:'90px 90px'}} tabIndex="0" role="button" aria-label={`${p.category}, ${money(p.amount,currency)}, ${Math.round(p.percent)} percent`} onMouseEnter={()=>setActive(p.category)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(p.category)} onBlur={()=>setActive(null)} onClick={()=>setActive(active===p.category?null:p.category)}/>)}</svg><div className="pie-legend">{parts.map(p=><button key={p.category} className={active&&active!==p.category?'dimmed':''} onMouseEnter={()=>setActive(p.category)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(p.category)} onBlur={()=>setActive(null)} onClick={()=>setActive(active===p.category?null:p.category)}><i style={{background:p.color}}/><span>{p.category} · {Math.round(p.percent)}%</span><b>{money(p.amount,currency)}</b></button>)}</div></>;
}

function TransactionTable({ rows, currency, onEdit, onDelete, emptyText }) {
  if(!rows.length)return <div className="empty-table"><span className="empty-icon"><FilePlus2 size={19}/></span><b>No expenses yet</b><p>{emptyText}</p></div>;
  return <div className="table-scroll"><table className="expense-table"><thead><tr><th>DATE</th><th>DESCRIPTION</th><th>CATEGORY</th><th>AMOUNT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(t=>{const Icon=CATEGORY_ICONS[t.category]||Tag;const i=CATEGORIES.indexOf(t.category);return <tr key={t.id}><td>{shortDate(t.date)}</td><td><div className="description-cell"><span className="mini-category" style={{'--category-color':CATEGORY_COLORS[i]}}><Icon size={14}/></span><b>{t.description}</b></div></td><td><span className="category-cell"><i style={{background:CATEGORY_COLORS[i]}}/>{t.category}</span></td><td className="amount-cell">{money(t.amount,currency)}</td><td className="row-actions"><button aria-label={`Edit ${t.description}`} title="Edit expense" onClick={()=>onEdit(t)}><Edit3 size={14}/></button><button aria-label={`Delete ${t.description}`} title="Delete expense" onClick={()=>onDelete(t)}><Trash2 size={14}/></button></td></tr>})}</tbody></table></div>;
}

function ExpenseDialog({ mode, transaction, onClose, onSave }) {
  const [description,setDescription]=useState(transaction?.description||'');
  const [amount,setAmount]=useState(transaction?.amount ? String(transaction.amount) : '');
  const [date,setDate]=useState(transaction?.date||'');
  const [category,setCategory]=useState(transaction?.category||'Food');
  const [error,setError]=useState('');
  function submit(event){event.preventDefault();if(!Number.isFinite(Number(amount))||Number(amount)<=0){setError('Enter an amount greater than 0.');return;}if(!date){setError('Choose a date for this expense.');return;}onSave({description:description||category,amount,date,category});}
  return <div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="dialog-panel" onSubmit={submit}><div className="dialog-head"><div><div className="panel-kicker">EXPENSE DETAILS</div><h2>{mode==='edit'?'Edit expense':'Add an expense'}</h2></div><button type="button" className="icon-close" aria-label="Close" onClick={onClose}><X size={17}/></button></div><label className="form-label">Description <input autoFocus value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe this expense"/></label><div className="form-row"><label className="form-label">Amount<input type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter an amount"/></label><label className="form-label">Date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="form-label"><span>Category</span><SelectMenu className="category-choice-menu" ariaLabel="Expense category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory}/></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="add-button pill-button" type="submit">{mode==='edit'?'Save changes':'Add expense'}</button></div></form></div>;
}

function BudgetDialog({ budget, currency, onClose, onSave }) {
  const [value,setValue]=useState(budget?String(budget):'');
  const [error,setError]=useState('');
  function submit(e){e.preventDefault();const amount=Number(value);if(!Number.isFinite(amount)||amount<=0){setError('Enter a budget greater than 0.');return;}onSave(amount);}
  return <div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="dialog-panel" onSubmit={submit}><div className="dialog-head"><div><div className="panel-kicker">MONTHLY PLAN</div><h2>{budget?'Edit your budget':'Set a monthly budget'}</h2></div><button type="button" className="icon-close" aria-label="Close" onClick={onClose}><X size={17}/></button></div><p className="panel-description">Choose a monthly spending limit. You can change it any time.</p><label className="form-label">Monthly budget ({currency})<input type="number" min="0.01" step="0.01" required autoFocus value={value} onChange={e=>setValue(e.target.value)} placeholder="Enter your budget"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="add-button pill-button" type="submit">Save budget</button></div></form></div>;
}

function SettingsPage({ data, updateData, exportAll, loadSampleData, clearAll }) {
  const [name,setName]=useState(data.name);
  useEffect(()=>setName(data.name),[data.name]);
  return <section className="settings-grid">
    <article className="panel glass-tile full-panel">
      <div className="panel-kicker">MAKE TALLY YOURS</div><h2>Settings</h2><p className="panel-description">Choose how Tally looks and what it calls you.</p>
      <label className="form-label settings-label">Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"/></label>
      <button className="add-button pill-button" onClick={()=>updateData({name:name.trim()})}><Check size={14}/> Save name</button>
      <div className="settings-separator"/>
      <div className="settings-choice"><span><b>Currency format</b><small>Changes the display format only. No conversion is applied.</small></span><SelectMenu className="settings-dropdown" ariaLabel="Display currency" value={data.currency} options={CURRENCIES} onChange={currency=>updateData({currency})}/></div>
      <div className="settings-choice"><span><b>Appearance</b><small>Choose a light or dark dashboard.</small></span><SelectMenu className="settings-dropdown theme-dropdown" ariaLabel="Appearance" value={data.theme} options={THEME_OPTIONS} onChange={theme=>updateData({theme})}/></div>
    </article>
    <article className="panel glass-tile full-panel">
      <div className="panel-kicker">YOUR DATA</div><h2>Take your data with you</h2><p className="panel-description">Tally saves information in this browser. Export a backup before clearing browser data or switching devices.</p>
      <button className="wide-action" onClick={exportAll}><CloudDownload size={16}/><span><b>Export all data</b><small>Download a JSON backup of your settings, budget, and expenses.</small></span><ArrowRight size={15}/></button>
      <button className="wide-action" onClick={loadSampleData}><FilePlus2 size={16}/><span><b>Load sample data</b><small>Add example entries only when you choose to click this.</small></span><ArrowRight size={15}/></button>
      <button className="wide-action danger-action" onClick={clearAll}><Trash2 size={16}/><span><b>Clear all data</b><small>You'll be asked to confirm; you can undo for 5 seconds.</small></span><ArrowRight size={15}/></button>
    </article>
  </section>;
}

export default App;
