import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  CheckCircle2, Circle, Plus, Search, Moon, Sun,
  LogOut, LayoutDashboard, ListTodo, X, Edit2,
  Trash2, Calendar, Flag, BarChart3, Clock,
  AlertTriangle, Menu, Save, Eye, EyeOff,
  Lock, CheckCheck, Target, Activity,
  Tag, User, Flame, Filter,
  Mail, TrendingUp, ArrowRight, Zap,
} from "lucide-react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts"
import { toast, Toaster } from "sonner"
import {
  format, isBefore, parseISO, addDays,
  differenceInDays, startOfDay,
} from "date-fns"

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low"
type View = "dashboard" | "tasks" | "profile"
type AuthMode = "login" | "signup"
type FilterStatus = "all" | "pending" | "completed" | "overdue"
type SortOption = "dueDate" | "priority" | "created" | "title"

interface User {
  id: string
  name: string
  email: string
  password: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  category: string
  dueDate: string
  completed: boolean
  createdAt: string
  userId: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ["Work", "Personal", "Health", "Learning", "Finance", "Creative", "Social", "Other"]

const PRIORITY_CFG: Record<Priority, { label: string; hex: string; lightBg: string; darkBg: string }> = {
  high:   { label: "High",   hex: "#EF4444", lightBg: "#FEF2F2", darkBg: "#2D0A0A" },
  medium: { label: "Medium", hex: "#F59E0B", lightBg: "#FFFBEB", darkBg: "#2A1800" },
  low:    { label: "Low",    hex: "#10B981", lightBg: "#ECFDF5", darkBg: "#042015" },
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

const CAT_COLORS: Record<string, string> = {
  Work: "#5B4FE8", Personal: "#EC4899", Health: "#10B981",
  Learning: "#F59E0B", Finance: "#3B82F6", Creative: "#8B5CF6",
  Social: "#F97316", Other: "#6B7280",
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const NOW = new Date()
const td = (offset: number) => addDays(NOW, offset).toISOString().split("T")[0]

const DEMO_USER: User = {
  id: "demo-user",
  name: "Alex Chen",
  email: "alex@taskflow.io",
  password: "demo123",
  createdAt: "2024-01-15T08:00:00Z",
}

const DEMO_TASKS: Task[] = [
  { id: "t1",  title: "Q2 Product Roadmap Review",      description: "Finalize and present the Q2 product roadmap to stakeholders with revised OKRs and resource allocation.",  priority: "high",   category: "Work",     dueDate: td(-1), completed: false, createdAt: td(-7), userId: "demo-user" },
  { id: "t2",  title: "Design System Audit",            description: "Review and document all UI components for visual consistency across the platform.",                          priority: "medium", category: "Work",     dueDate: td(2),  completed: false, createdAt: td(-5), userId: "demo-user" },
  { id: "t3",  title: "Weekly Team Standup",            description: "Prepare agenda and talking points for the Monday all-hands.",                                               priority: "low",    category: "Work",     dueDate: td(1),  completed: true,  createdAt: td(-3), userId: "demo-user" },
  { id: "t4",  title: "Morning Run — 5K Trail",         description: "Complete 5K at sub-25 min pace along the river path. Track with Strava.",                                  priority: "medium", category: "Health",   dueDate: td(0),  completed: false, createdAt: td(-2), userId: "demo-user" },
  { id: "t5",  title: "Read: Atomic Habits Ch. 8–12",  description: "Continue reading and take structured summary notes for Notion.",                                            priority: "low",    category: "Learning", dueDate: td(3),  completed: true,  createdAt: td(-4), userId: "demo-user" },
  { id: "t6",  title: "Pay Credit Card Bill",           description: "Transfer payment before the 18th to avoid interest. Amount ~$840.",                                         priority: "high",   category: "Finance",  dueDate: td(-2), completed: false, createdAt: td(-6), userId: "demo-user" },
  { id: "t7",  title: "Portfolio Website Redesign",     description: "Update case studies section and refresh hero with new project work.",                                       priority: "medium", category: "Creative", dueDate: td(5),  completed: false, createdAt: td(-3), userId: "demo-user" },
  { id: "t8",  title: "Grocery Shopping",               description: "Restock weekly essentials — produce, protein, snacks, oat milk.",                                           priority: "low",    category: "Personal", dueDate: td(1),  completed: true,  createdAt: td(-1), userId: "demo-user" },
  { id: "t9",  title: "Stripe API Integration Sprint",  description: "Implement billing webhooks and subscription management endpoints.",                                         priority: "high",   category: "Work",     dueDate: td(4),  completed: false, createdAt: td(-5), userId: "demo-user" },
  { id: "t10", title: "Dinner with Jordan & Sam",       description: "Reserve table at Osteria. Confirm 7:30 PM slot. Check dietary restrictions.",                               priority: "medium", category: "Social",   dueDate: td(6),  completed: false, createdAt: td(-2), userId: "demo-user" },
  { id: "t11", title: "Advanced TypeScript Course",     description: "Finish generics and utility types module on Frontend Masters. Goal: 90 min.",                               priority: "medium", category: "Learning", dueDate: td(8),  completed: false, createdAt: td(-4), userId: "demo-user" },
  { id: "t12", title: "Daily Meditation — 20 min",      description: "Mindfulness session using the Calm app, focus on breathwork sequence.",                                    priority: "low",    category: "Health",   dueDate: td(0),  completed: true,  createdAt: td(-1), userId: "demo-user" },
]

// ── Storage ────────────────────────────────────────────────────────────────────

const LS = {
  get<T>(key: string, fallback: T): T {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback }
    catch { return fallback }
  },
  set(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) },
}

function getUsers(): User[] {
  const users = LS.get<User[]>("tf_users", [])
  if (!users.find(u => u.id === "demo-user")) {
    users.push(DEMO_USER)
    LS.set("tf_users", users)
  }
  return users
}

function getTasksForUser(userId: string): Task[] {
  const all = LS.get<Task[]>("tf_tasks", [])
  const mine = all.filter(t => t.userId === userId)
  if (mine.length === 0 && userId === "demo-user") {
    LS.set("tf_tasks", [...all, ...DEMO_TASKS])
    return DEMO_TASKS
  }
  return mine
}

function persistUserTasks(userId: string, tasks: Task[]) {
  const all = LS.get<Task[]>("tf_tasks", [])
  const others = all.filter(t => t.userId !== userId)
  LS.set("tf_tasks", [...others, ...tasks])
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 11) }

function isOverdue(task: Task): boolean {
  if (task.completed) return false
  const due = startOfDay(parseISO(task.dueDate))
  const today = startOfDay(new Date())
  return isBefore(due, today)
}

function getDueInfo(dueDate: string): { label: string; color: string } {
  const due = parseISO(dueDate)
  const today = startOfDay(new Date())
  const dueMid = startOfDay(due)
  const diff = differenceInDays(dueMid, today)
  if (diff < 0)  return { label: "Overdue",   color: "#EF4444" }
  if (diff === 0) return { label: "Today",     color: "#F59E0B" }
  if (diff === 1) return { label: "Tomorrow",  color: "#10B981" }
  return { label: format(due, "MMM d"), color: "#6B7280" }
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function PriBadge({ priority, dark }: { priority: Priority; dark: boolean }) {
  const c = PRIORITY_CFG[priority]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: c.hex, backgroundColor: dark ? c.darkBg : c.lightBg }}>
      <Flag size={9} />
      {c.label}
    </span>
  )
}

function CatBadge({ cat, dark }: { cat: string; dark: boolean }) {
  const color = CAT_COLORS[cat] ?? "#6B7280"
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color, backgroundColor: dark ? `${color}22` : `${color}18` }}>
      <Tag size={9} />
      {cat}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, color, sub, dark }: {
  label: string; value: string | number; icon: React.ElementType
  color: string; sub?: string; dark: boolean
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
      dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"
    }`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10"
        style={{ background: color }} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold font-mono" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18` }}>
          <Icon size={19} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onToggle, onEdit, onDelete, dark }: {
  task: Task; onToggle(): void; onEdit(): void; onDelete(): void; dark: boolean
}) {
  const overdue = isOverdue(task)
  const due = getDueInfo(task.dueDate)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
      className={`group rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
        task.completed
          ? dark ? "bg-card/40 border-border/40" : "bg-gray-50 border-gray-100 opacity-60"
          : overdue
            ? dark ? "bg-card border-red-900/30" : "bg-red-50/60 border-red-100"
            : dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"
      }`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 flex-shrink-0 transition-transform active:scale-90 hover:scale-110">
          {task.completed
            ? <CheckCircle2 size={20} style={{ color: "#10B981" }} />
            : <Circle size={20} className="text-muted-foreground hover:text-primary transition-colors" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-sm leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={onEdit}
                className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-muted" : "hover:bg-gray-100"}`}>
                <Edit2 size={13} className="text-muted-foreground" />
              </button>
              <button onClick={onDelete}
                className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-red-950/40" : "hover:bg-red-50"}`}>
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <PriBadge priority={task.priority} dark={dark} />
            <CatBadge cat={task.category} dark={dark} />
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: due.color }}>
              <Calendar size={10} />
              {due.label}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TaskModal({ task, onSave, onClose, dark }: {
  task?: Task
  onSave(data: Omit<Task, "id" | "createdAt" | "userId">): void
  onClose(): void
  dark: boolean
}) {
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: (task?.priority ?? "medium") as Priority,
    category: task?.category ?? "Work",
    dueDate: task?.dueDate ?? td(1),
    completed: task?.completed ?? false,
  })
  const inp = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${
    dark ? "bg-muted border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
         : "bg-gray-50 border-gray-200 focus:border-indigo-400 focus:bg-white"
  }`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("Title is required"); return }
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${
          dark ? "bg-card border-border" : "bg-white border-gray-100"
        }`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? "border-border" : "border-gray-100"}`}>
          <h2 className="font-bold text-lg">{task ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${dark ? "hover:bg-muted" : "hover:bg-gray-100"}`}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Title *</label>
            <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add details..." rows={2} className={`${inp} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className={inp}>
                {(["high", "medium", "low"] as Priority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inp} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                dark ? "border-border hover:bg-muted" : "border-gray-200 hover:bg-gray-50"
              }`}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
              <Save size={15} />
              {task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ConfirmDialog({ onConfirm, onCancel, dark }: { onConfirm(): void; onCancel(): void; dark: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative rounded-2xl border shadow-2xl p-6 max-w-sm w-full ${
          dark ? "bg-card border-border" : "bg-white border-gray-100"
        }`}>
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-center font-bold text-lg mb-2">Delete Task?</h3>
        <p className="text-center text-sm text-muted-foreground mb-6 leading-relaxed">
          This action is permanent and cannot be undone. The task will be removed from your list.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              dark ? "border-border hover:bg-muted" : "border-gray-200 hover:bg-gray-50"
            }`}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Auth Page ──────────────────────────────────────────────────────────────────

function AuthPage({ onAuth, dark }: { onAuth(user: User): void; dark: boolean }) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const inp = `w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${
    dark ? "bg-muted border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
         : "bg-gray-50 border-gray-200 focus:border-indigo-400 focus:bg-white"
  }`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const users = getUsers()
    if (mode === "login") {
      const u = users.find(u => u.email === form.email && u.password === form.password)
      if (!u) { toast.error("Invalid email or password"); setLoading(false); return }
      toast.success(`Welcome back, ${u.name}!`)
      onAuth(u)
    } else {
      if (!form.name.trim()) { toast.error("Name is required"); setLoading(false); return }
      if (!form.email.trim()) { toast.error("Email is required"); setLoading(false); return }
      if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); setLoading(false); return }
      if (users.find(u => u.email === form.email)) { toast.error("Email already registered"); setLoading(false); return }
      const newUser: User = { id: uid(), name: form.name, email: form.email, password: form.password, createdAt: new Date().toISOString() }
      users.push(newUser)
      LS.set("tf_users", users)
      toast.success(`Account created! Welcome, ${newUser.name}!`)
      onAuth(newUser)
    }
    setLoading(false)
  }

  function loadDemo() {
    setForm(f => ({ ...f, email: "alex@taskflow.io", password: "demo123" }))
    toast.info("Demo credentials loaded — click Sign In")
  }

  return (
    <div className={`min-h-screen flex bg-background`}>
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #3B30D0 0%, #5B4FE8 45%, #7C3AED 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #A78BFA, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #60A5FA, transparent)", transform: "translate(-30%, 30%)" }} />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <CheckCheck size={20} className="text-white" />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">TaskFlow</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
              Work smarter.<br />Achieve more.
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
              The productivity tool built for professionals who take their output seriously.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Target,   label: "Goal Tracking", sub: "Stay on target" },
              { icon: BarChart3, label: "Analytics",    sub: "Track progress" },
              { icon: Zap,      label: "Fast & Clean",  sub: "Zero friction" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="rounded-2xl bg-white/10 backdrop-blur-sm p-4">
                <Icon size={22} className="text-white mb-2" />
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-indigo-200 text-xs mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
          {/* Social proof */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex -space-x-2">
              {["#F59E0B","#10B981","#EC4899","#3B82F6"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-400 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: c }}>
                  {["A","J","M","R"][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Join 2,400+ users</p>
              <p className="text-indigo-200 text-xs">shipping work that matters</p>
            </div>
          </div>
        </div>
        <p className="relative text-indigo-300 text-xs">© 2026 TaskFlow. All rights reserved.</p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md rounded-2xl border p-8 ${
            dark ? "bg-card border-border shadow-2xl" : "bg-white border-gray-100 shadow-xl"
          }`}>
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
              <CheckCheck size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-lg" style={{ color: "#5B4FE8" }}>TaskFlow</span>
          </div>

          {/* Toggle */}
          <div className={`flex rounded-xl p-1 mb-6 ${dark ? "bg-muted" : "bg-gray-100"}`}>
            {(["login", "signup"] as AuthMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={mode === m ? { background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" } : undefined}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "login" ? "Enter your credentials to continue" : "Start managing tasks in seconds"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Alex Chen" className={inp} />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com" required className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" required className={`${inp} pr-10`} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><ArrowRight size={16} />{mode === "login" ? "Sign In" : "Create Account"}</>}
            </button>
          </form>

          {mode === "login" && (
            <button onClick={loadDemo}
              className={`w-full mt-3 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                dark ? "border-border hover:bg-muted" : "border-gray-200 hover:bg-gray-50"
              }`}>
              <Flame size={15} style={{ color: "#F59E0B" }} />
              Try Demo Account
            </button>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? "No account yet? " : "Already a member? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold hover:underline underline-offset-2" style={{ color: "#5B4FE8" }}>
              {mode === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ view, setView, onLogout, user, dark, open, onClose }: {
  view: View; setView(v: View): void; onLogout(): void
  user: User; dark: boolean; open: boolean; onClose(): void
}) {
  const nav = [
    { id: "dashboard" as View, icon: LayoutDashboard, label: "Dashboard" },
    { id: "tasks" as View,     icon: ListTodo,        label: "My Tasks" },
    { id: "profile" as View,   icon: User,            label: "Profile" },
  ]

  const inner = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b ${dark ? "border-border" : "border-gray-100"}`}>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
          <CheckCheck size={17} className="text-white" />
        </div>
        <span className="font-extrabold tracking-tight" style={{ color: "#5B4FE8" }}>TaskFlow</span>
        <button onClick={onClose} className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3 pt-1 pb-2">Menu</p>
        {nav.map(item => (
          <button key={item.id} onClick={() => { setView(item.id); onClose() }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              view === item.id
                ? "text-white shadow-md"
                : dark ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                       : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            }`}
            style={view === item.id ? { background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" } : undefined}>
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User block */}
      <div className={`p-3 border-t ${dark ? "border-border" : "border-gray-100"}`}>
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${dark ? "bg-muted/60" : "bg-gray-50"}`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <button onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-muted-foreground ${
            dark ? "hover:bg-red-950/30 hover:text-red-400" : "hover:bg-red-50 hover:text-red-500"
          }`}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className={`hidden lg:flex w-60 border-r flex-col flex-shrink-0 ${
        dark ? "bg-card border-border" : "bg-white border-gray-100"
      }`}>{inner}</div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-60 border-r flex flex-col ${
                dark ? "bg-card border-border" : "bg-white border-gray-100"
              }`}>
              {inner}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = (dark: boolean) => ({
  contentStyle: {
    background: dark ? "#1A1B2C" : "#fff",
    border: "none",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    fontSize: 12,
  },
  labelStyle: { color: dark ? "#E8E9F3" : "#0D0E1A", fontWeight: 600 },
})

function DashboardPage({ tasks, user, dark }: { tasks: Task[]; user: User; dark: boolean }) {
  const total     = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const overdue   = tasks.filter(isOverdue).length
  const pending   = total - completed - overdue
  const pct       = total ? Math.round((completed / total) * 100) : 0

  const catData = CATEGORIES.map(cat => ({
    name: cat.slice(0, 3),
    fullName: cat,
    total: tasks.filter(t => t.category === cat).length,
    done:  tasks.filter(t => t.category === cat && t.completed).length,
  })).filter(d => d.total > 0)

  const pieData = [
    { name: "Completed", value: completed, color: "#10B981" },
    { name: "Pending",   value: pending,   color: "#5B4FE8" },
    { name: "Overdue",   value: overdue,   color: "#EF4444" },
  ].filter(d => d.value > 0)

  // Priority distribution
  const priData = (["high","medium","low"] as Priority[]).map(p => ({
    name: PRIORITY_CFG[p].label,
    count: tasks.filter(t => t.priority === p).length,
    color: PRIORITY_CFG[p].hex,
  }))

  const recent = [...tasks].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  const urgentTasks = tasks.filter(t => !t.completed && (isOverdue(t) || t.priority === "high")).slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold leading-tight">
            {greeting}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
            {pending > 0 && <span> · <span className="font-semibold text-foreground">{pending} task{pending !== 1 ? "s" : ""} pending</span></span>}
          </p>
        </div>
        {urgentTasks.length > 0 && (
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
            dark ? "bg-red-950/40 text-red-400" : "bg-red-50 text-red-600"
          }`}>
            <AlertTriangle size={13} />
            {urgentTasks.length} urgent
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Tasks"  value={total}     icon={ListTodo}       color="#5B4FE8" dark={dark} />
        <StatCard label="Completed"    value={completed} icon={CheckCheck}     color="#10B981" sub={`${pct}% done`} dark={dark} />
        <StatCard label="Pending"      value={pending}   icon={Clock}          color="#F59E0B" dark={dark} />
        <StatCard label="Overdue"      value={overdue}   icon={AlertTriangle}  color="#EF4444" dark={dark} />
      </div>

      {/* Progress bar */}
      <div className={`rounded-2xl p-5 border ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold">Overall Progress</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{completed} of {total} tasks completed</p>
          </div>
          <span className="text-3xl font-extrabold font-mono" style={{ color: "#5B4FE8" }}>{pct}%</span>
        </div>
        <div className={`w-full h-2.5 rounded-full ${dark ? "bg-muted" : "bg-gray-100"}`}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-2.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #5B4FE8, #7C3AED, #10B981)" }} />
        </div>
        <div className="flex items-center gap-4 mt-3">
          {priData.map(p => (
            <div key={p.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-xs text-muted-foreground">{p.name}: <span className="font-semibold text-foreground">{p.count}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Donut */}
        <div className={`lg:col-span-2 rounded-2xl p-5 border ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className="font-bold mb-1">Status Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Task completion overview</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                dataKey="value" paddingAngle={4} strokeWidth={0}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE(dark)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                </div>
                <span className="text-xs font-bold font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className={`lg:col-span-3 rounded-2xl p-5 border ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className="font-bold mb-1">Tasks by Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Total vs completed per category</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={catData} barSize={10} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1E1F32" : "#F0F1F5"} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: dark ? "#8890A4" : "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: dark ? "#8890A4" : "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE(dark)} />
              <Bar dataKey="total" fill={dark ? "#2A2B40" : "#EEF0FF"} radius={[4,4,0,0]} name="Total" />
              <Bar dataKey="done"  fill="#5B4FE8" radius={[4,4,0,0]} name="Done" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Urgent + Recent */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Urgent tasks */}
        {urgentTasks.length > 0 && (
          <div className={`rounded-2xl p-5 border ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <Flame size={13} className="text-red-500" />
              </div>
              <h3 className="font-bold">Needs Attention</h3>
            </div>
            <div className="space-y-2">
              {urgentTasks.map(t => {
                const due = getDueInfo(t.dueDate)
                return (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-muted/50" : "bg-gray-50"}`}>
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                      style={{ background: isOverdue(t) ? "#EF4444" : PRIORITY_CFG[t.priority].hex }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{t.title}</p>
                      <p className="text-xs font-semibold" style={{ color: due.color }}>{due.label}</p>
                    </div>
                    <PriBadge priority={t.priority} dark={dark} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent tasks */}
        <div className={`rounded-2xl p-5 border ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"} ${urgentTasks.length === 0 ? "lg:col-span-2" : ""}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "#5B4FE818" }}>
              <Activity size={13} style={{ color: "#5B4FE8" }} />
            </div>
            <h3 className="font-bold">Recent Tasks</h3>
          </div>
          <div className="space-y-1">
            {recent.map(t => {
              const due = getDueInfo(t.dueDate)
              return (
                <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  dark ? "hover:bg-muted/50" : "hover:bg-gray-50"
                }`}>
                  {t.completed
                    ? <CheckCircle2 size={15} className="flex-shrink-0" style={{ color: "#10B981" }} />
                    : <Circle size={15} className="flex-shrink-0 text-muted-foreground" />}
                  <span className={`flex-1 text-sm truncate ${t.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                    {t.title}
                  </span>
                  <CatBadge cat={t.category} dark={dark} />
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: due.color }}>{due.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tasks Page ────────────────────────────────────────────────────────────────

function TasksPage({ tasks, onAdd, onEdit, onToggle, onDelete, dark }: {
  tasks: Task[]; onAdd(): void; onEdit(t: Task): void
  onToggle(id: string): void; onDelete(id: string): void; dark: boolean
}) {
  const [search, setSearch]           = useState("")
  const [filterPri, setFilterPri]     = useState<Priority | "all">("all")
  const [filterCat, setFilterCat]     = useState("all")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [sortBy, setSortBy]           = useState<SortOption>("dueDate")
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
            !t.description.toLowerCase().includes(search.toLowerCase()) &&
            !t.category.toLowerCase().includes(search.toLowerCase())) return false
        if (filterPri !== "all" && t.priority !== filterPri) return false
        if (filterCat !== "all" && t.category !== filterCat) return false
        if (filterStatus === "completed" && !t.completed) return false
        if (filterStatus === "pending" && (t.completed || isOverdue(t))) return false
        if (filterStatus === "overdue" && !isOverdue(t)) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === "dueDate")  return a.dueDate.localeCompare(b.dueDate)
        if (sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (sortBy === "created")  return b.createdAt.localeCompare(a.createdAt)
        if (sortBy === "title")    return a.title.localeCompare(b.title)
        return 0
      })
  }, [tasks, search, filterPri, filterCat, filterStatus, sortBy])

  const completed = tasks.filter(t => t.completed).length
  const overdueCount = tasks.filter(isOverdue).length
  const activeFilters = [filterPri !== "all", filterCat !== "all", filterStatus !== "all"].filter(Boolean).length

  const sel = `w-full px-3 py-2 rounded-lg border text-sm outline-none appearance-none ${
    dark ? "bg-muted border-border text-foreground" : "bg-gray-50 border-gray-200 text-gray-700"
  }`

  return (
    <div className="p-5 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold">My Tasks</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {tasks.length} total · {completed} done
            {overdueCount > 0 && <span className="text-red-500"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
          <Plus size={17} />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks, categories..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                dark ? "bg-card border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                     : "bg-white border-gray-200 focus:border-indigo-400 shadow-sm"
              }`} />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              showFilters
                ? "text-white border-transparent shadow-md"
                : dark ? "border-border hover:bg-muted bg-card" : "border-gray-200 hover:bg-gray-50 bg-white shadow-sm"
            }`}
            style={showFilters ? { background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" } : undefined}>
            <Filter size={15} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && !showFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: "#5B4FE8" }}>{activeFilters}</span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={`rounded-2xl border p-4 ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Priority", value: filterPri, onChange: (v: string) => setFilterPri(v as any),
                      opts: [["all","All Priorities"],["high","High"],["medium","Medium"],["low","Low"]] },
                    { label: "Category", value: filterCat, onChange: (v: string) => setFilterCat(v),
                      opts: [["all","All Categories"], ...CATEGORIES.map(c => [c,c])] },
                    { label: "Status", value: filterStatus, onChange: (v: string) => setFilterStatus(v as FilterStatus),
                      opts: [["all","All Status"],["pending","Pending"],["completed","Completed"],["overdue","Overdue"]] },
                    { label: "Sort By", value: sortBy, onChange: (v: string) => setSortBy(v as SortOption),
                      opts: [["dueDate","Due Date"],["priority","Priority"],["created","Date Created"],["title","Title A–Z"]] },
                  ].map(({ label, value, onChange, opts }) => (
                    <div key={label}>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
                      <select value={value} onChange={e => onChange(e.target.value)} className={sel}>
                        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {activeFilters > 0 && (
                  <button onClick={() => { setFilterPri("all"); setFilterCat("all"); setFilterStatus("all") }}
                    className="mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <X size={12} /> Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results count */}
      {(search || activeFilters > 0) && (
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          Showing {filtered.length} of {tasks.length} tasks
        </p>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
            <ListTodo size={26} className="text-white" />
          </div>
          <h3 className="font-bold text-lg mb-2">No tasks found</h3>
          <p className="text-sm text-muted-foreground mb-5">
            {search ? `No results for "${search}"` : "Add your first task to get started"}
          </p>
          <button onClick={onAdd}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
            <Plus size={16} /> New Task
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map(task => (
              <TaskCard key={task.id} task={task}
                onToggle={() => onToggle(task.id)}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                dark={dark} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ── Profile Page ──────────────────────────────────────────────────────────────

function ProfilePage({ user, tasks, dark }: { user: User; tasks: Task[]; dark: boolean }) {
  const completed = tasks.filter(t => t.completed).length
  const overdue   = tasks.filter(isOverdue).length
  const pct       = tasks.length ? Math.round((completed / tasks.length) * 100) : 0

  const catBreakdown = CATEGORIES.map(cat => ({
    name: cat,
    count: tasks.filter(t => t.category === cat).length,
    done:  tasks.filter(t => t.category === cat && t.completed).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  const priBreakdown = (["high","medium","low"] as Priority[]).map(p => ({
    name: PRIORITY_CFG[p].label,
    count: tasks.filter(t => t.priority === p).length,
    hex: PRIORITY_CFG[p].hex,
  }))

  return (
    <div className="p-5 lg:p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-extrabold">Profile</h1>

      {/* Profile card */}
      <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
        <div className="h-28 relative" style={{ background: "linear-gradient(135deg, #3B30D0, #5B4FE8 50%, #7C3AED)" }}>
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #A78BFA 0%, transparent 60%)" }} />
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-2xl border-4 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl"
              style={{
                borderColor: dark ? "#13141F" : "#fff",
                background: "linear-gradient(135deg, #5B4FE8, #7C3AED)"
              }}>
              {user.name.charAt(0)}
            </div>
          </div>
        </div>
        <div className="pt-14 pb-6 px-6">
          <h2 className="text-xl font-extrabold">{user.name}</h2>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Member since {format(parseISO(user.createdAt), "MMMM yyyy")}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
              <TrendingUp size={12} />
              {pct}% completion rate
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              dark ? "bg-muted text-muted-foreground" : "bg-gray-100 text-gray-600"
            }`}>
              <ListTodo size={12} />
              {tasks.length} total tasks
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total"     value={tasks.length} icon={ListTodo}      color="#5B4FE8" dark={dark} />
        <StatCard label="Completed" value={completed}    icon={CheckCheck}    color="#10B981" dark={dark} />
        <StatCard label="Pending"   value={tasks.length - completed - overdue} icon={Clock} color="#F59E0B" dark={dark} />
        <StatCard label="Overdue"   value={overdue}      icon={AlertTriangle} color="#EF4444" dark={dark} />
      </div>

      {/* Category breakdown */}
      <div className={`rounded-2xl border p-5 ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className="font-bold mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {catBreakdown.map(({ name, count, done }) => {
            const catPct = Math.round((done / count) * 100)
            const color = CAT_COLORS[name] ?? "#6B7280"
            return (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{done}/{count} · {catPct}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full ${dark ? "bg-muted" : "bg-gray-100"}`}>
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${(count / tasks.length) * 100}%`, background: color, opacity: 0.4 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Priority distribution */}
      <div className={`rounded-2xl border p-5 ${dark ? "bg-card border-border" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className="font-bold mb-4">Priority Distribution</h3>
        <div className="grid grid-cols-3 gap-3">
          {priBreakdown.map(({ name, count, hex }) => (
            <div key={name} className="text-center rounded-xl p-4 border"
              style={{
                borderColor: `${hex}30`,
                background: dark ? `${hex}10` : `${hex}08`,
              }}>
              <p className="text-2xl font-extrabold font-mono" style={{ color: hex }}>{count}</p>
              <p className="text-xs font-semibold text-muted-foreground mt-1">{name} Priority</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]   = useState<User | null>(() => LS.get<User | null>("tf_session", null))
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView]   = useState<View>("dashboard")
  const [dark, setDark]   = useState(() => LS.get<boolean>("tf_dark", false))
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [taskModal, setTaskModal]           = useState<{ open: boolean; task?: Task }>({ open: false })
  const [deleteConfirm, setDeleteConfirm]   = useState<{ open: boolean; id?: string }>({ open: false })

  // Sync dark mode to DOM
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    LS.set("tf_dark", dark)
  }, [dark])

  // Load tasks on login
  useEffect(() => {
    if (user) setTasks(getTasksForUser(user.id))
  }, [user?.id])

  function persistTasks(updated: Task[]) {
    setTasks(updated)
    if (user) persistUserTasks(user.id, updated)
  }

  function handleAuth(u: User) {
    LS.set("tf_session", u)
    setUser(u)
  }

  function handleLogout() {
    localStorage.removeItem("tf_session")
    setUser(null)
    setView("dashboard")
    toast.success("Signed out successfully")
  }

  function handleToggle(id: string) {
    persistTasks(tasks.map(t => {
      if (t.id !== id) return t
      const next = { ...t, completed: !t.completed }
      toast.success(next.completed ? "Task completed! 🎉" : "Task reopened")
      return next
    }))
  }

  function handleSave(data: Omit<Task, "id" | "createdAt" | "userId">) {
    if (taskModal.task) {
      persistTasks(tasks.map(t => t.id === taskModal.task!.id ? { ...t, ...data } : t))
      toast.success("Task updated")
    } else {
      const t: Task = { ...data, id: uid(), createdAt: new Date().toISOString(), userId: user!.id }
      persistTasks([...tasks, t])
      toast.success("Task created!")
    }
  }

  function handleDeleteExecute() {
    if (!deleteConfirm.id) return
    persistTasks(tasks.filter(t => t.id !== deleteConfirm.id))
    setDeleteConfirm({ open: false })
    toast.success("Task deleted")
  }

  if (!user) return (
    <>
      <AuthPage onAuth={handleAuth} dark={dark} />
      <Toaster position="top-right" richColors />
    </>
  )

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? "bg-background" : "bg-gray-50/80"}`}>
      <Toaster position="top-right" richColors />

      <Sidebar view={view} setView={setView} onLogout={handleLogout}
        user={user} dark={dark} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className={`flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0 ${
          dark ? "bg-card border-border" : "bg-white border-gray-100"
        }`}>
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors">
            <Menu size={19} />
          </button>
          <div className="flex-1 lg:hidden">
            <h2 className="font-bold text-sm capitalize">{view === "tasks" ? "My Tasks" : view}</h2>
          </div>
          <div className="hidden lg:block flex-1">
            <p className="text-xs text-muted-foreground font-medium">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(v => !v)}
              className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                dark ? "bg-card border-border" : "bg-white border-gray-200 shadow-sm"
              }`}>
              {dark
                ? <Sun size={17} className="text-amber-400" />
                : <Moon size={17} className="text-indigo-500" />}
            </button>
            <button onClick={() => setTaskModal({ open: true })}
              className="p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}
              title="Quick add task">
              <Plus size={17} className="text-white" />
            </button>
            <button onClick={() => setView("profile")}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #5B4FE8, #7C3AED)" }}>
              {user.name.charAt(0)}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              {view === "dashboard" && <DashboardPage tasks={tasks} user={user} dark={dark} />}
              {view === "tasks"     && (
                <TasksPage tasks={tasks} onAdd={() => setTaskModal({ open: true })}
                  onEdit={t => setTaskModal({ open: true, task: t })}
                  onToggle={handleToggle} onDelete={id => setDeleteConfirm({ open: true, id })} dark={dark} />
              )}
              {view === "profile"   && <ProfilePage user={user} tasks={tasks} dark={dark} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {taskModal.open && (
          <TaskModal task={taskModal.task} onSave={handleSave}
            onClose={() => setTaskModal({ open: false })} dark={dark} />
        )}
        {deleteConfirm.open && (
          <ConfirmDialog onConfirm={handleDeleteExecute}
            onCancel={() => setDeleteConfirm({ open: false })} dark={dark} />
        )}
      </AnimatePresence>
    </div>
  )
}
