import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChevronDown, Coffee, CreditCard, Home, LayoutDashboard, MoreHorizontal, Plus, Search, Settings, ShoppingBag, SlidersHorizontal, Sparkles, Utensils, Wallet, X, Zap } from 'lucide-react';

const initial = [
  { id: 1, name: 'Whole Foods Market', category: 'Groceries', date: 'Today, 10:42 AM', amount: 84.32, icon: 'bag', color: 'peach', type: 'Expense' },
  { id: 2, name: 'Monthly rent', category: 'Housing', date: 'Today, 9:15 AM', amount: 1450, icon: 'home', color: 'lilac', type: 'Expense' },
  { id: 3, name: 'Blue Bottle Coffee', category: 'Dining', date: 'Yesterday, 8:30 AM', amount: 6.80, icon: 'coffee', color: 'yellow', type: 'Expense' },
  { id: 4, name: 'Salary · Acme Inc.', category: 'Income', date: 'Jun 12, 2025', amount: 4200, icon: 'wallet', color: 'mint', type: 'Income' },
  { id: 5, name: 'Electricity bill', category: 'Utilities', date: 'Jun 11, 2025', amount: 68.40, icon: 'zap', color: 'blue', type: 'Expense' },
];
const categoryColors = { Groceries: 'peach', Housing: 'lilac', Dining: 'yellow', Transport: 'blue', Utilities: 'mint', Shopping: 'pink', Health: 'mint', Other: 'gray' };
const iconMap = { bag: ShoppingBag, home: Home, coffee: Coffee, wallet: Wallet, zap: Zap, dining: Utensils, card: CreditCard };
const currency = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function App() {
  const [transactions, setTransactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ledger-transactions')) || initial; } catch { return initial; }
  });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', category: 'Groceries', type: 'Expense' });
  const save = rows => { setTransactions(rows); localStorage.setItem('ledger-transactions', JSON.stringify(rows)); };
  const totals = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((a, t) => a + t.amount, 0);
    const income = transactions.filter(t => t.type === 'Income').reduce((a, t) => a + t.amount, 0);
    return { expenses, income, balance: 12840.50 + income - 3520.20 - expenses };
  }, [transactions]);
  const visible = transactions.filter(t => (filter === 'All' || t.type === filter) && `${t.name} ${t.category}`.toLowerCase().includes(query.toLowerCase()));
  const submit = e => {
    e.preventDefault();
    if (!form.name.trim() || Number(form.amount) <= 0) return;
    save([{ id: Date.now(), name: form.name.trim(), amount: Number(form.amount), category: form.category, type: form.type, date: 'Just now', icon: form.category === 'Groceries' ? 'bag' : form.category === 'Dining' ? 'dining' : 'card', color: categoryColors[form.category] || 'gray' }, ...transactions]);
    setForm({ name: '', amount: '', category: 'Groceries', type: 'Expense' }); setModal(false);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top"><span className="brand-mark"><Wallet size={19}/></span> ledger<span className="brand-dot">.</span></a>
      <div className="workspace-label">WORKSPACE</div><div className="workspace"><span className="workspace-avatar">A</span><span><b>Alex Morgan</b><small>Personal account</small></span><ChevronDown size={15}/></div>
      <div className="nav-label">MENU</div><nav><a className="nav-item active" href="#overview"><LayoutDashboard size={18}/> Overview</a><a className="nav-item" href="#transactions"><CreditCard size={18}/> Transactions <span className="nav-count">12</span></a><a className="nav-item" href="#budgets"><SlidersHorizontal size={18}/> Budgets</a></nav>
      <div className="nav-label tools-label">PREFERENCES</div><nav><a className="nav-item" href="#settings"><Settings size={18}/> Settings</a><a className="nav-item" href="#help"><Sparkles size={18}/> Help center</a></nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16}/></div><b>Make money clearer.</b><p>Get more insights with Ledger Plus.</p><button onClick={() => alert('You’re all set — more features coming soon!')}>Explore Plus <ArrowUpRight size={14}/></button></div><div className="profile"><div className="profile-pic">AM</div><div><b>Alex Morgan</b><small>Free plan</small></div><MoreHorizontal size={20}/></div></div>
    </aside>
    <main className="main" id="top">
      <header className="topbar"><div className="crumb">Pages <span>/</span> <b>Overview</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">AM</div></div></header>
      <div className="content" id="overview">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> YOUR FINANCES AT A GLANCE</div><h1>Good morning, Alex <span>✳</span></h1><p className="subheading">Here’s what’s happening with your money.</p></div><button className="date-button"><CalendarDays size={16}/> Jun 1 – Jun 30, 2025 <ChevronDown size={15}/></button></section>
        <section className="summary-grid">
          <article className="summary-card balance-card"><div className="card-head"><span>Total balance</span><span className="card-symbol"><Wallet size={17}/></span></div><div className="big-number">{currency(totals.balance)}</div><div className="trend"><span className="trend-pill"><ArrowUpRight size={13}/> 8.2%</span><span>vs. last month</span></div><div className="sparkline"><svg viewBox="0 0 300 58" preserveAspectRatio="none"><path d="M0 48 C20 42 22 46 40 32 S66 34 82 28 S107 37 124 22 S153 28 173 20 S194 29 214 13 S239 23 256 17 S282 12 300 4"/><path className="spark-fill" d="M0 48 C20 42 22 46 40 32 S66 34 82 28 S107 37 124 22 S153 28 173 20 S194 29 214 13 S239 23 256 17 S282 12 300 4 V58 H0Z"/></svg></div></article>
          <article className="summary-card"><div className="card-head"><span>Income</span><span className="card-symbol mint"><ArrowDownLeft size={17}/></span></div><div className="big-number">{currency(4820.00 + totals.income)}</div><div className="trend"><span className="trend-pill"><ArrowUpRight size={13}/> 12.5%</span><span>vs. last month</span></div><div className="mini-bars income-bars">{[36,54,42,70,56,84,62,100,72,88,66,96].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><div className="chart-caption"><span>Jun 1</span><span>Jun 30</span></div></article>
          <article className="summary-card"><div className="card-head"><span>Expenses</span><span className="card-symbol peach"><ArrowUpRight size={17}/></span></div><div className="big-number">{currency(3520.20 + totals.expenses)}</div><div className="trend"><span className="trend-pill neutral">↓ 3.1%</span><span>vs. last month</span></div><div className="mini-bars expense-bars">{[72,48,66,40,84,56,72,42,96,58,78,50].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><div className="chart-caption"><span>Jun 1</span><span>Jun 30</span></div></article>
        </section>
        <section className="middle-grid"><article className="panel spending-panel" id="budgets"><div className="panel-title"><div><h2>Spending breakdown</h2><p>Where your money went this month</p></div><button className="select-button">This month <ChevronDown size={14}/></button></div><div className="spending-content"><div className="donut-wrap"><div className="donut"><div className="donut-center"><small>Total spent</small><b>$3,520</b><span>this month</span></div></div></div><div className="legend"><div><i className="legend-dot housing"/><span>Housing</span><b>$1,450</b><small>41%</small></div><div><i className="legend-dot food"/><span>Food & dining</span><b>$842</b><small>24%</small></div><div><i className="legend-dot transport"/><span>Transport</span><b>$563</b><small>16%</small></div><div><i className="legend-dot other"/><span>Other</span><b>$665</b><small>19%</small></div></div></div></article>
          <article className="panel budget-panel"><div className="panel-title"><div><h2>Monthly budget</h2><p>You’re doing great this month</p></div><button className="more-button" aria-label="More options"><MoreHorizontal size={20}/></button></div><div className="budget-total"><b>$3,520</b><span>of $5,000</span></div><div className="progress-track"><i/></div><div className="budget-caption"><span>70% used</span><span>$1,480 left</span></div><div className="budget-note"><span className="note-icon"><Sparkles size={15}/></span><span>You’re <b>$280 under</b> your spending pace. Keep it up!</span></div><button className="text-link" onClick={() => alert('Budget details are coming soon.')}>View budget details <ArrowUpRight size={14}/></button></article></section>
        <section className="panel transactions-panel" id="transactions"><div className="panel-title transaction-title"><div><h2>Recent transactions</h2><p>Your latest activity, all in one place</p></div><button className="primary-button" onClick={() => setModal(true)}><Plus size={16}/> Add transaction</button></div><div className="table-tools"><div className="tabs">{['All','Expense','Income'].map(x=><button key={x} className={filter===x?'selected':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="tool-right"><label className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transactions"/></label><button className="filter-button"><SlidersHorizontal size={15}/> Filter</button></div></div><div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th></th></tr></thead><tbody>{visible.map(t=>{const Icon=iconMap[t.icon]||CreditCard;return <tr key={t.id}><td><div className="transaction-cell"><span className={`transaction-icon ${t.color}`}><Icon size={17}/></span><b>{t.name}</b></div></td><td><span className="category-tag">{t.category}</span></td><td className="date-cell">{t.date}</td><td className={`amount ${t.type==='Income'?'positive':''}`}>{t.type==='Income'?'+':'−'}{currency(t.amount)}</td><td><button className="row-menu" aria-label="Transaction options" onClick={()=>save(transactions.filter(row=>row.id!==t.id))}><MoreHorizontal size={19}/></button></td></tr>})}</tbody></table>{visible.length===0&&<div className="empty-state">No transactions found. Try another search.</div>}</div><div className="table-footer"><span>Showing <b>{visible.length}</b> of <b>{transactions.length}</b> transactions</span><button onClick={()=>{setFilter('All');setQuery('')}}>View all transactions <ArrowUpRight size={14}/></button></div></section>
        <footer>© 2025 Ledger. Made for a little more peace of mind. <span>Privacy&nbsp;&nbsp; · &nbsp;&nbsp;Help</span></footer>
      </div>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={submit}><div className="modal-head"><div><span className="eyebrow">KEEP YOUR LEDGER UP TO DATE</span><h2>Add a transaction</h2></div><button type="button" className="icon-button" onClick={()=>setModal(false)} aria-label="Close"><X size={18}/></button></div><label className="field-label">Description<input required autoFocus placeholder="e.g. Grocery shopping" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="field-label">Amount<div className="amount-input"><span>$</span><input required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div></label><div className="form-row"><label className="field-label">Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Expense</option><option>Income</option></select></label><label className="field-label">Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Groceries','Housing','Dining','Transport','Utilities','Shopping','Health','Other'].map(c=><option key={c}>{c}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="cancel-button" onClick={()=>setModal(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={16}/> Save transaction</button></div></form></div>}
  </div>;
}
export default App;
